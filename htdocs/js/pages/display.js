// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameDisplay", {	
	
	onInit: function() {
		// render page HTML
		var html = '';
		
		html += '<h1 id="h_game_display_header">Loading...</h1>';
		
		html += '<div id="d_game_display_tab_bar"></div>';
		
		html += '<div id="d_game_display_content" class="game_main_area">';
		html += '<div class="blurb">' + get_string('/GameDisplay/Blurb') + '</div>';
		
		html += '<div id="d_game_display_form"></div>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(game_id) {
		if (!require_login()) {
			return false;
		}
		
		$('d_game_display_form').innerHTML = loading_image();
		
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
		
		// show_glog_widget( game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		$('d_game_display_tab_bar').innerHTML = '';
		$('h_game_display_header').innerHTML = '';
		$('d_game_display_form').innerHTML = '';
		// hide_glog_widget();
		return true;
	},
	
	setup_nav: function() {
		// setup title and nav
		Nav.title( "Display | " + this.game.Title );
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			[Nav.currentAnchor(), 'Display']
		);
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		this.setup_nav();
		
		$('d_game_display_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Display');
		
		$('h_game_display_header').innerHTML = fit_game_title(this.game.Title);
		
		var game = this.game;
		var html = '';
		
		html += '<table style="margin:20px;">';
		
		// port size
		html += '<tr><td align=right class="fe_label_left">Display&nbsp;Size:*</td><td align=left><input type=text id="fe_gd_port_width" class="fe_medium" size="5" maxlength="5" value="'+escape_text_field_value(game.PortWidth || 640)+'">&nbsp;x&nbsp;<input type=text id="fe_gd_port_height" class="fe_medium" size="5" maxlength="5" value="'+escape_text_field_value(game.PortHeight || 480)+'">&nbsp;(pixels)</td></tr>';
		html += '<tr><td></td><td class="caption"> Enter the size of your game display, in pixels.  If you don\'t know what this should be, leave it at the defaults.  You can always change it later. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// port background color
		html += '<tr><td align=right class="fe_label_left">Background&nbsp;Color:*</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_gd_bkgnd_color" value="'+escape_text_field_value(game.BackgroundColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_gd_bkgnd_color">' + get_color_preview(game.BackgroundColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Background Color...", "$P('GameDisplay').do_choose_color()") + 
				'<div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a default background color for your display.  You can always change this in your game code at any time, or set it per level.  This is just the default color shown while the game is loading. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// toolbar color
		html += '<tr><td align=right class="fe_label_left">Toolbar&nbsp;Color:*</td>';
		html += '<td align=left>';
			html += '<input type=hidden id="fe_gd_toolbar_color" value="'+escape_text_field_value(game.ToolbarColor)+'"/>';
			html += '<table><tr>';
			html += '<td id="td_gd_toolbar_color">' + get_color_preview(game.ToolbarColor) + '</td>';
			html += '<td>' + spacer(4,1) + '</td>';
			html += '<td style="font-size:11px">' + large_icon_button('color_wheel.png', "Select Toolbar Color...", "$P('GameDisplay').do_choose_toolbar_color()") + 
				'<div class="clear"></div></td>';
			html += '</tr></table>';
		html += '</td></tr>';
		
		html += '<tr><td></td><td align="left">';
			html += '<fieldset style="display:inline-block"><legend>Toolbar Preview</legend>';
		 	html += '<div id="d_gd_toolbar_preview" style="width:400px; height:24px;"></div>';
			html += '</fieldset>';
		html += '</td></tr>';
		
		html += '<tr><td></td><td class="caption"> Choose a toolbar theme color for your game.  The toolbar is shown under your game display, and has controls such as pause, zoom, sound/music, keyboard, embed and share.  This color is also used as a backdrop when popup dialogs are displayed. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// splash background image asset
		html += '<tr><td align=right class="fe_label_left">Splash&nbsp;Image:</td><td>';
			html += '<input type=hidden id="fe_gd_splash_image" value="'+escape_text_field_value(game.SplashImage)+'"/>';
			html += '<div id="d_gd_splash_image">';
			html += game.SplashImage ? this.render_splash_image(game.SplashImage) : this.render_splash_image_button();
			html += '</div>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally select a splash image, to be displayed before the game loads (only shown when the game is hosted on external sites, where the user must click to load).  The image can be any size, and will be centered if smaller than the main display size. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// preloader background image asset
		html += '<tr><td align=right class="fe_label_left">Loading&nbsp;Image:</td><td>';
			html += '<input type=hidden id="fe_gd_bkgnd_image" value="'+escape_text_field_value(game.BackgroundImage)+'"/>';
			html += '<div id="d_gd_bkgnd_image">';
			html += game.BackgroundImage ? this.render_bkgnd_image(game.BackgroundImage) : this.render_bkgnd_image_button();
			html += '</div>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Optionally select a background image, to be displayed while the game is loading.  This can be any size, and will be centered if smaller than the main display size. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
		
		// zoom options
		html += '<tr><td align=right class="fe_label_left">Zooming:</td><td align=left>';
		html += '<table cellspacing="0" cellpadding="0"><tr>';
		html += '<td class="fe_label">Allow Zoom:&nbsp;</td><td>' + menu( 'fe_gd_zoom', ['Yes', 'No', 'Auto'], game.Zoom, {'class':'fe_small_menu'} ) + '</td>';
		html += '<td>' + spacer(20,1) + '</td>';
		html += '<td class="fe_label">Filter:&nbsp;</td><td>' + menu( 'fe_gd_zoom_filter', ['Sharp', 'Smooth'], game.ZoomFilter, {'class':'fe_small_menu'} ) + '</td>';
		html += '<td>' + spacer(20,1) + '</td>';
		html += '<td class="fe_label">Default:&nbsp;</td><td>' + menu( 'fe_gd_zoom_default', [[1,'1X'], [2,'2X'], [3,'3X'], [3,'4X']], game.ZoomDefault, {'class':'fe_small_menu'} ) + '</td>';
		html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose whether you would like users to able to zoom your game display (up to 4X size), disable zooming altogether (always run at native size), or automatically zoom based on the window size.  Also, if you enabled zoom, choose whether you want sharp (nearest neighbor) or smooth (bicubic) interpolation.  Finally, choose the default (initial) zoom level for new players. </td></tr>';
		html += '<tr><td></td><td><div class="form_spacer"></div></td></tr>';
	
		// frame rate / skip
		html += '<tr><td align=right class="fe_label_left">Animation:</td><td align=left>';
		html += '<table cellspacing="0" cellpadding="0"><tr>';
		html += '<td class="fe_label">Frame Rate:&nbsp;</td><td><input type=text id="fe_gd_frame_rate" class="fe_medium" size="5" maxlength="5" value="'+escape_text_field_value(game.FrameRate)+'">&nbsp;(fps)</td>';
		html += '<td>' + spacer(20,1) + '</td>';
		html += '<td><input type=checkbox id="fe_gd_frame_skip" value="1" ' + ((game.SkipFrames == 1) ? 'checked="checked"' : '') + '/><label for="fe_gd_frame_skip">Enable Frame Skip</label></td>';
		html += '</tr></table>';
		html += '</td></tr>';
		html += '<tr><td></td><td class="caption"> Choose a target frame rate (in frames per second) for your game.  Depending on the complexity of your graphics (number of onscreen layers and sprites), you may have to turn this down to run smoothly on all machines.  Also choose whether you want to skip frames when the user\'s machine is unable to maintain the target frame rate, or render each and every frame no matter what. </td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '<tr><td colspan="2" align="right" class="fe_label">* Denotes a required field.</td></tr>';
		html += '<tr><td colspan=2>' + spacer(1,15) + '</td></tr>';
		
		html += '</table>';
		
		html += '<center><table style="margin-bottom:20px;"><tr>';
			html += '<td>' + large_icon_button('controller_add.png', '<b>Save Changes</b>', "$P('GameDisplay').save()") + '</td>';
		html += '</tr></table></center>';
		
		$('d_game_display_form').innerHTML = html;
		
		var self = this;
		setTimeout( function() { self.update_toolbar_preview(); }, 1 );		
	},
	
	// splash image
	
	render_splash_image: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameDisplay').remove_splash_image()", "Remove Splash Image") + '</td>';
		html += '<td id="td_gd_splash_image" width="200">' + asset_icon_link(this.game_id, path, '', 180) + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_splash_image_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('page_white_magnify.png', "Select Image...", "$P('GameDisplay').choose_splash_image()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_splash_image: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Splash Image", this.game_id, session.imageResourceMatchString, $('fe_gd_splash_image').value, [this, 'choose_splash_image_finish'], '' );
	},
	
	choose_splash_image_finish: function(path) {
		$('fe_gd_splash_image').value = path;
		$('d_gd_splash_image').innerHTML = this.render_splash_image(path);
	},
	
	remove_splash_image: function() {
		$('fe_gd_splash_image').value = '';
		$('d_gd_splash_image').innerHTML = this.render_splash_image_button();
	},
	
	// background image
	
	render_bkgnd_image: function(path) {
		var html = '';
		html += '<table class="prop_table"><tr>';
		html += '<td height="22">' + icon('delete.png', '', "$P('GameDisplay').remove_bkgnd_image()", "Remove Background Image") + '</td>';
		html += '<td id="td_gd_bkgnd_image" width="200">' + asset_icon_link(this.game_id, path, '', 180) + '</td>';
		html += '</tr></table>';
		return html;
	},
	
	render_bkgnd_image_button: function() {
		var html = '';
		html += '<div style="font-size:11px">';
		html += large_icon_button('page_white_magnify.png', "Select Image...", "$P('GameDisplay').choose_bkgnd_image()");
		html += '<div class="clear"></div>';
		html += '</div>';
		return html;
	},
	
	choose_bkgnd_image: function() {
		// choose asset file via dialog, and insert into DOM and form elements
		dasset.choose("Select Loading Image", this.game_id, session.imageResourceMatchString, $('fe_gd_bkgnd_image').value, [this, 'choose_bkgnd_image_finish'], '' );
	},
	
	choose_bkgnd_image_finish: function(path) {
		$('fe_gd_bkgnd_image').value = path;
		$('d_gd_bkgnd_image').innerHTML = this.render_bkgnd_image(path);
	},
	
	remove_bkgnd_image: function() {
		$('fe_gd_bkgnd_image').value = '';
		$('d_gd_bkgnd_image').innerHTML = this.render_bkgnd_image_button();
	},
	
	update_toolbar_preview: function() {
		// update toolbar preview
		var clr_hex = $('fe_gd_toolbar_color').value;
		var div = $('d_gd_toolbar_preview');
		div.style.backgroundColor = clr_hex;
		
		// set preview image based on if color is more towards black, or more towards white
		var clr = HEX2RGB(clr_hex);
		var avg = (clr.r + clr.g + clr.b) / 3;
		var theme = (avg > 128) ? 'light' : 'dark';
		div.style.backgroundImage = 'url(images/engine/toolbar/preview-for-'+theme+'-clrs.png)';
		div.style.backgroundRepeat = 'no-repeat';
	},
	
	do_choose_toolbar_color: function() {
		do_select_color($('fe_gd_toolbar_color').value, [this, 'do_choose_toolbar_color_finish']);
	},
	
	do_choose_toolbar_color_finish: function(hex) {
		$('fe_gd_toolbar_color').value = hex;
		$('td_gd_toolbar_color').innerHTML = get_color_preview(hex);
		this.update_toolbar_preview();
	},
	
	do_choose_color: function() {
		do_select_color($('fe_gd_bkgnd_color').value, [this, 'do_choose_color_finish']);
	},
	
	do_choose_color_finish: function(hex) {
		$('fe_gd_bkgnd_color').value = hex;
		$('td_gd_bkgnd_color').innerHTML = get_color_preview(hex);
	},
	
	save: function() {
		clear_field_error();
		
		var port_width = trim( $('fe_gd_port_width').value );
		if (!port_width.match(/^\d+$/)) return bad_field('fe_gd_port_width', "Please enter an integer for the game display width.");
		if (parseInt(port_width, 10) < 256) return bad_field('fe_gd_port_width', "Your game display must be at least 256 pixels wide.");
		
		var port_height = trim( $('fe_gd_port_height').value );
		if (!port_height.match(/^\d+$/)) return bad_field('fe_gd_port_height', "Please enter an integer for the game display height.");
		if (parseInt(port_height, 10) < 240) return bad_field('fe_gd_port_height', "Your game display must be at least 240 pixels high.");
		
		var zoom_mode = get_menu_value('fe_gd_zoom');
		var zoom_filter = get_menu_value('fe_gd_zoom_filter');
		var zoom_default = get_menu_value('fe_gd_zoom_default');

		var frame_rate = trim( $('fe_gd_frame_rate').value );
		if (!frame_rate) return bad_field('fe_gd_frame_rate', "Please enter a desired frame rate for your game.");
		if (!frame_rate.match(/^\d+$/)) return bad_field('fe_gd_frame_rate', "Please enter an integer for your frame rate.");

		var skip_frames = $('fe_gd_frame_skip').checked ? 1 : 0;
		
		var color = $('fe_gd_bkgnd_color').value;
		
		var splash_image = $('fe_gd_splash_image').value;
		var bkgnd_image = $('fe_gd_bkgnd_image').value;
		
		var toolbar_color = $('fe_gd_toolbar_color').value;
		
		effect_api_mod_touch('game_get', 'get_user_games');
		effect_api_send('game_update', {
			GameID: this.game.GameID,
			PortWidth: port_width,
			PortHeight: port_height,
			Zoom: zoom_mode,
			ZoomFilter: zoom_filter,
			ZoomDefault: zoom_default,
			FrameRate: frame_rate,
			SkipFrames: skip_frames,
			BackgroundColor: color,
			SplashImage: splash_image,
			BackgroundImage: bkgnd_image,
			ToolbarColor: toolbar_color
		}, [this, 'save_finish'], { } );
	},
	
	save_finish: function(response, tx) {
		this.game = response.Game;
		if (page_manager.find('Game')) $P('Game').game = response.Game;
		do_message('success', "Game display info saved successfully.");
		Nav.go('Game/' + this.game.GameID);
	}
	
} );
