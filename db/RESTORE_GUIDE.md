# 🔄 Guia Completo de RESTORE - Migração para Nova Conta Supabase

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Estratégias de Restore](#estratégias-de-restore)
3. [Método 1: Restore Completo (Recomendado)](#método-1-restore-completo-recomendado)
4. [Método 2: Restore Estrutura + Dados](#método-2-restore-estrutura--dados)
5. [Restore do Schema Auth](#restore-do-schema-auth)
6. [Verificação Pós-Restore](#verificação-pós-restore)
7. [Troubleshooting](#troubleshooting)
8. [Checklist Final](#checklist-final)

---

## 🎯 Pré-requisitos

### 1. Criar Novo Projeto no Supabase

1. Acesse https://app.supabase.com
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: (ex: "ChatBot-Oficial-Prod")
   - **Database Password**: (⚠️ ANOTE ESSA SENHA!)
   - **Region**: `South America (São Paulo)` (recomendado)
4. Aguarde criação (~2 minutos)

### 2. Obter Credenciais do Novo Banco

**Via Supabase Dashboard**:
1. Settings → Database
2. **Connection String** → Transaction
3. Copie a string de conexão

**Formato**:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

**Componentes**:
- `HOST`: `aws-1-sa-east-1.pooler.supabase.com`
- `PORT`: `6543`
- `USER`: `postgres.[PROJECT_REF]`
- `PASSWORD`: (senha que você criou)
- `DATABASE`: `postgres`

### 3. Ter PostgreSQL Client Instalado

```powershell
# Verificar se pg_restore está disponível
pg_restore --version

# Se não tiver, instalar PostgreSQL
# Download: https://www.postgresql.org/download/windows/
```

---

## 📂 Estratégias de Restore

Você tem **2 opções** de restore (ambas funcionam):

### Opção A: Restore Completo (1 arquivo) ⭐ RECOMENDADO
- **Arquivo**: `chatbot_full_TIMESTAMP.sql`
- **Contém**: Estrutura + Dados + RLS + Triggers + Functions
- **Vantagem**: Simples, 1 comando só
- **Use quando**: Migração completa, clone de ambiente

### Opção B: Restore Estrutura + Dados (2 arquivos)
- **Arquivos**: `chatbot_structure_TIMESTAMP.sql` + `chatbot_data_TIMESTAMP.sql`
- **Contém**: Estrutura separada dos dados
- **Vantagem**: Flexibilidade (pode restaurar só estrutura)
- **Use quando**: Criar ambiente vazio, debugging

---

## 🚀 Método 1: Restore Completo (Recomendado)

### Passo 1: Preparar Script de Restore

Crie o arquivo `db\restore-complete.bat`:

```batch
@echo off
REM =============================================
REM RESTORE COMPLETO - PostgreSQL (Supabase)
REM =============================================

REM Adicionar PostgreSQL ao PATH
set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%

REM ⚠️ PREENCHA COM OS DADOS DO NOVO SUPABASE
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.SEU_PROJECT_REF_AQUI
set PGPASSWORD=SUA_SENHA_AQUI

REM ⚠️ BACKUP A RESTAURAR (ajuste o timestamp)
set BACKUP_DIR=%~dp0backup\2025_11_21_143052
set BACKUP_FILE=%BACKUP_DIR%\chatbot_full_2025_11_21_143052.sql

echo ========================================
echo 🔄 RESTORE COMPLETO DO BANCO DE DADOS
echo ========================================
echo 🌐 Host: %DB_HOST%
echo 📁 Arquivo: %BACKUP_FILE%
echo ========================================
echo.

REM Verificar se arquivo existe
if not exist "%BACKUP_FILE%" (
    echo ❌ ERRO: Arquivo de backup não encontrado!
    echo 📁 Verifique: %BACKUP_FILE%
    pause
    exit /b 1
)

echo ⚠️  ATENÇÃO: Esta operação irá:
echo    1. Criar todas as tabelas
echo    2. Inserir todos os dados
echo    3. Aplicar RLS policies
echo    4. Criar triggers e functions
echo.
echo Deseja continuar? (Ctrl+C para cancelar)
pause

echo.
echo 📦 Restaurando schema PUBLIC...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 RESTORE CONCLUÍDO COM SUCESSO!
    echo ========================================
    echo.
    echo ✅ Schema public restaurado
    echo ✅ Todas as tabelas criadas
    echo ✅ Dados inseridos
    echo ✅ RLS policies aplicadas
    echo ✅ Triggers e functions criados
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ ERRO NO RESTORE
    echo ========================================
    echo Veja os erros acima para diagnosticar
    echo.
)

pause
```

### Passo 2: Configurar Credenciais

Edite `restore-complete.bat` e preencha:

```batch
REM Exemplo com credenciais reais:
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_USER=postgres.jxkdhfksdhfkjshdf    ← Seu project ref
set PGPASSWORD=sua-senha-super-secreta      ← Sua senha
```

### Passo 3: Ajustar Caminho do Backup

```batch
REM Exemplo: usar backup mais recente
set BACKUP_DIR=%~dp0backup\2025_11_21_143052    ← Ajustar timestamp
set BACKUP_FILE=%BACKUP_DIR%\chatbot_full_2025_11_21_143052.sql
```

**Dica**: Para encontrar o backup mais recente:
```powershell
# PowerShell - listar backups por data (mais recente primeiro)
Get-ChildItem db\backup -Directory | Sort-Object Name -Descending | Select-Object -First 1
```

### Passo 4: Executar Restore

```powershell
cd db
.\restore-complete.bat
```

**Tempo esperado**: 2-5 minutos (depende do tamanho do banco)

---

## 🔧 Método 2: Restore Estrutura + Dados

Se preferir restaurar em etapas separadas:

### Passo 1: Restaurar Estrutura (Tabelas, RLS, Triggers)

```batch
@echo off
REM restore-structure.bat

set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_USER=postgres.SEU_PROJECT_REF
set PGPASSWORD=SUA_SENHA

set BACKUP_DIR=%~dp0backup\2025_11_21_143052
set STRUCTURE_FILE=%BACKUP_DIR%\chatbot_structure_2025_11_21_143052.sql

echo 📦 Restaurando estrutura do banco...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%STRUCTURE_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Estrutura restaurada com sucesso!
) else (
    echo ❌ Erro ao restaurar estrutura
)

pause
```

### Passo 2: Restaurar Dados

```batch
@echo off
REM restore-data.bat

set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_USER=postgres.SEU_PROJECT_REF
set PGPASSWORD=SUA_SENHA

set BACKUP_DIR=%~dp0backup\2025_11_21_143052
set DATA_FILE=%BACKUP_DIR%\chatbot_data_2025_11_21_143052.sql

echo 📦 Restaurando dados do banco...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%DATA_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Dados restaurados com sucesso!
) else (
    echo ❌ Erro ao restaurar dados
)

pause
```

**Executar em ordem**:
```powershell
cd db
.\restore-structure.bat    # Primeiro: estrutura
.\restore-data.bat          # Depois: dados
```

---

## 🔐 Restore do Schema Auth

**⚠️ IMPORTANTE**: O schema `auth` é gerenciado pelo Supabase. Restaurar pode causar problemas!

### Cenários de Uso

#### Cenário 1: Novo Supabase SEM usuários (recomendado)
**Restaurar auth completo** para manter usuários e permissões:

```batch
@echo off
REM restore-auth.bat

set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_USER=postgres.SEU_PROJECT_REF
set PGPASSWORD=SUA_SENHA

set BACKUP_DIR=%~dp0backup\2025_11_21_143052
set AUTH_FILE=%BACKUP_DIR%\auth_full_2025_11_21_143052.sql

echo ⚠️  ATENÇÃO: Restaurando schema AUTH
echo    Isso irá sobrescrever usuários existentes!
echo.
pause

echo 📦 Restaurando schema AUTH...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%AUTH_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Schema auth restaurado com sucesso!
    echo ⚠️  IMPORTANTE: Usuários manterão senhas antigas
) else (
    echo ❌ Erro ao restaurar schema auth
)

pause
```

#### Cenário 2: Novo Supabase JÁ com usuários
**NÃO restaurar auth** - crie usuários manualmente no dashboard

#### Cenário 3: Restaurar APENAS dados de usuários (sem sobrescrever estrutura)
```batch
set AUTH_DATA=%BACKUP_DIR%\auth_data_2025_11_21_143052.sql
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%AUTH_DATA%"
```

---

## ✅ Verificação Pós-Restore

### 1. Verificar Tabelas Criadas

**Via Supabase Dashboard**:
1. Table Editor → Public schema
2. Verificar que todas as tabelas aparecem

**Via SQL**:
```sql
-- Ver todas as tabelas do schema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve retornar: audit_logs, clients, execution_logs, etc
```

### 2. Verificar RLS Policies

```sql
-- Ver todas as RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = TRUE;
```

### 3. Verificar Triggers

```sql
-- Ver todos os triggers
SELECT
  tgname AS trigger_name,
  tblname AS table_name
FROM (
  SELECT t.tgname, c.relname AS tblname
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal
) AS triggers
ORDER BY table_name, trigger_name;
```

### 4. Verificar Functions

```sql
-- Ver todas as functions customizadas
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Deve incluir: cleanup_old_audit_logs, cleanup_old_execution_logs, etc
```

### 5. Verificar Contagem de Dados

```sql
-- Ver quantidade de registros em cada tabela
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

**Compare com o banco original** para garantir que todos os dados foram restaurados.

### 6. Verificar Vault (Secrets)

```sql
-- Ver secrets no Vault
SELECT id, name, description
FROM vault.secrets
ORDER BY created_at DESC;

-- ⚠️ IMPORTANTE: Secrets NÃO são restaurados no backup!
-- Você precisa recriar secrets manualmente
```

---

## 🔧 Troubleshooting

### Erro: "psql: error: connection to server... failed"

**Causa**: Credenciais incorretas ou conexão bloqueada

**Solução**:
```powershell
# Testar conexão
psql -h aws-1-sa-east-1.pooler.supabase.com -p 6543 -U postgres.SEU_PROJECT_REF -d postgres

# Se pedir senha, digite e teste se conecta
```

**Verificar**:
- ✅ HOST correto (copie do Supabase Dashboard)
- ✅ USER correto (inclui `postgres.` + project ref)
- ✅ Senha correta (⚠️ case-sensitive!)
- ✅ Porta 6543 (pooler mode)

### Erro: "ERROR: role 'authenticator' does not exist"

**Causa**: Supabase cria roles especiais automaticamente

**Solução**: Ignorar - o Supabase vai criar automaticamente na primeira conexão via API

### Erro: "ERROR: table 'X' already exists"

**Causa**: Tentando restaurar em banco não-vazio

**Solução 1 - Limpar banco antes** (⚠️ DESTRUTIVO):
```sql
-- ⚠️ CUIDADO: Deleta TUDO no schema public
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

**Solução 2 - Criar novo projeto Supabase** (recomendado)

### Erro: "ERROR: must be owner of extension pgcrypto"

**Causa**: Tentando criar extensões que o Supabase já tem

**Solução**: Edite o arquivo SQL de backup e comente/remova linhas:
```sql
-- Comentar estas linhas:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Erro: "ERROR: permission denied for schema auth"

**Causa**: Tentando modificar schema `auth` sem permissão

**Solução**:
1. **Não restaurar schema auth** (deixe o Supabase gerenciar)
2. OU use connection string com role `postgres` (não `anon`)

### Dados Não Aparecem no Dashboard

**Causa**: RLS bloqueando acesso

**Verificação**:
```sql
-- Desabilitar RLS temporariamente para debug (⚠️ NÃO em produção!)
ALTER TABLE nome_da_tabela DISABLE ROW LEVEL SECURITY;

-- Ver dados
SELECT * FROM nome_da_tabela LIMIT 10;

-- Reabilitar RLS
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### Restore Muito Lento

**Causa**: Backup muito grande

**Solução**:
```batch
REM Usar compressão
pg_dump ... | gzip > backup.sql.gz

REM Restaurar comprimido
gunzip -c backup.sql.gz | psql -h ... -U ... -d ...
```

---

## 🔐 Secrets do Vault

**⚠️ IMPORTANTE**: Secrets do Vault **NÃO são incluídos** no backup por segurança!

### Recriar Secrets Manualmente

1. Acesse **Supabase Dashboard** → **SQL Editor**
2. Execute para cada secret:

```sql
-- Exemplo: Meta Access Token
SELECT vault.create_secret(
  'EAAGxxxxxxxxxxxxxxxxxxxxx',  -- Seu token
  'meta_access_token'             -- Nome do secret
);

-- Anotar o UUID retornado
-- Usar este UUID na tabela clients
```

3. Atualizar tabela `clients`:

```sql
-- Atualizar referências aos secrets
UPDATE clients
SET
  meta_access_token_secret_id = 'uuid-do-secret-meta-access-token',
  openai_api_key_secret_id = 'uuid-do-secret-openai',
  groq_api_key_secret_id = 'uuid-do-secret-groq'
WHERE id = 'seu-client-id';
```

---

## 📝 Checklist Final

Após o restore, verifique:

### Database
- [ ] Todas as tabelas criadas ✅
- [ ] Contagem de registros bate com original ✅
- [ ] RLS policies ativas ✅
- [ ] Triggers criados ✅
- [ ] Functions customizadas criadas ✅
- [ ] Índices criados ✅

### Supabase Vault
- [ ] Secrets recriados manualmente ✅
- [ ] Tabela `clients` atualizada com secret IDs ✅

### Configuração
- [ ] `.env.local` atualizado com novas credenciais ✅
- [ ] `NEXT_PUBLIC_SUPABASE_URL` atualizado ✅
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` atualizado ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` atualizado ✅

### Testes
- [ ] Login no dashboard funciona ✅
- [ ] Usuários aparecem corretamente ✅
- [ ] RLS filtrando por tenant ✅
- [ ] Webhook recebe mensagens ✅
- [ ] Chatbot processa mensagens ✅
- [ ] Backend Monitor mostra logs (isolados por tenant) ✅

---

## 🚀 Script Completo Automatizado

Para facilitar, aqui está um script all-in-one:

**`db\restore-auto.bat`**:
```batch
@echo off
REM =============================================
REM RESTORE AUTOMÁTICO - Backup mais recente
REM =============================================

set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%

REM ⚠️ CONFIGURAR APENAS UMA VEZ
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_USER=postgres.SEU_PROJECT_REF
set PGPASSWORD=SUA_SENHA
set DB_NAME=postgres

REM Encontrar backup mais recente automaticamente
for /f "delims=" %%i in ('dir /b /ad /o-n "%~dp0backup"') do (
    set LATEST_BACKUP=%%i
    goto :found
)
:found

set BACKUP_DIR=%~dp0backup\%LATEST_BACKUP%
set BACKUP_FILE=%BACKUP_DIR%\chatbot_full_%LATEST_BACKUP%.sql

echo ========================================
echo 🔄 RESTORE AUTOMÁTICO
echo ========================================
echo 📅 Backup: %LATEST_BACKUP%
echo 📁 Arquivo: %BACKUP_FILE%
echo 🌐 Destino: %DB_HOST%
echo ========================================
echo.

if not exist "%BACKUP_FILE%" (
    echo ❌ Arquivo não encontrado: %BACKUP_FILE%
    pause
    exit /b 1
)

echo ⚠️  Pressione qualquer tecla para iniciar restore...
pause >nul

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo 🎉 RESTORE CONCLUÍDO!
) else (
    echo.
    echo ❌ ERRO NO RESTORE
)

pause
```

**Uso**:
```powershell
cd db
.\restore-auto.bat    # Restaura backup mais recente automaticamente
```

---

## 📚 Documentos Relacionados

- `backup-complete.bat` - Script de backup
- `MIGRATION_WORKFLOW.md` - Workflow de migrations
- `RESTORE_GUIDE.md` - Este documento

---

**🎉 Pronto! Seu banco está completamente restaurado na nova conta Supabase!**
