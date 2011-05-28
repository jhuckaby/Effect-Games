package XML::API;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# XML::API
# Simple XML API web interface for Apache mod_perl modules
# Usage:
#	# In your Perl module:
#		use XML::API;
#		our @ISA = ("XML::API");
#		XML::API::init('/path/to/MyModule.xml');
#		sub handler : method { return XML::API::handler(@_); }
# 
#	# In your httpd.conf file:
#		PerlModule MyModule
#		<LocationMatch ^/my/uri/prefix>
#			SetHandler perl-script
#			PerlResponseHandler MyModule
#		</LocationMatch>
##

use strict;
use FileHandle;
use CGI;
use Time::HiRes qw/time/;
use Digest::MD5 qw/md5_hex/;
use URI::Escape;
use Carp ();
use UNIVERSAL qw/isa/;
use XML::Lite;
use XML::Cache;
use XML::API::Tools;
use XML::API::Log;
use XML::API::Perf;
our @ISA = ("XML::API::Log", "XML::API::Perf");

use constant MP2 => ( exists $ENV{MOD_PERL_API_VERSION} and 
						$ENV{MOD_PERL_API_VERSION} >= 2 );

BEGIN {
	if (MP2) {
		require Apache2::RequestRec;
		require Apache2::RequestIO;
		require Apache2::Const;
		require APR::Table;
		require Apache2::Access;
		Apache2::Const->import(-compile => qw(OK DECLINED HTTP_INTERNAL_SERVER_ERROR REDIRECT HTTP_NOT_MODIFIED HTTP_PARTIAL_CONTENT));
	}
	else {
		require Apache;
		require Apache::Constants;
		Apache::Constants->import(qw(OK DECLINED SERVER_ERROR REDIRECT USE_LOCAL_COPY));
	}
}

my $modules = {};
my $cleanup_queue = [];
my $first_request = 0;

sub new {
	##
	# Class constructor
	##
	my $class = shift;
	my $self = {@_};
	return bless $self, $class;
}

sub handler : method {
	##
	# Handle request, called by Apache mod_perl
	##
	my $class = shift;
	my $request = shift;
	my $result = undef;
	
	if (!$first_request) {
		srand (time ^ $$);
		$first_request = 1;
	}
	
	##
	# Locate appropriate module
	##
	my $self = undef;
	my $func = undef;
	my $uri = $request->uri();
	if ($ENV{'QUERY_STRING'}) { $uri .= '?' . $ENV{'QUERY_STRING'}; }
	
	foreach my $package_name (keys %$modules) {
		my $module = $modules->{$package_name};
		
		if ($module->{config_parser}) {
			my $old_mod_date = $module->{config_parser}->{modDate};
			my $new_config = $module->{config_parser}->getTree();
			if ($module->{config_parser}->getLastError()) {
				$module->log_debug(1, "Failed to reload module configuration file: " . 
					$module->{config_parser}->{file} . ": " . $module->{config_parser}->getLastError() );
				next;
			}
			
			if ($module->{config_parser}->{modDate} != $old_mod_date) {
				##
				# Config file was reloaded, preform post-processing
				##
				$module->{config} = $new_config;
				$module->setup_config();
				
				if ($module->can('config')) {
					$module->config();
				}
				
				$module->log_debug(3, "Reloaded module config file: " . $module->{name} . ": " . $module->{config_parser}->{file} );
			} # file was reloaded
		} # handle config xml file
		
		foreach my $handler (@{$module->{config}->{Handlers}->{Handler}}) {
			my $reg_exp = $handler->{_Attribs}->{Match};
			if ($uri =~ m@$reg_exp@) {
				my $groups = ['', $1, $2, $3, $4, $5, $6, $7, $8, $9];
				$self = $module;
				$func = $handler->{_Attribs}->{Method};
				$func =~ s@\$(\d+)@ $groups->[$1]; @eg;
				last;
			}
		}
		last if $self;
	} # foreach module
	
	if (!$self) {
		return MP2 ? Apache2::Const::DECLINED() : Apache::Constants::DECLINED();
		# return DECLINED; # no modules support this URI
	}
	
	##
	# Invoke init callback, if defined
	##
	if ($self->can('init_request')) {
		$self->init_request();
	}
	
	$self->log_debug(4, "Transaction begin: " . $self->{name} );
	$self->perf_begin();
	$self->{session} = {
		request => $request,
		handler => $func,
		uri => $uri
	};
	
	##
	# Set mod_perl cleanup handler to perform asynchronous tasks
	##
	# if (Apache->can('push_handlers')) {
		# $request->push_handlers( PerlCleanupHandler => \&run_cleanup_queue );
	# }
	
	##
	# Set __DIE__ signal handler for stack trace
	##
	$SIG{'__DIE__'} = sub { Carp::cluck("Stack Trace"); };
	
	$SIG{'__WARN__'} = sub {
		my ($package_name, undef, undef) = caller();
		$self->log_print( category=>'debug', code=>4, msg=>$_[0], package => $package_name );
	};
	
	eval {
		$result = $self->handle_request();
		# run_cleanup_queue();
	};
	
	$SIG{'__DIE__'} = undef;
	$SIG{'__WARN__'} = undef;
	
	if ($@) {
		$cleanup_queue = [];
		$self->log_debug( 1, 'Perl Interpreter Crashed: ' . $self->{name} . '::' . $func . ': ' . trim($@) . ' (IP: ' . get_remote_ip() . ', URI: ' . $uri . ')' );
		$result = MP2 ? Apache2::Const::HTTP_INTERNAL_SERVER_ERROR() : Apache::Constants::SERVER_ERROR();
		$request->child_terminate();
	}
	
	##
	# Invoke end_request callback, if defined
	##
	if ($self->can('end_request')) {
		$self->end_request();
	}
	
	$self->perf_end();
	$self->log_debug(4, "Transaction end: " . $self->{name} );
	$self->log_debug(5, "Main Performance Metrics: " . $self->perf_summarize() );
	$self->perf_reset();
	return $result;
}

sub handle_request {
	##
	# Handle XML API request
	##
	my $self = shift;
	my $raw_xml = undef;
	my $xml = undef;
	
	$self->{session}->{http_result} = MP2 ? Apache2::Const::OK() : Apache::Constants::OK();
	$self->{session}->{output_sent} = 0;
	$self->{session}->{error} = '';
	
	##
	# Reset internal response parameters
	##
	$self->{session}->{response} = {
		Code => 0,
		Description => ''
	};

	##
	# Setup query and process query string
	##
	$self->{session}->{query} ||= {};
	my $query = $self->{session}->{query};

	if ($self->{session}->{uri} =~ /\?/) {
		merge_hashes($query, parse_query($self->{session}->{uri}), 1);
	}
	
	$self->log_debug(4, "Request URI: " . $self->{session}->{uri}, ", Remote IP: " . $ENV{'REMOTE_ADDR'} );
	$self->perf_begin('r');
	
	my $headers = $self->{session}->{request}->headers_in();
	$self->log_debug(4, 'Incoming HTTP Headers: ' . join(', ', map { $_.'='.$headers->{$_} } keys %$headers) );
	$self->{session}->{headers} = $headers;
	
	$self->{session}->{cookie} = parse_cookies();
	
	##
	# Determine request type, and parse accordingly
	##
	if ($self->{session}->{request}->method() eq 'POST') {
		if ($headers->{'Content-Type'} =~ m@^(text|application)/xml@i) {
			##
			# Pure text/xml request -- read raw XML from content
			##
			$self->log_debug(5, "Parsing pure XML POST");
			
			my $content_length = $headers->{'Content-Length'};
			if (!$content_length) {
				return $self->api_error( 'api/request', 'Missing Content-Length Header' );
			}
			elsif ($self->{config}->{PostMaxBytes} && ($content_length > $self->{config}->{PostMaxBytes})) {
				return $self->api_error( 'api/request', 'Content-Length Exceeds Maximum Limit: ' . $content_length . '/' . $self->{config}->{PostMaxBytes} . ' bytes' );
			}
			
			my $size = 0;
			eval {
				$size = $self->{session}->{request}->read($raw_xml, $content_length);
			};
			if ($@) {
				return $self->api_error( 'api/request', "Apache socket read error: $@" );
			}

			if (!$size || $size != $content_length) {
				return $self->api_error( 'api/request', 'Unexpected End of Data: ' . $size . '/' . $content_length . ' bytes' );
			}
		} # pure xml post
		elsif ($query->{usecgi}) {
			# client is requesting we parse via CGI
			$self->log_debug(5, "Parsing standard HTTP POST: " . $headers->{'Content-Type'});
			
			my $q = new CGI();
			my $error = $q->cgi_error;
			if ($error) {
				return $self->api_error('api/request', $error);
			}
			my $post_vars = {};
			foreach my $key ($q->param()) { $post_vars->{$key} = $q->param($key); }
			
			$self->log_debug(4, 'Incoming POST Parameters: ' . join(', ', map { $_.'='.$post_vars->{$_} } keys %$post_vars) );
			
			my @files = $q->upload();
			if (scalar @files) {
				$self->log_debug(5, "POST contains file uploads");
				foreach my $key ($q->param()) {
					if ($q->upload($key)) {
						my $fh = $q->upload($key);
						my $bytes = (stat($fh))[7];
						my $data = undef;
						$fh->read( $data, $bytes );
						$self->log_debug(4, "Received file upload: " . $key . " (" . get_text_from_bytes($bytes) . ", $bytes bytes)" );
						$post_vars->{$key.'_data'} = $data;
						$post_vars->{$key} = ''.$post_vars->{$key};
					}
				}
			}
			
			##
			# Setup session and query parameters
			##
			$self->{session}->{cgi} = $q;
			foreach my $key (keys %$post_vars) { $query->{$key} = $post_vars->{$key}; }

			$raw_xml = $query->{custom} || $query->{xml} || $query->{input} || undef;
		}
		elsif ($headers->{'Content-Type'} =~ m@^multipart/form-data\;\s+boundary\s*\=\s*(.+)$@) {
			##
			# Multipart POST, parse ourselves
			##
			my $boundary = $1;
			$self->log_debug(5, "Parsing multipart HTTP POST" );

			my $content_length = $headers->{'Content-Length'};
			if (!$content_length) {
				return $self->api_error('api/request', 'Missing Content-Length Header');
			}

			my $data;
			my $size = 0;
			eval {
				$size = $self->{session}->{request}->read($data, $content_length);
			};
			if ($@) {
				return $self->api_error( 'api/request', "Apache socket read error: $@" );
			}

			if (!$size || ($size != $content_length)) {
				return $self->api_error( 'api/request', 'Unexpected End of Data: ' . $size . '/' . $content_length . ' bytes' );
			}

			foreach my $chunk (split(/(^|\r\n)\-\-$boundary/, $data)) {
				if ($chunk && ($chunk =~ /\S/)) {
					my ($header, $content) = split(/\r\n\r\n/, $chunk, 2);
					if ($header =~ /\bname\s*\=\s*\"([^\"]+)\"/) {
						my $key = $1;
						if ($header =~ /\bfilename\s*\=\s*\"([^\"]+)\"/) {
							# file upload
							my $filename = $1;
							$query->{$key} = $filename;
							$query->{$key.'_data'} = $content;
							
							my $bytes = length($content);
							$self->log_debug(4, "Received file upload: $key: $filename (" . get_text_from_bytes($bytes) . ", $bytes bytes)" );
						}
						else {
							# simple key/value pair
							$query->{$key} = $content;
						}
					}
				}
			} # foreach chunk
			
			$raw_xml = $query->{custom} || $query->{xml} || $query->{input} || undef;
		} # multipart
		elsif ($headers->{'Content-Type'} =~ m@(application\/x\-www\-form\-urlencoded)@i) {
			##
			# Standard url-encoded POST -- parse using CGI
			##
			$self->log_debug(5, "Parsing standard HTTP POST: " . $headers->{'Content-Type'});
			
			my $q = new CGI();
			my $error = $q->cgi_error;
			if ($error) {
				return $self->api_error('api/request', $error);
			}
			my $post_vars = {};
			foreach my $key ($q->param()) { $post_vars->{$key} = $q->param($key); }
			
			$self->log_debug(4, 'Incoming POST Parameters: ' . join(', ', map { $_.'='.$post_vars->{$_} } keys %$post_vars) );
			
			# my @files = $q->upload();
			# if (scalar @files) {
			# 	foreach my $key ($q->param()) {
			# 		if ($q->upload($key)) {
			# 			my $fh = $q->upload($key);
			# 			my $bytes = (stat($fh))[7];
			# 			$self->log_debug(4, "Received file upload: " . $key . " (" . get_text_from_bytes($bytes) . ", $bytes bytes)" );
			# 		}
			# 	}
			# }
			
			##
			# Setup session and query parameters
			##
			$self->{session}->{cgi} = $q;
			foreach my $key (keys %$post_vars) { $query->{$key} = $post_vars->{$key}; }

			$raw_xml = $query->{custom} || $query->{xml} || $query->{input} || undef;
			# if (!$raw_xml) {
			# 	return $self->api_error( 'api/request', 'Missing XML Input Parameter' );
			# }
		} # standard multipart post
		else {
			##
			# Unknown type of post, just read data and activate handler
			##
			$self->log_debug(5, "Parsing unknown POST type: " . $headers->{'Content-Type'});
			
			my $content_length = $headers->{'Content-Length'};
			if (!$content_length) {
				return $self->api_error( 'api/request', 'Missing Content-Length Header' );
			}
			elsif ($self->{config}->{PostMaxBytes} && ($content_length > $self->{config}->{PostMaxBytes})) {
				return $self->api_error( 'api/request', 'Content-Length Exceeds Maximum Limit: ' . $content_length . '/' . $self->{config}->{PostMaxBytes} . ' bytes' );
			}
			
			my $data = '';
			my $size = 0;
			eval {
				$size = $self->{session}->{request}->read($data, $content_length);
			};
			if ($@) {
				return $self->api_error( 'api/request', "Apache socket read error: $@" );
			}

			if (!$size || $size != $content_length) {
				return $self->api_error( 'api/request', 'Unexpected End of Data: ' . $size . '/' . $content_length . ' bytes' );
			}
			
			$self->{session}->{raw_post_data} = $data;
		} # unknown type of post

		##
		# Save raw XML for later use
		##
		$self->{raw_xml} = $raw_xml;
	}
	else {
		##
		# GET request method
		##
		$self->log_debug(5, "Parsing standard HTTP GET");
		
		if ($query->{xml}) {
			# raw XML on query param
			$self->{raw_xml} = $raw_xml = $query->{xml};
		}
	} # HTTP GET
	
	$self->perf_end('r');
	
	if ($raw_xml) {
		$self->log_debug(4, 'XML Request: ' . $raw_xml );
		
		##
		# Parse XML using XML::Lite
		##
		$self->perf_begin('xmlparse');
		$self->{parser} = new XML::Lite(
			text => $raw_xml,
			preserveAttributes => 1
		);
		$self->perf_end('xmlparse');
		
		##
		# Check for parsing errors
		##
		my $error = $self->{parser}->getLastError();
		if ($error) {
			return $self->api_error( 'api/xml', $error );
		}
		
		##
		# Get reference to xml tree.
		##
		$xml = $self->{parser}->getTree();
	} # parse xml
	
	$self->{session}->{xml} = $xml;
	
	my $func = $self->{session}->{handler};
	# if (!$self->can($func)) {
	# 	return $self->api_error( 'api/handler', "Handler method does not exist: " . $self->{name} . "::" . $func );
	# }
	
	##
	# Invoke prep callback, if defined
	##
	if ($self->can('prep_request')) {
		my $result = $self->prep_request();
		if (!$result) {
			return MP2 ? Apache2::Const::DECLINED() : Apache::Constants::DECLINED();
		}
	}
	
	##
	# Invoke user handler function
	##
	$self->log_debug(5, "Invoking handler method: " . $self->{name} . "::" . $func );
	$self->perf_begin($func);
	$self->$func();
	$self->perf_end($func);
	
	##
	# Send output if not already sent
	##
	if (!$self->{session}->{output_sent}) {
		$self->send_response( %{$self->{session}->{response}} );
	}
	
	my $headers_out = $self->{session}->{request}->headers_out();
	$self->log_debug(4, 'Outgoing HTTP Headers: ' . join(', ', map { $_.'='.$headers_out->{$_} } keys %$headers_out) );
	
	return $self->{session}->{http_result};
}

sub redirect {
	##
	# Set response to 302 (redirect)
	##
	my ($self, $url) = @_;
	$self->{session}->{http_result} = MP2 ? Apache2::Const::REDIRECT() : Apache::Constants::REDIRECT();
	$self->header_out( 'Location', $url );
	$self->{session}->{output_sent} = 1;
	return undef;
}

sub declined {
	##
	# Set response to 404
	##
	my $self = shift;
	$self->{session}->{http_result} = MP2 ? Apache2::Const::DECLINED() : Apache::Constants::DECLINED();
	$self->{session}->{output_sent} = 1;
	return undef;
}

sub not_modified {
	##
	# Set response to 304
	##
	my $self = shift;
	$self->{session}->{http_result} = MP2 ? Apache2::Const::HTTP_NOT_MODIFIED() : Apache::Constants::USE_LOCAL_COPY();
	$self->{session}->{output_sent} = 1;
	return undef;
}

sub status_partial {
	##
	# return HTTP 206
	##
	my $self = shift;
	$self->{session}->{http_result} = MP2 ? Apache2::Const::HTTP_PARTIAL_CONTENT() : 0;
	return $self->{session}->{http_result};
}

sub header_out {
	##
	# Add header to output
	##
	my ($self, $key, $value) = @_;
	$self->{session}->{request}->headers_out()->set( $key, $value );
}

sub send_headers {
	##
	# Send HTTP headers (mod_perl 1.x only -- mp2 is automatic)
	##
	my $self = shift;
	if (!MP2) { $self->{session}->{request}->send_http_header(); }
}

sub run_cleanup_queue {
	##
	# Execute cleanup queue, happens after request completes
	##
	if (scalar @$cleanup_queue) {
		$cleanup_queue->[0]->{self}->perf_reset();
		$cleanup_queue->[0]->{self}->perf_begin();
		foreach my $task (@$cleanup_queue) {
			my $self = $task->{self};
			my $func = $task->{func};
			$self->log_debug(5, "Running cleanup task: " . $self->{name} . "::" . $func);
			$self->perf_begin($func);
			$self->$func( @{$task->{args}} );
			$self->perf_end($func);
			$self->log_debug(5, "Cleanup task complete: " . $self->{name} . "::" . $func);
		}
		$cleanup_queue->[0]->{self}->perf_end();
		$cleanup_queue->[0]->{self}->log_debug(5, "Cleanup Performance Metrics: " . $cleanup_queue->[0]->{self}->perf_summarize() );
		$cleanup_queue->[0]->{self}->perf_reset();
		$cleanup_queue = [];
	}
}

sub register_cleanup_handler {
	##
	# Register task to execute after request completes
	##
	my $self = shift;
	my $func = shift;
	
	push @$cleanup_queue, {
		'self' => $self,
		'func' => $func,
		'args' => [ @_ ]
	};
}

sub api_error {
	##
	# An error has occured
	##
	my ($self, $key, $msg) = @_;
	
	$self->log_print(
		category => 'error',
		code => $key,
		msg => $msg,
		client_info => get_client_info()
	);
	
	$self->send_response(
		Code => $key,
		Description => $msg
	);
	
	$self->{session}->{error} = "$key: $msg";
	
	return MP2 ? Apache2::Const::OK() : Apache::Constants::OK();
}

sub set_response {
	##
	# Set response code and description, but don't send it yet
	##
	my ($self, $code, $desc) = @_;
	
	$self->log_debug(5, "Setting response to: $code: $desc");
	
	$self->{session}->{response}->{Code} = $code;
	$self->{session}->{response}->{Description} = $desc;
}

sub send_response {
	##
	# Compose and send XML or JS response
	##
	my $self = shift;
	my $response = {@_};
	my $content = '';
	my $mime_type = '';
	my $query = $self->{session}->{query};
	$query->{format} ||= 'xml';
	
	if ($query->{format} =~ /js/i) {
		($content, $mime_type) = $self->js_output($response);
	} # javascript response
	
	if (!$content) {
		##
		# Compose standard XML response
		##
		my $parser = new XML::Lite( $response );
		$parser->setDocumentNodeName( $self->{config}->{XMLResponseDocNodeName} || 'Response' );
		$content = $parser->compose();

		$self->log_debug(5, 'XML Response: ' . $content );

		$mime_type = 'text/xml';
		
		if ($query->{format} =~ /html/i) {
			# wrap xml response in html, for testing
			my $xml_temp = $parser->encodeEntities( $content );
			$content = '<html><body><pre>' . $xml_temp . '</pre></body></html>' . "\n";
			$mime_type = 'text/html';
		}
	} # standard xml response
	
	##
	# Set output Content-type and send HTTP header to client using Apache object method.
	##
	$self->{session}->{request}->content_type($mime_type);
	# $self->{session}->{request}->header_out('Content-Length', length($content) );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	eval {
		$self->send_headers();
		$self->{session}->{request}->print( $content );
	};
	if ($@) {
		$self->log_debug(2, "Apache socket write error: $@");
	}
	
	$self->{session}->{output_sent} = 1;
}

sub js_output {
	##
	# JavaScript Output
	##
	my $self = shift;
	my $response = shift;
	
	my $query = $self->{session}->{query};
	my $content = '';
	my $mime_type = '';
	my $prefix = $query->{callback} ? ($query->{callback} . '(') : 'var response = ';
	my $postfix = $query->{callback} ? ');' : ';';

	my $js = $prefix . xml_to_javascript( $response, 0, 
		lowercase => 0, 
		collapse_attribs => defined($query->{collapse_attribs}) ? $query->{collapse_attribs} : 0,
		compress => defined($query->{compress}) ? $query->{compress} : 0
	) . $postfix;
	
	$self->log_debug(5, 'JS Response: ' . $js );
	
	if ($query->{format} =~ /jshtml/i) {
		$content = qq{<html><head><script langauge="JavaScript">\n};
		$content .= $js;
		if ($query->{onafter}) { $content .= "\n" . $query->{onafter} . "\n"; }
		$content .= qq{</script></head><body></body></html>\n};
		$mime_type = 'text/html';
	}
	else {
		$content = $js;
		if ($query->{onafter}) { $content .= "\n" . $query->{onafter} . "\n"; }
		$mime_type = 'application/x-javascript';
	}

	return ($content, $mime_type);
}

sub require_query {
	##
	# Make sure query string parameters are present in request
	##
	my $self = shift;
	my $args = {@_};
	
	if (!$self->{session}->{query}) {
		$self->api_error( 'api/query', "No query found in request");
		return 0;
	}
	my $query = $self->{session}->{query};
	
	foreach my $key (sort keys %$args) {
		my $reg_exp = $args->{$key};
		
		# reg exp definition shortcuts from config
		if ($self->{config}->{RegExpShortcuts} && $self->{config}->{RegExpShortcuts}->{$reg_exp}) {
			$reg_exp = $self->{config}->{RegExpShortcuts}->{$reg_exp};
		}
		
		my $value = $query->{$key};
		if (!defined($value)) {
			$self->api_error( 'api/query', "Missing required query parameter: $key");
			return 0;
		}
		if ($value !~ m@$reg_exp@) {
			$self->api_error( 'api/query', "Malformed query parameter does not match spec: $key: $reg_exp");
			return 0;
		}
	}
	return 1;
}

sub require_xml {
	##
	# Make sure XML elements are present in request
	##
	my $self = shift;
	my $args = {@_};
	
	if (!$self->{session}->{xml}) {
		$self->api_error( 'api/xml', "No XML found in request");
		return 0;
	}
	
	foreach my $xpath (sort keys %$args) {
		my $reg_exp = $args->{$xpath};
		
		# reg exp definition shortcuts from config
		if ($self->{config}->{RegExpShortcuts} && $self->{config}->{RegExpShortcuts}->{$reg_exp}) {
			$reg_exp = $self->{config}->{RegExpShortcuts}->{$reg_exp};
		}
		
		my $value = xpath_lookup($xpath, $self->{session}->{xml});
		if (!defined($value)) {
			$self->api_error( 'api/xml', "Missing required element: $xpath");
			return 0;
		}
		if ($value !~ m@$reg_exp@) {
			$self->api_error( 'api/xml', "Malformed element does not match spec: $xpath: $reg_exp");
			return 0;
		}
	}
	return 1;
}

sub setup_config {
	##
	# Make sure config file is properly formatted
	##
	my $module = shift;
	
	if (!$module->{config}->{Handlers} || !$module->{config}->{Handlers}->{Handler}) {
		die "XML API: No handlers defined for: ".$module->{name}."\n";
	}
	if (!isa($module->{config}->{Handlers}->{Handler}, 'ARRAY')) {
		$module->{config}->{Handlers}->{Handler} = [ $module->{config}->{Handlers}->{Handler} ];
	}
	
	if (!$module->{config}->{BaseDir}) { die "XML API: No BaseDir defined in config\n"; }
	if ($module->{config}->{BaseDir} !~ m@^/@) { die "XML API: BaseDir path needs to be absolute\n"; }
	$module->{config}->{BaseDir} =~ s@/$@@;
	
	if (!$module->{config}->{Paths}) { $module->{config}->{Paths} = {}; }
	foreach my $key (keys %{$module->{config}->{Paths}}) {
		if ($module->{config}->{Paths}->{$key} !~ m@^/@) {
			$module->{config}->{Paths}->{$key} = $module->{config}->{BaseDir} . '/' . $module->{config}->{Paths}->{$key};
		}
	}
	
	##
	# Setup log configuration
	##
	$module->{config}->{LogTemplate} ||= '[hires_epoch][yyyy-mm-dd hh:mi:ss][hostname][pid][package][client_info][category][code] msg';
	$module->{config}->{DebugLevel} ||= 1;
}

sub init {
	##
	# Initialize new XML API module, should be called during Apache startup
	# Pass in a file path to your config file
	##
	my $args = (scalar @_ == 1) ? { config => shift @_ } : {@_};
	my ($package_name, undef, undef) = caller();
	
	warn "Initializing XML API module: $package_name\n";
	
	if ($modules->{$package_name}) {
		warn "XML API WARNING: Duplicate package initialization: $package_name\n";
	}
	
	my $module = $modules->{$package_name} = new $package_name;
	$module->{name} = $package_name;
	$module->{handlers} = $args->{handlers};
	$module->{log_args} = {
		hostname => get_hostname()
	};
	
	if (!$args->{config}) { $args->{config} = {}; }
	if (!ref($args->{config})) {
		# Load XML config
		warn "Loading XML API config file: " . $args->{config} . "\n";
		my $parser = XML::Cache->new(
			file => $args->{config},
			cacheTime => 60 
		);
		if ($parser->getLastError()) { die "XML API: Failed to load config file: " . $args->{config} . ": " . $parser->getLastError() . "\n"; }
		$args->{config} = $parser->getTree();
		$module->{config_parser} = $parser;
	}
	
	$module->{config} = $args->{config};
	
	##
	# Perform mandatory post-processing of config file
	##
	$module->setup_config();
	
	##
	# Allow module to perform post-processing on its own config file
	# (This is also called if the config file is modified and reloaded)
	##
	if ($module->can('config')) {
		$module->config();
	}
	
	##
	# Allow module to perform its own early setup
	##
	if ($module->can('startup')) {
		$module->startup();
	}
	
	return 1;
}

sub child_init {
	##
	# Called when Apache first forks a child
	# Pass along to all registered modules
	##
	foreach my $name (keys %$modules) {
		my $module = $modules->{$name};
		if ($module->can('child_startup')) {
			$module->log_debug(3, "Performing child startup routine");
			$module->child_startup();
		}
	}
	
	return MP2 ? Apache2::Const::OK() : Apache::Constants::OK();
}

1;
