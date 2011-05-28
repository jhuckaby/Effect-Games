<?
	$self->set_ttl( 'ViewTTL' );
	$self->{session}->{request}->content_type( 'text/javascript' );
	
	foreach my $file ('js/iepngfix_tilebg.js', 'js/ZeroUpload.js', 'js/ZeroClipboard.js', 'js/lib/md5.js', 'js/lib/oop.js', 'js/lib/tools.js', 'js/lib/xml.js', 'js/lib/ajax.js', 'js/lib/cookie.js', 'js/lib/word_wrap.js', 'js/render.js', 'js/lib/event.js', 'js/webcam.js', 'js/upload.js', 'js/Debug.class.js', 'js/effect.js', 'js/api.js', 'js/nav.js', 'js/blog.js', 'js/comments.js', 'js/menu.js', 'js/growl.js', 'js/Page.class.js', 'js/PageManager.class.js', 'js/pages/main.js', 'js/pages/search.js') {
		$buffer .= load_file( $file );
	}
	
	$buffer =~ s@\/\*(.*?)\*\/@@sg;
	$buffer =~ s@(\n|^)\/\/[^\n]*@@g;
	$buffer =~ s@([^:\\\n\/])\/\/[^\n]*@$1@g;
	$buffer =~ s@\n\s+@\n@g;
?>
