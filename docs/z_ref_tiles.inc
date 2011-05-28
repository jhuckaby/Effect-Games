=section #. Tiles

Tiles are special graphics you can display in a grid, which can scroll with the level.  These are mainly for [wikipedia:Tile-based_game#Video_games, tile-based games], but can also be used to create parallax scrolling backgrounds.

=section #.#. TilePlane

A {TilePlane} is a layer of tiles in the world.  It inherits from the [Plane] base class.

=section #.#.#. TilePlane Properties

The following properties are inherited from the [Plane] base class:

=list
	[Plane.id]
	[Plane.scrollX]
	[Plane.scrollY]
	[Plane.scrollSpeed]
	[Plane.zIndex]
	[Plane.visible]

Here are all the public properties in the [TilePlane] class.

=section #.#.#.#. TilePlane.tileSizeX

=deflist
	Data Type | Integer
	Access | Read Only

This is the horizontal pixel size of the tiles.  This is typically set in the web interface, and populated automatically when levels are loaded, but you can set it for custom planes using [TilePlane.setTileSize()].

=section #.#.#.#. TilePlane.tileSizeY

=deflist
	Data Type | Integer
	Access | Read Only

This is the vertical pixel size of the tiles.  This is typically set in the web interface, and populated automatically when levels are loaded, but you can set it for custom planes using [TilePlane.setTileSize()].

=section #.#.#.#. TilePlane.tileImagePath

=deflist
	Data Type | String
	Access | Read + Write

This is the asset directory path to where the tile graphics are stored.  This is typically set in the web interface, and populated automatically when levels are loaded, but can be set manually for custom planes.

=section #.#.#.#. TilePlane.opacity

=deflist
	Data Type | Float
	Access | Read Only

Global opacity for entire tile plane ("{0.0}" to "{1.0}").  To set this, call [TilePlane.setOpacity()].  Please note that setting opacity on a plane that contains transparent [wikipedia:PNG] images does not work properly in all browsers (namely IE and Chrome).

=section #.#.#.#. TilePlane.spritePlane

=deflist
	Data Type | Object
	Access | Read Only

This holds a reference to a [SpritePlane], if linked via [TilePlane.linkSpritePlane()].  Used for collision detection.

=section #.#.#. TilePlane Methods

Here are all the public methods in the [TilePlane] class.

=section #.#.#.#. TilePlane.setTileset()

=deflist
	Syntax | {VOID setTileset( STRING )}

This assigns a Tileset to the TilePlane, specified by its ID.  This is performed automatically for you when levels are loaded, so there is rarely any need to call this method directly.  However, if you aren't using levels and creating TilePlanes manually, call this |before| attaching the plane to the main display port.  Example:

=syntax js
	var tplane = new TilePlane( 'tiles' );
	tplane.setTileset( 'MyTilesetID' );
	Effect.Port.attach( tplane );

=section #.#.#.#. TilePlane.setTileSize()

=deflist
	Syntax | {VOID setTileSize( INTEGER, INTEGER )}
	Arguments | Pixel Width, Pixel Height

This sets the tile width and height for the plane.  This should never need to be called directly, as the plane is setup automatically when levels are loaded.  It is included here for completeness.  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setTileSize( 32, 32 );

=section #.#.#.#. TilePlane.setTilesPerChunk()

=deflist
	Syntax | {setTilesPerChunk( INTEGER, INTEGER )}
	Arguments | Max X, Max Y

This sets the number of tiles per "chunk".  Tiles are rendered in chunks (groups) for performance, and this can set the number of tiles that each chunk can hold.  You should never need to call this directly, as the engine automatically sets this based on the tile size, screen size, and browser / OS.  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setTilesPerChunk( 4, 4, );

=section #.#.#.#. TilePlane.setOpacity()

=deflist
	Syntax | {VOID setOpacity( NUMBER )}

This sets the global opacity for the entire tile plane.  The value should be between "{0.0}" (transparent) to "{1.0}" (opaque).  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setOpacity( 0.5 );

Please note that setting opacity on a plane that contains transparent [wikipedia:PNG] images does not work properly in all browsers (namely IE and Chrome).

=section #.#.#.#. TilePlane.setInstantLoad()

=deflist
	Syntax | {VOID setInstantLoad( BOOLEAN )}

This flag indicates to the engine that all tiles should |instantly| be loaded, instead of asynchronously.  The default is "{false}" (i.e. load async).  This should only be used in very special circumstances, and only if you really know what you are doing.  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setInstantLoad( true );

=section #.#.#.#. TilePlane.getMaxTileX()

=deflist
	Syntax | {INTEGER getMaxTileX()}

This returns the maximum horizontal tile index, based on the tile size and virtual world size (see [Effect.Port.setVirtualSize()]).  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	var max_tx = tplane.getMaxTileX();

=section #.#.#.#. TilePlane.getMaxTileY()

=deflist
	Syntax | {INTEGER getMaxTileY()}

This returns the maximum vertical tile index, based on the tile size and virtual world size (see [Effect.Port.setVirtualSize()]).  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	var max_ty = tplane.getMaxTileY();

=section #.#.#.#. TilePlane.activateScreenObjects()

=deflist
	Syntax | {VOID activateScreenObjects()}

This calls [Tile.onScreen()] on all the tiles currently onscreen.  This process is performed automatically as the level scrolls, and is called on all the onscreen tiles when a level first loads.  You should rarely ever need to call this directly.  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.activateScreenObjects();

=section #.#.#.#. TilePlane.lookupTile()

=deflist
	Syntax | {MIXED lookupTile( INTEGER, INTEGER, BOOLEAN )}
	Arguments | Tile X, Tile Y, Use Object Data

This fetches and returns the tile found at the specified location in the world.  The X and Y values should be tile index numbers, not global coordinates (see [TilePlane.lookupTileFromGlobal()] for that).  You can either lookup graphical tile data (filename of visible image), or the actual tile class object that controls the behavior of the tile.  Omit the final argument for looking up graphical tile data, or pass "{true}" for fetching object data.  The return value will either be a string, or a [Tile] object.  Examples:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	
	// fetch the image filename for tile at location 5, 5
	var filename = tplane.lookupTile( 5, 5 );
	
	// fetch the actual tile object for 5, 5
	var tile = tplane.lookupTile( 5, 5, true );

=section #.#.#.#. TilePlane.lookupTileFromGlobal()

=deflist
	Syntax | {MIXED lookupTileFromGlobal( NUMBER, NUMBER, BOOLEAN )}
	Arguments | Global X, Global Y, Use Object Data

This method is similar to [TilePlane.lookupTile()], but accepts global world coordinates instead of tile index numbers (for example, those returned from [Effect.Port.getMouseCoords()]).  Pass the X and Y values of the point you want to look up, plus "{true}" if you want the tile class object.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	var tile = tplane.lookupTileFromGlobal( 50, 50, true );

=section #.#.#.#. TilePlane.setTile()

=deflist
	Syntax | {BOOLEAN setTile( INTEGER, INTEGER, MIXED, BOOLEAN )}
	Arguments | Tile X, Tile Y, Filename or Tile Object, Use Object Data

This sets a particular tile at the specified position, to the specified value.  You can set either graphical tile data (control which tile image is visible), or set the tile object that controls the behavior of the tile.  The function will return {true} if the operation succeeded, or {false} if the coordinates are outside the world boundaries.

If you are setting graphical tile data, specify the filename of the tile image (must be part of the Tileset selected for the layer), and do not pass a boolean as the fourth argument.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setTile( 5, 5, "mytile1.png" );

If you are setting a tile class object to control the behavior of the tile, pass in a reference to the object, and {true} for the final boolean.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	var tile = new MyTile();
	tplane.setTile( 5, 5, tile, true );

=section #.#.#.#. TilePlane.setTileFromGlobal()

=deflist
	Syntax | {BOOLEAN setTileFromGlobal( NUMBER, NUMBER, MIXED, BOOLEAN )}
	Arguments | Global X, Global Y, Filename or Tile Object, Use Object Data

This method is similar to [TilePlane.setTile()], but accepts global world coordinates instead of tile index numbers (for example, those returned from [Effect.Port.getMouseCoords()]).  The function will return {true} if the operation succeeded, or {false} if the coordinates are outside the world boundaries.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	tplane.setTileFromGlobal( 50, 50, "mytile1.png" );

=section #.#.#.#. TilePlane.linkSpritePlane()

=deflist
	Syntax | {VOID linkSpritePlane( OBJECT )}

This links a [SpritePlane] to our [TilePlane], so they can communicate for collision detection (see [article:docs/Geometry and Collision Guide]).  There is no return value.  Example:

=syntax js
	var tplane = Effect.Port.getPlane('tiles');
	var splane = Effect.Port.getPlane('sprites');
	
	tplane.linkSpritePlane( splane );

You can also link planes using [SpritePlane.linkTilePlane()], which does the same thing.  After calling either of these functions, the Tile Plane will have a "{spritePlane}" property, and the Sprite Plane will have a "{tilePlane}" property.

=section #.#. Tile

The {Tile} base class can be extended for your own tile behaviors.

=section #.#.#. Tile Properties

Here are the public properties of the {Tile} base class.

=section #.#.#.#. Tile.type

=deflist
	Data Type | String
	Access | Read Only

This contains the full class name of the tile (automatically set when object is instantiated).  Useful for seeing what was hit when using collision detection.

=section #.#.#.#. Tile.collisions

=deflist
	Data Type | Boolean
	Access | Read + Write

This boolean flag controls whether the collision system will register hits on this object.  If a point, line or sprite is moved into the tile, and this flag is {true}, then a hit will be registered and returned.  Defaults to {false}.

=section #.#.#.#. Tile.solid

=deflist
	Data Type | Boolean
	Access | Read + Write

This boolean flag controls whether the tile is considered "solid" or not.  When performing collision detection, the system will keep the point, line or object |outside| the boundaries of the tile.  Defaults to {false}.

=section #.#.#.#. Tile.ground

=deflist
	Data Type | Boolean
	Access | Read + Write

This boolean flag controls whether the tile is considered to be "ground" or not.  Meaning, collisions |from the top| are considered solid.  When performing collision detection, the system will keep the point, line or object |outside| the boundaries of the tile, if and only if the collision was from the top.  So for example, you could have a tile that is |not| solid, but something could still stand on it.  Defaults to {false}.

=section #.#.#.#. Tile.tx

=deflist
	Data Type | Integer
	Access | Read Only

This will contain the horiztonal tile index location of your tile.  To calculate global world coordinates, multiply this by the [TilePlane.tileSizeX].

=section #.#.#.#. Tile.ty

=deflist
	Data Type | Integer
	Access | Read Only

This will contain the vertical tile index location of your tile.  To calculate global world coordinates, multiply this by the [TilePlane.tileSizeY].

=section #.#.#.#. Tile.plane

=deflist
	Data Type | Object
	Access | Read Only

This will contain a reference to the [TilePlane] that holds your tile.

=section #.#.#. Tile Methods

Here are the public methods in the {Tile} base class.

=section #.#.#.#. Tile.onScreen()

=deflist
	Syntax | {VOID onScreen()}

While this looks like an event type, it is actually a function you can override in your tile class (the event system was not used here for performance reasons).  Whenever an instance of your tile class is instantiated onscreen, this function will be called.  You can then access your "{tx}" and "{ty}" properties to see where you are.  Example:

=syntax js
	MyTileClass.add({
		onScreen: function() {
			// we are onscreen!  let's create a sprite
			this.plane.spritePlane.createSprite( 'MySprite', {
				x: this.tx * this.plane.tileSizeX,
				y: this.ty * this.plane.tileSizeY
			} );
		}
	});
