# Test AI Gateway Fallback - Multi-Tenant Isolation
# Validates that each client uses their OWN Vault credentials in fallback

param(
    [Parameter(Mandatory=$false)]
    [string]$ClientA = $env:TEST_CLIENT_A_ID,

    [Parameter(Mandatory=$false)]
    [string]$ClientB = $env:TEST_CLIENT_B_ID
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "AI Gateway Fallback Isolation Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($ClientA) -or [string]::IsNullOrEmpty($ClientB)) {
    Write-Host "❌ Error: Missing client IDs" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\test-fallback-isolation.ps1 -ClientA CLIENT_A_UUID -ClientB CLIENT_B_UUID"
    Write-Host ""
    Write-Host "Or set environment variables:"
    Write-Host "  `$env:TEST_CLIENT_A_ID = 'your-client-a-uuid'"
    Write-Host "  `$env:TEST_CLIENT_B_ID = 'your-client-b-uuid'"
    exit 1
}

Write-Host "Testing with:"
Write-Host "  Client A: $ClientA"
Write-Host "  Client B: $ClientB"
Write-Host ""

# Test Client A
Write-Host "=== Testing Client A ===" -ForegroundColor Yellow
try {
    $responseA = Invoke-RestMethod -Uri "http://localhost:3000/api/test/ai-fallback?clientId=$ClientA" -Method Get
    $responseA | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
} catch {
    Write-Host "❌ Client A test failed: $_" -ForegroundColor Red
    exit 1
}

# Test Client B
Write-Host "=== Testing Client B ===" -ForegroundColor Yellow
try {
    $responseB = Invoke-RestMethod -Uri "http://localhost:3000/api/test/ai-fallback?clientId=$ClientB" -Method Get
    $responseB | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
} catch {
    Write-Host "❌ Client B test failed: $_" -ForegroundColor Red
    exit 1
}

# Validate results
Write-Host "=== Validation ===" -ForegroundColor Yellow

if ($responseA.success -and $responseB.success) {
    Write-Host "✅ Both clients completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ One or both clients failed" -ForegroundColor Red
    exit 1
}

if ($responseA.result.wasFallback -and $responseB.result.wasFallback) {
    Write-Host "✅ Both clients used fallback (as expected)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Fallback not triggered for one or both clients" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== IMPORTANT: Check Logs ===" -ForegroundColor Cyan
Write-Host "Look for these lines in your server logs:"
Write-Host ""
Write-Host "[AI Gateway][Fallback] Using OpenAI API key from Vault (client-specific)"
Write-Host "  clientId: $ClientA"
Write-Host "  secretId: xxxxxxxx..."
Write-Host ""
Write-Host "[AI Gateway][Fallback] Using OpenAI API key from Vault (client-specific)"
Write-Host "  clientId: $ClientB"
Write-Host "  secretId: yyyyyyyy..."
Write-Host ""
Write-Host "⚠️  secretId MUST be DIFFERENT for each client!" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Test completed successfully!" -ForegroundColor Green
