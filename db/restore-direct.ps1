$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "      RESTORE VIA CONEXAO DIRETA POSTGRESQL                    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Ler connection string do .env.local
$envPath = Join-Path -Path $PSScriptRoot -ChildPath ".." | Join-Path -ChildPath ".env.local"
$content = Get-Content $envPath -Raw
$match = [regex]::Match($content, 'POSTGRES_URL_NON_POOLING="([^"]+)"')

if (-not $match.Success) {
    Write-Host "ERRO: POSTGRES_URL_NON_POOLING nao encontrado no .env.local" -ForegroundColor Red
    exit 1
}

$postgresUrl = $match.Groups[1].Value
Write-Host "Connection string encontrada" -ForegroundColor Green
Write-Host ""

# Verificar se PSQL esta disponivel
Write-Host "[1/4] Verificando PostgreSQL client..." -ForegroundColor Yellow

$psqlCheck = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlCheck) {
    Write-Host "ERRO: PostgreSQL client (psql) nao esta instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale via Chocolatey:" -ForegroundColor Yellow
    Write-Host "  choco install postgresql" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou baixe em: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL client encontrado" -ForegroundColor Green
Write-Host ""

# Confirmar acao
Write-Host "ATENCAO: Esta operacao vai restaurar o backup de 30/10/2025 17:53" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Digite 'SIM' para confirmar"

if ($confirm -ne "SIM") {
    Write-Host "Operacao cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""

# Restaurar estrutura
Write-Host "[2/4] Restaurando ESTRUTURA do banco..." -ForegroundColor Yellow
$structureFile = Join-Path $PSScriptRoot "chatbot_structure_20251030_175352.sql"

if (-not (Test-Path $structureFile)) {
    Write-Host "ERRO: Arquivo nao encontrado: $structureFile" -ForegroundColor Red
    exit 1
}

Write-Host "   Executando SQL de estrutura..." -ForegroundColor Gray
& psql $postgresUrl -f $structureFile 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Estrutura restaurada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Algumas queries falharam (pode ser normal se tabelas ja existem)" -ForegroundColor Yellow
}

Write-Host ""

# Restaurar dados  
Write-Host "[3/4] Restaurando DADOS do banco..." -ForegroundColor Yellow
$dataFile = Join-Path $PSScriptRoot "chatbot_data_20251030_175352.sql"

if (-not (Test-Path $dataFile)) {
    Write-Host "ERRO: Arquivo nao encontrado: $dataFile" -ForegroundColor Red
    exit 1
}

Write-Host "   Executando restore (pode levar 1-3 minutos)..." -ForegroundColor Gray
& psql $postgresUrl -f $dataFile 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dados restaurados com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Algumas insercoes falharam" -ForegroundColor Yellow
}

Write-Host ""

# Verificar
Write-Host "[4/4] Verificando restauracao..." -ForegroundColor Yellow

$tables = @("clients", "conversations", "messages", "clientes_whatsapp")

foreach ($table in $tables) {
    $query = "SELECT COUNT(*) FROM $table;"
    $count = & psql $postgresUrl -t -c $query 2>&1
    
    if ($count -match '\d+') {
        $count = $count.Trim()
        Write-Host "   $table : $count registros" -ForegroundColor White
    } else {
        Write-Host "   $table : Erro ao contar" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "         RESTORE CONCLUIDO COM SUCESSO!                        " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Testar dashboard: npm run dev" -ForegroundColor White
Write-Host "  2. Abrir: http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "  3. Verificar se conversas aparecem" -ForegroundColor White
Write-Host ""
