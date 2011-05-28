// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameObjects", {
	
	first_activation: true,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_objects_header">Loading...</h1>';
		
		html += '<div id="d_game_objects_tab_bar"></div>';
		
		html += '<div id="d_game_objects_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameObjects/Blurb') + '</div>';
		
		// sprites
		html += '<div class="h1">';
			html += '<div id="ctl_d_game_sprites" class="fl header_section_control open" onClick="$P().toggle_section(\'d_game_sprites\')"></div>';
			html += '<div id="d_game_sprites_header" class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_game_sprites\')">';
				html += ''; // Game Sprites
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_objects_create_sprite_link" class="icon add_sprite" href="#GameEditSprite" title="Add Sprite Class">Add Sprite Class</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_sprites">'+busy()+'</div>';
		// html += '<div style="height:30px;"></div>';
		
		// tiles
		html += '<div class="h1">';
			html += '<div id="ctl_d_game_tiles" class="fl header_section_control open" onClick="$P().toggle_section(\'d_game_tiles\')"></div>';
			html += '<div id="d_game_tiles_header" class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_game_tiles\')">';
				html += ''; // Game Tiles
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_objects_create_tile_link" class="icon add_tile" href="#GameEditTile" title="Add Tile Class">Add Tile Class</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_tiles">'+busy()+'</div>';
		// html += '<div style="height:30px;"></div>';
		
		// tilesets
		html += '<div class="h1">';
			html += '<div id="ctl_d_game_tilesets" class="fl header_section_control open" onClick="$P().toggle_section(\'d_game_tilesets\')"></div>';
			html += '<div id="d_game_tilesets_header" class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_game_tilesets\')">';
				html += ''; // Game Tilesets
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_objects_create_tileset_link" class="icon add_tileset" href="#GameEditTileset" title="Add Tileset">Add Tileset</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_tilesets">'+busy()+'</div>';
		// html += '<div style="height:30px;"></div>';
		
		// fonts
		html += '<div class="h1">';
			html += '<div id="ctl_d_game_fonts" class="fl header_section_control open" onClick="$P().toggle_section(\'d_game_fonts\')"></div>';
			html += '<div id="d_game_fonts_header" class="fl" style="cursor:pointer" onClick="$P().toggle_section(\'d_game_fonts\')">';
				html += ''; // Game Fonts
			html += '</div>';
			html += '<div class="fr">';
				html += '<a id="a_game_objects_create_font_link" class="icon add_font" href="#GameEditFont" title="Add Font">Add Font</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div id="d_game_fonts">'+busy()+'</div>';
		// html += '<div style="height:30px;"></div>';
		
		// audio resources
		/* html += '<div class="h1">';
			html += '<div id="d_game_audio_header" class="fl">';
				html += ''; // Game Audio Resources
			html += '</div>';
			html += '<div class="fr">';
				html += '<a class="icon control_stop" href="javascript:void(stop_all_sounds())" title="Stop All Sounds">Stop All Sounds</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		html += '<div class="caption" style="margin-bottom:7px;">' + get_string('/GameAudio/Blurb') + '</div>';
		html += '<div id="d_game_audio">'+busy()+'</div>'; */
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_sprites').innerHTML = loading_image();
		$('d_game_tiles').innerHTML = loading_image();
		$('d_game_tilesets').innerHTML = loading_image();
		$('d_game_fonts').innerHTML = loading_image();
		
		if (this.first_activation) {
			// sound_init();
			this.first_activation = false;
		}
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;
		
		// game specific prefs
		if (!games[game_id]) games[game_id] = {};
		this.game_prefs = games[game_id];
		
		// section prefs in game
		if (!this.game_prefs.sects) this.game_prefs.sects = {};
		this.sect_prefs = this.game_prefs.sects;
		
		smart_sect_restore(
			['d_game_sprites', 'd_game_tiles', 'd_game_tilesets', 'd_game_fonts'], 
			this.sect_prefs 
		);
		
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
		// stop_all_sounds();
		$('h_game_objects_header').innerHTML = '';
		$('d_game_objects_tab_bar').innerHTML = '';
		$('d_game_sprites').innerHTML = '';
		$('d_game_tiles').innerHTML = '';
		$('d_game_tilesets').innerHTML = '';
		$('d_game_fonts').innerHTML = '';
		hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Objects | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Objects']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_objects_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Objects');
		
		$('h_game_objects_header').innerHTML = fit_game_title(this.game.Title);
		
		$('a_game_objects_create_sprite_link').setAttribute('href', '#GameEditSprite?game_id=' + this.game_id );
		$('a_game_objects_create_sprite_link').href = '#GameEditSprite?game_id=' + this.game_id;
		
		$('a_game_objects_create_tile_link').setAttribute('href', '#GameEditTile?game_id=' + this.game_id );
		$('a_game_objects_create_tile_link').href = '#GameEditTile?game_id=' + this.game_id;
		
		$('a_game_objects_create_tileset_link').setAttribute('href', '#GameEditTileset?game_id=' + this.game_id );
		$('a_game_objects_create_tileset_link').href = '#GameEditTileset?game_id=' + this.game_id;
		
		$('a_game_objects_create_font_link').setAttribute('href', '#GameEditFont?game_id=' + this.game_id );
		$('a_game_objects_create_font_link').href = '#GameEditFont?game_id=' + this.game_id;
		
		effect_api_get('game_objects_get', { 
			id: this.game_id,
			sprites: 1,
			tiles: 1,
			tilesets: 1,
			fonts: 1
		}, [this, 'receive_objects'], {});
				
		/* effect_api_send('game_audio_sync_get', { 
			GameID: this.game_id
		}, [this, 'receive_audio'], {}); */
	},
	
	receive_objects: function(response, tx) {
		// sprites
		var html = '';
		if (typeof(response.Sprites) != 'undefined') {
			if (response.Sprites && response.Sprites.Sprite) {
				var sprites = this.sprites = sort_array( response.Sprites.Sprite, { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Sprite Class Name</th><th>Preload at Startup</th><th>Place in Levels</th><th>Dependencies</th><th>Resources</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = sprites.length; idx < len; idx++) {
					var sprite = sprites[idx];
				
					// var num_res = sprite.Resources.Resource ? always_array(sprite.Resources.Resource).length : 0;
					var res_text = '';
					var nums = { images:0, audio:0, text:0, video:0 };
					if (sprite.Resources.Resource) {
						var resources = always_array(sprite.Resources.Resource);
						for (var idy = 0, ley = resources.length; idy < ley; idy++) {
							var res = resources[idy];
							if (res.Path.match(session.imageResourceMatch)) nums.images++;
							else if (res.Path.match(session.audioResourceMatch)) nums.audio++;
							else if (res.Path.match(session.textResourceMatch)) nums.text++;
							else if (res.Path.match(session.movieResourceMatch)) nums.video++;
						} // foreach resource
						
						res_arr = [];
						if (nums.images) res_arr.push( nums.images + ' ' + pluralize('image', nums.images) );
						if (nums.audio) res_arr.push( nums.audio + ' audio' );
						if (nums.text) res_arr.push( nums.text + ' text' );
						if (nums.video) res_arr.push( nums.video + ' video' );
						res_text += res_arr.join(', ');
					} // has resources
					else res_text = '(None)';
				
					var num_req = (sprite.Requires && sprite.Requires.Require) ? always_array(sprite.Requires.Require).length : 0;
					var req_text = num_req ? ('' + num_req + ' ' + pluralize('sprite', num_req)) : '(None)';
				
					var edit_link = '#GameEditSprite?game_id=' + this.game_id + '&sprite_id=' + sprite.Name;
				
					html += '<tr>';
					html += '<td>' + icon('cog.png', '<b>' + sprite.Name + '</b>', edit_link) + '</td>';
					html += '<td align="center">' + ((sprite.Preload == 1) ? icon('accept.png') : '') + '</td>';
					html += '<td align="center">' + ((sprite.Place == 1) ? icon('accept.png') : '') + '</td>';
					html += '<td>' + req_text + '</td>';
					html += '<td>' + res_text + '</td>';
					html += '<td><a href="'+edit_link+'">Edit</a> | ' + 
						code_link("$P('GameObjects').delete_game_object('sprite','"+sprite.Name+"')", "Delete") + '</td>';
					html += '</tr>';
				} // foreach sprite
				html += '</table>';
			
				$('d_game_sprites_header').innerHTML = 'Sprite Classes (' + sprites.length + ')';
			} // we have sprites
			else {
				$('d_game_sprites_header').innerHTML = 'Sprite Classes';
				html += 'No sprite classes found.';
				this.sprites = [];
			}
			html += '<div style="height:30px;"></div>';
			$('d_game_sprites').innerHTML = html;
		}
		
		// tiles
		if (typeof(response.Tiles) != 'undefined') {
			html = '';
			if (response.Tiles && response.Tiles.Tile) {
				var tiles = this.tiles = sort_array( response.Tiles.Tile, { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Tile Class Name</th><th>Has Icon</th><th>Properties</th><th>Dependencies</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = tiles.length; idx < len; idx++) {
					var tile = tiles[idx];
					var edit_link = '#GameEditTile?game_id=' + this.game_id + '&tile_id=' + tile.Name;
				
					var num_req = (tile.Requires && tile.Requires.Require) ? always_array(tile.Requires.Require).length : 0;
					var req_text = num_req ? ('' + num_req + ' ' + pluralize('sprite', num_req)) : '(None)';
					
					var prop_text = '';
					if (tile.Properties && tile.Properties.Property) {
						var props = always_array( tile.Properties.Property );
						for (var idy = 0, ley = props.length; idy < ley; idy++) {
							if (prop_text) prop_text += ', ';
							prop_text += props[idy].Name;
						}
					}
					else prop_text = '(None)';
				
					html += '<tr>';
					html += '<td>' + icon('brick.png', '<b>' + tile.Name + '</b>', edit_link) + '</td>';
					html += '<td align="center">' + ((tile.Icon) ? icon('accept.png') : '') + '</td>';
					// html += '<td align="center">' + ((tile.Properties && tile.Properties.Property) ? icon('accept.png') : '') + '</td>';
					html += '<td>' + prop_text + '</td>';
					html += '<td>' + req_text + '</td>';
					html += '<td><a href="'+edit_link+'">Edit</a> | ' + 
						code_link("$P('GameObjects').delete_game_object('tile','"+tile.Name+"')", "Delete") + '</td>';
					html += '</tr>';
				} // foreach tile
				html += '</table>';
			
				$('d_game_tiles_header').innerHTML = 'Tile Classes (' + tiles.length + ')';
			} // we have tiles
			else {
				$('d_game_tiles_header').innerHTML = 'Tile Classes';
				html += 'No tile classes found.';
				this.tiles = [];
			}
			html += '<div style="height:30px;"></div>';
			$('d_game_tiles').innerHTML = html;
		}
		
		// tilesets
		if (typeof(response.Tilesets) != 'undefined') {
			html = '';
			if (response.Tilesets && response.Tilesets.Tileset) {
				var tilesets = this.tilesets = sort_array( response.Tilesets.Tileset, { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Tileset Name</th><th>Preload at Startup</th><th>Asset Folder</th><th>Tile Size</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = tilesets.length; idx < len; idx++) {
					var tileset = tilesets[idx];
					var edit_link = '#GameEditTileset?game_id=' + this.game_id + '&tileset_id=' + tileset.Name;
				
					html += '<tr>';
					html += '<td>' + icon('color_swatch.png', '<b>' + tileset.Name + '</b>', edit_link) + '</td>';
					html += '<td align="center">' + ((tileset.Preload == 1) ? icon('accept.png') : '') + '</td>';
					html += '<td>' + icon('folder.png', tileset.Path.replace(/^\//, '').replace(/\/$/, '')) + '</td>';
					html += '<td>' + tileset.TileWidth + 'x' + tileset.TileHeight + '</td>';
					html += '<td><a href="'+edit_link+'">Edit</a> | ' + 
						code_link("$P('GameObjects').delete_game_object('tileset','"+tileset.Name+"')", "Delete") + '</td>';
					html += '</tr>';
				} // foreach tileset
				html += '</table>';
			
				$('d_game_tilesets_header').innerHTML = 'Tilesets (' + tilesets.length + ')';
			} // we have tilesets
			else {
				$('d_game_tilesets_header').innerHTML = 'Tilesets';
				html += 'No tilesets found.';
				this.tilesets = [];
			}
			html += '<div style="height:30px;"></div>';
			$('d_game_tilesets').innerHTML = html;
		}
		
		// fonts
		if (typeof(response.Fonts) != 'undefined') {
			html = '';
			if (response.Fonts && response.Fonts.Font) {
				var fonts = this.fonts = sort_array( response.Fonts.Font, { sort_by: 'Name', sort_dir: 1 } );
				html += '<table class="data_table">';
				html += '<tr><th>Font Name</th><th>Enabled</th><th>Source</th><th>Glyph Size</th><th>Color</th><th>Actions</th></tr>';
			
				for (var idx = 0, len = fonts.length; idx < len; idx++) {
					var font = fonts[idx];
					var edit_link = '#GameEditFont?game_id=' + this.game_id + '&font_id=' + font.Name;
				
					html += '<tr>';
					html += '<td>' + icon('style.png', '<b>' + font.Name + '</b>', edit_link) + '</td>';
					html += '<td align="center">' + ((font.Enabled == 1) ? icon('accept.png') : '') + '</td>';
					html += '<td>' + icon('page_white_font.png', basename(font.Path)) + '</td>';
					html += '<td>' + font.GlyphWidth + 'x' + font.GlyphHeight + '</td>';
					html += '<td>' + get_color_preview(font.Color) + '</td>';
					
					html += '<td><a href="'+edit_link+'">Edit</a> | ' + 
						code_link("$P('GameObjects').delete_game_object('font','"+font.Name+"')", "Delete") + '</td>';
					html += '</tr>';
				} // foreach font
				html += '</table>';
			
				$('d_game_fonts_header').innerHTML = 'Bitmap Fonts (' + fonts.length + ')';
			} // we have fonts
			else {
				$('d_game_fonts_header').innerHTML = 'Bitmap Fonts';
				html += 'No fonts found.';
				this.fonts = [];
			}
			html += '<div style="height:30px;"></div>';
			$('d_game_fonts').innerHTML = html;
		}
	},
	
	delete_game_object: function(type, id) {
		// delete sprite or tile object
		if (confirm('Are you sure you want to delete the ' + type + ' "'+id+'"?')) {
			effect_api_mod_touch('game_objects_get');
			effect_api_send('game_delete_object', {
				GameID: this.game_id,
				Type: type,
				ID: id
			}, [this, 'delete_game_object_finish'], { _type: type, _id: id });
		} // confirmed
	},
	
	delete_game_object_finish: function(response, tx) {
		// received response from server
		this.receive_objects(response, tx);
		do_message('success', 'Deleted the ' + tx._type + ' "'+tx._id+'".'); 
	},
	
	toggle_section: function(sect) {
		// toggle smart section
		smart_sect_toggle( sect, this.sect_prefs );
	}
	
} );
