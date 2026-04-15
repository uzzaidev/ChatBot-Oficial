@echo off
setlocal EnableExtensions EnableDelayedExpansion

if /I "%~1"=="-h" goto :help
if /I "%~1"=="--help" goto :help

if defined PG_BIN (
  if exist "%PG_BIN%\pg_dump.exe" (
    set "PATH=%PG_BIN%;%PATH%"
    set "PG_BIN_RESOLVED=%PG_BIN%"
  )
)

if not defined PG_BIN_RESOLVED (
  call :auto_detect_pg_bin
)

where pg_dump >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pg_dump was not found in PATH.
  echo [HINT] Install PostgreSQL client tools or set PG_BIN to the bin directory.
  exit /b 1
)

if defined PG_BIN_RESOLVED (
  echo [INFO] PostgreSQL client bin: %PG_BIN_RESOLVED%
)

call :require_env DB_HOST
if errorlevel 1 exit /b 1
call :require_env DB_PORT
if errorlevel 1 exit /b 1
call :require_env DB_NAME
if errorlevel 1 exit /b 1
call :require_env DB_USER
if errorlevel 1 exit /b 1
call :require_env PGPASSWORD
if errorlevel 1 exit /b 1

for /f %%I in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy_MM_dd_HHmmss')"') do set "NOWSTAMP=%%I"

set "BACKUP_LABEL=%~1"
if "%BACKUP_LABEL%"=="" set "BACKUP_LABEL=%NOWSTAMP%"

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "BACKUP_ROOT=%SCRIPT_DIR%\backup"
set "BACKUP_DIR=%BACKUP_ROOT%\%BACKUP_LABEL%"

if exist "%BACKUP_DIR%" (
  echo [ERROR] Backup directory already exists: %BACKUP_DIR%
  echo [HINT] Use a unique label, for example: 2026_04_14_02
  exit /b 1
)

mkdir "%BACKUP_DIR%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Failed to create backup directory: %BACKUP_DIR%
  exit /b 1
)

set "LOG_FILE=%BACKUP_DIR%\backup.log"
set "META_FILE=%BACKUP_DIR%\backup.meta"
set "HASH_FILE=%BACKUP_DIR%\SHA256SUMS.txt"

echo =================================================== > "%LOG_FILE%"
echo BACKUP STARTED >> "%LOG_FILE%"
echo Label: %BACKUP_LABEL% >> "%LOG_FILE%"
echo Host: %DB_HOST% >> "%LOG_FILE%"
echo Port: %DB_PORT% >> "%LOG_FILE%"
echo DB: %DB_NAME% >> "%LOG_FILE%"
echo User: %DB_USER% >> "%LOG_FILE%"
echo =================================================== >> "%LOG_FILE%"

(
  echo backup_label=%BACKUP_LABEL%
  echo generated_at=%NOWSTAMP%
  echo db_host=%DB_HOST%
  echo db_port=%DB_PORT%
  echo db_name=%DB_NAME%
  echo db_user=%DB_USER%
  echo schemas=public,auth
) > "%META_FILE%"

echo.
echo ===================================================
echo FULL DATABASE BACKUP
echo ===================================================
echo Label: %BACKUP_LABEL%
echo Output: %BACKUP_DIR%
echo.

call :run_dump public full "chatbot_full_%BACKUP_LABEL%.sql" || exit /b 1
call :run_dump public structure "chatbot_structure_%BACKUP_LABEL%.sql" || exit /b 1
call :run_dump public data "chatbot_data_%BACKUP_LABEL%.sql" || exit /b 1

call :run_dump auth full "auth_full_%BACKUP_LABEL%.sql" || exit /b 1
call :run_dump auth structure "auth_structure_%BACKUP_LABEL%.sql" || exit /b 1
call :run_dump auth data "auth_data_%BACKUP_LABEL%.sql" || exit /b 1

echo.
echo [INFO] Generating SHA256 checksums...
powershell -NoProfile -Command "Get-ChildItem -Path '%BACKUP_DIR%' -Filter '*.sql' | Sort-Object Name | Get-FileHash -Algorithm SHA256 | ForEach-Object { '{0}  {1}' -f $_.Hash, (Split-Path $_.Path -Leaf) } | Set-Content -Path '%HASH_FILE%' -Encoding ascii"
if errorlevel 1 (
  echo [WARN] Failed to generate SHA256SUMS.txt >> "%LOG_FILE%"
  echo [WARN] Failed to generate SHA256SUMS.txt
) else (
  echo [OK] SHA256SUMS generated: %HASH_FILE%
  echo [OK] SHA256SUMS generated: %HASH_FILE% >> "%LOG_FILE%"
)

echo.
echo ===================================================
echo BACKUP COMPLETED SUCCESSFULLY
echo ===================================================
echo Backup folder: %BACKUP_DIR%
echo Log file:      %LOG_FILE%
echo Metadata:      %META_FILE%
echo Checksums:     %HASH_FILE%
echo.
echo IMPORTANT:
echo - Keep auth_data file in a secure location.
echo - Vault secrets are not included in pg_dump output.
echo - Do not commit backup files to git.
echo ===================================================
exit /b 0

:run_dump
set "SCHEMA=%~1"
set "MODE=%~2"
set "FILE_NAME=%~3"
set "OUT_FILE=%BACKUP_DIR%\%FILE_NAME%"

echo [RUN] schema=%SCHEMA% mode=%MODE% file=%FILE_NAME%
echo [RUN] schema=%SCHEMA% mode=%MODE% file=%FILE_NAME% >> "%LOG_FILE%"

if /I "%MODE%"=="full" (
  pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n %SCHEMA% -F p -b -v -f "%OUT_FILE%" >> "%LOG_FILE%" 2>&1
) else if /I "%MODE%"=="structure" (
  pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n %SCHEMA% -F p -s -v -f "%OUT_FILE%" >> "%LOG_FILE%" 2>&1
) else if /I "%MODE%"=="data" (
  pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -n %SCHEMA% -F p -a -v -f "%OUT_FILE%" >> "%LOG_FILE%" 2>&1
) else (
  echo [ERROR] Invalid dump mode: %MODE% >> "%LOG_FILE%"
  exit /b 1
)

if errorlevel 1 (
  echo [ERROR] Dump failed: schema=%SCHEMA% mode=%MODE%
  echo [ERROR] Dump failed: schema=%SCHEMA% mode=%MODE% >> "%LOG_FILE%"
  echo [ERROR] Backup failed. Check log: %LOG_FILE%
  echo [ERROR] Backup failed. >> "%LOG_FILE%"
  exit /b 1
)

echo [OK] %FILE_NAME%
echo [OK] %FILE_NAME% >> "%LOG_FILE%"
exit /b 0

:require_env
if defined %~1 (
  exit /b 0
)
echo [ERROR] Required environment variable is missing: %~1
exit /b 1

:auto_detect_pg_bin
for %%V in (18 17 16 15 14 13 12) do (
  if exist "C:\Program Files\PostgreSQL\%%V\bin\pg_dump.exe" (
    set "PG_BIN_RESOLVED=C:\Program Files\PostgreSQL\%%V\bin"
    set "PATH=!PG_BIN_RESOLVED!;%PATH%"
    exit /b 0
  )
)
exit /b 0

:help
echo Usage:
echo   backup-complete-safe.bat [backup_label]
echo.
echo Examples:
echo   backup-complete-safe.bat
echo   backup-complete-safe.bat 2026_04_14
echo.
echo Required environment variables:
echo   DB_HOST, DB_PORT, DB_NAME, DB_USER, PGPASSWORD
echo Optional:
echo   PG_BIN   (example: C:\Program Files\PostgreSQL\18\bin)
exit /b 0
