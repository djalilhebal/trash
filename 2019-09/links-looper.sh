#!/bin/bash
## links-looper.sh (2019-09) -- improving upon 2019-03's looper.sh
## Looper, like, loops over the links list and lumping downloads/resumes them..
## Why? To try to download stuff over poor and unstable connections.
##
## Notes:
## * Links are read from the 'input file'
##   - Lines that start with '#' are ignored
##   - Completed links are prefixed with "#done "
## * No args? Runs as `looper --input-file="links.txt" --output-dir="looped-files"`
## * It assumes provided URLs support resuming and won't expire.
## * In case a torrent is provided, it will stop once it's completed (no seeding)
## * Only one instance of this script should run at the time... maybe?

I_HAVE_A_SHITTY_NET=true # Like, it's always true, no need to check...
SELF="$0"

input_file="links.txt"
output_dir="looped-files"
for i in "$@"
do
  case $i in
    -i=*|--input-file=*)
    input_file="${i#*=}"
    ;;
    -d=*|--output-dir=*)
    output_dir="${i#*=}"
    ;;
    *)
    ;;
  esac
done

function log() { echo "LOOPER: $1" ; }
function die() { echo "$*" 1>&2 ; exit 1; }

## Prefix the current link's line with '#done '
## TODO: Consider using `sed` or `awk`
function mark_done() {
  target="$LOOPER_current"
  notify-send --urgency=low "LOOPER: done" "$target"
  while read -r line; do
    if [[ "$line" = "$target" ]]; then
     echo "#done $line"
    else
     echo "$line"
    fi
  done < $input_file > $input_file.tmp
  mv --force $input_file.tmp $input_file
}

function loop_all() {
  while $I_HAVE_A_SHITTY_NET; do

    log "Restarting..."
    # Get lines that start with something other than '#'
    links=$(cat $input_file | grep "^[^#]")
    for link in $links; do
      export LOOPER_current="$link" # It's accessed by mark_done()
      aria2c --continue --seed-time=0 --on-download-complete="$SELF" \
             --user-agent "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0" \
             --dir "$output_dir" "$link"
      sleep 5 # To ensure that the on-download-complete hook has finished executing
    done

    log "Sleeping..."
    sleep 30
  
  done
}

# Check for requirements
which aria2c > /dev/null  ||  die "aria2c not found! :O"
test -f "$input_file"     ||  die "Input file '$input_file' not found! >.<"

if [[ -n "$LOOPER_current" ]]; then # running as 'slave'
  mark_done
else # running as 'master'
  loop_all
fi
