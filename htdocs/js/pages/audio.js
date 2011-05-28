// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameAudio", {
	
	first_activation: true,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		var html = '<h1 id="h_game_audio_header">Loading...</h1>';
		
		html += '<div id="d_game_audio_tab_bar"></div>';
		
		html += '<div id="d_game_audio_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameAudio/Blurb') + '</div>';
		
		html += '<div id="d_game_audio_form">'+busy()+'</div>';
		
		// audio resources
		html += '<div class="h1">';
			html += '<div id="d_game_audio_header" class="fl">';
				html += ''; // Game Audio Resources
			html += '</div>';
			html += '<div class="fr">';
				html += '<a class="icon control_stop" href="javascript:void(stop_all_sounds())" title="Stop All Sounds">Stop All Sounds</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_audio">'+busy()+'</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_audio_form').innerHTML = loading_image();
		$('d_game_audio').innerHTML = loading_image();
		
		if (this.first_activation) {
			// see if game is already loaded via game page
			sound_init();
			this.first_activation = false;
		}
			
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
		stop_all_sounds();
		
		$('d_game_audio_form').innerHTML = '';
		$('d_game_audio').innerHTML = '';
		
		hide_glog_widget();
		
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Audio | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Audio']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_audio_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Audio');
		
		$('h_game_audio_header').innerHTML = fit_game_title(this.game.Title);
		
		// audio control form
		var volume_items = [];
		for (var vol = 0; vol <= 100; vol += 5) {
			volume_items.push([ vol / 100, '' + vol + '%' ]);
		}
		
		var html = '';
		html += '<table cellspacing="0" cellpadding="0" border="0" width="100%">';
		html += '<tr><td width="50%">';
		html += '<table style="margin:10px 20px 20px 20px;">';
		
		// master switch
		html += '<tr><td align=right class="fe_label_left">Master&nbsp;Control:</td>';
		html += '<td align=left><input type=checkbox id="fe_au_enabled" value="1" ' + ((this.game.AudioEnabled == 1) ? 'checked="checked"' : '') + 
			' onChange="$P(\'GameAudio\').set_game_boolean(\'AudioEnabled\',this.checked)" />';
		html += '<label for="fe_au_enabled">Audio Enabled</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Enable or disable all audio for your game using this checkbox.  If disabled here, the player cannot enable it via the toolbar. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// master volume
		html += '<tr><td align=right class="fe_label_left">Master&nbsp;Volume:</td><td align=left>' + 
			menu( 'fe_au_master_volume', volume_items, this.game.AudioMasterVolume, 
				{'class':'fe_medium', onChange: "$P('GameAudio').set_game_float(\'AudioMasterVolume\',this.options[this.selectedIndex].value)" } ) + '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a master volume level which affects all sounds, music and video in your game. </td></tr>';
		// html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		html += '</td><td width="50%">';
		
		// category volumes
		// html += '<tr><td colspan="2">';
		html += '<div style="margin:10px 20px 20px 20px;">';
		html += '<fieldset><legend>Category Settings</legend>';
			html += '<div class="caption" style="margin-bottom:5px;">Here you can set individual category volume levels, which affect all the sound tracks assigned to them.  These volumes are all affected by the master volume level above.</div>';
			html += '<table style="margin-left:50px;">';
			
			html += '<tr><td align="right" class="fe_label">SFX Volume:&nbsp;</td>';
			html += '<td>' + menu( '', volume_items, this.game.AudioSFXVolume, 
				{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_game_float(\'AudioSFXVolume\',this.options[this.selectedIndex].value)" } ) + '</td>';
			html += '</tr>';
			
			html += '<tr><td align="right" class="fe_label">Music Volume:&nbsp;</td>';
			html += '<td>' + menu( '', volume_items, this.game.AudioMusicVolume, 
				{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_game_float(\'AudioMusicVolume\',this.options[this.selectedIndex].value)" } ) + '</td>';
			html += '</tr>';
			
			html += '<tr><td align="right" class="fe_label">Video Volume:&nbsp;</td>';
			html += '<td>' + menu( '', volume_items, this.game.AudioVideoVolume, 
				{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_game_float(\'AudioVideoVolume\',this.options[this.selectedIndex].value)" } ) + '</td>';
			html += '</tr>';
			
			html += '</table>';
		html += '</fieldset>';
		html += '</div>';
		// html += '</td></tr>';
		// html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</td></tr></table>';
		
		$('d_game_audio_form').innerHTML = html;
		
		effect_api_send('game_audio_sync_get', { 
			GameID: this.game_id
		}, [this, 'receive_audio'], {});		
	},
	
	receive_audio: function(response, tx) {
		// audio
		var volume_items = [];
		for (var vol = 0; vol <= 100; vol += 5) {
			volume_items.push([ vol / 100, '' + vol + '%' ]);
		}
		
		var balance_items = [];
		for (var bal = -100; bal <= 100; bal += 10) {
			balance_items.push([ bal / 100, '' + ((bal > 0) ? ('R+' + bal) : ((bal < 0) ? ('L+' + bal.toString().replace(/^\-/, '')) : 'Center')) ]);
		}
		
		var html = '';
		if (response.Items && response.Items.Item) {
			var audios = this.audios = always_array( response.Items.Item ).sort( function(a,b) {
				return( (b.Path.toString().toLowerCase() < a.Path.toString().toLowerCase()) ? 1 : -1 );
			} );
			html += '<table class="data_table">';
			html += '<tr><th>'+icon('sound')+'</th><th>Audio Asset Path</th><th>Category</th><th>Preload</th><th>Loop&nbsp;</th>' +
			 	'<th>Multiplex</th><th>Default Volume</th><th>Default Balance</th></tr>';
			
			for (var idx = 0, len = audios.length; idx < len; idx++) {
				var audio = audios[idx];
				html += '<tr>';
				
				var play_link = "$P('GameAudio').play_sound('"+audio.Path+"')";
				html += '<td>' + icon('control_play.png', '', play_link) + '</td>';
				html += '<td>' + code_link(play_link, '<b>' + ww_fit_filename(audio.Path, 300, session.em_width, 1) + '</b>') + '</td>';
				
				html += '<td>' + menu( '', [['sfx','SFX'], ['music','Music'], ['video','Video']], audio.Category, 
					{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_audio_category('"+audio.Path+"',this.options[this.selectedIndex].value)" } ) + '</td>';
				
				html += '<td align="center"><input type="checkbox" ' + ((audio.Preload == 1) ? 'checked="checked"' : '') + 
					' onChange="$P(\'GameAudio\').set_audio_boolean(\''+audio.Path+'\',\'Preload\',this.checked)" /></td>';
				
				html += '<td align="center"><input type="checkbox" ' + ((audio.Loop == 1) ? 'checked="checked"' : '') + 
					' onChange="$P(\'GameAudio\').set_audio_boolean(\''+audio.Path+'\',\'Loop\',this.checked)" /></td>';
				
				html += '<td align="center"><input type="checkbox" ' + ((audio.Multiplex == 1) ? 'checked="checked"' : '') + 
					' onChange="$P(\'GameAudio\').set_audio_boolean(\''+audio.Path+'\',\'Multiplex\',this.checked)" /></td>';
				
				html += '<td>' + menu( '', volume_items, audio.Volume, 
					{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_audio_float('"+audio.Path+"',\'Volume\',this.options[this.selectedIndex].value)" } ) + '</td>';
				
				html += '<td>' + menu( '', balance_items, audio.Balance, 
					{ 'class':'fe_small_menu', onChange: "$P('GameAudio').set_audio_float('"+audio.Path+"',\'Balance\',this.options[this.selectedIndex].value)" } ) + '</td>';
				
				// html += '<td align="center">' + ((audio.Preload == 1) ? icon('check') : '') + '</td>';
				// html += '<td align="center">' + ((audio.Loop == 1) ? icon('check') : '') + '</td>';
				
				// html += '<td>' + Math.floor(audio.Volume * 100) + '%</td>';
				// var bal = Math.floor(audio.Balance * 100);
				// html += '<td>' + ((bal > 0) ? '+' : ((bal < 0) ? '-' : '')) + bal + '</td>';
				
				// html += '<td>' + code_link("$P('GameAudio').show_edit_audio_dialog('"+audio.Path+"')", "Edit") + '</td>';
				html += '</tr>';
			} // foreach audio
			html += '</table>';
			
			$('d_game_audio_header').innerHTML = 'Audio Tracks (' + audios.length + ')';
		} // we have audio
		else {
			$('d_game_audio_header').innerHTML = 'Audio Tracks';
			html += 'No audio found.  Upload some MP3 assets in Asset Manager, then come back here.';
			this.audios = [];
		}
		$('d_game_audio').innerHTML = html;
	},
	
	play_sound: function(path) {
		// play sound using its current settings
		var audio = find_object( this.audios, { Path: path } );
		assert(!!audio, "Could not find audio object: " + path);
		
		var asset_url = '/effect/api/view/games/' + this.game_id + '/assets' + audio.Path;
		
		var vol = parseFloat(audio.Volume);
		switch (audio.Category) {
			case 'sfx': vol *= parseFloat( this.game.AudioSFXVolume ); break;
			case 'music': vol *= parseFloat( this.game.AudioMusicVolume ); break;
			case 'video': vol *= parseFloat( this.game.AudioVideoVolume ); break;
		}
		vol *= parseFloat( this.game.AudioMasterVolume );
		
		play_sound(asset_url, (audio.Loop == 1), vol, parseFloat(audio.Balance));
	},
	
	set_audio_category: function(path, cat_value) {
		// set audio path quickly, and save immediately
		var audio = find_object( this.audios, { Path: path } );
		assert(!!audio, "Could not find audio object: " + path);
		
		audio.Category = cat_value;
		
		effect_api_send('game_update_audio_object', merge_objects(audio, { 
			GameID: this.game_id
		}), [this, 'set_audio_finish'], { });
	},
	
	set_audio_boolean: function(path, key, checked) {
		// set audio object boolean flag (Preload, Loop) to checkbox value
		var audio = find_object( this.audios, { Path: path } );
		assert(!!audio, "Could not find audio object: " + path);
		
		audio[key] = checked ? '1' : '0';
		
		effect_api_send('game_update_audio_object', merge_objects(audio, { 
			GameID: this.game_id
		}), [this, 'set_audio_finish'], { });
	},
	
	set_audio_float: function(path, key, value) {
		// set audio object float flag (Volume, Balance) to checkbox value
		var audio = find_object( this.audios, { Path: path } );
		assert(!!audio, "Could not find audio object: " + path);
		
		audio[key] = '' + value;
		
		effect_api_send('game_update_audio_object', merge_objects(audio, { 
			GameID: this.game_id
		}), [this, 'set_audio_finish'], { });
	},
	
	set_audio_finish: function(response, tx) {
		// nothing to do here
		show_glog_widget();
	},
	
	set_game_boolean: function(key, checked) {
		var args = { GameID: this.game.GameID };
		args[key] = checked ? '1' : '0';
		this.game[key] = args[key];
		
		effect_api_mod_touch('game_get', 'get_user_games');
		effect_api_send('game_update', args, [this, 'set_audio_finish'], { } );
	},
	
	set_game_float: function(key, value) {
		var args = { GameID: this.game.GameID };
		args[key] = '' + value;
		this.game[key] = args[key];
		
		effect_api_mod_touch('game_get', 'get_user_games');
		effect_api_send('game_update', args, [this, 'set_audio_finish'], { } );
	}
	
} );
