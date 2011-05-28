// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 Page Class
 * Author: Joseph Huckaby
 **/

Class.create( 'Effect.Page', {
	// 'Effect.Page' class is the abstract base class for all pages
	// Each web component calls this class daddy
	
	// member variables
	ID: '', // ID of DIV for component
	data: null,   // holds all data for freezing
	active: false, // whether page is active or not
	
	// methods
	__construct: function(config) {
		if (!config) return;
		
		// class constructor, import config into self
		this.data = {};
		if (!config) config = {};
		for (var key in config) this[key] = config[key];
		
		this.div = $('page_' + this.ID);
		assert(this.div, "Cannot find page div: page_" + this.ID);
	},
	
	onInit: function() {
		// called with the page is initialized
	},
	
	onActivate: function() {
		// called when page is activated
		return true;
	},
	
	onDeactivate: function() {
		// called when page is deactivated
		return true;
	},
	
	show: function() {
		// show page
		this.div.show();
	},
	
	hide: function() {
		this.div.hide();
	},
	
	gosub: function(anchor) {
		// go to sub-anchor (article section link)
	}
	
} ); // class Page
