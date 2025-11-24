# Script para Build Release AAB
$ErrorActionPreference = "Stop"

Write-Host "Build Release AAB - UzzApp" -ForegroundColor Cyan
Write-Host ""

# Encontrar Java do Android Studio
$JAVA_HOME = $null

$possibleJavaPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\jbr",
    "$env:ProgramFiles\Android\Android Studio\jbr"
)

foreach ($path in $possibleJavaPaths) {
    if (Test-Path "$path\bin\java.exe") {
        $JAVA_HOME = $path
        Write-Host "Java encontrado: $JAVA_HOME" -ForegroundColor Green
        break
    }
}

if (-not $JAVA_HOME) {
    Write-Host "ERRO: Java nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucao:" -ForegroundColor Yellow
    Write-Host "1. Abra Android Studio" -ForegroundColor White
    Write-Host "2. File -> Settings -> Build -> Build Tools -> Gradle" -ForegroundColor White
    Write-Host "3. Verifique o caminho do JDK" -ForegroundColor White
    Write-Host "4. Ou configure JAVA_HOME manualmente" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou faca o build pelo Android Studio:" -ForegroundColor Yellow
    Write-Host "  Build -> Generate Signed Bundle / APK -> Android App Bundle" -ForegroundColor White
    exit 1
}

# Configurar JAVA_HOME para esta sessao
$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$JAVA_HOME\bin;$env:PATH"

Write-Host "JAVA_HOME configurado: $env:JAVA_HOME" -ForegroundColor Green
Write-Host ""

# Verificar se release.properties existe
if (-not (Test-Path "android\release.properties")) {
    Write-Host "ERRO: android/release.properties nao encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: scripts/generate-keystore.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar se keystore existe
if (-not (Test-Path "android\app\release.keystore")) {
    Write-Host "ERRO: android/app/release.keystore nao encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: scripts/generate-keystore.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Gerando AAB de release..." -ForegroundColor Yellow
Write-Host ""

# Build AAB
Set-Location android

try {
    & .\gradlew.bat bundleRelease
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "AAB gerado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Localizacao:" -ForegroundColor Yellow
        Write-Host "  android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor White
        Write-Host ""
        
        $aabPath = "app\build\outputs\bundle\release\app-release.aab"
        if (Test-Path $aabPath) {
            $aabInfo = Get-Item $aabPath
            Write-Host "Tamanho: $([math]::Round($aabInfo.Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host "Data: $($aabInfo.LastWriteTime)" -ForegroundColor White
        }
    } else {
        throw "Gradle retornou erro: $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao gerar AAB: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ..
}

Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Fazer backup do AAB" -ForegroundColor White
Write-Host "2. Upload para Google Play Console" -ForegroundColor White
Write-Host "3. Preencher ficha da loja" -ForegroundColor White
Write-Host "4. Enviar para revisao" -ForegroundColor White

