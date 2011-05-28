// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

// Level Editor Palette Classes

Class.create( 'LevelEditor.PaletteManager', {
	
	palettes: null,
	
	__construct: function(page, args) {
		this.page = page;
		if (args) {
			for (var key in args) this[key] = args[key];
		}
		this.palettes = [];
	},
	
	register: function(palette) {
		// add new palette to the manager
		palette.manager = this;
		palette.page = this.page;
		this.palettes.push( palette );
	},
	
	get_html: function() {
		// get HTML for all palettes
		var html = '';
		for (var idx = 0, len = this.palettes.length; idx < len; idx++) {
			html += this.palettes[idx].get_html();
		}
		return html;
	},
	
	find: function(name) {
		// locate palette by name
		return find_object( this.palettes, { name: name } );
	},
	
	hide_all: function() {
		// for page deactivate
		for (var idx = 0, len = this.palettes.length; idx < len; idx++) {
			this.palettes[idx].hide();
		}
	},
	
	shutdown: function() {
		// for page deactivate
		for (var idx = 0, len = this.palettes.length; idx < len; idx++) {
			this.palettes[idx].shutdown();
		}
	},
	
	restore: function(sect_prefs) {
		// restore palette open/closed states
		var ids = [];
		for (var idx = 0, len = this.palettes.length; idx < len; idx++) {
			ids.push( 'd_emp_' + this.palettes[idx].name );
		}
		smart_sect_restore( ids, sect_prefs );
	}
	
} );

Class.create( 'LevelEditor.Palette', {
	// base class for palettes
	name: '',
	icon: '',
	title: '',
	
	__construct: function(args) {
		if (args) {
			for (var key in args) this[key] = args[key];
		}
	},
	
	get_html: function() {
		if (!this.icon.match(/\.\w+$/)) this.icon += '.gif';
		var html = '';
		html += '<div id="d_emp_wrapper_'+this.name+'" style="display:none">';
			html += '<div class="levedit_palette_title">';
				html += '<div id="ctl_d_emp_'+this.name+'" class="fl palette_section_control open" onClick="$P().toggle_section(\'d_emp_'+this.name+'\')"></div>';
				html += '<div class="lepti" style="background-image: url(images/icons/'+this.icon+');"></div>';
					html += '<span id="s_emp_'+this.name+'_title">'+this.title+'</span>';
				html += '<div class="clear"></div>';
			html += '</div>';
			html += '<div id="d_emp_'+this.name+'">';
			html += '<div id="d_emp_'+this.name+'_content" class="levedit_palette_content"></div>';
			html += '</div>';
			if (this.name != 'inspector') html += spacer(1,10) + '<br/>';
		html += '</div>';
		return html;
	},
	
	set_title: function(new_title) {
		var span = $('s_emp_'+this.name+'_title');
		if (span) span.innerHTML = new_title;
		this.title = new_title;
	},
	
	set_content: function(html) {
		var div = $('d_emp_'+this.name+'_content');
		if (div) div.innerHTML = html;
	},
	
	show: function() {
		var div = $('d_emp_wrapper_'+this.name);
		if (div) div.show();
	},
	
	hide: function() {
		var div = $('d_emp_wrapper_'+this.name);
		if (div) div.hide();
	},
	
	shutdown: function() {
		// called on page deactivate
	}
} );
