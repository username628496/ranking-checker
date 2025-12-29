#!/bin/bash

# Script để test Template API
# Sử dụng: ./test-template-api.sh [backend-url]

BACKEND_URL=${1:-"http://localhost:8001"}

echo "🧪 Testing Template API at: $BACKEND_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s "$BACKEND_URL/health" | jq . || echo "❌ Health check failed"
echo ""

# Test 2: Get all templates
echo "2️⃣ Testing GET /api/templates..."
curl -s "$BACKEND_URL/api/templates" | jq . || echo "❌ Get templates failed"
echo ""

# Test 3: Create new template
echo "3️⃣ Testing POST /api/templates (create)..."
RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Test User",
    "name": "Test Template",
    "keywords": ["seo tools", "keyword research"],
    "domains": ["example.com"]
  }')
echo "$RESPONSE" | jq .
TEMPLATE_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
echo ""

if [ -n "$TEMPLATE_ID" ]; then
  # Test 4: Update template
  echo "4️⃣ Testing PUT /api/templates/$TEMPLATE_ID (update)..."
  curl -s -X PUT "$BACKEND_URL/api/templates/$TEMPLATE_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Updated Test Template",
      "keywords": ["seo tools updated"],
      "domains": ["example.com", "example2.com"]
    }' | jq .
  echo ""

  # Test 5: Delete template
  echo "5️⃣ Testing DELETE /api/templates/$TEMPLATE_ID..."
  curl -s -X DELETE "$BACKEND_URL/api/templates/$TEMPLATE_ID" | jq .
  echo ""
else
  echo "⚠️  Skipping update/delete tests (no template created)"
fi

echo "✅ Test completed"
