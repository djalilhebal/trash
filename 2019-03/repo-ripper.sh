#!/bin/bash
echo "Usage: repo-ripper.sh USERNAME [--include-forks | --starred]"
echo "Downloads/Rips all of USERNAME's repos from GitHub or keeps them updated"
echo "Example 1: repo-ripper.sh linuxscout"
echo "downloads/updates all of Taha's repos to/in './ripped-repos/@linuxscout/'"
echo "Example 2: repo-ripper.sh djalilhebal --starred"
echo "downloads/updates repos that are starred by djalilhebal to/in their owners' folders"
echo
# Since I hardly have Internet access, I needed to write a script to download
#  stuff from interesting people like @linuxscout, @ncase, and @getify. [WIP]
# XXX What will (or should) happen if the original repo gets deleted or emptied?
# TODO Do as advised in https://redd.it/b66i2k

# CONSTANTS, for the sake of clarity and readabiliy
API="https://api.github.com"
MAX=100 # Max entries per page, limited by GitHub
REGEX_REPO="git://github.com/(.+)/(.+)\.git" # e.g. "git://github.com/linuxscout/mishkal.git"
REGEX_REPO_NAME="[^/]+(?=\.git$)" # "(mishkal).git"
REGEX_REPO_USER="[^/]+(?=/[^/]+\.git$)" # "(linuxscout)/mishkal.git"

username=$(echo "$1" | grep -oP '^[A-Za-z0-9_-]+$')
test -z "$username" && exit # Exit if empty: An invalid username was provided.

if test "$2" = "--include-forks";
  then include_forks="true";
  else include_forks="false";
fi

if test "$2" = "--starred";
  then api_repos="$API/users/$username/starred?per_page=$MAX";
  else api_repos="$API/search/repositories?q=user:$username+fork:$include_forks&per_page=$MAX";
fi

page_num=1
while repos=$(wget "$api_repos&page=$page_num" -O- | grep -oP "$REGEX_REPO"); test -n "$repos"; do
  count=$(echo "$repos" | wc -l)
  echo "Page#$page_num has $count repos."

  for repo in $repos; do
    repo_user=$(echo "$repo" | grep -oP "$REGEX_REPO_USER")
    repo_name=$(echo "$repo" | grep -oP "$REGEX_REPO_NAME")
    user_folder="./ripped-repos/@$repo_user"
    repo_folder="$user_folder/$repo_name"

    mkdir -p "$user_folder" # If output folder doesn't exist, create it.

    echo "Doing @$repo_user/$repo_name..."
    if test -d "$repo_folder/.git/" # If the repo was already cloned, '.git/' must've been created.
      then (cd "$repo_folder" && git fetch --depth 1 && git reset --hard origin/HEAD); # Update!
      else (cd "$user_folder" && git clone --depth 1 "$repo"); # Download!
    fi

  done

  if test $count -lt $MAX; # meaning there are no more pages/repos to fetch.
    then exit;
    else ((page_num++));
  fi

done
