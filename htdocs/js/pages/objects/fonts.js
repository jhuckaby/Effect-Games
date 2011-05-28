// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameEditFont", {
	
	glyphs_per_row: 16,
	num_glyphs: config.BitmapFontGlyphs.length,
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_edit_font_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_font_tab_bar"></div>';
		
		html += '<div id="d_game_edit_font_content" class="game_main_area">';
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		$('d_game_edit_font_content').innerHTML = loading_image();
		
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
		$('h_game_edit_font_header').innerHTML = '';
		$('d_game_edit_font_tab_bar').innerHTML = '';
		$('d_game_edit_font_content').innerHTML = '';
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_font_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Objects');
		
		$('h_game_edit_font_header').innerHTML = fit_game_title(this.game.Title);
				
		if (this.args.font_id) {
			this.do_edit_font(this.args.font_id);
		}
		else {
			// create new font
			Nav.bar(
				['Main', 'EffectGames.com'],
				['Home', 'My Home'],
				['Game/' + this.game.GameID, this.game.Title],
				['GameObjects/' + this.game.GameID, 'Objects'],
				[Nav.currentAnchor(), 'New Bitmap Font']
			);

			Nav.title( 'New Bitmap Font | ' + this.game.Title );

			this.font = null;
			this.draw_font_form( merge_objects({
				Enabled: 1, 
				Size: 32, 
				GlyphWidth: 32, 
				GlyphHeight: 32, 
				Color: '#000000',
				AntiAlias: 1
			}, this.args) );
		}
	},
	
	do_edit_font: function(font_id) {
		// edit existing font
		if (this.font && (this.font.Name == font_id)) {
			// font already loaded and ID matches, so proceed directly to drawing page
			this.do_edit_font_2();
		}
		else {
			// load font from server
			effect_api_get('game_object_get', {
				game_id: this.game_id,
				'type': 'font',
				id: font_id
			}, [this, 'do_edit_font_2'], {});
		}
	},
	
	do_edit_font_2: function(response) {
		// edit existing font
		if (response) {
			this.font = response.Item;
		}
		var title = 'Editing Font "'+this.font.Name+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameObjects/' + this.game.GameID, 'Objects'],
			[Nav.currentAnchor(), 'Edit Bitmap Font']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		this.draw_font_form( this.font );
	},
	
	draw_font_form: function(font) {
		var html = '';
		
		html += '<div class="blurb">' + get_string('/GameEditFont/Blurb') + '</div>';
		
		if (font.Name) html += '<h1>Editing Bitmap Font "'+font.Name+'"</h1>';
		else html += '<h1>Create New Bitmap Font</h1>';
		
		html += '<form method=get action="javascript:void(0)">';
		html += '<table style="margin:20px;">';
		
		// font name
		html += '<tr><td align=right class="fe_label_left">Font&nbsp;Name:*</td>';
		html += '<td align=left><input type=text id="fe_ebf_id" class="fe_medium" size="25" maxlength="32" value="'+escape_text_field_value(font.Name)+'"></td></tr>';
		html += '<tr><td></td><td class="caption"> Enter a name for your bitmap font, using only alphanumeric characters.  You might want to include the size and color in the name, for better identification later. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// load
		html += '<tr><td align=right class="fe_label_left">Enabled:</td>';
		html += '<td align=left><input type=checkbox id="fe_ebf_load" value="1" ' + ((font.Enabled == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_ebf_load">Load Font at Game Startup</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether this font is enabled (automatically loaded at startup), or disabled.  Only enabled fonts are loaded and available for use in your game. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// asset path
		html += '<tr><td align=right class="fe_label_left">Font&nbsp;Source:*</td><td>';
		html += '<input type=hidden id="fe_ebf_path" value="'+escape_text_field_value(font.Path)+'"/>';
		html += '<div id="d_ebf_path">';
		html += font.Path ? this.render_font_path(font.Path) : this.render_font_path_button();
		html += '</div>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose an actual TrueType or OpenType font as the source for the bitmap font.  You are responsible for creating or locating font sources and uploading them to Asset Manager.  But beware of using copyrighted fonts in your games! </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// point size
		html += '<tr><td align=right class="fe_label_left">Font&nbsp;Size:*</td>';
		html += '<td align=left>';
		html += '<input type="text" id="fe_ebf_size" class="fe_medium" size="5" value="'+escape_text_field_value(font.Size)+'"/>&nbsp;(points)';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Enter the font point size for rendering the bitmap.  Depending on the font, you may have to adjust this value versus the glyph size to get the desired effect. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// glyph size
		html += '<tr><td align=right class="fe_label_left">Glyph&nbsp;Size:*</td>';
		html += '<td align=left>';
		html += '<input type=text id="fe_ebf_width" class="fe_medium" size=5 value="'+escape_text_field_value(font.GlyphWidth)+'"/>&nbsp;x&nbsp;<input type=text id="fe_ebf_height" class="fe_medium" size=5 value="'+escape_text_field_value(font.GlyphHeight)+'"/>&nbsp;(pixels)';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Enter the pixel width and height of the font glyphs.  This should typically be equal to or near the point size, but can vary from font to font. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// color
		html += '<tr><td align=right class="fe_label_left">Text&nbsp;Color:*</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_ebf_color" value="'+escape_text_field_value(font.Color)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_ebf_color">' + get_color_preview(font.Color) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Color...", "$P('GameEditFont').do_choose_color()") + 
				'<div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a color for your text.  Since the font will be rasterized into a bitmap, you must choose the color beforehand.  You can create multiple fonts if you need different colored text in the same game. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// anti-alias
		html += '<tr><td align=right class="fe_label_left">Quality:</td>';
		html += '<td align=left><input type=checkbox id="fe_ebf_antialias" value="1" ' + ((font.AntiAlias == 1) ? 'checked="checked"' : '') + '>';
		html += '<label for="fe_ebf_antialias">Anti-aliasing Enabled</label>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you want font smoothing (anti-alias) enabled or not. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// preview
		html += '<tr><td colspan=2>';
		html += '<fieldset><legend>Font Preview</legend>';
			html += '<table><tr>';
			
				html += '<td style="font-size:11px"><b>Background:</b>&nbsp;' + 
					menu('fe_ebf_previewbkgnd', [
						['checkerboard.gif','Checkerboard'],
						['#000','Black'],
						['#fff','White'],
						['#888','Gray']
					], '', { 'class': 'fe_small_menu', 'onChange': "$P('GameEditFont').get_font_preview()" }) + '</td>';
				
				html += '<td>' + spacer(8,1) + '</td>';
				
				html += '<td style="font-size:11px">' + large_icon_button('arrow_refresh.png', "Update Preview", "$P('GameEditFont').get_font_preview()") + 
					'<div class="clear"></div></td>';
				
				html += '<td>' + spacer(8,1) + '</td>';
				
				html += '<td style="font-size:11px">' + large_icon_button('disk.png', "Download Image...", "$P('GameEditFont').download_preview()") + 
					'<div class="clear"></div></td>';
			
			html += '</tr></table>';
			html += '<div id="d_ebf_preview_scrollarea">';
			if (!font.Path) html += this.get_empty_preview_msg();
			html += '</div>';
		html += '</fieldset>';
		html += '</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		// footer
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
				
		html += '<center><table style="margin-bottom:20px;"><tr>';
			if (font.Name) {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('style_edit.png', '<b>Save Changes</b>', "$P('GameEditFont').save()") + '</td>';
			}
			else {
				html += '<td>' + large_icon_button('x', 'Cancel', "#GameObjects/" + this.game.GameID) + '</td>';
				html += '<td width=50>&nbsp;</td>';
				html += '<td>' + large_icon_button('style_add.png', '<b>Create Font</b>', "$P('GameEditFont').save()") + '</td>';
			}
		html += '</tr></table></center>';
		
		html += '</form>';
		
		$('d_game_edit_font_content').innerHTML = html;
		
		var self = this;
		if (font.Path) setTimeout( function() {
			self.get_font_preview();
		}, 1 );
		
		if (!font.Name) safe_focus('fe_ebf_id');
	},
	
	do_choose_color: function() {
		do_select_color($('fe_ebf_color').value, [this, 'do_choose_color_finish']);
	},
	
	do_choose_color_finish: function(hex) {
		$('fe_ebf_color').value = hex;
		$('td_ebf_color').innerHTML = get_color_preview(hex);
	},
	
	get_preview_msg: function(msg) {
		// return HTML for showing message in center of preview scroll area
		return '<div style="text-align:center; margin-top:40px; margin-bottom:40px;">' + msg + '</div>';
	},
	
	get_empty_preview_msg: function() {
		// return HTML for showing "No folder selected" message
		return this.get_preview_msg('(No source font selected)');
	},
	
	preview_error: function(msg) {
		// populate preview area with error msg
		$('d_ebf_preview_scrollarea').innerHTML = this.get_preview_msg("(" + msg + ")");
	},
	
	get_font_preview_url: function(glyphs_per_row) {
		// get font preview url
		if (!glyphs_per_row) glyphs_per_row = this.glyphs_per_row;
		
		// validate form
		var path = $('fe_ebf_path').value;
		if (!path) return this.preview_error("No font asset selected");
		
		var point_size = $('fe_ebf_size').value;
		if (!point_size) return this.preview_error("Please enter a font point size");
		if (!point_size.match(/^\d+$/)) return this.preview_error("You have entered an invalid point size");
		
		var glyph_width = $('fe_ebf_width').value;
		if (!glyph_width) return this.preview_error("Please enter a glyph pixel width");
		if (!glyph_width.match(/^\d+$/)) return this.preview_error("You have entered an invalid glyph pixel width");
		
		var glyph_height = $('fe_ebf_height').value;
		if (!glyph_height) return this.preview_error("Please enter a glyph pixel height");
		if (!glyph_height.match(/^\d+$/)) return this.preview_error("You have entered an invalid glyph pixel height");
		
		var color = $('fe_ebf_color').value;
		var antialias = $('fe_ebf_antialias').checked ? 1 : 0;
		
		// request font grid img
		var url = '/effect/api/game_preview_font_grid.png' + composeQueryString({
			game_id: this.game_id,
			font: path,
			size: point_size,
			color: color,
			width: glyph_width,
			height: glyph_height,
			glyphs_per_row: glyphs_per_row,
			antialias: antialias
			// random: Math.random()
		});
		
		return url;
	},
	
	get_font_preview: function() {
		// $('d_ebf_preview_scrollarea').innerHTML = busy();
		var url = this.get_font_preview_url();
		
		Debug.trace('font', "Requesting font grid image: " + url);
		
		var bkgnd = get_menu_value('fe_ebf_previewbkgnd');
		var bkgnd_sty = bkgnd.match(/\#\w+$/) ? 
			('background-color:'+bkgnd+';') : 
			('background-image:url(images/font_preview_backgrounds/'+bkgnd+');');
		
		var glyph_width = $('fe_ebf_width').value;
		var glyph_height = $('fe_ebf_height').value;
		
		var canvas_width = parseInt(glyph_width, 10) * parseInt(this.glyphs_per_row, 10);
		var canvas_height = parseInt(glyph_height, 10) * (Math.floor(this.num_glyphs / this.glyphs_per_row) + 1);
		if (this.glyphs_per_row % this.num_glyphs == 0) canvas_height -= parseInt(glyph_height, 10);
		
		var grid_html = '';
		
		$('d_ebf_preview_scrollarea').innerHTML = 
			'<div style="margin:10px; display:inline-block; border:1px solid #aaa; '+bkgnd_sty+'">' + 
			'<div style="width:'+canvas_width+'px; height:'+canvas_height+'px; overflow:hidden; background:url('+url+') no-repeat;">'+grid_html+'</div>' + 
			'</div>';
		
		/* $('d_ebf_preview_scrollarea').innerHTML = 
			'<div style="margin:10px; padding:10px; border:1px solid #aaa; background-image:url(images/font_preview_backgrounds/'+bkgnd+')">' + 
			'<img src="'+url+'"/>' + 
			'</div>'; */
	},
	
	download_preview: function() {
		// download preview image
		var url = this.get_font_preview_url(this.num_glyphs) + '&download=1';
		location.href = url;
	},
	
	render_font_path: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameEditFont').remove_font_path()", "Remove Font") + '</td>';
		html += '<td>' + asset_icon_link(this.game_id, path, '') + '</td>';
		// html += '<td>' + icon('folder.png', '<b>' + path.replace(/^\//, '').replace(/\/$/, '') + '</b>') + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_font_path_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('folder_magnify.png', "Select Font...", "$P('GameEditFont').choose_font_path()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_font_path: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Font", this.game_id, '\.(ttf|otf)$', $('fe_ebf_path').value, [this, 'choose_font_path_finish'], '');
	},
	
	choose_font_path_finish: function(path) {
		$('fe_ebf_path').value = path;
		$('d_ebf_path').innerHTML = this.render_font_path(path);
	},
	
	remove_font_path: function() {
		$('fe_ebf_path').value = '';
		$('d_ebf_path').innerHTML = this.render_font_path_button();
		$('d_ebf_preview_scrollarea').innerHTML = this.get_empty_preview_msg();
	},
	
	save: function() {
		// save font changes, or add new font
		clear_field_error();
		
		var font = {
			Name: trim($('fe_ebf_id').value),
			Path: $('fe_ebf_path').value,
			Enabled: $('fe_ebf_load').checked ? '1' : '0',
			Size: trim($('fe_ebf_size').value),
			GlyphWidth: trim($('fe_ebf_width').value),
			GlyphHeight: trim($('fe_ebf_height').value),
			Color: $('fe_ebf_color').value,
			AntiAlias: $('fe_ebf_antialias').checked ? '1' : '0'
		};
		
		// text field validation
		if (!font.Name) return bad_field('fe_ebf_id', "Please enter a Font Name.");
		if (!font.Name.match($R.GameObjectID)) return bad_field('fe_ebf_id', "Your Font Name is invalid.  Please use only alphanumerics and dashes, 2 characters minimum, and begin and end with an alpha char.");
		if (!check_reserved_word(font.Name)) return bad_field('fe_ebf_id', "Your Font Name is a reserved word.  Please choose another.");
		if (font.Name.length > 32) return bad_field('fe_ebf_id', "Your Font Name is too long.  Please keep it to 32 characters or less.");
		
		if (!font.Path) {
			do_message('error', "Please select a source font asset (TrueType or OpenType).");
			return;
		}
		
		if (!font.Size) return bad_field('fe_ebf_size', "Please enter a font point size.");
		if (!font.Size.match(/^\d+$/)) return bad_field('fe_ebf_size', "Your font point size must be an integer.");
		if (parseInt(font.Size, 10) > 128) return bad_field('fe_ebf_size', "Your font point size must be 128 or less.");
		
		if (!font.GlyphWidth) return bad_field('fe_ebf_width', "Please enter a font glyph width, in pixels.");
		if (!font.GlyphWidth.match(/^\d+$/)) return bad_field('fe_ebf_width', "Your font glyph width must be an integer.");
		if (parseInt(font.GlyphWidth, 10) > 128) return bad_field('fe_ebf_width', "Your font glyph width must be 128 or less.");
		
		if (!font.GlyphHeight) return bad_field('fe_ebf_height', "Please enter a font glyph height, in pixels.");
		if (!font.GlyphHeight.match(/^\d+$/)) return bad_field('fe_ebf_height', "Your font glyph height must be an integer.");
		if (parseInt(font.GlyphHeight, 10) > 128) return bad_field('fe_ebf_height', "Your font glyph height must be 128 or less.");
		
		// create new or save existing
		effect_api_mod_touch('game_objects_get', 'game_object_get');
		
		if (this.font) {
			// update existing font
			effect_api_send('game_update_object', merge_objects(font, {
				GameID: this.game_id,
				OldName: this.font.Name,
				Type: 'font'
			}), [this, 'save_finish'], { _font: font });
		}
		else {
			// create new font
			effect_api_send('game_create_object', merge_objects(font, {
				GameID: this.game_id,
				Type: 'font'
			}), [this, 'save_finish'], { _font: font });
		} // create new
	},
	
	save_finish: function(response, tx) {
		// save complete
		if (this.font) {
			// updated existing font
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Saved bitmap font \""+tx._font.Name+"\".");
			this.font = tx._font;
		}
		else {
			// created new font
			Nav.go('#GameObjects/' + this.game_id);
			do_message('success', "Created new bitmap font \""+tx._font.Name+"\".");
			this.font = tx._font;
		}
	}
} );
