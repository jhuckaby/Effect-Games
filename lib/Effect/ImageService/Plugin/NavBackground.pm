package Effect::ImageService::Plugin::NavBackground;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use File::Basename;
use XML::API::Tools;
use Effect::ImageService::Plugin;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Render level editor navigator image for background
	#	GameID => id of game
	#	LevelID => id of level
	##
	my $self = shift;
	my $error = undef;
	
	my $game_id = $self->{GameID};
	my $level_id = $self->{LevelID};
		
	# my $game = $self->{game} = $self->{storage}->get_metadata( '/games/' . $game_id );
	# if (!$game) { die "Could not load game: $game_id\n"; }
	
	$self->perf_begin('load_level');
	my $level = $self->{level} = $self->{storage}->list_find( "/games/$game_id/levels", { Name => $level_id } );
	$self->perf_end('load_level');
	if (!$level) { die "Could not load level: $level_id\n"; }
	
	if (!$level->{BackgroundImage}) { return; }
	
	my $img = $self->{session}->{media_handle};
	
	my $img_width = $img->Get('width');
	my $img_height = $img->Get('height');
	
	my $level_width = $level->{Width};
	my $level_height = $level->{Height};
	
	my $tile_path = "/games/$game_id/assets" . $level->{BackgroundImage};
	my $tile_full_path = $self->{storage}->get_file_path( dirname($tile_path), basename($tile_path) );
	
	$self->perf_begin('load_image');
	my $tile_img = Image::Magick->new();
	$error = $tile_img->Read( $tile_full_path );
	$self->perf_end('load_image');
	die $error if $error;
	
	my $tile_width = $tile_img->Get('width');
	my $tile_height = $tile_img->Get('height');
	
	if (($level->{BackgroundXMode} eq 'infinite') && $level->{BackgroundXDiv} && ($level->{BackgroundXDiv} > 0)) {
		# x repeat
		$tile_width = int( ($tile_width / ($level_width / $img_width)) / $level->{BackgroundXDiv} );
		if ($tile_width < 8) { $tile_width = 8; }
		if ($tile_width > $img_width) { $tile_width = $img_width; }
	}
	else {
		# x fit
		$tile_width = $img_width;
	}
	
	if (($level->{BackgroundYMode} eq 'infinite') && $level->{BackgroundYDiv} && ($level->{BackgroundYDiv} > 0)) {
		# y repeat
		$tile_height = int( ($tile_height / ($level_height / $img_height)) / $level->{BackgroundYDiv} );
		if ($tile_height < 8) { $tile_height = 8; }
		if ($tile_height > $img_height) { $tile_height = $img_height; }
	}
	else {
		# y fit
		$tile_height = $img_height;
	}
	
	$self->log_debug(5, "Level Size: $level_width x $level_height");
	$self->log_debug(5, "Image Size: $img_width x $img_height");
	$self->log_debug(5, "Tile Size: $tile_width x $tile_height");
	
	$self->perf_begin('resize');
	$error = $tile_img->Resize(
		width => $tile_width,
		height => $tile_height,
		filter => 'Cubic',
		blur => 1.0
	);
	$self->perf_end('resize');
	die $error if $error;
	
	$self->perf_begin('composite');
	for (my $y = 0; $y < $img_height; $y += $tile_height) {
		for (my $x = 0; $x < $img_width; $x += $tile_width) {
			
			$error = $img->Composite(
				compose => 'Over',
				image => $tile_img,
				gravity => 'NorthWest',
				X => $x,
				Y => $y
			);
			die $error if $error;
			
		} # x loop
	} # y loop
	$self->perf_end('composite');
	
	$self->apply_env();
}

1;
