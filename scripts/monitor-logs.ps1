# Script para Monitorar Logs do App em Tempo Real
$ErrorActionPreference = "Stop"

Write-Host "Monitor de Logs - UzzApp" -ForegroundColor Cyan
Write-Host ""

# Encontrar ADB
$adbPath = $null
$adbInPath = Get-Command adb -ErrorAction SilentlyContinue
if ($adbInPath) {
    $adbPath = $adbInPath.Source
} else {
    $possibleAdbPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ProgramFiles\Android\Android Studio\platform-tools\adb.exe"
    )
    
    foreach ($path in $possibleAdbPaths) {
        if (Test-Path $path) {
            $adbPath = $path
            break
        }
    }
}

if (-not $adbPath) {
    Write-Host "ERRO: ADB nao encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar device
$devices = & $adbPath devices
if ($devices -notmatch "device$") {
    Write-Host "ERRO: Nenhum device conectado!" -ForegroundColor Red
    Write-Host "Inicie um emulador ou conecte device fisico" -ForegroundColor Yellow
    exit 1
}

Write-Host "Device conectado!" -ForegroundColor Green
Write-Host ""

# Limpar logs
Write-Host "Limpando logs antigos..." -ForegroundColor Yellow
& $adbPath logcat -c
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Monitorando logs em tempo real..." -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora faca a acao que causa problema no app" -ForegroundColor Yellow
Write-Host "(ex: clique em 'Base de Conhecimento')" -ForegroundColor Yellow
Write-Host ""

# Monitorar logs
& $adbPath logcat | Select-String "com.chatbot.app"

