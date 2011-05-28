=section #. Plane

The {SpritePlane}, {TilePlane}, {VideoPlane} and {HUD} all inherit from a common abstract base class called {Plane}.  You cannot instantiate classes of this type directly, but here are the common methods that are inherited:

=section #.#. Plane Properties

Here are the public properties in the {Plane} base class.

=section #.#.#. Plane.id

=deflist
	Data Type | String
	Access | Read Only

This is a unique identifier for the plane, which is typically passed to the subclass constructor.  If not, it is auto-generated.

=section #.#.#. Plane.scrollX

=deflist
	Data Type | Float
	Access | Read Only

This contains the current horizontal scroll amount for the plane.  Note that this is set automatically by [Effect.Port.setScroll()] and will be adjusted for our [Plane.scrollSpeed].

=section #.#.#. Plane.scrollY

=deflist
	Data Type | Float
	Access | Read Only

This contains the current vertical scroll amount for the plane.  Note that this is set automatically by [Effect.Port.setScroll()] and will be adjusted for our [Plane.scrollSpeed].

=section #.#.#. Plane.scrollSpeed

=deflist
	Data Type | Float
	Access | Read Only

This contains the scrolling speed ratio for the plane ("{1.0}" is normal).  To set this, use [Plane.setScrollSpeed()].

=section #.#.#. Plane.zIndex

=deflist
	Data Type | Integer
	Access | Read Only

This contains the current [wikipedia:Z_order, z-index] of the plane.  To set this, use [Plane.setZIndex()].

=section #.#.#. Plane.visible

=deflist
	Data Type | Boolean
	Access | Read Only

This contains a flag indicating the current visibility of the plane ({true} is visible, {false} is hidden).  To set this, use [Plane.hide()] and [Plane.show()].

=section #.#. Plane Methods

=section #.#.#. Plane.setZIndex()

=deflist
	Syntax | {VOID setZIndex( INTEGER )}

This sets the [wikipedia:Z_order, z-index] of the plane, which controls the draw order (which planes appear on top of others).  Higher numbers are on top, lower numbers are below.  For Sprite and Tile planes, this is typically set in the Level Editor, but you can override it here.  There is no return value.  Example:

=syntax js
	myplane.setZIndex( 2 );

Note that for Sprite Planes, this is only the default value -- each individual sprite can customize its z-index.

=section #.#.#. Plane.setScrollSpeed()

=deflist
	Syntax | {VOID setScrollSpeed( NUMBER )}

This sets the scroll speed of the plane, relative to the main port scroll.  For example, if you set a scroll speed of "{1.0}", and you scroll the level to "{50, 50}", your plane will also be scrolled to "{50, 50}".  If the scroll speed was "{0.5}", then the plane would have been scrolled to "{25, 25}".  If the scroll speed was "{0}", then it will not scroll at all (useful for {HUD} Planes).  There is no return value.  Example:

=syntax js
	myplane.setScrollSpeed( 0.5 );

=section #.#.#. Plane.hide()

=deflist
	Syntax | {VOID hide()}

This hides the entire plane, so it is still active but invisible.  There is no return value.  Example:

=syntax js
	myplane.hide();

=section #.#.#. Plane.show()

=deflist
	Syntax | (VOID show()}

This shows the plane, after being hidden by calling [Plane.hide()].  There is no return value.  Example:

=syntax js
	myplane.show();

=section #.#.#. Plane.getMouseCoords()

=deflist
	Syntax | {POINT getMouseCoords()}

This returns the current mouse coordinates, adjusted for the plane's scroll speed (see [Plane.setScrollSpeed()]).  The return object is a [Point] which has "" and "" properties.  Example:

=syntax js
	var pt = myplane.getMouseCoords();
	alert( "Mouse coords: " + pt.x + " x " + pt.y );

=section #. HUD

The HUD (Heads-Up Display) Plane is designed for overlaying Bitmap Fonts onto your game display.  This inherits from the base [Plane] class.  For details see the [article:docs/Font Guide], but here are the public methods in the class:

=section #.#. HUD Plane Methods

=section #.#.#. HUD.setTableSize()

=deflist
	Syntax | {VOID setTableSize( INTEGER, INTEGER )}
	Arguments | Cols, Rows

This sets the total number of characters allowed horizontally and vertically in the HUD Plane.  Essentially we are setting up a "grid" of tiles, each of which can hold a single font glyph.  There is no return value.  Example:

=syntax js
	myhud.setTableSize( 20, 2 );

=section #.#.#. HUD.setPosition()

=deflist
	Syntax | {VOID setPosition( NUMBER, NUMBER )}
	Arguments | X, Y

This sets the horizontal and veritcal position (offset from top-left) for the HUD Plane, in pixels.  For example, if you only require one line of text but want it centered, better to set the table size to only allow one line, but set the offset so the text appears centered.  There is no return value.  Example:

=syntax js
	myhud.setPosition( 100, 100 );

=section #.#.#. HUD.setTracking()

=deflist
	Syntax | {VOID setTracking( NUMBER, NUMBER )}
	Arguments | Horizontal Tracking, Vertical Tracking

This sets the horizontal and vertical character tracking (distance between characters).  By default these are both "{1.0}", but you can increase or decrease them, to create "expanded" or "condensed" looking fonts.  There is no return value.  Example:

=syntax js
	myhud.setTracking( 0.5, 1.0 );

=section #.#.#. HUD.setFont()

=deflist
	Syntax | {VOID setFont( STRING )}
	Arguments | Font ID

This sets the Bitmap Font to use in the HUD Plane, specified by the Font ID that you entered in the web interface.  The font needs to be enabled (i.e. preloaded) in order to be used in a HUD Plane.  There is no return value.  Example:

=syntax js
	myhud.setFont( 'MyFont1' );

=section #.#.#. HUD.setCustomFont()

=deflist
	Syntax | {VOID setCustomFont( STRING, INTEGER, INTEGER )}
	Arguments | URL, Glyph Width, Glyph Height

This sets a custom font (image map) to use in the HUD Plane.  The URL should point to a preloaded image that contains a glyph map (glyphs lined up horiztonally), plus the glyph width and height in pixels.  You can download glyph maps for customization when editing a Bitmap Font on the Fonts tab.  There is no return value.  Example:

=syntax js
	myhud.setCustomFont( '/images/fonts/my_custom_font.png', 32, 32 );

=section #.#.#. HUD.setChar()

=deflist
	Syntax | {VOID setChar( INTEGER, INTEGER, STRING )}
	Arguments | X, Y, Character

This renders a single glyph character onto the screen at the specified location.  The coordinates should be specified as character offets in the grid, not pixel coordinates.  The character should be a single-char string.  There is no return value.  Example:

=syntax js
	myhud.setChar( 4, 3, "H" );

=section #.#.#. HUD.setString()

=deflist
	Syntax | {VOID setString( INTEGER, INTEGER, STRING )}
	Arguments | X, Y, String

This renders an entire string into the HUD Plane, starting at the specified location.  The coordinates should be specified as character offets in the grid, not pixel coordinates.  The string may contain multiple lines (but lines will not "wrap" automatically).  There is no return value.  Example:

=syntax js
	myhud.setString( 4, 3, "HELLO" );

=section #.#.#. HUD.setPadInt()

=deflist
	Syntax | {VOID setPadInt( INTEGER, INTEGER, INTEGER, INTEGER )}
	Arguments | X, Y, String, Padding

This renders a "padded integer" (an integer padded with zeros) at the specified location.  The coordinates should be specified as character offets in the grid, not pixel coordinates.  This is useful for things like a score or timer display.  The "padding" number is the total number of digits to show, including zeros.  There is no return value.  Example:

=syntax js
	myhud.setPadInt( 0, 0, 150, 6 ); // will show: 000150

=section #. VideoPlane

A Video Plane is meant for playing a video clip.  This can be a game intro, cut scene, title movie, or even a looped level background.  For details see the [article:docs/Video Guide].  This inherits from the base [Plane] class.  Here are the public methods and events:

=section #.#. VideoPlane Methods

=section #.#.#. VideoPlane.setMovie()

=deflist
	Syntax | {VOID setMovie( STRING, BOOLEAN )}
	Arguments | URL, Loop

This attaches a video clip to the plane, specified by a URL to the video asset file.  The file must have been preloaded.  The second argument should be set to {true} if you want the clip to play endlessly (loop), or {false} to only play once (you can also set this later on by calling [VideoPlane.setLoop()]).  There is no return value.  Example:

=syntax js
	myvid.setMovie( '/videos/title.mp4', false );

=section #.#.#. VideoPlane.play()

=deflist
	Syntax | {VOID play()}

This starts the video clip playing from its current position.  There is no return value.  Example:

=syntax js
	myvid.play();

=section #.#.#. VideoPlane.stop()

=deflist
	Syntax | {VOID stop()}

This stops the video clip (actually, it "pauses" it).  There is no return value.  Example:

=syntax js
	myvid.stop();

=section #.#.#. VideoPlane.rewind()

=deflist
	Syntax | {VOID rewind()}

This rewinds the video clip to the beginning.  There is no return value.  Example:

=syntax js
	myvid.rewind();

=section #.#.#. VideoPlane.setPosition()

=deflist
	Syntax | {VOID setPosition( NUMBER )}
	Arguments | Seconds

This sets the current playhead position in the video clip, to the specified number of seconds (this may be a floating point decimal for sub-second precision).  There is no return value.  Example:

=syntax js
	myvid.setPosition( 45.18 );

=section #.#.#. VideoPlane.getPosition()

=deflist
	Syntax | {NUMBER getPosition()}

This returns the current playhead position in the video clip.  The return value is the number of seconds from the beginning of the clip (will be a floating point decimal).  Example:

=syntax js
	var pos = myvid.getPosition();

=section #.#.#. VideoPlane.setLoop()

=deflist
	Syntax | {VOID setLoop( BOOLEAN )}

This sets the "loop" flag for the video.  If set to {true} the video clip will automatically rewind and play from the beginning when it reaches the end (it does this indefinitely).  If set to {false} the clip will stop at the end.  You can change this value at any time.  There is no return value.  Example:

=syntax js
	myvid.setLoop( true );

=section #.#.#. VideoPlane.setVolume()

=deflist
	Syntax | {VOID setVolume( NUMBER )}

This sets the volume for the movie clip.  The value should be between "{0.0}" (silent) and "{1.0}" (full volume).  Note that the volume is still governed by the video category volume, as well as the master volume.  See the [article:docs/Audio Guide] for details.  There is no return value.  Example:

=syntax js
	myvid.setVolume( 0.5 );

=section #.#. VideoPlane Events

Here are the events you can listen for on your Video Plane.

=section #.#.#. VideoPlane.onMovieEnd

This event is fired when the video clip reaches the end (regardless whether the clip is looped or not).  If you are playing an intro movie or cut scene, this is a good way to know when to proceed and load the level (or whatever you want to have happen next).  Example:

=syntax js
	myvid.addEventListener( 'onMovieEnd', function() {
		// this code will execute when the movie ends
		Effect.Game.loadLevel( 'MyLevel1', true );
	} );
