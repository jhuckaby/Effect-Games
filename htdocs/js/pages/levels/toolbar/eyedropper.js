// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.EyeDropperTool', {
	name: 'eyedropper',
	icon: 'eyedropper.png',
	title: 'Eyedropper Tool (I)',
	hotkey: "I",
	
	activate: function() {
		this.page.set_cursor('url(images/cursors/eyedropper.cur) 1 14, pointer');
	},
	
	mouse_move: function(e, pt) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				if (!this.page._game.mouseIsDown) {
					// move tool preview
					var plane = this.page._port.getPlane( layer.Name );
					var pt = plane.getMouseCoords();
					var tx = Math.floor( pt.x / plane.tileSizeX );
					var ty = Math.floor( pt.y / plane.tileSizeY );
					
					var x = plane.zoom( (tx * plane.tileSizeX) - plane.scrollX ) - 1;
					var y = plane.zoom( (ty * plane.tileSizeY) - plane.scrollY ) - 1;
					this.page._tool_preview.style.left = '' + x + 'px';
					this.page._tool_preview.style.top = '' + y + 'px';
				}
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
	
	mouse_up: function(e, pt, button) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				var plane = this.page._port.getPlane( layer.Name );
				var pt = plane.getMouseCoords();
				var tx = Math.floor( pt.x / plane.tileSizeX );
				var ty = Math.floor( pt.y / plane.tileSizeY );
				
				if (this.page.current_layer_id.match(/\-\w+$/)) {
					// pseudolayer
					var obj = plane.lookupTile( tx, ty, 'objectData' );
					if (obj) {
						if (typeof(obj) != 'object') obj = { type: obj };
						
						var tile_def = find_object( this.page._def.Tiles.Tile, { Name: obj.type } );
						if (tile_def.Properties && tile_def.Properties.Property) {
							var props = always_array( tile_def.Properties.Property );
							for (var idx = 0, len = props.length; idx < len; idx++) {
								var prop = props[idx];
								if (typeof(obj[ prop.Name ]) != 'undefined') prop.DefaultValue = obj[prop.Name];
							}
						}
						
						this.page.pal('tile_objs').select_tile_obj( obj.type );
						
						var new_tool = 'pencil';
						if (this.bar.prev_tool && (this.bar.prev_tool.name == 'paint')) new_tool = 'paint';
						this.bar.click( new_tool );
					}
				}
				else {
					// std layer
					var tile = plane.lookupTile( tx, ty );
					if (tile) {
						if (tile.match(/\boverlay\=([^\&]+)$/)) tile = RegExp.$1;
						this.page.pal('tileset').select_tile( tile );
						
						var new_tool = 'pencil';
						if (this.bar.prev_tool && (this.bar.prev_tool.name == 'paint')) new_tool = 'paint';
						this.bar.click( new_tool );
					}
				}
				break;
			
			case 'sprite':
				var plane = this.page._port.getPlane( layer.Name );
				var sprite = plane.lookupSpriteFromScreen( pt );
				if (sprite) {
					var obj = {};
					var _aether = sprite.getAetherObj();
					for (var key in _aether) {
						// only copy back aether keys (x, y, etc.)
						// sprite._aether[key] = sprite[key];
						obj[key] = sprite[key];
					} // foreach aether key
										
					var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: obj.type } );
					if (sprite_def.Properties && sprite_def.Properties.Property) {
						var props = always_array( sprite_def.Properties.Property );
						for (var idx = 0, len = props.length; idx < len; idx++) {
							var prop = props[idx];
							if (typeof(obj[ prop.Name ]) != 'undefined') prop.DefaultValue = obj[prop.Name];
						}
					}
					
					this.page.pal('sprites').select_sprite( obj.type );
					
					var new_tool = 'pencil';
					if (this.bar.prev_tool && (this.bar.prev_tool.name == 'paint')) new_tool = 'paint';
					this.bar.click( new_tool );
				}
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
	}
} );
