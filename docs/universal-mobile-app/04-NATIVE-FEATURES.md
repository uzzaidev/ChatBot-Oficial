# 04 — Features Nativas (código reutilizável)

> Padrões de código prontos para copiar, extraídos do UzzApp. São o que dá **"valor nativo"** ao app — essencial para aprovação na App Store (Guideline 4.2) e para a experiência do usuário.
>
> Todos seguem a mesma regra de ouro: **detectar a plataforma e degradar graciosamente na web.**

---

## 0. A regra de ouro: detecção de plataforma

Todo código nativo deve ser guardado por `Capacitor.isNativePlatform()`, para que o mesmo codebase rode na web (browser) e no app (WebView) sem quebrar.

```ts
import { Capacitor } from '@capacitor/core'

if (!Capacitor.isNativePlatform()) {
  return  // estamos na web — pula a API nativa
}

const platform = Capacitor.getPlatform()  // 'ios' | 'android' | 'web'
```

> Como o app (Estratégia B) carrega o **mesmo** site da web, esse guard é o que permite ter UM código que funciona nos dois ambientes.

---

## 1. Push Notifications

### Plugin
`@capacitor/push-notifications` + **Firebase Cloud Messaging** (Android) / **APNs** (iOS).

### Fluxo
```
App registra device → recebe token → salva token no backend (associado ao user)
Backend → FCM/APNs → device → app recebe/abre notificação
```

### Implementação (referência: `src/lib/pushNotifications.ts`)

```ts
'use client'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return        // só mobile

  // 1. Permissão (Android 13+ e iOS exigem)
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return

  // 2. Registrar no serviço de push
  await PushNotifications.register()

  // 3. Listeners
  PushNotifications.addListener('registration', async (token) => {
    await saveTokenToBackend(token.value)          // POST p/ seu backend
  })
  PushNotifications.addListener('registrationError', (err) => { /* log */ })
  PushNotifications.addListener('pushNotificationReceived', (n) => {
    // app em foreground — atualize UI ou mostre notificação custom
  })
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // usuário tocou na notificação — navegue para a tela certa
    const data = action.notification.data
    if (data.phone) window.location.href = `/dashboard/chat?phone=${data.phone}`
  })
}

const saveTokenToBackend = async (token: string) => {
  const platform = Capacitor.getPlatform()  // 'android' | 'ios'
  // upsert { user_id, token, platform } na sua tabela push_tokens
}
```

Chame `initPushNotifications()` **uma vez no startup** (ex.: no layout raiz / provider).

### Backend: tabela de tokens (exemplo Supabase/Postgres)

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,          -- 'android' | 'ios'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
```

### Setup por plataforma
- **Android:** Firebase project → `google-services.json` em `android/app/` → deps `firebase-bom` + `firebase-messaging` no `build.gradle` (ver [02-ANDROID-PLAYSTORE.md](./02-ANDROID-PLAYSTORE.md#parte-d--push-notifications-firebase)).
- **iOS:** capability **Push Notifications** no Xcode + `UIBackgroundModes: remote-notification` no Info.plist + **APNs key (.p8)** subida no Firebase (se usar FCM no iOS).

### Envio (backend → FCM HTTP v1)
Use uma **Service Account** do Firebase e a API HTTP v1 (`https://fcm.googleapis.com/v1/projects/PROJECT_ID/messages:send`) com um Bearer token OAuth2. Envie `{ message: { token, notification: { title, body }, data: {...} } }`.

---

## 2. Autenticação Biométrica (Face ID / Touch ID / Fingerprint)

### Plugin
`@aparajita/capacitor-biometric-auth`

### Implementação (referência: `src/lib/biometricAuth.ts`)

```ts
'use client'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { Capacitor } from '@capacitor/core'

// Checar disponibilidade
export async function checkBiometricAvailability() {
  if (!Capacitor.isNativePlatform()) return { available: false }
  try {
    const r = await BiometricAuth.checkBiometry()
    return { available: r.isAvailable, type: String(r.biometryType).toLowerCase() }
  } catch {
    return { available: false }
  }
}

// Autenticar
export async function authenticateWithBiometric() {
  if (!Capacitor.isNativePlatform()) return { success: false, error: 'Só em mobile' }
  try {
    await BiometricAuth.authenticate({
      reason: 'Autentique-se para acessar o app',
      allowDeviceCredential: true,   // fallback p/ PIN/padrão do device
    })
    return { success: true }          // sem exception = sucesso
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erro ao autenticar' }
  }
}
```

### Setup por plataforma
- **iOS:** `NSFaceIDUsageDescription` no Info.plist (senão crash/rejeição).
- **Android:** permissões `USE_BIOMETRIC` (e `USE_FINGERPRINT` p/ API ≤ 28) no Manifest.

> **Padrão UX:** guarde a preferência (`localStorage`) de "biometria ativada" + o e-mail do usuário, e ofereça o botão biométrico na tela de login só se `checkBiometricAvailability()` retornar `available`.

---

## 3. Deep Linking (Custom Scheme + App/Universal Links)

### Plugin
`@capacitor/app` (eventos de URL).

### Implementação (referência: `src/lib/deepLinking.ts`)

```ts
'use client'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export const initDeepLinking = () => {
  if (!Capacitor.isNativePlatform()) return

  // App já aberto recebe um link
  App.addListener('appUrlOpen', (data) => handleDeepLink(data.url))

  // App aberto a partir de um link (cold start — iOS)
  App.getLaunchUrl().then((r) => { if (r?.url) handleDeepLink(r.url) }).catch(() => {})
}

const handleDeepLink = (url: string) => {
  const { pathname } = new URL(url)   // seuapp://chat/123 OU https://app.suaempresa.com/chat/123
  if (pathname.startsWith('/chat/')) {
    const id = pathname.split('/').pop()
    window.location.href = `/dashboard/chat/${id}`
  } else {
    window.location.href = '/dashboard'
  }
}
```

> Use `window.location.href` (não o router do framework) para garantir navegação correta quando o app abre via deep link a partir de estado morto.

### Dois tipos de link

| Tipo | Exemplo | Setup |
|------|---------|-------|
| **Custom scheme** | `seuapp://chat/123` | Android: `<data android:scheme="seuapp"/>` no Manifest. iOS: `CFBundleURLSchemes` no Info.plist. Funciona sempre, mas qualquer app pode reivindicar o scheme. |
| **App Links (Android) / Universal Links (iOS)** | `https://app.suaempresa.com/chat/123` | Exige **verificação de domínio** (arquivos hospedados abaixo). Mais seguro e abre o app a partir de links HTTPS reais. |

### Verificação de domínio (para App/Universal Links)

**Android** — hospedar em `https://app.suaempresa.com/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.suaempresa.seuapp",
    "sha256_cert_fingerprints": ["SEU:SHA256:DO:KEYSTORE:..."]
  }
}]
```
(o `sha256` vem de `keytool -list -v -keystore release.keystore`; e `android:autoVerify="true"` no intent-filter HTTPS).

**iOS** — hospedar em `https://app.suaempresa.com/.well-known/apple-app-site-association` (JSON, sem extensão, servido como `application/json`):
```json
{ "applinks": { "details": [{ "appID": "TEAMID.com.suaempresa.seuapp", "paths": ["*"] }] } }
```
+ capability **Associated Domains** no Xcode (`applinks:app.suaempresa.com`).

---

## 4. Status Bar & Splash Screen

Configurados declarativamente no `capacitor.config.ts` (ver [01-CAPACITOR-SETUP.md](./01-CAPACITOR-SETUP.md)):

```ts
plugins: {
  SplashScreen: { launchShowDuration: 2000, backgroundColor: '#ffffff', showSpinner: false },
  StatusBar:    { style: 'LIGHT', backgroundColor: '#000000' },
}
```

Para controle dinâmico em runtime (ex.: mudar cor da status bar por tela):
```ts
import { StatusBar, Style } from '@capacitor/status-bar'
if (Capacitor.isNativePlatform()) {
  await StatusBar.setStyle({ style: Style.Dark })
}
```

---

## 5. Câmera e Galeria

### Plugin
`@capacitor/camera`

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const photo = await Camera.getPhoto({
  quality: 90,
  resultType: CameraResultType.Uri,
  source: CameraSource.Prompt,   // deixa o usuário escolher câmera ou galeria
})
// photo.webPath → exibir; ou ler o arquivo p/ upload
```

Setup: descrições no Info.plist (`NSCameraUsageDescription`, `NSPhotoLibrary*`) e permissão `CAMERA` no Manifest Android.

---

## 6. Rede / Conectividade

### Plugin
`@capacitor/network` — útil na Estratégia B (remote URL) para detectar offline e mostrar aviso.

```ts
import { Network } from '@capacitor/network'

const status = await Network.getStatus()   // { connected, connectionType }
Network.addListener('networkStatusChange', (s) => {
  if (!s.connected) { /* mostrar tela "sem conexão" */ }
})
```

---

## Resumo: o que adiciona "valor nativo" (anti-rejeição 4.2)

| Feature | Plugin | Impacto |
|---------|--------|---------|
| Push notifications | `@capacitor/push-notifications` | 🟢 Forte sinal nativo |
| Biometria | `@aparajita/capacitor-biometric-auth` | 🟢 Forte sinal nativo |
| Deep / Universal Links | `@capacitor/app` | 🟢 Integração com SO |
| Câmera/galeria | `@capacitor/camera` | 🟢 Hardware do device |
| Status bar / splash nativos | `@capacitor/status-bar` | 🟡 Polish |
| Detecção de rede | `@capacitor/network` | 🟡 UX offline |

➡️ Próximo: **[05-LAUNCH-CHECKLISTS.md](./05-LAUNCH-CHECKLISTS.md)**
