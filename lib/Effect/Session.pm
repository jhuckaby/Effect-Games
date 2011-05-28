package Effect::Session;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect Session Methods
# Part of the Effect Project
##

use strict;
use Time::HiRes qw/time/;
use XML::API::Tools;

sub create_new_session {
	##
	# Generate new session DB
	##
	my $self = shift;
	my $session_type = shift || 'login';
	my $infinite = shift || 0;
	
	my $session_id = $session_type . '_' . generate_unique_id();
	$self->log_debug(5, "Creating new session: $session_id");
	
	my $storage_key = '/sessions/' . $session_id;
	
	$self->{storage}->create_record( $storage_key, {
		Type => $session_type,
		Infinite => $infinite
	} );
	
	if (!$infinite) {
		# non-infinite session, so set expiration date
		$self->log_debug(5, "Non-infinite session, setting expiration date");
		my $epoch = time() + get_seconds_from_text( $self->{config}->{Session}->{Timeout} );
		$self->{storage}->set_expiration( $storage_key, $epoch );
	}
	else {
		$self->log_debug(5, "Infinite session, will never expire");
	}
	
	$self->{session}->{id} = $session_id;
	$self->{session}->{db} = $self->{storage}->get_metadata($storage_key);
	
	# register cleanup handler to close db handle
	# $self->register_cleanup_handler( 'cleanup_close_session_db', $self->{session} );
	
	$self->log_transaction( 'session_create', $session_id );
	
	return 1;
}

sub session_mark {
	##
	# Mark the session as dirty so it gets written at the end of the request
	##
	my $self = shift;
	my $storage_key = '/sessions/' . $self->{session}->{id};
	$self->{storage}->mark( $storage_key );
}

sub session_unmark {
	##
	# Mark the session as clean so it does not get written
	##
	my $self = shift;
	my $storage_key = '/sessions/' . $self->{session}->{id};
	$self->{storage}->unmark( $storage_key );
}

sub load_session {
	##
	# Load session database
	##
	my ($self, $session_id, $quiet) = @_;
	
	my $storage_key = '/sessions/' . $session_id;
	my $session = $self->{storage}->get_metadata($storage_key);
	
	if (!$session) {
		if (!$quiet) { $self->api_error( 'session', "Invalid session ID: $session_id: " . $self->{storage}->{error} ); }
		return undef;
	}
	my $last_update = $session->{_Attribs}->{Modified} || 0;
	if (!$last_update) {
		if (!$quiet) { $self->api_error( 'session', "Invalid session ID: $session_id" ); }
		$self->{storage}->delete_record( $storage_key );
		return undef;
	}
	if (($last_update < time() - get_seconds_from_text($self->{config}->{Session}->{Timeout})) && !$session->{Infinite}) {
		if (!$quiet) { $self->api_error( 'session', "Session timed out" ); }
		$self->{storage}->delete_record( $storage_key );
		return undef;
	}
	
	if (!$session->{Infinite}) {
		# non-infinite session, so set expiration date
		my $expire_epoch = time() + get_seconds_from_text( $self->{config}->{Session}->{Timeout} );
		$session->{_Attribs} ||= {};
		$session->{_Attribs}->{Expires} = $expire_epoch;
	}
	
	$session->{IP} = get_remote_ip();
	
	$self->{session}->{id} = $session_id;
	$self->{session}->{db} = $session;
	$self->session_mark(); # will save updated modified date
	
	# $self->log_debug(5, "Session DB: " . serialize_object($self->{session}->{db}));
	
	# register cleanup handler to close db handle
	# $self->register_cleanup_handler( 'cleanup_close_session_db', $self->{session} );
	
	return 1;
}

sub delete_session {
	##
	# Delete session (logout)
	##
	my $self = shift;
	my $session_type = shift || 'any';
	
	if (!$self->{session}->{db}) { return undef; } # no session
	if (($session_type ne 'any') && ($session_type ne $self->{session}->{db}->{Type})) { return undef; } # wrong session type
	
	my $session_id = $self->{session}->{id};
	my $storage_key = '/sessions/' . $session_id;
	
	delete $self->{session}->{db};
	$self->{storage}->delete_record( $storage_key );
	
	$self->log_transaction( 'session_delete', $session_id );
	
	return 1;
}

sub cleanup_close_session_db {
	##
	# Cleanup handler to close session db (and user db)
	##
	my ($self, $session) = @_;
	
	undef $session->{db};
	undef $session->{user};
}

sub get_session_id {
	##
	# Get Session ID from cookie
	##
	my $self = shift;
	
	my $session_id = $self->{session}->{cookie}->{effect_session_id};
	if (!$session_id && $self->{session}->{cookie}->{CookieTree} 
		&& ($self->{session}->{cookie}->{CookieTree} =~ /effect_session_id\W+(\w+)/)) {
		$session_id = $1;
	}
	
	return $session_id;
}

sub validate_ip {
	##
	# Make sure IP is not in block list
	##
	my $self = shift;
	my $readonly = shift || 0;
	
	my $block_data = $self->{storage}->permacache_get( '/admin/ip_block_list' );
	XMLalwaysarray( xml=>$block_data, element=>'Block' );
	
	my $ips = [ $ENV{'REMOTE_ADDR'} ];
	if ($ENV{'HTTP_X_FORWARDED_FOR'} && ($ENV{'HTTP_X_FORWARDED_FOR'} =~ /^\d+\.\d+\.\d+\.\d+$/)) {
		push @$ips, $ENV{'HTTP_X_FORWARDED_FOR'};
	}
	
	foreach my $ip (@$ips) {
		foreach my $block_match (@{$block_data->{Block}}) {
			if ($ip =~ m@$block_match@) {
				if (!$readonly) { $self->api_error( 'session', "Your IP address ($ip) has been temporarily banned from Effect Games, due to suspicion of abuse." ); }
				return 0;
			}
		}
	}
	
	return 1;
}

sub validate_session {
	##
	# Load session from cookie
	##
	my $self = shift;
	my $session_type = shift || 'login';
	my $readonly = shift || 0;
	
	if ($self->{session}->{db}) {
		if ($session_type eq 'any') { return 1; }
		if ($self->{session}->{db}->{Type} eq $session_type) {
			return 1;
		}
		else {
			if (!$readonly) { $self->api_error( 'session', "Incorrect session type: " . $self->{session}->{db}->{Type} . " != " . $session_type ); }
			return undef;
		}
	}
	
	return undef unless $self->validate_ip( $readonly );
	
	my $session_id = $self->get_session_id();
	if (!$session_id) {
		if (!$readonly) { $self->api_error( 'session', "User is not logged in" ); }
		return undef;
	}
	
	my $result = $self->load_session( $session_id, $readonly );
	if (!$result) { return $result; }
	
	if ($session_type eq 'any') { return 1; }
	if ($self->{session}->{db}->{Type} ne $session_type) {
		if (!$readonly) { $self->api_error( 'session', "Incorrect session type: " . $self->{session}->{db}->{Type} . " != " . $session_type ); }
		return undef;
	}
	
	return 1;
}

sub api_get_session_info {
	##
	# Return entire session DB if doing OpenID prereg, otherwise just return 1
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $session_id = $query->{id};
	if (!$session_id) { return $self->api_error('session', "Session ID not found"); }
	
	return unless $self->load_session( $session_id );
	
	if ($self->{session}->{db}->{Type} eq 'openid') {
		$self->{session}->{response}->{Info} = $self->{session}->{db};
	}
	
	$self->set_response(0, "Successful");
}

sub api_session_recover {
	##
	# Recover existing session (same output as user_login)
	##
	my $self = shift;
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'login', "User not found: $username" );
	}
	
	$self->log_debug(3, "User logging in: $username");
	
	# $user->{LastLogin} ||= {};
	# $user->{LastLogin}->{When} = int(time());
	# $user->{LastLogin}->{ClientInfo} = get_client_info();
	$user->{LastLogin} = int(time());
	$user->{LastClientInfo} = get_client_info();
	
	# first login?
	if ($user->{FirstLogin}) {
		$self->{session}->{response}->{FirstLogin} = 1;
		delete $user->{FirstLogin};
	}
	
	$self->{session}->{response}->{User} = {
		%$user, 
		Stats => $self->{storage}->get_metadata( "/users/$username/stats" ),
		UserStorage => $self->{storage}->get_file_contents( "/users/$username", "site_storage.json" ) || ''
	};
	$self->{storage}->mark('users/' . $username);
	
	$self->{session}->{response}->{SessionID} = $self->{session}->{id};
	$self->set_response(0, "Login successful");
}

1;
