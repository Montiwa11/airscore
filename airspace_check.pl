#!/usr/bin/perl -I/home/geoff/bin
#
# Check to see if a track violates airspace
#
# Needs to be quick/pruned somehow?
# Only check if 'nearby' / every 30 seconds?
# 
# Geoff Wong 2008
#

require DBD::mysql;

use Airspace qw(:all);
use Data::Dumper;
use JSON;

use strict;

#
# Verify an entire task ...
#
if ($#ARGV < 0)
{
    print "airspace_check <tasPk> [<traPk>]\n";
    exit 1;
}

my $traPk;
my $tasPk = 0 + $ARGV[0];

if ($#ARGV == 1)
{
    $traPk = 0 + $ARGV[1];
}

my $tracks;
my $airspace;
my $dist;
my $name;
my $space;
my %overall;
my @checked;
my @pilot_results;

$Airspace::dbh = db_connect();

if ($traPk > 0)
{
    $tracks = get_one_track($Airspace::dbh, $traPk);
}
else
{
    $tracks = get_all_tracks($Airspace::dbh, $tasPk);
}

$airspace = find_task_airspace($Airspace::dbh, $tasPk);
if (scalar(@$airspace) == 0)
{
    exit 0;
}

my $json = JSON->new->allow_nonref;

# print "Airspaces checked:\n";
foreach $space (@$airspace)
{
    # print "   ", cln($space->{'name'}), " with base=", cln($space->{'base'}), "\n";
    push @checked, $space->{'name'} . " (" . cln($space->{'base'}) . ")";
}

$overall{'checked'} = \@checked;

#print Dumper($airspace);
# Go through all the tracks ..
# might be more useful to print the names :-)

for my $track (keys %$tracks)
{
    my %result = ();
    $dist = 0;
    $name = $tracks->{$track}->{'pilFirstName'} . " " . $tracks->{$track}->{'pilLastName'};
    #print "\n$name ($track): ";
    $result{'track'} = 0+$track;
    $result{'pilot'} = $name;
    $result{'pilot_id'} = $tracks->{$track}->{'pilPk'};
    if (($dist = airspace_check($Airspace::dbh, $track, $airspace)) > 0)
    {
        #print "\n    Maximum violation of $dist metres ($name).";
        $result{'result'} = "violation";
        $result{'excess'} = $dist;
    }
    else
    {
        $result{'result'} = "none";
        $result{'excess'} = 0;
    }

    push @pilot_results, \%result;
}

$overall{'pilots'} = \@pilot_results;

#print Dumper(\%result);

my $pretty_printed = $json->pretty->encode( \%overall ); # pretty-printing
print($pretty_printed);



