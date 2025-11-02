# RESTORE via Conexão Direta PostgreSQL
# Este script usa a connection string para restaurar via PSQL

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       RESTORE VIA CONEXAO DIRETA POSTGRESQL                     " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Ler connection string do .env.local
$envPath = Join-Path $PSScriptRoot ".." ".env.local"
$postgresUrl = (Get-Content $envPath | Select-String "^POSTGRES_URL_NON_POOLING=").ToString().Split("=")[1].Trim('"')

if (-not $postgresUrl) {
    Write-Host "❌ ERRO: POSTGRES_URL_NON_POOLING não encontrado no .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Connection string encontrada" -ForegroundColor Green
Write-Host ""

# Verificar se PSQL está disponível
Write-Host "[1/4] Verificando PostgreSQL client..." -ForegroundColor Yellow

try {
    $psqlVersion = & psql --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "✓ PostgreSQL client instalado: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL client (psql) não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale via Chocolatey:" -ForegroundColor Yellow
    Write-Host "  choco install postgresql" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou baixe em: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Confirmar ação
Write-Host "⚠️  ATENÇÃO: Esta operação vai restaurar o backup de 30/10/2025 17:53" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Digite 'SIM' para confirmar"

if ($confirm -ne "SIM") {
    Write-Host "❌ Operação cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""

# Restaurar estrutura
Write-Host "[2/4] Restaurando ESTRUTURA do banco..." -ForegroundColor Yellow
$structureFile = Join-Path $PSScriptRoot "chatbot_structure_20251030_175352.sql"

if (-not (Test-Path $structureFile)) {
    Write-Host "❌ Arquivo não encontrado: $structureFile" -ForegroundColor Red
    exit 1
}

try {
    Get-Content $structureFile | & psql $postgresUrl 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Estrutura restaurada com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Algumas queries falharam (pode ser normal se tabelas já existem)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao restaurar estrutura: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Restaurar dados
Write-Host "[3/4] Restaurando DADOS do banco..." -ForegroundColor Yellow
$dataFile = Join-Path $PSScriptRoot "chatbot_data_20251030_175352.sql"

if (-not (Test-Path $dataFile)) {
    Write-Host "❌ Arquivo não encontrado: $dataFile" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "   Executando restore (pode levar 1-3 minutos)..." -ForegroundColor Gray
    Get-Content $dataFile | & psql $postgresUrl 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dados restaurados com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Algumas inserções falharam" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao restaurar dados: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verificar
Write-Host "[4/4] Verificando restauração..." -ForegroundColor Yellow

$queries = @(
    "SELECT COUNT(*) FROM clients;",
    "SELECT COUNT(*) FROM conversations;",
    "SELECT COUNT(*) FROM messages;",
    "SELECT COUNT(*) FROM clientes_whatsapp;"
)

foreach ($query in $queries) {
    $table = $query.Split(" ")[3].TrimEnd(";")
    try {
        $count = & psql $postgresUrl -t -c $query 2>&1
        $count = $count.Trim()
        Write-Host "   $table : $count registros" -ForegroundColor White
    } catch {
        Write-Host "   $table : Erro ao contar" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "         RESTORE CONCLUIDO COM SUCESSO!                          " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Testar dashboard: npm run dev" -ForegroundColor White
Write-Host "  2. Abrir: http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "  3. Verificar se conversas aparecem" -ForegroundColor White
Write-Host ""
