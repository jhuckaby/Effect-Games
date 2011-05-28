// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect Menus
 **/

Class.create( 'Menu', {
	
	id: '', // ID of DOM element
	menu: null, // ref to DOM element
	
	__construct: function(id) {
		// class constructor, set id
		// DOM element doesn't necessarily have to be ready yet
		this.id = id;
	},
	
	load: function() {
		// load DOM element by ID
		if (!this.menu) {
			this.menu = $(this.id);
			assert( !!this.menu, "Could not locate DOM element: " + this.id );
		}
	},
	
	get_value: function() {
		// return value of currently selected item
		this.load();
		return this.menu.options[this.menu.selectedIndex].value;
	},

	set_value: function(value, auto_add) {
		// set item by value (not index), optionally add new item
		value = str_value(value);
		this.load();
		for (var idx = 0, len = this.menu.options.length; idx < len; idx++) {
			if (this.menu.options[idx].value == value) {
				this.menu.selectedIndex = idx;
				return true;
			}
		}
		if (auto_add) {
			this.menu.options[this.menu.options.length] = new Option(value, value);
			this.menu.selectedIndex = this.menu.options.length - 1;
			return true;
		}
		return false;
	},

	disable: function() {
		// disable menu
		this.load();
		this.menu.disabled = true;
		this.menu.setAttribute( 'disabled', 'disabled' );
	},

	enable: function() {
		// enable menu
		this.load();
		this.menu.setAttribute( 'disabled', '' );
		this.menu.disabled = false;
	},

	populate: function(items, sel_value) {
		// populate menu with array of items
		// items can be 2D array with item[0] = name and item[1] = value
		// or an array of hashes with 'data' and 'label' keys
		this.load();
		this.menu.options.length = 0;

		for (var idx = 0, len = items.length; idx < len; idx++) {
			var item = items[idx];
			var item_name = '';
			var item_value = '';
			if (isa_hash(item)) {
				item_name = item.label;
				item_value = item.data;
			}
			else if (isa_array(item)) {
				item_name = item[0];
				item_value = item[1];
			}
			else {
				item_name = item_value = item;
			}
			this.menu.options[ this.menu.options.length ] = new Option( item_name, item_value );
			if (item_value == sel_value) this.menu.selectedIndex = idx;
		} // foreach item
	}
	
} ); // class

Class.subclass( Menu, 'MultiMenu', {
	
	// This class is for combo single/multi toggle menus
	
	__static: {
		toggle_type: function(id) {
			// toggle between single / multi menu
			var menu = $(id);
			assert(menu, "Could not find menu in DOM: " + id);
			if (menu.disabled) return;
			
			var obj = MenuManager.find(id);
			assert(obj, "Could not find menu in MenuManager: " + id);
			
			var div = $( 'd_inner_' + id );
			var ic = $( 'ic_' + id );

			// var is_multiple = (ic.src.indexOf('expander_up') > -1);
			var is_multiple = (ic.src.indexOf('contract') > -1);
			obj.multi = !is_multiple;
			var multiple_tag = !is_multiple ? 
				' multiple="multiple" size=5' : '';

			var items = [];
			for (var idx = 0; idx < menu.options.length; idx++) {
				var option = menu.options[idx];
				array_push( items, {
					value: option.value,
					text: option.text,
					selected: option.selected
				});
			} // foreach item in menu

			// rebuild menu
			var html = '';
			html += '<select name="'+id+'" id="'+id+'"' + multiple_tag + ' ' + compose_attribs(obj.attribs) + '>' + "\n";
			var found_selected = 0;
			for (var idx in items) {
				var item = items[idx];
				html += '<option value="' + item.value.replace(/\"/g, "&quot;") + '"';
				if (item.selected && (!found_selected || multiple_tag)) {
					html += ' selected="selected"';
					found_selected = 1;
				}
				html += '>' + item.text + '</option>' + "\n";
			}
			html += '</select>';
			div.innerHTML = html;

			// ic.src = images_uri + '/expander_' + (is_multiple ? 'down' : 'up') + '_over.gif';
			ic.src = images_uri + '/menu_' + (is_multiple ? 'expand' : 'contract') + '.gif';
			obj.menu = null;
		}
	}, // static
	
	attribs: null, // select DOM attributes (e.g. onChange)
	multi: false, // whether menu is in multi-mode or not
	toggle: true, // whether menu allows toggling or not
	
	__construct: function(id, attribs) {
		// class constructor, set id
		// DOM element doesn't necessarily have to be ready yet
		this.id = id;
		if (attribs) this.attribs = attribs;
	},
	
	get_html: function(items, selected_csv, attribs) {
		// get inner DIV HTML for menu
		if (!items) items = [];
		if (!selected_csv) selected_csv = '';
		if (attribs) this.attribs = attribs;
		var selected = csv_to_hash(selected_csv);
		
		this.menu = null;
		// this.multi = (num_keys(selected) > 1) ? true : false;
		if (num_keys(selected) > 1) this.multi = true;
		
		var html = '<div id="d_outer_'+this.id+'"><form>';
		html += '<table cellspacing="0" cellpadding="0"><tr>';
		
		html += '<td><div id="d_inner_'+this.id+'"><select id="'+this.id+'"';
		if (this.multi) html += ' multiple="multiple" size="5"';
		html += compose_attribs(this.attribs);
		html += '>';
		
		for (var idx = 0, len = items.length; idx < len; idx++) {
			var item = items[idx];
			var item_name = '';
			var item_value = '';
			if (isa_hash(item)) {
				item_name = item.label;
				item_value = item.data;
			}
			else if (isa_array(item)) {
				item_name = item[0];
				item_value = item[1];
			}
			else {
				item_name = item_value = item;
			}
			html += '<option value="'+item_value+'"';
			if (selected[item_value]) html += ' selected="selected"';
			html += '>' + item_name + '</option>';
		}
		
		html += '</select></div></td>';
		
		html += '<td width="1">' + spacer(1,1) + '</td>';
		
		if (this.toggle) html += '<td valign="bottom"><img id="ic_'+this.id+'" src="'+images_uri+'/menu_'+(this.multi ? 'contract' : 'expand')+'.gif" width="16" height="16" style="cursor:pointer" onClick="MultiMenu.toggle_type(\''+this.id+'\')"><br/>'+spacer(1,2)+'</td>';
		// html += '<td valign="bottom"><img id="ic_'+this.id+'" src="'+images_uri+'/expander_'+(this.multi ? 'up' : 'down')+'_up.gif" width="16" height="16" style="cursor:pointer" onClick="MultiMenu.toggle_type(\''+this.id+'\')" onMouseOver="image_rollover(this)" onMouseOut="image_rollout(this);"/><br/>'+spacer(1,2)+'</td>';
		
		html += '</tr></table>';
		html += '</form></div>';
		
		return html;
	},
	
	get_value: function() {
		// return CSV list of currently selected item(s)
		this.load();
		var value = '';
		
		for (var idx = 0; idx < this.menu.options.length; idx++) {
			var option = this.menu.options[idx];
			if (option.selected && option.value.length) {
				if (value.length > 0) value += ',';
				value += option.value;
			}
		} // foreach item in menu
		
		return value;
	},
	
	set_value: function(value, auto_add) {
		// specify which items are selected (csv list)
		value = '' + value; // convert to string
		this.load();
		
		if (!value) {
			value = '';
			for (var idx = 0; idx < this.menu.options.length; idx++) {
				var option = this.menu.options[idx];
				option.selected = (option.value == value);
			}
			return;
		}
		var selected = csv_to_hash(value);
		if ((num_keys(selected) > 1) && !this.multi) {
			// switch into multi mode
			MultiMenu.toggle_type(this.id);
			
			// must wait for DOM to update before setting value
			var self = this;
			setTimeout( function() {
				self.set_value(value, auto_add);
			}, 1 );
			return;
		}
		
		for (var idx = 0; idx < this.menu.options.length; idx++) {
			var option = this.menu.options[idx];
			option.selected = selected[option.value] ? true : false;
		}
	},
	
	populate: function(items, value) {
		// populate menu with array of items
		// items can be 2D array with item[0] = name and item[1] = value
		// or an array of hashes with 'data' and 'label' keys
		this.load();
		this.menu.options.length = 0;
		
		if (!value) value = '';
		var selected = csv_to_hash(value);
		
		for (var idx = 0, len = items.length; idx < len; idx++) {
			var item = items[idx];
			var item_name = '';
			var item_value = '';
			if (isa_hash(item)) {
				item_name = item.label;
				item_value = item.data;
			}
			else if (isa_array(item)) {
				item_name = item[0];
				item_value = item[1];
			}
			else {
				item_name = item_value = item;
			}
			var opt = new Option( item_name, item_value );
			this.menu.options[ this.menu.options.length ] = opt;
			opt.selected = selected[item_value] ? true : false;
		} // foreach item
	},
	
	collapse: function() {
		// collapse multi-menu into single menu
		if (this.multi) MultiMenu.toggle_type(this.id);
	},
	
	expand: function() {
		// expand single menu into multi-menu
		if (!this.multi) MultiMenu.toggle_type(this.id);
	}
	
} ); // class

Class.create( 'MenuManager', {
	
	__static: {
		menus: {},
		
		register: function(menu) {
			// register menu for later recall, indexed by ID
			this.menus[ menu.id ] = menu;
			return menu; // for chaining
		},
		
		find: function(id) {
			// locate a menu by its ID
			return this.menus[id];
		}
	} // static
	
} ); // class
