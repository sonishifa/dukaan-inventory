#!/usr/bin/env sh
# Calls <base-url>/api/health until it reports {"status":"ok"} or gives up.
# Used by the pipeline after every deployment and after the Docker smoke test.
# Usage: scripts/health-check.sh https://your-app.vercel.app
set -u

BASE_URL="${1:?usage: health-check.sh <base-url>}"
ATTEMPTS="${ATTEMPTS:-10}"
DELAY="${DELAY:-6}"

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  if [ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
    BODY=$(curl -fsS --max-time 10 -H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}" "$BASE_URL/api/health" 2>/dev/null)
  else
    BODY=$(curl -fsS --max-time 10 "$BASE_URL/api/health" 2>/dev/null)
  fi
  if echo "$BODY" | grep -q '"status":"ok"'; then
    echo "Healthy: $BODY"
    exit 0
  fi
  echo "Health check attempt $i/$ATTEMPTS failed, retrying in ${DELAY}s..."
  i=$((i + 1))
  sleep "$DELAY"
done

echo "Health check failed for $BASE_URL"
exit 1
