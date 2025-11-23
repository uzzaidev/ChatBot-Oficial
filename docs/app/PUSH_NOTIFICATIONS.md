# Push Notifications

Guia para implementar push notifications usando Firebase Cloud Messaging (Android) e APNs (iOS).

## 📋 Table of Contents

- [Overview](#overview)
- [Firebase Setup (Android)](#firebase-setup-android)
- [APNs Setup (iOS - macOS)](#apns-setup-ios---macos)
- [Capacitor Plugin Installation](#capacitor-plugin-installation)
- [Código de Implementação](#código-de-implementação)
- [Backend Integration (Supabase Edge Function)](#backend-integration-supabase-edge-function)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

### O Que São Push Notifications?

Mensagens enviadas do servidor para o app mobile, mesmo quando o app está fechado.

**Casos de uso:**
- Nova mensagem no chat
- Atendimento transferido para humano
- Atualizações de status
- Lembretes/alertas

---

### Plataformas

| Plataforma | Serviço | Requer |
|------------|---------|--------|
| Android | Firebase Cloud Messaging (FCM) | Projeto Firebase |
| iOS | Apple Push Notification service (APNs) | Apple Developer Account (pago) |

---

### Fluxo Geral

```
1. App registra device token → Firebase/APNs
2. Backend salva token no banco (user_id → token)
3. Evento acontece (nova mensagem)
4. Backend envia notificação → Firebase/APNs
5. Firebase/APNs entrega → Device
6. App mostra notificação
```

---

## Firebase Setup (Android)

### 1. Criar Projeto Firebase

1. Acesse: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Clique **Add project**
3. Nome: `ChatBot Oficial` (ou qualquer nome)
4. Desabilite Google Analytics (opcional para push)
5. Clique **Create project**

**Tempo:** 1-2 minutos

---

### 2. Adicionar App Android

1. No Firebase Console → **Project Overview** → **Add app** → **Android**
2. **Android package name**: `com.chatbot.app` (match com `capacitor.config.ts`)
3. **App nickname**: `ChatBot Android`
4. **Debug signing certificate SHA-1**: (opcional agora, necessário para Firebase Auth)
5. Clique **Register app**

---

### 3. Baixar google-services.json

1. Baixe `google-services.json`
2. Mova para: `android/app/google-services.json`

```bash
# PowerShell
Move-Item ~/Downloads/google-services.json android/app/
```

**Verificação:**
```bash
dir android\app\google-services.json
# Deve existir
```

---

### 4. Configurar build.gradle

#### android/build.gradle (project-level)

```gradle
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'com.google.gms:google-services:4.4.0'  // Adicionar
    }
}
```

#### android/app/build.gradle (app-level)

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // Adicionar no final

android {
    // ...
}

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'  // Adicionar
    // outras dependências...
}
```

---

### 5. Sync Gradle

```bash
# Android Studio
# File → Sync Project with Gradle Files

# Ou via CLI
cd android
.\gradlew build
```

**Verificação:**
- [ ] Gradle sync completa sem erros
- [ ] `google-services.json` reconhecido

---

## APNs Setup (iOS - macOS)

### 1. Apple Developer Account

**Requisito:** Apple Developer Program ($99/ano)

1. Acesse: [https://developer.apple.com/programs/](https://developer.apple.com/programs/)
2. Inscreva-se (requer pagamento)
3. Aguarde aprovação (1-2 dias)

---

### 2. Criar App ID

1. [Apple Developer Console](https://developer.apple.com/account/) → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+** (Adicionar)
3. **App IDs** → **Continue**
4. Configurações:
   - **Description**: ChatBot Oficial
   - **Bundle ID**: `com.chatbot.app` (Explicit)
   - **Capabilities**: Marque **Push Notifications**
5. **Register**

---

### 3. Criar APNs Certificate

1. **Certificates** → **+** (Adicionar)
2. **Apple Push Notification service SSL (Sandbox & Production)**
3. Selecione App ID criado (`com.chatbot.app`)
4. **Create a Certificate Signing Request (CSR)**:
   - Abra **Keychain Access** (Mac)
   - Keychain Access → Certificate Assistant → Request Certificate from CA
   - Email: seu email
   - Common Name: ChatBot Push
   - Save to disk → Continue
5. Upload CSR → **Continue**
6. Download certificado (`.cer`)

---

### 4. Instalar Certificado (Mac)

1. Duplo-clique no `.cer` baixado
2. Keychain Access abre e instala
3. Keychain Access → **Certificates** → Localize "Apple Push Services: com.chatbot.app"
4. Clique direito → **Export**
5. Formato: **Personal Information Exchange (.p12)**
6. Senha: (crie uma senha segura)
7. Salve como `apns-cert.p12`

---

### 5. Upload para Firebase (Opcional)

Se usar Firebase para iOS também (recomendado para unificar backend):

1. Firebase Console → **Project Settings** → **Cloud Messaging**
2. **iOS app configuration** → **APNs Certificates** → **Upload**
3. Upload `apns-cert.p12` e senha

---

## Capacitor Plugin Installation

### 1. Instalar Plugin

```bash
npm install @capacitor/push-notifications
npx cap sync
```

---

### 2. Configurar Permissões (Android)

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>  <!-- Android 13+ -->
    <uses-permission android:name="android.permission.INTERNET"/>

    <application>
        <!-- ... -->
    </application>
</manifest>
```

---

### 3. Configurar Permissões (iOS)

```xml
<!-- ios/App/App/Info.plist -->
<dict>
    <!-- Adicionar antes de </dict> -->
    <key>UIBackgroundModes</key>
    <array>
        <string>remote-notification</string>
    </array>
</dict>
```

Xcode:
1. Abrir projeto: `npx cap open ios`
2. **Signing & Capabilities** → **+ Capability** → **Push Notifications**

---

## Código de Implementação

### Setup Inicial

```typescript
// src/lib/pushNotifications.ts
'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications apenas em mobile')
    return
  }

  // Verificar permissão
  const permissionStatus = await PushNotifications.checkPermissions()

  if (permissionStatus.receive === 'prompt') {
    // Solicitar permissão
    const result = await PushNotifications.requestPermissions()
    if (result.receive !== 'granted') {
      console.log('Permissão de notificação negada')
      return
    }
  }

  // Registrar para push notifications
  await PushNotifications.register()

  // Listeners
  setupListeners()
}

const setupListeners = () => {
  // Token registrado com sucesso
  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value)
    // Salvar token no backend
    saveTokenToBackend(token.value)
  })

  // Erro ao registrar
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Erro ao registrar push:', error)
  })

  // Notificação recebida (app aberto)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notificação recebida:', notification)
    // Mostrar alert ou atualizar UI
    alert(`Nova mensagem: ${notification.body}`)
  })

  // Notificação clicada (app fechado/background)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Notificação clicada:', action)
    // Navegar para tela específica
    const data = action.notification.data
    if (data.chatId) {
      // Abrir chat específico
      window.location.href = `/chat/${data.chatId}`
    }
  })
}

const saveTokenToBackend = async (token: string) => {
  try {
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    if (response.ok) {
      console.log('Token salvo no backend')
    }
  } catch (error) {
    console.error('Erro ao salvar token:', error)
  }
}
```

---

### Inicializar no App

```typescript
// src/app/layout.tsx
'use client'

import { useEffect } from 'react'
import { initPushNotifications } from '@/lib/pushNotifications'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPushNotifications()
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

---

## Backend Integration (Supabase Edge Function)

### 1. Criar Tabela para Tokens

```sql
-- Supabase SQL Editor
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('android', 'ios')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca rápida
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);
```

---

### 2. API Route para Salvar Token

```typescript
// src/app/api/push/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    // Detectar plataforma (simplificado - melhorar com User-Agent)
    const platform = 'android' // ou 'ios'

    // Upsert token (atualiza se já existe)
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'token'
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao registrar token:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

### 3. Enviar Notificação (Firebase Admin SDK)

```typescript
// src/lib/firebase-admin.ts (servidor apenas)
import admin from 'firebase-admin'

// Inicializar (uma vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  try {
    const message = {
      notification: { title, body },
      data: data || {},
      token
    }

    const response = await admin.messaging().send(message)
    console.log('Notificação enviada:', response)
    return { success: true }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return { success: false, error }
  }
}
```

---

### 4. Exemplo: Notificar Nova Mensagem

```typescript
// src/nodes/sendWhatsAppMessage.ts (após enviar mensagem)
import { sendPushNotification } from '@/lib/firebase-admin'
import { createServerClient } from '@/lib/supabase/server'

const notifyUser = async (userId: string, message: string) => {
  const supabase = createServerClient()

  // Buscar tokens do usuário
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) {
    console.log('Usuário sem tokens registrados')
    return
  }

  // Enviar para todos os devices do usuário
  const promises = tokens.map(({ token }) =>
    sendPushNotification(
      token,
      'Nova Mensagem',
      message,
      { chatId: '123', type: 'new_message' }
    )
  )

  await Promise.all(promises)
}
```

---

## Testing

### Testar no Device

1. **Build e instalar app**:
```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
# Run no device físico (emulador pode não receber push)
```

2. **Aceitar permissão de notificação**

3. **Verificar token no console**:
```javascript
// Chrome DevTools (chrome://inspect)
// Console deve mostrar: "Push token: fA3G..."
```

4. **Enviar notificação teste via Firebase Console**:
   - Firebase Console → **Cloud Messaging**
   - **Send your first message**
   - Título: "Teste"
   - Corpo: "Notificação de teste"
   - **Send test message**
   - Cole o token do console
   - **Test**

5. **Verificar notificação aparece no device**

---

### Testar com cURL (Backend)

```bash
# Enviar via Firebase REST API
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_TOKEN",
    "notification": {
      "title": "Nova Mensagem",
      "body": "Você recebeu uma nova mensagem"
    },
    "data": {
      "chatId": "123"
    }
  }'
```

**Obter Server Key:**
Firebase Console → Project Settings → Cloud Messaging → Server key

---

## Troubleshooting

### ❌ Token Não Registra

**Sintomas:** Listener `registration` nunca dispara.

**Soluções:**

1. **Permissão negada:**
```typescript
const result = await PushNotifications.requestPermissions()
console.log('Permissão:', result.receive) // Deve ser 'granted'
```

2. **Google Services não configurado:**
```bash
# Verificar google-services.json existe
dir android\app\google-services.json

# Verificar build.gradle tem plugin
# apply plugin: 'com.google.gms.google-services'
```

3. **Emulador (não suporta FCM):**
- Use device físico com Google Play Services

---

### ❌ Notificação Não Aparece

**Causas:**

1. **Token inválido/expirado:**
- Tokens podem expirar, re-registrar ao abrir app

2. **App em foreground:**
- Notificação não aparece automaticamente quando app está aberto
- Use `pushNotificationReceived` listener para mostrar in-app notification

3. **Canal de notificação (Android 8.0+):**
```typescript
// Criar canal de notificação (Android)
import { LocalNotifications } from '@capacitor/local-notifications'

const createNotificationChannel = async () => {
  await LocalNotifications.createChannel({
    id: 'chatbot',
    name: 'ChatBot Notifications',
    importance: 5, // IMPORTANCE_HIGH
    sound: 'default',
    vibration: true
  })
}
```

---

### ❌ iOS Não Recebe Notificações

**Soluções:**

1. **APNs certificate não configurado:**
- Verificar Firebase Console → Cloud Messaging → APNs certificate uploaded

2. **Capability não adicionada:**
- Xcode → Signing & Capabilities → Push Notifications (marque)

3. **Device não permite notificações:**
- Settings → ChatBot Oficial → Notifications → Allow

4. **Sandbox vs Production:**
- Development build usa APNs Sandbox
- Production build usa APNs Production
- Certificado deve corresponder

---

### ❌ "MismatchSenderId"

**Erro:** Token registrado com projeto Firebase diferente.

**Solução:**
- Deletar app do device
- Limpar cache: Settings → Apps → ChatBot → Storage → Clear Data
- Reinstalar
- Re-registrar token

---

## Recursos Externos

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [APNs Overview](https://developer.apple.com/documentation/usernotifications)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**Status:** Phase 3 (planejado)

**Próximos Passos:**
- Implementar deep linking: [DEEP_LINKING.md](./DEEP_LINKING.md)
- Deploy para lojas: [DEPLOY.md](./DEPLOY.md)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`
