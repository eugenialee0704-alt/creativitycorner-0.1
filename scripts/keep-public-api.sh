#!/bin/bash
# Keep a public address open so the GitHub website can save answers
# on this computer. If the address changes, publish the new one.
set -u
# The record book now lives on Supabase. Starting a laptop tunnel would
# replace that address and break sign-in when the lid is closed.
if [[ -f "$HOME/Library/Logs/creativity-api-supabase.txt" ]]; then
    while true; do
        sleep 3600
    done
fi
ROOT="/Users/eugenialee/Downloads/Creativity Training Website (AI creativity chatbot)"
CLOUDFLARED="$HOME/.local/bin/cloudflared"
CONFIG="$ROOT/api-config.js"
LOCK="$HOME/Library/Logs/creativity-api-update.lock"
URLFILE="$HOME/Library/Logs/creativity-api-url.txt"

publish_url() {
    local url="$1"
    if [[ -f "$HOME/Library/Logs/creativity-api-supabase.txt" ]]; then
        return 0
    fi
    printf '%s\n' "$url" > "$URLFILE"
    (
        if [[ -d "$LOCK" ]]; then
            now=$(date +%s)
            mtime=$(stat -f %m "$LOCK" 2>/dev/null || echo 0)
            if [[ $((now - mtime)) -gt 90 ]]; then
                rmdir "$LOCK" 2>/dev/null || true
            fi
        fi
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
    "GIT_TERMINAL_PROMPT": "0",
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
pushed = subprocess.run(
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
    capture_output=True,
    text=True,
)
if pushed.stdout:
    print(pushed.stdout, end="")
if pushed.stderr:
    print(pushed.stderr, end="")
if pushed.returncode != 0:
    sys.exit(pushed.returncode)
PY
    ) &
}

# Ask the public link for a page often enough that it is not closed for inactivity.
# This loop must not stop the link. A separate check starts a new one only when
# the link is really closed.
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

(
    while true; do
        sleep 25
        url=""
        if [[ -f "$URLFILE" ]]; then
            url=$(cat "$URLFILE")
        fi
        if [[ -z "$url" ]]; then
            continue
        fi
        printf 'ping %s\n' "$(probe_public "$url")"
    done
) &
WATCH=$!
disown "$WATCH" 2>/dev/null || true
cleanup() {
    kill "$WATCH" 2>/dev/null || true
    pkill -P "$$" -f "cloudflared tunnel --url http://127.0.0.1:8765" 2>/dev/null || true
}
trap cleanup EXIT
trap 'cleanup; exit 1' TERM INT

PARENT=$$
"$CLOUDFLARED" tunnel --url http://127.0.0.1:8765 --no-autoupdate --grace-period 1s 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ "$line" =~ https://[A-Za-z0-9]+(-[A-Za-z0-9]+)+\.trycloudflare\.com ]]; then
        publish_url "${BASH_REMATCH[0]}"
    fi
    if [[ "$line" == *"Tunnel not found"* || "$line" == *"failed to request quick Tunnel"* ]]; then
        kill "$PARENT" 2>/dev/null || true
        exit 1
    fi
done
