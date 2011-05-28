package Effect::ImageService::Plugin::FontMetrics;

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
	#	Font => file or storage path (effect://PATH/FILENAME)
	#	Size => point size
	##
	my $self = shift;
	
	my $font = $self->parse_path( $self->{Font} );
	$self->log_debug(4, "Getting font metrics for: " . $self->{Font} . " ($font)");
	
	my $img = new Image::Magick();
	
	my $error = $img->Set( size=>'1x1' );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:white' );
	die $error if $error;
	
	my ($x_ppem, $y_ppem, $ascending, $descending, $text_width, $text_height, $max_advance) = 
		$img->QueryFontMetrics(
			Font => $font,
			Pointsize => int($self->{Size} || $self->{PointSize} || $self->{Pointsize}),
			Text => 'M',
			# Scale => $actual_params->{Scale} || '1.0, 1.0',
			# Rotate => $actual_params->{Rotate} || '0.0', # has no effect -- arrgh!
		);
	
	$self->log_debug(4, "Font metrics: $x_ppem x $y_ppem, $text_width x $text_height, $ascending, $descending");
	
	$self->send_xml(
		Code => 0,
		CharWidth => $x_ppem,
		CharHeight => $y_ppem,
		Ascending => $ascending,
		Descending => $descending,
		MaxAdvance => $max_advance
	);
}

1;
