#!/bin/bash
# Prints in "yellow" to stand out
function goul { printf "\x1B[33m%s\x1B[00m\n" "$1" ; }

I_have_a_shitty_net=true # Like, it's *always* true -- no need to check it
links_file=looper.links.txt

goul
goul "  *********************"
goul "  *     LOOPER.sh     *"
goul "  *********************"
goul "  Why? To try to download stuff over poor and unpredictable connections."
goul "  It assumes links (in '$links_file') support resuming and won't expire."
goul

if ! (aria2c -v &> /dev/null); then goul "aria2c not installed? :O"; exit; fi
if ! (test -f "$links_file"); then goul "'$links_file' not found! >.<"; exit; fi

while $I_have_a_shitty_net; do

  goul "Downloading..."
  links=`cat $links_file | grep "^[^#]"` # Get lines that don't starts with '#'
  for link in $links ; do
    aria2c "$link" -c
  done

  goul "Sleeping..."
  sleep 30s
  
done
