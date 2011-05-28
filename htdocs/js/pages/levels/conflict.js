// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.create( 'LevelEditor.ConflictResolver', {
	
	page: null,
	callback: null,
	
	__construct: function(page, callback) {
		this.page = page;
		this.callback = callback;
		this.conflicts = {};
	},
	
	go: function() {
		$('page_GameLevelMapEdit').hide();
		$('d_footer').hide();
		show_progress_dialog(1, "Loading level map...");
		
		this.game_id = this.page.game_id;
		this.game = this.page.game;
		this.level = this.page.level;
		
		// first, we need all sprite, tile and tileset defs
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			sprites: 1,
			tiles: 1,
			tilesets: 1,
			tileset_files: 1
		}, [this, 'receive_objects'], {});
	},
	
	receive_objects: function(response, tx) {
		this.sprites = [];
		if (response.Sprites && response.Sprites.Sprite) {
			this.sprites = always_array( response.Sprites.Sprite );
		}
		
		this.tiles = [];
		if (response.Tiles && response.Tiles.Tile) {
			this.tiles = always_array( response.Tiles.Tile );
		}
		
		this.tilesets = [];
		if (response.Tilesets && response.Tilesets.Tileset) {
			this.tilesets = always_array( response.Tilesets.Tileset );
		}
		
		// load level data
		load_script( '/effect/api/game_get_level_data' + composeQueryString({
			game_id: this.game_id,
			rev: 'dev',
			level_id: this.level.Name,
			mod: hires_time_now(),
			format: 'js',
			callback: '$P().resolver.receive_level_data'
		}));
	},
	
	receive_level_data: function(response) {
		// make sure level size is >= main port size
		var port_width = parseInt(this.game.PortWidth, 10);
		var port_height = parseInt(this.game.PortHeight, 10);
		
		if ((parseInt(this.level.Width, 10) < port_width) || (parseInt(this.level.Height, 10) < port_height)) {
			return this.do_fatal_error("Your level size ("+this.level.Width+'x'+this.level.Height+" pixels) is smaller than your game display size ("+this.game.PortWidth+'x'+this.game.PortHeight+" pixels).  You must correct this before editing the level map.");
		}
		
		this.layers = always_array( this.level.Layers.Layer );
		
		// make sure all tile sizes are smaller or equal to port size
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			if (layer.Type == 'tile') {
				if (!layer.Tileset) {
					return this.do_fatal_error("The tile layer \""+layer.Name+"\" does not have an assigned tileset.  Please edit the level info and choose a tileset for the layer.");
				}
				var tileset = find_object(this.tilesets, { Name: layer.Tileset } );
				if (!tileset) {
					return this.do_fatal_error("The tileset \""+layer.Tileset+"\" cannot be found.  Please edit the level info and choose a different tileset for layer \""+layer.Name+"\".");
				}
				if ((parseInt(tileset.TileWidth, 10) > port_width) || (parseInt(tileset.TileHeight, 10) > port_height)) {
					return this.do_fatal_error("The tileset \""+tileset.Name+"\" ("+tileset.TileWidth+'x'+tileset.TileHeight+" pixels) is larger than the game display size ("+this.game.PortWidth+'x'+this.game.PortHeight+" pixels). You must correct this before editing the level map.");
				}
				if (!tileset.Files || !tileset.Files.File) {
					return this.do_fatal_error("The tileset \""+tileset.Name+"\" has no files.  Please fix this tileset, or edit the level info and choose another tileset before editing the map.");
				}
			} // is tile layer
		} // foreach tileset
		
		if (!response || !response.Data || !response.Data.layers) {
			Debug.trace('level', "No level data found, exiting conflict resolver");
			this.finish();
			return;
		}
		this.level_data = response.Data;
		
		this.need_save = false;
		
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			var layer_data = this.level_data.layers[ layer.Name ];
			if (layer_data) {
				var func = 'check_layer_' + layer.Type;
				if (this[func]) {
					Debug.trace('resolver', "Checking " + layer.Type + " layer: " + layer.Name);
					this.level_data.layers[ layer.Name ] = this[ func ]( layer, layer_data );
					Debug.trace('resolver', "Done checking layer: " + layer.Name);
				}
			} // has layer data
		} // foreach layer
		
		var num_conflicts = num_keys(this.conflicts);
		Debug.trace('resolver', "Conflict check complete: " + num_conflicts + " conflicts found");
		
		if (num_conflicts) this.do_show_conflicts();
		else if (this.need_save) this.do_save_level_data();
		else this.finish();
	},
	
	add_conflict: function(key, args) {
		if (!this.conflicts[key]) {
			Debug.trace('resolver', "Adding new conflict: " + key);
			this.conflicts[key] = args;
		}
		return this.conflicts[key];
	},
	
	check_layer_tile: function(layer, layer_data) {
		// check tile layer for conflicts
		
		// data layer
		var tileset = find_object(this.tilesets, { Name: layer.Tileset } );
		
		// index all tileset filenames in hash for quick lookups
		var tileset_filenames = {};
		var files = always_array( tileset.Files.File );
		for (var idx = 0, len = files.length; idx < len; idx++) {
			var filename = files[idx];
			tileset_filenames[ filename ] = 1;
		} // foreach tileset file
		
		if (layer_data.data && layer_data.map) {
			var data = layer_data.data;
			var map = layer_data.map;
			for (var tx = 0, max_tx = data.length; tx < max_tx; tx++) {
				var col = data[tx];
				if (col) {
					for (var ty = 0, max_ty = col.length; ty < max_ty; ty++) {
						var tile = col[ty];
						if (tile) {
							var filename = map[tile];
							if (!filename) {
								// internal error -- this should never happen, silently set tile to 0
								Debug.trace('resolver', "This should never happen: " + layer.Name + ": " + tx + 'x' + ty + ': ' + tile + ": has no map entry, setting to 0");
								col[ty] = 0;
								this.need_save = true;
							}
							
							// tile may have overlays
							var tiles = [
								filename.replace(/\?.+$/, '') // bottom tile
							];
							if (filename.match(/\?.+/)) {
								// add overlays to stack
								var q = parseQueryString( filename );
								if (q.overlay) {
									var overlays = always_array( q.overlay );
									array_cat( tiles, overlays );
								}
							}
							
							for (var idx = 0, len = tiles.length; idx < len; idx++) {
								var filename = tiles[idx];
							
								if (!tileset_filenames[filename]) {
									var conflict = this.add_conflict( 'tile_image_missing/' + tileset.Name + '/' + filename, {
										type: 'tile_image_missing',
										tileset: tileset,
										filename: filename,
										tiles_affected: 0
									} );
									conflict.tiles_affected++;
								} // bad filename
							} // foreach tile overlay
						} // good tile
					} // y loop
				} // good column
			} // x loop
		} // data layer
		
		// object layer
		if (layer_data.objectData) {
			// index all tile object classes by name, for quick lookups
			var tile_obj_names = {};
			var tile_obj_old_names = {};
			for (var idx = 0, len = this.tiles.length; idx < len; idx++) {
				var tile_def = this.tiles[idx];
				tile_obj_names[ tile_def.Name ] = 1;
				if (tile_def.OldName) tile_obj_old_names[ tile_def.OldName ] = tile_def.Name;
			} // foreach tile obj class
			
			var objectData = layer_data.objectData;
			for (var tx = 0, max_tx = objectData.length; tx < max_tx; tx++) {
				var col = objectData[tx];
				if (col) {
					for (var ty = 0, max_ty = col.length; ty < max_ty; ty++) {
						var tile = col[ty];
						if (tile) {
							var obj_name = (typeof(tile) == 'object') ? tile.type : tile;
							if (!tile_obj_names[obj_name]) {
								// Debug.trace('resolver', "Could not find tile definition: " + obj_name );
								if (tile_obj_old_names[obj_name]) {
									var new_name = tile_obj_old_names[obj_name];
									Debug.trace('resolver', "Ah ha, tile class was renamed from "+obj_name+" to "+new_name+".  Silently fixing.");
									if (typeof(tile) == 'object') {
										tile.type = new_name;
									}
									else {
										col[ty] = new_name;
									}
									this.need_save = true;
								} // ah ha, renamed
								else {
									// no luck, conflict it
									var conflict = this.add_conflict( 'tile_def_missing/' + obj_name, {
										type: 'tile_def_missing',
										obj_name: obj_name,
										tiles_affected: 0
									} );
									conflict.tiles_affected++;
								}
							} // tile class not found
						} // good tile
					} // y loop
				} // good column
			} // x loop
		} // objectData
		
		return layer_data;
	},
	
	check_layer_sprite: function(layer, sprites) {
		// check sprite layer for conflicts
		for (var idx = 0, len = sprites.length; idx < len; idx++) {
			var sprite = sprites[idx];
			var sprite_def = find_object( this.sprites, { Name: sprite.type, Place: 1 } );
			if (!sprite_def) {
				Debug.trace('resolver', "Could not find sprite " + sprite.id + " definition: " + sprite.type );
				sprite_def = find_object( this.sprites, { OldName: sprite.type, Place: 1 } );
				if (sprite_def) {
					Debug.trace('resolver', "Ah ha, sprite " + sprite.id + " type was renamed from "+sprite_def.OldName+" to "+sprite_def.Name+".  Silently fixing.");
					sprite.type = sprite_def.Name;
					this.need_save = true;
				}
				else {
					var conflict = this.add_conflict( 'sprite_def_missing/' + sprite.type, {
						type: 'sprite_def_missing',
						sprite_type: sprite.type,
						sprites_affected: 0
					} );
					conflict.sprites_affected++;
				} // conflict
			} // sprite def not found
			
			// silently update width/height based on def (if we have def)
			if (sprite_def) {
				var def_width = parseInt( sprite_def.Width, 10 );
				var def_height = parseInt( sprite_def.Height, 10 );
				if ((sprite.width != def_width) || (sprite.height != def_height)) {
					Debug.trace('resolver', "Sprite " + sprite.id + "(" + sprite_def.Name + ") has changed size from " + sprite.width + 'x' + sprite.height + " to " + def_width + 'x' + def_height);
					sprite.width = def_width;
					sprite.height = def_height;
					this.need_save = true;
				} // resize sprite
			} // good def
		} // foreach sprite
		
		return sprites;
	},
	
	do_show_conflicts: function() {
		// show conflicts in large, scrolling dialog box
		// so user can decide what to do
		this.conflicts_arr = [];
		var conflict_keys_sorted = hash_keys_to_array(this.conflicts).sort();
		
		for (var idx = 0, len = conflict_keys_sorted.length; idx < len; idx++) {
			this.conflicts_arr.push( this.conflicts[ conflict_keys_sorted[idx] ] );
		}
		
		var html = '';
		
		html += '<table cellspacing=0 cellpadding=0><tr><td width=500 height=345 valign=center align=center>';
		html += '<div class="dialog_title">Conflict Resolver</div>';
		
		html += '<form method=get action="javascript:void(0)"><table cellspacing="0" cellpadding="0"><tr><td align="left">';
		
		html += '<div style="font-size:12px;">The level map "'+this.level.Name+'" has ';
		if (this.conflicts_arr.length == 1) {
			html += '1 conflict that must be resolved before loading.  Please review the conflict below and choose which action to perform.';
		}
		else {
			html += this.conflicts_arr.length + ' conflicts that must be resolved before loading.  Please review the conflicts below and choose which actions to perform.';
		}
		html += '</div>';
		html += '<br/>';
		
		html += '<div style="width:498px; height:200px; border:1px solid #ccc; overflow-y:auto">';
			html += '<table class="data_table" width="100%">';
		
				html += '<tr><th>Conflict Description</th><th>Resolution</th></tr>';
				
				for (var idx = 0, len = this.conflicts_arr.length; idx < len; idx++) {
					var conflict = this.conflicts_arr[idx];
					var text = '';
					var items = [];
					
					switch (conflict.type) {
						case 'tile_image_missing':
							text += 'Tile image "'+conflict.filename+'" is missing from tileset "'+conflict.tileset.Name+'".  ';
							text += conflict.tiles_affected + '&nbsp;' + ((conflict.tiles_affected == 1) ? 'tile is affected.' : 'tiles are affected.');
							items.push( ['_delete_', "Erase affected tiles"] );
							var files = always_array( conflict.tileset.Files.File );
							for (var idy = 0, ley = files.length; idy < ley; idy++) {
								var filename = files[idy];
								items.push( [filename, 'Change to "'+filename+'"'] );
							}
							break;
						
						case 'tile_def_missing':
							text += 'Tile class "'+conflict.obj_name+'" is missing.  ';
							text += conflict.tiles_affected + '&nbsp;' + ((conflict.tiles_affected == 1) ? 'tile is affected.' : 'tiles are affected.');
							items.push( ['_delete_', "Erase affected tiles"] );
							for (var idy = 0, ley = this.tiles.length; idy < ley; idy++) {
								var tile_def = this.tiles[idy];
								items.push( [tile_def.Name, 'Change to "'+tile_def.Name+'"'] );
							}
							break;
						
						case 'sprite_def_missing':
							text += 'Sprite class "'+conflict.sprite_type+'" is missing.  ';
							text += conflict.sprites_affected + '&nbsp;' + ((conflict.sprites_affected == 1) ? 'sprite is affected.' : 'sprites are affected.');
							items.push( ['_delete_', "Delete affected sprites"] );
							for (var idy = 0, ley = this.sprites.length; idy < ley; idy++) {
								var sprite_def = this.sprites[idy];
								if (sprite_def.Place == 1) items.push( [sprite_def.Name, 'Change to "'+sprite_def.Name+'"'] );
							}
							break;
					} // switch conflict.type
					
					html += '<tr>';
					html += '<td>' + text + '</td>';
					html += '<td>' + menu('fe_cr_action_'+idx, items, {'class':'fe_small_menu'}) + '</td>';
					html += '</tr>';
				} // foreach conflict
		
			html += '</table>';
		html += '</div>';
		
		html += '</td></tr></table>';
		
		html += '<br><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "$P().resolver.abort()") + '</td>';
			html += '<td width=30>&nbsp;</td>';
			// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
			// html += '<td width=15>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', '<b>Resolve Conflicts</b>', '$P().resolver.do_resolve_conflicts()') + '</td>';
		html += '</tr></table>';
		
		html += '</form>';
		
		session.hooks.keys[ENTER_KEY] = [this, 'do_resolve_conflicts']; // enter key
		session.hooks.keys[ESC_KEY] = [this, 'abort']; // escape key
		
		show_popup_dialog(500, 345, html);
	},
	
	do_resolve_conflicts: function() {
		// apply user menu selections to conflict object
		for (var idx = 0, len = this.conflicts_arr.length; idx < len; idx++) {
			var conflict = this.conflicts_arr[idx];
			conflict.resolution = get_menu_value( 'fe_cr_action_' + idx );
		} // foreach conflict
		
		show_progress_dialog(1, "Resolving conflicts...");
		setTimeout( '$P().resolver.do_resolve_conflicts_2()', 1 );
	},
	
	do_resolve_conflicts_2: function() {
		// now go through layer by layer, and resolve them conflicts!
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			var layer_data = this.level_data.layers[ layer.Name ];
			if (layer_data) {
				var func = 'resolve_layer_' + layer.Type;
				if (this[func]) {
					Debug.trace('resolver', "Resolving " + layer.Type + " layer: " + layer.Name);
					this.level_data.layers[ layer.Name ] = this[ func ]( layer, layer_data );
					Debug.trace('resolver', "Done resolving layer: " + layer.Name);
				}
			} // has layer data
		} // foreach layer
		
		this.do_save_level_data();
	},
	
	resolve_layer_tile: function(layer, layer_data) {
		// resolve all conflicts in tile layer
		// data layer
		var tileset = find_object(this.tilesets, { Name: layer.Tileset } );
		
		// index all tileset filenames in hash for quick lookups
		var tileset_filenames = {};
		var files = always_array( tileset.Files.File );
		for (var idx = 0, len = files.length; idx < len; idx++) {
			var filename = files[idx];
			tileset_filenames[ filename ] = 1;
		} // foreach tileset file
		
		if (layer_data.data && layer_data.map) {
			var data = layer_data.data;
			var map = layer_data.map;
			
			// gen rev map for resolutions
			var rev_map = reverse_hash( map );
			for (var key in rev_map) {
				rev_map[key] = parseInt( rev_map[key], 10 );
			}
			
			for (var tx = 0, max_tx = data.length; tx < max_tx; tx++) {
				var col = data[tx];
				if (col) {
					for (var ty = 0, max_ty = col.length; ty < max_ty; ty++) {
						var tile = col[ty];
						if (tile) {
							var filename = map[tile];
							
							// tile may have overlays
							var tiles = [
								filename.replace(/\?.+$/, '') // bottom tile
							];
							if (filename.match(/\?.+/)) {
								// add overlays to stack
								var q = parseQueryString( filename );
								if (q.overlay) {
									var overlays = always_array( q.overlay );
									array_cat( tiles, overlays );
								}
							}
							
							for (var idx = 0, len = tiles.length; idx < len; idx++) {
								var filename = tiles[idx];
							
								if (!tileset_filenames[filename]) {
									var conflict = this.conflicts[ 'tile_image_missing/' + tileset.Name + '/' + filename ];
									if (conflict.resolution == '_delete_') col[ty] = 0;
									else {
										var new_idx = rev_map[ conflict.resolution ];
										if (!new_idx) {
											new_idx = get_next_key_seq(map);
											Debug.trace('resolver', "First time use for new tile: " + new_idx + ": " + conflict.resolution);
											map[new_idx] = conflict.resolution;
											rev_map[conflict.resolution] = new_idx;
										} // first time use
										col[ty] = new_idx;
									} // custom resolution
									idx = len; // only need to do this once per tile pos
								} // bad filename
								
							} // foreach overlay
						} // good tile
					} // y loop
				} // good column
			} // x loop
		} // data layer
		
		// object layer
		if (layer_data.objectData) {
			// index all tile object classes by name, for quick lookups
			var tile_obj_names = {};
			for (var idx = 0, len = this.tiles.length; idx < len; idx++) {
				var tile_def = this.tiles[idx];
				tile_obj_names[ tile_def.Name ] = tile_def;
			} // foreach tile obj class
			
			var objectData = layer_data.objectData;
			for (var tx = 0, max_tx = objectData.length; tx < max_tx; tx++) {
				var col = objectData[tx];
				if (col) {
					for (var ty = 0, max_ty = col.length; ty < max_ty; ty++) {
						var tile = col[ty];
						if (tile) {
							var obj_name = (typeof(tile) == 'object') ? tile.type : tile;
							if (!tile_obj_names[obj_name]) {
								var conflict = this.conflicts[ 'tile_def_missing/' + obj_name ];
								if (conflict.resolution == '_delete_') col[ty] = 0;
								else {
									if (typeof(tile) == 'object') tile.type = conflict.resolution;
									else col[ty] = conflict.resolution;
								} // custom resolution
							} // tile class not found
						} // good tile
					} // y loop
				} // good column
			} // x loop
		} // objectData
		
		return layer_data;
	},
	
	resolve_layer_sprite: function(layer, sprites) {
		// resolve all conflicts in sprite layer
		for (var idx = 0, len = sprites.length; idx < len; idx++) {
			var sprite = sprites[idx];
			var sprite_def = find_object( this.sprites, { Name: sprite.type } );
			if (!sprite_def) {
				var conflict = this.conflicts[ 'sprite_def_missing/' + sprite.type ];
				if (conflict.resolution == '_delete_') {
					// delete sprite
					Debug.trace('resolver', "Deleting sprite: " + sprite.id + " (" + sprite.type + ")");
					sprites.splice( idx, 1 );
					len--;
					idx--;
				}
				else {
					// reassign sprite
					Debug.trace('resolver', "Reassigning sprite: " + sprite.id + " from " + sprite.type + " to " + conflict.resolution);
					sprite.type = conflict.resolution;
					sprite_def = find_object( this.sprites, { Name: conflict.resolution } );
					sprite.width = parseInt( sprite_def.Width, 10 );
					sprite.height = parseInt( sprite_def.Height, 10 );
				}
			} // sprite def not found
		} // foreach sprite
		
		return sprites;
	},
	
	do_save_level_data: function() {
		Debug.trace('resolver', "Saving level map");
		hide_popup_dialog();
		show_progress_dialog(1, "Saving level map...");
		effect_api_send('game_save_level_data', {
			GameID: this.game_id,
			LevelID: this.level.Name,
			Data: serialize( this.level_data )
		}, [this, 'finish'], {  });
	},
	
	do_fatal_error: function(msg) {
		// show fatal error dialog and abort load
		Debug.trace('resolver', "Fatal Error: " + msg);
		do_notice("Cannot Load Level Map", msg, [this, 'abort']);
	},
	
	abort: function() {
		Debug.trace('resolver', "Aborting conflict resolver and returning to level selection screen.");
		hide_popup_dialog();
		$('d_footer').show();
		Nav.go('GameLevels/' + this.game_id);
	},
	
	finish: function() {
		// resume loading level
		Debug.trace('resolver', "Conflict resolver complete, resuming level map load.");
		hide_popup_dialog();
		$('page_GameLevelMapEdit').show();
		$('d_footer').show();
		fire_callback( this.callback );
	}

} );
