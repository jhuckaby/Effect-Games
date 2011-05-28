// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Joe's Misc JavaScript Tools
////

var images_uri = '/effect/images';
var icons_uri = images_uri + '/icons';
var protocol = location.protocol.match(/https/i) ? 'https' : 'http';

// browser checks
var ua = navigator.userAgent;
var safari = !!ua.match(/Safari/);
var safari3 = safari && (!!ua.match(/Version\/[3456789]/) || window.chrome);
var safari2 = (safari && !safari3 && !window.chrome);
var ie = !!ua.match(/MSIE/);
var ie7 = ie && !!ua.match(/MSIE\s+[789]/);
var ie6 = (ie && !ie7);
var moz = !safari && !ie;
var op = !!window.opera;
var mac = !!ua.match(/Mac/i);
var ff = !!ua.match(/Firefox/i);
var ff2 = ff && !!ua.match(/Firefox\/2/);
var ff3 = ff && !!ua.match(/Firefox\/[3456789]/);

var months = [
	[ 1, 'January' ], [ 2, 'February' ], [ 3, 'March' ], [ 4, 'April' ],
	[ 5, 'May' ], [ 6, 'June' ], [ 7, 'July' ], [ 8, 'August' ],
	[ 9, 'September' ], [ 10, 'October' ], [ 11, 'November' ],
	[ 12, 'December' ]
];

var short_month_names = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 
	'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ];

var day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 
	'Thursday', 'Friday', 'Saturday'];

function $(thingy) {
	// universal DOM lookup function, extends object with hide/show/addClass/removeClass
	// can pass in ID or actual DOM object reference
	var obj = (typeof(thingy) == 'string') ? document.getElementById(thingy) : thingy;
	if (obj && !obj.setOpacity) {
		obj.hide = function() { this.style.display = 'none'; return this; };
		obj.show = function() { this.style.display = ''; return this; };
		obj.addClass = function(name) { this.removeClass(name); this.className += ' ' + name; return this; };
		// obj.removeClass = function(name) { this.className = this.className.replace( new RegExp("(^|\\s+)" + name + "(\\s+|$)"), "").replace(/^\s+|\s+$/g, ''); };
		
		obj.removeClass = function(name) {
			var classes = this.className.split(/\s+/);
			var idx = find_idx_in_array( classes, name );
			if (idx > -1) {
				classes.splice( idx, 1 );
				this.className = classes.join(' ');
			}
			return this;
		};
		
		obj.setOpacity = function(opacity) {
			// set opacity on DOM element (0.0 - 1.0)
			if (opacity == 0.0) {
				this.style.opacity = 1.0;
				if (moz) this.style.MozOpacity = 1.0;
				else if (ie) this.style.filter = "";
				this.style.visibility = 'hidden';
			}
			else if (opacity == 1.0) {
				this.style.opacity = 1.0;
				if (moz) this.style.MozOpacity = 1.0;
				else if (ie) this.style.filter = "";
				this.style.visibility = 'visible';
			}
			else {
				this.style.opacity = opacity;
				if (moz) this.style.MozOpacity = opacity;
				else if (ie) this.style.filter = "alpha(opacity=" + parseInt(opacity * 100, 10) + ")";
				this.style.visibility = 'visible';
			}
			return this;
		};
	}
	return obj;
}

function parseQueryString(queryString) {
	// parse query string into object
	var pair = null;
	var queryObject = new Object();
	queryString = queryString.replace(/^.*\?(.+)$/,'$1');
	
	while ((pair = queryString.match(/(\w+)=([^\&]*)\&?/)) && pair[0].length) {
		queryString = queryString.substring( pair[0].length );
		pair[2] = unescape(pair[2]);
		if (/^\-?\d+$/.test(pair[2])) pair[2] = parseInt(pair[2], 10);
		
		if (typeof(queryObject[pair[1]]) != 'undefined') {
			always_array( queryObject, pair[1] );
			array_push( queryObject[pair[1]], pair[2] );
		}
		else queryObject[pair[1]] = pair[2];
	}
	
	return queryObject;
}

function composeQueryString(queryObj) {
	// compose key/value pairs into query string
	// supports duplicate keys (i.e. arrays)
	var qs = '';
	for (var key in queryObj) {
		var values = always_array(queryObj[key]);
		for (var idx = 0, len = values.length; idx < len; idx++) {
			qs += (qs.length ? '&' : '?') + escape(key) + '=' + escape(values[idx]);
		}
	}
	return qs;
}

function spacer(width, height) {
	// insert sized spacer gif image
	return '<img src="'+images_uri+'/spacer.gif" width="'+width+'" height="'+height+'">';
}

function solidify(obj) {
	// make object solid (i.e. not transparent)
	obj.style.opacity = '1.0';
	if (moz) obj.style.MozOpacity = '1.0';
	else if (ie) obj.style.filter = '';
}

function transify(obj) {
	// make object transparent (i.e. half opacity)
	obj.style.opacity = '0.5';
	if (moz) obj.style.MozOpacity = '0.5';
	else if (ie) obj.style.filter = 'alpha(opacity=50)';
}

function trans_icon(name, code) {
	// return html for single icon button that has opacity rollover effect
	var size = 16;
	var html = '<a href="javascript:void(' + code + ')">';
	html += '<img src="'+icons_uri+'/'+name+'.gif" width='+size+' height='+size+' border=0';
	html += ' style="opacity:0.5; moz-opacity:0.5; filter:alpha(opacity=50);"';
	html += ' onMouseOver="solidify(this)"';
	html += ' onMouseOut="transify(this)"';
	html += '>';
	html += '</a>';
	return html;
}

function icon(name, label, code, status_text, id, hspace) {
	// return html for rendering icon image, given name
	if (!window.icons_uri) return 'icons_uri not set!';
	var html = '';
	var ahref = '';
	var size = 16;
	
	if (typeof(label) == 'undefined') label = '';
	else label = '' + label;
	
	if (!id) id = '';
	// if (!status_text && label) status_text = label.toString().replace(/<.+?>/g, '');
	if (!status_text) status_text = '';
	
	if (name.indexOf('_mini') > -1) size = 14;
	else if (name.indexOf('32x32') > -1) size = 32;
	if (!name.match(/\.\w+$/)) name += '.gif';
	
	if (label) {
		html += '<table cellspacing=0 cellpadding=0 border=0><tr><td style="padding:0px; background:transparent;" valign=center>';
	}
	if (code) {
		if (code.toString().match(/^(\#|\/|http\:\/\/)/)) ahref = '<a href="' + code + '"';
		else ahref = '<a href="javascript:void(' + code + ')"';
		ahref += ' title="' + status_text + '">';
		html += ahref;
	}
	html += '<img id="'+id+'" class="png" src="'+png(icons_uri+'/'+name, true)+'" width='+size+' height='+size+' border=0>';

	if (code) html += '</a>';
	if (hspace) html += '&nbsp;';

	if (label) {
		html += '</td><td style="padding:0px;  background:transparent;" width=4>'+spacer(4,1)+'</td><td style="padding:0px; background:transparent;" valign=center>';
		if (code) html += ahref;
		if (size == 32) html += '<span style="font-size:15px;">';
		html += label;
		if (size == 32) html += '</span>';
		if (code) html += '</a>';
		html += '</td></tr></table>';
	}
	return html;
}

function code_link(code, html, status_text) {
	// return formatted html link which executes code
	if (!status_text) status_text = html.toString().replace(/<.+?>/g, "");
	
	return '<a href="javascript:void(' + code + ')"' + 
		' title="' + status_text + '"' + 
		' style="cursor:pointer"' + 
		'>' + html + '</a>';
}

function set_section_visibility(id, visible) {
	// set section view flag to viewable or hidden

	var div = document.getElementById(id);
	var current_state = div.style.display;
	div.style.display = visible ? 'block' : 'none';
	
	var sc = document.getElementById('sc_' + id);
	if (sc) {
		var new_icon_name = visible ? 'arrow-down' : 'arrow-right';
		if (sc.src.indexOf('_mini') > -1) new_icon_name += '_mini';
		sc.src = icons_uri + '/' + new_icon_name + '.png';
	}

	if (visible && !div.innerHTML.length && div.getAttribute('onExpand')) 
		eval( div.getAttribute('onExpand') );
}

function toggle_section(id) {
	// toggle expandable section on and off
	// also set icon src to match (minus or plus icon)
	
	var div = document.getElementById(id);
	var current_state = div.style.display;
	div.style.display = (current_state == 'block') ? 'none' : 'block';
	
	var sc = document.getElementById('sc_' + id);
	if (sc) {
		var new_icon_name = (current_state == 'block') ? 'arrow-right' : 'arrow-down';
		if (sc.src.indexOf('_mini') > -1) new_icon_name += '_mini';
		sc.src = icons_uri + '/' + new_icon_name + '.png';
	}

	if (!div.innerHTML.length && div.getAttribute('onExpand')) 
		eval( div.getAttribute('onExpand') );
}

function section_control(id, expanded) {
	// generate plus/minus icon that expands/contracts
	// section with id given
	return icon(
		expanded ? 'arrow-down.png' : 'arrow-right.png', '', '', 'Toggle Section View', 'sc_' + id
	);
}

function get_text_from_bytes(bytes) {
	// convert raw bytes to english-readable format
	if (bytes >= 1024) {
		bytes = parseInt( (bytes / 1024) * 10, 10 ) / 10;
		if (bytes >= 1024) {
			bytes = parseInt( (bytes / 1024) * 10, 10 ) / 10;
			if (bytes >= 1024) {
				bytes = parseInt( (bytes / 1024) * 10, 10 ) / 10;
				return bytes + ' GB';
			} else return bytes + ' MB';
		}
		else return bytes + ' K';
	}
	else return bytes + ' bytes';
}

function csv_to_hash(csv) {
	// convert comma-separated values into hash keys
	// with values set to 1
	if (!csv.length) return {};
	assert( arguments.length == 1, "Wrong number of arguments sent to csv_to_hash (" + arguments.length + ")" );

	var list = csv.split(/\,\s*/);
	var hash = {};
	
	for (var idx = 0, len = list.length; idx < len; idx++) {
		hash[ list[idx] ] = 1;
	}

	return hash;
}

function num_keys(hash) {
	// count the number of keys in a hash
	var count = 0;

	for (var a in hash) count++;

	return count;
}

function reverse_hash(a) {
	// reverse hash keys/values
	var c = {};
	for (var key in a) {
		c[ a[key] ] = key;
	}
	return c;
}

function progress_bar(args) {
	// render progress bar
	
	if (!args.counter_max) args.counter_max = 1;
	var x = parseInt( (args.counter * args.width) / args.counter_max, 10 );
	if (x < 0) x = 0;
	if (x > args.width) x = args.width;
	
	var html = '<table cellspacing=0 cellpadding=0 border=0><tr><td valign=center';
	if (!x) html += ' background="'+images_uri+'/b2_loop.gif"';
	html += '>';
	html += '<nobr>';
	if (x > 4) {
		var xtemp = x - 4;
		html += '<img src="'+images_uri+'/a1.gif" width=2 height='+args.height+'>';
		html += '<img src="'+images_uri+'/a2.gif" width='+xtemp+' height='+args.height+'>';
		html += '<img src="'+images_uri+'/a3.gif" width=2 height='+args.height+'>';
	}
	if (x < args.width - 4) {
		var xtemp = (args.width - x) - 4;
		var b2 = x ? "b2" : "spacer";
		html += '<img src="'+images_uri+'/b1.gif" width=2 height='+args.height+'>';
		html += '<img src="'+images_uri+'/'+b2+'.gif" width='+xtemp+' height='+args.height+'>';
		html += '<img src="'+images_uri+'/b3.gif" width=2 height='+args.height+'>';
	}
	html += '</nobr>';
	html += '</td>';
	if (args.show_percent) {
		var pct = parseInt( (args.counter * 100) / args.counter_max, 10 );
		if (pct < 0) pct = 0;
		if (pct > 100) pct = 100;
		html += '<td valign=center>&nbsp;' + pct + '%</td>';
	}
	html += '</tr></table>';
	
	return html;
}

var g_unique_id = 772; // magic number :-)
function get_unique_id() {
	// get unique numerical id for divs
	g_unique_id++;
	return g_unique_id;
}

function substitute(text, args) {
	// perform simple [placeholder] substitution using supplied
	// args object (or eval) and return transformed text
	if (!text) text = "";
	if (!args) args = {};

	while (text.indexOf('[') > -1) {
		var open_bracket = text.indexOf('[');
		var close_bracket = text.indexOf(']');

		var before = text.substring(0, open_bracket);
		var after = text.substring(close_bracket + 1, text.length);

		var name = text.substring( open_bracket + 1, close_bracket );
		var value = '';
		if (name.indexOf('/') == 0) value = lookup_path(name, args);
		else if (typeof(args[name]) != 'undefined') value = args[name];
		else if (!(/^\w+$/.test(name))) value = eval(name);
		else value = '[' + name + ']';

		text = before + value + after;
	} // while text contains [

	return text;
}

function time_now() {
	// return the Epoch seconds for like right now
	var now = new Date();
	return parseInt( now.getTime() / 1000, 10 );
}

function ucfirst(text) {
	// capitalize first character only, lower-case rest
	return text.substring(0, 1).toUpperCase() + text.substring(1, text.length).toLowerCase();
}

function text_to_html(text) {
	// simple conversion of \n to <br>
	// plus < and > entitizing
	if (!text) text = "";
	return encode_entities(text).toString().replace(/\n/g, "\n<br>");
}

function html_to_text(html) {
	// simple conversion of html to plain text
	html = html.replace(/<\/(p|div|ul|ol|li|table|tr|dl|dd|dt|h\d)>/ig, "__ChBREAk__");
	html = html.replace(/<br\/?>/ig, "__ChBREAk__");
	html = html.replace(/<.+?>/g, "");
	html = html.replace(/__ChBREAk__/g, "<br/>");
	return html;
}

function image_rollover(img) {
	// given image object, insert "_hover" just before file extension
	// in src tag.  Replaces "_up".  no return value.
	img.src = img.src.replace(/_up(\.\w+)$/, "_over$1");
}

function image_rollout(img) {
	// given image object, remove "_hover" just before file extension
	// in src tag.  Replaces with "_up".  no return value.
	img.src = img.src.replace(/_over(\.\w+)$/, "_up$1");
}

function commify(number) {
	// add commas to integer, like 1,234,567
	// from: http://javascript.internet.com/messages/add-commas.html
	if (!number) number = 0;

	number = '' + number;
	if (number.length > 3) {
		var mod = number.length % 3;
		var output = (mod > 0 ? (number.substring(0,mod)) : '');
		for (i=0 ; i < Math.floor(number.length / 3); i++) {
			if ((mod == 0) && (i == 0))
				output += number.substring(mod+ 3 * i, mod + 3 * i + 3);
			else
				output+= ',' + number.substring(mod + 3 * i, mod + 3 * i + 3);
		}
		return (output);
	}
	else return number;
}

function short_float(value) {
	// Shorten floating-point decimal to 2 places, unless they are zeros.
	if (!value) value = 0;
	return value.toString().replace(/^(\-?\d+\.[0]*\d{2}).*$/, '$1');
}

function pct(count, max) {
	// Return percentage given a number along a sliding scale from 0 to 'max'
	var pct = (count * 100) / (max || 1);
	if (!pct.toString().match(/^\d+(\.\d+)?$/)) { pct = 0; }
	return '' + short_float( pct ) + '%';
}

function hash_to_query(hash) {
	// convert hash to query string format
	var str = '';
	for (var key in hash) {
		if (str.length > 0) str += '&';
		str += key + '=' + escape(hash[key]);
	}
	return str;
}

function get_text_from_seconds(sec, abbrev, no_secondary) {
	// convert raw seconds to human-readable relative time
	var neg = '';
	sec = parseInt(sec, 10);
	if (sec<0) { sec =- sec; neg = '-'; }
	
	var p_text = abbrev ? "sec" : "second";
	var p_amt = sec;
	var s_text = "";
	var s_amt = 0;
	
	if (sec > 59) {
		var min = parseInt(sec / 60, 10);
		sec = sec % 60; 
		s_text = abbrev ? "sec" : "second"; 
		s_amt = sec; 
		p_text = abbrev ? "min" : "minute"; 
		p_amt = min;
		
		if (min > 59) {
			var hour = parseInt(min / 60, 10);
			min = min % 60; 
			s_text = abbrev ? "min" : "minute"; 
			s_amt = min; 
			p_text = abbrev ? "hr" : "hour"; 
			p_amt = hour;
			
			if (hour > 23) {
				var day = parseInt(hour / 24, 10);
				hour = hour % 24; 
				s_text = abbrev ? "hr" : "hour"; 
				s_amt = hour; 
				p_text = "day"; 
				p_amt = day;
				
				if (day > 29) {
					var month = parseInt(day / 30, 10);
					day = day % 30; 
					s_text = "day"; 
					s_amt = day; 
					p_text = abbrev ? "mon" : "month"; 
					p_amt = month;
				} // day>29
			} // hour>23
		} // min>59
	} // sec>59
	
	var text = p_amt + "&nbsp;" + p_text;
	if ((p_amt != 1) && !abbrev) text += "s";
	if (s_amt && !no_secondary) {
		text += ", " + s_amt + "&nbsp;" + s_text;
		if ((s_amt != 1) && !abbrev) text += "s";
	}
	
	return(neg + text);
}

function get_nice_remaining_time(epoch_start, epoch_now, counter, counter_max, abbrev) {
	// estimate remaining time given starting epoch, a counter and the 
	// counter maximum (i.e. percent and 100 would work)
	// return in english-readable format
	
	if (counter == counter_max) return 'Complete';
	if (counter == 0) return 'n/a';
	
	var sec_remain = parseInt(((counter_max - counter) * (epoch_now - epoch_start)) / counter, 10);
	
	return get_text_from_seconds( sec_remain, abbrev );
}

function dumper(_obj, _max_levels, _indent) {
	// return pretty-printed object tree
	if (typeof(_max_levels) == 'undefined') _max_levels = 0;
	var _text = '';
		
	if (!_indent) {
		// _text = "var _obj = ";
		if (typeof(_obj) == 'object' && typeof(_obj.length) != 'undefined') _text += "[\n";
		else _text += "{\n";
		_indent = 1;
	}
	
	var _indentStr = '';
	for (var _k=0; _k<_indent; _k++) _indentStr += "\t";
	
	if (typeof(_obj) == 'object' && typeof(_obj.length) != 'undefined') {
		// type is array
		for (var _a = 0; _a < _obj.length; _a++) {
			if (typeof(_obj[_a]) != 'function') {
				if (typeof(_obj.length) != 'undefined') _text += _indentStr;
				else _text += _indentStr + _a + ": ";

				if (typeof(_obj[_a]) == 'object') {
					if (_obj[_a] == null) {
						_text += "null,\n";
					}
					else if (typeof(_obj[_a].length) != 'undefined') {
						if (_max_levels) _text += "[\n" + dumper( _obj[_a], _max_levels - 1, _indent + 1 ) + _indentStr + "],\n";
						else _text += "[...],\n";
					}
					else {
						if (_max_levels) _text += "{\n" + dumper( _obj[_a], _max_levels - 1, _indent + 1 ) + _indentStr + "},\n";
						else _text += "{...},\n";
					}
				}
				else if (typeof(_obj[_a]) == 'number') _text += _obj[_a] + ",\n";
				else _text += '"' + _obj[_a] + '",' + "\n";
			} // not _a function
		} // for _a in _obj
	} // array
	else {
		// type is object
		for (var _a in _obj) {
			if (typeof(_obj[_a]) != 'function') {
				if (typeof(_obj.length) != 'undefined') _text += _indentStr;
				else _text += _indentStr + _a + ": ";

				if (typeof(_obj[_a]) == 'object') {
					if (_obj[_a] == null) {
						_text += "null,\n";
					}
					else if (typeof(_obj[_a].length) != 'undefined') {
						if (_max_levels) _text += "[\n" + dumper( _obj[_a], _max_levels - 1, _indent + 1 ) + _indentStr + "],\n";
						else _text += "[...],\n";
					}
					else {
						if (_max_levels) _text += "{\n" + dumper( _obj[_a], _max_levels - 1, _indent + 1) + _indentStr + "},\n";
						else _text += "{...},\n";
					}
				}
				else if (typeof(_obj[_a]) == 'number') _text += _obj[_a] + ",\n";
				else _text += '"' + _obj[_a] + '",' + "\n";
			} // not _a function
		} // for _a in _obj
	} // object
	
	if (_indent == 1) {
		if (typeof(_obj) == 'object' && typeof(_obj.length) != 'undefined') _text += "]\n";
		else _text += "}\n";
	}

	return _text;
}

function object_tree( title, obj, expanded ) {
	// render simple object tree with collapsable/expandable sections
	// use folder/file icons for hashes and keys
	var html = '';
	var id = 's_' + get_unique_id();

	html += '<table cellspacing=0 cellpadding=0 onClick="toggle_section(\'' + id + '\')"><tr>';
	html += '<td style="padding:0px" width=16>' + section_control(id, expanded) + '</td>';
	html += '<td style="padding:0px" width=16>' + icon('folder') + '</td><td style="padding:0px" width=2>' + spacer(2,1) + '</td>';
	html += '<td style="padding:0px"><font class=section_title><nobr><font color=blue style="cursor:pointer"><b>'+title+'</b></font></nobr></font></td>';
	html += '</tr></table>';

	html += '<div id="'+id+'" style="display:' + (expanded ? 'block' : 'none') + '">';
	html += '<table cellspacing=0 cellpadding=0><tr><td style="padding:0px" width=16>&nbsp;</td><td style="padding:0px">';
	
	html += '<table>';

	var sorted_keys = hash_keys_to_array(obj).sort();

	for (var idx in sorted_keys) {
		var key = sorted_keys[idx];

		if (typeof(obj[key]) == 'object') {
			html += '<tr><td style="padding:0px">';
			html += object_tree( key, obj[key], 0 );
			html += '</td></tr>';
		}
	}
	for (var idx in sorted_keys) {
		var key = sorted_keys[idx];

		if (typeof(obj[key]) != 'object') {
			html += '<tr><td style="padding:0px">';
			html += '<table cellspacing=0 cellpadding=0><tr><td style="padding:0px" width=16>&nbsp;</td><td style="padding:0px">';
			
			html += icon( 'file', '<b>' + key.toString().replace(/^\W+/, "") + ':</b> ' + obj[key] );
			// html += '<b>' + key.toString().replace(/^\W+/, "") + ':</b> ' + obj[key];
			
			html += '</td></tr></table>';
			html += '</td></tr>';
		}
	}
	html += '</table>';

	html += '</td></tr></table>';
	html += '</div>';
	return html;
}

function this_hour() {
	// return epoch seconds for normalized hour
	var now = new Date();
	var then = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		0, 0, 0 );
	return parseInt( then.getTime() / 1000, 10 );
}

function today_midnight() {
	// return epoch seconds for nearest midnight in past
	var now = new Date();
	var then = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		0, 0, 0, 0 );
	return parseInt( then.getTime() / 1000, 10 );
}

function yesterday_midnight() {
	// return epoch seconds for yesterday's midnight
	var midnight = today_midnight();
	var yesterday = new Date( (midnight - 1) * 1000 );
	var then = new Date(
		yesterday.getFullYear(),
		yesterday.getMonth(),
		yesterday.getDate(),
		0, 0, 0, 0 );
	return parseInt( then.getTime() / 1000, 10 );
}

function this_month_midnight() {
	// return epoch seconds for midnight on the 1st of this month
	var now = new Date();
	var then = new Date(
		now.getFullYear(),
		now.getMonth(),
		1, 0, 0, 0, 0 );
	return parseInt( then.getTime() / 1000, 10 );
}

function last_month_midnight() {
	// return epoch seconds for midnight on the 1st of last month
	var this_month = this_month_midnight();
	var last_month = new Date( (this_month - 1) * 1000 );
	var then = new Date(
		last_month.getFullYear(),
		last_month.getMonth(),
		1, 0, 0, 0, 0 );
	return parseInt( then.getTime() / 1000, 10 );
}

function get_date_args(epoch) {
	// return hash containing year, mon, mday, hour, min, sec
	// given epoch seconds
	var date = new Date( epoch * 1000 );
	var args = {
		year: date.getFullYear(),
		mon: date.getMonth() + 1,
		mday: date.getDate(),
		hour: date.getHours(),
		min: date.getMinutes(),
		sec: date.getSeconds(),
		msec: date.getMilliseconds()
	};
	
	args.yyyy = args.year;
	if (args.mon < 10) args.mm = "0" + args.mon; else args.mm = args.mon;
	if (args.mday < 10) args.dd = "0" + args.mday; else args.dd = args.mday;
	if (args.hour < 10) args.hh = "0" + args.hour; else args.hh = args.hour;
	if (args.min < 10) args.mi = "0" + args.min; else args.mi = args.min;
	if (args.sec < 10) args.ss = "0" + args.sec; else args.ss = args.sec;
	
	if (args.hour >= 12) {
		args.ampm = 'pm';
		args.hour12 = args.hour - 12;
		if (!args.hour12) args.hour12 = 12;
	}
	else {
		args.ampm = 'am';
		args.hour12 = args.hour;
		if (!args.hour12) args.hour12 = 12;
	}
	return args;
}

function get_time_from_args(args) {
	// return epoch given args like those returned from get_date_args()
	var then = new Date(
		args.year,
		args.mon - 1,
		args.mday,
		args.hour,
		args.min,
		args.sec,
		0
	);
	return parseInt( then.getTime() / 1000, 10 );
}

function yyyy(epoch) {
	// return current year (or epoch) in YYYY format
	if (!epoch) epoch = time_now();
	var args = get_date_args(epoch);
	return args.year;
}

function yyyy_mm_dd(epoch) {
	// return current date (or custom epoch) in YYYY/MM/DD format
	if (!epoch) epoch = time_now();
	var args = get_date_args(epoch);
	return args.yyyy + '/' + args.mm + '/' + args.dd;
}

function normalize_time(epoch, zero_args) {
	// quantize time into any given precision
	// example hourly: { min:0, sec:0 }
	// daily: { hour:0, min:0, sec:0 }
	var args = get_date_args(epoch);
	for (key in zero_args) args[key] = zero_args[key];
	
	// mday is 1-based
	if (!args['mday']) args['mday'] = 1;
	
	return get_time_from_args(args);
}

function find_iframe_doc(id) {
	// locate document object in IFRAME
	var domObj = $(id);
	if (!domObj) return null;

	// locate document object inside IFRAME
	var doc = null;
	if (domObj.contentDocument)	doc = domObj.contentDocument; // For NS6
	else if (domObj.contentWindow) doc = domObj.contentWindow.document; // For IE5.5 and IE6
	else if (domObj.document) doc = eval(domObj.id+".document"); // For IE5
	
	return doc;
}

function rand_array(arr) {
	// return random element from array
	return arr[ parseInt(Math.random() * arr.length, 10) ];
}

function find_elem_idx(arr, elem) {
	// Locate element inside of arrayref by value
	for (var idx = 0, len = arr.length; idx < len; idx++) {
		if (arr[idx] == elem) return idx;
	}
	
	return -1; // not found
}

function remove_from_array(arr, elem) {
	// Locate first element inside of arrayref by value, then remove it
	var idx = find_elem_idx(arr, elem);
	if (idx > -1) {
		array_splice( arr, idx, 1 );
		return 1;
	}
	return 0;
}

function remove_all_from_array(arr, elem) {
	// Locate ALL elements matching value, and remove ALL from array
	var done = 0;
	var found = 0;
	
	while (!done) {
		var idx = find_elem_idx(arr, elem);
		if (idx > -1) { array_splice(arr, idx, 1); found++; }
		else { done = 1; }
	}
	
	return found;
}

function getInnerWindowSize(dom) {
	// get size of inner window
	// From: http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
	if (!dom) dom = window;
	var myWidth = 0, myHeight = 0;
	
	if( typeof( dom.innerWidth ) == 'number' ) {
		// Non-IE
		myWidth = dom.innerWidth;
		myHeight = dom.innerHeight;
	}
	else if( dom.document.documentElement && ( dom.document.documentElement.clientWidth || dom.document.documentElement.clientHeight ) ) {
		// IE 6+ in 'standards compliant mode'
		myWidth = dom.document.documentElement.clientWidth;
		myHeight = dom.document.documentElement.clientHeight;
	}
	else if( dom.document.body && ( dom.document.body.clientWidth || dom.document.body.clientHeight ) ) {
		// IE 4 compatible
		myWidth = dom.document.body.clientWidth;
		myHeight = dom.document.body.clientHeight;
	}
	return { width: myWidth, height: myHeight };
}

function getScrollXY(dom) {
	// get page scroll X, Y
	if (!dom) dom = window;
  var scrOfX = 0, scrOfY = 0;
  if( typeof( dom.pageYOffset ) == 'number' ) {
    //Netscape compliant
    scrOfY = dom.pageYOffset;
    scrOfX = dom.pageXOffset;
  } else if( dom.document.body && ( dom.document.body.scrollLeft || dom.document.body.scrollTop ) ) {
    //DOM compliant
    scrOfY = dom.document.body.scrollTop;
    scrOfX = dom.document.body.scrollLeft;
  } else if( dom.document.documentElement && ( dom.document.documentElement.scrollLeft || dom.document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    scrOfY = dom.document.documentElement.scrollTop;
    scrOfX = dom.document.documentElement.scrollLeft;
  }
  return { x: scrOfX, y: scrOfY };
}

function getScrollMax(dom) {
	// get maximum scroll width/height
	if (!dom) dom = window;
	var myWidth = 0, myHeight = 0;
	if (dom.document.body.scrollHeight) {
		myWidth = dom.document.body.scrollWidth;
		myHeight = dom.document.body.scrollHeight;
	}
	else if (dom.document.documentElement.scrollHeight) {
		myWidth = dom.document.documentElement.scrollWidth;
		myHeight = dom.document.documentElement.scrollHeight;
	}
	return { width: myWidth, height: myHeight };
}

function safe_call(name, arg1, arg2, arg3) {
	if (window[name]) return window[name](arg1, arg2, arg3);
	else return null;
}

function hires_time_now() {
	// return the Epoch seconds for like right now
	var now = new Date();
	return ( now.getTime() / 1000 );
}

function fire_callback(callback) {
	// fire callback, which can be a function name, ref, or special object ref
	// inline arguments are passed verbatim to callback function
	var args = array_slice( arguments, 1 );
	
	if (isa_array(callback)) {
		var obj = callback[0];
		var func = callback[1];
		// assert(obj[func], "fire_callback: Object does not contain method: " + func);
		return obj[func].apply(obj, args);
	}
	else if (typeof(callback) == 'function') {
		return callback.apply(null, args);
	}
	else {
		return window[callback].apply(null, args);
	}
}

function fire_hook(name) {
	// fire a hook function, and delete it (one time use)
	if (session.hooks[name]) {
		var args = array_slice(arguments, 1);
		array_unshift( args, session.hooks[name] );
		
		delete session.hooks[name];
		return fire_callback.apply(window, args);
	}
	return true; // passthrough
}

function str_value(str) {
	if (typeof(str) == 'undefined') str = '';
	else if (str === null) str = '';
	return '' + str;
}

function pluralize(word, num) {
	if (num != 1) return word + 's'; else return word;
}

function get_menu_value(id) {
	var menu = $(id);
	if (!menu) return '';
	return menu.options[menu.selectedIndex].value;
}

function get_menu_text(id) {
	var menu = $(id);
	if (!menu) return '';
	return menu.options[menu.selectedIndex].text;
}

function set_menu_value(id, value, auto_add) {
	var menu = $(id);
	if (!menu) return false;
	for (var idx = 0, len = menu.options.length; idx < len; idx++) {
		if (menu.options[idx].value == value) {
			menu.selectedIndex = idx;
			return true;
		}
	}
	if (auto_add) {
		menu.options[menu.options.length] = new Option(value, value);
		menu.selectedIndex = menu.options.length - 1;
		return true;
	}
	return false;
}

function disable_menu(id) {
	var menu = $(id);
	if (!menu) return false;
	menu.disabled = true;
	menu.setAttribute( 'disabled', 'disabled' );
}

function enable_menu(id) {
	var menu = $(id);
	if (!menu) return false;
	menu.disabled = false;
	menu.setAttribute( 'disabled', '' );
}

function populate_menu(id, items, sel_value) {
	var menu = $(id);
	if (!menu) return false;
	menu.options.length = 0;
	
	for (var idx = 0, len = items.length; idx < len; idx++) {
		var item = items[idx];
		var item_name = isa_array(item) ? item[0] : item;
		var item_value = isa_array(item) ? item[1] : item;
		menu.options[ menu.options.length ] = new Option( item_name, item_value );
		if (item_value == sel_value) menu.selectedIndex = idx;
	} // foreach item
}

function dirname(path) {
	// return path excluding file at end (same as POSIX function of same name)
	return path.toString().replace(/\/$/, "").replace(/\/[^\/]+$/, "");
}

function basename(path) {
	// return filename, strip path (same as POSIX function of same name)
	return path.toString().replace(/\/$/, "").replace(/^(.*)\/([^\/]+)$/, "$2");
}

function strip_ext(path) {
	// strip extension from filename
	return path.toString().replace(/\.\w+$/, "");
}

function mm_dd_yyyy(epoch, ch) {
	if (!ch) ch = '/';
	var dargs = get_date_args(epoch);
	if (dargs.mon < 10) dargs.mon = '0' + dargs.mon;
	if (dargs.mday < 10) dargs.mday = '0' + dargs.mday;
	return dargs.year + ch + dargs.mon + ch + dargs.mday;
}

function get_nice_date(epoch, abbrev) {
	var dargs = get_date_args(epoch);
	var month = months[dargs.mon - 1][1];
	if (abbrev) month = month.substring(0, 3);
	return month + ' ' + dargs.mday + ', ' + dargs.year;
}

function get_nice_time(epoch, secs) {
	// return time in HH12:MM format
	var dargs = get_date_args(epoch);
	if (dargs.min < 10) dargs.min = '0' + dargs.min;
	if (dargs.sec < 10) dargs.sec = '0' + dargs.sec;
	var output = dargs.hour12 + ':' + dargs.min;
	if (secs) output += ':' + dargs.sec;
	output += ' ' + dargs.ampm.toUpperCase();
	return output;
}

function get_nice_date_time(epoch, secs) {
	return get_nice_date(epoch) + ' ' + get_nice_time(epoch, secs);
}

function get_short_date_time(epoch) {
	return get_nice_date(epoch, true) + ' ' + get_nice_time(epoch, false);
}

function get_midnight(date) {
	// return epoch of nearest midnight in past (local time)
	var midnight = parseInt( date.getTime() / 1000, 10 );

	midnight -= (date.getHours() * 3600);
	midnight -= (date.getMinutes() * 60);
	midnight -= date.getSeconds();

	return midnight;
}

function get_relative_date(epoch, show_time) {
	// convert epoch to short date string
	var mydate;
	var now = new Date();
	var now_epoch = parseInt( now.getTime() / 1000, 10 );

	if (epoch) {
		mydate = new Date( epoch * 1000 );
		epoch = parseInt( epoch, 10 );
	}
	else {
		mydate = new Date();
		epoch = parseInt( mydate.getTime() / 1000, 10 );
	}

	// relative date display
	var full_date_string = mydate.toLocaleString();
	var html = '<span title="'+full_date_string+'">';

	// get midnight of each
	var mydate_midnight = get_midnight( mydate );
	var now_midnight = get_midnight( now );

	if (mydate_midnight > now_midnight) {
		// date in future
		var mm = mydate.getMonth() + 1; // if (mm < 10) mm = "0" + mm;
		var dd = mydate.getDate(); // if (dd < 10) dd = "0" + dd;
		var yyyy = mydate.getFullYear();

		html += short_month_names[ mydate.getMonth() ] + ' ' + dd;
		if (yyyy != now.getFullYear()) html += ', ' + yyyy;
		
		// html += mm + '/' + dd;
		// if (yyyy != now.getFullYear()) html += '/' + yyyy;
		// html += '/' + yyyy;
		// if (show_time) html += ' ' + get_short_time(epoch);
	}
	else if (mydate_midnight == now_midnight) {
		// today
		if (show_time) {
			if (now_epoch - epoch < 1) {
				html += 'Now';
			}
			else if (now_epoch - epoch < 60) {
				// less than 1 minute ago
				/*var sec = (now_epoch - epoch);
				html += sec + ' Second';
				if (sec != 1) html += 's';
				html += ' Ago';*/
				html += 'A Moment Ago';
			}
			else if (now_epoch - epoch < 3600) {
				// less than 1 hour ago
				var min = parseInt( (now_epoch - epoch) / 60, 10 );
				html += min + ' Minute';
				if (min != 1) html += 's';
				html += ' Ago';
			}
			else if (now_epoch - epoch <= 12 * 3600) {
				// 12 hours or less prior
				var hr = parseInt( (now_epoch - epoch) / 3600, 10 );
				html += hr + ' Hour';
				if (hr != 1) html += 's';
				html += ' Ago';
			}
			else {
				// more than 12 hours ago, but still today
				html += 'Earlier Today';
				if (show_time) html += ', ' + get_short_time(epoch);
			}
		}
		else html += 'Today';
	}
	else if (now_midnight - mydate_midnight == 86400) {
		// yesterday
		html += 'Yesterday';
		if (show_time) html += ', ' + get_short_time(epoch);
	}
	else if ((now_midnight - mydate_midnight < 86400 * 7) && (mydate.getDay() < now.getDay())) {
		// this week
		html += day_names[ mydate.getDay() ];
		if (show_time) html += ', ' + get_short_time(epoch);
	}
	else if ((mydate.getMonth() == now.getMonth()) && (mydate.getFullYear() == now.getFullYear())) {
		// this month
		var mydate_sunday = mydate_midnight - (mydate.getDay() * 86400);
		var now_sunday = now_midnight - (now.getDay() * 86400);

		if (now_sunday - mydate_sunday == 86400 * 7) {
			// last week
			// html += 'Last Week';
			html += 'Last ' + day_names[ mydate.getDay() ];
		}
		else {
			// older
			var mm = mydate.getMonth() + 1; // if (mm < 10) mm = "0" + mm;
			var dd = mydate.getDate(); // if (dd < 10) dd = "0" + dd;
			var yyyy = mydate.getFullYear();

			html += short_month_names[ mydate.getMonth() ] + ' ' + dd;
			if (yyyy != now.getFullYear()) html += ', ' + yyyy;
		}
	}
	else {
		// older
		var mm = mydate.getMonth() + 1; // if (mm < 10) mm = "0" + mm;
		var dd = mydate.getDate(); // if (dd < 10) dd = "0" + dd;
		var yyyy = mydate.getFullYear();

		html += short_month_names[ mydate.getMonth() ] + ' ' + dd;
		if (yyyy != now.getFullYear()) html += ', ' + yyyy;
		// html += mm + '/' + dd;
		// if (yyyy != now.getFullYear()) html += '/' + yyyy;
		// if (show_time) html += ' ' + get_short_time(epoch);
	}

	html += '</span>';
	return html;
}

function get_short_time(epoch, show_msec) {
	// convert epoch to short time string
	
	var mydate;
	if (epoch) mydate = new Date( epoch * 1000 );
	else mydate = new Date();
	
	var ampm = 'AM';
	var hh = mydate.getHours();
	if (hh >= 12) { ampm = 'PM'; hh -=12; }
	if (hh == 0) hh = 12;
	
	var mi = mydate.getMinutes(); if (mi < 10) mi = "0" + mi;
	var ss = mydate.getSeconds(); if (ss < 10) ss = "0" + ss;
	var msec = mydate.getMilliseconds();
	if (msec < 10) msec = "00" + msec;
	else if (msec < 100) msec = "0" + msec;
	
	var str = hh+':'+mi;
	if (show_msec) str += ':'+ss+'.'+msec;
	
	str += '&nbsp;'+ampm;
	return str;
}

function load_script(url) {
	var scr = document.createElement('SCRIPT');
	scr.type = 'text/javascript';
	scr.src = url;
	document.getElementsByTagName('HEAD')[0].appendChild(scr);
}

function safe_query_add(url, str) {
	// safely add query param (adds '?" or '&' based on URL)
	if (url.match(/\?/)) url += '&'; else url += '?';
	return url + str;
}

function trim(str) {
	// trim whitespace from beginning and end of string
	return str.toString().replace(/^\s+/, "").replace(/\s+$/, "");
}

function compose_attribs(attribs) {
	// compose Key="Value" style attributes for HTML elements
	var html = '';
	
	if (attribs) {
		for (var key in attribs) {
			html += " " + key + "=\"" + attribs[key] + "\"";
		}
	}

	return html;
}

function compose_style(attribs) {
	// compose key:value; pairs for style (CSS) elements
	var html = '';
	
	if (attribs) {
		for (var key in attribs) {
			html += " " + key + ":" + attribs[key] + ";";
		}
	}

	return html;
}

function find_idx_in_array(arr, elem) {
	// return idx of elem in arr, or -1 if not found
	for (var idx = 0, len = arr.length; idx < len; idx++) {
		if (arr[idx] == elem) return idx;
	}
	return -1;
}

function find_in_array(arr, elem) {
	// return true if elem is found in arr, false otherwise
	for (var idx = 0, len = arr.length; idx < len; idx++) {
		if (arr[idx] == elem) return true;
	}
	return false;
}

function delete_from_array(arr, elem) {
	// if elem is located in arr, delete it
	var idx = find_idx_in_array(arr, elem);
	if (idx > -1) arr.splice(idx, 1);
}

function tiptext_field(id, class_name, attribs, style, value, tip) {
	// return HTML for text field that has tool tip which shows when the field is empty
	var html = '';
	
	if (!attribs) attribs = {};
	if (!style) style = {};
	value = str_value(value);
	
	if (value.length == 0) {
		value = tip;
		if (class_name.length) class_name += ' ';
		class_name += 'tiptext_empty';
	}
	html += '<input type="text" class="'+class_name+'" id="'+id+'" style="'+compose_style(style)+'" value="'+escape_text_field_value(value)+'" title="'+tip+'" onBlur="tiptext_blur(this)" onFocus="tiptext_focus(this)" '+compose_attribs(attribs)+'>';
	return html;
}

function tiptext_focus(obj) {
	// text has changed in tip field
	if (obj.value == obj.getAttribute('title')) obj.value = '';
	$(obj).removeClass('tiptext_empty');
}

function tiptext_blur(obj) {
	// text has changed in tip field
	if (!obj.value.length) {
		obj.value = obj.getAttribute('title');
		$(obj).addClass('tiptext_empty');
	}
	else if (obj.value != obj.getAttribute('title')) {
		$(obj).removeClass('tiptext_empty');
	}
}

function tiptext_value(id) {
	// get value from tiptext field
	var value = get_clean_field_value(id);
	if (value == $(id).getAttribute('title')) value = '';
	return value;
}

function tiptext_set(id, value) {
	// set value into tiptext field
	var obj = $(id); if (!obj) return;
	value = str_value(value);
	if (value.length > 0) {
		tiptext_focus(obj);
		obj.value = value;
	}
	else {
		obj.value = '';
		tiptext_blur(obj);
	}
}

function get_clean_field_value(id) {
	// return clean (trimmed) form field value
	return trim( $(id).value );
}

function validate_url(url) {
	// make sure URL is well-formed (this is a rather loose match)
	return !!url.match(/^(https?\:\/\/)[\w\-\.\/]+(\?\S+)?$/);
}

function format_price_usd(value, show_usd) {
	// format number to USD price: 0 == "$0.00 USD", 1.5 = "$1.50 USD"
	var matches = value.toString().match(/^(\d+)\.(\d+)$/);
	if (matches) {
		if (matches[2].length < 2) matches[2] = '0' + matches[2];
		else if (matches[2].length > 2) matches[2] = matches[2].substring(0, 2);
		return '$' + commify(matches[1]) + '.' + matches[2] + (show_usd ? ' USD' : '');
	}
	else return '$' + commify(value) + '.00' + (show_usd ? ' USD' : '');
}

function pretty_print_csv(csv) {
	// show using spaces after commas
	csv = str_value(csv);
	return csv.toString().replace(/\,(\S)/g, ", $1");
}

function blur_all_text_fields() {
	// ff must do this when divs go hidden
	var fields = document.getElementsByTagName('input');
	for (var idx = 0, len = fields.length; idx < len; idx++) {
		var field = fields[idx];
		if (field.type == 'text') field.blur();
	}
}

function escape_text_field_value(text) {
	text = encode_attrib_entities( str_value(text) );
	if (ie && text.replace) text = text.replace(/\&apos\;/g, "'");
	return text;
}

function escape_textarea_value(text) {
	text = encode_entities( str_value(text) );
	if (ie && text.replace) text = text.replace(/\&apos\;/g, "'");
	return text;
}

// tab capture code

function selectLine(input, lineNum) {
	// select entire line in text area
	lineNum--; // pass in one-based, convert to zero-based
	var lines = input.value.split(/\n/);
	var before = '';
	for (var idx = 0, len = lines.length; idx < len; idx++) {
		if (idx == lineNum) idx = len;
		else before += lines[idx] + "\n";
	}
	setSelectionRange( input, before.length, before.length + lines[lineNum].length + 1 );
}

function selectAllText(input) {
	if (input.setSelectionRange) {
		// Good browsers (Safari, Firefox, Chrome)
		input.focus();
		input.setSelectionRange(0, input.value.length);
	}
	else if (input.createTextRange) {
		// MSIE
		var range = input.createTextRange();
		range.collapse(true);
		range.moveEnd('character', input.value.length);
		range.moveStart('character', 0);
		range.select();
	}
	return true;
}

// TAB handling code from http://www.webdeveloper.com/forum/showthread.php?t=32317
// Hacked to do my bidding - JH 2008-09-15
function setSelectionRange(input, selectionStart, selectionEnd) {
  if (input.setSelectionRange) {
    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);
  }
  else if (input.createTextRange) {
    var range = input.createTextRange();
    range.collapse(true);
    range.moveEnd('character', selectionEnd);
    range.moveStart('character', selectionStart);
    range.select();
  }
}

function getSelectedText(input) {
	// JH - return selected text, if any
	if (input.setSelectionRange) {
		return input.value.substring( input.selectionStart, input.selectionEnd );
	}
	else if (document.selection) {
		var range = document.selection.createRange();
		if (range.parentElement() == input) {
			return range.text;
		}
	}
	return '';
}

function indentSelectedText(input, direction) {
	// first, expand selection to encompass entire lines
	// FF/Safari only (IE cannot do this)
	if (input.setSelectionRange) {
		var selectionStart = input.selectionStart;
		var selectionEnd = input.selectionEnd;
		
		while ((selectionStart > 0) && (input.value.substring(selectionStart - 1, selectionStart) != "\n"))
			selectionStart--;
		
		while ((selectionEnd < input.value.length) && !input.value.substring(selectionEnd - 1, selectionEnd).match(/[\r\n]/))
			selectionEnd++;
		
		input.setSelectionRange( selectionStart, selectionEnd );
		input.focus();
	}
	
	// now, indent the text
	var lines = getSelectedText(input).split(/\n/);
	var text = '';
	for (var idx = 0, len = lines.length; idx < len - 1; idx++) {
		var line = lines[idx];
		if (direction == 1) text += "\t" + line;
		else if (direction == -1) text += line.replace(/^(\t| {4})/, '');
		if (idx < len - 1) text += "\n";
	}
	
	// now replace selection with our altered text
	replaceSelection(input, text);
}

function surroundSelection(input, left, right) {
	// surround selection with text
	if (!right) right = left;
	var text = getSelectedText(input);
	replaceSelection(input, left + text + right);
	
	if (!text.length && input.setSelectionRange) {
		// no text selected, so move caret to inside
		input.setSelectionRange(input.selectionStart - right.length, input.selectionEnd - right.length);
	}
}

function replaceSelection (input, replaceString) {
	var oldScroll = input.scrollTop;
	if (input.setSelectionRange) {
		var selectionStart = input.selectionStart;
		var selectionEnd = input.selectionEnd;
		input.value = input.value.substring(0, selectionStart)+ replaceString + input.value.substring(selectionEnd);

		if (selectionStart != selectionEnd){ 
			setSelectionRange(input, selectionStart, selectionStart + 	replaceString.length);
		}else{
			setSelectionRange(input, selectionStart + replaceString.length, selectionStart + replaceString.length);
		}

	}else if (document.selection) {
		var range = document.selection.createRange();

		if (range.parentElement() == input) {
			var isCollapsed = range.text == '';
			range.text = replaceString;

			 if (!isCollapsed)  {
				range.moveStart('character', -replaceString.length);
				range.select();
			}
		}
	}
	input.scrollTop = oldScroll;
}

function catchTab(item,e){
	var c = e.which ? e.which : e.keyCode;

	if (c == 9) { // tab pressed
		if (getSelectedText(item).length) {
			// some text is selected, indent or outdent it
			indentSelectedText(item, e.shiftKey ? -1 : 1);
		}
		else {
			// no text selected, just insert a tab
			replaceSelection(item, String.fromCharCode(9));
		}
		
		setTimeout("document.getElementById('"+item.id+"').focus();",0);	
		return false;
	}
}

function count_chars(str, ch) {
	// count the number of occurrences of ch in str
	var count = 0;
	for (var idx = 0, len = str.length; idx < len; idx++) {
		if (str.substring(idx, idx + 1) == ch) count++;
	}
	return count;
}

function multiplex_str(ch, num) {
	// repeat ch by num (same as perl 'x' operator)
	var str = '';
	for (var idx = 0; idx < num; idx++) str += ch;
	return str;
}

function deep_copy_tree(obj) {
	// recursively copy hash/array tree
	// return copy of hash/array
	var new_obj = null;
	
	if (typeof(obj.length) != 'undefined') {
		// array copy
		new_obj = [];
		for (var idx = 0, len = obj.length; idx < len; idx++) {
			if ((typeof(obj[idx]) == 'object') || (typeof(obj[idx]) == 'array')) new_obj[idx] = deep_copy_tree( obj[idx] );
			else new_obj[idx] = obj[idx];
		}
	}
	else {
		// hash copy
		new_obj = {};
		for (var key in obj) {
			if ((typeof(obj[key]) == 'object') || (typeof(obj[key]) == 'array')) new_obj[key] = deep_copy_tree( obj[key] );
			else new_obj[key] = obj[key];
		}
	}

	return new_obj;
}

function strip_base_path(path, base) {
	// strip base from beginning of path
	if (!path || !base) return '';
	if (path.indexOf(base) == 0) path = path.substring( base.length );
	return path;
}

function parse_useragent(useragent) {
	// parse useragent into OS and browser
	if (!useragent) useragent = navigator.userAgent;
	useragent = '' + useragent;
	var os = 'Unknown';
	var browser = 'Unknown';
	
	// remove squid
	useragent = useragent.replace(/\;\s+[\d\.]+\s+cache[\.\w]+(\:\d+)?\s+\(squid[^\)]+\)/, '');
	
	if (useragent.match(/SunOS/)) { os = 'SunOS'; }
	else if (useragent.match(/IRIX/)) { os = 'IRIX'; }
	else if (useragent.match(/Android\D+(\d+\.\d)/)) { os = 'Android ' + RegExp.$1; }
	else if (useragent.match(/Linux/)) { os = 'Linux'; }
	else if (useragent.match(/iPhone/)) { os = 'iPhone'; }
	else if (useragent.match(/Mac\s+OS\s+X\s+([\d\_]+)/)) { os = 'Mac OS X'; }
	else if (useragent.match(/(Mac\s+OS\s+X|Mac_PowerPC)/)) { os = 'Mac OS X'; }
	else if (useragent.match(/Mac/)) { os = 'Mac OS'; }
	else if (useragent.match(/Windows\s+CE/)) { os = 'Windows CE'; }
	else if (useragent.match(/(Windows\s+ME|Win\s9x)/)) { os = 'Windows Me'; }
	else if (useragent.match(/Win(95|98|NT)/)) { os = "Windows " + RegExp.$1; }
	else if (useragent.match(/Win\D+([\d\.]+)/)) {
		var ver = RegExp.$1;
		if (ver.match(/95/)) { os = 'Windows 95'; }
		else if (ver.match(/98/)) { os = 'Windows 98'; }
		else if (ver.match(/4\.0/)) { os = 'Windows NT'; }
		else if (ver.match(/5\.0/)) { os = 'Windows 2000'; }
		else if (ver.match(/5\.[12]/)) {
			os = 'Windows XP';
			// if (useragent.match(/(SV1|MSIE\D+7)/)) { os += ' SP2'; }
		}
		else if (ver.match(/6.0/)) { os = 'Windows Vista'; }
		else if (ver.match(/6.\d+/)) { os = 'Windows 7'; }
		else if (ver.match(/7.\d+/)) { os = 'Windows 7'; }
		else if (useragent.match(/Windows\sNT/)) { os = 'Windows NT'; }
	}
	else if (useragent.match(/Windows\sNT/)) { os = 'Windows NT'; }
	else if (useragent.match(/PSP/)) { os = 'Sony PSP'; }
	else if (useragent.match(/WebTV/)) { os = 'Web TV'; }
	else if (useragent.match(/Palm/)) { os = 'Palm OS'; }
	else if (useragent.match(/Wii/)) { os = 'Nintendo Wii'; }
	else if (useragent.match(/Symbian/)) { os = 'Symbian OS'; }
		
	if (useragent.match(/Chrome\D+(\d+)/)) {
		browser = "Chrome " + RegExp.$1;
	}
	else if (useragent.match(/Android/) && useragent.match(/WebKit/) && useragent.match(/Version\D(\d+\.\d)/)) {
		browser = 'WebKit ' + RegExp.$1;
	}
	else if (useragent.match(/Safari\/((\d+)[\d\.]+)/)) {
		if (useragent.match(/Version\D+([\d]+)/)) {
			// Safari 3+ has version embedded in useragent (FINALLY)
			browser = "Safari " + RegExp.$1;
		}
		else {
			browser = 'Safari 2';
		}
	}
	else if (useragent.match(/iCab/)) { browser = 'iCab'; }
	else if (useragent.match(/OmniWeb/)) { browser = 'OmniWeb'; }
	else if (useragent.match(/Opera\D*(\d+)/)) { browser = "Opera " + RegExp.$1; }
	else if (useragent.match(/(Camino|Chimera)/)) { browser = 'Camino'; }
	else if (useragent.match(/Firefox\D*(\d+\.\d+)/)) { browser = "Firefox " + RegExp.$1; }
	else if (useragent.match(/Netscape\D*(\d+(\.\d+)?)/)) { browser = "Netscape " + RegExp.$1; }
	else if (useragent.match(/Minefield\D+(\d+\.\d)/)) { browser = 'Firefox ' + RegExp.$1 + ' Nightly Build'; }
	else if (useragent.match(/Gecko/)) { browser = 'Mozilla'; }
	else if (useragent.match(/America\s+Online\s+Browser\D+(\d+(\.\d+)?)/)) { browser = "AOL Explorer " + RegExp.$1; }
	else if (useragent.match(/PSP\D+(\d+(\.\d+)?)/)) { browser = "PSP " + RegExp.$1; }
	else if (useragent.match(/Lynx\D+(\d+(\.\d+)?)/)) { browser = "Lynx " + RegExp.$1; }
	else if (useragent.match(/Konqueror\D+(\d+(\.\d+)?)/)) { browser = "Konqueror " + RegExp.$1; }
	else if (useragent.match(/Blazer\D+(\d+(\.\d+)?)/)) { browser = "Blazer " + RegExp.$1; }
	else if (useragent.match(/MSIE\D+(\d+)/)) { browser = "Internet Explorer " + RegExp.$1; }
	else if (useragent.match(/Mozilla\/(4\.\d)/)) {
		var ver = RegExp.$1;
		if (ver != '4.0') { browser = "Netscape " + ver; }
		else { browser = "Mozilla"; }
	}
	else if (useragent.match(/Mozilla/)) { browser = "Mozilla"; }
	
	if ((os == 'Unknown') && (browser == 'Unknown') && useragent.match(/Flash\s+Player\s+([\d\.\,]+)/)) {
		os = 'Adobe';
		browser = 'Flash Player ' + RegExp.$1;
	}
	
	if ((os == 'Unknown') && (browser == 'Unknown')) {
		os = '';
		browser = useragent;
	}
	
	return { os: os, browser: browser };
}

function forceFloatString(value) {
	// force value to have a decimal point
	if (!value.toString().match(/^\d+\.\d+$/)) value = '' + value + '.0';
	return value;
}

function check_reserved_word(name) {
	// make sure name isn't a reserved word
	return !name.toString().match(/^(break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|type|interface|class|dev)$/);
}

function get_next_key_seq(hash) {
	// assumes all hash keys are numbers, locates largest, and returns that + 1
	var largest = 0;
	for (var key in hash) {
		if (key.match(/^\d+$/)) {
			var num = parseInt(key, 10);
			if (num > largest) largest = num;
		}
	}
	return largest + 1;
}

function scroll_to_element(elem) {
	// scroll page vertically so elem is right at the top -- like navigating to an anchor tag
	var elem = $(elem);
	if (elem) {
		var info = get_dom_object_info( $(elem) );
		if (info) window.scrollTo( 0, info.top );
	}
}

function get_user_client_info(str) {
	// extract IP, OS and User Agent from combo string
	// Example: 10.209.183.67, 124.149.157.205, Mozilla/5.0 (Windows; U; Windows NT 6.0; en-US) AppleWebKit/532.8 (KHTML, like Gecko) Chrome/4.0.288.1 Safari/532.8; 1.1 cache.effectgames.com:80 (squid/2.6.STABLE22)
	
	str = str.toString().replace( /\b10\.\d+\.\d+\.\d+\,\s*/, '' ); // strip amazon ips
	var ip = '';
	if (str.match(/^(\d+\.\d+\.\d+\.\d+)\,\s*/)) {
		ip = RegExp.$1;
		str = str.replace( /^(\d+\.\d+\.\d+\.\d+)\,\s*/, '' );
	}
	
	str = str.toString().replace(/\;\s+[\d\.]+\s+cache[\.\w]+(\:\d+)?\s+\(squid[^\)]+\)/, '');
	var user_info = parse_useragent( str );
	user_info.ip = ip;
	
	return user_info;
}

//
// Easing functions
//

window.EaseAlgos = {
	Linear: function(amount) { return amount; },
	Quadratic: function(amount) { return Math.pow(amount, 2); },
	Cubic: function(amount) { return Math.pow(amount, 3); },
	Quartetic: function(amount) { return Math.pow(amount, 4); },
	Quintic: function(amount) { return Math.pow(amount, 5); },
	Sine: function(amount) { return 1 - Math.sin((1 - amount) * Math.PI / 2); },
	Circular: function(amount) { return 1 - Math.sin(Math.acos(amount)); }
};
window.EaseModes = {
	EaseIn: function(amount, algo) { return window.EaseAlgos[algo](amount); },
	EaseOut: function(amount, algo) { return 1 - window.EaseAlgos[algo](1 - amount); },
	EaseInOut: function(amount, algo) {
		return (amount <= 0.5) ? window.EaseAlgos[algo](2 * amount) / 2 : (2 - window.EaseAlgos[algo](2 * (1 - amount))) / 2;
	}
};
function ease(amount, mode, algo) {
	return window.EaseModes[mode]( amount, algo );
}
function tweenFrame(start, end, amount, mode, algo) {
	return start + (ease(amount, mode, algo) * (end - start));
}
