# Script para Backup do Keystore
$ErrorActionPreference = "Stop"

Write-Host "Backup do Keystore - UzzApp" -ForegroundColor Cyan
Write-Host ""

$KEYSTORE_SOURCE = "android\app\release.keystore"
$INFO_SOURCE = "KEYSTORE_INFO.txt"

# Verificar se arquivos existem
if (-not (Test-Path $KEYSTORE_SOURCE)) {
    Write-Host "ERRO: Keystore nao encontrado em: $KEYSTORE_SOURCE" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $INFO_SOURCE)) {
    Write-Host "AVISO: KEYSTORE_INFO.txt nao encontrado" -ForegroundColor Yellow
}

# Criar diretorio de backup
$BACKUP_DIR = "$env:USERPROFILE\Documents\UzzApp_Backup_Keystore"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "Diretorio de backup criado: $BACKUP_DIR" -ForegroundColor Green
}

# Data para nome do arquivo
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$KEYSTORE_BACKUP = "$BACKUP_DIR\release.keystore_$DATE"
$INFO_BACKUP = "$BACKUP_DIR\KEYSTORE_INFO.txt_$DATE"

# Copiar arquivos
Write-Host "Fazendo backup..." -ForegroundColor Yellow
Copy-Item $KEYSTORE_SOURCE $KEYSTORE_BACKUP -Force
Write-Host "  Keystore: $KEYSTORE_BACKUP" -ForegroundColor Green

if (Test-Path $INFO_SOURCE) {
    Copy-Item $INFO_SOURCE $INFO_BACKUP -Force
    Write-Host "  KEYSTORE_INFO.txt: $INFO_BACKUP" -ForegroundColor Green
}

Write-Host ""
Write-Host "Backup concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Localizacao do backup:" -ForegroundColor Yellow
Write-Host "  $BACKUP_DIR" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Copiar para Google Drive (criptografado)" -ForegroundColor White
Write-Host "2. Copiar para pendrive seguro" -ForegroundColor White
Write-Host "3. Salvar em gerenciador de senhas (1Password, LastPass)" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "- NAO compartilhe o keystore" -ForegroundColor White
Write-Host "- NAO perca o arquivo ou a senha" -ForegroundColor White
Write-Host "- Se perder, nao podera atualizar o app na Play Store" -ForegroundColor White

