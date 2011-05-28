// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.PaintBucketTool', {
	name: 'paint',
	icon: 'paintcan.png',
	title: 'Flood Fill Tool (G)',
	hotkey: "G",
	
	activate: function() {
		var layer = this.page.current_layer;
		if (layer.Type == 'tile') this.page.set_cursor('url(images/cursors/paintbucket.cur) 13 14, pointer');
		else this.page.set_cursor('not-allowed');
	},
	
	mouse_down: function(e, pt, button) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				var plane = this.page._port.getPlane( layer.Name );
				var pt = plane.getMouseCoords();
				var tx = Math.floor( pt.x / plane.tileSizeX );
				var ty = Math.floor( pt.y / plane.tileSizeY );
				
				this.dataName = '';
				this.brush = '';
				this.int_brush = '';
				this.plane = plane;
				this.bounds = { left: tx, top: ty, right: tx + 1, bottom: ty + 1 };
				
				if (this.page.current_layer_id.match(/\-\w+$/)) {
					// pseudolayer
					this.dataName = 'objectData';
					var tile_name = this.page.pal('tile_objs').current_tile_obj;
					if (tile_name) {
						var obj = this.page.pal('inspector').get_props(true);
						if (obj) {
							obj.type = tile_name;
						}
						else obj = tile_name;
						this.brush = obj;
						
						var under_obj = plane.lookupTile( tx, ty, 'objectData' );
						if ((under_obj == this.brush) || (under_obj == tile_name) || (under_obj && (under_obj.type == tile_name))) this.brush = 0;
						
						this.int_brush = this.brush;
					}
					else return;
				}
				else {
					// std layer
					this.dataName = 'data';
					var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: layer.Tileset } );
					if (tileset && tileset.current_tile) {
						this.brush = tileset.current_tile;
						if (plane.lookupTile( tx, ty) == this.brush) this.brush = 0;
						
						// pre-convert to index (not filename)
						this.int_brush = plane.getTileIdx(this.brush);
					}
					else return;
				}
				
				// match against visible tiles, NEVER objects
				this.match_tile = plane.lookupTile( tx, ty) || 0;
				
				// max tx/ty
				this.max_tx = plane.getMaxTileX();
				this.max_ty = plane.getMaxTileY();
				
				// cache this for quick access
				this.data = plane[this.dataName];
				
				this.recurse_ebrake = 0;
				this.max_recurse = 1000;
				
				this.page.set_cursor('wait');
				
				this.undo_args = {
					type: 'FloodFill',
					title: 'Flood Fill',
					layer: layer,
					layer_id: this.page.current_layer_id,
					dataName: this.dataName
				};
								
				var self = this;
				setTimeout( function() {
					self.undo_args.before = deep_copy_object( self.data );
					if (self.dataName == 'data') self.undo_args.map_before = copy_object( plane.map );
					
					try {
						self.flood_fill( tx, ty );
					}
					catch (e) {
						Debug.trace("Caught exception: " + e);
						do_message('error', "The selected area is too large or complex to flood fill completely.");
					}
					
					self.undo_args.bounds = copy_object( self.bounds );
					self.undo_args.after = deep_copy_object( self.data );
					if (self.dataName == 'data') self.undo_args.map_after = copy_object( plane.map );
					
					self.page.undo_manager.add( self.undo_args );
					delete self.undo_args;
					
					plane.reset();
					plane.init();
					self.page._port.draw(true);
					self.page.set_cursor('url(images/cursors/paintbucket.cur) 13 14, pointer');
				}, 1 );
				break;
			
			case 'sprite':
				do_message('error', "The flood fill tool only works on tile layers.");
				break;
		} // switch layer.Type
	},
	
	key_down: function(e, code) {
		this.page.toolbar.find('pencil').key_down(e, code);
	},
	
	get_tile: function(tx, ty) {
		return this.plane.lookupTile(tx, ty) || 0; // visible tiles only, not objects
	},
	
	set_tile: function(tx, ty) {
		// set tile quickly without redraw
		if ((tx < 0) || (ty < 0)) return 0;

		if (!this.data[tx]) this.data[tx] = [];
		var col = this.data[tx];
		
		// Debug.trace("Brushing tile: " + tx + 'x' + ty);

		col[ty] = (typeof(this.int_brush) == 'object') ? copy_object(this.int_brush) : this.int_brush;
	},
	
	is_brush_tile: function(tx, ty) {
		// checks if tile matches brush
		// uses actual dataName, to prevent infinite recursion
		// when flood filling objects but using visible tiles for boundaries
		var thingy = this.plane.lookupTile(tx, ty, this.dataName) || 0;
		if (thingy == this.brush) return true;
		
		var brush_name = (typeof(this.brush) == 'object') ? this.brush.type : this.brush;
		var thingy_name = (typeof(thingy) == 'object') ? thingy.type : thingy;
		
		return (brush_name == thingy_name);
	},
	
	flood_fill: function(tx, ty) {
		// recursive flood fill algorithm
		// Debug.trace("Flood filling at: " + tx + 'x' + ty);
		
		this.recurse_ebrake++;
		if (this.recurse_ebrake > this.max_recurse) {
			throw "Recurse E-Brake";
		}
		
		// first, go left as far as we can
		while ((this.get_tile(tx, ty) == this.match_tile) && (tx >= 0)) {
			tx--; 
		}
		tx++;
		var left = tx;
		
		// next, fill our row with the new color
		while ((this.get_tile(tx, ty) == this.match_tile) && (tx < this.max_tx)) {
			if ((tx >= 0) && (tx < this.max_tx) && (ty >= 0) && (ty < this.max_ty)) {
				this.set_tile(tx, ty);
			}
			tx++;
		}
		var right = tx;
		
		if (left < this.bounds.left) this.bounds.left = left;
		if (right > this.bounds.right) this.bounds.right = right;
		if (ty < this.bounds.top) this.bounds.top = ty;
		if (ty + 1 > this.bounds.bottom) this.bounds.bottom = ty + 1;
		
		// finally, examine neighboring rows and recurse into
		if (this.dataName == 'objectData') {
			// extra work for objectData flood fill, as we have to check a different plane for bounds
			// but prevent infinite recursion on our own plane
			for (tx = left; tx < right; tx++) {
				if ( (ty > 0) && (this.get_tile(tx, ty - 1) == this.match_tile) && !this.is_brush_tile(tx, ty - 1) ) {
					// Debug.trace("Recursing upwards for " + Math.floor(ty - 1));
					this.flood_fill(tx, ty - 1);
				}
				if ( (ty < this.max_ty - 1) && (this.get_tile(tx, ty + 1) == this.match_tile) && !this.is_brush_tile(tx, ty + 1) ) {
					// Debug.trace("Recursing downwards for " + Math.floor(ty + 1));
					this.flood_fill(tx, ty + 1);
				}
			} // tx loop
		} // objectData
		else {
			for (tx = left; tx < right; tx++) {
				if ( (ty > 0) && (this.get_tile(tx, ty - 1) == this.match_tile) ) {
					// Debug.trace("Recursing upwards for " + Math.floor(ty - 1));
					this.flood_fill(tx, ty - 1);
				}
				if ( (ty < this.max_ty - 1) && (this.get_tile(tx, ty + 1) == this.match_tile) ) {
					// Debug.trace("Recursing downwards for " + Math.floor(ty + 1));
					this.flood_fill(tx, ty + 1);
				}
			} // tx loop
		} // visible tiles
	}
	
} );
