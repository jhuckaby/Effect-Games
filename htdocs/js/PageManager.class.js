// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 Page Manager
 * Author: Joseph Huckaby
 **/

Class.require( 'Effect.Page' );

Class.create( 'Effect.PageManager', {
	// 'Effect.PageManager' class handles all virtual pages in the application
	
	// member variables
	pages: null, // array of pages
	current_page_id: '', // current page ID
	on_demand: {}, // files loaded on-demand
	
	// methods
	__construct: function(page_list) {
		// class constructor, create all pages
		// page_list should be array of components from master config
		// each one should have at least a 'ID' parameter
		// anything else is copied into object verbatim
		this.pages = [];
		this.page_list = page_list;
		
		for (var idx = 0, len = page_list.length; idx < len; idx++) {
			Debug.trace( 'page', "Initializing page: " + page_list[idx].ID );
			// assert(Effect.Page[ page_list[idx].ID ], "Page subclass not found: " + page_list[idx].ID);
			
			if (Effect.Page[ page_list[idx].ID ]) {
				var page = new Effect.Page[ page_list[idx].ID ]( page_list[idx] );
				page.onInit();
				this.pages.push(page);
			}
			else {
				Debug.trace( 'page', 'Page ' + page_list[idx].ID + ' will be loaded on-demand' );
			}
		}
	},
	
	find: function(id) {
		// locate page by ID (i.e. Plugin Name)
		var page = find_object( this.pages, { ID: id } );
		if (!page) Debug.trace('PageManager', "Could not find page: " + id);
		return page;
	},
	
	notify_load: function(file, id) {
		// notify load of page being activated on-demand
		
		// multiple pages may have been loaded by single file
		// initialize all of them now
		for (var idx = 0, len = this.page_list.length; idx < len; idx++) {
			var page_config = this.page_list[idx];
			if (page_config.File == file) {
				Debug.trace( 'page', "Initializing page on-demand: " + page_config.ID );
				var page = new Effect.Page[ page_config.ID ]( page_config );
				page.onInit();
				this.pages.push(page);
			}
		}
		
		// start new thread so page onInit function can render HTML
		var self = this;
		setTimeout( function() {
			// continue with activate
			var result = self.activate(id, self.temp_args);
			delete self.temp_args;
			
			$('d_page_loading').hide();
			
			if (!result) {
				// new page has rejected activation, probably because a login is required
				// un-hide previous page div, but don't call activate on it
				$('page_'+id).hide();
				self.current_page_id = '';
				// if (self.old_page_id) {
					// $('page_'+self.old_page_id).show();
					// self.current_page_id = self.old_page_id;
				// }
			}
		}, 1 );
	},
	
	activate: function(id, args) {
		// send activate event to page by id (i.e. Plugin Name)
		if (!find_object( this.pages, { ID: id } )) {
			// page is not loaded, so load it now
			var page_config = find_object( this.page_list, { ID: id } );
			assert(!!page_config, "Page config not found: " + id );
			
			Debug.trace('page', "Loading file on-demand: " + page_config.File + " for page: " + id);
			
			var url = '/effect/api/load_page/' + page_config.File + '?onafter=' + escape('page_manager.notify_load(\''+page_config.File+'\',\''+id+'\')');
			
			if (page_config.Requires) {
				var files = page_config.Requires.split(/\,\s*/);
				for (var idx = 0, len = files.length; idx < len; idx++) {
					var filename = files[idx];
					if (!this.on_demand[filename]) {
						Debug.trace('page', "Also loading file: " + filename);
						url += '&file=' + filename;
						this.on_demand[filename] = 1;
					} // need to load file
				} // foreach file required
			} // page has prereq's
			
			$('d_page_loading').show();
			
			this.temp_args = args;
			load_script( url );
			return true;
		}
		
		$('page_'+id).show();
		var page = this.find(id);
		page.active = true;
		
		if (!args) args = [];
		if (!isa_array(args)) args = [ args ];
		
		var result = page.onActivate.apply(page, args);
		if (typeof(result) == 'boolean') return result;
		else return alert("Page " + id + " onActivate did not return a boolean!");
	},
	
	deactivate: function(id, new_id) {
		// send deactivate event to page by id (i.e. Plugin Name)
		var page = this.find(id);
		var result = page.onDeactivate(new_id);
		if (result) {
			$('page_'+id).hide();
			page.active = false;
		}
		return result;
	},
	
	click: function(id, args) {
		// exit current page and enter specified page
		Debug.trace('page', "Switching pages to: " + id);
		var old_id = this.current_page_id;
		if (this.current_page_id) {
			var result = this.deactivate( this.current_page_id, id );
			if (!result) return false; // current page said no
		}
		this.current_page_id = id;
		this.old_page_id = old_id;
		
		window.scrollTo( 0, 0 );
		
		var result = this.activate(id, args);
		if (!result) {
			// new page has rejected activation, probably because a login is required
			// un-hide previous page div, but don't call activate on it
			$('page_'+id).hide();
			this.current_page_id = '';
			// if (old_id) {
				// $('page_'+old_id).show();
				// this.current_page_id = old_id;
			// }
		}
		
		return true;
	}
	
} ); // class PageManager

