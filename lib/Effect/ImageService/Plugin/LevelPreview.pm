package Effect::ImageService::Plugin::LevelPreview;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use File::Basename;
use XML::API::Tools;
use Effect::ImageService::Plugin;
use POSIX;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Render entire level preview image (bkgnd + all layers, any size)
	#	GameID => id of game
	#	LevelID => id of level
	#	Width / Height => size of image
	##
	my $self = shift;
	my $error = undef;
	
	my $game_id = $self->{GameID};
	my $level_id = $self->{LevelID};
		
	$self->perf_begin('load_game');
	my $game = $self->{game} = $self->{storage}->get_metadata( '/games/' . $game_id );
	$self->perf_end('load_game');
	if (!$game) { die "Could not load game: $game_id\n"; }
	
	$self->perf_begin('load_level');
	my $level = $self->{level} = $self->{storage}->list_find( "/games/$game_id/levels", { Name => $level_id } );
	$self->perf_end('load_level');
	if (!$level) { die "Could not load level: $level_id\n"; }
	
	if ($self->{Width} > $level->{Width}) { $self->{Width} = $level->{Width}; }
	if ($self->{Height} > $level->{Height}) { $self->{Height} = $level->{Height}; }
	
	my $size = custom_fit( $level->{Width}, $level->{Height}, $self->{Width}, $self->{Height} );
	$self->{Width} = $size->{width};
	$self->{Height} = $size->{height};
	
	# new image
	$self->{Background} = $self->{SoloLayer} ? 'transparent' : $level->{BackgroundColor};
	$self->log_debug(4, "Creating image canvas: " . $self->{Width} . 'x' . $self->{Height} . ' (' . $self->{Background} . ')' );
	my $img = new Image::Magick();
	
	my $error = $img->Set( size=>$self->{Width}.'x'.$self->{Height} );
	die $error if $error;
	
	$error = $img->ReadImage( 'xc:' . $self->{Background} );
	die $error if $error;
	
	$self->{session}->{media_handle} = $img;
	
	# background
	if (!$self->{SoloLayer} || ($self->{SoloLayer} =~ /\b_background\b/)) {
		$self->transform( 'NavBackground',
			GameID => $self->{GameID},
			LevelID => $self->{LevelID}
		);
	}
	
	# load game data
	$self->log_debug(5, "Loading JSON level data");
	my $data_raw = $self->{storage}->get_file_contents( "/games/$game_id/level_data/$level_id", "data.json" );
	
	$self->log_debug(5, "Converting to PSON and evaluating: $data_raw");
	
	# convert to PSON (evil hack)
	$data_raw =~ s/\:/=>/g;
	
	# eval it
	my $data = eval($data_raw);
	
	# layers
	XMLalwaysarray( xml=>$level->{Layers}, element=>'Layer' );
	
	foreach my $layer (sort { $a->{ZIndex} <=> $b->{ZIndex} } @{$level->{Layers}->{Layer}}) {
		my $layer_id = $layer->{Name};
		if (!$self->{SoloLayer} || ($self->{SoloLayer} =~ /\b$layer_id\b/)) {
			$self->log_debug(5, "Rendering layer: $layer_id (z: " . $layer->{ZIndex} . ")");
			my $layer_data = $data->{layers}->{$layer_id};
			if ($layer_data) {
				$self->transform( 'Navigator',
					Internal => 1,
					GameID => $self->{GameID},
					LevelID => $self->{LevelID},
					LayerID => $layer_id,
					Width => $self->{Width},
					Height => $self->{Height},
					Left => 0,
					Top => 0,
					Right => $level->{Width},
					Bottom => $level->{Height},
					Data => $layer_data
				);
			}
		} # okay to render
	} # foreach layer
	
	if ($self->{Save}) {
		# save image to level as official preview thumbo
		my $full_path = $self->{storage}->get_file_path( "/games/$game_id/level_data/$level_id", "preview.jpg" );
		$self->log_debug(5, "Writing level preview image to disk: $full_path");
		make_dirs_for( $full_path );
		
		$error = $img->Set( 'quality' => 90 );
		die $error if $error;
		
		$error = $img->Write( $full_path );
		die $error if $error;
	}
}

sub custom_fit {
	##
	# Custom scaling algo
	##
	my ($source_width, $source_height, $dest_width, $dest_height) = @_;

	if (($dest_width <= $source_width) || ($dest_height <= $source_height)) {
		my $width = $source_width;
		my $height = $source_height;

		for (1..2) {
			if ($width - $dest_width > $height - $dest_height) {
				if ($width > $dest_width) {
					$height = int( $height / ($width / $dest_width) );
					$width = $dest_width;
				}
			}
			else {
				if ($height > $dest_height) {
					$width = int( $width / ($height / $dest_height) );
					$height = $dest_height;
				}
			}
		} # loop

		$dest_width = $width || 1;
		$dest_height = $height || 1;
	}
	
	return { width => $dest_width, height => $dest_height };
}

1;
