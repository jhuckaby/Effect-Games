=section #. Effect.Audio

The {Effect.Audio} object is automatically instantiated as a global singleton.  This object is the audio manager, and is how you communicate with the audio system to play sounds, music, and control levels.  Here are all the available public methods, properties and events in the object.

=section #.#. Effect.Audio Methods

=section #.#.#. Effect.Audio.playSound()

=deflist
	Syntax | {VOID playSound( STRING )}

This plays the specified audio track as an effect (meaning, it is stopped and played from beginning, and possibly multiplexed).  To identify the track, sending a path to the asset file including a leading slash, or, if all your sound files have unique filenames, you can just specify the filename sans extension.  There is no return value.  Example:

=syntax js
	Effect.Audio.playSound( '/audio/effects/explosion.mp3' );
	Effect.Audio.playSound( 'jump' );

The audio track must be loaded in order to be played.

=section #.#.#. Effect.Audio.setMasterVolume()

=deflist
	Syntax | {VOID setMasterVolume( NUMBER )}

This sets the master volume, which should be expressed as a floating point decimal between "{0.0}" and "{1.0}".  All category and individual track volumes are governed by the master volume.  This defaults to whatever value you set in the web interface.  There is no return value.  Example:

=syntax js
	Effect.Audio.setMasterVolume( 0.75 );

=section #.#.#. Effect.Audio.setCategoryVolume()

=deflist
	Syntax | {VOID setCategoryVolume( STRING, NUMBER )}
	Arguments | Category ID, Volume

This sets the volume of a particular audio category (one of "{sfx}", "{music}" or "{video}").  The volume should be between "{0.0}" and "{1.0}".  Note that it is still governed by the master volume.  There is no return value.  Example:

=syntax js
	Effect.Audio.setCategoryVolume( 'sfx', 1.0 );
	Effect.Audio.setCategoryVolume( 'music', 0.75 );

=section #.#.#. Effect.Audio.getTrack()

=deflist
	Syntax | {AUDIOTRACK getTrack( STRING )}

This fetches the [Effect.AudioTrack] object for the specified audio track.  To identify the track, sending a path to the asset file including a leading slash, or, if all your sound files have unique filenames, you can just specify the filename sans extension.  Example:

=syntax js
	var track = Effect.Audio.getTrack( 'explosion' );
	track.play();

=section #.#.#. Effect.Audio.quiet()

=deflist
	Syntax | {VOID quiet()}

This immediately silences *all* audio tracks that are currently playing.  There is no return value.  Example:

=syntax js
	Effect.Audio.quiet();

=section #.#.#. Effect.Audio.quietCategory()

=deflist
	Syntax | {VOID quietCategory( STRING )}

This silences all audio tracks that are assigned to a specified category (one of "{sfx}", "{music}" or "{video}").  There is no return value.  Example:

=syntax js
	Effect.Audio.quietCategory( 'music' );

=section #.#. Effect.AudioTrack

Your audio asset files all have their own {AudioTrack} objects.  To get access to these, see the [Effect.Audio.getTrack()] method.

=section #.#.#. Effect.AudioTrack Properties

=section #.#.#.#. Effect.AudioTrack.volume

=deflist
	Data Type | Float
	Access | Read Only

This is the current volume for the audio track (will be between "{0.0}" and "{1.0}"), but the property is read-only.  To set the volume, call [Effect.AudioTrack.setVolume()].

=section #.#.#.#. Effect.AudioTrack.balance

=deflist
	Data Type | Float
	Access | Read Only

This is the current stereo balance for the audio track (will be between "{-1.0}" and "{1.0}"), but the property is read-only.  To set the balance, call [Effect.AudioTrack.setBalance()].

=section #.#.#.#. Effect.AudioTrack.loop

=deflist
	Data Type | Boolean
	Access | Read Only

This boolean will be {true} if the current track is looped, {false} otherwise.  This is read-only.  To set which tracks are looped, use the web interface.

=section #.#.#.#. Effect.AudioTrack.multiplex

=deflist
	Data Type | Boolean
	Access | Read Only

This boolean will be {true} if the current track is multiplexed, {false} otherwise.  This is read-only.  To set which tracks are multiplexed, use the web interface.

=section #.#.#. Effect.AudioTrack Methods

=section #.#.#.#. Effect.AudioTrack.playSound()

=deflist
	Syntax | {VOID playSound()}

This method plays the sound as an effect.  Meaning, it is played from the beginning instead of its current position.  If the sound is multiplexed, a new copy is played.  If not, the current instance is stopped and played again from the beginning.  This is mainly designed for sound effects (not music tracks).  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('explosion');
	track.playSound();

=section #.#.#.#. Effect.AudioTrack.play()

=deflist
	Syntax | {VOID play()}

This methos plays the track from its current position.  Meaning, if you play a sound, then stop it in the middle, then call {play()} again, it will resume from where it left off.  This differs from [Effect.AudioTrack.playSound()] which rewinds the sound each time.  This is not designed for multiplexed sound effects.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.play();

=section #.#.#.#. Effect.AudioTrack.stop()

=deflist
	Syntax | {VOID stop()}

This stops a track that is currently playing (but does not rewind it -- this is more of a "pause" really).  If the track is multiplexed, all instances are stopped.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.stop();

=section #.#.#.#. Effect.AudioTrack.rewind()

=deflist
	Syntax | {VOID rewind()}

This rewinds a track to the beginning.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.rewind();

=section #.#.#.#. Effect.AudioTrack.setVolume()

=deflist
	Syntax | {VOID setVolume( NUMBER )}

This sets the volume of the current track.  Specify a number between "{0.0}" (silent) and "{1.0}" (full volume).  Note that the volume is still governed by the category and master volume.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.setVolume( 0.5 );

=section #.#.#.#. Effect.AudioTrack.setBalance()

=deflist
	Syntax | {VOID setBalance( NUMBER )}

This sets the stereo balance of the current track.  Specify a number between "{-1.0}" (full left), to "{0.0}" (center), to "{1.0}" (full right).  Note that stereo panning only works on some browsers.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.setBalance( 1.0 ); // full right speaker

=section #.#.#.#. Effect.AudioTrack.isPlaying()

=deflist
	Syntax | {BOOLEAN isPlaying()}

This method returns {true} if the track is currently playing, {false} otherwise.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	if (track.isPlaying()) {
		// track is playing!
	}

=section #.#.#.#. Effect.AudioTrack.getPosition()

=deflist
	Syntax | {NUMBER getPosition()}

This returns the current playhead position of the track.  The return value is the number of seconds from the beginning of the track (will be a floating point decimal for sub-second precision).  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	var pos = track.getPosition();

=section #.#.#.#. Effect.AudioTrack.setPosition()

=deflist
	Syntax | {OBJECT setPosition( NUMBER )}

This sets the current playhead position of the track, in seconds (can be a floating point decimal for sub-second precision).  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.setPosition( 5.0 ); // 5 seconds into track

=section #.#.#.#. Effect.AudioTrack.fadeIn()

=deflist
	Syntax | {VOID fadeIn( INTEGER, STRING, STRING )}
	Arguments | Duration, Tween Mode, Tween Algorithm

This asynchronously fades the track in, for the specified duration (in logic frames).  The track is started if it isn't playing, and the volume starts at "{0.0}", proceeding all the way to "{1.0}" (or whatever you had the track volume set at before).  The tween library is used for this (see [article:docs/Tweening Guide), so you can pass an optional tween mode and algorithm.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.fadeIn( 60, 'EaseInOut', 'Quadratic' );

=section #.#.#.#. Effect.AudioTrack.fadeOut()

=deflist
	Syntax | {VOID fadeOut( INTEGER, STRING, STRING )}
	Arguments | Duration, Tween Mode, Tween Algorithm

This fades the track out, for the specified duration (in logic frames).  The track is stopped once it reaches volume "{0.0}".  The volume starts at its current level.  If the track is not playing, the fade does not occur.  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.fadeOut( 60, 'EaseInOut', 'Quadratic' );

=section #.#.#.#. Effect.AudioTrack.crossfade()

=deflist
	Syntax | {VOID crossfade( STRING, INTEGER, STRING, STRING }}
	Arguments | Target Audio Track ID, Duration, Tween Mode, Tween Algorithm

This performs an asynchronous "crossfade" between two tracks.  Meaning, the current track is faded out, while simultaneously another track is faded in.  The target track is specified by its filename (or asset path).  The duration is expressed in frames.  You can optionally specify a tween mode and algorithm, to control the progression of the volume slides (see [article:docs/Tweening Guide]).  There is no return value.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.crossfade( 'music2', 60, 'EaseInOut', 'Quadratic' );

=section #.#.#. Effect.AudioTrack Events

Here are the events you can hook on each audio track:

=section #.#.#.#. Effect.AudioTrack.onEnded

This event fires when the sound reaches the end after being played.  You can use this to take action after a sound completes.  Note that calling {stop()} on a track does not trigger this event -- the sound must reach its end naturally.  Also, this event will |only| be fired if the sound is |not| looped.  Example:

=syntax js
	var track = Effect.Audio.getTrack('music');
	track.addEventListener( 'onEnded', function() {
		// sound ended!
	} );
