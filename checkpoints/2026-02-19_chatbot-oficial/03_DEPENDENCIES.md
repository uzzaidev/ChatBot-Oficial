# 03_DEPENDENCIES - Análise de Dependências

**Data:** 2026-02-19
**Fonte:** package.json (root do projeto)
**Evidência:** `C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial\package.json`

---

## Resumo Executivo

**Nome do Projeto:** `whatsapp-chatbot-dashboard`
**Versão:** `0.1.0`
**Tipo:** Private (não publicado em registry)

**Stack Principal:**
- Next.js 16 (App Router)
- React 18.3.1
- TypeScript 5
- Supabase 2.78.0

**Deployment Target:** Serverless (Vercel) + Capacitor Mobile (Android/iOS)

---

## Scripts Disponíveis

```json
{
  "dev": "next dev --webpack",
  "build": "next build",
  "build:mobile": "node scripts/build-mobile.js",
  "build:mobile:old": "doppler run --config dev -- cross-env CAPACITOR_BUILD=true next build",
  "build:mobile:stg": "doppler run --config stg -- cross-env CAPACITOR_BUILD=true next build",
  "build:mobile:prd": "doppler run --config prd -- cross-env CAPACITOR_BUILD=true next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "cap:sync": "npx cap sync",
  "cap:open:android": "npx cap open android",
  "cap:open:ios": "npx cap open ios",
  "db:export": "node scripts/export-database-schema.js"
}
```

**Observações:**
- ✅ Webpack forçado no dev mode (`--webpack`)
- ✅ Mobile build com Capacitor (Android/iOS)
- ✅ Doppler para secrets management (dev/stg/prd)
- ✅ Jest configurado para testes
- ✅ Script de export de schema do banco

---

## Dependências de Produção (Critical)

### Framework Core
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `next` | `^16` | 🔴 CRITICAL | Next.js 16 (App Router) - versão mais recente |
| `react` | `^18.3.1` | 🔴 CRITICAL | React 18 com RSC support |
| `react-dom` | `^18.3.1` | 🔴 CRITICAL | React DOM |
| `typescript` | `^5` (dev) | 🔴 CRITICAL | TypeScript 5 |

### Database & Backend
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `@supabase/supabase-js` | `^2.78.0` | 🔴 CRITICAL | Cliente Supabase (PostgreSQL, Auth, Storage, Realtime) |
| `@supabase/ssr` | `^0.5.2` | 🔴 CRITICAL | SSR support para Supabase |
| `pg` | `^8.16.3` | ⚠️ RISK | ⚠️ **ATENÇÃO:** Uso de `pg` em serverless pode causar freezing (usar Supabase client) |
| `redis` | `^5.9.0` | 🟡 HIGH | Redis para message batching |
| `@upstash/redis` | `^1.35.6` | 🟡 HIGH | Upstash Redis client (serverless-friendly) |
| `@upstash/ratelimit` | `^2.0.7` | 🟡 HIGH | Rate limiting com Upstash |

**RISK ALERT (VULN-001):**
⚠️ `pg` library está presente mas NÃO DEVE ser usado em funções serverless (Vercel). Usar SOMENTE `@supabase/supabase-js`.
**Evidência do problema:** CLAUDE.md - Critical Technical Decisions #1

### AI Providers & Models
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `ai` | `^5.0.112` | 🔴 CRITICAL | Vercel AI SDK (unified AI interface) |
| `openai` | `^6.7.0` | 🔴 CRITICAL | OpenAI SDK (Whisper, GPT-4o Vision, Embeddings, TTS) |
| `groq-sdk` | `^0.34.0` | 🔴 CRITICAL | Groq SDK (Llama 3.3 70B) |
| `@ai-sdk/openai` | `^2.0.85` | 🟡 HIGH | OpenAI provider para Vercel AI SDK |
| `@ai-sdk/groq` | `^2.0.33` | 🟡 HIGH | Groq provider para Vercel AI SDK |
| `@ai-sdk/anthropic` | `^2.0.56` | 🟢 MEDIUM | Claude provider (secundário?) |
| `@ai-sdk/google` | `^2.0.46` | 🟢 MEDIUM | Google AI provider (secundário?) |

**Observação:** Múltiplos providers disponíveis. Verificar qual está ativo no código.

### WhatsApp Integration
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `axios` | `^1.12.2` | 🔴 CRITICAL | HTTP client (WhatsApp API calls) |
| `form-data` | `^4.0.5` | 🟡 HIGH | Multipart form data (media upload) |

**Nota:** WhatsApp Business API não tem SDK oficial, usa REST API diretamente.

### Media Processing
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `fluent-ffmpeg` | `^2.1.3` | 🟡 HIGH | FFmpeg wrapper (audio/video processing) |
| `@ffmpeg-installer/ffmpeg` | `^1.1.0` | 🟡 HIGH | FFmpeg binaries |
| `@ffmpeg/ffmpeg` | `^0.12.15` | 🟡 HIGH | FFmpeg WASM (client-side processing) |
| `@ffmpeg/util` | `^0.12.2` | 🟡 HIGH | FFmpeg utilities |
| `pdf-parse` | `^1.1.0` | 🟡 HIGH | PDF parsing (RAG system) |
| `html2canvas` | `^1.4.1` | 🟢 MEDIUM | Screenshot generation |
| `jspdf` | `^4.0.0` | 🟢 MEDIUM | PDF generation |

### UI Framework & Components
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `@radix-ui/*` | `^1.x - ^2.x` | 🟡 HIGH | Radix UI primitives (20+ components) |
| `lucide-react` | `^0.460.0` | 🟡 HIGH | Ícones |
| `tailwindcss` | `^3.4.1` (dev) | 🔴 CRITICAL | CSS framework |
| `tailwind-merge` | `^2.5.5` | 🟡 HIGH | Tailwind class merging |
| `tailwindcss-animate` | `^1.0.7` | 🟢 MEDIUM | Animações Tailwind |
| `class-variance-authority` | `^0.7.0` | 🟡 HIGH | CVA (variant management) |
| `clsx` | `^2.1.1` | 🟡 HIGH | Class name utility |
| `framer-motion` | `^12.23.25` | 🟢 MEDIUM | Animações avançadas |
| `next-themes` | `^0.4.6` | 🟢 MEDIUM | Dark mode support |

### State Management & Data Fetching
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `zustand` | `^5.0.9` | 🟡 HIGH | State management |
| `immer` | `^11.0.1` | 🟢 MEDIUM | Immutable state updates |
| `react-hot-toast` | `^2.6.0` | 🟢 MEDIUM | Toast notifications |

**Observação:** Não usa React Query/TanStack Query. State gerenciado com Zustand.

### Visualização & Charts
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `recharts` | `^3.3.0` | 🟡 HIGH | Charts library (analytics) |
| `mermaid` | `^10.9.5` | 🟡 HIGH | Diagramas (Flow Architecture Manager) |
| `@xyflow/react` | `^12.10.0` | 🟡 HIGH | Flow diagram builder |
| `@dnd-kit/*` | `^6.x - ^10.x` | 🟢 MEDIUM | Drag and Drop |

### Mobile (Capacitor)
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `@capacitor/core` | `^7.4.4` | 🔴 CRITICAL (mobile) | Capacitor runtime |
| `@capacitor/android` | `^7.4.4` | 🔴 CRITICAL (mobile) | Android platform |
| `@capacitor/ios` | `^7.4.4` | 🔴 CRITICAL (mobile) | iOS platform |
| `@capacitor/app` | `^7.1.0` | 🟡 HIGH | App API |
| `@capacitor/network` | `^7.0.2` | 🟡 HIGH | Network status |
| `@capacitor/push-notifications` | `^7.0.3` | 🟡 HIGH | Push notifications |
| `@aparajita/capacitor-biometric-auth` | `^9.1.2` | 🟢 MEDIUM | Biometric auth |

### Utilidades & Helpers
| Pacote | Versão | Criticidade | Nota |
|--------|--------|-------------|------|
| `date-fns` | `^4.1.0` | 🟡 HIGH | Date manipulation |
| `uuid` | `^13.0.0` | 🟡 HIGH | UUID generation |
| `zod` | `^4.1.13` | 🟡 HIGH | Schema validation |
| `dotenv` | `^17.2.3` | 🟡 HIGH | Environment variables |
| `nodemailer` | `^7.0.10` | 🟡 HIGH | Email sending (human handoff) |
| `firebase-admin` | `^13.6.0` | 🟢 MEDIUM | Firebase Admin SDK (Meta Conversions API?) |
| `xlsx` | `^0.18.5` | 🟢 MEDIUM | Excel file handling |
| `react-day-picker` | `^9.13.0` | 🟢 MEDIUM | Date picker |

---

## Dependências de Desenvolvimento

| Pacote | Versão | Nota |
|--------|--------|------|
| `@types/*` | vários | TypeScript definitions |
| `@capacitor/cli` | `^8.0.1` | Capacitor CLI |
| `@capacitor/assets` | `^3.0.5` | Asset generation |
| `jest` | `^30.2.0` | Test runner |
| `@jest/globals` | `^30.2.0` | Jest globals |
| `ts-jest` | `^29.4.6` | Jest TS support |
| `eslint` | `^8.57.1` | Linter |
| `eslint-config-next` | `^16` | Next.js ESLint config |
| `autoprefixer` | `^10.4.21` | CSS autoprefixer |
| `postcss` | `^8` | PostCSS |
| `cross-env` | `^10.1.0` | Cross-platform env vars |
| `dotenv-cli` | `^11.0.0` | Dotenv CLI |

---

## Versões Críticas (Confirmadas)

```json
{
  "next": "^16",           // Next.js 16 (App Router, RSC)
  "react": "^18.3.1",      // React 18
  "typescript": "^5",      // TypeScript 5
  "node": "NÃO ENCONTRADO" // ⚠️ Verificar .nvmrc ou engines no package.json
}
```

---

## Análise de Riscos

### 🔴 CRITICAL RISKS

1. **`pg` library em serverless (VULN-001)**
   - **Risco:** Connection pooling issues, função freeze
   - **Mitigação:** Usar SOMENTE Supabase client
   - **Evidência:** CLAUDE.md - Critical #1

2. **Multiple AI SDK versions**
   - **Risco:** Conflitos entre `ai` SDK e SDKs nativos (openai, groq-sdk)
   - **Verificar:** Qual sistema está ativo (Direct AI vs AI Gateway)

### 🟡 MEDIUM RISKS

1. **FFmpeg em serverless**
   - **Risco:** Binaries grandes, cold start lento
   - **Mitigação:** `serverExternalPackages` configurado (next.config.js:22)

2. **Múltiplos AI providers**
   - **Risco:** Confusão sobre qual está ativo
   - **Ação:** Documentar qual provider é usado por default

### 🟢 LOW RISKS

1. **Capacitor multi-platform**
   - **Risco:** Manutenção de 3 targets (web, iOS, Android)
   - **Nota:** Normal para apps mobile

---

## Scripts Customizados

### Build Mobile
```bash
node scripts/build-mobile.js
```
**Verificar:** Script existe? O que faz?

### Export Database Schema
```bash
node scripts/export-database-schema.js
```
**Verificar:** Script existe? Formato de saída?

---

## Perguntas em Aberto

1. ❓ Node.js version? (verificar `.nvmrc` ou `package.json.engines`)
2. ❓ `scripts/build-mobile.js` - O que faz exatamente?
3. ❓ `scripts/export-database-schema.js` - Existe? Formato?
4. ❓ Doppler config - Como funciona? Quais secrets?
5. ❓ AI Gateway vs Direct AI - Qual está ativo?
6. ❓ Firebase Admin - Para que é usado?
7. ❓ Por que `@ai-sdk/anthropic` e `@ai-sdk/google` se usa OpenAI/Groq?

---

## Próximos Passos (Validação)

- [ ] Verificar `.nvmrc`
- [ ] Ler `scripts/build-mobile.js`
- [ ] Ler `scripts/export-database-schema.js`
- [ ] Grep por uso de `pg` library no código (RISK!)
- [ ] Grep por uso de `firebase-admin`
- [ ] Confirmar qual AI system está ativo
- [ ] Verificar se Doppler está em uso ou apenas legado
