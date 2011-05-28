// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Level Editor Toolbar Classes

Class.create( 'LevelEditor.Toolbar', {
	
	tools: null,
	tool: null,
	hotkeys: null,
	
	__construct: function(page, args) {
		this.page = page;
		if (args) {
			for (var key in args) this[key] = args[key];
		}
		this.tools = [];
		this.tool = null;
		this.prev_tool = null;
		this.hotkeys = {};
	},
	
	register: function(tool) {
		// add new tool to the toolbar
		tool.bar = this;
		tool.page = this.page;
		this.tools.push( tool );
		
		if (tool.hotkey) {
			var code = tool.hotkey;
			if (typeof(code) == 'string') code = code.charCodeAt(0);
			this.hotkeys[ code ] = tool.name;
		}
	},
	
	get_html: function() {
		// get HTML for all toolbar icon controls
		var html = '';
		for (var idx = 0, len = this.tools.length; idx < len; idx++) {
			html += this.tools[idx].get_html();
		}
		return html;
	},
	
	find: function(name) {
		// locate tool by name
		return find_object( this.tools, { name: name } );
	},
	
	click: function(name) {
		// select tool by name
		var now = hires_time_now();
		
		if (this.tool && (this.tool.name == name)) {
			if (now - this.tool.last_click < 0.25) {
				// double-click
				this.tool.double_click();
			}
			this.tool.last_click = now;
			return;
		} // same tool
		
		if (this.tool) {
			var div = $('tb_em_' + this.tool.name);
			if (div) div.removeClass('selected');
			
			this.tool.deactivate();
			if (this.page.mouseOverFrame) this.tool.hide_tool_preview();
			
			this.prev_tool = this.tool;
		}
		
		this.tool = this.find(name);
		
		var div = $('tb_em_' + this.tool.name);
		if (div) div.addClass('selected');
		
		this.tool.activate();
		if (this.page.mouseOverFrame) this.tool.show_tool_preview();
		
		this.page.pal('inspector').setup();
		
		// this.page.editor_prefs.last_tool = name;
		// user_storage_mark();
		
		this.tool.last_click = now;
	},
	
	check_hotkey: function(code) {
		// check if key code matches one of our tool hotkeys
		if (this.hotkeys[code]) {
			return this.hotkeys[code];
		}
		else return false;
	},
	
	shutdown: function() {
		// disable selected tool
		if (this.tool) {
			var div = $('tb_em_' + this.tool.name);
			if (div) div.removeClass('selected');
			
			this.tool.deactivate();
			if (this.page.mouseOverFrame) this.tool.hide_tool_preview();			
		}
		this.tool = null;
	}
	
} );

Class.create( 'LevelEditor.Tool', {
	// base class for tools
	name: '',
	icon: '',
	title: '',
	hotkey: '',
	last_click: 0,
	
	__construct: function(args) {
		if (args) {
			for (var key in args) this[key] = args[key];
		}
		this.last_click = 0;
	},
	
	is_selected: function() {
		if (!this.bar.tool) return false;
		return (this.bar.tool.name == this.name);
	},
	
	get_html: function() {
		return this.toolbar_icon();
	},
	
	toolbar_icon: function() {
		// insert toolbar icon
		var icon_name = this.icon;
		var id = 'tb_em_' + this.name;
		if (!icon_name.match(/\.\w+$/)) icon_name += '.gif';
		return '<div id="'+id+'" class="toolbar_icon'+(this.is_selected() ? ' selected' : '')+'" onClick="$P().toolbar.click(\''+this.name+'\')" title="'+this.title+'"><img src="'+icons_uri+'/'+icon_name+'" width="16" height="16" border="0"/></div>';
	},
	
	activate: function() {
		this.page.set_cursor();
	},
	
	deactivate: function() {
		this.page.set_cursor();
	},
	
	mouse_down: function(e, pt, button) {},
	mouse_move: function(e, pt) {},
	mouse_up: function(e, pt, button) {},
	double_click: function() {},
	
	show_tool_preview: function() {},
	
	hide_tool_preview: function() {
		this.page._tool_preview.style.left = '-1000px';
		this.page._tool_preview.style.top = '-1000px';
		this.page._tool_preview.style.display = 'none';
	},
	
	notify_layer_change: function() {
		
	},
	
	draw: function() {
		// called when main iframe is redrawn
	},
	
	key_down: function(e, code) {}
} );

