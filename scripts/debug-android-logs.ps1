# Script para debugar logs do Android
$ErrorActionPreference = "Stop"

Write-Host "Debug Android Logs - UzzApp" -ForegroundColor Cyan
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

Write-Host "ADB encontrado: $adbPath" -ForegroundColor Green
Write-Host ""

# Verificar device conectado
$devices = & $adbPath devices
if ($devices -notmatch "device$") {
    Write-Host "ERRO: Nenhum device conectado!" -ForegroundColor Red
    Write-Host "Conecte um device ou inicie um emulador" -ForegroundColor Yellow
    exit 1
}

Write-Host "Device conectado!" -ForegroundColor Green
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "OPCOES DE LOGS:" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Logs do app (com.chatbot.app) - RECOMENDADO" -ForegroundColor White
Write-Host "2. Logs de erro (Android + App)" -ForegroundColor White
Write-Host "3. Logs completos (tudo)" -ForegroundColor White
Write-Host "4. Limpar logs e monitorar em tempo real" -ForegroundColor White
Write-Host "5. Logs de autenticação (Supabase/Auth)" -ForegroundColor White
Write-Host ""
Write-Host "Digite o numero da opcao (1-5):" -ForegroundColor Cyan
$option = Read-Host

Write-Host ""
Write-Host "Iniciando captura de logs..." -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host ""

switch ($option) {
    "1" {
        Write-Host "=== Logs do App (com.chatbot.app) ===" -ForegroundColor Green
        & $adbPath logcat -c  # Limpar logs antigos
        & $adbPath logcat | Select-String -Pattern "com.chatbot.app"
    }
    "2" {
        Write-Host "=== Logs de Erro (Android + App) ===" -ForegroundColor Green
        & $adbPath logcat -c
        & $adbPath logcat *:E | Select-String -Pattern "com.chatbot.app|AndroidRuntime|FATAL"
    }
    "3" {
        Write-Host "=== Logs Completos ===" -ForegroundColor Green
        & $adbPath logcat -c
        & $adbPath logcat
    }
    "4" {
        Write-Host "=== Limpar e Monitorar em Tempo Real ===" -ForegroundColor Green
        & $adbPath logcat -c
        Write-Host "Logs limpos! Monitorando em tempo real..." -ForegroundColor Yellow
        Write-Host "Agora clique em 'Base de Conhecimento' no app" -ForegroundColor Yellow
        Write-Host ""
        & $adbPath logcat | Select-String -Pattern "com.chatbot.app|middleware|auth|logout|SIGNED_OUT|TOKEN_REFRESHED|profile"
    }
    "5" {
        Write-Host "=== Logs de Autenticação ===" -ForegroundColor Green
        & $adbPath logcat -c
        & $adbPath logcat | Select-String -Pattern "auth|Auth|AUTH|session|Session|SIGNED_OUT|TOKEN_REFRESHED|profile|Profile|middleware|logout|Logout"
    }
    default {
        Write-Host "Opcao invalida!" -ForegroundColor Red
        exit 1
    }
}

