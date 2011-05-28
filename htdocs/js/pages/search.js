// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.subclass( Effect.Page, "Effect.Page.Search", {
	
	onActivate: function(args) {
		// page is being activated, perform tag search
		if (!args) args = {};
		var search_text = args.q;
		var start = args.s || 0;
		
		if (!start) start = 0;
		// search_text = unescape(search_text);
		var title = 'Search results for "'+search_text+'"';
		
		Nav.bar(
			['Main', 'EffectGames.com'],
			['Search?q=' + escape(search_text), "Search Results"]
		);
		Nav.title( title );
		
		/* Blog.search({
			criteria: ['body|contains|' + search_text, 'status|equals|published'],
			limit: 20,
			sort_by: 'seq',
			sort_dir: -1,
			target: 'd_article_search',
			more: 1
		}); */
		
		this.last_search_text = search_text;
		
		$('d_article_search').innerHTML = loading_image();
		
		load_script( 'http://www.google.com/uds/GwebSearch?callback=receive_google_search_results&context=0&lstkp=0&rsz=large&hl=en&source=gsc&gss=.com&sig=&q='+escape(search_text)+'%20site%3Ahttp%3A%2F%2Fwww.effectgames.com%2F&key=notsupplied&v=1.0&start='+start+'&nocache=' + (new Date()).getTime() );
		
		$('h_article_search').innerHTML = title;
		
		return true;
	},
	
	onDeactivate: function(new_page) {
		// leaving page, clear search bar text
		$('fe_search_bar').value = '';
		$('d_article_search').innerHTML = '';
		return true;
	}
	
} );

function do_search_bar() {
	// invoke search from search bar
	var search_text = $('fe_search_bar').value;
	if (search_text.length) {
		Nav.go('Search?q=' + escape(search_text));
	}
}

function receive_google_search_results(context, response) {
	var html = '';
	
	html += '<div class="powered_by_google">Powered by</div><div class="clear"></div>';
	
	if (response.results.length) {
		for (var idx = 0, len = response.results.length; idx < len; idx++) {
			var row = response.results[idx];
			var url = row.unescapedUrl.replace(/^.+article\.psp\.html/, '#Article'); // convert to internal URL
			html += '<div class="google_search_result_row">';
			html += '<div class="link"><a href="'+url+'"><b>'+row.title+'</b></a></div>';
			html += '<div class="preview">' + row.content + '</div>';
			html += '</div>';
		} // foreach result
	} // has results
	else {
		html += 'No results found.';
	}
	
	// pagination
	if (response.cursor.pages) {
		html += '<div class="google_pagination">Page: ';
		for (var idx = 0, len = response.cursor.pages.length; idx < len; idx++) {
			html += '<span>';
			
			var page = response.cursor.pages[idx];
			var url = '#Search?q=' + escape($P('Search').last_search_text) + '&s=' + page.start;
			
			if (response.cursor.currentPageIndex != idx) html += '<a href="'+url+'">';
			else html += '<b>';
			
			html += page.label;
			
			if (response.cursor.currentPageIndex != idx) html += '</a>';
			else html += '</b>';
			
			html += '</span>';
		}
		html += '</div>';
	}
	
	$('d_article_search').innerHTML = html;
}