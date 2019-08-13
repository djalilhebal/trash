#!/bin/bash  
## power-panic.sh -- 2019-08
## Why? My laptop lasts --at best-- about 5 mins on battery, before dying without warning...
## This script "panics" instead of me: If we're not connected to a power supply, sleep ASAP!!
## Tested on Ubuntu 18.04.3 x64
## (Not sure if about distros/versions have the 'online' pseudo-file or 'systemctl' command)

# Every 30 secs, test that the power is on OR tell the system to sleep -- ignoring inhibitors
watch -n 30 'test "$(cat /sys/class/power_supply/AC/online)" -eq "1" || systemctl suspend -i'
