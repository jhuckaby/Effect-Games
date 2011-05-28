// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

/**
 * Effect 1.0
 * Author: Joseph Huckaby
 **/

// global variable holds flash upload API
var zero_client;

function uploadQueueStart(client, stats) {
	Debug.trace('upload', "Upload queue starting now");
	show_progress_dialog( 0, 'Starting Upload...', true );
	session.upload_in_progress = 1;
}

function uploadFileStart(client, stats) {
	Debug.trace('upload', "Upload file starting now");
	update_progress_dialog(stats.progress, "Uploading file " + stats.currentFileNum + " of " + stats.numFiles + "...");
}

function uploadProgress(client, stats) {
	update_progress_dialog(stats.progress);
}

function uploadFileComplete(client, stats) {
	Debug.trace('upload', "Upload file complete");
	update_progress_dialog(stats.progress);
}

function uploadQueueComplete() {
	// upload complete, check for error, then refresh directory
	Debug.trace('upload', "Upload queue complete");
	session.upload_in_progress = 0;

	update_progress_dialog(1.0);
	// hide_progress_dialog();

	// fire api callback
	// window[ session.upload_callback ]();
	fire_callback( session.upload_callback );
}

function uploadError(client, msg) {
	// an error occurred during upload
	session.upload_in_progress = 0;
	do_error("Upload Error: " + msg);
}

function upload_basic() {
	// do_error('File upload requires Adobe Flash Player version 9 or above.  Please <a href="http://www.adobe.com/go/getflash">click here to upgrade</a>.');
	hide_popup_dialog();
	delete session.progress;
	
	var html = '';
	
	html += '<iframe id="i_upload_basic" src="blank.html" style="position:absolute; left:-2000px; top:0px; width:1px; height:1px;"></iframe>';
	
	html += '<div class="dialog_bkgnd" style="background-image:url('+png('/effect/images/big_icons/upload.png')+')">';
	
	html += '<table cellspacing=0 cellpadding=0><tr><td width=400 height=200 valign=center align=center>';
	html += '<div class="dialog_title">Upload File</div>';
	
	html += '<div class="caption">Want to upload multiple files at once?  Please upgrade to the latest <a href="http://www.adobe.com/products/flashplayer/" target="_blank">Flash Player</a>, then reload this page.  For some reason our Flash based uploader did not load, so you are currently using our single file uploader.</div>';
	
	html += spacer(1,20) + '<br/>';
	
	var url = zero_client.targetURL;
	if (url.indexOf('?') > -1) url += '&'; else url += '?';
	url += 'format=jshtml&onafter=' + escape('window.parent.upload_basic_finish(response);');
	Debug.trace('upload', "Prepping basic upload: " + url);
	
	html += '<form id="f_upload_basic" method="post" enctype="multipart/form-data" target="i_upload_basic" action="'+url+'">';
	html += '<div id="d_upload_form">';
	
	html += '<input type="file" name="Filedata"/><br/>';
	
	html += '<br><br><table><tr>';
		html += '<td>' + large_icon_button('x', 'Cancel', "hide_popup_dialog()") + '</td>';
		html += '<td width=50>&nbsp;</td>';
		// html += '<td>' + large_icon_button('user', 'Create Account...', "Nav.go('CreateAccount')") + '</td>';
		// html += '<td width=15>&nbsp;</td>';
		html += '<td>' + large_icon_button('page_white_get.png', '<b>Upload</b>', "upload_basic_go()") + '</td>';
	html += '</tr></table>';
	
	html += '</div>';
	html += '<div id="d_upload_progress" style="display:none">';
		// progress bar
		html += '<img src="'+images_uri+'/aquaprogressbar.gif" width="196" height="20"/>';
	html += '</div>';
	html += '</form>';
	
	html += '</div>';
	
	// session.hooks.keys[ENTER_KEY] = [Comments, 'post', page_id]; // enter key
	session.hooks.keys[ESC_KEY] = 'hide_popup_dialog'; // escape key
		
	show_popup_dialog(528, 200, html);
}

function upload_basic_go() {
	$('f_upload_basic').submit();
	$('d_upload_form').hide();
	$('d_upload_progress').show();
}

function upload_basic_finish(response) {
	Debug.trace('upload', "Basic upload complete: " + dumper(response));
	setTimeout( 'upload_basic_finish_2()', 100 );
}

function upload_basic_finish_2() {
	$('i_upload_basic').src = 'blank.html';
	setTimeout( 'upload_basic_finish_3()', 100 );
}

function upload_basic_finish_3() {
	hide_popup_dialog();
	delete session.progress;
	show_progress_dialog( 0, 'Finishing Upload...', true );
	fire_callback( session.upload_callback );
}

function upload_destroy() {
	if (zero_client) {
		zero_client.destroy();
		delete ZeroUpload.clients[ zero_client.id ];
		zero_client = null;
	}
}

function prep_upload(dom_id, url, callback, types) {
	session.upload_callback = callback;
	
	if (url) {
		// add session id to url
		if (url.indexOf('?') > -1) url += '&'; else url += '?';
		url += 'session=' + session.cookie.get('effect_session_id');
	}
	
	upload_destroy();
	
	zero_client = new ZeroUpload.Client();
	if (url) zero_client.setURL( url );
	zero_client.setHandCursor( true );
	
	if (types) zero_client.setFileTypes( types[0], types[1] );
	
	zero_client.addEventListener( 'queueStart', uploadQueueStart );
	zero_client.addEventListener( 'fileStart', uploadFileStart );
	zero_client.addEventListener( 'progress', uploadProgress );
	zero_client.addEventListener( 'fileComplete', uploadFileComplete );
	zero_client.addEventListener( 'queueComplete', uploadQueueComplete );
	zero_client.addEventListener( 'error', uploadError );
	
	zero_client.addEventListener( 'debug', function(client, eventName, args) {
		Debug.trace('upload', "Caught event: " + eventName);
	} );
	
	if (dom_id) {
		Debug.trace('upload', "Gluing ZeroUpload to: " + dom_id);
		zero_client.glue( dom_id );
	}
}
