# Script PowerShell para testar deep linking
# Encontra adb automaticamente e testa deep link

param(
    [Parameter(Mandatory=$false)]
    [string]$Type = "chat",
    
    [Parameter(Mandatory=$false)]
    [string]$Param = "123"
)

# Tentar encontrar adb em locais comuns
$adbPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ProgramFiles\Android\Android Studio\platform-tools\adb.exe",
    "C:\Android\Sdk\platform-tools\adb.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
)

$adb = $null
foreach ($path in $adbPaths) {
    if (Test-Path $path) {
        $adb = $path
        Write-Host "[OK] ADB encontrado em: $path" -ForegroundColor Green
        break
    }
}

if (-not $adb) {
    Write-Host "[ERRO] ADB não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, encontre o caminho do Android SDK e adicione ao PATH:" -ForegroundColor Yellow
    Write-Host "  - $env:LOCALAPPDATA\Android\Sdk\platform-tools" -ForegroundColor Yellow
    Write-Host "  - Ou use o terminal do Android Studio (já tem adb configurado)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternativa: Use o terminal do Android Studio:" -ForegroundColor Cyan
    Write-Host "  View → Tool Windows → Terminal" -ForegroundColor Cyan
    exit 1
}

# Construir URL baseado no tipo
$url = switch ($Type.ToLower()) {
    "chat" {
        if ($Param) {
            "chatbot://chat/$Param"
        } else {
            Write-Host "[ERRO] Chat ID não fornecido" -ForegroundColor Red
            Write-Host "Uso: .\scripts\test-deep-link-ps.ps1 -Type chat -Param 123" -ForegroundColor Yellow
            exit 1
        }
    }
    "dashboard" {
        "chatbot://dashboard"
    }
    "invite" {
        if ($Param) {
            "chatbot://invite/$Param"
        } else {
            Write-Host "[ERRO] Invite code não fornecido" -ForegroundColor Red
            exit 1
        }
    }
    default {
        Write-Host "[ERRO] Tipo desconhecido: $Type" -ForegroundColor Red
        Write-Host "Tipos disponíveis: chat, dashboard, invite" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Teste de Deep Linking" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[TESTE] Enviando deep link: $url" -ForegroundColor Yellow

# Executar comando adb
$result = & $adb shell am start -a android.intent.action.VIEW -d $url com.chatbot.app

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Deep link enviado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Verifique:" -ForegroundColor Cyan
    Write-Host "  1. App deve abrir (se não estiver rodando)" -ForegroundColor White
    Write-Host "  2. Console do Chrome DevTools (chrome://inspect)" -ForegroundColor White
    Write-Host "  3. Logs devem mostrar: [Deep Linking] App opened with URL" -ForegroundColor White
} else {
    Write-Host "[ERRO] Falha ao enviar deep link" -ForegroundColor Red
    Write-Host ""
    Write-Host "[INFO] Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Device/emulador conectado: adb devices" -ForegroundColor White
    Write-Host "  2. App instalado: adb shell pm list packages | Select-String chatbot" -ForegroundColor White
}

Write-Host ""

