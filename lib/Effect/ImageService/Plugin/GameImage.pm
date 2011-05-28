package Effect::ImageService::Plugin::GameImage;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use File::Basename;
use XML::API::Tools;
use Effect::ImageService::Plugin;

# our @ISA = ("Effect::ImageService::Plugin");
use base 'Effect::ImageService::Plugin';

sub handler {
	##
	# Handle image transform
	#	Source => source image path
	#	Filter => transformation
	#	Zoom => zoom amount
	#	ZoomFilter => zoom filter
	##
	my $self = shift;
	my $error = undef;
	
	if ($self->{Source} =~ m@^effect\:\/\/games\/([^\/]+)@) {
		$self->{GameID} = $1;
	}
	if ($self->{Source} =~ m@^effect\:\/\/games\/[^\/]+\/revisions\/([^\/]+)@) {
		$self->{RevID} = $1;
	}
	
	my $full_path = $self->parse_path( $self->{Source} );
	$self->log_debug(4, "Transforming image: " . $self->{Source} . " ($full_path)");
	
	my $img = new Image::Magick();
	
	$error = $img->ReadImage( $full_path );
	die $error if $error;
	
	$self->{session}->{media_handle} = $img;
	
	if ($self->{Overlay}) {
		# overlay another image on top of source
		XMLalwaysarray( xml=>$self, element=>'Overlay' );
		foreach my $overlay (@{$self->{Overlay}}) {
			if ($overlay !~ /\//) { $overlay = dirname($self->{Source}) . '/' . $overlay; }
			my $overlay_path = $self->parse_path( $overlay );
			$self->log_debug(4, "Overlaying image on top: " . $overlay . " ($overlay_path)");
		
			my $overlay_img = new Image::Magick();
			$error = $overlay_img->ReadImage( $overlay_path );
			die $error if $error;
		
			$error = $img->Composite(
				compose => 'Over',
				image => $overlay_img,
				gravity => 'NorthWest',
				X => 0,
				Y => 0
			);
			die $error if $error;
		} # foreach overlay
	} # overlay
	
	elsif ($self->{Format}) {
		if ($self->{Format} eq 'gif') {
			my $overlay_img = new Image::Magick();
			$error = $overlay_img->ReadImage( $full_path );
			die $error if $error;
			
			$img = $self->{session}->{media_handle} = new Image::Magick();
			$img->Set( size=>$overlay_img->Get('width').'x'.$overlay_img->Get('height') );
			$img->Read( 'xc:transparent' );
		
			$error = $img->Composite(
				compose => 'Over',
				image => $overlay_img,
				gravity => 'NorthWest',
				X => 0,
				Y => 0
			);
			die $error if $error;
		}
	}
	
	if ($self->{Filter}) {
		foreach my $filter (split(/\,\s*/, $self->{Filter})) {
			if ($filter =~ /^env\:(.+)$/) {
				my $env_name = $1;
				$self->apply_env( $env_name );
			}
			else {
				my $func = 'handler_' . $filter;
				if ($self->can($func)) {
					$self->log_debug(5, "Applying filter: " . $filter);
			
					$self->perf_begin( $filter );
					$self->$func();
					$self->perf_end( $filter );
				}
				else {
					die "Filter not supported: " . $filter . "\n";
				}
			} # std filter
		} # foreach filter
	} # filter
	
	$self->apply_env();
	$self->apply_zoom();
	
	if ($self->{Format}) {
		$self->log_debug(4, "Converting image format to: " . $self->{Format});
		
		if ($self->{Format} eq 'gif') {
			$error = $self->{session}->{media_handle}->Set( depth => 8 );
			die $error if $error;
			
			if ($self->{session}->{media_handle}->Get('matte') && !$self->{NoAlphaDither}) {
				$error = $self->{session}->{media_handle}->OrderedDither( threshold => 'o4x4', channel => 'alpha' );
				die $error if $error;
			}
			
			# $error = $self->{session}->{media_handle}->Quantize( colors => 256, dither => 'true' );
			# die $error if $error;
		}
		
		$error = $self->{session}->{media_handle}->Set( 'magick' => $self->{Format} );
		die $error if $error;
	}
}

# ['rotate','Rotation'], ['rotate_pad','Rotation + Padding'], ['fliph','Flip Horiz'], ['flipv','Flip Vert'], ['fliphv','Flip Horiz + Vert'], ['opacity','Opacity Fade']

sub handler_fliph {
	##
	# Flip entire sprite strip horiz, mirror it
	##
	my $self = shift;
	my $source_image = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	
	my $source_width = $source_image->Get('width');
	my $source_height = $source_image->Get('height');
	$self->log_debug(5, "Source size: $source_width x $source_height");
	
	my $dest_width = $source_width * 2;
	my $dest_height = $source_height;
	$self->log_debug(5, "Dest size: $dest_width x $dest_height");
	
	my $dest_image = new Image::Magick();
	$dest_image->Set( size=>$dest_width.'x'.$dest_height );
	$error = $dest_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$error = $dest_image->Set( magick => $source_image->Get('magick') );
	die $error if $error;
	
	my $mirror_image = $source_image->Clone();
	$error = $mirror_image->Flop();
	die $error if $error;
	
	$error = $dest_image->Composite(
		compose => 'Over',
		image => $source_image,
		gravity => 'NorthWest',
		X => 0,
		Y => 0
	);
	die $error if $error;
	
	$error = $dest_image->Composite(
		compose => 'Over',
		image => $mirror_image,
		gravity => 'NorthWest',
		X => $source_width,
		Y => 0
	);
	die $error if $error;
	
	$self->{session}->{media_handle} = $dest_image;
}

sub handler_flipv {
	##
	# Flip entire sprite strip vert, mirror it
	##
	my $self = shift;
	my $source_image = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	
	my $source_width = $source_image->Get('width');
	my $source_height = $source_image->Get('height');
	$self->log_debug(5, "Source size: $source_width x $source_height");
	
	my $dest_width = $source_width;
	my $dest_height = $source_height * 2;
	$self->log_debug(5, "Dest size: $dest_width x $dest_height");
	
	my $dest_image = new Image::Magick();
	$dest_image->Set( size=>$dest_width.'x'.$dest_height );
	$error = $dest_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$error = $dest_image->Set( magick => $source_image->Get('magick') );
	die $error if $error;
	
	my $mirror_image = $source_image->Clone();
	$error = $mirror_image->Flip();
	die $error if $error;
	
	$error = $dest_image->Composite(
		compose => 'Over',
		image => $source_image,
		gravity => 'NorthWest',
		X => 0,
		Y => 0
	);
	die $error if $error;
	
	$error = $dest_image->Composite(
		compose => 'Over',
		image => $mirror_image,
		gravity => 'NorthWest',
		X => 0,
		Y => $source_height
	);
	die $error if $error;
	
	$self->{session}->{media_handle} = $dest_image;
}

sub handler_fliphv {
	##
	# Flip both horiz, and vert
	##
	my $self = shift;
	$self->handler_fliph();
	$self->handler_flipv();
}

sub handler_opacity {
	##
	# Opacity fade
	##
	my $self = shift;
	
	my $source_image = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	
	my $sprite_width = $source_image->Get('width');
	my $sprite_height = $source_image->Get('height');
	$self->log_debug(5, "Source size: $sprite_width x $sprite_height");
	
	my $largest = ($sprite_width > $sprite_height) ? $sprite_width : $sprite_height;
	
	if (!$self->{NumFrames}) {
		if ($largest <= 32) { $self->{NumFrames} = 80; }
		elsif ($largest <= 64) { $self->{NumFrames} = 60; }
		elsif ($largest <= 96) { $self->{NumFrames} = 40; }
		elsif ($largest <= 128) { $self->{NumFrames} = 30; }
		elsif ($largest <= 256) { $self->{NumFrames} = 20; }
		else { die "Image too large: $sprite_width x $sprite_height\n"; }
	}
	
	my $dest_width = $sprite_width * $self->{NumFrames};
	my $dest_height = $sprite_height;
	$self->log_debug(5, "Dest size: $dest_width x $dest_height");

	my $dest_image = new Image::Magick();
	$dest_image->Set( size=>$dest_width.'x'.$dest_height );
	$error = $dest_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	# my $mask_image = new Image::Magick;
	# $mask_image->Set( colorspace => 'gray' );
	# $mask_image->Set( size => $dest_width . 'x' . $dest_height );
	
	for (my $idx=0; $idx<$self->{NumFrames}; $idx++) {
		my $opacity = 1.0 - ($idx / ($self->{NumFrames} - 1));
		my $op_q16 = int( $opacity * 65535 );
		# my $hex = sprintf( "%02x", int( $opacity * 255 ) );
		# my $clr = '#' . $hex . $hex . $hex;
		$self->log_debug(5, "Fading image $idx / " . $self->{NumFrames} . " ($op_q16)");
		
		# my $temp_image = $source_image->Clone();
		
		# $mask_image->ReadImage('xc:' . $clr);
		
		# $temp_image->Mask(
		# 	mask => $mask_image
		# );
		
		$error = $dest_image->Composite(
			compose => 'Dissolve',
			image => $source_image,
			gravity => 'NorthWest',
			'X' => ($idx * $sprite_width),
			'Y' => 0,
			'opacity' => $op_q16
		);
		die $error if $error;
	} # foreach frame
	
	$error = $dest_image->Set( magick => $source_image->Get('magick') );
	die $error if $error;
	
	$self->{session}->{media_handle} = $dest_image;
}

sub handler_scale {
	##
	# Scale image down to nothing
	##
	my $self = shift;
	
	my $source_image = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	
	my $sprite_width = $source_image->Get('width');
	my $sprite_height = $source_image->Get('height');
	$self->log_debug(5, "Source size: $sprite_width x $sprite_height");
	
	my $largest = ($sprite_width > $sprite_height) ? $sprite_width : $sprite_height;
	
	if (!$self->{NumFrames}) {
		if ($largest <= 32) { $self->{NumFrames} = 80; }
		elsif ($largest <= 64) { $self->{NumFrames} = 60; }
		elsif ($largest <= 96) { $self->{NumFrames} = 40; }
		elsif ($largest <= 128) { $self->{NumFrames} = 30; }
		elsif ($largest <= 256) { $self->{NumFrames} = 20; }
		else { die "Image too large: $sprite_width x $sprite_height\n"; }
	}
	
	my $dest_width = $sprite_width * $self->{NumFrames};
	my $dest_height = $sprite_height;
	$self->log_debug(5, "Dest size: $dest_width x $dest_height");

	my $dest_image = new Image::Magick();
	$dest_image->Set( size=>$dest_width.'x'.$dest_height );
	$error = $dest_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$error = $dest_image->Set( magick => $source_image->Get('magick') );
	die $error if $error;
	
	for (my $idx=0; $idx<$self->{NumFrames}; $idx++) {
		my $scale_factor = 1.0 - ($idx / ($self->{NumFrames}));
		$self->log_debug(5, "Scaling image $idx / " . $self->{NumFrames} . " ($scale_factor)");
		
		my $temp_image = $source_image->Clone();
		$temp_image->Scale(
			Width => int( $sprite_width * $scale_factor ),
			Height => int( $sprite_height * $scale_factor )
		);
		
		# $temp_image->Extent( # this has no effect in PerlMagick
		# 	Width => $sprite_width,
		# 	Height => $sprite_height,
		# 	Background => $self->{Background},
		# 	Gravity => 'center'
		# );
		
		$error = $dest_image->Composite(
			compose => 'Over',
			image => $temp_image,
			gravity => 'NorthWest',
			'X' => ($idx * $sprite_width) + int( (1.0 - $scale_factor) * ($sprite_width / 2) ),
			'Y' => int( (1.0 - $scale_factor) * ($sprite_height / 2) )
		);
		die $error if $error;
	} # foreach frame
	
	$self->{session}->{media_handle} = $dest_image;
}

sub handler_rotate {
	##
	# Rotate image many times to simulate true rotation support
	##
	my $self = shift;
	my $source_image = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	$self->{Retro} ||= 4;
	
	my $sprite_width = $source_image->Get('width');
	my $sprite_height = $source_image->Get('height');
	$self->log_debug(5, "Source size: $sprite_width x $sprite_height");
	
	my $largest = ($sprite_width > $sprite_height) ? $sprite_width : $sprite_height;
	
	if (!$self->{NumFrames}) {
		if ($largest <= 32) { $self->{NumFrames} = 80; }
		elsif ($largest <= 64) { $self->{NumFrames} = 60; }
		elsif ($largest <= 96) { $self->{NumFrames} = 40; }
		elsif ($largest <= 128) { $self->{NumFrames} = 30; }
		elsif ($largest <= 256) { $self->{NumFrames} = 20; }
		else { die "Image too large: $sprite_width x $sprite_height\n"; }
	}
	
	my $dest_width = $sprite_width * $self->{NumFrames};
	my $dest_height = $sprite_height;
	$self->log_debug(5, "Dest size: $dest_width x $dest_height");

	my $dest_image = new Image::Magick();
	$dest_image->Set( size=>$dest_width.'x'.$dest_height );
	$error = $dest_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$error = $dest_image->Set( magick => $source_image->Get('magick') );
	die $error if $error;
	
	for (my $idx=0; $idx<$self->{NumFrames}; $idx++) {
		$self->log_debug(5, "Rotating image $idx / " . $self->{NumFrames});
		
		my $temp_image = $source_image->Clone();
		if ($self->{Retro}) {
			# retro mode -- scale up nearest neighbor
			# prior to rotation
			$error = $temp_image->Resize(
				width => $sprite_width * int($self->{Retro}),
				height => $sprite_height * int($self->{Retro}),
				filter => 'Point'
			);
			die $error if $error;
		}

		$error = $temp_image->Rotate(
			degrees => ( ($idx * 360) / $self->{NumFrames} ),
			color => $self->{Background}
		);
		
		# $error = $temp_image->AffineTransform(
		# 	translate => '' . int($sprite_width / 2) . ', ' . int($sprite_height / 2),
		# 	rotate => ( ($idx * 360) / $self->{NumFrames} ),
		# 	interpolate => 'Filter'
		# );
		
		die $error if $error;

		if ($self->{Retro}) {
			# scale back down, bicubic sharper
			$error = $temp_image->Resize(
				width => int( $temp_image->Get('width') / int($self->{Retro}) ),
				height => int( $temp_image->Get('height') / int($self->{Retro}) ),
				filter => 'Cubic',
				blur => 0.5
			);
			die $error if $error;
		}

		$error = $temp_image->Crop(
			'X' => ( ($temp_image->Get('width') / 2) - ($sprite_width / 2) ),
			'Y' => ( ($temp_image->Get('height') / 2) - ($sprite_height / 2) ),
			width => $sprite_width,
			height => $sprite_height
		);
		die $error if $error;

		# adjust origin due to crop
		$error = $temp_image->Set(
			page => $sprite_width . 'x' .  $sprite_height . '+0+0'
		);
		die $error if $error;

		$error = $dest_image->Composite(
			compose => 'Over',
			image => $temp_image,
			gravity => 'NorthWest',
			'X' => ($idx * $sprite_width),
			'Y' => 0
		);
		die $error if $error;
	} # frame loop
	
	$self->{session}->{media_handle} = $dest_image;
}

sub handler_rotate_pad {
	##
	# Rotate with auto-calculated padding
	# magic number: 1.4375
	##
	my $self = shift;
	my $img = $self->{session}->{media_handle};
	my $error = undef;
	
	$self->{Background} ||= 'transparent';
	
	my $source_width = $img->Get('width');
	my $source_height = $img->Get('height');
	$self->log_debug(5, "Source image size: $source_width x $source_height");
	
	my $largest = ($source_width > $source_height) ? $source_width : $source_height;
	
	my $new_width = int( $largest * 1.4375 );
	my $new_height = int( $largest * 1.4375 );
	$self->log_debug(5, "Padded size: $new_width x $new_height");
	
	my $temp_image = new Image::Magick();
	$temp_image->Set( size=>$new_width.'x'.$new_height );
	$error = $temp_image->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$error = $temp_image->Set( magick => $img->Get('magick') );
	die $error if $error;
	
	$error = $temp_image->Composite(
		compose => 'Over',
		image => $img,
		gravity => 'Center'
	);
	die $error if $error;
	
	$self->{session}->{media_handle} = $temp_image;
	
	$self->log_debug(5, "Padding complete, calling handler_rotate() now");
	return $self->handler_rotate();
}

1;
