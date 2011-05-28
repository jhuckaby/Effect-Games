// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// Audio.as
// Flash sound library
//
// Compile:
// mtasc -swf htdocs/engine/EffectAudio.swf -main -header 16:16:30 src/Audio.as -version 8
// On my mac: /Developer/Applications/3rdparty/mtasc-1.12-osx/mtasc
////

import flash.external.ExternalInterface;
import flash.Security;

class SoundManager {
	static var app : SoundManager;

	function SoundManager() {
		var sounds = [];
		
		var _load = function(id, url, loop, volume, balance, multiplex) {
			// load sound from URL
			if (!loop) loop = false;
			if (!volume) volume = 100;
			if (!balance) balance = 0;
			if (!multiplex) multiplex = false;
			
			if (!sounds[id]) sounds[id] = new Sound();
			var snd = sounds[id];
			snd.lastPosition = 0;
			snd.onLoad = function(success) {
				ExternalInterface.call('gAudio.flashNotify', 'soundLoadComplete', id, success);
			};
			snd.onSoundComplete = function() {
				if (!multiplex && !loop) ExternalInterface.call('gAudio.flashNotify', 'soundPlayComplete', id);
				// poor man's loop -- we do this because flash's built-in
				// loop doesn't play nice with starting from an offset
				if (loop) snd.start(0, 0);
			};
			snd.setVolume( volume );
			snd.setPan( balance );
			snd.loop = loop;
			snd.multiplex = multiplex;
			snd.isPlaying = false;
			
			try {
				snd.loadSound(url, false);
			} 
			catch (error:Error) {
				ExternalInterface.call('gAudio.flashNotify', 'soundLoadError', id, error.toString());
			}
			
			snd.stop();
		};
		
		var _play = function(id) {
			// play sound
			var snd = sounds[id];
			if (snd) {
				if (!snd.multiplex) snd.stop();
				if (snd.loop) {
					if (!snd.isPlaying) {
						snd.isPlaying = true;
						snd.start(snd.lastPosition / 1000, 0);
					}
				}
				else snd.start(0, 0);
			}
		};
		
		var _stop = function(id) {
			// stop sound, but remember position if loop is enabled
			var snd = sounds[id];
			if (snd) {
				if (snd.loop) {
					if (snd.isPlaying) {
						snd.lastPosition = snd.position;
						snd.isPlaying = false;
					}
				}
				snd.stop();
			}
		};
		
		var _rewind = function(id) {
			// rewind sound
			var snd = sounds[id];
			if (snd) {
				snd.stop();
				snd.lastPosition = 0;
			}
		};
		
		var _set_volume = function(id, volume) {
			// set volume of sound (0 to 100)
			var snd = sounds[id];
			if (snd) snd.setVolume( volume );
		};
		
		var _set_balance = function(id, balance) {
			// set balance of sound (-100 to 100)
			var snd = sounds[id];
			if (snd) snd.setPan( balance );
		};
		
		var _get_position = function(id) {
			// get current position of playing sound
			var snd = sounds[id];
			if (snd) return snd.position / 1000;
			else return 0;
		};
		
		var _set_position = function(id, pos) {
			var snd = sounds[id];
			if (snd) {
				snd.stop();
				snd.start( pos, 0 );
			}
		};
		
		/*_root._do_cmd = function(cmd) {
			// parse command from JavaScript
			sounds['fireball'].start(0, 0);
		}*/
		
		ExternalInterface.addCallback('_load', this, _load);
		ExternalInterface.addCallback('_play', this, _play);
		ExternalInterface.addCallback('_stop', this, _stop);
		ExternalInterface.addCallback('_rewind', this, _rewind);
		ExternalInterface.addCallback('_set_volume', this, _set_volume);
		ExternalInterface.addCallback('_set_balance', this, _set_balance);
		ExternalInterface.addCallback('_get_position', this, _get_position);
		ExternalInterface.addCallback('_set_position', this, _set_position);
		
		ExternalInterface.call('gAudio.flashNotify', 'flashLoadComplete', true);
	}
	
	/*public function doCommand(cmd) {
		_root._do_cmd(cmd);
	}
	
	static function getInstance() {
		return app;
	}*/
	
	// entry point
	static function main(mc) {
		System.security.allowDomain("*");
		
		app = new SoundManager();
		
		/*_root.jsCommand = '';
		_root.watch("jsCommand", function(prop, oldval, newval) { SoundManager.getInstance().doCommand(newval); } );*/
	}
}
