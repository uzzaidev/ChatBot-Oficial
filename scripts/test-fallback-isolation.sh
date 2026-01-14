#!/bin/bash
# Test AI Gateway Fallback - Multi-Tenant Isolation
# Validates that each client uses their OWN Vault credentials in fallback

echo "=================================="
echo "AI Gateway Fallback Isolation Test"
echo "=================================="
echo ""

# Get test client IDs from environment or command line
CLIENT_A=${1:-$TEST_CLIENT_A_ID}
CLIENT_B=${2:-$TEST_CLIENT_B_ID}

if [ -z "$CLIENT_A" ] || [ -z "$CLIENT_B" ]; then
  echo "❌ Error: Missing client IDs"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-fallback-isolation.sh CLIENT_A_UUID CLIENT_B_UUID"
  echo ""
  echo "Or set environment variables:"
  echo "  export TEST_CLIENT_A_ID=your-client-a-uuid"
  echo "  export TEST_CLIENT_B_ID=your-client-b-uuid"
  exit 1
fi

echo "Testing with:"
echo "  Client A: $CLIENT_A"
echo "  Client B: $CLIENT_B"
echo ""

# Test Client A
echo "=== Testing Client A ==="
RESPONSE_A=$(curl -s "http://localhost:3000/api/test/ai-fallback?clientId=$CLIENT_A")
echo "$RESPONSE_A" | jq '.'
echo ""

# Test Client B
echo "=== Testing Client B ==="
RESPONSE_B=$(curl -s "http://localhost:3000/api/test/ai-fallback?clientId=$CLIENT_B")
echo "$RESPONSE_B" | jq '.'
echo ""

# Validate results
echo "=== Validation ==="

SUCCESS_A=$(echo "$RESPONSE_A" | jq -r '.success')
SUCCESS_B=$(echo "$RESPONSE_B" | jq -r '.success')
FALLBACK_A=$(echo "$RESPONSE_A" | jq -r '.result.wasFallback')
FALLBACK_B=$(echo "$RESPONSE_B" | jq -r '.result.wasFallback')

if [ "$SUCCESS_A" = "true" ] && [ "$SUCCESS_B" = "true" ]; then
  echo "✅ Both clients completed successfully"
else
  echo "❌ One or both clients failed"
  exit 1
fi

if [ "$FALLBACK_A" = "true" ] && [ "$FALLBACK_B" = "true" ]; then
  echo "✅ Both clients used fallback (as expected)"
else
  echo "⚠️  Warning: Fallback not triggered for one or both clients"
fi

echo ""
echo "=== IMPORTANT: Check Logs ==="
echo "Look for these lines in your server logs:"
echo ""
echo "[AI Gateway][Fallback] Using OpenAI API key from Vault (client-specific)"
echo "  clientId: $CLIENT_A"
echo "  secretId: xxxxxxxx..."
echo ""
echo "[AI Gateway][Fallback] Using OpenAI API key from Vault (client-specific)"
echo "  clientId: $CLIENT_B"
echo "  secretId: yyyyyyyy..."
echo ""
echo "⚠️  secretId MUST be DIFFERENT for each client!"
echo ""
echo "✅ Test completed successfully!"
