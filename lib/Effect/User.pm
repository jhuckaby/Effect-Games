package Effect::User;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Effect User Methods
# Part of the Effect Project
##

use strict;
use FileHandle;
use File::Basename;
use URI::Escape;
use Time::HiRes qw/time/;
use Digest::MD5 qw/md5_hex/;
use HTTP::Date;
use LWP::UserAgent;
use HTTP::Request;
use HTTP::Request::Common qw/POST PUT/;
use HTTP::Response;
use CGI;
use XML::API::Tools;

sub api_user_login {
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$', 
		'/Password' => '.+'
	);
	my $xml = $self->{session}->{xml};
		
	my $username = lc($xml->{Username});
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'login', "User not found: $username" );
	}
	
	if (md5_hex($xml->{Password}) ne $user->{Password}) {
		# password incorrect
		return $self->api_error( 'login', "Password incorrect for user: $username" );
	}
	
	if (!$self->do_user_login($username, $xml->{Infinite})) {
		return $self->api_error( 'login', "Failed to login, unknown error: $username" );
	}
	
	$self->user_log_msg( "Logged in" );
	$self->user_update_stats( Logins => '+1' );
	
	$self->{session}->{response}->{User} = {
		%$user, 
		Stats => $self->{storage}->get_metadata( "/users/$username/stats" ),
		UserStorage => $self->{storage}->get_file_contents( "/users/$username", "site_storage.json" ) || ''
	};
	$self->{session}->{response}->{SessionID} = $self->{session}->{id};
	
	$self->set_response(0, "Login successful");
}

sub do_user_login {
	##
	# Internal user login function
	##
	my $self = shift;
	my $username = shift;
	my $infinite = shift || 0;
	
	return undef unless $self->validate_ip();
	
	$self->log_debug(3, "User logging in: $username");
	
	my $user = $self->get_user($username);
	if (!$user) {
		return undef;
	}
	
	# create new session, set cookie
	$self->create_new_session('login', $infinite);
	$self->{session}->{db}->{username} = $username;
	$self->session_mark();
	
	$user->{LastLogin} = int(time());
	$user->{LastClientInfo} = get_client_info();
	
	# first login?
	if ($user->{FirstLogin}) {
		$self->{session}->{response}->{FirstLogin} = 1;
		delete $user->{FirstLogin};
	}
	
	$self->{storage}->mark('users/' . $username);
	
	$self->log_transaction( 'user_login', $username );
	
	return $user;
}

sub api_user_logout {
	##
	# Logout
	##
	my $self = shift;
	return unless $self->validate_session();
	
	$self->user_log_msg( "Logged out" );
	
	my $username = $self->{session}->{db}->{username};
	$self->delete_session();
	
	$self->log_transaction( 'user_logout', $username );
	$self->set_response(0, "Logout successful");
}

sub api_user_create {
	##
	# Create user standard
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$', 
		'/Password' => '.+',
		# '/FullName' => '^[\w\s\-\.]+$',
		'/Email' => '^[\w\-\@\.]+$'
	);
	
	return undef unless $self->validate_ip();
	
	my $session_id = $self->get_session_id();
	if ($session_id) {
		$self->log_debug(5, "Loading existing session: $session_id");
		$self->load_session( $session_id, 'quiet' );
	}
	
	my $query = $self->{session}->{query};
	my $xml = $self->{session}->{xml};
	my $response = $self->{session}->{response};
	
	my $username = lc($xml->{Username});
	if ($self->{storage}->check_record_exists('users/' . $username)) {
		return $self->api_error( 'user', "User already exists: $username" );
	}
	if ($username =~ /^(root|admin|administrator|effect|effectgames|superuser|joe|webmaster|support|javascript|crystalgalaxy)$/) {
		return $self->api_error( 'user', "Sorry, that username is reserved.  Please enter another.");
	}
	
	$self->log_debug(3, "Creating new user: $username (" . $xml->{FullName} . ")");
	
	# cannot set these (must use admin console)
	delete $xml->{Privileges};
	delete $xml->{AccountType};
	delete $xml->{Status};
	
	# $xml->{Created} = $xml->{Updated} = time();
	$xml->{Password} = md5_hex( $xml->{Password} );
	$xml->{Author} = $self->{session}->{db}->{username} || '(self)';
	$xml->{AuthorClientInfo} = get_client_info();
	
	$xml->{Privileges} = deep_copy( $self->{config}->{DefaultPrivileges} );
	
	$xml->{FirstLogin} = 1;
	
	# $xml->{FullName} = lc($xml->{FullName});
	# $xml->{FullName} =~ s/\b(\w)/ uc($1); /eg;
	$xml->{FirstName} = $xml->{FullName}; $xml->{FirstName} =~ s/^(\S+)\s+(.+)$/$1/;
	$xml->{LastInitial} = uc(substr($2 || '', 0, 1));
	
	foreach my $key (keys %{$self->{config}->{DefaultUser}}) {
		$xml->{$key} ||= $self->{config}->{DefaultUser}->{$key};
	}
	
	$self->log_debug(5, "Creating user storage records");
	if (!$self->{storage}->create_record( '/users/' . $username, $xml )) {
		return $self->api_error( 'storage', 'Failed to create user: ' . $self->{storage}->{error} );
	}
	if (!$self->{storage}->create_record( '/users/' . $username . '/stats', {} )) {
		return $self->api_error( 'storage', 'Failed to create user: ' . $self->{storage}->{error} );
	}
	if (!$self->{storage}->list_create( '/users/' . $username . '/log' )) {
		return $self->api_error( 'storage', 'Failed to create user: ' . $self->{storage}->{error} );
	}
	
	# add user to master list
	return unless $self->lock_list_unshift( "/admin/master_user_list", { Username => $username } );
	
	$self->send_user_email( 'NewAccount', $xml, $xml );
		
	$self->log_transaction( 'user_create', $username );
	$self->user_log_msg( 'Created account', $username ); # must pass username here because there is no session yet
	
	$self->set_response(0, "Successfully created user: $username");
}

sub api_user_forgot_password {
	##
	# E-mail link to reset password
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$'
	);
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	my $user = $self->get_user( $username );
	if (!$user) {
		return $self->api_error('user', "User not found: $username");
	}
	
	$user->{TempResetPasswordHash} = $xml->{Hash} = generate_unique_id();
	
	$self->{storage}->mark('users/'.$username);
	$self->{storage}->commit();
	
	$self->send_user_email( 'ResetPassword', $xml, $user );
	
	$self->log_transaction( 'user_request_password_reset', $username );
	$self->user_log_msg( "Requested password reset e-mail" );
	
	$self->set_response(0, "Success");
}

sub api_user_reset_password {
	##
	# Actually reset password this time
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$',
		'/Auth' => '^\w{32}$'
	);
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	my $user = $self->get_user( $username );
	if (!$user) {
		return $self->api_error('user', "User not found: $username");
	}
	
	if (!$user->{TempResetPasswordHash}) {
		return $self->api_error('user', "User has not requested a password reset.");
	}
	
	if ($user->{TempResetPasswordHash} ne $xml->{Auth}) {
		return $self->api_error('user', "Authorization code incorrect.  Password was not reset.  Please make sure the URL is correct.");
	}
	
	delete $user->{TempResetPasswordHash};
	
	my $temp_password = 'temp' . generate_unique_id(8);
	$user->{Password} = md5_hex( $temp_password );
	
	$self->{storage}->mark('users/'.$username);
	$self->{storage}->commit();
	
	$self->log_transaction( 'user_password_reset', $username );
	$self->user_log_msg( "Password was reset" );
	
	$self->{session}->{response}->{Username} = $username;
	$self->{session}->{response}->{TempPassword} = $temp_password;
	$self->set_response(0, "Success");
}

sub user_log_msg {
	##
	# Log message to user security log
	##
	my $self = shift;
	my $msg = shift;
	my $username = shift || $self->{session}->{db}->{username};
	
	$self->log_debug(5, "Adding entry to user log: $username: $msg");
	
	return $self->lock_list_unshift( "/users/$username/log", {
		Date => time(),
		IP => get_remote_ip(),
		UserAgent => get_user_agent(),
		Message => $msg
	} );
}

sub user_update_stats {
	##
	# Update one or more user stats
	##
	my $self = shift;
	my $stats = {@_};
	my $username = $self->{session}->{db}->{username};
	
	$self->log_debug(5, "Updating user stats: $username: " . serialize_object($stats));
	
	return $self->lock_update_record( "/users/$username/stats", $stats, 1 );
}

sub api_user_get_log {
	##
	# Return user's security log
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $list_path = "/users/$username/log";
	
	my $list = $self->{storage}->get_metadata( $list_path );
	if ($list) { $response->{List} = $list; }
	
	my $items = $self->{storage}->list_get( $list_path, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	$response->{Rows} = { Row => $items };
	$self->set_response(0, "Search successful");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->session_unmark();
}

sub send_user_email {
	##
	# Send email to user
	##
	my $self = shift;
	my ($config_name, $args, $user) = @_;
	
	if (!$user) {
		my $username = $self->{session}->{db}->{username};
		$user = $self->get_user( $username );
	}
	if (!$user) { return 0; }
	
	if (!$args) { $args = {}; }
	my $email_config = $self->{config}->{Emails}->{$config_name};
	
	$self->log_debug(4, "Sending $config_name e-mail to: " . $user->{Email} );
	
	my $to = '"'.$user->{FullName}.'" <'.$user->{Email}.'>';
	my $from = $self->{config}->{Emails}->{From};
	my $subject = memory_substitute( $email_config->{Subject}, $args );
	my $body = memory_substitute( $email_config->{Body} . "\n\n" . $self->{config}->{Emails}->{Signature}, $args );
	
	$self->send_email(
		From     => $from,
		To       => $to,
		Subject  => $subject,
		Data     => $body
	);
	
	$self->log_debug(5, "Email send complete");
	return 1;
}

sub api_user_send_email {
	##
	# Send user-to-user e-mail
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$',
		'/Subject' => '.+',
		'/Message' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user( $username );
	
	my $recip_username = $xml->{Username};
	
	my $recip_user = $self->get_user( $recip_username );
	if (!$recip_user) {
		return $self->api_error( 'user', "Unknown username: $recip_username" );
	}
	
	# make sure recipient user allows user-to-user e-mails
	if (!$recip_user->{Preferences}->{allow_user_emails}) {
		return $self->api_error( 'user', "User does not allow e-mails: $recip_username" );
	}
	
	my $body = $xml->{Message};
	$body .= "\n\n";
	$body .= $self->{config}->{Emails}->{UserToUserSignature} . "\n";
	
	my $from = "\"" . $user->{FullName} . "\" <" . $user->{Email} . ">";
	
	my $to = "\"" . $recip_user->{FullName} . "\" <" . $recip_user->{Email} . ">";
	
	my $subject = $xml->{Subject};
	
	if (!$self->send_email(
		From     => $from,
		To       => $to,
		Subject  => $subject,
		Data     => $body
	)) {
		return $self->api_error( 'email', "Failed to send email to " . $recip_username . ".  Please try again later." );
	}
	
	$self->log_transaction( 'user_email', $recip_username );
	$self->user_log_msg( "Sent e-mail to $recip_username" );
	
	$self->set_response(0, "Success");
}

sub api_update_user_storage {
	##
	# Update user storage (JSON blob)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Data' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	
	if (!$self->{storage}->store_file( "/users/$username", "site_storage.json", $xml->{Data} )) {
		return $self->api_error( 'user', "Could not save user storage data: " . $self->{storage}->{error} );
	}
	
	# this API call comes in on its own 5 second timer (with activity)
	# so let's be safe and not write the session for this one
	$self->session_unmark();
	
	$self->set_response(0, "Success");
}

sub api_contact_us {
	##
	# Send e-mail to us
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Reason' => '.+',
		'/GameID' => '.*',
		'/OS' => '.+',
		'/Browser' => '.+',
		'/Subject' => '.+',
		'/Message' => '.+'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user( $username );
	
	my $body = '';
	$body .= "User: " . $username . " (" . $user->{FullName} . ")\n";
	$body .= "Reason: " . $xml->{Reason} . "\n";
	$body .= "Game: " . $xml->{GameID} . "\n";
	$body .= "OS/Browser: " . $xml->{OS} . " " . $xml->{Browser} . "\n";
	$body .= "Client Info: " . get_client_info() . "\n";
	$body .= "Subject: " . $xml->{Subject} . "\n\n";
	
	$body .= $xml->{Message};
	$body .= "\n\n";
	
	my $from = "\"" . $user->{FullName} . "\" <" . $user->{Email} . ">";
	
	my $to = $self->{config}->{ContactEmail};
	
	my $subject = "User Support Form: " . $xml->{Subject};
	
	if (!$self->send_email(
		From     => $from,
		To       => $to,
		Subject  => $subject,
		Data     => $body
	)) {
		return $self->api_error( 'email', "Failed to send email.  Please try again later." );
	}
	
	$self->log_transaction( 'contact_us_email', $username );
	$self->user_log_msg( "Sent contact form from $username" );
	
	$self->set_response(0, "Success");
}

sub api_user_images_get {
	##
	# Fetch user image list
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $response = $self->{session}->{response};
	
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $list_path = '/users/' . $username . '/images';
	
	my $list = $self->{storage}->get_metadata( $list_path );
	if ($list) { $response->{List} = $list; }
	
	$query->{limit} ||= 1;
	$query->{offset} ||= 0;
	
	my $items = $self->{storage}->list_get( $list_path, $query->{offset}, $query->{limit} );
	$items ||= [];
	
	$response->{Rows} = { Row => $items };
	$self->set_response(0, "Search successful");
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->session_unmark();
}

sub api_admin_user_create {
	##
	# Create user from admin console, can set private data
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$', 
		'/Password' => '.+',
		'/FullName' => '^[\w\s\-\.]+$',
		'/Email' => '^[\w\-\@\.]+$'
	);
	
	return unless $self->validate_session();
	return unless $self->check_privilege( 'admin' );
	
	my $query = $self->{session}->{query};
	my $xml = $self->{session}->{xml};
	my $response = $self->{session}->{response};
	
	my $username = $xml->{Username};
	if ($self->{storage}->check_record_exists('users/' . $username)) {
		return $self->api_error( 'user', "User already exists: $username" );
	}
	
	$self->log_debug(3, "Creating new user: $username (" . $xml->{FullName} . ")");
	
	# $xml->{Created} = $xml->{Updated} = time();
	$xml->{Password} = md5_hex( $xml->{Password} );
	$xml->{Author} = $self->{session}->{db}->{username} || '(self)';
	$xml->{AuthorClientInfo} = get_client_info();
	if (!$xml->{Privileges}) {
		$xml->{Privileges} = $self->{config}->{DefaultPrivileges};
	}
	$xml->{FirstLogin} = 1;
	
	# $xml->{FullName} = lc($xml->{FullName});
	# $xml->{FullName} =~ s/\b(\w)/ uc($1); /eg;
	$xml->{FirstName} = $xml->{FullName}; $xml->{FirstName} =~ s/^(\S+)\s+(.+)$/$1/;
	$xml->{LastInitial} = uc(substr($2 || '', 0, 1));
	
	foreach my $key (keys %{$self->{config}->{DefaultUser}}) {
		$xml->{$key} ||= $self->{config}->{DefaultUser}->{$key};
	}
	
	if (!$self->{storage}->create_record( 'users/' . $username, $xml )) {
		return $self->api_error( 'storage', 'Failed to create user: ' . $self->{storage}->{error} );
	}
	
	$self->log_transaction( 'user_create', $username );
	
	$self->set_response(0, "Successfully created user: $username");
}

sub api_user_get {
	##
	# Get information about a user
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	
	my $session_username = $self->{session}->{db}->{username};
	if ($session_username ne $username) {
		# trying to load another user, must remove private data, and check privacy settings
		foreach my $key (keys %{$self->{config}->{PrivateUserData}}) {
			delete $user->{$key};
		}
		
		if (!$user->{Preferences}->{public_profile}) {
			delete $user->{FirstName};
			delete $user->{FullName};
			delete $user->{LastInitial};
			delete $user->{Email};
		}
	} # another user
	
	$self->{session}->{response}->{User} = $user;
	$self->set_response(0, "Successfully fetched user: $username");
	$self->set_ttl( 'ViewTTL' );
	$self->session_unmark();
}

sub api_user_update {
	##
	# Update information about user
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	
	return unless (
		($xml->{Username} eq $self->{session}->{db}->{username}) || 
		$self->check_privilege( 'update_users' )
	);
	
	$self->log_debug(3, "Updating user: $username");
	
	##
	# If trying to update self and don't have explicit priviledge,
	# don't allow user to update own priviledges
	##
	if (($xml->{Username} eq $self->{session}->{db}->{username}) && !$self->check_privilege( 'admin', 1 )) {
		delete $xml->{Privileges};
	}
	
	delete $xml->{AccountType};
	delete $xml->{Status};
	
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	
	# $xml->{Updated} = time();
	
	if ($xml->{Password}) {
		$xml->{Password} = md5_hex( $xml->{Password} );
	}
	
	if ($xml->{FullName}) {
		# $xml->{FullName} = lc($xml->{FullName});
		# $xml->{FullName} =~ s/\b(\w)/ uc($1); /eg;
		$xml->{FirstName} = $xml->{FullName}; $xml->{FirstName} =~ s/^(\S+)\s+(.*)$/$1/;
		$xml->{LastInitial} = uc(substr($2 || '', 0, 1));
	}
	
	my $new_prefs = undef;
	if ($xml->{Preferences}) {
		$new_prefs = $xml->{Preferences};
		delete $xml->{Preferences};
		
		my $prefs = $user->{Preferences} ||= {};
		foreach my $key (keys %$new_prefs) { $prefs->{$key} = $new_prefs->{$key}; }
	}
	
	foreach my $key (keys %$xml) {
		$user->{$key} = $xml->{$key};
	}
	
	$self->{storage}->mark('users/'.$username);
	
	$self->log_transaction( 'user_update', $username );
	$self->user_log_msg( "Updated account settings" );
	
	$self->{session}->{response}->{User} = $user;
	$self->set_response(0, "Successfully updated user: $username");
}

sub api_user_delete {
	##
	# Delete user
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	
	return unless (
		($xml->{Username} eq $self->{session}->{db}->{username}) || 
		$self->check_privilege( 'delete_users' )
	);
	
	$self->log_debug(3, "Deleting user: $username");
	
	if (!$self->{storage}->check_record_exists('users/'.$username)) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	
	# load user
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	
	# remove user from all games (and user game list itself)
	my $items = $self->{storage}->list_get( "/users/$username/games" );
	$items ||= [];
	foreach my $game_stub (@$items) {
		my $game_id = $game_stub->{GameID};
		$self->log_debug(5, "Removing user $username from game: $game_id");
		
		my $list_path = "/games/$game_id/users";
		$self->lock_find_delete_list_item( $list_path, { Username => $username } );
		
		$self->game_log_msg($game_id, "Removed member $username from game (user was deleted)", 'member');
		$self->log_transaction( 'game_delete_member', $game_id . '/' . $username );
	}
	$self->{storage}->list_delete("/users/$username/games");
	
	# remove stats record
	$self->{storage}->delete_record("users/$username/stats");
	
	# remove security log
	$self->{storage}->list_delete("/users/$username/log");
	
	# TODO: article drafts?
		
	# finally, delete user record itself
	if (!$self->{storage}->delete_record('users/'.$username)) {
		return $self->api_error( 'user', "Failed to delete user: $username: " . $self->{storage}->{error} );
	}
	
	$self->log_transaction( 'user_delete', $username );
		
	$self->set_response(0, "Successfully deleted user: $username");
}

sub api_admin_user_get {
	##
	# Get extended information about a user (admin only)
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Username' => '^\w+$'
	);
	return unless $self->validate_session();
	return unless $self->check_privilege('admin');
	
	my $xml = $self->{session}->{xml};
	my $username = $xml->{Username};
	my $response = $self->{session}->{response};
	
	my $user = $self->get_user($username);
	if (!$user) {
		return $self->api_error( 'user', "User not found: $username" );
	}
	$response->{User} = $user;
	
	# stats
	$response->{Stats} = $self->{storage}->get_metadata( "/users/$username/stats" );
	
	# log
	$items = $self->{storage}->list_get( "/users/$username/log", 0, 100 );
	$items ||= [];
	$response->{Log} = { Row => $items };
	
	# games
	$items = $self->{storage}->list_get( "/users/$username/games", 0, 100 );
	$items ||= [];
	my $rows = [];
	foreach my $item (@$items) {
		my $path = '/games/' . $item->{GameID};
		my $metadata = $self->{storage}->get_metadata( $path );
		if ($metadata) {
			push @$rows, $metadata;
		}
	}
	$response->{Games} = { Row => $rows };
	
	# articles
	$items = $self->{storage}->list_get( "/users/$username/articles", 0, 100 );
	$items ||= [];
	$response->{Articles} = { Row => $items };
	
	$self->set_response(0, "Successfully fetched user: $username");
	
	$self->session_unmark();
}

sub api_get_buddy_icon {
	##
	# Fetch buddy icon for user -- this is a query string API
	# URI: /effect/api/get_buddy_icon?username=jhuckaby&size=32|64|128
	##
	my $self = shift;
	my $query = $self->{session}->{query};
	my $username = $query->{username};
	my $size = $query->{size} || 32;
	my $user = $self->get_user($username);
	if (!$user) { return $self->api_error('user', 'User not found: ' . $username); }
	
	my $icon_file = '';
		
	if ($user->{StockAvatar}) {
		$icon_file = $self->{config}->{Paths}->{ImageDir} . '/stock_avatars/' . $user->{StockAvatar};
	}
	else {
		$icon_file = $self->{storage}->get_file_path('users/'.$username, 'buddy.icon.'.$size);
	}
	
	# if we failed, return default icon
	if (!(-e $icon_file)) {
		$icon_file = $self->{config}->{Paths}->{ImageDir} . '/stock_avatars/default.png';
	}
	
	$self->log_debug(5, "Returning buddy icon: $icon_file");
	
	my $content = load_file( $icon_file );
	my $fmt = $self->file_magic( $content );
	my $mime_type = "image/" . $fmt->{Name};
	
	$self->{session}->{request}->content_type($mime_type);
	$self->{session}->{request}->headers_out()->set( 'Content-Length', length($content) );
	$self->{session}->{request}->headers_out()->set( 'Last-Modified', time2str( (stat($icon_file))[9] ) );
	
	$self->set_ttl( 'ViewTTL' );
	
	$self->apache_print( $content );
	$self->{session}->{output_sent} = 1;
}

sub api_user_image_delete {
	##
	# Delete user image from list
	##
	my $self = shift;
	return unless $self->require_xml(
		'/Filename' => '^.+$'
	);
	return unless $self->validate_session();
	
	my $xml = $self->{session}->{xml};
	my $username = $self->{session}->{db}->{username};
	my $storage_key = "/users/$username/images";
	
	return unless $self->lock_find_delete_list_item( $storage_key, $xml );
	
	$self->log_transaction( 'user_image_delete', $xml->{Filename} );
	
	$self->set_response(0, "Successfully deleted user image: " . $xml->{Filename});
}

sub api_upload_user_image {
	##
	# Upload image, probably for article, stored in user list
	##
	my $self = shift;
	
	##
	# Flash doesn't send browser cookies, so we must recover session from query string
	##
	$self->{session}->{cookie}->{effect_session_id} = $self->{session}->{query}->{session};
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if (!$user) { return $self->throw_upload_error('upload', 'Could not load user: ' . $username); }
	
	delete $user->{LastUploadError};
	$self->{storage}->mark('users/'.$username);
	
	my $upload = $self->{session}->{query}->{Filedata_data};
	if (!$upload && !$self->{session}->{raw_post_data}) { return $self->throw_upload_error('upload', 'Upload data not found: Filedata'); }
	
	my $client_filename = ''.$self->{session}->{query}->{Filedata};
	if ($client_filename !~ /\.(\w+)$/) { return $self->throw_upload_error('upload', 'Uploaded file has no extension: ' . $client_filename); }
	my $ext = lc($1);
	
	my $storage_key = "/users/$username/images";
	
	if (!$self->{storage}->check_record_exists($storage_key)) {
		my $result = $self->{storage}->create_record( $storage_key, {} );
		if (!$result) { return $self->throw_upload_error('upload', 'Failed to store image: ' . $self->{storage}->{error}); }
	}
	
	my $image_id = generate_unique_id(8);
	while ($self->{storage}->get_file_fh( $storage_key, "$image_id.$ext" )) {
		$image_id = generate_unique_id(8);
	}
	
	my $raw_data = $upload || $self->{session}->{raw_post_data};
	my $filename = "$image_id.$ext";
	
	my $result = $self->{storage}->store_file( $storage_key, $filename, $raw_data );
	if (!$result) { return $self->throw_upload_error('upload', 'Failed to store image: ' . $self->{storage}->{error}); }
	
	# store a thumbnail too, and why not?
	my $temp_file = $self->{config}->{Paths}->{TempDir} . '/temp_imageupload_orig_' . $username . '.' . $ext;
	unlink $temp_file;
	save_file( $temp_file, $raw_data );
	
	if (!(-e $temp_file) || !(-s $temp_file)) { return $self->throw_upload_error('upload', 'Could not write upload data: ' . $!); }
	
	my $dest_ext = 'jpg'; # all jpg thumbnails
	my $stage_file = $self->{config}->{Paths}->{TempDir} . '/temp_imageupload_stage_' . $username . '.' . $dest_ext;
	my $thumb_filename = $image_id . '_thumb.' . $dest_ext;
	my $thumb_size = $self->{config}->{ImageManager}->{ThumbSize}->{_Attribs}->{Width} . 'x' . $self->{config}->{ImageManager}->{ThumbSize}->{_Attribs}->{Height};
	
	my $cmd = $self->{config}->{Paths}->{ImageMagickConvert};
	$cmd .= " $temp_file";
	if ($ext ne 'gif') { $cmd .= " -trim -bordercolor white"; }
	if ($ext eq 'gif') { $cmd .= " -coalesce -set dispose previous"; }
	$cmd .= " -auto-orient -thumbnail '$thumb_size>'";
	$cmd .= " -background white -gravity center -extent $thumb_size";
	$cmd .= " $stage_file 2>&1";
	
	$self->log_debug(5, "Executing command: $cmd");
	my $result = `$cmd`;
	if ($result =~ /\S/) {
		unlink $temp_file;
		unlink $stage_file;
		return $self->throw_upload_error('upload', 'Failed to resize image: ' . $result);
	}
	
	my $result = $self->{storage}->store_file( $storage_key, $thumb_filename, load_file($stage_file) );
	if (!$result) {
		unlink $temp_file;
		unlink $stage_file;
		return $self->throw_upload_error('upload', 'Failed to store image: ' . $self->{storage}->{error});
	}
	
	unlink $temp_file;
	unlink $stage_file;
	
	return unless $self->lock_list_unshift( $storage_key, { Filename => $filename, Thumbnail => $thumb_filename } );
	
	$self->log_transaction( 'user_image_upload', $filename );	
	
	$self->set_response(0, "Success");
}

sub api_upload_avatar {
	##
	# Receive upload from Flash, convert to 32x32 and store in user area
	##
	my $self = shift;
	
	##
	# Flash doesn't send browser cookies, so we must recover session from query string
	##
	$self->{session}->{cookie}->{effect_session_id} = $self->{session}->{query}->{session};
	return unless $self->validate_session();
	
	my $username = $self->{session}->{db}->{username};
	my $user = $self->get_user($username);
	if ($user) {
		delete $user->{LastUploadError};
	}
	
	my $upload = $self->{session}->{query}->{Filedata_data};
	if (!$upload && !$self->{session}->{raw_post_data}) { return $self->throw_upload_error('upload', 'Upload data not found: Filedata'); }
	
	my $client_filename = ''.$self->{session}->{query}->{Filedata};
	if ($client_filename !~ /\.(\w+)$/) { return $self->throw_upload_error('upload', 'Uploaded file has no extension: ' . $client_filename); }
	my $ext = lc($1);
	
	my $temp_file = $self->{config}->{Paths}->{TempDir} . '/temp_avatar_orig_' . $username . '.' . $ext;
	unlink $temp_file;
	if ($upload) { save_file( $temp_file, $upload ); }
	else { save_file( $temp_file, $self->{session}->{raw_post_data} ); }
	
	if (!(-e $temp_file) || !(-s $temp_file)) { return $self->throw_upload_error('upload', 'Could not write upload data: ' . $!); }
	
	my $dest_ext = ($ext ne 'jpg') ? $ext : 'png'; # convert jpg to png, preserve everything else (i.e. gif)
	my $stage_file = $self->{config}->{Paths}->{TempDir} . '/temp_' . $username . '.' . $dest_ext;
	
	foreach my $size (128, 64, 32) {
		my $cmd = $self->{config}->{Paths}->{ImageMagickConvert};
		$cmd .= " $temp_file";
		if ($ext ne 'gif') { $cmd .= " -trim -bordercolor white"; }
		if ($ext eq 'gif') { $cmd .= " -coalesce -set dispose previous"; }
		$cmd .= " -auto-orient -thumbnail '".$size."x".$size.">'";
		$cmd .= " -background transparent -gravity center -extent ".$size."x".$size;
		$cmd .= " $stage_file 2>&1";
	
		$self->log_debug(5, "Executing command: $cmd");
		my $result = `$cmd`;
		if ($result =~ /\S/) {
			unlink $temp_file;
			unlink $stage_file;
			return $self->throw_upload_error('upload', 'Failed to resize image: ' . $result);
		}
	
		my $result = $self->{storage}->store_file( 'users/'.$username, 'buddy.icon.'.$size, load_file($stage_file) );
		if (!$result) {
			unlink $temp_file;
			unlink $stage_file;
			return $self->throw_upload_error('upload', 'Failed to store image: ' . $self->{storage}->{error});
		}
		
		unlink $stage_file;
	} # foreach size
	
	unlink $temp_file;
	
	delete $user->{StockAvatar};
	$self->{storage}->mark('users/'.$username);
	
	$self->set_response(0, "Success");
}

sub check_privilege {
	##
	# Make sure user has privilege to perform requested action(s)
	##
	my $self = shift;
	my $priv = shift;
	my $readonly = shift || 0;
	
	if (!$self->{session}->{user}) {
		my $username = $self->{session}->{db}->{username};
		if (!$username) {
			$self->api_error( 'session', "Session has no username" );
			return undef;
		}
		my $user = $self->get_user($username);
		if (!$user) {
			$self->api_error( 'user', "User not found: $username" );
			return undef;
		}
		$self->{session}->{user} = $user;
	}
	my $user_db = $self->{session}->{user};
	my $user_privs = $user_db->{Privileges} ||= {};
	
	##
	# 'admin' privilege means you can do it all, regardless
	##
	if ($user_privs->{admin}) { return 1; }
	
	if (!xpath_lookup($priv, $user_privs)) {
		if (!$readonly) { $self->api_error( 'user', "You do not have enough privileges" ); }
		return undef;
	}
	
	return 1;
}

sub is_admin {
	##
	# Silently check for admin privileges
	##
	my $self = shift;
	return $self->check_privilege('admin', 'readonly');
}

sub get_user {
	##
	# Return user metadata reference
	##
	my $self = shift;
	my $username = shift;
	
	return $self->{storage}->get_metadata('users/'.$username);
}

1;
