# ARCHITECTURE FROM CODE - ChatBot-Oficial

**Gerado em:** 2026-02-16
**Fonte:** Análise completa do código-fonte

## Sumário Executivo

**Sistema:** WhatsApp SaaS Multi-tenant Chatbot Platform
**Arquitetura:** Serverless (Vercel) + Supabase + Multi-Provider AI
**Pattern:** Event-driven message processing pipeline
**Tenant Isolation:** RLS + Vault credentials + client_id filtering

---

## 1. High-Level Architecture

```mermaid
C4Context
    title System Context Diagram - ChatBot SaaS Platform

    Person(client, "Client (SaaS Customer)", "Empresas using WhatsApp chatbot")
    Person(consumer, "Consumer", "End-users on WhatsApp")
    Person(admin, "Platform Admin", "UzzAI team managing platform")

    System(chatbot, "ChatBot Platform", "Multi-tenant WhatsApp AI chatbot SaaS")

    System_Ext(whatsapp, "WhatsApp Business API", "Meta Cloud API")
    System_Ext(ai, "AI Providers", "Groq, OpenAI, Anthropic, Google")
    System_Ext(supabase, "Supabase", "PostgreSQL + Auth + Storage + Vault + Realtime")
    System_Ext(stripe, "Stripe Connect", "Payment processing")
    System_Ext(redis, "Upstash Redis", "Message batching cache")

    Rel(consumer, whatsapp, "Sends WhatsApp message")
    Rel(whatsapp, chatbot, "Webhook POST /api/webhook/received", "HTTPS")
    Rel(chatbot, ai, "Generate responses", "HTTPS/REST")
    Rel(chatbot, supabase, "Store data, auth, RLS", "PostgreSQL + REST")
    Rel(chatbot, redis, "Batch messages", "Redis protocol")
    Rel(client, chatbot, "Configure bot, view analytics", "HTTPS")
    Rel(chatbot, whatsapp, "Send replies", "HTTPS/REST")
    Rel(chatbot, stripe, "Process payments", "HTTPS/Webhooks")
    Rel(admin, chatbot, "Manage clients, budgets", "HTTPS")
```

---

## 2. Component Architecture (Next.js App)

```mermaid
graph TB
    subgraph "Next.js 16 App Router"
        WEBHOOK[Webhook Entry<br/>/api/webhook/received]
        PAGES[Dashboard Pages<br/>54 pages]
        API[API Routes<br/>100+ endpoints]
        COMPONENTS[UI Components<br/>shadcn/ui + custom]
    end

    subgraph "Core Business Logic"
        CHATBOT_FLOW[ChatbotFlow Pipeline<br/>14-node orchestrator]
        NODES[Node Functions<br/>Pure atomic functions]
        FLOWS[Visual Flow Editor<br/>Drag-drop flows]
    end

    subgraph "Infrastructure Layer"
        SUPABASE_CLIENT[Supabase Client<br/>Multi-tenant queries]
        DIRECT_AI[Direct AI Client<br/>Multi-provider abstraction]
        VAULT[Vault Manager<br/>Client credentials]
        REDIS_CLIENT[Redis Client<br/>Message batching]
        STORAGE[Storage Manager<br/>Media files]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Supabase)]
        CACHE[(Redis<br/>Upstash)]
        FILES[(Storage<br/>Supabase)]
        VAULT_DB[(Vault<br/>Secrets)]
    end

    WEBHOOK --> CHATBOT_FLOW
    PAGES --> API
    API --> CHATBOT_FLOW
    API --> SUPABASE_CLIENT
    CHATBOT_FLOW --> NODES
    NODES --> DIRECT_AI
    NODES --> SUPABASE_CLIENT
    NODES --> REDIS_CLIENT
    NODES --> STORAGE

    DIRECT_AI --> VAULT
    SUPABASE_CLIENT --> DB
    REDIS_CLIENT --> CACHE
    STORAGE --> FILES
    VAULT --> VAULT_DB
```

---

## 3. Chatbot Flow Architecture (Core Pipeline)

**Evidência:** `src/flows/chatbotFlow.ts:1-100`

### 3.1 Pipeline Nodes (14 Nodes)

```mermaid
graph TD
    WH[WhatsApp Webhook] --> N1[1. Filter Status Updates]
    N1 --> N2[2. Parse Message]
    N2 --> N3[3. Check/Create Customer]
    N3 --> N4[4. Download Media if any]
    N4 --> N5[5. Normalize Message]
    N5 --> N6[6. Push to Redis Batch]
    N6 --> N7[7. Save User Message]
    N7 --> N8[8. Batch Messages 30s]
    N8 --> N9[9. Get Chat History]
    N8 --> N10[10. Get RAG Context]
    N9 --> N11[11. Generate AI Response]
    N10 --> N11
    N11 --> N12[12. Format Response]
    N12 --> N13[13. Send WhatsApp]
    N13 --> N14[14. Save Bot Message]
    N14 --> END[End]

    style N11 fill:#ff6b6b
    style N13 fill:#4ecdc4
    style N8 fill:#ffe66d
```

**Evidência:** Imports em chatbotFlow.ts:
- Line 6-22: Import de todos os nodes

**Key Features:**
- **Parallel Execution:** N9 + N10 run in parallel (independent)
- **Redis Batching:** N8 prevents duplicate responses (30s default)
- **Interleaved Save:** N13 sends, N14 saves (race condition prevention)
- **Tool Calls:** Special flow for human handoff (evidência: handleHumanHandoff import line 17)

### 3.2 Node Functions (Pure Functions)

**Pattern:**
```typescript
// Evidência: chatbotFlow.ts structure
export interface NodeInput {
  phone: string
  content: string
  // ...
}

export const myNode = async (input: NodeInput): Promise<Output> => {
  // Pure logic, single responsibility
  return result
}
```

**Locations:**
- `src/nodes/*.ts` - One file per node
- Example nodes:
  - `filterStatusUpdates.ts`
  - `parseMessage.ts`
  - `checkOrCreateCustomer.ts`
  - `downloadMetaMedia.ts`
  - `normalizeMessage.ts`
  - `pushToRedis.ts`
  - `saveChatMessage.ts`
  - `batchMessages.ts`
  - `getChatHistory.ts`
  - `getRAGContext.ts`
  - `generateAIResponse.ts`
  - `formatResponse.ts`
  - `transcribeAudio.ts`
  - `analyzeImage.ts`
  - `analyzeDocument.ts`
  - `handleHumanHandoff.ts`
  - `checkHumanHandoffStatus.ts`
  - `captureLeadSource.ts`
  - `updateCRMCardStatus.ts`
  - `checkContinuity.ts`
  - `classifyIntent.ts`
  - `detectRepetition.ts`
  - `checkInteractiveFlow.ts`

**Total:** 25+ node functions

---

## 4. AI Architecture (Direct AI Client)

**Evidência:** `src/lib/direct-ai-client.ts:1-100`

### 4.1 Multi-Provider Strategy

```mermaid
graph LR
    REQUEST[AI Request] --> DIRECT_AI[Direct AI Client]
    DIRECT_AI --> BUDGET_CHECK{Budget Available?}
    BUDGET_CHECK -->|No| ERROR[Return Error]
    BUDGET_CHECK -->|Yes| VAULT[Get Client Vault Credentials]
    VAULT --> PROVIDER_SELECT{Provider?}

    PROVIDER_SELECT -->|OpenAI| OPENAI_SDK[OpenAI SDK]
    PROVIDER_SELECT -->|Groq| GROQ_SDK[Groq SDK]
    PROVIDER_SELECT -->|Anthropic| ANTHROPIC_SDK[Anthropic SDK]
    PROVIDER_SELECT -->|Google| GOOGLE_SDK[Google SDK]

    OPENAI_SDK --> AI_CALL[generateText - AI SDK]
    GROQ_SDK --> AI_CALL
    ANTHROPIC_SDK --> AI_CALL
    GOOGLE_SDK --> AI_CALL

    AI_CALL --> TRACK[Log Usage to gateway_usage_logs]
    TRACK --> RESPONSE[Return Response + Tools]
```

**Evidência:**
- Line 1-13: Header comments explaining architecture
- Line 15-17: AI SDK imports (generateText, createOpenAI, createGroq)
- Line 18: Vault integration (`getClientVaultCredentials`)
- Line 19: Budget check (`checkBudgetAvailable`)
- Line 20: Usage tracking (`logDirectAIUsage`)

**Key Principles:**
1. **No shared keys** - Each client uses OWN Vault credentials
2. **Budget enforcement** - Pre-flight check before API call
3. **Usage tracking** - Every call logged to `gateway_usage_logs`
4. **Tool normalization** - Compatible with existing flow code
5. **Transparent errors** - No hidden fallbacks

### 4.2 Supported Providers

**Evidência:** direct-ai-client.ts:32-34

| Provider | Config Key | Default Model | Use Case |
|----------|-----------|---------------|----------|
| OpenAI | `primaryModelProvider: 'openai'` | GPT-4o-mini | Chat, Vision, Embeddings |
| Groq | `primaryModelProvider: 'groq'` | Llama 3.3 70B | Fast chat (main chatbot) |
| Anthropic | (via AI SDK) | Claude Opus/Sonnet | Alternative chat |
| Google | (via AI SDK) | Gemini | Alternative chat |

### 4.3 Tool Calls (Function Calling)

**Tools Available:**
- `transferir_atendimento` - Human handoff
- `subagente_diagnostico` - Diagnostic subagent
- `search_documents` - RAG search

**Evidência:** chatbotFlow.ts:17 (handleHumanHandoff import)

---

## 5. Database Architecture (Supabase + Multi-tenant)

### 5.1 Multi-tenant Isolation Strategy

```mermaid
graph TD
    REQUEST[HTTP Request] --> MIDDLEWARE[Middleware/Auth]
    MIDDLEWARE --> SESSION[Get User Session]
    SESSION --> PROFILE[Fetch user_profiles]
    PROFILE --> CLIENT_ID[Extract client_id]

    CLIENT_ID --> QUERY[Supabase Query]
    QUERY --> RLS_CHECK{RLS Policy Check}

    RLS_CHECK -->|Match client_id| ALLOW[Return Data]
    RLS_CHECK -->|No match| DENY[Return Empty/403]

    ALLOW --> RESPONSE[Response to Client]
```

**Evidência:** dashboard/page.tsx:37-42
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('client_id')
  .eq('id', user.id)
  .single()
```

### 5.2 Client Configuration & Vault

**Architecture:**
1. **Client record** in `clients` table (id, name, config)
2. **Vault secrets** for each client:
   - `client_{uuid}_openai_api_key`
   - `client_{uuid}_groq_api_key`
   - `client_{uuid}_meta_access_token`
3. **RLS policies** filter all tables by `client_id`

**Evidência:** direct-ai-client.ts:18 (getClientVaultCredentials)

**Libs:**
- `src/lib/vault.ts` - Vault credential manager
- `src/lib/config.ts` - Client configuration loader
- `src/lib/supabase.ts` - Supabase client factory
- `src/lib/supabase-server.ts` - Server-side client
- `src/lib/supabase-browser.ts` - Browser client

### 5.3 Core Tables (Inferido do código)

| Table | Purpose | Tenant Field | Evidência |
|-------|---------|--------------|-----------|
| `clients` | SaaS customers | N/A (root) | Config loader |
| `user_profiles` | User accounts | `client_id` | dashboard/page.tsx:37 |
| `clientes_whatsapp` | WhatsApp contacts | `client_id` | CLAUDE.md reference |
| `n8n_chat_histories` | Chat memory | `client_id` | chatHistory node |
| `documents` | RAG knowledge base | `client_id` | RAG node |
| `conversations` | Conversation state | `client_id` | Conversations page |
| `messages` | Message history | `client_id` | Messages |
| `gateway_usage_logs` | AI usage tracking | `client_id` | direct-ai-tracking.ts:20 |
| `ai_models_registry` | Model catalog | N/A (shared) | Pricing |
| `client_budgets` | Budget limits | `client_id` | Budget check |

**Migrations:** `supabase/migrations/` (20 files encontrados)

---

## 6. Infrastructure Layer

### 6.1 Library Organization

**Evidência:** Glob src/lib/*.ts (53 files)

| Library | Purpose | Evidência |
|---------|---------|-----------|
| `direct-ai-client.ts` | AI calls (main interface) | Lido |
| `vault.ts` | Credential management | Import ref |
| `unified-tracking.ts` | Budget + usage | Import ref |
| `direct-ai-tracking.ts` | AI usage logs | Import ref |
| `supabase.ts` | Supabase client factory | Import ref |
| `redis.ts` | Redis client | Import ref |
| `storage.ts` | File storage | chatbotFlow:46 |
| `meta.ts` | WhatsApp API client | Inferred |
| `stripe.ts` | Stripe platform | Glob |
| `stripe-connect.ts` | Stripe Connect | Glob |
| `gmail.ts` | Email notifications | Glob |
| `logger.ts` | Execution logging | chatbotFlow:30 |
| `config.ts` | Client config loader | Glob |
| `types.ts` | TypeScript definitions | chatbotFlow:1-5 |
| `utils.ts` | Generic utilities | Glob |
| `schemas.ts` | Zod schemas | Glob |
| `rate-limit.ts` | Rate limiting | Glob |
| `dedup.ts` | Deduplication | Glob |
| `webhookCache.ts` | Webhook caching | Glob |
| `flowHelpers.ts` | Flow orchestration | chatbotFlow:44 |
| `chunking.ts` | Text chunking (RAG) | Glob |
| `openai.ts` | OpenAI helpers | Glob |
| `groq.ts` | Groq helpers | Glob |
| `elevenlabs.ts` | TTS (Text-to-Speech) | Glob |
| `audio-converter.ts` | Audio format conversion | Glob |
| `biometricAuth.ts` | Mobile biometric auth | Glob |
| `deepLinking.ts` | Mobile deep links | Glob |
| `pushNotifications.ts` | Push notifications | Glob |
| `firebase-admin.ts` | Firebase Admin SDK | Glob |
| `calendar-client.ts` | Calendar integration | Glob |
| `google-calendar-*.ts` | Google Calendar OAuth | Glob (3 files) |
| `microsoft-calendar-*.ts` | Microsoft Calendar OAuth | Glob (2 files) |
| `meta-oauth.ts` | Meta OAuth | Glob |
| `meta-leads.ts` | Meta Leads integration | Glob |
| `crm-automation-constants.ts` | CRM constants | Glob |
| `agent-templates.ts` | Agent prompt templates | Glob |
| `prompt-builder.ts` | Dynamic prompt building | Glob |
| `waba-lookup.ts` | WABA ID lookup | Glob |
| `auth-helpers.ts` | Auth utilities | Glob |
| `admin-helpers.ts` | Admin utilities | Glob |
| `auto-provision.ts` | Auto client provisioning | Glob |
| `audit.ts` | Audit logging | Glob |
| `sanitizedLogger.ts` | Sanitized logs (no PII) | Glob |

**Total:** 53 library files

### 6.2 Supabase Client Patterns

**3 client types:**

1. **Server Client (API Routes/Server Components)**
```typescript
// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
// Uses service role key - full access
```

2. **Browser Client (Client Components)**
```typescript
// src/lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'
// Uses anon key - RLS enforced
```

3. **Service Role Client (Admin operations)**
```typescript
// src/lib/supabase.ts
// For operations that bypass RLS (internal only)
```

**Evidência:**
- dashboard/page.tsx:26 uses `createClientBrowser()`
- chatbotFlow.ts:32 uses `createServiceRoleClient()`

---

## 7. Message Processing Flow (Detailed)

### 7.1 Webhook Reception

**Entry Point:** `src/app/api/webhook/received/route.ts`

**Webhook signature (inferido):**
```typescript
POST /api/webhook/received
Headers:
  - x-hub-signature-256 (Meta verification)
Body:
  - entry[].changes[].value.messages[]
  - entry[].changes[].value.statuses[]
```

**Evidência:** CLAUDE.md references webhook at `/api/webhook/[clientId]/route.ts`

**Processing:**
1. Verify Meta signature
2. Extract message/status updates
3. Call `chatbotFlow.processChatbotMessage()`

### 7.2 Message Batching (Redis)

**Purpose:** Prevent duplicate AI responses if user sends multiple messages rapidly

**Implementation:**
```typescript
// Evidência: chatbotFlow.ts:8 (batchMessages import)
// Evidência: chatbotFlow.ts:20 (pushToRedis import)

// 1. Push message to Redis key: batch:{client_id}:{phone}
// 2. Set TTL: 30 seconds
// 3. Wait 30s
// 4. Pop all messages from batch
// 5. Process as single AI request with concatenated content
```

**Redis Lib:** `src/lib/redis.ts`
**Cache Lib:** `src/lib/webhookCache.ts` (adicional)

### 7.3 RAG Context Injection

**Evidência:** chatbotFlow.ts:16 (getRAGContext import)

**Flow:**
1. User message → Generate embedding (OpenAI)
2. Vector search in `documents` table (pgvector)
3. Cosine similarity > 0.8
4. Top 5 chunks
5. Inject into AI prompt as context

**Chunking:** `src/lib/chunking.ts`
- 500 tokens per chunk
- 20% overlap
- Semantic boundaries

---

## 8. Stripe Connect Architecture

**Dual Context:**

```mermaid
graph TD
    subgraph "Context A: UzzAI Platform Billing"
        UA[UzzAI Platform Account]
        UA --> PC[Platform Customers - SaaS Clients]
        PC --> SUB[Subscriptions]
        PC --> SETUP[Setup Fees]
    end

    subgraph "Context B: Client Stores"
        CA[Client Connected Account]
        CA --> STORE[Client's Online Store]
        STORE --> CONSUMER[End Consumers]
        CONSUMER --> CHECKOUT[Checkout Session]
        CHECKOUT --> FEE[Platform Fee 10%]
        FEE --> UA
    end
```

**Evidência:** `.env.mobile.example:59-90`

**Webhooks:**
- V1 Webhook (`STRIPE_WEBHOOK_SECRET`) - Platform subscriptions/payments
- V2 Thin Events (`STRIPE_CONNECT_WEBHOOK_SECRET`) - Connected account events

**Libs:**
- `src/lib/stripe.ts` - Platform Stripe client
- `src/lib/stripe-connect.ts` - Connect operations

**Store Routes:**
- `/store/[clientSlug]` - Public store
- `/store/[clientSlug]/[productId]` - Product page
- `/store/[clientSlug]/success` - Payment success
- `/store/[clientSlug]/cancel` - Payment canceled

---

## 9. Mobile Architecture (Capacitor)

### 9.1 Build Strategy

**Web Build:** Standard Next.js SSR/SSG
**Mobile Build:** Static export (no server-side features)

**Evidência:** next.config.js:2-5
```javascript
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'
const nextConfig = {
  output: isMobileBuild ? 'export' : undefined,
```

### 9.2 Mobile-Specific Features

**Plugins (Capacitor):**
- `@capacitor/app` - App lifecycle, deep links
- `@capacitor/network` - Network status
- `@capacitor/push-notifications` - Firebase push
- `@capacitor/status-bar` - Status bar styling
- `@aparajita/capacitor-biometric-auth` - Biometric auth

**Evidência:** package.json:27-35

**Libs:**
- `src/lib/biometricAuth.ts` - Biometric helpers
- `src/lib/deepLinking.ts` - Deep link handling
- `src/lib/pushNotifications.ts` - Push notification handlers
- `src/lib/firebase-admin.ts` - Firebase Admin SDK
- `src/lib/push-dispatch.ts` - Push dispatch logic

**Components:**
- `src/components/BiometricAuthButton.tsx` - Biometric login button
- `src/components/DeepLinkingProvider.tsx` - Deep link provider
- `src/components/PushNotificationsProvider.tsx` - Push provider

**Deep Link Pattern:** `uzzapp://...`

### 9.3 API Calls em Mobile

**Mobile apps NÃO usam:**
- API routes locais (não existem em static export)

**Mobile apps USAM:**
```typescript
// Evidência: .env.mobile.example:38-39
NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br

// Todas as chamadas fetch vão para produção
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/...`)
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client App
    participant S as Supabase Auth
    participant DB as Database (RLS)

    U->>C: Enter email/password
    C->>S: signInWithEmail()
    S->>S: Verify credentials
    S->>C: Return JWT session
    C->>S: getUser() with JWT
    S->>C: Return user object
    C->>DB: Query user_profiles
    DB->>DB: Check RLS (auth.uid())
    DB->>C: Return profile + client_id
    C->>U: Redirect to /dashboard
```

**Evidência:**
- login/page.tsx:93 (signInWithEmail)
- login/page.tsx:115-126 (fetch user_profiles)
- dashboard/page.tsx:29-42 (client-side auth check)

**OAuth Providers:**
- Google
- GitHub
- Microsoft (Azure AD)

**Evidência:** login/page.tsx:146-155

### 10.2 RLS (Row Level Security)

**Pattern (expected):**
```sql
-- Example policy
CREATE POLICY "Users can only see own client data"
ON table_name
FOR SELECT
USING (client_id = (
  SELECT client_id FROM user_profiles WHERE id = auth.uid()
))
```

**Enforcement:**
- All queries automatically filtered by Supabase
- No manual client_id filtering needed in code
- Vault queries use service role (bypass RLS for fetching credentials)

### 10.3 CORS & Security Headers

**Evidência:** next.config.js:57-125

**Configured:**
- CORS for /api/* (allow all origins)
- CORS for /api/webhook/* (restrict to Meta)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(self)

---

## 11. Observability & Monitoring

### 11.1 Execution Logging

**Evidência:** chatbotFlow.ts:30
```typescript
import { createExecutionLogger } from "@/lib/logger"
```

**Usage (expected):**
```typescript
const logger = createExecutionLogger(clientId, conversationId)
logger.info('Node executed', { node: 'parseMessage', data })
```

**Storage:** Likely `execution_logs` table (migration 002_execution_logs.sql)

### 11.2 Usage Tracking

**Tables:**
- `gateway_usage_logs` - AI API calls
- `client_budgets` - Budget limits & usage

**Tracking Functions:**
- `logDirectAIUsage()` - AI calls
- `checkBudgetAvailable()` - Pre-flight budget check

**Evidência:**
- direct-ai-client.ts:19-20
- unified-tracking.ts (budget enforcement)

### 11.3 Audit Logging

**Lib:** `src/lib/audit.ts`

**Expected:** Audit trail for admin actions (user creation, budget changes, config updates)

---

## 12. Performance Optimizations

### 12.1 Webpack Externals

**Evidência:** next.config.js:25-33

**Externalized:**
- `fluent-ffmpeg` - Prevent bundling large binaries
- `@ffmpeg-installer/ffmpeg` - FFmpeg installer

**Reason:** Reduce bundle size, prevent serverless timeouts

### 12.2 Watch Optimization

**Evidência:** next.config.js:36-52

**Ignored in dev watch:**
- node_modules
- .git
- .next
- db/
- docs/
- supabase/
- capacitor/
- *.md
- *.log

**Aggregate timeout:** 300ms (reduce rebuild frequency)

### 12.3 Image Optimization

**Evidência:** next.config.js:6-20

**Remote Patterns:**
- `**.supabase.co/storage/v1/object/public/**` (Supabase Storage)
- `graph.facebook.com/**` (WhatsApp profile pictures)

**Mobile:** `unoptimized: true` (static export)

---

## 13. Error Handling & Edge Cases

### 13.1 Serverless Connection Pooling

**CRÍTICO (do CLAUDE.md):**

❌ **NUNCA usar `pg` direto em serverless:**
```typescript
// ❌ BAD (causes hangs)
const { Pool } = require('pg')
const pool = new Pool()
```

✅ **SEMPRE usar Supabase client:**
```typescript
// ✅ GOOD (Supavisor pooler)
const supabase = createServerClient()
await supabase.from('table').upsert(...)
```

**Evidência:** CLAUDE.md Critical Decision #1

### 13.2 Webhook MUST Await

**Evidência:** CLAUDE.md Critical Decision #2

```typescript
// ❌ BAD (fire-and-forget kills async work)
processChatbotMessage(body)
return NextResponse.json({ status: 200 })

// ✅ GOOD (wait for completion)
await processChatbotMessage(body)
return NextResponse.json({ status: 200 })
```

**Reason:** Serverless functions terminate after HTTP response

### 13.3 Tool Call Stripping

**Problem:** AI responses include `<function=...>` tags in text

**Solution:** Strip before sending to WhatsApp

**Evidência:** CLAUDE.md Critical Decision #5
```typescript
const removeToolCalls = (text: string): string => {
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
}
```

**Location:** `src/nodes/formatResponse.ts`

---

## 14. Deployment Architecture

```mermaid
graph TD
    subgraph "Vercel (Serverless)"
        WEB[Web App<br/>Next.js SSR]
        API[API Routes<br/>Serverless Functions]
        WEBHOOK[Webhook Handler<br/>/api/webhook/received]
    end

    subgraph "Supabase Cloud"
        PG[PostgreSQL<br/>Multi-tenant DB]
        AUTH[Auth Service<br/>JWT]
        STORAGE[Storage<br/>Media files]
        VAULT_S[Vault<br/>Client secrets]
        REALTIME[Realtime<br/>Broadcasts]
    end

    subgraph "External Services"
        WHATSAPP[Meta WhatsApp<br/>Cloud API]
        GROQ[Groq<br/>Llama 3.3 70B]
        OPENAI[OpenAI<br/>Whisper, GPT-4o, Embeddings]
        REDIS_EXT[Upstash Redis<br/>Message batching]
        STRIPE_EXT[Stripe<br/>Payments]
    end

    subgraph "Mobile Apps"
        IOS[iOS App<br/>Capacitor]
        ANDROID[Android App<br/>Capacitor]
    end

    WHATSAPP -->|Webhook| WEBHOOK
    WEBHOOK -->|Process| API
    API --> PG
    API --> VAULT_S
    API --> STORAGE
    API --> REALTIME
    API --> GROQ
    API --> OPENAI
    API --> REDIS_EXT
    API --> STRIPE_EXT
    API -->|Send messages| WHATSAPP

    IOS -->|HTTPS| WEB
    IOS -->|API| API
    ANDROID -->|HTTPS| WEB
    ANDROID -->|API| API

    WEB --> AUTH
    WEB --> PG
```

**Hosting:**
- **Web + API:** Vercel (serverless)
- **Database:** Supabase (managed PostgreSQL)
- **Cache:** Upstash Redis (serverless Redis)
- **Storage:** Supabase Storage
- **Mobile:** App Store + Google Play

---

## 15. Technology Stack Summary

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind, shadcn/ui | Web & mobile UI |
| **Backend** | Next.js API Routes, Serverless functions | API & webhooks |
| **Database** | Supabase (PostgreSQL + pgvector) | Multi-tenant data |
| **Auth** | Supabase Auth, OAuth (Google/GitHub/Azure) | Authentication |
| **Secrets** | Supabase Vault | Client credentials |
| **Cache** | Redis (Upstash) | Message batching |
| **Storage** | Supabase Storage | Media files (PDFs, images, audio) |
| **AI** | Groq, OpenAI, Anthropic, Google | Chatbot intelligence |
| **Messaging** | Meta WhatsApp Business API | WhatsApp integration |
| **Payments** | Stripe Connect | Platform + client billing |
| **Mobile** | Capacitor 7, iOS, Android | Native mobile apps |
| **Monitoring** | Custom execution logs, usage tracking | Observability |
| **Email** | Nodemailer + Gmail | Notifications |

---

## 16. Code Organization Principles

### 16.1 Functional Programming

**Evidência:** CLAUDE.md Code Patterns

**Principles:**
- Only `const` (never `let`/`var`)
- Arrow functions
- No classes
- Immutable data
- Pure functions (nodes)
- Descriptive naming

### 16.2 Modularization

**Separation:**
- `/src/app` - Routes (pages + API)
- `/src/components` - UI components
- `/src/flows` - Flow orchestrators
- `/src/nodes` - Business logic (pure functions)
- `/src/lib` - Infrastructure (clients, helpers)
- `/src/hooks` - React hooks (expected, not verified)

### 16.3 TypeScript Patterns

**Path alias:** `@/*` → `./src/*`

**Evidência:** tsconfig.json:24-28

**Strict mode:** DISABLED (`tsconfig.json:10` - `"strict": false`)

⚠️ **Note:** Reduced type safety

---

## 17. Architectural Decisions (ADRs - Extracted)

| Decision | Rationale | Trade-offs | Evidência |
|----------|-----------|------------|-----------|
| **Direct AI Client (no gateway)** | Simpler, better isolation, transparent errors | No centralized cache, no shared keys | direct-ai-client.ts:1-13 |
| **Vault per client** | Complete multi-tenant isolation | Increased complexity | vault.ts |
| **Redis batching** | Prevent duplicate AI responses | 30s delay in high-traffic | chatbotFlow.ts:8 |
| **Serverless (Vercel)** | Auto-scaling, low ops | Cold starts, Supabase client required | next.config.js |
| **Static export mobile** | Works offline | No SSR, API via HTTPS to prod | next.config.js:5 |
| **14-node pipeline** | Clear separation of concerns | More files to maintain | chatbotFlow.ts |
| **RLS everywhere** | Automatic tenant isolation | Complex policies | Inferred |
| **PostgreSQL (not MongoDB)** | ACID, strong typing, pgvector | Less flexible schema | Supabase choice |

---

## 18. Risks & Technical Debt

### 18.1 Type Safety

⚠️ **TypeScript strict: false**

**Impact:** Reduced compile-time error detection

**Mitigation:** Manual type checks, runtime validation (Zod)

### 18.2 Test Coverage

⚠️ **Test files:** Not extensively verified in this checkpoint

**Expected:** `*.test.ts` files (Jest configured)

**Action needed:** Verify test coverage per module

### 18.3 Error Boundaries

⚠️ **React error boundaries:** Not verified

**Expected:** `error.tsx` files in app directory

**Action needed:** Verify error handling UI

---

**FIM DA ARQUITETURA**

**Próximos documentos a criar:**
- 07_DATA_ACCESS_MAP.md (Supabase queries catalogadas)
- 08_SUPABASE_SCHEMA_FROM_MIGRATIONS_AND_BACKUP.md
- 10_TENANCY_ENFORCEMENT.md
- 91_MAIN_FLOWS.md (fluxogramas detalhados)
