package Effect::ImageService::Plugin;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use File::Basename;
use Image::Magick;
use XML::API::Tools;
use MIME::Lite;
use LWP::UserAgent;
use HTTP::Request;
use HTTP::Request::Common qw/POST PUT/;
use HTTP::Response;
use Digest::MD5 qw/md5_hex/;

sub new {
	##
	# Class constructor
	##
	my $class = shift;
	my $self = bless( {@_}, $class );
	return $self;
}

sub set {
	##
	# Set one or more params
	##
	my $self = shift;
	my $params = {@_};
	
	foreach my $key (keys %$params) { $self->{$key} = $params->{$key}; }
}

sub parse_path {
	##
	# Parse effect://PATH/FILENAME if applicable
	##
	my ($self, $url) = @_;
	
	if ($url =~ m@^effect\://(.+)$@) {
		my $path = $1;
		my $storage_key = dirname($path);
		my $filename = basename($path);
		$url = $self->{resident}->{storage}->get_file_path( $storage_key, $filename );
	}
	
	return $url;
}

sub send_xml {
	# passthrough
	my $self = shift;
	return $self->{resident}->send_xml( @_ );
}

sub create_image {
	##
	# Create image canvas
	##
	my ($self, $width, $height, $color) = @_;
	
	my $img = Image::Magick->new();
	
	my $error = $img->Set( size=>$width.'x'.$height );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:' . $color );
	die $error if $error;
	
	return $img;
}

sub transform {
	##
	# Apply named transform Plugin with custom params
	##
	my $self = shift;
	my $transform_name = shift;
	my $transform = {@_};
	
	$self->{resident}->run_custom_transform( $transform_name, %$transform );
}

sub apply_env {
	##
	# Apply environment if applicable
	##
	my $self = shift;
	my $env_name = shift || $self->{Env};
	my $error = undef;
	
	if ($env_name) {
		$self->perf_begin('env');
		
		my $env = undef;
		if (ref($env_name)) {
			# custom transform list
			$env = $env_name;
			$self->log_debug(4, "Applying custom environment filters");
		}
		else {
			my $game_base_path = "/games/" . $self->{GameID} . ($self->{RevID} ? ("/revisions/".$self->{RevID}) : '');
			$env = $self->{resident}->{storage}->list_find( $game_base_path."/envs", { Name => $env_name } );
			$self->log_debug(4, "Applying environment filters: " . $game_base_path . "/envs/" . $env_name);
		}
		
		if ($env) {
			if ($env->{Transforms} && $env->{Transforms}->{Transform}) {
				XMLalwaysarray( xml=>$env->{Transforms}, element=>'Transform' );
			
				foreach my $trans (@{$env->{Transforms}->{Transform}}) {
					my $transform = undef;
					if (!ref($trans)) {
						$transform = $self->decode_transform( $trans );
					}
					else {
						$transform = { %$trans }; # shallow copy
					}
					my $func = $transform->{Name}; delete $transform->{Name};
					my $enabled = $transform->{Enabled}; delete $transform->{Enabled};
					
					if ($enabled eq 1) {
						my $custom_func = 'aet_' . $func;
						if ($self->can($custom_func)) {
							my $result = $self->$custom_func( $transform );
							if ($result) { next; } # plugin handled everything, no need for Mogrify
						}
				
						$self->log_debug(4, "Applying transform: $func: " . serialize_object($transform));
				
						my $error = $self->{session}->{media_handle}->Mogrify( $func, %{$transform} );
						die $error if $error;
					} # enabled
				} # foreach transform
			} # has transforms
		} # found env
		else {
			$self->log_debug(2, "Could not find environment: " . $self->{GameID} . "/" . $env_name);
		}
		
		$self->perf_end('env');
	}
	
	return 1;
}

sub decode_transform {
	##
	# Decode shortcut transform
	##
	my ($self, $code) = @_;
	
	$self->log_debug(5, "Decoding transform: $code");
	
	if (!$self->{resident}->{_transform_shortcuts}) {
		my $shortcuts = { reverse %{$self->{resident}->{config}->{EnvTransformShortcuts}} };
		my $regexp = '(' . join('|', keys %$shortcuts) . ')';
		
		$self->{resident}->{_transform_shortcuts} = {
			shortcuts => $shortcuts,
			regexp => $regexp
		};
	}
	
	my $regexp = $self->{resident}->{_transform_shortcuts}->{regexp};
	my $shortcuts = $self->{resident}->{_transform_shortcuts}->{shortcuts};
	
	$code =~ s/\b$regexp\b/ $shortcuts->{$1}; /oeg;
	$code =~ s/\:/=>/g;
	
	$self->log_debug(5, "Final code for eval: $code");
	
	return eval($code);
}

sub aet_Modulate {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	my $error = undef;
	
	# UI Range: -100 to 0 to 100
	# Magick Range: 0 to 100 to 200
	$transform->{Hue} += 100;
	
	# UI Range: -100 to 0 to 100
	# Magick Range: 0 to 100 to 500
	$transform->{Saturation} += 100;
	if ($transform->{Saturation} > 100) {
		$transform->{Saturation} = 100 + ( ($transform->{Saturation} - 100) * 5 );
	}
	
	# UI Range: -100 to 0 to 100
	# Magick Range: 0 to 100 to 500 (0-100 no scaling)
	# $transform->{Brightness} += 100;
	# if ($transform->{Brightness} > 100) {
	# 	$transform->{Brightness} = 100 + ( ($transform->{Brightness} - 100) * 5 );
	# }
	
	if ($transform->{Brightness} != 0) {
		$transform->{Brightness} += 100;
		if ($transform->{Brightness} > 100) {
			$transform->{Brightness} = 100 + ( ($transform->{Brightness} - 100) * 5 );
		}
		$transform->{Brightness} /= 100;
		
		$self->log_debug(5, "Applying Gamma for brightness: " . $transform->{Brightness});
		
		$error = $self->{session}->{media_handle}->Gamma( Gamma => $transform->{Brightness} );
		die $error if $error;
	} # brightness
	delete $transform->{Brightness};
	
	$self->log_debug(4, "Applying transform: Modulate: " . serialize_object($transform));
	
	$error = $self->{session}->{media_handle}->Modulate( %$transform );
	die $error if $error;
	
	return 1; # we handled the transform ourselves
}

sub aet_Level {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	
	$transform->{Levels} = '' . int( $transform->{Levels} / 2 ) . '%';
	
	return 0;
}

sub aet_OrderedDither {
	# Apply Environment Transform
	# Mode => Threshold, Gray Dithering, Pattern Dithering
	my ($self, $transform) = @_;
	
	my $map = {
		'Gray' => 'checks',
		'Pattern' => 'o4x4'
	};
	
	$transform->{Threshold} = $map->{ $transform->{Threshold} } || $transform->{Threshold};
	
	$self->{session}->{media_handle}->Set( colorspace => 'gray' );
	
	$self->log_debug(4, "Converting to grayscale" );
	my $error = $self->{session}->{media_handle}->Quantize( colorspace => 'gray' );
	die $error if $error;
	
	if ($transform->{Alpha} eq 1) {
		$transform->{Channel} = 'All';
	}
	delete $transform->{Alpha};
	
	return 0;
}

sub aet_Palette {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	
	if (!$transform->{Image}) {
		$self->log_debug(4, "No image specified, skipping palette transform");
		return 1;
	}
	
	my $image_path = '';
	if ($self->{RevID}) {
		$image_path = 'effect://games/' . $self->{GameID} . '/revisions/' . $self->{RevID} . '/assets' . $transform->{Image};
	}
	else {
		$image_path = 'effect://games/' . $self->{GameID} . '/assets' . $transform->{Image};
	}
	
	my $full_path = $self->parse_path( $image_path );
	if (!(-e $full_path)) {
		$self->log_debug(4, "Image not found, skipping palette transform: " . $image_path . " ($full_path)");
		return 1;
	}
	
	$self->log_debug(4, "Applying palette from image: " . $image_path . " ($full_path)");
	my $img = new Image::Magick();
	my $error = $img->ReadImage( $full_path );
	die $error if $error;
	
	# only accept palette images
	my $img_type = $img->Get('type') || '';
	if ($img_type !~ /palette/i) {
		$self->log_debug(2, "Source image does not have a palette, aborting filter");
		return 1;
	}
	
	$transform->{Image} = $img;
	
	my $map = {
		'Direct' => 'Clut',
		'Adaptive' => 'Remap'
	};
	
	my $func = $map->{ $transform->{Mode} } || $transform->{Mode};
	delete $transform->{Mode};
	
	$self->log_debug(4, "Applying transform: $func");
	
	my $error = $self->{session}->{media_handle}->Mogrify( $func, %{$transform} );
	die $error if $error;
	
	return 1; # we handled the transform ourselves
}

sub aet_Mosaic {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	my $error = undef;
	
	my $orig_width = $self->{session}->{media_handle}->Get('width');
	my $orig_height = $self->{session}->{media_handle}->Get('height');
	
	my $sm_width = int( $orig_width / $transform->{Amount} ) || 1;
	my $sm_height = int( $orig_height / $transform->{Amount} ) || 1;
	
	# first, scale down using standard algo
	$error = $self->{session}->{media_handle}->Resize(
		width => $sm_width,
		height => $sm_height,
		filter => 'Cubic',
		blur => 1.0
	);
	die $error if $error;
	
	# then, scale back to orig size using nearest neighbor
	$error = $self->{session}->{media_handle}->Resize(
		width => $orig_width,
		height => $orig_height,
		filter => 'Point',
		blur => 1.0
	);
	die $error if $error;
	
	return 1; # we handled the transform ourselves
}

sub aet_Blur {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	
	$transform->{Sigma} = $transform->{Radius};
	
	if ($transform->{Alpha} eq 1) {
		$transform->{Channel} = 'All';
	}
	delete $transform->{Alpha};
	
	return 0;
}

sub aet_Shade {
	# Apply Environment Transform
	my ($self, $transform) = @_;
	
	$transform->{Geometry} = $transform->{Geometry} . 'x' . $transform->{Geometry};
	$transform->{gray} = 'true';
	
	return 0;
}

sub apply_zoom {
	##
	# Apply zoom if applicable
	##
	my $self = shift;
	my $error = undef;
	
	$self->perf_begin('zoom');
	
	if ($self->{Zoom} && ($self->{Zoom} =~ /^[234]$/)) {
		if ($self->{ZoomFilter} =~ /smooth/i) { $self->{ZoomFilter} = 'Cubic'; }
		elsif ($self->{ZoomFilter} =~ /sharp/i) { $self->{ZoomFilter} = 'Point'; }
		$self->{ZoomFilter} ||= 'Point';
		
		$self->log_debug(5, "Zooming image: " . $self->{Zoom} . "X (" . $self->{ZoomFilter} . ")");
		
		$error = $self->{session}->{media_handle}->Resize(
			width => ($self->{session}->{media_handle}->Get('width') * int($self->{Zoom})),
			height => ($self->{session}->{media_handle}->Get('height') * int($self->{Zoom})),
			filter => $self->{ZoomFilter},
			blur => $self->{ZoomBlur} || 1.0
		);
		die $error if $error;
	} # zoom final image
	
	$self->perf_end('zoom');
	
	return 1;
}

sub send_email {
	##
	# Send e-mail locally, or proxy to another server
	##
	my $self = shift;
	my $args = {@_};
	
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

sub get_game_settings {
	##
	# Get custom user-specified game config settings
	##
	my $self = shift;
	my $game_id = shift;
	my $rev_id = shift || undef;
	my $storage_key = '';
	my $settings = {};
	
	if ($rev_id) {
		$storage_key = '/games/' . $game_id . '/revisions/' . $rev_id . '/assets/text';
	}
	else {
		$storage_key = '/games/' . $game_id . '/assets/text';
	}
	
	my $full_path = $self->{storage}->get_file_path( $storage_key, 'game.xml' );
	if (-e $full_path) {
		$settings = parse_xml( $full_path );
		if (!ref($settings)) {
			$self->log_debug(2, "Error parsing game settings: $storage_key: $settings");
			$settings = {};
		}
	}
	
	return $settings;
}

sub log_debug {
	# Passthrough to resident
	my $self = shift;
	$self->{resident}->log_debug( @_ );
}

sub perf_begin {
	# Passthrough to resident
	my $self = shift;
	$self->{resident}->perf_begin( @_ );
}

sub perf_end {
	# Passthrough to resident
	my $self = shift;
	$self->{resident}->perf_end( @_ );
}

1;
