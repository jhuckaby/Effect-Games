package Effect::Comments;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Comment Methods
# Part of the Effect Project
##

use strict;
use Digest::MD5 qw/md5_hex/;
use HTTP::Date;
use XML::API::Tools;
use Doxter;

sub api_comment_post {
	##
	# Post user comment
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	
	return unless $self->require_xml(
		'/PageID' => '^[\w\/\-\.]+$',
		'/Name' => '.+',
		'/Comment' => '.+'
	);
	
	if ($self->get_session_id()) {
		return unless $self->validate_session();
	}
	
	$xml->{ID} = generate_unique_id();
	$xml->{ClientInfo} = get_client_info();
	$xml->{Abuse} = {};
	$xml->{Date} = time();
	
	# doxterify
	my $doxter = new Doxter(
		debug => 0,
		section_numbers => 0
	);
	my $response = $doxter->format_text( $xml->{Comment} );
	my $comment_source = $xml->{Comment};
	$xml->{Comment} = $response->{html};
	
	my $path = '/page_comments/' . $xml->{PageID};
	
	$self->{storage}->lock_record( $path, 1 );
	my $result = $self->{storage}->list_unshift( $path, $xml );
	$result &&= $self->{storage}->commit();
	$self->{storage}->unlock_record( $path );
	
	if (!$result) {
		return $self->api_error( 'comment', "Comment could not be posted: " . ($self->{storage}->{error} || $!) );
	}
	
	##
	# If page ID is an article, increment comment counter
	##
	if ($xml->{PageID} =~ /^Article(\/.+)\/([^\/]+)$/) {
		my ($article_path, $article_id) = ($1, $2);
		$self->log_debug(5, "Page is an article: $article_path/$article_id");
		
		$result = $self->update_article_stat( $article_path, $article_id, 'Comments', 1 );
		return undef unless $result;
		
		# send notify to article author, if desired
		my $orig_article = $self->{storage}->get_metadata( '/articles' . $article_path . '/' . $article_id );
		my $orig_username = $orig_article->{Username};
		$self->log_debug(5, "Article author is: $orig_username");
		my $orig_user = $self->get_user( $orig_username );
		
		if ($orig_user && $orig_user->{Preferences}->{notify_article_comments}) {
			$self->log_debug(5, "Notifying original article author $orig_username about new comment");
			my $article_url = $self->get_base_url() . '#Article' . $article_path . '/' . $article_id;
			my $body = $xml->{Name} . " commented on your article: " . $orig_article->{Title} . "\n";
			$body .= $article_url . "\n\n";
			$body .= $comment_source;
			$body .= "\n\n";
			$body .= $self->{config}->{Emails}->{CommentReplySignature} . "\n";
			
			if (!$self->send_email(
				From     => $self->{config}->{Emails}->{From},
				To       => "\"" . $orig_user->{FullName} . "\" <" . $orig_user->{Email} . ">",
				Subject  => $xml->{Name} . " commented on your article: " . $orig_article->{Title},
				Data     => $body
			)) {
				$self->log_debug(2, "Failed to send email to " . $orig_user->{Email});
			}
		} # yes, notify
	} # page is article
	elsif ($xml->{PageID} =~ /^Game\/([\w\-]+)\/([\w\.\-]+)$/) {
		my ($game_id, $rev_id) = ($1, $2);
		$self->log_debug(5, "Page is a game: $game_id ($rev_id)");
		
		my $orig_game = $self->{storage}->get_metadata( "/games/$game_id" );
		my $orig_username = $orig_game->{Owner};
		$self->log_debug(5, "Game owner is: $orig_username");
		my $orig_user = $self->get_user( $orig_username );
		
		if ($orig_user && $orig_user->{Preferences}->{notify_game_comments}) {
			$self->log_debug(5, "Notifying game owner $orig_username about new comment");
			my $game_url = $self->get_base_url() . 'games/' . $game_id . '/' . $rev_id;
			my $body = $xml->{Name} . " commented on your game: " . $orig_game->{Title} . " ($rev_id)\n";
			$body .= $game_url . "\n\n";
			$body .= $comment_source;
			$body .= "\n\n";
			$body .= $self->{config}->{Emails}->{CommentReplySignature} . "\n";
			
			if (!$self->send_email(
				From     => $self->{config}->{Emails}->{From},
				To       => "\"" . $orig_user->{FullName} . "\" <" . $orig_user->{Email} . ">",
				Subject  => $xml->{Name} . " commented on your game: " . $orig_game->{Title} . " ($rev_id)",
				Data     => $body
			)) {
				$self->log_debug(2, "Failed to send email to " . $orig_user->{Email});
			}
		} # yes, notify
	} # page is game
	
	# these only work if user is sessioned
	if ($self->get_session_id()) {
		$self->user_log_msg( "Posted comment" );
		$self->user_update_stats( Comments => '+1' );
	}
	
	$self->log_transaction( 'comment_post', compose_query($xml) );
	
	$self->{session}->{response}->{CommentID} = $xml->{ID};
	$self->set_response(0, "Comment post successful");
}

sub api_comment_feed {
	##
	# Get RSS Feed for comments
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	$self->{session}->{uri} =~ m@/comment_feed/(.+)$@;
	my $feed = $1 || return $self->api_error( 'request', 'Bad request' );
	$feed =~ s/\?.*$//;
	
	my $fmt = 'rss';
	if ($feed =~ s/\.(\w+)$//) { $fmt = $1; }
	
	# load article to grab title
	my $article_id = $feed;
	$article_id =~ s@^Article/@@;
	
	my $article = $self->{storage}->get_metadata( '/articles/' . $article_id );
	if (!$article) {
		return $self->api_error( 'comment', "Could not find article: $article_id" );
	}
	
	# setup feed
	my $rss = {};
	$rss->{_Attribs} ||= {};
	$rss->{_Attribs}->{version} = "2.0";
	$rss->{channel} = { 
		%{$self->{config}->{RSSConfig}->{channel}},
		title => 'User Comments for Article: ' . $article->{Title},
		description => 'Recent user comments for the EffectGames.com article: ' . $article->{Title},
		link => $self->get_base_url() . '#' . $feed
	};
	
	$rss->{channel}->{pubDate} = time2str( time() );
	$rss->{channel}->{lastBuildDate} = time2str( time() );
	
	my $latest_date = 0;
	
	$query->{limit} ||= 50;
	$query->{offset} ||= 0;
	
	my $path = '/page_comments/' . $feed;
	my $comments = $self->{storage}->list_get( $path, $query->{offset}, $query->{limit} );
	$comments ||= [];
	
	$rss->{channel}->{item} = [];
	foreach my $comment (@$comments) {
		my $item_link = $comment->{ID};
		my $item = {
			title => 'Comment by ' . $comment->{Name},
			description => $comment->{Comment},
			guid => $item_link,
			pubDate => time2str( $comment->{Date} )
		};
		push @{$rss->{channel}->{item}}, $item;
		
		my $item_date = $comment->{Date};
		if ($item_date > $latest_date) { $latest_date = $item_date; }
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

sub api_comment_delete {
	##
	# Delete comment (admin only)
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	
	return unless $self->require_xml(
		'/PageID' => '^[\w\/\-\.]+$',
		'/CommentID' => '^\w+$'
	);
	
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $path = '/page_comments/' . $xml->{PageID};
	
	$self->{storage}->lock_record( $path, 1 ); # exclusive
	my $idx = $self->{storage}->list_find_idx( $path, { ID => $xml->{CommentID} } );
	if ($idx == -1) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error( 'comment', "Comment not found: " . $xml->{PageID} . '/' . $xml->{CommentID} );
	}
	
	my $cut_items = $self->{storage}->list_cut( $path, $idx, 1 );
	if (!$cut_items || !@$cut_items) {
		$self->{storage}->unlock_record( $path );
		return $self->api_error( 'comment', "Comment not found: " . $xml->{PageID} . '/' . $xml->{CommentID} );
	}
	
	$self->{storage}->unlock_record( $path );
	
	# decrement comment count in article stub
	if ($xml->{PageID} =~ /^Article(\/.+)\/([^\/]+)$/) {
		my ($article_path, $article_id) = ($1, $2);
		my $result = $self->update_article_stat( $article_path, $article_id, 'Comments', -1 );
		return undef unless $result;
	}
	
	# also delete repies
	my $reply_path = '/page_comment_replies/' . $xml->{PageID} . '/' . $xml->{CommentID};
	if ($self->{storage}->check_record_exists($reply_path)) {
		$self->{storage}->list_delete( $reply_path );
	}
	
	$self->set_response(0, "Comment delete successful");
}

sub api_comment_report_abuse {
	##
	# Report abuse on a comment
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	
	return unless $self->require_xml(
		'/PageID' => '^[\w\/\-\.]+$',
		'/CommentID' => '^\w+$'
	);
	
	return unless $self->validate_session();
	
	my $path = '/page_comments/' . $xml->{PageID};
	my $item = $self->{storage}->list_find( $path, { ID => $xml->{CommentID} }, 1 );
	if (!$item) {
		return $self->api_error( 'comment', "Comment not found: " . $xml->{PageID} . '/' . $xml->{CommentID} );
	}
	
	my $abuse = $item->{Abuse} ||= {};
	my $ip_hash = md5_hex( get_remote_ip() );
	$abuse->{$ip_hash}++;
	
	# if more than 5 unique IPs reported abuse, we must act
	if ($self->check_privilege('admin', 'readonly') || (scalar keys %$abuse >= 5)) {
		$self->log_debug(2, "Comment is abuse, quarantining now");
		my $idx = $self->{storage}->list_find_idx( $path, { ID => $xml->{CommentID} } );
		
		$self->{storage}->lock_record( $path, 1 ); # exclusive
		my $cut_items = $self->{storage}->list_cut( $path, $idx, 1 );
		my $result = $self->{storage}->commit();
		$self->{storage}->unlock_record( $path );
		
		if (!$cut_items || !@$cut_items) {
			return $self->api_error( 'comment', "Comment not found: " . $xml->{PageID} . '/' . $xml->{CommentID} );
		}
		if (!$result) {
			return $self->api_error( 'comment', "Comment could not be quarantined: " . ($self->{storage}->{error} || $!) );
		}
		
		my $apath = '/page_comments/Article/main/Abuse';

		$self->{storage}->lock_record( $apath, 1 );
		$result = $self->{storage}->list_unshift( $apath, $item );
		$result &&= $self->{storage}->commit();
		$self->{storage}->unlock_record( $apath );

		if (!$result) {
			return $self->api_error( 'comment', "Comment could not be quarantined: " . ($self->{storage}->{error} || $!) );
		}
		
		# decrement comment count in article stub
		if ($xml->{PageID} =~ /^Article(\/.+)\/([^\/]+)$/) {
			my ($article_path, $article_id) = ($1, $2);
			$result = $self->update_article_stat( $article_path, $article_id, 'Comments', -1 );
			return undef unless $result;
		}
		
		# also delete repies
		my $reply_path = '/page_comment_replies/' . $xml->{PageID} . '/' . $xml->{CommentID};
		if ($self->{storage}->check_record_exists($reply_path)) {
			$self->{storage}->list_delete( $reply_path );
		}
	} # quarantine comment
	
	$self->set_response(0, "Comment abuse report successful");
}

sub api_comments_get {
	##
	# Fetch comments for a page
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $path = '/page_comments/' . $query->{page_id};
	
	my $list = $self->{storage}->get_metadata( $path );
	if ($list) { $response->{List} = $list; }
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $items = $self->{storage}->list_get( $path, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	foreach my $item (@$items) {
		if ($item->{ClientInfo}) {
			while ($item->{ClientInfo} =~ s/^(\d+\.\d+\.\d+\.\d+)\,\s*//) {;}
		}
	}
	
	$response->{Items} = { Item => $items };
	$self->set_response(0, "Search successful");
	$self->set_ttl( 'ViewTTL' );
}

sub api_comment_like {
	##
	# User likes the comment
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	
	return unless $self->require_xml(
		'/PageID' => '^[\w\/\-\.]+$',
		'/CommentID' => '^\w+$'
	);
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $like_path = "/users/$username/like/" . $xml->{PageID} . '/' . $xml->{CommentID};
	
	if ($self->{storage}->check_record_exists($like_path)) {
		return $self->api_error( 'comment_already_like', "You already like this comment." );
	}
	
	$self->{storage}->create_record( $like_path, {} );
	$self->{storage}->set_expiration( $like_path, time() + (86400 * 30) );
	
	# update reply counter in comment metadata
	my $comment_path = '/page_comments/' . $xml->{PageID};
	return unless $self->lock_find_update_list_item( $comment_path, { ID => $xml->{CommentID} }, { Like => '+1' }, 1 );
	
	$self->user_log_msg( "Liked a comment" );
	$self->user_update_stats( CommentLikes => '+1' );
	
	$self->log_transaction( 'comment_like', compose_query($xml) );
	
	$self->set_response(0, "Comment like successful");
}

sub api_comment_post_reply {
	##
	# Post user comment reply
	##
	my $self = shift;
	my $xml = $self->{session}->{xml};
	
	return unless $self->require_xml(
		'/PageID' => '^[\w\/\-\.]+$',
		'/CommentID' => '^\w+$',
		'/Name' => '.+',
		'/Comment' => '.+',
		'/PageURL' => '.+'
	);
	
	return unless $self->validate_session();
	
	$xml->{Username} = $self->{session}->{db}->{username};
	$xml->{ID} = generate_unique_id();
	$xml->{ClientInfo} = get_client_info();
	$xml->{Date} = time();
	
	my $comment_source = ''.$xml->{Comment};
	
	# doxterify
	my $doxter = new Doxter(
		debug => 0,
		section_numbers => 0
	);
	my $response = $doxter->format_text( $xml->{Comment} );
	$xml->{Comment} = $response->{html};
	
	my $path = '/page_comment_replies/' . $xml->{PageID} . '/' . $xml->{CommentID};
	
	$self->{storage}->lock_record( $path, 1 );
	my $result = $self->{storage}->list_push( $path, $xml );
	$result &&= $self->{storage}->commit();
	$self->{storage}->unlock_record( $path );
	
	if (!$result) {
		return $self->api_error( 'comment', "Reply could not be posted: " . ($self->{storage}->{error} || $!) );
	}
	
	# update reply counter in comment metadata
	my $comment_path = '/page_comments/' . $xml->{PageID};
	return unless $self->lock_find_update_list_item( $comment_path, { ID => $xml->{CommentID} }, { Replies => '+1', LastReply => time() }, 1 );
	
	# send e-mail to original comment author, if (s)he wants
	my $orig_comment = $self->{storage}->list_find( $comment_path, { ID => $xml->{CommentID} } );
	if ($orig_comment && $orig_comment->{Username}) {
		my $orig_username = $orig_comment->{Username};
		my $orig_user = $self->get_user( $orig_username );
		if ($orig_user && $orig_user->{Preferences}->{notify_comment_replies}) {
			$self->log_debug(5, "Notifying original comment author $orig_username about new reply");
			my $body = $xml->{Name} . " replied to your comment on:\n";
			$body .= $xml->{PageURL} . "\n\n";
			$body .= $comment_source;
			$body .= "\n\n";
			$body .= $self->{config}->{Emails}->{CommentReplySignature} . "\n";

			if (!$self->send_email(
				From     => $self->{config}->{Emails}->{From},
				To       => "\"" . $orig_user->{FullName} . "\" <" . $orig_user->{Email} . ">",
				Subject  => $xml->{Name} . " replied to your comment on EffectGames.com",
				Data     => $body
			)) {
				$self->log_debug(2, "Failed to send email to " . $orig_user->{Email});
			}
		} # yes, notify
	} # orig comment was from a real user
	
	# these only work if user is sessioned
	if ($self->get_session_id()) {
		$self->user_log_msg( "Posted comment reply" );
		$self->user_update_stats( Comments => '+1' );
	}
	
	$self->log_transaction( 'comment_post_reply', compose_query($xml) );
	
	$self->{session}->{response}->{CommentID} = $xml->{CommentID};
	$self->{session}->{response}->{ReplyID} = $xml->{ID};
	$self->set_response(0, "Comment reply successful");
}

sub api_comment_replies_get {
	##
	# Fetch comment replies for a page and comment
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	my $path = '/page_comment_replies/' . $query->{page_id} . '/' . $query->{comment_id};
	
	my $list = $self->{storage}->get_metadata( $path );
	if ($list) { $response->{List} = $list; }
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $items = $self->{storage}->list_get( $path, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	foreach my $item (@$items) {
		delete $item->{ClientInfo};
	}
	
	$response->{Items} = { Item => $items };
	$self->set_response(0, "Search successful");
	$self->set_ttl( 'ViewTTL' );
}

1;
