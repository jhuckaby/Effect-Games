package Effect;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect API
##

# BEGIN {
	# test
# 	use Carp ();
# 	use FileHandle;
# 	$SIG{'__DIE__'} = sub { Carp::cluck("Stack Trace"); };
# 	$SIG{'__WARN__'} = sub {
# 		my ($package_name, undef, undef) = caller();
		# $self->log_print( category=>'debug', code=>4, msg=>$_[0], package => $package_name );
# 		my $fh = new FileHandle ">>/logs/effect/joe.log";
# 		$fh->print( "$package_name: " . $_[0] );
# 		$fh->close();
# 	};
# 	warn "GOT HERE";
# }

use strict;
use FileHandle;
use File::Basename;
use URI::Escape;
use Time::HiRes qw/time/;
use Digest::MD5 qw/md5_hex/;
use HTTP::Date;
use MIME::Lite;
use LWP::MediaTypes;
use Data::Dumper;
use LWP::UserAgent;
use HTTP::Request;
use HTTP::Request::Common qw/POST PUT/;
use HTTP::Response;
use Compress::Zlib;

use XML::API;
use XML::API::Tools;
use XML::Cache;

use Effect::Session;
use Effect::User;
use Effect::Storage;
use Effect::Game;
use Effect::Article;
use Effect::Comments;
use Effect::Assets;
use Effect::GameObjects;
use Effect::ImageRemote;
use Effect::GameRevisions;
use Effect::Ticket;

our @ISA = (
	"XML::API", 
	"Effect::Session", 
	"Effect::User",
	"Effect::Game",
	"Effect::Article",
	"Effect::Comments",
	"Effect::Assets",
	"Effect::GameObjects",
	"Effect::ImageRemote",
	"Effect::GameRevisions",
	"Effect::Ticket"
);

XML::API::init('/effect/conf/Effect.xml');

sub handler : method { return XML::API::handler(@_); }

sub init_request {
	##
	# Initialize request
	##
	my $self = shift;
	$self->{storage}->session_start();
}

sub api_get_config {
	##
	# Get application configuration
	##
	my $self = shift;
	$self->{session}->{response}->{Config} = $self->{config};
	$self->set_response(0, "Success");
}

sub api_view {
	##
	# View file or metadata from storage
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$self->{session}->{uri} =~ m@/view(.+)$@;
	my $path = $1 || return $self->api_error( 'request', 'Bad request' );
	$path =~ s/\?.*$//; # strip query
	
	my $filename = '_metadata.xml';
	
	if ($path =~ s@/([\w\-\.]+\.\w+)$@@) {
		$filename = $1;
		
		# JOE TESTING RANDOM HTTP FAILURES -- TODO TODO TODO REMOVE ME
		
		# if (($path =~ m@/games/@) && ($path =~ m@/audio/@) && (rand() < 1.5)) {
			# return $self->api_error( 'request', "JOE TESTING RANDOM HTTP FAILURES.  THIS IS ONE SUCH FAILURE." );
			# return $self->declined(); # 404
		# }
		
		# if (($path =~ m@/games/@) && (rand() < 0.1)) {
			# return $self->api_error( 'request', "JOE TESTING RANDOM HTTP FAILURES.  THIS IS ONE SUCH FAILURE." );
		# 	return $self->declined(); # 404
		# }
		
	}
	$path =~ s@/$@@; # strip last slash
	
	$self->log_debug(5, "Loading path: $path/$filename");
	my $full_path = $self->{storage}->get_file_path( $path, $filename );
	$self->log_debug(5, "Full path: $full_path");
	
	if (!(-e $full_path)) {
		$self->api_error( 'request', "File not found: $path/$filename" );
		return $self->declined();
	}
	my $file_mod = (stat($full_path))[9];
	
	if ($query->{mod} && ($query->{mod} != $file_mod)) {
		$file_mod = $query->{mod};
	}
	
	# If-Modified-Since
	my $since_date = $self->{session}->{request}->headers_in->get('If-Modified-Since');
	if ($since_date) {
		$self->log_debug(4, 'Detected Header: If-Modified-Since: ' . $since_date );
		$self->log_debug(4, 'File modification date: ' . time2str($file_mod) );
		my $since_epoch = str2time( $since_date );
		if ($since_epoch && ($file_mod == $since_epoch)) {
			##
			# File has not been changed since browser's last request, so return HTTP 304.
			# Browser will use its cached copy for display.
			##
			$self->log_debug(4, 'File has not changed, returning HTTP 304' );
			return $self->not_modified();
		}
		else {
			$self->log_debug(4, 'File has changed, sending new version to client' );
		}
	} # IMS
	
	my $content = undef;
	if (($query->{zoom} && $query->{zoom} =~ /^[234]$/) || $query->{filter} || $query->{overlay} || 
		$query->{env} || ($query->{format} && ($query->{format} =~ /(gif|jpg|jpe|jpeg|png)/))) {
		# custom image transform
		
		# check cache first
		my $cache_path = '/cache/' . md5_hex(
			"$path/$filename/" . 
			($query->{zoom} || '-') . '/' . 
			($query->{zoom_filter} || '-') . '/' . 
			($query->{filter} || '-') . 
			($query->{overlay} || '-') . 
			($query->{frames} || '-') . 
			($query->{env} || '-') . 
			($query->{format} || '-')
		);
		my $cache_data = $self->{storage}->get_metadata( $cache_path );
		if ($cache_data && ($cache_data->{FileMod} == $file_mod)) {
			$self->log_debug(5, "Pulling image from cache: $cache_path");
			$content = $self->{storage}->get_file_contents( $cache_path, "payload.bin" );
		}
		else {
			# need to dynamically transform image
			$self->log_debug(5, "Cache miss, dynamically transforming image");
			
			my $transforms = [
				{ _Attribs => { Name => 'GameImage' },
					Source => 'effect:/' . $path . '/' . $filename,
					Filter => $query->{filter} || '',
					NumFrames => $query->{frames} || '',
					Zoom => $query->{zoom} || '',
					ZoomFilter => $query->{zoom_filter} || '',
					Overlay => $query->{overlay} || '',
					Env => $query->{env} || '',
					Format => $query->{format} || ''
				}
			];
			
			my $img_resp = $self->send_image_service_request(
				Transform => $transforms
			);
			if (ref($img_resp)) {
				return $self->api_error('game', $img_resp->{Description});
			}
			$content = $img_resp;
			
			# store in cache
			if ($cache_data) {
				# cache record already exists, just update and mark for commit
				$cache_data->{FileMod} = $file_mod;
				$self->{storage}->mark( $cache_path );
			}
			else {
				# first time for this cache record
				$self->{storage}->create_record( $cache_path, { FileMod => $file_mod } );
			}
			
			$self->{storage}->store_file( $cache_path, 'payload.bin', $content );
			$self->{storage}->set_expiration( $cache_path, time() + (86400 * 7) ); # 7 days
		} # cache miss
	} # dv
	else {
		# plain file view
		$content = load_file($full_path);
	}
	
	# if ($ENV{'HTTP_USER_AGENT'} =~ /Firefox/) {
	if (1) {
		$self->header_out( 'Accept-Ranges', 'none' );
	}
	else {
		# HTTP Range support
		my $range_req = '';
		my $len = length($content);
		if ($range_req = $self->{session}->{request}->headers_in->get('Range')) {
			if ($range_req =~ /bytes\s*\=\s*(.+)$/i) {
				my $brange = $1;
				my ($bstart, $bend) = (0, 0);

				if ($brange =~ /^(\d+)\s*\-\s*(\d+)$/) {
					# standard format, 0-499
					($bstart, $bend) = ($1, $2);
				}
				elsif ($brange =~ /^(\d+)\s*\-$/) {
					# open-right-ended, 0-, set to EOF-1
					($bstart, $bend) = ($1, ($len - 1));
				}
				elsif ($brange =~ /^\-\s*(\d+)$/) {
					# open-left-ended, -500, set to bytes from end
					($bstart, $bend) = ($len - $1, ($len - 1));
				}
				else {
					# unsupported, just do the whole file
					($bstart, $bend) = (0, ($len - 1));
				}

				my $blen = ($bend - $bstart) + 1;

				$self->log_debug(4, 'Detected Header: Range: ' . $range_req );
				$self->log_debug(5, "Adjusted Range: $bstart-$bend/$blen (" . $len . ')' );

				if (($bend > $bstart) && ($blen <= $len)) {
					$content = substr($content, $bstart, $blen);

					$blen = length($content);
					$bend = $bstart + $blen - 1;

					my $old_len = $len;
					$len = length($content);

					$self->{session}->{request}->status( $self->status_partial() );
					$self->header_out("Content-Range", "bytes $bstart-$bend/$old_len");

					$self->log_debug(5, "Sending back HTTP 206 Partial Content ($blen bytes at offset $bstart)");
				}
				else {
					$self->log_debug(2, "Invalid range request ($range_req), returning entire content" );
				}
			} # good range header fmt
		} # partial content
	
		$self->header_out( 'Accept-Ranges', 'bytes' );
	}
	
	$self->log_debug(5, "File size: " . length($content) . " bytes");
	my $ext = lc($filename); $ext =~ s/^.+\.(\w+)$/$1/;
	
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($full_path))[9] ) );
	
	$self->set_ttl( ($query->{ttl} && ($query->{ttl} eq 'static')) ? 'StaticTTL' : 'ViewTTL' );
	
	$self->log_print(
		category => 'view',
		code => length($content),
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	##
	# If XML file and client requests 'format', use built-in XML::API response mechanism
	##
	if (($ext eq 'xml') && $self->{session}->{query}->{format}) {
		my $xml = parse_xml( $content );
		if (!ref($xml)) {
			return $self->api_error( 'request', "Failed to parse xml: $path/$filename: $xml" );
		}
		$self->{session}->{response}->{Data} = $xml;
		$self->set_response(0, "Success");
		return;
	}
		
	$self->{session}->{request}->content_type( guess_media_type($filename) );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	if ($query->{download}) {
		my $download_filename = ($query->{download} eq "1") ? $filename : $query->{download};
		$self->{session}->{request}->headers_out()->set('Content-disposition', "attachment; filename=" . $download_filename);
	}
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_download {
	##
	# Download file or metadata from storage
	# Do not load into memory
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$self->{session}->{uri} =~ m@/download(.+)$@;
	my $path = $1 || return $self->api_error( 'request', 'Bad request' );
	$path =~ s/\?.*$//; # strip query
	
	my $filename = '_metadata.xml';
	
	if ($path =~ s@/([\w\-\.]+\.\w+)$@@) {
		$filename = $1;
	}
	$path =~ s@/$@@; # strip last slash
	
	$self->log_debug(5, "Loading path: $path/$filename");
	my $full_path = $self->{storage}->get_file_path( $path, $filename );
	$self->log_debug(5, "Full path: $full_path");
	
	if (!(-e $full_path)) {
		$self->api_error( 'request', "File not found: $path/$filename" );
		return $self->declined();
	}
	my @stats = stat($full_path);
	my $file_mod = $stats[9];
	
	if ($query->{mod} && ($query->{mod} != $file_mod)) {
		$file_mod = $query->{mod};
	}
	
	# If-Modified-Since
	my $since_date = $self->{session}->{request}->headers_in->get('If-Modified-Since');
	if ($since_date) {
		$self->log_debug(4, 'Detected Header: If-Modified-Since: ' . $since_date );
		$self->log_debug(4, 'File modification date: ' . time2str($file_mod) );
		my $since_epoch = str2time( $since_date );
		if ($since_epoch && ($file_mod == $since_epoch)) {
			##
			# File has not been changed since browser's last request, so return HTTP 304.
			# Browser will use its cached copy for display.
			##
			$self->log_debug(4, 'File has not changed, returning HTTP 304' );
			return $self->not_modified();
		}
		else {
			$self->log_debug(4, 'File has changed, sending new version to client' );
		}
	} # IMS
	
	$self->header_out( 'Accept-Ranges', 'none' );
	
	$self->log_debug(5, "File size: " . $stats[7] . " bytes");
	my $ext = lc($filename); $ext =~ s/^.+\.(\w+)$/$1/;
	
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( $stats[9] ) );
	
	$self->set_ttl( ($query->{ttl} && ($query->{ttl} eq 'static')) ? 'StaticTTL' : 'ViewTTL' );
	
	$self->log_print(
		category => 'view',
		code => $stats[7],
		msg => get_request_url(),
		client_info => get_client_info()
	);
		
	$self->{session}->{request}->content_type( guess_media_type($filename) );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', $stats[7] );
	
	$self->{session}->{request}->headers_out()->set('Content-disposition', "attachment; filename=" . $filename);
	
	my $source_fh = FileHandle->new("<$full_path");
	my ($size, $buffer) = (0, undef);
	while ($size = read($source_fh, $buffer, 32768)) {
		last unless $self->apache_print( $buffer );
	}
	$source_fh->close();
	
	$self->{session}->{output_sent} = 1;
}

sub api_image {
	##
	# Get static image with special headers to force cache for a long time
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$self->{session}->{uri} =~ m@/image/(.+)$@;
	my $image_filename = $1 || return $self->api_error( 'request', 'Bad request' );
	$image_filename =~ s/\?.*$//;
	my $image_file =  $self->{config}->{Paths}->{ImageDir} . '/' . $image_filename;
	
	my $content = undef;
	my $image_ext = lc($image_filename); $image_ext =~ s/^.+\.(\w+)$/$1/; $image_ext =~ s/jpg/jpeg/;
	
	if ($query->{format} && ($query->{format} =~ /(gif|jpg|jpe|jpeg|png)/)) {
		$self->log_debug(5, "Dynamically transforming image: $image_file to " . $query->{format});
		
		my $transforms = [
			{ _Attribs => { Name => 'GameImage' },
				Source => $image_file,
				Format => $query->{format},
				NoAlphaDither => $query->{noalphadither} || ''
			}
		];
		
		my $img_resp = $self->send_image_service_request(
			Transform => $transforms
		);
		if (ref($img_resp)) {
			return $self->api_error('image', $img_resp->{Description});
		}
		$content = $img_resp;
		$image_ext = $query->{format};
	}
	else {
		$self->log_debug(5, "Loading image: $image_file");

		$content = load_file( $image_file );
		if (!$content) {
			# File not found
			$self->api_error( 'request', 'File not found: ' . $image_file );
			return $self->declined();
		}
	}
	
	$self->log_debug(5, "Image size: " . length($content) . " bytes");
	
	my $mime_type = "image/" . $image_ext;
	
	$self->log_print(
		category => 'view',
		code => length($content),
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	$self->{session}->{request}->content_type($mime_type);
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($image_file))[9] ) );
	
	$self->set_ttl( 'StaticTTL' );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub encode_output {
	##
	# Encode output with customizable compression, defaulting to gzip
	##
	my ($self, $content) = @_;
	
	my $accept_encode = $self->{session}->{request}->headers_in->get('Accept-Encoding') || '';
	my $do_encode = $self->{session}->{query}->{encode} || 'gzip';
	if ($do_encode && ($accept_encode =~ /$do_encode/i)) {
		$self->log_debug(4, 'Encoding content stream with ' . $do_encode . ' compression (' . length($content) . ' bytes)' );
			
		if ($do_encode eq 'gzip') {
			$content = Compress::Zlib::memGzip( $content );
		}
		elsif ($do_encode eq 'deflate') {
			my $x = deflateInit();
			my ($output, $status) = $x->deflate( $content );
			my ($output2, $status2) = $x->flush();
			$content = $output . $output2;
		}
		elsif ($do_encode eq 'compress') {
			$content = Compress::Zlib::compress($content);
		}
		$self->{session}->{request}->headers_out()->set("Content-Encoding", "$do_encode");
		$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	}
	
	if ($self->{session}->{request}->headers_out()->get('Vary')) {
		$self->{session}->{request}->headers_out()->set('Vary', 
			$self->{session}->{request}->headers_out()->get('Vary') . ', Accept-Encoding');
	}
	else {
		$self->{session}->{request}->headers_out()->set('Vary', 'Accept-Encoding');
	}
	
	return $content;
}

sub api_psp {
	##
	# Simple Perl ASP handler
	##
	my $self = shift;
	
	my $filename = $self->{session}->{uri};
	$filename =~ s/\?.+$//; # strip query string
	
	# support for PATH_INFO
	$self->{path_info} = '';
	if ($filename =~ s@(\.psp[^/]*?)(/.*)$@$1@) {
		$self->{path_info} = $2;
		$self->log_debug(5, "Path Info: " . $self->{path_info});
	}
	
	my $base_uri = $self->{config}->{BaseURI};
	$filename =~ s@^$base_uri@@; # strip base URI
	
	# if (!$filename) { return $self->api_error( 'request', 'Bad request' ); }
	if (!$filename) { $filename = 'index.psp.html'; }
	my $file = $self->{config}->{Paths}->{WebDir} . '/' . $filename;
	
	my $ext = lc($filename); $ext =~ s/^.+\.(\w+)$/$1/;
	if ($ext eq 'psp') { $ext = 'html'; }
	my $mime_type = "text/" . $ext;
	$self->{session}->{request}->content_type($mime_type); # ASP code may override this
	
	my $content = $self->process_psp_file($file);
	if (!$content) { return; }
	
	$self->log_print(
		category => 'view',
		code => length($content),
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	$content = $self->encode_output( $content );
	eval {
		$self->send_headers();
	
		if (!$self->{session}->{output_sent}) {
			$self->{session}->{request}->print( $content );
			$self->{session}->{output_sent} = 1;
		}
	};
	if ($@) {
		$self->log_debug(2, "Apache socket write error: $@");
	}
}

sub process_psp_file {
	##
	# Process and evaluate ASP file, return transformed contents
	##
	my ($self, $file, $args_raw) = @_;
	
	my $args = {};
	if ($args_raw) {
		if (ref($args_raw)) { $args = $args_raw; }
		else { $args_raw =~ s@(\w+)\=\"([^\"]*)\"@ $args->{$1} = $2; ''; @eg; }
	}
	
	chdir( dirname($file) );
	my $query = $self->{session}->{query};
	
	my $base_uri = $self->{session}->{uri};
	$base_uri =~ s/\?.+$//; # strip query string
	$base_uri = dirname($base_uri);
	
	my $hostname = $self->{session}->{headers}->{Host}; $hostname =~ s/\:\d+$//;
	my $base_href = ($ENV{'HTTPS'} ? 'https' : 'http') . '://' . $hostname . $base_uri;
	
	$self->log_debug(5, "Executing PSP file: $file");
	
	my $content = load_file( $file );
	if (!$content) {
		# File not found
		return $self->api_error( 'request', 'File not found: ' . $file );
	}
	
	my $ie6 = ($ENV{'HTTP_USER_AGENT'} =~ /MSIE\s+6/) ? 1 : 0;
	my $psp_abort = 0;
	
	##
	# Check for includes first
	# <!--#include file="../util_psp/browser_inc.psp" arg1="foo" arg2="bar"-->
	##
	$content =~ s@<\!\-\-\#include\s+file\=\"([^\"]+)\"(.*?)\-\->@ $self->process_psp_file($1, $2); @esg;
	chdir( dirname($file) );
	
	##
	# Perform ASP substitution
	# <% code_here() %>
	##
	$content =~ s{<[\%\?](\=?)(.+?)[\%\?]>}{ my $buffer = ''; my $resp = eval($2) || $@; $1 ? $resp : ($@ ? $@ : $buffer); }esg;
	
	# $content =~ s^<[\%\?]\=(.+?)[\%\?]>^ my $buffer = eval($1); if ($@) {$@;} else {$buffer;} ^esg;
	# $content =~ s{<[\%\?](.+?)[\%\?]>}{ my $buffer = ''; eval($1) ? $buffer : $@; }esg;
	
	return $psp_abort ? '' : $content;
}

sub html_error {
	##
	# Send error back to browser as HTML document
	##
	my $self = shift;
	my $msg = shift;
	my $args = shift || {};
	
	$args->{description} = $msg;
	
	$self->log_debug(2, "Sending HTML Error to client: $msg");
	
	$self->{session}->{request}->content_type('text/html'); # ASP code may override this
	
	my $content = $self->process_psp_file($self->{config}->{Paths}->{WebDir} . '/error.psp.html', $args);
	if (!$content) { return; }
	
	$content = $self->encode_output( $content );
	
	eval {
		$self->send_headers();
		if (!$self->{session}->{output_sent}) {
			$self->{session}->{request}->print( $content );
			$self->{session}->{output_sent} = 1;
		}
	};
	if ($@) {
		$self->log_debug(2, "Apache socket write error: $@");
	}
}

sub api_load_page {
	##
	# Load JavaScript page and return code for execution notifying load
	##
	my $self = shift;
	my $query = $self->{session}->{query};
		
	$self->{session}->{uri} =~ m@/load_page/([\w\-\.\/]+)@;
	my $filename = $1 || return $self->api_error( 'request', 'Bad request' );
	$filename =~ s/\?.*$//; # strip query
	$filename =~ s/\.\.//g; # strip double periods
	
	my $full_path = $self->{config}->{BaseDir} . '/htdocs/js/pages/' . $filename;
	$self->log_debug(5, "Full path: $full_path");
	
	my $content = load_file($full_path);
	if (!$content) {
		# File not found
		$self->api_error( 'request', "Page not found: $filename" );
		return $self->declined();
	}
	
	$self->log_debug(5, "$filename file size: " . length($content) . " bytes");
	
	# see if page requires any additional files (from config file)
	# these are uniquely needed by the page, and always loaded with the page
	my $page_config = XMLsearch( xml=>$self->{config}->{Pages}->{Page}, File => $filename );
	if (!$page_config) {
		$self->api_error( 'request', "Page config not found: $filename" );
		return $self->declined();
	}
	if ($page_config->{Load}) {
		foreach my $extra_filename (split(/\,\s*/, $page_config->{Load})) {
			my $extra_glob = $self->{config}->{BaseDir} . '/htdocs/js/pages/' . $extra_filename;
			foreach my $extra_full_path (glob($extra_glob)) {
				my $extra_content = load_file($extra_full_path);
				if (!$extra_content) {
					# File not found
					$self->api_error( 'request', "Page not found: $extra_filename" );
					return $self->declined();
				}
				$content .= $extra_content;
				$self->log_debug(5, "$extra_filename file size: " . length($extra_content) . " bytes");
			} # foreach extra file
		} # foreach extra glob
	} # page defines other files to be loaded
	
	# see if app needs any additional files (from query)
	# these are on-demand utility files, requested by the app
	if ($query->{file}) {
		XMLalwaysarray( xml=>$query, element=>'file' );
		foreach my $app_filename (@{$query->{file}}) {
			$app_filename =~ s/\.\.//g; $app_filename =~ s/^\///; $app_filename =~ s/[^\w\-\.\/]+//g;
			my $app_full_path = $self->{config}->{BaseDir} . '/htdocs/js/' . $app_filename;
			my $app_content = load_file($app_full_path);
			if (!$app_content) {
				# File not found
				$self->api_error( 'request', "File not found: $app_filename" );
				return $self->declined();
			}
			$content .= $app_content;
			$self->log_debug(5, "$app_filename file size: " . length($app_content) . " bytes");
		}
	}
	
	if ($query->{onafter}) { $content .= $query->{onafter}; }
	
	$content =~ s@\/\*(.*?)\*\/@@sg;
	$content =~ s@(\n|^)\/\/[^\n]*@@g;
	$content =~ s@([^:\\\n\/])\/\/[^\n]*@$1@g;
	$content =~ s@\n\s+@\n@g;
	
	$self->log_print(
		category => 'view',
		code => length($content),
		msg => get_request_url(),
		client_info => get_client_info()
	);
	
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($full_path))[9] ) );
	
	$self->set_ttl( 'ViewTTL' );
		
	$self->{session}->{request}->content_type( 'text/javascript' );
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	
	$content = $self->encode_output( $content );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_admin_save_file_contents {
	##
	# Save actual file contents (text file edit)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Path' => 'StoragePath',
		'/Content' => '.+'
	);
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $xml = $self->{session}->{xml};
	if (!$xml->{Filename}) { $xml->{Filename} = '_metadata.xml'; }
	
	my $username = $self->{session}->{db}->{username};
	my $content = $xml->{Content};
	my $content_length = length($content);
	
	my $path = $xml->{Path};
		
	my $data = $self->{storage}->get_metadata( $path );
	if (!$data) {
		return $self->api_error('assets', "Could not locate metadata for: $path");
	}
	
	my $filename = $xml->{Filename};
	my $byte_count = 0;
	
	if (!$self->{storage}->store_file( $path, $filename, $content )) {
		return $self->api_error('assets', "Could not store data: $path/$filename: " . $self->{storage}->{error});
	}
	
	# log transaction
	$self->log_transaction( 'admin_edit_file', "$path/$filename" );
	
	$self->set_response(0, "Success");
}

sub api_admin_store_metadata {
	##
	# Store metadata for any path (also creates records, admin only)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Path' => 'StoragePath'
	);
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $xml = $self->{session}->{xml};
	my $path = $xml->{Path};
	my $metadata = $xml->{Data} || {};
	
	if (!$self->{storage}->store_metadata( $path, $metadata )) {
		return $self->api_error('storage', "Could not store data: $path: " . $self->{storage}->{error});
	}
	
	# log transaction
	$self->log_transaction( 'admin_store_metadata', "$path" );
	
	$self->set_response(0, "Success");
}

sub api_admin_report_get {
	##
	# Get activity report
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Date' => 'StoragePath'
	);
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $xml = $self->{session}->{xml};
	my $report = $self->{storage}->get_metadata( '/admin/reports/' . $xml->{Date} );
	if (!$report) { $self->api_error( 'admin', "Report not found: " . $xml->{Date} ); }
	
	$self->{session}->{response}->{Report} = $report;
	$self->set_response(0, "Success");
}

sub api_admin_get_all_users {
	##
	# Download CSV file containing data for ALL users
	##
	my $self = shift;
	
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $users = $self->{storage}->list_get( '/admin/master_user_list' );
	my $csv_rows = [
		['Username','Full Name','Email Address','Type','Status','Created','Last Login','Email Opt-In']
	];
	
	if ($users) {
		foreach my $user_stub (@$users) {
			my $username = $user_stub->{Username};
			my $user = $self->{storage}->get_metadata( "/users/$username" );
			if ($user) {
				push @$csv_rows, [
					$username,
					$user->{FullName},
					$user->{Email},
					$user->{AccountType},
					$user->{Status},
					(scalar localtime $user->{_Attribs}->{Created}),
					(scalar localtime $user->{LastLogin}),
					$user->{Preferences}->{effect_email} ? 'Y' : ''
				];
				$self->{storage}->{cache} = {}; # prevent all these metadata files from collecting in memory
			} # good user
		} # foreach user
	} # we have users
	
	my $content = '';
	foreach my $row (@$csv_rows) {
		my $line = '';
		foreach my $col (@$row) {
			$col =~ s/[\"\,]/ /g;
			if ($line) { $line .= ','; }
			$line .= '"' . $col . '"';
		}
		$content .= "$line\n";
	}
	
	$self->header_out('Content-Type', 'text/csv');
	$self->header_out('Content-disposition', "attachment; filename=effect-all-users.csv");
	$self->header_out('Content-Length', length($content));
	$self->header_out('Cache-Control', 'no-cache');
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_admin_get_all_games {
	##
	# Download CSV file containing data for ALL games
	##
	my $self = shift;
	
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $games = $self->{storage}->list_get( '/admin/master_game_list' );
	my $csv_rows = [
		['Game ID','Title','Owner','Created','Modified','Access','State','Genre','Port Size']
	];
	
	if ($games) {
		foreach my $game_stub (@$games) {
			my $game_id = $game_stub->{GameID};
			my $game = $self->{storage}->get_metadata( "/games/$game_id" );
			if ($game) {
				push @$csv_rows, [
					$game_id,
					$game->{Title},
					$game->{Owner},
					(scalar localtime $game->{_Attribs}->{Created}),
					(scalar localtime $game->{_Attribs}->{Modified}),
					$game->{Access},
					$game->{State},
					$game->{Genre},
					$game->{PortWidth} . 'x' . $game->{PortHeight}
				];
				$self->{storage}->{cache} = {}; # prevent all these metadata files from collecting in memory
			} # good game
		} # foreach game
	} # we have games
	
	my $content = '';
	foreach my $row (@$csv_rows) {
		my $line = '';
		foreach my $col (@$row) {
			$col =~ s/[\"\,]/ /g;
			if ($line) { $line .= ','; }
			$line .= '"' . $col . '"';
		}
		$content .= "$line\n";
	}
	
	$self->header_out('Content-Type', 'text/csv');
	$self->header_out('Content-disposition', "attachment; filename=effect-all-games.csv");
	$self->header_out('Content-Length', length($content));
	$self->header_out('Cache-Control', 'no-cache');
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_get_site_info {
	# get misc site info from storage
	my $self = shift;
	my $query = $self->{session}->{query};
	
	my $key = $query->{cat};
	my $storage_key = '/site/' . $key;
	my $data = $self->{storage}->get_metadata( $storage_key );
	if (!$data) { return $self->api_error( 'request', "Data not found: $storage_key" ); }
	
	$self->{session}->{response}->{Data} = $data;
	
	$self->set_response(0, "Success");
	$self->set_ttl( 'ViewTTL' );
}

sub api_send_email {
	##
	# Send e-mail
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	return unless $self->require_xml(
		'/Auth' => '^\w{32}$'
	);
	
	# time based auth check
	my $now = time();
	my $auth = md5_hex( 'skjfgseuf873' . int( $now / 60 ) );
	if ($auth ne $xml->{Auth}) {
		# try previous minute
		$auth = md5_hex( 'skjfgseuf873' . int( $now / 60 ) - 1 );
		if ($auth ne $xml->{Auth}) {
			$self->log_debug(1, "Send email authentication failure: " . $xml->{Auth} . " ($now)");
			$self->set_response(0, "Success"); # false success
			return 1;
		}
	}
	
	my $args = {
		From     => $xml->{From},
		To       => $xml->{To},
		Subject  => $xml->{Subject},
		Data     => $xml->{Body} || $xml->{Data}
	};
	
	my $msg = MIME::Lite->new( %$args );
	if ($msg->send()) {
		$self->set_response(0, "Success");
	}
	else {
		return $self->api_error( 'email', "Failed to send email: $!" );
	}
}

sub send_email {
	##
	# Send e-mail locally, or proxy to another server
	##
	my $self = shift;
	my $args = {@_};
	
	$self->log_debug(5, "Sending e-mail to: " . $args->{To} . ": " . $args->{Subject});
	
	if ($self->{config}->{MailProxy}) {
		# proxy request
		my $url = 'http://' . $self->{config}->{MailProxy} . '/effect/api/send_email';
		
		$args->{Auth} = md5_hex( 'skjfgseuf873' . int( time() / 60 ) );

		my $raw_xml = compose_xml( $args, 'EffectRequest' );
		$self->log_debug(4, "Sending XML request to mail service: $url: $raw_xml" );

		my $ua = LWP::UserAgent->new();
		$ua->timeout( 30 ); # short timeout

		my $request = POST ( $url, 
			Content_Type => 'text/xml',
			Content => $raw_xml
		);

		$self->perf_begin('mail_proxy');
		my $response = $ua->request( $request );
		$self->perf_end('mail_proxy');

		##
		# Check for a successful response
		##
		if ($response->is_success()) {
			my $content = $response->content();
		
			$self->log_debug(5, "Mail Proxy XML Response: $content");

			my $response_xml = parse_xml($content);
			if (!ref($response_xml)) {
				$self->log_debug(1, "Failed to parse response from mail service: $response_xml" );
				return 0;
			}
			
			if ($response_xml->{Code}) {
				$self->log_debug(2, "Failed to proxy mail: " . $response_xml->{Code} . ": " . $response_xml->{Description});
				return 0;
			}
		
		} # success
		else {
			# http error
			$self->log_debug(2, "Failed to proxy mail: " . $response->status_line() );
			return 0;
		}
	}
	else {
		# send locally
		$self->log_debug(4, "Sending mail locally");
		if (!$args->{Data} && $args->{Body}) {
			$args->{Data} = $args->{Body};
			delete $args->{Body};
		}
		my $msg = MIME::Lite->new( %$args );
		if (!$msg->send()) {
			$self->log_debug(2, "Failed to send local mail: $!");
			return 0;
		}
	}
	
	$self->log_debug(4, "Mail send successful");
	return 1;
}

sub end_request {
	##
	# Called at the end of every request
	##
	my $self = shift;
	$self->{storage}->session_end();
}

sub throw_upload_error {
	##
	# Stuff error in user DB, so client can fetch it later
	# (Flash upload cannot receive direct response)
	##
	my ($self, $key, $msg) = @_;
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if ($user) {
		$user->{LastUploadError} = $msg;
	}
	
	$self->{storage}->mark('users/'.$username);
	
	return $self->api_error($key, $msg);
}

sub lock_create_record {
	##
	# Create new record safely using locking
	##
	my ($self, $path, $xml) = @_;
	
	if ($self->{storage}->check_record_exists($path)) {
		return $self->api_error( 'storage', "Storage path already exists: $path" );
	}
	
	$self->{storage}->lock_record( $path, 1 );
	
	if (!$self->{storage}->create_record( $path, $xml )) {
		return $self->api_error( 'storage', "Failed to create record: $path: " . $self->{storage}->{error} );
	}
	
	$self->{storage}->unlock_record( $path );
	
	return 1;
}

sub lock_update_record {
	##
	# Update record safely using locking -- only pass changed elements
	##
	my ($self, $path, $update, $interpret_stats) = @_;
	
	if (!$self->{storage}->check_record_exists($path)) {
		return $self->api_error( 'storage', "Storage path does not exist: $path" );
	}
	
	$self->{storage}->lock_record( $path, 1 ); # exclusive
	
	# make sure to clear cache first
	$self->{storage}->delete_cache_record( $path );
	
	# load fresh copy from disk
	my $xml = $self->{storage}->get_metadata( $path );
	if (!$xml) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error( 'storage', "Could not load storage record: $path" );
	}
	
	# merge changed elements in with xml
	foreach my $key (keys %$update) {
		if ($interpret_stats) {
			# interpret +N and -N values to increment/decrement stats
			my $value = $update->{$key};
			if ($value =~ /^\+(\d+)$/) {
				# increment
				$xml->{$key} += $1;
			}
			elsif ($value =~ /^\-(\d+)$/) {
				# decrement
				$xml->{$key} -= $1;
			}
			else {
				# simple key/value copy
				$xml->{$key} = $update->{$key};
			}
		}
		else {
			# simple key/value copy
			$xml->{$key} = $update->{$key};
		}
	}
	
	# save back to disk
	if (!$self->{storage}->store_metadata( $path, $xml )) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error( 'storage', "Failed to update record: $path: " . $self->{storage}->{error} );
	}
	
	$self->{storage}->unlock_record( $path );
	
	return 1;
}

sub lock_find_update_list_item {
	##
	# Locate an item in a storage list and update it, using an exclusive lock
	##
	my ($self, $path, $criteria, $update, $interpret_stats) = @_;
	if (!$interpret_stats) { $interpret_stats = 0; }
	$self->log_debug(5, "Updating item from list: $path matching criteria: " . serialize_object($criteria) . ", update: " . serialize_object($update));
	
	$self->{storage}->lock_record( $path, 1 );
	my $item = $self->{storage}->list_find( $path, $criteria, 'mark' );
	if (!$item) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error('storage', "Cannot find item matching criteria: $path");
	}
	
	# merge changed elements in with xml
	foreach my $key (keys %$update) {
		if ($interpret_stats) {
			# interpret +N and -N values to increment/decrement stats
			my $value = $update->{$key};
			if ($value =~ /^\+(\d+)$/) {
				# increment
				$item->{$key} += $1;
			}
			elsif ($value =~ /^\-(\d+)$/) {
				# decrement
				$item->{$key} -= $1;
			}
			else {
				# simple key/value copy
				$item->{$key} = $update->{$key};
			}
		}
		else {
			# simple key/value copy
			$item->{$key} = $update->{$key};
		}
	}
	
	my $result = $self->{storage}->commit();
	$self->{storage}->unlock_record( $path );
	
	if (!$result) {
		return $self->api_error('storage', "Failed to update list: $path: " . $self->{storage}->{error});
	}
	
	return 1;
}

sub lock_find_delete_list_item {
	##
	# Locate an item in a storage list and delete it, using an exclusive lock
	##
	my ($self, $path, $criteria) = @_;
	
	$self->log_debug(5, "Deleting item from list: $path matching criteria: " . serialize_object($criteria));
	
	$self->{storage}->lock_record( $path, 1 );
	my $idx = $self->{storage}->list_find_idx( $path, $criteria );
	if ($idx == -1) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error('storage', "Cannot find item matching criteria: $path");
	}
	
	my $result = $self->{storage}->list_cut( $path, $idx, 1 );
	$result &&= $self->{storage}->commit();
	
	$self->{storage}->unlock_record( $path );
	
	if (!$result) {
		return $self->api_error('storage', "Failed to delete from list: $path: " . $self->{storage}->{error});
	}
	
	return 1;
}

sub lock_list_unshift {
	##
	# Unshift item(s) onto list using exclusive lock
	##
	my $self = shift;
	my $path = shift;
	my $result = undef;
	
	$self->{storage}->lock_record( $path, 1 );
	
	while (my $item = shift @_) {
		$self->log_debug(5, "Unshifting item onto list: $path: " . serialize_object($item));
		$result = $self->{storage}->list_unshift( $path, $item );
		$result &&= $self->{storage}->commit();
		last if !$result;
	}
	
	$self->{storage}->unlock_record( $path );
	
	if (!$result) { return $self->api_error('storage', "Failed to unshift onto list: $path: " . $self->{storage}->{error}); }
	
	return 1;
}

sub lock_list_push {
	##
	# Push item(s) onto list using exclusive lock
	##
	my $self = shift;
	my $path = shift;
	my $result = undef;
	
	$self->{storage}->lock_record( $path, 1 );
	
	while (my $item = shift @_) {
		$self->log_debug(5, "Pushing item onto list: $path: " . serialize_object($item));
		$result = $self->{storage}->list_push( $path, $item );
		$result &&= $self->{storage}->commit();
		last if !$result;
	}
	
	$self->{storage}->unlock_record( $path );
	
	if (!$result) { return $self->api_error('storage', "Failed to unshift onto list: $path: " . $self->{storage}->{error}); }
	
	return 1;
}

sub google_closure_compile {
	##
	# Send code to google closure for compilation
	##
	my ($self, $code, $mode, $engine_url) = @_;
	my $url = 'http://closure-compiler.appspot.com/compile';
	
	$self->log_debug(5, "Sending code (".length($code)." bytes) to google closure for compilation with mode: $mode");
	
	my $ua = LWP::UserAgent->new();
	$ua->timeout( 300 );
	
	my $post_params = {
		output_info => 'compiled_code',
		compilation_level => $mode,
		output_format => 'text',
		js_code => $code
	};
	
	if ($engine_url) {
		# $post_params->{js_externs} = $engine_data;
		$post_params->{externs_url} = $engine_url;
	}
	
	my $request = POST ( $url, 
		Content_Type => 'application/x-www-form-urlencoded',
		Content => $post_params
	);
	
	$self->perf_begin('google_closure');
	my $response = $ua->request( $request );
	$self->perf_end('google_closure');

	##
	# Check for a successful response
	##
	if ($response->is_success()) {
		my $content = $response->content();
		if ($content =~ /^Error\((\d+)\)\:\s+/) {
			return {
				Code => $1,
				Description => "Google Closure " . $content
			};
		}
		$self->log_debug(5, "Successful response from google closure");
		return $content;
	}
	else {
		return {
			Code => $response->code(),
			Description => "Google Closure HTTP Error: " . $response->code() . ": " . $response->status_line()
		};
	}
}

sub send_image_service_request {
	##
	# Send request to image service daemon, and return response
	##
	my $self = shift;
	my $xml = {@_};
	my $url = $self->{config}->{ImageServiceURL};
	
	my $raw_xml = compose_xml( $xml, 'EffectImageServiceRequest' );
	$self->log_debug(4, "Sending XML request to image service: $url: $raw_xml" );
	
	my $ua = LWP::UserAgent->new();
	$ua->timeout( 90 ); # short timeout
	
	my $request = POST ( $url, 
		Content_Type => 'text/xml',
		Content => $raw_xml
	);
	
	$self->perf_begin('imageservice');
	my $response = $ua->request( $request );
	$self->perf_end('imageservice');

	##
	# Check for a successful response
	##
	if ($response->is_success()) {
		my $content = $response->content();
		my $content_length = length($content);
		my $content_type = $response->header('Content-Type');
		
		$self->log_debug(5, "Received $content_length bytes of $content_type");
		
		if ($content_type eq 'text/xml') {
			$self->log_debug(5, "XML Response: $content");
			
			my $response_xml = parse_xml($content);
			if (!ref($response_xml)) {
				return {
					Code => 999,
					Description => "Failed to parse response from image service: $response_xml"
				};
			}
			elsif ($response_xml->{Code} eq 'FileProxy') {
				my $file = $response_xml->{Description};
				$self->log_debug(5, "Detected FileProxy response: " . $file);
				my $blob = load_file( $file );
				unlink $file;
				if (!$blob) {
					return {
						Code => 999,
						Description => "Failed to load FileProxy: $file"
					};
				}
				return $blob;
			}
			else {
				return $response_xml;
			}
		}
		else {
			# binary response, return scalar (success)
			return $content;
		}
	}
	else {
		# http error from image service
		return {
			Code => $response->code(),
			Description => "Image Service HTTP Error: " . $response->code() . ": " . $response->status_line() . ": " . $response->content()
		};
	}
}

sub apache_print {
	##
	# Print output to apache socket
	##
	my ($self, $content) = @_;
	
	eval {
		$self->send_headers();
		$self->{session}->{request}->print( $content );
	};
	if ($@) {
		$self->log_debug(2, "Apache failed to send output: $@");
		return 0;
	}
	return 1;
}

sub get_base_url {
	##
	# Get Base URL to this instance of effect (will have trailing slash!)
	##
	my $self = shift;
	my $hostname = $self->{session}->{headers}->{Host}; $hostname =~ s/\:\d+$//;
	return ($ENV{'HTTPS'} ? 'https' : 'http') . '://' . $hostname . $self->{config}->{BaseURI};
}

sub get_base_uri {
	##
	# Get absolute URI to this instance of effect (will have trailing slash!)
	##
	my $self = shift;
	return $self->{config}->{BaseURI};
}

sub get_base_host {
	##
	# Get base protocol and hostname (no URI)
	##
	my $self = shift;
	my $hostname = $self->{session}->{headers}->{Host}; $hostname =~ s/\:\d+$//;
	return ($ENV{'HTTPS'} ? 'https' : 'http') . '://' . $hostname . '/';
}

sub log_transaction {
	##
	# Log transaction to event log
	##
	my ($self, $key, $msg) = @_;
	
	if (ref($msg)) {
		$msg = compose_query($msg);
	}
	
	my $client_info = get_client_info();
	if ($self->{session} && $self->{session}->{db} && $self->{session}->{db}->{username}) {
		$client_info .= " (username=" . $self->{session}->{db}->{username} . ")";
	}
	
	$self->log_print(
		category => 'transaction',
		code => $key,
		msg => $msg,
		client_info => $client_info
	);
}

sub get_string {
	##
	# Lookup string by XPath, and perform inline substitution
	##
	my ($self, $xpath, $args) = @_;
	if (!defined($args)) { $args = {}; }
	my $string = xpath_lookup( $xpath, $self->{config}->{Strings} );
	if (!$string) { return ''; }
	return memory_substitute( $string, $args );
}

sub set_ttl {
	##
	# Return cache friendly headers for a TTL
	##
	my ($self, $ttl) = @_;
	
	if ($ttl =~ /^[A-Za-z]+$/) {
		if ($self->{ttl_cache}->{$ttl}) { $ttl = $self->{ttl_cache}->{$ttl}; }
		else {
			$self->log_debug(1, "Warning: Could not locate TTL cache name: $ttl" );
			$ttl = 0;
		}
	}
	elsif ($ttl =~ /^\d+$/) {
		# number, good, nothing to be done
	}
	else {
		$ttl = get_seconds_from_text( $ttl );
	}
	
	$self->{session}->{request}->headers_out()->set( 'Cache-Control', 'max-age=' . $ttl );
	$self->{session}->{request}->headers_out()->set( 'Expires', time2str( time() + $ttl ) );
	
	if (!$self->{session}->{request}->headers_out()->get('Last-Modified')) {
		$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( time() ) );
	}
}

sub file_magic {
	##
	# Determine format of incoming file by examining actual file data
	# for signature.  Patterns defined in master config file.
	##
	my $self = shift;
	my $header_data = shift;
	
	foreach my $temp (@{$self->{config}->{FileMagic}->{Format}}) {
		my $format = $temp->{_Attribs};
		if (substr($header_data, $format->{Offset}) =~ /$format->{Signature}/) {
			return $format;
		}
	}
	
	return undef;
}

sub config {
	##
	# Called by XML::API when our config file is reloaded
	##
	my $self = shift;
	
	# warn "JOE NEW CONFIG HERE: " . Dumper($self->{config});
}

sub startup {
	##
	# Called by XML::API during apache startup
	##
	my $self = shift;
	
	##
	# Setup our storage system
	##
	$self->{storage} = new Effect::Storage(
		resident => $self,
		config => $self->{config}->{StorageConfig}
	);
	$self->{storage}->permacache_init();
	
	##
	# LWP::MediaTypes is missing a LOT of common types, so add them now
	##
	LWP::MediaTypes::add_type( 'image/pcx' => qw/pcx/ );
	LWP::MediaTypes::add_type( 'image/eps' => qw/eps/ );
	LWP::MediaTypes::add_type( 'text/xml' => qw/xml xsl/ );
	LWP::MediaTypes::add_type( 'text/css' => qw/css/ );
	LWP::MediaTypes::add_type( 'application/x-javascript' => qw/js/ );
	LWP::MediaTypes::add_type( 'application/x-shockwave-flash' => qw/swf/ );
	LWP::MediaTypes::add_type( 'audio/mpeg' => qw/mp3/ );
	LWP::MediaTypes::add_type( 'audio/ogg' => qw/ogg/ );
	LWP::MediaTypes::add_type( 'video/x-flv' => qw/flv/ );
	
	##
	# Cache our TTL values so we don't have to keep calling get_seconds_from_text()
	##
	$self->{ttl_cache} = {
		ViewTTL => get_seconds_from_text( $self->{config}->{StorageConfig}->{ViewTTL} ),
		StaticTTL => get_seconds_from_text( $self->{config}->{StorageConfig}->{StaticTTL} )
	};
	
	##
	# Set perms on debug log
	##
	chmod( 0777, '/logs/effect/debug.log' );
}

sub child_startup {
	##
	# Child startup
	##
	my $self = shift;
}

1;
