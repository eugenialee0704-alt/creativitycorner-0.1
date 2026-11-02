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

probe_public() {
    local url="$1"
    local host ip
    host="${url#https://}"
    host="${host%%/*}"
    ip=$(/usr/bin/dig +time=2 +tries=1 +short A "$host" @1.1.1.1 2>/dev/null | /usr/bin/awk '/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ { print; exit }')
    if [[ -z "$ip" ]]; then
        ip=$(/usr/bin/dig +time=2 +tries=1 +short A "$host" @8.8.8.8 2>/dev/null | /usr/bin/awk '/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ { print; exit }')
    fi
    if [[ -z "$ip" ]]; then
        printf '000'
        return
    fi
    /usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 12 \
        -H "Cache-Control: no-cache" \
        --resolve "${host}:443:${ip}" \
        "https://${host}/index.html?ping=$(date +%s)" || true
}

now=$(date +%s)
mtime=$(stat -f %m "$URLFILE")
age=$((now - mtime))
url=$(cat "$URLFILE")
code=$(probe_public "$url")
printf '%s ping %s\n' "$(date '+%H:%M:%S')" "$code"
FAILFILE="$HOME/Library/Logs/creativity-api-ping.fails"
ROOT="/Users/eugenialee/Downloads/Creativity Training Website (AI creativity chatbot)"
if [[ "$code" == "200" ]]; then
    printf '0\n' > "$FAILFILE"
    if [[ ! -r "$ROOT/api-config.js" ]]; then
        exit 0
    fi
    /usr/bin/grep -F -q "$url" "$ROOT/api-config.js"
    grep_status=$?
    if [[ "$grep_status" -eq 1 ]]; then
        /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 - "$ROOT/api-config.js" "$url" "$ROOT" <<'PY'
import os, re, subprocess, sys
path, url, root = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
updated = re.sub(r'window\.CREATIVITY_API = "[^"]*";', 'window.CREATIVITY_API = "%s";' % url, text, count=1)
if updated == text:
    sys.exit(0)
open(path, "w", encoding="utf-8").write(updated)
env = os.environ.copy()
env.update({
    "GIT_AUTHOR_NAME": "eugenialee0704-alt",
    "GIT_AUTHOR_EMAIL": "eugenialee0704-alt@users.noreply.github.com",
    "GIT_COMMITTER_NAME": "eugenialee0704-alt",
    "GIT_COMMITTER_EMAIL": "eugenialee0704-alt@users.noreply.github.com",
    "GIT_TERMINAL_PROMPT": "0",
})
subprocess.run(["git", "add", "--", "api-config.js"], cwd=root, env=env, check=False)
committed = subprocess.run(["git", "commit", "-m", "Point the public website at this computer's record book.", "--only", "--", "api-config.js"], cwd=root, env=env, check=False)
if committed.returncode != 0:
    sys.exit(0)
subprocess.run(["git", "-c", "credential.helper=!/Users/eugenialee/.local/bin/gh auth git-credential", "push", "origin", "main"], cwd=root, env=env, check=False)
PY
    fi
    exit 0
fi
# A phone often cannot find a brand-new address for a minute. Do not replace
# the address just because this computer's own name lookup failed.
if [[ "$code" == "000" || "$age" -lt 120 ]]; then
    exit 0
fi
fails=$(cat "$FAILFILE" 2>/dev/null || echo 0)
fails=$((fails + 1))
printf '%s\n' "$fails" > "$FAILFILE"
if [[ "$fails" -lt 3 ]]; then
    exit 0
fi
launchctl kickstart -k "gui/${UID_NUM}/com.creativitycorner.publicapi" || true
