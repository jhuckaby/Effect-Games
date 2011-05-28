// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameDevelop", {	
	
	onInit: function() {
		// render page HTML
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		this.div.innerHTML = loading_image();
		
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
		
		show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		delete this.clip;
		this.div.innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Develop | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Develop']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		var html = '';
		
		this.clip = new ZeroClipboard.Client();
		this.clip.addEventListener('mouseOver', function(client) {
			client.setText( $('fe_dev_url').value );
			$('btn_dev_copy').addClass('hover');
		});
		this.clip.addEventListener('mouseOut', function(client) {
			$('btn_dev_copy').removeClass('hover');
		});
		this.clip.addEventListener('complete', function(client, txt) {
			$('d_dev_copy_msg').innerHTML = '(Embed code copied to clipboard.)';
			setTimeout( function() {
				$('d_dev_copy_msg').innerHTML = '';
			}, 5 * 1000 );
		});
		
		html += '<h1 id="h_game_develop_header">' + fit_game_title(this.game.Title) + '</h1>';
		
		html += '<div id="d_game_develop_tab_bar">' + get_game_tab_bar(this.game_id, 'Game') + '</div>';
		
		html += '<div id="d_game_develop_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameDevelop/Blurb') + '</div>';
		
		html += '<table style="margin:20px;">';
		
		// engine version
		var version_items = [];
		for (var idx = 0, len = session.engine_versions.length; idx < len; idx++) {
			var verobj = session.engine_versions[idx];
			version_items.push([ verobj.Name, verobj.Title ]);
		}
		html += '<tr><td align=right class="fe_label_left">Engine&nbsp;Version:</td><td align=left>' + 
			menu( 'fe_dev_engine', version_items, '', 
				{'class':'fe_medium', 'onChange':"$P('GameDevelop').set_engine_version(this.options[this.selectedIndex].value)"} ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose which Effect Engine version you want to use.  We are always making improvements to our engine, but sometimes we have to make "breaking changes" (to the API, etc.), so with this you can stick to a particular version of the engine, until you are ready to upgrade. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,20) + '</td></tr>';
		
		html += '<tr><td align=right class="fe_label_left">Embed&nbsp;Code:</td>';
		html += '<td>';
		html += '<textarea id="fe_dev_url" class="fe_edit" wrap="virtual" style="width:100%; height:50px;" onkeyup="return stop_textarea_key_event(event)" onkeydown="return stop_textarea_key_event(event)" onClick="selectAllText(this)"></textarea>';
		html += '</td></tr>';
		html += '<tr><td></td><td>';
		
		html += '<div class="little_button_stack" style="margin-right:0px; position:relative;">';
		html += '<div style="position:absolute; left:0px; top:0px; width:150px; height:30px; z-index:99">' + this.clip.getHTML(150, 30) + '</div>';
		html += large_icon_button('page_white_paste.png', "<b>Copy to Clipboard</b>", '', 'btn_dev_copy') + '<div class="clear"></div>';
		html += '</div>';
		
		html += '<div class="little_button_stack"><div class="button_msg" id="d_dev_copy_msg"></div><div class="clear"></div></div>';
		html += '<div class="clear"></div>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,10) + '</td></tr>';
		
		html += '<tr><td></td><td>';
		html += '<div class="fe_label">' + get_string('/GameDevelop/Notes/Header') + '</div>';
		// html += '<ul>';
		for (var idx = 0, len = config.Strings.GameDevelop.Notes.Note.length; idx < len; idx++) {
			html += '<div style="font-size:11px; margin-top:10px;">' + get_string('/GameDevelop/Notes/Note/' + idx) + '</div>';
		}
		// html += '</ul>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		
		html += '<center><table style="margin-bottom:20px;"><tr>';
		html += '<td>' + large_icon_button('arrow_turn_left.png', 'Back to Game', "Nav.prev()") + '</td>';
		html += '</tr></table></center>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		this.game_prefs = games[this.game_id];
		
		var self = this;
		setTimeout( function() {
			if (self.game_prefs['last_engine_version']) set_menu_value('fe_dev_engine', self.game_prefs['last_engine_version']);
			self.update_embed_code();
		}, 1 );
	},
	
	set_engine_version: function(ver) {
		// update url and save in cookie
		this.game_prefs['last_engine_version'] = ver;
		user_storage_mark();
		this.update_embed_code();
	},
	
	update_embed_code: function() {
		var ver = get_menu_value('fe_dev_engine');
		var session_id = session.cookie.get('effect_session_id').replace(/^login_/, '');
		var code = '<script type="text/javascript" src="http://'+location.hostname+'/effect/api/local_dev.js?game='+this.game_id+'&engine='+ver+'&key='+session_id+'"></script>';
		$('fe_dev_url').value = code;
	}
	
} );
