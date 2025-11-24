# Como Testar Deep Linking - Comando Simples

## ⚠️ Problema que Você Encontrou

Você estava no diretório `android` e tentou executar:
```
scripts\test-deep-link.bat chat 123
```

**Erro:** PowerShell não encontrou o script porque você estava no subdiretório errado.

---

## ✅ Solução Mais Simples (Recomendado)

**Use o comando `adb` diretamente** - funciona de qualquer lugar:

```powershell
# Testar abrir chat
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app

# Testar abrir dashboard
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

**Vantagens:**
- ✅ Funciona de qualquer diretório
- ✅ Não precisa de script
- ✅ Mais rápido

---

## 📋 Passo a Passo Completo

### 1. Verificar Device Conectado

```powershell
adb devices
```

**Deve mostrar:**
```
List of devices attached
emulator-5554    device
```

### 2. Abrir Chrome DevTools

1. Abrir Chrome
2. Ir para: `chrome://inspect`
3. Procurar seu app
4. Clicar **Inspect**

### 3. Testar Deep Link

**No PowerShell (de qualquer lugar):**

```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

### 4. Verificar Logs

No Chrome DevTools (Console), você deve ver:

```
[Deep Linking] Inicializando listeners...
[Deep Linking] App opened with URL: chatbot://chat/123
[Deep Linking] Navegando para chat: 123
```

---

## 🎯 Comandos Prontos para Copiar

### Teste 1: Abrir Chat

```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

### Teste 2: Abrir Dashboard

```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

### Teste 3: Verificar Intent-Filters

```powershell
adb shell dumpsys package com.chatbot.app | Select-String -Pattern "filter"
```

---

## ❌ Se Não Funcionar

### Erro: "adb: command not found"

**Solução:** Adicionar Android SDK ao PATH ou usar caminho completo:
```powershell
$env:ANDROID_HOME\platform-tools\adb.exe shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

### Erro: "device not found"

**Solução:**
1. Verificar: `adb devices`
2. Se vazio, verificar USB debugging no device
3. Aceitar prompt de autorização

### App Não Abre

**Solução:**
1. Verificar se app está instalado:
   ```powershell
   adb shell pm list packages | Select-String "chatbot"
   ```
2. Se não estiver, instalar via Android Studio (Run)

---

## 💡 Dica

**Use o comando `adb` diretamente** - é mais simples que o script e funciona de qualquer lugar!

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

