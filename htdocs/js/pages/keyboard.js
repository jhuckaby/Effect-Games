// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameKeys", {
	
	first_activation: true,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		var html = '<h1 id="h_game_keys_header">Loading...</h1>';
		
		html += '<div id="d_game_keys_tab_bar"></div>';
		
		html += '<div id="d_game_keys_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameKeys/Blurb') + '</div>';
		
		// keys resources
		html += '<div class="h1">';
			html += '<div id="d_game_keys_header" class="fl">';
				html += ''; // Game Keys Resources
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_keys_add_key_link" class="icon add_key" href="#GameEditKey" title="Add Key Definition">Add Key Definition</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_keys">'+busy()+'</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_keys').innerHTML = loading_image();
				
		if (1 || this.first_activation) {
			// see if game is already loaded via game page
			var gpage = page_manager.find('Game');
			if (gpage && gpage.game && (gpage.game.GameID == game_id)) {
				this.game = gpage.game;
				this.game_id = gpage.game.GameID;
				this.receive_game();
			}
			else {
				// game not loaded or switched, load again
				effect_api_get('game_get', { 
					id: game_id
				}, [this, 'receive_game'], {});
			}
			
			this.first_activation = false;
		} // first actication
		else {
			this.receive_game();
		}
		
		show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('h_game_keys_header').innerHTML = '';
		$('d_game_keys_tab_bar').innerHTML = '';
		$('d_game_keys').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Keyboard Controls | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Keyboard Controls']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_keys_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Keyboard');
		
		$('h_game_keys_header').innerHTML = fit_game_title(this.game.Title);
		
		$('a_game_keys_add_key_link').setAttribute('href', '#GameEditKey?game_id=' + this.game_id );
		$('a_game_keys_add_key_link').href = '#GameEditKey?game_id=' + this.game_id;
				
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			keys: 1
		}, [this, 'receive_keys'], {});
	},
	
	receive_keys: function(response, tx) {
		// keys
		var html = '';
		if (response.Keys && response.Keys.Key) {
			var keys = this.keys = always_array( response.Keys.Key );
			html += '<table class="data_table">';
			html += '<tr><th>Control Name</th><th>Event ID</th><th>Keys</th><th>Actions</th></tr>';
			
			for (var idx = 0, len = keys.length; idx < len; idx++) {
				var keydef = keys[idx];
				html += '<tr>';
				
				var edit_link = '#GameEditKey?game_id=' + this.game_id + '&key_id=' + keydef.Name;
				
				html += '<td>' + icon('keyboard.png', '<b>' + ww_fit_string(keydef.Title, 200, session.em_width, 1) + '</b>', edit_link) + '</td>';
				html += '<td>' + ww_fit_string(keydef.Name, 200, session.em_width, 1) + '</td>';
				
				var codes = keydef.Codes.split(/\,\s*/);
				var nice_codes = [];
				for (var idy = 0, ley = codes.length; idy < ley; idy++) {
					nice_codes.push( get_nice_key_name(codes[idy]) );
				}
				html += '<td>' + nice_codes.join(', ') + '</td>';
				
				html += '<td><a href="'+edit_link+'">Edit</a> | ' + 
					code_link("$P('GameKeys').delete_key('"+keydef.Name+"')", "Delete") + '</td>';
				
				html += '</tr>';
			} // foreach key
			html += '</table>';
			
			$('d_game_keys_header').innerHTML = 'Key Definitions (' + keys.length + ')';
		} // we have keys
		else {
			$('d_game_keys_header').innerHTML = 'Key Definitions';
			html += 'No keys found.';
			this.keys = [];
		}
		$('d_game_keys').innerHTML = html;
	},
	
	delete_key: function(id) {
		// delete key def object
		if (confirm('Are you sure you want to delete the key definition "'+id+'"?')) {
			effect_api_mod_touch('game_objects_get');
			effect_api_send('game_delete_object', {
				GameID: this.game_id,
				Type: 'key',
				ID: id
			}, [this, 'delete_key_finish'], { _id: id });
		} // confirmed
	},
	
	delete_key_finish: function(response, tx) {
		// received response from server
		this.receive_keys(response, tx);
		do_message('success', 'Deleted the key definition "'+tx._id+'".');
	}
	
} );

Class.subclass( Effect.Page, "Effect.Page.GameEditKey", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_key_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_key_tab_bar"></div>';
		
		html += '<div id="d_game_edit_key_content" class="game_main_area">';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_key_content').innerHTML = loading_image();
		
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
		$('d_game_edit_key_tab_bar').innerHTML = '';
		$('h_game_edit_key_header').innerHTML = '';
		$('d_game_edit_key_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_key_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Keyboard');
		
		$('h_game_edit_key_header').innerHTML = fit_game_title(this.game.Title);
		
		var kpage = page_manager.find('GameKeys');
		if (kpage && kpage.game && (kpage.game.GameID == this.game_id) && kpage.keys) {
			this.keys = kpage.keys;
			this.receive_keys();
		}
		else {
			effect_api_get('game_objects_get', { 
				id: this.game_id,
				keys: 1
			}, [this, 'receive_keys'], {});
		}
	},
	
	receive_keys: function(response, tx) {
		if (response) {
			if (response.Keys && response.Keys.Key) {
				this.keys = always_array( response.Keys.Key );
			}
			else {
				this.keys = [];
			}
		}
		
		if (this.args.key_id) {
			this.do_edit_key(this.args.key_id);
		}
		else {
			// create new key
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameKeys/' + this.game.GameID, 'Keyboard'],
				[Nav.currentAnchor(), 'New Key Definition']
			);

			Nav.title( 'New Key Definition | ' + this.game.Title );

			this.key = null;
			this.draw_key_form( merge_objects({ }, this.args) );
		}
	},
	
	do_edit_key: function(key_id) {
		// edit existing key
		if (this.key && (this.key.Name == key_id)) {
			// key already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_key_2();
		}
		else {
			// load key from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'key',
				id: key_id
			}, [this, 'do_edit_key_2'], {});
		}
	},
	
	do_edit_key_2: function(response) {
		// edit existing key
		if (response) {
			this.key = response.Item;
		}
		var title = 'Editing Key Definition "'+this.key.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameKeys/' + this.game.GameID, 'Keyboard'],
			[Nav.currentAnchor(), 'Edit Key Definition']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_key_form( this.key );
	},
	
	draw_key_form: function(key) {
		var html = '';
		
		// html += '<div class="blurb">' + get_string('/GameEditKey/Blurb') + '</div>';
		
		if (key.Name) html += '<h1>Editing Key Definition "'+key.Name+'"</h1>';
		else html += '<h1>Create New Key Definition</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// key name
		html += '<tr><td align=right class="fe_label_left">Control&nbsp;Title:*</td>';
		html += '<td align=left><input type=text id="fe_kd_name" class="fe_medium" size="25" maxlength="64" value="'+escape_text_field_value(key.Title)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a name for this keyboard control.  This will be visible to players in the keyboard configuration dialog, so you may use upper- and lower-case alphanumerics, spaces and standard symbols.  Examples are "Move Left", "Jump" and "Shoot".</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// key id
		html += '<tr><td align=right class="fe_label_left">Event&nbsp;ID:*</td>';
		html += '<td align=left><input type=text id="fe_kd_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(key.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter an alphanumeric ID which will be passed to your code when player presses or releases any of the keys attached to this control.  This is so you can identify the event and act accordingly. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		// codes
		html += '<tr><td align=right class="fe_label_left">Keys:*</td>';
		html += '<td align=left>';
			html += '<input type="hidden" id="fe_kd_codes" value="'+escape_text_field_value(key.Codes)+'"/>';
			html += '<table cellspacing="0" cellpadding="0"><tr>';
			html += '<td id="td_keydef_code_preview">' + this.render_keys(key.Codes) + '</td>';
			html += '<td><div class="little_button_stack">' + large_icon_button('keyboard_edit.png', "<b>Set Keys...</b>", "$P('GameEditKey').set_keys()") + '<div class="clear"></div></div><div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Click the "Set Keys..." button to assign keys to this control.  You may assign up to 5 keys to each (giving the player several options on which to use). </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (key.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameKeys/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('keyboard_edit.png', '<b>Save Changes</b>', "$P('GameEditKey').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameKeys/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('keyboard_add.png', '<b>Create Key Definition</b>', "$P('GameEditKey').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_key_content').innerHTML = html;
	},
	
	render_keys: function(codes_csv) {
		// render key codes in human-readable form
		var html = '';
		
		if (codes_csv) {
			var codes = codes_csv.split(/\,\s*/);
			var nice_codes = [];
			for (var idy = 0, ley = codes.length; idy < ley; idy++) {
				nice_codes.push( get_nice_key_name(codes[idy]) );
			}
			html += '<div class="keydef">' + nice_codes.join('</div><div class="keydef">') + '</div>';
			html += '<div class="clear"></div>';
		}
		
		return html;
	},
	
	get_dialog_key_list_html: function() {
		// get HTML for key list in dialog
		var html = '';
		
		for (var idx = 0, len = this.codes.length; idx < len; idx++) {
			html += '<div class="keydef editable" style="cursor:pointer" onClick="$P(\'GameEditKey\').remove_key('+idx+')">' + get_nice_key_name(this.codes[idx]) + '</div>';
		}
		html += '<div class="clear"></div>';
		
		return html;
	},
	
	update_dialog_key_list: function() {
		// update the dialog key list
		$('d_set_keys_list').innerHTML = this.get_dialog_key_list_html();
		
		if (this.codes.length) $('btn_set_keys').removeClass('disabled');
		else $('btn_set_keys').addClass('disabled');
	},
	
	set_keys: function() {
		// show dialog for setting keys
		var codes = $('fe_kd_codes').value.length ? $('fe_kd_codes').value.split(/\,\s*/) : [];
		this.codes = codes;
		
		var html = '';

		html += '<div class="dialog_bkgnd" style="padding-left:150px; background-image:url('+png('images/big_icons/keyboard.png')+')">';

		html += '<table cellspacing=0 cellpadding=0><tr><td width=300 height=250>';
		html += '<div class="dialog_title" style="margin-bottom:10px;">Set Keys</div>';
		html += '<div class="caption" style="margin-bottom:20px;">Press keys to assign them to this control (up to 5 may be assigned).  Please note that using special keys like modifiers is not recommended, as behavior tends to differ between browsers.  It is safer to assign standard keys like alphanumerics, arrow keys, space and enter.</div>';

		html += '<div id="d_set_keys_list" style="width:280px; height:62px; border:1px solid #bbb; padding:5px;">';
		html += this.get_dialog_key_list_html();
		html += '</div>';

		html += spacer(1,5) + '<br/>';
		
		html += '<div class="caption" style="margin-bottom:20px;"> Click on the keys to remove them from the list. </div>';

		html += '<center><table><tr>';
			html += '<td>' + large_icon_button('x', 'Cancel', "$P('GameEditKey').cancel_set_keys()") + '<div class="clear"></div></td>';
			html += '<td width=50>&nbsp;</td>';
			html += '<td>' + large_icon_button('check', 'Select', "$P('GameEditKey').commit_keys()", 'btn_set_keys', '', codes.length ? '' : 'disabled') + '<div class="clear"></div></td>';
		html += '</tr></table></center>';

		html += '</td></tr></table>';
		
		html += '</div>';

		show_popup_dialog(450, 260, html);
		
		session.hooks.key_down = [this, 'handle_key_down'];
	},
	
	remove_key: function(idx) {
		// remove key from list (from click)
		this.codes.splice( idx, 1 );
		Debug.trace('keys', "Current code list: " + this.codes.join(', '));
		
		this.update_dialog_key_list();
		
		/* var self = this;
		setTimeout( function() { self.update_dialog_key_list(); }, 1 );
		setTimeout( function() { self.update_dialog_key_list(); }, 100 ); */
	},
	
	handle_key_down: function(e) {
		// keydown events come here, add to list
		var code = fix_key_code( e.keyCode );
		Debug.trace('keys', "Caught keydown: " + code + ": " + get_nice_key_name(code));
		
		if ((this.codes.length < 5) && !find_in_array(this.codes, code)) {
			this.codes.push(code);
			
			this.update_dialog_key_list();
			
			/* var self = this;
			setTimeout( function() { self.update_dialog_key_list(); }, 1 );
			setTimeout( function() { self.update_dialog_key_list(); }, 100 ); */
		}
		
		Debug.trace('keys', "Current code list: " + this.codes.join(', '));
		
		session.hooks.key_down = [this, 'handle_key_down'];
		return false;
	},
	
	cancel_set_keys: function() {
		// cancel set key dialog
		delete session.hooks.key_down;
		hide_popup_dialog();
	},
	
	commit_keys: function() {
		// save keys from dialog
		if (this.codes.length) {
			delete session.hooks.key_down;
			$('fe_kd_codes').value = this.codes.join(', ');
			$('td_keydef_code_preview').innerHTML = this.render_keys( this.codes.join(', ') );
			hide_popup_dialog();
		}
	},
	
	save: function() {
		// save key changes, or add new key
		clear_field_error();
		
		var key = {
			Name: trim($('fe_kd_id').value),
			Title: $('fe_kd_name').value,
			Codes: $('fe_kd_codes').value
		};
		
		// text field validation
		if (!key.Name) return bad_field('fe_kd_id', "Please enter an Event ID for your key definition.");
		if (!key.Name.match($R.GameObjectID)) return bad_field('fe_kd_id', "Your Event ID is invalid.  Please use only alphanumerics and dashes, 2 characters minimum, and begin and end with an alpha char.");
		if (!check_reserved_word(key.Name)) return bad_field('fe_kd_id', "Your Event ID is a reserved word.  Please choose another.");
		if (key.Name.length > 32) return bad_field('fe_kd_id', "Your Event ID is too long.  Please keep it to 32 characters or less.");
		
		if (!key.Title) return bad_field('fe_kd_name', "Please enter a Control Name for your key definition.");
		
		if (!key.Codes) {
			do_message('error', "Please click the \"Set Keys...\" button and assign one or more keys to this control.");
			return;
		}
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.key) {
			// update existing key
			effect_api_send('game_update_object', merge_objects(key, {
				GameID: this.game_id,
				OldName: this.key.Name,
				Type: 'key'
			}), [this, 'save_finish'], { _key: key });
		}
		else {
			// create new key
			effect_api_send('game_create_object', merge_objects(key, {
				GameID: this.game_id,
				Type: 'key'
			}), [this, 'save_finish'], { _key: key });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.key) {
			// updated existing key
			Nav.go('#GameKeys/' + this.game_id);
			do_message('success', "Saved key definition \""+tx._key.Title+"\".");
			this.key = tx._key;
		}
		else {
			// created new key
			Nav.go('#GameKeys/' + this.game_id);
			do_message('success', "Created new key definition \""+tx._key.Title+"\".");
			this.key = tx._key;
		}
	}
} );
