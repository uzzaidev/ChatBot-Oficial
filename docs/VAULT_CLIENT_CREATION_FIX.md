# Vault Secret Creation Fix

## Problem Description

When creating a new client through the registration endpoint (`POST /api/auth/register`), the system was returning:

```
Error: "Erro ao criar secrets no Vault"
```

## Root Cause

The registration endpoint was using `createServerClient()` which:
- Requires an authenticated user session via cookies
- Is designed for authenticated API operations
- Cannot access Vault RPC functions without a valid session

During registration, there is **no authenticated user session** yet (the user is being created), so all Vault RPC calls were failing.

## Solution

Changed the registration endpoint to use `createServiceRoleClient()` which:
- Uses the `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Bypasses Row Level Security (RLS) policies
- Does not require session cookies or authentication
- Is designed for administrative operations

### Code Change

**File:** `src/app/api/auth/register/route.ts`

```diff
- import { createServerClient } from '@/lib/supabase'
+ import { createServiceRoleClient } from '@/lib/supabase'

- // Usar Service Role Key para operações administrativas (criar usuários)
- const supabase = createServerClient()
+ // Usar Service Role Key para operações administrativas (criar usuários e vault secrets)
+ const supabase = createServiceRoleClient()
```

## When to Use Each Client Type

### `createServerClient()` / `createRouteHandlerClient()`
Use when:
- User is already authenticated
- Reading/updating user-specific data
- Enforcing RLS policies
- Normal API operations

**Example:** Reading secrets for authenticated user
```typescript
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()
// user exists and has valid session
```

### `createServiceRoleClient()`
Use when:
- Creating new users (no session exists yet)
- Creating vault secrets during registration
- Administrative operations that bypass RLS
- Operations that require elevated permissions

**Example:** Creating new client with vault secrets
```typescript
const supabase = createServiceRoleClient()
// Can create vault secrets without authenticated session
await supabase.rpc('create_client_secret', {...})
```

## Vault RPC Functions

The following RPC functions require service role access during registration:

1. **`create_client_secret(secret_value, secret_name, secret_description)`**
   - Creates encrypted secret in Vault
   - Returns UUID of created secret
   - Used during client registration

2. **`get_client_secret(secret_id)`**
   - Reads decrypted secret from Vault
   - Can be used with regular authenticated client

3. **`update_client_secret(secret_id, new_secret_value)`**
   - Updates existing secret
   - Can be used with regular authenticated client

## Registration Flow

1. **User submits registration form** → `POST /api/auth/register`
2. **Generate unique slug** from company name
3. **Create vault secrets** (using service role client):
   - `meta_access_token_secret_id`
   - `meta_verify_token_secret_id`
   - `openai_api_key_secret_id`
   - `groq_api_key_secret_id`
4. **Insert client record** with secret IDs
5. **Create Supabase Auth user** with `client_id` in metadata
6. **Create user_profile** record
7. **Auto-login** the new user

## Security Considerations

✅ **Safe:** Using service role for registration because:
- Only happens during legitimate new account creation
- All resources are properly isolated by `client_id`
- Service role key is stored securely in environment variables
- RPC functions have `SECURITY DEFINER` set appropriately

❌ **Don't:** Use service role client for:
- Regular authenticated operations
- User-facing API endpoints
- Operations where RLS should be enforced

## Testing

### Manual Test (requires valid .env.local)

1. **Ensure environment variables are set:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Required!
```

2. **Start dev server:**
```bash
npm run dev
```

3. **Test registration endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "companyName": "Test Company",
    "password": "secure123"
  }'
```

4. **Expected success response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "client_id": "uuid",
  "email": "test@example.com",
  "slug": "test-company",
  "message": "Conta criada com sucesso! Configure suas credenciais em Configurações."
}
```

5. **Verify in Supabase:**
   - Check `vault.secrets` table for 4 new secrets
   - Check `clients` table for new client record
   - Check `auth.users` for new user
   - Check `user_profiles` for new profile

## Related Files

- `src/app/api/auth/register/route.ts` - Fixed endpoint
- `src/lib/supabase.ts` - Client creation functions
- `src/lib/vault.ts` - Vault helper functions
- `migrations/005_fase1_vault_multi_tenant.sql` - RPC function definitions

## Future Improvements

Consider refactoring to:
1. Extract client creation logic into a reusable function
2. Add transaction support for atomic client+user creation
3. Add cleanup on partial failure (currently has manual rollback)
4. Create integration tests for registration flow
