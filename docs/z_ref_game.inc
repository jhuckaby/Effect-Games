=section #. Effect.Game

The {Effect.Game} object is automatically instantiated as a global singleton.  You should use this object when communicating with the engine.  Here are all the available public methods, properties and events in the object.

=section #.#. Effect.Game Methods

=section #.#.#. Effect.Game.setTargetFPS()

=deflist
	Syntax | {VOID setTargetFPS( INTEGER )}

This sets the desired frames per second, which the engine will attempt to achieve.  Defaults to whatever value you set in the web interface.  There is no return value.  Example:

=syntax js
	Effect.Game.setTargetFPS( 30 );

=section #.#.#. Effect.Game.setSkipFrames()

=deflist
	Syntax | {VOID setSkipFrames( BOOLEAN )}

This sets the desired algorithm for how to deal with dropped frames (this can happen if the desired frame rate is set too high, or the user's PC is too slow to keep up).  Pass {true} to skip frames to maintain the current game speed, or {false} to render every frame regardless, which will appear slower but remain smooth.  Defaults to whatever you selected in the web interface.  There is no return value.  Example:

=syntax js
	Effect.Game.setSkipFrames( true );

=section #.#.#. Effect.Game.setStateHandler()

=deflist
	Syntax | {VOID setStateHandler( STRING, FUNCTION )}
	Arguments | Handler Name, Function Callback

This registers a state handler function with a custom named state.  You can register as many states as you like, and set which state is active by using the [Effect.Game.setState()] function.  For each iteration through the logic loop the current active state handler function will be invoked.  There is no return value.  Example:

=syntax js
	Effect.Game.setStateHandler( 'idle', function() {...} );

For your handler function you may pass a function reference (as shown above), a string containing a global function name, an array containing an object and a string function name, or raw JavaScript code to be eval()ed.

=section #.#.#. Effect.Game.setState()

=deflist
	Syntax | {VOID setState( STRING )}

This sets the current "state", meaning the name of the state handler you previously registered with [Effect.Game.setStateHandler()].  Each iteration through the logic loop the engine will invoke the current state handler.  Defaults to {null} (no state).  There is no return value.  Example:

=syntax js
	Effect.Game.setState( 'idle' );

There are no preregistered states -- this system is entirely for you to populate and use.

=section #.#.#. Effect.Game.getState()

=deflist
	Syntax | {STRING getState()}

This returns the current state name, meaning the name of the state handler you previously set active with [Effect.Game.setState()].  Example:

=syntax js
	var state = Effect.Game.getState();

=section #.#.#. Effect.Game.getTargetFPS()

=deflist
	Syntax | {NUMBER getTargetFPS()}

This returns the target (i.e. desired) frames per second, as set in the web interface, or by calling [Effect.Game.setTargetFPS()].  Example:

=syntax js
	var fps = Effect.Game.getTargetFPS();

=section #.#.#. Effect.Game.getAverageFPS()

=deflist
	Syntax | {NUMBER getAverageFPS()}

This returns the average frames per second being achieved in the engine (only applies while the engine is running).  You can clear the average historical data by calling [Effect.Game.resetAverageFPS()].  Example:

=syntax js
	var fps = Effect.Game.getAverageFPS();

=section #.#.#. Effect.Game.getCurrentFPS()

=deflist
	Syntax | {NUMBER getCurrentFPS()}

This returns the current frames per second being achieved in the engine (only applies while the engine is running).  This is updated once per second.  Example:

=syntax js
	var fps = Effect.Game.getCurrentFPS();

=section #.#.#. Effect.Game.resetAverageFPS()

=deflist
	Syntax | {VOID resetAverageFPS()}

This resets the average frames per second historical data.  There is no return value.  Example:

=syntax js
	Effect.Game.resetAverageFPS();

=section #.#.#. Effect.Game.addEventListener()

=deflist
	Syntax | {VOID addEventListener( STRING, FUNCTION )}
	Arguments | Handler Name, Function Callback

This sets a user defined handler function for one of the engine hooks.  You can either make up your own handlers which you can fire yourself (see [Effect.Game.fireEvent()]), or use on of the built-in handlers.  See [Effect.Game Events] for a list of all the special hooks you can define.  There is no return value.  Example:

=syntax js
	Effect.Game.addEventListener( 'onLoadGame', function() {...} );

The event name is not case sensitive, and you can omit the "on" prefix if you want.

For your handler function you may pass a function reference (as shown above), a string containing a global function name, an array containing an object and a string function name, or  raw JavaScript code to be eval()ed.  You can register multiple functions for the same event (just call the function multiple times).

Also note that you can invent your own event names here, essentially defining new event types, that you can fire with [Effect.Game.fireEvent()], and/or schedule to fire later with [Effect.Game.scheduleEvent()].

=section #.#.#. Effect.Game.removeEventListener()

=deflist
	Syntax | {VOID removeEventListener( STRING, FUNCTION )}
	Arguments | Function Name, Handler Callback

This clears a previously defined user handler function for one of the engine hooks.  See [Effect.Game Events] for a list of all the possible hooks you can define.  There is no return value.  Example:

=syntax js
	Effect.Game.removeEventListener( 'onLoadGame', my_function_ref );

=section #.#.#. Effect.Game.fireEvent()

=deflist
	Syntax | {BOOLEAN fireEvent( STRING, ... )}

This immediately invokes an event that you previously registered with [Effect.Game.addEventListener()].  It is recommended that you only use this function to fire your own events, not the built-in engine events.  If any event handler registered for the event returns {false}, then {fireHandler()} also returns {false} (and stops calling handlers).  Otherwise, it returns {true}.  Example:

=syntax js
	Effect.Game.addEventListener( 'my_custom_hook', my_function );
	Effect.Game.fireEvent( 'my_custom_hook', 123, 'abc' );
	
	function my_function(a, b) {
		// a == 123, b == 'abc'
	}

As you can see, you can also pass a variable argument list to [Effect.Game.fireEvent()], which gets propagated to your function.

=section #.#.#. Effect.Game.loadLevel()

=deflist
	Syntax | {VOID loadLevel( STRING, FUNCTION, BOOLEAN )}
	Arguments | Level ID, Callback, Activate

This loads a level as defined by the alphanumeric identifier passed to the function.  The level must have been previously created in the web interface.  The other two arguments are a callback function to invoke when the load completes, and a {Boolean} specifying whether to "activate" the level once it is loaded.  Activation means the level data is placed into the world, so its ready to play.  This defaults to {true}.  Example:

=syntax js
	Effect.Game.loadLevel( 'level1', my_level_loaded, true );
	
	function my_level_loaded() {
		// level loaded and activated, ready to play!
	}

=section #.#.#. Effect.Game.saveLevelState()

=deflist
	Syntax | {VOID saveLevelState()}

This freezes the current state of the level (all planes, all sprites and tiles) to an in-memory storage area, which can later be restored with [Effect.Game.restoreLevelState()].  This is useful for saving the initial state of the loaded level, so you can revert back if the player loses a life.  The data is saved internally, and there is no return value.  Example:

=syntax js
	Effect.Game.saveLevelState();

=section #.#.#. Effect.Game.restoreLevelState()

=deflist
	Syntax | {VOID restoreLevelState()}

This restores a previously saved level state (all planes, all sprites and tiles) from the in-memory storage area.  See [Effect.Game.saveLevelState()].  Example:

=syntax js
	Effect.Game.restoreLevelState();

=section #.#.#. Effect.Game.setActiveLevel()

=deflist
	Syntax | {VOID setActiveLevel( STRING )}

This sets the current active level to the one specified.  The level should have been previously loaded with [Effect.Game.loadLevel()], or preloaded.  Activating a level means that all its layers (planes) are created, and filled with content.  There is no return value.  Example:

=syntax js
	Effect.Game.setActiveLevel( 'MyLevel1' );

=section #.#.#. Effect.Game.getLevelName()

=deflist
	Syntax | {STRING getLevelName()}

This returns the current active level name, as set by a call to [Effect.Game.loadLevel()] (passing {true} to activate the level), or [Effect.Game.setActiveLevel()].  Example:

=syntax js
	var level_name = Effect.Game.getLevelName();

=section #.#.#. Effect.Game.getLevelProps()

This returns an associative array of level properties for the current active level, as set by a call to [Effect.Game.loadLevel()] (passing {true} to activate the level), or [Effect.Game.setActiveLevel()].  See the [article:docs/Level Editor Guide] for details on level properties.  Example:

=syntax js
	var props = Effect.Game.getLevelProps();

=section #.#.#. Effect.Game.setLevelEnvironment()

=deflist
	Syntax | {VOID setLevelEnvironment( STRING, STRING )}
	Arguments | Level ID, Environment ID

This function changes the environment for the specified level.  For example, if you want to load the same level but with a different environment (say, for a different simulated time of day), you can switch the environment just before calling [Effect.Game.loadLevel()].  Example:

=syntax js
	Effect.Game.setLevelEnvironment( 'MyLevel1', 'MyCustomEnv' );
	Effect.Game.loadLevel( 'MyLevel1', function() {
		// level is loaded, and with a custom environment
	} );

The environment must be previously created using the Environment Editor.  For details, see the [article:docs/Level Editor Guide].

=section #.#.#. Effect.Game.pause()

=deflist
	Syntax | {VOID pause()}

This stops the main loop, and fires an [Effect.Game.onPause] event.  There is no return value.  Example:

=syntax js
	Effect.Game.pause()

Typical usage of this would be to call it in a key handler, if you assign a key control for "pause".

=section #.#.#. Effect.Game.resume()

=deflist
	Syntax | {VOID resume()}

This resumes the main loop after being paused, and fires an [Effect.Game.onResume] event.  There is no return value.  Example:

=syntax js
	Effect.Game.resume();

=section #.#.#. Effect.Game.toggle()

=deflist
	Syntax | {VOID toggle()}

This toggles the main loop between running and paused.  There is no return value.  Example:

=syntax js
	Effect.Game.toggle();

=section #.#.#. Effect.Game.step()

=deflist
	Syntax | {VOID step()}

This runs exactly one iteration through both the logic and draw loops.  This is designed for debugging, and can only be called when the engine is paused.  Using this you can slowly step through frames, to troubleshoot issues or fine tune animation.  There is no return value.  Example:

=syntax js
	Effect.Game.step();

=section #.#.#. Effect.Game.scheduleEvent()

=deflist
	Syntax | {VOID scheduleEvent( INTEGER, ... )}

This allows you to schedule a handler function to be called a certain number of logic frames in the future.  The handler function should have been previously registered with [Effect.Game.addEventListener()].  The time specification is in the number of frames, so the amount of actual perceived time depends on your current frames per second (see [Effect.Game.setTargetFPS()]).  Please note that you are passing the |name of a hook| that you previously registered a handler for.  Example:

=syntax js
	Effect.Game.addEventListener( 'my_event', my_function );
	Effect.Game.scheduleEvent( 30, 'my_event', 123, 'abc' );
	
	function my_function(a, b) {
		// this will be called 30 frames later!
		// a == 123, b == 'abc'
	}

Note that you can pass a variable argument list to [Effect.Game.scheduleEvent()] which is stored and passed to your function when it is eventually called.

Instead of registering an event type and then invoking it, you can simply pass a function reference directly to [Effect.Game.scheduleEvent()] as the second argument, making it work somewhat like the built-in JavaScript {setTimeout()}.  Example:

=syntax js
	Effect.Game.scheduleEvent( 30, function() {
		// this code will execute 30 logic frames in the future
	} );

Keep in mind that time only passes in this context while the engine is running (see [Effect.Game.pause()] and [Effect.Game.resume()]).  This is much different than setting a JavaScript {setTimeout()}, as the time is based on frames, not milliseconds, and you can control when time is passing or frozen.

=section #.#.#. Effect.Game.clearSchedule()

=deflist
	Syntax | {VOID clearSchedule()}

This clears the entire schedule of events (anything you previously scheduled with [Effect.Game.scheduleEvent()]).  There is no return value.  Example:

=syntax js
	Effect.Game.clearSchedule();

=section #.#.#. Effect.Game.setKeyHandler()

=deflist
	Syntax | {VOID setKeyHandler( STRING, OBJECT )}
	Arguments | Key Control ID, Handler Object

This sets a custom handler |object| for a particular key control that you defined ({move_left}, {move_right}, {button_1}, etc.).  Instead of passing a function reference to receive events, you pass in an object (typically a {Sprite}) that has {onKeyDown()} and/or {onKeyUp()} methods defined.  There is no return value.  Example:

=syntax js
	Effect.Game.setKeyHandler( 'move_left', my_sprite );
	Effect.Game.setKeyHandler( 'move_right', my_sprite );
	
	my_sprite.onKeyDown = function(which) {
		// called when player presses a key
		// which will be 'move_left' or 'move_right'
	};

Notice that you can assign multiple key controls to the same object.  However please note that [api:Effect.Game.setKeyHandler()] cannot be called until the game is loaded.

=section #.#.#. Effect.Game.resetKeys()

=deflist
	Syntax | {VOID resetkeys()}

This resets the "down" state of all keys, returning them to their natural "up" state.  It may be useful to call this when you interrupt the game to load a new level (when your characters state may change).  There is no return value.  Example:

=syntax js
	Effect.Game.resetKeys();

=section #.#.#. Effect.Game.setKeysActive()

=deflist
	Syntax | {VOID setKeysActive( BOOLEAN )}

This controls whether keyboard activity actually triggers events in the engine.  This is typically enabled (except while paused or loading), but your game may need to disable this for special situations.  Pass {true} to enable keys, or {false} to disable them.  There is no return value.  Example:

=syntax js
	Effect.Game.setKeysActive( false );

=section #.#.#. Effect.Game.setMouseActve()

=deflist
	Syntax | {VOID setMouseActive( BOOLEAN )}

This controls whether mouse activity actually triggers events in the engine.  This is typically enabled (except while paused or loading), but your game may need to disable this for special situations.  Pass {true} to enable the mouse, or {false} to disable them.  There is no return value.  Example:

=syntax js
	Effect.Game.setMouseActve( false );

=section #.#.#. Effect.Game.isKeyDown()

=deflist
	Syntax | {BOOLEAN isKeyDown( STRING )}

This returns {true} if the key control specified is currently being held down, {false} otherwise.  You pass the name of a key control here, as previously defined in the web interface.  Example:

=syntax js
	if (Effect.Game.isKeyDown('move_left')) {
		// move player to the left!
	}

=section #.#.#. Effect.Game.setResumeKey()

=deflist
	Syntax | {VOID setResumeKey( STRING )}

This defines a key control as the "resume" key.  This is required because normal keyboard capture is disabled when the game is paused, but you may want one of your keys to resume the game.  There is no return value.  Example:

=syntax js
	Effect.Game.setResumeKey( 'start' );

=section #.#.#. Effect.Game.preloadImage()

=deflist
	Syntax | {VOID preloadImage( STRING )}
	Arguments | URL

This allows you to preload any number of images so they are loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which images are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadImage( '/images/backgrounds/bkgnd1.jpg' );
	Effect.Game.preloadImage( '/images/backgrounds/bkgnd2.jpg' );

=section #.#.#. Effect.Game.preloadAudio()

=deflist
	Syntax | {VOID preloadAudio( STRING )}
	Arguments | URL

This allows you to preload an audio track so it is loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which audio tracks are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadAudio( '/audio/effects/explosion.mp3' );
	Effect.Game.preloadAudio( '/audio/music/title.mp3' );

=section #.#.#. Effect.Game.preloadVideo()

=deflist
	Syntax | {VOID preloadVideo( STRING )}
	Arguments | URL

This allows you to preload a video track so it is loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which video tracks are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadVideo( '/video/intro.mp4' );
	Effect.Game.preloadVideo( '/video/title.mp4' );

=section #.#.#. Effect.Game.preloadLevel()

=deflist
	Syntax | {VOID preloadLevel( STRING )}
	Arguments | Level ID

This allows you to preload a level so it is loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which levels are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadLevel( 'MyLevel1' );
	Effect.Game.preloadLevel( 'MyLevel2' );

=section #.#.#. Effect.Game.preloadXML()

=deflist
	Syntax | {VOID preloadXML( STRING )}
	Arguments | URL

This allows you to preload an XML asset so it is loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which resources are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadXML( '/text/strings.xml' );
	Effect.Game.preloadXML( '/text/config.xml' );

=section #.#.#. Effect.Game.preloadFont()

=deflist
	Syntax | {VOID preloadFont( STRING )}
	Arguments | Font ID

This allows you to preload a Bitmap Font so it is loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which fonts are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadFont( 'MyFont1' );
	Effect.Game.preloadFont( 'MyFont2' );

=section #.#.#. Effect.Game.preloadSprite()

=deflist
	Syntax | {VOID preloadSprite( STRING )}
	Arguments | Sprite Class ID

This allows you to preload all the resources attached to a sprite, so they are loaded and ready when the [Effect.Game.onLoadGame] event fires.  This technically shouldn't ever be needed, because you can define which sprites are preloaded in the web interface.  But it is included for completeness.  Example:

=syntax js
	Effect.Game.preloadSprite( 'MySprite1' );
	Effect.Game.preloadSprite( 'MySprite2' );

=section #.#. Effect.Game Properties

Here are the public properties you can access via the {Effect.Game} singleton object.

=section #.#.#. Effect.Game.logicClock

=deflist
	Data Type | Integer
	Access | Read Only

This contains the current frame counter for the logic loop.  This starts at 0, and is incremented once for every iteration through the loop.  Example:

=syntax js
	var clock = Effect.Game.logicClock;
	alert("We're on logic frame #" + clock);

=section #.#.#. Effect.Game.drawClock

=deflist
	Data Type | Integer
	Access | Read Only

This contains the current frame counter for the draw loop.  This starts at 0, and is incremented once for every iteration through the loop.  Example:

=syntax js
	var clock = Effect.Game.drawClock;
	alert("We're on draw frame #" + clock);

=section #.#. Effect.Game Events

Here are all the built-in hooks you can register handlers for using [Effect.Game.addEventListener()].  Note that you can also define your own handlers, but beware of name collision with built-in handlers.

When you call the [Effect.Game.addEventListener()] method, you can pass a function reference, a string containing a global function name, an array containing an object and a string function name, or raw JavaScript code to be eval()ed.

=section #.#.#. Effect.Game.onInit

This event fires when the engine is initialized (but before anything is loaded).  You should never need to hook this event, but it is included for completeness.  Example:

=syntax js
	Effect.Game.addEventListener( 'onInit', function() {
		// game engine is initialized
	} )

=section #.#.#. Effect.Game.onLoadGame

This event fires when your game has completed its initial loading process (all preloads complete).  At this point it is typical to load a level using [Effect.Game.loadLevel()] or create layers and graphics.  Example:

=syntax js
	Effect.Game.addEventListener( 'onLoadGame', my_load_handler );
	
	function my_load_handler() {
		// game is loaded, now let's load a level...
		Effect.Game.loadLevel( 'level1', my_level_handler );
	}
	
	function my_level_handler() {
		// now both game and level are loaded!  time to play!
	}

=section #.#.#. Effect.Game.onInitLevel

This event fires when your level has completed loaded, but has not yet been activated.  This should only be needed in very special cases, as most of the time [Effect.Game.onLoadLevel] is all you need.  Example use:

=syntax js
	Effect.Game.addEventListener( 'onInitLevel', function() {
		// level loaded, but is not yet activated
	} );

Please note that this handler will fire before the level planes and sprites are created.  However, you can get access to level properties via [Effect.Game.getLevelProps()].

=section #.#.#. Effect.Game.onLoadLevel

This event fires when your level has completed loaded, and is 100% ready to run.  However, you shouldn't need to explicitly hook this event -- just pass a callback function to [Effect.Game.loadLevel()].  Example:

=syntax js
	Effect.Game.addEventListener( 'onLoadLevel', function() {
		// level loaded, let's play!
	} );

=section #.#.#. Effect.Game.onLogic

This event fires for every single iteration through the logic loop.  This typically happens many times per second, up to your desired frame rate (see [Effect.Game.setTargetFPS()]).  Example:

=syntax js
	Effect.Game.addEventListener( 'onLogic', function(clock) {
		// this will be called a lot
	} );

Your callback function is passed the current logic clock (see [Effect.Game.logicClock]).

=section #.#.#. Effect.Game.onDraw

This event fires for every single iteration through the draw loop.  This typically fires many times per second, up to your desired frame rate (see [Effect.Game.setTargetFPS()]).  However, this may not be called for every logic loop iteration, depending on if the engine has to skip frames to maintain the desired frame rate (see [Effect.Game.setSkipFrames()]).  It is not typically necessary to define a handler for this event, but it is included for completeness.  Example:

=syntax js
	Effect.Game.addEventListener( 'onDraw', function(clock) {
		// this will be called a lot
	} );

Your callback function is passed the current draw clock (see [Effect.Game.drawClock]).

=section #.#.#. Effect.Game.onKeyDown

This event fires when ANY key is pressed on the keyboard, regardless if there is a handler defined for it or not.  This is a low-level handler that is not typically used -- it is better to define handler objects for your key controls -- see [Effect.Game.setKeyHandler()].  Your handler function will be passed the key control name (if one matched), and the raw {keyCode}.  Example:

=syntax js
	Effect.Game.addEventListener( 'onKeyDown', function(key_name, key_code) {
		// a key was pressed
		alert("Key pressed: " + key_name);
	} );

=section #.#.#. Effect.Game.onKeyUp

This event fires when ANY key is released on the keyboard, regardless if there is a handler defined for it or not.  This is a low-level handler that is not typically used -- it is better to define handler objects for your key controls -- see [Effect.Game.setKeyHandler()].  Your handler function will be passed the key control name (if one matched), and the raw {keyCode}.  Example:

=syntax js
	Effect.Game.addEventListener( 'onKeyUp', function(key_name, key_code) {
		// a key was released
		alert("Key released: " + key_name);
	} );

=section #.#.#. Effect.Game.onPause

This event is fired when the user clicks on the pause button in the toolbar (or you yourself calls [Effect.Game.pause()]).  A typical action here is to silence all sounds and music tracks, and play a short "pause" sound effect.  Example:

=syntax js
	Effect.Game.addEventListener( 'onPause', function() {
		// silence all audio
		Effect.Audio.quiet();
		
		// play a short sound effect
		Effect.Audio.playSound( 'pause.mp3' );
	} );

=section #.#.#. Effect.Game.onResume

This event is fired when the main loop resumes after being paused.  This can happen when the user clicks the resume button on the toolbar, or hits your resume key (see [Effect.Game.setResumeKey()]), or clicks in the main display area.  A typical action here is to resume any music tracks that were playing when the game was paused (this does not happen automatically), and possibly play a sound effect.  Example:

=syntax js
	Effect.Game.addEventListener( 'onPause', function() {
		// resume main game music
		Effect.Audio.getTrack('music.mp3').play();
		
		// play a short sound effect
		Effect.Audio.playSound( 'resume.mp3' );
	} );

=section #.#.#. Effect.Game.onDisableMusic

This event fires when the user disables music by clicking on the music toggle icon in the game toolbar.  No action needs to be taken here, as all music tracks are automatically stopped if they are playing.  You could, for example, play a sound effect here.  Example:

=syntax js
	Effect.Game.addEventListener( 'onDisableMusic', function() {
		// play a short sound effect
		Effect.Audio.playSound( 'music_disable.mp3' );
	} );

=section #.#.#. Effect.Game.onEnableMusic

This event is fired when the user enables music by clicking on the toggle icon in the game toolbar.  A typical action here is to resume any music tracks that were playing when the music was disabled (this does not happen automatically).

=syntax js
	Effect.Game.addEventListener( 'onEnableMusic', function() {
		// resume main game music
		Effect.Audio.getTrack('music.mp3').play();
	} );

=section #.#.#. Effect.Game.onDisableSound

This event fires when the user disables sound completely by clicking on the "speaker" toggle icon in the game toolbar.  No action needs to be taken here, as all sound is automatically disabled.  The event is just included for completeness.  Example:

=syntax js
	Effect.Game.addEventListener( 'onDisableSound', function() {
		// sound was disabled
	} );

=section #.#.#. Effect.Game.onEnableSound

This event fires when the user enables sound by clicking on the "speaker" toggle icon in the game toolbar.  No action needs to be taken here, as the [Effect.Game.onEnableMusic] event is also fired.  The event is just included for completeness.  Example:

=syntax js
	Effect.Game.addEventListener( 'onEnableSound', function() {
		// sound was enabled
	} );
