// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameEnvEdit", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_env_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_env_tab_bar"></div>';
		
		html += '<div id="d_game_edit_env_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameEnvs/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_env_content').innerHTML = loading_image();
		
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
		this.sliders = null;
		$('h_game_edit_env_header').innerHTML = '';
		$('d_game_edit_env_tab_bar').innerHTML = '';
		$('d_game_edit_env_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_env_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Levels');
		
		$('h_game_edit_env_header').innerHTML = fit_game_title(this.game.Title);
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		this.game_prefs = games[this.game_id];
		
		// we need the list of levels, for selecting the preview image
		this.levels = [];
		var lpage = page_manager.find('GameLevels');
		if (lpage && lpage.game && (lpage.game.GameID == this.game_id) && lpage.levels) {
			this.levels = lpage.levels;
			this.receive_levels();
		}
		else {
			effect_api_get('game_objects_get', { 
				id: this.game_id,
				levels: 1
			}, [this, 'receive_levels'], {});
		}
	},
	
	receive_levels: function(response, tx) {
		// receive game levels
		if (response && response.Levels && response.Levels.Level) {
			this.levels = sort_array( always_array( response.Levels.Level ), { sort_by: 'Name', sort_dir: 1 } );
		}
		
		if (this.args.env_id) {
			this.do_edit_env(this.args.env_id);
		}
		else {
			// create new env
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameLevels/' + this.game.GameID, 'Levels'],
				[Nav.currentAnchor(), 'Create New Environment']
			);

			Nav.title( 'Create New Environment | ' + this.game.Title );

			this.env = null;
			this.draw_env_form( merge_objects({
				
			}, this.args) );
		}
	},
	
	do_edit_env: function(env_id) {
		// edit existing env
		if (0 && this.env && (this.env.Name == env_id)) {
			// JH: No, apparently we are destructively manipulating this, so have to reload each time
			
			// env already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_env_2();
		}
		else {
			// load env from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'env',
				id: env_id
			}, [this, 'do_edit_env_2'], {});
		}
	},
	
	do_edit_env_2: function(response) {
		// edit existing env
		if (response) {
			this.env = response.Item;
		}
		var title = 'Editing Environment "'+this.env.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameLevels/' + this.game.GameID, 'Levels'],
			[Nav.currentAnchor(), 'Edit Environment']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_env_form( this.env );
	},
	
	draw_env_form: function(env) {
		var html = '';
		
		html += '<div class="blurb">' + get_string('/GameEnvEdit/Blurb') + '</div>';
		
		if (env.Name) html += '<h1>Editing Environment "'+env.Name+'"</h1>';
		else html += '<h1>Create New Environment</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// env name
		html += '<tr><td align=right class="fe_label_left">Environment&nbsp;ID:*</td>';
		html += '<td align=left><input type=text id="fe_ee_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(env.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a unique ID for your environment, using alphanumeric characeters, dashes and periods. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// transforms
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Filters</legend>';
			html += '<div class="caption" style="margin-bottom:6px;">Here you can add filters to configure your environment.  The filters are applied in the order they appear, and this can make a difference when you have multiple.  You can also add the same filter multiple times if you require cumulative effects.</div>';
			html += '<div id="d_ee_trans_editor">';
			html += this.render_transform_editor( (env.Transforms && env.Transforms.Transform) ? always_array(env.Transforms.Transform) : [] );
			html += '</div>';
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// preview
		var p_subitems = [];
		var found_level_preview = false;
		for (var idx = 0, len = this.levels.length; idx < len; idx++) {
			var level = this.levels[idx];
			if (level.Layers && level.Layers.Layer) {
				var p_sub_value = '/level_data/'+level.Name+'/preview.jpg';
				if (p_sub_value == this.game_prefs.last_env_preview) found_level_preview = true;
				p_subitems.push([ p_sub_value, level.Name ]);
			}
		}
		var p_items = [
			['', 'RGB Color Wheel'],
			['_ASSET_', 'Custom Image Asset...'],
			[p_subitems, 'Level Previews:']
		];
		
		var p_value = this.game_prefs.last_env_preview;
		if (!found_level_preview && p_value) p_value = '_ASSET_';
		
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Environment Preview</legend>';
			html += '<table><tr>';
			
				html += '<td class="fe_label" style="font-size:11px"><b>Image:</b>&nbsp;' + 
					menu('fe_ee_preview_image', p_items, p_value, { 
						'class': 'fe_small_menu', 
						'onChange': "$P().set_preview_image(this.options[this.selectedIndex].value)" 
					}) + '</td>';
				
				// html += '<td>' + spacer(8,1) + '</td>';
			
			html += '</tr></table>';
			html += '<div id="d_ee_preview" style="padding:10px; background:url(images/font_preview_backgrounds/checkerboard.gif)">';
			html += '</div>';
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// exclusions
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Image Exclusions</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can specify images that should be <b>excluded</b> from the effects of the environment.  Typical images to exclude are those that provide their own light, such as explosions, particle effects, atmospheric effects, etc.</div>';
			html += render_resource_editor('fe_ee_exclusions', {
				resources: (env.Excludes && env.Excludes.Exclude) ? always_array(env.Excludes.Exclude) : [],
				file_reg_exp: '\.(jpe|jpeg|jpg|gif|png)$',
				file_error: "Please add only supported image formats (JPEGs, PNGs and GIFs) to the Exclusion list.",
				add_button: 'Add Exclusions...',
				dlg_title: 'Select Images for Exclusion',
				game_id: this.game_id
			});
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (env.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameLevels/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('weather_edit.png', '<b>Save Changes</b>', "$P().save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameLevels/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('weather_add.png', '<b>Create Environment</b>', "$P().save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_env_content').innerHTML = html;
		
		if (!env.Name) safe_focus('fe_ee_id');
		
		this.preview_image = this.game_prefs.last_env_preview || '';
		
		setTimeout( function() {
			$P().update_preview();
		}, 1 );
	},
	
	set_preview_image: function(value) {
		// set new preview image
		if (value == '_ASSET_') {
			dasset.choose("Select Image", this.game_id, session.imageResourceMatchString, '', [this, 'choose_image_preview_finish'], '');
			return;
		}
		this.preview_image = value;
		this.game_prefs.last_env_preview = value;
		user_storage_mark();
		
		this.update_preview();
	},
	
	choose_image_preview_finish: function(value) {
		this.set_preview_image( '/assets' + value );
	},
	
	update_preview: function() {
		// refresh preview display
		if (!this.ee_transform_update_all()) return;
		
		var tlist = [];
		var shortcuts = config.EnvTransformShortcuts;
		
		for (var idx = 0, len = this.transforms.length; idx < len; idx++) {
			var transform = this.transforms[idx];
			var t = {};
			for (var key in transform) {
				if (!key.match(/^_/)) {
					var value = transform[key];
					var k = shortcuts[key] ? shortcuts[key] : key;
					var v = shortcuts[value] ? shortcuts[value] : value;
					t[k] = v;
				}
			}
			tlist.push( serialize(t) );
		}
		
		var url = '/effect/api/env_preview' + composeQueryString({
			g: this.game_id,
			s: this.preview_image,
			t: tlist
		});
		
		Debug.trace('env', "Env Preview: " + url);
		
		var img = $('img_ee_preview');
		if (img) img.src = url;
		else {
			var div = $('d_ee_preview');
			div.innerHTML = '<center><img id="img_ee_preview" src="'+url+'"/></center>';
		}
	},
	
	render_transform_editor: function(transforms) {
		var dom_id_prefix = 'ee_transforms';
		this.transforms = transforms;
		this.sliders = [];
		
		var html = '';
		html += '<div id="d_'+dom_id_prefix+'">';

		if (transforms.length) {
			for (var idx = 0, len = transforms.length; idx < len; idx++) {
				var transform = transforms[idx];
				transform._id = get_unique_id();
				html += '<div id="'+dom_id_prefix+'_'+transform._id+'">';
				html += this.ee_get_transform_html(dom_id_prefix, transform._id, transform);
				html += '</div>';
			}
		}

		html += '</div>';
		html += spacer(1,10) + '<br/>';
		
		var items = [];
		var trans_defs = sort_array( config.EnvTransformDefs.Transform, { sort_by: 'Title', sort_dir: 1 } );
		for (var idx = 0, len = trans_defs.length; idx < len; idx++) {
			var trans_def = trans_defs[idx];
			items.push([ trans_def.Plugin, trans_def.Title ]);
		}
		
		html += '<table><tr>';
			html += '<td class="fe_label_left">New Filter:</td>';
			html += '<td>'; html += spacer(1,2) + '<br/>';
				html += menu('fe_ee_new_transform', items, 'Modulate', {'class':'fe_medium_menu'});
			html += '</td>';
			html += '<td>' + spacer(2,1) + '</td>';
			html += '<td><div style="font-size: 11px;">' + large_icon_button('contrast_add.png', 'Add Selected Filter...', "$P().ee_add_transform('"+dom_id_prefix+"')") + '<div class="clear"></div></div>' + '</td>';
		html += '</tr></table>';
		
		return html;
	},
	
	ee_get_transform_html: function(dom_id_prefix, id, transform) {
		// return HTML for single transorm row
		var prefix = dom_id_prefix + '_' + id;
		var trans_def = find_object( config.EnvTransformDefs.Transform, { Plugin: transform.Name } );
		assert(!!trans_def, "Could not find transform definition: " + transform.Name );
		var html = '';
		
		html += '<div id="'+prefix+'" class="transform">';
		html += '<div class="trans_title">' + trans_def.Title + '</div>';
		html += '<div class="trans_icon">' + icon('trash', 'Delete', "$P().ee_delete_row('"+dom_id_prefix+"','"+id+"')", "Remove Filter") + '</div>';
		html += '<div class="trans_icon">' + icon('arrow_up.png', 'Up', "$P().ee_move_row('"+dom_id_prefix+"','"+id+"',-1)", "Move Up") + '</div>';
		html += '<div class="trans_icon">' + icon('arrow_down.png', 'Down', "$P().ee_move_row('"+dom_id_prefix+"','"+id+"',1)", "Move Down") + '</div>';
		html += '<div class="trans_icon">' + icon('arrow_undo.png', 'Reset', "$P().ee_reset_row('"+dom_id_prefix+"','"+id+"')", "Reset") + '</div>';
		html += '<div class="trans_icon"><input type="checkbox" id="'+prefix+'_enabled" value="1" ' + ((transform.Enabled == 1) ? 'checked="checked"' : '') + ' onClick="$P().set_transform_enabled(\''+id+'\',this.checked)"/><label for="'+prefix+'_enabled">Enabled</label></div>';
		html += '<div class="clear"></div>';
		
		html += '<table>';
		
		var new_sliders = [];
		
		var param_defs = always_array( trans_def.Param );
		for (var idx = 0, len = param_defs.length; idx < len; idx++) {
			var param_def = param_defs[idx];
			var p_dom_id = prefix + '_' + param_def.Name;
			var value = transform[ param_def.Name ];
			if ((typeof(value) == 'undefined') && (typeof(param_def.Default) != 'undefined')) value = param_def.Default;
			html += '<tr>';
			
			switch (param_def.Control) {
				case 'Menu':
					html += '<td align="right" class="fe_label">' + param_def.Title + ':&nbsp;</td>';
					html += '<td align="left">' + menu(p_dom_id, param_def.Items.split(/\,\s*/), value, {
						'class': 'fe_small_menu',
						'onChange': "$P().update_preview()"
					}) + '</td>';
					break;
				
				case 'Slider':
					var txt_size = Math.max( param_def.Low.toString().length, param_def.High.toString().length ) + 1;
					if (param_def.Constrain != 'Integer') txt_size += 3; // allow for decimal + 2 spaces
					var high = parseInt( param_def.High, 10 );
					var low = parseInt( param_def.Low, 10 );
					html += '<td align="right" class="fe_label">' + param_def.Title + ':&nbsp;</td>';
					html += '<td align="left">';
						html += '<table cellspacing="0" cellpadding="0"><tr>';
							html += '<td><div id="'+p_dom_id+'_slider" style="width:250px; height:16px;"></div></td>';
							html += '<td>' + spacer(8,1) + '</td>';
							html += '<td><input type="text" id="'+p_dom_id+'" class="fe_small" size="'+txt_size+'" maxlength="'+txt_size+'" value="'+value+'"/></td>';
						html += '</tr></table>';
					html += '</td>';
					new_sliders.push({
						_transform_id: id,
						id: p_dom_id + '_slider',
						direction: 'horiz',
						pos: value - low,
						max: high - low,
						offset: low,
						allowFloatPos: (param_def.Constrain != 'Integer'),
						onChange: function() { $P().update_preview(); }
					});
					break;
				
				case 'Checkbox':
					html += '<td align="left" colspan="2"><input type="checkbox" id="'+p_dom_id+'" value="1" '+((value == 1) ? 'checked="checked"' : '')+' onClick="$P().update_preview()" />';
					html += '<label for="'+p_dom_id+'">'+param_def.Title+'</label></td>';
					break;
				
				case 'ColorPicker':
					html += '<td align="right" class="fe_label">' + param_def.Title + ':&nbsp;</td>';
					html += '<td align="left">';
						html += '<input type=hidden id="'+p_dom_id+'" value="'+escape_text_field_value(value)+'"/>';
						html += '<table cellspacing="0" cellpadding="0"><tr>';
						html += '<td id="'+p_dom_id+'_clr">' + get_color_preview(value) + '</td>';
						html += '<td>' + spacer(10,1) + '</td>';
						html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P().do_choose_color('"+p_dom_id+"')") + 
							'<div class="clear"></div></td>';
						html += '</tr></table>';
					html += '</td>';
					break;
				
				case 'AssetPicker':
					html += '<td align="right" class="fe_label">' + param_def.Title + ':&nbsp;</td>';
					html += '<td align="left">';
						html += '<input type=hidden id="'+p_dom_id+'" value="'+escape_text_field_value(value)+'"/>';
						html += '<table cellspacing="0" cellpadding="0"><tr>';
						html += '<td id="'+p_dom_id+'_asset">' + this.get_asset_preview(value) + '</td>';
						html += '<td>' + spacer(10,1) + '</td>';
						html += '<td style="font-size:11px">' + large_icon_button('page_white_magnify.png', "Select Image...", "$P().do_choose_image('"+p_dom_id+"')") + 
							'<div class="clear"></div></td>';
						html += '</tr></table>';
					html += '</td>';
					break;
			} // switch param.Control
			
			html += '</tr>';
		} // foreach trans param
		
		html += '</table>';
		
		html += '</div>';
		
		var self = this;
		setTimeout( function() {
			for (var idx = 0, len = new_sliders.length; idx < len; idx++) {
				var slider = new_sliders[idx];
				self.sliders.push( new Slider( slider.id, slider ) );
			}
		}, 1 );
		
		return html;
	},
	
	set_transform_enabled: function(id, enabled) {
		// enable or disable transform
		var transform = find_object( this.transforms, { _id: id } );
		assert(!!transform, "Could not find transform: " + id);
		
		transform.Enabled = enabled ? 1 : 0;
		
		this.update_preview();
	},
	
	get_asset_preview: function(path) {
		// show preview for asset
		if (path) return asset_icon_link(this.game_id, path, '', 180);
		else return '<span style="color:#888;">(None)</span>';
	},
	
	do_choose_image: function(dom_id) {
		// choose image asset
		this._temp_asset_id = dom_id;
		dasset.choose("Select Image", this.game_id, session.imageResourceMatchString, $(dom_id).value, [this, 'choose_image_finish'], '');
	},
	
	choose_image_finish: function(path) {
		// finish choosing image asset
		$(this._temp_asset_id).value = path;
		$(this._temp_asset_id + '_asset').innerHTML = this.get_asset_preview(path);
		delete this._temp_asset_id;
		this.update_preview();
	},
	
	do_choose_color: function(dom_id) {
		// choose color
		this._temp_clr_id = dom_id;
		do_select_color($(dom_id).value, [this, 'do_choose_color_finish']);
	},
	
	do_choose_color_finish: function(hex) {
		// finish choosing color
		$(this._temp_clr_id).value = hex;
		$(this._temp_clr_id + '_clr').innerHTML = get_color_preview(hex);
		delete this._temp_clr_id;
		this.update_preview();
	},
	
	ee_add_transform: function(dom_id_prefix) {
		// add new transform to editor
		if (this.transforms.length >= 8) {
			return do_message('error', "Sorry, only 8 filters are allowed on a single environment.  Give our servers a break!");
		}
		
		var container = $('d_' + dom_id_prefix);
		var transforms = this.transforms;
		
		var transform = {
			Name: get_menu_value('fe_ee_new_transform'),
			Enabled: 1
		};

		var id = get_unique_id();

		var div = document.createElement('div');
		div.id = dom_id_prefix + '_' + id;
		div.setAttribute('id', dom_id_prefix + '_' + id);
		div.innerHTML = this.ee_get_transform_html(dom_id_prefix, id, transform);
		container.appendChild(div);

		transform._id = id;
		transforms.push( transform );
		
		setTimeout( function() {
			$P().update_preview();
		}, 1 );
	},

	ee_delete_row: function(dom_id_prefix, id) {
		// delete row
		var prefix = dom_id_prefix + '_' + id;
		var container = $('d_' + dom_id_prefix);
		var transforms = this.transforms;

		var transform = find_object( transforms, { _id: id } );
		assert(!!transform, "Could not find transform: " + id);

		var transform_idx = find_object_idx( transforms, { _id: id } );
		assert(transform_idx > -1, "Could not find transform: " + id);

		transforms.splice( transform_idx, 1 );
		
		// remove any sliders for this transform
		delete_objects(this.sliders, { _transform_id: id });
		
		try { container.removeChild( document.getElementById(prefix) ); }
		catch (e) { alert("Could not remove child: " + id); }
		
		this.update_preview();
	},
	
	ee_move_row: function(dom_id_prefix, id, dir) {
		// move transform up or down in the list
		// requires complete redraw
		var prefix = dom_id_prefix + '_' + id;
		var container = $('d_' + dom_id_prefix);
		var transforms = this.transforms;

		var transform = find_object( transforms, { _id: id } );
		assert(!!transform, "Could not find transform: " + id);

		var transform_idx = find_object_idx( transforms, { _id: id } );
		assert(transform_idx > -1, "Could not find transform: " + id);
		
		if ((dir == 1) && (transform_idx == transforms.length - 1)) return; // already at bottom
		if ((dir == -1) && (transform_idx == 0)) return; // already at top
		
		if (!this.ee_transform_update_all()) return;
		
		var new_idx = transform_idx + dir;
		var temp = transforms[transform_idx];
		transforms[transform_idx] = transforms[new_idx];
		transforms[new_idx] = temp;
		
		$('d_ee_trans_editor').innerHTML = this.render_transform_editor( transforms );
	},
	
	ee_reset_row: function(dom_id_prefix, id) {
		// reset transform to its defaults
		var prefix = dom_id_prefix + '_' + id;
		var transforms = this.transforms;

		var transform = find_object( transforms, { _id: id } );
		assert(!!transform, "Could not find transform: " + id);

		var trans_def = find_object( config.EnvTransformDefs.Transform, { Plugin: transform.Name } );
		assert(!!trans_def, "Could not find transform definition: " + transform.Name );
		
		var param_defs = always_array( trans_def.Param );
		for (var idx = 0, len = param_defs.length; idx < len; idx++) {
			var param_def = param_defs[idx];
			var p_dom_id = prefix + '_' + param_def.Name;
			
			switch (param_def.Control) {
				case 'Menu':
					if (param_def.Default) set_menu_value(p_dom_id, param_def.Default);
					else $(p_dom_id).selectedIndex = 0;
					break;

				case 'Slider':
					$(p_dom_id).value = param_def.Default;
					$(p_dom_id).onchange();
					break;

				case 'Checkbox':
					$(p_dom_id).checked = (param_def.Default == 1);
					break;

				case 'ColorPicker':
					$(p_dom_id).value = param_def.Default;
					$(p_dom_id+'_clr').innerHTML = get_color_preview(param_def.Default);
					break;

				case 'AssetPicker':
					$(p_dom_id).value = '';
					$(p_dom_id+'_asset').innerHTML = this.get_asset_preview('');
					break;
			} // switch param.Control
		}
		
		this.update_preview();
	},
	
	ee_transform_update_all: function() {
		// update all transforms from their DOM fields
		var dom_id_prefix = 'ee_transforms';
		clear_field_error();
		var transforms = this.transforms;
		
		for (var idx = 0, len = transforms.length; idx < len; idx++) {
			var transform = transforms[idx];
			var id = transform._id;
			var prefix = dom_id_prefix + '_' + id;
			var trans_def = find_object( config.EnvTransformDefs.Transform, { Plugin: transform.Name } );
			
			var param_defs = always_array( trans_def.Param );
			for (var idy = 0, ley = param_defs.length; idy < ley; idy++) {
				var param_def = param_defs[idy];
				var p_dom_id = prefix + '_' + param_def.Name;
				var p_name = param_def.Name;
				
				switch (param_def.Control) {
					case 'Menu':
						transform[p_name] = get_menu_value(p_dom_id);
						break;

					case 'Slider':
						transform[p_name] = trim( $(p_dom_id).value );
						break;

					case 'Checkbox':
						transform[p_name] = $(p_dom_id).checked ? 1 : 0;
						break;

					case 'ColorPicker':
						transform[p_name] = $(p_dom_id).value;
						break;

					case 'AssetPicker':
						transform[p_name] = $(p_dom_id).value;
						break;
				} // switch param.Control
			} // foreach trans param
			
		} // foreach transform

		return true;
	},
	
	save: function() {
		// save env changes, or add new env
		clear_field_error();
		
		var env = {
			Name: trim($('fe_ee_id').value)
		};
		
		// text field validation
		if (!env.Name) return bad_field('fe_ee_id', "Please enter an Environment ID.");
		
		if (!env.Name.length) return bad_field('fe_ee_id', "You must enter an ID for your environment.");
		if (env.Name.length > 32) return bad_field('fe_ee_id', "Your Environment ID is too long.  Please keep it to 32 characters or less.");
		if ((env.Name == 0) || !env.Name.match($R.GameObjectID)) return bad_field('fe_ee_id', "Your Environment ID is invalid.  Please use only alphanumerics, dashes and periods, and begin and end with an alpha character.");
		
		// transfoms
		if (!this.ee_transform_update_all()) return;
		env.Transforms = { Transform: deep_copy_object(this.transforms) };
		
		for (var idx = 0, len = env.Transforms.Transform.length; idx < len; idx++) {
			delete env.Transforms.Transform[idx]._id;
		}
		
		// exclusions
		var excludes = [];
		re_update_all('fe_ee_exclusions');
		array_cat( excludes, re_get_all('fe_ee_exclusions') );
		env.Excludes = { Exclude: excludes };
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.env) {
			// update existing env
			effect_api_send('game_update_object', merge_objects(env, {
				GameID: this.game_id,
				OldName: this.env.Name,
				Type: 'env'
			}), [this, 'save_finish'], { _env: env });
		}
		else {
			// create new env
			effect_api_send('game_create_object', merge_objects(env, {
				GameID: this.game_id,
				Type: 'env'
			}), [this, 'save_finish'], { _env: env });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.env) {
			// updated existing env
			Nav.go('#GameLevels/' + this.game_id);
			do_message('success', "Saved environment \""+tx._env.Name+"\".");
			this.env = tx._env;
		}
		else {
			// created new env
			Nav.go('#GameLevels/' + this.game_id);
			do_message('success', "Created new environment \""+tx._env.Name+"\".");
			this.env = tx._env;
		}
	}
	
} );
