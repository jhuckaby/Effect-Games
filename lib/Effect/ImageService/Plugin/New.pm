package Effect::ImageService::Plugin::New;

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
	#	Background => color name
	##
	my $self = shift;
	
	$self->{Background} ||= 'transparent';
	
	$self->log_debug(4, "Creating image canvas: " . $self->{Width} . 'x' . $self->{Height} . ' (' . $self->{Background} . ')' );
	
	my $img = new Image::Magick();
	
	my $error = $img->Set( size=>$self->{Width}.'x'.$self->{Height} );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$self->{session}->{media_handle} = $img;
}

1;
