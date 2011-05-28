// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.InspectorPalette', {
	name: 'inspector',
	icon: 'information.png',
	title: 'Inspector',
	
	setup: function() {
		this.props = null;
		session.fitf = 0;
		var html = '';
		
		if (this.page.toolbar.tool && (this.page.toolbar.tool.name == 'pointer')) {
			// show information about current selection, if any
			var tool = this.page.toolbar.tool;
			if (tool.selection) {
				switch (tool.selection_type) {
					
					case 'tile_obj':
						var tile = tool.selection;
						
						var simple_string = false;
						if (typeof(tile) == 'string') {
							tile = { type: tile };
							simple_string = true;
						}
						
						var tile_def = find_object( this.page._def.Tiles.Tile, { Name: tile.type } );
						var tile_name_fit = ww_fit_string(tile.type, 120, session.em_width, 1);
						
						html += '<div style="padding:5px;">';
						
						html += '<table>';
						html += '<tr><td align="right" class="fe_label">Type:</td><td>' + tile_name_fit + '</td></tr>';
						html += '<tr><td align="right" class="fe_label">Position:</td><td>' + tool.sel_tx + 'x' + tool.sel_ty + '</td></tr>';
						html += '</table>';
						
						if (tile_def.Properties && tile_def.Properties.Property) {
							// if tile lives in array as simple string but [now] has properties
							// we must convert it so properties apply correctly, and undo system works
							// note: cannot undo it *back* to a simple string, and that's fine.
							if (simple_string) {
								var plane = this.page._port.getPlane( this.page.current_layer.Name );
								plane.setTile( tool.sel_tx, tool.sel_ty, tile, 'objectData' );
								tile = tool.selection = plane.lookupTile( tool.sel_tx, tool.sel_ty, 'objectData' );
								simple_string = false;
							}
							
							html += spacer(1,10) + '<br/>';
							html += '<div class="level_palette_subheader">'+tile_name_fit+' Properties:</div>';
							html += this.render_props( tile_def.Properties.Property, tile, true );
							
							this.undo_args = {
								type: 'PropertyEdit',
								title: 'Change Tile Properties',
								obj_type: 'tile_obj',
								layer: this.page.current_layer,
								layer_id: this.page.current_layer_id,
								tx: tool.sel_tx,
								ty: tool.sel_ty
							};
						}
						html += '</div>';
						break;
					
					case 'sprite':
						var sprite = this.sprite = tool.selection;
						var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: sprite.type } );
						var sprite_name_fit = ww_fit_string(sprite.type, 120, session.em_width, 1);
						
						this.undo_args = {
							type: 'PropertyEdit',
							title: 'Change Sprite Properties',
							obj_type: 'sprite',
							layer: this.page.current_layer,
							layer_id: this.page.current_layer_id,
							sprite_id: sprite.id
						};
						
						html += '<div style="padding:5px;">';
						html += '<table>';
						html += '<tr><td align="right" class="fe_label">Type:</td><td>'+sprite_name_fit+'</td></tr>';
						html += '<tr><td align="right" class="fe_label">ID:</td><td><input type="text" id="fe_emp_ins_spr_id" size="8" class="fe_smaller" value="'+escape_text_field_value(sprite.id)+'" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().pal(\'inspector\').update_sprite_info()"/></td></tr>';
						html += '<tr><td align="right" class="fe_label">Position:</td><td><input type="text" id="fe_emp_ins_spr_x" size="4" class="fe_smaller" value="'+escape_text_field_value(sprite.x)+'" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().pal(\'inspector\').update_sprite_info()"/>x<input type="text" id="fe_emp_ins_spr_y" size="4" class="fe_smaller" value="'+escape_text_field_value(sprite.y)+'" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().pal(\'inspector\').update_sprite_info()"/></td></tr>';
						html += '<tr><td align="right" class="fe_label">Z-Index:</td><td><input type="text" id="fe_emp_ins_spr_z" size="3" class="fe_smaller" value="'+escape_text_field_value(sprite.zIndex)+'" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().pal(\'inspector\').update_sprite_info()"/></td></tr>';
						html += '</table>';
						html += spacer(1,10) + '<br/>';
						
						if (sprite_def.Properties && sprite_def.Properties.Property) {
							html += '<div class="level_palette_subheader">'+sprite_name_fit+' Properties:</div>';
							html += this.render_props( sprite_def.Properties.Property, sprite, true );
						}
						html += '</div>';
						break;
						
				} // switch tool.selection_type
			} // tool has selection
			else {
				html = '<div class="levedit_palette_message">(No object selected)</div>';
			}
		} // pointer tool
		
		else if (this.page.toolbar.tool && (this.page.toolbar.tool.name == 'pencil') && 
			this.page.current_layer && (this.page.current_layer.Type == 'tile') && 
			!this.page.current_layer_id.match(/\-\w+$/)) {
			// pencil tool on non-obj tile plane
			var layer = this.page.current_layer;
			var tool = this.page.toolbar.tool;
			
			if (!tool.draw_mode) {
				tool.draw_mode = this.page.editor_prefs.pencil_draw_mode || 'replace';
			}
			
			html += '<div style="padding:5px;">';
			html += '<div class="level_palette_subheader">Tile Draw Mode:</div>';
			html += '<div style="margin-top:3px;"><input type="radio" name="pencil_draw_mode" id="fe_le_pencil_mode_replace" value="replace" ' + ((tool.draw_mode == 'replace') ? 'checked="checked"' : '') + ' onClick="$P().toolbar.tool.set_draw_mode(\'replace\')"/><label for="fe_le_pencil_mode_replace">Replace</label></div>';
			html += '<div><input type="radio" name="pencil_draw_mode" id="fe_le_pencil_mode_add" value="add" ' + ((tool.draw_mode == 'add') ? 'checked="checked"' : '') + ' onClick="$P().toolbar.tool.set_draw_mode(\'add\')"/><label for="fe_le_pencil_mode_add">Overlay</label></div>';
			html += '</div>';
		} // pencil tool
		
		else if (this.page.toolbar.tool && (this.page.toolbar.tool.name == 'eraser') && 
			this.page.current_layer && (this.page.current_layer.Type == 'tile') && 
			!this.page.current_layer_id.match(/\-\w+$/)) {
			// eraser tool on non-obj tile plane
			var layer = this.page.current_layer;
			var tool = this.page.toolbar.tool;
			
			if (!tool.draw_mode) {
				tool.draw_mode = this.page.editor_prefs.eraser_draw_mode || 'all';
			}
			
			html += '<div style="padding:5px;">';
			html += '<div class="level_palette_subheader">Tile Erase Mode:</div>';
			html += '<div style="margin-top:3px;"><input type="radio" name="eraser_draw_mode" id="fe_le_eraser_mode_all" value="all" ' + ((tool.draw_mode == 'all') ? 'checked="checked"' : '') + ' onClick="$P().toolbar.tool.set_erase_mode(\'all\')"/><label for="fe_le_eraser_mode_all">All Tiles</label></div>';
			html += '<div><input type="radio" name="eraser_draw_mode" id="fe_le_eraser_mode_top" value="top" ' + ((tool.draw_mode == 'top') ? 'checked="checked"' : '') + ' onClick="$P().toolbar.tool.set_erase_mode(\'top\')"/><label for="fe_le_eraser_mode_top">Top Tile</label></div>';
			html += '</div>';
		} // eraser tool
		
		else if (this.page.current_layer) {
			var layer = this.page.current_layer;
			switch (layer.Type) {
				case 'tile':
					if (this.page.current_layer_id.match(/\-\w+$/)) {
						var tile_name = this.page.pal('tile_objs').current_tile_obj;
						if (tile_name) {
							var tile_name_fit = ww_fit_string(tile_name, 120, session.em_width, 1);
							var tile_def = find_object( this.page._def.Tiles.Tile, { Name: tile_name } );
							if (tile_def.Properties && tile_def.Properties.Property) {
								html += '<div style="padding:5px;">';
								html += '<div class="level_palette_subheader">New '+tile_name_fit+' Properties:</div>';
								html += this.render_props( tile_def.Properties.Property );
								html += '</div>';
							}
							else {
								html = '<div class="levedit_palette_message">(No options for '+tile_name_fit+')</div>';
							}
						} // tile object is selected
					} // psuedolayer
					break;
				
				case 'sprite':
					var sprite_name = this.page.pal('sprites').current_sprite;
					if (sprite_name) {
						var sprite_name_fit = ww_fit_string(sprite_name, 120, session.em_width, 1);
						var sprite_def = find_object( this.page._def.Sprites.Sprite, { Name: sprite_name } );
						if (sprite_def.Properties && sprite_def.Properties.Property) {
							html += '<div style="padding:5px;">';
							html += '<div class="level_palette_subheader">New '+sprite_name_fit+' Properties:</div>';
							html += this.render_props( sprite_def.Properties.Property );
							html += '</div>';
						}
						else {
							html = '<div class="levedit_palette_message">(No options for '+sprite_name_fit+')</div>';
						}
					} // sprite object is selected
					break;
			} // switch layer.Type
		}
		
		if (!html) html = '<div class="levedit_palette_message">(No options available)</div>';
		this.set_content( html );
		this.show();
	},
	
	update_sprite_info: function() {
		// update current sprite selection info
		clear_field_error();
		
		this.undo_args.before = {
			id: this.sprite.id,
			x: this.sprite.x,
			y: this.sprite.y,
			zIndex: this.sprite.zIndex
		};
		
		var new_id = trim($('fe_emp_ins_spr_id').value);
		if (!new_id.match(/^\w+$/)) return bad_field('fe_emp_ins_spr_id', "The Sprite ID must be alphanumeric.");
		
		if (new_id != this.sprite.id) {
			// check for ID collisions
			if (this.sprite.plane.lookupSprite(new_id, true)) 
				return bad_field('fe_emp_ins_spr_id', "The Sprite ID \""+new_id+"\" is already in use.  Please enter a unique value.");
			
			var sprite = this.sprite;
			var plane = sprite.plane;
			
			sprite.destroy();
			this.page._port.draw(true);
			
			sprite.id = new_id;
			delete sprite.destroyed;
			plane.attach( sprite );
			this.page._port.draw(true);
		}
		
		var new_x = trim($('fe_emp_ins_spr_x').value);
		if (!new_x.match(/^\-?\d+$/)) return bad_field('fe_emp_ins_spr_x', "The Sprite coordinates must be integers.");
		new_x = parseInt(new_x, 10);
		if (new_x <= 0 - this.sprite.width) return bad_field('fe_emp_ins_spr_x', "That coordinate is out of the level bounds.");
		if (new_x >= parseInt(this.page.level.Width, 10)) return bad_field('fe_emp_ins_spr_x', "That coordinate is out of the level bounds.");
		this.sprite.x = new_x;
		
		var new_y = trim($('fe_emp_ins_spr_y').value);
		if (!new_y.match(/^\-?\d+$/)) return bad_field('fe_emp_ins_spr_y', "The Sprite coordinates must be integers.");
		new_y = parseInt(new_y, 10);
		if (new_y <= 0 - this.sprite.height) return bad_field('fe_emp_ins_spr_y', "That coordinate is out of the level bounds.");
		if (new_y >= parseInt(this.page.level.Height, 10)) return bad_field('fe_emp_ins_spr_y', "That coordinate is out of the level bounds.");
		this.sprite.y = new_y;
		
		var new_z = trim($('fe_emp_ins_spr_z').value);
		if (!new_z.match(/^\d+$/)) return bad_field('fe_emp_ins_spr_z', "The Sprite Z-Index must be an integer between 1 and 999.");
		if ((new_z == 0) || (parseInt(new_z, 10) > 999)) return bad_field('fe_emp_ins_spr_z', "The Sprite Z-Index must be an integer between 1 and 999.");
		this.sprite.setZIndex( new_z );
		
		this.sprite.draw();
		
		this.page._tool_preview.style.left = '' + Math.floor(this.sprite.zoom(this.sprite.x - this.sprite.plane.scrollX) - 1) + 'px';
		this.page._tool_preview.style.top = '' + Math.floor(this.sprite.zoom(this.sprite.y - this.sprite.plane.scrollY) - 1) + 'px';
		
		this.page.undo_manager.add( merge_objects(this.undo_args, {
			after: {
				id: this.sprite.id,
				x: this.sprite.x,
				y: this.sprite.y,
				zIndex: this.sprite.zIndex
			}
		}));
	},
	
	get_props: function(update_defaults) {
		// return object containing current props
		if (!this.props) return null;
		var obj = {};
		
		for (var idx = 0, len = this.props.length; idx < len; idx++) {
			var prop = this.props[idx];
			switch (prop.Type) {
				case 'menu':
					obj[prop.Name] = get_menu_value('fe_em_prop_'+prop.Name);
					break;
			
				case 'text':
					obj[prop.Name] = $('fe_em_prop_'+prop.Name).value;
					break;
			
				case 'checkbox':
					obj[prop.Name] = $('fe_em_prop_'+prop.Name).checked ? 1 : 0;
					break;
			} // switch prop.Type
			if (update_defaults) prop.DefaultValue = obj[prop.Name];
		} // foreach prop
		
		return obj;
	},
	
	update_props: function() {
		// update props from live edit
		if (this.obj) {
			var temp = this.get_props(false);
			
			this.page.undo_manager.add( merge_objects(this.undo_args, {
				before: copy_object(this.obj),
				after: merge_objects(this.obj, temp)
			}));
			
			for (var key in temp) {
				this.obj[key] = temp[key];
				if (this.obj.addAetherProp) this.obj.addAetherProp( key );
			}
		}
	},
	
	render_props: function(props, obj, live_edit) {
		// render prop list
		props = this.props = always_array( props );
		if (!obj) obj = {};
		
		if (live_edit) this.obj = obj;
		else this.obj = null;
		
		var html = '';
		
		for (var idx = 0, len = props.length; idx < len; idx++) {
			var prop = props[idx];
			var value = (typeof(obj[prop.Name]) != 'undefined') ? obj[prop.Name] : prop.DefaultValue;
			
			switch (prop.Type) {
				case 'menu':
					html += '<div class="fe_emp_label">' + ww_fit_string(prop.Name, 120, session.em_width, 1) + '</div>';
					html += '<div>' + menu('fe_em_prop_'+prop.Name, ww_fit_array(prop.Items.split(/\,\s*/), 120, session.em_width, 1), value, {
						'class' : 'fe_smaller_menu',
						'onChange': live_edit ? '$P().pal(\'inspector\').update_props()' : 'return true;'
					}) + '</div>';
					break;
				
				case 'text':
					html += '<div class="fe_emp_label">' + ww_fit_string(prop.Name, 120, session.em_width, 1) + '</div>';
					html += '<div><input type="text" class="fe_smaller" id="fe_em_prop_'+prop.Name+'" size="12" onFocus="session.fitf=1;" onBlur="session.fitf=0;" value="'+escape_text_field_value(value)+'" '+(live_edit ? ' onChange="$P().pal(\'inspector\').update_props()"' : '')+'/></div>';
					break;
				
				case 'checkbox':
					html += '<div class="fe_emp_label">';
					html += '<input type="checkbox" id="fe_em_prop_'+prop.Name+'" value="1" ' + 
						((value == 1) ? 'checked="checked"' : '') + 
						(live_edit ? ' onChange="$P().pal(\'inspector\').update_props()"' : '') + '/>';
					html += '<label for="fe_em_prop_'+prop.Name+'">'+ww_fit_string(prop.Name, 120, session.em_width, 1)+'</label>';
					html += '</div>';
					break;
			} // switch prop.Type
		} // foreach prop
		
		return html;
	}
} );
