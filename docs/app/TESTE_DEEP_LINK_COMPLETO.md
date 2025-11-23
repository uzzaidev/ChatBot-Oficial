# Teste Completo de Deep Linking - Passo a Passo

## ⚠️ Problema Encontrado

Você recebeu erro: `Activity not started, unable to resolve Intent`

**Causas possíveis:**
1. App precisa ser reinstalado após mudanças no AndroidManifest
2. Intent-filter não foi sincronizado corretamente
3. App precisa ser rebuildado

---

## ✅ Solução Passo a Passo

### Passo 1: Adicionar ADB ao PATH (Se Ainda Não Fez)

```powershell
# Adicionar ao PATH (esta sessão)
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# Verificar
adb --version
```

### Passo 2: Verificar Device Conectado

```powershell
adb devices
```

**Deve mostrar:**
```
List of devices attached
emulator-5554   device
```

### Passo 3: Desinstalar App Antigo

```powershell
adb uninstall com.chatbot.app
```

**Importante:** Isso remove o app antigo que pode ter configurações antigas.

### Passo 4: Rebuild e Reinstalar

```powershell
# Voltar para raiz do projeto (se não estiver)
cd C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial

# Build
npm run build:mobile

# Sync
npx cap sync android

# Abrir Android Studio
npm run cap:open:android
```

**No Android Studio:**
1. Aguardar Gradle sync completar
2. Selecionar emulador no dropdown
3. Clicar **Run** (`Shift + F10`)
4. Aguardar app instalar e abrir

### Passo 5: Testar Deep Link

**Aguardar app estar rodando**, depois em outro terminal:

```powershell
# Adicionar adb ao PATH (se necessário)
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# Testar deep link
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

### Passo 6: Verificar Logs

1. Abrir Chrome: `chrome://inspect`
2. Localizar app
3. Clicar **Inspect**
4. Ir para aba **Console**
5. Procurar logs:
   ```
   [Deep Linking] Inicializando listeners...
   [Deep Linking] App opened with URL: chatbot://chat/123
   [Deep Linking] Navegando para chat: 123
   ```

---

## 🧪 Testes Disponíveis

### Teste 1: Chat Específico

```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

**Esperado:**
- App navega para `/dashboard/chat/123`
- Console mostra logs de deep linking

### Teste 2: Dashboard

```powershell
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

**Esperado:**
- App navega para `/dashboard`
- Console mostra logs

---

## ❌ Troubleshooting

### Erro: "Activity not started"

**Soluções:**

1. **Desinstalar e reinstalar app:**
   ```powershell
   adb uninstall com.chatbot.app
   # Rebuild e reinstalar via Android Studio
   ```

2. **Verificar intent-filter:**
   ```powershell
   adb shell dumpsys package com.chatbot.app | Select-String -Pattern "filter"
   ```

3. **Verificar se app está rodando:**
   ```powershell
   adb shell pm list packages | Select-String "chatbot"
   ```

### App Não Navega

**Soluções:**

1. Verificar console (chrome://inspect)
2. Verificar se logs aparecem: `[Deep Linking]`
3. Verificar se rota existe no app

---

## 💡 Dica: Usar Android Studio Terminal

**Mais fácil:** Use o terminal integrado do Android Studio:

1. Android Studio → View → Tool Windows → Terminal
2. O terminal já tem `adb` configurado
3. Executar comandos normalmente

---

## 📝 Checklist Completo

- [ ] ADB adicionado ao PATH (ou usar Android Studio terminal)
- [ ] Device/emulador conectado (`adb devices`)
- [ ] App desinstalado (`adb uninstall com.chatbot.app`)
- [ ] Rebuild feito (`npm run build:mobile`)
- [ ] Sync feito (`npx cap sync android`)
- [ ] App reinstalado via Android Studio (Run)
- [ ] App rodando no emulador
- [ ] Deep link testado (`adb shell am start ...`)
- [ ] Logs verificados no console (chrome://inspect)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

