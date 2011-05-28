// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Joe's JavaScript Toolkit
 * Event Handling Code
 **/

var dblclick_threshold = 0.25;

// common key codes
var SPACE_BAR = 32;
var ENTER_KEY = 13;
var ESC_KEY = 27;
var DELETE_KEY = 8;
var TAB_KEY = 9;
var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var mozKeyMap = {
	192: '~',
	187: '=',
	189: '-',
	111: '/',
	106: '*',
	109: '-',
	219: '[',
	221: ']',
	220: "\\",
	103: '7',
	104: '8',
	105: '9',
	107: '+',
	186: ':',
	222: '\'',
	100: '4',
	101: '5',
	102: '6',
	188: ',',
	190: '.',
	191: '/',
	97: '1',
	98: '2',
	99: '3',
	96: '0',
	110: '.'
};

var keyCodeTitleMap = {
	8: 'Backspace',
	9: 'Tab',
	27: 'Escape', 
	32: 'Space',
	192: 'Tilde',
	187: 'Equals',
	189: 'Dash',
	45: 'Insert',
	36: 'Home',
	33: 'Page Up',
	144: 'Num Lock',
	111: 'Slash (Keypad)',
	106: 'Asterisk (Keypad)',
	109: 'Dash (Keypad)',
	219: 'Left Bracket',
	221: 'Right Bracket',
	220: "Backslash",
	46: 'Delete',
	35: 'End',
	34: 'Page Down',
	103: '7 (Keypad)',
	104: '8 (Keypad)',
	105: '9 (Keypad)',
	107: 'Plus (Keypad)',
	186: 'Semicolon',
	222: 'Quote',
	13: 'Enter',
	100: '4 (Keypad)',
	101: '5 (Keypad)',
	102: '6 (Keypad)',
	188: 'Comma',
	190: 'Period',
	191: 'Slash',
	38: 'Up Arrow',
	97: '1 (Keypad)',
	98: '2 (Keypad)',
	99: '3 (Keypad)',
	17: 'Control',
	37: 'Left Arrow',
	40: 'Down Arrow',
	39: 'Right Arrow',
	96: '0 (Keypad)',
	110: 'Period (Keypad)',
	16: 'Shift',
	18: 'Alt/Option',
	224: 'Meta/Cmd'
	// 91: 'Left Cmd', // Safari Mac Only
	// 93: 'Right Cmd', // Safari Mac Only
};

function get_nice_key_name(keyCode) {
	// get human-readable key name based on key code ("Backspace", etc.)
	if (keyCodeTitleMap[keyCode]) return keyCodeTitleMap[keyCode];
	else {
		var ch = String.fromCharCode(keyCode);
		if ( ((keyCode >= 65) && (keyCode <= 90)) || ((keyCode >= 45) && (keyCode <= 57)) ) {
			// alpahnumeric
			// return '(' + ch + ')';
			return ch;
		}
		else {
			// unknown
			return 'Unknown (#' + keyCode + ')';
		}
	}	
}

function fix_key_code(keyCode) {
	// some browsers use different key codes for certain keys
	// try to standardize as much as we can here
	switch (keyCode) {
		case 59: keyCode = 186; break; // firefox semi-colon to colon map
		case 91:
		case 93: keyCode = 224; break; // firefox left-cmd/right-cmd to cmd map
	}
	
	return keyCode;
}

function get_mouse_coords(e, obj) {
	// get global mouse position, or relative to dom obj
	var pt = {};

	if (document.all) {
		pt.x = e.clientX;
		pt.y = e.clientY;
	}
	else {
		pt.x = e.pageX;
		pt.y = e.pageY;
	}

	if (obj) {
		var info = get_dom_object_info(obj);
		pt.x -= info.left;
		pt.y -= info.top;
	}

	return pt;
}

function get_dom_object_info(obj) {
	// get absolute coordinates for dom element
	var info = {
		left: 0, 
		top: 0, 
		width: obj.width ? obj.width : obj.offsetWidth, 
		height: obj.height ? obj.height : obj.offsetHeight
	};

	while (obj) {
		info.left += obj.offsetLeft;
		info.top += obj.offsetTop;
		// if (obj.scrollLeft) info.left -= obj.scrollLeft;
		// if (obj.scrollTop) info.top -= obj.scrollTop;
		obj = obj.offsetParent;
	}

	return info;
}

function delay_onChange_input_text(e) {
	// this function is called for every keypress in every input field
	// if key code is 13 (return/enter key), PREVENT form submit
	// plus invoke onEnter handler if defined
	// also, invoke onChange handler after slight delay to capture new contents
	if (!e) e = window.event;
	var ch = 0;
	if (e.keyCode) ch = e.keyCode;
	else if (e.which) ch = e.which;
	if (ch == 13) {
		if (this.getAttribute('onEnter')) invoke_dom_handler(this, 'onEnter');
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		}
		else {
			e.returnValue = false;
			e.cancelBubble = true;
		}
		return false;
	}
	
	if (this.getAttribute('onChange')) {
		var obj = this;
		setTimeout( function() { invoke_dom_handler(obj, 'onChange'); }, 1 );
	}
	return true;
}

function delay_onChange_textarea() {
	// invoke onChange handler after short delay, to capture new contents
	if (this.getAttribute('onChange')) {
		var obj = this;
		setTimeout( function() { invoke_dom_handler(obj, 'onChange'); }, 1 );
	}
	return true;
}

function invoke_dom_handler(target, handlerName) {
	// invoke a dom handler by name (e.g. onClick)
	if (typeof(target[handlerName]) == 'function') return target[handlerName](); // already a function

	var handler = target.getAttribute(handlerName);
	if (!handler) return false;

	var code = handler.toString ? handler.toString() : handler;
	if (code.match(/^function\s+\w+\(\)/)) {
		code = code.substring( code.indexOf("{") + 1, code.lastIndexOf("}") ) + "\r;";
	}
	target['__temp'] = new Function( code );
	target['__temp']();
}

// allow first two events (assuming these will be mouseDown, mouseUp) to pass
// so frame can be properly focused, in order to receive key events in Safari/FF
// this cannot be forced with window.focus();
// var pass_event_counter = 2;
var received_mouse_down = false;
var received_mouse_up = false;

function pass_event_if(state, e) {
	// pass event through if state is true
	/* if (pass_event_counter) {
		pass_event_counter--;
		return true;
	} */
	if (!received_mouse_down || !received_mouse_up) return true;
	
	if (state) return true; // passthrough
	else return stop_event(e);
}

function stop_event(e) {
	// prevent default behavior for event
	// debugstr("stopping event from bubbling");
	if (e.preventDefault) {
		e.preventDefault();
		e.stopPropagation();
	}
	else {
		e.returnValue = false;
		e.cancelBubble = true;
	}
	return false;
}

function stop_textarea_key_event(e) {
	// only stop event if metaKey and ctrlKey modifiers are not down
	if (!e) e = window.event;
	if (e && !e.metaKey && !e.ctrlKey) {
		return stop_event(e);
	}
	else return true;
}

var mouseObj = null; // DOM obj that receives mouse events

function app_mouse_down(e) {
	// handle mouse down event
	received_mouse_down = true;
	if (!e) e = window.event;
	
	if (window.session) session.mouseIsDown = true;
	
	// if progress dialog is present, stop ALL clicks
	if (window.session && session.progress) {
		stop_event(e);
		return false; // stop bubble
	}
	
	if (window.session) session.last_mouse_event = e;
	
	var targetObj = e.target ? e.target : e.srcElement;

	while (targetObj && !targetObj.tagName.match(/^(BODY|HTML)$/) && !targetObj.getAttribute('captureMouse') && !targetObj.captureMouse) {
		targetObj = targetObj.parentNode ? targetObj.parentNode : targetObj.parentElement;
	}

	if (targetObj && targetObj.getAttribute('captureMouse')) {
		var pt = get_mouse_coords(e, targetObj);
		mouseObj = targetObj;
		
		targetObj['__captureMouse'] = eval( 'window.' + targetObj.getAttribute('captureMouse') );
		if (!targetObj['__captureMouse']) return alert("captureMouse handler not found: " + targetObj.getAttribute('captureMouse'));
		
		var result = pass_event_if( targetObj.__captureMouse('mouseDown', e, pt), e );
		if (!result) return false; // stop bubble
	}
	else if (targetObj && targetObj.captureMouse) {
		var pt = get_mouse_coords(e, targetObj);
		mouseObj = targetObj;
		
		if (mouseObj.captureMouse.onMouseDown) {
			var handlers = always_array( mouseObj.captureMouse.onMouseDown );
			for (var idx = 0, len = handlers.length; idx < len; idx++) {
				var result = pass_event_if(
					(typeof(handlers[idx]) == 'function') ? 
						handlers[idx].apply( mouseObj.captureMouse, [e, pt]) : 
						window[handlers[idx]].apply( mouseObj.captureMouse, [e, pt]), 
				e );
				if (!result) return false; // stop bubble
			} // foreach handler
		} // mouseObj.captureMouse.onMouseDown
	} // targetObj.captureMouse

	var pt = get_mouse_coords(e);
	if (window.session) {
		session.mousePt = pt;
	}
	return true; // passthrough if not captured by "captureMouse"
}

function app_mouse_move(e) {
	// handle mouse move event
	if (!e) e = window.event;
	
	var globalPt = get_mouse_coords(e);
	if ((globalPt.x < 0) || (globalPt.y < 0)) return true;
	
	// debugstr("mousemove: " + globalPt.x + ' x ' + globalPt.y);
	
	if (mouseObj && mouseObj.__captureMouse) {
		var pt = get_mouse_coords(e, mouseObj);
		var result = pass_event_if( mouseObj.__captureMouse('mouseMove', e, pt), e );
		if (!result) return false; // stop bubble
	}
	else if (mouseObj && mouseObj.captureMouse && mouseObj.captureMouse.onMouseMove) {
		var pt = get_mouse_coords(e, mouseObj);
		var handlers = always_array( mouseObj.captureMouse.onMouseMove );
		for (var idx = 0, len = handlers.length; idx < len; idx++) {
			var result = pass_event_if( 
				(typeof(handlers[idx]) == 'function') ? 
					handlers[idx].apply( mouseObj.captureMouse, [e, pt]) : 
					window[handlers[idx]].apply( mouseObj.captureMouse, [e, pt]), 
			e );
			if (!result) return false; // stop bubble
		} // foreach handler
	} // mouseObj.captureMouse.onMouseMove
	
	if (window.session) session.mousePt = globalPt;
	safe_call('notify_mouse_move', e);
	return true; // passthrough if not captured by "captureMouse"
}

function app_mouse_up(e) {
	// handle mouse up event
	received_mouse_up = true;
	if (!e) e = window.event;
	if (window.session) session.last_mouse_event = e;
	
	if (window.session) session.mouseIsDown = false;
	
	var globalPt = get_mouse_coords(e);
	
	if (mouseObj && mouseObj.__captureMouse) {
		var pt = get_mouse_coords(e, mouseObj);
		var result = pass_event_if( mouseObj.__captureMouse('mouseUp', e, pt), e );
		
		// only fire "click" event if mouse is still within object bounds
		if (1 || ((pt.x >= 0) && (pt.y >= 0) && (pt.x < mouseObj.offsetWidth) && (pt.y < mouseObj.offsetHeight))) {
			// handle double-click too
			if (mouseObj.__lastClick && (mouseObj.__lastClick > hires_time_now() - dblclick_threshold))
				result = pass_event_if( mouseObj.__captureMouse('doubleClick', e, pt), e );
			else
				result = pass_event_if( mouseObj.__captureMouse('click', e, pt), e );
				
			mouseObj.__lastClick = hires_time_now();
		}
		
		mouseObj = null;
		
		if (!result) return false; // stop bubble
	}
	else if (mouseObj && mouseObj.captureMouse) {
		var pt = get_mouse_coords(e, mouseObj);
		var result = true;
		
		var handlers = mouseObj.captureMouse.onMouseUp ? always_array( mouseObj.captureMouse.onMouseUp ) : [];
		var capMouse = mouseObj.captureMouse;
		mouseObj = null;
		
		for (var idx = 0, len = handlers.length; idx < len; idx++) {
			var result = (typeof(handlers[idx]) == 'function') ? 
				handlers[idx].apply( capMouse, [e, pt]) : 
				window[handlers[idx]].apply( capMouse, [e, pt]);
			if (!result) return stop_event(e);
		}
		
		if (!result) return false; // stop bubble
	}
	
	if (window.session) session.mousePt = globalPt;
	
	return true;
}

function ie_dblclick(e) {
	// to handle double-clicks in IE, we need a special handler that
	// fires a mousedown, then a mouseup event.
	if (!e) e = window.event;
	app_mouse_down(e);
	return app_mouse_up(e);
}

function app_key_down(e) {
	if (!e) e = window.event;
	if (window.session) session.last_key_event = e;
	var ch = fix_key_code( e.keyCode );
	
	// Debug.trace('in app_key_down: ' + ch);
		
	if (window.session && session.hooks.keys[ch]) {
		var func = session.hooks.keys[ch];
		delete session.hooks.keys[ch];
		
		var result = pass_event_if( isa_array(func) ? func[0][ func[1] ](func[2]) : window[func](), e );
		return result;
	}
	
	var result = pass_event_if( fire_hook('key_down', e), e );
	if (!result) return false;
	
	safe_call('notify_key_down', e);
	
	return true;
}

function app_key_up(e) {
	if (!e) e = window.event;
	if (window.session) session.last_key_event = e;
	var ch = fix_key_code( e.keyCode );
	
	var result = pass_event_if( fire_hook('key_up', e), e );
	if (!result) return false;
	
	return true;
}

if (!window.no_hooky) {
	// install our event handlers
	if (window.addEventListener) {
		window.addEventListener( 'mousedown', app_mouse_down, false );
		window.addEventListener( 'mousemove', app_mouse_move, false );
		window.addEventListener( 'mouseup', app_mouse_up, false );
		window.addEventListener( 'keydown', app_key_down, false );
		window.addEventListener( 'keyup', app_key_up, false );
	}
	else {
		if (document.captureEvents) {
			document.captureEvents(Event.MOUSEDOWN);
			document.captureEvents(Event.MOUSEMOVE);
			document.captureEvents(Event.MOUSEUP);
			document.captureEvents(Event.KEYDOWN);
			document.captureEvents(Event.KEYUP);
		}
	
		var body = document.body ? document.body : document.getElementsByTagName('body')[0];
		if (!body) body = {};
	
		window.onmousedown = document.onmousedown = body.onmousedown = app_mouse_down;
		window.onmousemove = document.onmousemove = body.onmousemove = app_mouse_move;
		window.onmouseup = document.onmouseup = body.onmouseup = app_mouse_up;
		parent.onkeydown = window.onkeydown = document.onkeydown = app_key_down;
		parent.onkeyup = window.onkeyup = document.onkeyup = app_key_up;
	
		if (ie) {
			window.ondblclick = document.ondblclick = body.ondblclick = ie_dblclick;
		}
	}
}
