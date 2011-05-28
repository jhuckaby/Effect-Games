package Effect::Article;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Article Methods
# Part of the Effect Project
##

use strict;
use HTTP::Date;
use XML::API::Tools;
use Doxter;

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
	
	my $html = '';
	
	$html .= '<div class="button" onClick="window.open(\''.$uri.'\')">';
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

sub api_article_post {
	##
	# Post blog article
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Source' => '.+',
		'/ArticleID' => '^\w*$', # OLD ID ONLY, LEAVE BLANK FOR NEW ARTICLE
		'/Title' => '.+',
		'/Path' => '^[\w\-\/]+$',
		'/Tags' => '.*',
		'/Status' => '^(published|draft)$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	# make sure user has permission to post in this category
	return unless $self->check_privilege('/article_post_categories' . $xml->{Path});
	
	# see if article already exists
	my $old_article_id = undef;
	my $old_article = undef;
	my $old_storage_key = undef;
	
	if ($xml->{ArticleID}) {
		$old_article_id = $xml->{ArticleID};
		$old_storage_key = '/articles' . $xml->{Path} . '/' . $old_article_id;
		$old_article = $self->{storage}->get_metadata( $old_storage_key );
	
		# make sure user owns article, article is new, or user is admin
		if ($old_article && !$self->check_privilege('admin', 'readonly') && ($self->{session}->{db}->{username} ne $old_article->{Username})) {
			return $self->api_error( 'article', "You do not have enough privileges to edit this article." );
		}
	}
	
	# only allow admin to set/change STags
	if (!$self->check_privilege('admin', 'readonly')) {
		$xml->{STags} = $old_article ? ($old_article->{STags} || '') : '';
	}
	
	# you can't UNpublish an article, so if editing an existing one that is already published, new one will be too
	if ($old_article && ($old_article->{Status} eq 'published')) { $xml->{Status} = 'published'; }
	
	# format article into HTML
	my $doxter = new Doxter( debug => 0, username => $username );
	
	# handle user image viewing from inline and command tags 
	$doxter->set_inline_handler( 'image', \&dih_image );
	$doxter->set_command_handler( 'image', \&dch_image );
	$doxter->set_inline_handler( 'api', \&dih_api );
	$doxter->set_inline_handler( 'button', \&dih_button );
	
	my $orig_article_source = $xml->{Source};
	my $doc = $doxter->format_text( $xml->{Source} );
	
	if (scalar @{$doc->{warnings}}) {
		$self->{session}->{response}->{Warnings} = { Warning => $doc->{warnings} };
		$self->set_response(0, "Doxter Warnings");
		return 1;
	}
	
	my $need_index_path = $old_article ? 0 : 1;
	my $need_index_tags = $old_article ? 0 : 1;
	my $need_index_stags = $old_article ? 0 : 1;
	
	if ($xml->{Status} eq 'draft') {
		# saving draft only, no need to index (i.e. publish)
		$need_index_path = 0;
		$need_index_tags = 0;
		$need_index_stags = 0;
	}
	
	if ($old_article && ($old_article->{Status} eq 'draft') && ($xml->{Status} eq 'published')) {
		# going from draft to published, must index
		$need_index_path = 1;
		$need_index_tags = 1;
		$need_index_stags = 1;
	}
	
	# see if article is getting renamed
	my $article_id = $self->get_url_friendly_title( $xml->{Title} );
	my $storage_key = '/articles' . $xml->{Path} . '/' . $article_id;
	
	# if trying to post new article, check for dupe title
	if (!$xml->{ArticleID} && $self->{storage}->check_record_exists($storage_key)) {
		return $self->api_error('article', "An article with that title already exists in this category.  Please enter a different title.");
	}
	
	if ($old_article && ($old_article_id ne $article_id)) {
		# delete old article, new one will be posted
		my $result = $self->{storage}->delete_record( $old_storage_key );
		if (!$result) { return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error}); }
		
		return unless $self->lock_find_update_list_item( '/article_categories' . $old_article->{Path},
			{ ArticleID => $old_article_id, Path => $xml->{Path} },
			{ ArticleID => $article_id }
		);
		
		foreach my $tag ($self->parse_tag_csv($old_article->{Tags})) {
			return unless $self->lock_find_update_list_item( '/article_tags/' . $tag,
				{ ArticleID => $old_article_id, Path => $xml->{Path} },
				{ ArticleID => $article_id }
			);
		}
		
		foreach my $tag ($self->parse_tag_csv($old_article->{STags})) {
			return unless $self->lock_find_update_list_item( '/article_stags/' . $tag,
				{ ArticleID => $old_article_id, Path => $xml->{Path} },
				{ ArticleID => $article_id }
			);
		}
		
		return unless $self->lock_find_update_list_item( "/users/$username/articles",
			{ ArticleID => $old_article_id, Path => $xml->{Path} },
			{ ArticleID => $article_id }
		);
		
		if ($old_article->{Status} eq 'draft') {
			return unless $self->lock_find_update_list_item( "/users/$username/article_drafts",
				{ ArticleID => $old_article_id, Path => $xml->{Path} },
				{ ArticleID => $article_id }
			);
		}
		
		# if article has comments, rename the record so they follow our new ID
		my $old_comments_path = '/page_comments/Article' . $xml->{Path} . '/' . $old_article_id;
		my $new_comments_path = '/page_comments/Article' . $xml->{Path} . '/' . $article_id;
		if ($self->{storage}->check_record_exists($old_comments_path)) {
			$self->{storage}->lock_record( $old_comments_path, 1 );
			if (!$self->{storage}->list_rename( $old_comments_path, $new_comments_path )) {
				$self->{storage}->unlock_record( $old_comments_path );
				return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error});
			}
			$self->{storage}->unlock_record( $old_comments_path );
		}
	}
	
	my $num_chunks = scalar @{$doc->{chunks}};
	
	my $article = {
		%$xml, 
		ArticleID => $article_id, 
		Preview => $doc->{preview}, 
		Published => time(),
		Username => $username,
		Chunks => $num_chunks,
		Params => $doc->{params}
	};
	delete $article->{Source};
	
	if ($old_article) {
		foreach my $key (keys %$old_article) {
			if (!defined($article->{$key})) { $article->{$key} = $old_article->{$key}; }
		}
	}
	else {
		$article->{Comments} = 0;
	}
	
	my $result = $self->{storage}->store_metadata( $storage_key, $article );
	if (!$result) { return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error}); }
	
	$result = $self->{storage}->store_file( $storage_key, 'source.txt', $xml->{Source} );
	if (!$result) { return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error}); }
	
	$result = $self->{storage}->store_file( $storage_key, 'doxter.html', $doc->{html} );
	if (!$result) { return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error}); }
	
	my $chunk_num = 1;
	foreach my $chunk (@{$doc->{chunks}}) {
		$result = $self->{storage}->store_file( $storage_key, $chunk_num.'.html', $chunk );
		if (!$result) { return $self->api_error('article', "Failed to post article: " . $self->{storage}->{error}); }
		$chunk_num++;
	}
	
	# unindex category and tags if changed
	if ($old_article && ($old_article->{Status} eq 'published')) {
		if ($old_article->{Tags} ne $article->{Tags}) {
			# tags have changed, remove all old references
			foreach my $tag ($self->parse_tag_csv($old_article->{Tags})) {
				return unless $self->lock_find_delete_list_item(
					'/article_tags/' . $tag,
					{ ArticleID => $article_id, Path => $xml->{Path} }
				);
			}
			$need_index_tags = 1;
		}
		if ($old_article->{STags} ne $article->{STags}) {
			# stags have changed, remove all old references
			foreach my $stag ($self->parse_tag_csv($old_article->{STags})) {
				return unless $self->lock_find_delete_list_item(
					'/article_stags/' . $stag,
					{ ArticleID => $article_id, Path => $xml->{Path} }
				);
			}
			$need_index_stags = 1;
		}
	} # old_article
	
	my $stub = {
		ArticleID => $article_id, 
		Path => $xml->{Path}
	};
	
	if ($need_index_path) {
		my $cat_key = '/article_categories' . $xml->{Path};
		$self->log_debug(5, "Storing stub in category: $cat_key" );
		return unless $self->lock_list_unshift( $cat_key, $stub );
	}
	
	if ($need_index_tags) {
		foreach my $tag ($self->parse_tag_csv($article->{Tags})) {
			my $tag_key = '/article_tags/' . $tag;
			$self->log_debug(5, "Storing stub in tag: $tag_key" );
			return unless $self->lock_list_unshift( $tag_key, $stub );
		}
	}
	
	if ($need_index_stags) {
		foreach my $stag ($self->parse_tag_csv($article->{STags})) {
			my $stag_key = '/article_stags/' . $stag;
			$self->log_debug(5, "Storing stub in stag: $stag_key" );
			return unless $self->lock_list_unshift( $stag_key, $stub );
		}
	}
	
	# if saving a draft for the first time, add to user drafts
	if (!$old_article && ($xml->{Status} eq 'draft')) {
		return unless $self->lock_list_unshift( "/users/$username/article_drafts", $stub );
	}
	
	# if converting from draft to published, remove from user drafts
	if ($old_article && ($old_article->{Status} eq 'draft') && ($xml->{Status} eq 'published')) {
		return unless $self->lock_find_delete_list_item(
			"/users/$username/article_drafts",
			{ ArticleID => $old_article_id, Path => $xml->{Path} }
		);
	}
	
	# if publishing for the first time, add to user articles
	if ((!$old_article && ($xml->{Status} eq 'published')) || ($old_article && ($old_article->{Status} eq 'draft') && ($xml->{Status} eq 'published'))) {
		return unless $self->lock_list_unshift( "/users/$username/articles", $stub );
		
		$self->user_log_msg( "Posted article" );
		$self->user_update_stats( Articles => '+1' );
		
		# possibly notify admins
		my $cat_defs = $self->{storage}->permacache_get('/admin/article_categories');
		my $cat_def = find_object( $cat_defs->{Category}, Path => $xml->{Path} );
		if ($cat_def && $cat_def->{_Attribs}->{Notify}) {
			$self->log_debug(5, "Sending notification to admins for new article in: " . $xml->{Path});
			
			my $user = $self->get_user( $username ) || { FullName => 'Unknown' };
			
			my $article_url = $self->get_base_url() . '#Article' . $xml->{Path} . '/' . $article_id;
			my $body = "New " . $cat_def->{_Attribs}->{Title} . " Article Posted: " . $xml->{Title} . "\n";
			$body .= $article_url . "\n\n";
			$body .= "Author: $username (" . $user->{FullName} . ")\n\n";
			$body .= $orig_article_source;
			$body .= "\n\n";

			if (!$self->send_email(
				From     => $self->{config}->{Emails}->{From},
				To       => $self->{config}->{ContactEmail},
				Subject  => "New " . $cat_def->{_Attribs}->{Title} . " Article Posted: " . $xml->{Title},
				Data     => $body
			)) {
				$self->log_debug(2, "Failed to send email to " . $self->{config}->{ContactEmail});
			}
		} # admin notify yes
		
		$self->log_transaction( 'article_post', $storage_key );
	}
	else {
		$self->log_transaction( 'article_update', $storage_key );
	}
	
	$self->{session}->{response}->{ArticleID} = $article_id;
	$self->{session}->{response}->{Path} = $xml->{Path};
	$self->set_response(0, "Success");
}

sub api_article_delete {
	##
	# Delete article
	##
	my $self = shift;
	return unless $self->require_xml(
		'/ArticleID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	# make sure user has permission to post in this category
	return unless $self->check_privilege('/article_post_categories' . $xml->{Path});
	
	my $storage_key = '/articles' . $xml->{Path} . '/' . $xml->{ArticleID};
	my $article = $self->{storage}->get_metadata( $storage_key );
	
	if (!$article) {
		return $self->api_error('article', "Article not found: $storage_key");
	}
	
	my $author = $article->{Username};

	# make sure user owns article, or user is admin
	if (!$self->check_privilege('admin', 'readonly') && ($self->{session}->{db}->{username} ne $article->{Username})) {
		return $self->api_error( 'article', "You do not have enough privileges to delete this article." );
	}
	
	# unindex path and tags if published
	if ($article->{Status} eq 'published') {
		# published
		return unless $self->lock_find_delete_list_item( '/article_categories' . $article->{Path},
			{ ArticleID => $xml->{ArticleID}, Path => $xml->{Path} }
		);
		
		if ($article->{Tags}) {
			$self->log_debug(5, "Removing tag indexes: " . $article->{Tags});
			foreach my $tag ($self->parse_tag_csv($article->{Tags})) {
				$self->log_debug(5, "Unindexing tag: $tag");
				return unless $self->lock_find_delete_list_item(
					'/article_tags/' . $tag,
					{ ArticleID => $xml->{ArticleID}, Path => $xml->{Path} }
				);
			}
		}
		
		if ($article->{STags}) {
			$self->log_debug(5, "Removing stag indexes: " . $article->{STags});
			foreach my $stag ($self->parse_tag_csv($article->{STags})) {
				$self->log_debug(5, "Unindexing stag: $stag");
				return unless $self->lock_find_delete_list_item(
					'/article_stags/' . $stag,
					{ ArticleID => $xml->{ArticleID}, Path => $xml->{Path} }
				);
			}
		}
		
		return unless $self->lock_find_delete_list_item( "/users/$author/articles",
			{ ArticleID => $xml->{ArticleID}, Path => $xml->{Path} }
		);
	} # published
	else {
		# draft only
		return unless $self->lock_find_delete_list_item( "/users/$author/article_drafts",
			{ ArticleID => $xml->{ArticleID}, Path => $xml->{Path} }
		);
	}
	
	# delete main article dataset
	my $result = $self->{storage}->delete_record( $storage_key );
	if (!$result) { return $self->api_error('article', "Failed to delete article: $storage_key: " . $self->{storage}->{error}); }
	
	$self->set_response(0, "Success");
}

sub get_full_article {
	##
	# Fetch article including HTML, used by article.psp.html
	##
	my ($self, $path, $article_id) = @_;
	
	my $storage_key = '/articles' . $path . '/' . $article_id;
	my $article = $self->{storage}->get_metadata( $storage_key );
	if (!$article) { return undef; }
	
	my $html = $self->{storage}->get_file_contents( $storage_key, 'doxter.html' );
	if (!$html) { return undef; }
	
	my $cat_data = $self->{storage}->permacache_get( '/admin/article_categories' );
	my $cat = find_object( $cat_data->{Category}, { Path => $path } );
	my $cat_title = 'Uncategorized';
	if ($cat) {
		$cat_title = $cat->{_Attribs}->{Title};
	}
	if (!$cat && ($path =~ m@^/games/(\[\w\-]+)$@)) {
		my $game_id = $1;
		my $game = $self->{storage}->get_metadata( $path );
		if ($game) { $cat_title = $game->{Title}; }
	}
	
	return { %$article, HTML => $html, CatTitle => $cat_title };
}

sub api_article_get {
	##
	# Fetch formatted HTML for article given its ID
	##
	my $self = shift;
	return unless $self->require_query(
		path => '^[\w\/\-]+$',
		id => '^\w+$'
	);
	my $query = $self->{session}->{query};
	
	my $storage_key = '/articles' . $query->{path} . '/' . $query->{id};
	my $article = $self->{storage}->get_metadata( $storage_key );
	if (!$article) { return $self->api_error( 'article', "Could not find article: " . $storage_key ); }
	
	my $html = $self->{storage}->get_file_contents( $storage_key, 'doxter.html' );
	if (!$html) { return $self->api_error( 'article', "Could not find article body: " . $storage_key ); }
	
	my $base_anchor = $query->{base_anchor} || '';
	if ($base_anchor) {
		$html =~ s@(href\=\"\#)_section_(\w+)@ $1 . $base_anchor . '|' . $2; @eg;
	}
	
	$self->{session}->{response}->{Row} = { %$article, HTML => $html };
	
	$self->header_out( 'Last-Modified', time2str( $article->{Published} ) );
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
}

sub api_article_stream_start {
	##
	# Start streaming article, get info and first chunk
	##
	my $self = shift;
	return unless $self->require_query(
		path => '^[\w\/\-]+$',
		id => '^\w+$'
	);
	my $query = $self->{session}->{query};
	
	my $storage_key = '/articles' . $query->{path} . '/' . $query->{id};
	my $article = $self->{storage}->get_metadata( $storage_key );
	if (!$article) { return $self->api_error( 'article', "Could not find article: " . $storage_key ); }
	
	my $chunk = $self->{storage}->get_file_contents( $storage_key, '1.html' );
	if (!$chunk) { return $self->api_error( 'article', "Could not find article body: " . $storage_key ); }
	
	my $base_anchor = $query->{base_anchor} || '';
	if ($base_anchor) {
		$chunk =~ s@(href\=\"\#)_section_(\w+)@ $1 . $base_anchor . '|' . $2; @eg;
	}
	
	$self->{session}->{response}->{Row} = { %$article, ChunkHTML => $chunk };
	
	$self->header_out( 'Last-Modified', time2str( $article->{Published} ) );
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
}

sub api_article_stream_get {
	##
	# Get chunk of article
	##
	my $self = shift;
	return unless $self->require_query(
		path => '^[\w\/\-]+$',
		id => '^\w+$',
		chunk => '^\d+$'
	);
	my $query = $self->{session}->{query};
	my $storage_key = '/articles' . $query->{path} . '/' . $query->{id};
	
	my $chunk_fh = $self->{storage}->get_file_fh( $storage_key, $query->{chunk}.'.html' );
	if (!$chunk_fh) { return $self->api_error( 'article', "Could not find article chunk: $storage_key/" . $query->{chunk} . '.html' ); }
	
	my @stats = stat($chunk_fh);
	my $chunk_size = $stats[7];
	my $chunk_mod = $stats[9];
	
	my $chunk = '';
	$chunk_fh->read( $chunk, $chunk_size );
	undef $chunk_fh;
	
	my $base_anchor = $query->{base_anchor} || '';
	if ($base_anchor) {
		$chunk =~ s@(href\=\"\#)_section_(\w+)@ $1 . $base_anchor . '|' . $2; @eg;
	}
	
	$self->{session}->{response}->{Row} = { ChunkHTML => $chunk };
	
	$self->header_out( 'Last-Modified', time2str( $chunk_mod ) );
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
}

sub api_article_edit {
	##
	# Fetch article source for editing
	##
	my $self = shift;
	return unless $self->require_query(
		path => '^[\w\/\-]+$',
		id => '^\w+$'
	);
	my $query = $self->{session}->{query};
	
	return unless $self->validate_session();
	
	my $storage_key = '/articles' . $query->{path} . '/' . $query->{id};
	my $article = $self->{storage}->get_metadata( $storage_key );
	if (!$article) { return $self->api_error( 'article', "Could not find article: " . $storage_key); }
	
	# user must be author of article, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && ($self->{session}->{db}->{username} ne $article->{Username})) {
		return $self->api_error( 'user', "You do not have enough privileges to edit this article." );
	}
	
	my $source = $self->{storage}->get_file_contents( $storage_key, 'source.txt' );
	if (!$source) { return $self->api_error( 'article', "Could not find article body: " . $storage_key ); }
	
	$self->{session}->{response}->{Article} = { %$article, Source => $source };
	
	$self->set_response(0, "Success");
}

sub api_article_preview {
	##
	# Generate Doxter preview of article source text
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Source' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	# format article into HTML
	my $doxter = new Doxter( debug => 0, username => $username );
	
	# handle user image viewing from inline and command tags 
	$doxter->set_inline_handler( 'image', \&dih_image );
	$doxter->set_command_handler( 'image', \&dch_image );
	$doxter->set_inline_handler( 'api', \&dih_api );
	$doxter->set_command_handler( 'button', \&dch_button );
	
	my $response = $doxter->format_text( $xml->{Source} );
	
	$self->{session}->{response}->{HTML} = $response->{html};
	$self->{session}->{response}->{Warnings} = { Warning => $response->{warnings} };
	
	$self->set_response(0, "Success");
}

sub api_article_search {
	##
	# Search for articles by tag or category, sorted by date descending
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$query->{limit} ||= 10;
	$query->{offset} ||= 0;
	
	if (!$query->{path} && !$query->{tag} && !$query->{stag} && !$query->{user}) { return $self->api_error( 'article', 'Missing path, tags and user' ); }
	
	my $storage_key = '';
	if ($query->{path}) {
		$storage_key = '/article_categories' . $query->{path};
	}
	elsif ($query->{tag}) {
		my $nice_tag = $self->get_url_friendly_title( $query->{tag} );
		$storage_key = '/article_tags/' . $nice_tag;
	}
	elsif ($query->{stag}) {
		my $nice_tag = $self->get_url_friendly_title( $query->{stag} );
		$storage_key = '/article_stags/' . $nice_tag;
	}
	elsif ($query->{user}) {
		$storage_key = '/users/' . $query->{user} . '/' . ($query->{key} ? $query->{key} : 'articles');
	}
	
	$self->log_debug(5, "Fetching " . $query->{limit} . " articles from list: $storage_key at location " . $query->{offset} );
	
	my $items = $self->{storage}->list_get( $storage_key, $query->{offset}, $query->{limit} );
	my $list = $self->{storage}->get_metadata($storage_key);
	
	my $rows = [];
	foreach my $item (@$items) {
		my $article_path = '/articles' . $item->{Path} . '/' . $item->{ArticleID};
		my $article = $self->{storage}->get_metadata( $article_path );
		next if !$article;
		
		if ($query->{full}) {
			my $html = $self->{storage}->get_file_contents( $article_path, 'doxter.html' );
			if (!$html) { return $self->api_error( 'article', "Could not find article body: " . $article_path ); }
			$article->{HTML} = $html;
		}
		
		push @$rows, $article;
	}
	
	$self->{session}->{response}->{Rows} = { Row => $rows };
	
	if ($list) { $self->header_out( 'Last-Modified', time2str( $list->{_Attribs}->{Modified} ) ); }
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
}

sub update_article_stat {
	##
	# Increment or decrement numerical stat in article stub
	##
	my ($self, $path, $article_id, $key, $value) = @_;
	my $article_path = '/articles' . $path . '/' . $article_id;
	$self->log_debug(5, "Updating article stat: $article_path: $key: $value");
	
	$self->{storage}->lock_record( $article_path, 1 );
	
	my $article = $self->{storage}->get_metadata( $article_path );
	if (!$article) {
		$self->{storage}->unlock_record( $article_path );
		return $self->api_error( 'article', "Could not find article: $article_path" );
	}
	
	$article->{$key} += $value;
	$self->{storage}->mark( $article_path );
	my $result = $self->{storage}->commit();
	$self->{storage}->unlock_record( $article_path );
	
	if (!$result) {
		return $self->api_error( 'article', "Comment count could not be updated: " . ($self->{storage}->{error} || $!) );
	}
	
	return 1;
}

sub api_feed {
	##
	# View (RSS) Feed
	# TODO: ATOM format support
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$self->{session}->{uri} =~ m@/feed/(.+)$@;
	my $feed = $1 || return $self->api_error( 'request', 'Bad request' );
	$feed =~ s/\?.*$//;
	
	my $fmt = 'rss';
	if ($feed =~ s/\.(\w+)$//) { $fmt = $1; }
	
	if (!($feed =~ s@^(\w+)@@)) { return $self->api_error( 'request', 'Bad request: Could not locate mode' ); }
	my $mode = $1; # category, tag, stag, game
	
	if ($mode !~ /^(category|tag|stag|game)$/) { return $self->api_error( 'request', 'Bad request: Mode not supported: ' . $mode ); }
	
	my $blog_path = '';
	my $blog_title = 'EffectGames.com: ';
	
	if ($mode eq 'category') {
		$blog_path = '/article_categories' . $feed;
		my $cat_defs = $self->{storage}->get_metadata( '/admin/article_categories' );
		my $cat_def = XMLsearch( xml=>$cat_defs->{Category}, Path => $feed );
		if (!$cat_def) { return $self->api_error( 'request', 'Bad request: Could not locate category config: ' . $feed ); }
		$blog_title .= $cat_def->{Title};
	}
	elsif ($mode eq 'tag') {
		my $tag = $feed; $tag =~ s@^/@@;
		$blog_path = '/article_tags/' . $tag;
		$blog_title .= 'Articles tagged "'.$tag.'"';
	}
	elsif ($mode eq 'stag') {
		my $stag = $feed; $stag =~ s@^/@@;
		$blog_path = '/article_stags/' . $stag;
		my $cat_defs = $self->{storage}->get_metadata( '/admin/article_categories' );
		my $stag_def = XMLsearch( xml=>$cat_defs->{STag}, Name => $stag );
		if (!$stag_def) { return $self->api_error( 'request', 'Bad request: Could not locate stag config: ' . $stag ); }
		$blog_title .= $stag_def->{Title};
	}
	elsif ($mode eq 'game') {
		my $game_id = $feed; $game_id =~ s@^/@@;
		my $game = $self->{storage}->get_metadata( '/games/' . $game_id );
		if (!$game) { return $self->api_error( 'request', 'Bad request: Cannot find game: ' . $game_id ); }
		$blog_path = '/article_categories/games/' . $game_id;
		$blog_title .= $game->{Title} . " Articles";
	}
	
	my $feed_config = $self->{config}->{RSSConfig};
	
	my $args = { %{$feed_config->{search}}, %{$query} };
	my $items = $self->{storage}->list_get( $blog_path, $args->{offset}, $args->{limit} );
	my $rows = [];
	
	foreach my $item (@$items) {
		push @$rows, $self->{storage}->get_metadata( '/articles' . $item->{Path} . '/' . $item->{ArticleID} );
	}
	
	my $rss = {};
	$rss->{_Attribs} ||= {};
	$rss->{_Attribs}->{version} = "2.0";
	$rss->{channel} = { 
		%{$feed_config->{channel}},
		title => $blog_title,
		pubDate => time2str( time() ),
		lastBuildDate => time2str( time() )
	};
	
	my $latest_date = 0;
	my $link_base = 'http://' . $ENV{'HTTP_HOST'} . $feed_config->{link_base};
	
	$rss->{channel}->{item} = [];
	foreach my $row (@$rows) {
		my $item_link = $link_base . $row->{Path} . '/' . $row->{ArticleID};
		my $item_date = $row->{Published};
		if ($item_date > $latest_date) { $latest_date = $item_date; }
		
		my $item = {
			title => $row->{Title},
			description => $row->{Preview},
			link => $item_link,
			guid => $item_link,
			pubDate => time2str( $item_date )
		};
		push @{$rss->{channel}->{item}}, $item;
	} # foreach article

	my $parser = XML::Lite->new( $rss );
	$parser->setDocumentNodeName( 'rss' );
	my $content = $parser->compose();
	
	$self->{session}->{request}->content_type('text/xml');
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str($latest_date) );
	
	$self->set_ttl( $rss->{channel}->{ttl} * 60 );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub get_url_friendly_title {
	# convert title to URL_Friendly_Version_Like_This
	my $self = shift;
	my $title = shift;
	$title =~ s/\W+/_/g; # non-alpha to _
	if (length($title) > 40) { $title = substr($title, 0, 40); }
	$title =~ s/^_+//; # strip leading _
	$title =~ s/_+$//; # string trailing _
	return $title;
}

sub parse_tag_csv {
	# parse CSV list of tags into an array (clean them up too)
	my $self = shift;
	my $csv = shift;
	my $tags = [];
	if (!$csv) { return @$tags; }
	foreach my $tag (split(/\,\s*/, $csv)) {
		my $nice_tag = $self->get_url_friendly_title($tag);
		push @$tags, lc($nice_tag);
	}
	return @$tags;
}

1;
