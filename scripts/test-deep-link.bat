@echo off
REM Script para testar deep linking no Android
REM Funciona de qualquer diretório - automaticamente volta para raiz do projeto

REM Mudar para diretório do script (raiz do projeto)
cd /d "%~dp0\.."

if "%1"=="" (
    echo.
    echo ========================================
    echo   Teste de Deep Linking - ChatBot App
    echo ========================================
    echo.
    echo Uso: .\scripts\test-deep-link.bat [tipo] [parametro]
    echo.
    echo Tipos disponiveis:
    echo   chat [id]      - Abre chat especifico
    echo   dashboard      - Abre dashboard
    echo   invite [code]  - Abre invite
    echo.
    echo Exemplos:
    echo   .\scripts\test-deep-link.bat chat 123
    echo   .\scripts\test-deep-link.bat dashboard
    echo   .\scripts\test-deep-link.bat invite abc
    echo.
    exit /b 1
)

set TYPE=%1
set PARAM=%2

if "%TYPE%"=="chat" (
    if "%PARAM%"=="" (
        echo [ERRO] Chat ID nao fornecido
        echo Uso: .\scripts\test-deep-link.bat chat [id]
        exit /b 1
    )
    set URL=chatbot://chat/%PARAM%
    echo [TESTE] Enviando deep link: %URL%
    adb shell am start -a android.intent.action.VIEW -d "%URL%" com.chatbot.app
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Deep link enviado com sucesso!
        echo [INFO] Verifique o app e o console (chrome://inspect)
    ) else (
        echo [ERRO] Falha ao enviar deep link
        echo [INFO] Verifique se o device esta conectado: adb devices
    )
) else if "%TYPE%"=="dashboard" (
    set URL=chatbot://dashboard
    echo [TESTE] Enviando deep link: %URL%
    adb shell am start -a android.intent.action.VIEW -d "%URL%" com.chatbot.app
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Deep link enviado com sucesso!
        echo [INFO] Verifique o app e o console (chrome://inspect)
    ) else (
        echo [ERRO] Falha ao enviar deep link
        echo [INFO] Verifique se o device esta conectado: adb devices
    )
) else if "%TYPE%"=="invite" (
    if "%PARAM%"=="" (
        echo [ERRO] Invite code nao fornecido
        echo Uso: .\scripts\test-deep-link.bat invite [code]
        exit /b 1
    )
    set URL=chatbot://invite/%PARAM%
    echo [TESTE] Enviando deep link: %URL%
    adb shell am start -a android.intent.action.VIEW -d "%URL%" com.chatbot.app
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Deep link enviado com sucesso!
        echo [INFO] Verifique o app e o console (chrome://inspect)
    ) else (
        echo [ERRO] Falha ao enviar deep link
        echo [INFO] Verifique se o device esta conectado: adb devices
    )
) else (
    echo [ERRO] Tipo desconhecido: %TYPE%
    echo Tipos disponiveis: chat, dashboard, invite
    exit /b 1
)

