=section #. Geometry Class Reference

The Effect Engine comes with some simple 2D geometry classes, which are used as part of the collision detection system, and event system.  For details, see the [article:docs/Geometry and Collision Guide].  Here are the classes, properties and methods:

=section #.#. Point

The {Point} class represents a single 2D point in space.  Among other things, it is used in the engine for returning mouse coordinates.

=section #.#.#. Point Properties

The "origin" point ("{0,0}") is the top-left corner of the world.

=section #.#.#.#. Point.x

=deflist
	Data Type | Float
	Access | Read + Write

This is the horizontal position of the point.  Lower values are to the left, higher values are to the right.

=section #.#.#.#. Point.y

=deflist
	Data Type | Float
	Access | Read + Write

This is the vertical position of the point.  Lower values are towards the top of the screen, higher values are towards the bottom.

=section #.#.#. Point Methods

=section #.#.#.#. Point.set()

=deflist
	Syntax | {POINT set( NUMBER, NUMBER )}
	Syntax | {POINT set( POINT )}

This sets both the "{x}" and "{y}" properties of the object.  You can either pass in two separate variables, one for "{x}" and one for "{y}", or just pass in another [Point] object, and its properties will be copied to the current point.  The return value is the object itself, for chaining.  Example:

=syntax js
	var pt = new Point();
	pt.set( 50, 50 );
	
	var pt2 = new Point();
	pt2.set( pt );

=section #.#.#.#. Point.offset()

=deflist
	Syntax | {POINT offset( NUMBER, NUMBER )}
	Syntax | {POINT offset( POINT )}

This offets the point by the "{x}" and "{y}" values provided.  The values are added to the current point coordinates, so you can move a point in any direction by providing positive or negative values.  You can pass in two numbers, or a single [Point] object.  The return value is the object itself, for chaining.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	pt.offset( 5, 5 );

=section #.#.#.#. Point.floor()

=deflist
	Syntax | {POINT floor()}

This simply calls {Math.floor()} on both the "{x}" and "{y}" properties in the object.  Essentially, if either value is not an integer, they will be reduced to the closest integer that is less than the current value.  The return value is the object itself, for chaining.  Example:

=syntax js
	var pt = new Point( 50.5, 50.5 );
	pt.floor();
	assert( pt.x == 50 && pt.y == 50 );

=section #.#.#.#. Point.ceil()

=deflist
	Syntax | {POINT ceil()}

This simply calls {Math.ceil()} on both the "{x}" and "{y}" properties in the object.  Essentially, if either value is not an integer, they will be increased to the closest integer that is more than the current value.  The return value is the object itself, for chaining.  Example:

=syntax js
	var pt = new Point( 50.5, 50.5 );
	pt.ceil();
	assert( pt.x == 51 && pt.y == 51 );

=section #.#.#.#. Point.getDistance()

=deflist
	Syntax | {NUMBER getDistance( NUMBER, NUMBER )}
	Syntax | {NUMBER getDistance( POINT )}

This calculates the distance between our point, and another point.  The distance is returned as a floating point decimal.  You can either pass separate "{x}" and "{y}" values, or a single [Point] object.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	var dist = pt.getDistance( 100, 50 );
	assert( dist > 49 && dist < 51 );

The distance may not be exact, due to floating point precision in JavaScript, but it'll be close.

=section #.#.#.#. Point.getAngle()

=deflist
	Syntax | {NUMBER getAngle( NUMBER, NUMBER )}
	Syntax | {NUMBER getAngle( POINT )}

This calculates the angle between our point, and another point.  The angle is returned as a floating point decimal between "{0}" and "{360}".  You can either pass separate "{x}" and "{y}" values, or a single [Point] object.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	var angle = pt.getAngle( 100, 0 );
	assert( angle > 44 & angle < 46 );

The angle may not be exact, due to trigonometric and floating precision in JavaScript, but it'll be close.  Angles start at 3 o'clock and proceed counter-clockwise.  So 0 degrees is 3 o'clock, 90 degrees is 12 o'clock, 180 degrees is 9 o'clock, etc.

=section #.#.#.#. Point.project()

=deflist
	Syntax | {POINT project( NUMBER, NUMBER )}
	Arguments | Angle, Distance

This "projects" the current point outward based on the provided angle and distance.  This acts on the current object, so its own "{x}" and "{y}" properties are updated to match the projected point.  The return value is the object itself, for chaining.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	pt.project( 270, 100 ); // straight downward by 100
	assert( pt.x == 50 && pt.y == 150 );

The new position may not be exact, due to trigonometric and floating precision in JavaScript, but it'll be close.  However, it |will| be exact on 90 degree increments, as shown in the example above.  Angles start at 3 o'clock and proceed counter-clockwise.  So 0 degrees is 3 o'clock, 90 degrees is 12 o'clock, 180 degrees is 9 o'clock, etc.

=section #.#.#.#. Point.getMidPoint()

=deflist
	Syntax | {POINT getMidPoint( NUMBER, NUMBER )}
	Syntax | {POINT getMidPoint( POINT )}

This returns a new point that is moved halfway to the coordinates provided.  You can either pass separate "{x}" and "{y}" values, or a single [Point] object.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	var pt2 = pt.getMidPoint( 100, 100 );
	assert( pt2.x == 75 && pt2.y == 75 );

=section #.#.#.#. Point.clone()

=deflist
	Syntax | {POINT clone()}

This makes a copy of the current point, and returns it.  Example:

=syntax js
	var pt = new Point( 50, 50 );
	var pt2 = pt.clone();

=section #.#. Rect

The {Rect} class represents a 2D rectangle.  This is used in the sprite collision system.

=section #.#.#. Rect Properties

=section #.#.#.#. Rect.left

=deflist
	Data Type | Float
	Access | Read + Write

This property represents the position of the left side of the rectangle.

=section #.#.#.#. Rect.top

=deflist
	Data Type | Float
	Access | Read + Write

This property represents the position of the top of the rectangle.

=section #.#.#.#. Rect.right

=deflist
	Data Type | Float
	Access | Read + Write

This property represents the position |just beyond| the right side of the rectangle.

=section #.#.#.#. Rect.bottom

=deflist
	Data Type | Float
	Access | Read + Write

This property represents the position |just beyond| the bottom of the rectangle.

=section #.#.#. Rect Methods

=section #.#.#.#. Rect.set()

=deflist
	Syntax | {RECT set( NUMBER, NUMBER, NUMBER, NUMBER )}
	Syntax | {RECT set( RECT )}

This sets the "{left}", "{top}", "{right}" and "{bottom}" properties of the rectangle.  You can either pass in four separate variables, or just pass in another [Rect] object, and its properties will be copied to the current rectangle.  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect();
	rect.set( 0, 0, 50, 50 );
	
	var rect2 = new Rect();
	rect2.set( rect );

=section #.#.#.#. Rect.offset()

=deflist
	Syntax | {RECT offset( NUMBER, NUMBER )}
	Syntax | {RECT offset( POINT )}

This offets the rectangle by the "{x}" and "{y}" values provided.  The values are added to the current rectangle "{x}" and "{y}" properties, so you can move it in any direction by providing positive or negative values.  You can pass in two numbers, or a single [Point] object.  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	rect.offset( 5, 5 );

=section #.#.#.#. Rect.moveTo()

=deflist
	Syntax | {RECT moveTo( NUMBER, NUMBER )}
	Syntax | {RECT moveTo( POINT )}
	Syntax | {RECT moveTo( RECT )}

This moves the top-left corner of the rectangle to the coordinates specified.  You can pass in two numbers, a single [Point] object, or a single [Rect] object.  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	rect.moveTo( 100, 100 );

=section #.#.#.#. Rect.width()

=deflist
	Syntax | {NUMBER width( NUMBER )}

This returns the width of the rectangle (the "{right}" minus the "{left}"), and can also be used to set it.  Examples:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	assert( rect.width() == 50 );
	
	rect.width( 100 );
	assert( rect.right - rect.left == 100 );

=section #.#.#.#. Rect.height()

=deflist
	Syntax | {NUMBER height( NUMBER )}

This returns the height of the rectangle (the "{bottom}" minus the "{top}"), and can also be used to set it.  Examples:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	assert( rect.height() == 50 );
	
	rect.width( 100 );
	assert( rect.bottom - rect.top == 100 );

=section #.#.#.#. Rect.topLeftPoint()

=deflist
	Syntax | {POINT topLeftPoint()}

This returns a point that is positioned at the top-left corner of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var pt = rect.topLeftPoint();
	assert( pt.x == 0 && pt.y == 0 );

=section #.#.#.#. Rect.topRightPoint()

=deflist
	Syntax | {POINT topRightPoint()}

This returns a point that is positioned at the top-right corner of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var pt = rect.topRightPoint();
	assert( pt.x == 50 && pt.y == 0 );

=section #.#.#.#. Rect.bottomRightPoint()

=deflist
	Syntax | {POINT bottomRightPoint()}

This returns a point that is positioned at the bottom-right corner of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var pt = rect.bottomRightPoint();
	assert( pt.x == 50 && pt.y == 50 );

=section #.#.#.#. Rect.bottomLeftPoint()

=deflist
	Syntax | {POINT bottomLeftPoint()}

This returns a point that is positioned at the bottom-left corner of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var pt = rect.bottomLeftPoint();
	assert( pt.x == 0 && pt.y == 50 );

=section #.#.#.#. Rect.centerPoint()

=deflist
	Syntax | {POINT centerPoint()}

This returns a point that is positioned right at the center of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var pt = rect.centerPoint();
	assert( pt.x == 25 );

=section #.#.#.#. Rect.centerPointX()

=deflist
	Syntax | {NUMBER centerPointX()}

This returns the horizontal center position in the middle of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var x = rect.centerPointX();
	assert( x == 25 );

=section #.#.#.#. Rect.centerPointY()

=deflist
	Syntax | {NUMBER centerPointY()}

This returns the vertical center position in the middle of the rectangle.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var y = rect.centerPointY();
	assert( y == 25 );

=section #.#.#.#. Rect.pointIn()

=deflist
	Syntax | {BOOLEAN pointIn( NUMBER, NUMBER )}
	Syntax | {BOOLEAN pointIn( POINT )}

This determines if a point is located inside our rectangle, and returns {true} if this is case, or {false} of the point is outside.  You can pass in two numbers, or a single [Point] object.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	assert( rect.pointIn( 25, 25 ) == true );
	assert( rect.pointIn( 100, 100) == false );

=section #.#.#.#. Rect.rectIn()

=deflist
	Syntax | {BOOLEAN rectIn( RECT )}

This determines if a rectangle intersects our rectangle.  It returns {true} if this is case, which includes partial intersection, and {false} if the rectangle is |entirely| outside ours.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var rect2 = new Rect( 25, 25, 75, 75 ); // intersects
	var rect3 = new Rect( 100, 100, 200, 200 ); // does not
	
	assert( rect.rectIn(rect2) == true );
	assert( rect.rectIn(rect3) == false );

=section #.#.#.#. Rect.clone()

=deflist
	Syntax | {RECT clone()}

This makes a copy of the current rectangle, and returns it.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var rect2 = rect.clone();

=section #.#.#.#. Rect.morph()

=deflist
	Syntax | {RECT morph( RECT, NUMBER, STRING, STRING )}
	Arguments | Target Rectangle, Amount, Tween Mode, Tween Algorithm

This "morphs" a rectangle into another.  Meaning, given our rectangle and a destination rectangle, our current rectangle's position and size are changed to partially or completely match the destination rectangle, at a given amount ("{0.0}" to "{1.0}").  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var rect2 = new Rect( 100, 100, 200, 200 );
	
	rect.morph( rect2, 0.5 ); // morph half way
	assert( rect.left == 50 && rect.width() == 75 );

The tween mode and algorithm are optional arguments, and if omitted, standard linear interpolation is used.  See the [article:docs/Tweening Guide] for details on tweening.  Example:

=syntax js
	rect.morph( rect2, 0.5, 'EaseOut', 'Quadratic' );

=section #.#.#.#. Rect.inset()

=deflist
	Syntax | {RECT inset( NUMBER, NUMBER )}
	Arguments | Horizontal Amount, Vertical Amount

This collapses or expands all sides of the rectangle, by the given horizontal and vertical amounts.  Meaning, the left and top sides are incremented by the amounts given, and the right and bottom sides are decremented.  You can omit the second (vertical) argument, if it matches the first (horizontal).  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	rect.inset( 2, 2 ); // new coords: 2, 2, 48, 48

=section #.#.#.#. Rect.union()

=deflist
	Syntax | {RECT union( RECT )}

This converts the current rectangle to be a union with the specified rectangle.  This means that the rectangle becomes large enough to encompass both rectangles.  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var rect2 = new Rect( 25, 25, 75, 75 );
	
	rect.union( rect2 ); // new coords: 0, 0, 75, 75

=section #.#.#.#. Rect.intersect()

=deflist
	Syntax | {RECT intersect( RECT )}

This converts the current rectangle to be an intersection with the specified rectangle.  This means that the rectangle becomes small enough to encompass only the overlapping area of the two rectangles.  If the rectangles do not overlap, the current rectangle will be invalid.  The return value is the object itself, for chaining.  Example:

=syntax js
	var rect = new Rect( 0, 0, 50, 50 );
	var rect2 = new Rect( 25, 25, 75, 75 );
	
	rect.intersect( rect2 ); // new coords: 25, 25, 50, 50
