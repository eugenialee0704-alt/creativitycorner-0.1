#!/bin/bash
# Check the local record book and its public link.
# Restart whichever one has stopped. This runs on its own, without the chat open.
set -u
UID_NUM="$(id -u)"
URLFILE="$HOME/Library/Logs/creativity-api-url.txt"

if ! curl -sf --max-time 5 -o /dev/null http://127.0.0.1:8765/index.html; then
    launchctl kickstart -k "gui/${UID_NUM}/com.creativitycorner.website" || true
fi

if [[ ! -f "$URLFILE" ]]; then
    launchctl kickstart -k "gui/${UID_NUM}/com.creativitycorner.publicapi" || true
    exit 0
fi

now=$(date +%s)
mtime=$(stat -f %m "$URLFILE")
age=$((now - mtime))
if [[ "$age" -lt 180 ]]; then
    exit 0
fi

url=$(cat "$URLFILE")
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url/index.html" || true)
if [[ "$code" != "200" ]]; then
    launchctl kickstart -k "gui/${UID_NUM}/com.creativitycorner.publicapi" || true
fi
