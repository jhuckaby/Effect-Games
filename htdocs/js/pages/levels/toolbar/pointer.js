// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Tool.subclass( 'LevelEditor.PointerTool', {
	name: 'pointer',
	icon: 'cursor.png',
	title: 'Select/Move Tool (V)',
	hotkey: "V",
	auto_layer: true,
	
	deactivate: function() {
		this.page.set_cursor();
		this.selection = null;
		this.page._tool_preview.style.display = 'none';
	},
	
	notify_layer_change: function() {
		this.selection = null;
		this.page._tool_preview.style.display = 'none';
	},
	
	mouse_down: function(e, pt, button) {
		var layers = this.auto_layer ? this.page.pal('layers').layers : [this.page.current_layer];
		
		for (var idx = 0, len = layers.length; idx < len; idx++) {
			var layer = layers[idx];
			
			switch (layer.Type) {
				case 'tile':
					var plane = this.page._port.getPlane( layer.Name );
					var pt2 = plane.getMouseCoords();
					var tx = Math.floor( pt2.x / plane.tileSizeX );
					var ty = Math.floor( pt2.y / plane.tileSizeY );
					var tile = plane.lookupTile( tx, ty, 'objectData' );
					if (tile && plane._show_data) {
						if (this.page.current_layer_id != layer.Name + '-obj')
							this.page.pal('layers').set_current_layer( layer.Name + '-obj' );
						
						this.selection_type = 'tile_obj';
						this.selection = tile;
						this.sel_tx = tx;
						this.sel_ty = ty;
					
						var x = plane.zoom( (tx * plane.tileSizeX) - plane.scrollX ) - 1;
						var y = plane.zoom( (ty * plane.tileSizeY) - plane.scrollY ) - 1;
						this.page._tool_preview.style.left = '' + x + 'px';
						this.page._tool_preview.style.top = '' + y + 'px';
					
						var zWidth = plane.tileSizeX * this.page._port.getZoomLevel();
						var zHeight = plane.tileSizeY * this.page._port.getZoomLevel();

						this.page._tool_preview.style.width = '' + zWidth + 'px';
						this.page._tool_preview.style.height = '' + zHeight + 'px';
						this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
						this.page._tool_preview.style.display = '';
						this.page._tool_preview.innerHTML = '';
						
						idx = len;
					} // tile under mouse
					else {
						this.selection = null;
						this.page._tool_preview.style.display = 'none';
					}
					break;
			
				case 'sprite':
					Debug.trace('pointer', "Looking up sprite under mouse for layer: " + layer.Name + ": " + serialize(pt));
					var plane = this.page._port.getPlane( layer.Name );
					var sprite = plane.lookupSpriteFromScreen( pt );
					if (sprite && plane.visible) {
						if (this.page.current_layer_id != layer.Name)
							this.page.pal('layers').set_current_layer( layer.Name );
						
						this.selection_type = 'sprite';
						this.selection = sprite;
						this.origin = pt;
						this.sprite_start_x = sprite.x;
						this.sprite_start_y = sprite.y;
						this.sprite_drag = false; // 10px threshold
					
						this.page._tool_preview.style.left = '' + Math.floor(sprite.zoom(sprite.x - plane.scrollX) - 1) + 'px';
						this.page._tool_preview.style.top = '' + Math.floor(sprite.zoom(sprite.y - plane.scrollY) - 1) + 'px';
						this.page._tool_preview.style.width = '' + Math.floor(sprite.zoom(sprite.width)) + 'px';
						this.page._tool_preview.style.height = '' + Math.floor(sprite.zoom(sprite.height)) + 'px';
						this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
						this.page._tool_preview.style.display = '';
						this.page._tool_preview.innerHTML = '';
						
						idx = len;
					}
					else {
						this.selection = null;
						this.page._tool_preview.style.display = 'none';
					}
				
					break;
			} // switch layer.Type
		
		} // foreach layer
		
		this.page.pal('inspector').setup();
	},
	
	mouse_move: function(e, pt) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				// no drag for tiles
				break;
			
			case 'sprite':
				if (this.page._game.mouseIsDown && this.selection) {
					// drag
					if (!this.sprite_drag && (Math.max(Math.abs(pt.x - this.origin.x), Math.abs(pt.y - this.origin.y)) >= 10)) {
						this.sprite_drag = true;
					}
					
					if (this.sprite_drag) {
						var plane = this.page._port.getPlane( layer.Name );
						var sprite = this.selection;
					
						var new_x = this.sprite_start_x + sprite.unzoom(pt.x - this.origin.x);
						var new_y = this.sprite_start_y + sprite.unzoom(pt.y - this.origin.y);
						var new_pt = this.page.snap_box_to_grid( new_x, new_y, sprite.width, sprite.height );
					
						this.move_sprite_to( new_pt.x, new_pt.y, false );
					
						this.page._tool_preview.innerHTML = '';
					}
				} // mouse is down and have selection
				break;
		} // switch layer.Type
	},
	
	mouse_up: function(e, pt, buttonNum) {
		if (this.selection && (this.selection_type == 'sprite')) {
			if (this.sprite_drag) {
				var sprite = this.selection;
				
				this.page.undo_manager.add({
					type: 'SpriteMove',
					title: 'Move Sprite',
					layer: this.page.current_layer,
					sprite_id: sprite.id,
					before: { x: this.sprite_start_x, y: this.sprite_start_y },
					after: { x: sprite.x, y: sprite.y }
				});
			}
			
			var html = '';
			// html += '<div style="float:right">' + icon('cancel.png', '', "parent.$P().toolbar.tool.delete_selection()") + '</div>';
			html += '<div class="sprite_delete_ctrl" onMouseOver="Effect.Game.setMouseActive(false);" onMouseOut="Effect.Game.setMouseActive(true);" onMouseDown="Effect.Game.setMouseActive(true);parent.$P().toolbar.tool.delete_selection();" title="Delete Sprite"></div>';
			html += '<div style="clear:both"></div>';
			this.page._tool_preview.innerHTML = html;
		}
	},
	
	move_sprite_to: function(x, y, commit) {
		// move sprite selection to new position
		var layer = this.page.current_layer;
		var plane = this.page._port.getPlane( layer.Name );
		var sprite = this.selection;
		
		var level_width = parseInt(this.page.level.Width, 10);
		var level_height = parseInt(this.page.level.Height, 10);
		
		// validate coords in level bounds
		if (x <= 0 - sprite.width) x = 1 - sprite.width;
		if (x >= level_width) x = level_width - 1;
		if (y <= 0 - sprite.height) y = 1 - sprite.height;
		if (y >= level_height) y = level_height - 1;
		
		if (commit) {
			// commit to undo history
			this.page.undo_manager.add({
				type: 'SpriteMove',
				title: 'Move Sprite',
				layer: layer,
				sprite_id: sprite.id,
				before: { x: sprite.x, y: sprite.y },
				after: { x: x, y: y }
			});
		}
		
		sprite.x = x;
		sprite.y = y;
		
		if ($('fe_emp_ins_spr_x')) {
			$('fe_emp_ins_spr_x').value = sprite.x;
			$('fe_emp_ins_spr_y').value = sprite.y;
		}
		
		sprite.style.left = '' + sprite.zoom( Math.floor(sprite.x) - sprite.plane.scrollX ) + 'px';
		sprite.style.top = '' + sprite.zoom( Math.floor(sprite.y) - sprite.plane.scrollY ) + 'px';
		
		this.page._tool_preview.style.left = '' + Math.floor(sprite.zoom(sprite.x - plane.scrollX) - 1) + 'px';
		this.page._tool_preview.style.top = '' + Math.floor(sprite.zoom(sprite.y - plane.scrollY) - 1) + 'px';
	},
	
	key_down: function(e, code) {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				// no drag for tiles, but delete sure
				if (this.selection) {
					if (code == DELETE_KEY) {
						var plane = this.page._port.getPlane( layer.Name );
						plane.setTile( this.sel_tx, this.sel_ty, 0, 'objectData');
						
						this.selection = null;
						this.page._tool_preview.style.display = 'none';
						this.page.pal('inspector').setup();
					}
				}
				break;
			
			case 'sprite':
				if (this.selection) {
					var port = this.page._port;
					var plane = this.page._port.getPlane( layer.Name );
					var sprite = this.selection;
					var delta = (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) ? 10 : 1;
					
					if (code == RIGHT_ARROW) this.move_sprite_to( sprite.x + delta, sprite.y, true );
					else if (code == LEFT_ARROW) this.move_sprite_to( sprite.x - delta, sprite.y, true );
					else if (code == UP_ARROW) this.move_sprite_to( sprite.x, sprite.y - delta, true );
					else if (code == DOWN_ARROW) this.move_sprite_to( sprite.x, sprite.y + delta, true );
					else if (code == DELETE_KEY) this.delete_selection();
					else if (code == TAB_KEY) {
						// find next sprite of same type
						// var sprites = sort_array( plane.findSprites({ type: sprite.type }, true), { sort_by: 'id', sort_dir: 1 } );
						var sprites = plane.findSprites({ type: sprite.type }, true).sort( function(a,b) {
							if (a.id.toString().match(/^E(\d+)$/) && b.id.toString().match(/^E(\d+)$/)) {
								var a_num = parseInt( a.id.toString().substring(1), 10 );
								var b_num = parseInt( b.id.toString().substring(1), 10 );
								return (b_num < a_num) ? 1 : -1;
							}
							else {
								return (b.id < a.id) ? 1 : -1;
							}
						} );
						var idx = find_object_idx( sprites, { id: sprite.id } );
						idx++; if (idx >= sprites.length) idx = 0;
						var new_sprite = sprites[idx];
						var old_sprite = sprite;
						
						if (new_sprite.id != sprite.id) {
							Debug.trace('pointer', "Scrolling to new sprite: " + dumper(new_sprite));
							
							// deselect current
							this.selection = null;
							this.page._tool_preview.style.display = 'none';
							
							// scroll to selection and allow aether to create
							var new_scroll_x = (new_sprite.x + (new_sprite.width / 2)) - (port.portWidth / 2);
							if (plane.scrollSpeed) new_scroll_x /= plane.scrollSpeed;
							else new_scroll_x = 0;
							
							var new_scroll_y = (new_sprite.y + (new_sprite.height / 2)) - (port.portHeight / 2);
							if (plane.scrollSpeed) new_scroll_y /= plane.scrollSpeed;
							else new_scroll_y = 0;
							
							this.page.set_scroll(
								Math.floor( new_scroll_x ),
								Math.floor( new_scroll_y )
							);
							
							// select new sprite
							sprite = plane.getSprite( new_sprite.id );
							if (sprite) {
								this.selection_type = 'sprite';
								this.selection = sprite;
								this.origin = null;
								this.sprite_start_x = sprite.x;
								this.sprite_start_y = sprite.y;
								this.sprite_drag = false; // 10px threshold

								this.page._tool_preview.style.left = '' + Math.floor(sprite.zoom(sprite.x - plane.scrollX) - 1) + 'px';
								this.page._tool_preview.style.top = '' + Math.floor(sprite.zoom(sprite.y - plane.scrollY) - 1) + 'px';
								this.page._tool_preview.style.width = '' + Math.floor(sprite.zoom(sprite.width)) + 'px';
								this.page._tool_preview.style.height = '' + Math.floor(sprite.zoom(sprite.height)) + 'px';
								this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
								this.page._tool_preview.style.display = '';
								this.page._tool_preview.innerHTML = '';
								
								// show little "X" button
								this.mouse_up();
								
								this.page.pal('inspector').setup();
							}
							else Debug.trace('pointer', "ALERT: Could not find sprite: " + new_sprite.id);
						} // found new sprite
					} // tab select next of type
				}
				break;
		} // switch layer.Type
		
		if (!this.selection) {
			if (code == RIGHT_ARROW) this.page.onNudgeScroll( 1, 0 );
			else if (code == LEFT_ARROW) this.page.onNudgeScroll( -1, 0 );
			else if (code == DOWN_ARROW) this.page.onNudgeScroll( 0, 1 );
			else if (code == UP_ARROW) this.page.onNudgeScroll( 0, -1 );
		}
	},
	
	delete_selection: function() {
		if (this.selection && (this.selection_type == 'sprite')) {
			var sprite = this.selection;
			sprite.destroy();
			
			var _aether = sprite.getAetherObj();
			
			for (var key in _aether) {
				// only copy back aether keys (x, y, etc.)
				_aether[key] = sprite[key];
			} // foreach aether key
			
			this.page.undo_manager.add({
				type: 'SpriteDelete',
				title: 'Delete Sprite',
				layer: this.page.current_layer,
				layer_id: this.page.current_layer_id,
				sprite: copy_object(_aether)
			});
			
			this.page._port.draw(true);
			this.selection = null;
			this.page._tool_preview.style.display = 'none';
			this.page.pal('inspector').setup();
		}
	},
	
	draw: function() {
		// called when main iframe is redrawn
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				if (this.selection) {
					var plane = this.page._port.getPlane( layer.Name );
					var tile = this.selection;
					var x = plane.zoom( (this.sel_tx * plane.tileSizeX) - plane.scrollX ) - 1;
					var y = plane.zoom( (this.sel_ty * plane.tileSizeY) - plane.scrollY ) - 1;
					this.page._tool_preview.style.left = '' + x + 'px';
					this.page._tool_preview.style.top = '' + y + 'px';
				}
				break;
			
			case 'sprite':
				if (this.selection) {
					// keep updated with sprite
					var plane = this.page._port.getPlane( layer.Name );
					var sprite = this.selection;
					
					if (sprite.destroyed) {
						// sprie left screen and went to aether
						// we must lose our selection
						this.selection = null;
						this.page._tool_preview.style.display = 'none';
						this.page.pal('inspector').setup();
					}
					else {
						this.page._tool_preview.style.left = '' + Math.floor(sprite.zoom(sprite.x - plane.scrollX) - 1) + 'px';
						this.page._tool_preview.style.top = '' + Math.floor(sprite.zoom(sprite.y - plane.scrollY) - 1) + 'px';
					}
				} // mouse is down and have selection
				break;
		} // switch layer.Type
	},
	
	show_tool_preview: function() {
		var layer = this.page.current_layer;
		
		switch (layer.Type) {
			case 'tile':
				
				break;
			
			case 'sprite':
				if (!this.selection) {
					this.page._tool_preview.style.left = '-16px';
					this.page._tool_preview.style.top = '-16px';
					this.page._tool_preview.style.width = '1px';
					this.page._tool_preview.style.height = '1px';
					this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
					this.page._tool_preview.innerHTML = '';
					this.page._tool_preview.style.display = '';
				}
				break;
		} // switch this.current_layer.Type
	},
	
	hide_tool_preview: function() {
		
	}
} );
