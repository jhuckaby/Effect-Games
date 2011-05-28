// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameEditTile", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_tile_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_tile_tab_bar"></div>';
		
		html += '<div id="d_game_edit_tile_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameObjects/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_tile_content').innerHTML = loading_image();
		
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
		$('h_game_edit_tile_header').innerHTML = '';
		$('d_game_edit_tile_tab_bar').innerHTML = '';
		$('d_game_edit_tile_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_tile_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Objects');
		
		$('h_game_edit_tile_header').innerHTML = fit_game_title(this.game.Title);
				
		if (this.args.tile_id) {
			this.do_edit_tile(this.args.tile_id);
		}
		else {
			// create new tile
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameObjects/' + this.game.GameID, 'Objects'],
				[Nav.currentAnchor(), 'New Tile Class']
			);

			Nav.title( 'New Tile Class | ' + this.game.Title );

			this.tile = null;
			this.draw_tile_form( merge_objects({ }, this.args) );
		}
	},
	
	do_edit_tile: function(tile_id) {
		// edit existing tile
		if (this.tile && (this.tile.Name == tile_id)) {
			// tile already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_tile_2();
		}
		else {
			// load tile from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'tile',
				id: tile_id
			}, [this, 'do_edit_tile_2'], {});
		}
	},
	
	do_edit_tile_2: function(response) {
		// edit existing tile
		if (response) {
			this.tile = response.Item;
		}
		var title = 'Editing Tile Class "'+this.tile.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameObjects/' + this.game.GameID, 'Objects'],
			[Nav.currentAnchor(), 'Edit Tile Class']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_tile_form( this.tile );
	},
	
	draw_tile_form: function(tile) {
		var html = '';
		
		html += '<div class="blurb">' + get_string('/GameEditTile/Blurb') + '</div>';
		
		if (tile.Name) html += '<h1>Editing Tile Class "'+tile.Name+'"</h1>';
		else html += '<h1>Create New Tile Class</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// tile name
		html += '<tr><td align=right class="fe_label_left">Class&nbsp;Name:*</td>';
		html += '<td align=left><input type=text id="fe_et_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(tile.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a name for your tile class.  This must match the name of the class when you define it in your game code.  Alphanumerics and periods only. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// icon
		html += '<tr><td align=right class="fe_label_left">Icon&nbsp;Preview:</td><td>';
		html += '<input type=hidden id="fe_et_icon" value="'+escape_text_field_value(tile.Icon)+'"/>';
		html += '<div id="d_et_icon">';
		html += tile.Icon ? this.render_tile_icon(tile.Icon) : this.render_tile_icon_button();
		html += '</div>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> The Icon Preview simply controls how the tile object will appear in the Level Editor when it is attached to a tile.  The class name is also shown, so this is optional. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		// properties
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Properties</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Properties are editable key/value pairs which you can set on tiles in Level Editor, and are then saved with each tile instance.</div>';
			html += render_prop_editor('fe_et_props', (tile.Properties && tile.Properties.Property) ? always_array(tile.Properties.Property) : []);
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// prerequisites
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Sprite Dependencies</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">If this tile requires sprite classes to be loaded, add them here.  For example, if this object creates sprites that are not preloaded, they must be listed here as prerequisites.  See the <a href="#Article/docs/Sprites_and_Tiles_Guide" target="_blank">Sprites and Tiles Guide</a> for details.</div>';
			html += spreq.render_sprite_req_editor('fe_et_reqs', {
				game_id: this.game_id,
				reqs: (tile.Requires && tile.Requires.Require) ? always_array(tile.Requires.Require) : []
			});
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// resources
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Tile Resources</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can add resources that are required by your tile, including images, sounds, videos, and XML files.  These will be automatically loaded with the tile, either at startup or on-demand.  See the <a href="#Article/docs/Sprites_and_Tiles_Guide" target="_blank">Sprites and Tiles Guide</a> for more.</div>';
			html += render_resource_editor('fe_et_res', {
				resources: (tile.Resources && tile.Resources.Resource) ? always_array(tile.Resources.Resource) : [],
				file_reg_exp: config.ResourceRegExp,
				file_error: "Please add only supported file formats (JPEGs, PNGs, GIFs, MP3s and XMLs) to the Resources list.",
				// path_tip: 'Image Asset Path',
				add_button: 'Add Resources...',
				dlg_title: 'Select Resources',
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
			if (tile.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('brick_edit.png', '<b>Save Changes</b>', "$P('GameEditTile').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('brick_add.png', '<b>Create Tile Class</b>', "$P('GameEditTile').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_tile_content').innerHTML = html;
		
		if (!tile.Name) safe_focus('fe_et_id');
	},
	
	render_tile_icon: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameEditTile').remove_icon_asset()", "Remove Icon") + '</td>';
		html += '<td id="td_et_icon" width="200">' + asset_icon_link(this.game_id, path, '', 180) + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_tile_icon_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('page_white_magnify.png', "Select Icon...", "$P('GameEditTile').choose_icon_asset()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_icon_asset: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Icon Preview", this.game_id, session.imageResourceMatchString, $('fe_et_icon').value, [this, 'choose_icon_asset_finish'], '');
	},
	
	choose_icon_asset_finish: function(path) {
		$('fe_et_icon').value = path;
		$('d_et_icon').innerHTML = this.render_tile_icon(path);
	},
	
	remove_icon_asset: function() {
		$('fe_et_icon').value = '';
		// $('td_es_icon').innerHTML = code_link("$P('GameEditTile').choose_icon_asset()", '<b>Select Icon...</b>');
		$('d_et_icon').innerHTML = this.render_tile_icon_button();
	},
	
	save: function() {
		// save tile changes, or add new tile
		clear_field_error();
		
		var tile = {
			Name: trim($('fe_et_id').value),
			Icon: $('fe_et_icon').value
		};
		
		// text field validation
		if (!tile.Name) return bad_field('fe_et_id', "Please enter a Tile Class Name.");
		if (!tile.Name.match($R.GameObjectID)) return bad_field('fe_et_id', "Your Tile Class Name is invalid.  Please use only alphanumerics and periods, 2 characters minimum, and begin and end with an alpha char.");
		if (!check_reserved_word(tile.Name)) return bad_field('fe_et_id', "Your Tile Class Name is a reserved word.  Please choose another.");
		if (tile.Name.length > 32) return bad_field('fe_et_id', "Your Tile Class Name is too long.  Please keep it to 32 characters or less.");
		
		// properties
		if (!pe_prop_update_all('fe_et_props')) return;
		var props = pe_get_all_props('fe_et_props');
		tile.Properties = { Property: props };
		
		// prerequisites
		var reqs = spreq.get_all('fe_et_reqs');
		tile.Requires = { Require: reqs };
		
		// resources
		var resources = [];
		re_update_all('fe_et_res');
		array_cat( resources, re_get_all('fe_et_res') );
		tile.Resources = { Resource: resources };
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.tile) {
			// update existing tile
			effect_api_send('game_update_object', merge_objects(tile, {
				GameID: this.game_id,
				OldName: this.tile.Name,
				Type: 'tile'
			}), [this, 'save_finish'], { _tile: tile });
		}
		else {
			// create new tile
			effect_api_send('game_create_object', merge_objects(tile, {
				GameID: this.game_id,
				Type: 'tile'
			}), [this, 'save_finish'], { _tile: tile });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.tile) {
			// updated existing tile
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Saved tile class \""+tx._tile.Name+"\".");
			
			// extra warning if tile name has changed
			if (tx._tile.Name != this.tile.Name) {
				do_message('warning', "Please make sure to edit all the level maps that use this tile class, to insure the new name gets updated.");
			}
			
			this.tile = tx._tile;
		}
		else {
			// created new tile
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Created new tile class \""+tx._tile.Name+"\".");
			this.tile = tx._tile;
		}
	}
} );
