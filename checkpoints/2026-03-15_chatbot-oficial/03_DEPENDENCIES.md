# Dependencies Analysis

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**package.json version:** 0.1.0

---

## Package Manager

**Manager:** npm (também suporta pnpm)
**Lock File:** Presente (pnpm-lock.yaml indica uso de pnpm no projeto)

---

## Core Framework Dependencies

### Next.js & React

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `next` | ^16 | Framework React SSR/SSG | ✅ |
| `react` | ^18.3.1 | UI Library | ✅ |
| `react-dom` | ^18.3.1 | React DOM Renderer | ✅ |
| `react-is` | ^19.2.4 | React type checking | ⚠️ |

**⚠️ WARNING:** `react-is` está na v19.2.4 enquanto React está na 18.3.1. Pode causar incompatibilidades.

**Evidência:** `package.json:90-94`

---

## Database & Backend

### Supabase

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `@supabase/supabase-js` | ^2.78.0 | Cliente JavaScript do Supabase | ✅ |
| `@supabase/ssr` | ^0.5.2 | Server-Side Rendering com Supabase | ✅ |
| `pg` | ^8.16.3 | PostgreSQL client (⚠️ NÃO usar em serverless) | ⚠️ |
| `@types/pg` | ^8.15.5 | Types do pg | - |

**⚠️ CRITICAL:** `pg` library está instalada mas NÃO deve ser usada em API routes serverless (Vercel). Usar somente Supabase client.

**Evidência:**
- Dependências: `package.json:89,63`
- Problema documentado: `CLAUDE.md:178-188`

### Redis

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `redis` | ^5.9.0 | Cliente Redis (message batching) | ⚠️ |
| `@upstash/redis` | ^1.35.6 | Upstash Redis (serverless-friendly) | ⚠️ |
| `@upstash/ratelimit` | ^2.0.7 | Rate limiting | ⚠️ |

**Architecture:** Usa Redis para batching de mensagens (30s default). Graceful degradation se Redis indisponível.

**Evidência:** `package.json:96,65-66`

---

## AI & LLM Providers

### AI SDKs

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `ai` | ^5.0.112 | Vercel AI SDK | ✅ |
| `@ai-sdk/openai` | ^2.0.85 | OpenAI adapter | ✅ |
| `@ai-sdk/groq` | ^2.0.33 | Groq adapter | ✅ |
| `@ai-sdk/anthropic` | ^2.0.56 | Anthropic adapter | ⚠️ |
| `@ai-sdk/google` | ^2.0.46 | Google Gemini adapter | ⚠️ |
| `openai` | ^6.7.0 | OpenAI oficial SDK | ✅ |
| `groq-sdk` | ^0.34.0 | Groq oficial SDK | ✅ |

**Architecture:** Direct AI Client mode (sem gateway abstraction). Cada cliente usa suas próprias API keys via Vault.

**Evidência:**
- Dependências: `package.json:23-27,67,78`
- Direct AI: `src/lib/direct-ai-client.ts`

**Providers Ativos:**
- ✅ OpenAI (GPT-4o, Whisper, Embeddings)
- ✅ Groq (Llama 3.3 70B)
- ⚠️ Anthropic (instalado mas não documentado em uso)
- ⚠️ Google (instalado mas não documentado em uso)

---

## WhatsApp Business API

### Meta Graph API

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `axios` | ^1.12.2 | HTTP client para Meta API | ✅ |
| `form-data` | ^4.0.5 | Multipart form data (media upload) | ✅ |
| `@types/form-data` | ^2.5.2 | Types | - |

**API Version:** v18.0 (Meta WhatsApp Business)
**Phone Number ID:** 899639703222013

**Evidência:** `package.json:68,75`

---

## Mobile (Capacitor)

### Capacitor Core

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `@capacitor/cli` | ^8.0.1 | CLI para builds | ✅ |
| `@capacitor/core` | ^7.4.4 | Runtime core | ⚠️ |
| `@capacitor/android` | ^7.4.4 | Android platform | ⚠️ |
| `@capacitor/ios` | ^7.4.4 | iOS platform | ⚠️ |

**⚠️ VERSION MISMATCH:** CLI está na v8.0.1 mas core/platforms em v7.4.4. Possível problema.

**Evidência:** `package.json:30-32`

### Capacitor Plugins

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `@capacitor/app` | ^7.1.0 | App lifecycle | ✅ |
| `@capacitor/network` | ^7.0.2 | Network status | ✅ |
| `@capacitor/push-notifications` | ^7.0.3 | Push notifications | ✅ |
| `@capacitor/status-bar` | ^7.0.5 | Status bar control | ⚠️ |
| `@aparajita/capacitor-biometric-auth` | ^9.1.2 | Face ID/Touch ID | ⚠️ |
| `@capacitor/assets` | ^3.0.5 | Asset generation (dev) | - |

**Mobile Config:**
- App ID: `com.uzzai.uzzapp`
- Server URL: `https://uzzapp.uzzai.com.br` (server-based model)

**Evidência:** `package.json:29,33-35`, `capacitor.config.ts:3-11`

---

## Payment Processing

### Stripe

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `stripe` | ^20.4.1 | Stripe backend SDK | ⚠️ |
| `@stripe/stripe-js` | ^8.9.0 | Stripe frontend SDK | ⚠️ |

**Status:** 85% implementado. Pendente configuração (env vars, webhooks).

**Modules:**
- Platform Billing (UzzAI cobra clientes)
- Stripe Connect (clientes cobram seus clientes)
- Application Fee: 10%

**Evidência:**
- Dependências: `package.json:97,60`
- Docs: `docs/stripe/`
- 23 arquivos com `@stripe-module` tag

---

## UI Components

### Radix UI

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-accordion` | ^1.2.12 | Accordion |
| `@radix-ui/react-alert-dialog` | ^1.1.15 | Alert Dialog |
| `@radix-ui/react-avatar` | ^1.1.10 | Avatar |
| `@radix-ui/react-checkbox` | ^1.3.3 | Checkbox |
| `@radix-ui/react-dialog` | ^1.1.15 | Dialog |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Dropdown Menu |
| `@radix-ui/react-label` | ^2.1.7 | Label |
| `@radix-ui/react-popover` | ^1.1.15 | Popover |
| `@radix-ui/react-progress` | ^1.1.8 | Progress |
| `@radix-ui/react-scroll-area` | ^1.0.5 | Scroll Area |
| `@radix-ui/react-select` | ^2.2.6 | Select |
| `@radix-ui/react-separator` | ^1.0.3 | Separator |
| `@radix-ui/react-slider` | ^1.3.6 | Slider |
| `@radix-ui/react-slot` | ^1.0.2 | Slot |
| `@radix-ui/react-switch` | ^1.2.6 | Switch |
| `@radix-ui/react-tabs` | ^1.1.13 | Tabs |
| `@radix-ui/react-toast` | ^1.1.5 | Toast |
| `@radix-ui/react-tooltip` | ^1.2.8 | Tooltip |

**Evidência:** `package.json:42-59`

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^3.4.1 | Utility-first CSS | ✅ |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities | ✅ |
| `tailwind-merge` | ^2.5.5 | Class merging | ✅ |
| `class-variance-authority` | ^0.7.0 | Variant utilities | ✅ |
| `clsx` | ^2.1.1 | Conditional classes | ✅ |
| `autoprefixer` | ^10.4.21 | PostCSS prefixer | ✅ |
| `postcss` | ^8 | CSS processor | ✅ |

**Design System:** shadcn/ui (Radix + Tailwind)

**Evidência:** `package.json:69-70,98-99,116-117,123`

---

## Data Visualization

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `recharts` | ^3.3.0 | Charts library | ✅ |
| `@xyflow/react` | ^12.10.0 | Flow/diagram editor | ✅ |
| `mermaid` | ^10.9.5 | Diagrams from text | ⚠️ |

**Usage:**
- `recharts`: Analytics dashboards
- `@xyflow/react`: Flow architecture manager
- `mermaid`: Flow visualization

**Evidência:** `package.json:95,66,83`

---

## Media Processing

### Audio/Video

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `fluent-ffmpeg` | ^2.1.3 | FFmpeg wrapper | ⚠️ |
| `@ffmpeg-installer/ffmpeg` | ^1.1.0 | FFmpeg binaries | ⚠️ |
| `@ffmpeg/ffmpeg` | ^0.12.15 | FFmpeg WASM | ⚠️ |
| `@ffmpeg/util` | ^0.12.2 | FFmpeg utilities | ⚠️ |

**⚠️ CRITICAL:** FFmpeg packages causam warnings em build (não é erro fatal).
- Externalizado em `next.config.js:22,29-32`
- NÃO é bundleable

**Evidência:** `package.json:39-41,74`

### PDF/Documents

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `pdf-parse` | ^1.1.0 | Parse PDFs | ✅ |
| `@types/pdf-parse` | ^1.1.5 | Types | - |

**Usage:** RAG system (knowledge base upload)

**Evidência:** `package.json:88,112`

---

## State Management & Forms

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `zustand` | ^5.0.9 | State management | ✅ |
| `immer` | ^11.0.1 | Immutable state | ✅ |
| `zod` | ^4.1.13 | Schema validation | ✅ |

**Architecture:**
- Zustand para estado global
- Immer para updates imutáveis
- Zod para validação de schemas (API routes, forms)

**Evidência:** `package.json:103,80,102`

---

## Utilities

### Date/Time

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^4.1.0 | Date manipulation |
| `react-day-picker` | ^9.13.0 | Date picker component |

**Evidência:** `package.json:71,91`

### Icons

| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | ^0.460.0 | Icon library | ✅ |

**Evidência:** `package.json:82`

### UUID

| Package | Version | Purpose |
|---------|---------|---------|
| `uuid` | ^13.0.0 | UUID generation | ✅ |
| `@types/uuid` | ^11.0.0 | Types | - |

**Evidência:** `package.json:100,115`

### Others

| Package | Version | Purpose |
|---------|---------|---------|
| `html2canvas` | ^1.4.1 | Screenshot generation | ⚠️ |
| `jspdf` | ^4.0.0 | PDF generation | ⚠️ |
| `xlsx` | ^0.18.5 | Excel export | ⚠️ |

**Evidência:** `package.json:79,81,101`

---

## Animations

| Package | Version | Purpose |
|---------|---------|---------|
| `framer-motion` | ^12.23.25 | Animation library | ✅ |

**Evidência:** `package.json:76`

---

## Email & Notifications

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `nodemailer` | ^7.0.10 | Email sending | ⚠️ |
| `@types/nodemailer` | ^7.0.3 | Types | - |
| `react-hot-toast` | ^2.6.0 | Toast notifications | ✅ |

**Email Usage:** Human handoff notifications (via Gmail SMTP)

**Evidência:** `package.json:86,111,93`

---

## Firebase (Push Notifications)

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `firebase-admin` | ^13.6.0 | Firebase Admin SDK | ⚠️ |

**Usage:** Push notifications para mobile (Android/iOS)

**Evidência:** `package.json:73`

---

## Google APIs

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `googleapis` | ^171.4.0 | Google APIs client | ⚠️ |

**Usage:** Google Calendar integration (OAuth2)

**Evidência:** `package.json:77`

---

## Development Dependencies

### TypeScript

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | TypeScript compiler |
| `@types/node` | ^22.18.12 | Node types |
| `@types/react` | ^18 | React types |
| `@types/react-dom` | ^18 | React DOM types |

**Evidência:** `package.json:127,110,113-114`

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | Test framework |
| `@jest/globals` | ^30.2.0 | Jest globals |
| `@types/jest` | ^30.0.0 | Jest types |
| `ts-jest` | ^29.4.6 | TypeScript Jest transformer |

**Evidência:** `package.json:122,107,109,126`

### Linting

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9.23.0 | Linter |
| `eslint-config-next` | ^16 | Next.js ESLint config |

**⚠️ WARNING:** ESLint 9 é muito recente. Pode ter problemas de compatibilidade.

**Evidência:** `package.json:120-121`

### Build Tools

| Package | Version | Purpose |
|---------|---------|---------|
| `cross-env` | ^10.1.0 | Cross-platform env vars |
| `dotenv-cli` | ^11.0.0 | Dotenv CLI |
| `puppeteer` | ^24.38.0 | Headless browser (tests/screenshots) |
| `baseline-browser-mapping` | ^2.9.17 | Browser compatibility |

**Evidência:** `package.json:118-119,124,117`

---

## Environment Management

| Package | Purpose |
|---------|---------|
| `dotenv` | ^17.2.3 | Load .env files |

**⚠️ NOTE:** Next.js carrega `.env.local` automaticamente. `dotenv` pode ser redundante.

**Evidência:** `package.json:72`

---

## Drag & Drop

| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | ^6.3.1 | Drag and drop core |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists |
| `@dnd-kit/utilities` | ^3.2.2 | DnD utilities |

**Usage:** CRM Kanban, Flow builder

**Evidência:** `package.json:36-38`

---

## Themes

| Package | Version | Purpose |
|---------|---------|---------|
| `next-themes` | ^0.4.6 | Theme switching (dark mode) |

**Evidência:** `package.json:85`

---

## Critical Issues & Warnings

### 1. ⚠️ Version Mismatches

- **React vs react-is:** React 18.3.1 vs react-is 19.2.4
- **Capacitor:** CLI 8.0.1 vs Core/Platforms 7.4.4

**Risk:** Medium
**Action:** Testar compatibilidade, considerar alinhar versões

### 2. ⚠️ `pg` in Serverless

- **Package:** `pg@8.16.3` está instalado
- **Problem:** Não funciona em Vercel serverless (connection pooling)
- **Solution:** SEMPRE usar Supabase client

**Risk:** High (quebra NODE 3)
**Action:** Auditar código e remover usos de `pg` em API routes

### 3. ⚠️ FFmpeg Build Warnings

- **Packages:** fluent-ffmpeg, @ffmpeg/ffmpeg, @ffmpeg-installer/ffmpeg
- **Problem:** Não é bundleable, gera warnings
- **Solution:** Já externalizado em next.config.js

**Risk:** Low (warnings apenas, build funciona)
**Action:** Nenhuma

### 4. ⚠️ ESLint 9

- **Package:** eslint@9.23.0
- **Problem:** Versão muito recente, possível incompatibilidade
- **Evidence:** Último commit menciona "eslint 9"

**Risk:** Medium
**Action:** Monitorar erros de lint

---

## Dependency Security

### Audit Recommendations

```bash
# Verificar vulnerabilidades
npm audit

# Atualizar dependências
npm update

# Atualizar major versions (cuidado)
npx npm-check-updates -u
```

### Known Vulnerable Patterns

**NONE FOUND** (sem análise automatizada neste checkpoint)

**Action:** Rodar `npm audit` regularmente

---

## Total Package Count

- **Dependencies:** 82
- **DevDependencies:** 16
- **Total:** 98

**Evidência:** `package.json:22-104`, `package.json:105-128`

---

## Recommendations

1. ✅ **Alinhar versões Capacitor** (CLI e core)
2. ✅ **Auditar uso de `pg` library** (substituir por Supabase client)
3. ⚠️ **Avaliar `react-is` version mismatch**
4. ⚠️ **Testar ESLint 9 compatibility**
5. ✅ **Remover `dotenv` package** (redundante com Next.js)
6. ✅ **Documentar providers AI não utilizados** (Anthropic, Google)

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
