// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// utils.js
// Misc. utility library
////

var ua;

(function() {
	// Browser detection
	var u = navigator.userAgent;
	var chrome = !!u.match(/Chrome/);
	var safari = !!u.match(/Safari/) && !chrome;
	var safari3 = safari && !!u.match(/Version\D[3456789]/);
	var safari2 = safari && !safari3;
	var ie = !!u.match(/MSIE/);
	var ie6 = ie && !!u.match(/MSIE\s+6/);
	var ie7 = ie && !!u.match(/MSIE\s+7/);
	var ie8 = ie && !!u.match(/MSIE\s+8/);
	var moz = !safari && !ie;
	var op = !!window.opera;
	var mac = !!u.match(/Mac/i);
	var ff = !!u.match(/(Firefox|Minefield|Prism)/);
	var ff3 = !!u.match(/(Firefox|Minefield)\D+[3456789]/) || !!u.match(/Prism/);
	var iphone = !!u.match(/iPhone/);
	var ipad = !!u.match(/iPad/);
	var snow = !!u.match(/Mac\s+OS\s+X\s+10\D[6789]/);
	var titanium = safari && !!u.match(/Titanium/);
	var android = !!u.match(/android/i);
	var prism = !!u.match(/prism/i);
	
	var ver = 0;
	if (ff && u.match(/Firefox\D+(\d+(\.\d+)?)/)) {
		ver = parseFloat( RegExp.$1 );
	}
	else if (safari && u.match(/Version\D(\d+(\.\d+)?)/)) {
		ver = parseFloat( RegExp.$1 );
	}
	else if (chrome && u.match(/Chrome\D(\d+(\.\d+)?)/)) {
		ver = parseFloat( RegExp.$1 );
	}
	else if (ie && u.match(/MSIE\D+(\d+(\.\d+)?)/)) {
		ver = parseFloat( RegExp.$1 );
	}
	else if (op && u.match(/Opera\D+(\d+(\.\d+)?)/)) {
		ver = parseFloat( RegExp.$1 );
	}
	
	ua = {
		safari: safari,
		safari3: safari3,
		safari2: safari2,
		ie: ie,
		ie8: ie8,
		ie7: ie7,
		ie6: ie6,
		moz: moz,
		op: op,
		mac: mac,
		ff: ff,
		ff3: ff3,
		chrome: chrome,
		iphone: iphone,
		ipad: ipad,
		snow: snow,
		titanium: titanium,
		android: android,
		prism: prism,
		mobile: iphone || ipad || android,
		clipnest: ie6 || safari,
		ver: ver
	};
})();

var _protocol = location.protocol.match(/https/i) ? 'https' : 'http';

function _parse_query_string(_queryString) {
	var _queryObject = {};
	var _pair = null;
	_queryString = _queryString.replace(/^.*\?(.+)$/,'$1');
	while ((_pair = _queryString.match(/([^=]+)=\'?([^\&\']*)\'?\&?/)) && _pair[0].length) {
		_queryString = _queryString.substring( _pair[0].length );
		// if (/^\-?\d+$/.test(pair[2])) pair[2] = parseInt(pair[2]);
		_queryObject[_pair[1]] = unescape(_pair[2]);
	}
	return _queryObject;
}
var _query = _parse_query_string( location.search );

var _newUnique = 772;
function _get_unique_id() {
	// get a "unique" number for DOM element identification
	_newUnique++;
	return _newUnique;
}

function _now_epoch() {
	// return current date/time in hi-res epoch seconds
	var _mydate = new Date();
	return _mydate.getTime() / 1000;
}

/* function get_short_time(epoch, show_msec) {
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
} */

function _pt_in_obj(e, _obj) {
	// determine if mouse coords are within DOM object bounds
	if (!_obj) return false;
	var _pt = _get_mouse_coords(e, _obj);
	return ((_pt.x >= 0) && (_pt.y >= 0) && (_pt.x < _obj.offsetWidth) && (_pt.y < _obj.offsetHeight));
}

function _getScrollXY(dom) {
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

function _get_mouse_coords(e, _obj) {
	// get mouse position relative to dom obj
	var _pt = new Point();

	if (document.all) {
		var _scroll = _getScrollXY();
		_pt.x = e.clientX + _scroll.x;
		_pt.y = e.clientY + _scroll.y;
	}
	else {
		_pt.x = e.pageX;
		_pt.y = e.pageY;
	}

	if (_obj) {
		var _info = _get_dom_object_info(_obj);
		_pt.x -= _info.left;
		_pt.y -= _info.top;
	}

	return _pt;
}

function _get_dom_object_info(_obj) {
	// get absolute coordinates for dom element
	// based on Stacy Haven's magical GetObjectData()
	var _info = {
		left: 0, 
		top: 0, 
		width: _obj.width ? _obj.width : _obj.offsetWidth, 
		height: _obj.height ? _obj.height : _obj.offsetHeight
	};

	while (_obj) {
		_info.left += _obj.offsetLeft;
		_info.top += _obj.offsetTop;
		_obj = _obj.offsetParent;
	}

	return _info;
}

/* function find_iframe_doc(id) {
	// locate document object in IFRAME
	var domObj = el(id);
	if (!domObj) return null;

	// locate document object inside IFRAME
	var doc = null;
	if (domObj.contentDocument)	doc = domObj.contentDocument; // For NS6
	else if (domObj.contentWindow) doc = domObj.contentWindow.document; // For IE5.5 and IE6
	else if (domObj.document) doc = eval(domObj.id+".document"); // For IE5
	
	return doc;
} */

function easeOutInt(_value, _amount) {
	// ease out value by subtracting value divided by amount
	// approach 0 "smoothly" for animation purposes (i.e. ease out)
	if (!_amount) _amount = 2;

	if (!parseInt(_value / _amount, 10)) {
		if ((_value < 1) && (_value > -1)) _value = 0;
		else if (_value < 0) _value++;
		else if (_value > 0) _value--;
	}
	else _value -= parseInt( _value / _amount, 10 );

	return _value;
}

function easeFloat(_value, _amount, _direction, _cutoff) {
	// ease in or out using floating point
	if (!_amount) _amount = 2;
	if (!_direction) _direction = -1;
	if (!_cutoff) _cutoff = 0.5;
	
	_value += ((_value / _amount) * _direction);
	if (Math.abs(_value) < _cutoff) _value = (_direction < 0) ? 0 : _cutoff;
	
	return _value;
}

function _make_2d_array(_cols, _rows, _value) {
	// create 2D array stuffed with a single value
	var _data = [];
	for (var _x = 0; _x < _cols; _x++) {
		_data[_x] = [];
		for (var _y = 0; _y < _rows; _y++) _data[_x][_y] = _value;
	} // y loop
	return _data;
}

function _rand_array(_arr, _min, _max) {
	// return random element from array
	if (!_min) _min = 0;
	if (!_max) _max = _arr.length;
	return _arr[ _min + Math.floor(Math.random() * (_max - _min)) ];
}

function probably(value) {
	// Calculate probability and return true or false
	if (typeof(value) == 'undefined') { return 1; }
	return ( Math.random() < value ) ? 1 : 0;
}

/* function pad_int(value, len) {
	// pad number with zeros
	var str = '' + value;
	while (str.length < len) str = '0' + str;
	return str;
} */

function _set_opacity(_obj, _opacity) {
	// set opacity on DOM element (0.0 - 1.0)
	if (_opacity == 0.0) {
		_obj.style.opacity = 1.0;
		if (ua.moz) _obj.style.MozOpacity = 1.0;
		else if (ua.ie) _obj.style.filter = "";
		_obj.style.visibility = 'hidden';
	}
	else if (_opacity == 1.0) {
		_obj.style.opacity = 1.0;
		if (ua.moz) _obj.style.MozOpacity = 1.0;
		else if (ua.ie) _obj.style.filter = "";
		_obj.style.visibility = 'visible';
	}
	else {
		_obj.style.opacity = _opacity;
		if (ua.moz) _obj.style.MozOpacity = _opacity;
		else if (ua.ie) _obj.style.filter = "alpha(opacity=" + parseInt(_opacity * 100, 10) + ")";
		_obj.style.visibility = 'visible';
	}
}

function _getInnerWindowSize(_dom) {
	// get size of inner window
	// From: http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
	if (!_dom) _dom = window;
	var _myWidth = 0;
	var _myHeight = 0;
	
	if( typeof( _dom.innerWidth ) == 'number' ) {
		// Non-IE
		_myWidth = _dom.innerWidth;
		_myHeight = _dom.innerHeight;
	}
	else if( _dom.document.documentElement && ( _dom.document.documentElement.clientWidth || _dom.document.documentElement.clientHeight ) ) {
		// IE 6+ in 'standards compliant mode'
		_myWidth = _dom.document.documentElement.clientWidth;
		_myHeight = _dom.document.documentElement.clientHeight;
	}
	else if( _dom.document.body && ( _dom.document.body.clientWidth || _dom.document.body.clientHeight ) ) {
		// IE 4 compatible
		_myWidth = _dom.document.body.clientWidth;
		_myHeight = _dom.document.body.clientHeight;
	}
	return { width: _myWidth, height: _myHeight };
}

function el(_thingy) {
	// shortcut for document.getElementById
	// return document.getElementById(id);
	var _obj = (typeof(_thingy) == 'string') ? document.getElementById(_thingy) : _thingy;
	if (_obj && !_obj.hide) {
		_obj.hide = function() { this.style.display = 'none'; };
		_obj.show = function() { this.style.display = ''; };
		_obj.addClass = function(_name) { this.removeClass(_name); this.className += ' ' + _name; };
		_obj.removeClass = function(_name) { this.className = this.className.replace( new RegExp("(^|\\s+)" + _name + "(\\s+|$)"), "").replace(/^\s+|\s+$/g, ''); };
	}
	return _obj;
}

function _throwError(_msg) {
	// display visible error message
	// this stay compiled in for release builds
	if (gProgress) gProgress.hide();
	if (gGame) gGame.stop();
	
	debugstr("ERROR: " + _msg);
	alert("ERROR: " + _msg);
	
	return null;
}

// this is deliberate, DO NOT CHANGE -- breaks the obfuscator
var assert = function(_value, _msg) {
	// asserts value is true
	if (!_value) {
		if (gProgress) gProgress.hide();
		var _trace = _stack_trace();
		if (_trace) _msg += "\n\n" + _trace;

		debugstr("Assert Failed: " + _msg);
		if (confirm("Assert Failed: " + _msg + "\n\nDo you want to debug?")) {
			if (gGame) gGame.stop();
			eval( "debugger;" );
		}
	}
	return _value;
};

/* function isset(value) {
	return (typeof(value) != 'undefined');
} */

function _stack_trace() {
	var _result = '';
	
	if (typeof(arguments.caller) != 'undefined') {
		for (var _a = arguments.caller; _a != null; _a = _a.caller) {
			var _name = 'anonymous';
			if (_a.callee && _a.callee.toString) {
				var _code = _a.callee.toString();
				if (_code.match) {
					var _matches = _code.match(/function (\w*)/);
					if (_matches && _matches[1]) _name = _matches[1];
					else alert("stack trace no likey: " + _code);
				}
			}
			_result += '> ' + _name + '\n';
			if (_a.caller == _a) {
				_result += '*';
				break;
			}
		}
	}
	else {
		var e;
		try { foo.bar; }
		catch(e) {
			if (e.stack) _result = e.stack;
		}
	}
	
	return( _result );
}

function dumper(_obj, _max_levels, _indent) {
	// return pretty-printed object tree
	if (typeof(_max_levels) == 'undefined') _max_levels = 0;
	var _text = '';
	
	if (typeof(_obj) == 'undefined') return 'undefined';
	else if (typeof(_obj) == 'function') return '(function)';
	else if (_obj === null) return 'null';
		
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

var debugstr = function(_msg) {
	// defining it like this so the obfuscator doesn't clobber it
	// passthru to Debug.trace
	if (typeof(Debug) != 'undefined') Debug.trace.apply(Debug, [_msg]);
};

function _composeQueryString(_queryObj) {
	// compose key/value pairs into query string
	// supports duplicate keys (i.e. arrays)
	var _qs = '';
	for (var _key in _queryObj) {
		var _values = _always_array(_queryObj[_key]);
		for (var _idx = 0, _len = _values.length; _idx < _len; _idx++) {
			_qs += (_qs.length ? '&' : '?') + escape(_key) + '=' + escape(_values[_idx]);
		}
	}
	return _qs;
}

function _load_script(_url) {
	var _scr = document.createElement('SCRIPT');
	_scr.type = 'text/javascript';
	_scr.src = _url;
	document.getElementsByTagName('HEAD')[0].appendChild(_scr);
}

var _hexDigitValueTable = {
	'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9,
	'A':10, 'B':11, 'C':12, 'D':13, 'E':14, 'F':15
};

function _toDec(_hh) {
	_hh = _hh.toUpperCase();
	var _high = _hh.substring(0, 1);
	var _low = _hh.substring(1, 2);
	return ( (_hexDigitValueTable[_high] * 16) + _hexDigitValueTable[_low] );
}

function _HEX2RGB(_hex) {
	_hex = _hex.toString().replace(/^\#/, "").toUpperCase();
	if (_hex.length == 3) _hex = _hex.substring(0, 1) + '0' + _hex.substring(1, 2) + '0' + _hex.substring(2, 3) + '0';
	if (_hex.length != 6) return null;
	
	return {
		r: _toDec( _hex.substring(0, 2) ),
		g: _toDec( _hex.substring(2, 4) ),
		b: _toDec( _hex.substring(4, 6) )
	};
}

function _reverse_hash(_a) {
	// reverse hash keys/values
	var _c = {};
	for (var _key in _a) {
		_c[ _a[_key] ] = _key;
	}
	return _c;
}

function _get_next_key_seq(_hash) {
	// assumes all hash keys are numbers, locates largest, and returns that + 1
	var _largest = 0;
	for (var _key in _hash) {
		if (_key.match(/^\d+$/)) {
			var _num = parseInt(_key, 10);
			if (_num > _largest) _largest = _num;
		}
	}
	return _largest + 1;
}

function _find_in_array(_arr, _elem) {
	// return true if elem is found in arr, false otherwise
	for (var _idx = 0, _len = _arr.length; _idx < _len; _idx++) {
		if (_arr[_idx] == _elem) return true;
	}
	return false;
}

function _int_array(_arr) {
	// call parseInt() on every element in array, return array
	for (var _idx = 0, _len = _arr.length; _idx < _len; _idx++) {
		_arr[_idx] = parseInt( _arr[_idx], 10 );
	}
	return _arr;
}

function _find_idx_in_array(_arr, _elem) {
	// return idx of elem in arr, or -1 if not found
	for (var _idx = 0, _len = _arr.length; _idx < _len; _idx++) {
		if (_arr[_idx] == _elem) return _idx;
	}
	return -1;
}

function _delete_from_array(_arr, _elem) {
	// if elem is located in arr, delete it
	var _idx = _find_idx_in_array(_arr, _elem);
	if (_idx > -1) _arr.splice(_idx, 1);
}

function _select_all_text(input) {
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

function _trim(_str) {
	// trim whitespace from beginning and end of string
	return _str.toString().replace(/^\s+/, "").replace(/\s+$/, "");
}

//
// Event Handling Base Class
//

function _EventHandlerBase() {
	// constructor
	// handlers are stored in this.handlers[ name ]
	// and are always arrays (so multiple can be defined for a given event)
}

_EventHandlerBase.prototype.setHandler = 
_EventHandlerBase.prototype.addEventListener = function(_name, _func) {
	// set handler in object
	_name = _name.toString().toLowerCase().replace(/^on/, '');
	if (!this.handlers) this.handlers = {};
	if (!this.handlers[_name]) this.handlers[_name] = [];
	_array_push( this.handlers[_name], _func );
};

_EventHandlerBase.prototype.removeEventListener = function(_name, _func) {
	// remove single handler from list
	_name = _name.toString().toLowerCase().replace(/^on/, '');
	if (!this.handlers) this.handlers = {};
	if (!this.handlers[_name]) this.handlers[_name] = [];
	_delete_from_array( this.handlers[_name], _func );
};

_EventHandlerBase.prototype.clearAllHandlers = function(_name) {
	// clear custom handler
	_name = _name.toString().toLowerCase().replace(/^on/, '');
	if (!this.handlers) this.handlers = {};
	if (this.handlers[_name]) this.handlers[_name] = [];
};

_EventHandlerBase.prototype.fireHandler = 
_EventHandlerBase.prototype.fireEvent = function(_name) {
	// fire specified handler
	// accepts variable argument list, passes extra args to callback
	_name = _name.toString().toLowerCase().replace(/^on/, '');
	if (!this.handlers) this.handlers = {};
	var _args = _array_slice( arguments, 1 );
		
	if (this.handlers[_name]) {
		var _handlers = _always_array( this.handlers[_name] );
		for (var _idx = 0, _len = _handlers.length; _idx < _len; _idx++) {
			var _result = false;
			var _handler = _handlers[_idx];
			if (typeof(_handler) == 'function') _result = _handler.apply(window, _args);
			else if (_isa_array(_handler)) {
				// PHP style object callback
				// handler[0] is object ref, handler[1] is function ref (or string)
				if (typeof(_handler[1]) == 'function') _result = _handler[1].apply(_handler[0], _args);
				else _result = _handler[0][ _handler[1] ].apply(_handler[0], _args);
			}
			else if (window[_handler]) _result = window[_handler].apply(window, _args);
			// else if (typeof(handler) == 'string') result = eval(handler);
			else return _throwError("Unsupported handler type: " + _name + ": " + _handler);
			if (_result === false) return _result;
		} // foreach handler
	}

	return true;
};

//
// Easing functions
//

var EaseAlgos = {
	Linear: function(_amount) { return _amount; },
	Quadratic: function(_amount) { return Math.pow(_amount, 2); },
	Cubic: function(_amount) { return Math.pow(_amount, 3); },
	Quartetic: function(_amount) { return Math.pow(_amount, 4); },
	Quintic: function(_amount) { return Math.pow(_amount, 5); },
	Sine: function(_amount) { return 1 - Math.sin((1 - _amount) * Math.PI / 2); },
	Circular: function(_amount) { return 1 - Math.sin(Math.acos(_amount)); }
};
var EaseModes = {
	EaseIn: function(_amount, _algo) { return EaseAlgos[_algo](_amount); },
	EaseOut: function(_amount, _algo) { return 1 - EaseAlgos[_algo](1 - _amount); },
	EaseInOut: function(_amount, _algo) {
		return (_amount <= 0.5) ? EaseAlgos[_algo](2 * _amount) / 2 : (2 - EaseAlgos[_algo](2 * (1 - _amount))) / 2;
	}
};
function ease(_amount, _mode, _algo) {
	return EaseModes[_mode]( _amount, _algo );
}

//
// _Perf utilities
//

function _Perf() {
	// class constructor
	this._perf = {};
};

_Perf.prototype.begin = function(_id) {
	if (!_id) _id = 't';
	if (!this._perf[_id]) this._perf[_id] = { elapsed: 0 };
	var _mydate = new Date();
	this._perf[_id].start = _mydate.getTime();
};

_Perf.prototype.count = function(_id, _amount) {
	if (!_amount) _amount = 1;
	if (!_id) return 0;
	
	if (!this._perf[_id]) this._perf[_id] = { start: 1, end: 1, elapsed: 0 };
	this._perf[_id].elapsed += _amount;
};

_Perf.prototype.end = function(_id) {
	if (!_id) _id = 't';
	if (!this._perf[_id]) return;
	var _mydate = new Date();
	this._perf[_id].end = _mydate.getTime();
	
	var _elapsed = this._perf[_id].end - this._perf[_id].start;
	if (_elapsed < 0) _elapsed = 0;
	this._perf[_id].elapsed = _elapsed;
};

_Perf.prototype.summarize = function() {
	var _summary = '';
	
	for (var _id in this._perf) {
		if (!this._perf[_id].end) this.end(_id);
		if (_summary) _summary += '; ';
		_summary += _id + '=' + this._perf[_id].elapsed;
	}

	return _summary;
};

_Perf.prototype.reset = function() {
	this._perf = {};
};

var gPerf = new _Perf();

//
// Math utilities
//

function _RADIANS_TO_DECIMAL(_rad) { return _rad * 180.0 / Math.PI; }
function _DECIMAL_TO_RADIANS(_dec) { return _dec * Math.PI / 180.0; }

//
// Point class
//

function Point(_newX, _newY) {
	// class constructor
	this.x = _newX ? _newX : 0;
	this.y = _newY ? _newY : 0;
};

Point.prototype._isPoint = true;

Point.prototype.set = function() {
	// set point based on coords or object
	if (arguments.length == 1) {
		this.x = arguments[0].x;
		this.y = arguments[0].y;
	}
	else {
		this.x = arguments[0];
		this.y = arguments[1];
	}
	return this;
};

Point.prototype.offset = function() {
	// offset point based on coords or object
	if (arguments.length == 1) {
		this.x += arguments[0].x;
		this.y += arguments[0].y;
	}
	else {
		this.x += arguments[0];
		this.y += arguments[1];
	}
	return this;
};

Point.prototype.floor = function() {
	// convert x and y to ints
	this.x = Math.floor(this.x);
	this.y = Math.floor(this.y);
	return this;
};

Point.prototype.ceil = function() {
	// convert x and y to ints, rounding upward
	this.x = Math.ceil(this.x);
	this.y = Math.ceil(this.y);
	return this;
};

Point.prototype.getPointFromOffset = function() {
	// return new point from offset
	if (arguments.length == 1) {
		return new Point( this.x + arguments[0].x, this.y + arguments[0].y );
	}
	else {
		return new Point( this.x + arguments[0], this.y + arguments[1] );
	}
};

Point.prototype.getDistance = function() {
	// get distance between point and us
	var _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	if ((_pt.x == this.x) && (_pt.y == this.y)) return 0;
	return Math.sqrt( Math.pow(Math.abs(_pt.x - this.x), 2) + Math.pow(Math.abs(_pt.y - this.y), 2) );
};

Point.prototype.getAngle = function() {
	// get angle of point vs us
	var _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	if (this.x == _pt.x && this.y == _pt.y) return 0;
	
	var _side;
	var _quadrant;
	
	if (_pt.y < this.y && _pt.x >= this.x) { _quadrant = 0.0; _side = Math.abs(_pt.y - this.y); }
	else if (_pt.y < this.y && _pt.x < this.x) { _quadrant = 90.0; _side = Math.abs(_pt.x - this.x); }
	else if (_pt.y >= this.y && _pt.x < this.x) { _quadrant = 180.0; _side = Math.abs(_pt.y - this.y); }
	else { _quadrant = 270.0; _side = Math.abs(_pt.x - this.x); }
	
	var _angle = _quadrant + _RADIANS_TO_DECIMAL( Math.asin( _side / this.getDistance(_pt) ) );
	if (_angle >= 360.0) _angle -= 360.0;
	
	return _angle;
};

Point.prototype.getPointFromProjection = function(_angle, _distance) {
	// get new point projected at specified angle and distance
	return this.clone().project(_angle, _distance);
};

Point.prototype.project = function(_angle, _distance) {
	// move point projected at specified angle and distance
	_angle = _angle % 360;
	
	// these functions are not accurate at certain angles, hence the trickery:
	var _temp_cos = ((_angle == 90) || (_angle == 270)) ? 0 : Math.cos( _DECIMAL_TO_RADIANS(_angle) );
	var _temp_sin = ((_angle == 0) || (_angle == 180)) ? 0 : Math.sin( _DECIMAL_TO_RADIANS(_angle) );
	
	this.x += (_temp_cos * _distance);
	this.y -= (_temp_sin * _distance);
	return this;
};

Point.prototype.getMidPoint = function() {
	// get point halfway from us to specified pointvar _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	return new Point(
		this.x + ((_pt.x - this.x) / 2),
		this.y + ((_pt.y - this.y) / 2)
	);
};

Point.prototype.clone = function() {
	// return copy of our pt
	return new Point(this.x, this.y);
};

Point.prototype.morph = function(_destPt, _amount, _mode, _algo) {
	// morph our point into destPt by frame amount (0.0 - 1.0)
	if (_mode && _algo) {
		this.x = tweenFrame(this.x, _destPt.x, _amount, _mode, _algo);
		this.y = tweenFrame(this.y, _destPt.y, _amount, _mode, _algo);
	}
	else {
		this.x += ((_destPt.x - this.x) * _amount);
		this.y += ((_destPt.y - this.y) * _amount);
	}
	return this;
};

//
// Rect class
//

function Rect(_newLeft, _newTop, _newRight, _newBottom) {
	// class constructor
	this.left = _newLeft ? _newLeft : 0;
	this.top = _newTop ? _newTop : 0;
	this.right = _newRight ? _newRight : 0;
	this.bottom = _newBottom ? _newBottom : 0;
};

Rect.prototype._isRect = true;

Rect.prototype.valid = function() {
	// return true if rect is valid, false otherwise
	return (
		(this.right > this.left) && 
		(this.bottom > this.top)
	);
};

Rect.prototype.set = function() {
	// set rect based on coords or another object
	if (arguments.length == 1) {
		this.left = arguments[0].left;
		this.top = arguments[0].top;
		this.right = arguments[0].right;
		this.bottom = arguments[0].bottom;
	}
	else {
		this.left = arguments[0];
		this.top = arguments[1];
		this.right = arguments[2];
		this.bottom = arguments[3];
	}
	return this;
};

Rect.prototype.offset = function() {
	// offset rect based on x/y coords or point
	if (arguments.length == 1) {
		this.left += arguments[0].x;
		this.top += arguments[0].y;
		this.right += arguments[0].x;
		this.bottom += arguments[0].y;
	}
	else {
		this.left += arguments[0];
		this.top += arguments[1];
		this.right += arguments[0];
		this.bottom += arguments[1];
	}
	return this;
};

Rect.prototype.moveTo = function() {
	// move rect to new location
	if (arguments.length == 1) {
		var obj = arguments[0];
		if (obj._isRect) {
			return this.offset(obj.left - this.left, obj.top - this.top);
		}
		else if (obj._isPoint) {
			return this.offset(obj.x - this.left, obj.y - this.top);
		}
	}
	else {
		return this.offset(arguments[0] - this.left, arguments[1] - this.top);
	}
	
	return null;
};

Rect.prototype.width = function() {
	if (arguments.length) this.right = this.left + arguments[0];
	return (this.right - this.left);
};

Rect.prototype.height = function() {
	if (arguments.length) this.bottom = this.top + arguments[0];
	return (this.bottom - this.top);
};

Rect.prototype.centerPointX = function() {
	// get horiz center point
	return ((this.left + this.right) / 2);
};

Rect.prototype.centerPointY = function() {
	// get vert center point
	return ((this.top + this.bottom) / 2);
};

Rect.prototype.centerPoint = function() {
	// return a point right at our center
	return new Point(
		this.centerPointX(),
		this.centerPointY()
	);
};

Rect.prototype.topLeftPoint = function() { return new Point( this.left, this.top ); };
Rect.prototype.topRightPoint = function() { return new Point( this.right, this.top ); };
Rect.prototype.bottomRightPoint = function() { return new Point( this.right, this.bottom ); };
Rect.prototype.bottomLeftPoint = function() { return new Point( this.left, this.bottom ); };

Rect.prototype.ptIn = function(_px, _py) {
	// LEGACY METHOD, DO NOT USE
	// check if point is inside our rect
	return(
		(_px >= this.left) && (_py >= this.top) && 
		(_px < this.right) && (_py < this.bottom)
	);
};

Rect.prototype.pointIn = function() {
	// check if point is inside our rect
	if (arguments.length == 1) {
		var _pt = arguments[0];
		return(
			(_pt.x >= this.left) && (_pt.y >= this.top) && 
			(_pt.x < this.right) && (_pt.y < this.bottom)
		);
	}
	else {
		var _px = arguments[0];
		var _py = arguments[1];
		return(
			(_px >= this.left) && (_py >= this.top) && 
			(_px < this.right) && (_py < this.bottom)
		);
	}
};

Rect.prototype.rectIn = function(_rect) {
	// rect collision test
	var _horizTest = 0;
	var _vertTest = 0;

	if (this.left >= _rect.left && this.left <= _rect.right) _horizTest = 1;
	else if (this.right >= _rect.left && this.right <= _rect.right) _horizTest = 1;
	else if (this.left < _rect.left && this.right > _rect.right) _horizTest = 1;
	
	if (this.top >= _rect.top && this.top <= _rect.bottom) _vertTest = 1;
	else if (this.bottom >= _rect.top && this.bottom <= _rect.bottom) _vertTest = 1;
	else if (this.top < _rect.top && this.bottom > _rect.bottom) _vertTest = 1;
	
	return (_horizTest && _vertTest);
};

Rect.prototype.clone = function() {
	// return copy of our rect
	return new Rect(this.left, this.top, this.right, this.bottom);
};

Rect.prototype.morph = function(_destRect, _amount, _mode, _algo) {
	// morph our rect into destRect by frame amount (0.0 - 1.0)
	if (_mode && _algo) {
		this.left = tweenFrame(this.left, _destRect.left, _amount, _mode, _algo);
		this.top = tweenFrame(this.top, _destRect.top, _amount, _mode, _algo);
		this.right = tweenFrame(this.right, _destRect.right, _amount, _mode, _algo);
		this.bottom = tweenFrame(this.bottom, _destRect.bottom, _amount, _mode, _algo);
	}
	else {
		this.left += ((_destRect.left - this.left) * _amount);
		this.top += ((_destRect.top - this.top) * _amount);
		this.right += ((_destRect.right - this.right) * _amount);
		this.bottom += ((_destRect.bottom - this.bottom) * _amount);
	}
	return this;
};

Rect.prototype.union = function(_source) {
	// set our rect to a union with _source
	if (_source.left < this.left) this.left = _source.left;
	if (_source.top < this.top) this.top = _source.top;
	if (_source.right > this.right) this.right = _source.right;
	if (_source.bottom > this.bottom) this.bottom = _source.bottom;
	return this;
};

Rect.prototype.intersect = function(_source) {
	// set our rect to an intersection with _source
	if (_source.left > this.left) this.left = _source.left;
	if (_source.top > this.top) this.top = _source.top;
	if (_source.right < this.right) this.right = _source.right;
	if (_source.bottom < this.bottom) this.bottom = _source.bottom;
	return this;
};

Rect.prototype.inset = function(_xd, _yd) {
	// inset (or expand) rect
	if (typeof(_yd) == 'undefined') _yd = _xd;
	this.left += _xd;
	this.top += _yd;
	this.right -= _xd;
	this.bottom -= _yd;
	return this;
};
