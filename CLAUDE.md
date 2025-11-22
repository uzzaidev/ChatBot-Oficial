# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to Use This Document

**Before starting any task:**
1. Read "Project Overview" (understand current state)
2. Check "Quick Reference" (find relevant entry points)
3. Read "Database Schema Reference" if touching database

**When implementing features:**
- Check "Code Patterns" for style guidelines
- Review "Architecture Overview" for system design
- Consult "Critical Technical Decisions" to avoid known pitfalls

**When debugging:**
- Start with "Common Issues - Quick Lookup"
- Then "Common Errors" section
- Finally "Debugging Webhook Issues"

**When modifying database:**
- **ALWAYS** check `docs/tables/tabelas.md` first
- Follow `db/MIGRATION_WORKFLOW.md`
- Review "Database Migrations & Schema Changes"

---

## Project Overview

WhatsApp SaaS chatbot system with AI-powered conversations through WhatsApp Business API. Built with Next.js 14, TypeScript, and serverless architecture.

**Current State**: ✅ **Phase 4 Complete** - Production Multi-Tenant SaaS with full RBAC, Auth, and Supabase Vault
**Tech Stack**: Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Vault), Redis, Groq (Llama 3.3 70B), OpenAI (Whisper, GPT-4o Vision)

**Migration History:**
- **Phase 1:** n8n workflow only
- **Phase 2:** Next.js dashboard (read-only)
- **Phase 2.5:** Node-based architecture in Next.js (replaced n8n)
- **Phase 3:** Supabase Vault + Multi-tenant webhooks
- **Phase 4:** ✅ COMPLETE - RBAC, Auth, Admin Panel, Real-time notifications

---

## Quick Reference for Common Tasks

### Starting Development
```bash
npm install              # ALWAYS run first
npm run dev              # Start dev server (localhost:3000)
```

**Prerequisites:**
- Create `.env.local` from `.env.example`
- Check `docs/tables/tabelas.md` before any database work
- Run migrations in Supabase if first time (`supabase db push`)

### Key Entry Points

| Task | File(s) |
|------|---------|
| **Webhook Entry** | `src/app/api/webhook/[clientId]/route.ts` |
| **Main Orchestrator** | `src/flows/chatbotFlow.ts` (14-node pipeline) |
| **Flow Visualization** | `/dashboard/flow-architecture` (Interactive Mermaid diagram) |
| **Node Functions** | `src/nodes/*` (atomic, pure functions) |
| **Multi-tenant Config** | `src/lib/config.ts` (Vault integration) |
| **AI Prompts** | `src/nodes/generateAIResponse.ts`, `formatResponse.ts` |
| **RAG Knowledge Base** | `/dashboard/knowledge` (Upload documents for AI context) |
| **Database Schema** | `docs/tables/tabelas.md` |
| **Migrations** | `supabase/migrations/*`, `db/MIGRATION_WORKFLOW.md` |

### RAG System (Knowledge Base)

**Status**: ✅ **ACTIVE** - Fully implemented and functional

The RAG (Retrieval-Augmented Generation) system allows clients to upload documents (PDFs, TXTs) that the chatbot can use to answer domain-specific questions.

**How it works**:
1. Client uploads document via `/dashboard/knowledge`
2. Document is processed with semantic chunking (500 tokens, 20% overlap)
3. Embeddings generated using OpenAI text-embedding-3-small (1536 dimensions)
4. Chunks stored in `documents` table with pgvector
5. When user asks question, system searches similar chunks (cosine similarity > 0.8)
6. Top 5 relevant chunks injected into AI prompt as context

**Key files**:
- **Upload UI**: `src/app/dashboard/knowledge/page.tsx`
- **API Upload**: `src/app/api/documents/upload/route.ts`
- **API List**: `src/app/api/documents/route.ts`
- **API Delete**: `src/app/api/documents/[filename]/route.ts`
- **RAG Context Retrieval**: `src/nodes/getRAGContext.ts`
- **Document Processing**: `src/nodes/processDocumentWithChunking.ts`
- **SQL Function**: `migrations/20251121_create_match_documents_function.sql`

**Usage**:
```bash
# Navigate to dashboard
http://localhost:3000/dashboard/knowledge

# Upload PDF or TXT file (max 10MB)
# Documents are automatically processed and available immediately

# To query documents from code:
const context = await getRAGContext({
  query: "What is the warranty policy?",
  clientId: "client-uuid",
  openaiApiKey: "sk-..."
})
```

**Important notes**:
- Requires migration `20251121_create_match_documents_function.sql` applied to Supabase
- Requires pgvector extension enabled in Supabase
- Documents are multi-tenant isolated (client_id)
- Cost: ~$0.02 per 1M tokens for embeddings

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build (may fail with Google Fonts in restricted networks)
npm run lint             # Run ESLint
npx tsc --noEmit         # Type checking (informational - pre-existing errors exist)

# Database
supabase migration new <name>    # Create new migration
supabase db push                 # Apply migrations to production
supabase db diff                 # Show diff between local and remote

# Backup
cd db
.\backup-complete.bat           # Backup public + auth schemas
.\backup-postgres.bat           # Backup application data only
.\backup-auth.bat               # Backup Supabase Auth users only
```

---

## Common Issues - Quick Lookup

| Error Message / Symptom | Likely Cause | Fix Location |
|------------------------|--------------|--------------|
| "Missing NEXT_PUBLIC_SUPABASE_URL" | No `.env.local` file | Create from `.env.example`, restart dev server |
| "column 'type' does not exist" | Using `type` as column instead of JSON field | See Critical Decision #4 |
| "No overload matches this call" | Table name with space | See Critical Decision #3 |
| "NODE 3 freezing" / Query hangs | Using `pg` in serverless | See Critical Decision #1 |
| "Token verification failed" | Wrong `META_VERIFY_TOKEN` | Check `.env.local` matches Meta Dashboard |
| Messages with `<function=...>` | Tool calls not stripped | See Critical Decision #5 |
| "Redis connection failed" | Redis not running | Start Redis or check `REDIS_URL` (flow continues gracefully) |
| "Failed to send WhatsApp message" | Invalid Meta token or phone ID | Check `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID` |
| TypeScript errors in IDE | Pre-existing errors (7 errors) | Only fix if modifying affected files |
| Build fails with Google Fonts | Network restrictions | Expected in sandboxed environments (comment out in `layout.tsx`) |

---

## Development Commands

```bash
# Install dependencies (ALWAYS run first)
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build (may fail in restricted networks due to Google Fonts)
npm run build
npm start

# Linting
npm run lint

# Type checking (informational - shows pre-existing errors)
npx tsc --noEmit
```

**CRITICAL**: Create `.env.local` from `.env.example` before running dev server. Missing environment variables will cause build failures.

---

## Architecture Overview

### Node-Based Message Processing Pipeline

The system uses a **flow orchestration pattern** where individual nodes (pure functions) are composed into a complete message processing pipeline. This architecture replaced the previous n8n workflow.

**Flow**: `src/flows/chatbotFlow.ts` - Main orchestrator that chains 13 nodes sequentially
**Nodes**: `src/nodes/*` - Atomic, reusable functions (one responsibility each)
**API Endpoint**: `/api/webhook/[clientId]` - Multi-tenant webhook receiver (Meta WhatsApp)

### Message Processing Flow (13 Nodes)

```
WhatsApp → Webhook → chatbotFlow → 13 Nodes → WhatsApp Response
```

**Nodes in sequence**:

1. **Filter Status Updates** - Ignores delivery receipts, only processes messages
2. **Parse Message** - Extracts phone, name, content, type from Meta payload
3. **Check/Create Customer** - Upserts customer in `clientes_whatsapp` table
4. **Download Media** - Fetches audio/image from Meta API (if not text)
5. **Normalize Message** - Converts all message types to text (Whisper for audio, GPT-4o Vision for images)
6. **Push to Redis** - Adds message to Redis list keyed by phone number
7. **Save User Message** - Stores message in PostgreSQL chat history
8. **Batch Messages** - Waits 10s, retrieves all messages from Redis (batching strategy)
9. **Get Chat History** - Fetches last 15 messages from PostgreSQL
10. **Get RAG Context** - Vector search in Supabase for relevant knowledge
11. **Generate AI Response** - Groq Llama 3.3 70B with tools (diagnostic subagent, human handoff)
12. **Format Response** - Splits response into natural WhatsApp messages (splits on `\n\n`)
13. **Send WhatsApp Message** - Loops through formatted messages, sends via Meta API

**Critical Design Patterns**:
- Each node is a pure function (no side effects except I/O)
- Flow uses `try-catch` per node with execution logging
- Redis batching prevents duplicate AI responses for rapid user messages
- Parallel execution for independent nodes (9 & 10)
- Tool calls trigger special flows (human handoff, diagnostic subagent)

### Data Storage

**⚠️ CRITICAL - Database Schema Reference**

**ALWAYS check `docs/tables/tabelas.md` before working with database queries or migrations.**

This file contains:
- Complete table structures with exact column names and types
- Active RLS policies
- Triggers and functions
- SQL commands to query database schema

**Why this is critical**:
- ⚠️ This database is shared with another application (poker system)
- ⚠️ Column names use Portuguese (e.g., `telefone`, `nome` NOT `phone`, `name`)
- ⚠️ Data types may differ from expectations (e.g., `telefone` is NUMERIC, not TEXT)
- ⚠️ RLS policies must reference correct tables (`user_profiles`, NOT `auth.users`)

**Supabase (PostgreSQL)**:
- `clientes_whatsapp` - Customer records (⚠️ columns: `telefone` NUMERIC, `nome` TEXT, `status` TEXT)
- `n8n_chat_histories` - Conversation memory (sessionId = phone number, 15 message window)
- `documents` - Vector store for RAG (pgvector with OpenAI embeddings)
- `clients` - Multi-tenant config table
- `user_profiles` - User profiles (contains `client_id` for RLS policies)
- `conversations` - Conversation state tracking
- `messages` - Message history with metadata
- `usage_logs` - API usage tracking (tokens, costs)
- `pricing_config` - Custom pricing configurations

### Database Migrations & Schema Changes

**⚠️ CRITICAL RULE**: ALWAYS use migrations for structural database changes. NEVER execute `ALTER TABLE`, `CREATE TABLE`, or similar SQL directly in Supabase Dashboard for production changes.

**Workflow**:

```bash
# 1. Create migration file
supabase migration new add_feature_name

# 2. Edit generated file in supabase/migrations/TIMESTAMP_add_feature_name.sql
# Add your SQL (ALTER TABLE, CREATE INDEX, RLS policies, etc)

# 3. Test locally (optional)
supabase db reset  # Reapplies all migrations from scratch

# 4. Apply to production
supabase db push

# 5. Commit to Git
git add supabase/migrations/
git commit -m "feat: add feature_name to database"
```

**Example - Adding a new column**:

```sql
-- supabase/migrations/20251030_add_media_url_to_messages.sql

-- Add column for media attachments
ALTER TABLE public.messages
ADD COLUMN media_url TEXT;

-- Index for filtering media messages
CREATE INDEX idx_messages_media_url
ON public.messages(media_url)
WHERE media_url IS NOT NULL;

-- Documentation
COMMENT ON COLUMN public.messages.media_url
IS 'URL do arquivo de mídia (imagem, áudio, vídeo, documento)';
```

**Backup Strategy**:

Before risky migrations, create backups:

```powershell
cd db

# Backup both schemas (public + auth)
.\backup-complete.bat

# Or individual schemas
.\backup-postgres.bat  # Application data (public schema)
.\backup-auth.bat      # Supabase Auth users (auth schema)
```

**Generated files**:
- `chatbot_full_TIMESTAMP.sql` - Complete backup with structure + data
- `chatbot_structure_TIMESTAMP.sql` - DDL only (CREATE TABLE, etc)
- `chatbot_data_TIMESTAMP.sql` - INSERT statements only
- `auth_full_TIMESTAMP.sql` - Auth schema backup (⚠️ contains hashed passwords)

**Rollback strategy**:

Supabase migrations **do not have automatic rollback**. Options:

1. **Create reversal migration** (recommended):
   ```bash
   supabase migration new revert_feature_name
   # Write SQL to undo previous changes
   ```

2. **Restore from backup** (if migration caused data corruption):
   ```powershell
   psql "YOUR_CONNECTION_STRING" -f db\chatbot_full_TIMESTAMP.sql
   ```

**What NOT to do**:
- ❌ Edit already-applied migration files
- ❌ Delete migration files (they're version history)
- ❌ Use migrations to insert production data (use API or separate seed files)
- ❌ Modify legacy n8n tables (`clientes_whatsapp`, `n8n_chat_histories`, `documents`) without coordination

**See**: `db/MIGRATION_WORKFLOW.md` for complete guide with examples

**Redis**:
- Message batching: `chat:${phone}` (list structure)
- TTL: Messages expire after processing

**PostgreSQL (Direct Connection)**:
- Chat history via `pg` library (not Supabase client)
- Connection string: `DATABASE_URL` env var

### AI System

**Main Agent** (Groq Llama 3.3 70B):
- Role: Virtual assistant for Luis Fernando Boff
- Expertise: Solar Energy, Data Science, Full Stack Development
- Behavior: Consultative, empathetic, professional (no emojis)
- Tools:
  - `transferir_atendimento` - Human handoff
  - `subagente_diagnostico` - Diagnostic routing agent

**RAG Knowledge Base**:
- Vector search with OpenAI embeddings
- Supabase RPC function: `match_documents(query_embedding, match_count)`
- Top 5 most relevant documents injected into system prompt

**Chat Memory**:
- Last 15 messages per session (phone number = sessionId)
- Format: `[{role: "user" | "ai", message: string}]`

### Multi-Message Response Strategy

AI responses are split into multiple WhatsApp messages to improve UX:

1. AI generates single response
2. Second AI agent (Groq) splits on `\n\n` boundaries
3. Rules: Never break sentences, keep lists intact, always 2+ messages
4. Messages sent with 2s delay between each

### Human Handoff Flow

When `transferir_atendimento` tool is called:

1. Update customer status to "Transferido" in Supabase
2. Fetch full chat history from PostgreSQL
3. Third AI agent summarizes conversation
4. Send email via Gmail to luisfboff@hotmail.com
5. Stop bot responses (future messages skip AI processing)

---

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/
│   │   │   ├── [clientId]/route.ts   # ⚡ WEBHOOK MULTI-TENANT (principal)
│   │   │   └── route.ts               # ⚠️ DEPRECATED (retorna 410 Gone)
│   │   ├── conversations/route.ts     # Dashboard: List conversations
│   │   ├── messages/[phone]/route.ts  # Dashboard: Fetch messages
│   │   ├── commands/                  # Dashboard actions (send message, transfer)
│   │   ├── debug/                     # Debug endpoints (logs, env, executions)
│   │   └── test/                      # Node testing endpoints
│   ├── dashboard/                     # React dashboard UI
│   │   ├── page.tsx                   # Main dashboard (metrics, conversation list)
│   │   ├── conversations/[phone]/     # Conversation detail view
│   │   ├── workflow/                  # Workflow execution viewer
│   │   ├── flow-architecture/         # 🎛️ Flow Architecture Manager (Mermaid diagram)
│   │   ├── settings/                  # ⚙️ Configuração Vault (API keys)
│   │   └── debug/                     # Debug dashboard (env vars, logs)
│   ├── layout.tsx                     # Root layout (Google Fonts)
│   └── globals.css                    # Tailwind CSS
├── flows/
│   └── chatbotFlow.ts                 # 🔥 Main orchestrator (14-node pipeline)
├── nodes/                             # 🧩 Atomic functions (one per node)
│   ├── filterStatusUpdates.ts         # [1] Filtra status updates
│   ├── parseMessage.ts                # [2] Parse payload Meta
│   ├── checkOrCreateCustomer.ts       # [3] Upsert cliente
│   ├── downloadMetaMedia.ts           # [4] Download mídia
│   ├── normalizeMessage.ts            # [5] Normaliza (áudio→texto, img→texto)
│   ├── pushToRedis.ts                 # [6] Push para fila Redis
│   ├── saveChatMessage.ts             # [7] Salva msg no histórico
│   ├── batchMessages.ts               # [8] Batch msgs (10s delay)
│   ├── getChatHistory.ts              # [9] Busca histórico PostgreSQL
│   ├── getRAGContext.ts               # [10] Vector search Supabase
│   ├── generateAIResponse.ts          # [11] Groq/OpenAI gera resposta
│   ├── formatResponse.ts              # [12] Split em msgs WhatsApp
│   ├── sendWhatsAppMessage.ts         # [13] Envia via Meta API
│   ├── handleHumanHandoff.ts          # Tool: Transferência para humano
│   └── index.ts                       # Barrel export
├── lib/
│   ├── config.ts                      # Multi-tenant config (Vault)
│   ├── vault.ts                       # Supabase Vault helpers
│   ├── supabase.ts                    # Supabase client factory
│   ├── postgres.ts                    # Direct PostgreSQL connection
│   ├── redis.ts                       # Redis client
│   ├── groq.ts                        # Groq SDK client
│   ├── openai.ts                      # OpenAI SDK client
│   ├── meta.ts                        # WhatsApp Business API helpers
│   ├── gmail.ts                       # Gmail API (human handoff emails)
│   ├── logger.ts                      # Execution logger (in-memory)
│   ├── webhookCache.ts                # In-memory webhook message cache
│   ├── types.ts                       # TypeScript type definitions
│   └── utils.ts                       # Utility functions (cn, etc.)
├── components/
│   ├── ui/                            # shadcn/ui components (DON'T edit directly)
│   ├── FlowArchitectureManager.tsx   # 🎛️ Interactive Mermaid flow diagram (click-to-configure)
│   ├── ConversationList.tsx
│   ├── ConversationDetail.tsx
│   ├── MessageBubble.tsx
│   ├── MetricsDashboard.tsx
│   └── SendMessageForm.tsx
└── hooks/
    ├── useConversations.ts            # Fetch conversation list (polling)
    ├── useMessages.ts                 # Fetch messages for phone number
    ├── useRealtimeMessages.ts         # Supabase realtime subscriptions
    └── use-toast.ts                   # Toast notifications
```

---

## Key Configuration

### Environment Variables

**Required for Production**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Meta (WhatsApp Business API)
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=your_verify_token_here

# OpenAI
OPENAI_API_KEY=sk-...

# Groq
GROQ_API_KEY=gsk_...

# Redis
REDIS_URL=redis://localhost:6379

# PostgreSQL (direct connection for chat history)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Gmail (for human handoff notifications)
GMAIL_USER=email@gmail.com
GMAIL_APP_PASSWORD=app_password_here
```

**Where to get credentials**:
- **Supabase**: https://app.supabase.com/project/_/settings/api
- **Meta**: https://developers.facebook.com/apps/ → WhatsApp → API Setup
- **OpenAI**: https://platform.openai.com/api-keys
- **Groq**: https://console.groq.com/keys
- **Gmail App Password**: Google Account → Security → 2-Step Verification → App passwords

### Database Setup

**MUST RUN** `migration.sql` in Supabase SQL Editor before first use.

**Existing tables from n8n** (DO NOT modify):
- `Clientes WhatsApp` - Customer records (used by chatbot flow)
- `n8n_chat_histories` - Chat memory (used by node 9)
- `documents` - Vector store (used by node 10)

**New tables for Phase 3/4** (actively used):
- `clients` - Multi-tenant configuration
- `user_profiles` - User profiles with RBAC
- `bot_configurations` - Node configurations (prompts, temperature, thresholds, enable/disable)
- `conversations` - Conversation state tracking
- `messages` - Message history with metadata
- `usage_logs` - Cost tracking (OpenAI tokens, Meta messages)
- `pricing_config` - Custom pricing per client

---

## Important Concepts

### Message Batching Strategy (Redis)

**Problem**: Users send multiple messages in quick succession (e.g., 3 messages in 5 seconds)
**Without batching**: Each message triggers separate AI response → poor UX
**Solution**:

1. Push each message to Redis list: `chat:${phone}`
2. Wait 10 seconds (Node 8)
3. Retrieve all messages from list (LRANGE + DELETE)
4. Concatenate into single context
5. Process as one AI request

**Key files**: `pushToRedis.ts`, `batchMessages.ts`

### RAG Knowledge Injection

Vector search retrieves top 5 relevant documents based on semantic similarity:

1. User message → OpenAI embedding
2. Query Supabase: `match_documents(embedding, 5)`
3. Concatenate documents into context string
4. Inject into system prompt before AI generation

**Key file**: `getRAGContext.ts`

### Tool Calling (Function Calling)

AI can invoke tools via JSON schema:

**`transferir_atendimento`**: Human handoff
- Triggers: `handleHumanHandoff.ts`
- Actions: Update Supabase status, send email, stop bot

**`subagente_diagnostico`**: Diagnostic routing
- Purpose: Identify client needs (Solar, Data Science, Full Stack)
- Status: Tool defined but not yet implemented (no tool result loop)

### Conversation Status States

Customer `status` in `Clientes WhatsApp`:
- `"bot"` - AI is responding
- `"waiting"` - Waiting for human (not used yet)
- `"human"` - Transferred to human (bot stops responding)

**Check in Node 3**: If status = "human", skip entire pipeline (return early)

### Multi-Tenant Architecture

**Current**: Fully implemented in Phase 3/4
**Pattern**:
```typescript
const config = await getClientConfig(clientId)
// Use config.metaAccessToken instead of process.env.META_ACCESS_TOKEN
```

**Implementation**:
- Client-specific webhook URLs: `/api/webhook/[clientId]`
- Secrets stored in Supabase Vault (encrypted)
- RLS policies enforce data isolation
- Settings UI at `/dashboard/settings`

### Flow Architecture Manager (Interactive Visual Interface)

**Status**: ✅ **PRODUCTION - FULLY ACTIVE**

The Flow Architecture Manager is an interactive visual interface for managing the complete chatbot processing pipeline. It uses **Mermaid.js** to render a dynamic flowchart showing all 14 nodes and their connections.

**Key Features**:

1. **Interactive Mermaid Diagram**
   - Visual representation of the complete 14-node pipeline
   - Color-coded by category: Preprocessing (Blue), Analysis (Yellow), Auxiliary (Purple), Generation (Green), Output (Red)
   - Click any node to open configuration panel
   - Real-time visual feedback (disabled nodes shown in gray with dashed borders)

2. **Click-to-Configure**
   - Click on any node with ⚙️ icon to edit its configuration
   - Dynamically rendered fields based on config type (string, number, boolean, arrays, objects)
   - Model provider selection (Groq/OpenAI)
   - Temperature, max_tokens, prompts, thresholds

3. **Enable/Disable Nodes**
   - Toggle switch to enable/disable nodes
   - Visual feedback: disabled nodes appear gray with dashed borders
   - Bypass routes shown with dotted yellow lines when primary dependency is disabled

4. **Persistence & Multi-Tenant**
   - All configurations saved to `bot_configurations` table
   - Tenant-isolated (client_id)
   - Changes take effect immediately in chatflow

**Access**: Navigate to `/dashboard/flow-architecture`

**How It Works**:

The system is **100% integrated** with the production chatflow:

- Nodes like `checkContinuity`, `classifyIntent`, `detectRepetition`, `getChatHistory`, and `generateAIResponse` read configurations from `bot_configurations` table in real-time
- Any changes made in Flow Architecture Manager affect the bot's behavior immediately
- The chatflow is fully migrated from n8n to Next.js (`src/flows/chatbotFlow.ts`)

**Node Configuration Mapping**:

| Node ID | Config Key | Description |
|---------|-----------|-------------|
| `process_media` | `media_processing:config` | Media processing settings |
| `batch_messages` | `batching:delay_seconds` | Batching delay in seconds |
| `get_chat_history` | `chat_history:max_messages` | Maximum history messages |
| `get_rag_context` | `rag:enabled` | Enable RAG context retrieval |
| `check_continuity` | `continuity:new_conversation_threshold_hours` | New conversation threshold |
| `classify_intent` | `intent_classifier:use_llm` | Use LLM for classification |
| `generate_response` | `personality:config` | Main personality/prompt config |
| `detect_repetition` | `repetition_detector:similarity_threshold` | Repetition threshold |

**Files**:
- Component: `src/components/FlowArchitectureManager.tsx`
- Page: `src/app/dashboard/flow-architecture/page.tsx`
- API: `src/app/api/flow/nodes/[nodeId]/route.ts` (GET/PATCH)
- Docs: `docs/FLOW_ARCHITECTURE_MANAGER.md`, `docs/FLOW_ARCHITECTURE_STATUS.md`

**Example Usage**:

1. Navigate to `/dashboard/flow-architecture`
2. Click on "Generate AI Response" node
3. Edit system prompt, change model provider from Groq to OpenAI
4. Adjust temperature from 0.7 to 0.9
5. Click "Salvar Configurações"
6. Next WhatsApp message will use new configuration

**Visual Features**:
- Fullscreen mode for better visualization
- Automatic diagram refresh when nodes are enabled/disabled
- Success/error notifications
- Legend showing node categories
- Hover effects on clickable nodes

**Database Schema** (`bot_configurations`):

```sql
CREATE TABLE bot_configurations (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  config_key TEXT NOT NULL,          -- e.g., 'personality:config'
  config_value JSONB NOT NULL,       -- flexible JSON configuration
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  category TEXT,                     -- 'prompts', 'rules', 'thresholds', 'personality'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, config_key)
);
```

**See**: `docs/FLOW_ARCHITECTURE_MANAGER.md` for complete documentation and usage examples.

---

## 📊 Database Schema Reference

**⚠️ CRITICAL**: Before ANY database work, consult [`docs/tables/tabelas.md`](docs/tables/tabelas.md)

Common mistakes to avoid:
1. ❌ Assuming column names are in English (they're in Portuguese)
2. ❌ Using `auth.users` in RLS policies (use `user_profiles` instead)
3. ❌ Ignoring type casting (e.g., `telefone::TEXT` when comparing with TEXT columns)
4. ❌ Forgetting this database is shared with another app (poker system)

**Quick reference for chatbot tables**:
```sql
-- clientes_whatsapp (customer records)
telefone NUMERIC       -- NOT TEXT, requires ::TEXT cast for comparisons
nome TEXT              -- customer name in Portuguese
status TEXT            -- "bot" | "waiting" | "human"
client_id UUID         -- multi-tenant isolation

-- user_profiles (for RLS policies)
id UUID                -- auth.uid()
client_id UUID         -- USE THIS in RLS policies, NOT auth.users
email TEXT
full_name TEXT

-- usage_logs (API tracking)
phone TEXT             -- note: TEXT here, but telefone is NUMERIC in clientes_whatsapp
source TEXT            -- 'openai' | 'groq' | 'whisper' | 'meta'
total_tokens INTEGER
cost_usd NUMERIC

-- pricing_config (custom pricing)
client_id UUID         -- RLS: must match user_profiles.client_id
provider TEXT          -- 'openai' | 'groq' | 'whisper'
model TEXT
prompt_price DECIMAL
completion_price DECIMAL
```

---

## ⚠️ Critical Technical Decisions & Fixes - Summary

This section documents important problems encountered and their solutions. **READ THIS BEFORE MODIFYING DATABASE OR WEBHOOK CODE**.

| Issue | Solution | Key File(s) | Section |
|-------|----------|-------------|---------|
| Serverless connection pooling | Use Supabase client, not `pg` | `checkOrCreateCustomer.ts:78` | #1 |
| Webhook hanging | Must `await` processing | `webhook/route.ts:107` | #2 |
| Table name with spaces | Renamed + VIEW for compatibility | `migrations/004_*` | #3 |
| Column `type` not found | JSON field, not column | `saveChatMessage.ts`, `getChatHistory.ts` | #4 |
| Tool calls in messages | Strip with regex | `formatResponse.ts:7-10` | #5 |
| Localhost webhooks | Always use production URL | `.env.local` | #6 |
| Token confusion | ACCESS vs VERIFY are different | Multiple files | #7 |

### 1. Serverless Connection Pooling (NODE 3 Fix)

**Problem**: `checkOrCreateCustomer` node was hanging indefinitely in production (Vercel serverless), causing webhook timeouts.

**Root Cause**:
- Used `pg` library with direct TCP connections
- Serverless functions have ephemeral execution context
- Connection pooling doesn't work well in Lambda-like environments
- Webhook was fire-and-forget (returned 200 immediately, process terminated before query completed)

**Solution**: Migrated from `pg` to `@supabase/supabase-js` client
- Uses Supavisor (Supabase connection pooler)
- Optimized for serverless environments
- Automatic retry and connection management
- **PLUS**: Webhook now `await`s `processChatbotMessage()` before returning

**Files Changed**:
- `src/nodes/checkOrCreateCustomer.ts` (line 78) - Uses `createServerClient()` instead of `pg.query()`
- `src/app/api/webhook/route.ts` (line 107) - Added `await processChatbotMessage(body)`

**IMPORTANT**: Do NOT use `pg` library for upserts/inserts in serverless functions. Always use Supabase client.

### 2. Webhook MUST Await Processing

**Problem**: Serverless functions terminate IMMEDIATELY after returning HTTP response, killing any ongoing async operations.

**Mistake**: Original code was:
```typescript
processChatbotMessage(body) // Fire-and-forget ❌
return new NextResponse("EVENT_RECEIVED", { status: 200 })
```

**Fix**: Must await completion:
```typescript
await processChatbotMessage(body) // Wait for completion ✅
return new NextResponse("EVENT_RECEIVED", { status: 200 })
```

**File**: `src/app/api/webhook/route.ts:107`

**Rule**: NEVER use fire-and-forget async calls in serverless webhooks. Always `await`.

### 3. Table Name Without Spaces (TypeScript Fix)

**Problem**: Table name `"Clientes WhatsApp"` (with space) breaks TypeScript type inference.

**Error**: `Property 'from' does not exist on type...` or `No overload matches this call`

**Solution**: Migration 004 renames table + creates VIEW for backward compatibility
- Renamed: `"Clientes WhatsApp"` → `clientes_whatsapp`
- Created VIEW: `"Clientes WhatsApp"` (points to `clientes_whatsapp`)
- INSTEAD OF trigger: Upserts on VIEW redirect to real table
- n8n workflows continue working (use VIEW name)
- Next.js code uses new table name (with TypeScript casting `as any`)

**Files**:
- `migrations/004_rename_clientes_table.sql` - Migration SQL
- `src/nodes/checkOrCreateCustomer.ts:34` - Casts supabase client to bypass TypeScript

**Workaround in Code**:
```typescript
const supabaseAny = supabase as any
await supabaseAny.from('clientes_whatsapp').upsert(...)
```

**Rule**: NEVER use table names with spaces in new schema. Use snake_case.

### 4. Column `type` is Inside JSON (Not a Column)

**Problem**: Code tried to `INSERT INTO n8n_chat_histories (session_id, message, type, created_at)` but column `type` doesn't exist.

**Error**: `error: column "type" of relation "n8n_chat_histories" does not exist`

**Reality**: Table schema is:
```sql
CREATE TABLE n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  message JSONB,  -- ⬅️ type is INSIDE this JSON
  created_at TIMESTAMPTZ
)
```

**Correct JSON format**:
```json
{
  "type": "human",
  "content": "User message text",
  "additional_kwargs": {}
}
```

**Fix**: Remove `type` from column list, save it inside `message` JSON:
```typescript
// BEFORE (wrong)
INSERT INTO n8n_chat_histories (session_id, message, type, created_at)
VALUES ($1, $2, $3, NOW())

// AFTER (correct)
INSERT INTO n8n_chat_histories (session_id, message, created_at)
VALUES ($1, $2, NOW())
// where $2 = JSON.stringify({ type: 'human', content: '...', additional_kwargs: {} })
```

**Files Changed**:
- `src/nodes/saveChatMessage.ts:23-27` - Removed `type` column, embedded in JSON
- `src/nodes/getChatHistory.ts:12-18` - Parse JSON to extract `type` and `content`

**Rule**: ALWAYS check actual table schema before writing INSERT/UPDATE queries. Don't assume column structure.

### 5. Tool Calls Must Be Removed from User Messages

**Problem**: AI responses included `<function=subagente_diagnostico>{...}</function>` in messages sent to WhatsApp users.

**Example Bad Output**:
```
Você poderia me explicar melhor? <function=subagente_diagnostico>{"mensagem_usuario": "projeto"}</function>
```

**Solution**: Added `removeToolCalls()` function in `formatResponse()`:
```typescript
const removeToolCalls = (text: string): string => {
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
}
```

**File**: `src/nodes/formatResponse.ts:7-10`

**Rule**: ALWAYS sanitize AI output before sending to end users. Remove internal metadata/tool calls.

### 6. WEBHOOK_BASE_URL Must Always Use Production

**Problem**: Localhost webhooks don't work because Meta can't call `http://localhost:3000`.

**Solution**: ALWAYS use production URL in `.env.local`:
```env
WEBHOOK_BASE_URL=https://chat.luisfboff.com
```

Even in development:
- Code runs on `localhost:3000`
- Webhook calls go to production (Vercel)
- To test changes, deploy to Vercel first

**Files**:
- `src/lib/config.ts` - Centralized config functions
- `.env.example` - Documents this pattern
- `CONFIGURAR_ENV.md` - Explains why

**Rule**: NEVER use localhost in `WEBHOOK_BASE_URL`. Meta webhooks require public HTTPS URLs.

### 7. META_VERIFY_TOKEN vs META_ACCESS_TOKEN (Different Tokens!)

**Problem**: User accidentally set `META_VERIFY_TOKEN=EAA...` (the ACCESS_TOKEN value).

**Clarification**:
- **META_ACCESS_TOKEN** (`EAA...`): Used to SEND messages via WhatsApp API
- **META_VERIFY_TOKEN** (any string you create): Used in webhook verification (GET request from Meta)

**Correct Setup**:
```env
META_ACCESS_TOKEN=EAA...  # From Meta Dashboard → WhatsApp → API Setup
META_VERIFY_TOKEN=my-secret-token-123  # YOU create this (any random string)
```

**In Meta Dashboard**:
- Webhook Configuration → Verify Token: `my-secret-token-123` (must match .env.local)

**Rule**: These are DIFFERENT tokens with DIFFERENT purposes. Don't confuse them.

---

## Code Patterns

### Node Function Signature

All nodes follow this pattern:

```typescript
// nodes/exampleNode.ts
export interface ExampleNodeInput {
  phone: string
  content: string
}

export const exampleNode = (input: ExampleNodeInput): string => {
  const { phone, content } = input
  // ... pure logic
  return result
}

// For async operations
export const exampleNodeAsync = async (input: ExampleNodeInput): Promise<string> => {
  // ... async logic
  return result
}
```

**Rules**:
- Export input type interface
- Export named function (not default)
- Pure function (no global state mutations)
- Single responsibility
- Descriptive names (no comments needed)

### API Route Pattern

All API routes use this structure:

```typescript
// app/api/example/route.ts
export const dynamic = 'force-dynamic' // CRITICAL: Disable Next.js caching

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient() // Service role key
    const { data, error } = await supabase.from('table').select('*')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Descriptive message' },
      { status: 500 }
    )
  }
}
```

**Always include**:
- `export const dynamic = 'force-dynamic'`
- Server-side Supabase client (not browser client)
- Try-catch error handling
- Proper HTTP status codes

### Functional Programming Style

**Enforced patterns**:
- Only `const` (never `let` or `var`)
- Arrow functions for all functions
- No classes (only functions and interfaces)
- Immutable data (no mutations)
- Descriptive naming (code self-documents)

**Example**:
```typescript
// ✅ Good
const processMessage = (message: string): string => {
  const normalized = message.toLowerCase().trim()
  return normalized
}

// ❌ Bad
function processMessage(message) {
  let result = message
  result = result.toLowerCase()
  result = result.trim()
  return result
}
```

---

## Testing & Debugging

### Testing Individual Nodes

Test endpoints available at `/api/test/nodes/*`:

```bash
# Test filter node
curl http://localhost:3000/api/test/nodes/filter-status

# Test parse message node
curl http://localhost:3000/api/test/nodes/parse-message

# Test all nodes
curl http://localhost:3000/api/test/nodes/check-customer
curl http://localhost:3000/api/test/nodes/push-redis
curl http://localhost:3000/api/test/nodes/batch
curl http://localhost:3000/api/test/nodes/chat-history
curl http://localhost:3000/api/test/nodes/rag-context
curl http://localhost:3000/api/test/nodes/ai-response
curl http://localhost:3000/api/test/nodes/format-response
curl http://localhost:3000/api/test/nodes/send-whatsapp
```

**Each endpoint**:
- Uses realistic test data
- Logs execution to console
- Returns node output as JSON
- Safe to run (uses test phone numbers)

### Execution Logging

All chatbot flow executions are logged:

```typescript
// In chatbotFlow.ts
const logger = createExecutionLogger()
const executionId = logger.startExecution({ source: 'chatbotFlow', payload_from: phone })

logger.logNodeStart('1. Node Name', input)
logger.logNodeSuccess('1. Node Name', output)
// or
logger.logNodeError('1. Node Name', error)

logger.finishExecution('success' | 'error')
```

**View logs**:
- Console: `npm run dev` (stdout)
- Dashboard: http://localhost:3000/dashboard/debug
- API: `/api/debug/logs`

### Debugging Webhook Issues

**WhatsApp webhook not triggering flow**:

1. Check webhook verification: `/api/webhook` GET endpoint
2. Verify `META_VERIFY_TOKEN` matches Meta dashboard
3. Check webhook URL is publicly accessible (use ngrok for local dev)
4. View webhook messages: http://localhost:3000/dashboard/debug → "Últimas Webhooks"

**Message not processing**:

1. Check Node 1 logs (might be status update, not message)
2. Check Redis connection (Node 6 errors are logged but don't crash flow)
3. Check PostgreSQL connection (Node 7, 9)
4. Check Groq API key (Node 11)
5. Check Meta API token (Node 13)

**View execution flow**:
http://localhost:3000/dashboard/workflow

### Common Errors

**"Missing NEXT_PUBLIC_SUPABASE_URL"**
- Missing `.env.local` file
- Restart dev server after creating `.env.local`

**"Redis connection failed"**
- Redis not running (`redis-server` or Docker)
- Wrong `REDIS_URL` in `.env.local`
- Flow continues without Redis (graceful degradation)

**"Failed to send WhatsApp message"**
- Invalid `META_ACCESS_TOKEN` (expired or wrong)
- Wrong `META_PHONE_NUMBER_ID`
- Phone number not in correct format (must be international, no +)

**TypeScript errors in IDE**
- Pre-existing errors exist (7 errors in API routes)
- Don't prevent dev server or build from working
- Only fix if modifying affected files

---

## Development Workflow

### Adding a New Node

1. Create file: `src/nodes/myNewNode.ts`
2. Define input type interface
3. Implement pure function
4. Export from `src/nodes/index.ts`
5. Add to flow: `src/flows/chatbotFlow.ts`
6. Create test endpoint: `src/app/api/test/nodes/my-new-node/route.ts`
7. Test in isolation before integrating

### Modifying Existing Node

1. Read current implementation
2. Check where node is used in `chatbotFlow.ts`
3. Understand input/output contracts
4. Make changes (preserve type signatures)
5. Test with test endpoint
6. Test full flow with `/api/test/simulate-webhook`

### Modifying AI Prompts

**Main agent prompt**: `src/nodes/generateAIResponse.ts` (system message)
**Formatter agent prompt**: `src/nodes/formatResponse.ts` (system message)
**Diagnostic subagent**: Not yet implemented (tool defined but no execution)

**When changing prompts**:
- Test with real conversations (not just test data)
- Check message splitting behavior (formatter)
- Verify tool calls still work (human handoff)

### Working with shadcn/ui Components

**DO NOT** edit files in `src/components/ui/*` directly.

To update component:
```bash
npx shadcn@latest add button  # Re-generates component
```

To customize: Create wrapper component in `src/components/`

---

## Known Limitations

1. **Diagnostic subagent tool not implemented** - Defined but no execution loop
2. **Google Fonts build failure** - In restricted networks, build fails (font fetch)
3. **Polling for some features** - Dashboard uses 10s polling in addition to Supabase realtime

---

## Migration Notes

### Migration History

**Phase 1:** n8n workflow only (legacy)
**Phase 2:** Next.js dashboard (read-only, n8n still processing)
**Phase 2.5:** Node-based architecture in Next.js (replaced n8n completely)
**Phase 3:** Supabase Vault + Multi-tenant webhooks
**Phase 4:** ✅ COMPLETE - RBAC, Auth, Admin Panel, Real-time notifications

**Migration status**:
- ✅ All 14 nodes migrated from n8n
- ✅ Redis batching implemented
- ✅ RAG context retrieval
- ✅ Human handoff flow
- ✅ Multi-message formatting
- ✅ Media processing (audio, image)
- ✅ Multi-tenant config with Vault
- ✅ RBAC and authentication
- ✅ Flow Architecture Manager (Interactive Mermaid diagram with click-to-configure)
- ⏳ Diagnostic subagent (defined, not executed)

### Phase 5 Roadmap (Future Enhancements)

**Performance & Scalability**:
- Queue system for async processing (Upstash/Vercel Queue)
- Response caching (Redis)
- Query optimization (composite indexes)
- CDN for static assets

**Features**:
- Public API with rate limiting
- Custom webhooks for clients
- Message templates
- Scheduled messages
- Automated reports (PDF/Excel)
- CRM integration (Pipedrive, HubSpot)

**UX**:
- Mobile app (React Native)
- Dark mode
- Advanced search (filters, tags)
- Conversation export
- Internal notes

**AI**:
- Fine-tuned custom models
- A/B testing for prompts
- Sentiment analysis
- Auto-suggestions
- Language detection

---

## External Services

**Meta (WhatsApp Business API)**:
- Phone Number ID: `899639703222013`
- Display Number: `555499567051`
- API Version: `v18.0`
- Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

**OpenAI**:
- Whisper: Audio transcription (node 5)
- GPT-4o Vision: Image analysis (node 5)
- Embeddings: RAG vector search (node 10)

**Groq**:
- Model: Llama 3.3 70B
- Main agent (node 11)
- Formatter agent (node 12)
- Docs: https://console.groq.com/docs

**Supabase**:
- PostgreSQL database
- Vector search (pgvector)
- Realtime subscriptions (dashboard)
- Vault (encrypted secrets)

**Redis**:
- Message batching
- TTL-based cleanup

**Gmail**:
- Human handoff email notifications
- Uses App Password (not OAuth)

---

## Language

All user-facing content (prompts, messages, UI) is in **Portuguese (Brazilian)**.
All code, comments, and technical documentation is in **English**.

---

## Key Files Reference

- `src/flows/chatbotFlow.ts` - Main orchestrator (start here to understand flow)
- `src/app/api/webhook/[clientId]/route.ts` - Multi-tenant webhook entry point
- `src/nodes/generateAIResponse.ts` - AI agent configuration (prompts, tools)
- `src/lib/config.ts` - Multi-tenant config with Vault integration
- `src/lib/types.ts` - All TypeScript types
- `docs/tables/tabelas.md` - Complete database schema reference
- `db/MIGRATION_WORKFLOW.md` - Migration guide with examples
- `.env.example` - Required environment variables
- `README.md` - User documentation
- `.github/copilot-instructions.md` - Build/validation steps

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
