# 🔴 CRITICAL SECURITY BUG: Multi-Tenant Phone Number Isolation

**Date**: 2025-11-30
**Severity**: 🔴 CRITICAL
**Status**: ✅ FIXED

---

## Executive Summary

A **critical multi-tenant isolation breach** was discovered where the same phone number used by different clients would cause data leakage:
- Customer records being overwritten across tenants
- Chat history mixing between clients
- System prompts leaking to wrong clients
- Human handoff status shared incorrectly

**Root Cause**: Database constraint `UNIQUE(telefone)` instead of `UNIQUE(telefone, client_id)`

**Impact**: Any two clients testing with the same phone number would experience cross-contamination of data.

---

## Technical Details

### The Bug

**Database Schema Issue**:
```sql
-- ❌ WRONG (before fix)
ALTER TABLE clientes_whatsapp 
ADD CONSTRAINT clientes_whatsapp_telefone_key UNIQUE (telefone);
```

This constraint allowed only **ONE record per phone number globally**, violating multi-tenant isolation.

**Code Behavior**:
```typescript
// src/nodes/checkOrCreateCustomer.ts
const result = await supabase
  .from('clientes_whatsapp')
  .upsert(
    { telefone: phone, nome: name, status: 'bot', client_id: clientId },
    { onConflict: 'telefone' }  // ❌ WRONG: Global conflict
  )
```

**Attack Scenario**:
1. **Client A** (Luis Boff) tests with `+5511999999999`
   - Creates: `{ telefone: '+5511999999999', client_id: 'aaa...', nome: 'Luis' }`
2. **Client B** (Sports Training) tests with same `+5511999999999`
   - UPSERT detects conflict on `telefone`
   - **OVERWRITES** Client A's record with `client_id: 'bbb...'`
3. **Client A** sends new message
   - Looks up by `telefone` + `client_id: 'aaa...'`
   - **Record not found** (was overwritten)
   - Creates new record, **LOSING ALL CHAT HISTORY**

### Data Leakage Examples

**1. Chat History Leakage**:
```sql
-- Client A's history query
SELECT * FROM n8n_chat_histories 
WHERE session_id = '+5511999999999' AND client_id = 'aaa...';
-- Returns Client B's messages! (because customer was overwritten)
```

**2. System Prompt Leakage**:
```typescript
// Flow: webhook receives client_id from URL (correct)
const config = await getClientConfig('client-b-id')  // ✅ Correct client

// But customer record has wrong client_id from overwrite
const customer = await checkOrCreateCustomer({
  phone: '+5511999999999',
  clientId: 'client-b-id'  // Creates/updates with correct ID NOW
})

// History query uses wrong client_id from old system
const history = await getChatHistory({
  phone: '+5511999999999',
  clientId: 'client-a-id'  // ❌ WRONG (from overwritten record)
})
// Returns Client A's chat history to Client B!
```

**3. Human Handoff Status Leakage**:
```sql
-- Client A transfers to human
UPDATE clientes_whatsapp SET status = 'humano' WHERE telefone = '+5511999999999';

-- Client B checks status
SELECT status FROM clientes_whatsapp 
WHERE telefone = '+5511999999999' AND client_id = 'bbb...';
-- Returns NULL (record was overwritten by Client A!)
```

---

## The Fix

### Database Migration

**File**: `migrations/009_fix_multi_tenant_phone_constraint.sql`

```sql
-- Step 1: Remove old global constraint
ALTER TABLE clientes_whatsapp 
DROP CONSTRAINT clientes_whatsapp_telefone_key;

-- Step 2: Add composite constraint (correct multi-tenant isolation)
ALTER TABLE clientes_whatsapp 
ADD CONSTRAINT clientes_whatsapp_telefone_client_id_key 
UNIQUE (telefone, client_id);

-- Step 3: Add index for performance
CREATE INDEX idx_clientes_whatsapp_telefone_client_id 
ON clientes_whatsapp(telefone, client_id);
```

**Effect**: Now allows the same phone number in **different clients** (isolated), but prevents duplicates **within the same client**.

### Code Update

**File**: `src/nodes/checkOrCreateCustomer.ts`

```typescript
// ✅ FIXED
const result = await supabase
  .from('clientes_whatsapp')
  .upsert(
    { telefone: phone, nome: name, status: 'bot', client_id: clientId },
    { onConflict: 'telefone,client_id' }  // ✅ Composite key
  )
```

---

## Verification

### Before Fix (Vulnerable)

```sql
-- Client A creates record
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Client A User', 'bot', 'client-a-uuid');
-- Result: 1 row inserted

-- Client B creates record with SAME PHONE
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Client B User', 'bot', 'client-b-uuid');
-- Result: ❌ ERROR or OVERWRITE (depending on UPSERT logic)

-- Check records
SELECT telefone, nome, client_id FROM clientes_whatsapp 
WHERE telefone = '+5511999999999';
-- Result: Only 1 row (Client A's record was lost!)
```

### After Fix (Secure)

```sql
-- Client A creates record
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Client A User', 'bot', 'client-a-uuid');
-- Result: 1 row inserted

-- Client B creates record with SAME PHONE (now allowed!)
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Client B User', 'bot', 'client-b-uuid');
-- Result: ✅ 1 row inserted (separate record)

-- Check records
SELECT telefone, nome, client_id FROM clientes_whatsapp 
WHERE telefone = '+5511999999999';
-- Result: 2 rows (isolated by client_id)
--   | telefone        | nome           | client_id      |
--   | +5511999999999  | Client A User  | client-a-uuid  |
--   | +5511999999999  | Client B User  | client-b-uuid  |
```

### Test UPSERT Logic

```sql
-- First insert
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Original Name', 'bot', 'client-a-uuid')
ON CONFLICT (telefone, client_id) DO UPDATE SET nome = EXCLUDED.nome;
-- Result: 1 row inserted

-- Second insert (same phone + client = UPDATE)
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Updated Name', 'bot', 'client-a-uuid')
ON CONFLICT (telefone, client_id) DO UPDATE SET nome = EXCLUDED.nome;
-- Result: ✅ 1 row updated (correct behavior)

-- Third insert (same phone, different client = NEW RECORD)
INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
VALUES ('+5511999999999', 'Different Client', 'bot', 'client-b-uuid')
ON CONFLICT (telefone, client_id) DO UPDATE SET nome = EXCLUDED.nome;
-- Result: ✅ 1 row inserted (new record, not conflict)
```

---

## Impact Analysis

### What Was Affected

1. **Customer Records** (`clientes_whatsapp` table)
   - ❌ Records could be overwritten by different clients
   - ✅ Now isolated by `(telefone, client_id)`

2. **Chat History** (`n8n_chat_histories` table)
   - ⚠️ **Already had correct isolation** (filters by `client_id`)
   - But customer lookup was broken, causing wrong client_id association

3. **Human Handoff Status**
   - ❌ Status shared across clients (same phone)
   - ✅ Now isolated correctly

4. **System Prompts**
   - ⚠️ **Code was correct** (uses `client_id` from webhook URL)
   - User confusion likely from mixed chat history, not prompt leakage

### What Was NOT Affected

- ✅ `clients` table (already has separate records per client)
- ✅ Vault secrets (isolated by `client_id`)
- ✅ Webhook routing (uses `client_id` from URL path)
- ✅ Config loading (filters by `client_id`)

---

## Lessons Learned

### What Went Wrong

1. **Missed Requirements Analysis**: Multi-tenant phone isolation not considered during initial design
2. **Incomplete Testing**: No test case for "same phone number across multiple clients"
3. **Late Discovery**: Bug only surfaced when second client started testing

### Prevention for Future

1. **Multi-Tenant Checklist**:
   - [ ] All tables with shared identifiers MUST have composite unique keys including `client_id`
   - [ ] All queries MUST filter by `client_id` (already doing this ✅)
   - [ ] Test with overlapping data between clients

2. **Test Cases Required**:
   ```typescript
   describe('Multi-tenant isolation', () => {
     it('should allow same phone in different clients', async () => {
       await checkOrCreateCustomer({ phone: '+5511999999999', clientId: 'client-a' })
       await checkOrCreateCustomer({ phone: '+5511999999999', clientId: 'client-b' })
       // Should NOT conflict
     })
   })
   ```

3. **Database Design Review**:
   - Any `UNIQUE` constraint must be reviewed for multi-tenant impact
   - Composite keys should be default for tenant-specific data

---

## Deployment Steps

### 1. Run Migration

```bash
# In Supabase SQL Editor
# Paste and execute: migrations/009_fix_multi_tenant_phone_constraint.sql
```

**Expected output**:
```
✅ Removed old UNIQUE(telefone) constraint
✅ Added new UNIQUE(telefone, client_id) constraint
✅ MIGRATION SUCCESSFUL!
```

### 2. Deploy Code Changes

```bash
# Already merged in main branch
git pull origin main

# Restart development server
npm run dev

# Or deploy to production
vercel --prod
```

### 3. Verify in Production

```sql
-- Check constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'clientes_whatsapp'::regclass;
-- Should show: clientes_whatsapp_telefone_client_id_key (UNIQUE)

-- Test with same phone in 2 clients
SELECT telefone, nome, client_id, status 
FROM clientes_whatsapp 
WHERE telefone = '+5511999999999';
-- Should show separate records per client_id
```

### 4. Monitor Logs

```bash
# Check for UPSERT errors
# Old error (should NOT appear after fix):
#   "duplicate key value violates unique constraint clientes_whatsapp_telefone_key"

# Look for successful UPSERTs:
#   "[checkOrCreateCustomer] ✅ Customer created/updated"
```

---

## Rollback Plan

**If issues occur**, rollback in reverse order:

1. **Code rollback** (revert `checkOrCreateCustomer.ts`):
   ```typescript
   { onConflict: 'telefone' }  // Revert to old behavior
   ```

2. **Database rollback** (⚠️ may fail if duplicates exist):
   ```sql
   ALTER TABLE clientes_whatsapp 
   DROP CONSTRAINT clientes_whatsapp_telefone_client_id_key;
   
   ALTER TABLE clientes_whatsapp 
   ADD CONSTRAINT clientes_whatsapp_telefone_key UNIQUE (telefone);
   ```

3. **Clean up duplicates** (if rollback fails):
   ```sql
   -- Find duplicates
   SELECT telefone, COUNT(*) 
   FROM clientes_whatsapp 
   GROUP BY telefone 
   HAVING COUNT(*) > 1;
   
   -- Manually resolve (keep one, delete others)
   DELETE FROM clientes_whatsapp 
   WHERE ctid NOT IN (
     SELECT MIN(ctid) 
     FROM clientes_whatsapp 
     GROUP BY telefone
   );
   ```

---

## References

- **Migration**: `migrations/009_fix_multi_tenant_phone_constraint.sql`
- **Code Fix**: `src/nodes/checkOrCreateCustomer.ts` (line 42)
- **Related Functions**:
  - `getChatHistory.ts` - Already filters by `client_id` ✅
  - `checkHumanHandoffStatus.ts` - Already filters by `client_id` ✅
  - `saveChatMessage.ts` - Already saves with `client_id` ✅

- **GitHub Issue**: [Link to issue if created]
- **Security Advisory**: VULN-013 (if numbered)

---

## Status

- ✅ Bug identified and documented
- ✅ Migration created and tested
- ✅ Code updated
- ⏳ Awaiting deployment approval
- ⏳ Production verification pending

---

**Updated**: 2025-11-30
**Reviewed by**: AI Assistant
**Approved by**: [Pending]
