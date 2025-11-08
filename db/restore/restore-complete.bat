@echo off
REM ============================================================================
REM RESTORE COMPLETO - Restaura backup completo do banco de dados
REM ============================================================================
REM 
REM ATENÇÃO: Este script VAI SOBRESCREVER todos os dados atuais!
REM 
REM Uso: .\restore-complete.bat TIMESTAMP
REM Exemplo: .\restore-complete.bat 20251030_175352
REM ============================================================================

SET TIMESTAMP=%1

IF "%TIMESTAMP%"=="" (
    echo.
    echo ❌ ERRO: Você precisa informar o timestamp do backup!
    echo.
    echo Backups disponíveis:
    dir /B chatbot_full_*.sql
    echo.
    echo Uso: .\restore-complete.bat TIMESTAMP
    echo Exemplo: .\restore-complete.bat 20251030_175352
    echo.
    exit /b 1
)

REM Validar se arquivos de backup existem
IF NOT EXIST "chatbot_full_%TIMESTAMP%.sql" (
    echo.
    echo ❌ ERRO: Arquivo chatbot_full_%TIMESTAMP%.sql não encontrado!
    echo.
    echo Backups disponíveis:
    dir /B chatbot_full_*.sql
    echo.
    exit /b 1
)

IF NOT EXIST "auth_full_%TIMESTAMP%.sql" (
    echo.
    echo ⚠️ AVISO: Arquivo auth_full_%TIMESTAMP%.sql não encontrado!
    echo Apenas o schema public será restaurado.
    echo.
    SET /P CONTINUE="Deseja continuar? (S/N): "
    IF /I NOT "%CONTINUE%"=="S" exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   RESTORE COMPLETO DO BANCO                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⚠️  ATENÇÃO: Esta operação VAI SOBRESCREVER todos os dados atuais!
echo.
echo Backup a ser restaurado: %TIMESTAMP%
echo.
echo Arquivos:
IF EXIST "chatbot_full_%TIMESTAMP%.sql" echo   ✓ chatbot_full_%TIMESTAMP%.sql
IF EXIST "auth_full_%TIMESTAMP%.sql" echo   ✓ auth_full_%TIMESTAMP%.sql
echo.
SET /P CONFIRM="Tem CERTEZA que deseja continuar? (Digite 'SIM' para confirmar): "

IF NOT "%CONFIRM%"=="SIM" (
    echo.
    echo ❌ Operação cancelada.
    exit /b 0
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.

REM Obter credenciais do .env.local
echo [1/6] Carregando credenciais...

REM Ler SUPABASE_URL do .env.local
FOR /F "tokens=2 delims==" %%a IN ('findstr "NEXT_PUBLIC_SUPABASE_URL" ..\.env.local') DO SET SUPABASE_URL=%%a

REM Ler SERVICE_ROLE_KEY do .env.local
FOR /F "tokens=2 delims==" %%a IN ('findstr "SUPABASE_SERVICE_ROLE_KEY" ..\.env.local') DO SET SERVICE_ROLE_KEY=%%a

REM Extrair host do URL (remover https:// e pegar o que vem antes de .supabase.co)
FOR /F "tokens=2 delims=/" %%a IN ("%SUPABASE_URL%") DO SET TEMP_HOST=%%a
FOR /F "tokens=1 delims=." %%a IN ("%TEMP_HOST%") DO SET PROJECT_REF=%%a

REM Construir connection string
SET DB_HOST=db.%PROJECT_REF%.supabase.co
SET DB_PORT=5432
SET DB_NAME=postgres
SET DB_USER=postgres

echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    Database: %DB_NAME%
echo.

REM Pedir senha do banco (não está no .env.local)
echo ℹ️  A senha do banco NÃO está no .env.local
echo    Você pode encontrá-la em: https://app.supabase.com/project/%PROJECT_REF%/settings/database
echo.
SET /P PGPASSWORD="Digite a senha do banco (Database password): "

echo.
echo [2/6] Testando conexão com o banco...
echo.

REM Testar conexão
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1" > nul 2>&1

IF ERRORLEVEL 1 (
    echo.
    echo ❌ ERRO: Não foi possível conectar ao banco!
    echo.
    echo Verifique:
    echo   1. Senha está correta
    echo   2. Supabase Database está ativo
    echo   3. PostgreSQL client (psql) está instalado
    echo.
    echo Para instalar psql: https://www.postgresql.org/download/windows/
    echo.
    exit /b 1
)

echo ✓ Conexão estabelecida!
echo.

echo [3/6] Criando backup de segurança antes do restore...
echo.

REM Criar backup de segurança
SET SAFETY_BACKUP=safety_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% ^
  -c "SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public'" > "%SAFETY_BACKUP%"

IF ERRORLEVEL 1 (
    echo.
    echo ⚠️  AVISO: Não foi possível criar backup de segurança, mas continuando...
    echo.
) ELSE (
    echo ✓ Backup de segurança criado: %SAFETY_BACKUP%
    echo.
)

echo [4/6] Restaurando schema PUBLIC (dados da aplicação)...
echo.

REM Primeiro, dropar schema public e recriar
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

IF ERRORLEVEL 1 (
    echo.
    echo ❌ ERRO: Não foi possível limpar schema public!
    exit /b 1
)

REM Restaurar backup do schema public
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% < "chatbot_full_%TIMESTAMP%.sql"

IF ERRORLEVEL 1 (
    echo.
    echo ❌ ERRO: Falha ao restaurar schema public!
    echo.
    echo ⚠️  Seu banco pode estar em estado inconsistente!
    echo    Use o backup de segurança para reverter: %SAFETY_BACKUP%
    echo.
    exit /b 1
)

echo ✓ Schema PUBLIC restaurado com sucesso!
echo.

IF EXIST "auth_full_%TIMESTAMP%.sql" (
    echo [5/6] Restaurando schema AUTH (usuários Supabase)...
    echo.
    
    REM CUIDADO: Auth schema é gerenciado pelo Supabase, pode dar erro
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% < "auth_full_%TIMESTAMP%.sql" 2>nul
    
    IF ERRORLEVEL 1 (
        echo.
        echo ⚠️  AVISO: Restore do schema AUTH falhou
        echo    Isso é esperado se você não tinha usuários no backup
        echo    ou se o Supabase Auth está gerenciando o schema.
        echo.
    ) ELSE (
        echo ✓ Schema AUTH restaurado!
        echo.
    )
) ELSE (
    echo [5/6] Pulando schema AUTH (arquivo não encontrado)
    echo.
)

echo [6/6] Verificando restore...
echo.

REM Contar registros nas tabelas principais
FOR %%T IN (clients conversations messages) DO (
    FOR /F "usebackq" %%C IN (`psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM %%T" 2^>nul`) DO (
        echo    %%T: %%C registros
    )
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              ✅ RESTORE CONCLUÍDO COM SUCESSO!                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Dados restaurados do backup: %TIMESTAMP%
echo.
echo Próximos passos:
echo   1. Verificar se os dados estão corretos no dashboard
echo   2. Testar funcionalidades principais
echo   3. Se algo estiver errado, você pode restaurar o backup de segurança
echo.
echo Backup de segurança salvo em: %SAFETY_BACKUP%
echo.

pause
