# CLAUDE.md

WhatsApp SaaS chatbot guidance for Claude Code.

## Quick Navigation

**Before any task:**
1. Check "Quick Reference" for entry points
2. Consult `docs/tables/tabelas.md` for database work
3. Review "Common Issues" for known problems

**Critical Rules:**
- ALWAYS use migrations for database changes (`supabase migration new`)
- NEVER use `pg` library in serverless (use Supabase client)
- ALWAYS await async operations in webhooks
- CHECK `docs/tables/tabelas.md` before ANY database query

---

## Project Overview

**WhatsApp SaaS Chatbot** - Multi-tenant AI-powered conversations via WhatsApp Business API

**Tech Stack:**
- Next.js 14 (App Router), TypeScript, Serverless (Vercel)
- Supabase (PostgreSQL + Vault + pgvector)
- Redis (message batching)
- Groq (Llama 3.3 70B), OpenAI (Whisper, GPT-4o Vision, Embeddings)
- Meta WhatsApp Business API

**Status:** ✅ Production (Multi-tenant SaaS with RBAC, Auth, Vault)

---

## Quick Reference

### Development Setup

```bash
npm install                      # Always run first
npm run dev                      # Start dev server (localhost:3000)
```

**Prerequisites:**
- Create `.env.local` from `.env.example`
- Apply migrations: `supabase db push`

### Key Entry Points

| Task | File |
|------|------|
| **Webhook Entry** | `src/app/api/webhook/[clientId]/route.ts` |
| **Main Orchestrator** | `src/flows/chatbotFlow.ts` (14-node pipeline) |
| **Flow Visual Manager** | `/dashboard/flow-architecture` (Mermaid diagram) |
| **Node Functions** | `src/nodes/*` (atomic, pure functions) |
| **Multi-tenant Config** | `src/lib/config.ts` (Vault integration) |
| **AI Prompts** | `src/nodes/generateAIResponse.ts`, `formatResponse.ts` |
| **RAG Knowledge** | `/dashboard/knowledge` (PDF/TXT upload) |
| **Database Schema** | `docs/tables/tabelas.md` ⚠️ CRITICAL |
| **Migrations** | `supabase/migrations/*`, `db/MIGRATION_WORKFLOW.md` |

### Common Commands

```bash
# Database
supabase migration new <name>    # Create migration
supabase db push                 # Apply to production
supabase db diff                 # Show changes

# Backup
cd db && .\backup-complete.bat   # Backup schemas

# Testing
npx tsc --noEmit                 # Type check
npm run lint                     # Lint
```

---

## Common Issues - Quick Lookup

| Error | Cause | Fix |
|-------|-------|-----|
| Missing NEXT_PUBLIC_SUPABASE_URL | No `.env.local` | Create from `.env.example`, restart |
| NODE 3 freezing | Using `pg` in serverless | Use Supabase client (see Critical #1) |
| Table name error | Space in name | See Critical #3 |
| Column 'type' not found | JSON field, not column | See Critical #4 |
| Tool calls in messages | Not stripped | See Critical #5 |
| Redis connection failed | Redis not running | Start Redis (flow continues gracefully) |
| Webhook not working | Wrong verify token | Check `META_VERIFY_TOKEN` |
| Build fails (Google Fonts) | Network restrictions | Expected in sandboxed environments |

---

## Architecture Overview

### Message Processing Flow (14 Nodes)

```
WhatsApp → Webhook → chatbotFlow → 14 Nodes → WhatsApp Response
```

**Pipeline:**
1. Filter Status Updates → 2. Parse Message → 3. Check/Create Customer →
4. Download Media → 5. Normalize Message → 6. Push to Redis →
7. Save User Message → 8. Batch Messages (10s) → 9. Get Chat History →
10. Get RAG Context → 11. Generate AI Response → 12. Format Response →
13. Send WhatsApp Message

**Key Patterns:**
- Pure functions (nodes in `src/nodes/*`)
- Redis batching prevents duplicate AI responses
- Parallel execution for independent nodes (9 & 10)
- Tool calls trigger special flows (human handoff)

### Data Storage

**⚠️ CRITICAL: Always check `docs/tables/tabelas.md` before database work**

**Why critical:**
- Database shared with poker system
- Column names in Portuguese (`telefone`, `nome` NOT `phone`, `name`)
- `telefone` is NUMERIC, not TEXT (requires `::TEXT` cast)
- RLS policies use `user_profiles`, NOT `auth.users`

**Key Tables:**
```sql
-- clientes_whatsapp (customers)
telefone NUMERIC       -- NOT TEXT!
nome TEXT
status TEXT            -- 'bot' | 'humano' | 'transferido'
client_id UUID

-- n8n_chat_histories (chat memory)
message JSONB          -- type is INSIDE JSON, not a column!

-- documents (RAG/pgvector)
embedding vector(1536)

-- clients (multi-tenant config)
-- user_profiles (RLS policies - USE THIS, not auth.users)
-- conversations (state tracking)
-- messages (history)
-- usage_logs (API tracking)
```

### RAG System (Knowledge Base)

**Status:** ✅ Active

Upload PDFs/TXTs → Semantic chunking (500 tokens, 20% overlap) →
OpenAI embeddings → pgvector storage → Vector search (cosine similarity > 0.8) →
Top 5 chunks injected into AI prompt

**Access:** `/dashboard/knowledge`

### AI System

**Main Agent:** Groq Llama 3.3 70B
- Tools: `transferir_atendimento` (human handoff), `subagente_diagnostico`
- Chat memory: Last 15 messages
- Multi-message response: Splits on `\n\n`, 2s delay between messages

**Human Handoff:** Tool call → Update status → Summarize conversation → Email → Stop bot

---

## Database Migrations

**⚠️ RULE:** ALWAYS use migrations. NEVER execute DDL in Supabase Dashboard.

```bash
# 1. Create migration
supabase migration new add_feature

# 2. Edit file: supabase/migrations/TIMESTAMP_add_feature.sql

# 3. Apply to production
supabase db push

# 4. Commit
git add supabase/migrations/
git commit -m "feat: add feature"
```

**Rollback:** Create reversal migration (no automatic rollback!)

**Backup before risky migrations:**
```bash
cd db && .\backup-complete.bat
```

---

## Critical Technical Decisions

### 1. Serverless Connection Pooling

**Problem:** `pg` library hangs in serverless (Vercel)

**Solution:** Use Supabase client (Supavisor pooler)
```typescript
// ❌ NEVER in serverless
const { Pool } = require('pg')
const pool = new Pool()

// ✅ ALWAYS in serverless
const supabase = createServerClient()
await supabase.from('table').upsert(...)
```

**File:** `src/nodes/checkOrCreateCustomer.ts:78`

### 2. Webhook MUST Await

**Problem:** Serverless functions terminate after HTTP response, killing async work

```typescript
// ❌ Fire-and-forget
processChatbotMessage(body)
return NextResponse.json({ status: 200 })

// ✅ Wait for completion
await processChatbotMessage(body)
return NextResponse.json({ status: 200 })
```

**File:** `src/app/api/webhook/[clientId]/route.ts`

### 3. Table Names (No Spaces)

**Problem:** `"Clientes WhatsApp"` breaks TypeScript

**Solution:** Renamed to `clientes_whatsapp`, created VIEW for legacy compatibility

```typescript
// Workaround in code
const supabaseAny = supabase as any
await supabaseAny.from('clientes_whatsapp').upsert(...)
```

**Rule:** Use snake_case for new tables

### 4. Column `type` is Inside JSON

**Problem:** `n8n_chat_histories.type` doesn't exist as column

**Reality:**
```sql
CREATE TABLE n8n_chat_histories (
  message JSONB  -- type is INSIDE: {"type": "human", "content": "..."}
)
```

**Fix:** Remove `type` from column list, embed in JSON

**Files:** `saveChatMessage.ts`, `getChatHistory.ts`

### 5. Strip Tool Calls from Messages

**Problem:** AI responses include `<function=...>` in WhatsApp messages

**Solution:**
```typescript
const removeToolCalls = (text: string): string => {
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
}
```

**File:** `formatResponse.ts:7-10`

### 6. WEBHOOK_BASE_URL (Always Production)

**Problem:** Localhost webhooks don't work (Meta can't reach)

**Solution:** ALWAYS use production URL
```env
WEBHOOK_BASE_URL=https://chat.luisfboff.com  # Even in dev!
```

### 7. Token Confusion

**Different tokens:**
- `META_ACCESS_TOKEN` (EAA...) → Send messages via API
- `META_VERIFY_TOKEN` (your string) → Webhook verification

---

## Code Patterns

### Node Function Signature

```typescript
export interface NodeInput {
  phone: string
  content: string
}

export const myNode = async (input: NodeInput): Promise<string> => {
  const { phone, content } = input
  // Pure logic, single responsibility
  return result
}
```

**Rules:** Export interface, named function, pure, descriptive names

### API Route Pattern

```typescript
export const dynamic = 'force-dynamic' // CRITICAL!

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient() // Service role
    const { data, error } = await supabase.from('table').select('*')
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
}
```

**Always include:** `force-dynamic`, server client, try-catch, HTTP codes

### Functional Style

- Only `const` (never `let`/`var`)
- Arrow functions
- No classes
- Immutable data
- Descriptive naming (self-documenting)

---

## Development Workflow

### Adding a New Node

1. Create `src/nodes/myNode.ts`
2. Define interface, implement function
3. Export from `src/nodes/index.ts`
4. Add to `src/flows/chatbotFlow.ts`
5. Test endpoint: `src/app/api/test/nodes/my-node/route.ts`

### Modifying Database

1. **ALWAYS** check `docs/tables/tabelas.md` first
2. Create migration: `supabase migration new name`
3. Test locally: `supabase db reset`
4. Apply: `supabase db push`
5. Commit migration file

### Modifying AI Prompts

- Main agent: `src/nodes/generateAIResponse.ts`
- Formatter: `src/nodes/formatResponse.ts`
- Test with real conversations, verify tool calls

### shadcn/ui Components

**DO NOT** edit `src/components/ui/*` directly

```bash
npx shadcn@latest add button  # Re-generates
```

Create wrapper in `src/components/` for customization

---

## Testing & Debugging

### Test Endpoints

```bash
curl http://localhost:3000/api/test/nodes/filter-status
curl http://localhost:3000/api/test/nodes/parse-message
curl http://localhost:3000/api/test/nodes/ai-response
```

### View Logs

- Console: `npm run dev`
- Dashboard: `/dashboard/debug`
- API: `/api/debug/logs`

### Webhook Issues

1. Verify token matches Meta Dashboard
2. Check URL is publicly accessible
3. View webhooks: `/dashboard/debug`
4. Check execution flow: `/dashboard/workflow`

---

## Environment Variables

**Required:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Meta WhatsApp
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=your-token

# AI
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Redis
REDIS_URL=redis://localhost:6379

# PostgreSQL
DATABASE_URL=postgresql://...

# Gmail (human handoff)
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

**Get credentials:**
- Supabase: https://app.supabase.com/project/_/settings/api
- Meta: https://developers.facebook.com/apps/
- OpenAI: https://platform.openai.com/api-keys
- Groq: https://console.groq.com/keys

---

## Flow Architecture Manager

**Access:** `/dashboard/flow-architecture`

**Features:**
- Interactive Mermaid diagram (14-node pipeline)
- Click any node to configure
- Enable/disable nodes (visual feedback)
- Real-time config updates (saved to `bot_configurations` table)
- Multi-tenant isolated

**Example:** Click "Generate AI Response" → Edit prompt → Change model → Save → Immediate effect

---

## Key Files Reference

- `src/flows/chatbotFlow.ts` - Main orchestrator
- `src/app/api/webhook/[clientId]/route.ts` - Webhook entry
- `src/nodes/*` - All node functions
- `src/lib/config.ts` - Multi-tenant config (Vault)
- `docs/tables/tabelas.md` - **Database schema (CRITICAL)**
- `db/MIGRATION_WORKFLOW.md` - Migration guide
- `.env.example` - Required env vars

---

## Language

- **User-facing:** Portuguese (Brazilian)
- **Code/docs:** English

---

## External Services

- **Meta WhatsApp:** API v18.0, Phone: 555499567051
- **OpenAI:** Whisper, GPT-4o Vision, Embeddings
- **Groq:** Llama 3.3 70B
- **Supabase:** PostgreSQL, pgvector, Realtime, Vault
- **Redis:** Message batching, TTL cleanup
- **Gmail:** Human handoff notifications (App Password)

---

## MCP Integration (Byterover)

You have access to two Byterover MCP tools:

### `byterover-store-knowledge`
Use when:
- Learning new patterns, APIs, or architectural decisions
- Encountering error solutions or debugging techniques
- Finding reusable code patterns
- Completing significant tasks

### `byterover-retrieve-knowledge`
Use when:
- Starting new tasks (gather context)
- Making architectural decisions
- Debugging issues (check previous solutions)
- Working with unfamiliar code

**CRITICAL:** When memory conflicts detected, ALWAYS display conflict resolution URL to user.

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
