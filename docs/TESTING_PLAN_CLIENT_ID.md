# Testing Plan: Client ID Filtering Security Fix

## 🎯 Purpose

Verify that the client_id filtering security fix properly isolates data between different clients and prevents unauthorized access.

## 🧪 Test Scenarios

### Prerequisites

Before testing, ensure:
- [ ] Migration `005_add_client_id_to_n8n_tables.sql` has been executed
- [ ] All existing data has been populated with `client_id` values
- [ ] RLS policies are enabled (`RLS.sql` executed)
- [ ] At least 2 test clients exist in the database
- [ ] At least 2 test users exist, each belonging to a different client

## Test Case 1: Authenticated User Access

**Objective**: Verify authenticated users can only see their own client's data

**Setup**:
1. Create two clients in database:
   ```sql
   INSERT INTO clients (id, name, slug, status)
   VALUES 
     ('client-a-uuid', 'Client A', 'client-a', 'active'),
     ('client-b-uuid', 'Client B', 'client-b', 'active');
   ```

2. Create two users, one for each client:
   ```sql
   -- Via Supabase Auth UI or API
   -- User A: usera@test.com (client_id = client-a-uuid)
   -- User B: userb@test.com (client_id = client-b-uuid)
   ```

3. Create test conversations for each client:
   ```sql
   -- Client A conversations
   INSERT INTO "Clientes WhatsApp" (telefone, nome, status, client_id)
   VALUES ('5511999990001', 'Cliente A1', 'bot', 'client-a-uuid');
   
   -- Client B conversations
   INSERT INTO "Clientes WhatsApp" (telefone, nome, status, client_id)
   VALUES ('5511999990002', 'Cliente B1', 'bot', 'client-b-uuid');
   ```

**Test Steps**:

1. **Login as User A**
   - Navigate to `/login`
   - Login with `usera@test.com`
   - Verify redirect to `/dashboard`

2. **Verify User A sees only Client A data**
   - Open DevTools → Network tab
   - Check `/api/conversations` request
   - Verify response contains only conversations with `client_id = client-a-uuid`
   - Verify `client_id` is NOT in the request URL query params
   - Count conversations displayed (should match Client A's count only)

3. **Try to manipulate request (User A)**
   - Open DevTools → Console
   - Try to fetch another client's data:
     ```javascript
     fetch('/api/conversations?client_id=client-b-uuid')
       .then(r => r.json())
       .then(console.log)
     ```
   - **Expected**: Response should still show only Client A's data (client_id from session is used, not query param)

4. **Logout and Login as User B**
   - Logout
   - Login with `userb@test.com`
   - Navigate to `/dashboard`

5. **Verify User B sees only Client B data**
   - Check `/api/conversations` request
   - Verify response contains only conversations with `client_id = client-b-uuid`
   - Verify different conversations than User A saw

**Expected Results**:
- ✅ User A sees only Client A's conversations
- ✅ User B sees only Client B's conversations
- ✅ No cross-client data leakage
- ✅ Query parameter manipulation has no effect

## Test Case 2: Unauthenticated Access

**Objective**: Verify unauthenticated requests are rejected

**Test Steps**:

1. **Logout** (or use incognito window)

2. **Try to access API directly**:
   ```bash
   curl https://your-app.com/api/conversations
   ```

3. **Try to access dashboard**:
   - Navigate to `/dashboard`

**Expected Results**:
- ✅ API returns `401 Unauthorized`
- ✅ Dashboard redirects to `/login`
- ✅ No data is returned

## Test Case 3: Messages Filtering

**Objective**: Verify message endpoint properly filters by client_id

**Setup**:
1. Create messages for both clients:
   ```sql
   -- Client A messages
   INSERT INTO n8n_chat_histories (session_id, message, client_id)
   VALUES ('5511999990001', '{"type":"human","content":"Hello A"}', 'client-a-uuid');
   
   -- Client B messages
   INSERT INTO n8n_chat_histories (session_id, message, client_id)
   VALUES ('5511999990002', '{"type":"human","content":"Hello B"}', 'client-b-uuid');
   ```

**Test Steps**:

1. **Login as User A**

2. **Access messages for Client A's conversation**:
   - Navigate to `/dashboard/conversations/5511999990001`
   - Check Network tab for `/api/messages/5511999990001` request

3. **Try to access Client B's messages**:
   - Navigate to `/dashboard/conversations/5511999990002`
   - Check API response

**Expected Results**:
- ✅ User A can see messages from phone `5511999990001`
- ✅ User A cannot see messages from phone `5511999990002` (empty or 404)
- ✅ SQL query includes `client_id` filter

## Test Case 4: SQL Injection Protection

**Objective**: Verify client_id is properly parameterized

**Test Steps**:

1. **Login as User A**

2. **Try SQL injection in phone parameter**:
   ```
   Navigate to: /dashboard/conversations/5511999990001' OR '1'='1
   ```

3. **Check database logs** for executed queries

**Expected Results**:
- ✅ No SQL injection possible
- ✅ Parameters are properly escaped
- ✅ Query uses prepared statements

## Test Case 5: Legacy Data Compatibility

**Objective**: Verify system works with NULL client_id (legacy data)

**Setup**:
1. Create a conversation without client_id:
   ```sql
   INSERT INTO "Clientes WhatsApp" (telefone, nome, status, client_id)
   VALUES ('5511999990003', 'Legacy Cliente', 'bot', NULL);
   ```

**Test Steps**:

1. **Login as User A**
2. **Check if legacy conversation appears**

**Expected Results**:
- ✅ Legacy conversations (client_id = NULL) appear for all users
- OR
- ✅ Legacy conversations are filtered out (depending on business logic)

**Note**: The SQL uses `OR client_id IS NULL` which means legacy data will show for all clients. This may need adjustment based on business requirements.

## Test Case 6: RLS Policy Verification

**Objective**: Verify Row Level Security is enforced at database level

**Test Steps**:

1. **Get User A's JWT token** from browser cookies

2. **Connect to database using User A's token**:
   ```javascript
   const { createClient } = require('@supabase/supabase-js')
   
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   )
   
   await supabase.auth.setSession({
     access_token: 'user-a-jwt-token',
     refresh_token: 'user-a-refresh-token'
   })
   
   const { data } = await supabase
     .from('n8n_chat_histories')
     .select('*')
   
   console.log(data) // Should only show Client A's messages
   ```

**Expected Results**:
- ✅ Query returns only Client A's messages (filtered by RLS)
- ✅ Even direct database access is protected

## Test Case 7: Performance Test

**Objective**: Verify filtering doesn't significantly impact performance

**Test Steps**:

1. **Create 1000+ conversations** for two different clients

2. **Measure API response time**:
   - Before fix (without client_id filter)
   - After fix (with client_id filter)

3. **Check database query execution plan**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM n8n_chat_histories
   WHERE session_id = '5511999990001'
   AND (client_id = 'client-a-uuid' OR client_id IS NULL);
   ```

**Expected Results**:
- ✅ Response time increase < 10%
- ✅ Index on `client_id` is being used
- ✅ Query plan shows index scan, not sequential scan

## 🐛 Common Issues to Watch For

### Issue 1: Session Not Found
**Symptom**: All API requests return 401
**Cause**: User profile not created or session cookies missing
**Fix**: 
- Verify `user_profiles` table has entry for user
- Check browser cookies for Supabase auth tokens

### Issue 2: Empty Conversations
**Symptom**: User sees no conversations even though data exists
**Cause**: `client_id` not populated in database
**Fix**:
- Run migration step 4 to populate `client_id`
- Verify: `SELECT COUNT(*) FROM n8n_chat_histories WHERE client_id IS NULL`

### Issue 3: Legacy Data Shows for All Users
**Symptom**: Conversations with `client_id = NULL` appear for everyone
**Cause**: SQL uses `OR client_id IS NULL`
**Fix** (if unwanted):
- Remove `OR client_id IS NULL` from queries
- Populate all legacy data with appropriate `client_id`

## 📊 Test Results Template

| Test Case | Status | Notes | Date |
|-----------|--------|-------|------|
| 1. Authenticated Access | ⬜ Pass / ❌ Fail | | |
| 2. Unauthenticated Reject | ⬜ Pass / ❌ Fail | | |
| 3. Messages Filtering | ⬜ Pass / ❌ Fail | | |
| 4. SQL Injection Protection | ⬜ Pass / ❌ Fail | | |
| 5. Legacy Data | ⬜ Pass / ❌ Fail | | |
| 6. RLS Policy | ⬜ Pass / ❌ Fail | | |
| 7. Performance | ⬜ Pass / ❌ Fail | | |

## ✅ Sign-off

- [ ] All test cases passed
- [ ] No cross-client data leakage observed
- [ ] Performance is acceptable
- [ ] RLS policies are active
- [ ] Ready for production deployment

**Tested By**: _______________
**Date**: _______________
**Environment**: Development / Staging / Production

---

**Last Updated**: 2025-10-29
