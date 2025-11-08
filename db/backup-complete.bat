@echo off
REM =============================================
REM SCRIPT DE BACKUP COMPLETO - PostgreSQL (Supabase)
REM Schemas: public + auth
REM =============================================
@REM cd db; ./backup-complete.bat

REM Adicionar PostgreSQL ao PATH (usa versão 18 - compatível com servidor 17.6)
set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%

REM Configurações do Supabase
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.jhodhxvvhohygijqcxbo
set PGPASSWORD=affJLwPDtzPm0LYI

REM Criar timestamp para o arquivo (YYYY_MM_DD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set DATESTR=%datetime:~0,4%_%datetime:~4,2%_%datetime:~6,2%_%datetime:~8,6%
set BACKUP_DIR=%~dp0backup\%DATESTR%

REM Criar diretório de backup se não existir
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ========================================
echo 🔄 BACKUP COMPLETO DO BANCO DE DADOS
echo ========================================
echo 📅 Timestamp: %DATESTR%
echo 🌐 Host: %DB_HOST%
echo 📁 Diretório: %BACKUP_DIR%
echo ========================================
echo.

REM ===============================
REM SCHEMA PUBLIC
REM ===============================
echo.
echo ╔═══════════════════════════════════════╗
echo ║   SCHEMA: public (dados do chatbot)   ║
echo ╚═══════════════════════════════════════╝
echo.

echo 📦 [1/6] Backup COMPLETO do schema public...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n public -F p -b -v -f "%BACKUP_DIR%\chatbot_full_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

echo 🏗️  [2/6] Backup ESTRUTURA do schema public...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n public -F p -s -v -f "%BACKUP_DIR%\chatbot_structure_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

echo 📊 [3/6] Backup DADOS do schema public...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n public -F p -a -v -f "%BACKUP_DIR%\chatbot_data_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

REM ===============================
REM SCHEMA AUTH
REM ===============================
echo.
echo ╔═══════════════════════════════════════╗
echo ║   SCHEMA: auth (Supabase Auth Users)  ║
echo ╚═══════════════════════════════════════╝
echo.

echo 📦 [4/6] Backup COMPLETO do schema auth...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n auth -F p -b -v -f "%BACKUP_DIR%\auth_full_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

echo 🏗️  [5/6] Backup ESTRUTURA do schema auth...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n auth -F p -s -v -f "%BACKUP_DIR%\auth_structure_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

echo 📊 [6/6] Backup DADOS do schema auth...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n auth -F p -a -v -f "%BACKUP_DIR%\auth_data_%DATESTR%.sql"
if %errorlevel% equ 0 (echo ✅ OK) else (echo ❌ ERRO & pause & exit /b 1)

echo.
echo ========================================
echo 🎉 BACKUP COMPLETO CONCLUÍDO!
echo ========================================
echo 📁 Localização: %BACKUP_DIR%\
echo.
echo 📦 Arquivos gerados (SCHEMA PUBLIC):
echo    ✅ chatbot_full_%DATESTR%.sql
echo    ✅ chatbot_structure_%DATESTR%.sql
echo    ✅ chatbot_data_%DATESTR%.sql
echo.
echo 🔐 Arquivos gerados (SCHEMA AUTH):
echo    ✅ auth_full_%DATESTR%.sql
echo    ✅ auth_structure_%DATESTR%.sql
echo    ✅ auth_data_%DATESTR%.sql (CONTÉM USUÁRIOS E SENHAS!)
echo.
echo ========================================
echo ⚠️  IMPORTANTE: 
echo    - auth_data contém senhas hasheadas
echo    - Mantenha estes arquivos seguros!
echo    - NÃO commite no Git!
echo ========================================
pause
