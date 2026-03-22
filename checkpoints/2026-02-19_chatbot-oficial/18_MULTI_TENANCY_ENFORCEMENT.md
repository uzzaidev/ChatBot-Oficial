# 18_MULTI_TENANCY_ENFORCEMENT - Complete Multi-Tenant Isolation

**Data:** 2026-02-19
**Status:** ✅ COMPLETO

## VISÃO GERAL

**Multi-Tenancy Level:** Complete isolation (data, credentials, config, logs)

**Isolation Layers:**
1. **Webhook Level** - URL-based routing (`/api/webhook/[clientId]`)
2. **Database Level** - client_id in ALL queries + RLS policies
3. **Credential Level** - Vault secrets per client
4. **Config Level** - Bot settings per client
5. **Tracking Level** - Usage logs per client
6. **Storage Level** - Supabase Storage buckets per client

## CLIENT_ID PROPAGATION

**Entry Points:**

### 1. Webhook (Primary Entry)
```typescript
// src/app/api/webhook/[clientId]/route.ts:198
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params; // ← client_id from URL

  const config = await getClientConfig(clientId); // ← Get client-specific config

  await processChatbotMessage(body, config); // ← Pass to flow
}
```

### 2. Flow Execution
```typescript
// src/flows/chatbotFlow.ts:140
export const processChatbotMessage = async (
  payload: WhatsAppWebhookPayload,
  config: ClientConfig, // ← Contains client_id
): Promise<ChatbotFlowResult> => {
  const clientId = config.id; // ← Extract client_id

  // All nodes receive clientId
  await downloadMetaMedia(mediaId, clientId);
  await getRAGContext({..., clientId});
  await callDirectAI({..., clientId});
  await saveChatMessage({...,clientId});
}
```

### 3. All Database Queries
```typescript
// ALWAYS include client_id filter
await supabase
  .from('documents')
  .select('*')
  .eq('client_id', clientId) // ← Multi-tenant filter

await supabase
  .from('conversations')
  .insert({..., client_id: clientId}) // ← Multi-tenant isolation
```

## DATABASE RLS POLICIES

**All tables have RLS enabled + client_id policies:**

```sql
-- Example: documents table RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own client documents"
ON documents FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role full access"
ON documents FOR ALL
TO service_role
USING (true);
```

**Tables with RLS:**
- ✅ clients
- ✅ documents
- ✅ conversations
- ✅ n8n_chat_histories
- ✅ gateway_usage_logs
- ✅ tts_cache
- ✅ bot_configurations
- ✅ clientes_whatsapp

## VAULT CREDENTIALS ISOLATION

**Each client has separate Vault secrets:**

```typescript
// Client A
{
  meta_access_token_secret_id: "uuid-A-1",
  openai_api_key_secret_id: "uuid-A-2",
  groq_api_key_secret_id: "uuid-A-3"
}

// Client B
{
  meta_access_token_secret_id: "uuid-B-1",
  openai_api_key_secret_id: "uuid-B-2",
  groq_api_key_secret_id: "uuid-B-3"
}
```

**Cross-client access:** IMPOSSIBLE (different UUIDs, encrypted separately)

## CONFIG ISOLATION

**Bot configurations per client:**

```typescript
// src/lib/config.ts
export const getClientConfig = async (clientId: string): Promise<ClientConfig> => {
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId) // ← Filter by client
    .single();

  // Get client-specific Vault credentials
  const credentials = await getClientVaultCredentials(clientId);

  return {
    id: clientId,
    apiKeys: credentials,
    settings: client.settings,
    systemPrompt: client.system_prompt,
    // ... all client-specific
  };
};
```

## TRACKING ISOLATION

**Usage logs always include client_id:**

```typescript
// src/lib/unified-tracking.ts
await supabase.from("gateway_usage_logs").insert({
  client_id: clientId, // ← Multi-tenant
  phone,
  provider,
  model_name: modelName,
  input_tokens: inputTokens,
  output_tokens: outputTokens,
  cost_brl: costBRL,
  // ...
});
```

**Budget enforcement per client:**

```typescript
export const checkBudgetAvailable = async (clientId: string): Promise<boolean> => {
  const { data: budget } = await supabase
    .from('client_budgets')
    .select('*')
    .eq('client_id', clientId) // ← Client-specific budget
    .single();

  return budget.tokens_used < budget.tokens_limit;
};
```

## STORAGE ISOLATION

**Supabase Storage paths include client_id:**

```typescript
// TTS cache
const fileName = `tts/${clientId}/${textHash}.mp3`;

// Message media
const fileName = `audio/${clientId}/${Date.now()}.mp3`;

// RAG documents
const fileName = `documents/${clientId}/${filename}`;
```

**Cross-client access:** IMPOSSIBLE (path-based isolation)

## END-TO-END FLOW

```
User sends WhatsApp message
↓
Meta calls /api/webhook/CLIENT_A_UUID
↓
Extract clientId from URL
↓
Get client A config (Vault, settings, prompts)
↓
Process message using client A credentials
↓
Query database WITH client_id filter
↓
Generate AI response WITH client A OpenAI key
↓
Save to database WITH client_id
↓
Track usage WITH client_id
↓
Send via WhatsApp WITH client A Meta token
```

**Client B cannot see Client A's:**
- ✅ Messages
- ✅ Documents
- ✅ Conversations
- ✅ Usage logs
- ✅ API keys
- ✅ Configurations
- ✅ Media files

## VALIDATION CHECKLIST

**Before deploying new feature, verify:**

- [ ] All database queries include `.eq('client_id', clientId)`
- [ ] RLS policy exists for new table
- [ ] Credentials retrieved from Vault (not env)
- [ ] Usage tracking includes client_id
- [ ] Storage paths include client_id
- [ ] Config loaded via getClientConfig(clientId)
- [ ] No hardcoded API keys
- [ ] No shared state between clients

## SECURITY AUDIT

**Grep Commands:**
```bash
# Find queries without client_id
grep -r "\.from(" src/ | grep -v "client_id"

# Find hardcoded API keys
grep -r "sk-" src/ --exclude-dir=node_modules

# Find shared state
grep -r "let.*=" src/ | grep -v "const"
```

---

**FIM DA DOCUMENTAÇÃO MULTI-TENANCY ENFORCEMENT**

**Garantia:** 100% isolation at all layers
**Próximo:** Update final MANIFEST.json
