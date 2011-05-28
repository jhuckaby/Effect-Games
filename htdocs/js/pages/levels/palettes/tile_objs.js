// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.TileObjectsPalette', {
	name: 'tile_objs',
	icon: 'bricks_bw.png',
	title: 'Tile Classes',
	
	setup: function() {
		var html = '';
		if (this.page._def.Tiles.Tile) {
			var tiles = sort_array( always_array( this.page._def.Tiles.Tile ), { sort_by: 'Name', sort_dir: 1 } );
			for (var idx = 0, len = tiles.length; idx < len; idx++) {
				var tile = tiles[idx];
				html += '<div id="d_emp_tile_obj_'+tile.Name+'" class="'+((this.current_tile_obj == tile.Name) ? 'file_object_selected' : 'file_object')+'" style="line-height:18px; margin:1px 0px;">';
				html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
				html += '<td width="3">' + spacer(3,1) + '</td>';
				html += '<td width="16">' + icon('brick.png', '', "$P().pal('tile_objs').select_tile_obj('"+tile.Name+"')") + '</td>';
				html += '<td width="3">' + spacer(3,1) + '</td>';
				html += '<td width="*" onClick="$P().pal(\'tile_objs\').select_tile_obj(\''+tile.Name+'\')" style="cursor:pointer;"><b>' + ww_fit_string(tile.Name, 120, session.em_width, 1) + '</b></td>';
				html += '</tr></table>';
				html += '</div>';
			} // foreach tile
		}
		else {
			html = '<div class="levedit_palette_message">(No tile classes defined)</div>';
		}
		
		this.set_content( html );
		this.show();
	},
	
	select_tile_obj: function(name) {
		if (this.current_tile_obj) {
			$('d_emp_tile_obj_'+this.current_tile_obj).className = 'file_object';
		}
		this.current_tile_obj = name;
		$('d_emp_tile_obj_'+this.current_tile_obj).className = 'file_object_selected';
		
		this.page.pal('inspector').setup();
	},
	
	key_down: function(e, code) {
		var tiles = sort_array( always_array( this.page._def.Tiles.Tile ), { sort_by: 'Name', sort_dir: 1 } );
		
		var idx = -1;
		if (this.current_tile_obj) idx = find_object_idx( tiles, { Name: this.current_tile_obj } );
				
		if ((code == RIGHT_ARROW) || (code == DOWN_ARROW)) {
			idx++;
			if (idx >= tiles.length) idx = tiles.length - 1;
		}
		else if ((code == LEFT_ARROW) || (code == UP_ARROW)) {
			idx--;
			if (idx < 0) idx = 0;
		}
		
		if (idx > -1) {
			this.select_tile_obj( tiles[idx].Name );
			this.page.toolbar.tool.show_tool_preview();
		}
	},
	
	shutdown: function() {
		// called on page deactivate
		this.current_tile_obj = null;
	}
} );
