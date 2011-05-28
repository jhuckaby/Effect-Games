package Effect::ImageService::Plugin::Text;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use XML::API::Tools;
use Effect::ImageService::Plugin;
use POSIX;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Handle image transform
	#	Width => int
	#	Height => int
	#	Background => color
	#	Font => otf/ttf
	#	Text => text
	#	PointSize => int
	#	Color => color
	#	Align => center
	#	Kerning => float
	#	AntiAlias => 1|0
	#	WordWrap => 1|0
	#	Format => png|gif|png
	##
	my $self = shift;
	my $error = undef;
	
	$self->log_debug(4, "Creating text image: " . $self->{Width} . 'x' . $self->{Height} );
	
	my $img = new Image::Magick();
	$self->{session}->{media_handle} = $img;
	
	$error = $img->Set( size=>$self->{Width}.'x'.$self->{Height} );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:' . ($self->{Background} || 'transparent') );
	die $error if $error;
	
	$self->{Font} = $self->parse_path( $self->{Font} );
	
	if ($self->{WordWrap}) {
		my $text = $self->{Text};
		my $lines = [];
		my $width = $self->get_text_width($text);
		
		while ($width > $self->{Width}) {
			# first, guess where to split the string based on the info we have
			my $idx = floor( length($text) * ($self->{Width} / $width) );
			
			# next, fine tune it using actual measurements
			my $temp_width = $self->get_text_width( substr($text, 0, $idx) );
			if ($temp_width > $self->{Width}) {
				while ($temp_width > $self->{Width}) {
					$idx--; if (!$idx) { $idx++; last; }
					$temp_width = $self->get_text_width( substr($text, 0, $idx) );
				}
			}
			elsif ($temp_width < $self->{Width}) {
				while ($temp_width < $self->{Width}) {
					$idx++;
					$temp_width = $self->get_text_width( substr($text, 0, $idx) );
				}
				$idx--;
			}
			
			# find nearest word break
			my $save_idx = $idx;
			while (substr($text, $idx, 1) =~ /\S/) {
				$idx--; if (!$idx) { $idx = $save_idx; last; }
			}
			
			push @$lines, substr($text, 0, $idx);
			$text = substr($text, $idx); $text =~ s/^\s+//;
			
			$width = $self->get_text_width($text);
		}
		
		push @$lines, $text;
		$self->{Text} = join("\n", @$lines);
	} # word wrap
	
	$error = $img->Annotate(
		Font => $self->{Font},
		Text => $self->{Text},
		Pointsize => $self->{PointSize} * ($self->{AntiAlias} ? 2 : 1),
		Gravity => $self->{Align} || "Center",
		Fill => $self->{Color} || 'black',
		# Stroke => $params->{Stroke},
		# StrokeWidth => $params->{StrokeWidth},
		# X => $params->{X},
		# Y => $params->{Y},
		Antialias => $self->{AntiAlias} ? "true" : "false",
		Scale => $self->{AntiAlias} ? 0.5 : 1.0,
		Kerning => $self->{Kerning},
		# Rotate => $params->{Rotate},
		# SkewX => $params->{SkewX},
		# SkewY => $params->{SkewY}
	);
	die $error if $error;
	
	$error = $img->Set(
		magick => $self->{Format} || 'png',
		quality => 100
	);
	die $error if $error;
	
	$self->apply_zoom();
}

sub get_text_width {
	##
	# Measure text width
	##
	my ($self, $text) = @_;
	
	my ($x_ppem, $y_ppem, $ascending, $descending, $text_width, $text_height, $max_advance) = 
		$self->{session}->{media_handle}->QueryFontMetrics(
			Font => $self->{Font},
			Pointsize => $self->{PointSize},
			Kerning => $self->{Kerning},
			Text => $text
		);
	
	return $text_width;
}

1;
