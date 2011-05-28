// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

//
// AJAX (Asynchronous JavaScript And XML) Library
// Usage:
// 	ajax.send({
//		method: 'POST',
//		url: 'http://hostname/uri',
//		data: 'foo=bar',
//		headers: { 'Content-Type': 'text/xml' }
//	}, myfunc );
//
//	function myfunc(tx) {
//		alert( tx.response.code + ": " + tx.response.data );
//	}
//

// global Ajax namespace
if (!window.Ajax) window.Ajax = {};

// connection class

Ajax.Connection = function() {
	// constructor
	this._inUse = false;
	this._conn = null;
	
	// activex ids for msie
	this._xProgIds = [
		'MSXML2.XMLHTTP.3.0',
		'MSXML2.XMLHTTP',
		'Microsoft.XMLHTTP'
	];
	
	try {
		// firefox, safari, etc.
		this._conn = new XMLHttpRequest();
	}
	catch (e) {
		// failed, probably MSIE
		for (var idx = 0; idx < this._xProgIds.length; idx++) {
			try {
				this._conn = new ActiveXObject( this._xProgIds[idx] );
				break;
			}
			catch (e) {}
		} // foreach ms prog id
	} // msie
};

// default socket timeout
Ajax.Connection.prototype._socketTimeout = 30 * 1000;

Ajax.Connection.prototype.send = function(tx) {
	// send request
	this.tx = tx;
	
	if (!this._conn) {
		this.tx.response.code = 500;
		this.tx.response.data = "Could not create XMLHTTP object";
		this.tx._notifyComplete();
		return;
	}
	
	// sanity check -- make sure hostname matches current doc
	if (this.tx.request.url.toLowerCase().match(/^(\w+)\:\/\/([\w\-\.]+)/)) {
		if ((RegExp.$1 != 'file') && (RegExp.$2.toLowerCase() != location.hostname.toLowerCase())) {
			this.tx.response.code = 501;
			this.tx.response.data = "Cannot perform cross-domain AJAX calls";
			this.tx._notifyComplete();
			return;
		}
	}
	else {
		// no hostname or protocol, grab from document
		if (this.tx.request.url.match(/^\//)) {
			// absolute URI
			var proto = location.protocol.match(/https/i) ? 'https' : 'http';
			this.tx.request.url = proto + '://' + location.hostname + this.tx.request.url;
		}
		else {
			// relative URI
			var base_url = location.href.replace(/\?.*$/, ""); // strip query string
			if (!base_url.match(/\/$/)) base_url = base_url.replace(/\/[^\/]+$/, "/");
			this.tx.request.url = base_url + this.tx.request.url;
		}
	}
	
	// get ready
	try {
		this._conn.open(this.tx.request.method, this.tx.request.url, true);
	}
	catch (e) {
		this.tx.response.code = 502;
		this.tx.response.data = e.toString();
		this.tx._notifyComplete();
		return;
	}
	
	// local variable for setTimeout context
	var me = this;
	
	// notify when complete
	this._conn.onreadystatechange = function() {
		me.pollConnection();
	};
	
	// set all headers
	for (var key in this.tx.request.headers)
		this._conn.setRequestHeader( key, this.tx.request.headers[key] );
	
	// send
	try {
		this._conn.send( this.tx.request.data.length ? this.tx.request.data : null );
	}
	catch (e) {
		this.tx.response.code = 503;
		this.tx.response.data = e.toString();
		this.tx._notifyComplete();
		return;
	}
	this._inUse = true;
	
	// set socket timeout
	this._timeout = setTimeout( function() { me.callTimeout(); }, this._socketTimeout );
};

Ajax.Connection.prototype.callTimeout = function() {
	// socket timeout
	this._conn.abort();
	if (this._pollTimer) { clearInterval( this._pollTimer ); this._pollTimer = null; }
	this._inUse = false;
	
	this.tx.response.code = 504;
	this.tx.response.data = 'Socket Timeout: ' + this.tx.request.url.replace(/\?.+$/, "?...");
	this.tx._notifyComplete();
};

Ajax.Connection.prototype.pollConnection = function() {
	// see if response has been received
	if (this._inUse && this._conn && (this._conn.readyState == 4)) {
		if (this._pollTimer) { clearInterval( this._pollTimer ); this._pollTimer = null; }
		if (this._timeout) { clearTimeout( this._timeout ); this._timeout = null; }
		
		this.complete();
	} // readyState == 4
};

Ajax.Connection.prototype.complete = function() {
	// connection is complete
	this._inUse = false;
	
	if (!this._conn.status && this._conn.responseText.length) {
		// handle local files (file://)
		this.tx.response.code = 200;
	}
	else {
		try {
			if ((typeof(this._conn.status) != "undefined") && (this._conn.status != 0)) {
				this.tx.response.code = this._conn.status;
			}
			else {
				this.tx.response.code = 505;
				this.tx.response.data = 'Could not determine HTTP Status Code';
			}
		}
		catch(e) {
			this.tx.response.code = 506;
			this.tx.response.data = 'Could not determine HTTP Status Code';
		}
	
		// try to parse out response headers
		// we must wrap this in a try {} because some browsers can throw 
		// execeptions when headers are pulled from the response
		try {
			this.tx.response.headersRaw = this._conn.getAllResponseHeaders();
			var headers = this.tx.response.headersRaw.split('\n');
			for (var idx = 0; idx < headers.length; idx++){
				var delimitPos = headers[idx].indexOf(':');
				if (delimitPos != -1) {
					this.tx.response.headers[headers[idx].substring(0, delimitPos)] = 
						headers[idx].substring(delimitPos + 2);
				}
			}
		}
		catch (e) {
			// nothing to be done here, because the only failure is grabbing headers
			// it is highly likely the response content is fine
		}
	}
	
	// populate response object
	this.tx.response.data = '' + this._conn.responseText;
	this.tx.response.xml = this._conn.responseXML ? this._conn.responseXML : null;
	this.tx.response.statusLine = this._conn.statusText ? this._conn.statusText : '';
	
	// we're done
	this.tx._notifyComplete();
};

// request class

Ajax.Request = function() {
	this.method = 'POST';
	this.url = '';
	this.data = '';
	this.headers = {};
};

// response class

Ajax.Response = function() {
	this.code = 0;
	this.data = '';
	this.headers = {};
	this.xml = null;
	this.statusLine = '';
};

// transaction class

Ajax.Transaction = function() {
	// constructor
	this.request = new Ajax.Request();
	this.response = new Ajax.Response();
	this.callback = null;
	this.connection = null;
};

Ajax.Transaction.prototype._notifyComplete = function() {
	// transaction has completed
	if (typeof(this.callback) == 'function') this.callback( this );
	else if (window[this.callback]) window[this.callback]( this );
	else alert("ERROR: AJAX callback function is unknown: " + this.callback);
};

// connection manager class

Ajax.ConnectionManager = function() {
	 // constructor
	this._connections = [];	
	this.ie = !!navigator.userAgent.match(/MSIE/);
};

Ajax.ConnectionManager.prototype._createConnection = function() {
	// create a new connection, add to list
	var obj = new Ajax.Connection();
	this._connections[ this._connections.length ] = obj;
	return obj;
};

Ajax.ConnectionManager.prototype._getConnection = function() {
	// return first available connection, or create new
	for (var idx = 0; idx < this._connections.length; idx++) {
		var conn = this._connections[idx];
		if (!conn._inUse) return conn;
	}
	
	// IE cannot seem to handle more than one connection at a time
	// Fail out if this is the case (send() will retry again in a sec)
	if (this.ie && this._connections.length > 0) return null;
	
	return this._createConnection();
};

Ajax.ConnectionManager.prototype.inUse = function() {
	// return number of connections currently in use
	var num = 0;
	for (var idx = 0; idx < this._connections.length; idx++) {
		var conn = this._connections[idx];
		if (conn._inUse) num++;
	}
	if (!num && this.req_wait) num = true; // request in queue
	return num;
};

Ajax.ConnectionManager.prototype.send = function(requestArgs, callback, userData) {
	// new transaction
	if (!userData) userData = {};
	var tx = new Ajax.Transaction();
	
	// copy args to request
	for (var key in requestArgs) tx.request[key] = requestArgs[key];
	
	// copy userData contents to transaction (custom user params)
	for (var key in userData) tx[key] = userData[key];
	
	// make sure required elements are set
	if (!callback) return this.doError( "callback is not set" );
	if (!requestArgs.url) return this.doError( "url is not set" );
	
	// assign callback to transaction
	tx.callback = callback;
	
	// find us a connection and send
	tx.connection = this._getConnection();
	
	// if we failed to get a connection, try again in a sec
	var me = this;
	if (!tx.connection) {
		this.req_wait = true;
		setTimeout( function() {
			me.send( requestArgs, callback, userData );
		}, 100 );
		return false;
	}
	this.req_wait = false;
	
	tx.connection.send( tx );
	return true;
};

Ajax.ConnectionManager.prototype.get = function(url, callback, userData) {
	// shortcut for simple HTTP GET
	return this.send({
		method: 'GET',
		url: url
	}, callback, userData );
};

Ajax.ConnectionManager.prototype.doError = function(msg) {
	// show simple error dialog
	alert( "ERROR: " + msg );
};

Ajax.ConnectionManager.prototype.setSocketTimeout = function(sec) {
	// set socket timeout for all new connections
	Ajax.Connection.prototype._socketTimeout = sec * 1000;
};

// singleton
ajax = new Ajax.ConnectionManager();
