package Effect::ImageService::Plugin::RevisionExport;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

use strict;
use URI::Escape;
use File::Basename;
use File::Path;
use XML::API::Tools;
use XML::Lite;
use Digest::MD5 qw/md5_hex/;
use Effect::ImageService::Plugin;

our @ISA = ("Effect::ImageService::Plugin");

sub handler {
	##
	# Create ZIP file of game revision for standalone publish, e-mail to user
	#	GameID => game id
	#	RevID => rev id
	#	Username => username
	##
	my $self = shift;
	my $game_id = $self->{GameID};
	my $rev_id = $self->{RevID};
	my $username = $self->{Username};
	my $error;
	my $errors = [];
	
	my $user = $self->{storage}->get_metadata( '/users/' . $username );
	if (!$user) { die "Could not load user: $username"; }
	
	my $base_path = '/games/' . $game_id . '/revisions/' . $rev_id;
	
	my $game = $self->{storage}->get_metadata( $base_path );
	if (!$game) { die "Could not load game revision: $game_id: $rev_id"; }
	
	my $rev = $self->{storage}->list_find( "/games/$game_id/revs", { Name => $rev_id } );
	if (!$rev) { die "Could not find game revision: $game_id: $rev_id"; }
	
	$self->log_debug(3, "Creating standalone game revision: $game_id: $rev_id");
	
	my $temp_dir = $self->{config}->{Paths}->{TempDir} . '/rev_export_temp_' . $$ . '/' . $game_id . '-' . $rev_id;
	$self->log_debug(5, "Using temp dir: $temp_dir" );
	make_dirs_for( "$temp_dir/" );
	my $parent_temp_dir = dirname($temp_dir);
	
	# engine support files
	make_dirs_for( "$temp_dir/engine/" );
	file_copy( $self->{config}->{Paths}->{EngineDir} . '/1px.cur', "$temp_dir/engine/1px.cur" );
	file_copy( $self->{config}->{Paths}->{EngineDir} . '/transparent.cur', "$temp_dir/engine/transparent.cur" );
	file_copy( $self->{config}->{Paths}->{EngineDir} . '/EffectAudio.swf', "$temp_dir/engine/EffectAudio.swf" );
	file_copy( $self->{config}->{Paths}->{EngineDir} . '/EffectVideo.swf', "$temp_dir/engine/EffectVideo.swf" );
	file_copy( $self->{config}->{Paths}->{EngineDir} . '/hide_cursor.swf', "$temp_dir/engine/hide_cursor.swf" );
	
	# dialog images
	make_dirs_for( "$temp_dir/images/engine/dialog/" );
	foreach my $file (glob($self->{config}->{Paths}->{ImageDir} . '/engine/dialog/*')) {
		if ($file !~ /(facebook|twitter)/) {
			file_copy( $file, "$temp_dir/images/engine/dialog/" . basename($file) );
		}
	}
	
	# toolbar images
	make_dirs_for( "$temp_dir/images/engine/toolbar/" );
	foreach my $file (glob($self->{config}->{Paths}->{ImageDir} . '/engine/toolbar/*')) {
		if ($file !~ /(preview)/) {
			file_copy( $file, "$temp_dir/images/engine/toolbar/" . basename($file) );
		}
	}
	
	# logo
	file_copy( $self->{config}->{Paths}->{ImageDir} . '/logo_80.png', "$temp_dir/images/logo_80.png" );
	
	# set props for apply_zoom()
	$self->{Zoom} = $game->{ZoomDefault};
	$self->{ZoomFilter} = $game->{ZoomFilter};
	
	my $sprites = $self->{storage}->list_get( "$base_path/sprites" );
	my $envs = $self->{storage}->list_get( "$base_path/envs" );
	
	# assets without environment (+default zoom)
	my $folder_data = $self->{storage}->get_metadata( $base_path . '/asset_folders' );
	if ($folder_data && $folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		$self->log_debug(5, "Copying assets / zooming images");
		$self->log_debug(5, "Folder list xpath summary: " . serialize_object($folder_paths) );
		$self->perf_begin('assets');
		
		foreach my $subpath (sort keys %$folder_paths) {
			$self->log_debug(5, "Working on asset folder: $subpath");
			if ($self->{storage}->check_record_exists( $base_path . '/assets' . $subpath )) {
				$self->log_debug(5, "Folder $subpath exists, copying it");
				
				my $full_source_path = $self->{storage}->get_record_path( $base_path . '/assets' . $subpath );
				my $full_dest_path = $temp_dir . '/assets' . $subpath;
				make_dirs_for( $full_dest_path . '/' );
				
				foreach my $file (glob($full_source_path . '/*')) {
					my $filename = basename($file);
					if ($filename ne '_metadata.xml') {
						if (($game->{ZoomDefault} > 1) && ($filename =~ /\.(jpg|jpe|jpeg|png|gif)$/i)) {
							$self->log_debug(5, "Zooming image: $file to $full_dest_path/$filename");
							$self->{session}->{media_handle} = Image::Magick->new();
							$error = $self->{session}->{media_handle}->Read( $file );
							if ($error) {
								push @$errors, "Failed to load image: $filename: $error";
							}
							else {
								$self->apply_zoom();
								$error = $self->{session}->{media_handle}->Write( $full_dest_path . '/' . $filename );
								if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
							} # successful load
						} # need zoom
						else {
							# non-image file, straight copy
							$self->log_debug(5, "Copying file: $file to $full_dest_path/$filename");
							file_copy( $file, $full_dest_path . '/' . $filename );
						}
					}
				}
			} # folder exists
			else {
				$self->log_debug(5, "Folder $subpath DOES NOT EXIST, skipping");
			}
		} # foreach asset dir path
		
		$self->perf_end('assets');
		$self->log_debug(5, "Assets / zoom complete");
		
		# environments + default zoom
		if ($envs) {
			$self->log_debug(5, "Copying image assets for environments");
			$self->perf_begin('environments');
			
			foreach my $env (@$envs) {
				$self->log_debug(5, "Creating environment: " . $env->{Name});
				
				foreach my $subpath (sort keys %$folder_paths) {
					$self->log_debug(5, "Working on asset folder: $subpath");
					
					if ($self->{storage}->check_record_exists( $base_path . '/assets' . $subpath )) {
						my $source_dir_path = $self->{storage}->get_record_path( $base_path . '/assets' . $subpath );
						my $dest_dir_path = $temp_dir . '/environments/' . $env->{Name} . '/assets' . $subpath;
						
						foreach my $file (glob($source_dir_path . '/*')) {
							my $filename = basename($file);
							if ($filename =~ /\.(jpg|jpe|jpeg|png|gif)$/i) {
								make_dirs_for( $dest_dir_path . '/' );
								$self->log_debug(5, "Transforming image: $file to $dest_dir_path/$filename for environment: " . $env->{Name});
								$self->{session}->{media_handle} = Image::Magick->new();
								$error = $self->{session}->{media_handle}->Read( $file );
								if ($error) {
									push @$errors, "Failed to load image: $subpath/$filename: $error";
								}
								else {
									$self->apply_env( $env );
									$self->apply_zoom();
									$error = $self->{session}->{media_handle}->Write( $dest_dir_path . '/' . $filename );
									if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
								} # successful load
								
								delete $self->{session}->{media_handle};
							} # is image
						} # foreach file in folder
					} # folder exists
				} # foreach asset dir path
				
				if ($sprites) {
					$self->log_debug(5, "Copying sprite images for environment: " . $env->{Name});
					
					foreach my $sprite (@$sprites) {
						if ($sprite->{Resources} && $sprite->{Resources}->{Resource}) {
							XMLalwaysarray( xml=>$sprite->{Resources}, element=>'Resource' );
							foreach my $res (@{$sprite->{Resources}->{Resource}}) {
								if (($res->{Path} =~ /\.(jpg|jpe|jpeg|png|gif)$/i) && $res->{Filter}) {
									my $filename = basename($res->{Path});
									my $full_dest_path = $temp_dir . '/environments/' . $env->{Name} . '/sprites/' . $sprite->{Name} . $res->{Path};
									
									make_dirs_for( $full_dest_path );
									$self->log_debug(5, "Transforming image: " . $res->{Path} . " to $full_dest_path for sprite: " . $sprite->{Name} . 
										" and environment: " . $env->{Name});
									
									eval {
										$self->transform( 'GameImage',
											Source => 'effect://games/' . $game_id . '/revisions/' . $rev_id . '/assets' . $res->{Path},
											Filter => $res->{Filter},
											Env => $env->{Name},
											Zoom => $self->{Zoom},
											ZoomFilter => $self->{ZoomFilter}
										);
									};
									if ($@) {
										push @$errors, "Failed to transform image: " . $res->{Path} . ": $@";
									}
									else {
										$error = $self->{session}->{media_handle}->Write( $full_dest_path );
										if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
									}
									
									delete $self->{session}->{media_handle};
								} # res is image + filter
							} # foreach sprite res
						} # sprite has res
					} # foreach sprite
				} # has sprites
			} # foreach env
			
			$self->perf_end('environments');
			$self->log_debug(5, "Environments complete");
		} # has envs
	} # game has asset dirs
	
	# sprite images, default zoom, no environment
	if ($sprites) {
		$self->log_debug(5, "Working on sprite specific image transforms");
		$self->perf_begin('sprite_images');
		
		foreach my $sprite (@$sprites) {
			if ($sprite->{Resources} && $sprite->{Resources}->{Resource}) {
				XMLalwaysarray( xml=>$sprite->{Resources}, element=>'Resource' );
				foreach my $res (@{$sprite->{Resources}->{Resource}}) {
					if (($res->{Path} =~ /\.(jpg|jpe|jpeg|png|gif)$/i) && $res->{Filter}) {
						my $filename = basename($res->{Path});
						my $full_dest_path = $temp_dir . '/sprites/' . $sprite->{Name} . $res->{Path};
						
						make_dirs_for( $full_dest_path );
						$self->log_debug(5, "Transforming image: " . $res->{Path} . " to $full_dest_path for sprite: " . $sprite->{Name});
						
						eval {
							$self->transform( 'GameImage',
								Source => 'effect://games/' . $game_id . '/revisions/' . $rev_id . '/assets' . $res->{Path},
								Filter => $res->{Filter},
								Zoom => $self->{Zoom},
								ZoomFilter => $self->{ZoomFilter}
							);
						};
						if ($@) {
							push @$errors, "Failed to transform image: " . $res->{Path} . ": $@";
						}
						else {
							$error = $self->{session}->{media_handle}->Write( $full_dest_path );
							if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
						}
						
						delete $self->{session}->{media_handle};
					} # res is image + filter
				} # foreach sprite res
			} # sprite has res
		} # foreach sprite
		
		$self->perf_end('sprite_images');
		$self->log_debug(5, "Sprite image transforms complete");
	} # has sprites
	
	# um, tile overlays -- we're screwed
	my $tilesets = $self->{storage}->list_get( "$base_path/tilesets" );
	my $levels = $self->{storage}->list_get( "$base_path/levels" );
	
	if ($levels && $tilesets) {
		$self->log_debug(5, "Scanning levels for tile overlays");
		$self->perf_begin('tile_overlays');
		
		foreach my $level (@$levels) {
			# load game data
			my $level_id = $level->{Name};
			$self->log_debug(5, "Loading JSON level data: $level_id");
			my $data_raw = $self->{storage}->get_file_contents( "$base_path/level_data/$level_id", "data.json" );
			if ($data_raw) {
				$self->log_debug(5, "Converting to PSON and evaluating: $data_raw");

				# convert to PSON (evil hack)
				$data_raw =~ s/\:/=>/g;

				# eval it
				my $data = eval($data_raw);

				# layers
				XMLalwaysarray( xml=>$level->{Layers}, element=>'Layer' );

				foreach my $layer (@{$level->{Layers}->{Layer}}) {
					my $layer_id = $layer->{Name};
					my $layer_data = $data->{layers}->{$layer_id};
					
					if ($layer->{Type} eq 'tile') {
						# map:{1:"dirt_C.png",28:"bluerock_C.png?overlay=hemboss_TL.png
						my $tileset = find_object( $tilesets, { Name => $layer->{Tileset} } );
						if (!$tileset) {
							push @$errors, "Could not find tileset: " . $layer->{Tileset} . " (used in level: $level_id)";
							next;
						}
						$self->log_debug(5, "Processing tile layer: $layer_id (tileset: " . $tileset->{Name} . ")");
						
						my $dest_dir_path = $temp_dir . '/assets' . $tileset->{Path};
						$dest_dir_path =~ s@/$@@;
						
						foreach my $key (keys %{$layer_data->{map}}) {
							my $tile = $layer_data->{map}->{$key};
							if ($tile && ($tile =~ /^(.+)\?(.*overlay\=.+)$/)) {
								$self->log_debug(5, "Processing tile: $tile");
								my $filename = $1;
								my $tile_query = parse_query( $2 );
								XMLalwaysarray( xml=>$tile_query, element=>'overlay' );
								my $dest_filename = $filename . '-' . join('-', @{$tile_query->{overlay}});
								
								eval {
									$self->transform( 'GameImage',
										Source => 'effect://games/' . $game_id . '/revisions/' . $rev_id . '/assets' . $tileset->{Path} . $filename,
										Overlay => $tile_query->{overlay},
										Zoom => $self->{Zoom},
										ZoomFilter => $self->{ZoomFilter}
									);
								};
								if ($@) {
									push @$errors, "Failed to transform image: " . $tileset->{Path} . "$filename: $@";
								}
								else {
									$error = $self->{session}->{media_handle}->Write( $dest_dir_path . '/' . $dest_filename );
									if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
								}

								delete $self->{session}->{media_handle};
								
								# environments
								if ($envs) {
									foreach my $env (@$envs) {
										$self->log_debug(5, "Processing tile $tile in environment: " . $env->{Name});
										my $dest_dir_path = $temp_dir . '/environments/' . $env->{Name} . '/assets' . $tileset->{Path};
										$dest_dir_path =~ s@/$@@;
										
										eval {
											$self->transform( 'GameImage',
												Source => 'effect://games/' . $game_id . '/revisions/' . $rev_id . '/assets' . $tileset->{Path} . $filename,
												Overlay => $tile_query->{overlay},
												Env => $env,
												Zoom => $self->{Zoom},
												ZoomFilter => $self->{ZoomFilter}
											);
										};
										if ($@) {
											push @$errors, "Failed to transform image: " . $tileset->{Path} . "$filename: $@";
										}
										else {
											$error = $self->{session}->{media_handle}->Write( $dest_dir_path . '/' . $dest_filename );
											if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
										}

										delete $self->{session}->{media_handle};
									} # foreach env
								} # has envs
								
							} # good tile
						} # foreach key in map
					} # tile layer
				} # foreach layer
			} # good data
		} # foreach level
		
		$self->perf_end('tile_overlays');
		$self->log_debug(5, "Tile overlays complete");
	} # has levels and tilesets
	
	# ie 6 png tiles to gifs
	if ($tilesets) {
		$self->log_debug(5, "Creating IE 6 GIFs for PNG tilesets");
		$self->perf_begin('ie6_gifs');
		
		foreach my $tileset (@$tilesets) {
			$self->log_debug(5, "Working on tileset: " . $tileset->{Name});
			my $dir_path = $temp_dir . '/assets' . $tileset->{Path};
			$dir_path =~ s@/$@@;
						
			foreach my $source_file (glob("$dir_path/*")) {
				my $source_filename = basename($source_file);
				my $dest_filename = $source_filename; $dest_filename =~ s/\.png$/.gif/i;
				
				if ($source_file =~ /\.png$/i) {
					$self->log_debug(5, "Converting image $source_file to GIF");
					
					eval {
						$self->transform( 'GameImage', Source => $source_file, Format => 'gif' );
					};
					if ($@) {
						push @$errors, "Failed to transform image: " . $tileset->{Path} . "$source_filename: $@";
					}
					else {
						$error = $self->{session}->{media_handle}->Write( $dir_path . '/' . $dest_filename );
						if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
					}
					
					delete $self->{session}->{media_handle};
				} # is png
			} # foreach file
			
			# blank tile for tileset
			$self->transform( 'New', 
				Background => 'transparent', 
				Width => $tileset->{TileWidth} * $self->{Zoom},
				Height => $tileset->{TileHeight} * $self->{Zoom}
			);
			$error = $self->{session}->{media_handle}->Write( $dir_path . '/_blank.gif' );
			if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
			delete $self->{session}->{media_handle};
			
			if ($envs) {
				foreach my $env (@$envs) {
					$self->log_debug(5, "Converting tiles for environment: " . $env->{Name});
					$dir_path = $temp_dir . '/environments/' . $env->{Name} . '/assets' . $tileset->{Path};
					$dir_path =~ s@/$@@;
					
					foreach my $source_file (glob("$dir_path/*")) {
						my $source_filename = basename($source_file);
						my $dest_filename = $source_filename; $dest_filename =~ s/\.png$/.gif/i;

						if ($source_file =~ /\.png$/i) {
							$self->log_debug(5, "Converting image $source_file to GIF");
							
							eval {
								$self->transform( 'GameImage', Source => $source_file, Format => 'gif', Env => $env );
							};
							if ($@) {
								push @$errors, "Failed to transform image: " . $tileset->{Path} . "$source_filename: $@";
							}
							else {
								$error = $self->{session}->{media_handle}->Write( $dir_path . '/' . $dest_filename );
								if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
							}
							
							delete $self->{session}->{media_handle};
						} # is png
					} # foreach file
					
					# blank tile for tileset + env
					$self->transform( 'New', 
						Background => 'transparent', 
						Width => $tileset->{TileWidth} * $self->{Zoom},
						Height => $tileset->{TileHeight} * $self->{Zoom}
					);
					$error = $self->{session}->{media_handle}->Write( $dir_path . '/_blank.gif' );
					if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
					delete $self->{session}->{media_handle};
				} # foreach env
			} # has envs
		} # foreach tileset
		
		$self->perf_end('ie6_gifs');
		$self->log_debug(5, "IE 6 GIFs complete");
	} # has tilesets
	
	# bitmap fonts
	my $fonts = $self->{storage}->list_get( "$base_path/fonts" );
	if ($fonts) {
		$self->log_debug(5, "Generating bitmap fonts");
		$self->perf_begin('fonts');
		
		make_dirs_for( "$temp_dir/fonts/" );
		
		foreach my $font (@$fonts) {
			$self->log_debug(5, "Generating font: " . $font->{Name});
			eval {
				$self->transform( 'FontGrid', 
					Font => 'effect://games/' . $game_id . '/revisions/' . $rev_id . '/assets' . $font->{Path},
					Size => $font->{Size},
					Color => $font->{Color},
					Background => 'transparent',
					Format => 'png',
					GlyphWidth => $font->{GlyphWidth},
					GlyphHeight => $font->{GlyphHeight},
					GlyphsPerRow => length($self->{config}->{BitmapFontGlyphs}),
					Glyphs => $self->{config}->{BitmapFontGlyphs},
					AntiAlias => $font->{AntiAlias},
					Zoom => $self->{Zoom} || '',
					ZoomFilter => $self->{ZoomFilter} || ''
				);
			};
			if ($@) {
				rmtree( $parent_temp_dir, 0, 1 );
				die("Failed to transform font: " . $font->{Name} . ": $@");
			}
			else {
				$error = $self->{session}->{media_handle}->Write( $temp_dir . '/fonts/' . $font->{Name} . '.png' );
				if ($error) { rmtree( $parent_temp_dir, 0, 1 ); die $error; }
			}
			
			delete $self->{session}->{media_handle};
		} # foreach font
		
		$self->perf_end('fonts');
		$self->log_debug(5, "Fonts complete");
	} # has fonts
	
	# level data
	if ($levels) {
		$self->log_debug(5, "Copying level data");
		$self->perf_begin('levels');
		
		make_dirs_for( "$temp_dir/levels/" );
		
		foreach my $level (@$levels) {
			$self->log_debug(5, "Copying level data: " . $level->{Name} );
			my $json = $self->{storage}->get_file_contents( '/games/' . $game_id . '/revisions/' . $rev_id . '/level_data/' . $level->{Name}, "data.json" );
			if (!$json) { $json = '{}'; }
			my $callback = 'Effect.Game.ll.nl'; # secret back door, standalone mode only
			my $prefix = $callback . '(';
			my $postfix = ');';
			my $content = $prefix . '{Code:0,LevelID:"'.$level->{Name}.'",Data:' . trim($json) . '}' . $postfix . "\n";
			save_file( "$temp_dir/levels/" . $level->{Name} . ".js", $content );
		} # foreach level
		
		$self->perf_end('levels');
		$self->log_debug(5, "Level data complete");
	} # has levels
	
	# xml files
	if ($folder_data && $folder_data->{FolderList}) {
		my $folder_paths = xpath_summary( $folder_data->{FolderList}, '/', 'inc_refs' );
		$folder_paths->{'/'} = 1;
		
		$self->log_debug(5, "Starting XML to JSON conversion");
		$self->perf_begin('xml_json');
		
		foreach my $subpath (sort keys %$folder_paths) {
			$self->log_debug(5, "Working on asset folder: $subpath");
			if ($self->{storage}->check_record_exists( $base_path . '/assets' . $subpath )) {
				
				my $full_source_path = $self->{storage}->get_record_path( $base_path . '/assets' . $subpath );
				my $full_dest_path = $temp_dir . '/xml' . $subpath;
				
				foreach my $file (glob($full_source_path . '/*')) {
					my $filename = basename($file);
					
					if (($filename ne '_metadata.xml') && ($filename =~ /\.(xml)$/i)) {
						my $dest_filename = $filename; $dest_filename =~ s/\.xml$/\.js/i;
						$self->log_debug(5, "Converting XML file: $file to $full_dest_path/$dest_filename");
						make_dirs_for( $full_dest_path . '/' );
						
						my $parser = XML::Lite->new(
							file => $full_source_path . '/' . $filename,
							preserveAttributes => 0
						);
						if ($parser->getLastError()) {
							push @$errors, "Failed to load XML file: $subpath/$filename: " . $parser->getLastError();
						}
						else {
							my $xml = {
								Code => 0,
								Description => 'Success',
								Path => $subpath . '/' . $filename,
								Data => $parser->getTree()
							};
							my $content = 'Effect.Game.xl.nl(' . xml_to_javascript($xml) . ');' . "\n";
							save_file( $full_dest_path . '/' . $dest_filename, $content );
						} # gooder xml file
					} # good xml file
				} # foreach file in dir
			} # folder exists
		} # foreach asset dir path
		
		$self->perf_end('xml_json');
		$self->log_debug(5, "XML to JSON conversion complete");
	} # xml files
	
	# engine code, game def json, etc.
	my $engine_ver = $rev->{Engine};
	if (!$engine_ver) {
		rmtree( $parent_temp_dir, 0, 1 );
		die("No Engine Version specified in revision.");
	}
	
	my $engine_versions = $self->{storage}->permacache_get('/admin/engine_versions');
	XMLalwaysarray( xml=>$engine_versions, element=>'Version' );
	$engine_versions = $engine_versions->{Version};
	
	my $ver_data = XMLsearch( xml=>$engine_versions, Name => $engine_ver );
	if (!$ver_data) {
		rmtree( $parent_temp_dir, 0, 1 );
		die("Could not locate engine version: $engine_ver");
	}
		
	my $content = '';
	$content .= $self->{config}->{Strings}->{Engine}->{Header} . "\n\n";
	
	# then, the port and toolbar DIVs
	my $init_html = trim(load_file($self->{config}->{Paths}->{EngineDir} . '/init.html'));
	$init_html =~ s/\n\s*//g;
	$content .= "document.write('".$init_html."');";
	
	# ogg ready has to be a variable outside the engine
	if ($game->{OggReady}) {
		$content .= "var EffectAudioOggReady = true;";
	}
	
	# load engine and include in output
	my $engine_mod = 0;
	my $engine_file = $self->{config}->{Paths}->{EngineDir} . '/' . $ver_data->{File};
	if ($ver_data->{File} eq 'src') {
		# use raw source of engine
		
		my $obfuscate = parse_xml( $self->{config}->{Paths}->{ConfDir} . '/obfuscate.xml' );
		foreach my $filename (@{$obfuscate->{SourceFiles}->{File}}) {
			$content .= load_file( '/effect/src/' . $filename );
		}
		
		# special debug class, only for engine src mode
		$content .= load_file( '/effect/src/Debug.class.js' );
	}
	elsif (-e $engine_file) {
		$engine_mod = (stat($engine_file))[9];
		$content .= load_file( $engine_file );
		
		# stub function just in case
		$content .= 'if (!window.Debug) window.Debug={trace:function(){}};';
		# $content .= load_file( '/effect/src/Debug.class.js' );
	}
	else {
		rmtree( $parent_temp_dir, 0, 1 );
		die("Could not locate engine version: $engine_ver");
	}
	
	# swap out _homePath with local one
	# this._homePath = 'http://'+location.hostname+'/effect/';
	$content =~ s@\b(this\._homePath\s*\=\s*)[^\;]+\;@ $1 . "'';"; @e;
	
	# next, create game definition
	my $game_def = copy_hash_remove_keys($game, 
		'Description', 'DescriptionHTML', 'Owner', 'State', 'Access', 'TwitterUsername', 'TwitterPassword');
	
	# add sprites, tiles, fonts, keys, audio to def
	$sprites ||= [];
	$game_def->{Sprites} = { Sprite => $sprites };
	
	my $tiles = $self->{storage}->list_get( "$base_path/tiles" );
	$tiles ||= [];
	$game_def->{Tiles} = { Tile => $tiles };
	
	$tilesets ||= [];
	foreach my $tileset (@$tilesets) {
		my $dir_data = $self->{storage}->get_metadata( "$base_path/assets" . $tileset->{Path} );
		if ($dir_data && $dir_data->{Files} && $dir_data->{Files}->{File}) {
			$tileset->{Files} = { File => [] };
			XMLalwaysarray( xml=>$dir_data->{Files}, element=>'File' );
			foreach my $file (@{$dir_data->{Files}->{File}}) {
				push @{$tileset->{Files}->{File}}, $file->{Name};
			}
		}
	}
	$game_def->{Tilesets} = { Tileset => $tilesets };
	
	$fonts ||= [];
	$game_def->{Fonts} = { Font => $fonts };

	my $keys = $self->{storage}->list_get( "$base_path/keys" );
	$keys ||= [];
	$game_def->{Keys} = { Key => $keys };
	
	my $sounds = $self->{storage}->list_get( "$base_path/audio" );
	$sounds ||= [];
	$game_def->{Sounds} = { Sound => $sounds };
	
	$levels ||= [];
	$game_def->{Levels} = { Level => $levels };
	
	$envs ||= [];
	$game_def->{Envs} = { Env => $envs };
	
	# disable zoom, sharing
	$game_def->{Zoom} = "No";
	$game_def->{DisableSharing} = 1;
	
	$content .= 'Effect.Game.setGameDef(' . xml_to_javascript( $game_def, 1, compress => ($ver_data->{File} eq 'src') ? 0 : 1 ) . ");";
	
	# set base asset url
	$content .= 'Effect.Game.setBaseAssetURL("assets");';
	
	# pass along query string as JSON
	$content .= 'Effect.Game.setQuery('.xml_to_javascript( {
		game => $game_id,
		rev => $rev_id,
		mode => 'sa'
	}, 1, compress => 1, force_strings => 1).');';
	
	# asset mod date (for cache control)
	my $stats = $self->{storage}->get_metadata($base_path . '/stats');
	$content .= 'Effect.Game.setAssetModDate('.$stats->{AssetMod}.');';
	
	$content .= "\n";
	
	# plugins
	if ($rev->{Plugin}) {
		$content .= "\n" . $self->{config}->{Strings}->{Engine}->{Footer} . "\n\n";
		$content .= $self->{storage}->get_file_contents( $base_path, 'plugins.js' );
	}
	
	save_file( $temp_dir . '/engine/EffectEngine.js', $content );
	
	# user code
	save_file(
		$temp_dir . '/'.$game_id.'.js', 
		$self->{storage}->get_file_contents( $base_path, 'user_code.js' )
	);
	
	# iframe.html
	$content = '';
	$content .= '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">';
	$content .= '<html>';
	$content .= '<head><title>Effect Games IFRAME</title></head>';
	$content .= '<body style="margin:0; padding:0;">';
	$content .= '<script type="text/javascript" src="engine/EffectEngine.js"></script>';
	$content .= '<script type="text/javascript" src="'.$game_id.'.js"></script>';
	$content .= '</body></html>' . "\n";
	save_file( $temp_dir . '/iframe.html', $content );
	
	# index.html
	my $width = $game->{PortWidth} * $game->{ZoomDefault};
	my $height = ($game->{PortHeight} * $game->{ZoomDefault}) + 24;
	$content = '';
	$content .= '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">' . "\n";
	$content .= '<html>' . "\n";
	$content .= "\t" . '<head>' . "\n";
	$content .= "\t" . "\t" . '<title>'.$game->{Title}.' - '.$rev_id.'</title>' . "\n";
	$content .= "\t" . '</head>' . "\n";
	$content .= "\t" . '<body style="font-family:arial,sans-serif;">' . "\n";
	$content .= "\t" . "\t" . '<center>' . "\n";
	$content .= "\t" . "\t" . "\t" . '<h1>' . $game->{Title} . ' - ' . $rev_id . '</h1>' . "\n";
	$content .= "\t" . "\t" . "\t" . '<h2>Standalone Version</h2>' . "\n\n";
	
	$content .= "\t" . "\t" . "\t" . '<!-- Begin Game Embed Code -->' . "\n";
	$content .= "\t" . "\t" . "\t" . '<iframe src="iframe.html" style="width:'.$width.'px; height:'.$height.'px; margin:0; padding:0;" frameborder="0" scrolling="no"></iframe>' . "\n";
	$content .= "\t" . "\t" . "\t" . '<!-- End Game Embed Code -->' . "\n\n";
	
	$content .= "\t" . "\t" . "\t" . '<p align="center" style="margin-top:40px;">By using this software, you agree to the terms and conditions in the <a href="http://www.effectgames.com/effect/#Article/Standalone_Publish_Agreement" target="_blank">Standalone Publish License Agreement</a>.<br/>' . "\n";
	$content .= "\t" . "\t" . "\t" . 'Effect Engine Copyright &copy; 2005 - 2011 Effect Games</p>' . "\n";
	$content .= "\t" . "\t" . '</center>' . "\n";
	$content .= "\t" . '</body>' . "\n";
	$content .= '</html>' . "\n";
	save_file( $temp_dir . '/index.html', $content );
	
	# create zip
	my $temp_dirname = basename($temp_dir);
	my $zip_filename = "$temp_dirname.zip";
	my $zip_file = "$parent_temp_dir/$zip_filename";
	$self->log_debug(4, "Creating zip file: $zip_file" );
	$self->perf_begin('zip');
	my $output = `cd $parent_temp_dir; /usr/bin/zip -rq $temp_dirname.zip $temp_dirname 2>&1`;
	$self->perf_end('zip');
	if ($output =~ /\S/) {
		rmtree( $parent_temp_dir, 0, 1 );
		die "Failed to create zip file: $zip_file: $output";
	}
	if (!(-e $zip_file)) {
		rmtree( $parent_temp_dir, 0, 1 );
		die "Failed to create zip file: Unknown Error";
	}
	my $zip_size = (stat($zip_file))[7];
	$self->log_debug(5, "Zip file size: " . get_text_from_bytes($zip_size));
	
	# store zip with 1 week expiration
	my $storage_key = 'standalone/' . md5_hex( time() . rand() . $$ );
	$self->log_debug(4, "Storing zip file to: $storage_key/$zip_filename");
	$self->{storage}->create_record( $storage_key );
	my $zip_path = $self->{storage}->get_file_path($storage_key, $zip_filename);
	file_copy( $zip_file, $zip_path );
	$self->{storage}->set_expiration( $storage_key, time() + (86400 * 7) );
	
	# delete temp dir
	$self->log_debug(5, "Deleting temp dir: $parent_temp_dir");
	rmtree( $parent_temp_dir, 0, 1 );
	
	# handle errors
	my $errors_disp = '';
	if (scalar @$errors) {
		$errors_disp = "The following errors occurred while creating your standalone game version:\n";
		$errors_disp .= join("\n", map { trim($_); } @$errors);
		$errors_disp .= "\n\n";
	}
	
	# send e-mail
	my $args = {
		GameID => $game_id,
		RevID => $rev_id,
		Username => $username,
		UserFullName => $user->{FullName},
		GameTitle => $game->{Title},
		URL => 'http://www.effectgames.com/effect/api/download/' . $storage_key . '/' . $zip_filename,
		FileSize => get_text_from_bytes( $zip_size ),
		Errors => $errors_disp
	};
	my $email_config = $self->{config}->{Emails}->{StandalonePublish};
	$self->log_debug(4, "Sending e-mail to: " . $user->{Email} );
	
	my $to = '"'.$user->{FullName}.'" <'.$user->{Email}.'>';
	my $from = $self->{config}->{Emails}->{From};
	my $subject = memory_substitute( $email_config->{Subject}, $args );
	my $body = memory_substitute( $email_config->{Body} . "\n\n" . $self->{config}->{Emails}->{Signature}, $args );
	
	$self->send_email(
		From     => $from,
		To       => $to,
		Subject  => $subject,
		Data     => $body
	);
	
	$self->log_debug(5, "Email send complete");
}

1;
