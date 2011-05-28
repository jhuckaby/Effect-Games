package Effect::ImageService::Plugin::Mogrify;

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
	# Params passed directly to ImageMagick Mogrify()
	##
	my $self = shift;
	
	my $img = $self->{session}->{media_handle};
	if (!$img) { die "Mogrify transform requires pre-generated media handle"; }
	
	foreach my $func (keys %{$self->{params}}) {
		my $args = $self->{params}->{$func};
		$self->log_debug(4, "Calling ImageMagick: $func: " . serialize_object($args) );
		my $error = $img->Mogrify( $func, %{$args} );
		die $error if $error;
	}
}

1;
