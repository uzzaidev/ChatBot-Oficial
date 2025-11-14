# GitHub Copilot Instructions - WhatsApp SaaS Chatbot

## Project Overview

This is a **WhatsApp SaaS chatbot system** currently in Phase 2 migration from n8n automation workflows to a full Next.js dashboard. The project enables multi-client AI-powered WhatsApp conversations through WhatsApp Business API integration.

**Project Type**: Next.js 14 App Router + TypeScript Dashboard (Phase 2)
**Languages**: TypeScript (100%), SQL
**Target Runtime**: Node.js 18+
**Database**: Supabase (PostgreSQL)
**Code Size**: ~2,400 lines of TypeScript/React code
**Repository Size**: ~595MB (with node_modules)

### Current Architecture (Phase 2)

- **Frontend**: Next.js 14 dashboard (read-only conversation viewer)
- **Backend Processing**: n8n workflows (`IA.json` - message processing pipeline)
- **Database**: Supabase PostgreSQL with realtime subscriptions
- **Message Flow**: WhatsApp → n8n → Supabase → Next.js Dashboard

**NOTE**: This is a hybrid system. The n8n workflow (`IA.json`) handles all message processing, AI responses, and WhatsApp Business API integration. The Next.js app only provides a dashboard UI.

## Repository Structure

```
.
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── api/                  # API routes
│   │   │   ├── conversations/    # Fetch conversation list
│   │   │   ├── messages/[phone]/ # Fetch messages by phone number
│   │   │   └── commands/         # Send commands to n8n webhooks
│   │   ├── dashboard/            # Dashboard pages
│   │   │   ├── page.tsx          # Main dashboard
│   │   │   └── conversations/[phone]/page.tsx  # Conversation detail
│   │   ├── layout.tsx            # Root layout (uses Google Fonts)
│   │   ├── globals.css           # Global styles (Tailwind)
│   │   └── page.tsx              # Homepage (redirects to dashboard)
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components (10+ components)
│   │   ├── ConversationList.tsx
│   │   ├── ConversationDetail.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MetricsDashboard.tsx
│   │   └── SendMessageForm.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useConversations.ts   # Fetch conversation list
│   │   ├── useMessages.ts        # Fetch messages
│   │   ├── useRealtimeMessages.ts # Supabase realtime subscription
│   │   └── use-toast.ts          # Toast notifications
│   └── lib/                      # Utilities and types
│       ├── supabase.ts           # Supabase client creation
│       ├── types.ts              # TypeScript type definitions
│       └── utils.ts              # Helper functions (cn, etc.)
│
├── IA.json                       # n8n workflow (message processing pipeline)
├── migration.sql                 # Database schema (MUST run in Supabase)
├── .env.example                  # Environment variables template
├── .env.local                    # User-created env file (not in git)
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config (strict mode)
├── tailwind.config.ts            # Tailwind config
├── next.config.js                # Next.js config
├── components.json               # shadcn/ui config
│
└── Documentation:
    ├── README.md                 # Full documentation
    ├── QUICK_START.md            # 5-minute setup guide
    ├── CLAUDE.md                 # Architectural guidance for AI
    ├── IMPLEMENTATION_SUMMARY.md # Phase 2 implementation details
    └── plano_de_arquitetura_*.md # Migration architecture plan
```

## Build & Development Commands

### Prerequisites

- Node.js 18+ **REQUIRED**
- npm (comes with Node.js)
- Supabase account (free tier works)
- `.env.local` file with valid credentials (copy from `.env.example`)

### Installation

**ALWAYS run npm install first** before any other command:

```bash
npm install
```

**Duration**: ~20-30 seconds
**Notes**: 
- May show deprecation warnings (safe to ignore)
- Will show 1 critical vulnerability in next (known issue, safe for development)
- Creates `node_modules/` (~595MB)

### Development Server

```bash
npm run dev
```

**Port**: http://localhost:3000
**Duration**: Starts in ~3-5 seconds
**Hot Reload**: Yes (Fast Refresh enabled)

**CRITICAL**: Build will fail if:
- Missing `.env.local` file → Copy from `.env.example`
- Invalid Supabase credentials → Check values in `.env.local`
- Network restricted environment → Google Fonts fetch will fail

### Linting

**FIRST TIME ONLY**: ESLint config must exist. If `.eslintrc.json` is missing, create it:

```json
{
  "extends": "next/core-web-vitals"
}
```

Then run:

```bash
npm run lint
```

**Duration**: ~5-10 seconds
**Exit Code**: 0 (warnings are OK, errors will be non-zero)

**Known Warnings** (safe to ignore):
- `@next/next/no-img-element` in `MessageBubble.tsx` (uses `<img>` for WhatsApp media)
- `react-hooks/exhaustive-deps` in custom hooks (intentional design)

### Building for Production

```bash
npm run build
```

**Duration**: ~60-90 seconds (if successful)
**Output**: `.next/` directory

**KNOWN ISSUE - Build Fails in Restricted Networks**:
```
FetchError: request to https://fonts.googleapis.com/css2?family=Inter... failed
```

**Cause**: `src/app/layout.tsx` uses `next/font/google` which requires internet access to Google Fonts CDN.

**Workaround for Restricted Environments**:
1. Comment out Google Fonts import in `src/app/layout.tsx`
2. Use system fonts instead
3. This is a limitation of the environment, not a code issue

**If build succeeds**, run production build:

```bash
npm start
```

### No Test Suite

**IMPORTANT**: This project does **NOT** have a test suite configured. Do not run `npm test` or attempt to add testing frameworks unless explicitly required.

## Environment Setup

### Required Environment Variables

Create `.env.local` (never commit this file):

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# n8n Webhooks (OPTIONAL - for Phase 2 commands)
N8N_WEBHOOK_BASE_URL=https://your-n8n.com
N8N_SEND_MESSAGE_WEBHOOK=/webhook/send-message
N8N_TRANSFER_HUMAN_WEBHOOK=/webhook/transfer-human
```

**Where to get Supabase credentials**:
1. Go to https://app.supabase.com/project/_/settings/api
2. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret!)

### Database Setup

**MUST RUN BEFORE FIRST USE**:

1. Open Supabase SQL Editor: https://app.supabase.com/project/_/sql
2. Copy entire contents of `migrations/migration.sql`
3. Paste and execute
4. Verify tables created: `clients`, `conversations`, `messages`, `usage_logs`

**Existing n8n Tables** (do NOT modify):
- `Clientes WhatsApp` - Used by n8n workflow
- `n8n_chat_histories` - Chat memory storage
- `documents` - Vector store for RAG

### Database Migrations

**⚠️ CRITICAL RULE**: ALWAYS use migrations for structural database changes.

**Workflow**:

```bash
# 1. Create migration
supabase migration new add_feature_name

# 2. Edit file in supabase/migrations/TIMESTAMP_add_feature_name.sql
# Add SQL (ALTER TABLE, CREATE INDEX, RLS policies)

# 3. Apply to production
supabase db push

# 4. Commit to Git
git add supabase/migrations/
git commit -m "feat: add feature_name"
```

**Example**:

```sql
-- Add new column
ALTER TABLE public.messages ADD COLUMN media_url TEXT;

-- Create index
CREATE INDEX idx_messages_media_url ON public.messages(media_url) 
WHERE media_url IS NOT NULL;
```

**Backup Before Risky Changes**:

```powershell
cd db

# Backup both schemas (public + auth)
.\backup-complete.bat

# Individual schemas
.\backup-postgres.bat  # Application data
.\backup-auth.bat      # Supabase Auth users
```

**Rollback Options**:
1. Create reversal migration: `supabase migration new revert_feature`
2. Restore from backup: `psql CONNECTION_STRING -f db\chatbot_full_TIMESTAMP.sql`

**Never**:
- ❌ Execute ALTER TABLE directly in Supabase Dashboard (production)
- ❌ Edit already-applied migration files
- ❌ Delete migration files
- ❌ Modify n8n tables without coordination

**See**: `db/MIGRATION_WORKFLOW.md` for complete guide

## Key Technical Concepts

### Multi-Tenant Architecture

- Each client has a record in `clients` table
- All tables include `client_id` foreign key
- Dashboard currently uses hardcoded `DEFAULT_CLIENT_ID`
- Phase 3 will add client selector UI

### Data Flow

**Incoming WhatsApp Message**:
1. Meta webhook → n8n workflow (`IA.json`)
2. n8n processes message (AI response, media handling)
3. n8n writes to `Clientes WhatsApp` table
4. Dashboard reads via API routes
5. Realtime updates via Supabase subscriptions

**Dashboard → WhatsApp**:
1. User clicks "Send Message" in dashboard
2. POST to `/api/commands/send-message`
3. Proxies to n8n webhook
4. n8n sends via WhatsApp Business API

### TypeScript Configuration

**Strict Mode Enabled**: All code must pass TypeScript strict checks

Key settings in `tsconfig.json`:
- `strict: true`
- `noEmit: true` (Next.js handles compilation)
- Path alias: `@/*` → `./src/*`

### Functional Programming Style

**REQUIRED CODE PATTERNS**:
- Only `const` (never `let` or `var`)
- No classes (only functions)
- Functional components (React)
- Immutable data patterns
- Arrow functions for callbacks

### API Routes Pattern

All API routes (`src/app/api/*/route.ts`) follow this pattern:

```typescript
export const dynamic = 'force-dynamic' // Disable caching

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient() // Service role key
    // ... query database
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
}
```

**Always use**:
- Server-side Supabase client (service role key)
- `export const dynamic = 'force-dynamic'`
- Try-catch error handling
- Proper HTTP status codes

## Common Pitfalls & Solutions

### "Missing NEXT_PUBLIC_SUPABASE_URL"

**Cause**: `.env.local` missing or invalid
**Fix**:
1. Verify `.env.local` exists
2. Check variable names match exactly
3. No quotes around values
4. Restart dev server: Ctrl+C → `npm run dev`

### "Error fetching conversations"

**Cause**: Database not initialized
**Fix**: Run `migration.sql` in Supabase SQL Editor

### Build Fails with Google Fonts Error

**Cause**: Network restrictions blocking fonts.googleapis.com
**Fix**: This is expected in sandboxed environments. Do not attempt to fix unless deploying to production.

### Lint Shows Warnings

**Expected Behavior**: Warnings are acceptable. Only errors should block PRs.

### TypeScript Errors in IDE

**KNOWN ISSUE**: Running `npx tsc --noEmit` shows 7 type errors in API routes and components. These are pre-existing issues related to:
- Missing properties in type transformations (`created_at`, `conversation_id`, `metadata`)
- Null handling in dashboard pages

**What this means for you**:
- These errors exist in the current codebase
- They don't prevent `npm run dev` or `npm run build` from working
- Next.js build process is more lenient than strict TypeScript check
- Only fix these if your task specifically involves those files
- If you modify affected files, you should fix the type errors in your changes

## Validation Steps Before PR

**ALWAYS perform these checks before creating a PR**:

1. ✅ `npm install` completes successfully
2. ✅ `npm run lint` shows no errors (warnings OK)
3. ✅ `npm run dev` starts without crashes
4. ✅ Navigate to http://localhost:3000 (verify no runtime errors)
5. ✅ Check browser console for errors

**Database Changes**:
- ✅ Migration file created in `supabase/migrations/`
- ✅ Migration committed to Git
- ✅ Backup created before risky changes (`.\backup-complete.bat`)

**TypeScript Check** (informational only):
```bash
npx tsc --noEmit
```
**Note**: Pre-existing type errors exist in the codebase (7 errors in API routes). These don't block development but should be fixed if you modify those files.

**SKIP** (not applicable to this project):
- ❌ Unit tests (no test suite)
- ❌ Production build (Google Fonts restriction in sandboxed environments)
- ❌ E2E tests (not configured)

## Making Code Changes

### Before You Start

1. **Read** `CLAUDE.md` for architectural context
2. **Check** if change affects n8n workflow (if yes, coordinate)
3. **Verify** you understand the multi-tenant pattern
4. **Review** `db/MIGRATION_WORKFLOW.md` if changing database

### Adding New Dependencies

**REQUIRED STEP**: Check for security vulnerabilities

```bash
npm install <package>
npm audit
```

If vulnerabilities found, investigate before proceeding.

### Modifying Database Schema

**CRITICAL**: Use migrations, never direct SQL in production

**Workflow**:

1. Create migration: `supabase migration new add_feature_name`
2. Edit generated file in `supabase/migrations/`
3. Test locally (optional): `supabase db reset`
4. Backup before risky changes: `cd db && .\backup-complete.bat`
5. Apply: `supabase db push`
6. Update TypeScript types in `src/lib/types.ts`
7. Commit migration file to Git

**Example Migration**:

```sql
-- supabase/migrations/20251030_add_priority_to_conversations.sql

-- Add priority column
ALTER TABLE public.conversations 
ADD COLUMN priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 5);

-- Create index
CREATE INDEX idx_conversations_priority 
ON public.conversations(priority DESC);

-- Documentation
COMMENT ON COLUMN public.conversations.priority 
IS 'Prioridade da conversa (0-5, sendo 5 a mais alta)';
```

**Backup Strategy**:

```powershell
# Complete backup (public + auth schemas) - RECOMMENDED
cd db
.\backup-complete.bat

# Individual schemas
.\backup-postgres.bat  # Application data (clients, conversations, messages)
.\backup-auth.bat      # Supabase Auth users (auth.users, auth.identities)
```

**Generated files** (all in `db/` directory):
- `chatbot_full_TIMESTAMP.sql` - Complete public schema backup
- `chatbot_structure_TIMESTAMP.sql` - DDL only (CREATE TABLE, etc)
- `chatbot_data_TIMESTAMP.sql` - INSERT statements only
- `auth_full_TIMESTAMP.sql` - Complete auth schema (⚠️ contains hashed passwords)
- `auth_structure_TIMESTAMP.sql` - Auth DDL
- `auth_data_TIMESTAMP.sql` - Auth data (users, sessions)

**Important**:
- Backup files are **NOT** committed to Git (in `.gitignore`)
- Store backups securely (contain production data)
- `auth_*` files contain sensitive data (user credentials)

**Rollback**:
1. **Preferred**: Create reversal migration
   ```bash
   supabase migration new revert_feature_name
   # Write SQL to undo changes
   supabase db push
   ```

2. **Emergency**: Restore from backup
   ```powershell
   # Get connection string from .env.local (SUPABASE_URL + SERVICE_ROLE_KEY)
   psql "CONNECTION_STRING" -f db\chatbot_full_TIMESTAMP.sql
   ```

### Modifying API Routes

**Pattern to follow**:
- Use `createServerClient()` for database access
- Always add `export const dynamic = 'force-dynamic'`
- Validate all query parameters
- Use TypeScript types from `src/lib/types.ts`
- Return consistent error format

### Modifying UI Components

**shadcn/ui components** (`src/components/ui/*`):
- Do NOT edit directly (regenerate with `npx shadcn-ui@latest add <component>`)
- Modify wrapper components instead

**Custom components**:
- Follow functional component pattern
- Use custom hooks for data fetching
- Handle loading/error states
- Use Tailwind for styling (no CSS modules)

## Git Workflow

### Files to NEVER Commit

Already in `.gitignore`:
- `node_modules/`
- `.next/`
- `.env.local`
- `.env`
- `*.tsbuildinfo`
- `.DS_Store`

### Typical Change Workflow

```bash
# 1. Make changes
# 2. Check what changed
git status

# 3. Lint your changes
npm run lint

# 4. Test dev server
npm run dev

# 5. Stage changes
git add <files>

# 6. Commit with descriptive message
git commit -m "feat: add feature X"

# 7. Push
git push
```

## Debugging Tips

### Dashboard Shows "Nenhuma conversa encontrada"

**Normal if**:
- Fresh database (no messages yet)
- Wrong `client_id` in queries

**Fix**: Insert test data in Supabase SQL Editor (see `QUICK_START.md`)

### Realtime Updates Not Working

**Check**:
1. Supabase Realtime enabled: Database → Replication → `messages` (toggle ON)
2. Wait 1-2 minutes for replication to activate
3. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

### API Returns 501 "Not Implemented"

**Cause**: n8n webhooks not configured
**Expected**: This is optional for Phase 2 (dashboard can work without n8n commands)

### Hot Reload Not Working

**Fix**:
1. Stop dev server (Ctrl+C)
2. Delete `.next/` folder: `rm -rf .next`
3. Restart: `npm run dev`

## Trust These Instructions

**These instructions have been validated through**:
- Testing installation process
- Running lint command
- Attempting build (with known Google Fonts limitation)
- Reviewing all configuration files
- Examining the codebase structure

**Only perform additional searches if**:
- These instructions are incomplete for your specific task
- You discover information here is outdated or incorrect
- You're implementing a feature not covered here

**Priority order for documentation**:
1. This file (`.github/copilot-instructions.md`) - build/validate steps
2. `README.md` - full feature documentation
3. `CLAUDE.md` - architectural guidance
4. `QUICK_START.md` - user onboarding guide
5. `IMPLEMENTATION_SUMMARY.md` - technical implementation details

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
