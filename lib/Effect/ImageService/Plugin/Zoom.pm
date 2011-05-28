package Effect::ImageService::Plugin::Zoom;

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
	# Handle image zoom
	#	Zoom => 1, 2, 3, 4
	#	ZoomFilter => Sharp, Smooth
	##
	my $self = shift;
	
	my $img = $self->{session}->{media_handle};
	if (!$img) { die "Zoom transform requires pre-generated media handle"; }
	
	$self->apply_zoom();
}

1;
