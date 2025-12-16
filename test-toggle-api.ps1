# ═══════════════════════════════════════════════════════════════════════
# 🧪 TESTE DA API: Ativar Fast Track Router
# ═══════════════════════════════════════════════════════════════════════
# Execute: powershell -File test-toggle-api.ps1

Write-Host "🔧 Testando API de ativação do Fast Track Router..." -ForegroundColor Yellow
Write-Host ""

# URL da API local
$url = "http://localhost:3000/api/flow/nodes/fast_track_router"

# Dados para ativar o node
$body = @{
    enabled = $true
} | ConvertTo-Json

Write-Host "📤 Enviando requisição PATCH..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host "Body: $body" -ForegroundColor Gray
Write-Host ""

try {
    # Fazer requisição
    $response = Invoke-WebRequest -Uri $url `
        -Method PATCH `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing

    Write-Host "✅ Resposta da API:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green

} catch {
    Write-Host "❌ ERRO na requisição:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Corpo da resposta:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor White
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "⚠️  NOTA: Você precisa estar AUTENTICADO no navegador" -ForegroundColor Yellow
Write-Host "    (cookies de sessão). Este script não funciona sem auth." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
