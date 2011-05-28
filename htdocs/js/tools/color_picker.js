// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

function do_select_color(hex, callback, title) {
	session.temp_select_color_callback = callback;
	if (!title) title = 'Select Color';
	var html = '';
	
	if (!session.storage.recent_colors) session.storage.recent_colors = [];
	var recent_colors = session.storage.recent_colors;
	var height = (recent_colors.length > 0) ? 390 : 320;
	
	html += '<div class="dialog_bkgnd" style="padding-left:150px; background-image:url('+png('images/big_icons/color_palette.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height='+height+' valign=center align=center>';
	html += '<div class="dialog_title">'+title+'</div>';
	
	/* html += '<div style="width:220px; height:200px;">';
	html += '<div id="plugin" style="TOP: 58px; Z-INDEX: 20;">';
	html += '<div id="plugCUR"></div><div id="plugHEX" onmousedown="stop=0; setTimeout(\'stop=1\',100);">FFFFFF</div>';
	// html += '<div id="plugCLOSE" onmousedown="toggle(\'plugin\')">X</div><br>';
	html += '<div id="SV" onmousedown="HSVslide(\'SVslide\',\'plugin\',event)">';
	html += '<div id="SVslide" style="TOP: -4px; LEFT: -4px;"><br /></div>';
	html += '</div>';
	html += '<form id="H" onmousedown="HSVslide(\'Hslide\',\'plugin\',event)">';
	html += '<div id="Hslide" style="TOP: -7px; LEFT: -8px;"><br /></div>';
	html += '<div id="Hmodel"></div>';
	html += '</form>';
	html += '</div>';
	html += '</div>'; */
	
	hex = hex.replace(/^\#/, '');
	
	html += '<div style="width:218px; height:210px; background-color:#000; margin-left:12px;">';
	html += '<div id="plugin" style="TOP: 0px; Z-INDEX: 20;">';
	html += spacer(1,3) + '<br/>';
	html += '<div id="plugEFFECT"><form action="javascript:void(0)" onSubmit="return false;"><p align="right">Hex&nbsp;#&nbsp;';
	html += '<input class="plugEFFECThexfield" type=text size="7" maxlength="6" id="fe_clr_picker_hex" onEnter="do_commit_color()" onChange="hex_keypress()" value="'+hex+'"/>';
	html += '</p></form></div>';
	html += spacer(1,5) + '<br/>';
	// html += '<div id="plugCUR"></div><div id="plugHEX" onmousedown="stop=0; setTimeout(\'stop=1\',100);">FFFFFF</div>';
	// html += '<div id="plugCLOSE" onmousedown="toggle(\'plugin\')">X</div><br>';
	html += '<div id="SV" onmousedown="HSVslide(\'SVslide\',\'plugin\',event)">';
	html += '<div id="SVslide" style="TOP: -4px; LEFT: -4px;"><br /></div>';
	html += '</div>';
	html += '<form id="H" onmousedown="HSVslide(\'Hslide\',\'plugin\',event)">';
	html += '<div id="Hslide" style="TOP: -7px; LEFT: -8px;"><br /></div>';
	html += '<div id="Hmodel"></div>';
	html += '</form>';
	html += '</div>';
	html += '</div>';
	
	// recent colors
	if (recent_colors.length > 0) {
		html += '<div style="width:218px; margin-top:10px; margin-bottom:20px;">';
		html += '<div class="fe_label" style="margin-bottom:5px;">Recently Chosen Colors:</div>';
		for (var idx = 0, len = recent_colors.length; idx < len; idx++) {
			var color = recent_colors[idx];
			html += '<div class="recent_color" style="background-color:'+color+';" onClick="setColorFromHex(\''+color+'\')" title="'+color+'"></div>';
		}
		html += '<div class="clear"></div>';
		html += '</div>';
	}
	else {
		html += '<br/><br/>';
	}
	
	html += '<table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', 'hide_popup_dialog()') + '</td>';
		html += '<td width=50>&nbsp;</td>';
		html += '<td>' + large_icon_button('check', '<b>Select</b>', 'do_commit_color()') + '</td>';
	html += '</tr></table>';
	html += '</td></tr></table>';
	
	html += '</div>';
	
	session.hooks.keys[ENTER_KEY] = 'do_commit_color'; // enter key
	session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key
	
	show_popup_dialog(400, height, html);
	
	setTimeout( function() {
		loadSV();
		setColorFromHex(hex);
		$('fe_clr_picker_hex').onkeydown = delay_onChange_input_text;
	}, 10 );
}

function do_commit_color() {
	hide_popup_dialog();
	
	if (!session.storage.recent_colors) session.storage.recent_colors = [];
	var recent_colors = session.storage.recent_colors;
	delete_from_array( recent_colors, curColor );
	recent_colors.unshift( curColor );
	if (recent_colors.length > 14) recent_colors.pop();
	user_storage_mark();
	
	fire_callback( session.temp_select_color_callback, curColor );
	delete session.temp_select_color_callback;
}

function hex_keypress() {
	// key pressed in hex text field, set delay to process
	// after char is actually applied to field
	// setTimeout( function() {
		var hex = $('fe_clr_picker_hex').value.toUpperCase();
		if (hex.match(/^[0-9A-F]{6}$/)) {
			// valid 6-color HEXRGB, populate into picker
			setColorFromHex(hex);
			
			// curColor = '#' + hex;
			// $P('Colors').pick_color(hex);
		}
	// }, 10 );
}

/* DHTML Color Picker v1.0.3, Programming by Ulyses, ColorJack.com */
/* Updated August 24th, 2007 */
/* Heavily Hacked by Joe, 2008-02-10 */

function $S(v) { return(document.getElementById(v).style); }
function absPos(o) { var r={x:o.offsetLeft,y:o.offsetTop}; if(o.offsetParent) { var v=absPos(o.offsetParent); r.x+=v.x; r.y+=v.y; } return(r); }  
function agent(v) { return(Math.max(navigator.userAgent.toLowerCase().indexOf(v),0)); }
function toggle(v) { $S(v).display=($S(v).display=='none'?'block':'none'); }
function within(v,a,z) { return((v>=a && v<=z)?true:false); }

function XY(e,v) {
	var z=agent('msie') ? [event.clientX + document.documentElement.scrollLeft, event.clientY + document.documentElement.scrollTop] : 
		[e.pageX,e.pageY]; 
	return(z[zero(v)]); 
}

function XYwin(v) { var z=agent('msie')?[document.body.clientHeight,document.body.clientWidth]:[window.innerHeight,window.innerWidth]; return(!isNaN(v)?z[v]:z); }
function zero(v) { v=parseInt(v,10); return(!isNaN(v)?v:0); }

/* PLUGIN */

var maxValue={'h':360,'s':100,'v':100}, HSV={0:360,1:100,2:100};
var hSV=165, wSV=162, hH=163, slideHSV={0:360,1:100,2:100}, zINDEX=15, stop=1;
var curColor = '';

function HSVslide(d,o,e) {

	function tXY(e) { tY=XY(e,1)-ab.y; tX=XY(e)-ab.x; }
	function mkHSV(a,b,c) { return(Math.min(a,Math.max(0,Math.ceil((parseInt(c,10)/b)*a)))); }
	function ckHSV(a,b) { if(within(a,0,b)) return(a); else if(a>b) return(b); else if(a<0) return('-'+oo); }
	function drag(e) { if(!stop) { if(d!='drag') tXY(e);
	
		if(d=='SVslide') { ds.left=ckHSV(tX-oo,wSV)+'px'; ds.top=ckHSV(tY-oo,wSV)+'px';
		
			slideHSV[1]=mkHSV(100,wSV,ds.left); slideHSV[2]=100-mkHSV(100,wSV,ds.top); HSVupdate();

		}
		else if(d=='Hslide') { var ck=ckHSV(tY-oo,hH), j, r='hsv', z={};
		
			ds.top=(ck-5)+'px'; slideHSV[0]=mkHSV(360,hH,ck);
 
			for(var i=0; i<=r.length-1; i++) { j=r.substr(i,1); z[i]=(j=='h')?maxValue[j]-mkHSV(maxValue[j],hH,ck):HSV[i]; }

			HSVupdate(z); $S('SV').backgroundColor='#'+hsv2hex([HSV[0],100,100]);

		}
		else if(d=='drag') { ds.left=XY(e)+oX-eX+'px'; ds.top=XY(e,1)+oY-eY+'px'; }

	}}

	if(stop) { stop=''; var ds=$S(d!='drag'?d:o);

		if(d=='drag') { var oX=parseInt(ds.left,10), oY=parseInt(ds.top,10), eX=XY(e), eY=XY(e,1); $S(o).zIndex=zINDEX++; }
		else { var ab=absPos($(o)), tX, tY, oo=(d=='Hslide')?2:4; ab.x+=10; ab.y+=31; if(d=='SVslide') slideHSV[0]=HSV[0]; }

		document.onmousemove=drag; document.onmouseup=function(){ stop=1; document.onmousemove=''; document.onmouseup=''; }; drag(e);

	}
}

function HSVupdate(v) { 
	
	v=hsv2hex(HSV=v?v:slideHSV);

	// $('plugHEX').innerHTML=v;
	// $S('plugCUR').backgroundColor='#'+v;
	// $S('plugID').background='#'+v;
	
	$('fe_clr_picker_hex').value = v;
	curColor = '#' + v;
	
	// $P('Colors').pick_color(v);
		
	return(v);

}

function loadSV() { 
	
	var z='';

	for(var i=hSV; i>=0; i--) z+="<div style=\"BACKGROUND: #"+hsv2hex([Math.round((360/hSV)*i),100,100])+";\"><br /><\/div>";
	
	$('Hmodel').innerHTML=z;
	
}

/* CONVERSIONS */

function toHex(v) { v=Math.round(Math.min(Math.max(0,v),255)); return("0123456789ABCDEF".charAt((v-v%16)/16)+"0123456789ABCDEF".charAt(v%16)); }
function rgb2hex(r) { return(toHex(r[0])+toHex(r[1])+toHex(r[2])); }
function hsv2hex(h) { return(rgb2hex(hsv2rgb(h))); }	

function hsv2rgb(r) { // easyrgb.com/math.php?MATH=M21#text21

    var R,B,G,S=r[1]/100,V=r[2]/100,H=r[0]/360;

    if(S>0) { if(H>=1) H=0;

        H=6*H; F=H-Math.floor(H);
        A=Math.round(255*V*(1.0-S));
        B=Math.round(255*V*(1.0-(S*F)));
        C=Math.round(255*V*(1.0-(S*(1.0-F))));
        V=Math.round(255*V); 

        switch(Math.floor(H)) {

            case 0: R=V; G=C; B=A; break;
            case 1: R=B; G=V; B=A; break;
            case 2: R=A; G=V; B=C; break;
            case 3: R=A; G=B; B=V; break;
            case 4: R=C; G=A; B=V; break;
            case 5: R=V; G=A; B=B; break;

        }

        return([R?R:0,G?G:0,B?B:0]);

    }
    else return([(V=Math.round(V*255)),V,V]);

}

/* Additions from Joe */

function setColorFromHex(hex) {
	var color = HEX2RGB(hex);
	RGB2HSV(color); // converts in place
	
	// HSVupdate([ color.h, color.s, color.v ]);
	
	$S('SV').backgroundColor='#'+hsv2hex([color.h,100,100]);
		
	$S('Hslide').top = '' + Math.floor( (((360-color.h) / 360) * 165) - 7 ) + 'px';
	$S('SVslide').top = '' + Math.floor( (((100-color.v) / 100) * 165) - 4 ) + 'px';
	$S('SVslide').left = '' + Math.floor( ((color.s / 100) * 165) - 4 ) + 'px';
	
	slideHSV[0] = HSV[0] = color.h;
	slideHSV[1] = HSV[1] = color.s;
	slideHSV[2] = HSV[2] = color.v;
	
	curColor = '#' + hex.toString().replace(/^\#/, '');
	$('fe_clr_picker_hex').value = hex.toString().replace(/^\#/, '');
}

var hexDigitValueTable = {
	'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9,
	'A':10, 'B':11, 'C':12, 'D':13, 'E':14, 'F':15
};

function toDec(hh) {
	hh = hh.toUpperCase();
	var high = hh.substring(0,1);
	var low = hh.substring(1,2);
	return ( (hexDigitValueTable[high] * 16) + hexDigitValueTable[low] );
}

function HEX2RGB(hex) {
	hex = hex.toString().replace(/^\#/, "").toUpperCase();
	if (hex.length == 3) hex = hex.substring(0,1) + '0' + hex.substring(1,2) + '0' + hex.substring(2,3) + '0';
	if (hex.length != 6) return null;
	
	return {
		r: toDec( hex.substring(0,2) ),
		g: toDec( hex.substring(2,4) ),
		b: toDec( hex.substring(4,6) )
	};
}

function RGB2HSV (color) {
	// ripped from http://www.csgnetwork.com/csgcolorsel4.html
	// hacked to do my bidding - jh
	var r = color.r / 255; 
	var g = color.g / 255; 
	var b = color.b / 255;

	var minVal = Math.min(r, g, b);
	var maxVal = Math.max(r, g, b);
	var delta = maxVal - minVal;

	color.v = maxVal;

	if (delta == 0) {
		color.h = 0;
		color.s = 0;
	} 
	else {
		color.s = delta / maxVal;
		var del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
		var del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
		var del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;

		if (r == maxVal) {color.h = del_B - del_G;}
		else if (g == maxVal) {color.h = (1 / 3) + del_R - del_B;}
		else if (b == maxVal) {color.h = (2 / 3) + del_G - del_R;}
		
		if (color.h < 0) {color.h += 1;}
		if (color.h > 1) {color.h -= 1;}
	}
	
	color.h = Math.floor( color.h * 360 );
	color.s = Math.floor( color.s * 100 );
	color.v = Math.floor( color.v * 100 );
	
	return color;
}
