// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.TilesetPalette', {
	name: 'tileset',
	icon: 'color_swatch.png',
	title: 'Tileset',
	
	setup: function() {
		var layer = this.page.current_layer;
		var title = layer.Tileset;
		
		var icon_size = this.page.editor_prefs.tile_icon_size || 32;
		var icon_bkgnd = this.page.editor_prefs.tile_icon_bkgnd || 'white';
				
		var html = '';
		var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: layer.Tileset } );
		if (tileset) {
			
			html += '<div class="em_tileset_bkgnd_links">';
				if (icon_bkgnd == 'white') html += '<div class="em_tileset_bkgnd_selector white selected"></div>';
				else html += '<div class="em_tileset_bkgnd_selector white" onClick="$P().pal(\'tileset\').set_bkgnd(\'white\')" title="White Background"></div>';
				
				if (icon_bkgnd == 'black') html += '<div class="em_tileset_bkgnd_selector black selected"></div>';
				else html += '<div class="em_tileset_bkgnd_selector black" onClick="$P().pal(\'tileset\').set_bkgnd(\'black\')" title="Black Background"></div>';
				
				if (icon_bkgnd == 'gray') html += '<div class="em_tileset_bkgnd_selector gray selected"></div>';
				else html += '<div class="em_tileset_bkgnd_selector gray" onClick="$P().pal(\'tileset\').set_bkgnd(\'gray\')" title="Grey Background"></div>';
				
				if (icon_bkgnd == 'checkers') html += '<div class="em_tileset_bkgnd_selector checkers selected"></div>';
				else html += '<div class="em_tileset_bkgnd_selector checkers" onClick="$P().pal(\'tileset\').set_bkgnd(\'checkers\')" title="Checkered Background"></div>';
				
				html += '<div class="clear"></div>';
			html += '</div>';
			
			html += '<div class="em_tileset_size_links">';
				if (icon_size == 16) html += 'Sm&nbsp;|&nbsp;';
				else html += '<a href="javascript:void($P().pal(\'tileset\').set_size(16))" title="Small Icons">Sm</a>&nbsp;|&nbsp;';
				
				if (icon_size == 32) html += 'Med&nbsp;|&nbsp;';
				else html += '<a href="javascript:void($P().pal(\'tileset\').set_size(32))" title="Medium Icons">Med</a>&nbsp;|&nbsp;';
				
				if (icon_size == 64) html += 'XL';
				else html += '<a href="javascript:void($P().pal(\'tileset\').set_size(64))" title="Large Icons">XL</a>';
			html += '</div>';
			html += '<div class="clear"></div>';
			
			html += '<div style="height:1px; background-color:#ccc; margin-top:2px; margin-bottom:1px;"></div>';
			
			html += '<div id="d_em_tileset_bkgnd" class="em_tileset_bkgnd '+icon_bkgnd+'" style="padding:2px;">';
			// title += ' (' + tileset.TileWidth + 'x' + tileset.TileHeight + ')';
			var size = { width: tileset.TileWidth, height: tileset.TileHeight };
			// if ((tileset.TileWidth > icon_size) || (tileset.TileHeight > icon_size)) {
				size = custom_fit( tileset.TileWidth, tileset.TileHeight, icon_size, icon_size );
			// }
			
			var files = always_array( tileset.Files.File );
			for (var idx = 0, len = files.length; idx < len; idx++) {
				var filename = files[idx];
				
				var file_path = tileset.Path + filename;
				var url = get_asset_url(this.page.game_id, file_path) + '?env=' + (this.page.level.Env || '') + '&mod=' + this.page._game.getAssetModDate();
				html += '<img id="img_em_tile_'+filename+'" class="levedit_palette_tile'+((tileset.current_tile == filename) ? ' selected' : '')+'" src="'+url+'" width="'+size.width+'" height="'+size.height+'" onClick="$P().pal(\'tileset\').select_tile(\''+filename+'\')" title="'+filename+'"/>';
			} // foreach tile
			
			html += '<div class="clear"></div>';
			html += '</div>';
		}
		else {
			html = '<div class="levedit_palette_message">(No tileset selected for layer)</div>';
		}
		
		this.set_title( ww_fit_string(title, 120, session.em_width, 1) );
		this.set_content( html );
		this.show();
	},
	
	select_tile: function(filename) {
		var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: this.page.current_layer.Tileset } );
		if (tileset) {
			if (tileset.current_tile) {
				$('img_em_tile_'+tileset.current_tile).removeClass('selected');
			}
			tileset.current_tile = filename;
			$('img_em_tile_'+tileset.current_tile).addClass('selected');
		}
	},
	
	set_size: function(icon_size) {
		this.page.editor_prefs.tile_icon_size = icon_size;
		this.setup();
		user_storage_mark();
	},
	
	set_bkgnd: function(icon_bkgnd) {
		this.page.editor_prefs.tile_icon_bkgnd = icon_bkgnd;
		this.setup();
		user_storage_mark();
	},
	
	key_down: function(e, code) {
		var tileset = find_object( this.page._def.Tilesets.Tileset, { Name: this.page.current_layer.Tileset } );
		if (tileset) {
			var files = always_array( tileset.Files.File );
			var idx = -1;
			if (tileset.current_tile) idx = find_idx_in_array( files, tileset.current_tile );
			
			var icon_size = this.page.editor_prefs.tile_icon_size || 32;
			
			if (code == RIGHT_ARROW) {
				idx++;
				if (idx >= files.length) idx = files.length - 1;
			}
			else if (code == LEFT_ARROW) {
				idx--;
				if (idx < 0) idx = 0;
			}
			else if (code == DOWN_ARROW) {
				// okay, this is tough -- gotta predict which tile is "below" current one
				if (idx > -1) {
					var box = get_dom_object_info( $('img_em_tile_'+tileset.current_tile) );
					var x = box.left + (icon_size / 2);
					var y = box.top + box.height + 8 + (icon_size / 2);
					for (var idy = 0, ley = files.length; idy < ley; idy++) {
						var filename = files[idy];
						var tbox = get_dom_object_info( $('img_em_tile_'+filename) );
						if ((x >= tbox.left) && (y >= tbox.top) && (x < tbox.left + tbox.width) && (y < tbox.top + tbox.height)) {
							idx = idy;
							idy = ley;
						}
					}
				}
				else idx = 0;
			}
			else if (code == UP_ARROW) {
				// okay, this is tough -- gotta predict which tile is "above" current one
				if (idx > -1) {
					var box = get_dom_object_info( $('img_em_tile_'+tileset.current_tile) );
					var x = box.left + (icon_size / 2);
					var y = (box.top - 8) - (icon_size / 2);
					for (var idy = 0, ley = files.length; idy < ley; idy++) {
						var filename = files[idy];
						var tbox = get_dom_object_info( $('img_em_tile_'+filename) );
						if ((x >= tbox.left) && (y >= tbox.top) && (x < tbox.left + tbox.width) && (y < tbox.top + tbox.height)) {
							idx = idy;
							idy = ley;
						}
					}
				}
				else idx = 0;
			}
			
			if (idx > -1) {
				this.select_tile( files[idx] );
				this.page.toolbar.tool.show_tool_preview();
			}
			
		} // tileset
	}
} );
