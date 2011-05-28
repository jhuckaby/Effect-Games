=section #. Static Utility Functions

These are static utility functions, available in the global window namespace.

=section #.#. assert()

=deflist
	Syntax | {BOOLEAN assert( BOOLEAN, STRING )}
	Arguments | Fact, Message

This is a very simple assert function which throws an alert dialog if the boolean argument is false.  It then tries to generate a stack trace (only supported in some browsers) and displays a custom message, if provided.  Finally, it prompts if you want to enter the browser's debugger (only supported in some browsers).  The return value is the boolean passed into the function.  Example:

=syntax js
	assert( 1 + 1 == 2, "Math doesn't work!" );

=section #.#. dumper()

=deflist
	Syntax | {STRING dumper( OBJECT, INTEGER )}
	Arguments | Object, Traverse Levels

This function converts an object (associative array) into pretty-printed JSON, for debugging purposes.  The return is a string which you can {alert()}, or pass to the debugger (see the [article:docs/Local_Development_Guide]).  The first argument is the object to dump, and the optional second argument is the maximum number of levels to traverse down the object tree (for example, if the object contains references to other objects).  The default is 0 levels (do not traverse).  Example:

=syntax js
	alert( dumper(mysprite) );

=section #.#. tweenFrame()

=deflist
	Syntax | {NUMBER tweenFrame( NUMBER, NUMBER, NUMBER, STRING, STRING )}
	Arguments | Start, End, Amount, Mode, Algorithm

This function calculates a [wikipedia:Tweening, Tween] between two points, and returns the in-between value.  For example, this can be used to control animation with "easing".  For details see the [article:docs/Tweening Guide].  Example:

=syntax js
	var x = tweenFrame( 0, 150, 0.5, 'EaseOut', 'Quadratic' );

Here is a more detailed list of the function arguments:

=deflist tweenFrame() Arguments
	start | The starting value for the property.
	end | The ending value for the property.
	amount | This value should be between "{0.0}" and "{1.0}", and sets the position along the animation path.
	mode | The animation mode, one of "{EaseIn}", "{EaseOut}" or "{EaseInOut}".  See the [article:docs/Tweening Guide] for details.
	algorithm | The algorithm name.  See the [article:docs/Tweening Guide] for the full list.

=section #.#. probably()

=deflist
	Syntax | {BOOLEAN probably( NUMBER )}

This calculates a probability based on the number provided (between "{0.0}" and "{1.0}"), and returns {true} or {false}.  For example, passing in "{1.0}" will always return {true}, passing in "{0.0}" will always return {false}, and passing in "{0.5}" will return {true} half of the time, and {false} the other half.  Example:

=syntax js
	if (probably(0.5)) {
		// heads!
	}
	else {
		// tails!
	}

=section #. Effect.ImageLoader

The {Effect.ImageLoader} object is instantiated as a global singleton.  Using this you can communicate directly with the low-level image loading system.

=section #.#. Effect.ImageLoader Methods

=section #.#.#. Effect.ImageLoader.setMaxLoadsPerFrame()

=deflist
	Syntax | {VOID setMaxLoadsPerFrame( INTEGER )}

The Effect Engine loads tile images asynchronously as the level scrolls around.  This value controls how many images are allowed to load per each draw frame.  You may need to adjust this value for your game, depending on how fast it scrolls.  The default value is "{32}".

For example, setting this value too low will cause artifacts to appear when scrolling, as tiles are not loaded quickly enough.  Setting the value too high will cause stuttering, as the browser struggles to load all the images at once.

There is no return value.  Example:

=syntax js
	Effect.ImageLoader.setMaxLoadsPerFrame( 16 );

=section #.#.#. Effect.ImageLoader.getImageSize()

=deflist
	Syntax | {OBJECT getImageSize( STRING )}

This function allows you to query the size of a loaded image.  The response will be an object containing "{width}" and "{height}" properties, set to the pixel width and height of the image.  The values are not affected by the current zoom level, and will both be "{0}" if the image is not loaded.  Example:

=syntax js
	var size = Effect.ImageLoader.getImageSize( '/images/backgrounds/level1.jpg' );
	assert( size.width == 640 );
	assert( size.height == 480 );

=section #. Shortcuts

The following shortcuts are placed into the global window namespace for your convenience:

=table
	Shortcut | Expands to
	{$G} | [api:Effect.Game]
	{$P} | [api:Effect.Port]
	{$A} | [api:Effect.Audio]
	{$I} | [api:Effect.ImageLoader]
	{$T} | [api:Effect.Tween]

Examples:

=syntax js
	$G.logicClock; // shortcut for Effect.Game.logicClock
	$P.getPlane('sprites'); // shortcut for Effect.Port.getPlane('sprites');
	$A.playSound('jump'); // shortcut for Effect.Audio.playSound('jump');

=section #. Debug Tools

These functions are only available if you choose a "Debug" release of the engine, and are only for local development.

=section #.#. Debug.trace()

=deflist
	Availability | Only in "Debug" engine builds
	Syntax | {VOID trace( STRING )}
	Syntax | {VOID trace( STRING, STRING )}

This function logs a debug message to the console, with an optional category.  If called with a single string argument, it uses the "debug" category.  When called with two arguments, the first is the category, and the second is the debug message.  Example:

=syntax js
	Debug.trace( "My debug message!" );
	Debug.trace( "MyCategory", "Another debug message!" );

=section #.#. Debug.categories

=deflist
	Availability | Only in "Debug" engine builds

This object allows you to set which debug categories show up in the debug console.  By default, "all" categories are shown (as specified by the "all" property).  If this property is {false}, then only those categories specified are shown.  Example:

=syntax js
	Debug.categories.all = true; // show everything
	Debug.trace( "MyCategory", "This will be shown!" );
	
	Debug.categories = {
		all: false,
		SomeOtherCategory: true
	};
	Debug.trace( "MyCategory", "This will NOT be shown!" );
	Debug.trace( "SomeOtherCategory", "But this will!" );

=section #.#. Debug.show()

=deflist
	Availability | Only in "Debug" engine builds
	Syntax | {VOID show()}

This shows the debug console window (same as clicking the "Bug" icon in the game toolbar).  Example:

=syntax js
	Debug.show();

=section #.#. SpritePlane.dump()

=deflist
	Availability | Only in "Debug" engine builds
	Syntax | {VOID dump()}

This dumps the properties of all active sprites to the debug console.  This is great for seeing a quick summary of all the active sprite properties, IDs, and positions.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.dump();

=section #.#. Sprite.dump()

=deflist
	Availability | Only in "Debug" engine builds
	Syntax | {VOID dump()}

This dumps all the properties of the sprite to the debug console (includes the ID, X & Y position, and any custom properties).  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.getSprite('mysprite').dump();

=section #.#. Sprite.highlight()

=deflist
	Availability | Only in "Debug" engine builds
	Syntax | {VOID highlight()}

This highlights the sprite by setting its background color to red (doesn't work for opaque sprites).  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.getSprite('mysprite').highlight();
