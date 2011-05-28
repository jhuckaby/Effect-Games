// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 Blog Functions
 * Author: Joseph Huckaby
 **/

var Blog = {
	
	edit_caption: '<div class="caption" style="margin-top:5px;">*<b>Bold</b>*&nbsp;&nbsp;|<i>Italic</i>|&nbsp;&nbsp;{<span style="font-family:monaco,courier,monospace;">monospace</span>}&nbsp;&nbsp;[http://link]&nbsp;&nbsp;<a href="/effect/#Article/Formatting_Guide" target="_blank">Formatting Guide...</a></div>',
	
	search: function(args) {
		// search for articles in blog
		if (!args.mode) args.mode = 'and';
		if (!args.offset) args.offset = 0;
		if (!args.limit) args.limit = 10;
		if (!args.format) args.format = 'xml';
		
		var query_args = copy_object( args ); // shallow copy
		delete query_args.callback;
		
		effect_api_get( 'article_search', query_args, [this, 'search_response'], { _search_args: args } );
	},
	
	get_article_preview: function(row, args) {
		// get HTML for single article preview
		var html = '';
		
		Debug.trace('blog', 'Row: ' + dumper(row));
		
		html += '<div class="' + (args.outer_div_class || 'blog_article_preview') + '">';
		
		var ext_article_url = 'http://' + location.hostname + '/effect/article.psp.html' + row.Path + '/' + row.ArticleID;
		var article_url = '#Article' + row.Path + '/' + row.ArticleID;
		html += '<div class="' + (args.title_class || 'blog_title') + '"><a href="'+article_url+'">' + row.Title + '</a></div>';
		
		if (!args.title_only) {
			html += '<div class="' + (args.preview_class || 'blog_preview_body') + '">';
			// html += row.preview.replace(/^<div.+?>/i, '').replace(/<\/div>$/i, '');
			html += row.Preview;
			html += '&nbsp;&nbsp;<a href="'+article_url+'">' + (args.link_title || 'Read Full Story...') + '</a>';
			html += '</div>';
			
			html += '<nobr>';
			html += '<div class="' + (args.footer_class || 'blog_preview_footer') + '">';
			var elem_class = args.footer_element_class || 'blog_preview_footer_element';
			
			if ((session.username == row.Username) || is_admin()) {
				html += '<div class="' + elem_class + '">' + 
					icon('page_white_edit.png', "Edit", '#ArticleEdit?path=' + row.Path + '&id=' + row.ArticleID) + '</div>';
			}
			
			html += '<div class="' + elem_class + '">' + get_user_display(row.Username) + '</div>';
			html += '<div class="' + elem_class + '">' + icon('calendar', get_short_date_time(row.Published)) + '</div>';
			html += '<div class="' + elem_class + '">' + icon('talk', row.Comments) + '</div>';
			if (0 && row.Tags) html += '<div class="' + elem_class + '">' + icon('note.png', make_tag_links(row.Tags, 3)) + '</div>';
			
			html += '<div class="' + elem_class + '">' + icon('facebook.png', 'Facebook', "window.open('http://www.facebook.com/sharer.php?u="+encodeURIComponent(ext_article_url)+'&t='+encodeURIComponent(row.Title)+"','sharer','toolbar=0,status=0,width=626,height=436')", "Share on Facebook") + '</div>';
			
			html += '<div class="' + elem_class + '">' + icon('twitter.png', 'Twitter', "window.open('http://twitter.com/home?status=Reading%20" + encodeURIComponent(row.Title) + "%3A%20" +  encodeURIComponent(ext_article_url)+"')", "Share on Twitter") + '</div>';
			
			html += '</nobr>';
			html += '<br clear="both"/>';
			html += '</div>';
		}
		
		html += '</div>';
		
		return html;
	},
	
	search_response: function(response, tx) {
		// receive search results from server
		// populate target DIV with blog article previews
		var args = tx._search_args;
		if (args.callback) return fire_callback(args.callback, response, args);
		
		var div = $(args.target);
		assert(div, "Could not find target DIV: " + args.target);
		
		var html = '';
		if (response.Rows && response.Rows.Row) {
			// we have rows!
			var rows = always_array( response.Rows.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += this.get_article_preview( row, args );
			} // foreach row
			
			if (args.more && (rows.length == args.limit)) {
				html += large_icon_button('page_white_put.png', 'More...', "Blog.more(this, "+encode_object(args)+")") + '<br clear="all"/>';
				html += spacer(1,15) + '<br/>';
			}
			
			if (args.after) html += args.after;
		} // has rows
		else if (response.Code != 0) {
			// search error
			html = 'Search Error: ' . response.Code + ': ' + response.Description;
		}
		else {
			// no rows found
			html = args.none_found_msg || 'No articles found.';
		}
		
		div.innerHTML = html;
	},
	
	more: function(div, args) {
		// search for more articles with same args but advance offset
		args.offset += args.limit;
		Debug.trace('blog', "More Args: " + dumper(args));
		
		// div.innerHTML += '&nbsp;' + icon('busy');
		div.innerHTML = '<img src="images/loading.gif" width="32" height="32"/>';
		
		effect_api_get( 'article_search', args, [this, 'more_response'], { _search_args: args, _div: div } );
	},
	
	more_response: function(response, tx) {
		// receive response from "more" request
		var args = tx._search_args;
		var button = tx._div;
		var html = '';
		
		if (response.Rows && response.Rows.Row) {
			// we have rows!
			var rows = always_array( response.Rows.Row );
			for (var idx = 0, len = rows.length; idx < len; idx++) {
				var row = rows[idx];
				html += this.get_article_preview( row, args );
			} // foreach row
			
			if (args.more && (rows.length == args.limit)) {
				html += large_icon_button('page_white_put.png', 'More...', "Blog.more(this, "+encode_object(args)+")") + '<br clear="all"/>';
				html += spacer(1,15) + '<br/>';
			}
		} // has rows
		else if (response.Code != 0) {
			// search error
			html = 'Search Error: ' . response.Code + ': ' + response.Description;
		}
		else {
			// no rows found
			html = args.none_found_msg || 'No more articles found.';
		}
		
		var div = document.createElement('div');
		div.innerHTML = html;
		
		// button.offsetParent.insertBefore( button, div );
		// button.offsetParent.removeChild( button );
		button.parentNode.replaceChild( div, button );
	}
	
};

function make_tag_links(csv, max, base_url) {
	// format tags as links to search terms
	if (!base_url) base_url = '';
	var tags = csv.split(/\,\s*/);
	var append = '';
	if (max && (tags.length > max)) {
		// too many tags to fit
		tags.length = max;
		append = '...';
	}
	
	var html = '';
	
	for (var idx = 0, len = tags.length; idx < len; idx++) {
		html += '<a href="' + base_url + '#Tag/'+tags[idx]+'">'+tags[idx]+'</a>';
		if (idx < len - 1) html += ', ';
	}
	
	html += append;
	
	return html;
}

function get_url_friendly_title(title) {
	// convert title to URL_Friendly_Version_Like_This
	title = title.toString().replace(/\W+/g, '_'); // non-alpha to _
	if (title.length > 40) title = title.substring(0, 40);
	title = title.replace(/^_+/, ''); // strip leading _
	title = title.replace(/_+$/, ''); // string trailing _
	return title;
}

function get_full_url(url) {
	// if URL begins with '#', prepend current loc
	if (url.match(/^\#/)) {
		var parts = window.location.href.split(/\#/);
		url = parts[0] + url;
	}
	return url;
}
