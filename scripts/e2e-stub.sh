#!/usr/bin/env bash
set -euo pipefail

# This script exercises the middleware end-to-end against the local Crok stub.
# It spins up the stub and the app on high ports, runs OAuth (auth code + refresh)
# and Alexa intents, then tears everything down.

PORT="${PORT:-3101}"
CROK_STUB_PORT="${CROK_STUB_PORT:-3200}"

ALEXA_CLIENT_ID="${ALEXA_CLIENT_ID:-local-client}"
ALEXA_CLIENT_SECRET="${ALEXA_CLIENT_SECRET:-local-secret}"
ALEXA_REDIRECT_URI="${ALEXA_REDIRECT_URI:-http://localhost:3000/dev-callback}"
ADMIN_DEFAULT_USER="${ADMIN_DEFAULT_USER:-admin}"
ADMIN_PASS=<redacted>

echo "[start] crok stub on :${CROK_STUB_PORT}"
node scripts/mock-crok.js >/tmp/crok-stub.log 2>&1 &
stub_pid=$!

echo "[start] middleware on :${PORT}"
PORT="${PORT}" APP_HOST=localhost \
ALEXA_CLIENT_ID="${ALEXA_CLIENT_ID}" \
ALEXA_CLIENT_SECRET="${ALEXA_CLIENT_SECRET}" \
ALEXA_REDIRECT_URI="${ALEXA_REDIRECT_URI}" \
ADMIN_DEFAULT_USER="${ADMIN_DEFAULT_USER}" \
ADMIN_PASS=<redacted>
CROK_API_BASE="http://localhost:${CROK_STUB_PORT}" \
DISABLE_ALEXA_SIGNATURE_VALIDATION=1 \
node src/server.js >/tmp/alexa-crok.log 2>&1 &
app_pid=$!

cleanup() {
  kill "$app_pid" "$stub_pid" 2>/dev/null || true
}
trap cleanup EXIT

sleep 1
base="http://localhost:${PORT}"

echo "[step] authorize"
auth_resp=$(curl -i -s -X POST "${base}/oauth/authorize?client_id=${ALEXA_CLIENT_ID}&redirect_uri=${ALEXA_REDIRECT_URI}&state=xyz&scope=test" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${ALEXA_CLIENT_ID}&redirect_uri=${ALEXA_REDIRECT_URI}&username=${ADMIN_DEFAULT_USER}&password=${ADMIN_PASS}")
echo "$auth_resp" | head -n 6 | tr -d '\r'
code=$(echo "$auth_resp" | tr -d '\r' | awk -F"code=" '/Location/ { split($2,a,"&"); print a[1]; }')
echo "[auth code] $code"

echo "[step] token (auth code)"
token_resp=$(curl -s -X POST "${base}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=${ALEXA_CLIENT_ID}&client_secret=${ALEXA_CLIENT_SECRET}&redirect_uri=${ALEXA_REDIRECT_URI}&code=${code}")
echo "$token_resp"
refresh=$(echo "$token_resp" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.refresh_token||'');")
echo "[refresh token] $refresh"

echo "[step] token (refresh)"
refresh_resp=$(curl -s -X POST "${base}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=${ALEXA_CLIENT_ID}&client_secret=${ALEXA_CLIENT_SECRET}&refresh_token=${refresh}")
echo "$refresh_resp"

echo "[step] alexa status intent"
status_resp=$(curl -s -X POST "${base}/alexa" \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "type": "IntentRequest",
      "timestamp": "2024-01-01T00:00:00Z",
      "intent": { "name": "GetCrokStatusIntent", "slots": {} }
    }
  }')
echo "$status_resp"

echo "[step] alexa action intent"
action_resp=$(curl -s -X POST "${base}/alexa" \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "type": "IntentRequest",
      "timestamp": "2024-01-01T00:00:00Z",
      "intent": { "name": "TriggerCrokActionIntent", "slots": { "Action": { "value": "deploy" } } }
    }
  }')
echo "$action_resp"

echo "[step] alexa chat intent (start conversation)"
chat_resp_1=$(curl -s -X POST "${base}/alexa" \
  -H "Content-Type: application/json" \
  -d '{
    "session": { "new": true, "sessionId": "amzn1.echo-api.session.mock", "attributes": {} },
    "context": { "System": { "user": { "accessToken": "stub-token" } } },
    "request": {
      "type": "IntentRequest",
      "timestamp": "2024-01-01T00:00:00Z",
      "intent": { "name": "CrokChatIntent", "slots": { "Text": { "value": "Hallo" } } }
    }
  }')
echo "$chat_resp_1"
conv_id=$(echo "$chat_resp_1" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((d.sessionAttributes&&d.sessionAttributes.conversationId)||'');")
echo "[conversation id] $conv_id"

echo "[step] alexa chat intent (continue conversation)"
chat_resp_2=$(curl -s -X POST "${base}/alexa" \
  -H "Content-Type: application/json" \
  -d "{
    \"session\": { \"new\": false, \"sessionId\": \"amzn1.echo-api.session.mock\", \"attributes\": { \"conversationId\": \"${conv_id}\" } },
    \"context\": { \"System\": { \"user\": { \"accessToken\": \"stub-token\" } } },
    \"request\": {
      \"type\": \"IntentRequest\",
      \"timestamp\": \"2024-01-01T00:00:00Z\",
      \"intent\": { \"name\": \"CrokChatIntent\", \"slots\": { \"Text\": { \"value\": \"Wie gehts?\" } } }
    }
  }")
echo "$chat_resp_2"
