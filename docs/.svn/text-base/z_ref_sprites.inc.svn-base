=section #. Sprites

[wikipedia:Sprite_(video_game), Sprites] are all the movable objects in your game.  Examples include your character, enemies, projectiles, explosions, particles, even your main title graphic.  You create subclasses of the [Sprite] class to control your sprites, and these all live in a [SpritePlane].

=section #.#. SpritePlane

See below for all the public properties and methods in the {SpritePlane} object.  This inherits from the [Plane] base class.

=section #.#.#. SpritePlane Properties

The following properties are inherited from the [Plane] base class:

=list
	[Plane.id]
	[Plane.scrollX]
	[Plane.scrollY]
	[Plane.scrollSpeed]
	[Plane.zIndex]
	[Plane.visible]

Here are all the public properties in the {SpritePlane} class.

=section #.#.#.#. SpritePlane.offsetX

=deflist
	Data Type | Integer
	Access | Read + Write

Visible horizontal adjustment of all sprites (positive values move to the right, negative values to the left).  This is not considered in the collision detection system -- it is purely a visual adjustment.

=section #.#.#.#. SpritePlane.offsetY

=deflist
	Data Type | Integer
	Access | Read + Write

Visible vertical adjustment of all sprites (positive values move downward, negative values upward).  This is not considered in the collision detection system -- it is purely a visual adjustment.

=section #.#.#.#. SpritePlane.opacity

=deflist
	Data Type | Float
	Access | Read Only

Global opacity for all our sprites ("{0.0}" to "{1.0}").  To set this, call [SpritePlane.setOpacity()].  Please note that setting opacity on a plane that contains transparent [wikipedia:PNG] images does not work properly in all browsers (namely IE and Chrome).

=section #.#.#.#. SpritePlane.tilePlane

=deflist
	Data Type | Object
	Access | Read Only

If linked with [TilePlane] via [SpritePlane.linkTilePlane()], a reference to it is stored here.

=section #.#.#. SpritePlane Methods

=section #.#.#.#. SpritePlane.setMinSpriteSize()

=deflist
	Syntax | {VOID setMinSpriteSize( INTEGER )}

This sets the minimum sprite size (in pixels), which is just a hint used by the collision detection system (see [article:docs/Geometry and Collision Guide]).  There is no return value. Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setMinSpriteSize( 32 );

=section #.#.#.#. SpritePlane.setOffscreenDistance()

=deflist
	Syntax | {VOID setOffscreenDistance( NUMBER )}

This sets the distance out from the screen edges that sprites can live offscreen before they are automatically destroyed.  It only applies to sprites which have their [Sprite.dieOffscreen] property set.  The value should be the number of |screens| wide/tall that sprites can live.  For example, "{0.0}" means that sprites are destroyed |immediately| after leaving the screen, while "{1.0}" means that sprites can live exactly one screen, in all directions.  The default value is "{0.5}" (one half screen).  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setOffscreenDistance( 0.5 );

=section #.#.#.#. SpritePlane.setAetherDistance()

=deflist
	Syntax | {VOID setAetherDistance( NUMBER )}

This sets the distance out from the screen edges where aether sprites are brought into the world (see the [article:docs/Sprites and Tiles Guide]).  The value should be the number of |screens| wide/tall.  For example, "{0.0}" means that aether sprites are instantiated |right| at the screen edge, while "{1.0}" means that aether sprites are instantiated one screen out in every direction.  The default value is "{0.0}" (right at the screen edges).  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setAetherDistance( 0.5 );

=section #.#.#.#. SpritePlane.setAetherCheckFreq()

=deflist
	Syntax | {VOID setAetherCheckFreq( INTEGER )}

This sets the frequency at which the engine queries the aether sprite in-memory database, to see if new sprites need to be instantiated into the world (see the [article:docs/Sprites and Tiles Guide]).  This is typically checked every single frame, but if you increase the aether distance (see [SpritePlane.setAetherDistance()]), you should be able to get away with querying the database every few frames.  The value should be "{1}" for every frame, "{2}" for every other frame, "{3}" for every third frame, and so on.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setAetherCheckFreq( 2 );

=section #.#.#.#. SpritePlane.setLogic()

=deflist
	Syntax | {VOID setLogic( BOOLEAN )}

This enables or disables all logic on the Sprite Plane.  Meaning, if set to {false}, then all the sprites in the plane will not receive {logic()} calls during the main loop (all sprites will freeze).  This defaults to {true}.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setLogic( false );

=section #.#.#.#. SpritePlane.setSoloSprite()

=deflist
	Syntax | {VOID setSoloSprite( OBJECT )}

This sets the "Solo Sprite" for the plane.  When set, |only| this sprite will receive logic function calls.  All other sprites will freeze.  To resume normal operation, call [SpritePlane.clearSoloSprite()].  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var sprite = splane.getSprite('my_sprite_id');
	splane.setSoloSprite( sprite );

=section #.#.#.#. SpritePlane.clearSoloSprite()

=deflist
	Syntax | {VOID clearSoloSprite()}

This clears the "Solo Sprite" for the plane (see [SpritePlane.setSoloSprite()].  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.clearSoloSprite();

=section #.#.#.#. SpritePlane.deleteAll()

=deflist
	Syntax | {VOID deleteAll()}

This immediately removes all active sprites from the plane.  It does not affect sprites currently in the aether database, but active sprites that are part of the aether are also destroyed.  If you want to preserve aether sprites, better to call [SpritePlane.sendAllToAether()] first.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.deleteAll();

=section #.#.#.#. SpritePlane.deleteSprite()

=deflist
	Syntax | {VOID deleteSprite( STRING )}

This deletes a sprite from the plane, specified by its ID.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.deleteSprite( 'my_sprite_id' );

=section #.#.#.#. SpritePlane.deleteSprites()

=deflist
	Syntax | {VOID deleteSprites( STRING, ... )}

This deletes one or more sprites from the plane, specified by their IDs (variable argument list).  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.deleteSprites( 'my_sprite_id1', 'my_sprite_id2' );

=section #.#.#.#. SpritePlane.createSprite()

=deflist
	Syntax | {OBJECT createSprite( STRING, OBJECT )}
	Arguments | Class Name, New Properties

This creates a new sprite, and places it into the plane.  Pass in the class name, plus an optional associative array of properties to set in the object as it is created.  The return value is the new [Sprite] object itself.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.createSprite( 'MySprite', {
		x: 50,
		y: 50
	} );

*Advanced Tip:* If you want to create a custom sprite that is not registered with the web interface, pass a reference to the class constructor instead of a string containing the name of the class. 

=section #.#.#.#. SpritePlane.setOpacity()

=deflist
	Syntax | {VOID setOpacity( NUMBER )}

This sets the global, governing opacity for all sprites in the plane.  Meaning, each sprite can have its own opacity, but they are all governed (multiplied) by this value.  The value should be between "{0.0}" (invisible) to "{1.0}" (solid).  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setOpacity( 0.5 );

Please note that setting opacity on a plane that contains transparent [wikipedia:PNG] images does not work properly in all browsers (namely IE and Chrome).

=section #.#.#.#. SpritePlane.draw()

=deflist
	Syntax | {VOID draw()}

This updates the graphical positions of everything in the SpritePlane (all sprites).  This is called automatically as part of the draw loop, and need not be called explicitly, except under very special circumstances.  Example:

=syntax js
	var splane = Efefct.Port.getPlane('sprites');
	splane.draw();

=section #.#.#.#. SpritePlane.logic()

=deflist
	Syntax | {VOID logic()}

This calls the logic handler for all sprites in the plane.  This is called automatically as part of the logic loop, and need not be called explicitly, except under very special circumstances.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.logic();

=section #.#.#.#. SpritePlane.setupAether()

=deflist
	Syntax | {VOID setupAether( ARRAY )}

This allows you to populate the aether sprite database with an array of objects.  This is an internal function that you should never need to call directly -- the database is setup automatically when you load levels.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.setupAether([
		{ type: 'Enemy', x: 500, y: 500 },
		{ type: 'SpecialItem', x: 600, y: 500 }
	]);

=section #.#.#.#. SpritePlane.addToAether()

=deflist
	Syntax | {VOID addToAether( OBJECT )}

This adds an object into the aether sprite database.  This is an advanced function, that you should rarely ever have to call.  Don't pass a real sprite object here -- it only needs to be a "stub" object that has a position ({x}, {y}), class name ({type}) and any properties you want saved in the aether.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.addToAether({
		type: 'Enemy',
		x: 500,
		y: 500
	});

=section #.#.#.#. SpritePlane.sendAllToAether()

=deflist
	Syntax | {VOID sendAllToAether()}

This sends all active sprites back into the aether database for respawning.  This is an internal, advanced function that you should never need to call directly.  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	splane.sendAllToAether();

=section #.#.#.#. SpritePlane.getAllAetherSprites()

=deflist
	Syntax | {ARRAY getAllAetherSprites()}

This returns an array containing all the sprite stub objects from the aether database.  These are not full sprite objects, but merely stubs containing only the properties stored in the database.  This is an internal, advanced function that you should never need to call directly.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var stubs = splane.getAllAetherSprites();

=section #.#.#.#. SpritePlane.movePointX()

=deflist
	Syntax | {OBJECT movePointX( NUMBER, NUMBER, NUMBER )}
	Syntax | {OBJECT movePointX( POINT, NUMBER )}

This function moves a point along the horizontal axis by the specified number of pixels (positive values move to the right, negative values to the left).  You can either specify the individual X and Y coordinates of the point to move, or pass in a real [Point] object.  If a collision is detected, it will return an object containing the following properties:

=deflist
	targetType | A string containing either "{sprite}" or "{tile}", depending on what was hit.
	target | A reference to the actual object that was hit (so you can communicate with it).
	correctedX | The new "{x}" coordinate of the point, corrected for the collision.
	correctedY | The new "{y}" coordinate of the point, corrected for the collision.

If no collision is detected, it will return {null}.  Here is an example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var hit = splane.movePointX( 50, 50, 5 );
	if (hit) {
		// we hit something!
	}

=section #.#.#.#. SpritePlane.movePointY()

=deflist
	Syntax | {OBJECT movePointY( NUMBER, NUMBER, NUMBER )}
	Syntax | {OBJECT movePointY( POINT, NUMBER )}

This function moves a point along the vertical axis by the specified number of pixels (positive values move downward, negative values upward).  You can either specify the individual X and Y coordinates of the point to move, or pass in a real [Point] object.  If a collision is detected, it will return an object containing the following properties:

=deflist
	targetType | A string containing either "{sprite}" or "{tile}", depending on what was hit.
	target | A reference to the actual object that was hit (so you can communicate with it).
	correctedX | The new "{x}" coordinate of the point, corrected for the collision.
	correctedY | The new "{y}" coordinate of the point, corrected for the collision.

If no collision is detected, it will return {null}.  Here is an example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var hit = splane.movePointY( 50, 50, 5 );
	if (hit) {
		// we hit something!
	}

=section #.#.#.#. SpritePlane.moveLineX()

=deflist
	Syntax | {OBJECT moveLineX( NUMBER, NUMBER, NUMBER, NUMBER )}
	Arguments | X Position, Top, Bottom, X Delta

This function moves a vertical line along the X axis by the specified number of pixels (positive values move to the right, negative values to the left).  Specify the X coordinate of the line, the top and bottom Y values (bottom should be +1 past the last pixel), and the horizontal delta.  If a collision is detected, it will return the same object as described in [SpritePlane.movePointX()].  Otherwise it will return {null}.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var hit = splane.moveLineX( 50, 0, 25, 5 );
	if (hit) {
		// we hit something!
	}

=section #.#.#.#. SpritePlane.moveLineY()

=deflist
	Syntax | {OBJECT moveLineY( NUMBER, NUMBER, NUMBER, NUMBER )}
	Arguments | Y Position, Left, Right, Y Delta

This function moves a horizontal line along the Y axis by the specified number of pixels (positive values move downward, negative values upward).  Specify the Y coordinate of the line, the left and right X values (right should be +1 past the last pixel), and the vertical delta.  If a collision is detected, it will return the same object as described in [SpritePlane.movePointY()].  Otherwise it will return {null}.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var hit = splane.moveLineY( 50, 0, 25, 5 );
	if (hit) {
		// we hit something!
	}

=section #.#.#.#. SpritePlane.getSprite()

=deflist
	Syntax | {OBJECT getSprite( STRING )}

This fetches a sprite given its ID, and returns the object.  This is a very fast function (as sprites are indexed by their IDs), so it can safely be called during your logic loop.  Only active sprites are considered.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var sprite = splane.getSprite( 'my_sprite_id' );

=section #.#.#.#. SpritePlane.lookupSpriteFromGlobal()

=deflist
	Syntax | {OBJECT lookupSpriteFromGlobal( NUMBER, NUMBER )}
	Syntax | {OBJECT lookupSpriteFromGlobal( POINT )}

This tries to locate a sprite based on global world coordinates.  If the point (specified by individual X and Y coords, or a real [Point] object) lies withing the rectangle of any active sprite, it will be returned.  If multiple sprites were found, the one with the highest {zIndex} is returned.  If no sprite was found, {null} is returned.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var sprite = splane.lookupSpriteFromGlobal( 50, 50 );

=section #.#.#.#. SpritePlane.findSprite()

=deflist
	Syntax | {OBJECT findSprite( OBJECT, BOOLEAN )}
	Arguments | Criteria, Search Aether

This searches all the sprites in the plane for a set of criteria, specified as object properties, and returns the first sprite that matches.  For example, this can be used to find a sprite that matches a certain type (class name).  If multiple properties are specified, they all must match.  If any sprite matches all the criteria, it will be returned.  If no sprites match, {null} is returned.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var sprite = splane.findSprite({
		type: 'Enemy'
		energy: 20
	});

If you pass {true} as the second argument, the engine will also search the aether database (offscreen, inactive sprites) for your criteria.  Note that this is an advanced option, and should only be used if you know exactly what you are doing.  Aether objects that are returned from this function are not real sprites -- they are just "stub" objects with a few properties used to create sprites at the proper time.

=section #.#.#.#. SpritePlane.findSprites()

=deflist
	Syntax | {ARRAY findSprites( OBJECT, BOOLEAN )}
	Syntax | {ARRAY findSprites( FUNCTION, BOOLEAN )}
	Arguments | Criteria, Search Aether

This searches all the sprites in the plane for a set of criteria, specified as object properties, and returns *all* the sprites that match, as an array.  This function works similarly to [SpritePlane.findSprite()], except that if multiple sprites match your criteria, all of them are returned.  If multiple properties are specified, they all must match.  If no sprites match, {null} is returned.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var list = splane.findSprites({
		type: 'Enemy'
		energy: 20
	});

You can even specify a callback function for your own custom search routine.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var list = splane.findSprites( function(sprite) {
		return( sprite.type == 'Enemy' && sprite.energy < 20 );
	});

If you pass {true} as the second argument, the engine will also search the aether database (offscreen, inactive sprites) for your criteria.  Note that this is an advanced option, and should only be used if you know exactly what you are doing.  Aether objects that are returned from this function are not real sprites -- they are just "stub" objects with a few properties used to create sprites at the proper time.

=section #.#.#.#. SpritePlane.findSpritesByPoint()

=deflist
	Syntax | {ARRAY findSpritesByPoint( POINT, BOOLEAN )}

This returns an array containing any sprites that intersect with the specified [Point] object.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var pt = new Point( 50, 50 );
	var list = splane.findSpritesByPoint( pt );

If you pass {true} as the second argument, the engine will also search the aether database (offscreen, inactive sprites) for your criteria.  Note that this is an advanced option, and should only be used if you know exactly what you are doing.  Aether objects that are returned from this function are not real sprites -- they are just "stub" objects with a few properties used to create sprites at the proper time.

=section #.#.#.#. SpritePlane.findSpritesByRect()

=deflist
	Syntax | {ARRAY findSpritesByRect( RECT, BOOLEAN )}

This returns an array containing any sprites that intersect with the specified [Rect] object.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var rect = new Rect( 0, 0, 50, 50 );
	var list = splane.findSpritesByRect( rect );

If you pass {true} as the second argument, the engine will also search the aether database (offscreen, inactive sprites) for your criteria.  Note that this is an advanced option, and should only be used if you know exactly what you are doing.  Aether objects that are returned from this function are not real sprites -- they are just "stub" objects with a few properties used to create sprites at the proper time.

=section #.#.#.#. SpritePlane.linkTilePlane()

=deflist
	Syntax | {VOID linkTilePlane( OBJECT )}

This links a [SpritePlane] and [TilePlane] together, so they work together for collision detection.  For example, if you move a point, line or sprite, it can hit other sprites, or tiles in the linked [TilePlane].  There is no return value.  Example:

=syntax js
	var splane = Effect.Port.getPlane('sprites');
	var tplane = Effect.Port.getPlane('tiles');
	splane.linkTilePlane( tplane );

=section #.#. Sprite

All your sprite are belong to the {Sprite} base class.  This section describes all the public properties and methods.

=section #.#.#. Sprite Properties

Here are all the properties of the {Sprite} class.

=section #.#.#.#. Sprite.type

=deflist
	Data Type | String
	Access | Read Only

This will contain the name of the sprite class that the object belongs to.

=section #.#.#.#. Sprite.x

=deflist
	Data Type | Float
	Access | Read + Write

Global horizontal position of the top-left corner of the Sprite in the world.

=section #.#.#.#. Sprite.y

=deflist
	Data Type | Float
	Access | Read + Write

Global vertical position of the top-left corner of the Sprite in the world.

=section #.#.#.#. Sprite.width

=deflist
	Data Type | Integer
	Access | Read + Write

Pixel width of the sprite (if the sprite has multiple frames of animation, this is the width of a single frame).

=section #.#.#.#. Sprite.height

=deflist
	Data Type | Integer
	Access | Read + Write

Pixel height of the sprite (if the sprite has multiple frames of animation, this is the height of a single frame).

=section #.#.#.#. Sprite.frameX

=deflist
	Data Type | Integer
	Access | Read Only

Horizontal frame index for a multi-frame source image.  Do not set this directly, call [Sprite.setFrame()] or [Sprite.setFrameX()] instead.

=section #.#.#.#. Sprite.frameY

=deflist
	Data Type | Integer
	Access | Read Only

Vertical frame index for a multi-frame source image.  Do not set this directly, call [Sprite.setFrame()] or [Sprite.setFrameY()] instead.

=section #.#.#.#. Sprite.zIndex

=deflist
	Data Type | Integer
	Access | Read Only

This contains the current [wikipedia:Z_order, z-index] of the sprite.  Defaults to the {zIndex} of the [SpritePlane].  To set this, use [Sprite.setZIndex()].

=section #.#.#.#. Sprite.opacity

=deflist
	Data Type | Float
	Access | Read Only

This contains the opacity of the sprite ("{0.0}" is fully transparent, "{1.0}" is fully opqque).  Defaults to "{1.0}".  To set this, use [Sprite.setOpacity()].  Note that the sprite opacity is governed (multiplied) by the {opacity} of the [SpritePlane].

Note that setting an opacity other than {1.0} on sprites which contain alpha [wikipedia:PNG] images does not work on all browsers (namely IE and Chrome).

=section #.#.#.#. Sprite.url

=deflist
	Data Type | String
	Access | Read + Write

This is the asset path to the image currently being displayed in the sprite (should contain a leading slash).  Only set this when first creating sprites.  If you want to swap images at any other time, use [Sprite.setImage()].

=section #.#.#.#. Sprite.visible

=deflist
	Data Type | Boolean
	Access | Read Only

This flag indicates whether the sprite is visible or not.  Defaults to the visibility of the plane.  Do not set this directly, use [Sprite.hide()] and [Sprite.show()] instead.

=section #.#.#.#. Sprite.offsetX

=deflist
	Data Type | Integer
	Access | Read + Write

Visible horizontal adjustment of sprite (positive values move to the right, negative values to the left).  Defaults to 0.  This is not considered in the collision detection system -- it is purely a visual adjustment.

=section #.#.#.#. Sprite.offsetY

=deflist
	Data Type | Integer
	Access | Read + Write

Visible vertical adjustment of sprite (positive values move downward, negative values upward).  Defaults to 0.  This is not considered in the collision detection system -- it is purely a visual adjustment.

=section #.#.#.#. Sprite.xd

=deflist
	Data Type | Float
	Access | Read + Write

This is the horizontal delta of the sprite (how fast it is moving and in which direction), which is only used by the [Sprite.move()] function for collision detection.

=section #.#.#.#. Sprite.yd

=deflist
	Data Type | Float
	Access | Read + Write

This is the vertical delta of the sprite (how fast it is moving and in which direction), which is only used by the [Sprite.move()] function for collision detection.

=section #.#.#.#. Sprite.dieOffscreen

=deflist
	Data Type | Boolean
	Access | Read + Write

This flag controls whether the sprite is automatically destroyed when it leaves the screen boundaries, or stays active indefinitely.  Defaults to {false}.  Also see [SpritePlane.setOffscreenDistance()].

=section #.#.#.#. Sprite.screenLoop

=deflist
	Data Type | Boolean
	Access | Read + Write

This flag controls whether the sprite "loops around" when it leaves the screen (think of the classic video game "Asteroids").  Defaults to {false}.

=section #.#.#.#. Sprite.collisions

=deflist
	Data Type | Boolean
	Access | Read + Write

This flag indicates whether this sprite is enabled in the collision detection system (whether other sprites can "hit" us) or not.  Defaults to {false}.

=section #.#.#.#. Sprite.solid

=deflist
	Data Type | Boolean
	Access | Read + Write

This flag indicates whether the sprite is considered "solid" or not, when hit detecting.  Defaults to {false}.

=section #.#.#.#. Sprite.ground

=deflist
	Data Type | Boolean
	Access | Read + Write

This flag indicates whether the sprite is considered "ground" or not, when hit detecting (if {true}, this means hits from the top are solid).  Defaults to {false}.

=section #.#.#.#. Sprite.hitRect

=deflist
	Data Type | [Rect]
	Access | Read + Write

This [Rect] controls the boundaries of the sprite when collision detecting.  The rectangle should be localized to the sprite's coordinates.  For example, if your sprite is 64x64 pixels in size, and the {hitRect} is set to {8, 8, 56, 56}, then objects can intersect with the sprite by 8 pixels before registering a hit.

By default, sprites do not have a {hitRect} (the property is undefined).  To add one, create a new [Rect] object and assign it to the {hitRect} property of your sprite.

=section #.#.#.#. Sprite.lateLogic

=deflist
	Data Type | Boolean
	Access | Read + Write

This special flag causes the sprite to receive logic events |after| all others.  This can be useful for special sprite situations.  For example, in a side-scroller platformer game, if the character is standing on a moving platform, you can set the {lateLogic} flag on the platform sprite, so it can move itself (and anything standing on it) after the other sprites.  This can insure that the visual movement of the platform, and the sprites standing on it, are in sync.

=section #.#.#.#. Sprite.destroyed

=deflist
	Data Type | Boolean
	Access | Read Only

This special flag is automatically set to {true} when the sprite is destroyed.  This is in case references to the sprite object "hang around" outside of the plane.  For example, if you grab a reference to a sprite and store it in a variable, you can check this flag to see if it was destroyed and removed from the game world.

=section #.#.#. Sprite Methods

Here are all the public methods in the {Sprite} class.

=section #.#.#.#. Sprite.setup()

=deflist
	Syntax | {VOID setup()}

This function is automatically called by [SpritePlane.createSprite()] as your object is instantiated and placed into the world.  You can override this method to perform setup on your sprite, such as setting the image, playing a sound or priming your logic routine based on a property set in the level editor.  It is entirely up to you -- the base {setup()} method is empty.

Note that this function is called |just before| the sprite is initialized and placed into the world, so you should not perform any movement or collision detection.

=section #.#.#.#. Sprite.setImage()

=deflist
	Syntax | {VOID setImage( STRING )}

This function sets the current active image for the sprite (the visible image when the sprite is onscreen).  You can either specify a full asset file path with leading slash, or just the image filename (if all your images have unique filenames).  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setImage( '/images/sprites/mysprite.png' );

=section #.#.#.#. Sprite.setScale()

=deflist
	Syntax | {VOID setScale( NUMBER )}

This function sets the image scale, from "{0.0}" to "{1.0}".  This only has effect if you applied a "Scale" transform on the image via the web interface, in the "Resources" section for the sprite (i.e. add the image as a resource to the sprite, and select "Scale" from the Transform menu).

Since the image transformation happens on the server, the actual image returned to the client is a "filmstrip" (multiple rotated frames in the same image).  The {setScale()} function simply converts the specified scale into a frame index, and calls [Sprite.setFrameX()].

There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setScale( 0.5 );

=section #.#.#.#. Sprite.setRotation()

=deflist
	Syntax | {VOID setRotation( NUMBER )}

This function sets the image rotation, in degrees from "{0.0}" to "{360.0}".  This only has effect if you applied a "Rotate" transform on the image via the web interface, in the "Resources" section for the sprite (i.e. add the image as a resource to the sprite, and select "Rotate" from the Transform menu).

Since the image transformation happens on the server, the actual image returned to the client is a "filmstrip" (multiple rotated frames in the same image).  The {setRotation()} function simply converts the specified degrees into a frame index, and calls [Sprite.setFrameX()].

There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setRotation( 180 );

=section #.#.#.#. Sprite.setZIndex()

=deflist
	Syntax | {VOID setZIndex( INTEGER )}

This sets the [wikipedia:Z_order, z-index] of the sprite, which controls the draw order (which sprites appear on top of others).  Higher numbers are on top, lower numbers are below.  If no value is set, this defaults to the {zIndex} property of the [SpritePlane].  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setZIndex( 2 );

=section #.#.#.#. Sprite.setOpacity()

=deflist
	Syntax | {VOID setOpacity( NUMBER )}

This sets the opacity of the sprite, between "" (transparent) to "" (opaque).  Note that the opacity of all sprites is governed (multiplied) by the {opacity} of the [SpritePlane].  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setOpacity( 0.5 );

Please note that setting opacity on a sprite that contains a transparent [wikipedia:PNG] image does not work properly in all browsers (namely IE and Chrome).

=section #.#.#.#. Sprite.logic()

=deflist
	Syntax | {VOID logic( INTEGER )}

This is a placeholder function for your sprite class to override.  It is called for every iteration through the logic loop, and passed the [Effect.Game.logicClock].  Use this to move your sprite, perform collision detection, and control animation.

=section #.#.#.#. Sprite.draw()

=deflist
	Syntax | {VOID draw( INTEGER )}

This function handles updating your sprite's position on the screen.  It is called automatically for every iteration through the draw loop, and passed the [Effect.Game.drawClock].  You should never ever have to call this method directly, as the engine does it for you.

However, in special cases it may be necessary to |override| this method in your sprite class, to provide some kind of special visual effect.  For example, if you want your sprite to "flicker" or "blink" on and off every frame, you should do this in the {draw()} function, not in the {logic()} function, so the animation is in sync with the draw loop.  This is an advanced technique, and should not be attempted unless you know exactly what you are doing.  Also, if you do override this method, you *must* call the parent class method, or else your sprite's position will not be updated.  Example:

=syntax js
	MySprite.add({
		draw: function(clock) {
			// override the built-in draw() method
			// do something here, then call parent function
			this.__parent.draw.call(this);
		}
	} );

=section #.#.#.#. Sprite.destroy()

=deflist
	Syntax | {VOID destroy()}

This destroys your sprite, removing it from the world.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.destroy();

=section #.#.#.#. Sprite.sendToAether()

=deflist
	Syntax | {VOID sendToAether()}

This sends your sprite back into the aether database for respawning.  This is an internal, advanced function that you should never have to call directly.  This is called automatically by the engine when your sprite leaves the screen.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.sendToAether();

=section #.#.#.#. Sprite.isAether()

=deflist
	Syntax | {BOOLEAN isAether()}

This returns {true} if the sprite is currently being managed by the Aether database (see the [article:docs/Sprites and Tiles Guide]), {false} otherwise.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	if (sprite.isAether()) {
		// yes, is an aether sprite!
	}

=section #.#.#.#. Sprite.removeFromAether()

=deflist
	Syntax | {VOID removeFromAether()}

This removes a sprite from the Aether database (see the [article:docs/Sprites and Tiles Guide]).  From this point on the sprite will behave as a dynamically generated sprite, meaning it will be destroyed when it leaves the screen (if [Sprite.dieOffscreen] is set), loop around the screen edges (if [Sprite.screenLoop] is set), or live offscreen indefinitely (if neither property is set).  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.removeFromAether();

=section #.#.#.#. Sprite.addAetherProp()

=deflist
	Syntax | {OBJECT addAetherProp( STRING )}

This adds one or more keys to the Aether database entry for the current sprite (see the [article:docs/Sprites and Tiles Guide]). So when the sprite leaves the screen and must be frozen, additional custom properties are "preserved" along with the sprite's ID and position.  This is an advanced function that you should rarely have to call directly.  All sprite properties you defined in the web interface are automatically added to the database.  This is only for additional, custom properties.  Example:

=syntax js
	MySprite.add({
		customProp1: 'foo',
		customProp2: 'bar',
		
		setup: function() {
			this.addAetherProp( 'customProp1', 'customProp2' );
		}
	});

=section #.#.#.#. Sprite.hide()

=deflist
	Syntax | {VOID hide()}

This hides your sprite from view.  Note that it will still receive {logic()} calls in the main loop, but nothing will be visible.  Call [Sprite.show()] to reverse this call.  Check the [Sprite.visible] property to see if the sprite is currently visible or not.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.hide();

=section #.#.#.#. Sprite.show()

=deflist
	Syntax | {VOID show()}
	Syntax | {VOID show( BOOLEAN )}

This shows your sprite, after being hidden by [Sprite.hide()].  Check the [Sprite.visible] property to see if the sprite is currently visible or not.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.show();

This method can actually be used to show or hide the sprite, if you pass in a boolean set to {true} (show), or {false} (hide).  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.show( false ); // hide the sprite
	sprite.show( true ); // show the sprite

=section #.#.#.#. Sprite.setFrame()

=deflist
	Syntax | {VOID setFrame( INTEGER, INTEGER )}
	Arguments | X Frame, Y Frame

For multi-frame images, this sets the horizontal and vertical frame index, meaning it sets which frame is visible in the sprite.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setFrame( 2, 0 );

=section #.#.#.#. Sprite.setFrameX()

=deflist
	Syntax | {VOID setFrameX( INTEGER )}

For multi-frame images, this sets the horizontal frame index, meaning it sets which frame is visible in the sprite.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setFrameX( 2 );

=section #.#.#.#. Sprite.setFrameY()

=deflist
	Syntax | {VOID setFrameY( INTEGER )}

For multi-frame images, this sets the vertical frame index, meaning it sets which frame is visible in the sprite.  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.setFrameY( 2 );

=section #.#.#.#. Sprite.getRect()

=deflist
	Syntax | {RECT getRect()}

This returns a new [Rect] object that is sized to match your sprite, and moved to its coordinates.  Note that if your sprite has a [Sprite.hitRect] property, this is taken into account when constructing the rectangle.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var rect = sprite.getRect();

=section #.#.#.#. Sprite.setPosFromRect()

=deflist
	Syntax | {VOID setPosFromRect( RECT )}

This updates the sprite's position based on a [Rect] object (only the "{left}" and "{top}" properties are used).  This is typically used in conjunction with [Sprite.getRect()].  There is no return value.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var rect = sprite.getRect();
	rect.offset( 5, 5 ); // move by 5x5 pixels
	sprite.setPosFromRect( rect );

=section #.#.#.#. Sprite.isMouseOver()

=deflist
	Syntax | {BOOLEAN isMouseOver()}

This function returns {true} if the mouse is currently on top of the sprite.  Note that if your sprite has a [Sprite.hitRect] property, this is taken into account.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	if (sprite.isMouseOver()) {
		// mouse is over our sprite!
	}

=section #.#.#.#. Sprite.pointIn()

=deflist
	Syntax | {BOOLEAN pointIn( POINT )}

This function checks if a [Point] is inside the boundaries of our sprite, and returns {true} if so, {false} otherwise.  Note that if your sprite has a [Sprite.hitRect] property, this is taken into account.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var pt = new Point( 50, 50 );
	if (sprite.pointIn(pt)) {
		// point is on our sprite!
	}

=section #.#.#.#. Sprite.rectIn()

=deflist
	Syntax | {BOOLEAN rectIn( RECT )}

This function checks if a [Rect] is partially or completely inside the boundaries of our sprite, and returns {true} if so, {false} otherwise.  Note that if your sprite has a [Sprite.hitRect] property, this is taken into account.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var rect = new Rect( 25, 25, 50, 50 );
	if (sprite.rectIn(rect)) {
		// rect is in our sprite!
	}

=section #.#.#.#. Sprite.centerPoint()

=deflist
	Syntax | {POINT centerPoint()}

This function returns a [Point] that is precisely in the center of the sprite.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var pt = sprite.centerPoint();

=section #.#.#.#. Sprite.centerPointX()

=deflist
	Syntax | {NUMBER centerPointX()}

This function returns the horizontal position of the center point of the sprite.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var cx = sprite.centerPointX();

=section #.#.#.#. Sprite.centerPointY()

=deflist
	Syntax | {NUMBER centerPointY()}

This function returns the vertical position of the center point of the sprite.  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var cy = sprite.centerPointY();

=section #.#.#.#. Sprite.isOnScreen()

=deflist
	Syntax | {BOOLEAN isOnScreen()}

This function returns {true} if the sprite is currently on screen, {false} otherwise.  A sprite is considered to be "on screen" if its rectangle intersects the scrolled screen boundaries (even a little).  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	if (sprite.isOnScreen()) {
		// sprite is onscreen!
	}

=section #.#.#.#. Sprite.move()

=deflist
	Syntax | {OBJECT move()}
	Syntax | {OBJECT move( NUMBER, NUMBER )}
	Syntax | {OBJECT move( NUMBER, NUMBER, OBJECT, OBJECT )}
	Arguments | X Delta, Y Delta, Target Sprite Plane, Target Tile Plane

This function is part of the collision detection system, and handles moving your sprite based on the [Sprite.xd] and [Sprite.yd] properties.  See the [article:docs/Geometry and Collision Guide] for details.  If a collision was detected, the response is an object with the following properties:

=deflist
	targetType | A string containing either "{sprite}" or "{tile}", depending on what was hit.
	target | A reference to the actual object that was hit (so you can communicate with it).

If no collision is detected, it will return {null}.  Here is an example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var hit = sprite.move();
	if (hit) {
		// we hit something!
	}

You can optionally pass in custom "x delta" and "y delta" amounts, which override the [Sprite.xd] and [Sprite.yd] properties.  This is useful for side-scrolling games, when you want separate movement calls for horizontal and vertical movement.  For example, if your character is falling, you want to first check horizontal movement to keep him out of walls, then you want to check vertical movement (gravity) to see if he landed on solid ground (if so, stop falling).

Finally, you can customize the actual [api:SpritePlane] and/or [api:TilePlane] objects that are checked for collisions, by passing in optional 3rd and 4th arguments to the {move()} call.  By default, the sprite plane that owns the current sprite is used, and if that plane has a [api:TilePlane] attached (via [api:SpritePlane.linkTilePlane()]), then that is the tile plane used.  You can customize one or both of these simply by passing in new values.  A useful technique here is to pass {null} for one or the other, limiting the collision detection to only a single plane.  This can help increase engine performance when your sprite does not have to hit other sprites, or tiles.

=section #.#.#.#. Sprite.playSound2D()

=deflist
	Syntax | {BOOLEAN playSound2D( STRING, NUMBER )}
	Arguments | Sound ID, Max Distance

This function plays a 2D spacial sound based on the sprite's position relative to the center of the screen.  Meaning, the volume and stereo balance are adjusted according to the sprite's position.  The first argument should be a Sound ID (asset file path with leading slash, or just a filename if all your sound files have unique filenames), and the second argument should be the maximum distance from the center of the screen (in pixels) before the sound reaches zero volume and does not play (defaults to screen size).  See [article:docs/Audio Guide|2D Spacial Effects] for details.  The return value is {true} if the sound played, or {false} if the sprite was too far away (greater than your specified distance).  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	sprite.playSound2D("explosion");

=section #.#.#.#. Sprite.get2DSoundSettings()

=deflist
	Syntax | {OBJECT get2DSoundSettings( NUMBER )}

This function returns an object that contains calculated "{volume}" and "{balance}" properties for a sound coming from the sprite, relative to the center of the screen.  Used for [article:docs/Audio Guide|2D Spacial Effects], the {volume} will decrease the further the sprite is away from the center of the screen, and the {balance} will reflect the sprite's horizontal position.  The optional argument is the maximum distance from the center of the screen (in pixels) before the sound volume reaches zero and does not play (defaults to screen size).  Example:

=syntax js
	var sprite = Effect.Port.getPlane('sprites').getSprite('mysprite');
	var settings = sprite.get2DSoundSettings();
	
	var track = Efect.Audio.getTrack('engine_loop.mp3');
	track.setVolume( settings.volume );
	track.setBalance( settings.balance );

Also see [Sprite.playSound2D()].

=section #.#.#.#. Sprite.captureMouse()

=deflist
	Syntax | {OBJECT captureMouse()}

This function instructs the engine that you want relevant mouse events delivered to the sprite object directly.  After calling this method on an instance of your sprite, you simply have to define {onMouseOver}, {onMouseOut}, {onMouseDown}, {onMouseUp}, and/or {onMouseMove} methods in your sprite class.  The return value is the sprite object itself, for chaining calls together.  Example:

=syntax js
	MySprite.add({
		setup: function() {
			// we want mouse events!
			this.captureMouse();
		},
		
		onMouseDown: function(pt, buttonIdx) {
			// mouse button was click on our sprite!
		},
		
		onMouseUp: function(pt, buttonIdx) {
			// mouse button was released, after clicking on our sprite
		}
	});
