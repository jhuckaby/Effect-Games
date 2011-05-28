// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0 API Functions
 * Author: Joseph Huckaby
 **/

function effect_load_script(url) {
	// load javascript file
	Debug.trace('api', 'Loading script: ' + url);
	load_script(url);
}

function effect_api_get_ie(cmd, params, userData) {
	// MSIE needs special handling for this, cannot seem to use XHR
	// must load script (ugh)
	if (!session.api_state_ie) session.api_state_ie = {};
	var unique_id = get_unique_id();
	session.api_state_ie[unique_id] = userData;
	
	params.format = 'js';
	params.onafter = 'effect_api_response_ie(' + unique_id + ', response);';
	var url = '/effect/api/' + cmd + composeQueryString(params);
	Debug.trace('api', "Sending MSIE HTTP GET: " + url);
	load_script(url);
}

function effect_api_response_ie(unique_id, tree) {
	// receive response from MSIE GET request
	Debug.trace('api', "Got response from MSIE HTTP GET");
	
	var tx = session.api_state_ie[unique_id];
	delete session.api_state_ie[unique_id];
	
	// check for api error
	if (tree.Code == 'session') {
		do_logout_2();
		// do_message( 'error', 'Your session has timed out.  Please login again.' );
		return;
	}
	// special error code 'access', redirect to main page
	if (tree.Code == 'access') {
		// Nav.go('Main');
		do_notice("Access Denied", tree.Description, 'do_not_pass_go');
		return;
	}
	
	if (tree.Code != 0) {
		if (tx._on_error) return fire_callback( tx._on_error, tree, tx );
		return do_error( tree.Description );
	}

	if (tree.SessionID) {
		if (tree.SessionID == '_DELETE_') {
			delete session.cookie.tree.effect_session_id;
		}
		else {
			session.cookie.set( 'effect_session_id', tree.SessionID );
		}
		session.cookie.save();
	}
	
	if (tx._api_callback) {
		fire_callback( tx._api_callback, tree, tx );
	}
}

function effect_api_get(cmd, params, callback, userData) {
	// simple HTTP GET to API
	// set userData._raw = 1 to NOT try to parse XML response
	if (!userData) userData = {};
	userData._api_callback = callback;
	
	// possibly add mod date (forced cache miss, date based)
	if (!session.api_mod_cache[cmd] && session.username) session.api_mod_cache[cmd] = hires_time_now();
	if (!params.mod && session.api_mod_cache[cmd]) params.mod = session.api_mod_cache[cmd];
	
	// special handler for MSIE HTTP GET
	if (ie) return effect_api_get_ie(cmd, params, userData);
	
	var url = '/effect/api/' + cmd + composeQueryString(params);
	
	Debug.trace('api', "Sending HTTP GET: " + url);
	ajax.get( url, 'effect_api_response', userData );
}

function effect_api_send(cmd, xml, callback, userData) {
	// send XML to server
	if (!userData) userData = {};
	userData._api_callback = callback;
	
	var data = compose_xml('EffectRequest', xml);
	Debug.trace('api', "Sending API Command: " + cmd + ": " + data);
	
	ajax.send({
		method: 'POST',
		url: '/effect/api/' + cmd,
		data: data,
		headers: { 'Content-Type': 'text/xml' }
	}, 'effect_api_response', userData);
}

function effect_api_response(tx) {
	Debug.trace('api', "HTTP " + tx.response.code + ": " + tx.response.data);
	
	if (tx.response.code == 999) { // 999 = network related error
		if (tx.request._auto_retry) {
			session.net_error = false; // to make sure dialog appears
			show_progress_dialog(1, "Trying to reestablish connection...");
			session.net_error = true;
			setTimeout( function() { ajax.send(tx.request); }, 1000 );
			return;
		}
		else return do_error( "HTTP ERROR: " + tx.response.code + ": " + tx.response.data + ' (URL: ' + tx.request.url + ')' );
	}
	if (session.net_error) {
		hide_progress_dialog();
		session.net_error = false;
	}
	
	if (tx.response.code != 200) {
		if (tx._silent) return; // we don't care
		else return do_error( "HTTP ERROR: " + tx.response.code + ": " + tx.response.data + ' (URL: ' + tx.request.url + ')' );
	}
	
	var tree = null;
	if (!tx._raw) {
		var parser = new XML({
			preserveAttributes: true,
			text: tx.response.data 
		});
		if (parser.getLastError()) return do_error("XML PARSE ERROR: " + parser.getLastError());
		tree = parser.getTree();
	
		// check for api error
		if (tree.Code == 'session') {
			do_logout_2();
			// do_message( 'error', 'Your session has timed out.  Please login again.' );
			return;
		}
		// special error code 'access', redirect to main page
		if (tree.Code == 'access') {
			// Nav.go('Main');
			do_notice("Access Denied", tree.Description, 'do_not_pass_go');
			return;
		}
		
		if (tree.Code != 0) {
			if (tx._on_error) return fire_callback( tx._on_error, tree, tx );
			return do_error( tree.Description );
		}
	
		if (tree.SessionID) {
			if (tree.SessionID == '_DELETE_') {
				delete session.cookie.tree.effect_session_id;
			}
			else {
				session.cookie.set( 'effect_session_id', tree.SessionID );
			}
			session.cookie.save();
		}
	} // xml response
	
	// invoke user callback
	if (tx._api_callback) {
		fire_callback( tx._api_callback, tree, tx );
	}
}

function effect_api_mod_touch() {
	// touch mod date of one or more 'GET' API calls
	for (var idx = 0, len = arguments.length; idx < len; idx++) {
		session.api_mod_cache[ arguments[idx] ] = hires_time_now();
	}
}

function do_not_pass_go() {
	Nav.go('Main');
}