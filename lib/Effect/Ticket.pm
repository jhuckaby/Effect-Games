package Effect::Ticket;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Ticket Methods
# Part of the Effect Project
##

use strict;
use File::Basename;
use HTTP::Date;
use XML::API::Tools;

sub api_ticket_post {
	##
	# Submit or update ticket
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w*$', # leave blank for new ticket, auto assigned
		# '/Title' => '.+',
		# '/Description' => '.+',
		'/Path' => '^[\w\-\/]+$',
		# '/Tags' => '.*'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	# disable notify author
	my $disable_notify_author = 0;
	if ($xml->{DisableNotifyAuthor}) {
		$disable_notify_author = 1;
		delete $xml->{DisableNotifyAuthor};
	}
	
	# see if ticket already exists
	my $old_ticket_id = undef;
	my $old_ticket = undef;
	my $old_storage_key = undef;
	
	if ($xml->{TicketID}) {
		$old_ticket_id = $xml->{TicketID};
		$old_storage_key = '/tickets' . $xml->{Path} . '/' . $old_ticket_id;
		$old_ticket = $self->{storage}->get_metadata( $old_storage_key );
	
		# make sure user owns ticket, ticket is new, or user is admin
		if ($old_ticket && !$self->check_privilege('admin', 'readonly') && 
			($self->{session}->{db}->{username} ne $old_ticket->{Author}) && 
			($self->{session}->{db}->{username} ne $old_ticket->{assigned})) {
			return $self->api_error( 'ticket', "You do not have enough privileges to edit this ticket." );
		}
	}
	
	# only allow admin to set/change STags
	# if ($old_ticket && !$self->check_privilege('admin', 'readonly')) {
	# 	$xml->{STags} = $old_ticket->{STags} || '';
	# }
	
	# validate assigned, cc, game
	if ($xml->{assigned}) {
		# make sure username is valid
		if (!$self->{storage}->check_record_exists('/users/' . $xml->{assigned})) {
			return $self->api_error('ticket', "The user \"".$xml->{assigned}."\" does not exist.  Please enter a valid username for assigning the ticket.");
		}
	}
	if ($xml->{cc}) {
		foreach my $cc (split(/\,\s*/, $xml->{cc})) {
			if ($cc !~ /\@/) {
				if (!$self->{storage}->check_record_exists('/users/' . $cc)) {
					return $self->api_error('ticket', "The user \"".$cc."\" does not exist.  Please enter valid usernames for the Cc list.");
				}
			}
		}
	}
	if ($xml->{game}) {
		foreach my $game_id (split(/\,\s*/, $xml->{game})) {
			if (!$self->{storage}->check_record_exists('/games/' . $game_id)) {
				return $self->api_error('ticket', "The game \"".$game_id."\" does not exist.  Please enter valid Game IDs for the list.");
			}
		}
	}
	
	my $need_index_tags = $old_ticket ? 0 : 1;
	my $need_index_stags = $old_ticket ? 0 : 1;
	
	my $ticket_id = $xml->{TicketID} || 0;
	if (!$ticket_id) {
		# create new ticket, grab unique id
		my $cat_key = '/ticket_categories' . $xml->{Path};
		
		if (!$self->{storage}->check_record_exists($cat_key)) {
			if (!$self->{storage}->create_record($cat_key, { next_seq_id => 1 })) {
				$self->{storage}->unlock_record( $cat_key );
				return $self->api_error( 'storage', "Failed to create record: $cat_key: " . $self->{storage}->{error} );
			}
		}
		$self->{storage}->lock_record( $cat_key, 1 ); # exclusive
		my $cat_data = $self->{storage}->get_metadata($cat_key);
		if (!$cat_data) {
			$cat_data = { next_seq_id => 1 };
		}
		$ticket_id = 'E'.$cat_data->{next_seq_id};
		$cat_data->{next_seq_id}++;
		if (!$self->{storage}->store_metadata($cat_key, $cat_data)) {
			$self->{storage}->unlock_record( $cat_key );
			return $self->api_error( 'storage', "Failed to write to record: $cat_key: " . $self->{storage}->{error} );
		}
		$self->{storage}->unlock_record( $cat_key );
	} # get new ticket ID
	
	my $cat_id = $xml->{Path};
	my $ticket_systems = $self->{storage}->permacache_get( '/admin/ticket_systems' );
	my $cat_def = find_object( $ticket_systems->{System}, Path => $cat_id );
	if (!$cat_def) {
		return $self->api_error('ticket', "Failed to post ticket: System not found: $cat_id" );
	}
	XMLalwaysarray( xml=>$cat_def, element=>'Field' );
		
	my $storage_key = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = {
		%$xml, 
		TicketID => $ticket_id, 
		Username => $username
	};
	
	if ($old_ticket) {
		foreach my $key (keys %$old_ticket) {
			if (!defined($ticket->{$key})) { $ticket->{$key} = $old_ticket->{$key}; }
		}
	}
	else {
		$ticket->{Author} = $username;
	}
	
	# chop fields at maxlength
	foreach my $field_def (@{$cat_def->{Field}}) {
		if ($field_def->{_Attribs}->{MaxLength}) {
			my $key = $field_def->{_Attribs}->{ID};
			if (length($ticket->{$key}) > $field_def->{_Attribs}->{MaxLength}) {
				$ticket->{$key} = substr( $ticket->{$key}, 0, $field_def->{_Attribs}->{MaxLength} );
			}
		}
	}
	
	my $result = $self->{storage}->store_metadata( $storage_key, $ticket );
	if (!$result) { return $self->api_error('ticket', "Failed to post ticket: " . $self->{storage}->{error}); }
	
	# unindex category and tags if changed
	if ($old_ticket) {
		if ($old_ticket->{Tags} ne $ticket->{Tags}) {
			# tags have changed, remove all old references
			foreach my $tag ($self->parse_tag_csv($old_ticket->{Tags})) {
				return unless $self->lock_find_delete_list_item(
					'/ticket_tags' . $cat_id . '/' . $tag,
					{ TicketID => $ticket_id, Path => $cat_id }
				);
			}
			$need_index_tags = 1;
		}
		if ($old_ticket->{STags} ne $ticket->{STags}) {
			# stags have changed
			foreach my $stag ($self->parse_tag_csv($old_ticket->{STags})) {
				if ($ticket->{STags} !~ /\b$stag\b/) {
					$self->log_debug(5, "Unindexing STag: $stag");
					return unless $self->lock_find_delete_list_item(
						'/ticket_stags' . $cat_id . '/' . $stag,
						{ TicketID => $ticket_id, Path => $cat_id }
					);
				}
			}
			$need_index_stags = 1;
		}
	} # old_ticket
	
	my $stub = {
		TicketID => $ticket_id, 
		Path => $cat_id
	};
	
	if (!$old_ticket) {
		# only index in category if creating new ticket
		my $cat_key = '/ticket_categories' . $cat_id;
		$self->log_debug(5, "Storing stub in category: $cat_key" );
		return unless $self->lock_list_unshift( $cat_key, $stub );
	}
	
	if ($need_index_tags) {
		foreach my $tag ($self->parse_tag_csv($ticket->{Tags})) {
			my $tag_key = '/ticket_tags' . $cat_id . '/' . $tag;
			$self->log_debug(5, "Storing stub in tag: $tag_key" );
			return unless $self->lock_list_unshift( $tag_key, $stub );
		}
	}
	
	if ($need_index_stags) {
		foreach my $stag ($self->parse_tag_csv($ticket->{STags})) {
			my $stag_key = '/ticket_stags' . $cat_id . '/' . $stag;
			if (!$old_ticket || ($old_ticket->{STags} !~ /\b$stag\b/)) {
				$self->log_debug(5, "Storing stub in stag: $stag_key" );
				return unless $self->lock_list_unshift( $stag_key, $stub );
			}
			else {
				$self->log_debug(5, "STag has not changed: $stag");
			}
		}
	}
	
	# send e-mail to assignee and cc list
	my $changes = [];
	my $action = '';
	my $action_detail = '';
	
	if ($old_ticket) {
		# figure out exactly what changed
		$action = 'Updated ' . $cat_def->{RecordTypeName};
		$action_detail = $ticket->{summary};
				
		# custom fields
		# if ($ticket->{STags} ne $old_ticket->{STags}) {
			# my $old_fields = $self->parse_ticket_fields( $old_ticket->{STags} );
			# my $fields = $self->parse_ticket_fields( $ticket->{STags} );
			
			foreach my $field_def (@{$cat_def->{Field}}) {
				my $key = $field_def->{_Attribs}->{ID};
								
				if ($ticket->{$key} ne $old_ticket->{$key}) {
					if ($field_def->{_Attribs}->{Type} eq 'TextArea') {
						push @$changes, $field_def->{_Attribs}->{Title} . " changed.";
					}
					else {
						my $old_value = length($old_ticket->{$key}) ? $old_ticket->{$key} : '(None)';
						my $value = length($ticket->{$key}) ? $ticket->{$key} : '(None)';
						push @$changes, $field_def->{_Attribs}->{Title} . " changed from \"".$old_value."\" to \"".$value."\".";
					}
				} # field changed
			} # foreach field
		# } # stags
	}
	else {
		# creating new ticket, changes are easy!
		$action = 'New ' . $cat_def->{RecordTypeName};
		$action_detail = $ticket->{summary};
		$changes = ['Created ' . $cat_def->{RecordTypeName}];
	}
	
	if (@$changes) {
		return unless $self->ticket_email_notify( $ticket, $changes, 
			Action => $action, 
			ActionDetail => $action_detail,
			DisableNotifyAuthor => $disable_notify_author
		);
	}
	else {
		$self->log_debug(5, "No changes detected, skipping notification e-mails");
	}
	
	# if publishing for the first time, add to user stats
	if (!$old_ticket) {
		$self->user_log_msg( "Posted ".lc($cat_def->{RecordTypeName})." in " . $cat_def->{_Attribs}->{Title} );
		$self->user_update_stats( Tickets => '+1' );
		$self->log_transaction( 'ticket_post', $storage_key );
	}
	else {
		$self->log_transaction( 'ticket_update', $storage_key );
	}
	
	$self->{session}->{response}->{TicketID} = $ticket_id;
	$self->{session}->{response}->{Path} = $cat_id;
	$self->set_response(0, "Success");
}

sub ticket_email_notify {
	##
	# Send e-mail notification for ticket changes
	##
	my $self = shift;
	my $ticket = shift;
	my $changes = shift;
	
	my $cat_id = $ticket->{Path};
	my $ticket_systems = $self->{storage}->permacache_get( '/admin/ticket_systems' );
	
	my $cat_def = find_object( $ticket_systems->{System}, Path => $cat_id );
	my $ticket_path = '/tickets' . $ticket->{Path} . '/' . $ticket->{TicketID};
		
	# display fields
	my $fields_disp = '';
	foreach my $field_def_xml (@{$cat_def->{Field}}) {
		my $field_def = $field_def_xml->{_Attribs};
		if ($field_def->{Type} eq 'TextArea') { $fields_disp .= "\n"; }
		$fields_disp .= $field_def->{Title} . ': ';
		if ($field_def->{Type} eq 'TextArea') { $fields_disp .= "\n"; }
		
		my $value_disp = trim($ticket->{ $field_def->{ID} });
		if (!length($value_disp)) { $value_disp = '(None)'; }
		$fields_disp .= $value_disp . "\n";
		
		if ($field_def->{Type} eq 'TextArea') { $fields_disp .= "\n"; }
	}
	chomp $fields_disp;
	
	# display latest message
	my $latest_msg_disp = '';
	my $messages = $self->{storage}->list_get( $ticket_path . '/messages', 0, 1 );
	if ($messages) {
		my $message = $messages->[0];
		$latest_msg_disp .= $message->{MessageType} . " from " . $message->{Username} . " on " . 
			get_nice_date($message->{Created}, 1) . ":\n" . trim($message->{Content}) . "\n";
	}
	else {
		$latest_msg_disp = '(No comments found)';
	}
	chomp $latest_msg_disp;
	
	# display files
	my $files_disp = '';
	if ($ticket->{Files} && $ticket->{Files}->{File}) {
		XMLalwaysarray( xml=>$ticket->{Files}, element=>'File' );
		foreach my $file (@{$ticket->{Files}->{File}}) {
			my $file_url = $self->get_base_url() . 'api/view/tickets' . $cat_id . '/' . $ticket->{TicketID} . '/' . $file->{Name};
			$files_disp .= $file_url . ' (' . $file->{Username} . ', ' . get_text_from_bytes($file->{Size}) . ")\n";
		} # foreach file
	} # files
	else {
		$files_disp = '(No attachments found)';
	}
	chomp $files_disp;
	
	# url to ticket
	my $ticket_url = $self->get_base_url() . '#Ticket' . $ticket->{Path} . '/' . $ticket->{TicketID};
	
	my $args = {
		CatTitle => $cat_def->{_Attribs}->{Title},
		ChangesDisp => join("\n", @$changes),
		FieldsDisp => $fields_disp,
		LatestMessageDisp => $latest_msg_disp,
		FilesDisp => $files_disp,
		TicketURL => $ticket_url,
		NiceCreated => get_nice_date( $ticket->{_Attribs}->{Created}, 1 ),
		NiceModified => get_nice_date( $ticket->{_Attribs}->{Modified}, 1 ),
		TagsDisp => $ticket->{Tags} || '(None)',
		TicketIDDisp => '#'.$ticket->{TicketID},
		%$ticket,
		@_
	};
	my $email_config = $self->{config}->{Emails}->{TicketNotify};
	
	my $from = $self->{config}->{Emails}->{From};
	my $subject = memory_substitute( $email_config->{Subject}, $args );
	my $body = memory_substitute( $email_config->{Body} . "\n\n" . $self->{config}->{Emails}->{Signature}, $args );
	
	my $recips = [];
	if ($cat_def->{Notify}) { push @$recips, $cat_def->{Notify}; }
	if ($ticket->{Author} && !$args->{DisableNotifyAuthor}) {
		my $user = $self->get_user( $ticket->{Author} );
		if ($user && $user->{Email}) { push @$recips, $user->{Email}; }
	}
	if ($ticket->{assigned}) {
		my $user = $self->get_user( $ticket->{assigned} );
		if ($user && $user->{Email}) { push @$recips, $user->{Email}; }
	}
	if ($ticket->{cc}) {
		foreach my $cc (split(/\,\s*/, $ticket->{cc})) {
			if ($cc =~ /\@/) { push @$recips, $cc; }
			else {
				my $user = $self->get_user( $cc );
				if ($user && $user->{Email}) { push @$recips, $user->{Email}; }
			}
		}
	}
	
	my $sent_to = {};
	foreach my $to (@$recips) {
		if (!$sent_to->{$to}) {
			$sent_to->{$to} = 1;
			$self->log_debug(4, "Sending ticket notification e-mail to: " . $to );
			$self->send_email(
				From     => $from,
				To       => $to,
				Subject  => $subject,
				Data     => $body
			);
		}
	}
	
	return 1;
}

sub parse_ticket_fields {
	##
	# Parse STag CSV into hash fields (status_open, assigned_jhuckaby, etc.)
	##
	my ($self, $stags) = @_;
	my $fields = {};
	
	foreach my $stag (split(/\,\s*/, $stags)) {
		if ($stag =~ /^([A-Za-z0-9]+)_(.*)$/) {
			$fields->{$1} = $2;
		}
	}
	
	return $fields;
}

sub api_ticket_delete {
	##
	# Delete ticket
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $storage_key = '/tickets' . $xml->{Path} . '/' . $xml->{TicketID};
	my $ticket = $self->{storage}->get_metadata( $storage_key );
	
	if (!$ticket) {
		return $self->api_error('ticket', "Ticket not found: $storage_key");
	}
	
	my $author = $ticket->{Author};

	# make sure user owns ticket, or user is admin
	# if (!$self->check_privilege('admin', 'readonly') && ($self->{session}->{db}->{username} ne $ticket->{Author})) {
	if (!$self->check_privilege('admin', 'readonly')) {
		return $self->api_error( 'ticket', "You do not have enough privileges to delete this ticket." );
	}
	
	# unindex path and tags
	return unless $self->lock_find_delete_list_item( '/ticket_categories' . $ticket->{Path},
		{ TicketID => $xml->{TicketID}, Path => $xml->{Path} }
	);
	
	foreach my $tag ($self->parse_tag_csv($ticket->{Tags})) {
		return unless $self->lock_find_delete_list_item(
			'/ticket_tags' . $xml->{Path} . '/' . $tag,
			{ TicketID => $xml->{TicketID}, Path => $xml->{Path} }
		);
	}
	
	foreach my $stag ($self->parse_tag_csv($ticket->{STags})) {
		return unless $self->lock_find_delete_list_item(
			'/ticket_stags' . $xml->{Path} . '/' . $stag,
			{ TicketID => $xml->{TicketID}, Path => $xml->{Path} }
		);
	}
	
	# delete main ticket dataset
	my $result = $self->{storage}->delete_record( $storage_key );
	if (!$result) { return $self->api_error('ticket', "Failed to delete ticket: $storage_key: " . $self->{storage}->{error}); }
	
	# delete messages too
	$self->{storage}->list_delete( $storage_key . '/messages' );
	
	$self->set_response(0, "Success");
}

sub api_ticket_get {
	##
	# Fetch ticket given its path and ID
	##
	my $self = shift;
	return unless $self->require_query(
		path => '^[\w\/]+$',
		id => '^\w+$'
	);
	my $query = $self->{session}->{query};
	
	return unless $self->validate_session();
	
	my $storage_key = '/tickets' . $query->{path} . '/' . $query->{id};
	my $ticket = $self->{storage}->get_metadata( $storage_key );
	if (!$ticket) { return $self->api_error( 'ticket', "Could not find ticket: " . $storage_key ); }
	
	# user must be author of ticket, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && 
		($self->{session}->{db}->{username} ne $ticket->{Author}) && 
		($self->{session}->{db}->{username} ne $ticket->{assigned})) {
		return $self->api_error( 'user', "You do not have enough privileges to view this ticket." );
	}
	
	if ($query->{files_only}) {
		$self->{session}->{response}->{LastUploadError} = $ticket->{LastUploadError} || '';
		$self->{session}->{response}->{Files} = $ticket->{Files} || '';
	}
	else {
		$self->{session}->{response}->{Row} = $ticket;
	
		# also include ticket messages
		my $messages = $self->{storage}->list_get( $storage_key . '/messages' );
		$messages ||= [];
		$self->{session}->{response}->{Messages} = { Message => $messages };
		
		# and ticket author full name
		my $user = $self->{storage}->get_metadata( '/users/' . $ticket->{Author} );
		if ($user) {
			$self->{session}->{response}->{AuthorFullName} = $user->{FullName};
		}
	}
	
	$self->header_out( 'Last-Modified', time2str( $ticket->{_Attribs}->{Modified} ) );
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
	
	$self->session_unmark();
}

sub api_ticket_search {
	##
	# Search for tickets by tag or category, sorted by date descending
	# ONLY ADMINS CAN DO THIS
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	$query->{limit} ||= 10;
	$query->{offset} ||= 0;
	
	if (!$query->{path}) { return $self->api_error( 'ticket', 'Missing category' ); }
	
	my $storage_key = '';
	if ($query->{path} && !$query->{tag} && !$query->{stag}) {
		$storage_key = '/ticket_categories' . $query->{path};
	}
	elsif ($query->{tag}) {
		my $nice_tag = $self->get_url_friendly_title( $query->{tag} );
		$storage_key = '/ticket_tags' . $query->{path} . '/' . $nice_tag;
	}
	elsif ($query->{stag}) {
		my $nice_tag = $self->get_url_friendly_title( $query->{stag} );
		$storage_key = '/ticket_stags' . $query->{path} . '/' . $nice_tag;
	}
	
	$self->log_debug(5, "Fetching " . $query->{limit} . " tickets from list: $storage_key at location " . $query->{offset} );
	
	my $items = $self->{storage}->list_get( $storage_key, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	my $list = $self->{storage}->get_metadata($storage_key);
	$list ||= {};
	
	# load system def, to get list of fields to omit from search results (textareas)
	my $cat_id = $query->{path};
	my $ticket_systems = $self->{storage}->permacache_get( '/admin/ticket_systems' );
	my $cat_def = find_object( $ticket_systems->{System}, Path => $cat_id );
	if (!$cat_def) {
		return $self->api_error('ticket', "Ticket System not found: $cat_id" );
	}
	XMLalwaysarray( xml=>$cat_def, element=>'Field' );
	
	my $omit_fields = [];
	foreach my $field_def (@{$cat_def->{Field}}) {
		if ($field_def->{_Attribs}->{Type} eq 'TextArea') { push @$omit_fields, $field_def->{_Attribs}->{ID}; }
	}
	
	my $rows = [];
	foreach my $item (@$items) {
		push @$rows, copy_hash_remove_keys( $self->{storage}->get_metadata( '/tickets' . $item->{Path} . '/' . $item->{TicketID} ), @$omit_fields );
	}
	
	$self->{session}->{response}->{Rows} = { Row => $rows };
	$self->{session}->{response}->{List} = $list;
	
	if ($list) { $self->header_out( 'Last-Modified', time2str( $list->{_Attribs}->{Modified} ) ); }
	$self->set_ttl( 'ViewTTL' );
	
	$self->set_response(0, "Success");
	
	$self->session_unmark();
}

sub api_ticket_post_message {
	##
	# Post new message to ticket
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$',
		'/MessageType' => '^(Reply|Comment)$',
		'/Content' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $cat_id = $xml->{Path};
	my $ticket_id = $xml->{TicketID};
	my $ticket_path = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = $self->{storage}->get_metadata( $ticket_path );
	if (!$ticket) { return $self->api_error( 'ticket', "Could not find ticket: " . $ticket_path ); }
	
	# user must be author of ticket, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && 
		($self->{session}->{db}->{username} ne $ticket->{Author}) && 
		($self->{session}->{db}->{username} ne $ticket->{assigned})) {
		return $self->api_error( 'user', "You do not have enough privileges to edit this ticket." );
	}
	
	$xml->{MessageID} = generate_unique_id(16);
	$xml->{Username} = $username;
	$xml->{Created} = $xml->{Modified} = time();
	
	delete $xml->{TicketID};
	delete $xml->{Path};
	
	return unless $self->lock_list_unshift( $ticket_path . '/messages', $xml );
	
	$self->log_transaction( 'ticket_message_post', $ticket_path . ': ' . $xml->{MessageID} );
	
	return unless $self->ticket_email_notify( $ticket, ['New ' . $xml->{MessageType} . ' from ' . $username],
		Action => 'New ' . $xml->{MessageType},
		ActionDetail => $xml->{Content}
	);
	
	$self->{session}->{response}->{Message} = $xml;
	$self->set_response(0, "Success");
}

sub api_ticket_delete_message {
	##
	# Delete message from ticket
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$',
		'/MessageID' => '^\w+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $cat_id = $xml->{Path};
	my $ticket_id = $xml->{TicketID};
	my $ticket_path = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = $self->{storage}->get_metadata( $ticket_path );
	if (!$ticket) { return $self->api_error( 'ticket', "Could not find ticket: " . $ticket_path ); }
	
	my $message = $self->{storage}->list_find( $ticket_path . '/messages', { MessageID => $xml->{MessageID} } );
	if (!$message) {
		return $self->qpi_error('ticket', "Could not find message: " . $xml->{MessageID} . " in ticket: $cat_id/$ticket_id");
	}
	
	# user must be author of message, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && ($self->{session}->{db}->{username} ne $message->{Username})) {
		return $self->api_error( 'user', "You do not have enough privileges to delete this message." );
	}
	
	return unless $self->lock_find_delete_list_item( $ticket_path . '/messages', { MessageID => $xml->{MessageID} } );
	
	$self->log_transaction( 'ticket_message_delete', $ticket_path . ': ' . $xml->{MessageID} );
	
	$self->set_response(0, "Success");
}

sub api_ticket_post_reply {
	##
	# Send e-mail reply to author and add comment
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$',
		'/MessageType' => '^(Reply|Comment)$',
		'/Content' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $cat_id = $xml->{Path};
	my $ticket_id = $xml->{TicketID};
	my $ticket_path = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = $self->{storage}->get_metadata( $ticket_path );
	if (!$ticket) { return $self->api_error( 'ticket', "Could not find ticket: " . $ticket_path ); }
	
	# user must be author of ticket, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && 
		($self->{session}->{db}->{username} ne $ticket->{Author}) && 
		($self->{session}->{db}->{username} ne $ticket->{assigned})) {
		return $self->api_error( 'user', "You do not have enough privileges to edit this ticket." );
	}
	
	$xml->{MessageID} = generate_unique_id(16);
	$xml->{Username} = $username;
	$xml->{Created} = $xml->{Modified} = time();
	
	delete $xml->{TicketID};
	delete $xml->{Path};
	
	return unless $self->lock_list_unshift( $ticket_path . '/messages', $xml );
	
	# send e-mail to author
	my $user = $self->get_user( $ticket->{Author} );
	if ($user && $user->{Email}) {
		$self->send_user_email( 'Custom', {
			Subject => $xml->{Subject} . " (Ticket #" . $ticket_id . ")",
			Body => $xml->{Content} . "\n\nOriginal Ticket Description:\n\n" . $ticket->{description} . "\n"
		}, $user );
	}
	
	$self->log_transaction( 'ticket_message_post', $ticket_path . ': ' . $xml->{MessageID} );
	
	return unless $self->ticket_email_notify( $ticket, ['New ' . $xml->{MessageType} . ' from ' . $username],
		Action => 'New ' . $xml->{MessageType},
		ActionDetail => $xml->{Content},
		DisableNotifyAuthor => 1
	);
	
	$self->{session}->{response}->{Message} = $xml;
	$self->set_response(0, "Success");
}

sub throw_ticket_file_upload_error {
	##
	# Stuff error in DB, so client can fetch it later
	# (Flash upload cannot receive direct response)
	##
	my ($self, $path, $msg) = @_;
	
	my $data = $self->{storage}->get_metadata( $path );
	$data->{LastUploadError} = $msg;
	
	$self->{storage}->mark( $path );
	
	return $self->api_error('upload', $msg);
}

sub api_ticket_upload_file {
	##
	# Attach file to ticket
	##
	my $self = shift;
	
	##
	# Flash doesn't send browser cookies, so we must recover session from query string
	##
	$self->{session}->{cookie}->{effect_session_id} = $self->{session}->{query}->{session};
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if (!$user) { return $self->api_error('upload', 'Could not load user: ' . $username); }
	
	my $query = $self->{session}->{query};
	
	my $cat_id = $query->{path};
	my $ticket_id = $query->{ticket};
	my $ticket_path = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = $self->{storage}->get_metadata( $ticket_path );
	if (!$ticket) {
		return $self->throw_ticket_file_upload_error($ticket_path, 'Ticket does not exist: ' . $cat_id . '/' . $ticket_id);
	}
	
	# user must be author of ticket, or admin, to continue
	if (!$self->check_privilege('admin', 'readonly') && 
		($self->{session}->{db}->{username} ne $ticket->{Author}) && 
		($self->{session}->{db}->{username} ne $ticket->{assigned})) {
		return $self->throw_ticket_file_upload_error( $ticket_path, "You do not have enough privileges to edit this ticket." );
	}
	
	if (!$ticket->{Files}) { $ticket->{Files} = {}; }
	if (!$ticket->{Files}->{File}) { $ticket->{Files}->{File} = []; }
	XMLalwaysarray( xml=>$ticket->{Files}, element=>'File' );
	
	delete $ticket->{LastUploadError};
	$self->{storage}->mark( $ticket_path );
	
	my $upload = $self->{session}->{query}->{Filedata_data};
	if (!$upload && !$self->{session}->{raw_post_data}) { return $self->throw_ticket_file_upload_error($ticket_path, 'Upload data not found: Filedata'); }
	
	my $client_filename = ''.$self->{session}->{query}->{Filedata};
	if ($client_filename !~ /\.(\w+)$/) { return $self->throw_ticket_file_upload_error($ticket_path, 'Uploaded file has no extension: ' . $client_filename); }
	my $ext = $1;
	
	my $storage_key = $ticket_path;
	
	# clean up client filename
	my $orig_filename = $client_filename;
	$client_filename =~ s@\\@/@g;
	$client_filename = basename($client_filename);
	$client_filename =~ s/\s/_/g;
	$client_filename =~ s/_+/_/g;
	$client_filename =~ s/[^\w\.\-]+//g;
	if (!length($client_filename)) { return $self->throw_ticket_file_upload_error($ticket_path, 'Uploaded file has a bad filename: ' . $orig_filename); }
	if (length($client_filename) > 64) {
		$client_filename =~ s@\.\w+$@@;
		$client_filename = substr($client_filename, 0, 63 - length($ext)) . '.' . $ext;
	}
	
	my $raw_data = $upload || $self->{session}->{raw_post_data};
	my $new_size = length($raw_data);
	my $filename = $client_filename;
	my $byte_count = 0;
	my $action = '';
	
	# maybe add to Files->File array or replace existing
	my $old_file = find_object( $ticket->{Files}->{File}, Name=>$filename );
	if ($old_file) {
		$self->log_debug(5, "Replacing existing file: $ticket_path$filename");
		$byte_count = $new_size - $old_file->{Size};
		$action = 'replace';
		$old_file->{Size} = $new_size;
		$old_file->{Modified} = time();
		$old_file->{Username} = $username;
	}
	else {
		# add new file to list
		$self->log_debug(5, "Adding new file: $ticket_path$filename");
		$byte_count = $new_size;
		$action = 'add';
		push @{$ticket->{Files}->{File}}, {
			Name => $filename,
			Size => $new_size,
			Created => time(),
			Modified => time(),
			Username => $username
		};
	}
	
	# log transaction
	$self->log_transaction( 'ticket_file_upload_' . $action, "$ticket_path$filename" );
	
	my $result = $self->{storage}->store_file( $storage_key, $filename, $raw_data );
	if (!$result) { return $self->throw_ticket_file_upload_error($ticket_path, 'Failed to store file: ' . $self->{storage}->{error}); }
	
	my $notify_action = ($action eq 'add') ? 'New Attachment' : 'Replaced Attachment';
	return unless $self->ticket_email_notify( $ticket, [$notify_action . ': ' . $filename . ' (' . $username . ', ' . get_text_from_bytes($new_size) . ')'],
		Action => $notify_action,
		ActionDetail => $filename . ' (' . $username . ', ' . get_text_from_bytes($new_size) . ')'
	);
	
	$self->set_response(0, "Success");
}

sub api_ticket_delete_file {
	##
	# Delete file from ticket
	##
	my $self = shift;
	return unless $self->require_xml(
		'/TicketID' => '^\w+$',
		'/Path' => '^[\w\-\/]+$',
		'/Filename' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	my $cat_id = $xml->{Path};
	my $ticket_id = $xml->{TicketID};
	my $ticket_path = '/tickets' . $cat_id . '/' . $ticket_id;
	
	my $ticket = $self->{storage}->get_metadata( $ticket_path );
	if (!$ticket) {
		return $self->api_error( 'ticket', "Could not find ticket: " . $ticket_path );
	}
	
	if (!$self->check_privilege('admin', 'readonly')) {
		return $self->api_error( 'ticket', "You do not have enough privileges to edit this ticket." );
	}
	
	my $filenames_deleted = {};
	my $bytes_deleted = 0;
		
	if (!$ticket->{Files} || !$ticket->{Files}->{File}) {
		return $self->api_error( 'ticket', "Ticket has no files: $ticket_path" );
	}
	
	XMLalwaysarray( xml=>$ticket->{Files}, element=>'File' );
	
	my $filename = $xml->{Filename};
	if (!$self->{storage}->delete_file( $ticket_path, $filename )) {
		return $self->api_error('ticket', "Could not delete file: $ticket_path/$filename");
	}
	$self->log_transaction( 'ticket_delete_file', "$ticket_path$filename" );
	$filenames_deleted->{$filename} = 1;
	
	my $new_files = [];
	
	foreach my $file (@{$ticket->{Files}->{File}}) {
		my $filename = $file->{Name};
		if (!$filenames_deleted->{ $filename }) { push @$new_files, $file; }
		else { $bytes_deleted += $file->{Size}; }
	}
	$ticket->{Files}->{File} = $new_files;
	
	if (!$self->{storage}->store_metadata( $ticket_path, $ticket )) {
		return $self->api_error('ticket', "Could not store metadata: $ticket_path: " . $self->{storage}->{error});
	}
	
	$self->set_response(0, "Success");
}

1;
