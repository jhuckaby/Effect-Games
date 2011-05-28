// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameLevelEdit", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_level_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_level_tab_bar"></div>';
		
		html += '<div id="d_game_edit_level_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameLevels/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_level_content').innerHTML = loading_image();
		
		this.args = args;
		
		var gpage = page_manager.find('Game');
		if (gpage && gpage.game && (gpage.game.GameID == args.game_id)) {
			this.game = gpage.game;
			this.game_id = gpage.game.GameID;
			this.receive_game();
		}
		else {
			// game not loaded or switched, load again
			effect_api_get('game_get', { 
				id: args.game_id
			}, [this, 'receive_game'], {});
		}
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('h_game_edit_level_header').innerHTML = '';
		$('d_game_edit_level_tab_bar').innerHTML = '';
		$('d_game_edit_level_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.tilesets = [];
		this.prop_defs = [];
		this.envs = [];
		
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			tilesets: 1,
			lev_props: 1,
			envs: 1
		}, [this, 'receive_tilesets'], {});
	},
	
	receive_tilesets: function(response, tx) {
		if (response && response.Tilesets && response.Tilesets.Tileset) {
			this.tilesets = always_array( response.Tilesets.Tileset );
		}
		
		if (response && response.Properties && response.Properties.Property) {
			this.prop_defs = always_array( response.Properties.Property );
		}
		
		if (response.Envs && response.Envs.Env) {
			this.envs = sort_array( always_array( response.Envs.Env ), { sort_by: 'Name', sort_dir: 1 } );
		}
		
		$('d_game_edit_level_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Levels');
		
		$('h_game_edit_level_header').innerHTML = fit_game_title(this.game.Title);
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		this.game_prefs = games[this.game_id];
		
		if (!this.game_prefs.last_level) this.game_prefs.last_level = {
			_size_mode: 'screens'
		};
		this.last_level = this.game_prefs.last_level;
				
		if (this.args.level_id) {
			this.do_edit_level(this.args.level_id);
		}
		else {
			// create new level
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameLevels/' + this.game.GameID, 'Levels'],
				[Nav.currentAnchor(), 'Create New Level']
			);

			Nav.title( 'Create New Level | ' + this.game.Title );

			this.level = null;
			this.draw_level_form( merge_objects(merge_objects({
				
				Width: 7200,
				Height: 7200,
				BackgroundColor: this.game.BackgroundColor,
				BackgroundXMode: 'infinite',
				BackgroundYMode: 'infinite',
				BackgroundXDiv: 0.5,
				BackgroundYDiv: 0.5
				
			}, this.last_level), this.args) );
		}
	},
	
	do_edit_level: function(level_id) {
		// edit existing level
		if (this.level && (this.level.Name == level_id)) {
			// level already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_level_2();
		}
		else {
			// load level from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'level',
				id: level_id
			}, [this, 'do_edit_level_2'], {});
		}
	},
	
	do_edit_level_2: function(response) {
		// edit existing level
		if (response) {
			this.level = response.Item;
		}
		var title = 'Editing Level "'+this.level.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameLevels/' + this.game.GameID, 'Levels'],
			[Nav.currentAnchor(), 'Edit Level Info']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_level_form( this.level );
	},
	
	draw_level_form: function(level) {
		var html = '';
		
		// html += '<div class="blurb">' + get_string('/GameLevelEdit/Blurb') + '</div>';
		
		if (level.Name) html += '<h1>Editing Level "'+level.Name+'"</h1>';
		else html += '<h1>Create New Level</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// level name
		html += '<tr><td align=right class="fe_label_left">Level&nbsp;ID:*</td>';
		html += '<td align=left><input type=text id="fe_el_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(level.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a unique ID for your level, using alphanumeric characeters, dashes and periods.  This is so you can identify and access the level from your game code. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// size
		html += '<tr>';
			html += '<td align=right class="fe_label_left">Level&nbsp;Size:*</td>';
			html += '<td align=left><input type=text id="fe_el_width" class="fe_medium" size="7" maxlength="10" value="'+escape_text_field_value( (this.last_level._size_mode == 'screens') ? Math.floor(parseInt(level.Width, 10) / parseInt(this.game.PortWidth, 10)) : level.Width )+'">';
			html += '&nbsp;x&nbsp;';
			html += '<input type=text id="fe_el_height" class="fe_medium" size="7" maxlength="10" value="'+escape_text_field_value( (this.last_level._size_mode == 'screens') ? Math.floor(parseInt(level.Height, 10) / parseInt(this.game.PortHeight, 10)) : level.Height )+'">';
			html += '&nbsp;';
			html += menu('fe_el_size_mode', [['screens','Screens'], ['pixels','Pixels']], this.last_level._size_mode, 
				{ 'class':'fe_small_menu', onChange: "$P().change_level_size_mode(this.options[this.selectedIndex].value)" });
			html += '</td>';
		html += '</tr>';
		html += '<tr><td></td><td class="caption"> Enter the size of your level, in screens (multiples of your display size) or plain pixels.  You can always adjust this size later.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		if (level.Name) {
			html += '<tr><td align=right class="fe_label_left">Resize Align:</td>';
			html += '<td align=left>';
				html += menu('fe_el_resize_align', [
					['topleft', 'Top Left'], ['topright', 'Top Right'],
					['bottomright', 'Bottom Right'], ['bottomleft', 'Bottom Left']
				], level.ResizeAlign, { 'class':'fe_small_menu' } );
			html += '</td></tr>';
			html += '<tr><td></td><td class="caption"> If you change the level size, be sure to select an alignment, so the engine knows how to pin the current level contents when resizing. </td></tr>';
			html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		} // edit mode
		
		// preload
		html += '<tr><td align=right class="fe_label_left">Preload:</td>';
		html += '<td align=left><input type=checkbox id="fe_el_preload" value="1" ' + ((level.Preload == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_el_preload">Preload Level at Game Startup</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like your level automatically loaded at game startup, or loaded on-demand in code. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// environment
		var env_items = [ ['',"(None)"] ];
		for (var idx = 0, len = this.envs.length; idx < len; idx++) {
			env_items.push( this.envs[idx].Name );
		}
		html += '<tr><td align=right class="fe_label_left">Environment:</td>';
		html += '<td align=left>';
			html += menu('fe_el_env', env_items, level.Env, { 'class':'fe_small_menu' } );
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally select an environment for your level.  An environment is a configurable set of non-destructive filters that can adjust the level hue, saturation, brightness, contrast, etc.  You can define environments back on the <a href="#GameLevels/'+this.game_id+'">Levels</a> page.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// background color
		html += '<tr><td align=right class="fe_label_left">Background&nbsp;Color:*</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_el_bkgnd_color" value="'+escape_text_field_value(level.BackgroundColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_el_bkgnd_color">' + get_color_preview(level.BackgroundColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P('GameLevelEdit').do_choose_color()") + 
				'<div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a background color for your level.  You can always change this in your game code at any time, even during game play.  This is just the initial background color applied after the level is activated. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// background image
		html += '<tr><td align=right class="fe_label_left">Background&nbsp;Image:</td><td>';
			html += '<input type=hidden id="fe_el_bkgnd_image" value="'+escape_text_field_value(level.BackgroundImage)+'"/>';
			html += '<div id="d_el_bkgnd_image">';
			html += level.BackgroundImage ? this.render_bkgnd_image(level.BackgroundImage) : this.render_bkgnd_image_button();
			html += '</div>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally select a background image for your level.  Once selected, you can adjust the scrolling behavior below.  For more complex backgrounds, you can use a tile layer.  This is just for simple, single image backgrounds.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// background behavior
		html += '<tr><td colspan=2><div id="d_game_edit_level_bkgnd_behavior" style="margin-bottom:20px; display:' + 
			((level.BackgroundImage) ? 'block' : 'none') + ';">';
		html += '<fieldset><legend>Background Scrolling Behavior</legend>';
			html += '<div class="caption" style="margin-bottom:15px;">Choose the desired behavior for horizontal and vertical background scrolling.  "Infinite Repeat" means the background will repeat, and you can choose a scrolling speed (1.0 is full speed, 0.5 is half speed, 0.25 is quarter speed, etc.).  "Fit To Level" means the background will be scrolled automatically to fit exactly once in the level (no repeat).</div>';
			html += '<div style="margin-left:30px;"><table>';
			
			html += '<tr>';
			html += '<td align=right class="fe_label">Horizontal&nbsp;Behavior:*</td>';
			// html += '<td>' + spacer(6,1) + '</td>';
			html += '<td>' + menu('fe_el_bkgnd_xmode', [['infinite','Infinite Repeat'], ['fit','Fit To Level']], level.BackgroundXMode, {
				'class': 'fe_small_menu',
				onChange: '$P().set_bkgnd_opts(\'xmode\',this.options[this.selectedIndex].value)'
			}) + '</td>';
			html += '<td>' + spacer(15,1) + '</td>';
			html += '<td><div id="d_el_bkgnd_xmode_opts" style="display:' + ((level.BackgroundXMode == 'infinite') ? 'block' : 'none') + ';">';
			html += '<table cellspacing="0" cellpadding="0" border="0"><tr><td class="fe_label">Scroll&nbsp;Speed:*&nbsp;</td><td><input type="text" class="fe_small" id="fe_el_bkgnd_xdiv" size="5" value="'+escape_text_field_value(forceFloatString(level.BackgroundXDiv))+'"/></td></tr></table>';
			html += '</div></td>';
			html += '</tr>';
			
			html += '<tr>';
			html += '<td align=right class="fe_label">Vertical&nbsp;Behavior:*</td>';
			// html += '<td>' + spacer(6,1) + '</td>';
			html += '<td>' + menu('fe_el_bkgnd_ymode', [['infinite','Infinite Repeat'], ['fit','Fit To Level']], level.BackgroundYMode, {
				'class': 'fe_small_menu',
				onChange: '$P().set_bkgnd_opts(\'ymode\',this.options[this.selectedIndex].value)'
			}) + '</td>';
			html += '<td>' + spacer(15,1) + '</td>';
			html += '<td><div id="d_el_bkgnd_ymode_opts" style="display:' + ((level.BackgroundYMode == 'infinite') ? 'block' : 'none') + ';">';
			html += '<table cellspacing="0" cellpadding="0" border="0"><tr><td class="fe_label">Scroll&nbsp;Speed:*&nbsp;</td><td><input type="text" class="fe_small" id="fe_el_bkgnd_ydiv" size="5" value="'+escape_text_field_value(forceFloatString(level.BackgroundYDiv))+'"/></td></tr></table>';
			html += '</div></td>';
			html += '</tr>';
			
			html += '</table></div>';
		html += '</fieldset>';
		html += '</div></td></tr>';
		
		// layers
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Layers</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can configure the layers for your level.  A layer is a group of sprites or a tile map.  You may create multiple of each, but you can alternatively generate layers in code.  Note that the "Z-Index" for sprite layers is only the default -- each sprite may set its own Z-Index.</div>';
			html += this.render_layer_editor( (level.Layers && level.Layers.Layer) ? always_array(level.Layers.Layer) : [] );
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// prerequisites
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Sprite Dependencies</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">If this level requires special sprite classes to be loaded (i.e. those not explicitly placed onto the level, and not listed as dependencies of loaded sprites), you can add them here.</div>';
			html += spreq.render_sprite_req_editor('fe_el_reqs', {
				game_id: this.game_id,
				reqs: (level.Requires && level.Requires.Require) ? always_array(level.Requires.Require) : []
			});
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// resources
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Level Resources</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can add resources that are required by your level, including images, sounds, videos, and XML files.  These could include alternate background images, music tracks, and configuration XML files.  These will be automatically loaded when the level loads (either at startup or on-demand).</div>';
			html += render_resource_editor('fe_el_res', {
				resources: (level.Resources && level.Resources.Resource) ? always_array(level.Resources.Resource) : [],
				file_reg_exp: config.ResourceRegExp,
				file_error: "Please add only supported file formats (JPEGs, PNGs, GIFs, MP3s and XMLs) to the Resources list.",
				add_button: 'Add Resources...',
				dlg_title: 'Select Resources',
				game_id: this.game_id
			});
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// properties
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Level Properties</legend>';
			if (this.prop_defs.length) {
				html += '<div class="caption" style="margin-bottom:5px;">Here you can set values for the level properties you defined back on the Levels screen.  These values will be saved with this level data, and made available to your game code when the level is loaded.</div>';
				html += this.render_props( level.Properties || {} );
			}
			else {
				html += '(No level properties defined.)';
			}
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (level.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameLevels/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('world_edit.png', '<b>Save Changes</b>', "$P('GameLevelEdit').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameLevels/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('world_add.png', '<b>Create Level</b>', "$P('GameLevelEdit').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_level_content').innerHTML = html;
		
		if (!level.Name) safe_focus('fe_el_id');
	},
	
	render_props: function(prop_values) {
		var html = '';
		html += '<table style="margin:10px;">';
		for (var idx = 0, len = this.prop_defs.length; idx < len; idx++) {
			var prop_def = this.prop_defs[idx];
			var value = (typeof(prop_values[prop_def.Name]) != 'undefined') ? prop_values[prop_def.Name] : prop_def.DefaultValue;
			html += '<tr>';
			html += '<td class="fe_label" align="right">' + prop_def.Name + ':&nbsp;</td>';
			
			html += '<td>';
			switch (prop_def.Type) {
				case 'menu':
					html += menu('fe_lev_prop_'+prop_def.Name, prop_def.Items.split(/\,\s*/), value, {
						'class' : 'fe_small_menu'
					});
					break;
				
				case 'text':
					html += '<input type="text" class="fe_small" id="fe_lev_prop_'+prop_def.Name+'" size="20" onFocus="session.fitf=1;" onBlur="session.fitf=0;" value="'+escape_text_field_value(value)+'" />';
					break;
				
				case 'checkbox':
					html += '<input type="checkbox" id="fe_lev_prop_'+prop_def.Name+'" value="1" ' + 
						((value == 1) ? 'checked="checked"' : '') + '/>';
					html += '<label for="fe_lev_prop_'+prop_def.Name+'">'+prop_def.Name+'</label>';
					break;
			} // switch prop.Type
			html += '</td>';
			
			html += '</tr>';
			html += '<tr><td colspan="2">' + spacer(1,1) + '</td></tr>';
		}
		html += '</table>';
		return html;
	},
	
	change_level_size_mode: function(mode) {
		var cur_width = parseInt( trim($('fe_el_width').value) || 0, 10 );
		if (isNaN(cur_width)) cur_width = 0;
		
		var cur_height = parseInt( trim($('fe_el_height').value) || 0, 10 );
		if (isNaN(cur_height)) cur_height = 0;
		
		switch (mode) {
			case 'screens': 
				$('fe_el_width').value = Math.floor(cur_width / parseInt(this.game.PortWidth, 10));
				$('fe_el_height').value = Math.floor(cur_height / parseInt(this.game.PortHeight, 10));
				break;
				
			case 'pixels':
				$('fe_el_width').value = cur_width * parseInt(this.game.PortWidth, 10);
				$('fe_el_height').value = cur_height * parseInt(this.game.PortHeight, 10);
				break;
		}
	},
	
	render_layer_editor: function(layers) {
		var dom_id_prefix = 'el_layers';
		this.layers = layers;
		
		var html = '';
		html += '<div id="d_'+dom_id_prefix+'">';

		if (layers.length) {
			for (var idx = 0, len = layers.length; idx < len; idx++) {
				var layer = layers[idx];
				layer._id = get_unique_id();
				layer._old_name = layer.Name;
				html += '<div id="'+dom_id_prefix+'_'+layer._id+'">';
				html += this.le_get_layer_html(dom_id_prefix, layer._id, layer);
				html += '</div>';
			}
		}

		html += '</div>';
		html += spacer(1,10) + '<br/>';
		html += '<div style="font-size: 11px;">' + large_icon_button('layers.png', 'Add Layer...', "$P().le_add_layer('"+dom_id_prefix+"')");
		html += '<div class="clear"></div></div>';

		return html;
	},
	
	le_get_layer_html: function(dom_id_prefix, id, layer) {
		// return HTML for single layer row
		var prefix = dom_id_prefix + '_' + id;
		var html = '';
		html += '<table class="prop_table_small"><tr>';
		
		html += '<td align="center">' + icon('delete.png', '', "$P().le_delete_row('"+dom_id_prefix+"','"+id+"')", "Remove Layer") + '</td>';
		
		html += '<td><nobr>Layer&nbsp;ID:' + tiptext_field(prefix + '_name', 'fe_small', {'size':'13', 'maxlength':'32'}, {}, layer.Name, '') + '</nobr></td>';
		
		html += '<td><nobr>Type:' + menu(prefix + '_type', [['sprite','Sprites'], ['tile','Tiles']], layer.Type, 
			{ 'class':'fe_small_menu', onChange: "$P().le_redraw_row('"+dom_id_prefix+"','"+id+"')" }) + '</nobr></td>';
		
		html += '<td><nobr>Z-Index:' + tiptext_field(prefix + '_zindex', 'fe_small', {'size':'3'}, {}, parseInt(layer.ZIndex, 10), '') + '</nobr></td>';
		
		html += '<td><nobr>Scroll&nbsp;Speed:' + tiptext_field(prefix + '_scroll', 'fe_small', {'size':'4'}, {}, forceFloatString(layer.ScrollRatio), 'Ratio') + '</nobr></td>';
		
		switch (layer.Type) {
			case 'tile':
				/* html += '<td><nobr>Tile&nbsp;Size:' + 
					tiptext_field(prefix + '_tilewidth', 'fe_small', {'size':'3'}, {}, layer.TileWidth, 'X') + '&nbsp;X&nbsp;' + 
					tiptext_field(prefix + '_tileheight', 'fe_small', {'size':'3'}, {}, layer.TileHeight, 'Y') + '</nobr></td>'; */
				var items = [];
				for (var idx = 0, len = this.tilesets.length; idx < len; idx++) {
					items.push( [this.tilesets[idx].Name, ww_fit_string(this.tilesets[idx].Name, 130, session.em_width, 1)] );
				}
				if (!items.length) items.push( ['','(None found)'] );
				html += '<td><nobr>Tileset:' + menu(prefix + '_tileset', items, layer.Tileset, {'class':'fe_small_menu'}) + '</nobr></td>';
				break;
		} // switch type
		
		html += '</tr></table>';
		
		// safe_focus(prefix + '_name');
		
		return html;
	},
	
	le_add_layer: function(dom_id_prefix) {
		// add new layer to editor
		var container = $('d_' + dom_id_prefix);
		var layers = this.layers;
		
		var layer = {
			Name: '',
			Type: 'sprite',
			ZIndex: layers.length + 1,
			ScrollRatio: '1.0'
		};

		var id = get_unique_id();

		var div = document.createElement('div');
		div.id = dom_id_prefix + '_' + id;
		div.setAttribute('id', dom_id_prefix + '_' + id);
		div.innerHTML = this.le_get_layer_html(dom_id_prefix, id, layer);
		container.appendChild(div);

		layer._id = id;
		layers.push( layer );
		
		safe_focus(dom_id_prefix + '_' + id + '_name');
	},

	le_redraw_row: function(dom_id_prefix, id) {
		// redraw row after a menu change
		var prefix = dom_id_prefix + '_' + id;
		var new_type = get_menu_value(prefix + '_type');
		var layers = this.layers;
		var layer = find_object( layers, { _id: id } );
		assert(!!layer, "Could not find layer: " + id);

		layer.Type = new_type;
		layer.Name = tiptext_value(prefix + '_name');

		$(prefix).innerHTML = this.le_get_layer_html(dom_id_prefix, id, layer);
	},

	le_delete_row: function(dom_id_prefix, id) {
		// delete row
		var prefix = dom_id_prefix + '_' + id;
		var container = $('d_' + dom_id_prefix);
		var layers = this.layers;

		var layer = find_object( layers, { _id: id } );
		assert(!!layer, "Could not find layer: " + id);

		var layer_idx = find_object_idx( layers, { _id: id } );
		assert(layer_idx > -1, "Could not find layer: " + id);

		layers.splice( layer_idx, 1 );

		try { container.removeChild( document.getElementById(prefix) ); }
		catch (e) { alert("Could not remove child: " + id); }
	},
	
	le_layer_update_all: function() {
		// update all layers from their DOM fields
		var dom_id_prefix = 'el_layers';
		clear_field_error();
		var layers = this.layers;
		
		for (var idx = 0, len = layers.length; idx < len; idx++) {
			var layer = layers[idx];
			var id = layer._id;
			var prefix = dom_id_prefix + '_' + id;
			
			// layer.OldName = layer.Name || '';
			
			layer.Name = tiptext_value(prefix + '_name');
			if (!layer.Name) return bad_field(prefix+'_name', "Please enter a layer ID.");
			if (!layer.Name.match(/^\w+$/)) return bad_field(prefix+'_name', "Layer IDs must be alphanumeric.");
			if (!check_reserved_word(layer.Name)) return bad_field(prefix+'_name', "Your Layer ID is a reserved word.  Please choose another.");
			if (layer.Name.length > 32) return bad_field(prefix+'_name', "Your Layer ID is too long.  Please keep it to 32 characters or less.");
			
			layer.Type = get_menu_value(prefix + '_type');
			
			layer.ZIndex = tiptext_value(prefix + '_zindex');
			if (!layer.ZIndex.length) return bad_field(prefix+'_zindex', "Please enter a layer z-index order between 1 and 999.");
			if (!layer.ZIndex.match(/^\d+$/)) return bad_field(prefix+'_zindex', "Layer z-index order must be an integer.");
			if (parseInt(layer.ZIndex, 10) > 999) return bad_field(prefix+'_zindex', "Layer z-index order must be between 1 and 999.  Other values are reserved by the engine.");
			
			layer.ScrollRatio = tiptext_value(prefix + '_scroll');
			if (!layer.ScrollRatio.length) return bad_field(prefix+'_scroll', "Please enter a layer scroll speed ratio.");
			if (!layer.ScrollRatio.match(/^\d+(\.\d+)?$/)) return bad_field(prefix+'_scroll', "Layer scroll speed ratio must be a number.");
			
			switch (layer.Type) {
				case 'tile':
					/* layer.TileWidth = tiptext_value(prefix + '_tilewidth');
					if (!layer.TileWidth.length) return bad_field(prefix+'_tilewidth', "Please enter a tile width in pixels.");
					if (!layer.TileWidth.match(/^\d+$/)) return bad_field(prefix+'_tilewidth', "Tile pixel width must be an integer.");
					
					layer.TileHeight = tiptext_value(prefix + '_tileheight');
					if (!layer.TileHeight.length) return bad_field(prefix+'_tileheight', "Please enter a tile height in pixels.");
					if (!layer.TileHeight.match(/^\d+$/)) return bad_field(prefix+'_tileheight', "Tile pixel height must be an integer."); */
					layer.Tileset = get_menu_value(prefix + '_tileset');
					break;
			} // switch type
		} // foreach layer

		return true;
	},
	
	set_bkgnd_opts: function(axis, value) {
		var div = $('d_el_bkgnd_'+axis+'_opts');
		if (value == 'infinite') div.show();
		else div.hide();
	},
	
	do_choose_color: function() {
		do_select_color($('fe_el_bkgnd_color').value, [this, 'do_choose_color_finish']);
	},
	
	do_choose_color_finish: function(hex) {
		$('fe_el_bkgnd_color').value = hex;
		$('td_el_bkgnd_color').innerHTML = get_color_preview(hex);
	},
	
	render_bkgnd_image: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameLevelEdit').remove_bkgnd_image()", "Remove Background Image") + '</td>';
		html += '<td id="td_el_bkgnd_image" width="200">' + asset_icon_link(this.game_id, path, '', 180) + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_bkgnd_image_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('page_white_magnify.png', "Select Image...", "$P('GameLevelEdit').choose_bkgnd_image()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_bkgnd_image: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Background Image", this.game_id, session.imageResourceMatchString, $('fe_el_bkgnd_image').value, [this, 'choose_bkgnd_image_finish'], '');
	},
	
	choose_bkgnd_image_finish: function(path) {
		$('fe_el_bkgnd_image').value = path;
		$('d_el_bkgnd_image').innerHTML = this.render_bkgnd_image(path);
		$('d_game_edit_level_bkgnd_behavior').show();
	},
	
	remove_bkgnd_image: function() {
		$('fe_el_bkgnd_image').value = '';
		$('d_el_bkgnd_image').innerHTML = this.render_bkgnd_image_button();
		$('d_game_edit_level_bkgnd_behavior').hide();
	},
	
	get_all_prop_values: function() {
		// collect all prop values from form fields
		var prop_values = {};
		
		for (var idx = 0, len = this.prop_defs.length; idx < len; idx++) {
			var prop_def = this.prop_defs[idx];
			var value = '';
			switch (prop_def.Type) {
				case 'menu':
					value = get_menu_value('fe_lev_prop_'+prop_def.Name);
					break;
				
				case 'text':
					value = trim( $('fe_lev_prop_'+prop_def.Name).value );
					break;
				
				case 'checkbox':
					value = $('fe_lev_prop_'+prop_def.Name).checked ? 1 : 0;
					break;
			} // switch prop.Type
			prop_values[ prop_def.Name ] = value;
		} // foreach prop def
		
		return prop_values;
	},
	
	save: function() {
		// save level changes, or add new level
		clear_field_error();
		
		var level = {
			Name: trim($('fe_el_id').value),
			Preload: $('fe_el_preload').checked ? '1' : '0',
			Width: trim($('fe_el_width').value),
			Height: trim($('fe_el_height').value),
			BackgroundColor: $('fe_el_bkgnd_color').value,
			BackgroundImage: $('fe_el_bkgnd_image').value,
			BackgroundXMode: get_menu_value('fe_el_bkgnd_xmode'),
			BackgroundXDiv: trim($('fe_el_bkgnd_xdiv').value),
			BackgroundYMode: get_menu_value('fe_el_bkgnd_ymode'),
			BackgroundYDiv: trim($('fe_el_bkgnd_ydiv').value),
			Properties: this.get_all_prop_values(),
			Env: get_menu_value('fe_el_env')
		};
		
		// text field validation
		if (!level.Name) return bad_field('fe_el_id', "Please enter a Level ID.");
		
		if (!level.Name.length) return bad_field('fe_el_id', "You must enter an ID for your level.");
		if (level.Name.length > 32) return bad_field('fe_el_id', "Your Level ID is too long.  Please keep it to 32 characters or less.");
		if ((level.Name == 0) || !level.Name.match($R.GameObjectID)) return bad_field('fe_el_id', "Your Level ID is invalid.  Please use only alphanumerics, dashes and periods, and begin and end with an alpha character.");
		
		if (!level.Width) return bad_field('fe_el_width', "Please enter a Level Width, in pixels.");
		if (!level.Width.match(/^\d+$/)) return bad_field('fe_el_width', "The Level Width must be an integer.");
		if (!level.Height) return bad_field('fe_el_height', "Please enter a Level Height, in pixels.");
		if (!level.Height.match(/^\d+$/)) return bad_field('fe_el_height', "The Level Height must be an integer.");
		
		if (level.BackgroundXMode == 'infinite') {
			if (!level.BackgroundXDiv) return bad_field('fe_el_bkgnd_xdiv', 'Please enter a horizontal scroll speed (0.0, 1.0, 2.0, etc.)');
			if (!level.BackgroundXDiv.match(/^\d+(\.\d+)?$/)) return bad_field('fe_el_bkgnd_xdiv', 'The horizontal scroll speed must be a number.');
		}
		
		if (level.BackgroundYMode == 'infinite') {
			if (!level.BackgroundYDiv) return bad_field('fe_el_bkgnd_ydiv', 'Please enter a vertical scroll speed (0.0, 1.0, 2.0, etc.)');
			if (!level.BackgroundYDiv.match(/^\d+(\.\d+)?$/)) return bad_field('fe_el_bkgnd_ydiv', 'The vertical scroll speed must be a number.');
		}
		
		// convert screens to pixels if applicable
		var size_mode = get_menu_value('fe_el_size_mode');
		if (size_mode == 'screens') {
			level.Width = Math.floor( parseInt(level.Width, 10) * this.game.PortWidth );
			level.Height = Math.floor( parseInt(level.Height, 10) * this.game.PortHeight );
		}
		
		var level_width = parseInt(level.Width, 10);
		var level_height = parseInt(level.Height, 10);
		
		if (level_width < this.game.PortWidth) return bad_field('fe_el_width', "The Level Width must be equal to or greater than your game display width ("+this.game.PortWidth+")");
		if (level_height < this.game.PortHeight) return bad_field('fe_el_height', "The Level Height must be equal to or greater than your game display height ("+this.game.PortHeight+")");
		
		if (level_width >= 4294967296) return bad_field('fe_el_width', "The Level Width must be less than 4,294,967,296 pixels.");
		if (level_height >= 4294967296) return bad_field('fe_el_height', "The Level Height must be less than 4,294,967,296 pixels.");
		
		var level_area = level_width * level_height;
		if (level_area >= 67108864) return bad_field((level_width >= level_height) ? 'fe_el_width' : 'fe_el_height', "The total level size must not exceed 64 megapixels.  Please reduce your level width or height.");	
	
		// layers
		if (!this.le_layer_update_all()) return;
		level.Layers = { Layer: deep_copy_object(this.layers) };
		
		for (var idx = 0, len = level.Layers.Layer.length; idx < len; idx++) {
			delete level.Layers.Layer[idx]._id;
			delete level.Layers.Layer[idx]._old_name;
		}
		
		// save things in last_level
		this.last_level._size_mode = size_mode;
		for (var key in level) {
			if (key != 'Name') {
				this.last_level[key] = (typeof(level[key]) == 'object') ? deep_copy_object(level[key]) : level[key];
			}
		}
		user_storage_mark();
		
		// prerequisites
		var reqs = spreq.get_all('fe_el_reqs');
		level.Requires = { Require: reqs };
		
		// resources
		var resources = [];
		re_update_all('fe_el_res');
		array_cat( resources, re_get_all('fe_el_res') );
		level.Resources = { Resource: resources };
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.level) {
			// update existing level
			level.ResizeAlign = get_menu_value('fe_el_resize_align');
			
			effect_api_send('game_update_object', merge_objects(level, {
				GameID: this.game_id,
				OldName: this.level.Name,
				Type: 'level'
			}), [this, 'save_finish'], { _level: level });
		}
		else {
			// create new level
			effect_api_send('game_create_object', merge_objects(level, {
				GameID: this.game_id,
				Type: 'level'
			}), [this, 'save_finish'], { _level: level });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.level) {
			// updated existing level
			var renamed_layer = false;
			for (var idx = 0, len = this.layers.length; idx < len; idx++) {
				var layer = this.layers[idx];
				if (layer._old_name && (layer._old_name != layer.Name)) { renamed_layer = true; idx = len; }
			}
			
			if (this.layers.length && (this.level.Width != tx._level.Width) || (this.level.Height != tx._level.Height) || renamed_layer) {
				this.old_level = this.level;
				show_progress_dialog(1, "Saving level...");
				setTimeout( '$P().resize_level_map()', 1 );
			}
			else {
				Nav.go('#GameLevels/' + this.game_id);
				do_message('success', "Saved level \""+tx._level.Name+"\".");
			}
			
			this.level = tx._level;
		}
		else {
			// created new level
			Nav.go('#GameLevels/' + this.game_id);
			do_message('success', "Created new level \""+tx._level.Name+"\".");
			this.level = tx._level;
		}
	},
	
	resize_level_map: function() {
		// resize level map
		this.old_width = parseInt( this.old_level.Width, 10 );
		this.old_height = parseInt( this.old_level.Height, 10 );
		this.width = parseInt( this.level.Width, 10 );
		this.height = parseInt( this.level.Height, 10 );
		this.align = this.level.ResizeAlign;
		
		if ((this.old_width != this.width) || (this.old_height != this.height)) {
			Debug.trace('level', "Resizing level from " + this.old_width + 'x' + this.old_height + " to " + this.width + 'x' + this.height + ' (' + this.align + ')');
		}
		
		this.port_width = parseInt( this.game.PortWidth, 10 );
		this.port_height = parseInt( this.game.PortHeight, 10 );
		
		// load level data
		load_script( '/effect/api/game_get_level_data' + composeQueryString({
			game_id: this.game_id,
			rev: 'dev',
			level_id: this.level.Name,
			mod: hires_time_now(),
			format: 'js',
			callback: '$P().receive_level_data'
		}));
	},
	
	receive_level_data: function(response) {
		if (!response || !response.Data || !response.Data.layers) {
			Debug.trace('level', "No level data found, skipping resize");
			this.resize_finish();
			return;
		}
		this.level_data = response.Data;
		
		this.do_resize();
	},
	
	do_resize: function() {
		// perform the actual resize
		for (var idx = 0, len = this.layers.length; idx < len; idx++) {
			var layer = this.layers[idx];
			
			if (layer._old_name && (layer._old_name != layer.Name) && this.level_data.layers[ layer._old_name ]) {
				// rename
				Debug.trace('level', "Renaming layer " + layer._old_name + " to " + layer.Name);
				this.level_data.layers[ layer.Name ] = this.level_data.layers[ layer._old_name ];
				delete this.level_data.layers[ layer._old_name ];
			}
			
			if ((this.old_width != this.width) || (this.old_height != this.height)) {
				var layer_data = this.level_data.layers[ layer.Name ];
				var func = 'do_resize_layer_' + layer.Type;
				if (layer_data && this[func]) {
					Debug.trace('level', "Resizing " + layer.Type + " layer: " + layer.Name);
					this.level_data.layers[ layer.Name ] = this[ func ](layer, layer_data);
					Debug.trace('level', "Resize complete for layer: " + layer.Name);
				}
			} // size changed
		} // foreach layer
		
		// save data back to disk
		effect_api_send('game_save_level_data', {
			GameID: this.game_id,
			LevelID: this.level.Name,
			Data: serialize( this.level_data )
		}, [this, 'resize_finish'], {  });
	},
	
	do_resize_layer_tile: function(layer, layer_data) {
		// resize tile layer
		var tileset = find_object(this.tilesets, { Name: layer.Tileset } );
		if (!tileset) {
			Debug.trace('level', "Tileset not found!  Skipping layer");
			return layer_data;
		}
		
		var scroll_speed = parseFloat( layer.ScrollRatio, 10 );
		var tile_size_x = parseInt( tileset.TileWidth, 10 );
		var tile_size_y = parseInt( tileset.TileHeight, 10 );
		
		Debug.trace('level', "Scroll Speed: " + scroll_speed );
		Debug.trace('level', "Tile Size: " + tile_size_x + 'x' + tile_size_y );
		
		var old_max_tx = Math.ceil( (this.port_width + ((this.old_width - this.port_width) * scroll_speed)) / tile_size_x );
		var old_max_ty = Math.ceil( (this.port_height + ((this.old_height - this.port_height) * scroll_speed)) / tile_size_y );
		
		var new_max_tx = Math.ceil( (this.port_width + ((this.width - this.port_width) * scroll_speed)) / tile_size_x );
		var new_max_ty = Math.ceil( (this.port_height + ((this.height - this.port_height) * scroll_speed)) / tile_size_y );
		
		Debug.trace('level', "Max tiles changing from " + old_max_tx + 'x' + old_max_ty + " to " + new_max_tx + 'x' + new_max_ty);
		
		if ((old_max_tx == new_max_tx) && (old_max_ty == new_max_ty)) {
			Debug.trace('level', "Max tile dimensions did not change, skipping layer.");
			return layer_data; // no resize needed
		}
		
		var change_x = Math.abs( new_max_tx - old_max_tx );
		var change_y = Math.abs( new_max_ty - old_max_ty );
		
		if (new_max_tx > old_max_tx) {
			if (this.align.match(/right/)) {
				Debug.trace('level', "Growing by " + change_x + " tiles on left side");
				for (var tx = 0; tx < change_x; tx++) {
					if (layer_data.data) layer_data.data.unshift(0);
					if (layer_data.objectData) layer_data.objectData.unshift(0);
				}
			} // grow from left
			else if (this.align.match(/left/)) {
				Debug.trace('level', "Growing by " + change_x + " tiles on right side (no action required)");
				// no action required here
			} // grow from right
		} // x grow
		else if (new_max_tx < old_max_tx) {
			if (this.align.match(/right/)) {
				Debug.trace('level', "Cropping " + change_x + " tiles from left side");
				for (var tx = 0; tx < change_x; tx++) {
					if (layer_data.data) layer_data.data.shift();
					if (layer_data.objectData) layer_data.objectData.shift();
				}
			} // cut from left
			else if (this.align.match(/left/)) {
				Debug.trace('level', "Cropping " + change_x + " tiles from right side");
				if (layer_data.data) layer_data.data.length = new_max_tx;
				if (layer_data.objectData) layer_data.objectData.length = new_max_tx;
			} // cut from right
		} // x shrink
		
		if (new_max_ty > old_max_ty) {
			if (this.align.match(/bottom/)) {
				Debug.trace('level', "Growing by " + change_y + " tiles on top side");
				for (var tx = 0; tx < new_max_tx; tx++) {
					if (layer_data.data) {
						var col = layer_data.data[tx];
						if (col) {
							for (var ty = 0; ty < change_y; ty++) col.unshift(0);
						} // col
					} // has data
					if (layer_data.objectData) {
						var col = layer_data.objectData[tx];
						if (col) {
							for (var ty = 0; ty < change_y; ty++) col.unshift(0);
						} // col
					} // has objectData
				} // x loop
			} // grow from top
			else if (this.align.match(/top/)) {
				Debug.trace('level', "Growing by " + change_y + " tiles on bottom side (no action required)");
				// no action required here
			} // grow from bottom
		} // y grow
		else if (new_max_ty < old_max_ty) {
			if (this.align.match(/bottom/)) {
				Debug.trace('level', "Cropping " + change_y + " tiles from top side");
				for (var tx = 0; tx < new_max_tx; tx++) {
					if (layer_data.data) {
						var col = layer_data.data[tx];
						if (col) {
							for (var ty = 0; ty < change_y; ty++) col.shift();
						} // col
					} // has data
					if (layer_data.objectData) {
						var col = layer_data.objectData[tx];
						if (col) {
							for (var ty = 0; ty < change_y; ty++) col.shift();
						} // col
					} // has objectData
				} // x loop
			} // cut from top
			else if (this.align.match(/top/)) {
				Debug.trace('level', "Cropping " + change_y + " tiles from bottom side");
				for (var tx = 0; tx < new_max_tx; tx++) {
					if (layer_data.data) {
						var col = layer_data.data[tx];
						if (col) {
							col.length = new_max_ty;
						} // col
					} // has data
					if (layer_data.objectData) {
						var col = layer_data.objectData[tx];
						if (col) {
							col.length = new_max_ty;
						} // col
					} // has objectData
				} // x loop
			} // cut from bottom
		} // y shrink
		
		return layer_data;
	},
	
	do_resize_layer_sprite: function(layer, sprites) {
		// resize sprite layer
		var scroll_speed = parseFloat( layer.ScrollRatio, 10 );
		
		var old_layer_width = Math.floor( (this.port_width + ((this.old_width - this.port_width) * scroll_speed)) );
		var old_layer_height = Math.floor( (this.port_height + ((this.old_height - this.port_height) * scroll_speed)) );
		
		var new_layer_width = Math.floor( (this.port_width + ((this.width - this.port_width) * scroll_speed)) );
		var new_layer_height = Math.floor( (this.port_height + ((this.height - this.port_height) * scroll_speed)) );
		
		Debug.trace('level', "Layer size changing from " + old_layer_width + 'x' + old_layer_height + " to " + new_layer_width + 'x' + new_layer_height);
		
		var sprite_shift_x = 0;
		var sprite_shift_y = 0;
		
		if (this.align.match(/right/)) {
			sprite_shift_x = new_layer_width - old_layer_width;
		}
		if (this.align.match(/bottom/)) {
			sprite_shift_y = new_layer_height - old_layer_height;
		}
		
		Debug.trace('level', "Sprites shifting by: " + sprite_shift_x + 'x' + sprite_shift_y );
		
		for (var idx = 0, len = sprites.length; idx < len; idx++) {
			var sprite = sprites[idx];
			sprite.x += sprite_shift_x;
			sprite.y += sprite_shift_y;
			
			// check if sprite has left level bounds, and if so, kill it
			if ((sprite.x >= new_layer_width) || (sprite.y >= new_layer_height) || (sprite.x + sprite.width <= 0) || (sprite.y + sprite.height <= 0)) {
				Debug.trace('level', "Deleting sprite: " + serialize(sprite));
				sprites.splice( idx, 1 );
				len--;
				idx--;
			} // delete sprite
		} // foreach sprite
		
		return sprites;
	},
	
	resize_finish: function() {
		this.tilesets = null;
		this.level_data = null;
		
		Nav.go('#GameLevels/' + this.game_id);
		do_message('success', "Saved level \""+this.level.Name+"\".");
	}
} );
