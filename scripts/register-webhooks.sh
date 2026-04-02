#!/bin/bash
# Usage: ./scripts/register-webhooks.sh https://abc123.ngrok-free.app

NGROK_URL=${1:-""}
if [ -z "$NGROK_URL" ]; then
  echo "Usage: ./scripts/register-webhooks.sh https://your-ngrok-url.ngrok-free.app"
  exit 1
fi

# Update .env
sed -i '' "s|BACKEND_URL=.*|BACKEND_URL=$NGROK_URL|" backend/.env
echo "✅ Updated BACKEND_URL in backend/.env to $NGROK_URL"

# Login and get token
TOKEN=$(curl -s -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pipelinehub.dev","password":"admin123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Could not get auth token — is the backend running on port 4000?"
  exit 1
fi
echo "✅ Authenticated"

# Get all repos with a token
REPOS=$(curl -s "http://localhost:4000/api/repositories" \
  -H "Authorization: Bearer $TOKEN")

echo "$REPOS" | python3 - << 'PYEOF'
import json, sys, subprocess, os

repos = json.loads(sys.stdin.read() if False else open('/dev/stdin').read())
PYEOF

# Use python to parse and register
echo "$REPOS" | python3 -c "
import json, sys, subprocess
repos = json.load(sys.stdin)
import os
ngrok = os.environ.get('NGROK_URL', '')
for r in repos:
    if not r.get('githubToken'):
        print(f'  ⚠️  Skipping {r[\"fullName\"]} — no token')
        continue
    print(f'  Registering {r[\"fullName\"]}...')
" NGROK_URL="$NGROK_URL"

# Register each repo via API
REPO_IDS=$(curl -s "http://localhost:4000/api/repositories" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import json,sys; [print(r['id']) for r in json.load(sys.stdin) if r.get('githubToken')]")

for ID in $REPO_IDS; do
  RESULT=$(curl -s -X POST "http://localhost:4000/api/repositories/$ID/webhook/register" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"webhookUrl\":\"$NGROK_URL/api/webhooks/github\"}")
  NAME=$(echo $RESULT | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('fullName','?'))" 2>/dev/null)
  HOOK=$(echo $RESULT | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('webhookId','error'))" 2>/dev/null)
  echo "  ✅ $NAME → webhookId: $HOOK"
done

echo ""
echo "✅ Done — all webhooks point to $NGROK_URL/api/webhooks/github"
echo "   GitHub will now send events to your local backend."
