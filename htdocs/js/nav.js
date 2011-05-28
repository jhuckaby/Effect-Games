// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 Navigation System
 * Author: Joseph Huckaby
 **/

var Nav = {
	
	loc: '',
	old_loc: '',
	inited: false,
	nodes: [],
	
	init: function() {
		// initialize nav system
		if (!this.inited) {
			this.inited = true;
			this.loc = 'init';
			this.monitor();
		}
	},

	monitor: function() {
		// monitor browser location and activate handlers as needed
		var parts = window.location.href.split(/\#/);
		var anchor = parts[1];
		if (!anchor) anchor = 'Main';
		
		var full_anchor = '' + anchor;
		var sub_anchor = '';
		
		anchor = anchor.replace(/\%7C/, '|');
		if (anchor.match(/\|(\w+)$/)) {
			// inline section anchor after article name, pipe delimited
			sub_anchor = RegExp.$1.toLowerCase();
			anchor = anchor.replace(/\|(\w+)$/, '');
		}
		
		if ((anchor != this.loc) && !anchor.match(/^_/)) { // ignore doxter anchors
			Debug.trace('nav', "Caught navigation anchor: " + full_anchor);
			
			var page_name = '';
			var page_args = null;
			if (full_anchor.match(/^\w+\?.+/)) {
				parts = full_anchor.split(/\?/);
				page_name = parts[0];
				page_args = parseQueryString( parts[1] );
			}
			else if (full_anchor.match(/^(\w+)\/(.*)$/)) {
				page_name = RegExp.$1;
				page_args = RegExp.$2;
			}
			else {
				parts = full_anchor.split(/\//);
				page_name = parts[0];
				page_args = parts.slice(1);
			}
			
			Debug.trace('nav', "Calling page: " + page_name + ": " + serialize(page_args));
			hide_popup_dialog();
			var result = page_manager.click( page_name, page_args );
			if (result) {
				if (window.pageTracker && (this.loc != 'init')) {
					// google analytics
					setTimeout( function() { pageTracker._trackPageview('/effect/' + anchor); }, 1000 );
				}
				
				this.old_loc = this.loc;
				if (this.old_loc == 'init') this.old_loc = 'Main';
				this.loc = anchor;
			}
			else {
				// current page aborted navigation -- recover current page without refresh
				this.go( this.loc );
			}
		}
		else if (sub_anchor != this.sub_anchor) {
			Debug.trace('nav', "Caught sub-anchor: " + sub_anchor);
			$P().gosub( sub_anchor );
		} // sub-anchor changed
		
		this.sub_anchor = sub_anchor;
	
		setTimeout( 'Nav.monitor()', 100 );
	},

	go: function(anchor, force) {
		// navigate to page
		anchor = anchor.replace(/^\#/, '');
		if (force) this.loc = 'init';
		window.location.href = '#' + anchor;
	},

	prev: function() {
		// return to previous page
		this.go( this.old_loc || 'Main' );
	},

	refresh: function() {
		// re-nav to current page
		this.loc = 'refresh';
	},

	bar: function() {
		// runder nav bar
		// nodes = [ ['Anchor','Title'], ['Anchor','Title'] ]
		var nodes = arguments;
		var html = '';
		
		for (var idx = 0, len = nodes.length; idx < len; idx++) {
			var node = nodes[idx];
			if (node) this.nodes[idx] = node;
			else node = this.nodes[idx];
			
			// ww_fit_string(this.game.Title, 550, session.em_width, 1)
			if (node != '_ignore_') {
				html += '<div><a href="#'+node[0]+'"><b>'+ww_fit_string(node[1], 200, session.em_width, 1)+'</b></a></div>';
			}
		}
		
		html += '<br clear="all"/>';
		$('d_nav_bar').innerHTML = html;
	},

	title: function(name) {
		// set document title
		if (name) document.title = name + ' | EffectGames.com';
		else document.title = 'EffectGames.com';
	},
	
	currentAnchor: function() {
		// return current page anchor
		var parts = window.location.href.split(/\#/);
		var anchor = parts[1] || '';
		var sub_anchor = '';
		
		anchor = anchor.replace(/\%7C/, '|');
		if (anchor.match(/\|(\w+)$/)) {
			// inline section anchor after article name, pipe delimited
			sub_anchor = RegExp.$1.toLowerCase();
			anchor = anchor.replace(/\|(\w+)$/, '');
		}
		
		return anchor;
	}

};
