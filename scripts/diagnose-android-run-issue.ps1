# Script para Diagnosticar Problema de Run no Android Studio
$ErrorActionPreference = "Stop"

Write-Host "Diagnostico: Problema de Run no Android Studio" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se há device conectado
Write-Host "1. Verificando devices conectados..." -ForegroundColor Yellow
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

if ($adbPath) {
    $devices = & $adbPath devices
    if ($devices -match "device$") {
        Write-Host "  ✓ Device conectado" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Nenhum device conectado!" -ForegroundColor Red
        Write-Host "    Solucao: Inicie um emulador ou conecte device fisico" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ ADB nao encontrado (pode estar OK se Android Studio gerencia)" -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar se app está rodando (pode estar travado)
Write-Host "2. Verificando se app esta rodando..." -ForegroundColor Yellow
if ($adbPath) {
    $running = & $adbPath shell "ps | grep com.chatbot.app" 2>$null
    if ($running -match "com.chatbot.app") {
        Write-Host "  ⚠ App esta rodando (pode estar travado)" -ForegroundColor Yellow
        Write-Host "    Solucao: Parar app primeiro (Stop no Android Studio ou adb shell am force-stop)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ App nao esta rodando" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ Nao foi possivel verificar (ADB nao encontrado)" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar AndroidManifest
Write-Host "3. Verificando AndroidManifest.xml..." -ForegroundColor Yellow
$manifestPath = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw
    
    # Verificar permissao de biometria
    if ($manifestContent -notmatch "USE_BIOMETRIC" -and $manifestContent -notmatch "USE_FINGERPRINT") {
        Write-Host "  ⚠ Permissao de biometria nao encontrada" -ForegroundColor Yellow
        Write-Host "    Isso pode causar problemas com o plugin de biometria" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Permissao de biometria encontrada" -ForegroundColor Green
    }
    
    # Verificar se MainActivity existe
    if ($manifestContent -match "MainActivity") {
        Write-Host "  ✓ MainActivity configurada" -ForegroundColor Green
    } else {
        Write-Host "  ✗ MainActivity nao encontrada!" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ AndroidManifest.xml nao encontrado!" -ForegroundColor Red
}

Write-Host ""

# 4. Verificar build.gradle
Write-Host "4. Verificando build.gradle..." -ForegroundColor Yellow
$buildGradlePath = "android\app\build.gradle"
if (Test-Path $buildGradlePath) {
    $buildGradleContent = Get-Content $buildGradlePath -Raw
    
    # Verificar se plugin de biometria esta incluido
    if ($buildGradleContent -match "aparajita-capacitor-biometric-auth") {
        Write-Host "  ✓ Plugin de biometria encontrado no build.gradle" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Plugin de biometria nao encontrado no build.gradle" -ForegroundColor Yellow
    }
    
    # Verificar applicationId
    if ($buildGradleContent -match 'applicationId\s+"com\.chatbot\.app"') {
        Write-Host "  ✓ applicationId configurado corretamente" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ applicationId pode estar incorreto" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ build.gradle nao encontrado!" -ForegroundColor Red
}

Write-Host ""

# 5. Verificar se ha erros de build
Write-Host "5. Verificando possiveis erros..." -ForegroundColor Yellow
$gradleBuildPath = "android\build"
if (Test-Path $gradleBuildPath) {
    Write-Host "  ✓ Pasta build existe (projeto foi buildado)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Pasta build nao existe (projeto pode nao ter sido buildado)" -ForegroundColor Yellow
}

Write-Host ""

# Resumo e Solucoes
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RESUMO E SOLUCOES" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SOLUCOES PARA TENTAR (em ordem):" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. No Android Studio:" -ForegroundColor White
Write-Host "   - Verificar se device esta selecionado (barra superior)" -ForegroundColor Gray
Write-Host "   - Se nao: Iniciar emulador ou conectar device" -ForegroundColor Gray
Write-Host "   - Clicar em Stop (se app estiver rodando)" -ForegroundColor Gray
Write-Host "   - Depois clicar em Run ou Shift + F10" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Se nao funcionar:" -ForegroundColor White
Write-Host "   - File -> Sync Project with Gradle Files" -ForegroundColor Gray
Write-Host "   - Aguardar sincronizacao completa" -ForegroundColor Gray
Write-Host "   - Tentar Run novamente" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Se ainda nao funcionar:" -ForegroundColor White
Write-Host "   - Run -> Edit Configurations..." -ForegroundColor Gray
Write-Host "   - Verificar se existe configuracao 'app'" -ForegroundColor Gray
Write-Host "   - Se nao: Criar nova (Android App)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Se persistir:" -ForegroundColor White
Write-Host "   - Build -> Rebuild Project" -ForegroundColor Gray
Write-Host "   - Aguardar conclusao" -ForegroundColor Gray
Write-Host "   - Tentar Run novamente" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Ultimo recurso:" -ForegroundColor White
Write-Host "   - Fechar Android Studio" -ForegroundColor Gray
Write-Host "   - Deletar android\.idea (se existir)" -ForegroundColor Gray
Write-Host "   - Abrir Android Studio novamente" -ForegroundColor Gray
Write-Host "   - File -> Open -> Selecionar pasta android" -ForegroundColor Gray
Write-Host ""

