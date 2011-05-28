// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/*
	JavaScript XML Library
	Plus a bunch of object utility functions
	by Joseph Huckaby
	
	Usage:
		var myxml = '<?xml version="1.0"?><Document>' + 
			'<Simple>Hello</Simple>' + 
			'<Node Key="Value">Content</Node>' + 
			'</Document>';
		var parser = new XML({ text: myxml, preserveAttributes: true });
		var tree = parser.getTree();
		tree.Simple = "Hello2";
		tree.Node._Attribs.Key = "Value2";
		tree.Node._Data = "Content2";
		tree.New = "I added this";
		alert( parser.compose() );	
*/

function XML(_args) {
	// class constructor for XML parser class
	// pass in args hash or text to parse
	if (!_args) _args = '';
	if (_isa_hash(_args)) {
		for (var _key in _args) this[_key] = _args[_key];
	}
	else this.text = args || '';
	
	this.tree = {};
	this.errors = [];
	this._piNodeList = [];
	this._dtdNodeList = [];
	this._documentNodeName = '';
	
	this.patTag.lastIndex = 0;
	if (this.text) this.parse();
}

XML._indent_string = "\t";
XML._xml_header = '<?xml version="1.0"?>';
XML._re_valid_tag_name = /^\w[\w\-\:]*$/;

XML.prototype.preserveAttributes = false;

XML.prototype.patTag = /([^<]*?)<([^>]+)>/g;
XML.prototype.patSpecialTag = /^\s*([\!\?])/;
XML.prototype.patPITag = /^\s*\?/;
XML.prototype.patCommentTag = /^\s*\!--/;
XML.prototype.patDTDTag = /^\s*\!DOCTYPE/;
XML.prototype.patCDATATag = /^\s*\!\s*\[\s*CDATA/;
XML.prototype.patStandardTag = /^\s*(\/?)([\w\-\:\.]+)\s*(.*)$/;
XML.prototype.patSelfClosing = /\/\s*$/;
XML.prototype.patAttrib = new RegExp("([\\w\\-\\:\\.]+)\\s*=\\s*([\\\"\\'])([^\\2]*?)\\2", "g");
XML.prototype.patPINode = /^\s*\?\s*([\w\-\:]+)\s*(.*)$/;
XML.prototype.patEndComment = /--$/;
XML.prototype.patNextClose = /([^>]*?)>/g;
XML.prototype.patExternalDTDNode = new RegExp("^\\s*\\!DOCTYPE\\s+([\\w\\-\\:]+)\\s+(SYSTEM|PUBLIC)\\s+\\\"([^\\\"]+)\\\"");
XML.prototype.patInlineDTDNode = /^\s*\!DOCTYPE\s+([\w\-\:]+)\s+\[/;
XML.prototype.patEndDTD = /\]$/;
XML.prototype.patDTDNode = /^\s*\!DOCTYPE\s+([\w\-\:]+)\s+\[(.*)\]/;
XML.prototype.patEndCDATA = /\]\]$/;
XML.prototype.patCDATANode = /^\s*\!\s*\[\s*CDATA\s*\[(.*)\]\]/;

XML.prototype.attribsKey = '_Attribs';
XML.prototype.dataKey = '_Data';

XML.prototype.parse = function(branch, name) {
	// parse text into XML tree, recurse for nested nodes
	if (!branch) branch = this.tree;
	if (!name) name = null;
	var foundClosing = false;
	var matches = null;
	
	// match each tag, plus preceding text
	while ( matches = this.patTag.exec(this.text) ) {
		var before = matches[1];
		var tag = matches[2];
		
		// text leading up to tag = content of parent node
		if (before.match(/\S/)) {
			if (typeof(branch[this.dataKey]) != 'undefined') branch[this.dataKey] += ' '; else branch[this.dataKey] = '';
			branch[this.dataKey] += _trim(_decode_entities(before));
		}
		
		// parse based on tag type
		if (tag.match(this.patSpecialTag)) {
			// special tag
			if (tag.match(this.patPITag)) tag = this.parsePINode(tag);
			else if (tag.match(this.patCommentTag)) tag = this.parseCommentNode(tag);
			else if (tag.match(this.patDTDTag)) tag = this.parseDTDNode(tag);
			else if (tag.match(this.patCDATATag)) {
				tag = this.parseCDATANode(tag);
				if (typeof(branch[this.dataKey]) != 'undefined') branch[this.dataKey] += ' '; else branch[this.dataKey] = '';
				branch[this.dataKey] += _trim(_decode_entities(tag));
			} // cdata
			else {
				this.throwParseError( "Malformed special tag", tag );
				break;
			} // error
			
			if (tag == null) break;
			continue;
		} // special tag
		else {
			// Tag is standard, so parse name and attributes (if any)
			var matches = tag.match(this.patStandardTag);
			if (!matches) {
				this.throwParseError( "Malformed tag", tag );
				break;
			}
			
			var closing = matches[1];
			var nodeName = matches[2];
			var attribsRaw = matches[3];
			
			// If this is a closing tag, make sure it matches its opening tag
			if (closing) {
				if (nodeName == (name || '')) {
					foundClosing = 1;
					break;
				}
				else {
					this.throwParseError( "Mismatched closing tag (expected </" + name + ">)", tag );
					break;
				}
			} // closing tag
			else {
				// Not a closing tag, so parse attributes into hash.  If tag
				// is self-closing, no recursive parsing is needed.
				var selfClosing = !!attribsRaw.match(this.patSelfClosing);
				var leaf = {};
				var attribs = leaf;
				
				// preserve attributes means they go into a sub-hash named "_Attribs"
				// the XML composer honors this for restoring the tree back into XML
				if (this.preserveAttributes) {
					leaf[this.attribsKey] = {};
					attribs = leaf[this.attribsKey];
				}
				
				// parse attributes
				this.patAttrib.lastIndex = 0;
				while ( matches = this.patAttrib.exec(attribsRaw) ) {
					attribs[ matches[1] ] = _decode_entities( matches[3] );
				} // foreach attrib
				
				// if no attribs found, but we created the _Attribs subhash, clean it up now
				if (this.preserveAttributes && !_num_keys(attribs)) {
					delete leaf[this.attribsKey];
				}
				
				// Recurse for nested nodes
				if (!selfClosing) {
					this.parse( leaf, nodeName );
					if (this.error()) break;
				}
				
				// Compress into simple node if text only
				var num_leaf_keys = _num_keys(leaf);
				if ((typeof(leaf[this.dataKey]) != 'undefined') && (num_leaf_keys == 1)) {
					leaf = leaf[this.dataKey];
				}
				else if (!num_leaf_keys) {
					leaf = '';
				}
				
				// Add leaf to parent branch
				if (typeof(branch[nodeName]) != 'undefined') {
					if (_isa_array(branch[nodeName])) {
						_array_push( branch[nodeName], leaf );
					}
					else {
						var temp = branch[nodeName];
						branch[nodeName] = [ temp, leaf ];
					}
				}
				else {
					branch[nodeName] = leaf;
				}
				
				if (this.error() || (branch == this.tree)) break;
			} // not closing
		} // standard tag
	} // main reg exp
	
	// Make sure we found the closing tag
	if (name && !foundClosing) {
		this.throwParseError( "Missing closing tag (expected </" + name + ">)", name );
	}
	
	// If we are the master node, finish parsing and setup our doc node
	if (branch == this.tree) {
		if (typeof(this.tree[this.dataKey]) != 'undefined') delete this.tree[this.dataKey];
		
		if (_num_keys(this.tree) > 1) {
			this.throwParseError( 'Only one top-level node is allowed in document', _first_key(this.tree) );
			return;
		}

		this._documentNodeName = _first_key(this.tree);
		if (this._documentNodeName) {
			this.tree = this.tree[this._documentNodeName];
		}
	}
};

XML.prototype.throwParseError = function(key, tag) {
	// log error and locate current line number in source XML document
	var parsedSource = this.text.substring(0, this.patTag.lastIndex);
	var eolMatch = parsedSource.match(/\n/g);
	var lineNum = (eolMatch ? eolMatch.length : 0) + 1;
	lineNum -= tag.match(/\n/) ? tag.match(/\n/g).length : 0;
	
	_array_push(this.errors, {
		type: 'Parse',
		key: key,
		text: '<' + tag + '>',
		line: lineNum
	});
};

XML.prototype.error = function() {
	// return number of errors
	return this.errors.length;
};

XML.prototype.getError = function(error) {
	// get formatted error
	var text = '';
	if (!error) return '';

	text = (error.type || 'General') + ' Error';
	if (error.code) text += ' ' + error.code;
	text += ': ' + error.key;
	
	if (error.line) text += ' on line ' + error.line;
	if (error.text) text += ': ' + error.text;

	return text;
};

XML.prototype.getLastError = function() {
	// Get most recently thrown error in plain text format
	if (!this.error()) return '';
	return this.getError( this.errors[this.errors.length - 1] );
};

XML.prototype.parsePINode = function(tag) {
	// Parse Processor Instruction Node, e.g. <?xml version="1.0"?>
	if (!tag.match(this.patPINode)) {
		this.throwParseError( "Malformed processor instruction", tag );
		return null;
	}
	
	_array_push( this._piNodeList, tag );
	return tag;
};

XML.prototype.parseCommentNode = function(tag) {
	// Parse Comment Node, e.g. <!-- hello -->
	var matches = null;
	this.patNextClose.lastIndex = this.patTag.lastIndex;
	
	while (!tag.match(this.patEndComment)) {
		if (matches = this.patNextClose.exec(this.text)) {
			tag += '>' + matches[1];
		}
		else {
			this.throwParseError( "Unclosed comment tag", tag );
			return null;
		}
	}
	
	this.patTag.lastIndex = this.patNextClose.lastIndex;
	return tag;
};

XML.prototype.parseDTDNode = function(tag) {
	// Parse Document Type Descriptor Node, e.g. <!DOCTYPE ... >
	var matches = null;
	
	if (tag.match(this.patExternalDTDNode)) {
		// tag is external, and thus self-closing
		_array_push( this._dtdNodeList, tag );
	}
	else if (tag.match(this.patInlineDTDNode)) {
		// Tag is inline, so check for nested nodes.
		this.patNextClose.lastIndex = this.patTag.lastIndex;
		
		while (!tag.match(this.patEndDTD)) {
			if (matches = this.patNextClose.exec(this.text)) {
				tag += '>' + matches[1];
			}
			else {
				this.throwParseError( "Unclosed DTD tag", tag );
				return null;
			}
		}
		
		this.patTag.lastIndex = this.patNextClose.lastIndex;
		
		// Make sure complete tag is well-formed, and push onto DTD stack.
		if (tag.match(this.patDTDNode)) {
			_array_push( this._dtdNodeList, tag );
		}
		else {
			this.throwParseError( "Malformed DTD tag", tag );
			return null;
		}
	}
	else {
		this.throwParseError( "Malformed DTD tag", tag );
		return null;
	}
	
	return tag;
};

XML.prototype.parseCDATANode = function(tag) {
	// Parse CDATA Node, e.g. <![CDATA[Brooks & Shields]]>
	var matches = null;
	this.patNextClose.lastIndex = this.patTag.lastIndex;
	
	while (!tag.match(this.patEndCDATA)) {
		if (matches = this.patNextClose.exec(this.text)) {
			tag += '>' + matches[1];
		}
		else {
			this.throwParseError( "Unclosed CDATA tag", tag );
			return null;
		}
	}
	
	this.patTag.lastIndex = this.patNextClose.lastIndex;
	
	if (matches = tag.match(this.patCDATANode)) {
		return matches[1];
	}
	else {
		this.throwParseError( "Malformed CDATA tag", tag );
		return null;
	}
};

XML.prototype.getTree = function() {
	// get reference to parsed XML tree
	return this.tree;
};

XML.prototype.compose = function() {
	// compose tree back into XML
	var raw = _compose_xml( this._documentNodeName, this.tree );
	var body = raw.substring( raw.indexOf("\n") + 1, raw.length );
	var xml = '';
	
	if (this._piNodeList.length) {
		for (var idx = 0, len = this._piNodeList.length; idx < len; idx++) {
			xml += '<' + this._piNodeList[idx] + '>' + "\n";
		}
	}
	else {
		xml += XML._xml_header + "\n";
	}
	
	if (this._dtdNodeList.length) {
		for (var idx = 0, len = this._dtdNodeList.length; idx < len; idx++) {
			xml += '<' + this._dtdNodeList[idx] + '>' + "\n";
		}
	}
	
	xml += body;
	return xml;
};

//
// Static Utility Functions:
//

function _parse_xml(text) {
	// turn text into XML tree quickly
	var parser = new XML(text);
	return parser.error() ? parser.getLastError() : parser.getTree();
}

function _trim(text) {
	// strip whitespace from beginning and end of string
	if (text == null) return '';
	
	if (text && text.replace) {
		text = text.replace(/^\s+/, "");
		text = text.replace(/\s+$/, "");
	}
	
	return text;
}

function _encode_entities(text) {
	// Simple entitize function for composing XML
	if (text == null) return '';

	if (text && text.replace) {
		text = text.replace(/\&/g, "&amp;"); // MUST BE FIRST
		text = text.replace(/</g, "&lt;");
		text = text.replace(/>/g, "&gt;");
	}

	return text;
}

function _encode_attrib_entities(text) {
	// Simple entitize function for composing XML attributes
	if (text == null) return '';

	if (text && text.replace) {
		text = text.replace(/\&/g, "&amp;"); // MUST BE FIRST
		text = text.replace(/</g, "&lt;");
		text = text.replace(/>/g, "&gt;");
		text = text.replace(/\"/g, "&quot;");
		text = text.replace(/\'/g, "&apos;");
	}

	return text;
}

function _decode_entities(text) {
	// Decode XML entities into raw ASCII
	if (text == null) return '';

	if (text && text.replace) {
		text = text.replace(/\&lt\;/g, "<");
		text = text.replace(/\&gt\;/g, ">");
		text = text.replace(/\&quot\;/g, '"');
		text = text.replace(/\&apos\;/g, "'");
		text = text.replace(/\&amp\;/g, "&"); // MUST BE LAST
	}

	return text;
}

function _compose_xml(name, node, indent) {
	// Compose node into XML including attributes
	// Recurse for child nodes
	var xml = "";
	
	// If this is the root node, set the indent to 0
	// and setup the XML header (PI node)
	if (!indent) {
		indent = 0;
		xml = XML._xml_header + "\n";
	}
	
	// Setup the indent text
	var indent_text = "";
	for (var k = 0; k < indent; k++) indent_text += XML._indent_string;

	if ((typeof(node) == 'object') && (node != null)) {
		// node is object -- now see if it is an array or hash
		if (!node.length) { // what about zero-length array?
			// node is hash
			xml += indent_text + "<" + name;

			var _num_keys = 0;
			var has_attribs = 0;
			for (var key in node) _num_keys++; // there must be a better way...

			if (node["_Attribs"]) {
				has_attribs = 1;
				var sorted_keys = _hash_keys_to_array(node["_Attribs"]).sort();
				for (var idx = 0, len = sorted_keys.length; idx < len; idx++) {
					var key = sorted_keys[idx];
					xml += " " + key + "=\"" + _encode_attrib_entities(node["_Attribs"][key]) + "\"";
				}
			} // has attribs

			if (_num_keys > has_attribs) {
				// has child elements
				xml += ">";

				if (node["_Data"]) {
					// simple text child node
					xml += _encode_entities(node["_Data"]) + "</" + name + ">\n";
				} // just text
				else {
					xml += "\n";
					
					var sorted_keys = _hash_keys_to_array(node).sort();
					for (var idx = 0, len = sorted_keys.length; idx < len; idx++) {
						var key = sorted_keys[idx];					
						if ((key != "_Attribs") && key.match(XML._re_valid_tag_name)) {
							// recurse for node, with incremented indent value
							xml += _compose_xml( key, node[key], indent + 1 );
						} // not _Attribs key
					} // foreach key

					xml += indent_text + "</" + name + ">\n";
				} // real children
			}
			else {
				// no child elements, so self-close
				xml += "/>\n";
			}
		} // standard node
		else {
			// node is array
			for (var idx = 0; idx < node.length; idx++) {
				// recurse for node in array with same indent
				xml += _compose_xml( name, node[idx], indent );
			}
		} // array of nodes
	} // complex node
	else {
		// node is simple string
		xml += indent_text + "<" + name + ">" + _encode_entities(node) + "</" + name + ">\n";
	} // simple text node

	return xml;
}

function _find_object(_obj, _criteria) {
	// walk array looking for nested object matching _criteria object
	
	var _criteria_length = 0;
	for (var _a in _criteria) _criteria_length++;
	_obj = _always_array(_obj);
	
	for (var _a = 0, _len = _obj.length; _a < _len; _a++) {
		var _matches = 0;
		
		for (var _b in _criteria) {
			if (_obj[_a][_b] && (_obj[_a][_b] == _criteria[_b])) _matches++;
			else if (_obj[_a]["_Attribs"] && _obj[_a]["_Attribs"][_b] && (_obj[_a]["_Attribs"][_b] == _criteria[_b])) _matches++;
		}
		if (_matches >= _criteria_length) return _obj[_a];
	}
	return null;
}

function _find_objects(_obj, _criteria) {
	// walk array gathering all nested objects that match _criteria object
	var _objs = [];
	var _criteria_length = 0;
	for (var _a in _criteria) _criteria_length++;
	_obj = _always_array(_obj);
	
	for (var _a = 0, _len = _obj.length; _a < _len; _a++) {
		var _matches = 0;
		for (var _b in _criteria) {
			if (_obj[_a][_b] && _obj[_a][_b] == _criteria[_b]) _matches++;
			else if (_obj[_a]["_Attribs"] && _obj[_a]["_Attribs"][_b] && (_obj[_a]["_Attribs"][_b] == _criteria[_b])) _matches++;
		}
		if (_matches >= _criteria_length) _array_push( _objs, _obj[_a] );
	}
	
	return _objs;
}

function _find_object_idx(_obj, _criteria) {
	// walk array looking for nested object matching _criteria object
	// return index in outer array, not object itself
	
	var _criteria_length = 0;
	for (var _a in _criteria) _criteria_length++;
	_obj = _always_array(_obj);
	
	for (var _idx = 0, _len = _obj.length; _idx < _len; _idx++) {
		var _matches = 0;
		
		for (var _b in _criteria) {
			if (_obj[_idx][_b] && (_obj[_idx][_b] == _criteria[_b])) _matches++;
			else if (_obj[_idx]["_Attribs"] && _obj[_idx]["_Attribs"][_b] && (_obj[_idx]["_Attribs"][_b] == _criteria[_b])) _matches++;
		}
		if (_matches >= _criteria_length) return _idx;
	}
	return -1;
}

function _always_array(_obj, _key) {
	// if object is not array, return array containing object
	// if key is passed, work like XMLalwaysarray() instead
	// apparently MSIE has weird issues with obj = _always_array(obj);
	
	if (_key) {
		if ((typeof(_obj[_key]) != 'object') || (typeof(_obj[_key].length) == 'undefined')) {
			var _temp = _obj[_key];
			delete _obj[_key];
			_obj[_key] = [];
			_obj[_key][0] = _temp;
		}
		return null;
	}
	else {
		if ((typeof(_obj) != 'object') || (typeof(_obj.length) == 'undefined')) { return [ _obj ]; }
		else return _obj;
	}
}

function _hash_keys_to_array(_hash) {
	// convert hash keys to array (discard values)
	var _array = [];

	for (var _key in _hash) _array.push(_key);

	return _array;
}

function _array_to_hash_keys(_arr) {
	// convert array elements to hash keys
	var _hash = {};
	for (var _idx = 0, _len = _arr.length; _idx < _len; _idx++) {
		_hash[ _arr[_idx] ] = 1;
	}
	return _hash;
}

function serialize(_thingy, _glue) {
	// serialize anything into json
	// or perl object notation (just set glue to '=>')
	if (!_glue) _glue = ':'; // default to json
	var _stream = '';
	
	if (typeof(_thingy) == 'number') {
		_stream += _thingy;
	}
	else if (typeof(_thingy) == 'string') {
		_stream += '"' + _thingy.replace(/([\"\\])/g, '\\$1').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"';
	}
	else if (_isa_hash(_thingy)) {
		var _num = 0;
		var _buffer = [];
		for (var _key in _thingy) {
			_buffer[_num] = (_key.match(/^\w+$/) ? _key : ('"'+_key+'"')) + _glue + serialize(_thingy[_key], _glue);
			_num++;
		}
		_stream += '{' + _buffer.join(',') + '}';
	}
	else if (_isa_array(_thingy)) {
		var _buffer = [];
		for (var _idx = 0, _len = _thingy.length; _idx < _len; _idx++) {
			_buffer[_idx] = serialize(_thingy[_idx], _glue);
		}
		_stream += '[' + _buffer.join(',') + ']';
	}
	else {
		// unknown type, just return 0
		_stream += '0';
	}
	
	return _stream;
}

function merge_objects(_a, _b) {
	// merge keys from a and b into c and return c
	// b has precedence over a
	if (!_a) _a = {};
	if (!_b) _b = {};
	var _c = {};

	// also handle serialized objects for a and b
	if (typeof(_a) != 'object') eval( "_a = " + _a );
	if (typeof(_b) != 'object') eval( "_b = " + _b );

	for (var _key in _a) _c[_key] = _a[_key];
	for (var _key in _b) _c[_key] = _b[_key];

	return _c;
}

function _copy_object(_obj) {
	// return copy of object (NOT DEEP)
	var _new_obj = {};

	for (var _key in _obj) _new_obj[_key] = _obj[_key];

	return _new_obj;
}

function _deep_copy_object(_obj) {
	// recursively copy object and nested objects
	// return new object
	if (_isa_hash(_obj)) {
		var _new_obj = {};
		for (var _key in _obj) {
			if (_isa_hash(_obj[_key]) || _isa_array(_obj[_key]))
				_new_obj[_key] = _deep_copy_object(_obj[_key]);
			else
				_new_obj[_key] = _obj[_key];
		}
		return _new_obj;
	}
	else if (_isa_array(_obj)) {
		var _new_obj = [];
		for (var _idx = 0, _len = _obj.length; _idx < _len; _idx++) {
			if (_isa_hash(_obj[_idx]) || _isa_array(_obj[_idx]))
				_new_obj[_idx] = _deep_copy_object(_obj[_idx]);
			else
				_new_obj[_idx] = _obj[_idx];
		}
		return _new_obj;
	}
	
	return null;
}

function _deep_copy_object_lc_keys(_obj) {
	// recursively copy object and nested objects
	// lower-case all keys, return new object
	var _new_obj = {};
	if (_obj.length) _new_obj = [];

	for (var _key in _obj) {
		var _lc_key = _key.toLowerCase ? _key.toLowerCase() : _key;
		if (typeof(_obj[_key]) == 'object') _new_obj[_lc_key] = _deep_copy_object_lc_keys( _obj[_key] );
		else _new_obj[_lc_key] = _obj[_key];
	}

	return _new_obj;
}

function _num_keys(_hash) {
	// count the number of keys in a hash
	var _count = 0;
	for (var _a in _hash) _count++;
	return _count;
}

function _compose_attribs(_attribs) {
	// compose Key="Value" style attributes for HTML elements
	var _html = '';
	
	if (_attribs) {
		for (var _key in _attribs) {
			_html += " " + _key + "=\"" + _attribs[_key] + "\"";
		}
	}

	return _html;
}

function _isa_hash(_arg) {
	// determine if arg is a hash
	return( !!_arg && (typeof(_arg) == 'object') && (typeof(_arg.length) == 'undefined') );
}

function _isa_array(_arg) {
	// determine if arg is an array or is array-like
	if (typeof(_arg) == 'array') return true;
	return( !!_arg && (typeof(_arg) == 'object') && (typeof(_arg.length) != 'undefined') );
}

function _first_key(_hash) {
	// return first key from hash (unordered)
	for (var _key in _hash) return _key;
	return null; // no keys in hash
}

////
// replacement array functions
// included because IE 5.01 and below do not support
// standard array functions (nice work, microsoft)
////

function _array_push(_array, _item) {
	// push item onto end of array
	_array[ _array.length ] = _item;
}

function _array_slice(_array, _start, _end) {
	// return an excerpt from the array, leaving original array intact
	if (!_end) _end = _array.length;
	var _slice = [];
	
	for (var _idx = _start; _idx < _end; _idx++) {
		if (_idx < _array.length) _array_push( _slice, _array[_idx] );
	}
	
	return _slice;
}

function _array_combine(_a, _b) {
	// concatenate two arrays together, return combined array
	var _c = [];
	for (var _idx = 0; _idx < _a.length; _idx++) _array_push( _c, _a[_idx] );
	for (var _idx = 0; _idx < _b.length; _idx++) _array_push( _c, _b[_idx] );
	return _c;
}

function _array_cat(_a, _b) {
	// push elements of b onto a
	for (var _idx = 0; _idx < _b.length; _idx++) _array_push( _a, _b[_idx] );
}
