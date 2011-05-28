// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

Class.create( 'GrowlManager', {
	
	lifetime: 10,
	marginRight: 0,
	marginTop: 0,
	
	__construct: function() {
		this.growls = [];
	},
	
	growl: function(type, msg) {
		// prevent duplicate messages
		if (find_object(this.growls, { type: type, msg: msg })) return;
				
		var div = $(document.createElement('div'));
		div.className = 'growl_message ' + type;
		div.setOpacity(0.0);
		div.innerHTML = '<div class="growl_message_inner">' + msg + '<br/>' + spacer(1,5) + '</div>';
		$('d_growl_wrapper').insertBefore( div, $('d_growl_top').nextSibling );
		
		var growl = { id:get_unique_id(), type: type, msg: msg, opacity:0.0, start:hires_time_now(), div:div };
		
		this.growls.push(growl);
		this.handle_resize();
		
		this.animate(growl);
		
		var self = this;
		div.onclick = function() {
			delete_object(self.growls, { id: growl.id });
			$('d_growl_wrapper').removeChild( div );
		};
	},
	
	animate: function(growl) {
		// fade opacity in, out
		if (growl.deleted) return;
		
		var now = hires_time_now();
		var div = growl.div;
		
		if (now - growl.start <= 0.5) {
			// fade in
			div.setOpacity( tweenFrame(0.0, 1.0, (now - growl.start) * 2, 'EaseOut', 'Quadratic') );
		}
		else if (now - growl.start <= this.lifetime) {
			// sit around looking pretty
			if (!growl._fully_opaque) {
				div.setOpacity( 1.0 );
				growl._fully_opaque = true;
			}
		}
		else if (now - growl.start <= this.lifetime + 1.0) {
			// fade out
			div.setOpacity( tweenFrame(1.0, 0.0, (now - growl.start) - this.lifetime, 'EaseOut', 'Quadratic') );
		}
		else {
			// die
			delete_object(this.growls, { id: growl.id });
			$('d_growl_wrapper').removeChild( div );
			return; // stop animation timer
		}
		
		var self = this;
		setTimeout( function() { self.animate(growl); }, 33 );
	},
	
	handle_resize: function() {
		// reposition growl wrapper
		var div = $('d_growl_wrapper');
		
		if (this.growls.length) {
			var size = getInnerWindowSize();
			div.style.top = '' + (10 + this.marginTop) + 'px';
			div.style.left = '' + Math.floor((size.width - 310) - this.marginRight) + 'px';
		}
		else {
			div.style.left = '-2000px';
		}
	}
	
} );

window.$GR = new GrowlManager();

if (window.addEventListener) {
	// Good browsers
	window.addEventListener( "resize", function() {
		$GR.handle_resize();
	}, false );
}
else if (window.attachEvent && !ie6) {
	// Bad browsers
	window.attachEvent("onresize", function() {
		$GR.handle_resize();
	});
}
