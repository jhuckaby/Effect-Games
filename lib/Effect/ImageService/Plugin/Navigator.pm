package Effect::ImageService::Plugin::Navigator;

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
	# Render chunk of level editor navigator image for layer
	#	GameID => id of game
	#	LevelID => id of level
	#	LayerID => id of layer
	#	Width / Height => size of image (pre-fit)
	#	Left / Top / Right / Bottom => bounds rect (global coords, not scaled down)
	#	Data => data for layer in PSON format
	##
	my $self = shift;
	my $error = undef;
	
	my $game_id = $self->{GameID};
	my $level_id = $self->{LevelID};
	my $layer_id = $self->{LayerID};
	
	$self->{Background} ||= 'transparent';
	
	$self->perf_begin('load_game');
	my $game = $self->{game} = $self->{storage}->get_metadata( '/games/' . $game_id );
	$self->perf_end('load_game');
	if (!$game) { die "Could not load game: $game_id\n"; }
	
	$self->perf_begin('load_level');
	my $level = $self->{level} = $self->{storage}->list_find( "/games/$game_id/levels", { Name => $level_id } );
	$self->perf_end('load_level');
	if (!$level) { die "Could not load level: $level_id\n"; }
	
	XMLalwaysarray( xml=>$level->{Layers}, element=>'Layer' );
	my $layer = $self->{layer} = XMLsearch( xml=>$level->{Layers}->{Layer}, Name => $layer_id );
	if (!$layer) { die "Could not find layer: $layer_id\n"; }
	
	my $image_path = "/games/$game_id/level_nav/$level_id";
	my $full_path = $self->{storage}->get_file_path( $image_path, "$layer_id.png" );
	
	my $img = $self->{media_handle} = undef;
	
	if ($self->{Internal}) {
		$img = $self->{media_handle} = $self->{session}->{media_handle};
		
		# we need all the sprite defs in internal mode, to find icons
		# actual level data JSON doesn't have icons specified inline
		$self->{sprites} = $self->{storage}->list_get( "/games/$game_id/sprites" );
		
		# index by name for even faster lookup
		$self->{sprite_defs} = {};
		foreach my $sprite (@{$self->{sprites}}) {
			$self->{sprite_defs}->{ $sprite->{Name} } = $sprite;
		}
	}
	else {
		$img = $self->{media_handle} = Image::Magick->new();
		if (-e $full_path) {
			$self->log_debug(5, "Loading existing image: $full_path");
			$self->perf_begin('load_image');
			$error = $self->{media_handle}->Read( $full_path );
			$self->perf_end('load_image');
			die $error if $error;
		}
		else {
			$self->log_debug(5, "Creating new image");
			$self->perf_begin('create_image');
			$error = $img->Set( size=>$self->{Width}.'x'.$self->{Height} );
			die $error if $error;
		
			$error = $img->ReadImage( 'xc:' . $self->{Background} );
			# $error = $img->ReadImage( 'xc:#0000ff' );
		
			die $error if $error;
			$self->perf_end('create_image');
		}
	}
	
	$self->log_debug(5, "Level size: " . $level->{Width} . 'x' . $level->{Height} );
	
	# clear affected area
	$self->{layer_width} = $game->{PortWidth} + int( ($level->{Width} - $game->{PortWidth}) * $layer->{ScrollRatio} );
	$self->{layer_height} = $game->{PortHeight} + int( ($level->{Height} - $game->{PortHeight}) * $layer->{ScrollRatio} );
	$self->log_debug(5, "True layer size: " . $self->{layer_width} . 'x' . $self->{layer_height} );
	
	$self->{img_left} = floor( $self->{Left} / ($self->{layer_width} / $self->{Width}) );
	$self->{img_top} = floor( $self->{Top} / ($self->{layer_height} / $self->{Height}) );
	$self->{img_right} = floor( $self->{Right} / ($self->{layer_width} / $self->{Width}) );
	$self->{img_bottom} = floor( $self->{Bottom} / ($self->{layer_height} / $self->{Height}) );
	
	if ($self->{img_right} == $self->{img_left}) { $self->{img_right}++; }
	if ($self->{img_bottom} == $self->{img_top}) { $self->{img_botom}++; }
	
	$self->log_debug(5, "Affected area in image: " . $self->{img_left} . 'x' . $self->{img_top} . ', ' . $self->{img_right} . 'x' . $self->{img_bottom} );
	
	$self->{media_handle}->Set( matte => 'true' );
	
	# $error = $self->{media_handle}->Draw(
	# 	Primitive => 'Rectangle',
	# 	Points => '20,20 620,200',
	# 	Fill => '#0000ff',
	# 	AntiAlias => 'False'
	# );
	# die $error if $error;
	
	if (!$self->{Internal}) {
		$self->perf_begin('clear_area');
	
		my $mask = Image::Magick->new();
		$mask->Set( size => $self->{Width}.'x'.$self->{Height} );
		$mask->Set( colorspace => 'gray' );
		$mask->ReadImage( 'xc:white' );
	
		$error = $mask->Draw(
			Primitive => 'Rectangle',
			Points => $self->{img_left}.','.$self->{img_top}.' '.$self->{img_right}.','.$self->{img_bottom},
			Fill => 'black',
			AntiAlias => 'False',
		);
		die $error if $error;
	
		my $dest = Image::Magick->new();
		$dest->Set( size => $self->{Width}.'x'.$self->{Height} );
		$dest->ReadImage( 'xc:' . $self->{Background} );
	
		$error = $dest->Composite(
			compose => 'Over',
			image => $self->{media_handle},
			mask => $mask,
			gravity => 'NorthWest',
			X => 0,
			Y => 0
		);
		die $error if $error;
	
		$self->{media_handle} = $dest;
		undef $mask;
	
		$self->perf_end('clear_area');
	}
	
	# $error = $self->{media_handle}->Mask( mask => $mask );
	# die $error if $error;
	
	# $error = $self->{media_handle}->Draw(
	# 	Primitive => 'Rectangle',
	# 	Points => $self->{img_left}.','.$self->{img_top}.' '.$self->{img_right}.','.$self->{img_bottom},
	# 	Fill => 'transparent',
	# 	AntiAlias => 'False',
	# 	#Method => 'Reset'
	# );
	# die $error if $error;
	
	# $self->log_debug(5, "Data: " . $self->{Data} );
	
	# parse data JSON
	my $data = undef;
	if (ref($self->{Data})) {
		# data is alredy parsed for us
		$data = $self->{Data};
	}
	else {
		$self->perf_begin('parse_json');
		eval {
			# $self->log_debug(5, "Eval: " . '$data = ' . $self->{Data} . ';' );
			eval( '$data = ' . $self->{Data} . ';' );
			die $@ if $@;
		};
		$self->perf_end('parse_json');
		if ($@ || !$data) { die "Could not parse JSON: $@\n"; }
	}
	
	# invoke handler function for layer type
	my $func = 'render_layer_' . $layer->{Type};
	if (!$self->can($func)) { die "Unsupported layer type: " . $layer->{Type} . "\n"; }
	
	$self->log_debug(5, "Calling render handler: $func");
	$self->perf_begin($func);
	$self->$func( $data );
	$self->perf_end($func);
	
	if ($self->{Test} || $self->{Internal}) {
		# testing, just send image to output
		$self->{media_handle}->Set( magick => 'png' );
		
		# $self->{media_handle}->Draw( Primitive => 'Line', Points => '0,0 399,0', Fill => '#7f7f7f', AntiAlias => 'False' );
		# $self->{media_handle}->Draw( Primitive => 'Line', Points => '399,0 399,299', Fill => '#7f7f7f', AntiAlias => 'False' );
		# $self->{media_handle}->Draw( Primitive => 'Line', Points => '0,299 399,299', Fill => '#7f7f7f', AntiAlias => 'False' );
		# $self->{media_handle}->Draw( Primitive => 'Line', Points => '0,0 0,299', Fill => '#7f7f7f', AntiAlias => 'False' );
		
		$self->{session}->{media_handle} = $self->{media_handle};
	}
	else {
		# save image back to disk
		$self->log_debug(5, "Writing image back to disk: $full_path");
		make_dirs_for( $full_path );
		$error = $self->{media_handle}->Write( $full_path );
		die $error if $error;
	
		$self->send_xml(
			Code => 0
		);
	}
}

sub get_tile_image {
	##
	# Cache tile image, load and scale it
	##
	my ($self, $tile_id) = @_;
	my $cache_id = $tile_id;
	
	if ($self->{tile_cache}->{$cache_id}) { return $self->{tile_cache}->{$cache_id}; }
	
	my $overlays = [];
	if ($tile_id =~ s/(\?.+)$//) {
		my $qs = $1;
		$qs =~ s/[\?\&]overlay\=([^\?\&]+)/ push @$overlays, $1; ''; /eg;
	}
	
	my $storage_key = '/games/' . $self->{GameID} . '/assets' . $self->{tileset}->{Path};
	my $full_path = $self->{storage}->get_file_path( $storage_key, $tile_id );
	
	if (!(-e $full_path)) { die "Could not locate tile: $full_path\n"; }
	
	$self->perf_begin('tile_load');
	my $img = Image::Magick->new();
	my $error = $img->Read( $full_path );
	
	# die $error if $error;
	if ($error) {
		die "Failed to read image: $full_path ($storage_key/$tile_id): $error";
	}
	
	$self->perf_end('tile_load');
	
	foreach my $overlay (@$overlays) {
		$self->perf_begin('overlay');
		my $overlay_path = $self->{storage}->get_file_path( $storage_key, $overlay );
		if (!(-e $overlay_path)) { die "Could not locate overlay tile: $overlay_path\n"; }
		
		my $overlay_img = Image::Magick->new();
		$error = $overlay_img->Read( $overlay_path );
		die $error if $error;
		
		$error = $img->Composite(
			compose => 'Over',
			image => $overlay_img,
			gravity => 'NorthWest',
			X => 0,
			Y => 0
		);
		die $error if $error;
		
		$self->perf_end('overlay');
	} # foreach overlay
	
	# scale down to size
	$self->perf_begin('tile_resize');
	$error = $img->Resize(
		width => ceil($self->{tile_width}),
		height => ceil($self->{tile_height}),
		filter => 'Cubic',
		blur => 1.0
	);
	$self->perf_end('tile_resize');
	die $error if $error;
	
	$self->{tile_cache}->{$cache_id} = $img;
	return $img;
}

sub render_layer_tile {
	##
	# Render tiles from layer
	# Data: { left/top/right/bottom: tile bounds, tiles: 2d array }
	##
	my $self = shift;
	my $data = shift;
	my $error = undef;
	
	if (!$data->{map}) {
		$self->log_debug(2, "No map property in data, skipping layer");
		return;
	}
	
	# $self->log_debug(5, "in render_layer_tile, data: " . dumper($data));
	
	my $game = $self->{game};
	my $level = $self->{level};
	my $layer = $self->{layer};
	
	my $tileset = $self->{tileset} = $self->{storage}->list_find( '/games/' . $self->{GameID} . '/tilesets', { Name => $layer->{Tileset} } );
	if (!$tileset) { die "Could not find tileset: " . $layer->{Tileset} . "\n"; }
	
	$self->{tile_cache} = {};
	
	my $tile_width = $self->{tile_width} = ( $tileset->{TileWidth} / ($self->{layer_width} / $self->{Width}) ) || 1;
	my $tile_height = $self->{tile_height} = ( $tileset->{TileHeight} / ($self->{layer_height} / $self->{Height}) ) || 1;
	
	if ($self->{Internal}) {
		$data->{left} = 0;
		$data->{top} = 0;
		$data->{right} = ceil( $self->{layer_width} / $tileset->{TileWidth} );
		$data->{bottom} = ceil( $self->{layer_height} / $tileset->{TileHeight} );
		$data->{tiles} = $data->{data};
	}
	
	$self->log_debug(5, "Tile Size: $tile_width x $tile_height");
	
	# $self->log_debug(5, "Tile Data: " . serialize_object($data));
	
	for (my $tx = $data->{left}; $tx < $data->{right}; $tx++) {
		my $col = $data->{tiles}->[ $tx - $data->{left} ];
		if ($col) {
			for (my $ty = $data->{top}; $ty < $data->{bottom}; $ty++) {
				# my $tile = $data->{tiles}->[$tx]->[$ty];
				my $tile = $col->[ $ty - $data->{top} ];
				if ($tile) {
					my $tile_img = $self->get_tile_image( $data->{map}->{$tile} );
					
					my $x = floor($tx * $tile_width);
					my $y = floor($ty * $tile_height);
					# $self->log_debug(5, "Rendering tile $tile at $x x $y");
					
					$self->perf_begin('tile_composite');
					$error = $self->{media_handle}->Composite(
						compose => 'Over',
						image => $tile_img,
						gravity => 'NorthWest',
						X => $x,
						Y => $y
					);
					$self->perf_end('tile_composite');
					die $error if $error;
				} # good row
			} # y loop
		} # good column
	} # x loop
}

sub get_sprite_icon {
	##
	# Cache sprite icon image, load, scale and crop it
	##
	my ($self, $sprite_icon, $sprite_width, $sprite_height) = @_;
	
	if ($self->{icon_cache}->{$sprite_icon}) { return $self->{icon_cache}->{$sprite_icon}; }
	
	my $storage_path = '/games/' . $self->{GameID} . '/assets' . $sprite_icon;
	my $full_path = $self->{storage}->get_file_path( dirname($storage_path), basename($storage_path) );
	
	if (!(-e $full_path)) {
		$self->log_debug(2, "Could not locate sprite icon: $storage_path ($full_path)" ); 
		return undef;
	}
	
	$self->perf_begin('sprite_icon_load');
	my $img = Image::Magick->new();
	my $error = $img->Read( $full_path );
	die $error if $error;
	$self->perf_end('sprite_icon_load');
	
	my $dest_image_width = int( $img->Get('width') / ($self->{layer_width} / $self->{Width}) ) || 1;
	my $dest_image_height = int( $img->Get('height') / ($self->{layer_height} / $self->{Height}) ) || 1;
	
	# scale down to size
	$self->perf_begin('sprite_icon_resize');
	$error = $img->Resize(
		width => $dest_image_width,
		height => $dest_image_height,
		filter => 'Cubic',
		blur => 1.0
	);
	$self->perf_end('sprite_icon_resize');
	die $error if $error;
	
	# crop to fit into sprite placeholder
	$self->perf_begin('sprite_icon_crop');
	$error = $img->Crop(
		x => 0,
		y => 0,
		width => $sprite_width,
		height => $sprite_height
	);
	$self->perf_end('sprite_icon_crop');
	die $error if $error;
	
	$self->{icon_cache}->{$sprite_icon} = $img;
	return $img;
}

sub render_layer_sprite {
	##
	# Render sprite layer chunk
	# data: [ {x/y/width/height: sprite coords, icon: optional sprite icon path }, ... ]
	##
	my $self = shift;
	my $data = shift;
	my $error = undef;
	
	my $game = $self->{game};
	my $level = $self->{level};
	my $layer = $self->{layer};
	
	$self->{icon_cache} = {};
	
	foreach my $sprite (@$data) {
		my $x = int( $sprite->{x} / ($self->{layer_width} / $self->{Width}) );
		my $y = int( $sprite->{y} / ($self->{layer_height} / $self->{Height}) );
		my $width = int( $sprite->{width} / ($self->{layer_width} / $self->{Width}) ) || 1;
		my $height = int( $sprite->{height} / ($self->{layer_height} / $self->{Height}) ) || 1;
		
		$self->log_debug(5, "Rendering sprite at: $x x $y ($width x $height)");
		
		my $right = $x + $width;
		my $bottom = $y + $height;
		
		if ($self->{SpriteFrame}) {
			$self->perf_begin('sprite_frame');
			$error = $self->{media_handle}->Draw(
				Primitive => 'Rectangle',
				Points => $x.','.$y.' '.$right.','.$bottom,
				x => 1, y => 1,
				Fill => 'transparent',
				Stroke => 'rgba(0, 0, 0, 0.4)',
				StrokeWidth => 1,
				AntiAlias => 'False',
			);
			die $error if $error;
			$self->perf_end('sprite_frame');
		}
		
		if ($sprite->{type} && !$sprite->{icon} && $self->{sprite_defs}) {
			my $sprite_def = $self->{sprite_defs}->{ $sprite->{type} };
			if ($sprite_def && $sprite_def->{Icon}) { $sprite->{icon} = $sprite_def->{Icon}; }
		}
		
		if ($sprite->{icon}) {
			my $sprite_icon_img = $self->get_sprite_icon( $sprite->{icon}, $width, $height );
			if ($sprite_icon_img) {
				$self->perf_begin('sprite_icon_composite');
				$error = $self->{media_handle}->Composite(
					compose => 'Over',
					image => $sprite_icon_img,
					gravity => 'NorthWest',
					X => $x,
					Y => $y
				);
				$self->perf_end('sprite_icon_composite');
				die $error if $error;
			}
		} # sprite has icon
		
		if ($self->{SpriteFrame}) {
			$self->perf_begin('sprite_frame');
			$error = $self->{media_handle}->Draw(
				Primitive => 'Rectangle',
				Points => $x.','.$y.' '.$right.','.$bottom,
				Fill => 'transparent',
				Stroke => 'white',
				StrokeWidth => 1,
				AntiAlias => 'False',
			);
			die $error if $error;
			$self->perf_end('sprite_frame');
		}
	}
}

1;
