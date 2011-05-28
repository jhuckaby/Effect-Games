// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameEditSprite", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_sprite_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_sprite_tab_bar"></div>';
		
		html += '<div id="d_game_edit_sprite_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameObjects/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_sprite_content').innerHTML = loading_image();
		
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
		$('h_game_edit_sprite_header').innerHTML = '';
		$('d_game_edit_sprite_tab_bar').innerHTML = '';
		$('d_game_edit_sprite_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_sprite_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Objects');
		
		$('h_game_edit_sprite_header').innerHTML = fit_game_title(this.game.Title);
		
		this.envs = [];
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			envs: 1
		}, [this, 'receive_envs'], {});
	},
	
	receive_envs: function(response, tx) {
		if (response.Envs && response.Envs.Env) {
			this.envs = sort_array( always_array( response.Envs.Env ), { sort_by: 'Name', sort_dir: 1 } );
		}
		
		if (this.args.sprite_id) {
			this.do_edit_sprite(this.args.sprite_id);
		}
		else {
			// create new sprite
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameObjects/' + this.game.GameID, 'Objects'],
				[Nav.currentAnchor(), 'New Sprite Class']
			);

			Nav.title( 'New Sprite Class | ' + this.game.Title );

			this.sprite = null;
			this.draw_sprite_form( merge_objects({ Preload: 1 }, {}) );
		}
	},
	
	do_edit_sprite: function(sprite_id) {
		// edit existing sprite
		if (this.sprite && (this.sprite.Name == sprite_id)) {
			// sprite already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_sprite_2();
		}
		else {
			// load sprite from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'sprite',
				id: sprite_id
			}, [this, 'do_edit_sprite_2'], {});
		}
	},
	
	do_edit_sprite_2: function(response) {
		// edit existing sprite
		if (response) {
			this.sprite = response.Item;
		}
		var title = 'Editing Sprite Class "'+this.sprite.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameObjects/' + this.game.GameID, 'Objects'],
			[Nav.currentAnchor(), 'Edit Sprite Class']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_sprite_form( this.sprite );
	},
	
	draw_sprite_form: function(sprite) {
		var html = '';
		
		html += '<div class="blurb">' + get_string('/GameEditSprite/Blurb') + '</div>';
		
		if (sprite.Name) html += '<h1>Editing Sprite Class "'+sprite.Name+'"</h1>';
		else html += '<h1>Create New Sprite Class</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// sprite name
		html += '<tr><td align=right class="fe_label_left">Class&nbsp;Name:*</td>';
		html += '<td align=left><input type=text id="fe_es_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(sprite.Name)+'"/></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a name for your sprite.  This must match the class name of the sprite object when you define it in your game code.  Alphanumerics and periods only. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// preload
		html += '<tr><td align=right class="fe_label_left">Preload:</td>';
		html += '<td align=left><input type=checkbox id="fe_es_preload" value="1" ' + ((sprite.Preload == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_es_preload">Preload Resources at Game Startup</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like your sprite\'s resources automatically loaded at game startup, or loaded on-demand. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// place on levels
		html += '<tr><td align=right class="fe_label_left">Place:</td>';
		html += '<td align=left><input type=checkbox id="fe_es_place" onChange="$P(\'GameEditSprite\').set_place_options(this.checked)" value="1" ' + 
			((sprite.Place == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_es_place">Place Sprite in Level Editor</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether this sprite can be placed directly into levels or not.  This activates a new section below, allowing you to configure how the sprite will be displayed and customized in the Level Editor. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// level editor options
		html += '<tr><td colspan=2><div id="d_game_edit_sprite_place_opts" style="margin-bottom:20px; display:' + 
			((sprite.Place == 1) ? 'block' : 'none') + ';">';
		html += '<fieldset><legend>Level Editor Options</legend>';
			html += '<div class="caption" style="margin-bottom:15px;">To place a sprite into levels, we need to know the pixel size.  You can also include an icon if you want, using an asset path.  Properties are editable key/value pairs which you can set on sprites in Level Editor, and are then saved with each sprite instance.</div>';
			
			html += '<div style="margin-left:30px;"><table>';
			html += '<tr><td align=right class="fe_label">Sprite&nbsp;Size:*</td>';
			html += '<td rowspan="3">' + spacer(6,1) + '</td>';
			html += '<td><input type=text class="fe_small" id="fe_es_width" size=5 value="'+escape_text_field_value(sprite.Width)+'"/>&nbsp;x&nbsp;<input type=text class="fe_small" id="fe_es_height" size=5 value="'+escape_text_field_value(sprite.Height)+'"/>&nbsp;(pixels)</td></tr>';
			
			html += '<tr><td align=right class="fe_label">Persistence:</td><td height="30"><input type=checkbox id="fe_es_persist" value="1" ';
			if (sprite.Persist == 1) html += 'checked="checked"';
			html += '/><label for="fe_es_persist">Always Active</label></td></tr>';
			
			// html += '<tr><td align=right class="fe_label">Icon&nbsp;Asset:</td><td><input type=text id="fe_es_icon" size=30 value="'+escape_text_field_value(sprite.Icon)+'"/></td>';
			
			// html += '<tr><td align=right class="fe_label">Icon&nbsp;Asset:</td><td>' + 
			// 	tiptext_field('fe_es_icon', '', {'size':'30'}, {}, sprite.Icon, "Asset Path") + '</td>';
				
			// html += '<td style="font-size:11px;">' + icon('page_white_paste.png', '<b>Paste Link</b>', "$P('GameEditSprite').paste_from_assetmgr('fe_es_icon')") + '</td></tr>';
			
			html += '<tr><td align=right class="fe_label">Icon&nbsp;Preview:</td><td>';
				html += '<input type=hidden id="fe_es_icon" value="'+escape_text_field_value(sprite.Icon)+'"/>';
				
				html += '<div id="d_es_icon">';
				html += sprite.Icon ? this.render_sprite_icon(sprite.Icon) : this.render_sprite_icon_button();
				html += '</div>';
				
			html += '</td></tr>';
			html += '</table></div>';
			
			html += spacer(1,15) + '<br/>';
			// html += '<hr width="75%"/>';
			html += render_prop_editor('fe_es_props', (sprite.Properties && sprite.Properties.Property) ? always_array(sprite.Properties.Property) : []);
		html += '</fieldset>';
		html += '</div></td></tr>';
		
		// prerequisites
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Sprite Dependencies</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">If this sprite requires others to be loaded, add them here.  For example, if this sprite creates others that are not preloaded, they must be listed here as prerequisites.  See the <a href="#Article/docs/Sprites_and_Tiles_Guide" target="_blank">Sprites and Tiles Guide</a> for details.</div>';
			html += spreq.render_sprite_req_editor('fe_es_reqs', {
				game_id: this.game_id,
				reqs: (sprite.Requires && sprite.Requires.Require) ? always_array(sprite.Requires.Require) : []
			});
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// resources
		var env_items = [ ['','(None)'] ];
		for (var idx = 0, len = this.envs.length; idx < len; idx++) {
			env_items.push( this.envs[idx].Name );
		}
		
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Sprite Resources</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can add resources that are required by your sprite, including images, sounds, videos, and XML files.  These will be automatically loaded with the sprite, either at startup or on-demand.  See the <a href="#Article/docs/Sprites_and_Tiles_Guide" target="_blank">Sprites and Tiles Guide</a> for more on image transforms.</div>';
			html += render_resource_editor('fe_es_res', {
				resources: (sprite.Resources && sprite.Resources.Resource) ? always_array(sprite.Resources.Resource) : [],
				file_reg_exp: config.ResourceRegExp,
				file_error: "Please add only supported file formats (JPEGs, PNGs, GIFs, MP3s and XMLs) to the Resources list.",
				// path_tip: 'Image Asset Path',
				add_button: 'Add Resources...',
				dlg_title: 'Select Resources',
				/* extra_menu: {
					file_reg_exp: session.imageResourceMatchString,
					title: 'Transform:',
					id: 'Filter',
					items: [['','(None)'], ['scale', 'Scale'], ['rotate','Rotation'], ['rotate_pad','Rotation + Padding'], ['fliph','Mirror Horiz'], ['flipv','Mirror Vert'], ['fliphv','Mirror Horiz + Vert']]
				}, */
				csv_menus: {
					id: 'Filter',
					file_reg_exp: session.imageResourceMatchString,
					menus: [
						{
							title: 'Transform:',
							items: [['','(None)'], ['scale', 'Scale'], ['rotate','Rotation'], ['rotate_pad','Rotation + Padding'], ['fliph','Mirror Horiz'], ['flipv','Mirror Vert'], ['fliphv','Mirror Horiz + Vert']]
						},
						{
							title: 'Filter:',
							items: env_items,
							prefix: 'env:'
						}
					]
				},
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
			if (sprite.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('cog_edit.png', '<b>Save Changes</b>', "$P('GameEditSprite').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('cog_add.png', '<b>Create Sprite Class</b>', "$P('GameEditSprite').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_sprite_content').innerHTML = html;
		
		if (!sprite.Name) safe_focus('fe_es_id');
	},
	
	/* paste_from_assetmgr: function(dom_id) {
		// paste link copied from asset manager
		if (window.assetmgr && window.assetmgr.clip_contents) {
			// $(dom_id).value = window.assetmgr.clip_contents;
			tiptext_set(dom_id, window.assetmgr.clip_contents);
		}
		else {
			do_message('error', "You have not copied a link from Asset Manager yet.");
		}
	}, */
	
	set_place_options: function(checked) {
		$('d_game_edit_sprite_place_opts').style.display = checked ? 'block' : 'none';
	},
	
	render_sprite_icon: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameEditSprite').remove_icon_asset()", "Remove Icon") + '</td>';
		html += '<td id="td_es_icon" width="200">' + asset_icon_link(this.game_id, path, '', 180) + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_sprite_icon_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('page_white_magnify.png', "Select Icon...", "$P('GameEditSprite').choose_icon_asset()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_icon_asset: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Icon Preview", this.game_id, session.imageResourceMatchString, $('fe_es_icon').value, [this, 'choose_icon_asset_finish'], '');
	},
	
	choose_icon_asset_finish: function(path) {
		$('fe_es_icon').value = path;
		$('d_es_icon').innerHTML = this.render_sprite_icon(path);
	},
	
	remove_icon_asset: function() {
		$('fe_es_icon').value = '';
		// $('td_es_icon').innerHTML = code_link("$P('GameEditSprite').choose_icon_asset()", '<b>Select Icon...</b>');
		$('d_es_icon').innerHTML = this.render_sprite_icon_button();
	},
	
	save: function() {
		// save sprite changes, or add new sprite
		clear_field_error();
		
		var sprite = {
			Name: trim($('fe_es_id').value),
			Preload: $('fe_es_preload').checked ? '1' : '0',
			Place: $('fe_es_place').checked ? '1' : '0',
			Width: trim($('fe_es_width').value),
			Height: trim($('fe_es_height').value),
			Persist: $('fe_es_persist').checked ? '1' : '0',
			Icon: $('fe_es_icon').value
		};
				
		// text field validation
		if (!sprite.Name) return bad_field('fe_es_id', "Please enter a Sprite Class Name.");
		if (!sprite.Name.match($R.GameObjectID)) return bad_field('fe_es_id', "Your Sprite Class Name is invalid.  Please use only alphanumerics, dashes and dots, 2 characters minimum, and begin and end with an alpha char.");
		if (!check_reserved_word(sprite.Name)) return bad_field('fe_es_id', "Your Sprite Class Name is a reserved word.  Please choose another.");
		if (sprite.Name.length > 32) return bad_field('fe_es_id', "Your Sprite Class Name is too long.  Please keep it to 32 characters or less.");
		
		if (sprite.Place == 1) {
			if (!sprite.Width) return bad_field('fe_es_width', "Please enter a Sprite Width, in pixels.");
			if (!sprite.Width.match(/^\d+$/)) return bad_field('fe_es_width', "Your Sprite Width must be an integer.");
			if (!sprite.Height) return bad_field('fe_es_height', "Please enter a Sprite Height, in pixels.");
			if (!sprite.Height.match(/^\d+$/)) return bad_field('fe_es_height', "Your Sprite Height must be an integer.");
			
			var sprite_width = parseInt( sprite.Width, 10 );
			var sprite_height = parseInt( sprite.Height, 10 );
			
			if (sprite_width < 8) return bad_field('fe_es_width', "Sprites must be at least 8x8 pixels to be placed into the Level Editor.");
			if (sprite_height < 8) return bad_field('fe_es_height', "Sprites must be at least 8x8 pixels to be placed into the Level Editor.");
			
			if (sprite_width > parseInt(this.game.PortWidth, 10)) return bad_field('fe_es_width', "Sprites cannot be larger than your main game display ("+this.game.PortWidth+'x'+this.game.PortHeight+"), to be placed into the Level Editor.");
			if (sprite_height > parseInt(this.game.PortHeight, 10)) return bad_field('fe_es_height', "Sprites cannot be larger than your main game display ("+this.game.PortWidth+'x'+this.game.PortHeight+"), to be placed into the Level Editor.");
		}
		else {
			sprite.Width = '';
			sprite.Height = '';
			sprite.Icon = '';
			sprite.Persist = '0';
		}
		
		// properties
		if (!pe_prop_update_all('fe_es_props')) return;
		var props = pe_get_all_props('fe_es_props');
		sprite.Properties = { Property: props };
		
		// prerequisites
		var reqs = spreq.get_all('fe_es_reqs');
		sprite.Requires = { Require: reqs };
		
		// resources
		var resources = [];
		re_update_all('fe_es_res');
		array_cat( resources, re_get_all('fe_es_res') );
		
		sprite.Resources = { Resource: resources };
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.sprite) {
			// update existing sprite
			effect_api_send('game_update_object', merge_objects(sprite, {
				GameID: this.game_id,
				OldName: this.sprite.Name,
				Type: 'sprite'
			}), [this, 'save_finish'], { _sprite: sprite });
		}
		else {
			// create new sprite
			effect_api_send('game_create_object', merge_objects(sprite, {
				GameID: this.game_id,
				Type: 'sprite'
			}), [this, 'save_finish'], { _sprite: sprite });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.sprite) {
			// updated existing sprite
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Saved sprite class \""+tx._sprite.Name+"\".");
			
			// extra warning if sprite name has changed, and Place is set
			if ((tx._sprite.Place == 1) && (tx._sprite.Name != this.sprite.Name)) {
				do_message('warning', "Please make sure to edit all the level maps that use this sprite, to insure the new name gets updated.");
			}
			
			this.sprite = tx._sprite;
		}
		else {
			// created new sprite
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Created new sprite class \""+tx._sprite.Name+"\".");
			this.sprite = tx._sprite;
		}
	}
} );
