package Effect::ImageService::Plugin::Placeholder;

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
	#	Width => pixel width
	#	Height => pixel height
	#	Background => color name e.g. rgba(255, 0, 0, 0.5)
	#	BorderColor => color name
	#	BorderSize => int
	#	Text => text
	#	PointSize => int
	#	TextColor => color name
	#	Format => png, gif, jpeg
	##
	my $self = shift;
	my $error = undef;
		
	$self->log_debug(4, "Creating placeholder image: " . $self->{Width} . 'x' . $self->{Height} );
	
	my $img = new Image::Magick();
	
	$error = $img->Set( size=>$self->{Width}.'x'.$self->{Height} );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:transparent' );
	die $error if $error;
	
	# now, render border if desired
	# if ($self->{BorderSize}) {
		my $b_right = $self->{Width} - 1; # - $self->{BorderSize};
		my $b_bottom = $self->{Height} - 1; # - $self->{BorderSize};
				
		my $args = {};
		if ($self->{Shape} eq 'RoundRectangle') {
			$b_right = $self->{Width} - $self->{BorderSize};
			$b_bottom = $self->{Height} - $self->{BorderSize};
			$args = {
				Primitive => 'RoundRectangle',
				Points => $self->{BorderSize}.','.$self->{BorderSize}.' '.$b_right.','.$b_bottom . ' 8,8',
				AntiAlias => 'True',
			};
		}
		elsif ($self->{Shape} eq 'Circle') {
			$args = {
				Primitive => 'Circle',
				Points => int($self->{Width} / 2).','.int($self->{Height} / 2).' '.int($self->{Width} / 2).','.$self->{BorderSize},
				Antialias => 'true'
			};
		}
		elsif ($self->{Shape} eq 'Triangle') {
			$b_right = $self->{Width} - $self->{BorderSize};
			$b_bottom = $self->{Height} - $self->{BorderSize};
			$args = {
				Primitive => 'Polygon',
				Points => $self->{BorderSize}.",$b_bottom ".int($self->{Width} / 2).",".$self->{BorderSize}." $b_right,$b_bottom",
				Antialias => 'true'
			};
		}
		else {
			# default to rectangle
			$args = {
				Primitive => 'Rectangle',
				Points => '0'.','.'0'.' '.$b_right.','.$b_bottom,
				AntiAlias => 'False',
			};
		}
		
		my $b_color = $self->{BorderSize} ? ($self->{BorderColor} || 'transparent') : 'transparent';
		
		$error = $img->Draw(
			%$args,
			Stroke => $b_color,
			StrokeWidth => $self->{BorderSize} || 0,
			# Fill => 'transparent',
			Fill => $self->{Background}
		);
		die $error if $error;
	# }
	
	# finally, render label if desired
	if ($self->{Text}) {
		$error = $img->Annotate(
			Font => '/effect/fonts/helvetiker/helvetiker_bold.ttf',
			Text => $self->{Text},
			Pointsize => int( $self->{PointSize} ) * 2,
			Gravity => "Center",
			Fill => $self->{TextColor},
			# Stroke => $params->{Stroke},
			# StrokeWidth => $params->{StrokeWidth},
			# X => $params->{X},
			# Y => $params->{Y},
			Antialias => 'true',
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
	
	$error = $img->Set(
		magick => $self->{Format} || 'png',
		quality => 100
	);
	die $error if $error;
	
	$self->{session}->{media_handle} = $img;
}

1;
