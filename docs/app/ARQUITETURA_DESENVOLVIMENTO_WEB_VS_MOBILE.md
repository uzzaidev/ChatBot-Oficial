# 📚 Arquitetura: Desenvolvimento Web vs Mobile

## 🎯 Visão Geral

Este documento explica como o projeto está estruturado para suportar desenvolvimento **web** e **mobile** de forma integrada, seguindo as configurações implementadas pelo desenvolvedor sênior.

---

## 🔧 Configuração Principal: `next.config.js`

### Detecção de Build Mobile

```javascript
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'
```

**Como funciona:**
- Quando `CAPACITOR_BUILD=true` → Build estático (mobile)
- Quando `CAPACITOR_BUILD` não está definido → Build normal (web)

### Configurações Condicionais

```javascript
const nextConfig = {
  // Mobile: static export (sem servidor)
  // Web: build normal (com servidor)
  output: isMobileBuild ? 'export' : undefined,
  
  // Mobile: imagens não otimizadas (static export não suporta)
  // Web: imagens otimizadas pelo Next.js
  images: {
    unoptimized: isMobileBuild,
    // ... remotePatterns
  },
}
```

**Por quê?**
- Mobile precisa de arquivos estáticos (HTML/CSS/JS) para o Capacitor
- Web pode usar otimizações do Next.js (Image Optimization, Server Components, etc.)

---

## 📦 Scripts: `package.json`

### Desenvolvimento Web

```json
{
  "dev": "next dev"
}
```

**O que faz:**
- Inicia Next.js dev server em `http://localhost:3000`
- Hot reload automático (mudanças aparecem instantaneamente)
- Suporta Server Components, API Routes, etc.

### Build Mobile

```json
{
  "build:mobile": "doppler run --config dev -- cross-env CAPACITOR_BUILD=true next build",
  "build:mobile:stg": "doppler run --config stg -- cross-env CAPACITOR_BUILD=true next build",
  "build:mobile:prd": "doppler run --config prd -- cross-enV CAPACITOR_BUILD=true next build"
}
```

**O que faz:**
1. **Doppler**: Injeta environment variables (`NEXT_PUBLIC_*`)
2. **cross-env**: Define `CAPACITOR_BUILD=true` (cross-platform)
3. **next build**: Gera build estático em `out/`

**Por quê Doppler?**
- Mobile não tem servidor para ler `.env.local`
- Variáveis precisam ser injetadas no build-time
- Doppler gerencia secrets de forma segura

---

## 🔄 Fluxo de Desenvolvimento

### Web (Desenvolvimento)

```bash
npm run dev
```

**Fluxo:**
1. Next.js dev server inicia
2. Código compila sob demanda
3. Hot reload atualiza automaticamente
4. Acessa em `http://localhost:3000`

**Vantagens:**
- ✅ Desenvolvimento rápido
- ✅ Hot reload instantâneo
- ✅ Server Components funcionam
- ✅ API Routes disponíveis

### Mobile (Build Estático)

```bash
npm run build:mobile
npx cap sync android
```

**Fluxo:**
1. Next.js gera build estático em `out/`
2. Capacitor copia para `android/app/src/main/assets/public/`
3. Android Studio compila app nativo
4. App roda com arquivos estáticos

**Vantagens:**
- ✅ App completo e independente
- ✅ Não precisa de servidor
- ✅ Funciona offline
- ✅ Pronto para produção

### Mobile (Live Reload - Desenvolvimento)

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Configurar capacitor.config.ts
# server: { url: 'http://192.168.0.20:3000', cleartext: true }
npx cap sync android
```

**Fluxo:**
1. Dev server roda normalmente
2. App mobile conecta ao dev server via WiFi
3. Mudanças no código refletem instantaneamente
4. Sem necessidade de rebuild

**Vantagens:**
- ✅ Desenvolvimento rápido (como web)
- ✅ Testa em device real
- ✅ Hot reload funciona

**Desvantagens:**
- ⚠️ Requer dev server rodando
- ⚠️ Requer mesma rede WiFi
- ⚠️ Não funciona offline

---

## 🔐 Environment Variables

### Web (Desenvolvimento)

```bash
# .env.local (lido em runtime pelo servidor)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Como funciona:**
- Servidor Node.js lê `.env.local` em runtime
- Variáveis disponíveis via `process.env.VARIAVEL`
- Hot reload detecta mudanças

### Mobile (Build)

```bash
# Doppler injeta no build-time
doppler run --config dev -- cross-env CAPACITOR_BUILD=true next build
```

**Como funciona:**
1. Doppler busca variáveis do projeto
2. Injeta como `NEXT_PUBLIC_*` no build
3. Next.js substitui no código durante build
4. Variáveis ficam "hardcoded" no bundle final

**Por quê?**
- Mobile não tem servidor para ler `.env`
- Variáveis precisam estar no bundle JavaScript
- Apenas `NEXT_PUBLIC_*` são expostas ao cliente

---

## 🎨 Headers e CORS: `next.config.js`

### Desenvolvimento vs Produção

```javascript
async headers() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const allowedOrigins = isDevelopment 
    ? ['http://localhost:3000', 'http://localhost:3001']
    : ['https://chat.luisfboff.com']
  
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: isDevelopment ? '*' : 'https://chat.luisfboff.com',
        },
        // ...
      ],
    },
  ]
}
```

**Como funciona:**
- **Development**: CORS permissivo (`*`) para facilitar desenvolvimento
- **Production**: CORS restritivo (apenas domínio específico)

**Nota:** Headers não funcionam em static export (mobile), mas não causam erro.

---

## 📱 Capacitor: `capacitor.config.ts`

### Configuração Base

```typescript
const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out'  // Pasta com build estático
}
```

### Live Reload (Opcional)

```typescript
// Apenas para desenvolvimento
server: {
  url: 'http://192.168.0.20:3000',  // IP local
  cleartext: true  // Permite HTTP
}
```

**Quando usar:**
- ✅ Desenvolvimento ativo
- ✅ Mudanças frequentes
- ✅ Quer hot reload no mobile

**Quando NÃO usar:**
- ❌ Testes finais
- ❌ Build para produção
- ❌ Testes offline

---

## 🔍 Detecção de Plataforma no Código

### Verificar se Está no Mobile

```typescript
import { Capacitor } from '@capacitor/core'

// Boolean simples
if (Capacitor.isNativePlatform()) {
  // Mobile (Android/iOS)
} else {
  // Web (browser)
}

// Plataforma específica
const platform = Capacitor.getPlatform()
// 'web' | 'android' | 'ios'
```

**Uso comum:**
- Features mobile-only (biometria, push notifications)
- Fallbacks para web (compartilhar, câmera)
- Ajustes de UI (tamanho de fonte, layout)

---

## 🚫 Limitações do Mobile Build

### O que NÃO funciona em static export:

1. **API Routes** (`/api/*`)
   - ❌ Não há servidor para processar
   - ✅ Solução: Usar Supabase Edge Functions ou backend externo

2. **Server Components**
   - ❌ Não há servidor para renderizar
   - ✅ Solução: Usar Client Components (`'use client'`)

3. **Server Actions**
   - ❌ Não há servidor para executar
   - ✅ Solução: Usar API routes externas ou Supabase

4. **Image Optimization**
   - ❌ Next.js Image Optimization requer servidor
   - ✅ Solução: Usar `unoptimized: true` (já configurado)

5. **Dynamic Routes com `generateStaticParams`**
   - ⚠️ Funciona, mas precisa gerar todas as rotas no build
   - ✅ Solução: Usar Client Components com navegação client-side

---

## 📊 Comparação: Web vs Mobile

| Feature | Web (dev) | Mobile (build) | Mobile (live reload) |
|---------|-----------|----------------|---------------------|
| **Servidor** | ✅ Next.js dev server | ❌ Sem servidor | ✅ Next.js dev server |
| **Hot Reload** | ✅ Automático | ❌ Não | ✅ Automático |
| **API Routes** | ✅ Funciona | ❌ Não funciona | ✅ Funciona |
| **Server Components** | ✅ Funciona | ❌ Não funciona | ✅ Funciona |
| **Offline** | ❌ Não | ✅ Sim | ❌ Não |
| **Environment Vars** | ✅ `.env.local` | ✅ Doppler (build-time) | ✅ `.env.local` |
| **Build Time** | ⚡ Instantâneo | 🐢 30-60s | ⚡ Instantâneo |
| **Teste em Device** | ❌ Não | ✅ Sim | ✅ Sim |

---

## 🎯 Workflow Recomendado

### 1. Desenvolver Feature (Web)

```bash
npm run dev
# Desenvolve e testa em http://localhost:3000
```

### 2. Testar no Mobile (Build Estático)

```bash
npm run build:mobile
npx cap sync android
# Testa app completo no emulador/device
```

### 3. Iterar Rápido (Live Reload)

```bash
# Terminal 1
npm run dev

# Terminal 2: Configurar capacitor.config.ts com server
npx cap sync android
# Testa mudanças instantaneamente
```

### 4. Build para Produção

```bash
# Remover server do capacitor.config.ts
npm run build:mobile:prd
npx cap sync
cd android
./gradlew bundleRelease
```

---

## 💡 Boas Práticas

### ✅ Fazer

1. **Desenvolver primeiro na web** (mais rápido)
2. **Testar build estático** antes de publicar
3. **Usar `Capacitor.isNativePlatform()`** para features mobile-only
4. **Usar Client Components** para código compartilhado
5. **Injetar env vars via Doppler** para mobile

### ❌ Evitar

1. **Não usar API Routes** em código mobile (não funciona)
2. **Não usar Server Components** em código mobile
3. **Não commitar `capacitor.config.ts` com `server`** (pode causar redirecionamento)
4. **Não hardcode secrets** no código
5. **Não esquecer de remover `server`** antes de build produção

---

## 🔗 Referências

- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Capacitor Config**: https://capacitorjs.com/docs/config
- **Doppler**: https://docs.doppler.com/
- **Environment Variables**: `docs/app/ENV_VARS.md`
- **Development Guide**: `docs/app/DEVELOPMENT.md`
- **Live Reload Setup**: `docs/app/LIVE_RELOAD_SETUP.md`

---

**Última atualização:** Análise da arquitetura existente (sem modificações)

