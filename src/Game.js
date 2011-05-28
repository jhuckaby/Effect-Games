// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Game.js
// Base engine library
// DHTML Game Engine 1.0
// Copyright (c) 2005 Joseph Huckaby
////

// shortcuts
var $G;
var $P;
var $A;
var $I;
var $T;

// mouse button constants
Effect.LEFT_BUTTON = ua.ie ? 1 : 0;
Effect.MIDDLE_BUTTON = ua.ie ? 4 : 1;
Effect.RIGHT_BUTTON = 2;

// singletons
var gGame = null;
var gAudio = null;
var gImageLoader = null;
var gProgress = null;
var gTween = null;
var gPort = null;
window.gToolbar = null;

function _Game() {
	// class constructor
	if (!gGame) gGame = this;
	if (!gAudio) gAudio = new _AudioHandler();
	if (!gImageLoader) gImageLoader = new _ImageLoader();
	if (!gProgress) gProgress = new _ProgressDialog();
	if (!gTween) gTween = new _TweenManager();
	
	this._audio = gAudio;
	this._imageLoader = gImageLoader;
	this._progress = gProgress;
	this._tween = gTween;
	
	this._toolbar = gToolbar = new _Toolbar();
	this._fontLoader = new _FontLoader();
	this._xmlLoader = new _XMLLoader();
	this._levelLoader = new _LevelLoader();
	this._videoLoader = new _VideoLoader();
		
	this._homePath = 'http://'+location.hostname+'/effect/';
	
	Effect.VideoManager._movieURL = this._homePath + Effect.VideoManager._movieURL;
	
	this.id = '';
	
	this._baseAssetURL = '';
	this._assetModDate = 0;
		
	this.localPath = location.href.replace(/\?.*$/, '').replace(/\/[^\/]+$/, '');
		
	this._levelDef = null;
	this._levelData = null;
	this._levelName = '';
	this._envName = '';
	this._env = '';

	this.keys = {};
	this.autoKey = false; // ignore key repeat
	this._keysActive = false; // monitor keyboard
	this._mouseActive = false; // monitor mouse
	this.mousePt = new Point(); // current global mouse coords
	this.clickResume = true; // click to resume a paused game
	
	// attached portals
	this._portals = [];

	// animation control
	this.logicClock = 0;
	this.drawClock = 0;
	this._targetFPS = 30;
	this._skipFrames = true;
	this.inGame = false;
	this._loopTimer = null;
	this._maxLogicsPerFrame = 2;
	this._schedule = {};
	this._states = {};
	this._state = 'loading';

	// _fps calculation
	this._fps = {
		current: 0,
		average: 0,
		frameCount: 0,
		lastSecond: 0,
		startTime: 0,
		totalFrames: 0
	};
	
	// preload list
	this._preload = {
		sprites: [],
		levels: [],
		images: [],
		audio: [],
		xml: [],
		fonts: [],
		videos: []
	};
	
	// browser language
	this.lang = (navigator.language || navigator.systemLanguage || 'en-us').toLowerCase();
	
	// special query params: effect_audio and effect_debug
	if ((typeof(_query.effect_audio) != 'undefined') && (_query.effect_audio == 0)) gAudio.enabled = false;
	
	// safe object unloader for IE
	this._safe_unload_list = [];
};

// Inherit from EventHandlerBase, to get setHandler(), fireHandler(), et al.
_Game.prototype = new _EventHandlerBase();

// Precompiled reg exps to match resource types
_Game.prototype._audioResourceMatch = /\.mp3$/i;
_Game.prototype._imageResourceMatch = /\.(jpe|jpeg|jpg|png|gif)$/i;
_Game.prototype._textResourceMatch = /\.xml$/i;
_Game.prototype._movieResourceMatch = /\.(flv|mp4|mp4v|mov|3gp|3g2)$/i;

// Map of special keyCodes to readable names
_Game.prototype._keyMap = {
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
};

//
// Accessor methods
//

_Game.prototype.setBaseAssetURL = function(_url) { this._baseAssetURL = _url; };
_Game.prototype.setAssetModDate = function(_epoch) { this._assetModDate = _epoch || 0; };
_Game.prototype.getAssetModDate = function() { return this._assetModDate; };
_Game.prototype.getBaseEffectURL = function() { return this._homePath; };
_Game.prototype.setTargetFPS = function(_fps) { this._targetFPS = parseInt(_fps, 10); };
_Game.prototype.getTargetFPS = function() { return this._targetFPS; };
_Game.prototype.setSkipFrames = function(_skip) { this._skipFrames = !!_skip; };
_Game.prototype.setState = function(_name) { this._state = _name; };
_Game.prototype.getState = function() { return this._state; };
_Game.prototype.setKeysActive = function(_active) { this._keysActive = !!_active; };
_Game.prototype.setMouseActive = function(_active) { this._mouseActive = !!_active; };
_Game.prototype.getAverageFPS = function() { return this._fps.average; };
_Game.prototype.getCurrentFPS = function() { return this._fps.current; };
_Game.prototype.resetAverageFPS = function() { this._fps.totalFrames = 0; this._fps.startTime = 0; };
_Game.prototype._addSafeUnloadObject = function(_id) { this._safe_unload_list.push(_id); };
_Game.prototype.setQuery = function(_query) { this._query = _query; };
_Game.prototype.getQuery = function() { return this._query; };
_Game.prototype.getLevelName = function() { return this._levelName; };
_Game.prototype.getLevelDef = function() { return this._levelDef; };
_Game.prototype.getLevelData = function() { return this._levelData; };
_Game.prototype.getLevelProps = function() { return this._levelDef.Properties || {}; };
_Game.prototype.isKeyDown = function(_name) { return this.keys[_name] ? this.keys[_name].down : null; };
_Game.prototype.setResumeKey = function(_name) { this._resumeKey = _name; };

_Game.prototype.preloadImage = function(_url) { this._preload.images.push(_url); };
_Game.prototype.preloadAudio = function(_url) { this._preload.audio.push(_url); };
_Game.prototype.preloadLevel = function(_name) { this._preload.levels.push(_name); };
_Game.prototype.preloadXML = function(_url) { this._preload.xml.push(_url); };
_Game.prototype.preloadVideo = function(_url) { this._preload.videos.push(_url); };
_Game.prototype.preloadFont = function(_name) { this._preload.fonts.push(_name); };
_Game.prototype.preloadSprite = function(_name) { this._preload.sprites.push(_name); };

//
// Methods
//

_Game.prototype.init = function() {
	// initialize game, called by DOMContentLoaded event
	if (!this._inited) {
		this._inited = true;
		if (!this._def) return _throwError("Game definition not set.");
		
		// set flags based on query
		this._iframe = (this._query.mode == 'iframe');
		this._level_editor = (this._query.mode == 'leveleditor');
		this._standalone = (this._query.mode == 'sa');
		
		// need a back-door to load levels and XML files in standalone mode
		if (this._standalone) {
			this.ll = this._levelLoader;
			this._levelLoader.nl = this._levelLoader._notifyLoad;
			
			this.xl = this._xmlLoader;
			this._xmlLoader.nl = this._xmlLoader._notifyLoad;
		}
		
		// get cookie
		this._cookie = new CookieTree({ path: location.hostname.match(/\.effectgames\.com/i) ? '/effect/' : location.pathname });
		if (!this._cookie.get('effect_session_id') && !this._standalone && this._query.key) {
			// local dev instance, pass key down to cookie
			this._cookie.set('effect_session_id', 'login_' + this._query.key);
		}
		if (!this._cookie.get('games')) this._cookie.set('games', {});
		var _games = this._cookie.get('games');
		
		// game specific prefs
		if (!_games[this.id]) _games[this.id] = {};
		this._game_prefs = _games[this.id];
		
		// frame rate, skip frames
		this.setTargetFPS( this._def.FrameRate );
		this.setSkipFrames( this._def.SkipFrames == 1 );
		
		// set keys from def
		if (this._def.Keys && this._def.Keys.Key) {
			var _keydefs = _always_array( this._def.Keys.Key );
			for (var _idx = 0, _len = _keydefs.length; _idx < _len; _idx++) {
				var _keydef = _keydefs[_idx];
				this.keys[ _keydef.Name ] = {
					code: (this._game_prefs.keys && this._game_prefs.keys[_keydef.Name]) ? 
						_int_array( this._game_prefs.keys[_keydef.Name] ) : 
						_int_array( _keydef.Codes.toString().split(/\,\s*/) ),
					down: false,
					title: _keydef.Title
				};
			}
		}
		
		// create default port
		var _port = new Portal('effect_port');
		_port._is_master = 1;
		_port.setSize( this._def.PortWidth, this._def.PortHeight );
		
		// figure out our zoom level
		if ((this._def.Zoom == "Yes") && !this._iframe && this._game_prefs.zoom) {
			// recover user's zoom level
			var _zoom = parseInt( this._game_prefs.zoom, 10 );
			_port.setZoomLevel( _zoom );
			
			// better set window size here, if needed
			var _zWidth = (_port.portWidth * _zoom) + 100; // some padding
			var _zHeight = (_port.portHeight * _zoom) + 120;
			var _doc_size = _getInnerWindowSize();
			
			var _max_width = screen.availWidth;
			var _max_height = screen.availHeight;
			
			if ((_zWidth > _doc_size.width) || (_zHeight > _doc_size.height)) {
				var _new_window_width = Math.min( Math.max(_zWidth, _doc_size.width), _max_width );
				var _new_window_height = Math.min( Math.max(_zHeight, _doc_size.height), _max_height );
				Debug.trace('game', "Resizing window to: " + _new_window_width + 'x' + _new_window_height);
				
				if (window.resizeTo) {
					window.resizeTo( _new_window_width, _new_window_height );
				}
				else if (window.outerWidth) {
					window.outerWidth = _new_window_width;
					window.outerHeight = _new_window_height;
				}
			}
		}
		else if ((this._def.Zoom == "Auto") && !this._iframe) {
			// auto-zoom (will setup resize listener after core load)
			var _size = _getInnerWindowSize();
			var _max_width_zoom = Math.floor(_size.width / this._def.PortWidth );
			var _max_height_zoom = Math.floor(_size.height / this._def.PortHeight );
			var _zoom = Math.min( _max_width_zoom, _max_height_zoom ) || 1;
			_port.setZoomLevel( _zoom );
		}
		else {
			// set default zoom level
			_port.setZoomLevel( this._def.ZoomDefault || 1 );
		}
		
		// set port background color
		_port.setBackgroundColor( this._def.BackgroundColor );
		
		// attach and init port
		this.attach(_port);
		gPort = _port;
		
		// convenience names for user code
		Effect.Port = $P = gPort;
		Effect.Audio = $A = gAudio;
		Effect.ImageLoader = $I = gImageLoader;
		Effect.Tween = $T = gTween;
		
		// import audio settings
		gAudio.enabled = (
			(this._def.AudioEnabled == 1) && 
			((typeof(_query.effect_audio) == 'undefined') || (_query.effect_audio == 1))
		);
		gAudio._masterVolume = parseFloat( this._def.AudioMasterVolume );
		gAudio._categorySettings['sfx'].volume = parseFloat( this._def.AudioSFXVolume );
		gAudio._categorySettings['music'].volume = parseFloat( this._def.AudioMusicVolume );
		gAudio._categorySettings['video'].volume = parseFloat( this._def.AudioVideoVolume );
		
		// fire init and load core
		this.fireHandler('onInit');
		this.fireHandler('onZoom', gPort._zoomLevel);
		this._load();
	}
};

_Game.prototype.fireHandler = 
_Game.prototype.fireEvent = function(_name) {
	// fire specified handler, overridden from _EventHandlerBase
	// debugstr("Firing game event: " + _name);
	
	if (typeof(_name) != 'string') return _throwError("Event type is not string: " + _name);
	var _result = _EventHandlerBase.prototype.fireHandler.apply(this, _array_slice(arguments, 0));
	if (!_result) return _result;
	
	// accepts variable argument list, passes extra args to callback
	var _args = _array_slice( arguments, 1 );
	_name = _name.toString().toLowerCase().replace(/^on/, '');
	
	// pass event on to portals too
	for (var _idx = 0, _len = this._portals.length; _idx < _len; _idx++) {
		if (this._portals[_idx][_name]) {
			var _handlers = _always_array(this._portals[_idx][_name]);
			var _ley = 0;
			for (var _idy = 0, _ley = _handlers.length; _idy < _ley; _idy++)
				_handlers[_idy].apply(this._portals[_idx], _args);
		}
	}
	
	// and toolbar as well
	if (!this._level_editor && this._toolbar[_name]) {
		var _handlers = _always_array(this._toolbar[_name]);
		for (var _idx = 0, _len = _handlers.length; _idx < _len; _idx++)
			_handlers[_idx].apply(this._toolbar, _args);
	}

	return true;
};

_Game.prototype.setStateHandler = function(_name, _func) {
	// set custom state handler
	this._states[_name] = _func;
};

_Game.prototype.getGamePath = function() {
	// get URL to game asset directory
	return this._baseAssetURL;
};

_Game.prototype.setGameDef = function(_obj) {
	// manually set game definition by JSON
	this._def = _obj;
	
	// copy the game id to a more convenient location
	this.id = this._def.GameID;
};

_Game.prototype.setGameDefKey = function(_key, _value) {
	// override single game def key
	this._def[_key] = _value;
};

_Game.prototype.getGameDef = function() {
	return this._def;
};

_Game.prototype._load = function(_callback) {
	// dynamically load game engine
	if (!this._def) return _throwError('No game definition found.');
	
	debugstr("in Game.load");
	if (_callback) {
		this.clearAllHandlers('onLoadGame');
		this.setHandler('onLoadGame', _callback);
	}
	
	debugstr("_query: " + serialize(_query));
	
	// preload progress indicator
	this._progress._preload( [this, '_load2'] );
};

_Game.prototype._load2 = function() {
	// show progress dialog
	if (!this._level_editor) {
		this._toolbar._init();
		this._toolbar._update_width();
	}
	
	this._progress._update(0, 1);
	this._progress.show();
	
	// if in iframe mode, need to stop here and show "Click to Play"
	// do not continue loading until user clicks (or in standard mode)
	if ((this._iframe || (this._standalone && (window != top))) && !_query.autoplay) {
		this._toolbar._show_splash();
	}
	else this._load3();
};

_Game.prototype._load3 = function() {
	// for future use: skip to next step
	this._load4();
};

_Game.prototype._load4 = function() {
	// continue loading core, audio is next...
	// setup audio or skip to next step
	if (this._audio.enabled) this._audio._setup( [this, '_loadGameMedia'] );
	else this._loadGameMedia();
};

_Game.prototype._resetAllLoaders = function() {
	// reset all loading progress and weights (for progress bar)
	this._audio._resetProgress();
	this._imageLoader._resetProgress();
	this._fontLoader._resetProgress();
	this._xmlLoader._resetProgress();
	this._levelLoader._resetProgress();
	this._videoLoader._resetProgress();
	
	this._audioWeight = 0;
	this._imageWeight = 0;
	this._fontWeight = 0;
	this._xmlWeight = 0;
	this._levelWeight = 0;
	this._videoWeight = 0;
};

_Game.prototype._loadGameMedia = function() {
	// load all common media for game
		
	debugstr("in Game._loadGameMedia");
	this._resetAllLoaders();
	
	this.fireHandler( 'onBeforeLoadGameMedia' );
	
	if (this._def.Sounds && this._def.Sounds.Sound) {
		this._audio._setTrackDefs( this._def.Sounds.Sound );
	}
	
	// preload lists
	if (this._preload.images.length) {
		this._imageWeight += gImageLoader.loadImages( this._preload.images );
		this._preload.images = [];
	}
	if (this._preload.audio.length) {
		this._audioWeight += this._audio._loadTracks( this._preload.audio );
		this._preload.audio = [];
	}
	if (this._preload.xml.length) {
		this._xmlWeight += this._xmlLoader._loadFiles( this._preload.xml );
		this._preload.xml = [];
	}
	if (this._preload.videos.length) {
		this._videoWeight += this._videoLoader._loadMovies( this._preload.videos );
		this._preload.videos = [];
	}
	if (this._preload.fonts.length) {
		for (var _idx = 0, _len = this._preload.fonts.length; _idx < _len; _idx++) {
			var _name = this._preload.fonts[_idx];
			var _font = _find_object( this._def.Fonts.Font, { Name: _name } );
			this._fontLoader._loadFonts( _font );
			this._fontWeight++;
		}
		this._preload.fonts = [];
	}
	if (this._preload.levels.length) {
		for (var _idx = 0, _len = this._preload.levels.length; _idx < _len; _idx++) {
			var _name = this._preload.levels[_idx];
			this._levelLoader._loadLevels( _name );
			this._levelWeight++;
			this._loadLevelMedia( _name );
		}
		this._preload.levels = [];
	}
	
	// load global audio (music, etc.)
	if (this._def.Sounds && this._def.Sounds.Sound) {
		var _tracks = [];
		for (var _idx = 0, _len = this._def.Sounds.Sound.length; _idx < _len; _idx++) {
			var _sound = this._def.Sounds.Sound[_idx];
			if ((_sound.Preload == 1) || (this._def.PreloadAll == 1)) _tracks.push( _sound.Path );
		}
		if (_tracks.length) {
			this._audioWeight += this._audio._loadTracks( _tracks );
		}
	}
	
	// bitmap fonts
	if (this._def.Fonts && this._def.Fonts.Font) {
		var _fonts = [];
		for (var _idx = 0, _len = this._def.Fonts.Font.length; _idx < _len; _idx++) {
			var _font = this._def.Fonts.Font[_idx];
			if (_font.Enabled == 1) _fonts.push( _font );
		}
		if (_fonts.length) {
			this._fontLoader._loadFonts( _fonts );
			this._fontWeight += _fonts.length;
		}
	}
	
	// sprites
	this._sprite_defs = {};
	if (this._def.Sprites && this._def.Sprites.Sprite) {
		for (var _idx = 0, _len = this._def.Sprites.Sprite.length; _idx < _len; _idx++) {
			var _sprite = this._def.Sprites.Sprite[_idx];
			
			// index sprite def by ID for convenience later
			this._sprite_defs[ _sprite.Name ] = _sprite;
			
			// locate constructor so we don't have to eval() during runtime
			try {
				_sprite._constructor = eval( _sprite.Name );
			}
			catch (e) {
				_sprite._constructor = null;
			}
			
			if ((_sprite.Preload == 1) || (this._def.PreloadAll == 1)) {
				this._loadSpriteMedia( _sprite.Name );
			} // preload
		} // foreach sprite def
	} // sprites
	
	// tiles
	this._tile_defs = {};
	if (this._def.Tiles && this._def.Tiles.Tile) {
		for (var _idx = 0, _len = this._def.Tiles.Tile.length; _idx < _len; _idx++) {
			var _tile = this._def.Tiles.Tile[_idx];
			
			// index tile def by ID for convenience later
			this._tile_defs[ _tile.Name ] = _tile;
			
			// JH -- commented this out because tiles do not have 'Preload', and
			// if PreloadAll == 1, then all sprites will have been loaded already
			/* if ((_tile.Preload == 1) || (this._def.PreloadAll == 1)) {
				this._loadTileMedia( _tile.Name );
			} */
		} // foreach tile
	} // tiles
	
	// tilesets
	if (this._def.Tilesets && this._def.Tilesets.Tileset) {
		for (var _idx = 0, _len = this._def.Tilesets.Tileset.length; _idx < _len; _idx++) {
			var _tileset = this._def.Tilesets.Tileset[_idx];
			if ((_tileset.Preload == 1) || (this._def.PreloadAll == 1)) {
				if (_tileset.Files && _tileset.Files.File) {
					var _files = _always_array( _tileset.Files.File );
					for (var _idy = 0, _ley = _files.length; _idy < _ley; _idy++) {
						
						var _tile_image_key = _tileset.Path + _files[_idy];
						if (ua.ie6 && _tile_image_key.match(/\.png/i)) {
							if (_tile_image_key.match(/\?/)) _tile_image_key += '&format=gif';
							else _tile_image_key += '?format=gif';
						}
						
						this._imageWeight += this._imageLoader.loadImages( _tile_image_key );
						
					} // foreach file
					
					this._imageWeight += this._imageLoader.loadImages(
						this._standalone ? (_tileset.Path + '_blank.gif') : 
						(gGame._homePath + 'api/blank_image.gif?width=' + _tileset.TileWidth + '&height=' + _tileset.TileHeight)
					);
				} // tileset has files
				_tileset._media_loaded = 1;
			} // preload
		} // foreach tileset
	} // tilesets
	
	// levels
	if (this._def.Levels && this._def.Levels.Level) {
		for (var _idx = 0, _len = this._def.Levels.Level.length; _idx < _len; _idx++) {
			var _level = this._def.Levels.Level[_idx];
			
			if ((_level.Preload == 1) || (this._def.PreloadAll == 1)) {
				this._levelLoader._loadLevels( _level.Name );
				this._levelWeight++;
				
				this._loadLevelMedia( _level.Name );
			} // yes, load level
		} // foreach level def
	} // levels
	
	// resources
	if (this._def.Resources && this._def.Resources.Resource) {
		debugstr("Loading resources for game");
		var _res_list = _always_array( this._def.Resources.Resource );
		this._loadResources( _res_list );
	}
	
	// preload sprites
	// doing this after everything else so sprite defs are initialized, have _constructor, etc.
	if (this._preload.sprites.length) {
		for (var _idx = 0, _len = this._preload.sprites.length; _idx < _len; _idx++) {
			var _name = this._preload.sprites[_idx];
			this._loadSpriteMedia( _name );
		}
		this._preload.sprites = [];
	}
	
	// go into progress loop
	this._checkGameLoadProgress();
};

_Game.prototype._loadLevelMedia = function(_key) {
	// load level media
	var _level = _find_object( this._def.Levels.Level, { Name: _key } );
	assert(!!_level, "Could not locate level definition: " + _key);
	if (!_level) return;
	
	if (_level._media_loaded) return;
	_level._media_loaded = 1;
	
	// preload lists
	if (this._preload.images.length) {
		this._imageWeight += gImageLoader.loadImages( this._preload.images );
		this._preload.images = [];
	}
	if (this._preload.audio.length) {
		this._audioWeight += this._audio._loadTracks( this._preload.audio );
		this._preload.audio = [];
	}
	if (this._preload.xml.length) {
		this._xmlWeight += this._xmlLoader._loadFiles( this._preload.xml );
		this._preload.xml = [];
	}
	if (this._preload.videos.length) {
		this._videoWeight += this._videoLoader._loadMovies( this._preload.videos );
		this._preload.videos = [];
	}
	if (this._preload.fonts.length) {
		for (var _idx = 0, _len = this._preload.fonts.length; _idx < _len; _idx++) {
			var _name = this._preload.fonts[_idx];
			var _font = _find_object( this._def.Fonts.Font, { Name: _name } );
			this._fontLoader._loadFonts( _font );
			this._fontWeight++;
		}
		this._preload.fonts = [];
	}
	if (this._preload.levels.length) {
		for (var _idx = 0, _len = this._preload.levels.length; _idx < _len; _idx++) {
			var _name = this._preload.levels[_idx];
			this._levelLoader._loadLevels( _name );
			this._levelWeight++;
			this._loadLevelMedia( _name );
		}
		this._preload.levels = [];
	}
	if (this._preload.sprites.length) {
		for (var _idx = 0, _len = this._preload.sprites.length; _idx < _len; _idx++) {
			var _name = this._preload.sprites[_idx];
			this._loadSpriteMedia( _name );
		}
		this._preload.sprites = [];
	}
	
	// background image
	if (_level.BackgroundImage) {
		this._imageWeight += this._imageLoader.loadImages( _level.BackgroundImage );
	}
	
	// handle prereqs
	if (_level.Requires && _level.Requires.Require) {
		var _req_list = _always_array( _level.Requires.Require );
		for (var _idy = 0, _ley = _req_list.length; _idy < _ley; _idy++) {
			this._loadSpriteMedia( _req_list[_idy].Name );
		}
	} // req list
	
	// handle resources
	if (_level.Resources && _level.Resources.Resource) {
		debugstr("Loading media for level: " + _key);
		var _res_list = _always_array( _level.Resources.Resource );
		this._loadResources( _res_list );
	}
	
	// layers
	if (_level.Layers && _level.Layers.Layer) {
		var _layers = _always_array( _level.Layers.Layer );
		for (var _idx = 0, _len = _layers.length; _idx < _len; _idx++) {
			var _layer = _layers[_idx];
			if ((_layer.Type == 'tile') && _layer.Tileset) {
				var _tileset_id = _layer.Tileset;
				// load all images from tileset
				var _tileset = _find_object( this._def.Tilesets.Tileset, { Name: _tileset_id } );
				assert(!!_tileset, "Could not locate tileset definition: " + _tileset_id);
				
				debugstr("Loading media for tileset: " + _tileset_id);
				
				if (_tileset && _tileset.Files && _tileset.Files.File) {
					var _files = _always_array( _tileset.Files.File );
					for (var _idy = 0, _ley = _files.length; _idy < _ley; _idy++) {
						
						var _tile_image_key = _tileset.Path + _files[_idy];
						if (ua.ie6 && _tile_image_key.match(/\.png/i)) {
							if (_tile_image_key.match(/\?/)) _tile_image_key += '&format=gif';
							else _tile_image_key += '?format=gif';
						}
						
						this._imageWeight += this._imageLoader.loadImages( _tile_image_key );
					} // foreach file
					
					this._imageWeight += this._imageLoader.loadImages(
						this._standalone ? (_tileset.Path + '_blank.gif') : 
						(gGame._homePath + 'api/blank_image.gif?width=' + _tileset.TileWidth + '&height=' + _tileset.TileHeight)
					);
				} // tileset has files
			} // tile layer
			else if ((_layer.Type == 'sprite') && _layer.Sprites && _layer.Sprites.Sprite) {
				// load all sprites used in layer
				debugstr("Loading sprites for layer: " + _layer.Name );
				var _sprites = _always_array( _layer.Sprites.Sprite );
				for (var _idy = 0, _ley = _sprites.length; _idy < _ley; _idy++) {
					var _sprite_id = _sprites[_idy];
					this._loadSpriteMedia( _sprite_id );
				} // foreach sprite
			} // sprite layer
		} // foreach layers
	} // level has layers
};

_Game.prototype._loadSpriteMedia = function(_key) {
	// load sprite media
	var _sprite = _find_object( this._def.Sprites.Sprite, { Name: _key } );
	assert(!!_sprite, "Could not locate sprite definition: " + _key);
	if (!_sprite) return;
	
	if (_sprite._media_loaded || this._level_editor) return;
	_sprite._media_loaded = 1;
	
	// handle prereqs
	if (_sprite.Requires && _sprite.Requires.Require) {
		var _req_list = _always_array( _sprite.Requires.Require );
		for (var _idy = 0, _ley = _req_list.length; _idy < _ley; _idy++) {
			this._loadSpriteMedia( _req_list[_idy].Name );
		}
	} // req list
	
	// sprites can define transforms for images, so keep sprite-specific lookup table
	_sprite._image_urls = {};
	
	if (_sprite.Resources && _sprite.Resources.Resource) {
		debugstr("Loading media for sprite: " + _key);
		var _res_list = _always_array( _sprite.Resources.Resource );
		this._loadResources( _res_list, _sprite.Name );
		
		for (var _idx = 0, _len = _res_list.length; _idx < _len; _idx++) {
			var _res = _res_list[_idx];
			if (_res.Path.match(this._imageResourceMatch)) {
				// image resource
				var _res_url = _res.Path;
				var _rkey = ''+_res_url;
				if (_res.Filter) {
					if (this._standalone) _res_url += '?sprite=' + _sprite.Name;
					else _res_url += '?filter=' + _res.Filter;
				}
				
				// we want to be able to lookup the image based on its URL sans filter
				// and just the plain filename sans ext
				_sprite._image_urls[ _rkey ] = _res_url;
				_sprite._image_urls[ _rkey.replace(/^(.+)\/([^\/]+)$/, '$2').replace(/\.\w+$/, '') ] = _res_url;
			}
		}
	} // sprite has resources
	
	// invoke sprite static preload, if defined
	if (_sprite._constructor && _sprite._constructor.preload) {
		debugstr("Calling sprite preload: " + _key);
		_sprite._constructor.preload();
	}
	
	// sprite class may also request images to be loaded
	if (_sprite._constructor && _sprite._constructor.prototype.images && _sprite._constructor.prototype.images.length) {
		for (var _idx = 0, _len = _sprite._constructor.prototype.images.length; _idx < _len; _idx++) {
			var _url = _sprite._constructor.prototype.images[_idx];
			this._imageWeight += this._imageLoader.loadImages( _url );
		}
	}
};

_Game.prototype._loadTileMedia = function(_key) {
	// load tile media
	var _tile = _find_object( this._def.Tiles.Tile, { Name: _key } );
	assert(!!_tile, "Could not locate tile definition: " + _key);
	if (!_tile) return;
	
	if (_tile._media_loaded || this._level_editor) return;
	_tile._media_loaded = 1;
	
	// handle prereqs
	if (_tile.Requires && _tile.Requires.Require) {
		var _req_list = _always_array( _tile.Requires.Require );
		for (var _idy = 0, _ley = _req_list.length; _idy < _ley; _idy++) {
			this._loadSpriteMedia( _req_list[_idy].Name );
		}
	} // req list
	
	// load resoruces
	if (_tile.Resources && _tile.Resources.Resource) {
		debugstr("Loading media for tile: " + _key);
		var _res_list = _always_array( _tile.Resources.Resource );
		this._loadResources( _res_list );
	} // tile has resources
};

_Game.prototype._loadResources = function(_res_list, _sprite_name) {
	// load resources from sprite or level
	for (var _idx = 0, _len = _res_list.length; _idx < _len; _idx++) {
		var _res = _res_list[_idx];
		
		if (_res.Path.match(this._audioResourceMatch) && !this._level_editor) {
			// audio resource
			var _res_url = _res.Path;
			this._audioWeight += this._audio._loadTracks( _res_url );
		}
		else if (_res.Path.match(this._imageResourceMatch)) {
			// image resource
			var _res_url = _res.Path;
			if (_res.Filter) {
				if (this._standalone && _sprite_name) _res_url += '?sprite=' + _sprite_name;
				else _res_url += '?filter=' + _res.Filter;
			}
			this._imageWeight += this._imageLoader.loadImages( _res_url );
		}
		else if (_res.Path.match(this._textResourceMatch) && !this._level_editor) {
			// text resource
			var _res_url = _res.Path;
			this._xmlWeight += this._xmlLoader._loadFiles( _res_url );
		}
		else if (_res.Path.match(this._movieResourceMatch) && !this._level_editor) {
			// movie resource
			var _res_url = _res.Path;
			this._videoWeight += this._videoLoader._loadMovies( _res_url );
		}
	} // foreach resource
};

_Game.prototype._getTotalLoadProgress = function() {
	// calculate total load progress
	var _totalWeight = (
		this._audioWeight + 
		this._imageWeight + 
		this._fontWeight + 
		this._xmlWeight + 
		this._videoWeight + 
		this._levelWeight
	);
	if (!_totalWeight) {
		// totalWeight = 1; // prevent divide by zero
		// nothing to load at all, so return 1.0
		return 1.0;
	}
	
	var _overallProgress = (
		(this._audio._getLoadProgress() * this._audioWeight) + 
		(this._imageLoader._getLoadProgress() * this._imageWeight) + 
		(this._fontLoader._getLoadProgress() * this._fontWeight) + 
		(this._xmlLoader._getLoadProgress() * this._xmlWeight) + 
		(this._videoLoader._getLoadProgress() * this._videoWeight) + 
		(this._levelLoader._getLoadProgress() * this._levelWeight)
	) / (_totalWeight);
	
	return _overallProgress;
};

_Game.prototype._checkGameLoadProgress = function() {
	// monitor game loading progress
	var _overallProgress = this._getTotalLoadProgress();
	// debugstr("in _checkGameLoadProgress: " + _overallProgress);
	
	this._progress._update( _overallProgress, 1 );
	
	if (_overallProgress >= 1.0) {
		debugstr("Core load complete");
		
		debugstr("Audio load progress: " + this._audio._getLoadProgress() + " (weight: " + this._audioWeight + ")");
		debugstr("Image load progress: " + this._imageLoader._getLoadProgress() + " (weight: " + this._imageWeight + ")");
		debugstr("Font load progress: " + this._fontLoader._getLoadProgress() + " (weight: " + this._fontWeight + ")");
		debugstr("XML load progress: " + this._xmlLoader._getLoadProgress() + " (weight: " + this._xmlWeight + ")");
		debugstr("Video load progress: " + this._videoLoader._getLoadProgress() + " (weight: " + this._videoWeight + ")");
		debugstr("Level load progress: " + this._levelLoader._getLoadProgress() + " (weight: " + this._levelWeight + ")");
		
		this._audio._init();
		this.loaded = true;
		this._state = 'run';
		this._progress.hide();
		
		// recover audio settings from cookie
		if (typeof(this._game_prefs.sound) == 'undefined') this._game_prefs.sound = 1;
		if (typeof(this._game_prefs.music) == 'undefined') this._game_prefs.music = 1;
		
		if (!this._game_prefs.sound) {
			gAudio.enabled = false;
		}
		if (!this._game_prefs.music) {
			gAudio._categorySettings['music'].enabled = false;
		}
		if (!this._level_editor) this._toolbar._update();
		
		Effect.VideoManager._update_volume();
		
		// setup resize handler if applicable
		if ((this._def.Zoom == "Auto") && !this._iframe) {
			if (window.addEventListener) {
				// Good browsers
				window.addEventListener( "resize", function() {
					gGame._handleResize();
				}, false );
			}
			else if (window.attachEvent) {
				// Bad browsers
				window.attachEvent("onresize", function() {
					gGame._handleResize();
				});
			}
		}
		
		this.fireHandler('onLoadGame');
		if (!this._level_editor) this.run();
		
		this.setKeysActive(true);
		this.setMouseActive(true);
	}
	else {
		setTimeout( function() { gGame._checkGameLoadProgress(); }, 100 );
	}
	
	// fire audio late loaders, if need be
	if (this._audio._lateLoad && 
		(this._imageLoader._getLoadProgress() >= 1.0) && 
		(this._fontLoader._getLoadProgress() >= 1.0) && 
		(this._xmlLoader._getLoadProgress() >= 1.0) && 
		(this._videoLoader._getLoadProgress() >= 1.0) && 
		(this._levelLoader._getLoadProgress() >= 1.0)) {
		
		this._audio._lateLoadAllTracks();
	}
};

_Game.prototype._handleResize = function() {
	// window has resized and game is set for auto-zoom, see if action is required
	if ((this._def.Zoom == "Auto") && !this._iframe) {
		var _size = _getInnerWindowSize();
		var _max_width_zoom = Math.floor(_size.width / this._def.PortWidth );
		var _max_height_zoom = Math.floor(_size.height / this._def.PortHeight );
		var _zoom = Math.min( _max_width_zoom, _max_height_zoom ) || 1;
		if (_zoom > 4) _zoom = 4;
	
		if ((_zoom != gPort._zoomLevel) && !this.changingZoom) {
			this.changeZoomLevel( zoom );
		}
	}
};

_Game.prototype.addLevel = function(_name, _level) {
	// manually add level (inline object)
	this._levelLoader._levels[_name] = _level;
};

_Game.prototype.setEnv = function(_name) {
	// set environment, before load only
	this._env = _find_object( this._def.Envs.Env, { Name: _name } );
	if (!this._env) return _throwError( "Environment not found: " + _name );
	
	this._envName = _name;
};

_Game.prototype._getEnvReloadList = function(_reload_urls) {
	// add urls to list that need to be reloaded if environment was switched
	if (this._env) {
		// reload all images affected by current environment
		if (this._env.Excludes && this._env.Excludes.Exclude) {
			var _excludes = _array_to_hash_keys( _always_array( this._env.Excludes.Exclude ) );
			for (var _url in this._imageLoader._images) {
				var _temp_url = _url.replace(/\?.+$/, ''); // remove filter for matching against exclude list
				if (!_excludes[_temp_url]) {
					// not on the list, reload it
					_reload_urls[_url] = 1;
				}
			}
		}
		else {
			// reload all
			for (var _url in this._imageLoader._images) {
				_reload_urls[_url] = 1;
			}
		}
	} // current env
};

_Game.prototype._switchEnv = function(_name) {
	// switch environment
	if (!_name) _name = '';
	if (_name == this._envName) return null;
	debugstr("Switching environment to: " + (_name ? _name : '(None)'));
	
	var _reload_urls = {};
	
	// call first for current environment, if applicable
	this._getEnvReloadList( _reload_urls );
	
	if (_name) {
		this._env = _find_object( this._def.Envs.Env, { Name: _name } );
		if (!this._env) return _throwError( "Environment not found: " + _name );
	}
	else this._env = null;
	
	this._envName = _name;
	
	// reload all images affected by new environment
	this._getEnvReloadList( _reload_urls );
	
	// send list to image loader
	// return this._imageLoader._reloadSelected( _hash_keys_to_array(_reload_urls) );
	return _num_keys(_reload_urls) ? _hash_keys_to_array(_reload_urls) : null;
};

_Game.prototype.setLevelEnvironment = function(_name, _envName) {
	// set environment for specified level
	if (!_envName) _envName = '';
	
	var _level = _find_object( this._def.Levels.Level, { Name: _name } );
	if (!_level) {
		return _throwError("Could not find level definition: " + _name );
	}
	
	var _env = _find_object( this._def.Envs.Env, { Name: _envName } );
	if (!_env) return _throwError( "Environment not found: " + _envName );
	
	_level.Env = _envName;
};

_Game.prototype.loadLevel = function(_name, _callback, _activate) {
	// load level by name
	if (!this._inited) return _throwError( "loadLevel() cannot be called until the engine is loaded (use an onLoadGame event listener)." );
	if (typeof(_activate) == 'undefined') _activate = true;
	
	if (_callback) {
		this.clearAllHandlers('onLoadLevel');
		this.setHandler('onLoadLevel', _callback);
	}
	
	this.setKeysActive(false);
	this.setMouseActive(false);
	
	if (this.inGame) {
		this.stop();
		// setTimeout( 'gGame.loadLevel("'+_name+'");', 100 );
		setTimeout( function() { gGame.loadLevel(_name, _callback, _activate); }, 100 );
		return;
	}
	
	debugstr("Loading level: " + _name);
	
	var _level = _find_object( this._def.Levels.Level, { Name: _name } );
	if (!_level) {
		return _throwError("Could not find level definition: " + _name );
	}
	
	var _envReloadList = null;
	if (_level.Env) {
		_envReloadList = this._switchEnv( _level.Env );
		if (_envReloadList) debugstr("Reloading images for env switch: " + _envReloadList.join(', '));
	}
	else {
		_envReloadList = this._switchEnv( '' );
		if (_envReloadList) debugstr("Reloading images for env switch: " + _envReloadList.join(', '));
	}
	
	if (this._levelLoader._levels[_name] && !_envReloadList) {
		// already loaded
		if (_activate) this.setActiveLevel(_name);
		else this.fireHandler('onInitLevel');
		this.fireHandler('onLoadLevel');
		this.run();
		this.setKeysActive(true);
		this.setMouseActive(true);
		return;
	}
	
	this._loadingLevelName = _name;
	this._loadingLevelActivate = _activate;
	
	this._progress._update(0, 1);
	this._progress.show();
	
	this._resetAllLoaders();
	
	if (_envReloadList) {
		this._imageWeight += this._imageLoader._reloadSelected( _envReloadList );
	}
	
	this._levelLoader._loadLevels( _level.Name );
	this._levelWeight++;
	this._loadLevelMedia( _level.Name );
	
	// go into progress loop
	this._checkLevelLoadProgress();
};

_Game.prototype._checkLevelLoadProgress = function() {
	// monitor level loading progress
	var _overallProgress = this._getTotalLoadProgress();
	this._progress._update( _overallProgress, 1 );
	
	if (_overallProgress >= 1.0) {
		this._audio._init();
		Effect.VideoManager._update_volume();
		
		if (this._loadingLevelActivate) {
			this.setActiveLevel(this._loadingLevelName);
			delete this._loadingLevelName;
			delete this._loadingLevelActivate;
		}
		else this.fireHandler('onInitLevel');
		
		this.fireHandler('onLoadLevel');
		
		this.run();
		
		this._progress.hide();
		
		this.setKeysActive(true);
		this.setMouseActive(true);
	}
	else {
		setTimeout( function() { gGame._checkLevelLoadProgress(); }, 100 );
	}
	
	// fire audio late loaders, if need be
	if (this._audio._lateLoad && 
		(this._imageLoader._getLoadProgress() >= 1.0) && 
		(this._fontLoader._getLoadProgress() >= 1.0) && 
		(this._xmlLoader._getLoadProgress() >= 1.0) && 
		(this._videoLoader._getLoadProgress() >= 1.0) && 
		(this._levelLoader._getLoadProgress() >= 1.0)) {
		
		this._audio._lateLoadAllTracks();
	}
};

_Game.prototype.setActiveLevel = function(_name, _setup_layers) {
	// activate level
	if (!this._inited) return _throwError( "setActiveLevel() cannot be called until the engine is loaded (use an onLoadGame event listener)." );
	if (typeof(_setup_layers) == 'undefined') _setup_layers = true;
	debugstr("Setting active level: " + _name );
	
	this._levelDef = _find_object( this._def.Levels.Level, { Name: _name } );
	if (!this._levelDef) {
		return _throwError("Could not find level definition: " + _name );
	}
	
	if (!this._levelLoader.lookupLevel( _name )) {
		return _throwError("Level is not loaded: " + _name);
	}
	this._levelData = _deep_copy_object( this._levelLoader.lookupLevel( _name ) );
	if (!this._levelData.layers) this._levelData.layers = {};
	
	this._levelName = _name;
	
	this.fireHandler('onInitLevel');
	
	if (_setup_layers && this._levelDef.Layers && this._levelDef.Layers.Layer) {
		var _layers = _always_array( this._levelDef.Layers.Layer );
		
		for (var _idx = 0, _len = _layers.length; _idx < _len; _idx++) {
			var _layer = _layers[_idx];
			debugstr("Setting up layer: " + _layer.Name);
			
			var _layer_data = this._levelData.layers[ _layer.Name ];
			var _plane = gPort.getPlane( _layer.Name );
			
			if (_plane) _plane.reset();
			
			switch (_layer.Type) {
				case 'tile':
					if (!_plane) _plane = new TilePlane( _layer.Name );
					_plane.setZIndex( _layer.ZIndex );
					_plane.setScrollSpeed( _layer.ScrollRatio );
					
					if (_layer.Tileset) {
						var _tileset_id = _layer.Tileset;
						var _tileset = _find_object( this._def.Tilesets.Tileset, { Name: _tileset_id } );
						if (!_tileset) return _throwError("Could not locate tileset definition: " + _tileset_id);
						_plane.tileImagePath = _tileset.Path.replace(/\/$/, '');
						_plane.setTileSize( _tileset.TileWidth, _tileset.TileHeight );
					}
					else return _throwError("Layer has no tile set specified: " + _layer.Name);
					
					if (_layer_data) {
						if (_layer_data.data) _plane.setData( _layer_data.data, 'data' );
						if (_layer_data.map) _plane.setMap( _layer_data.map );
						if (_layer_data.objectData) _plane.setData( _layer_data.objectData, 'objectData' );
					}
					gPort.attach(_plane);
					break;
				
				case 'sprite':
					if (!_plane) _plane = new SpritePlane( _layer.Name );
					_plane.setZIndex( _layer.ZIndex );
					_plane.setScrollSpeed( _layer.ScrollRatio );
					gPort.attach(_plane);
					if (_layer_data) _plane.setupAether( _layer_data );
					break;
			} // switch layer.Type
		} // foreach layer
	} // level has layers
	
	// port virtual size
	gPort.setVirtualSize( this._levelDef.Width, this._levelDef.Height );
	
	// setup background
	gPort.setBackground({
		color: this._levelDef.BackgroundColor,
		url: this._levelDef.BackgroundImage,
		xMode: this._levelDef.BackgroundXMode,
		yMode: this._levelDef.BackgroundYMode,
		xDiv: this._levelDef.BackgroundXDiv,
		yDiv: this._levelDef.BackgroundYDiv
	});
	
	// flag port for instant draw (one frame only)
	gPort._firstFrame = true;
};

_Game.prototype.saveLevelState = function() {
	// make copy of level for restoring after death, etc.
	if (!this._levelData) {
		return _throwError("Cannot save level state, no level is active");
	}
	this._levelLoader._levels[this._levelName].data = _deep_copy_object( this._levelData );
};

_Game.prototype.restoreLevelState = function() {
	// restore level from archive copy
	if (!this._levelName) {
		return _throwError("Cannot restore level, no level is active");
	}
	this.setActiveLevel( this._levelName );
};

_Game.prototype.run = function() {
	// enter game loop
	if (!this._inited) return _throwError( "run() cannot be called until the engine is loaded (use an onLoadGame event listener)." );
	if (!this.inGame) {
		debugstr("Starting main loop");
		this.inGame = true;
		this._lastFrame = this._lastFrameEnd = _now_epoch();
		this._numLogics = 0;
		this._loop();
	}
};

_Game.prototype.stop = function() {
	// exit game loop
	if (this.inGame) {
		debugstr("Stopping main loop");
		this.inGame = false;
		if (this._loopTimer) clearTimeout( this._loopTimer );
		this._loopTimer = null;
	}
};

_Game.prototype.pause = function() {
	if (this.inGame) {
		this._keysActive = false;
		this._mouseActive = false;
		this.stop();
		this.resetKeys();
		this.fireHandler('onPause');
	}
};

_Game.prototype.resume = function() {
	if (!this.inGame) {
		this.run();
		this._keysActive = true;
		this._mouseActive = true;
		this.fireHandler('onResume');
	}
};

_Game.prototype.toggle = function() {
	if (this.inGame) this.pause();
	else this.resume();
};

_Game.prototype.step = function() {
	// process exactly one frame then return
	if (!this.inGame) {
		this.inGame = true;
		this.logic();
		this.draw();
		this._imageLoader._dynaIdle(false);
		this.inGame = false;
	}
};

_Game.prototype._loop = function() {
	// process single frame
	this._loopTimer = null;

	if (this.inGame) {
		var _now = _now_epoch();
		
		this._fps.lastBetweenElapsed = _now - this._lastFrameEnd;

		// handle logic
		if (this._skipFrames) {
			// skip frame animation -- skip frames as needed
			// to keep game speed consistent
			var _frameDuration = 1 / this._targetFPS;
			this._numLogics += ( (_now - this._lastFrame) / _frameDuration );
			if (this._numLogics < 1) this._numLogics = 1;
			if (this._numLogics > this._maxLogicsPerFrame) this._numLogics = this._maxLogicsPerFrame;

			// for (var _idx = 0; _idx < _numLogics; _idx++) this.logic();
			var _count = 0;
			while (this._numLogics > 0) {
				this.logic();
				this._numLogics--;
				_count++;
			}
			
			this._fps.numLogics = _count;
		}
		else {
			// smooth animation -- no skipped frames
			this.logic();
			this._fps.numLogics = 1;
		}

		// update graphics
		this.draw();

		// async load images
		this._imageLoader._dynaIdle(false);

		// calculate running _fps
		var _int_now = parseInt(_now, 10);
		if (_int_now != this._fps.lastSecond) {
			this._fps.totalFrames += this._fps.frameCount;
			if (!this._fps.startTime) this._fps.startTime = _int_now - 1;
			this._fps.average = this._fps.totalFrames / (_int_now - this._fps.startTime);
			
			this._fps.current = this._fps.frameCount;
			this._fps.frameCount = 0;
			this._fps.lastSecond = _int_now;
		}
		this._fps.frameCount++;

		// schedule next frame, trying to maintain target frame rate
		var _endNow = _now_epoch();
		var _maxDelay = 1 / this._targetFPS;
		var _actualLastDelay = _endNow - this._lastFrameEnd;
		if (!this._lastSleep) this._lastSleep = _maxDelay;
		
		var _delay = this._lastSleep - (_actualLastDelay - _maxDelay);
		if (_delay > _maxDelay) _delay = _maxDelay;
		else if (_delay < 0.001) _delay = 0.001;
		
		this._loopTimer = setTimeout( function() { gGame._loop(); }, Math.floor(_delay * 1000) );
		
		this._lastFrame = _now;
		this._lastFrameEnd = _endNow;
		this._lastSleep = _delay;
	} // inGame
};

_Game.prototype.logic = function() {
	var _start_time = _now_epoch();
	// process one logic frame
	/* if (this.level.events && this.level.events.enabled && this.level.events[this.logicClock]) {
		for (var func in this.level.events[this.logicClock]) {
			if (window[func]) {
				debugstr("Firing level event: " + func);
				window[func]( this.level.events[this.logicClock][func] );
			}
			else return _throwError("Function not found: " + func);
		}
	} */
	
	// this also calls logic() on all portals
	this.fireHandler('onLogic', this.logicClock);
	
	/* for (var _idx = 0, _len = this._portals.length; _idx < _len; _idx++) {
		this._portals[_idx].logic( this.logicClock );
	} */
	
	// update tweens
	this._tween.logic();
	
	if (this._states[this._state]) {
		var _st = this._states[this._state];
		if (typeof(_st) == 'function') _st( this.logicClock );
		else if (_isa_array(_st)) {
			// PHP style object callback
			// handler[0] is object ref, handler[1] is function ref (or string)
			if (typeof(_st[1]) == 'function') _st[1].apply(_st[0], [this.logicClock]);
			else _st[0][ _st[1] ].apply(_st[0], [this.logicClock]);
		}
		else if (window[_st]) window[_st](this.logicClock);
		// else eval(_st);
	}
	
	if (this._schedule[this.logicClock]) {
		var _evs = this._schedule[this.logicClock];
		for (var _idx = 0, _len = _evs.length; _idx < _len; _idx++) {
			var _ev = _evs[_idx];
			if (typeof(_ev.handler) == 'function') {
				_ev.handler.apply( window, _ev.args );
			}
			else {
				debugstr( "Firing scheduled event: " + _ev.handler );
				this.fireHandler.apply( this, _array_combine([_ev.handler], _ev.args) );
			}
		}
		delete this._schedule[this.logicClock];
	}
	
	this.logicClock++;
	
	this._fps.lastLogicElapsed = _now_epoch() - _start_time;
};

_Game.prototype.draw = function() {
	// process one graphical frame
	/* for (var _idx = 0, _len = this._portals.length; _idx < _len; _idx++) {
		this._portals[_idx].draw();
	} */
	
	var _start_time = _now_epoch();
	
	this.fireHandler('onDraw');
	this.drawClock++;
	
	this._fps.lastDrawElapsed = _now_epoch() - _start_time;
};

_Game.prototype.scheduleEvent = function(_time, _handler) {
	// schedule handler to fire in the future
	// accepts variable argument list, passes extra args to fireHandler
	if (!this._inited) return _throwError( "scheduleEvent() cannot be called until the engine is initialized (use an onInit or onLoadGame event listener)." );
	if (!_time || (_time < 0)) _time = 0;
	_time += this.logicClock;
	if (!this._schedule[_time]) this._schedule[_time] = [];
	_array_push( this._schedule[_time],  {
		handler: _handler,
		args: _array_slice( arguments, 2 )
	} );
};

_Game.prototype.clearSchedule = function() {
	// clear entire schedule
	this._schedule = {};
};

_Game.prototype.attach = function(_port) {
	// attach and initialize new portal
	if (!this._inited) return _throwError( "attach() cannot be called until the engine is initialized (use an onInit or onLoadGame event listener)." );
	if (!_port.portWidth || !_port.portHeight) return _throwError("Non-port object passed to Game.attach");
	
	_port.game = this;
	_array_push( this._portals, _port );
	if (_port.init) _port.init();
};

_Game.prototype.getPortal = function(_id) {
	// lookup an attached portal by its id
	return _find_object( this._portals, { id: _id } );
};

_Game.prototype.removeAllTweens = function() {
	// remove all running tweens
	this._tween.removeAll();
};

_Game.prototype.setKeyHandler = function(_key, _handler) {
	// set handler for particular key (move_left, button_1, etc.)
	// handler should be object that has onKeyDown() and/or onKeyUp()
	if (!this._inited) return _throwError( "setKeyHandler() cannot be called until the engine is initialized (use an onInit or onLoadGame event listener)." );
	var _keyDef = this.keys[_key];
	if (!_keyDef) return _throwError( "Cannot find keyboard definition for: " + _key );

	if (!_keyDef.handlers) _keyDef.handlers = [];
	_array_push( _keyDef.handlers, _handler );
};

_Game.prototype.resetKeys = function() {
	// set all keys to "up" state
	debugstr("resetting all keys to up state");
	for (var _key in this.keys) {
		this.keys[_key].down = false;
	}
};

//
// Re-Zoom Handling
//

_Game.prototype.changeZoomLevel = function(_newLevel) {
	// change zoom level (this is a MAJOR event)
	if (this.changingZoom) return;
	if (!this._inited) return _throwError( "changeZoomLevel() cannot be called until the engine is loaded (use an onLoadGame event listener)." );
	
	if (this.inGame) {
		this._runAfterZoom = true;
		this.stop();
		setTimeout( function() { gGame.changeZoomLevel(_newLevel); }, 250 );
		return;
	}
	
	this.changingZoom = true;
	Debug.trace('game', "Changing zoom level to: " + _newLevel + "X");
	
	for (var _idx = 0, _len = this._portals.length; _idx < _len; _idx++) {
		this._portals[_idx].reset();
		this._portals[_idx]._oldZoomLevel = this._portals[_idx]._zoomLevel;
		this._portals[_idx]._zoomLevel = _newLevel;
	}
		
	// show progress dialog
	this._progress._text = "One Moment Please...";
	this._progress._update(0, 1);
	this._progress.show();
	
	// re-thread so graphics have a chance to update
	setTimeout( function() { gGame._changeZoomLevel2(); }, 1 );
};

_Game.prototype._changeZoomLevel2 = function() {
	// continue changing zoom level
	this._imageLoader.reloadAll();
	this._fontLoader.reloadAll();
	
	// also must reload loading image to fit new zoom level
	this._progress._rezoom();
	
	// go into progress loop
	this._checkZoomLevelProgress();
};

_Game.prototype._checkZoomLevelProgress = function() {
	// monitor game loading progress
	var _overallProgress = (
		this._imageLoader._getLoadProgress() + 
		this._fontLoader._getLoadProgress() + 
		this._progress._getRezoomProgress()
	) / 3;
	
	this._progress._update( _overallProgress, 1 );
	
	if (_overallProgress >= 1.0) {
		this._progress.hide();
		
		// re-init all portals
		for (var _idx = 0, _len = this._portals.length; _idx < _len; _idx++) {
			var _port = this._portals[_idx];
			if (_port.init) _port.init();
			_port.setScroll( _port.scrollX, _port.scrollY );
			_port.draw(true);
		}
		
		// update toolbar
		if (!this._level_editor) this._toolbar._update_width( gPort.portWidth * gPort._zoomLevel );
		
		// fire event
		this.fireHandler('onZoom', gPort._zoomLevel);
		
		Debug.trace('game', "Zoom level change complete");
		
		if (this._runAfterZoom) {
			this._runAfterZoom = false;
			this.run();
		}
		else if (!this._level_editor) {
			this.changingZoom = false;
			this._toolbar._show_pause_splash();
		}
		
		this.changingZoom = false;
	}
	else {
		setTimeout( function() { gGame._checkZoomLevelProgress(); }, 250 );
	}
};

_Game.prototype._getUserImageURL = function(_path) {
	// convert USERNAME/FILENAME into FQURL
	if (_path.match(/^(\w+)\/(.+)$/)) {
		var _username = RegExp.$1;
		var _filename = RegExp.$2;
		return this._homePath + 'api/view/users/' + _username + '/images/' + _filename;
	}
	return 'ERROR';
};

_Game.prototype.getXML = function(_path) {
	// try to get XML file from loader
	if (!this._inited) return _throwError( "getXML() cannot be called until the engine is loaded (use an onLoadGame event listener)." );
	var _obj = this._xmlLoader.lookupFile(_path);
	if (_obj && _obj.loaded && _obj.data) return _obj.data;
	else return null;
};

//
// Event Handling Stuff
//

_Game.prototype.setKeyDefinition = function(_name, _codes) {
	// add or change key definition
	if (!this._inited) return _throwError( "setKeyDefinition() cannot be called until the engine is initialized (use an onInit or onLoadGame event listener)." );
	this.keys[_name] = { code: _always_array(_codes), down: false };
};

_Game.prototype.getLocalMousePosition = function(e, _obj) {
	// get localized mouse x, y from event object
	return _get_mouse_coords(e, _obj);
};

_Game.prototype._getNiceKeyName = function(_keyCode) {
	// get human-readable key name based on key code ("Backspace", etc.)
	if (this._keyMap[_keyCode]) return this._keyMap[_keyCode];
	else {
		var _ch = String.fromCharCode(_keyCode);
		if ( ((_keyCode >= 65) && (_keyCode <= 90)) || ((_keyCode >= 45) && (_keyCode <= 57)) ) {
			// alpahnumeric
			// return '(' + ch + ')';
			return _ch;
		}
		else {
			// unknown
			return 'Unknown (#' + _keyCode + ')';
		}
	}	
};

_Game.prototype._fixKeyCode = function(_keyCode) {
	// some browsers use different key codes for certain keys
	// try to standardize as much as we can here
	switch (_keyCode) {
		case 59: _keyCode = 186; break; // firefox semi-colon to colon map
		case 91:
		case 93: _keyCode = 224; break; // firefox left-cmd/right-cmd to cmd map
	}
	
	return _keyCode;
};

// which DOM object receives move events (while mouse is down)
var _mouseObj = null;

function _Game_onMouseDown(e) {
	// capture all mouse down events
	if (window.event) e = window.event;
	
	// special case for resuming paused game
	if (gGame && 
		gGame.loaded && 
		!gGame.inGame && 
		!gGame._mouseActive && 
		!gGame._level_editor && 
		!gGame._toolbar._dialogActive && 
		gGame.clickResume && 
		!Debug.enabled && 
		_pt_in_obj(e, el('effect_port'))) {
			gGame.resume();
			return stop_event(e);
	}
	
	if (!gGame || !gGame._mouseActive) return true;
	
	var _buttonNum = e.button;
	debugstr("mousedown: " + _buttonNum);
	
	var _targetObj = e.target ? e.target : e.srcElement;

	while (_targetObj && !_targetObj.tagName.match(/^(BODY|HTML)$/) && !_targetObj.captureMouse) {
		_targetObj = _targetObj.parentNode ? _targetObj.parentNode : _targetObj.parentElement;
	}
	
	var _pt = _get_mouse_coords(e);
	gGame.mouseIsDown = true;
	gGame.mousePt.set( _pt );

	if (_targetObj && _targetObj.captureMouse && (typeof(gPort) != 'undefined') && gPort.div) {
		_mouseObj = _targetObj;
		debugstr("found target object" + (_mouseObj.id ? (': '+_mouseObj.id) : ''));
		
		// localize point to port
		var _pt = gPort.getMouseCoords();
		if (_pt) {
			// further localize to sprite, if that's what we clicked on
			if (_mouseObj.captureMouse._isSprite) {
				_pt.x -= _mouseObj.captureMouse.x;
				_pt.y -= _mouseObj.captureMouse.y;
			}
		
			if (_mouseObj.captureMouse.handlers && _mouseObj.captureMouse.handlers.mousedown) {
				var _result = pass_event_if( _mouseObj.captureMouse.fireHandler('mousedown', _pt, _buttonNum, e), e );
				if (!_result) return false; // stop bubble
			}
			else if (_mouseObj.captureMouse.onMouseDown) {
				var _handlers = _always_array( _mouseObj.captureMouse.onMouseDown );
				for (var _idx = 0, _len = _handlers.length; _idx < _len; _idx++) {
					var _result = pass_event_if(
						(typeof(_handlers[_idx]) == 'function') ? 
							_handlers[_idx].apply( _mouseObj.captureMouse, [_pt, _buttonNum, e]) : 
							window[_handlers[_idx]].apply( _mouseObj.captureMouse, [_pt, _buttonNum, e]), 
					e );
					if (!_result) return false; // stop bubble
				} // foreach handler
			} // _mouseObj.captureMouse.onMouseDown
		} // got port localized mouse coords
	} // targetObj.captureMouse
	
	var _result = gGame.fireHandler('onMouseDown', _pt, _buttonNum, e);
	return pass_event_if( gGame._level_editor ? _result : !gGame.inGame, e );
}

function _Game_onMouseMove(e) {
	// capture all mouse move events
	if (!gGame) return true;
	if (window.event) e = window.event;
	
	var _globalPt = _get_mouse_coords(e);
	if ((_globalPt.x < 0) || (_globalPt.y < 0)) return true;
	
	// debugstr("mousemove: " + globalPt.x + ' x ' + globalPt.y);
	
	gGame.mousePt.set( _globalPt );
	
	if (!gGame._mouseActive) return true;
	
	if (_mouseObj) {
		// localize point to port
		var _pt = gPort.getMouseCoords(true);
		// debugstr("global raw coords: " + _globalPt.x + 'x' + _globalPt.y);
		// debugstr("in _Game_onMouseMove: " + _pt.x + 'x' + _pt.y);
		
		if (_pt) {
			// further localize to sprite, if that's what we clicked on
			if (_mouseObj.captureMouse._isSprite) {
				_pt.x -= _mouseObj.captureMouse.x;
				_pt.y -= _mouseObj.captureMouse.y;
			}
		
			if (_mouseObj.captureMouse.handlers && _mouseObj.captureMouse.handlers.mousemove) {
				var _result = _mouseObj.captureMouse.fireHandler('mousemove', _pt, e);
				if (!_result) return true; // stop here (but do not stop event for mouse move)
			}
			else if (_mouseObj.captureMouse.onMouseMove) {
				var _handlers = _always_array( _mouseObj.captureMouse.onMouseMove );
				for (var _idx = 0, _len = _handlers.length; _idx < _len; _idx++) {
					var _result = 
						(typeof(_handlers[_idx]) == 'function') ? 
							_handlers[_idx].apply( _mouseObj.captureMouse, [_pt, e]) : 
							window[_handlers[_idx]].apply( _mouseObj.captureMouse, [_pt, e]);
					if (!_result) return true; // stop here, but do not stop event for mouse move
				} // foreach handler
			} // _mouseObj.captureMouse.onMouseMove
		} // got port localized mouse coords
	} // _mouseObj
	
	// if point is inside port, and is listening for mouse move, delegate
	if (gGame.loaded && gGame.inGame && !_mouseObj && gPort.handlers && gPort.handlers.mousemove) {
		var _portPt = gPort.getMouseCoords();
		if (_portPt) {
			gPort.fireHandler( 'mousemove', _portPt, e);
		}
	}
	
	gGame.fireHandler('onMouseMove', _globalPt, e);
	return true; // mouse move events should always passthrough
}

function _Game_onMouseUp(e) {
	// capture all mouse up events
	if (!gGame || !gGame._mouseActive) return true;
	if (window.event) e = window.event;
	
	var _buttonNum = e.button;
	debugstr("mouseup: " + _buttonNum);
	
	var _pt = _get_mouse_coords(e);
	gGame.mouseIsDown = false;
	gGame.mousePt.set( _pt );
	
	if (_mouseObj) {
		var _pt = gPort.getMouseCoords();
		if (!_pt) _pt = new Point(-1, -1); // out of bounds, still need to call mouseup tho
		if (_pt) {
			// further localize to sprite, if that's what we clicked on
			if (_mouseObj.captureMouse._isSprite) {
				_pt.x -= _mouseObj.captureMouse.x;
				_pt.y -= _mouseObj.captureMouse.y;
			}
			
			if (_mouseObj.captureMouse.handlers && _mouseObj.captureMouse.handlers.mouseup) {
				var _capMouse = _mouseObj.captureMouse;
				_mouseObj = null;
				var _result = _capMouse.fireHandler('mouseup', _pt, _buttonNum, e);
				if (!_result) return stop_event(e);
			}
			else {
				var _handlers = _mouseObj.captureMouse.onMouseUp ? _always_array( _mouseObj.captureMouse.onMouseUp ) : [];
				var _capMouse = _mouseObj.captureMouse;
				_mouseObj = null;
		
				for (var _idx = 0, _len = _handlers.length; _idx < _len; _idx++) {
					var _result = (typeof(_handlers[_idx]) == 'function') ? 
						_handlers[_idx].apply( _capMouse, [_pt, _buttonNum, e]) : 
						window[_handlers[_idx]].apply( _capMouse, [_pt, _buttonNum, e]);
					if (!_result) return stop_event(e);
				}
			} // classic onMouseUp handler
		} // got port localized mouse coords
	} // mouseObj
	
	var _result = gGame.fireHandler('onMouseUp', _pt, _buttonNum, e);
	return pass_event_if( gGame._level_editor ? _result : !gGame.inGame, e );
}

function _Game_onMouseWheel(e) {
	// handle mouse wheel movement
	if (!gGame || !gGame._mouseActive) return true;
	if (window.event) e = window.event;
	var _delta = 0;
	
	if (e.wheelDelta) {
		_delta = e.wheelDelta / 120;
		if (window.opera) _delta = -_delta;
	}
	else if (e.detail) {
		_delta = -e.detail / 3;
	}
	if (!_delta) return true;
	
	_delta = 0 - _delta;
	
	var _handler_defined = false;
	
	if (gGame.loaded && gGame.inGame && gPort.handlers && gPort.handlers.mousewheel) {
		_handler_defined = true;
		var _portPt = gPort.getMouseCoords();
		if (_portPt) {
			gPort.fireHandler( 'mousewheel', _delta, e);
		}
	}
	
	var _result = gGame.fireHandler('onMouseWheel', _delta, e);
	
	// if no port handler is defined, and not in level editor mode, we want this to always pass through
	if (!_handler_defined && !gGame._level_editor) return true;
	
	return pass_event_if( gGame._level_editor ? _result : !gGame.inGame, e );
}

function _Game_onContext(e) {
	// right-click handler, only needed for safari 2
	// all other browsers fire standard onMouseDown event
	if (!e) e = window.event;
	if (ua.safari2) _Game_onMouseDown(e);
	return pass_event_if( !gGame.inGame, e );
}

function _Game_onKeyDown(e) {
	// capture all key down events
	if (window.event) e = window.event;
	
	var _code = gGame._fixKeyCode( e.keyCode );
	
	// special case for resuming paused game
	if (gGame && 
		gGame.loaded && 
		!gGame.inGame && 
		!gGame._keysActive && 
		gGame.clickResume && 
		gGame._resumeKey && 
		gGame.keys && 
		gGame.keys[gGame._resumeKey] && 
		_find_in_array( gGame.keys[gGame._resumeKey].code, _code )) {
			gGame.resume();
			return stop_event(e);
	}
	
	if (!gGame || !gGame._keysActive) return true;
	
	// passthrough all events if metaKey or ctrlKey were held
	if (e && (e.metaKey || e.ctrlKey) && !gGame._level_editor) return true;
	
	debugstr("keydown: " + _code);
	
	if (gGame.handlers.keyintercept) {
		return pass_event_if( gGame.fireHandler('keyintercept', e, _code), e );
	}
	
	var _foundKeyName = '';

	for (var _keyName in gGame.keys) {
		var _keyDef = gGame.keys[_keyName];
		for (var _idy = 0; _idy < _keyDef.code.length; _idy++) {
			if (_code == _keyDef.code[_idy]) {
				_foundKeyName = _keyName;
				if (!_keyDef.down || gGame.autoKey || _keyDef.autoKey) {
					_keyDef.down = true;
					if (_keyDef.handlers) {
						for (var _idz = 0; _idz < _keyDef.handlers.length; _idz++) {
							var _handler = _keyDef.handlers[_idz];
							if (_handler.destroyed) {
								_keyDef.handlers.splice( _idz, 1 );
								_idz--;
							}
							else if (_handler.onKeyDown) _handler.onKeyDown(_keyName);
						} // foreach key handler
					} // key def has handlers
				} // key is not already down (or autoKey is enabled)
				break;
			} // matched key
		} // foreach code
	} // foreach key def
	
	var _result = gGame.fireHandler('onKeyDown', _foundKeyName, _code, e);
	return pass_event_if( gGame._level_editor ? _result : !gGame.inGame, e );
}

function _Game_onKeyUp(e) {
	// capture all key up events
	if (!gGame || !gGame._keysActive) return true;
	if (window.event) e = window.event;
	
	// passthrough all events if metaKey or ctrlKey were held
	if (e && (e.metaKey || e.ctrlKey) && !gGame._level_editor) return true;
	
	var _code = gGame._fixKeyCode( e.keyCode );
	var _foundKeyName = '';
	
	debugstr("keyup: " + _code);
	
	for (var _keyName in gGame.keys) {
		var _keyDef = gGame.keys[_keyName];
		for (var _idy = 0; _idy < _keyDef.code.length; _idy++) {
			if (_code == _keyDef.code[_idy]) {
				_foundKeyName = _keyName;
				_keyDef.down = false;
				if (_keyDef.handlers) {
					for (var _idz = 0; _idz < _keyDef.handlers.length; _idz++) {
						var _handler = _keyDef.handlers[_idz];
						if (_handler.destroyed) {
							_keyDef.handlers.splice( _idz, 1 );
							_idz--;
						}
						else if (_handler.onKeyUp) _handler.onKeyUp(_keyName);
					} // foreach key handler
				} // key def has handlers
				break;
			} // matched key
		} // foeeach code
	} // foreach key def

	var _result = gGame.fireHandler('onKeyUp', _foundKeyName, _code, e);
	return pass_event_if( gGame._level_editor ? _result : !gGame.inGame, e );
}

function _Game_onKeyPress(e) {
	// only needed for firefox, stop event if in game
	// prevent window scrolling
	if (!gGame || !gGame._keysActive) return true;
	if (window.event) e = window.event;
	
	// passthrough all events if metaKey or ctrlKey were held
	if (e && (e.metaKey || e.ctrlKey) && !gGame._level_editor) return true;
	
	return pass_event_if( gGame._level_editor ? true : !gGame.inGame, e );
}

function pass_event_if(_state, e) {
	// pass event through if state is true
	if (_state) return true; // passthrough
	else return stop_event(e);
}

function _stop_textarea_key_event(e) {
	// only stop event if metaKey and ctrlKey modifiers are not down
	if (!e) e = window.event;
	if (e && !e.metaKey && !e.ctrlKey) {
		return stop_event(e);
	}
	else return true;
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

if (window.addEventListener) {
	window.addEventListener( 'mousedown', _Game_onMouseDown, false );
	window.addEventListener( 'mousemove', _Game_onMouseMove, false );
	window.addEventListener( 'mouseup', _Game_onMouseUp, false );
	window.addEventListener( 'keydown', _Game_onKeyDown, false );
	window.addEventListener( 'keyup', _Game_onKeyUp, false );
	window.addEventListener( 'DOMMouseScroll', _Game_onMouseWheel, false);
	
	if (ua.ff) window.addEventListener( 'keypress', _Game_onKeyPress, false );
}
else {
	if (document.captureEvents) {
		document.captureEvents(Event.MOUSEDOWN);
		document.captureEvents(Event.MOUSEMOVE);
		document.captureEvents(Event.MOUSEUP);
		document.captureEvents(Event.KEYDOWN);
		document.captureEvents(Event.KEYUP);
	}
	
	window.onmousedown = document.onmousedown = document.body.onmousedown = _Game_onMouseDown;
	window.onmousemove = document.onmousemove = document.body.onmousemove = _Game_onMouseMove;
	window.onmouseup = document.onmouseup = document.body.onmouseup = _Game_onMouseUp;
	window.onkeydown = document.onkeydown = _Game_onKeyDown;
	window.onkeyup = document.onkeyup = _Game_onKeyUp;
}

window.oncontextmenu = document.oncontextmenu = _Game_onContext;
window.onmousewheel = document.onmousewheel = _Game_onMouseWheel;

// Safe Object Unload for IE
if (ua.ie) {
	window.attachEvent( 'onunload', function() {
		if (gGame && gGame._safe_unload_list) {
			for (var _idx = 0, _len = gGame._safe_unload_list.length; _idx < _len; _idx++) {
				var _id = gGame._safe_unload_list[_idx];
				var _obj = document.getElementById(_id);
				if (_obj && (_obj.readyState == 4)) {
					debugstr("Safely unloading object in IE: " + _id);
					for (var i in _obj) {
						if (typeof _obj[i] == "function") {
							_obj[i] = null;
						}
					}
					_obj.parentNode.removeChild(_obj);
				} // object ready
			} // foreach object
		} // gGame loaded
	} );
}

// Create singleton instance of Game class
gGame = new _Game();
Effect.Game = $G = gGame;

// we need limited outside control, so page elements can pause/unpause
window.gGameControl = {
	pause: function() { gGame.pause(); },
	resume: function() { gGame.resume(); },
	setClickResume: function(enabled) { gGame.clickResume = enabled; }
};

// Init when ready
if (document.addEventListener) {
	// Good browsers
	document.addEventListener( "DOMContentLoaded", function() {
		document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
		gGame.init();
	}, false );
	
	// Just in case
	window.addEventListener( "load", function() {
		window.removeEventListener( "load", arguments.callee, false );
		gGame.init();
	}, false );
}
else if (window.attachEvent) {
	// Bad browsers have to wait
	window.attachEvent("onload", function() {
		setTimeout( function() { gGame.init(); }, 1000 );
	});
}
