// Simple Multi-File Upload System
// Sends events to JavaScript
// No Flash user interface
// Supports Flash Player 10
// Author: Joseph Huckaby

var ZeroUpload = {
	
	clients: {}, // registered upload clients on page, indexed by id
	moviePath: 'ZeroUpload.swf', // URL to movie
	nextId: 1, // ID of next movie
	
	$: function(thingy) {
		// simple DOM lookup utility function
		if (typeof(thingy) == 'string') thingy = document.getElementById(thingy);
		if (!thingy.__zeroUploadExtended) {
			// extend element with a few useful methods, and mark our territory
			thingy.__zeroUploadExtended = true;
			thingy.hide = function() { this.style.display = 'none'; };
			thingy.show = function() { this.style.display = ''; };
			thingy.addClass = function(name) { this.removeClass(name); this.className += ' ' + name; };
			thingy.removeClass = function(name) {
				this.className = this.className.replace( new RegExp("(^|\\s+)" + name + "(\\s+|$)"), "").replace(/^\s+|\s+$/g, '');
			};
			thingy.hasClass = function(name) {
				return !!this.className.match( new RegExp("\\s*" + name + "\\s*") );
			};
		}
		return thingy;
	},
	
	setMoviePath: function(path) {
		// set path to ZeroUpload.swf
		this.moviePath = path;
	},
	
	dispatch: function(id, eventName, args) {
		// receive event from flash movie, send to client
		// Debug.trace('ZeroUpload', "Got here in ZeroUpload.dispatch(): " + id + ": " + eventName);
		var client = this.clients[id];
		if (client) {
			client.receiveEvent(eventName, args);
		}
	},
	
	register: function(id, client) {
		// register new client to receive events
		this.clients[id] = client;
	},
	
	getDOMObjectPosition: function(obj) {
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
			obj = obj.offsetParent;
		}

		return info;
	},
	
	Client: function(elem) {
		// constructor for new simple upload client
		this.fileTypes = ["All Files", "*.*"];
		this.postParams = {};
		this.handlers = {};
		
		// unique ID
		this.id = ZeroUpload.nextId++;
		this.containerId = 'ZeroUploadContainer_' + this.id;
		this.movieId = 'ZeroUploadMovie_' + this.id;
		
		// register client with singleton to receive flash events
		ZeroUpload.register(this.id, this);
		
		// create movie
		if (elem) this.glue(elem);
	}
};

ZeroUpload.Client.prototype = {
	
	id: 0, // unique ID for us
	ready: false, // whether movie is ready to receive events or not
	movie: null, // reference to movie object
	fileTypes: null, // file type filter for OS dialog
	postParams: null, // extra HTTP POST parmeters to send along with files
	targetURL: '', // URL to receive file uploads
	fileDataField: 'Filedata', // name of POST parameter to hold binary file data
	handCursorEnabled: true, // whether to show hand cursor, or default pointer cursor
	maxFileSize: 0, // max file size, 0 = infinite
	cssEffects: true, // enable CSS mouse effects on dom container
	maxFiles: 0, // max number of files allowed (0 = unlimited)
	delayBetween: 1, // ms delay between files
	handlers: null, // user event handlers
	
	glue: function(elem) {
		// glue to DOM element
		// elem can be ID or actual DOM element object
		
		// grab reference to dom element we are gluing to
		this.domElement = ZeroUpload.$(elem);
		
		// float just above object, or zIndex 99 if dom element isn't set
		var zIndex = 9999;
		if (this.domElement.style.zIndex) {
			zIndex = parseInt(this.domElement.style.zIndex, 10) + 1;
		}
		
		// find absolute X/Y position of domElement
		var box = ZeroUpload.getDOMObjectPosition(this.domElement);
		
		// create floating DIV above element
		this.div = document.createElement('div');
		
		var style = this.div.style;
		style.position = 'absolute';
		style.left = '' + box.left + 'px';
		style.top = '' + box.top + 'px';
		style.width = '' + box.width + 'px';
		style.height = '' + box.height + 'px';
		style.zIndex = zIndex;
		
		// style.backgroundColor = '#f00'; // debug
		
		var body = document.getElementsByTagName('body')[0];
		body.appendChild(this.div);
		
		/* var self = this;
		setTimeout( function() {
			var att = { data: ZeroUpload.moviePath, width: box.width, height: box.height, id: self.movieId, name: self.movieId };
			var par = { flashvars: "id=" + self.id, wmode: "transparent", swliveconnect:"true" };
			var o = swfobject.createSWF(att, par, self.containerId);
		}, 1 ); */
		
		this.div.innerHTML = this.getHTML( box.width, box.height );
	},
	
	getHTML: function(width, height) {
		// return HTML for movie
		var html = '';
		var flashvars = 'id=' + this.id + 
			'&width=' + width + 
			'&height=' + height;
			
		if (navigator.userAgent.match(/MSIE/)) {
			// IE gets an OBJECT tag
			var protocol = location.href.match(/^https/i) ? 'https://' : 'http://';
			html += '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="'+protocol+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="'+width+'" height="'+height+'" id="'+this.movieId+'" align="middle"><param name="allowScriptAccess" value="always" /><param name="allowFullScreen" value="false" /><param name="movie" value="'+ZeroUpload.moviePath+'" /><param name="loop" value="false" /><param name="menu" value="false" /><param name="quality" value="best" /><param name="bgcolor" value="#ffffff" /><param name="flashvars" value="'+flashvars+'"/><param name="wmode" value="transparent"/></object>';
		}
		else {
			// all other browsers get an EMBED tag
			html += '<embed id="'+this.movieId+'" src="'+ZeroUpload.moviePath+'" loop="false" menu="false" quality="best" bgcolor="#ffffff" width="'+width+'" height="'+height+'" name="'+this.movieId+'" align="middle" allowScriptAccess="always" allowFullScreen="false" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" flashvars="'+flashvars+'" wmode="transparent" />';
		}
		return html;
	},
	
	hide: function() {
		// temporarily hide floater offscreen
		if (this.div) {
			this.div.style.left = '-2000px';
		}
	},
	
	show: function() {
		// show ourselves after a call to hide()
		this.reposition();
	},
	
	destroy: function() {
		// destroy control and floater
		if (this.domElement && this.div) {
			this.hide();
			this.movie = null;
			
			// invoke SWFObject to safely remove movie
			// swfobject.removeSWF( this.containerId );
			try { this.div.removeChild( this.movie ); } catch(e) {;}
			
			var body = document.getElementsByTagName('body')[0];
			try { body.removeChild( this.div ); } catch(e) {;}
			
			this.domElement = null;
			this.div = null;
		}
	},
	
	reposition: function(elem) {
		// reposition our floating div, optionally to new container
		// warning: container CANNOT change size, only position
		if (elem) {
			this.domElement = ZeroUpload.$(elem);
		}
		
		if (this.domElement && this.div) {
			var box = ZeroUpload.getDOMObjectPosition(this.domElement);
			var style = this.div.style;
			style.left = '' + box.left + 'px';
			style.top = '' + box.top + 'px';
		}
	},
	
	setFileTypes: function(desc, exts) {
		// set file types for OS dialog, exts should be semi-colon delimited
		this.fileTypes = [desc, exts];
		if (this.ready) this.movie.setFileTypes(desc, exts);
	},
	
	setPostParam: function(name, value) {
		// set HTTP post param
		this.postParams[name] = value;
		if (this.ready) this.movie.setPostParam(name, value);
	},
	
	setPostParams: function(obj) {
		// set multiple HTTP POST params at once
		for (var key in obj) this.setPostParam(key, obj[key]);
		if (this.ready) this.movie.setPostParams(obj);
	},
	
	setURL: function(url) {
		// set target URL for upload
		this.targetURL = url;
		if (this.ready) this.movie.setURL(url);
	},
	
	setFileDataField: function(name) {
		// set name of file data fileld in POST
		this.fileDataField = name;
		if (this.ready) this.movie.setFileDataField(name);
	},
	
	addEventListener: function(eventName, func) {
		// add user event listener for event
		// event types: load, queueStart, fileStart, fileComplete, queueComplete, progress, error, cancel
		eventName = eventName.toString().toLowerCase().replace(/^on/, '');
		if (!this.handlers[eventName]) this.handlers[eventName] = [];
		this.handlers[eventName].push(func);
	},
	
	cancel: function() {
		// send cancel request to movie
		if (this.ready) this.movie.cancel();
	},
	
	setHandCursor: function(enabled) {
		// enable hand cursor (true), or default arrow cursor (false)
		this.handCursorEnabled = enabled;
		if (this.ready) this.movie.setHandCursor(enabled);
	},
	
	setMaxFileSize: function(size) {
		this.maxFileSize = size;
		if (this.ready) this.movie.setMaxFileSize(size);
	},
	
	setMaxFiles: function(num) {
		// set the number of maximum files allowed
		this.maxFiles = num;
		if (this.ready) this.movie.setMaxFiles(num);
	},
	
	setCSSEffects: function(enabled) {
		// enable or disable CSS effects on DOM container
		this.cssEffects = !!enabled;
	},
	
	setDelayBetween: function(ms) {
		// set delay between file uploads (milleseconds)
		this.delayBetween = ms;
		if (this.ready) this.movie.setDelayBetween(ms);
	},
	
	receiveEvent: function(eventName, args) {
		// receive event from flash
		eventName = eventName.toString().toLowerCase().replace(/^on/, '');
		
		// debug handler (catches ALL events)
		if (this.handlers.debug) {
			for (var idx = 0, len = this.handlers.debug.length; idx < len; idx++) {
				this.fireHandler( 'debug', eventName, args );
			}
		}
				
		// special behavior for certain events
		switch (eventName) {
			case 'load':
				// movie claims it is ready, but in IE this isn't always the case...
				this.movie = document.getElementById(this.movieId);
				if (!this.movie) {
					var self = this;
					setTimeout( function() { self.receiveEvent('load', null); }, 10 );
					return;
				}
				
				// firefox on pc needs a "kick" in order to set these in certain cases
				if (!this.ready && navigator.userAgent.match(/Firefox/) && navigator.userAgent.match(/Windows/)) {
					var self = this;
					setTimeout( function() { self.receiveEvent('load', null); }, 100 );
					this.ready = true;
					return;
				}
				
				this.ready = true;
				this.movie.setFileTypes( this.fileTypes[0], this.fileTypes[1] );
				this.movie.setPostParams( this.postParams );
				this.movie.setURL( this.targetURL );
				this.movie.setFileDataField( this.fileDataField );
				this.movie.setHandCursor( this.handCursorEnabled );
				this.movie.setMaxFileSize( this.maxFileSize );
				this.movie.setMaxFiles( this.maxFiles );
				this.movie.setDelayBetween( this.delayBetween );
				break;
			
			case 'mouseover':
				if (this.domElement && this.cssEffects) {
					this.domElement.addClass('hover');
					if (this.recoverActive) this.domElement.addClass('active');
				}
				break;
			
			case 'mouseout':
				if (this.domElement && this.cssEffects) {
					this.recoverActive = false;
					if (this.domElement.hasClass('active')) {
						this.domElement.removeClass('active');
						this.recoverActive = true;
					}
					this.domElement.removeClass('hover');
				}
				break;
			
			case 'mousedown':
				if (this.domElement && this.cssEffects) {
					this.domElement.addClass('active');
				}
				break;
			
			case 'mouseup':
				if (this.domElement && this.cssEffects) {
					this.domElement.removeClass('active');
					this.recoverActive = false;
				}
				break;
		} // switch eventName
		
		this.fireHandler(eventName, args);
	},
	
	fireHandler: function() {
		// invoke user callback for event
		var eventName = arguments[0];
		eventName = eventName.toString().toLowerCase().replace(/^on/, '');
		
		// slice arguments after event name
		var args = [ this ];
		for (var idx = 1; idx < arguments.length; idx++) args.push( arguments[idx] );
		
		if (this.handlers[eventName]) {
			for (var idx = 0, len = this.handlers[eventName].length; idx < len; idx++) {
				var func = this.handlers[eventName][idx];
			
				if (typeof(func) == 'function') {
					// actual function reference
					func.apply(window, args);
				}
				else if ((typeof(func) == 'object') && (func.length == 2)) {
					// PHP style object + method, i.e. [myObject, 'myMethod']
					func[0][ func[1] ].apply(func[0], args);
				}
				else if (typeof(func) == 'string') {
					// name of function
					window[func].apply(window, args);
				}
			} // foreach event handler defined
		} // user defined handler for event
	}
	
};
