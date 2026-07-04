# 01 — Setup do Capacitor (do zero aos projetos nativos)

> Objetivo: a partir de um web app existente, chegar a ter as pastas `android/` e `ios/` geradas, configuradas e sincronizadas com o build web.

---

## Passo 1 — Instalar dependências

```bash
# Core + CLI
npm install @capacitor/core
npm install -D @capacitor/cli

# Plataformas nativas
npm install @capacitor/android @capacitor/ios

# Plugins nativos (instale só os que for usar)
npm install @capacitor/app @capacitor/status-bar @capacitor/network
npm install @capacitor/push-notifications @capacitor/camera
npm install @aparajita/capacitor-biometric-auth

# Geração de ícones e splash
npm install -D @capacitor/assets
```

> **Versões (referência UzzApp):** mantenha `@capacitor/core`, `@capacitor/android` e `@capacitor/ios` na **mesma major** (7.x). O `@capacitor/cli` pode estar uma major à frente (8.x) sem problema. Plugins seguem versões independentes.

---

## Passo 2 — Inicializar o Capacitor

```bash
npx cap init "NomeDoApp" "com.suaempresa.seuapp" --web-dir=out
```

Isso cria o `capacitor.config.ts`. Edite-o conforme a **estratégia escolhida** (ver README, seção 1).

### Config de referência (Estratégia B — remote URL, como o UzzApp)

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suaempresa.seuapp',     // = bundle id (iOS) = applicationId (Android)
  appName: 'NomeDoApp',
  webDir: 'out',                       // fallback estático

  // Estratégia B: carrega o site de produção ao vivo no WebView.
  // Remova este bloco inteiro para usar Estratégia A (bundle estático).
  server: {
    url: 'https://app.suaempresa.com',
    cleartext: false,                  // false = só HTTPS (recomendado)
  },

  ios: {
    scheme: 'NomeDoApp',
    contentInset: 'automatic',
    // webContentsDebuggingEnabled: true,  // descomente APENAS em dev
  },

  plugins: {
    CapacitorCookies: { enabled: true },   // cookies compartilhados com o site
    CapacitorHttp:    { enabled: true },   // requests nativos (evita CORS no WebView)
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
};

export default config;
```

> **Sobre `CapacitorCookies` + `CapacitorHttp`:** essenciais na Estratégia B quando o app depende de sessão/autenticação por cookie (caso do UzzApp com Supabase Auth). Eles fazem o WebView e os requests nativos compartilharem o mesmo cookie jar.

---

## Passo 3 — Habilitar static export no framework

Mesmo na Estratégia B, o Capacitor exige um `webDir` com conteúdo. Para Next.js:

```js
// next.config.js
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'

const nextConfig = {
  output: isMobileBuild ? 'export' : undefined,   // gera out/ só no build mobile
  images: {
    unoptimized: isMobileBuild,                    // export não suporta otimização de imagem
    // ...remotePatterns conforme necessário
  },
}

module.exports = nextConfig
```

> **Por que condicional?** Assim o mesmo `next.config.js` serve para o deploy web normal (SSR/API routes na Vercel) **e** para o build mobile (estático). A flag `CAPACITOR_BUILD=true` alterna entre os dois modos.

### Cuidados com static export (Estratégia A, ou para o fallback da B)

- Todas as páginas precisam ser **client-renderable** (`'use client'` no Next App Router).
- **API routes** (`app/api/*`) **não vão** para o bundle estático — na Estratégia B elas continuam rodando no servidor de produção e o app as acessa via `server.url`.
- `getServerSideProps` / Server Components com fetch dinâmico **quebram** o export. Mova lógica de servidor para API routes consumidas via fetch.

---

## Passo 4 — Adicionar as plataformas nativas

```bash
# Build web primeiro (precisa existir out/ antes de adicionar plataformas)
CAPACITOR_BUILD=true npx next build

# Gera a pasta android/
npx cap add android

# Gera a pasta ios/ (somente macOS)
npx cap add ios
```

Isso cria os projetos nativos completos (`android/` e `ios/`) já apontando para o `appId` configurado.

---

## Passo 5 — Scripts de build (package.json)

Padronize os comandos. Referência baseada no UzzApp:

```jsonc
{
  "scripts": {
    "build:mobile":      "cross-env CAPACITOR_BUILD=true next build",
    "cap:sync":          "npx cap sync",
    "cap:open:android":  "npx cap open android",
    "cap:open:ios":      "npx cap open ios"
  }
}
```

> Instale `cross-env` (`npm i -D cross-env`) para a variável de ambiente funcionar igual em Windows e Unix.

### Injeção de variáveis de ambiente no build mobile

O build estático **congela** as variáveis `NEXT_PUBLIC_*` no momento do build (não há servidor lendo `.env` em runtime). Para builds mobile com env separado:

```jsonc
"build:mobile": "cross-env CAPACITOR_BUILD=true dotenv -e .env.mobile next build"
```

(requer `npm i -D dotenv-cli` e um arquivo `.env.mobile`).

> Na Estratégia B, isso importa **apenas** para as `NEXT_PUBLIC_*` que o shell do app precisa antes de carregar o `server.url`. A maior parte da config vive no servidor de produção.

---

## Passo 6 — Ciclo de desenvolvimento diário

```bash
# 1. Rebuild do web
npm run build:mobile

# 2. Sincronizar para nativo (copia out/ + atualiza plugins/pods/gradle)
npm run cap:sync

# 3. Abrir e rodar na IDE nativa
npm run cap:open:android      # Android Studio → ▶ Run
npm run cap:open:ios          # Xcode → ▶ Run (somente macOS)
```

| Comando | O que faz |
|---------|-----------|
| `npx cap sync` | `copy` + `update`: copia o web build E atualiza plugins nativos (gradle/pods) |
| `npx cap copy` | Só copia o web build (mais rápido; use quando só mudou código web) |
| `npx cap update` | Só atualiza dependências nativas (use quando instalou/atualizou plugin) |

> **Live reload em dev:** aponte `server.url` temporariamente para `http://SEU_IP_LAN:3000` e rode `npm run dev`. Assim você edita e vê no device sem rebuildar. **Reverta antes de buildar release.**

---

## Passo 7 — Ícones e splash screens

Coloque uma imagem de origem em `assets/` na raiz e gere todos os tamanhos:

```
assets/
  icon.png            # 1024x1024, sem transparência para iOS
  splash.png          # 2732x2732 (centralizado, seguro p/ qualquer aspect ratio)
  splash-dark.png     # opcional (dark mode)
```

```bash
npx capacitor-assets generate
# ou, para uma plataforma só:
npx capacitor-assets generate --android
npx capacitor-assets generate --ios
```

Gera automaticamente:
- Android: `res/mipmap-*` (ícones adaptativos), splash
- iOS: `AppIcon.appiconset`, `Splash.imageset`

---

## Verificação final do setup

- [ ] `capacitor.config.ts` com `appId`, `appName`, `webDir` e (se Estratégia B) `server.url`
- [ ] `npm run build:mobile` gera a pasta `out/` sem erros
- [ ] `npm run cap:sync` copia para `android/app/src/main/assets/public/`
- [ ] `npx cap open android` abre o Android Studio e o Gradle sincroniza
- [ ] App roda em emulador/device e carrega o conteúdo correto
- [ ] (macOS) `npx cap open ios` abre o Xcode e o `pod install` rodou

➡️ Próximo: **[02-ANDROID-PLAYSTORE.md](./02-ANDROID-PLAYSTORE.md)**
