# Mobile Development Workflow

Guia de desenvolvimento diário para features mobile usando Capacitor.

## 📋 Table of Contents

- [Comandos Essenciais](#comandos-essenciais)
- [Workflow - Adicionar Nova Feature](#workflow---adicionar-nova-feature)
- [Live Reload (Desenvolvimento Rápido)](#live-reload-desenvolvimento-rápido)
- [Detectar Plataforma no Código](#detectar-plataforma-no-código)
- [Estrutura de Código - Mobile vs Web](#estrutura-de-código---mobile-vs-web)
- [Limitações do Mobile Build](#limitações-do-mobile-build)
- [Debug e Logs](#debug-e-logs)
- [Boas Práticas](#boas-práticas)
- [Troubleshooting Rápido](#troubleshooting-rápido)
- [Próximos Passos](#próximos-passos)

---

## Comandos Essenciais

### Build e Deploy Completo

```bash
# 1. Build estático Next.js
npm run build:mobile

# 2. Sincronizar com plataformas nativas
npm run cap:sync

# 3. Abrir Android Studio
npm run cap:open:android

# 4. No Android Studio: Shift + F10 (Run)
```

**Tempo total**: 2-4 minutos

---

### Comandos Individuais

```bash
# Apenas build Next.js
npm run build:mobile

# Apenas sync (sem rebuild)
npm run cap:sync

# Sync específico para Android
npx cap sync android

# Sync específico para iOS (macOS)
npx cap sync ios

# Abrir projeto nativo
npm run cap:open:android   # Android Studio
npx cap open ios           # Xcode (macOS)

# Verificar plugins instalados
npx cap ls

# Atualizar Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest
npx cap sync
```

---

### Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "doppler run --config dev -- cross-env CAPACITOR_BUILD=true next build",
    "build:mobile:stg": "doppler run --config stg -- cross-env CAPACITOR_BUILD=true next build",
    "build:mobile:prd": "doppler run --config prd -- cross-env CAPACITOR_BUILD=true next build",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android",
    "cap:open:ios": "npx cap open ios"
  }
}
```

**Notas**:

- `CAPACITOR_BUILD=true` ativa export estático via `next.config.js`
- `doppler run --config <env>` injeta environment variables do Doppler
- Três ambientes disponíveis: `dev`, `stg` (staging), `prd` (produção)

---

## Workflow - Adicionar Nova Feature

### Passo 1: Desenvolver na Web

Desenvolva e teste a feature no ambiente web primeiro (mais rápido):

```bash
# Iniciar dev server
npm run dev

# Abrir http://localhost:3000
# Fazer mudanças no código
# Testar no browser (F12 DevTools)
```

**Vantagens:**

- Hot reload instantâneo
- DevTools completo
- Sem rebuild mobile

**Quando usar:** 90% do desenvolvimento

---

### Passo 2: Testar Lógica Mobile-Specific

Se a feature usa plugins Capacitor (câmera, geolocalização, etc.):

```typescript
// src/components/ExampleFeature.tsx
"use client";

import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

const takePhoto = async () => {
  if (!Capacitor.isNativePlatform()) {
    alert("Funcionalidade disponível apenas no app mobile");
    return;
  }

  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: "uri",
  });

  console.log("Photo URI:", image.webPath);
};
```

**Checklist:**

- [ ] Função funciona na web (com fallback)
- [ ] Lógica mobile isolada com `Capacitor.isNativePlatform()`
- [ ] Tratamento de erro implementado

---

### Passo 3: Build para Mobile

```bash
# Build + sync + open (sequência completa)
npm run build:mobile && npm run cap:sync && npm run cap:open:android
```

**O que acontece:**

1. Next.js gera build estático em `out/`
2. Capacitor copia arquivos para `android/app/src/main/assets/public/`
3. Android Studio abre o projeto

**Tempo**: 30-60 segundos

---

### Passo 4: Testar no Emulador/Device

No Android Studio:

1. Selecione dispositivo (emulador ou físico)
2. Clique ▶️ **Run 'app'** (ou `Shift + F10`)
3. Aguarde instalação (15-30s)
4. Teste a feature no app

**Verificação:**

- [ ] Feature aparece no app
- [ ] Funciona como esperado
- [ ] Sem crashes ou erros

**Troubleshooting:**

- Mudança não aparece → Rebuild + sync novamente
- App crasha → Verifique Logcat (aba inferior Android Studio)

---

### Passo 5: Iterar (Mudanças Rápidas)

Para mudanças pequenas após primeira build:

```bash
# Apenas rebuild e sync (não precisa abrir Android Studio novamente)
npm run build:mobile && npm run cap:sync

# No Android Studio: Shift + F10 (Run)
```

**Dica**: Mantenha Android Studio aberto durante desenvolvimento mobile ativo.

---

## Live Reload (Desenvolvimento Rápido)

Para iteração ultra-rápida, configure live reload apontando o app mobile para seu dev server local.

### Setup Live Reload

#### 1. Descobrir seu IP local

```bash
# PowerShell
ipconfig | findstr IPv4

# Exemplo de output:
# IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Anote o IP (ex: `192.168.1.100`)

---

#### 2. Modificar capacitor.config.ts

```typescript
// capacitor.config.ts
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chatbot.app",
  appName: "ChatBot Oficial",
  webDir: "out",

  // ADICIONE ESTA SEÇÃO (apenas para desenvolvimento)
  server: {
    url: "http://192.168.1.100:3000", // SEU IP:3000
    cleartext: true, // Permite HTTP (não-HTTPS)
  },
};

export default config;
```

**IMPORTANTE**: Remova `server` antes de buildar para produção!

---

#### 3. Iniciar Dev Server

```bash
npm run dev
```

Servidor roda em `http://192.168.1.100:3000` (acessível na rede local)

---

#### 4. Sync e Run

```bash
npx cap sync android
npm run cap:open:android
# No Android Studio: Shift + F10
```

**O que acontece:**

- App mobile conecta ao dev server via WiFi
- Mudanças no código refletem instantaneamente (hot reload)
- Sem necessidade de rebuild mobile

**Requisitos:**

- [ ] Computador e device/emulador na mesma rede WiFi
- [ ] Firewall permite porta 3000
- [ ] IP configurado corretamente

**Verificação:**

- Faça mudança em componente React
- Salve arquivo
- App mobile atualiza automaticamente (1-2s)

---

#### 5. Desativar Live Reload (Produção)

Antes de buildar para produção, **remova** a seção `server`:

```typescript
// capacitor.config.ts (PRODUÇÃO)
const config: CapacitorConfig = {
  appId: "com.chatbot.app",
  appName: "ChatBot Oficial",
  webDir: "out",
  // NÃO INCLUIR server: {...} em produção!
};
```

Rebuild:

```bash
npm run build:mobile
npm run cap:sync
```

---

## Detectar Plataforma no Código

### Verificar se Está no Mobile

```typescript
import { Capacitor } from "@capacitor/core";

// Simples boolean
if (Capacitor.isNativePlatform()) {
  console.log("Rodando no mobile (Android/iOS)");
} else {
  console.log("Rodando no browser (web)");
}

// Plataforma específica
const platform = Capacitor.getPlatform();
// Retorna: 'web' | 'android' | 'ios'

if (platform === "android") {
  console.log("Android");
} else if (platform === "ios") {
  console.log("iOS");
}
```

---

### Exemplo: Feature com Fallback

```typescript
"use client";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

const handleShare = async () => {
  const shareData = {
    title: "ChatBot Oficial",
    text: "Confira este chatbot incrível!",
    url: "https://uzzap.uzzai.com",
  };

  if (Capacitor.isNativePlatform()) {
    // Mobile: Usar plugin nativo
    await Share.share({
      title: shareData.title,
      text: shareData.text,
      url: shareData.url,
      dialogTitle: "Compartilhar",
    });
  } else {
    // Web: Usar Web Share API ou fallback
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copiar link
      navigator.clipboard.writeText(shareData.url);
      alert("Link copiado para clipboard!");
    }
  }
};
```

---

### Exemplo: Conditional Import

```typescript
"use client";

import { Capacitor } from "@capacitor/core";
import { useState, useEffect } from "react";

const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const loadDeviceInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        const { Device } = await import("@capacitor/device");
        const info = await Device.getInfo();
        setDeviceInfo(info);
      } else {
        setDeviceInfo({ platform: "web" });
      }
    };

    loadDeviceInfo();
  }, []);

  return deviceInfo;
};

// Uso
const MyComponent = () => {
  const deviceInfo = useDeviceInfo();

  return (
    <div>
      <p>Platform: {deviceInfo?.platform}</p>
      <p>OS Version: {deviceInfo?.osVersion || "N/A"}</p>
    </div>
  );
};
```

---

## Estrutura de Código - Mobile vs Web

### Organização de Arquivos

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rotas autenticadas
│   ├── dashboard/         # Dashboard (mobile + web)
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── ui/                # shadcn/ui (shared)
│   ├── mobile/            # Componentes mobile-specific
│   │   ├── CameraCapture.tsx
│   │   ├── PushNotifications.tsx
│   │   └── DeepLinking.tsx
│   └── web/               # Componentes web-specific
│       ├── AdminPanel.tsx
│       └── Analytics.tsx
│
├── lib/
│   ├── capacitor/         # Wrappers de plugins Capacitor
│   │   ├── camera.ts
│   │   ├── share.ts
│   │   └── storage.ts
│   └── utils.ts
│
└── hooks/
    ├── usePlatform.ts     # Hook para detectar plataforma
    └── useCapacitor.ts    # Hooks de plugins
```

---

### Exemplo: usePlatform Hook

```typescript
// src/hooks/usePlatform.ts
"use client";

import { Capacitor } from "@capacitor/core";
import { useState, useEffect } from "react";

export const usePlatform = () => {
  const [platform, setPlatform] = useState<"web" | "android" | "ios">("web");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const currentPlatform = Capacitor.getPlatform() as
      | "web"
      | "android"
      | "ios";
    setPlatform(currentPlatform);
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return { platform, isNative, isWeb: !isNative };
};

// Uso
const MyComponent = () => {
  const { platform, isNative } = usePlatform();

  return (
    <div>
      {isNative ? (
        <button onClick={handleNativeFeature}>Usar Câmera</button>
      ) : (
        <button onClick={handleWebFeature}>Upload de Arquivo</button>
      )}
    </div>
  );
};
```

---

## Limitações do Mobile Build

### ❌ NÃO Funciona (Static Export)

| Feature                                    | Razão                    | Solução                                |
| ------------------------------------------ | ------------------------ | -------------------------------------- |
| `getServerSideProps`                       | Requer servidor Node.js  | Usar `'use client'` + fetch no cliente |
| `getStaticProps` com `revalidate`          | ISR não suportado        | Dados estáticos ou fetch dinâmico      |
| API Routes (`/api/*`)                      | Requer servidor          | Mover para backend Vercel (separado)   |
| Middleware                                 | Executa no servidor      | Lógica no cliente ou backend           |
| Server Components                          | Requer servidor          | Converter para `'use client'`          |
| Dynamic imports com SSR                    | Renderização server-side | Usar dynamic import client-side        |
| `rewrites`/`redirects` em `next.config.js` | Edge runtime             | Implementar no cliente (Router)        |

---

### ✅ Funciona

| Feature                               | Status                          |
| ------------------------------------- | ------------------------------- |
| Client Components (`'use client'`)    | ✅ Totalmente suportado         |
| React Hooks                           | ✅ Funciona normalmente         |
| Client-side data fetching             | ✅ `useEffect` + fetch/axios    |
| CSS Modules / Tailwind                | ✅ Funciona normalmente         |
| Dynamic routing (`[id]`)              | ✅ Gerado como HTML estático    |
| Environment variables `NEXT_PUBLIC_*` | ✅ Injetado em build-time       |
| Plugins Capacitor                     | ✅ Camera, Storage, Share, etc. |
| Client-side navigation                | ✅ `useRouter()` funciona       |

---

### Exemplo: Conversão de Server Component

**Antes (Server Component - NÃO funciona):**

```typescript
// app/dashboard/page.tsx
import { createServerClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = createServerClient();
  const { data } = await supabase.from("clients").select("*");

  return <div>{data.length} clients</div>;
}
```

**Depois (Client Component - funciona):**

```typescript
// app/dashboard/page.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("clients").select("*");
      setClientCount(data?.length || 0);
    };
    fetchClients();
  }, []);

  return <div>{clientCount} clients</div>;
}
```

---

## Debug e Logs

### Chrome DevTools (Android)

1. Conecte device Android via USB (ou use emulador)
2. Abra Chrome: `chrome://inspect`
3. Localize seu app na lista
4. Clique **Inspect**
5. Acesse console, network, elements, etc.

**Verificação:**

- [ ] App aparece na lista `chrome://inspect`
- [ ] DevTools abre normalmente
- [ ] Console mostra logs do app

---

### Logcat (Android Studio)

1. No Android Studio, aba inferior **Logcat**
2. Filtre por tag: `Capacitor`

```bash
# Via terminal
adb logcat | findstr "Capacitor"

# Filtrar erros
adb logcat *:E | findstr "Capacitor"
```

**Dicas:**

- Procure por `WebView` para erros JavaScript
- Procure por `Capacitor` para logs de plugins

---

### Safari Web Inspector (iOS - macOS)

1. No Mac: Safari → **Develop** → **[Seu Device]** → **[App Name]**
2. Abre Web Inspector
3. Acesse console, network, etc.

**Requisito**: Device iOS conectado via USB, "Web Inspector" habilitado em Settings → Safari → Advanced

---

### Logs no Código

```typescript
// Log específico para mobile
import { Capacitor } from "@capacitor/core";

const logMobile = (...args: any[]) => {
  if (Capacitor.isNativePlatform()) {
    console.log("[MOBILE]", ...args);
  }
};

logMobile("Feature executada");
```

**Produção**: Remova logs ou use biblioteca como `loglevel`.

---

## Boas Práticas

### 1. Sempre Testar em Web Primeiro

```bash
# Desenvolvimento: 90% web, 10% mobile
npm run dev  # Testar feature na web
# Quando estiver funcionando:
npm run build:mobile && npm run cap:sync  # Testar no mobile
```

**Razão**: Hot reload web é 10x mais rápido que rebuild mobile.

---

### 2. Usar Plugins Capacitor Oficiais

```bash
# Preferir plugins @capacitor/*
npm install @capacitor/camera
npm install @capacitor/share
npm install @capacitor/storage

# Evitar plugins Cordova desatualizados
```

**Lista completa**: [https://capacitorjs.com/docs/plugins](https://capacitorjs.com/docs/plugins)

---

### 3. Validar Environment Variables

```typescript
// src/lib/config.ts
"use client";

const validateEnvVars = () => {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
};

// Validar no app startup
if (typeof window !== "undefined") {
  validateEnvVars();
}
```

---

### 4. Fallback para Features Mobile

Todo código mobile deve ter fallback para web:

```typescript
const handleAction = async () => {
  if (Capacitor.isNativePlatform()) {
    // Lógica mobile (plugin nativo)
  } else {
    // Fallback web (API browser ou mensagem)
  }
};
```

---

### 5. Rebuild Completo Periodicamente

```bash
# Limpar build cache (se problemas persistirem)
rm -rf out
rm -rf android/app/src/main/assets/public

# Rebuild completo
npm run build:mobile
npm run cap:sync

# No Android Studio: Build → Clean Project → Rebuild Project
```

**Quando fazer:**

- Mudanças não aparecem no app
- Comportamento estranho após várias iterações
- Após atualizar Capacitor

---

## Troubleshooting Rápido

| Problema                       | Causa                              | Solução                                                           |
| ------------------------------ | ---------------------------------- | ----------------------------------------------------------------- |
| Mudanças não aparecem          | Cache do build                     | Rebuild: `npm run build:mobile && npm run cap:sync`               |
| App crasha ao abrir            | Env vars não configuradas          | Verificar `.env.mobile` e rebuild                                 |
| Plugin não funciona            | Permissões faltando                | Adicionar em `AndroidManifest.xml`                                |
| Live reload não conecta        | IP errado ou firewall              | Verificar IP com `ipconfig`, desabilitar firewall temporariamente |
| Gradle sync falha              | Internet lenta ou cache corrompido | Android Studio → File → Invalidate Caches                         |
| Device não detectado           | USB debugging desabilitado         | Habilitar USB debugging em Developer Options                      |
| Build web funciona, mobile não | Feature usa SSR                    | Converter para `'use client'` com fetch                           |

**Problemas detalhados**: Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Próximos Passos

- **Testar em devices**: [TESTING.md](./TESTING.md)
- **Configurar env vars produção**: [ENV_VARS.md](./ENV_VARS.md)
- **Customizar assets**: [ICONS_SPLASH.md](./ICONS_SPLASH.md)
- **Implementar push notifications**: [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`
