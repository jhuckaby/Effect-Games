// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// JavaScript Word-Wrap Library
// Imperfect but good enough for most uses :-)
////

// char widths, in comparison to the 'M' char in Arial font
// used for approximating string lengths
var ww_char_widths = { 32: 0.33, 33: 0.33, 34: 0.4, 35: 0.66, 36: 0.66, 37: 1.03, 38: 0, 39: 0.22, 40: 0.4, 41: 0.4, 42: 0.44, 43: 0.7, 44: 0.33, 45: 0.4, 46: 0.33, 47: 0.33, 48: 0.66, 49: 0.66, 50: 0.66, 51: 0.66, 52: 0.66, 53: 0.66, 54: 0.66, 55: 0.66, 56: 0.66, 57: 0.66, 58: 0.33, 59: 0.33, 60: 0, 61: 0.7, 62: 0.7, 63: 0.66, 64: 1.18, 65: 0.77, 66: 0.77, 67: 0.85, 68: 0.85, 69: 0.77, 70: 0.74, 71: 0.92, 72: 0.85, 73: 0.33, 74: 0.59, 75: 0.77, 76: 0.66, 77: 1, 78: 0.85, 79: 0.92, 80: 0.77, 81: 0.92, 82: 0.85, 83: 0.77, 84: 0.74, 85: 0.85, 86: 0.77, 87: 1.11, 88: 0.77, 89: 0.77, 90: 0.74, 91: 0.33, 92: 0.33, 93: 0.33, 94: 0.55, 95: 0.66, 96: 0.4, 97: 0.66, 98: 0.66, 99: 0.59, 100: 0.66, 101: 0.66, 102: 0.33, 103: 0.66, 104: 0.66, 105: 0.25, 106: 0.25, 107: 0.59, 108: 0.25, 109: 1, 110: 0.66, 111: 0.66, 112: 0.66, 113: 0.66, 114: 0.4, 115: 0.59, 116: 0.33, 117: 0.66, 118: 0.59, 119: 0.85, 120: 0.59, 121: 0.59, 122: 0.59, 123: 0.4, 124: 0.29, 125: 0.4, 126: 0.7, 127: 1.18 };

// our offscreen SPAN for precalculating font char widths
document.write( '<span style="position:absolute; left:-1000px; top:0px; padding:0px; margin:0px;" id="ww_span"></span>' );

function ww_precalc_font(sty, callback) {
	// precalcuate 'M' char width for a given font
	// Usage: ww_precalc_font("font-family:arial; font-size:24pt", "myCallback");
	// Or: ww_precalc_font("my_css_class_name", "myCallback");
	var css_type = !!sty.match(/:/) ? 'style' : 'class';
	document.getElementById('ww_span').innerHTML = '<font '+css_type+'="'+sty+'">M</font>';
	setTimeout( 'ww_precalc_font_finish("'+callback+'")', 1 );
}

function ww_precalc_font_finish(callback) {
	// finish precalculating font
	// passes 'M' width in pixels to callback function
	var span = document.getElementById('ww_span');
	window[ callback ]( span.offsetWidth, span.offsetHeight );
}

function ww_string_width(str, em_width) {
	// calculate string width
	var len = str.length;
	var width = 0;
	
	for (var idx=0; idx<len; idx++) {
		var ch = str.charCodeAt(idx);
		if (ww_char_widths[ch]) width += (em_width * ww_char_widths[ch]);
		else width += em_width;
	}
	
	return width;
}

function ww_fit_filename(filename, max_width, em_width) {
	// fit filename into space by trimming MIDDLE chars and inserting ellipsis
	if (ww_string_width(filename, em_width) <= max_width) return filename;
	
	var end = filename.lastIndexOf('.');
	if (end == -1) end = filename.length;
	if (end < 3) return filename; // e-brake
	var tpos = Math.floor(end / 2);
	var a = filename.substring(0,tpos);
	var b = filename.substring(tpos + 1);
	
	while (ww_string_width(a + '...' + b, em_width) > max_width) {
		a = a.substring(0, a.length - 1); if (!a.length) return '...' + b;
		b = b.substring(1); if (!b.length) return a + '...';
	}
	
	return a + '...' + b;
}

function ww_fit_array(arr, max_width, em_width, ellipsis, html) {
	// call ww_fit_string() on every element in array, return new array
	var output = [];
	for (var idx = 0, len = arr.length; idx < len; idx++) {
		output.push( ww_fit_string(arr[idx], max_width, em_width, ellipsis, html) );
	}
	return output;
}

function ww_fit_string(in_str, max_width, em_width, ellipsis, html) {
	// fit string into predefined pixel width (single line only)
	// only break on words, and possibly add ellipsis
	// ellipsis=1: add in all cases, ellipsis=2: only add in extreme cases
	var str = '' + in_str;
	var len = str.length;
	var width = 0;
	var state = 0;
	var last_word_end = 0;
	
	// adjust for ellipsis width
	if (ellipsis == 1) max_width -= ww_string_width("...", em_width);
	
	for (var idx=0; idx<len; idx++) {
		var is_word_char = !!str.substring(idx, idx + 1).match(/\S/);
		
		if ((state == 1) && !is_word_char) {
			// end of word, mark location for back-tracking
			last_word_end = idx;
		}
		state = is_word_char ? 1 : 0;
		
		var code = str.charCodeAt(idx);
		if (ww_char_widths[code]) width += (em_width * ww_char_widths[code]);
		else width += em_width;
				
		if (width > max_width) {
			if (!last_word_end) {
				// oops, no word breaks, we have no choice but to slice the word up
				var final_str = str.substring(0, (ellipsis == 2) ? (idx - 3) : idx);
				if (ellipsis) final_str += '...';
				return html ? ('<nobr>'+final_str.replace(/\s/g, "&nbsp;")+'</nobr>') : final_str;
			}
			else {
				// chop at last word break
				var final_str = str.substring(0, last_word_end);
				if (ellipsis == 1) final_str += '...';
				return html ? ('<nobr>'+final_str.replace(/\s/g, "&nbsp;")+'</nobr>') : final_str;
			}
		} // too wide
	} // initial loop
	
	// string fits fine without cropping
	return html ? str.replace(/\s/g, "&nbsp;") : str;
}

function ww_fit_box(str, max_width, max_lines, em_width, ellipsis, html) {
	// fit text into box (multi-line)
	var line_idx = 0;
	var char_idx = 0;
	var final_str = '';
	
	while (line_idx < max_lines) {
		while (!!str.substring(char_idx, char_idx + 1).match(/\s/)) char_idx++;
		var last_line = (line_idx == (max_lines - 1));
		var temp_str = ww_fit_string( str.substring(char_idx), max_width, em_width, last_line ? ellipsis : 2, 0 );
		
		final_str += temp_str;
		
		char_idx += temp_str.length;
		if (temp_str.match(/\.\.\.$/)) char_idx -= 3;
		if (char_idx >= str.length) line_idx = max_lines;
		else if (!last_line) final_str += "\n";
		
		line_idx++;
	} // foreach line
	
	return html ? final_str.replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;") : final_str;
}
