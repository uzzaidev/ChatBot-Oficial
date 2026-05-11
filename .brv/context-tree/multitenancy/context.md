# MULTI-TENANCY — ChatBot-Oficial

**Checkpoint:** 2026-04-16  
**Source of truth:** `src/lib/config.ts`, `src/lib/vault.ts`, `src/app/api/webhook/[clientId]/route.ts`

---

## Identificação de Tenant

- Cada cliente tem UUID único (`client_id`)
- Webhook URL por cliente: `https://uzzapp.uzzai.com.br/api/webhook/{client_uuid}`
- Meta Dashboard configurado por cliente para apontar para a URL correta

## Fluxo de Carregamento de Config

```typescript
const config = await getClientConfig(clientId)
// config.id = UUID do cliente (propagado para todos os nós do pipeline)
```

**Prioridade de settings:**
```
agent settings > client settings > system defaults
```

## Isolamento de Credenciais (Vault)

Cada cliente tem secrets próprios no Supabase Vault:
```
clients.meta_access_token_secret_id  ──→ vault.secrets (Meta API token)
clients.openai_api_key_secret_id     ──→ vault.secrets (OpenAI key)
clients.groq_api_key_secret_id       ──→ vault.secrets (Groq key)
clients.google_calendar_token_*      ──→ vault.secrets (OAuth tokens)
```

Acesso via `getClientVaultCredentials(clientId)` em `src/lib/vault.ts`.  
**NUNCA usar `process.env.OPENAI_API_KEY` para chamadas AI de clientes.**

## Isolamento de Dados

Toda query do pipeline inclui filtro `client_id`:
```typescript
await supabase.from("clientes_whatsapp")
  .upsert({ telefone: phone, client_id: config.id, ... })

await supabase.rpc("match_documents", {
  filter_client_id: config.id  // RAG isolado por tenant
})
```

Dashboard users isolados via `user_profiles.client_id`:
```typescript
const { data: profile } = await supabase
  .from("user_profiles").select("client_id, role").eq("id", user.id).single()
// Toda query da API usa profile.client_id
```

## RBAC por Tenant

| Role | Acesso |
|------|--------|
| `admin` | Super admin (todos os tenants — plataforma) |
| `client_admin` | Todos os recursos do próprio tenant |
| `user` | Recursos limitados do próprio tenant |

Enforced por: RLS Supabase + `src/lib/middleware/api-auth.ts` + `user_has_role()` RPC

## Pipeline Node Enable/Disable por Tenant

Cada nó pode ser ligado/desligado via `bot_configurations`:
```typescript
const nodeStates = await getAllNodeStates(config.id)
shouldExecuteNode('get_rag_context', nodeStates)  // default: true
```

Node IDs configuráveis: `process_media`, `push_to_redis`, `batch_messages`, `fast_track_router`, `get_chat_history`, `get_rag_context`, `check_continuity`, `classify_intent`, `detect_repetition`

## Calendário por Tenant

Cada cliente conecta seu próprio Google Calendar ou Microsoft Calendar via OAuth.  
Toggle mestre: `clients.settings.calendar_bot_enabled`

## Stripe Connect

- `clients.stripe_customer_id` → assinatura na plataforma
- Stripe Connect: conta separada por cliente para loja white-label
- Webhooks: `/api/stripe/webhooks/connect`
