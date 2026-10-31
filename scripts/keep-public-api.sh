#!/bin/bash
# Keep a public address open so the GitHub website can save answers
# on this computer. If the address changes, publish the new one.
set -u
ROOT="/Users/eugenialee/Downloads/Creativity Training Website (AI creativity chatbot)"
CLOUDFLARED="$HOME/.local/bin/cloudflared"
CONFIG="$ROOT/api-config.js"
LOCK="$HOME/Library/Logs/creativity-api-update.lock"

publish_url() {
    local url="$1"
    (
        if ! mkdir "$LOCK" 2>/dev/null; then
            exit 0
        fi
        trap 'rmdir "$LOCK"' EXIT
        python3 - "$CONFIG" "$url" <<'PY'
import re, sys
path, url = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
updated = re.sub(r'window\.CREATIVITY_API = "[^"]*";', 'window.CREATIVITY_API = "%s";' % url, text, count=1)
if updated == text:
    sys.exit(0)
open(path, "w", encoding="utf-8").write(updated)
sys.exit(2)
PY
        changed=$?
        if [ "$changed" -ne 2 ]; then
            exit 0
        fi
        cd "$ROOT" || exit 0
        GIT_AUTHOR_NAME='eugenialee0704-alt' \
        GIT_AUTHOR_EMAIL='eugenialee0704-alt@users.noreply.github.com' \
        GIT_COMMITTER_NAME='eugenialee0704-alt' \
        GIT_COMMITTER_EMAIL='eugenialee0704-alt@users.noreply.github.com' \
        git commit --only -- api-config.js -m "$(cat <<'EOF'
Point the public website at this computer's record book.

EOF
)" || exit 0
        git -c credential.helper='!/Users/eugenialee/.local/bin/gh auth git-credential' push origin main || true
    ) &
}

"$CLOUDFLARED" tunnel --url http://127.0.0.1:8765 --no-autoupdate 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ "$line" =~ https://[A-Za-z0-9-]+\.trycloudflare\.com ]]; then
        publish_url "${BASH_REMATCH[0]}"
    fi
done
