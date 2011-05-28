package Effect::ImageService::Plugin::EnvPreview;

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
	#	Env => { Transform: [] }
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
	
	if (!(-e $full_path)) {
		$full_path = '/effect/htdocs/images/no_preview_avail.jpg';
	}
	
	my $img = new Image::Magick();
	
	$error = $img->ReadImage( $full_path );
	die $error if $error;
	
	$self->{session}->{media_handle} = $img;
	
	$self->apply_env();
}

1;
