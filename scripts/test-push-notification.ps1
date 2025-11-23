# Script para enviar notificação push de teste via Firebase Cloud Messaging
# 
# INSTRUÇÕES:
# 1. Obter Server Key do Firebase:
#    - Firebase Console → ⚙️ Project Settings → Cloud Messaging
#    - Seção "Cloud Messaging API (Legacy)" → Copiar "Server key"
#
# 2. Copiar Token do Supabase:
#    - Supabase → Table Editor → push_tokens → Copiar coluna "token"
#
# 3. Editar este script e colar os valores abaixo
#
# 4. Executar: .\scripts\test-push-notification.ps1

# ============================================================================
# CONFIGURAÇÃO - COLE OS VALORES AQUI
# ============================================================================

# Server Key do Firebase (Cloud Messaging API Legacy)
$serverKey = "COLE_SUA_SERVER_KEY_AQUI"

# Token do Supabase (push_tokens.token)
$token = "COLE_SEU_TOKEN_DO_SUPABASE_AQUI"

# ============================================================================
# NÃO MODIFICAR ABAIXO
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste de Push Notification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se valores foram preenchidos
if ($serverKey -eq "COLE_SUA_SERVER_KEY_AQUI" -or $token -eq "COLE_SEU_TOKEN_DO_SUPABASE_AQUI") {
    Write-Host "ERRO: Configure o Server Key e Token antes de executar!" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Obter Server Key:" -ForegroundColor Yellow
    Write-Host "   Firebase Console → ⚙️ Project Settings → Cloud Messaging" -ForegroundColor Gray
    Write-Host "   Seção 'Cloud Messaging API (Legacy)' → Copiar 'Server key'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Copiar Token:" -ForegroundColor Yellow
    Write-Host "   Supabase → Table Editor → push_tokens → Copiar coluna 'token'" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Preparar body da requisição
$body = @{
    to = $token
    notification = @{
        title = "Teste Push"
        body = "Esta é uma notificação de teste do UzzApp"
    }
    data = @{
        type = "test"
        chat_id = "test-123"
    }
} | ConvertTo-Json -Depth 10

# Preparar headers
$headers = @{
    "Authorization" = "key=$serverKey"
    "Content-Type" = "application/json"
}

Write-Host "Enviando notificação..." -ForegroundColor Yellow
Write-Host "Token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Gray
Write-Host ""

try {
    # Enviar requisição
    $response = Invoke-RestMethod `
        -Uri "https://fcm.googleapis.com/fcm/send" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta do Firebase:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verifique o device/emulador - a notificação deve aparecer!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERRO ao enviar notificação!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Mensagem de erro:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "1. Server Key está correto?" -ForegroundColor Gray
    Write-Host "2. Token está correto?" -ForegroundColor Gray
    Write-Host "3. Cloud Messaging API está habilitada no Firebase?" -ForegroundColor Gray
}

