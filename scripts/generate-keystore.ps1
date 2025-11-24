# Script para Gerar Keystore do UzzApp
$ErrorActionPreference = "Stop"

Write-Host "Gerador de Keystore - UzzApp" -ForegroundColor Cyan
Write-Host ""

# Configuracoes
$KEYSTORE_PATH = "android\app\release.keystore"
$KEYSTORE_ALIAS = "chatbot"
$KEYSTORE_PASSWORD = "Uzzai2025@"
$KEY_PASSWORD = "Uzzai2025@"
$DN = "CN=UzzApp Uzz.Ai, OU=Technology, O=Uzz.Ai, L=Caxias do Sul, ST=Rio Grande do Sul, C=BR"

# Encontrar keytool
Write-Host "Procurando keytool..." -ForegroundColor Yellow
$KEYTOOL_PATH = $null

# Tentar PATH
$keytoolInPath = Get-Command keytool -ErrorAction SilentlyContinue
if ($keytoolInPath) {
    $KEYTOOL_PATH = $keytoolInPath.Source
    Write-Host "keytool encontrado no PATH: $KEYTOOL_PATH" -ForegroundColor Green
} else {
    # Locais comuns
    $paths = @(
        "$env:LOCALAPPDATA\Android\Sdk\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $KEYTOOL_PATH = $path
            Write-Host "keytool encontrado: $KEYTOOL_PATH" -ForegroundColor Green
            break
        }
    }
    
    # Procurar em Java
    if (-not $KEYTOOL_PATH) {
        $javaDirs = @("$env:ProgramFiles\Java", "${env:ProgramFiles(x86)}\Java")
        foreach ($javaDir in $javaDirs) {
            if (Test-Path $javaDir) {
                $found = Get-ChildItem -Path "$javaDir\*\bin\keytool.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $KEYTOOL_PATH = $found.FullName
                    Write-Host "keytool encontrado: $KEYTOOL_PATH" -ForegroundColor Green
                    break
                }
            }
        }
    }
}

if (-not $KEYTOOL_PATH) {
    Write-Host "ERRO: keytool nao encontrado!" -ForegroundColor Red
    Write-Host "Instale Java JDK ou use o JDK do Android Studio" -ForegroundColor Yellow
    exit 1
}

# Verificar se ja existe
if (Test-Path $KEYSTORE_PATH) {
    Write-Host "AVISO: Keystore ja existe" -ForegroundColor Yellow
    $overwrite = Read-Host "Deseja sobrescrever? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        exit 0
    }
    Remove-Item $KEYSTORE_PATH -Force
}

# Gerar keystore
Write-Host ""
Write-Host "Gerando keystore..." -ForegroundColor Yellow

try {
    & $KEYTOOL_PATH -genkey -v -keystore $KEYSTORE_PATH -alias $KEYSTORE_ALIAS -keyalg RSA -keysize 2048 -validity 10000 -storepass $KEYSTORE_PASSWORD -keypass $KEY_PASSWORD -dname $DN
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Keystore gerado com sucesso!" -ForegroundColor Green
    } else {
        throw "keytool retornou erro: $LASTEXITCODE"
    }
} catch {
    Write-Host "ERRO ao gerar keystore: $_" -ForegroundColor Red
    exit 1
}

# Criar release.properties
Write-Host "Criando release.properties..." -ForegroundColor Yellow

$props = @"
storeFile=app/release.keystore
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEYSTORE_ALIAS
keyPassword=$KEY_PASSWORD
"@

$props | Out-File -FilePath "android\release.properties" -Encoding UTF8 -NoNewline
Write-Host "release.properties criado!" -ForegroundColor Green

# Criar arquivo de informacoes
Write-Host "Criando arquivo de informacoes..." -ForegroundColor Yellow

$info = @"
INFORMACOES DO KEYSTORE - UZZAPP
GUARDE ESTE ARQUIVO EM LOCAL SEGURO!

Data de Criacao: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Localizacao do Keystore
Caminho: android/app/release.keystore
Alias: chatbot

Senhas
Senha do Keystore: Uzzai2025@
Senha da Chave: Uzzai2025@

Informacoes do Certificado
CN: UzzApp Uzz.Ai
OU: Technology
O: Uzz.Ai
L: Caxias do Sul
ST: Rio Grande do Sul
C: BR

Validade: 10000 dias (~27 anos)

BACKUP
Faca backup do arquivo: android/app/release.keystore
- Salve em Google Drive (criptografado)
- Salve em pendrive seguro
- Salve em gerenciador de senhas

IMPORTANTE
- NAO commite o keystore no git
- NAO compartilhe o keystore publicamente
- NAO perca o arquivo ou a senha
- Faca backup regularmente
"@

$info | Out-File -FilePath "KEYSTORE_INFO.txt" -Encoding UTF8
Write-Host "Arquivo de informacoes criado: KEYSTORE_INFO.txt" -ForegroundColor Green

Write-Host ""
Write-Host "CONCLUIDO!" -ForegroundColor Green
Write-Host "Arquivos criados:" -ForegroundColor Yellow
Write-Host "  - $KEYSTORE_PATH" -ForegroundColor White
Write-Host "  - android\release.properties" -ForegroundColor White
Write-Host "  - KEYSTORE_INFO.txt" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Faca backup do keystore" -ForegroundColor White
Write-Host "2. Guarde KEYSTORE_INFO.txt em local seguro" -ForegroundColor White
Write-Host "3. Teste o build: npm run build:mobile:prd && cd android && ./gradlew bundleRelease" -ForegroundColor White
