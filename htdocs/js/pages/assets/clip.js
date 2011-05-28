// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

assetmgr.copy_clip = function() {
	// copy link to virtual clipboard
	this.clip_contents = first_key( this.selection );
	this.update_floater();
};
