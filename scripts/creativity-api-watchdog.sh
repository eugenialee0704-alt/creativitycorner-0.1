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
url=$(cat "$URLFILE")
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url/index.html" || true)
ROOT="/Users/eugenialee/Downloads/Creativity Training Website (AI creativity chatbot)"
if [[ "$code" == "200" ]]; then
    if ! grep -F -q "$url" "$ROOT/api-config.js"; then
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
if [[ "$age" -lt 90 ]]; then
    exit 0
fi
launchctl kickstart -k "gui/${UID_NUM}/com.creativitycorner.publicapi" || true
