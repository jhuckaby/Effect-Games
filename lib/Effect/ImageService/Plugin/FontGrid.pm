package Effect::ImageService::Plugin::FontGrid;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use XML::API::Tools;
use Effect::ImageService::Plugin;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Handle image transform
	#	Font => path or effect:// url
	#	Size => point size
	#	Color => text color
	#	Background => background color
	#	Format => png, etc.
	#	GlyphWidth => pixels
	#	GlyphHeight => pixels
	#	GlyphsPerRow => 12
	#	Glyphs => 'ABCDEFGH...',
	#	AntiAlias => 1 or 0
	#	Zoom => 1, 2, 3, 4, etc.
	#	ZoomFilter => Sharp, Smooth
	##
	my $self = shift;
	
	$self->{Background} ||= 'transparent';
	
	my $font = $self->parse_path( $self->{Font} );
	$self->log_debug(4, "Rendering font grid for: " . $self->{Font} . " ($font)");
	$self->{Font} = $font;
	
	$self->{glyph_width} = int( $self->{GlyphWidth} );
	$self->{glyph_height} = int( $self->{GlyphHeight} );
	$self->{num_glyphs} = length( $self->{Glyphs} );
	$self->{glyphs_per_row} = int( $self->{GlyphsPerRow} );
	
	$self->{canvas_width} = $self->{glyph_width} * $self->{glyphs_per_row};
	$self->{canvas_height} = $self->{glyph_height} * (int($self->{num_glyphs} / $self->{glyphs_per_row}) + 1);
	if ($self->{glyphs_per_row} % $self->{num_glyphs} == 0) { $self->{canvas_height} -= $self->{glyph_height}; }
	
	$self->log_debug(4, "Glyphs: " . $self->{Glyphs} . " (" . $self->{num_glyphs} . ")");
	$self->log_debug(4, "Canvas size: " . $self->{canvas_width} . 'x' . $self->{canvas_height} );
	
	my $canvas = new Image::Magick();
	
	my $error = $canvas->Set( size=>$self->{canvas_width}.'x'.$self->{canvas_height} );
	die $error if $error;
	
	$error = $canvas->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	## TESTING GLOW, JOE
	# $self->{Glow} = 1;
	# $self->{GlowColor} = '#FFFFFF';
	# $self->{GlowAmount} = 4;
	# $self->{GlowIntensity} = 1;
	## END TEST
	
	my $len = $self->{num_glyphs};
	for (my $idx = 0; $idx < $len; $idx++) {
		my $ch = substr($self->{Glyphs}, $idx, 1);
		if ($ch eq "\\") { $ch = "\\\\"; }
		
		$self->{ch} = $ch;
		
		my $img = new Image::Magick();
		
		$error = $img->Set( size=>$self->{glyph_width}.'x'.$self->{glyph_height} );
		die $error if $error;

		$error = $img->ReadImage( 'xc:transparent' );
		die $error if $error;
		
		my $x = ($idx % $self->{glyphs_per_row}) * $self->{glyph_width};
		my $y = int($idx / $self->{glyphs_per_row}) * $self->{glyph_height};
		
		# $self->log_debug(5, "Rendering char $ch at loc $x x $y");
		
		# if ($self->{Glow}) {
		# 	$self->apply_glow($img);
		# } # glow
		
		# render final text on image
		$self->render_text( $img );
		
		# composite glyph onto canvas
		$error = $canvas->Composite(
			compose => 'Copy',
			image => $img,
			gravity => 'NorthWest',
			X => $x,
			Y => $y
		);
		die $error if $error;
	} # foreach glyph
	
	$error = $canvas->Set( magick => $self->{Format} );
	die $error if $error;
	
	$self->{session}->{media_handle} = $canvas;
	$self->apply_zoom();
}

sub render_text {
	##
	# Render text to specific image handle, overriding any params as needed
	##
	my $self = shift;
	my $img = shift;
	my $params = {@_};
		
	my $error = $img->Annotate(
		Font => $params->{Font} || $self->{Font},
		Text => $self->{ch},
		Pointsize => int( $params->{Size} || $self->{Size} ) * 2,
		Gravity => "Center",
		Fill => $params->{Color} || $self->{Color},
		# Stroke => $params->{Stroke},
		# StrokeWidth => $params->{StrokeWidth},
		# X => $params->{X},
		# Y => $params->{Y},
		Antialias => $self->{AntiAlias} ? 'true' : 'false',
		Scale => 0.5,
		# Rotate => 20,
		# SkewX => $params->{SkewX},
		# SkewY => $params->{SkewY}
		# Gravity => 'NorthWest',
		# X => $x,
		# Y => $y
	);
	die $error if $error;
}

sub apply_glow {
	##
	# Apply glow to glyph
	##
	my ($self, $img) = @_;
	my $error = undef;
	
	# source image is solid glow color	
	my $source_img = Image::Magick->new();
	$source_img->Set( size => $self->{glyph_width} . 'x' .  $self->{glyph_height} );
	$source_img->ReadImage( 'xc:' . $self->{GlowColor} );
	
	# mask image will be black with white text
	my $mask_img = new Image::Magick;
	$mask_img->Set( colorspace => 'gray' );
	$mask_img->Set( size => $self->{glyph_width} . 'x' .  $self->{glyph_height} );
	$mask_img->ReadImage('xc:black');
	
	# render text onto mask as white
	$self->render_text( $mask_img, Color => 'white' );
	
	# blur the mask for glow amount
	my $blur = $self->{GlowAmount};
	$error = $mask_img->GaussianBlur(
		radius => $blur,
		sigma => $blur * 0.7
	);
	die $error if $error;
	
	# composite source + mask onto image
	# do this multiple times for more intensity
	
	# , , Bumpmap, , ColorBurn, ColorDodge, Colorize, CopyBlack, CopyBlue, CopyCMYK, Cyan, CopyGreen, , CopyMagenta, , CopyRed, , CopyYellow, Darken, , Difference, Displace, Dissolve, , , , , , Exclusion, HardLight, Hue, , Lighten, Luminize, Minus, Modulate, Multiply, None, , , , , , Saturate, , SoftLight, , , , , , , Subtract, Threshold, Xor
	
	for (1..$self->{GlowIntensity}) {
		$error = $img->Composite(
			compose => 'Dst',
			image => $source_img,
			mask => $mask_img,
			gravity => 'NorthWest',
			X => 0,
			Y => 0
		);
		die $error if $error;
	}
}

1;
