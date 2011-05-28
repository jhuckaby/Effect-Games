// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// undo.js
// Undo system for level editor
////

Class.create( 'LevelEditor.UndoManager', {
	
	history: null,
	pos: -1,
	max_states: 100,
	
	__construct: function(page) {
		this.page = page;
		this.history = [];
		this.pos = -1;
	},
	
	add: function(args) {
		// add history state
		args.scrollx = this.page.scrollx;
		args.scrolly = this.page.scrolly;
		
		this.pos++;
		this.history[this.pos] = args;
		this.history.length = this.pos + 1;
		this.update_links();
		
		if (this.history.length > this.max_states) this.history.shift();
		
		this.page.dirty = true;
		
		var handler = new LevelEditor.UndoHandler[ args.type ]( this.page );
		handler.update_nav( args );
	},
	
	reset: function() {
		// remove all history states
		this.history = [];
		this.pos = -1;
		this.update_links();
		
		this.page.dirty = true;
	},
	
	undo: function() {
		// revert to previous state
		if (this.pos > -1) {
			var args = this.history[this.pos];
			this.pos--;
			
			if (this.page.toolbar.tool.name == 'pointer') {
				this.page.toolbar.tool.deactivate(); // deselect
				this.page.pal('inspector').setup();
			}
			
			this.page.set_scroll( args.scrollx, args.scrolly );
			
			var handler = new LevelEditor.UndoHandler[ args.type ]( this.page );
			handler.undo( args );
			handler.update_nav( args );
			
			this.update_links();
		}
	},
	
	redo: function() {
		// move forward in time
		if (this.pos < this.history.length - 1) {
			this.pos++;
			var args = this.history[this.pos];
			
			if (this.page.toolbar.tool.name == 'pointer') {
				this.page.toolbar.tool.deactivate(); // deselect
				this.page.pal('inspector').setup();
			}
			
			this.page.set_scroll( args.scrollx, args.scrolly );
			
			var handler = new LevelEditor.UndoHandler[ args.type ]( this.page );
			handler.redo( args );
			handler.update_nav( args );
			
			this.update_links();
		}
	},
	
	update_links: function() {
		if (this.pos > -1) {
			$('a_em_header_undo').removeClass('disabled');
			$('a_em_header_undo').setAttribute('title', 'Undo "'+this.history[this.pos].title+'"');
		}
		else {
			$('a_em_header_undo').addClass('disabled');
			$('a_em_header_undo').setAttribute('title', '');
		}
		
		if (this.pos < this.history.length - 1) {
			$('a_em_header_redo').removeClass('disabled');
			$('a_em_header_redo').setAttribute('title', 'Redo "'+this.history[this.pos+1].title+'"');
		}
		else {
			$('a_em_header_redo').addClass('disabled');
			$('a_em_header_redo').setAttribute('title', '');
		}
	}
	
} );

Class.create( 'LevelEditor.UndoHandlerBase', {

	__construct: function(page) {
		this.page = page;
	},
	
	undo: function(args) {},
	redo: function(args) {},
	get_bounds: function(args) { return false; },
	
	get_sprite_padding: function(layer) {
		// okay, we need to add padding to the right/bottom to account for 2 pixels in the final shrunken image
		// one pixel because of how imagemagick draws a stroke rect, and one for the sprite "shadow"
		// this isn't the easiest thing to calculate.
				
		var true_layer_width = parseInt(this.page.game.PortWidth, 10) + 
			Math.floor( (parseInt(this.page.level.Width, 10) - parseInt(this.page.game.PortWidth, 10)) * parseInt(layer.ScrollRatio, 10) );
		
		var true_layer_height = parseInt(this.page.game.PortHeight, 10) + 
			Math.floor( (parseInt(this.page.level.Height, 10) - parseInt(this.page.game.PortHeight, 10)) * parseInt(layer.ScrollRatio, 10) );
		
		var padding_right = Math.floor(2 * (true_layer_width / this.page.pal('navigator').size.width));
		var padding_bottom = Math.floor(2 * (true_layer_height / this.page.pal('navigator').size.height));
		
		Debug.trace('undo', "Sprite padding on right/bottom: " + padding_right + 'x' + padding_bottom);
		
		return { right: padding_right, bottom: padding_bottom };
	},
	
	update_nav: function(args) {
		// mark nav palette as dirty
		var bounds = this.get_bounds( args );
		if (bounds) {
			this.page.pal('navigator').mark( args.layer.Name, bounds.left, bounds.top, bounds.right, bounds.bottom );
		}
	}

} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.FloodFill', {
	
	undo: function(args) {
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		
		plane.reset();
		plane.setData( args.before, args.dataName );
		if (args.dataName == 'data') plane.setMap( args.map_before );
		plane.init();
		this.page._port.draw(true);
	},
	
	redo: function(args) {
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		
		plane.reset();
		plane.setData( args.after, args.dataName );
		if (args.dataName == 'data') plane.setMap( args.map_after );
		plane.init();
		this.page._port.draw(true);
	},
	
	get_bounds: function(args) {
		return args.bounds;
		// var layer = args.layer;
		// var plane = this.page._port.getPlane( layer.Name );
		
		// return { left:0, top:0, right:plane.getMaxTileX(), bottom:plane.getMaxTileY() };
	}
	
} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.SpriteMove', {
	
	undo: function(args) {
		// move sprite back to orig location
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = plane.lookupSprite( args.sprite_id );
		sprite.x = args.before.x;
		sprite.y = args.before.y;
		sprite.draw();
	},
	
	redo: function(args) {
		// move sprite to new location
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = plane.lookupSprite( args.sprite_id );
		sprite.x = args.after.x;
		sprite.y = args.after.y;
		sprite.draw();
	},
	
	get_bounds: function(args) {
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = plane.lookupSprite( args.sprite_id );
		var padding = this.get_sprite_padding(layer);
		
		var bounds = {
			left: Math.min(args.before.x, args.after.x),
			top: Math.min(args.before.y, args.after.y),
			right: Math.max(args.before.x, args.after.x) + sprite.width + padding.right,
			bottom: Math.max(args.before.y, args.after.y) + sprite.height + padding.bottom
		};
		
		return bounds;
	}
	
} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.SpriteDelete', {
	
	undo: function(args) {
		// recreate sprite that was deleted
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		plane.addToAether( args.sprite );
		this.page._port.draw(true);
	},
	
	redo: function(args) {
		// destroy sprite, replaying the delete
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = plane.lookupSprite( args.sprite.id );
		if (sprite) {
			sprite.destroy();
			this.page._port.draw(true);
		}
	},
	
	get_bounds: function(args) {
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var padding = this.get_sprite_padding(layer);
		
		return {
			left: args.sprite.x,
			top: args.sprite.y,
			right: args.sprite.x + args.sprite.width + padding.right,
			bottom: args.sprite.y + args.sprite.height + padding.bottom
		};
	}
	
} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.SpriteAdd', {
	
	undo: function(args) {
		// destroy sprite that was added
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = plane.lookupSprite( args.sprite.id );
		if (sprite) {
			sprite.destroy();
			this.page._port.draw(true);
		}
	},
	
	redo: function(args) {
		// recreate sprite
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		plane.addToAether( args.sprite );
		this.page._port.draw(true);
	},
	
	get_bounds: function(args) {
		var layer = args.layer;
		var plane = this.page._port.getPlane( layer.Name );
		var padding = this.get_sprite_padding(layer);
		
		return {
			left: args.sprite.x,
			top: args.sprite.y,
			right: args.sprite.x + args.sprite.width + padding.right,
			bottom: args.sprite.y + args.sprite.height + padding.bottom
		};
	}
	
} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.PropertyEdit', {
	
	undo: function(args) {
		switch (args.obj_type) {
			case 'tile_obj':
				var layer = args.layer;
				var layer_id = args.layer_id;
				var plane = this.page._port.getPlane( layer.Name );
				var target = plane.lookupTile( args.tx, args.ty, 'objectData' );
				if (target && isa_hash(target)) {
					// for (var key in args.after) delete target[key];
					for (var key in args.before) target[key] = args.before[key];
				}
				break;
			
			case 'sprite':
				var layer = args.layer;
				var layer_id = args.layer_id;
				var plane = this.page._port.getPlane( layer.Name );
				var sprite = plane.lookupSprite( args.after.id );
				if (sprite) {
					for (var key in args.before) {
						if (key != 'id') sprite[key] = args.before[key];
					}
					sprite.setZIndex( args.before.zIndex );
					
					if (args.before.id != args.after.id) {
						sprite.destroy();
						this.page._port.draw(true);

						sprite.id = args.before.id;
						delete sprite.destroyed;
						plane.attach( sprite );
						this.page._port.draw(true);
					}
					else sprite.draw();
				}
				break;
		} // switch obj_type
	},
	
	redo: function(args) {
		switch (args.obj_type) {
			case 'tile_obj':
				var layer = args.layer;
				var layer_id = args.layer_id;
				var plane = this.page._port.getPlane( layer.Name );
				var target = plane.lookupTile( args.tx, args.ty, 'objectData' );
				if (isa_hash(target)) {
					// for (var key in args.before) delete target[key];
					for (var key in args.after) target[key] = args.after[key];
				}
				break;
			
			case 'sprite':
				var layer = args.layer;
				var layer_id = args.layer_id;
				var plane = this.page._port.getPlane( layer.Name );
				var sprite = plane.lookupSprite( args.before.id );
				if (sprite) {
					for (var key in args.after) {
						if (key != 'id') sprite[key] = args.after[key];
					}
					sprite.setZIndex( args.after.zIndex );
					
					if (args.before.id != args.after.id) {
						sprite.destroy();
						this.page._port.draw(true);

						sprite.id = args.after.id;
						delete sprite.destroyed;
						plane.attach( sprite );
						this.page._port.draw(true);
					}
					else sprite.draw();
				}
				break;
		} // switch obj_type
	}
	
} );

LevelEditor.UndoHandlerBase.extend( 'LevelEditor.UndoHandler.TileDrawAction', {
	
	undo: function(args) {
		var layer = args.layer;
		var layer_id = args.layer_id;
		var plane = this.page._port.getPlane( layer.Name );
		
		if (layer_id.match(/\-\w+$/)) {
			// pseudolayer
			for (var key in args.before) {
				if (key.match(/^(\d+)x(\d+)$/)) {
					var tx = RegExp.$1, ty = RegExp.$2;
					plane.setTile( tx, ty, args.before[key], 'objectData' );
				}
			} // foreach tile
		}
		else {
			// std layer
			for (var key in args.before) {
				if (key.match(/^(\d+)x(\d+)$/)) {
					var tx = RegExp.$1, ty = RegExp.$2;
					plane.setTile( tx, ty, args.before[key] );
				}
			} // foreach tile
		}
	},
	
	redo: function(args) {
		var layer = args.layer;
		var layer_id = args.layer_id;
		var plane = this.page._port.getPlane( layer.Name );
		
		if (layer_id.match(/\-\w+$/)) {
			// pseudolayer
			for (var key in args.after) {
				if (key.match(/^(\d+)x(\d+)$/)) {
					var tx = RegExp.$1, ty = RegExp.$2;
					plane.setTile( tx, ty, args.after[key], 'objectData' );
				}
			} // foreach tile
		}
		else {
			// std layer
			for (var key in args.after) {
				if (key.match(/^(\d+)x(\d+)$/)) {
					var tx = RegExp.$1, ty = RegExp.$2;
					plane.setTile( tx, ty, args.after[key] );
				}
			} // foreach tile
		}
	},
	
	get_bounds: function(args) {
		var bounds = { left:-1, top:-1, right:-1, bottom:-1 };
		
		for (var key in args.after) {
			if (key.match(/^(\d+)x(\d+)$/)) {
				var tx = parseInt(RegExp.$1, 10), ty = parseInt(RegExp.$2, 10);
				if ((bounds.left == -1) || (tx < bounds.left)) bounds.left = tx;
				if ((bounds.top == -1) || (ty < bounds.top)) bounds.top = ty;
				if ((bounds.right == -1) || (tx > bounds.right)) bounds.right = tx;
				if ((bounds.bottom == -1) || (ty > bounds.bottom)) bounds.bottom = ty;
			}
		}
		
		bounds.right++;
		bounds.bottom++;
		
		return bounds;
	}
	
} );
