// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.LayersPalette', {
	name: 'layers',
	icon: 'layers.png',
	title: 'Layers',
	
	setup: function() {
		this.bkgnd_visible = true;
		
		var layers = this.layers = always_array( this.page.level.Layers.Layer ).sort( function(a, b) {
			return parseInt(b.ZIndex, 10) - parseInt(a.ZIndex, 10);
		} );
		
		if (!this.page.level_prefs.last_layer || !find_object(layers, { Name: this.page.level_prefs.last_layer.replace(/\-\w+$/, '') })) {
			this.page.level_prefs.last_layer = layers[ layers.length - 1 ].Name;
		}
		
		this.page.current_layer = find_object(layers, { Name: this.page.level_prefs.last_layer.replace(/\-\w+$/, '') });
		this.page.current_layer_id = this.page.level_prefs.last_layer;
		
		this.draw();
		this.show();
		
		var self = this;
		setTimeout( function() { self.set_current_layer(self.page.current_layer_id); }, 1 );
	},
	
	draw: function() {
		// draw contents of palette
		var html = '';
		
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
			html += '<td width="2">' + spacer(3,1) + '</td>';
			html += '<td width="16">' + icon('eye_open', '', "$P().pal('layers').toggle_layer_visibility('"+layer.Name+"')", '', 'ic_em_layervis_'+layer.Name) + '</td>';
			html += '<td width="3">' + spacer(3,1) + '</td>';
			
			html += '<td width="*">';
			html += '<div id="d_emp_layer_'+layer.Name+'" class="'+((this.page.current_layer_id == layer.Name) ? 'file_object_selected' : 'file_object')+'" style="line-height:18px; margin:1px 0px;">';
			html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
			html += '<td width="16">' + icon((layer.Type == 'tile') ? 'color_swatch.png' : 'cogs.png', '', "$P().pal('layers').set_current_layer('"+layer.Name+"')") + '</td>';
			html += '<td width="3">' + spacer(3,1) + '</td>';
			html += '<td width="*" onClick="$P().pal(\'layers\').set_current_layer(\''+layer.Name+'\')" style="cursor:pointer;"><b>' + ww_fit_string(layer.Name, 120, session.em_width, 1) + '</b></td>';
			html += '<td width="16" align="center" class="caption">' + layer.ZIndex + '</td>';
			html += '</tr></table>';
			html += '</div>';
			html += '</td></tr></table>';
			
			if (layer.Type == 'tile') {
				var plane = this.page._port.getPlane( layer.Name );
				
				if (plane.objectData) {
					html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="16">' + icon('eye_open', '', "$P().pal('layers').toggle_layer_visibility('"+layer.Name+"-obj')", '', 'ic_em_layervis_'+layer.Name+'-obj') + '</td>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="16">' + icon('arrow_turn_right_2.png') + '</td>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					
					html += '<td width="*">';
					html += '<div id="d_emp_layer_'+layer.Name+'-obj" class="'+((this.page.current_layer_id == layer.Name + '-obj') ? 'file_object_selected' : 'file_object')+'" style="line-height:18px; margin:1px 0px;">';
					html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td width="16">' + icon('bricks_bw.png', '', "$P().pal('layers').set_current_layer('"+layer.Name+"-obj')") + '</td>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="*" onClick="$P().pal(\'layers\').set_current_layer(\''+layer.Name+'-obj\')" style="cursor:pointer;">Data Layer</td>';
					html += '<td width="16" align="right">' + icon('trash', '', "$P().pal('layers').remove_data_layer('"+layer.Name+"')") + '</td>';
					html += '</tr></table>';
					html += '</div>';
					html += '</td></tr></table>';
				}
				else {
					html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td width="22">' + spacer(22,1) + '</td>';
					html += '<td width="16">' + icon('arrow_turn_right_2.png') + '</td>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="*">';
					html += '<div style="line-height:18px; margin:1px 0px;">';
					html += code_link("$P().pal('layers').add_data_layer('"+layer.Name+"')", "Add Data Layer");
					html += '</div>';
					html += '</td>';
					html += '</td></tr></table>';
					
					if (this.page.current_layer_id == layer.Name + '-obj') {
						this.page.current_layer_id = layer.Name;
					}
				} // no data layer
			} // tile layers have sublayers
			
			html += '<div class="levedit_palette_row_divider"></div>';
		} // foreach layer
		
		// include "background" pseudolayer, turn off for no-scroll checker background
		html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
		html += '<td width="2">' + spacer(3,1) + '</td>';
		html += '<td width="16">' + icon('eye_open', '', "$P().pal('layers').toggle_bkgnd_visibility()", '', 'ic_em_bkgndvis') + '</td>';
		html += '<td width="3">' + spacer(3,1) + '</td>';
		html += '<td><div style="line-height:20px;"><i>(Background)</i></div></td>';
		html += '</td></tr></table>';
		html += '</div>';
				
		this.set_content( html );
	},
	
	add_data_layer: function(name) {
		var layer = find_object( this.layers, { Name: name } );
		var plane = this.page._port.getPlane( layer.Name );
		plane.objectData = [];
		this.draw();
	},
	
	remove_data_layer: function(name) {
		if (confirm("Are you sure you want to remove the data layer for \""+name+"\"?  This operation cannot be undone.")) {
			var layer = find_object( this.layers, { Name: name } );
			var plane = this.page._port.getPlane( layer.Name );
			delete plane.objectData;
			plane.reset(); plane.init(); this.page._port.draw(true);
			
			if (this.page.current_layer_id == layer.Name + '-obj') {
				this.set_current_layer( layer.Name );
			}
			
			this.draw();
			
			this.page.undo_manager.reset(); // remove all undo states
		} // confirmed
	},
	
	toggle_layer_visibility: function(layer_id) {
		// ic_em_layervis_
		var layer = find_object(this.layers, { Name: layer_id.replace(/\-\w+$/, '') });
		var plane = this.page._port.getPlane( layer.Name );
		
		if (layer_id.match(/\-\w+$/)) {
			// pseudolayer
			switch (layer.Type) {
				case 'tile':
					plane._show_data = !plane._show_data;
					plane.reset(); plane.init(); this.page._port.draw(true);
					$('ic_em_layervis_'+layer.Name+'-obj').src = icons_uri + '/eye_' + (plane._show_data ? 'open' : 'closed') + '.gif';
					break;
			} // switch layer.Type
		}
		else {
			// standard layer
			switch (layer.Type) {
				case 'tile':
					plane._show_tiles = !plane._show_tiles;
					plane.reset(); plane.init(); this.page._port.draw(true);
					$('ic_em_layervis_'+layer.Name).src = icons_uri + '/eye_' + (plane._show_tiles ? 'open' : 'closed') + '.gif';
					this.page.pal('navigator').set_layer_visibility( layer.Name, plane._show_tiles );
					break;
				
				case 'sprite':
					if (plane.visible) plane.hide();
					else plane.show();
					$('ic_em_layervis_'+layer.Name).src = icons_uri + '/eye_' + (plane.visible ? 'open' : 'closed') + '.gif';
					this.page.pal('navigator').set_layer_visibility( layer.Name, plane.visible );
					break;
			} // switch layer.Type
		} // std layer
	},
	
	toggle_bkgnd_visibility: function() {
		// toggle level background on/off
		
		if (this.bkgnd_visible) {
			// hide background
			this.bkgnd_args_save = this.page._port.background;
			
			this.page._port.setBackground({
				color: 'white'
			});
			
			this.bkgnd_visible = false;
			this.page.bkgnd_visible = this.bkgnd_visible;
			$('ic_em_bkgndvis').src = icons_uri + '/eye_closed.gif';
			
			this.page._port.reset();
			this.page._port.init();
			this.page._port.draw(true);
			
			var psty = this.page._port.div.style;
			psty.backgroundImage = 'url(images/font_preview_backgrounds/checkerboard.gif)';
			/* psty.backgroundRepeat = 'repeat';
			psty.backgroundPosition = '0px 0px'; */
			
			this.page.pal('navigator').set_bkgnd_visibility(false);
		}
		else {
			// show background
			this.page._port.div.style.backgroundImage = '';
			
			this.page._port.setBackground( this.bkgnd_args_save );
			this.bkgnd_visible = true;
			this.page.bkgnd_visible = this.bkgnd_visible;
			$('ic_em_bkgndvis').src = icons_uri + '/eye_open.gif';
			
			this.page._port.reset();
			this.page._port.init();
			this.page._port.draw(true);
			
			this.page.pal('navigator').set_bkgnd_visibility(true);
		}
		
		this.page._tool_preview.style.border = '1px dashed ' + (this.page.bkgnd_visible ? 'white' : 'black');
	},
	
	set_current_layer: function(layer_id) {
		// d_emp_layer_
		$('d_emp_layer_'+this.page.current_layer_id).className = 'file_object';
		$('d_emp_layer_'+layer_id).className = 'file_object_selected';
		
		this.page.current_layer_id = layer_id;
		this.page.current_layer = find_object(this.layers, { Name: layer_id.replace(/\-\w+$/, '') });
		var layer = this.page.current_layer;
		
		// hide all contextual palettes
		this.page.pal('tileset').hide();
		this.page.pal('tile_objs').hide();
		this.page.pal('sprites').hide();
		
		if (layer_id.match(/\-\w+$/)) {
			// pseudolayer
			switch (layer.Type) {
				case 'tile':
					this.page.pal('tile_objs').setup();
					break;
			} // switch layer.Type
		}
		else {
			// standard layer
			switch (layer.Type) {
				case 'tile':
					this.page.pal('tileset').setup();
					break;
				
				case 'sprite':
					this.page.pal('sprites').setup();
					break;
			} // switch layer.Type
		} // std layer
		
		this.page.level_prefs.last_layer = layer_id;
		user_storage_mark();
		
		if (this.page.toolbar && this.page.toolbar.tool) {
			this.page.toolbar.tool.notify_layer_change();
		}
		this.page.pal('inspector').setup();
		
		this.page.update_grid_position();
		
		if (this.page.mouseOverFrame) {
			this.page.toolbar.tool.show_tool_preview();
		}
	},
	
	select_by_zindex: function(zindex) {
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			if (layer.ZIndex == zindex) {
				this.set_current_layer( layer.Name );
			}
		} // foreach layer
	}
} );
