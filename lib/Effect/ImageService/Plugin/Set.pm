package Effect::ImageService::Plugin::Set;

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
	# Params passed directly to ImageMagick Set()
	##
	my $self = shift;
	
	my $img = $self->{session}->{media_handle};
	if (!$img) { die "Set transform requires pre-generated media handle"; }
	
	if ($self->{params}->{Format}) {
		$self->{params}->{Magick} = $self->{params}->{Format};
		delete $self->{params}->{Format};
	}
	
	$self->log_debug(4, "Setting image attributes: " . serialize_object($self->{params}) );
	
	my $error = $img->Set( %{$self->{params}} );
	die $error if $error;
}

1;
