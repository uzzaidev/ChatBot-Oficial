# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp SaaS chatbot system with AI-powered conversations through WhatsApp Business API. Built with Next.js 14, TypeScript, and serverless architecture.

**Current State**: Phase 2.5 - Full Next.js implementation with node-based workflow architecture
**Tech Stack**: Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Redis, Groq (Llama 3.3 70B), OpenAI (Whisper, GPT-4o Vision)

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

## Architecture Overview

### Node-Based Message Processing Pipeline

The system uses a **flow orchestration pattern** where individual nodes (pure functions) are composed into a complete message processing pipeline. This architecture was designed for future migration from n8n but is now fully implemented in Next.js.

**Flow**: `src/flows/chatbotFlow.ts` - Main orchestrator that chains 13 nodes sequentially
**Nodes**: `src/nodes/*` - Atomic, reusable functions (one responsibility each)
**API Endpoint**: `/api/webhook` receives WhatsApp Cloud API webhooks from Meta

### Message Processing Flow (13 Nodes)

```
WhatsApp → Webhook → chatbotFlow → 13 Nodes → WhatsApp Response
```

**Nodes in sequence**:

1. **Filter Status Updates** - Ignores delivery receipts, only processes messages
2. **Parse Message** - Extracts phone, name, content, type from Meta payload
3. **Check/Create Customer** - Upserts customer in `Clientes WhatsApp` table
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

**Supabase (PostgreSQL)**:
- `Clientes WhatsApp` - Customer records (phone, name, status: "bot" | "waiting" | "human")
- `n8n_chat_histories` - Conversation memory (sessionId = phone number, 15 message window)
- `documents` - Vector store for RAG (pgvector with OpenAI embeddings)
- `clients` - Multi-tenant config table (Phase 3, not yet used)
- `conversations`, `messages`, `usage_logs` - Dashboard tables (Phase 3, not yet used)

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

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts          # Main entry: Meta webhook receiver
│   │   ├── conversations/route.ts    # Dashboard: List conversations
│   │   ├── messages/[phone]/route.ts # Dashboard: Fetch messages
│   │   ├── commands/                 # Dashboard actions (send message, transfer)
│   │   ├── debug/                    # Debug endpoints (logs, env, executions)
│   │   └── test/                     # Node testing endpoints
│   ├── dashboard/                    # React dashboard UI
│   │   ├── page.tsx                  # Main dashboard (metrics, conversation list)
│   │   ├── conversations/[phone]/    # Conversation detail view
│   │   ├── workflow/                 # Workflow execution viewer
│   │   └── debug/                    # Debug dashboard (env vars, logs)
│   ├── layout.tsx                    # Root layout (Google Fonts)
│   └── globals.css                   # Tailwind CSS
├── flows/
│   └── chatbotFlow.ts                # Main orchestrator (13-node pipeline)
├── nodes/                            # Atomic functions (one per node)
│   ├── filterStatusUpdates.ts
│   ├── parseMessage.ts
│   ├── checkOrCreateCustomer.ts
│   ├── downloadMetaMedia.ts
│   ├── transcribeAudio.ts
│   ├── analyzeImage.ts
│   ├── normalizeMessage.ts
│   ├── pushToRedis.ts
│   ├── batchMessages.ts
│   ├── getChatHistory.ts
│   ├── getRAGContext.ts
│   ├── generateAIResponse.ts
│   ├── formatResponse.ts
│   ├── sendWhatsAppMessage.ts
│   ├── handleHumanHandoff.ts
│   ├── saveChatMessage.ts
│   └── index.ts                      # Barrel export
├── lib/
│   ├── supabase.ts                   # Supabase client factory
│   ├── postgres.ts                   # Direct PostgreSQL connection
│   ├── redis.ts                      # Redis client
│   ├── groq.ts                       # Groq SDK client
│   ├── openai.ts                     # OpenAI SDK client
│   ├── meta.ts                       # WhatsApp Business API helpers
│   ├── gmail.ts                      # Gmail API (human handoff emails)
│   ├── logger.ts                     # Execution logger (in-memory)
│   ├── webhookCache.ts               # In-memory webhook message cache
│   ├── types.ts                      # TypeScript type definitions
│   └── utils.ts                      # Utility functions (cn, etc.)
├── components/
│   ├── ui/                           # shadcn/ui components (DON'T edit directly)
│   ├── ConversationList.tsx
│   ├── ConversationDetail.tsx
│   ├── MessageBubble.tsx
│   ├── MetricsDashboard.tsx
│   └── SendMessageForm.tsx
└── hooks/
    ├── useConversations.ts           # Fetch conversation list (polling)
    ├── useMessages.ts                # Fetch messages for phone number
    ├── useRealtimeMessages.ts        # Supabase realtime subscriptions
    └── use-toast.ts                  # Toast notifications
```

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

**New tables for Phase 3** (not yet used):
- `clients` - Multi-tenant configuration
- `conversations` - Conversation state tracking
- `messages` - Message history with metadata
- `usage_logs` - Cost tracking (OpenAI tokens, Meta messages)

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

### Multi-Tenant Architecture (Planned, Not Implemented)

**Current**: Single client (hardcoded config in env vars)
**Phase 3 Goal**: Multiple clients with unique configs

Pattern:
```typescript
const config = await getClientConfig(clientId)
// Use config.META_ACCESS_TOKEN instead of process.env.META_ACCESS_TOKEN
```

**Not yet implemented**: Client selector, per-client webhook URLs, database-stored tokens

## ⚠️ Critical Technical Decisions & Fixes

This section documents important problems encountered and their solutions. **READ THIS BEFORE MODIFYING DATABASE OR WEBHOOK CODE**.

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

## Known Limitations

1. **No multi-tenant support** - Single client only (env vars)
2. **Diagnostic subagent tool not implemented** - Defined but no execution loop
3. **No cost tracking** - `usage_logs` table exists but not populated
4. **No conversation state management** - `conversations` table not used yet
5. **Google Fonts build failure** - In restricted networks, build fails (font fetch)
6. **No authentication** - Dashboard is publicly accessible
7. **Polling instead of webhooks** - Dashboard uses 10s polling (not Supabase realtime everywhere)

## Migration Notes

### From n8n (IA.json)

This Next.js implementation **replaces** the n8n workflow. Key differences:

- **n8n**: Visual workflow editor, no code
- **Next.js**: TypeScript functions, full control

**Migration status**:
- ✅ All 13 nodes migrated
- ✅ Redis batching implemented
- ✅ RAG context retrieval
- ✅ Human handoff flow
- ✅ Multi-message formatting
- ✅ Media processing (audio, image)
- ⏳ Diagnostic subagent (defined, not executed)
- ❌ Multi-tenant config (Phase 3)

### To Phase 3 (Full Multi-Tenant SaaS)

**Remaining work**:

1. Implement `getClientConfig(clientId)` pattern
2. Move tokens from env vars to database (`clients` table)
3. Add authentication (NextAuth.js)
4. Per-client webhook URLs: `/api/webhook/[clientId]`
5. Client selector UI in dashboard
6. Cost tracking (populate `usage_logs`)
7. Conversation state management (use `conversations`, `messages` tables)
8. Queue system for long tasks (Upstash/Vercel Queue)

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
- Realtime subscriptions (dashboard only)

**Redis**:
- Message batching
- TTL-based cleanup

**Gmail**:
- Human handoff email notifications
- Uses App Password (not OAuth)

## Language

All user-facing content (prompts, messages, UI) is in **Portuguese (Brazilian)**.
All code, comments, and technical documentation is in **English**.

## Key Files Reference

- `src/flows/chatbotFlow.ts` - Main orchestrator (start here to understand flow)
- `src/app/api/webhook/route.ts` - Webhook entry point
- `src/nodes/generateAIResponse.ts` - AI agent configuration (prompts, tools)
- `src/lib/types.ts` - All TypeScript types
- `.env.example` - Required environment variables
- `migration.sql` - Database schema
- `README.md` - User documentation
- `.github/copilot-instructions.md` - Build/validation steps
