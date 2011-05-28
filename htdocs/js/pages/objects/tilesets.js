// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameEditTileset", {
		
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_tileset_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_tileset_tab_bar"></div>';
		
		html += '<div id="d_game_edit_tileset_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameObjects/Blurb') + '</div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_tileset_content').innerHTML = loading_image();
		
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
		$('h_game_edit_tileset_header').innerHTML = '';
		$('d_game_edit_tileset_tab_bar').innerHTML = '';
		$('d_game_edit_tileset_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_tileset_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Objects');
		
		$('h_game_edit_tileset_header').innerHTML = fit_game_title(this.game.Title);
				
		if (this.args.tileset_id) {
			this.do_edit_tileset(this.args.tileset_id);
		}
		else {
			// create new tileset
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameObjects/' + this.game.GameID, 'Objects'],
				[Nav.currentAnchor(), 'New Tileset']
			);

			Nav.title( 'New Tileset | ' + this.game.Title );

			this.tileset = null;
			this.draw_tileset_form( merge_objects({ }, this.args) );
		}
	},
	
	do_edit_tileset: function(tileset_id) {
		// edit existing tileset
		if (this.tileset && (this.tileset.Name == tileset_id)) {
			// tileset already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_tileset_2();
		}
		else {
			// load tileset from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'tileset',
				id: tileset_id
			}, [this, 'do_edit_tileset_2'], {});
		}
	},
	
	do_edit_tileset_2: function(response) {
		// edit existing tileset
		if (response) {
			this.tileset = response.Item;
		}
		var title = 'Editing Tileset "'+this.tileset.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameObjects/' + this.game.GameID, 'Objects'],
			[Nav.currentAnchor(), 'Edit Tileset']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_tileset_form( this.tileset );
	},
	
	draw_tileset_form: function(tileset) {
		var html = '';
		
		html += '<div class="blurb">' + get_string('/GameEditTileset/Blurb') + '</div>';
		
		if (tileset.Name) html += '<h1>Editing Tileset "'+tileset.Name+'"</h1>';
		else html += '<h1>Create New Tileset</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// tileset name
		html += '<tr><td align=right class="fe_label_left">Tile&nbsp;Set&nbsp;Name:*</td>';
		html += '<td align=left><input type=text id="fe_ets_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(tileset.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a name for your tileset.  You may use upper- and lower-case alphanumerics, spaces and standard symbols. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// preload
		html += '<tr><td align=right class="fe_label_left">Preload:</td>';
		html += '<td align=left><input type=checkbox id="fe_ets_preload" value="1" ' + ((tileset.Preload == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_ets_preload">Preload Tileset at Game Startup</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like the tileset automatically loaded at game startup, or loaded on-demand. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// asset path
		html += '<tr><td align=right class="fe_label_left">Asset&nbsp;Folder:*</td><td>';
		html += '<input type=hidden id="fe_ets_path" value="'+escape_text_field_value(tileset.Path)+'"/>';
		html += '<div id="d_ets_path">';
		html += tileset.Path ? this.render_tileset_path(tileset.Path) : this.render_tileset_path_button();
		html += '</div>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// tile size
		html += '<tr><td align=right class="fe_label_left">Tile&nbsp;Size:</td><td>';
		html += '<input type=hidden id="fe_ets_tile_width" value="'+escape_text_field_value(tileset.TileWidth || 0)+'"/>';
		html += '<input type=hidden id="fe_ets_tile_height" value="'+escape_text_field_value(tileset.TileHeight || 0)+'"/>';
		html += '<div id="d_ets_tile_size" style="font-size:12pt; color:#666;">';
		html += tileset.TileWidth ? (tileset.TileWidth + ' x ' + tileset.TileHeight + ' pixels') : '(Not set)';
		html += '</div>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';

		// preview
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Tileset Preview</legend>';
			html += '<div id="d_ets_preview_scrollarea" style="height:200px; overflow-x:hidden; overflow-y:auto; background:url(images/font_preview_backgrounds/checkerboard.gif) repeat;">';
			if (!tileset.Path) html += this.get_empty_preview_msg();
			html += '</div>';
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (tileset.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('color_swatch_edit.png', '<b>Save Changes</b>', "$P('GameEditTileset').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('color_swatch_add.png', '<b>Create Tileset</b>', "$P('GameEditTileset').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_tileset_content').innerHTML = html;
		
		var self = this;
		if (tileset.Path) setTimeout( function() {
			self.get_tileset_preview(tileset.Path);
		}, 1 );
		
		if (!tileset.Name) safe_focus('fe_ets_id');
	},
	
	get_preview_msg: function(msg) {
		// return HTML for showing message in center of preview scroll area
		return '<div style="text-align:center; margin-top:85px;">' + msg + '</div>';
	},
	
	get_empty_preview_msg: function() {
		// return HTML for showing "No folder selected" message
		return this.get_preview_msg('(No asset folder selected)');
	},
	
	get_tileset_preview: function(path) {
		$('d_ets_preview_scrollarea').innerHTML = busy();
		
		effect_api_get('asset_file_list_get', { 
			id: this.game_id,
			path: path
		}, [this, 'get_tileset_preview_finish'], { _path: path });
	},
	
	get_tileset_preview_finish: function(response, tx) {
		// render preview tiles
		var metadata = response.Data || {};
		var path = tx._path;
		
		if (!metadata.Files) metadata.Files = {};
		if (!metadata.Files.File) metadata.Files.File = [];

		var num_files = 0;
		var html = '';
		this.images = [];
		this.tile_width = 0;
		this.tile_height = 0;
		this.tiles_bad = false;

		if (metadata && metadata.Files && metadata.Files.File) {
			always_array(metadata.Files, 'File');

			// sort alphabetically by filename
			metadata.Files.File = metadata.Files.File.sort( dasset_file_sort );
			
			// first, count the number of actual images found
			for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
				var file = metadata.Files.File[idx];
				var filename = file.Name;				
				if (filename.match(session.imageResourceMatch)) {
					num_files++;
				}
			}
			
			this.num_files = num_files;

			for (var idx = 0, len = metadata.Files.File.length; idx < len; idx++) {
				var file = metadata.Files.File[idx];
				var filename = file.Name;
				var file_path = path + filename;
				
				if (filename.match(session.imageResourceMatch)) {
					var url = get_asset_url(this.game_id, file_path);
					html += '<img src="'+url+'" style="float:left; margin:5px; border:1px solid #ccc;"/>';
					
					var img = new Image();
					this.images.push( img );
					img.onload = function() { $P('GameEditTileset').notify_image_load(this); };
					img.src = url;
				} // image file
			} // foreach file
			
			html += '<div class="clear"></div>';
		} // has files
		
		if (!num_files) {
			html = this.get_preview_msg('(No image files were found in the selected folder)');
		}
		
		this.num_files = num_files;
		
		$('d_ets_preview_scrollarea').innerHTML = html;
	},
	
	set_tile_size: function(width, height) {
		if (width) {
			$('fe_ets_tile_width').value = width;
			$('fe_ets_tile_height').value = height;
			$('d_ets_tile_size').innerHTML = width + ' x ' + height + ' pixels';
		}
		else {
			$('fe_ets_tile_width').value = 0;
			$('fe_ets_tile_height').value = 0;
			$('d_ets_tile_size').innerHTML = '(Not set)';
		}
	},
	
	notify_image_load: function(img) {
		if (!this.tile_width) {
			this.tile_width = img.width;
			this.tile_height = img.height;
			this.set_tile_size( this.tile_width, this.tile_height );
		}
		else if (!this.tiles_bad && ((img.width != this.tile_width) || (img.height != this.tile_height))) {
			this.last_tile_error = "Your tiles have inconsistent sizes.  Please make sure all tiles have exactly the same pixel size.";
			do_message('error', this.last_tile_error);
			this.tiles_bad = true;
		}
		else if (!this.tiles_bad && ((img.width > parseInt(this.game.PortWidth, 10)) || (img.height > parseInt(this.game.PortHeight, 10)))) {
			this.last_tile_error = "One or more of your tiles are larger than your game's main display size (width or height).  Please resize them and upload again, or choose a different directory.";
			do_message('error', this.last_tile_error);
			this.tiles_bad = true;
		}
	},
	
	render_tileset_path: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameEditTileset').remove_tileset_path()", "Remove Folder") + '</td>';
		// html += '<td>' + asset_icon_link(this.game_id, path, '') + '</td>';
		html += '<td>' + icon('folder.png', '<b>' + path.replace(/^\//, '').replace(/\/$/, '') + '</b>') + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_tileset_path_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('folder_magnify.png', "Select Folder...", "$P('GameEditTileset').choose_tileset_path()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_tileset_path: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Folder", this.game_id, '\/$', $('fe_ets_path').value, [this, 'choose_tileset_path_finish']);
	},
	
	choose_tileset_path_finish: function(path) {
		$('fe_ets_path').value = path;
		$('d_ets_path').innerHTML = this.render_tileset_path(path);
		this.get_tileset_preview(path);
	},
	
	remove_tileset_path: function() {
		$('fe_ets_path').value = '';
		$('d_ets_path').innerHTML = this.render_tileset_path_button();
		$('d_ets_preview_scrollarea').innerHTML = this.get_empty_preview_msg();
		this.set_tile_size(0, 0);
	},
	
	save: function() {
		// save tileset changes, or add new tileset
		if (this.tiles_bad) {
			do_message('error', this.last_tile_error);
			return;
		}
		clear_field_error();
		
		var tileset = {
			Name: trim($('fe_ets_id').value),
			Preload: $('fe_ets_preload').checked ? 1 : 0,
			Path: $('fe_ets_path').value,
			TileWidth: $('fe_ets_tile_width').value,
			TileHeight: $('fe_ets_tile_height').value
		};
		
		// text field validation
		if (!tileset.Name) return bad_field('fe_ets_id', "Please enter a Tileset Name.");
		if (!check_reserved_word(tileset.Name)) return bad_field('fe_ets_id', "Your Tileset Name is a reserved word.  Please choose another.");
		if (!tileset.Name.match($R.GameObjectID)) return bad_field('fe_ets_id', "Your Tileset Name is invalid.  Please use only alphanumerics and dashes, 2 characters minimum, and begin and end with an alpha char.");
		if (tileset.Name.length > 32) return bad_field('fe_ets_id', "Your Tileset Name is too long.  Please keep it to 32 characters or less.");
		
		if (!tileset.Path) {
			do_message('error', "Please select an asset folder containing tile images.");
			return;
		}
		if (!this.num_files) {
			do_message('error', "Please select another asset folder that contains image files.");
			return;
		}
		
		if (!tileset.TileWidth.match(/^\d+$/) || (tileset.TileWidth == 0) || !tileset.TileHeight.match(/^\d+$/) || (tileset.TileHeight == 0)) {
			do_message('error', "The pixel size of your tiles could not be determined.  Please make sure your images are correct, or select a different folder.");
			return;
		}
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.tileset) {
			// update existing tileset
			effect_api_send('game_update_object', merge_objects(tileset, {
				GameID: this.game_id,
				OldName: this.tileset.Name,
				Type: 'tileset'
			}), [this, 'save_finish'], { _tileset: tileset });
		}
		else {
			// create new tileset
			effect_api_send('game_create_object', merge_objects(tileset, {
				GameID: this.game_id,
				Type: 'tileset'
			}), [this, 'save_finish'], { _tileset: tileset });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.tileset) {
			// updated existing tileset
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Saved tileset \""+tx._tileset.Name+"\".");
			this.tileset = tx._tileset;
		}
		else {
			// created new tileset
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Created new tileset \""+tx._tileset.Name+"\".");
			this.tileset = tx._tileset;
		}
	}
} );
