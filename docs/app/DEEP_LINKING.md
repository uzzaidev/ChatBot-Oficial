# Deep Linking

Guia para implementar App Links (Android) e Universal Links (iOS) para abrir o app via URLs.

## 📋 Table of Contents

- [Overview](#overview)
- [Use Cases](#use-cases)
- [App Links (Android)](#app-links-android)
- [Universal Links (iOS - macOS)](#universal-links-ios---macos)
- [Código de Implementação](#código-de-implementação)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

### O Que É Deep Linking?

Deep linking permite abrir o app mobile diretamente de uma URL, sem passar pelo browser.

**Tipos:**

| Tipo | Exemplo | Comportamento |
|------|---------|---------------|
| **Custom URL Scheme** | `chatbot://chat/123` | Sempre abre app (se instalado) |
| **App Links (Android)** | `https://chat.luisfboff.com/chat/123` | Abre app diretamente (sem dialog) |
| **Universal Links (iOS)** | `https://chat.luisfboff.com/chat/123` | Abre app diretamente |

**Vantagens de App/Universal Links:**
- URL HTTPS (funciona na web se app não instalado)
- Sem dialog "Abrir com..." (experiência seamless)
- SEO-friendly

---

## Use Cases

### Cenários Práticos

1. **Email de notificação:**
   - "Você tem uma nova mensagem → [Abrir Chat](https://chat.luisfboff.com/chat/123)"
   - Clique abre app diretamente na conversa

2. **Compartilhamento:**
   - Usuário compartilha link: `https://chat.luisfboff.com/invite/abc`
   - Clique abre app em tela de convite

3. **QR Code:**
   - Scan QR code → Abre app em página específica

4. **Web → App:**
   - Usuário está no site web
   - Banner: "Baixe nosso app" → Abre app se instalado

---

## App Links (Android)

### 1. Configurar AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
    <application>
        <activity android:name=".MainActivity">
            <!-- Intent filter para deep linking -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <!-- Aceitar URLs https://chat.luisfboff.com/* -->
                <data
                    android:scheme="https"
                    android:host="chat.luisfboff.com" />
            </intent-filter>

            <!-- Custom URL scheme (opcional) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <!-- Aceitar URLs chatbot://* -->
                <data android:scheme="chatbot" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

### 2. Criar assetlinks.json (Verificação de Domínio)

Android verifica que você é dono do domínio via arquivo `assetlinks.json`.

#### Gerar SHA256 Fingerprint

```bash
# Debug keystore (desenvolvimento)
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android

# Procure SHA256:
# SHA256: AB:CD:EF:12:34:56...

# Release keystore (produção - após gerar)
keytool -list -v -keystore android\app\release.keystore -alias chatbot
```

Copie o SHA256 fingerprint.

---

#### Criar assetlinks.json

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.chatbot.app",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12"
      ]
    }
  }
]
```

**Substituir:**
- `package_name`: Match com `capacitor.config.ts` (appId)
- `sha256_cert_fingerprints`: SHA256 do keytool (sem espaços, com `:`)

---

#### Hospedar assetlinks.json

Upload para:
```
https://chat.luisfboff.com/.well-known/assetlinks.json
```

**Importante:**
- HTTPS obrigatório
- Arquivo deve ser acessível publicamente
- Content-Type: `application/json`

**Verificar:**
```bash
curl https://chat.luisfboff.com/.well-known/assetlinks.json
# Deve retornar JSON acima
```

**Testar verificação:**
- [Google Asset Links Checker](https://developers.google.com/digital-asset-links/tools/generator)

---

### 3. Sync e Rebuild

```bash
npx cap sync android
npm run build:mobile
npm run cap:sync
npm run cap:open:android
# Run no device
```

---

## Universal Links (iOS - macOS)

### 1. Configurar Entitlements (Xcode)

1. Abra Xcode: `npx cap open ios`
2. Selecione target **App**
3. **Signing & Capabilities** → **+ Capability** → **Associated Domains**
4. Adicione:
   - `applinks:chat.luisfboff.com`

**Ou editar manualmente:**

```xml
<!-- ios/App/App/App.entitlements -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:chat.luisfboff.com</string>
    </array>
</dict>
</plist>
```

---

### 2. Criar apple-app-site-association

Similar ao `assetlinks.json` do Android.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.chatbot.app",
        "paths": ["*"]
      }
    ]
  }
}
```

**Substituir:**
- `TEAM_ID`: Encontre em Xcode → Signing & Capabilities → Team (ex: `A1B2C3D4E5`)
- `com.chatbot.app`: Bundle ID

**Paths:**
- `"*"`: Todos os paths
- `"/chat/*"`: Apenas URLs `/chat/...`
- `"/invite/*"`: Apenas URLs `/invite/...`

---

#### Hospedar apple-app-site-association

Upload para:
```
https://chat.luisfboff.com/.well-known/apple-app-site-association
```

**Importante:**
- HTTPS obrigatório
- **SEM extensão** `.json` (exatamente `apple-app-site-association`)
- Content-Type: `application/json`

**Verificar:**
```bash
curl https://chat.luisfboff.com/.well-known/apple-app-site-association
# Deve retornar JSON acima
```

**Testar verificação:**
- [Apple App Site Association Validator](https://branch.io/resources/aasa-validator/)

---

### 3. Sync e Rebuild

```bash
npx cap sync ios
# Xcode → Build (Cmd + B)
# Run no device (Cmd + R)
```

---

## Código de Implementação

### Capacitor App Plugin

```bash
# Já incluído no Capacitor, não precisa instalar
```

---

### Listener de Deep Links

```typescript
// src/lib/deepLinking.ts
'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export const initDeepLinking = () => {
  if (!Capacitor.isNativePlatform()) return

  // Listener para app aberto via deep link
  App.addListener('appUrlOpen', (data) => {
    console.log('App opened with URL:', data.url)
    handleDeepLink(data.url)
  })

  // Verificar se app foi aberto via deep link (iOS)
  App.getLaunchUrl().then((result) => {
    if (result?.url) {
      console.log('App launched with URL:', result.url)
      handleDeepLink(result.url)
    }
  })
}

const handleDeepLink = (url: string) => {
  try {
    // Parse URL
    const urlObj = new URL(url)
    const path = urlObj.pathname

    console.log('Deep link path:', path)

    // Rotas
    if (path.startsWith('/chat/')) {
      const chatId = path.split('/')[2]
      navigateToChat(chatId)
    } else if (path.startsWith('/invite/')) {
      const inviteCode = path.split('/')[2]
      navigateToInvite(inviteCode)
    } else {
      // Default: Home
      navigateToHome()
    }
  } catch (error) {
    console.error('Erro ao processar deep link:', error)
    navigateToHome()
  }
}

const navigateToChat = (chatId: string) => {
  console.log('Navegar para chat:', chatId)
  window.location.href = `/dashboard/chat/${chatId}`
}

const navigateToInvite = (inviteCode: string) => {
  console.log('Navegar para invite:', inviteCode)
  window.location.href = `/invite/${inviteCode}`
}

const navigateToHome = () => {
  window.location.href = '/dashboard'
}
```

---

### Inicializar no App

```typescript
// src/app/layout.tsx
'use client'

import { useEffect } from 'react'
import { initDeepLinking } from '@/lib/deepLinking'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initDeepLinking()
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

---

### Exemplo com React Router (Next.js App Router)

```typescript
// src/lib/deepLinking.ts (versão Next.js)
import { useRouter } from 'next/navigation'

export const useDeepLinking = () => {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleDeepLink = (url: string) => {
      const urlObj = new URL(url)
      const path = urlObj.pathname

      // Next.js router push
      router.push(path)
    }

    App.addListener('appUrlOpen', (data) => {
      handleDeepLink(data.url)
    })

    App.getLaunchUrl().then((result) => {
      if (result?.url) handleDeepLink(result.url)
    })
  }, [router])
}

// Uso em layout
const MyLayout = ({ children }) => {
  useDeepLinking()
  return <div>{children}</div>
}
```

---

## Testing

### Testar App Links (Android)

#### 1. Via adb (CLI)

```bash
# Custom URL scheme
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app

# App Link (HTTPS)
adb shell am start -a android.intent.action.VIEW -d "https://chat.luisfboff.com/chat/123" com.chatbot.app

# Verificar intent-filter reconhecido
adb shell dumpsys package com.chatbot.app | findstr -i "filter"
```

**Verificação:**
- [ ] App abre
- [ ] Listener `appUrlOpen` dispara
- [ ] Console mostra URL correta
- [ ] Navegação para tela correta

---

#### 2. Via Email/SMS

1. Envie email/SMS para device com link:
   - `https://chat.luisfboff.com/chat/123`
2. Clique no link
3. App deve abrir diretamente (sem dialog)

**Nota:** Se aparecer dialog "Abrir com...", verificar:
- `assetlinks.json` está correto e acessível
- `android:autoVerify="true"` está no intent-filter
- SHA256 fingerprint match

---

#### 3. Via QR Code

1. Gere QR code com URL: `https://chat.luisfboff.com/chat/123`
   - [QR Code Generator](https://www.qr-code-generator.com/)
2. Scan com câmera do device
3. Toque na notificação
4. App deve abrir

---

### Testar Universal Links (iOS - macOS)

#### 1. Via Notes App

1. Abra Notes app no iPhone
2. Digite URL: `https://chat.luisfboff.com/chat/123`
3. **Long press** no link → **Open in "ChatBot Oficial"**
4. App deve abrir

**Nota:** Tap rápido pode abrir Safari (comportamento iOS).

---

#### 2. Via Safari

1. Abra Safari
2. Navegue para: `https://chat.luisfboff.com/chat/123`
3. Banner deve aparecer: "Abrir no app ChatBot Oficial"
4. Toque → App abre

---

#### 3. Verificar Association

```bash
# Verificar se iOS reconhece association
# (apenas macOS com simulador)
xcrun simctl openurl booted "https://chat.luisfboff.com/chat/123"
```

---

## Troubleshooting

### ❌ Android: Dialog "Abrir com..." Aparece

**Causa:** App Link não verificado (cai para deep link genérico).

**Soluções:**

1. **Verificar assetlinks.json:**
```bash
curl https://chat.luisfboff.com/.well-known/assetlinks.json
# Deve retornar JSON válido
```

2. **SHA256 fingerprint correto:**
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
# Copie SHA256 exato (com : separadores)
```

3. **android:autoVerify="true":**
```xml
<intent-filter android:autoVerify="true">
```

4. **Reinstalar app:**
```bash
adb uninstall com.chatbot.app
# Rebuild e reinstalar
```

Android verifica assetlinks.json na primeira instalação.

---

### ❌ iOS: Link Abre Safari em Vez do App

**Causas:**

1. **apple-app-site-association não acessível:**
```bash
curl https://chat.luisfboff.com/.well-known/apple-app-site-association
# Deve retornar JSON (sem .json extension!)
```

2. **Team ID errado:**
- Verificar em Xcode → Signing → Team
- Formato: `TEAM_ID.com.chatbot.app`

3. **Associated Domains não configurado:**
- Xcode → Signing & Capabilities → Associated Domains
- Deve ter: `applinks:chat.luisfboff.com`

4. **Cache do iOS:**
```bash
# Deletar app
# Reiniciar device
# Reinstalar
```

iOS cacheia associations, reinstalar força revalidação.

---

### ❌ Listener Não Dispara

**Causa:** Listener não registrado antes do deep link.

**Solução:**
```typescript
// Registrar listener o mais cedo possível
useEffect(() => {
  initDeepLinking() // Antes de qualquer navegação
}, [])
```

---

### ❌ Custom URL Scheme Funciona, App Link Não

**Causa:** Verificação de domínio falhou.

**Debug:**
```bash
# Android
adb shell dumpsys package com.chatbot.app | findstr -i "verified"

# Deve mostrar:
# Domain verification state:
#   chat.luisfboff.com: verified
```

Se não aparecer "verified", verificar assetlinks.json.

---

## Recursos Externos

- [Android App Links Docs](https://developer.android.com/training/app-links)
- [iOS Universal Links Docs](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Capacitor App Plugin](https://capacitorjs.com/docs/apis/app#addlistenerappurlopen-)
- [Google Digital Asset Links](https://developers.google.com/digital-asset-links/tools/generator)
- [Branch AASA Validator](https://branch.io/resources/aasa-validator/)

---

## Exemplo Completo

### Workflow

```bash
# 1. Configurar AndroidManifest.xml (intent-filter)
# 2. Gerar SHA256 fingerprint
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android

# 3. Criar assetlinks.json
# 4. Upload para https://chat.luisfboff.com/.well-known/assetlinks.json

# 5. (iOS) Configurar Associated Domains no Xcode
# 6. Criar apple-app-site-association
# 7. Upload para https://chat.luisfboff.com/.well-known/apple-app-site-association

# 8. Implementar listener no código
# src/lib/deepLinking.ts

# 9. Rebuild e testar
npm run build:mobile
npm run cap:sync
npm run cap:open:android

# 10. Testar via adb
adb shell am start -a android.intent.action.VIEW -d "https://chat.luisfboff.com/chat/123" com.chatbot.app
```

---

**Status:** Phase 3 (planejado)

**Próximos Passos:**
- Deploy para lojas: [DEPLOY.md](./DEPLOY.md)
- Push notifications: [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`
