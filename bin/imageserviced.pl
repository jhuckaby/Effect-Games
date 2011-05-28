#!/effect/perl/bin/perl

package Effect::ImageService;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Image Service Daemon
# Preforking HTTP Server for image transformation requests
##

use strict;
no strict 'refs';

use FileHandle;
use DirHandle;
use File::Basename;
use File::Path;
use URI::Escape;
use Image::Magick;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use XML::API::Log;
use XML::API::Perf;
use Effect::Storage;
use Effect::Daemon;

use Effect::ImageService::Plugin::New;
use Effect::ImageService::Plugin::Text;
use Effect::ImageService::Plugin::Set;
use Effect::ImageService::Plugin::FontGrid;
use Effect::ImageService::Plugin::GameImage;
use Effect::ImageService::Plugin::LevelPreview;
use Effect::ImageService::Plugin::Mogrify;
use Effect::ImageService::Plugin::Navigator;
use Effect::ImageService::Plugin::NavBackground;
use Effect::ImageService::Plugin::Placeholder;
use Effect::ImageService::Plugin::Zoom;
use Effect::ImageService::Plugin::TwitterGlog;
use Effect::ImageService::Plugin::EnvPreview;
use Effect::ImageService::Plugin::RevisionExport;
use Effect::ImageService::Plugin::OggCreate;

our @ISA = ("XML::API::Log", "XML::API::Perf");

my $resident = bless( {} );

my $daemon_config = parse_xml( '/effect/conf/image_service.xml' );

$resident->{config} = parse_xml( '/effect/conf/Effect.xml' );

foreach my $key (keys %{$resident->{config}->{Paths}}) {
	if ($resident->{config}->{Paths}->{$key} !~ m@^/@) {
		$resident->{config}->{Paths}->{$key} = $resident->{config}->{BaseDir} . '/' . $resident->{config}->{Paths}->{$key};
	}
}

# overwrite log config with our own
$resident->{config}->{DebugLevel} = $daemon_config->{DebugLevel};
$resident->{config}->{Paths}->{LogFile} = $daemon_config->{Paths}->{LogFile};
$resident->{config}->{LogTemplate} = $daemon_config->{LogTemplate};
$resident->{config}->{EchoLog} = $daemon_config->{EchoLog} || 0;

$resident->{storage} = new Effect::Storage(
	config => $resident->{config}->{StorageConfig},
	resident => $resident
);

##
# Setup log
##
$resident->{log_args} = { hostname => trim(`/bin/hostname`) };
my $log_fh = new FileHandle ">>" . $daemon_config->{Paths}->{LogFile};
undef $log_fh;
chmod( 0777, $daemon_config->{Paths}->{LogFile} );

##
# Setup Queue Dir
##
make_dirs_for( $daemon_config->{Paths}->{QueueDir} . '/' );
chmod( 0777, $daemon_config->{Paths}->{QueueDir} );

##
# Setup preforking HTTP server
##
my $daemon = $resident->{daemon} = Effect::Daemon->new(
	name => 'Effect Image Service Daemon',
	process_name => 'ImageService',
	pid_file => $daemon_config->{Paths}->{PidFile},
	debug_level => $daemon_config->{DebugLevel},
	logger => $resident,
	growl => $resident->{config}->{Growl} || '',
	port => $daemon_config->{Server}->{Port},
	max_children => $daemon_config->{Server}->{MaxChildren},
	max_requests_per_child => $daemon_config->{Server}->{MaxRequestsPerChild},
	user => $daemon_config->{Server}->{User},
	request_handler => \&handle_request,
	cleanup_handler => \&cleanup,
	idle_handler => \&idle
);

$daemon->startup();
$daemon->idle();

exit;

sub handle_request {
	my ($daemon, $request, $socket) = @_;
	
	my $self = $resident;
	$self->{request} = $request;
	$self->{socket} = $socket;
	
	$self->perf_reset();
	$self->perf_begin();
	
	$resident->{storage}->session_start();
	
	my $uri = $request->url();
	if ($uri =~ /favicon.ico/) {
		return $daemon->send_response( 404, "File Not Found", "File Not Found: $uri" );
	}
	
	my $session = $self->{session} = {
		uri => $uri,
		query => parse_query($uri),
		request => $request,
		socket => $socket,
		daemon => $daemon,
		resident => $resident,
		output_sent => 0,
		media_handle => undef
	};
	
	# raw POST data should be in $request->content()
	my $body = $request->content();
	if (!$body) {
		return $self->send_xml_error( 'request', "Could not locate POST data in request" );
	}
	
	# locate XML inside post data
	my $raw_xml = '';
	my $content_type = $request->header('Content-Type');
	if ($content_type eq 'application/x-www-form-urlencoded') {
		$body =~ s/\+/%20/g;
		my $params = parse_query($body);
		foreach my $key (keys %$params) { $session->{query}->{$key} = $params->{$key}; }
		$raw_xml = $params->{xml} || $params->{input} || undef;
	}
	elsif ($content_type eq 'text/xml') {
		$raw_xml = $body;
	}
	else {
		return $self->send_xml_error( 'request', "Unsupported Content-Type: $content_type" );
	}
	
	if (!$raw_xml) {
		return $self->send_xml_error( 'request', "Could not locate XML in request" );
	}
	
	# parse xml
	$self->log_debug(3, "Request XML: $raw_xml" );
	
	$self->perf_begin('parse_xml');
	my $xml = parse_xml($raw_xml);
	$self->perf_end('parse_xml');
	
	if (!ref($xml)) {
		return $self->send_xml_error( 'request', "Failed to parse XML: $xml" );
	}
	
	# prep transforms
	if (!$xml->{Transform}) {
		return $self->send_xml_error( 'request', "Could not locate Transform element in XML" );
	}
	
	XMLalwaysarray( xml=>$xml, element=>'Transform' );
	
	# execute transforms
	$self->perf_begin('transforms');
	foreach my $transform (@{$xml->{Transform}}) {
		my $transform_name = $transform->{_Attribs}->{Name};
		$transform_name =~ s@[^\w\:\/]+@@g; $transform_name =~ s@/@::@g;
		$self->log_debug(4, "Applying Transform: $transform_name" );
		
		$self->perf_begin('transform_' . $transform_name);
		
		my $plugin = undef;
		# eval( '$plugin = Effect::ImageService::Plugin::' . $transform_name . '->new();' );
		
		my $class = "Effect::ImageService::Plugin::" . $transform_name;
		eval {
			$plugin = $class->new();
		};
		if ($@) {
			return $self->send_xml_error( 'transform', "Unsupported Transform: $transform_name" );
		}
		
		my $params = { %$transform };
		delete $params->{_Attribs};
		
		$plugin->set(
			%$transform,
			session => $session,
			resident => $resident,
			storage => $resident->{storage},
			params => $params
		);
		
		eval {
			$plugin->handler();
		};
		if ($@) {
			return $self->send_xml_error( 'transform', "$transform_name: $@" );
		}
		
		$self->perf_end('transform_' . $transform_name);
	} # foreach transform
	$self->perf_end('transforms');
	
	if (!$session->{output_sent} && !$session->{media_handle}) {
		return $self->send_xml_error( 'internal', "No output generated from transforms" );
	}
	
	if (!$session->{output_sent}) {
		# send image output
		$self->perf_begin('output');
		my $img_fmt = $session->{media_handle}->Get('magick');
		$img_fmt =~ s/jpg/jpeg/;
		
		my $dir = $ENV{'TEMP_DIR'} || '/var/tmp';
		my $file = $dir . '/blob_temp_' . int(rand(99999)) . '_' . $$ . '.' . $session->{media_handle}->Get('magick');
		my $error = $session->{media_handle}->Write( $file );
		if ($error) {
			return $self->send_xml_error( 'image', "ImageToBlob Error: $error");
		}
		
		$self->perf_end('output');
		$self->perf_begin('response');
		
		if ($daemon_config->{FileProxy}) {
			$self->log_debug(3, "Sending file proxy output: $file");
			$self->send_xml(
				Code => 'FileProxy',
				Description => $file
			);
		}
		else {
			my $blob = load_file( $file );
			my $blob_length = length($blob);
			unlink $file;
			
			$self->log_debug(3, "Sending raw binary image output: $img_fmt ($blob_length bytes)");
			
			my $response = HTTP::Response->new( 200 );
			$response->content( $blob );
			
			$response->header("Content-Type" => "image/$img_fmt");
			$response->header("Content-Length" => $blob_length );
			$socket->send_response($response);
			$socket->close();
		}
		
		$self->perf_end('response');
	}
	
	$self->log_debug(3, "Performance Metrics: " . $self->perf_summarize() );
	$self->perf_reset();
}

sub idle {
	##
	# Called in daemon proc every 1 second
	# Check if queue dir has requests in it
	##
	my $daemon = shift;
	my $self = $resident;
	
	if (dir_has_files($daemon_config->{Paths}->{QueueDir}, '\.xml$') && (!$resident->{queue_pid} || !$daemon->{active_kids}->{$resident->{queue_pid}})) {
		$self->log_debug(3, "Spawning custom child to process async queue");
		$resident->{queue_pid} = $daemon->spawn_custom( \&process_queue );
	}
}

sub process_queue {
	##
	# Process files in queue dir
	# Launched in child proc space
	##
	my $self = $resident;
	$self->perf_reset();
	$self->perf_begin();
	
	my $session = $self->{session} = {};
	
	$resident->{storage}->session_start();
	
	my $files = [ glob($daemon_config->{Paths}->{QueueDir} . '/*.xml') ];
	
	while (scalar @$files) {
		foreach my $file (@$files) {
			$self->log_debug(4, "Processing queue file: $file");
		
			my $xml = parse_xml($file);
			if (ref($xml)) {
				# good xml
				unlink $file;
				
				if ($xml->{Transform}) {
					XMLalwaysarray( xml=>$xml, element=>'Transform' );

					# execute transforms
					$self->perf_begin('transforms');
			
					foreach my $transform (@{$xml->{Transform}}) {
						my $transform_name = $transform->{_Attribs}->{Name};
						$transform_name =~ s@[^\w\:\/]+@@g; $transform_name =~ s@/@::@g;
						$self->log_debug(4, "Applying Transform: $transform_name" );

						$self->perf_begin('transform_' . $transform_name);

						my $plugin = undef;
						# eval( '$plugin = Effect::ImageService::Plugin::' . $transform_name . '->new();' );

						my $class = "Effect::ImageService::Plugin::" . $transform_name;
						eval {
							$plugin = $class->new();
						};
						if ($@) {
							return $self->send_xml_error( 'transform', "Unsupported Transform: $transform_name" );
						}

						my $params = { %$transform };
						delete $params->{_Attribs};

						$plugin->set(
							%$transform,
							config => $resident->{config},
							session => $session,
							resident => $resident,
							storage => $resident->{storage},
							params => $params
						);

						eval {
							$plugin->handler();
						};
						if ($@) {
							$self->log_debug(1, "Transform crashed: $transform_name: $@");
							last;
						}

						$self->perf_end('transform_' . $transform_name);
					} # foreach transform
			
					$self->perf_end('transforms');
				} # xml has transforms
				else {
					$self->log_debug(2, "File has no transforms: $file");
				}
			}
			else {
				$self->log_debug(1, "Failed to parse queue file: $file: $xml");
				rename( $file, $file . ".error.$$." . time() );
			}
		
			$self->perf_count('files', 1);
		} # foreach file
		
		# re-check dir
		$files = [ glob($daemon_config->{Paths}->{QueueDir} . '/*.xml') ];
	} # while dir has files
	
	$resident->{storage}->session_end();
	
	$self->log_debug(3, "Performance Metrics: " . $self->perf_summarize() );
	$self->perf_reset();
}

sub run_custom_transform {
	##
	# Execute custom Plugin transform
	# Designed to be called from a Plugin
	##
	my $self = shift;
	my $transform_name = shift;
	my $transform = {@_};
	
	$self->log_debug(4, "Applying Custom Transform: $transform_name: " . dumper($transform) );

	$self->perf_begin('transform_' . $transform_name);

	my $plugin = undef;
	# eval( '$plugin = Effect::ImageService::Plugin::' . $transform_name . '->new();' );

	my $class = "Effect::ImageService::Plugin::" . $transform_name;
	eval {
		$plugin = $class->new();
	};
	if ($@) {
		die "Unsupported Transform: $transform_name";
	}

	my $params = { %$transform };
	delete $params->{_Attribs};

	$plugin->set(
		%$transform,
		session => $self->{session},
		resident => $resident,
		storage => $resident->{storage},
		params => $params
	);

	$plugin->handler();

	$self->perf_end('transform_' . $transform_name);
}

sub dir_has_files {
	##
	# Return true if dir has files, false otherwise
	# Do this as efficiently as possible
	##
	my $dir = shift;
	my $spec = shift || '.+';
	
	my $dirh = new DirHandle $dir;
	unless (defined($dirh)) {return 0;}
	
	while (my $filename = $dirh->read()) {
		if (($filename ne '.') && ($filename ne '..')) {
			if ($filename =~ m@$spec@) {
				undef $dirh;
				return 1;
			}
		} # don't process . and ..
	}
	undef $dirh;
	
	return 0;
}

sub cleanup {
	##
	# Cleanup handler
	##
	my ($daemon, $request, $socket) = @_;
	
	$resident->{storage}->session_end();
	
	delete $resident->{session};
	delete $resident->{socket};
	delete $resident->{request};
}

sub send_xml {
	##
	# Send XML response
	##
	my $self = shift;
	my $xml = {@_};
	
	$xml->{_Attribs} ||= {};
	$xml->{_Attribs}->{Version} ||= "1.0";
	
	my $raw_xml = compose_xml($xml, 'EffectImageServiceResponse');
	
	$self->log_debug(2, "Sending XML Response: $raw_xml" );
	
	my $response = HTTP::Response->new( 200 );
	
	$response->content( $raw_xml );
	$response->header("Content-Type" => "text/xml");
	
	$self->{socket}->send_response($response);
	$self->{socket}->close();
	
	$self->{session}->{output_sent} = 1;
}

sub send_xml_error {
	##
	# Send XML error
	##
	my ($self, $code, $msg) = @_;
	
	$self->send_xml(
		Code => $code,
		Description => $msg
	);
}

1;
