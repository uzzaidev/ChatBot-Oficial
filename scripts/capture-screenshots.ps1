# Script para Capturar Screenshots do App
$ErrorActionPreference = "Stop"

Write-Host "Captura de Screenshots - UzzApp" -ForegroundColor Cyan
Write-Host ""

# Verificar se ADB está disponível
$adbPath = $null
$adbInPath = Get-Command adb -ErrorAction SilentlyContinue
if ($adbInPath) {
    $adbPath = $adbInPath.Source
    Write-Host "ADB encontrado: $adbPath" -ForegroundColor Green
} else {
    # Tentar encontrar ADB do Android SDK
    $possibleAdbPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ProgramFiles\Android\Android Studio\platform-tools\adb.exe"
    )
    
    foreach ($path in $possibleAdbPaths) {
        if (Test-Path $path) {
            $adbPath = $path
            Write-Host "ADB encontrado: $adbPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $adbPath) {
    Write-Host "ERRO: ADB nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucoes:" -ForegroundColor Yellow
    Write-Host "1. Instalar Android SDK Platform Tools" -ForegroundColor White
    Write-Host "2. Adicionar ao PATH" -ForegroundColor White
    Write-Host "3. Ou capturar screenshots manualmente no device" -ForegroundColor White
    Write-Host ""
    Write-Host "Captura manual:" -ForegroundColor Yellow
    Write-Host "  Device: Volume Down + Power" -ForegroundColor White
    Write-Host "  Emulador: Ctrl + S ou botao de screenshot" -ForegroundColor White
    exit 1
}

# Verificar se device está conectado
Write-Host "Verificando device conectado..." -ForegroundColor Yellow
$devices = & $adbPath devices
if ($devices -notmatch "device$") {
    Write-Host "ERRO: Nenhum device conectado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Conecte um device ou inicie um emulador" -ForegroundColor Yellow
    exit 1
}

Write-Host "Device conectado!" -ForegroundColor Green
Write-Host ""

# Criar pasta para screenshots
$screenshotsDir = "screenshots"
if (-not (Test-Path $screenshotsDir)) {
    New-Item -ItemType Directory -Path $screenshotsDir -Force | Out-Null
    Write-Host "Pasta criada: $screenshotsDir" -ForegroundColor Green
}

Write-Host "Instrucoes:" -ForegroundColor Yellow
Write-Host "1. Abra o app no device/emulador" -ForegroundColor White
Write-Host "2. Navegue para a tela que deseja capturar" -ForegroundColor White
Write-Host "3. Pressione ENTER para capturar screenshot" -ForegroundColor White
Write-Host "4. Digite um nome para o arquivo (ex: login, dashboard, chat)" -ForegroundColor White
Write-Host "5. Repita para outras telas" -ForegroundColor White
Write-Host "6. Digite 'sair' para terminar" -ForegroundColor White
Write-Host ""

$counter = 1
while ($true) {
    Write-Host "Pressione ENTER para capturar screenshot (ou 'sair' para terminar):" -ForegroundColor Cyan
    $input = Read-Host
    
    if ($input -eq "sair" -or $input -eq "exit" -or $input -eq "q") {
        break
    }
    
    Write-Host "Digite um nome para o screenshot (ex: login, dashboard):" -ForegroundColor Yellow
    $name = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($name)) {
        $name = "screenshot_$counter"
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "$name`_$timestamp.png"
    $remotePath = "/sdcard/$filename"
    $localPath = "$screenshotsDir\$filename"
    
    Write-Host "Capturando screenshot..." -ForegroundColor Yellow
    
    try {
        # Capturar screenshot no device
        & $adbPath shell screencap -p $remotePath
        
        # Baixar para computador
        & $adbPath pull $remotePath $localPath
        
        # Remover do device
        & $adbPath shell rm $remotePath
        
        if (Test-Path $localPath) {
            $fileInfo = Get-Item $localPath
            Write-Host "Screenshot salvo: $localPath" -ForegroundColor Green
            Write-Host "  Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
            $counter++
        } else {
            Write-Host "ERRO: Screenshot nao foi salvo" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERRO ao capturar: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "Captura concluida!" -ForegroundColor Green
Write-Host "Screenshots salvos em: $screenshotsDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Verificar screenshots capturados" -ForegroundColor White
Write-Host "2. Renomear se necessario (01-login.png, 02-dashboard.png, etc)" -ForegroundColor White
Write-Host "3. Verificar resolucao (1080x1920 px recomendado)" -ForegroundColor White
Write-Host "4. Usar no Play Console quando publicar" -ForegroundColor White

