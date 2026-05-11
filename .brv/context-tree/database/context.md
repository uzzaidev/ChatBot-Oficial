# DATABASE — ChatBot-Oficial

**Checkpoint:** 2026-04-16  
**Source of truth:** `docs/tables/tabelas.md` + `supabase/migrations/` + `src/lib/types.ts`  
**AVISO:** `tabelas.md` está parcialmente desatualizado. Tabelas de agents, CRM, flows etc. estão só nas migrations/types.ts

---

## Regras Críticas de DB

1. **`telefone` em `clientes_whatsapp` é NUMERIC** — requer cast `::TEXT` em comparações string
2. **`n8n_chat_histories.message` é JSONB** — o campo `type` fica DENTRO do JSON: `{"type": "human", "content": "..."}` — não existe coluna `type`
3. **SEMPRE usar migrations** — nunca DDL direto no Dashboard: `supabase migration new <name>` → edita SQL → `supabase db push`
4. **Filtrar por `client_id` em toda query** — multi-tenancy por filtro, não só por RLS

---

## Tabelas Principais

### `clients` — raiz multi-tenant
- PK: `id uuid`
- Campos-chave: `name`, `slug`, `status`, `plan`, `primary_model_provider`
- Vault refs: `meta_access_token_secret_id`, `openai_api_key_secret_id`, `groq_api_key_secret_id`, `google_calendar_token_secret_id`...
- Config flexível: `settings jsonb` (batching_delay, max_tokens, temperature, etc.)
- Toggle calendar: `clients.settings.calendar_bot_enabled`

### `clientes_whatsapp` — contatos WhatsApp
- PK: `(telefone NUMERIC, client_id UUID)`
- `status`: `'bot' | 'humano' | 'transferido' | 'fluxo_inicial'`
- `metadata jsonb` — campos cadastrais coletados pelo bot (CPF, email, como_conheceu...)
- **RLS ABERTA** — qualquer usuário autenticado pode ler todos os tenants (tech debt crítico)

### `n8n_chat_histories` — memória do chat
- `session_id VARCHAR(255)` — número de telefone (TEXT)
- `message JSONB` — `{"type": "human"|"ai"|"system", "content": "..."}`
- `wamid TEXT` — WhatsApp message ID
- `status TEXT` — `'pending' | 'sent' | 'delivered' | 'read' | 'failed'`

### `conversations` — tracking de conversas
- `status TEXT` — `'bot' | 'humano' | 'transferido'`
- Separado de `n8n_chat_histories` (arquitetura duplicada — tech debt)

### `messages` — storage de mensagens (separado de n8n_chat_histories)
- `direction TEXT` — `'incoming' | 'outgoing'`
- FK para `conversations`

### `documents` — base RAG (pgvector)
- `embedding vector(1536)` — OpenAI text-embedding-3-small
- `client_id UUID` — isolamento multi-tenant no RPC `match_documents`
- **RLS ABERTA** — tech debt crítico

### `user_profiles` — usuários do dashboard
- `role TEXT` — `'admin' | 'client_admin' | 'user'`
- **USAR ESTA TABELA para RLS e auth middleware**, não `auth.users`

### `bot_configurations` — flags por cliente
- `config_key TEXT` — formato `'namespace:key'` (ex: `'rag:similarity_threshold'`)
- `config_value JSONB`
- `is_default BOOLEAN` — configs do cliente override os defaults do sistema

### `agents` — agentes AI por cliente
- Override total de model, prompt, temperature, batching, tools, RAG settings
- `compiled_system_prompt TEXT` — gerado automaticamente

### `agent_schedules` + `agent_experiments` — scheduling e A/B
- Schedules: `rules jsonb` com days/start/end por timezone
- Experiments: `traffic_split INTEGER` — % para agente A

---

## RPC Functions Importantes

```sql
match_documents(query_embedding, match_threshold, match_count, filter_client_id)  -- pgvector
merge_contact_metadata(p_phone, p_client_id, p_metadata)  -- merge JSONB de cadastro
get_client_secret(secret_id)                               -- Vault decrypt
create_client_secret / update_client_secret / upsert_client_secret  -- Vault CRUD
get_user_client_id()                                       -- auth helper p/ RLS
```

---

## Tabelas Adicionais (sem documentação em tabelas.md)

| Tabela | Finalidade |
|--------|-----------|
| `crm_columns / crm_cards / crm_tags / crm_notes` | Kanban CRM |
| `crm_automation_rules / crm_automation_queue` | Engine de automação CRM |
| `flows / flow_sessions` | Interactive flow builder |
| `tts_cache` | Cache de áudios TTS por hash MD5 |
| `webhook_dedup` | Dedup de webhooks WhatsApp |
| `gateway_usage_logs` | Tracking de uso AI por request |
| `client_budgets` | Limites de budget por cliente |
| `ai_models_registry` | Catálogo de modelos e preços |
| `push_tokens / notification_logs` | FCM push notifications |
| `audit_logs` | Trilha de auditoria do sistema |
