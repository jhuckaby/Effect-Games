// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.EraserTool', {
	name: 'eraser',
	icon: 'eraser.png',
	title: 'Eraser Tool (E)',
	hotkey: "E",
	draw_mode: '',
	
	activate: function() {
		this.page.set_cursor('url(images/cursors/eraser.cur) 8 8, pointer');
	},
	
	mouse_down: function(e, pt, button) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				this.undo_args = {
					type: 'TileDrawAction',
					title: 'Erase Tiles',
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
				var plane = this.page._port.getPlane( layer.Name );
				var sprite = plane.lookupSpriteFromScreen( pt );
				if (sprite) {
					sprite.destroy();
					
					var _aether = sprite.getAetherObj();
					
					for (var key in _aether) {
						// only copy back aether keys (x, y, etc.)
						_aether[key] = sprite[key];
					} // foreach aether key
					
					this.page.undo_manager.add({
						type: 'SpriteDelete',
						title: 'Delete Sprite',
						layer: layer,
						layer_id: this.page.current_layer_id,
						sprite: copy_object(_aether)
					});
					
					this.page._port.draw(true);
					this.page._tool_preview.style.display = 'none';
				}
				break;
		}
	},
	
	mouse_move: function(e, pt) {
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
						
						if (typeof(this.undo_args.after[ ''+tx+'x'+ty ]) == 'undefined') {
							this.undo_args.before[ ''+tx+'x'+ty ] = plane.lookupTile( tx, ty, 'objectData' ) || 0;
							this.undo_args.after[ ''+tx+'x'+ty ] = 0;
						}
						
						plane.setTile( tx, ty, 0, 'objectData');
					}
					else {
						// std layer
						
						var tile = 0;
						if (this.draw_mode == 'top') {
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
								
								// delete topmost tile
								tiles.pop();
								
								if (tiles.length) {
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
									// there was only one 'layer', so set to 0
									tile = 0;
								}
							}
							else {
								// solo tile
								tile = 0;
							}
						} // top overlay only
						
						if (typeof(this.undo_args.after[ ''+tx+'x'+ty ]) == 'undefined') {
							this.undo_args.before[ ''+tx+'x'+ty ] = plane.lookupTile( tx, ty ) || 0;
						}
						this.undo_args.after[ ''+tx+'x'+ty ] = tile;
						
						plane.setTile( tx, ty, tile );
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
					var plane = this.page._port.getPlane( layer.Name );
					var sprite = plane.lookupSpriteFromScreen( pt );
					if (sprite) {
						this.page._tool_preview.style.left = '' + Math.floor(sprite.zoom(sprite.x - plane.scrollX) - 1) + 'px';
						this.page._tool_preview.style.top = '' + Math.floor(sprite.zoom(sprite.y - plane.scrollY) - 1) + 'px';
						this.page._tool_preview.style.width = '' + Math.floor(sprite.zoom(sprite.width)) + 'px';
						this.page._tool_preview.style.height = '' + Math.floor(sprite.zoom(sprite.height)) + 'px';
						this.page._tool_preview.style.display = '';
					}
					else {
						this.page._tool_preview.style.display = 'none';
					}
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
		if (code == RIGHT_ARROW) this.page.onNudgeScroll( 1, 0 );
		else if (code == LEFT_ARROW) this.page.onNudgeScroll( -1, 0 );
		else if (code == DOWN_ARROW) this.page.onNudgeScroll( 0, 1 );
		else if (code == UP_ARROW) this.page.onNudgeScroll( 0, -1 );
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
					this.page._tool_preview.innerHTML = '';
					this.page._tool_preview.style.display = '';
				} // found tileset
				break;
			
			case 'sprite':
				this.page._tool_preview.style.width = '1px';
				this.page._tool_preview.style.height = '1px';
				this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
				this.page._tool_preview.innerHTML = '';
				this.page._tool_preview.style.display = '';
				break;
		} // switch this.current_layer.Type
	},
	
	double_click: function() {
		// double click on eraser == delete entire layer contents
		if (confirm("Are you sure you want to erase the entire layer contents?  This operation cannot be undone.")) {
			var layer = this.page.current_layer;
			var plane = this.page._port.getPlane( layer.Name );

			switch (layer.Type) {
				case 'tile':
					plane.reset();
					if (this.page.current_layer_id.match(/\-\w+$/)) {
						// pseudolayer
						plane.setData( [], 'objectData' );
					}
					else {
						// std layer
						plane.setData( [] );
					}
					plane.init();
					this.page._port.draw(true);
					this.page.pal('navigator').mark( layer.Name, 0, 0, plane.getMaxTileX(), plane.getMaxTileY() );
					break;
				
				case 'sprite':
					plane.deleteAll();
					plane.setupAether( [] );
					this.page._port.draw(true);
					this.page.pal('navigator').mark( layer.Name, 0, 0, this.page._port.virtualWidth, this.page._port.virtualHeight );
					break;
			} // switch layer.Type
			
			this.page.undo_manager.reset();
		} // confirmed
	},
	
	set_erase_mode: function(mode) {
		// set tile erase mode (all or top)
		this.draw_mode = mode;
		this.page.editor_prefs.eraser_draw_mode = mode;
		user_storage_mark();
	}
} );
