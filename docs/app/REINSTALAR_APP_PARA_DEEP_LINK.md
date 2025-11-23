# Reinstalar App para Deep Linking Funcionar

## ✅ O Que Já Foi Feito

1. ✅ App desinstalado (`adb uninstall com.chatbot.app`)
2. ✅ Build feito (`npm run build:mobile`)
3. ✅ Sync feito (`npx cap sync android`)

---

## 🎯 Próximo Passo: Reinstalar App

### No Android Studio (já aberto):

1. **Verificar que projeto está sincronizado:**
   - Aguardar Gradle sync completar (se ainda estiver fazendo)

2. **Selecionar emulador:**
   - Dropdown no topo: selecionar `emulator-5554` (ou seu emulador)

3. **Reinstalar app:**
   - Clicar **Run** (`Shift + F10`) ou botão ▶️
   - Aguardar app instalar e abrir

4. **Aguardar app carregar completamente:**
   - App deve abrir e mostrar tela de login/dashboard

---

## 🧪 Testar Deep Link (Após Reinstalar)

**No PowerShell (outro terminal):**

```powershell
# Adicionar adb ao PATH (se necessário)
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# Testar deep link
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

**O que deve acontecer:**
- ✅ App navega para `/dashboard/chat/123`
- ✅ Console mostra logs: `[Deep Linking] App opened with URL`

---

## 🔍 Verificar Logs

1. Abrir Chrome: `chrome://inspect`
2. Localizar app na lista
3. Clicar **Inspect**
4. Ir para aba **Console**
5. Procurar:
   ```
   [Deep Linking] Inicializando listeners...
   [Deep Linking] App opened with URL: chatbot://chat/123
   [Deep Linking] Navegando para chat: 123
   ```

---

## ❌ Se Ainda Não Funcionar

### Verificar Intent-Filters

```powershell
adb shell dumpsys package com.chatbot.app | Select-String -Pattern "chatbot" -Context 3
```

**Deve mostrar intent-filters com `chatbot://`**

### Verificar AndroidManifest

Verificar se `android/app/src/main/AndroidManifest.xml` tem:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="chatbot" />
</intent-filter>
```

---

## 💡 Dica

**Use o terminal do Android Studio** - já tem `adb` configurado:
- View → Tool Windows → Terminal
- Executar comandos `adb` diretamente

---

**Status:** App desinstalado ✅ | Build feito ✅ | Sync feito ✅ | **Aguardando reinstalar** ⏳

