// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

LevelEditor.Palette.subclass( 'LevelEditor.SpritesPalette', {
	name: 'sprites',
	icon: 'cogs.png',
	title: 'Sprite Classes',
	
	setup: function() {
		var html = '';
		this.sprites = [];
		
		if (this.page._def.Sprites.Sprite) {
			var sprites = sort_array( always_array( this.page._def.Sprites.Sprite ), { sort_by: 'Name', sort_dir: 1 } );
			for (var idx = 0, len = sprites.length; idx < len; idx++) {
				var sprite = sprites[idx];
				if ((sprite.Place == 1) && (parseInt(sprite.Width, 10) <= parseInt(this.page.game.PortWidth, 10)) && (parseInt(sprite.Height, 10) <= parseInt(this.page.game.PortHeight, 10))) {
					html += '<div id="d_emp_sprite_'+sprite.Name+'" class="'+((this.current_sprite == sprite.Name) ? 'file_object_selected' : 'file_object')+'" style="line-height:18px; margin:1px 0px;">';
					html += '<table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="16">' + icon('cog.png', '', "$P().pal('sprites').select_sprite('"+sprite.Name+"')") + '</td>';
					html += '<td width="3">' + spacer(3,1) + '</td>';
					html += '<td width="*" onClick="$P().pal(\'sprites\').select_sprite(\''+sprite.Name+'\')" style="cursor:pointer;"><b>' + ww_fit_string(sprite.Name, 120, session.em_width, 1) + '</b></td>';
					html += '</tr></table>';
					html += '</div>';
					this.sprites.push( sprite );
				} // place in levels
			} // foreach sprite
		}
		else {
			html = '<div class="levedit_palette_message">(No sprite classes defined)</div>';
		}
		
		this.set_content( html );
		this.show();
	},
	
	select_sprite: function(name) {
		if (this.current_sprite) {
			$('d_emp_sprite_'+this.current_sprite).className = 'file_object';
		}
		this.current_sprite = name;
		$('d_emp_sprite_'+this.current_sprite).className = 'file_object_selected';
		
		this.page.pal('inspector').setup();
	},
	
	key_down: function(e, code) {
		var sprites = this.sprites;
		
		var idx = -1;
		if (this.current_sprite) idx = find_object_idx( sprites, { Name: this.current_sprite } );
		
		if ((code == RIGHT_ARROW) || (code == DOWN_ARROW)) {
			idx++;
			if (idx >= sprites.length) idx = sprites.length - 1;
		}
		else if ((code == LEFT_ARROW) || (code == UP_ARROW)) {
			idx--;
			if (idx < 0) idx = 0;
		}
		
		if (idx > -1) {
			this.select_sprite( sprites[idx].Name );
			this.page.toolbar.tool.show_tool_preview();
		}
	},
	
	shutdown: function() {
		// called on page deactivate
		this.current_sprite = null;
	}
} );
