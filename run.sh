#!/usr/bin/env bash
# Two ways to have a login, and the same questions asked of both.
#
#   ./run.sh
#
# Needs Docker and Node 22. The backend is destroyed and rebuilt every run.
set -uo pipefail
cd "$(dirname "$0")"

# Fail here rather than three minutes from now with an empty result.
docker info >/dev/null 2>&1 || {
  echo ""
  echo "  Docker is not running. Start Docker Desktop (or your daemon) and run this again."
  echo ""
  exit 1
}
ready() { for _ in $(seq 1 120); do
    c=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Parse-Application-Id: auth' \
      'http://127.0.0.1:1346/parse/classes/Account?limit=0'); [ "$c" != 000 ] && return; sleep 0.5
  done; echo "    !! the backend never answered" >&2; exit 1; }

rm -f outbox/mail.log
docker compose down -v >/dev/null 2>&1
docker compose up -d >/dev/null 2>&1
ready
node run.mjs

echo "  [5/5] WITH E-MAIL VERIFICATION SWITCHED ON"
echo ""
docker compose down >/dev/null 2>&1
docker compose -f compose.yml -f compose.verify.yml up -d >/dev/null 2>&1
ready
node verify.mjs
