// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.PencilTool', {
	name: 'pencil',
	icon: 'pencil.png',
	title: 'Draw Tool (B)',
	hotkey: "B",
	draw_mode: '',
	
	activate: function() {
		this.page.set_cursor('url(images/cursors/pencil.cur) 0 14, pointer');
	},
	
	mouse_down: function(e, pt, button) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				this.undo_args = {
					type: 'TileDrawAction',
					title: 'Draw Tiles',
					layer: layer,
					layer_id: this.page.current_layer_id,
					before: {},
					after: {}
				};
				
				this.old_tx = -1;
				this.old_ty = -1;
				
				this.mouse_move(e, pt);
				break;
			
			case 'sprite':
				var sprite_name = this.page.pal('sprites').current_sprite;
				if (sprite_name) {					
					var layer = this.page.current_layer;
					var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: sprite_name } );
					var plane = this.page._port.getPlane( layer.Name );
					var pt = plane.getMouseCoords();
					
					var level_data = this.page._game.getLevelData();
					if (!level_data.next_sprite_id) level_data.next_sprite_id = 1;
					
					var obj = this.page.pal('inspector').get_props(true);
					if (!obj) obj = {};
					obj.id = 'E' + level_data.next_sprite_id++;
										
					while (plane.lookupSprite(obj.id, true)) {
						obj.id = 'E' + level_data.next_sprite_id++;
					}
										
					obj.zIndex = plane.zIndex;
					obj.type = sprite_name;
					obj.width = parseInt( sprite_def.Width, 10 );
					obj.height = parseInt( sprite_def.Height, 10 );
					
					var new_pt = this.page.snap_box_to_grid( Math.floor( pt.x - (obj.width / 2) ), Math.floor( pt.y - (obj.height / 2) ), sprite_def.Width, sprite_def.Height );
					
					obj.x = new_pt.x;
					obj.y = new_pt.y;
					
					this.page.undo_manager.add({
						type: 'SpriteAdd',
						title: 'Add New Sprite',
						layer: layer,
						layer_id: this.page.current_layer_id,
						sprite: copy_object(obj)
					});
										
					plane.addToAether(obj);			
					this.page._port.draw(true);
				}
				break;
		}
	},
	
	mouse_move: function(e, pt) {
		this.last_pt = pt;
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				var plane = this.page._port.getPlane( layer.Name );
				var pt = plane.getMouseCoords();
				var tx = Math.floor( pt.x / plane.tileSizeX );
				var ty = Math.floor( pt.y / plane.tileSizeY );
				
				if (this.page._game.mouseIsDown && ((tx != this.old_tx) || (ty != this.old_ty))) {
					this.old_tx = tx;
					this.old_ty = ty;
					
					if (this.page.current_layer_id.match(/\-\w+$/)) {
						// pseudolayer
						var tile_name = this.page.pal('tile_objs').current_tile_obj;
						if (tile_name) {
							var obj = this.page.pal('inspector').get_props(true);
							if (obj) {
								obj.type = tile_name;
							}
							else obj = tile_name;
							
							if (typeof(this.undo_args.after[ ''+tx+'x'+ty ]) == 'undefined') {
								this.undo_args.before[ ''+tx+'x'+ty ] = plane.lookupTile( tx, ty, 'objectData' ) || 0;
								this.undo_args.after[ ''+tx+'x'+ty ] = obj;
							}
							
							plane.setTile( tx, ty, obj, 'objectData');
						}
					}
					else {
						// std layer
						var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: layer.Tileset } );
						if (tileset && tileset.current_tile) {
							
							var tile = tileset.current_tile;
							if (this.draw_mode == 'add') {
								var old_tile = plane.lookupTile( tx, ty ) || 0;
								if (old_tile) {
									// overlay on top of old_tile
									// must parse query string if already contains overlays
									var tiles = [
										old_tile.replace(/\?.+$/, '') // bottom tile
									];
									if (old_tile.match(/\?.+/)) {
										// add overlays to stack
										var q = parseQueryString( old_tile );
										if (q.overlay) {
											var overlays = always_array( q.overlay );
											array_cat( tiles, overlays );
										}
									}
									
									// move new tile to head of stack
									delete_from_array( tiles, tile ); // may not be found, and that's fine
									array_push( tiles, tile );
									
									// reconstruct filename + query format
									tile = tiles.shift(); // bottom tile
									
									// add each overlay
									for (var idx = 0, len = tiles.length; idx < len; idx++) {
										if (tile.match(/\?/)) tile += '&'; else tile += '?';
										tile += 'overlay=' + tiles[idx];
									}
									
									// gotta make sure image is "loaded" in ImageLoader for setTile() to work
									var uri = plane.tileImagePath + '/' + tile;
									if (!this.page._image_loader.lookupImage(uri)) {
										Debug.trace('pencil', "Forcing ImageLoader to load: " + uri);
										this.page._image_loader.loadImages( uri );
										var image = this.page._image_loader.lookupImage(uri);
										image.loaded = true; // hack
									}
								}
								else {
									// solo tile
									tile = tileset.current_tile;
								}
							} // draw mode 'add'
							
							if (typeof(this.undo_args.after[ ''+tx+'x'+ty ]) == 'undefined') {
								this.undo_args.before[ ''+tx+'x'+ty ] = plane.lookupTile( tx, ty ) || 0;
								this.undo_args.after[ ''+tx+'x'+ty ] = tile;
							}
							
							Debug.trace('pencil', "Setting tile "+tx+'x'+ty+" to: " + tile);
							
							plane.setTile( tx, ty, tile );
						} // have tileset and cur tile
					} // std layer
				} // mouse is down
				
				// move tool preview
				var x = plane.zoom( (tx * plane.tileSizeX) - plane.scrollX ) - 1;
				var y = plane.zoom( (ty * plane.tileSizeY) - plane.scrollY ) - 1;
				this.page._tool_preview.style.left = '' + x + 'px';
				this.page._tool_preview.style.top = '' + y + 'px';
				break; // tile
			
			case 'sprite':
				if (!this.page._game.mouseIsDown) {
					var sprite_name = this.page.pal('sprites').current_sprite;
					if (sprite_name) {
						var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: sprite_name } );
						var plane = this.page._port.getPlane( layer.Name );
						var pt = plane.getMouseCoords();
						
						var x = Math.floor( pt.x - (sprite_def.Width / 2) );
						var y = Math.floor( pt.y - (sprite_def.Height / 2) );
						
						var new_pt = this.page.snap_box_to_grid( x, y, sprite_def.Width, sprite_def.Height );
						
						var screen_x = plane.zoom( new_pt.x - plane.scrollX ) - 1;
						var screen_y = plane.zoom( new_pt.y - plane.scrollY ) - 1;
						
						/* var x = plane.zoom( (pt.x - (sprite_def.Width / 2)) - plane.scrollX ) - 1;
						var y = plane.zoom( (pt.y - (sprite_def.Height / 2)) - plane.scrollY ) - 1;
						
						var new_pt = this.page.snap_box_to_grid( x, y, sprite_def.Width, sprite_def.Height ); */
						
						this.page._tool_preview.style.left = '' + screen_x + 'px';
						this.page._tool_preview.style.top = '' + screen_y + 'px';
						
						// Debug.trace("moving tool preview to: " + x + " x " + y);
					} // sprite selected
				} // mouse is up
				break; // sprite
		} // switch layer.Type
	},
	
	mouse_up: function(e, pt, buttonNum) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				this.page.undo_manager.add( this.undo_args );
				break;
		} // switch layer.Type
	},
	
	key_down: function(e, code) {
		// handle key down
		if ((code == LEFT_ARROW) || (code == RIGHT_ARROW) || (code == UP_ARROW) || (code == DOWN_ARROW)) {
			var layer = this.page.current_layer;
			if (layer.Type == 'tile') {
				if (this.page.current_layer_id.match(/\-\w+$/)) {
					// pseudolayer
					this.page.pal('tile_objs').key_down(e, code);
				}
				else {
					// std layer
					this.page.pal('tileset').key_down(e, code);
				}
			} // tile layer
			else if (layer.Type == 'sprite') {
				// sprite layer
				this.page.pal('sprites').key_down(e, code);
			} // sprite layer
		} // arrow keys
	},
	
	show_tool_preview: function() {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: layer.Tileset } );
				if (tileset) {
					var zWidth = tileset.TileWidth * this.page._port.getZoomLevel();
					var zHeight = tileset.TileHeight * this.page._port.getZoomLevel();
					
					this.page._tool_preview.style.width = '' + zWidth + 'px';
					this.page._tool_preview.style.height = '' + zHeight + 'px';
					this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
					// this.page._tool_preview.style.borderLeft = this.page._tool_preview.style.borderTop = '1px dashed #ccc';
					// this.page._tool_preview.style.borderRight = this.page._tool_preview.style.borderBottom = '1px dashed #333';
					this.page._tool_preview.style.display = 'none';
					
					if (this.page.current_layer_id.match(/\-\w+$/)) {
						// pseudolayer
						if (this.page.pal('tile_objs').current_tile_obj) {
							var html = '';
							html += '<div style="width:'+zWidth+'px; height:'+zHeight+'px; opacity:0.5;';
							
							var tile_name = this.page.pal('tile_objs').current_tile_obj;
							var tile_def = find_object( this.page._def.Tiles.Tile, { Name: tile_name } );
							
							if (tile_def && tile_def.Icon) {
								html += ' background:url('+this.page._game.getGamePath()+tile_def.Icon+'?env='+(this.page.level.Env || '')+'&mod='+this.page._game.getAssetModDate()+') no-repeat 0px 0px;';
								html += '">';
							}
							else {
								html += '">';
								html += '<span class="object_label">' + tile_name + '</span>';
							}
							
							html += '</div>';
							this.page._tool_preview.innerHTML = html;
							this.page._tool_preview.style.display = '';
						}
					}
					else {
						if (tileset.current_tile) {
							var file_path = tileset.Path + tileset.current_tile;
							var url = this.page._image_loader.getImageURL( file_path );
							this.page._tool_preview.innerHTML = '<img src="'+url+'" width="'+zWidth+'" height="'+zHeight+'" style="opacity:0.5;"/>';
							this.page._tool_preview.style.display = '';
						} // has tileset
					} // std layer
				} // found tileset
				break;
			
			case 'sprite':
				var sprite_name = this.page.pal('sprites').current_sprite;
				if (sprite_name) {
					var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: sprite_name } );
					
					var zWidth = sprite_def.Width * this.page._port.getZoomLevel();
					var zHeight = sprite_def.Height * this.page._port.getZoomLevel();
					
					this.page._tool_preview.style.width = '' + zWidth + 'px';
					this.page._tool_preview.style.height = '' + zHeight + 'px';
					this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
					
					var html = '';
					html += '<div style="width:'+zWidth+'px; height:'+zHeight+'px; opacity:0.5;';
					
					if (sprite_def.Icon) {
						html += ' background:url('+this.page._game.getGamePath()+sprite_def.Icon+'?env='+(this.page.level.Env || '')+'&mod='+this.page._game.getAssetModDate()+') no-repeat 0px 0px;';
						html += '">';
					}
					else {
						html += '">';
						html += '<span class="object_label">' + sprite_name + '</span>';
					}
					
					html += '</div>';
					this.page._tool_preview.innerHTML = html;
					this.page._tool_preview.style.display = '';
					
					if (this.last_pt) this.mouse_move(null, this.last_pt);
				} // sprite class selected
				break;
		} // switch this.current_layer.Type
	},
	
	set_draw_mode: function(mode) {
		// set tile draw mode (add or replace)
		this.draw_mode = mode;
		this.page.editor_prefs.pencil_draw_mode = mode;
		user_storage_mark();
	}
} );
