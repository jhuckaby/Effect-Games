=section #. Effect.Port

The {Effect.Port} object is automatically instantiated as a global singleton.  This is how you interact with the main display area.  The port contains all the layers which contain your game graphics.  Here are the public methods and events:

=section #.#. Effect.Port Properties

=section #.#.#. Effect.Port.portWidth

=deflist
	Data Type | Number
	Access | Read Only

This property contains the width of the main display port in global world pixels (not affected by zoom).  For example, if your port display size is 640x480, but the user has zoomed the window to 2X, the {portWidth} property will still be 640.  This is a read-only property.

=section #.#.#. Effect.Port.portHeight

=deflist
	Data Type | Number
	Access | Read Only

This property contains the height of the main display port in global world pixels (not affected by zoom).  For example, if your port display size is 640x480, but the user has zoomed the window to 2X, the {portHeight} property will still be 480.  This is a read-only property.

=section #.#.#. Effect.Port.virtualWidth

=deflist
	Data Type | Number
	Access | Read Only

This property contains the full pixel width of the game world, end to end (unaffected by zoom, always measured at native 1X size).  This defaults to the width of the main display port, but is automatically set by loading levels.  You can also set it manually by calling [Effect.Port.setVirtualSize()].  This is a read-only property.

=section #.#.#. Effect.Port.virtualHeight

=deflist
	Data Type | Number
	Access | Read Only

This property contains the full pixel height of the game world, end to end (unaffected by zoom, always measured at native 1X size).  This defaults to the height of the main display port, but is automatically set by loading levels.  You can also set it manually by calling [Effect.Port.setVirtualSize()].  This is a read-only property.

=section #.#.#. Effect.Port.scrollX

=deflist
	Data Type | Number
	Access | Read Only

This property contains the current horizontal scroll offset into the game world.  This defaults to "0", and can be set by [Effect.Port.setScroll()] or [Effect.Port.follow()].  This is a read-only property.

=section #.#.#. Effect.Port.scrollY

=deflist
	Data Type | Number
	Access | Read Only

This property contains the current vertical scroll offset into the game world.  This defaults to "0", and can be set by [Effect.Port.setScroll()] or [Effect.Port.follow()].  This is a read-only property.

=section #.#.#. Effect.Port.backgroundOffsetX

=deflist
	Data Type | Number
	Access | Read Only

If your main display port has a background image set, its scrolling behavior is configured in the web interface, and automatically animated as you scroll around the game world.  However, you can also offset the scroll position by calling [Effect.Port.setBackgroundOffset()].  This property holds the current horizontal background image scroll offset, and is read only.

=section #.#.#. Effect.Port.backgroundOffsetY

=deflist
	Data Type | Number
	Access | Read Only

If your main display port has a background image set, its scrolling behavior is configured in the web interface, and automatically animated as you scroll around the game world.  However, you can also offset the scroll position by calling [Effect.Port.setBackgroundOffset()].  This property holds the current vertical background image scroll offset, and is read only.

=section #.#. Effect.Port Methods

=section #.#.#. Effect.Port.setBackgroundColor()

=deflist
	Syntax | {VOID setBackgroundColor( STRING )}

This sets the port background color to the specified 6-character hexadecimal RGB value.  It is not typically necessary to call this method, as loading levels automatically sets all portal background colors to their desired values.  Example:

=syntax js
	Effect.Port.setBackgroundColor( '#000000' ); // black

The color specification should include a hash (#) symbol before the hexadecimal value.

=section #.#.#. Effect.Port.setBackground()

=deflist
	Syntax | {VOID setBackground( OBJECT )}

This sets the portal background behavior, specified as an object with various elements to control the image, looping, scroll speed, etc.  It is not typically necessary to call this method, as loading levels automatically sets all portal background behaviors.  Example:

=syntax js
	Effect.Port.setBackground({
		color: '#FFFFFF',
		url: 'my_image.jpg',
		xMode: 'infinite',
		yMode: 'fit',
		xSpeed: 0.5,
		ySpeed: 0.5
	});

As you can see, the function takes an object with several properties.  Here are descriptions of each:

=deflist
	{color} | Solid color background drawn behind image (if applicable).  Should be a 6-digit hexadecimal RGB specification, e.g. "#00000".
	{url} | Image background filename (automatically adds prefix).  Image must be fully loaded and ready.
	{xMode} | Behavior for horizontal scrolling.  Possible values are "{infinite}" or "{fit}".  Explained below.
	{yMode} | Behavior for vertical scrolling.  Possible values are "{infinite}" or "{fit}".  Explained below.
	{xSpeed} | The horizontal scrolling speed of the background, for when the "{xMode}" is "{infinite}".  Values less than "{1.0}" will be slower than foreground layers, and values greater than "{1.0}" will be faster.  This defaults to "{1.0}".
	{ySpeed} | The vertical scrolling speed of the background, for when the "{yMode}" is "{infinite}".  Values less than "{1.0}" will be slower than foreground layers, and values greater than "{1.0}" will be faster.  This defaults to "{1.0}".

For the behavior constants used in {xMode} and {yMode}, here are the possible values with explanations:

=deflist
	{infinite} | Loops the background infinitely, repeating the image over and over.
	{fit} | Automatically fits the image to the virtual size of the portal (see [Effect.Port.setVirtualSize()]).

=section #.#.#. Effect.Port.setBackgroundOffset()

=deflist
	Syntax | {VOID setBackgroundOffset( NUMBER, NUMBER )}
	Arguments | X Offset, Y Offset

This function allows you to control the exact background image scroll offset.  If your main display port has a background image set, its scrolling behavior is configured in the web interface, and automatically animated as you scroll around the game world.  However, you can also offset the scroll position by calling this function, and passing in horizontal and vertical offset values.  This is useful for custom background animation that is not tied to the global world scroll position.  Example:

=syntax js
	Effect.Port.setBackgroundOffset( 50, 50 );

Please note that you must be careful when using this with "fit" mode (see [Effect.Port.setBackground()] above).  You can cause the background image to scroll so that it is no longer visible.  Make sure you know the size and predefined background image behavior before using this.

=section #.#.#. Effect.Port.setBackgroundOpacity()

=deflist
	Syntax | {VOID setBackgroundOpacity( NUMBER )}

This allows you to set the background image opacity, if a background image is set (see [Effect.Port.setBackground()] above).  The background image actually sits just on top of the background image color, and you can "fade" it out to the color if you want.  Pass in a value between "0.0" and "1.0".  Example:

=syntax js
	Effect.Port.setBackgroundOpacity( 0.5 );

Note that this is only designed for opaque background images.  If you have a PNG background image with alpha transparency, certain browsers (namely IE and Chrome) will not render the image properly at opacity values other than "1.0".

=section #.#.#. Effect.Port.attach()

=deflist
	Syntax | {VOID attach( PLANE )}

This attaches a plane (sprite plane, tile plane, etc.) to the portal, so it can display its content and receive events.  There is no return value.  Example:

=syntax js
	var plane = new SpritePlane( 'sprites' );
	Effect.Port.attach( plane );

=section #.#.#. Effect.Port.remove()

=deflist
	Syntax | {VOID remove( STRING )}
	Syntax | {VOID remove( OBJECT )}

This removes a plane that was previously attached to the port.  All the graphics will be destoyed, and the plane will no longer receive logic or draw events.  You can either pass the plane's ID, or a reference to the object itself.  There is no return value.  Example:

=syntax js
	Effect.Port.remove( 'sprites' );

=section #.#.#. Effect.Port.removeAll()

=deflist
	Syntax | {VOID removeAll()}

This removes *all* planes from the main port, and removes all their graphical elements.  There is no return value.  Example:

=syntax js
	Effect.Port.removeAll();

=section #.#.#. Effect.Port.getPlane()

=deflist
	Syntax | {OBJECT getPlane( STRING )}

This fetches the plane by its ID, and returns a reference to the object.  The plane must have been previously attached using [Effect.Port.attach()].  Using this method you don't have to create global variables for your planes.  Example:

=syntax js
	var splane = Effect.Port.getPlane( 'sprites' );

=section #.#.#. Effect.Port.setVirtualSize()

=deflist
	Syntax | {VOID setVirtualSize( 4096, 4096 )}

This sets the virtual size of the world, in pixels.  The virtual size is the total scrollable area in your level.  The arguments are width, then height, in that order.  This is automatically set when your levels are loaded, so it is not typically set manually.  There is no return value.  Example:

=syntax js
	Effect.Port.setVirtualSize( 4096, 4096 );

=section #.#.#. Effect.Port.setScroll()

=deflist
	Syntax | {VOID setScroll( INTEGER, INTEGER )}

This sets the horizontal and vertical scroll position for the virtual world camera.  This is how scrolling is achieved in your game.  The arguments are width, then height, in that order.  For example, if you want the camera to follow your character, then set these to values that will keep the character centered in the middle.  There is no return value.  Example:

=syntax js
	Effect.Port.setScroll( 0, 0 );

=section #.#.#. Effect.Port.follow()

=deflist
	Syntax | {VOID follow( OBJECT, NUMBER )}
	Arguments | Sprite, Speed

This allows you to have the port "follow" a sprite, by setting the horizontal and vertical scroll to center itself around the sprite.  You can also specify a speed at which to follow ("{0.0}" to "{1.0}"), so the virtual camera appears to "lag" behind a bit.  The idea is to call this for every iteration through the logic (or draw) loop.  There is no return value.  Example:

=syntax js
	MyPlayerSprite.add({
		logic: function(clock) {
			Effect.Port.follow( this, 0.5 );
		}
	});

A speed value of "{1.0}" means it should follow the sprite at the fastest possible speed (no lag).  A value of "{0.5}" means it would take 2 logic frames to "catch up" to the sprite (a slight bit of lag), "{0.25}" would take 4 frames (moderate lag), and "{0.125}" would take 8 frames (lots of lag).

=section #.#.#. Effect.Port.draw()

=deflist
	Syntax | {VOID draw()}

This updates the graphical positions of everything in the world (all planes, all sprites, etc.).  This is called automatically as part of the draw loop, and need not be called explicitly, except under very special circumstances.  There is no return value.  Example:

=syntax js
	Effect.Port.draw();

=section #.#.#. Effect.Port.logic()

=deflist
	Syntax | {VOID logic()}

This calls the logic handler in all planes, all sprites, etc.  This is called automatically as part of the logic loop, and need not be called explicitly, except under very special circumstances.  There is no return value.  Example:

=syntax js
	Effect.Port.logic();

=section #.#.#. Effect.Port.hideCursor()

=deflist
	Syntax | {VOID hideCursor()}

This hides the cursor while it is located over the main display area.  Useful for implementing your own custom cursor as a Sprite.  There is no return value.  Example:

=syntax js
	Effect.Port.hideCursor();

=section #.#.#. Effect.Port.showCursor()

=deflist
	Syntax | {VOID showCursor()}

This shows the cursor while it is located over the main display area.  This is the default behavior.  There is no return value.  Example:

=syntax js
	Effect.Port.showCursor();

=section #.#.#. Effect.Port.getMouseCoords()

=deflist
	Syntax | {POINT getMouseCoords()}

This function returns the current mouse coordinates, translated to global world coordinates.  Meaning, the screen zoom and scrolling position are all taken in to account.  The response is a [api:Point] object, which contains "{x}" and "{y}" properties.  Example:

=syntax js
	var pt = Effect.Port.getMouseCoords();

=section #.#. Effect.Port Events

Here are the events you can hook for the main display port.

=section #.#.#. Effect.Port.onMouseDown

This event is fired when any mouse button is pressed down over the main display area.  Your callback function will be passed the global world mouse coordinates, and the button index number.  Example:

=syntax js
	Effect.Port.addEventListener( 'onMouseDown', function(pt, buttonIdx) {
		switch (buttonIdx) {
			case Effect.LEFT_BUTTON:
				// left mouse button was pressed!
				break;
			case Effect.MIDDLE_MIDDLE:
				// middle mouse button was pressed!
				break;
			case Effect.RIGHT_BUTTON:
				// right mouse button was pressed!
				break;
		}
	} );

=section #.#.#. Effect.Port.onMouseUp

This event is fired when any mouse button is released over the main display area.  Your callback function will be passed the global world mouse coordinates, and the button index number.  Example:

=syntax js
	Effect.Port.addEventListener( 'onMouseUp', function(pt, buttonIdx) {
		switch (buttonIdx) {
			case Effect.LEFT_BUTTON:
				// left mouse button was released!
				break;
			case Effect.MIDDLE_MIDDLE:
				// middle mouse button was released!
				break;
			case Effect.RIGHT_BUTTON:
				// right mouse button was released!
				break;
		}
	} );

=section #.#.#. Effect.Port.onMouseMove

This event is fired constantly as the mouse moves over the main display area.  Your callback function will be passed the global world mouse coordinates.  Example:

=syntax js
	Effect.Port.addEventListener( 'onMouseMove', function(pt) {
		// the mouse was moved!
	} );

=section #.#.#. Effect.Port.onMouseWheel

This event is fired when the user scrolls the mouse wheel upwards or downwards.  It will be passed a number representng the delta (how far the wheel moved, and by how much).  Example:

=syntax js
	Effect.Port.addEventListener( 'onMouseWheel', function(delta) {
		// the mouse wheel was moved by 'delta' amount
	} );

The "{delta}" number will be negative if the mouse wheel scrolled up, or positive if it scrolled down.  However, due to differences in the way browsers handle this, it is recommended you only look at the |polarity| of the delta (i.e. &lt; 0 or &gt; 0), and don't act on the value itself, as the amplitude can vary.
