# Como Testar Deep Linking - Guia Rápido

## ⚠️ Problema Comum

Se você receber erro ao executar o script, provavelmente está no diretório errado.

**Erro comum:**
```
scripts\test-deep-link.bat : Não foi possível carregar o módulo 'scripts'
```

**Causa:** Você está em um subdiretório (ex: `android`) e o PowerShell não encontra o script.

---

## ✅ Solução: 3 Formas de Testar

### Método 1: Voltar para Raiz do Projeto (Recomendado)

```powershell
# 1. Voltar para raiz do projeto
cd C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial

# 2. Executar script
.\scripts\test-deep-link.bat chat 123
```

### Método 2: Usar Caminho Absoluto

```powershell
# De qualquer diretório
& "C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial\scripts\test-deep-link.bat" chat 123
```

### Método 3: Comando Direto (Mais Simples)

```powershell
# De qualquer diretório, usar adb diretamente:
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app

# Ou para dashboard:
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

---

## 🧪 Teste Completo Passo a Passo

### Passo 1: Verificar Diretório Atual

```powershell
# Ver onde você está
pwd
# Ou
Get-Location

# Se estiver em android/, voltar:
cd ..
```

### Passo 2: Verificar se App Está Instalado

```powershell
# Verificar se app está instalado
adb shell pm list packages | Select-String "chatbot"

# Deve mostrar: package:com.chatbot.app
```

### Passo 3: Abrir Chrome DevTools

1. Abrir Chrome
2. Navegar para: `chrome://inspect`
3. Procurar seu app na lista
4. Clicar **Inspect** (abre DevTools)

### Passo 4: Testar Deep Link

**Opção A - Usando Script (da raiz do projeto):**
```powershell
cd C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial
.\scripts\test-deep-link.bat chat 123
```

**Opção B - Comando Direto (funciona de qualquer lugar):**
```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

### Passo 5: Verificar Logs no Console

No Chrome DevTools (aba Console), você deve ver:

```
[Deep Linking] Inicializando listeners...
[Deep Linking] App opened with URL: chatbot://chat/123
[Deep Linking] Navegando para chat: 123
```

---

## 🔧 Comandos Úteis

### Verificar Device Conectado

```powershell
adb devices
```

### Verificar Intent-Filters Configurados

```powershell
adb shell dumpsys package com.chatbot.app | Select-String -Pattern "filter"
```

### Desinstalar App (se precisar reinstalar)

```powershell
adb uninstall com.chatbot.app
```

---

## ❌ Troubleshooting

### Erro: "adb: command not found"

**Solução:** Adicionar Android SDK ao PATH ou usar caminho completo:
```powershell
$env:ANDROID_HOME\platform-tools\adb.exe shell am start ...
```

### Erro: "device not found"

**Solução:**
1. Verificar USB debugging habilitado no device
2. Verificar device conectado: `adb devices`
3. Aceitar prompt de autorização no device

### App Não Abre

**Solução:**
1. Verificar se app está instalado: `adb shell pm list packages | Select-String "chatbot"`
2. Se não estiver, instalar via Android Studio (Run)

### App Abre Mas Não Navega

**Solução:**
1. Verificar console (chrome://inspect)
2. Verificar se logs aparecem: `[Deep Linking]`
3. Verificar se rota existe no app

---

## 📝 Exemplos de Teste

```powershell
# Teste 1: Abrir chat específico
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app

# Teste 2: Abrir dashboard
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app

# Teste 3: Abrir invite (se implementado)
adb shell am start -a android.intent.action.VIEW -d "chatbot://invite/abc" com.chatbot.app
```

---

**Dica:** Use o **Método 3 (comando direto)** - é mais simples e funciona de qualquer lugar!

