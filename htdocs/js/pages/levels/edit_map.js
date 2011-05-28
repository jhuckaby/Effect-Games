// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.GameLevelMapEdit", {
	
	pal: function(name) {
		// shortcut for palette_manager.find()
		return this.palette_manager.find(name);
	},
	
	onInit: function() {
		// render page HTML
		this.grid_enabled = false;
		this.bkgnd_visible = true;
		
		var html = '';
		
		html += '<h1 id="h_game_edit_level_map_header">Loading...</h1>';
		
		html += '<div id="d_game_edit_level_map_tab_bar"></div>';
		
		html += '<div id="d_game_edit_level_map_content" class="game_main_area">';
		// html += '<div class="blurb">' + get_string('/GameLevels/Blurb') + '</div>';
		
		html += '<div id="h_em_header" class="h2">';
			html += '<div id="d_em_header" class="fl"></div>';
			
			html += '<div class="fr"><a href="javascript:void($P().save())" title="Save Changes" id="a_em_header_save" class="icon" style="background-image:url(images/icons/disk.png)">Save Changes</a></div>';
			html += '<div class="fr"><a href="javascript:void($P().exit())" title="Exit Editor" id="a_em_header_exit" class="icon" style="background-image:url(images/icons/x.gif)">Exit Editor</a></div>';
			
			html += '<div class="fr" style="width:1px; height:16px; margin-top:3px; margin-left:9px; margin-right:6px; border-left:2px ridge #efefef;"></div>';
			
			html += '<div class="fr emh_text">Zoom:&nbsp;' + 
				menu('fe_em_zoom', [[1,'1X'], [2,'2X'], [3,'3X'], [3,'4X']], '', 
					{'class':'fe_small_menu', 'onChange':'$P().change_zoom_level(this.options[this.selectedIndex].value)'}) + '</div>';
			
			html += '<div class="fr" style="width:1px; height:16px; margin-top:3px; margin-left:9px; margin-right:6px; border-left:2px ridge #efefef;"></div>';
			
			html += '<div class="fr"><a href="javascript:void($P().undo_manager.redo())" title="Redo" id="a_em_header_redo" class="icon disabled" style="background-image:url(images/icons/arrow_redo.png)">Redo</a></div>';
			html += '<div class="fr"><a href="javascript:void($P().undo_manager.undo())" title="Undo" id="a_em_header_undo" class="icon disabled" style="background-image:url(images/icons/arrow_undo.png)">Undo</a></div>';
			
			html += '<div class="clear"></div>';
		html += '</div>';
		
		// toolbar, iframe, palettes
		html += '<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
		
		// toolbar
		html += '<td width="32" rowspan="2" align="left" valign="top">';
		html += '<div class="levedit_palette_title">Tools</div>';
		html += '<div class="levedit_palette_content" id="d_em_toolbar" style="padding-top:6px; padding-bottom:6px;">';
		
			this.toolbar = new LevelEditor.Toolbar( this );
			this.toolbar.register( new LevelEditor.PointerTool() );
			this.toolbar.register( new LevelEditor.PencilTool() );
			this.toolbar.register( new LevelEditor.PaintBucketTool() );
			this.toolbar.register( new LevelEditor.EraserTool() );
			this.toolbar.register( new LevelEditor.EyeDropperTool() );
			this.toolbar.register( new LevelEditor.ScrollTool() );
			html += '<center>' + this.toolbar.get_html() + '</center>';
		
		html += '</div>';
		html += '</td>';
		
		html += '<td width="10" rowspan="2">'+spacer(10,1)+'</td>';
		
		// iframe
		html += '<td width="*" align="center" valign="top">';
			html += '<table cellspacing="0" cellpadding="0" border="0">';
			html += '<tr><td>';
				html += '<iframe src="javascript:void(0)" id="i_levedit" class="levedit" style="width:1px; height:1px;" margin="0" border="0" frameborder="0"></iframe>';
			html += '</td><td valign="top">';
				html += '<div id="d_em_scrollbar_vert" style="width:16px; border-top:1px solid #ddd; display:none;"></div>';
			html += '</td></tr>';
			html += '<tr><td>';
				html += '<div id="d_em_scrollbar_horiz" style="height:16px; border-left:1px solid #ddd; display:none;"></div>';
			html += '</td><td></td></tr>';
			html += '</table>';
		html += '</td>';
		
		html += '<td width="10" rowspan="2">'+spacer(10,1)+'</td>';
		
		// palettes
		html += '<td width="180" rowspan="2" align="left" valign="top">';
		html += spacer(180,1) + '<br/>';
			
			// setup palettes
			this.palette_manager = new LevelEditor.PaletteManager( this );
			this.palette_manager.register( new LevelEditor.NavigatorPalette() );
			this.palette_manager.register( new LevelEditor.LayersPalette() );
			this.palette_manager.register( new LevelEditor.TilesetPalette() );
			this.palette_manager.register( new LevelEditor.TileObjectsPalette() );
			this.palette_manager.register( new LevelEditor.SpritesPalette() );
			this.palette_manager.register( new LevelEditor.InspectorPalette() );
			html += this.palette_manager.get_html();
		
		html += '</td>';
		
		html += '</tr>';
		
		// infobar on its own row
		html += '<tr>';
		html += '<td width="*" align="center" valign="bottom">';
			html += '<div id="d_em_infobar_wrapper">';
				html += '<div id="d_em_infobar">';
					html += '<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr>';
					html += '<td width="33%" align="left" id="td_em_infobar_left">&nbsp;</td>';
					html += '<td width="34%" align="center" id="td_em_infobar_center">&nbsp;</td>';
					html += '<td width="33%" align="right" id="td_em_infobar_right">';
						html += '<table cellspacing="0" cellpadding="0" border="0"><tr>';
						html += '<td>';
							html += '<input type="checkbox" id="fe_em_grid" value="1" onClick="$P().set_grid(this.checked)"/>';
							html += '<label for="fe_em_grid">Show&nbsp;Grid:&nbsp;</label>';
						html += '</td>';
						html += '<td>';
							html += '<input type="text" id="fe_em_grid_width" class="fe_smaller" size="3" value="" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().set_grid()"/>x';
							html += '<input type="text" id="fe_em_grid_height" class="fe_smaller" size="3" value="" onFocus="session.fitf=1;" onBlur="session.fitf=0;" onChange="$P().set_grid()"/>';
						html += '</td>';
						html += '</tr></table>';
					html += '</td>';
					html += '</tr></table>';
				html += '</div>';
			html += '</div>';
		html += '</td>';
		html += '</tr>';
		
		html += '</table>';
		
		html += '</div>';
		
		this.div.innerHTML = html;
	},
	
	onActivate: function(args) {
		if (!args) args = {};
		
		if (!require_login()) {
			return false;
		}
		
		this.args = args;
		assert( args.game_id, "Edit Level Map: No Game ID specified." );
		assert( args.level_id, "Edit Level Map: No Level ID specified." );
		
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
		
		session.hooks.key_down = [this, 'handle_key_down'];
		session.hooks.key_up = [this, 'handle_key_up'];
		
		this.dirty = false;
		
		show_glog_widget( args.game_id );
		
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		
		// ask to save changes if dirty
		if (this.dirty && !confirm("Are you sure you want to navigate away from this page?  If you continue, your unsaved changes will be lost.")) { 
			return false; 
		}
		
		if (this.toolbar) {
			this.toolbar.shutdown();
		}
		
		// kill iframe with prejudice
		this.bar_horiz = null;
		this.bar_vert = null;
		this.arrow_left = null;
		this.arrow_right = null;
		this.arrow_up = null;
		this.arrow_down = null;
		
		this._grid = null;
		this._tool_preview = null;
		this._def = null;
		this._iframe = null;
		this._game = null;
		this._port = null;
		this._image_loader = null;
		
		$('i_levedit').src = 'blank.html';
		
		delete session.hooks.key_down;
		delete session.hooks.key_up;
				
		this.palette_manager.hide_all();
		this.palette_manager.shutdown();
		
		hide_glog_widget();
		
		return true;
	},
	
	receive_game: function(response, tx) {
		// receive game info from server
		if (response) {
			this.game = response.Game;
			this.game_id = this.game.GameID; 
		}
		
		$('d_game_edit_level_map_tab_bar').innerHTML = get_game_tab_bar(this.game_id, 'Levels');
		
		$('h_game_edit_level_map_header').innerHTML = fit_game_title(this.game.Title);
		
		// recover settings from storage
		if (!session.storage.games) session.storage.games = {};
		var games = session.storage.games;

		// game specific prefs
		if (!games[this.game_id]) games[this.game_id] = {};
		this.game_prefs = games[this.game_id];
		
		// level specific prefs
		if (!this.game_prefs.levels) this.game_prefs.levels = {};
		if (!this.game_prefs.levels[this.args.level_id]) this.game_prefs.levels[this.args.level_id] = {};
		this.level_prefs = this.game_prefs.levels[this.args.level_id];
		
		// global level editor prefs
		if (!session.storage.le_prefs) session.storage.le_prefs = {};
		this.editor_prefs = session.storage.le_prefs;
		
		// section prefs in game
		if (!this.game_prefs.sects) this.game_prefs.sects = {};
		this.sect_prefs = this.game_prefs.sects;
		this.palette_manager.restore( this.sect_prefs );
		
		this.do_edit_level(this.args.level_id);
	},
	
	do_edit_level: function(level_id) {
		// edit existing level
		this.level_id = level_id;
		
		// load level from server
		effect_api_get('game_object_get', {
			game_id: this.game_id,
			type: 'level',
			id: level_id
		}, [this, 'do_edit_level_2'], {});
	},
	
	do_edit_level_2: function(response) {
		// edit existing level
		if (response) {
			this.level = response.Item;
		}
		
		// resolve any conflicts before continuing
		this.resolver = new LevelEditor.ConflictResolver(this, [this, 'do_edit_level_3']);
		this.resolver.go();
	},
	
	do_edit_level_3: function() {
		delete this.resolver;
		var title = 'Editing Level Map "'+ww_fit_string(this.level.Name, 200, session.em_width, 1)+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Home', 'My Home'],
			['Game/' + this.game.GameID, this.game.Title],
			['GameLevels/' + this.game.GameID, 'Levels'],
			[Nav.currentAnchor(), 'Edit Level Map']
		);
		
		Nav.title( title + ' | ' + this.game.Title );
		
		$('d_em_header').innerHTML = title;
		
		// undo manager
		this.undo_manager = new LevelEditor.UndoManager( this );
		this.undo_manager.update_links();
		
		// setup iframe
		var zoom = this.zoom = parseInt(this.level_prefs.zoom || this.game.ZoomDefault, 10);
		set_menu_value('fe_em_zoom', zoom);
		
		var zWidth = parseInt(this.game.PortWidth, 10) * zoom;
		var zHeight = parseInt(this.game.PortHeight, 10) * zoom;
		
		this.scrollx = parseInt(this.level_prefs.scrollx || 0, 10);
		this.scrolly = parseInt(this.level_prefs.scrolly || 0, 10);
		this.max_scrollx = parseInt(this.level.Width, 10) - parseInt(this.game.PortWidth, 10);
		this.max_scrolly = parseInt(this.level.Height, 10) - parseInt(this.game.PortHeight, 10);
		this.nudge_amount = 32;
		
		// setup iframe
		$('i_levedit').style.width = '' + zWidth + 'px';
		$('i_levedit').style.height = '' + zHeight + 'px';
		$('i_levedit').src = 'level.psp.html?game='+this.game_id+'&level='+this.level_id+'&zoom='+zoom+'&env='+(this.level.Env || '')+'&random='+Math.random();
		
		// info bar follows iframe width
		// $('d_em_infobar_wrapper').style.width = '' + Math.floor(zWidth + (this.max_scrolly ? 16 : 0)) + 'px';
		
		// info bar setup
		$('td_em_infobar_left').innerHTML = '<b>Level:</b> ' + commify(this.level.Width) + '&nbsp;x&nbsp;' + commify(this.level.Height);
		$('td_em_infobar_center').innerHTML = '';
		$('fe_em_grid_width').value = this.editor_prefs.grid_width || 32;
		$('fe_em_grid_height').value = this.editor_prefs.grid_height || 32;
		
		// setup scrollbars, or not
		if (this.max_scrolly) {
			var html = '';
			html += '<table cellspacing="0" cellpadding="0" border="0">';
			html += '<tr><td><div id="em_sba_up" class="scrollbar_arrow up"></div></td></tr>';
			var inner_bar_height = zHeight - 32;
			html += '<tr><td><div id="em_sb_vert" style="width:16px; height:'+inner_bar_height+'px"></div></td></tr>';
			html += '<tr><td><div id="em_sba_down" class="scrollbar_arrow down"></div></td></tr>';
			html += '</table>';
			$('d_em_scrollbar_vert').innerHTML = html;
			$('d_em_scrollbar_vert').show();
		}
		else {
			$('d_em_scrollbar_vert').hide();
		}
		
		if (this.max_scrollx) {
			var html = '';
			html += '<table cellspacing="0" cellpadding="0" border="0"><tr>';
			html += '<td><div id="em_sba_left" class="scrollbar_arrow left"></div></td>';
			var inner_bar_width = zWidth - 32;
			html += '<td><div id="em_sb_horiz" style="width:'+inner_bar_width+'px; height:16px"></div></td>';
			html += '<td><div id="em_sba_right" class="scrollbar_arrow right"></div></td>';
			html += '</tr></table>';
			$('d_em_scrollbar_horiz').innerHTML = html;
			$('d_em_scrollbar_horiz').show();
		}
		else {
			$('d_em_scrollbar_horiz').hide();
		}
		
		this.bar_horiz = null;
		this.bar_vert = null;
		this.arrow_left = null;
		this.arrow_right = null;
		this.arrow_up = null;
		this.arrow_down = null;
		
		var self = this;
		setTimeout( function() {
			if (self.max_scrollx) {
				self.bar_horiz = new ScrollBar( 'em_sb_horiz', {
					direction: 'horiz',
					pos: self.scrollx,
					max: parseInt(self.level.Width, 10),
					viewableArea: parseInt( self.game.PortWidth, 10 ),
					onScroll: [self, 'onScrollHoriz']
				} );
				self.arrow_left = new ScrollArrow( 'em_sba_left', -1, 0, [self, 'onNudgeScroll'] );
				self.arrow_right = new ScrollArrow( 'em_sba_right', 1, 0, [self, 'onNudgeScroll'] );
			}
			
			if (self.max_scrolly) {
				self.bar_vert = new ScrollBar( 'em_sb_vert', {
					direction: 'vert',
					pos: self.scrolly,
					max: parseInt(self.level.Height, 10),
					viewableArea: parseInt( self.game.PortHeight, 10 ),
					onScroll: [self, 'onScrollVert']
				} );
				self.arrow_up = new ScrollArrow( 'em_sba_up', 0, -1, [self, 'onNudgeScroll'] );
				self.arrow_down = new ScrollArrow( 'em_sba_down', 0, 1, [self, 'onNudgeScroll'] );
			}
		}, 1 );
	},
	
	set_scroll: function(sx, sy) {
		// set scroll position
		var old_scrollx = this.scrollx;
		var old_scrolly = this.scrolly;
		
		this.scrollx = sx;
		if (this.scrollx > this.max_scrollx) this.scrollx = this.max_scrollx;
		if (this.scrollx < 0) this.scrollx = 0;
		
		this.scrolly = sy;
		if (this.scrolly > this.max_scrolly) this.scrolly = this.max_scrolly;
		if (this.scrolly < 0) this.scrolly = 0;
		
		if (this.scrollx != old_scrollx) {
			this.bar_horiz.pos = this.scrollx;
			this.bar_horiz.updateThumb();
		}
		if (this.scrolly != old_scrolly) {
			this.bar_vert.pos = this.scrolly;
			this.bar_vert.updateThumb();
		}
		
		if ((this.scrollx != old_scrollx) || (this.scrolly != old_scrolly)) {
			this.draw();
		}
	},
	
	onNudgeScroll: function(xd, yd) {
		this.set_scroll( this.scrollx + (xd * this.nudge_amount), this.scrolly + (yd * this.nudge_amount) );
	},
	
	onScrollHoriz: function(xpos) {
		this.scrollx = xpos;
		this.draw();
	},
	
	onScrollVert: function(ypos) {
		this.scrolly = ypos;
		this.draw();
	},
	
	set_cursor: function(name) {
		if (!name) {
			$('i_levedit').style.cursor = 'default';
			if (this._port && this._port.div) this._port.div.style.cursor = 'default';
			return;
		}
		
		$('i_levedit').style.cursor = name;
		if (this._port && this._port.div) this._port.div.style.cursor = name;
	},
	
	handle_mouse_down: function(e, pt, buttonNum) {
		// handle mouse down from frame
		session.mouseIsDown = true;
		
		if (this.toolbar && this.toolbar.tool) {
			this.toolbar.tool.mouse_down(e, pt, buttonNum);
		}
	},
	
	handle_mouse_move: function(e, pt) {
		// handle mouse move in frame
		if (this.toolbar && this.toolbar.tool) {
			this.toolbar.tool.mouse_move(e, pt);
		}
		
		// update mouse position in info bar
		if (this._port && this.current_layer) {
			var plane = this._port.getPlane( this.current_layer.Name );
			var pt = plane.getMouseCoords();
			if (pt) {
				var html = '<b>Mouse:</b>&nbsp;';
				html += Math.floor(pt.x) + '&nbsp;x&nbsp;' + Math.floor(pt.y);
		
				if (this.current_layer.Type == 'tile') {
					var tx = Math.floor( pt.x / plane.tileSizeX );
					var ty = Math.floor( pt.y / plane.tileSizeY );
					html += '&nbsp;(' + tx + '&nbsp;x&nbsp;' + ty + ')';
				}
		
				$('td_em_infobar_center').innerHTML = html;
			}
		}
	},
	
	handle_mouse_wheel: function(e, delta) {
		// handle mouse wheel movement
		if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) this.onNudgeScroll( delta > 0 ? 1 : -1, 0 );
		else this.onNudgeScroll( 0, delta > 0 ? 1 : -1 );
	},
	
	handle_mouse_up: function(e, pt, buttonNum) {
		// handle mouse up from frame
		session.mouseIsDown = false;
		
		if (this.quick_switch && this.quick_switch.mouse_catch) {
			this.quick_switch_restore();
		}
		else if (this.toolbar && this.toolbar.tool) {
			this.toolbar.tool.mouse_up(e, pt, buttonNum);
		}
	},
	
	notify_iframe_load: function(args) {
		Debug.trace('level', "IFRAME notified us that the game engine has loaded!");
		
		// import various objects from frame
		// e.g. _iframe, _game, _port, _tool_preview
		for (var key in args) this[key] = args[key];
		
		this._def = this._game.getGameDef();
		
		this.draw();
		
		this.setup_palettes();
		
		var self = this;
		$('i_levedit').onmouseover = function() {
			self.show_tool_preview(); 
			self.mouseOverFrame = true;
			return true; 
		};
		$('i_levedit').onmouseout = function() { 
			self.hide_tool_preview(); 
			$('td_em_infobar_center').innerHTML = '';
			self.mouseOverFrame = false;
			return true; 
		};
		
		this.set_grid( (this.editor_prefs.grid_enabled == 1) );
		if (this.editor_prefs.grid_enabled == 1) $('fe_em_grid').checked = true;
		
		// setup toolbar
		// this.toolbar.click( this.editor_prefs.last_tool || 'pointer' );
		this.toolbar.click( 'pointer' );
	},
	
	show_tool_preview: function() {
		if (this.toolbar && this.toolbar.tool) {
			this.toolbar.tool.show_tool_preview();
		}
	},
	
	hide_tool_preview: function() {
		if (this.toolbar && this.toolbar.tool) {
			this.toolbar.tool.hide_tool_preview();
		}
	},
	
	setup_palettes: function() {
		// setup palettes that are always visible
		this.pal('navigator').setup();
		this.pal('layers').setup();
		this.pal('inspector').setup();
	},
	
	draw: function() {
		// refresh screen
		if (this._port) {
			this._port.setScroll( this.scrollx, this.scrolly );
			this._port.draw( true );
			this.update_grid_position();
			
			if (this.toolbar && this.toolbar.tool) {
				this.toolbar.tool.draw();
			}
			
			this.pal('navigator').update_marquee();
		}
	},
	
	handle_key_down: function(e) {
		// keydown events come here
		session.hooks.key_down = [this, 'handle_key_down'];
		if (session.fitf) return true; // focus is in text field, let event go through
		
		var code = fix_key_code( e.keyCode );
		Debug.trace('keys', "Caught keydown: " + code + ": " + get_nice_key_name(code));
		
		if (e.metaKey || e.ctrlKey) {
			switch (code) {
				case 83: // S
					this.save();
					return false;
				
				case 88: // X
					this.exit();
					return false;
				
				case 90: // Z
					this.undo_manager.undo();
					return false;
				
				case 82: // R
					this.undo_manager.redo();
					return false;
				
				default:
					// by default, pass Cmd/Ctrl keys through to browser
					return true;
					break;
			}
		} // metaKey || ctrlKey
		
		if ((code == 83) && (e.metaKey || e.ctrlKey)) { // Cmd-S = save level
			this.save();
			return false;
		}
		if ((code == 88) && (e.metaKey || e.ctrlKey)) { // Cmd-X = exit editor
			this.exit();
			return false;
		}
		
		if (e.metaKey || e.ctrlKey) return true; // special modifier keys, let event go through
		
		if ((code == 32) && !this.quick_switch) {
			// quick switch to scroll tool (only while key is down)
			this.quick_switch_hand();
		}
		else if ((code >= 48) && (code <= 57)) {
			// number keys, select layers with matching zindexes
			var num = code - 48;
			this.pal('layers').select_by_zindex( num );
		}
		else if (!this._game.mouseIsDown && this.toolbar && this.toolbar.tool) {
			if (this.toolbar.check_hotkey(code)) {
				this.toolbar.click( this.toolbar.check_hotkey(code) );
			}
			else {
				this.toolbar.tool.key_down(e, code);
			}
		}
		
		return false;
	},
	
	handle_key_up: function(e) {
		// keyup events come here
		session.hooks.key_up = [this, 'handle_key_up'];
		if (session.fitf || e.metaKey || e.ctrlKey) return true; // focus is in text field, let event go through
		
		var code = fix_key_code( e.keyCode );
		Debug.trace('keys', "Caught keyup: " + code + ": " + get_nice_key_name(code));
		
		if ((code == 32) && this.quick_switch) {
			// restore previous tool before spacebar was pressed
			this.quick_switch_restore();
		}
		
		return false;
	},
	
	quick_switch_hand: function() {
		// quick switch to scroll tool (only while key is down)
		this.quick_switch = {
			prev_tool: this.toolbar.tool.name,
			tool_preview_save_x: this._tool_preview.offsetLeft
		};
		this._tool_preview.style.left = '-1000px';
		this.toolbar.click( 'hand' );
	},
	
	quick_switch_restore: function() {
		// restore previous tool before spacebar was pressed
		if (this._game.mouseIsDown) {
			// set flag for mouseUp handler to clean this up
			this.quick_switch.mouse_catch = true;
		}
		else {
			this.toolbar.click( this.quick_switch.prev_tool );
			this.toolbar.tool.mouse_move();
			delete this.quick_switch;
		}
	},
	
	toggle_section: function(sect) {
		// toggle smart section
		smart_sect_toggle( sect, this.sect_prefs );
	},
	
	update_grid_position: function() {
		if (this.grid_enabled && this._port && this.current_layer) {
			var plane = this._port.getPlane( this.current_layer.Name );
			this._grid.style.backgroundPosition = '' + Math.floor((0 - plane.scrollX) * this.zoom) + 'px ' + Math.floor((0 - plane.scrollY) * this.zoom) + 'px';
		}
	},
	
	set_grid: function(enabled) {
		// show or hide the grid
		if (typeof(enabled) != 'undefined') this.grid_enabled = enabled;
		
		this._grid.style.left = '-16px';
		this._grid.style.top = '-16px';
		this._grid.style.width = '1px';
		this._grid.style.height = '1px';
		this._grid.style.display = 'none';
		
		var grid_width = trim($('fe_em_grid_width').value);
		var grid_height = trim($('fe_em_grid_height').value);
		
		if (this.grid_enabled && grid_width.match(/^\d+$/) && grid_height.match(/^\d+$/)) {
			this.grid_width = parseInt( grid_width, 10 );
			this.grid_height = parseInt( grid_height, 10 );
			
			var zGridWidth = this.grid_width * this.zoom;
			var zGridHeight = this.grid_height * this.zoom;
			
			var zPortWidth = parseInt(this.game.PortWidth, 10) * this.zoom;
			var zPortHeight = parseInt(this.game.PortHeight, 10) * this.zoom;
			
			if ((zGridWidth > this.zoom) && (zGridWidth <= zPortWidth) && (zGridHeight > this.zoom) && (zGridHeight <= zPortHeight)) {
				// grid is acceptable size
				this.editor_prefs.grid_width = grid_width;
				this.editor_prefs.grid_height = grid_height;
			
				this._grid.style.left = '0px';
				this._grid.style.top = '0px';
				this._grid.style.width = '' + zPortWidth + 'px';
				this._grid.style.height = '' + zPortHeight + 'px';
				this._grid.style.display = 'block';
			
				var url = '/effect/api/grid_image.gif?width='+zGridWidth+'&height='+zGridHeight;
				this._grid.style.backgroundImage = 'url('+url+')';
				this._grid.style.backgroundRepeat = 'repeat';
				this.update_grid_position();
			} // good size
		}
		
		this.editor_prefs.grid_enabled = this.grid_enabled ? 1 : 0;
		user_storage_mark();
	},
	
	snap_box_to_grid: function(x, y, width, height) {
		var dist = 8;
		var pt = { x: x, y: y };
		if (!this.grid_enabled) return pt;
		
		// right
		if ((x + width) % this.grid_width < dist) {
			// right side, pin leftward
			pt.x = (Math.floor( (x + width) / this.grid_width ) * this.grid_width) - width;
		}
		else if ((x + width) % this.grid_width > this.grid_width - dist) {
			// right side, pin rightward
			pt.x = ((Math.floor( (x + width) / this.grid_width ) + 1) * this.grid_width) - width;
		}
		
		// bottom
		if ((y + height) % this.grid_height < dist) {
			// bottom side, pin upward
			pt.y = (Math.floor( (y + height) / this.grid_height ) * this.grid_height) - height;
		}
		else if ((y + height) % this.grid_height > this.grid_height - dist) {
			// bottom side, pin downward
			pt.y = ((Math.floor( (y + height) / this.grid_height ) + 1) * this.grid_height) - height;
		}
		
		// left
		if (x % this.grid_width < dist) {
			// left side, pin leftward
			pt.x = Math.floor( x / this.grid_width) * this.grid_width;
		}
		else if (x % this.grid_width > this.grid_width - dist) {
			// left side, pin rightward
			pt.x = (Math.floor( x / this.grid_width) + 1) * this.grid_width;
		}
		
		// top
		if (y % this.grid_height < dist) {
			// top side, pin upward
			pt.y = Math.floor( y / this.grid_height) * this.grid_height;
		}
		else if (y % this.grid_height > this.grid_height - dist) {
			// top side, pin downward
			pt.y = (Math.floor( y / this.grid_height) + 1) * this.grid_height;
		}
		
		return pt;
	},
	
	save: function() {
		// save map changes
		if (this.dirty) {
			show_progress_dialog(1, "Saving level map...");
			
			// give progress dialog a chance to show up
			setTimeout( '$P().save_2()', 1 );
		}
		else {
			do_message('success', "Level map is already saved.");
		}
	},
	
	save_2: function() {
		// continue saving
		Debug.trace("Saving level map");
		var level_def = this.level;
		var level_data = this._game.getLevelData();
		
		if (level_def.Layers && level_def.Layers.Layer) {
			var layers = always_array( level_def.Layers.Layer );

			for (var idx = 0, len = layers.length; idx < len; idx++) {
				var layer = layers[idx];
				var plane = this._port.getPlane( layer.Name );
				var layer_data = null;
				
				switch (layer.Type) {
					
					case 'tile':
						layer_data = {};
						
						// optimize map, remove unused entries
						if (plane.data && plane.map) {
							var used_tiles = {};
							for (var tx = 0, txmax = plane.data.length; tx < txmax; tx++) {
								var col = plane.data[tx];
								if (col) {
									for (var ty = 0, tymax = col.length; ty < tymax; ty++) {
										var tile = col[ty];
										if (tile) used_tiles[tile] = 1;
									} // ty loop
								} // good col
							} // tx loop
							
							for (var key in plane.map) {
								if (!used_tiles[key]) {
									Debug.trace('level', "Deleting unused tile from " + layer.Name + ": " + key + ": " + plane.map[key]);
									delete plane.rev_map[ plane.map[key] ];
									delete plane.map[key];
								}
							}
						} // plane has data and map
						
						if (plane.data) layer_data.data = plane.data;
						if (plane.map) layer_data.map = plane.map;
						if (plane.objectData) layer_data.objectData = plane.objectData;
						break;
					
					case 'sprite':
						plane.sendAllToAether();
						plane.sprites = {};
						layer_data = plane.getAllAetherSprites();
						plane.draw(true);
						break;
					
				} // switch layer.Type
				
				level_data.layers[ layer.Name ] = layer_data;
			} // foreach layer
		} // level has layers
		
		window._temp_level_data = level_data;
		
		// save to server
		effect_api_send('game_save_level_data', {
			GameID: this.game_id,
			LevelID: this.level_id,
			Data: serialize( level_data )
		}, [this, 'save_finish'], {  });
	},
	
	save_finish: function() {
		hide_popup_dialog();
		do_message('success', "Saved level map: " + this.level_id);
		show_glog_widget();
		this.dirty = false;
	},
	
	change_zoom_level: function(new_level) {
		if (this._game.changingZoom) return;
		
		var zoom = this.zoom = new_level;
		
		var zWidth = parseInt(this.game.PortWidth, 10) * zoom;
		var zHeight = parseInt(this.game.PortHeight, 10) * zoom;
		
		// setup iframe
		$('i_levedit').style.width = '' + zWidth + 'px';
		$('i_levedit').style.height = '' + zHeight + 'px';
		
		// info bar follows iframe width
		// $('d_em_infobar_wrapper').style.width = '' + Math.floor(zWidth + (this.max_scrolly ? 16 : 0)) + 'px';
		
		if (this.toolbar && this.toolbar.tool && (this.toolbar.tool.name == 'pointer')) {
			this.toolbar.tool.notify_layer_change();
		}
		
		var vbar = $('em_sb_vert');
		if (vbar) {
			var inner_bar_height = zHeight - 32;
			vbar.style.height = '' + inner_bar_height + 'px';
		}
		
		var hbar = $('em_sb_horiz');
		if (hbar) {
			var inner_bar_width = zWidth - 32;
			hbar.style.width = '' + inner_bar_width + 'px';
		}
		
		this._game.changeZoomLevel(new_level);
		
		this.level_prefs.zoom = new_level;
		user_storage_mark();
		
		this.set_grid();
		
		var self = this;
		setTimeout( function() {
			if (self.bar_vert) self.bar_vert.updateThumb();
			if (self.bar_horiz) self.bar_horiz.updateThumb();
		}, 1 );
	},
	
	exit: function() {
		Nav.go( 'GameLevels/' + this.game_id );
	}
	
} );
