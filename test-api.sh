#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pipelinehub.dev","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Workers ==="
curl -s http://localhost:4001/api/workers \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(w['name'],'|',w['status']) for w in json.load(sys.stdin)]"

echo ""
echo "=== Repositories ==="
curl -s http://localhost:4001/api/repositories \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(r['fullName'],'| autoDemo='+str(r['autoDemo'])) for r in json.load(sys.stdin)]"

echo ""
echo "=== Queue Metrics ==="
curl -s http://localhost:4001/api/queue/metrics \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

echo ""
echo "=== Trigger Demo Event ==="
REPO_ID=$(curl -s http://localhost:4001/api/repositories \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -X POST "http://localhost:4001/api/demo/trigger/$REPO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

echo ""
echo "=== Jobs (after trigger) ==="
sleep 3
curl -s "http://localhost:4001/api/jobs?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(j['name'],'|',j['status'],'|',j.get('currentStage','—')) for j in json.load(sys.stdin)]"
