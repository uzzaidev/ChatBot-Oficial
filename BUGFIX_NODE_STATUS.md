# Bug Fix: Node Status Not Persisting in Flow Architecture

## Problem Description
When toggling a node off in the `/dashboard/flow-architecture` page, the change appeared to save successfully (showing a success notification), but upon page refresh, the node would return to its active state.

## Root Causes Identified

### 1. Missing Error Handling in GET Endpoint
The `GET /api/flow/nodes/[nodeId]` endpoint was not checking for database query errors. If a query failed silently (e.g., due to RLS issues or connection problems), it would default to `enabled: true` without logging any error.

```typescript
// BEFORE (no error checking):
const { data: enabledData } = await supabase
  .from('bot_configurations')
  .select('config_value')
  .eq('client_id', clientId)
  .eq('config_key', enabledConfigKey)
  .single()

if (enabledData) {
  config.enabled = enabledData.config_value?.enabled !== false
}

// AFTER (with error checking):
const { data: enabledData, error: enabledFetchError } = await supabase
  .from('bot_configurations')
  .select('config_value')
  .eq('client_id', clientId)
  .eq('config_key', enabledConfigKey)
  .single()

// Log errors (except "not found" which is expected)
if (enabledFetchError && enabledFetchError.code !== 'PGRST116') {
  console.error('[flow/nodes] Error fetching enabled state:', enabledFetchError)
}

if (enabledData && enabledData.config_value) {
  const enabledValue = enabledData.config_value.enabled
  config.enabled = enabledValue === true || enabledValue === 'true'
  console.log(`[flow/nodes] ✓ Loaded node ${nodeId} enabled state: ${config.enabled} from database`)
}
```

### 2. Incorrect Logic for Checking Enabled State
The original logic used `!== false` which has issues:
- If value is `undefined`: `undefined !== false` → `true` (WRONG!)
- If value is `null`: `null !== false` → `true` (WRONG!)
- If value is string `"false"`: `"false" !== false` → `true` (WRONG!)

**New logic explicitly checks for true values:**
```typescript
// BEFORE:
enabled: data.config?.enabled !== false

// AFTER:
const enabledValue = data.config?.enabled
enabled: enabledValue === true || enabledValue === 'true'
```

This ensures that only explicitly true values result in `enabled: true`. Everything else (false, undefined, null, etc.) results in `enabled: false`.

### 3. No Type Safety in PATCH Endpoint
The PATCH endpoint was storing the `enabled` value directly from the request body without ensuring it's a proper boolean:

```typescript
// BEFORE:
config_value: { enabled }

// AFTER:
const enabledBoolean = Boolean(enabled === true || enabled === 'true')
config_value: { enabled: enabledBoolean }
```

### 4. Inconsistent Logic Between Frontend and Backend
The frontend component was using different logic than the backend API, which could lead to discrepancies.

## Changes Made

### Backend: `/src/app/api/flow/nodes/[nodeId]/route.ts`

1. **Added comprehensive error logging:**
   - Logs all database query errors (except "not found")
   - Logs successful PATCH operations with client_id
   - Logs what state is loaded from database

2. **Fixed enabled state checking logic:**
   - Explicitly checks for `true` or string `"true"`
   - Handles both boolean and string values defensively

3. **Added type safety to PATCH:**
   - Ensures only true booleans are stored in database
   - Logs both input and converted value for debugging

### Frontend: `/src/components/FlowArchitectureManager.tsx`

1. **Added initial loading state:**
   - Shows loading indicator while fetching node states
   - Prevents premature rendering with default values

2. **Matched backend logic:**
   - Uses same explicit true checking: `enabledValue === true || enabledValue === 'true'`

3. **Added debugging logs:**
   - Logs when all node states are loaded
   - Maintains existing error logging

## Testing Instructions

### 1. Manual Testing Steps

1. **Navigate to the flow architecture page:**
   ```
   http://localhost:3000/dashboard/flow-architecture
   ```

2. **Open browser console** (F12 → Console tab)

3. **Toggle a node OFF:**
   - Click on any configurable node (not marked as "Sempre Ativo")
   - In the dialog, toggle the switch to OFF (disabled)
   - You should see:
     - Success notification: "Node desativado com sucesso!"
     - In console: `✓ Node <node_id> enabled state updated to: false (input: false) for client: <client_id>`

4. **Verify the diagram updates:**
   - The node should immediately show as disabled (gray/dashed)
   - Bypass routes (if any) should activate (orange dotted lines)

5. **Refresh the page (F5 or Ctrl+R)**

6. **Check console for loading logs:**
   ```
   ✓ Loaded node <node_id> enabled state: false (raw: false) from database
   ✓ Loaded all node states from database
   ```

7. **Verify the node is still disabled:**
   - The node should remain gray/dashed
   - The state persisted correctly!

### 2. Database Verification

You can verify the data is actually in the database:

```sql
-- Connect to your Supabase database
SELECT 
  config_key,
  config_value,
  client_id,
  created_at,
  updated_at
FROM bot_configurations
WHERE config_key LIKE 'flow:node_enabled:%'
ORDER BY updated_at DESC;
```

You should see entries like:
```
config_key: flow:node_enabled:batch_messages
config_value: {"enabled": false}
```

### 3. RLS Policy Verification

If the fix doesn't work, check RLS policies:

```sql
-- Check if user can read from bot_configurations
SELECT * FROM bot_configurations 
WHERE config_key = 'flow:node_enabled:batch_messages'
LIMIT 1;

-- Check if user can write to bot_configurations
INSERT INTO bot_configurations (client_id, config_key, config_value, is_default, category)
VALUES (
  (SELECT client_id FROM user_profiles WHERE id = auth.uid()),
  'flow:node_enabled:test_node',
  '{"enabled": false}',
  false,
  'rules'
)
ON CONFLICT (client_id, config_key) 
DO UPDATE SET config_value = EXCLUDED.config_value;
```

## Expected Log Output

### When Toggling Node OFF:
```
[flow/nodes] ✓ Node batch_messages enabled state updated to: false (input: false) for client: abc-123-def-456
```

### When Loading Page:
```
✓ Loaded node filter_status enabled state: true from database
✓ Loaded node parse_message enabled state: true from database
✓ Loaded node batch_messages enabled state: false (raw: false) from database
...
[FlowArchitecture] ✓ Loaded all node states from database
```

### When No Database Entry Exists:
```
ℹ No database entry for node batch_messages, using default: enabled=true
```

## Troubleshooting

### Issue: Node still reverts to active after refresh

**Possible Causes:**

1. **Database write is failing:**
   - Check for error log: `Error updating enabled state`
   - Verify user has `client_id` in `user_profiles` table
   - Check RLS policies are not blocking writes

2. **Database read is failing:**
   - Check for error log: `Error fetching enabled state`
   - Verify the config_key format: `flow:node_enabled:<node_id>`
   - Check RLS policies are not blocking reads

3. **Wrong client_id:**
   - The logged client_id in PATCH should match the one in GET
   - If they differ, user might have multiple profiles or wrong profile mapping

4. **Caching issue:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear browser cache
   - Verify API route has `export const dynamic = 'force-dynamic'`

### Issue: Error logs show PGRST116

This is normal! PGRST116 means "row not found", which happens when a node hasn't been configured yet. The code handles this correctly by using the default value (`enabled: true`).

### Issue: RLS policy blocking operations

If you see RLS errors, check:

1. **User has a profile:**
   ```sql
   SELECT * FROM user_profiles WHERE id = auth.uid();
   ```

2. **Profile has a client_id:**
   ```sql
   SELECT client_id FROM user_profiles WHERE id = auth.uid();
   ```

3. **RLS policies are correct:**
   ```sql
   -- Check policies
   SELECT * FROM pg_policies WHERE tablename = 'bot_configurations';
   ```

## Files Changed

- `src/app/api/flow/nodes/[nodeId]/route.ts` - Added error logging, fixed logic, added type safety
- `src/components/FlowArchitectureManager.tsx` - Added loading state, matched backend logic

## Related Documentation

- Database schema: `supabase/migrations/20251107_create_bot_configurations.sql`
- Flow metadata: `src/flows/flowMetadata.ts`
- RLS policies documentation: See migration file comments

## Future Improvements

1. **Add unit tests** for the enabled state logic
2. **Add integration tests** for the full toggle → save → reload flow
3. **Add better error messages** shown to user when database operations fail
4. **Consider optimistic updates** to improve UX (update UI before API response)
5. **Add retry logic** for transient database errors
