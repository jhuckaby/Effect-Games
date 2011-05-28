#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

# Manually insert article (deletes existing)

use strict;
use File::Basename;
use English qw( -no_match_vars ) ;
use Digest::MD5 qw/md5_hex/;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use Effect::Storage;
use Doxter;

$| = 1;

my (undef, undef, $n_uid, $n_gid) = getpwnam('www');
if (!$n_uid) { die "Cannot determine web UID"; }

if (($UID != 0) && ($UID != $n_uid)) { die "\nError: Must be root to insert articles.  Exiting.\n"; }

##
# Become web user
##
if ($EUID != $n_uid) {
	print "Becoming web user...";
	$GID = $EGID = $n_gid;
	$UID = $EUID = $n_uid;
	print "done.\n";
}

my $config = parse_xml( '/effect/conf/Effect.xml' );

my $storage = new Effect::Storage(
	config => $config->{StorageConfig}
);

while (my $doc_file = (shift @ARGV)) {
	print "\nInserting article: $doc_file\n";
	insert_article( '', '', '', '', load_file($doc_file) );
	print "\nArticle was posted.  THE END!\n\n";
}

exit;

sub dih_image {
	##
	# Doxter Inline Handler for [image:USERNAME/FILENAME] placeholders
	##
	my ($doxter, $filename) = @_;
	# my $url = ($filename =~ /^http\:\/\//) ? $filename : ('/effect/api/view/users/' . $doxter->{args}->{username} . '/images/' . $filename);
	my $url = $filename;
	if ($url =~ m@^(\w+)/(\w+\.\w+)$@) {
		$url = '/effect/api/view/users/' . $1 . '/images/' . $2;
	}
	return '<img class="dx_inline_image" src="'.$url.'"'.'>' . "\n";
}

sub dch_image {
	##
	# Doxter Command Handler for =image USERNAME/FILENAME commands
	##
	my ($doxter, $filename) = @_;
	# my $url = ($filename =~ /^http\:\/\//) ? $filename : ('/effect/api/view/users/' . $doxter->{args}->{username} . '/images/' . $filename);
	my $url = $filename;
	my $attribs_raw = '';
	if ($url =~ s@^(\S+)\s+(.+)$@$1@) {
		$attribs_raw = $2;
	}
	if ($url =~ m@^(\w+)/(\w+\.\w+)$@) {
		$url = '/effect/api/view/users/' . $1 . '/images/' . $2;
	}
	
	my $extra_classes = '';
	if ($attribs_raw =~ s@\bclass\=\"(.+?)\"\s*@@) {
		$extra_classes = ' ' . $1;
	}
	
	return '<div class="dx_image_wrapper"><img src="'.$url.'" class="dx_image'.$extra_classes.'" '.$attribs_raw.' /></div>' . "\n";
}

sub dih_api {
	##
	# Doxter Inline Handler for [api:FUNCTION], example: [api:Sprite.get2DSoundSettings()]
	# Link to section include API Reference document
	##
	my ($doxter, $section_name) = @_;
	
	my $link_title = $section_name;
	if ($section_name =~ s/\s+(.+)$//) {
		$link_title = $1;
	}
	
	my $link_id = $section_name; $link_id =~ s@\W+@_@g;
	my $link_url = '#Article/docs/API_Reference_Guide|' . $link_id;
	return '<a href="'.$link_url.'" class="dx_inline_link dx_inline_code">' . $link_title . '</a>';
}

sub dih_button {
	##
	# Doxter Inline Handler for [button:ICON URI LABEL]
	##
	my ($doxter, $args_raw) = @_;
	my ($icon, $uri, $label) = split(/\s+/, $args_raw, 3);
	
	my $onclick = 'window.open(\''.$uri.'\')';
	if ($uri =~ /\.zip$/i) { $onclick = 'window.location=\''.$uri.'\''; }
	
	my $html = '';
	
	$html .= '<div class="button" style="font-family: \'Lucida Grande\', Helvetica, Arial, sans-serif; font-size: 12px; font-style: normal; font-variant: normal; font-weight: bold;" onClick="'.$onclick.'">';
		$html .= '<ul>';
			$html .= '<li class="left"></li>';
			$html .= '<li class="icon"><img src="/effect/images/icons/'.$icon.'" width="16" height="16"/></li>';
			$html .= '<li class="center" style="padding-left:5px;">' . $label . '</li>';
			$html .= '<li class="right"></li>';
		$html .= '</ul>';
		$html .= '<div class="clear"></div>';
	$html .= '</div>';
	
	$html .= '<div class="clear"></div>';
	
	return $html;
}

sub insert_article {
	my ($path, $tags, $stags, $title, $body) = @_;
	
	my $doxter = new Doxter(
		debug => 1,
		section_numbers => 0
	);
	
	$doxter->set_inline_handler( 'image', \&dih_image );
	$doxter->set_command_handler( 'image', \&dch_image );
	$doxter->set_inline_handler( 'api', \&dih_api );
	$doxter->set_inline_handler( 'button', \&dih_button );
	
	# handle our own includes
	$body =~ s/\n\=include\s+(\S+)\n/ "\n" . trim(load_file($1)) . "\n"; /eg;
	
	my $response = $doxter->format_text( $body );
	
	if (scalar @{$response->{warnings}}) {
		print "\nDoxter Warnings:\n";
		foreach my $warning (@{$response->{warnings}}) {
			print "\t$warning\n";
		}
		print "\n";
	}
	
	# allow article source text to set path, title, tags and stags
	if (!$path && $response->{article_path}) { $path = $response->{article_path}; }
	if (!$title && $response->{article_title}) { $title = $response->{article_title}; }
	if (!$tags && $response->{article_tags}) { $tags = $response->{article_tags}; }
	if (!$stags && $response->{article_stags}) { $stags = $response->{article_stags}; }
	
	my $article_id = get_url_friendly_title($title);
	my $storage_key = '/articles' . $path . '/' . $article_id;
	
	my $need_index_tags = 1;
	my $need_index_stags = 1;
	
	# if article already exists, we must unindex it
	my $old_article = $storage->get_metadata( $storage_key );
	if ($old_article) {
		while ($storage->list_find_cut( '/article_categories' . $path, { ArticleID => $article_id } )) {1;}
		
		$need_index_tags = 0;
		if ($old_article->{Tags} && ($old_article->{Tags} ne $tags)) {
			foreach my $tag (split(/\,\s*/, $old_article->{Tags})) {
				my $nice_tag = get_url_friendly_title($tag);
				my $tag_key = '/article_tags/' . $nice_tag;
				while ($storage->list_find_cut( $tag_key, { ArticleID => $article_id } )) {1;}
			}
			$need_index_tags = 1;
		}
		elsif (!$old_article->{Tags} && $tags) {
			$need_index_tags = 1;
		}
		
		$need_index_stags = 0;
		if ($old_article->{STags} && ($old_article->{STags} ne $stags)) {
			foreach my $stag (split(/\,\s*/, $old_article->{STags})) {
				my $nice_stag = get_url_friendly_title($stag);
				my $stag_key = '/article_stags/' . $nice_stag;
				while ($storage->list_find_cut( $stag_key, { ArticleID => $article_id } )) {1;}
			}
			$need_index_stags = 1;
		}
		elsif (!$old_article->{STags} && $stags) {
			$need_index_stags = 1;
		}
		
		print "Deleting article: $storage_key\n";
		$storage->delete_record( $storage_key );
	} # old article
	
	my $num_chunks = scalar @{$response->{chunks}};
	
	print "Storing article: $storage_key\n";
	$storage->create_record( $storage_key, {
		ArticleID => $article_id,
		Path => $path,
		Tags => $tags,
		STags => $stags,
		Title => $title,
		Preview => $response->{preview},
		Username => $response->{article_author} || 'jhuckaby',
		Status => 'published',
		Comments => $old_article ? $old_article->{Comments} : 0,
		AllowComments => $response->{article_comments} ? 1 : 0,
		Published => time(),
		Chunks => $num_chunks,
		Params => $response->{params}
	} );
	
	print "Storing source.txt\n";
	$storage->store_file( $storage_key, 'source.txt', $body );
	
	print "Storing doxter.html\n";
	$storage->store_file( $storage_key, 'doxter.html', $response->{html} );
	
	my $chunk_num = 1;
	foreach my $chunk (@{$response->{chunks}}) {
		print "Storing chunk $chunk_num/$num_chunks (" . length($chunk) . " bytes)\n";
		$storage->store_file( $storage_key, $chunk_num.'.html', $chunk );
		$chunk_num++;
	}
	
	my $stub = {
		ArticleID => $article_id,
		Path => $path
	};
	
	my $cat_key = '/article_categories' . $path;
	print "Storing stub in category: $cat_key\n";
	$storage->list_unshift( $cat_key, $stub );
	
	if ($tags && $need_index_tags) {
		foreach my $tag (split(/\,\s*/, $tags)) {
			my $nice_tag = get_url_friendly_title($tag);
			my $tag_key = '/article_tags/' . $nice_tag;
			print "Storing stub in tag: $tag_key\n";
			$storage->list_unshift( $tag_key, $stub );
		}
	}
	if ($stags && $need_index_stags) {
		foreach my $stag (split(/\,\s*/, $stags)) {
			my $nice_stag = get_url_friendly_title($stag);
			my $stag_key = '/article_stags/' . $nice_stag;
			print "Storing stub in stag: $stag_key\n";
			$storage->list_unshift( $stag_key, $stub );
		}
	}
	
	$storage->commit();
	
	print "\nView your article here: #Article" . $path . '/' . $article_id . "\n";
}

sub get_url_friendly_title {
	# convert title to URL_Friendly_Version_Like_This
	my $title = shift;
	$title =~ s/\W+/_/g; # non-alpha to _
	if (length($title) > 40) { $title = substr($title, 0, 40); }
	$title =~ s/^_+//; # strip leading _
	$title =~ s/_+$//; # string trailing _
	return $title;
}

1;
