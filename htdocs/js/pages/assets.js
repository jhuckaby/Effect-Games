// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameAssets", {
	
	first_activation: true,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		var html = '<h1 id="h_game_assets_header">Loading...</h1>';
		
		html += '<div id="d_game_assets_tab_bar"></div>';
		
		html += '<div id="d_game_assets_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/AssetManager/Blurb') + '</div>';
		html += '<div id="assetmgr_floater"></div>';
		html += '<div id="assetmgr_main"></div>';
		html += '<div class="clear"></div>';
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
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
			this.setup_nav();
			setTimeout( 'assetmgr.update_floater();', 1 );
		}
		
		show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		
		// hide uploader and clip
		upload_destroy();
		
		$('assetmgr_main').innerHTML = '';
		$('assetmgr_floater').innerHTML = '';
		
		hide_glog_widget();
		
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( 'Assets | ' + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Asset Manager']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_assets_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Assets');
		
		$('h_game_assets_header').innerHTML = fit_game_title(this.game.Title);
		
		assetmgr.init( this.game_id );		
	}
	
} );

window.assetmgr = {};
