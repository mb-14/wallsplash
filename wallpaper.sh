#!/bin/bash
echo $1
osascript -e 'tell application "System Events" to set picture of every desktop to "'$1'"'