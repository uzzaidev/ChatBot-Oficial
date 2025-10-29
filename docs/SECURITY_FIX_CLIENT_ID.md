# Security Fix: Client ID Filtering in API Routes

## 🔒 Security Vulnerability Fixed

**Issue**: API routes were accepting `client_id` from query parameters without validation against the authenticated user's session. This allowed malicious users to access conversations and messages from other clients by manipulating the `client_id` parameter in API requests.

**Severity**: **CRITICAL** - Complete bypass of multi-tenant isolation

## ✅ What Was Fixed

### 1. API Routes Security

All API routes now:
- ✅ Authenticate requests using `getClientIdFromSession()`
- ✅ Return `401 Unauthorized` if no valid session exists
- ✅ Filter database queries by the authenticated user's `client_id`
- ✅ **Never trust** `client_id` from query params or request body

**Files Changed**:
- `src/app/api/conversations/route.ts`
- `src/app/api/messages/[phone]/route.ts`
- `src/app/api/commands/transfer-human/route.ts`

### 2. SQL Query Filtering

All SQL queries now include `client_id` filtering:

**Before** (vulnerable):
```sql
SELECT * FROM "Clientes WhatsApp" c
LEFT JOIN n8n_chat_histories h ON c.telefone = h.session_id
WHERE EXISTS (SELECT 1 FROM n8n_chat_histories h3 WHERE h3.session_id = c.telefone)
```

**After** (secure):
```sql
SELECT * FROM "Clientes WhatsApp" c
LEFT JOIN n8n_chat_histories h ON c.telefone = h.session_id
  AND (h.client_id = $1 OR h.client_id IS NULL)
WHERE EXISTS (
  SELECT 1 FROM n8n_chat_histories h3 
  WHERE h3.session_id = c.telefone
    AND (h3.client_id = $1 OR h3.client_id IS NULL)
)
```

> **Note**: `OR client_id IS NULL` handles legacy data that doesn't have `client_id` populated yet.

### 3. Client Hooks Updated

React hooks no longer send `client_id` as query parameters:

**Files Changed**:
- `src/hooks/useConversations.ts`
- `src/hooks/useMessages.ts`

**Before**:
```typescript
const params = new URLSearchParams({
  client_id: clientId, // ❌ Vulnerable - can be manipulated
  limit: limit.toString(),
})
```

**After**:
```typescript
const params = new URLSearchParams({
  limit: limit.toString(),
  // client_id comes from session in API route
})
```

## 🗄️ Database Migration Required

### Add `client_id` to n8n Tables

If your database doesn't have `client_id` column in the n8n legacy tables, you **MUST** run this migration:

**File**: `migrations/005_add_client_id_to_n8n_tables.sql`

**Steps**:

1. **Run the migration** in Supabase SQL Editor:
   ```bash
   # Copy and paste the entire file into Supabase SQL Editor
   # Execute it
   ```

2. **Populate existing data** with your default client ID:
   ```sql
   -- Replace with your actual client_id from the clients table
   UPDATE "Clientes WhatsApp" 
   SET client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID
   WHERE client_id IS NULL;
   
   UPDATE n8n_chat_histories 
   SET client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID
   WHERE client_id IS NULL;
   ```

3. **Verify data**:
   ```sql
   -- Should return 0
   SELECT COUNT(*) FROM n8n_chat_histories WHERE client_id IS NULL;
   ```

4. **Enable RLS** (Row Level Security):
   ```bash
   # Execute migrations/RLS.sql in Supabase SQL Editor
   ```

## 🧪 Testing the Fix

### Manual Testing

1. **Create two test users** with different `client_id` values
2. **Log in as User A** and note their conversations
3. **Try to access User B's data**:
   - ✅ Should see only User A's conversations
   - ✅ API should return 401 if not authenticated
   - ✅ Cannot manipulate client_id in browser DevTools

### Automated Testing (Future)

```typescript
// TODO: Add integration tests
describe('Client ID Isolation', () => {
  it('should only return conversations for authenticated client', async () => {
    // Test implementation
  })
  
  it('should return 401 if not authenticated', async () => {
    // Test implementation
  })
})
```

## 🔐 Additional Security Measures

### 1. Row Level Security (RLS)

RLS provides **database-level** enforcement of multi-tenant isolation:

```sql
-- Example policy for n8n_chat_histories
CREATE POLICY "Users can view own client chat histories"
  ON n8n_chat_histories FOR SELECT
  USING (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );
```

**File**: `migrations/RLS.sql`

### 2. Middleware Protection

The middleware already protects dashboard routes:

**File**: `middleware.ts`

```typescript
// Verifies authentication before allowing access
// Injects client_id into headers
export async function middleware(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect('/login')
  }
  
  // Get client_id from user_profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()
  
  response.headers.set('x-user-client-id', profile.client_id)
}
```

## 📊 Architecture After Fix

```
┌─────────────────────────────────────────────────────┐
│                   User Browser                      │
│  - Authenticated session (JWT in cookie)            │
│  - client_id stored in user_profiles table          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              middleware.ts                          │
│  1. Verify auth session                            │
│  2. Get client_id from user_profiles               │
│  3. Allow access or redirect to /login             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           API Routes (Protected)                    │
│                                                     │
│  /api/conversations:                                │
│    ✅ clientId = await getClientIdFromSession()    │
│    ✅ Filter SQL: WHERE client_id = $1             │
│                                                     │
│  /api/messages/[phone]:                             │
│    ✅ clientId = await getClientIdFromSession()    │
│    ✅ Filter SQL: WHERE client_id = $1             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           Database (PostgreSQL + RLS)               │
│                                                     │
│  Tables:                                            │
│  - clients (id, name, ...)                          │
│  - user_profiles (id, client_id, ...)               │
│  - "Clientes WhatsApp" (telefone, client_id, ...)   │
│  - n8n_chat_histories (session_id, client_id, ...)  │
│                                                     │
│  RLS Policies:                                      │
│  ✅ client_id = auth.user_client_id()              │
└─────────────────────────────────────────────────────┘
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Run migration `005_add_client_id_to_n8n_tables.sql`
- [ ] Populate `client_id` for all existing data
- [ ] Verify no NULL `client_id` values remain
- [ ] Enable RLS policies (`RLS.sql`)
- [ ] Test with two different user accounts
- [ ] Verify middleware is protecting routes
- [ ] Check API routes return 401 for unauthenticated requests
- [ ] Monitor Supabase logs for blocked queries

## ⚠️ Breaking Changes

### For API Clients

If you have external clients calling these APIs directly:

**Before**:
```bash
curl https://api.example.com/api/conversations?client_id=xxx
```

**After**:
```bash
# Must be authenticated with valid session cookie
curl https://api.example.com/api/conversations \
  -H "Cookie: sb-access-token=..."
```

### For n8n Workflows

n8n workflows calling these APIs must:
1. Use the `/api/webhook/[clientId]` endpoint instead
2. OR authenticate using service role key (not recommended for production)

## 📚 Related Files

- `src/lib/supabase-server.ts` - Session helpers (`getClientIdFromSession`)
- `middleware.ts` - Route protection
- `migrations/RLS.sql` - Row Level Security policies
- `migrations/005_add_client_id_to_n8n_tables.sql` - Database schema update

## 🔗 References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

**Last Updated**: 2025-10-29
**Issue**: #[issue-number]
**PR**: #[pr-number]
