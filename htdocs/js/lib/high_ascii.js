// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * High ASCII Conversion Library
 * Converts common high-ascii symbols to low-ascii equivalents, strips the rest
 * Usage: convert_high_ascii( text );
 * Author: Joseph Huckaby
 **/

// this maps Unicode decimal character codes to low-ascii characters
var hi_lo_map = {
	initialized: false,
	8230: '...', // ellipsis
	8211: '-', // em dash 1
	8212: '-', // em dash 2
	173: '-', // soft hyphen
	8217: "'", // single curly quote type 1
	8220: '"', // double curly quote type 1
	8219: "'", // single curly quote type 2
	8221: '"', // double curly quote type 2
	8216: "'", // single curly quote type 3
	8223: '"', // double curly quote type 3
	8242: "'", // single curly quote type 4
	8243: '"', // double curly quote type 4
	169: '(c)', // copyright symbol
	8482: '(tm)', // trademark symbol
	174: '(r)' // registered trademark symbol
};

function init_hi_lo_map() {
	// create regular expressions for map
	for (var code in hi_lo_map) {
		if (code != 'initialized') {
			var replace = hi_lo_map[code];
			hi_lo_map[code] = [
				new RegExp("\\u" + decToHex16(code), "g"),
				replace
			];
		}
	}
	hi_lo_map.initialized = true;
}

function decToHex16(dec) {
	// convert 16-bit decimal to hexidecimal
	dec = parseInt(dec, 10);
	var digits = "0123456789ABCDEF";
	var hex = '';
	hex += digits.charAt( Math.floor( Math.floor(dec / 16) / 256) % 16 );
	hex += digits.charAt( Math.floor(dec / 256) % 16 );
	hex += digits.charAt( Math.floor(dec / 16) % 16 );
	hex += digits.charAt( dec % 16 );
	return hex;
}

function convert_high_ascii(text) {
	// convert high ascii to low, and strip remaining
	if (!hi_lo_map.initialized) init_hi_lo_map();

	for (var code in hi_lo_map) {
		if (code != 'initialized') {
			text = text.replace(hi_lo_map[code][0], hi_lo_map[code][1]);
		}
	}
	return strip_high_ascii(text);
}

function strip_high_ascii(str) {
	// strip all high-ascii and unicode characters from string
	return str.toString().replace(/([\x80-\xFF\x00-\x08\x0B-\x0C\x0E-\x1F\u00FF-\uFFFF])/g, "");
}