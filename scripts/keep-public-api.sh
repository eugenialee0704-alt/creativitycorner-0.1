#!/bin/bash
# Keep a public address open so the GitHub website can save answers
# on this computer. If the address changes, publish the new one.
set -u
ROOT="/Users/eugenialee/Downloads/Creativity Training Website (AI creativity chatbot)"
CLOUDFLARED="$HOME/.local/bin/cloudflared"
CONFIG="$ROOT/api-config.js"
LOCK="$HOME/Library/Logs/creativity-api-update.lock"
URLFILE="$HOME/Library/Logs/creativity-api-url.txt"

publish_url() {
    local url="$1"
    printf '%s\n' "$url" > "$URLFILE"
    (
        if ! mkdir "$LOCK" 2>/dev/null; then
            exit 0
        fi
        trap 'rmdir "$LOCK"' EXIT
        /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 - "$CONFIG" "$url" "$ROOT" <<'PY'
import os
import re
import subprocess
import sys

path, url, root = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
updated = re.sub(
    r'window\.CREATIVITY_API = "[^"]*";',
    'window.CREATIVITY_API = "%s";' % url,
    text,
    count=1,
)
if updated == text:
    sys.exit(0)
open(path, "w", encoding="utf-8").write(updated)
env = os.environ.copy()
env.update({
    "GIT_AUTHOR_NAME": "eugenialee0704-alt",
    "GIT_AUTHOR_EMAIL": "eugenialee0704-alt@users.noreply.github.com",
    "GIT_COMMITTER_NAME": "eugenialee0704-alt",
    "GIT_COMMITTER_EMAIL": "eugenialee0704-alt@users.noreply.github.com",
})
subprocess.run(
    ["git", "add", "--", "api-config.js"],
    cwd=root,
    env=env,
    check=False,
)
committed = subprocess.run(
    [
        "git",
        "commit",
        "-m",
        "Point the public website at this computer's record book.",
        "--only",
        "--",
        "api-config.js",
    ],
    cwd=root,
    env=env,
    check=False,
)
if committed.returncode != 0:
    sys.exit(0)
subprocess.run(
    [
        "git",
        "-c",
        "credential.helper=!/Users/eugenialee/.local/bin/gh auth git-credential",
        "push",
        "origin",
        "main",
    ],
    cwd=root,
    env=env,
    check=False,
)
PY
    ) &
}

PARENT=$$

# A quiet public page request keeps the link from being closed for inactivity.
# If the link stays closed, stop this copy so a fresh one can start.
(
    fails=0
    while true; do
        sleep 20
        url=""
        if [[ -f "$URLFILE" ]]; then
            url=$(cat "$URLFILE")
        fi
        if [[ -z "$url" ]]; then
            continue
        fi
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 12 "$url/index.html" || true)
        if [[ "$code" == "200" ]]; then
            fails=0
        else
            fails=$((fails + 1))
        fi
        if [[ "$fails" -ge 3 ]]; then
            kill "$PARENT" 2>/dev/null || true
            exit 1
        fi
    done
) &
WATCH=$!
cleanup() {
    kill "$WATCH" 2>/dev/null || true
    pkill -P "$$" -f "cloudflared tunnel --url http://127.0.0.1:8765" 2>/dev/null || true
}
trap cleanup EXIT
trap 'cleanup; exit 1' TERM INT

"$CLOUDFLARED" tunnel --url http://127.0.0.1:8765 --no-autoupdate --grace-period 1s 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ "$line" =~ https://[A-Za-z0-9]+(-[A-Za-z0-9]+)+\.trycloudflare\.com ]]; then
        publish_url "${BASH_REMATCH[0]}"
    fi
    if [[ "$line" == *"Tunnel not found"* || "$line" == *"no recent network activity"* || "$line" == *"control stream error"* || "$line" == *"failed to request quick Tunnel"* || "$line" == *"Connection terminated"* ]]; then
        kill "$PARENT" 2>/dev/null || true
        exit 1
    fi
done
