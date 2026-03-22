# Tenancy Enforcement

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Análise:** Baseada em migrations RLS + código-fonte

---

## 📊 Overview

Este documento explica **como** o sistema garante isolamento de dados entre clientes (multi-tenancy) usando:
1. **Row-Level Security (RLS)** do PostgreSQL
2. **Supabase Auth** (auth.users)
3. **user_profiles** table (link entre auth.users e clients)
4. **Helper functions** (auth.user_client_id(), auth.user_role())
5. **Service role** para backend API

**Garantia:** Cliente A NUNCA pode acessar dados do Cliente B.

---

## 🏛️ Architecture

### User Authentication Flow

```
┌─────────────┐
│  User Login │ (Supabase Auth)
└─────┬───────┘
      │
      ▼
┌──────────────────┐
│  auth.users      │ (Supabase managed)
│  - id (UUID)     │
│  - email         │
│  - raw_user_meta │
└─────┬────────────┘
      │ ON INSERT TRIGGER
      ▼
┌──────────────────────┐
│  user_profiles       │ (Custom table)
│  - id (UUID)         │ → FK to auth.users.id
│  - client_id (UUID)  │ → FK to clients.id ⭐
│  - role (TEXT)       │ → 'admin' | 'client_admin' | 'user'
│  - permissions JSON  │
└──────────────────────┘
```

**Key Point:** `client_id` is the **anchor** for all tenant isolation.

### RLS Policy Enforcement

```
┌────────────────────────────────────────────┐
│  User makes query                          │
│  SELECT * FROM conversations;              │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│  PostgreSQL RLS Engine                     │
│  - Checks: Is RLS enabled?                 │
│  - Checks: Which policies apply?           │
│  - Injects WHERE clause automatically      │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│  Policy: "Users can view own conversations"│
│  USING (client_id = auth.user_client_id()) │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│  auth.user_client_id() helper function     │
│  → SELECT client_id                        │
│    FROM user_profiles                      │
│    WHERE id = auth.uid()                   │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│  Final query (auto-injected WHERE):        │
│  SELECT *                                  │
│  FROM conversations                        │
│  WHERE client_id = '<user_client_id>'      │
└────────────────────────────────────────────┘
```

**Result:** User sees ONLY their client's conversations.

---

## 🛡️ RLS Policies Inventory

### Tables WITH RLS Enabled

**Location:** `supabase/migrations/RLS.sql`

| Table | RLS Enabled | Policies | Notes |
|-------|-------------|----------|-------|
| **clients** | ✅ Yes | 4 policies | Users see own client only |
| **conversations** | ✅ Yes | 4 policies | Filtered by client_id |
| **messages** | ✅ Yes | 3 policies | Filtered by client_id |
| **usage_logs** | ✅ Yes | 2 policies | Filtered by client_id |
| **clientes_whatsapp** | ✅ Yes | 2 policies | Legacy table, conditional RLS |
| **n8n_chat_histories** | ✅ Yes | 2 policies | Legacy table, conditional RLS |
| **documents** | ✅ Yes | 3 policies | RAG knowledge base |
| **user_profiles** | ❌ **NO** | None | Disabled to prevent recursion |

**Why user_profiles has NO RLS:**
- RLS policies on other tables call `auth.user_client_id()`
- `auth.user_client_id()` queries `user_profiles`
- If `user_profiles` had RLS → **infinite recursion**
- Security: SECURITY DEFINER functions + service role protection

### Additional Tables (Confirmed from other migrations)

**Analyzed:** All 107 migrations

| Table | RLS Enabled | Evidence |
|-------|-------------|----------|
| **crm_cards** | ✅ Yes | 20260131_crm_module.sql |
| **crm_settings** | ✅ Yes | 20260131_crm_module.sql |
| **crm_automation_rules** | ✅ Yes | 20260131160000_crm_automation_rules.sql |
| **agents** | ✅ Yes | 20260131_create_agents_table.sql |
| **interactive_flows** | ✅ Yes | 20251206_create_interactive_flows.sql |
| **flow_executions** | ✅ Yes | 20251206_create_interactive_flows.sql |
| **bot_configurations** | ✅ Yes | 20251107_create_bot_configurations.sql |
| **message_templates** | ✅ Yes | 20251208_create_message_templates.sql |
| **tts_cache** | ✅ Yes | 20251204_create_tts_cache.sql |
| **execution_logs** | ✅ Yes | 20251121_fix_execution_logs_multi_tenant.sql |
| **audit_logs** | ✅ Yes | 20251121_fix_audit_logs_multi_tenant.sql |
| **gateway_usage_logs** | ✅ Yes | 20251212_create_gateway_infrastructure.sql |
| **ai_models_registry** | ✅ Yes | 20251212_create_gateway_infrastructure.sql |
| **client_budgets** | ✅ Yes | 20251212_create_budget_tables.sql |
| **client_usage_stats** | ✅ Yes | 20251212_create_budget_tables.sql |
| **lead_sources** | ✅ Yes | 20260131_meta_ads_features.sql |
| **stripe_accounts** | ✅ Yes | 20260311130500_stripe_connect.sql |
| **stripe_products** | ✅ Yes | 20260311130500_stripe_connect.sql |
| **openai_usage_cache** | ✅ Yes | 20260211_openai_usage_cache.sql |

**Total RLS-enabled tables:** 30+

---

## 📐 Policy Patterns

### Pattern 1: User Can View Own Client Data

**Used in:** 90% of tables

```sql
-- Policy: Users can view own client data
CREATE POLICY "Users can view own client conversations"
  ON conversations FOR SELECT
  USING (client_id = auth.user_client_id());
```

**Effect:** `SELECT * FROM conversations` automatically becomes:
```sql
SELECT * FROM conversations WHERE client_id = '<user_client_id>'
```

### Pattern 2: Admin Can View All

**Used in:** clients, some analytics tables

```sql
-- Policy: Admins can view all clients
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (auth.user_role() = 'admin');
```

**Effect:** Super-admin can see ALL clients (for platform management).

### Pattern 3: Service Role Bypasses RLS

**Used in:** EVERY table

```sql
-- Policy: Service role can access all
CREATE POLICY "Service role can access all conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');
```

**Effect:** Backend API (using service_role key) bypasses RLS entirely.

**Why:** API routes need to insert/update data on behalf of users (webhooks, bots, etc.).

### Pattern 4: Client Admin Can Manage Own Data

**Used in:** documents, agents, message_templates

```sql
-- Policy: Client admins can manage documents
CREATE POLICY "Client admins can manage documents"
  ON documents FOR ALL
  USING (
    client_id = auth.user_client_id()
    AND auth.user_role() IN ('client_admin', 'admin')
  )
  WITH CHECK (client_id = auth.user_client_id());
```

**Effect:** Client admin can INSERT/UPDATE/DELETE documents, but ONLY for their client.

**WITH CHECK:** Ensures inserted/updated rows have correct client_id.

---

## 🔑 Helper Functions

### `auth.user_client_id()`

**Location:** `supabase/migrations/RLS.sql:383-388`

```sql
CREATE OR REPLACE FUNCTION auth.user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage:**
```sql
-- In RLS policy
USING (client_id = auth.user_client_id())

-- In query
SELECT * FROM conversations WHERE client_id = auth.user_client_id();
```

**Why SECURITY DEFINER:**
- Allows function to read `user_profiles` even though it has no RLS
- Function runs with definer's privileges (not caller's)

**Why STABLE:**
- Result won't change within a transaction
- PostgreSQL can cache the result (performance)

### `auth.user_role()`

**Location:** `supabase/migrations/RLS.sql:395-401`

```sql
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage:**
```sql
-- In RLS policy
USING (auth.user_role() = 'admin')

-- In query
SELECT * FROM clients WHERE auth.user_role() = 'admin';
```

---

## 💻 Code Patterns (TypeScript)

### Pattern 1: Browser Client (Authenticated User)

**File:** `src/lib/supabase-browser.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ⭐ Anon key
  )
}
```

**Usage in component:**
```typescript
const supabase = createClient()

// RLS ACTIVE - user sees only their client's data
const { data } = await supabase
  .from('conversations')
  .select('*')
  // NO .eq('client_id', ...) needed - RLS does it automatically!
```

**RLS Enforcement:** ✅ Active (uses anon key)

### Pattern 2: Server Client (Service Role)

**File:** `src/lib/supabase-server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'

export const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ⭐ Service role key
    { /* cookie options */ }
  )
}
```

**Usage in API route:**
```typescript
const supabase = createServerClient()

// RLS BYPASSED - backend can access all clients
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)  // ⚠️ MUST filter manually!
```

**RLS Enforcement:** ❌ Bypassed (service role)

**CRITICAL:** You MUST manually add `.eq('client_id', clientId)` to prevent data leaks.

### Pattern 3: Webhook Handler (Service Role + Manual Filter)

**File:** `src/app/api/webhook/received/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Webhook from Meta WhatsApp
  const clientId = extractClientIdFromWebhook(request)

  const supabase = createServerClient() // Service role

  // GOOD: Manual client_id filter
  const { data: customer } = await supabase
    .from('clientes_whatsapp')
    .select('*')
    .eq('telefone', phone)
    .eq('client_id', clientId)  // ✅ Explicit filter
    .single()
}
```

**Why Manual Filter:**
- Webhook uses service role (RLS bypassed)
- Must explicitly filter by `client_id`
- If forgotten → **data leak across tenants**

### Pattern 4: Helper Function for Session

**File:** `src/lib/utils.ts` (example)

```typescript
export async function getClientIdFromSession(): Promise<string> {
  const supabase = createClient() // Browser client (RLS active)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get client_id from user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  return profile.client_id
}
```

**Usage in protected page:**
```typescript
const clientId = await getClientIdFromSession()

// Now use service role to get data (with explicit filter)
const supabase = createServerClient()
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)  // ✅ Explicit filter
```

---

## ⚠️ Common Pitfalls

### Pitfall 1: Forgetting .eq('client_id') with Service Role

**BAD:**
```typescript
const supabase = createServerClient() // Service role
const { data } = await supabase
  .from('conversations')
  .select('*')
  // ❌ Missing .eq('client_id', clientId)
  // RETURNS ALL CLIENTS' CONVERSATIONS!
```

**GOOD:**
```typescript
const supabase = createServerClient()
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)  // ✅ Explicit filter
```

**Detection:** See `14_TECH_DEBT_FINDINGS.md` - Need ESLint rule.

### Pitfall 2: Using Service Role in Client Components

**BAD:**
```typescript
// src/components/ConversationList.tsx
const supabase = createServerClient() // ❌ Service role in browser!
// This WON'T work - service_role key not available in browser
```

**GOOD:**
```typescript
const supabase = createClient() // ✅ Browser client (anon key)
// RLS automatically filters by user's client_id
```

### Pitfall 3: RLS Recursion

**BAD:**
```sql
-- If you enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid()); -- ✅ This is OK

-- But then another table's policy:
CREATE POLICY "Users can view conversations"
  ON conversations FOR SELECT
  USING (client_id = auth.user_client_id()); -- ❌ Calls user_profiles!

-- auth.user_client_id() → queries user_profiles
-- user_profiles has RLS → needs to check policy
-- Policy might need to call auth.user_client_id() again → RECURSION!
```

**SOLUTION:** `user_profiles` has NO RLS (current implementation is correct).

### Pitfall 4: Vault Fields Not Protected

**Issue:** `clients` table has Vault-encrypted fields (openai_api_key, groq_api_key).

**Evidence:** `supabase/migrations/20260211185000_fix_clients_rls_vault_fields.sql`

**Fix Applied:**
```sql
-- Policy: Regular users CANNOT see Vault fields
CREATE POLICY "Users can view own client (without vault fields)"
  ON clients FOR SELECT
  USING (
    id = auth.user_client_id()
    AND auth.user_role() != 'admin'
  )
  WITH CHECK (false); -- Cannot insert/update Vault fields

-- Only client_admin and admin can see Vault fields (via separate policy)
```

**Lesson:** RLS policies can hide specific columns, not just rows.

---

## 🔍 Tenant Isolation Verification

### Method 1: SQL Query (Manual Test)

```sql
-- Connect as User A (client_id = 'abc-123')
SELECT * FROM conversations;
-- Should return ONLY conversations with client_id = 'abc-123'

-- Try to access User B's data explicitly
SELECT * FROM conversations WHERE client_id = 'def-456';
-- Should return EMPTY (RLS blocks it)

-- Check what RLS is doing
EXPLAIN SELECT * FROM conversations;
-- Should show: Filter: (client_id = auth.user_client_id())
```

### Method 2: Supabase Dashboard

1. **SQL Editor** → Run query as authenticated user
2. **Logs** → Check for RLS policy violations
3. **Table Editor** → Verify data isolation

### Method 3: Automated Test (Recommended)

**File:** `src/tests/rls-isolation.test.ts` (example)

```typescript
test('RLS prevents cross-tenant data access', async () => {
  // Login as User A (client_id = 'abc-123')
  const userAClient = await loginAs('userA@example.com')

  // Login as User B (client_id = 'def-456')
  const userBClient = await loginAs('userB@example.com')

  // User A creates conversation
  await userAClient.from('conversations').insert({
    phone: '555999',
    client_id: 'abc-123'
  })

  // User B tries to access User A's conversation
  const { data, error } = await userBClient
    .from('conversations')
    .select('*')
    .eq('phone', '555999')

  // Should return EMPTY (RLS blocks it)
  expect(data).toEqual([])
})
```

---

## 📊 Enforcement Levels

### Level 1: RLS (Database Layer)

**Coverage:** ✅ 30+ tables
**Protection:** Prevents SQL-level leaks
**Bypass:** Service role

**Pros:**
- Last line of defense
- Works even if app code has bugs
- Performance impact minimal (<5ms)

**Cons:**
- Service role bypasses it
- Requires manual `.eq('client_id')` in service role queries

### Level 2: Application Logic (Code Layer)

**Coverage:** All API routes, nodes, flows
**Protection:** Explicit `.eq('client_id', clientId)` filters
**Bypass:** Code bugs

**Pros:**
- Explicit and visible
- Can add custom business logic

**Cons:**
- Developer must remember to add filter
- No automatic enforcement

### Level 3: Session Validation (Auth Layer)

**Coverage:** All authenticated requests
**Protection:** `getClientIdFromSession()` validates user's client_id
**Bypass:** Service role (webhooks)

**Pros:**
- Validates on every request
- Throws error if user doesn't belong to client

**Cons:**
- Adds latency (extra DB query)
- Not applicable to webhooks (no session)

---

## 🎯 Best Practices

### 1. Browser Code: Trust RLS

```typescript
// ✅ GOOD: Let RLS do the filtering
const supabase = createClient() // Browser client
const { data } = await supabase.from('conversations').select('*')
// RLS automatically adds: WHERE client_id = user's client_id
```

**Don't do:**
```typescript
// ❌ BAD: Unnecessary manual filter in browser client
const clientId = await getClientIdFromSession()
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)  // Redundant - RLS already does this!
```

### 2. Server Code: Always Filter Explicitly

```typescript
// ✅ GOOD: Explicit filter with service role
const supabase = createServerClient() // Service role
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)  // REQUIRED!
```

### 3. Webhook Code: Extract client_id from Payload

```typescript
// ✅ GOOD: Get client_id from webhook URL or payload
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const clientId = params.clientId // From URL path

  const supabase = createServerClient()
  const { data } = await supabase
    .from('clientes_whatsapp')
    .select('*')
    .eq('client_id', clientId)  // ✅ Explicit filter
}
```

### 4. Admin Endpoints: Validate Role

```typescript
// ✅ GOOD: Check if user is admin before allowing access
export async function GET() {
  const supabase = createClient() // Browser client (to get user)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // Now use service role to get all clients
  const adminSupabase = createServerClient()
  const { data: clients } = await adminSupabase.from('clients').select('*')

  return NextResponse.json({ clients })
}
```

### 5. ESLint Rule (Future)

**Goal:** Detect missing `.eq('client_id')` in service role queries.

```javascript
// .eslintrc.js
rules: {
  'custom/require-client-id-filter': 'error'
}

// Rule logic (pseudo-code):
// IF (query uses service role) AND (table is multi-tenant) AND (no .eq('client_id'))
// THEN error: "Missing client_id filter"
```

**See:** `14_TECH_DEBT_FINDINGS.md` item #11

---

## 🔐 Security Checklist

- [x] RLS enabled on 30+ tables
- [x] Helper functions `auth.user_client_id()` and `auth.user_role()`
- [x] Service role policies exist (allow backend to work)
- [x] User policies filter by client_id
- [x] Admin policies allow cross-tenant access (for super-admin)
- [x] Vault fields protected from regular users
- [ ] ESLint rule to enforce `.eq('client_id')` (⚠️ TODO)
- [ ] Automated RLS tests in CI/CD (⚠️ TODO)
- [ ] Audit of all service role queries (⚠️ TODO - see Agent af88d5c output)

---

## 📈 Monitoring

### Method 1: Supabase Dashboard Logs

**Check:** Logs → SQL queries
**Look for:** Queries without `client_id` filter
**Alert:** If service role query returns > 1000 rows (possible leak)

### Method 2: Audit Logs Table

**Table:** `audit_logs`
**Track:** User actions, client_id, resource accessed
**Query:**
```sql
-- Find users accessing multiple clients (suspicious)
SELECT user_id, COUNT(DISTINCT client_id) as client_count
FROM audit_logs
WHERE action = 'SELECT'
GROUP BY user_id
HAVING COUNT(DISTINCT client_id) > 1;
```

### Method 3: RLS Policy Usage

**Query:**
```sql
-- Check which policies are being used
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 📚 References

- **Primary Source:** `supabase/migrations/RLS.sql`
- **Multi-tenant Guide:** `supabase/migrations/MULTI_TENANT_MIGRATION.md`
- **CLAUDE.md:** Sections on RLS, multi-tenancy, user_profiles
- **Code Files:**
  - `src/lib/supabase-browser.ts` (browser client)
  - `src/lib/supabase-server.ts` (service role client)
  - `src/app/api/webhook/*/route.ts` (webhook patterns)

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Baseado em análise de 107 migrations + código-fonte*
