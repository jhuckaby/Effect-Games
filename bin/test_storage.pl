#!/effect/perl/bin/perl

# Effect Games Engine and IDE v1.0
# Copyright (c) 2005 - 2011 Joseph Huckaby
# Source Code released under the MIT License: 
# http://www.opensource.org/licenses/mit-license.php

# Storage test script for Effect Server
# JH - 2008-10-25

use strict;
use Carp ();
# use Test::More tests => 3;
use Test::More qw(no_plan);

use English qw( -no_match_vars ) ;
use Digest::MD5 qw/md5_hex/;
use Time::HiRes qw/time/;
use Data::Dumper;

use lib qw@/effect/lib@;
use XML::Lite;
use XML::API::Tools;
use Effect::Storage;

$| = 1;

if ($UID != 0) { die "\nError: Must be root to run test suite.  Exiting.\n"; }

$SIG{'__DIE__'} = sub { Carp::cluck("Stack Trace"); };

##
# Become web user
##
my (undef, undef, $n_uid, $n_gid) = getpwnam('www'); # Sniff this out of httpd.conf?
if (!$n_uid) { die "Cannot determine web UID"; }
if ($EUID != $n_uid) {
	print "Becoming web user...";
	$GID = $EGID = $n_gid;
	$UID = $EUID = $n_uid;
	print "done.\n";
}

my $config = parse_xml( '/effect/conf/Effect.xml' );
$config->{DebugLevel} = 9;

$config->{StorageConfig}->{Mount} .= '/test';
make_dirs_for( $config->{StorageConfig}->{Mount} . '/' );
if (!(-d $config->{StorageConfig}->{Mount})) { die "Failed to create storage test directory: " . $config->{StorageConfig}->{Mount} . ": $!"; }

$config->{StorageConfig}->{ListItemsPerPage} = 10;
print "List Items Per Page: " . $config->{StorageConfig}->{ListItemsPerPage} . "\n";

##
# Wipe out all storage data (test dir only)
##
my $storage_base = $config->{StorageConfig}->{Mount};
`rm -rf $storage_base/*`;

my $result = undef;

my $storage = undef;
eval {
	$storage = new Effect::Storage(
		config => $config->{StorageConfig},
		resident => bless({})
	);
};
ok( !$@, "Created Effect::Storage object" ) or diag($@);

$storage->session_start();

$result = $storage->list_create( 'list1' );
ok( $result, "Created list" ) or diag($storage->{error} || $! || 'Unknown');

$storage->session_end();
$storage->session_start();

my $list = $storage->list_get_info('list1');
warn "List Info: " . Dumper($list);

my $items = $storage->list_get('list1');
ok( @$items == 0, "No items found at this point, good." );

$result = $storage->list_push( 'list1', { foo => 'bar', number => 123 } );
ok( $result, "Pushed item onto end of list" ) or diag($storage->{error} || $! || 'Unknown');

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list1');
ok( @$items == 1, "1 item found in list, good" );

print "List Items: " . Dumper($items);

$list = $storage->list_get_info('list1');
warn "List Info: " . Dumper($list);

$storage->session_end();
$storage->session_start();

my $item = $storage->list_pop('list1');
ok( $item && ($item->{foo} eq 'bar'), "Fetched item from pop, good." );

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list1');
ok( @$items == 0, "No items found after pop, good." );

$storage->session_end();
$storage->session_start();

$result = $storage->list_push( 'list1', { foo => 'bar2', number => 124 } );
ok( $result, "Added new item after popping last one" );

$storage->session_end();
$storage->session_start();

$result = $storage->list_delete( 'list1' );
ok( $result, "Deleted list" );

$storage->session_end();
$storage->session_start();

warn "Making sure list1 was deleted...\n";

$items = $storage->list_get('list1');
ok( !$items, "No items found at this point, good." );

$list = $storage->list_get_info('list1');
ok( !$list, "Cannot even load list info, good." );

$storage->session_end();
$storage->session_start();

$result = $storage->list_create( 'list2' );
ok( $result, "Created new list" ) or diag($storage->{error} || $! || 'Unknown');

for (0..9) { $storage->list_push( 'list2', { foo => 'bar', number => $_ } ); }

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 10, "10 items found in list, good" );

print "List Items: " . Dumper($items);

warn "Next push should create a new page...\n";

$result = $storage->list_push( 'list2', { foo => 'bar2', number => 10 } );
ok( $result, "Added new item after first page is full" );

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 11, "11 items found in list, good" );

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

$storage->session_end();
$storage->session_start();

warn "Trying multi-page fetch...\n";

$items = $storage->list_get('list2', 9, 2);
ok( @$items == 2, "2 items found near end of list, good" );
ok( $items->[0]->{number} == 9, "item a has correct data" );
ok( $items->[1]->{number} == 10, "item b has correct data" );

$storage->session_end();
$storage->session_start();

$item = $storage->list_pop('list2');
ok( $item && ($item->{number} == 10), "Popped item off end of list" );

$storage->session_end();
$storage->session_start();

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

ok( $list->{first_page} == $list->{last_page} , "only 1 page in list now (pop deleted second page), good" );

$storage->session_end();
$storage->session_start();

$result = $storage->list_push( 'list2', { foo => 'bar2', number => 10 } );
ok( $result, "Re-added new item after first page is full" );

$storage->session_end();
$storage->session_start();

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

ok( $list->{first_page} == $list->{last_page} - 1, "2 pages in list now, good" );

warn "Now, deleting an item from the first page should leave it partial, and orphan the 1 item on the second page.\n";

$item = $storage->list_shift('list2');
ok( $item && ($item->{number} == 0), "Shifted item off beginning of list");

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 10, "10 items found in list, good" );
ok ($items->[0]->{number} == 1, "first item has correct data");
ok ($items->[9]->{number} == 10, "last item has correct data");

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

ok( $list->{first_page} == $list->{last_page} - 1, "still 2 pages in list, good" );

$storage->session_end();
$storage->session_start();

warn "Trying multi-page fetch with partial data on first page...\n";

$items = $storage->list_get('list2', 8, 2);
ok( @$items == 2, "2 items found near end of list, good" );
ok( $items->[0]->{number} == 9, "item a has correct data" );
ok( $items->[1]->{number} == 10, "item b has correct data" );

$storage->session_end();
$storage->session_start();

warn "Now filling up second page, should overflow onto third page...\n";

for (0..9) { $storage->list_push( 'list2', { foo => 'bar3', number => 11 + $_ } ); }

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 20, "20 items found in list, good" );
ok( $items->[0]->{number} == 1, "first item has correct data" );
ok( $items->[19]->{number} == 20, "last item has correct data" );

# should be 9 items, 10 items, 1 item on three pages at this point

warn "Cutting 2 items from middle of second page...\n";

$items = $storage->list_cut( 'list2', 15, 2 );
warn "Cut Items: " . Dumper($items);

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

# warn "Page 0: " . Dumper( $storage->get_metadata('list2/0') );
# warn "Page 1: " . Dumper( $storage->get_metadata('list2/1') );
# warn "Page 2: " . Dumper( $storage->get_metadata('list2/2') ); # should be empty

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 18, "18 items found in list, good" );
ok( $items->[0]->{number} == 1, "first item has correct data" );
ok( $items->[17]->{number} == 20, "last item has correct data" );

$storage->session_end();
$storage->session_start();

warn "Unshifting two items at beginning, should overflow first page and create new page at other end\n";

$result = $storage->list_unshift( 'list2', { foo => 'bar4', number => 0 } );
ok( $result, "Shifted first item" );

$result = $storage->list_unshift( 'list2', { foo => 'bar4', number => -1 } );
ok( $result, "Shifted second item" );

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 20, "20 items found in list, good" );
ok( $items->[0]->{number} == -1, "first item has correct data" );
ok( $items->[-1]->{number} == 20, "last item has correct data" );

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

$storage->session_end();
$storage->session_start();

warn "Cutting off last 2 items that were unshifted, this causes root page to move\n";

$items = $storage->list_cut( 'list2', 0, 2 );
warn "Cut Items: " . Dumper($items);

$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2');
ok( @$items == 18, "18 items found in list, good" );
ok( $items->[0]->{number} == 1, "first item has correct data" );
ok( $items->[17]->{number} == 20, "last item has correct data" );

$storage->session_end();
$storage->session_start();

warn "Testing fetching 5 items from 'end' of list (without knowing length)\n";

$items = $storage->list_get('list2', -5);
warn "Items: " . Dumper($items);

ok( @$items == 5, "Correct number of items returned" );
ok( $items->[0]->{number} == 14, "first item has correct data" );
ok( $items->[-1]->{number} == 20, "last item has correct data" );

$storage->session_end();
$storage->session_start();

warn "Adding 1000 items...\n";

for (0..999) { $storage->list_push( 'list2', { foo => 'bar5', number => 1000 + $_ } ); }

$storage->session_end();
$storage->session_start();

$list = $storage->list_get_info('list2');
ok( $list && ($list->{length} == 1018), "list has correct length - 1018") or diag(Dumper($list));

warn "Fetching 45 items from numerous pages in the middle\n";

$items = $storage->list_get('list2', 500, 45);
ok( @$items == 45, "45 items fetched, good" );
ok( $items->[0]->{number} == 1482, "first item has correct data" ) or diag(Dumper($items->[0]));
ok( $items->[-1]->{number} == 1526, "last item has correct data" ) or diag(Dumper($items->[-1]));

$storage->session_end();
$storage->session_start();

warn "Cutting those 45 items out...\n";

$items = $storage->list_cut('list2', 500, 45);
ok( @$items == 45, "45 items cut, good" );
ok( $items->[0]->{number} == 1482, "first cut item has correct data" ) or diag(Dumper($items->[0]));
ok( $items->[-1]->{number} == 1526, "last cut item has correct data" ) or diag(Dumper($items->[-1]));

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2', 499, 1);
ok( (@$items == 1) && ($items->[0]->{number} == 1481), "item just before cut is correct");

$items = $storage->list_get('list2', 500, 1);
ok( (@$items == 1) && ($items->[0]->{number} == 1527), "item just after cut is correct");

$list = $storage->list_get_info('list2');
ok( $list && ($list->{length} == 973), "list has correct length") or diag(Dumper($list));

$storage->session_end();
$storage->session_start();

warn "Testing fetching 5 items from 'end' of list (without knowing length) -- again\n";




$list = $storage->list_get_info('list2');
warn "List Info: " . Dumper($list);

warn "Page 97: " . Dumper( $storage->get_metadata('list2/97') );


for (0..97) { print "Page $_ Num Items: " . (scalar @{$storage->get_metadata("list2/$_")->{item}}) . "\n"; }





$items = $storage->list_get('list2', -5);
warn "Items: " . Dumper($items);

ok( @$items == 5, "Correct number of items returned - 5" );
ok( $items->[0]->{number} == 1995, "first item has correct data" );
ok( $items->[-1]->{number} == 1999, "last item has correct data" );

$storage->session_end();
$storage->session_start();

warn "Most difficult of all -- delete 400 items, one item at a time, from the second page (first page can shrink / move, second page cannot)\n";
for (0..400) {
	$items = $storage->list_cut('list2', 18, 1);
	ok( $items && (@$items == 1) && ($items->[0]->{number} == $_ + 1000), "Correct item cut: $_");
	
	$items = $storage->list_get('list2', -1);
	ok( $items && (@$items == 1) && ($items->[0]->{number} == 1999), "Correct last item in list: 1999");
}

$storage->session_end();
$storage->session_start();

$items = $storage->list_get('list2', -5);
warn "Items: " . Dumper($items);

ok( @$items == 5, "Correct number of items returned - 5" );
ok( $items->[0]->{number} == 1995, "first item has correct data" );
ok( $items->[-1]->{number} == 1999, "last item has correct data" );

$storage->session_end();
$storage->session_start();

warn "Deleting entire list...\n";

$result = $storage->list_delete('list2');
ok( $result, "List deleted" );

$storage->session_end();
$storage->session_start();

warn "Making sure list2 was deleted...\n";

$items = $storage->list_get('list2');
ok( !$items, "No items found at this point, good." );

$list = $storage->list_get_info('list2');
ok( !$list, "Cannot even load list info, good." );

$storage->session_end();

exit;

sub log_debug {
	my ($self, $level, $msg) = @_;
	my $epoch = time();
	warn "[$epoch][$$][$level] $msg\n";
}

1;
