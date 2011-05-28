package Effect::Daemon;

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

##
# Generic Preforking HTTP Server
##

use strict;
no strict 'refs';

use English qw( -no_match_vars ) ;
use FileHandle;
use File::Basename;
use File::Path;
use Time::HiRes qw/time sleep/;
use Time::Local qw/timelocal timelocal_nocheck/;
use Digest::MD5 qw/md5 md5_hex/;
use URI::Escape;
use HTTP::Daemon;
use HTTP::Request;
use HTTP::Response;
use Carp ();
use POSIX qw/:sys_wait_h setsid/;
use UNIVERSAL qw/isa/;

$| = 1;

if ($UID != 0) { die "\nError: Must be root to use this.  Exiting.\n"; }

sub new {
	##
	# Class constructor
	##
	my $class = shift;
	my $self = bless( {@_}, $class );
	
	if (!$self->{request_handler}) { die "Must pass request_handler to daemon constructor."; }
	
	$self->{name} ||= 'Generic Server';
	$self->{process_name} ||= 'GenericServer';
	$self->{pid_file} ||= '/var/run/generic_server.pid';
	$self->{debug_level} ||= 1;
	$self->{port} ||= 8080;
	$self->{max_children} ||= 1;
	$self->{max_requests_per_child} ||= 0;
	$self->{growl} ||= '';
	
	return $self;
}

sub startup {
	##
	# Become daemon, setup signal handling and start socket listener
	##
	my $self = shift;
	
	my $daemon_pid = $self->become_daemon();
	$self->{daemon_pid} = $daemon_pid;
	
	$self->update_daemon_status( 'Startup' );
	$self->log_debug(1, $self->{name} . " starting up");
	
	##
	# Install signal handlers to catch warnings and crashes
	##
	$SIG{'__WARN__'} = sub {
		my ($package_name, undef, undef) = caller();
		$self->log_debug( 4, $_[0] );
	};
	$SIG{'__DIE__'} = sub {
		# my ($package_name, undef, undef) = caller();
		# $self->log_debug( 1, "Fatal Error: " . $_[0] );
		Carp::cluck("Stack Trace");
	};
	
	##
	# Keep track of child processes
	##
	$self->{zombies} = 0;
	$self->{active_kids} = {};
	
	##
	# Install signal handlers
	##
	$self->install_signal_handlers();

	##
	# Write daemon's PID file
	##
	$self->write_pid_file();
	
	if ($self->{user}) { $self->become_web_user(); }

	##
	# Start server
	##
	$self->log_debug( 1, "Starting socket listener on port " . $self->{port} );
	$self->{server} = HTTP::Daemon->new( 
		LocalPort => $self->{port}, 
		# LocalAddr => '127.0.0.1', 
		Reuse => 1, 
		Timeout => 86400 
	) || die "Cannot create socket: $!\n";
}

sub idle {
	##
	# Manage children
	##
	my $self = shift;
	
	$self->update_daemon_status( 'Active' );
	$self->log_debug( 1, "Daemon resuming normal operations." );

	while (1) {
		my $num_children = scalar keys %{$self->{active_kids}};
		while ($num_children < $self->{max_children}) {
			$self->spawn_child();
			$num_children++;
		}
		
		if ($self->{idle_handler}) {
			$self->{idle_handler}->( $self );
		}
		
		$self->reaper() if $self->{zombies};
		last if $self->{sig_term};
		
		sleep 1;
	} # infinite loop

	$self->log_debug( 1, "Shutting down" );
	$self->kill_all_children();

	unlink $self->{pid_file};
	
	$self->log_debug( 1, $self->{name} . " exiting");
}

sub spawn_custom {
	##
	# Spawn child to perform custom task (pass in func ref)
	##
	my ($self, $func) = @_;
	
	$self->log_debug( 2, "Forking new custom child");
	my $pid = fork();
	
	if (defined($pid)) {
		##
		# Fork was successful
		##
		if ($pid) {
			##
			# Parent division of fork
			##
			$self->{active_kids}->{$pid} = 1;
			$self->log_debug( 2, "Forked child (PID: " . $pid . ")" );
			$self->update_daemon_status( 'Active' );
			return $pid;
		}
		else {
			##
			# Child division of fork
			##
			$self->log_debug( 2, "Child starting up");
			$self->set_process_status( 'Child' );
			
			$func->( $self );
			
			$self->log_debug( 2, "Child exiting (custom)");
			exit();
		}
	}
	else {
		die "Could not fork: $!\n";
	}
}

sub spawn_child {
	##
	# Spawn new child
	##
	my $self = shift;
	
	$self->log_debug( 2, "Forking new child");
	my $pid = fork();
	
	if (defined($pid)) {
		##
		# Fork was successful
		##
		if ($pid) {
			##
			# Parent division of fork
			##
			$self->{active_kids}->{$pid} = 1;
			$self->log_debug( 2, "Forked child (PID: " . $pid . ")" );
			$self->update_daemon_status( 'Active' );
		}
		else {
			##
			# Child division of fork
			##
			$self->log_debug( 2, "Child starting up");
			my $max_reqs = $self->{max_requests_per_child};
			my $req_num = 0;
			
			$self->set_process_status( 'Child' );
			
			while (($req_num < $max_reqs) || !$max_reqs) {
				$req_num++;
				my $c = $self->{server}->accept() or last;
				$c->autoflush(1);
				$self->log_debug(3, "New connection from: " . $c->peerhost() );

				# Get the request
				my $r = $c->get_request() or last;
				my $uri = $r->url();
				$self->log_debug( 4, "Request URI: $uri" );
				
				$self->{socket} = $c;
				
				eval {
					$self->{request_handler}->( $self, $r, $c );
				};
				
				if ($self->{cleanup_handler}) {
					# always call cleanup handler, regardless
					$self->{cleanup_handler}->( $self, $r, $c );
				}
				
				if ($@) {
					# handler crashed, send back HTTP 500
					$self->log_debug(1, "HTTP 500 Internal Server Error: $@");
					
					my $response = HTTP::Response->new( 500, "Internal Server Error" );
					$response->content("Internal Server Error: $@");
					$response->header("Content-Type" => "text/html");
					$c->send_response($response);
					$c->close();
				}
				
				$self->log_debug(3, "Request end");
			} # child request loop
			
			$self->log_debug( 2, "Child exiting ($req_num total requests)");
			exit();
		}
	}
	else {
		die "Could not fork: $!\n";
	}
}

sub send_response {
	##
	# Send custom HTTP response
	##
	my ($self, $code, $msg, $content) = @_;
	
	$self->log_debug(4, "HTTP $code $msg");
	
	my $response = HTTP::Response->new( $code, $msg );
	if ($content) {
		$response->header("Content-Type" => "text/html");
		$response->content( $content ); 
	}
	$self->{socket}->send_response($response);
	$self->{socket}->close();
	
	return 1;
}

sub become_web_user {
	##
	# Become web user
	##
	my $self = shift;
	my (undef, undef, $n_uid, $n_gid) = getpwnam( $self->{user} );
	if (!$n_uid) { die "Cannot determine web UID for: " . $self->{user}; }
	if ($EUID != $n_uid) {
		# print "Becoming web user...";
		$GID = $EGID = $n_gid;
		$UID = $EUID = $n_uid;
		# print "done.\n";
	}
}

sub install_signal_handlers {
	##
	# Install handler functions for common signals.
	##
	my $self = shift;
	$SIG{CHLD} = sub { $self->{zombies}++; };
	$SIG{TERM} = sub { $self->{sig_term} = 1; };
}

sub kill_all_children {
	##
	# Send SIGTERM to all active children
	##
	my $self = shift;
	foreach my $kid (keys %{$self->{active_kids}}) {
		$self->log_debug( 1, "Killing child: $kid");
		kill( 1, $kid ); # SIGTERM
	}
}

sub update_daemon_status {
	##
	# Update daemon status in OS process table.
	##
	my ($self, $mode) = @_;
	my $total_kids = scalar keys %{$self->{active_kids}};
	
	if ($total_kids > 1) {
		$self->set_process_status( "Daemon: $total_kids kids" );
	}
	elsif ($total_kids == 1) {
		$self->set_process_status( "Daemon: 1 kid" );
	}
	else {
		$self->set_process_status( "Daemon: $mode" );
	}
}

sub set_process_status {
	##
	# Set daemon status in OS process table.  This string shows up in
	# `ps -ef` calls on Linux, or `ps -aux` calls on MacOS X.
	##
	my ($self, $msg) = @_;

	$0 = $self->{process_name} . " " . $msg;
}

sub reaper {
	##
	# Reap child zombies -- compile hash of child exit status codes
	##
	my $self = shift;
	$self->{zombies} = 0;

	foreach my $pid (keys %{$self->{active_kids}}) {
		if ((my $zombie = waitpid($pid, WNOHANG)) > 0) {
			##
			# Check if child exited cleanly
			##
			my $child_exit_code = $?;
			if ($child_exit_code) {
				##
				# Non-zero exit code means something bad happened.
				##
				$self->log_debug( 1, "Child (PID: $zombie) exited improperly with code: $child_exit_code" );
			}
			else {
				$self->log_debug( 2, "Child (PID: $zombie) exited cleanly" );
			}
			
			##
			# Clear child PID from tracking hash
			##
			delete $self->{active_kids}->{$zombie};
			$self->update_daemon_status( 'Active' );
		}
	}
}

sub write_pid_file {
	##
	# Check for running daemon, and write PID file
	##
	my $self = shift;
	
	if (defined($self->{pid_file}) && $self->{pid_file}) {
		if (-e $self->{pid_file}) {
			my $fh = new FileHandle("<" . $self->{pid_file});
			if ($fh) {
				my $old_pid = <$fh>;
				undef $fh;
				chomp $old_pid;
				if (kill(0, $old_pid)) {
					open( STDERR, ">/dev/tty" );
					die "Error: Daemon already running at PID: $old_pid.\n";
				}
			}
		}
		
		my $fh = new FileHandle(">" . $self->{pid_file});
		if ($fh) {
			$fh->print($$."\n");
			$fh->close();
		} 
		else {
			$self->log_debug( 1, "Could not create PID file: $self->{pid_file}: $!" );
		}
	}
}

sub become_daemon {
	##
	# Fork daemon process and disassociate from terminal
	##
	my $self = shift;
	my $pid = fork();
	if (!defined($pid)) { die "Error: Cannot fork daemon process: $!\n"; }
	if ($pid) { exit(0); }
	
	setsid();
	open( STDIN, "</dev/null" );
	open( STDOUT, ">/dev/null" );
	chdir( '/' );
	umask( 0 );
	
	return $$;
}

sub log_debug {
	my ($self, $level, $msg) = @_;
	
	if ($self->{logger} && ($level <= $self->{debug_level})) {
		$self->{logger}->log_print(
			log => 'debug',
			component => ($$ == $self->{daemon_pid}) ? 'daemon' : 'child',
			code => $level,
			msg => $msg
		);
		
		if (($level == 1) && ($self->{growl})) {
			
			# $self->{logger}->log_print( log=>'debug', component=>'', code=>'2', msg=>"Opening pipe to growl: " . $self->{growl} );
			
			my $fh = FileHandle->new( "|" . $self->{growl} );
			if ($fh) {
				$fh->print( "$msg\n" );
				$fh->close();
			}
		}
	}
}

1;
