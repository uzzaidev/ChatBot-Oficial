# TECH DEBT E RISCOS — ChatBot-Oficial

**Checkpoint:** 2026-04-16

---

## CRÍTICOS (P1)

### `pg` library em serverless (50+ arquivos)
- **Risco: ALTO** — `pg.Pool` mantém conexões TCP persistentes em Vercel serverless → connection exhaustion
- Nodes afetados: `saveChatMessage`, `getChatHistory`, `checkContinuity`, `checkDuplicateMessage`, `detectRepetition`, `handleHumanHandoff`, `usageTracking`, `crm-automation-engine` + 35 API routes
- Funciona em produção por mitigação do Supavisor, mas não é o padrão correto
- **Fix:** substituir `query()` de `src/lib/postgres.ts` por `createServerClient()` em todos os paths serverless

### RLS aberta em `clientes_whatsapp` e `documents`
- Política `true ALL` = qualquer usuário autenticado lê dados de todos os tenants
- **Fix:** substituir por `client_id = get_user_client_id()`

### CORS wildcard `*` em todas as rotas `/api/*`
- `Access-Control-Allow-Origin: *` em `next.config.js:67`
- **Fix:** restringir para `https://uzzapp.uzzai.com.br`

---

## ALTOS (P2)

### ElevenLabs usa chave compartilhada
- `process.env.ELEVENLABS_API_KEY` — não é por cliente
- Diferente de OpenAI/Groq que usam Vault
- **Fix:** adicionar `elevenlabs_api_key_secret_id` em `clients`

### Mensagens de atendente humano salvas como type 'ai'
- `type: "ai"` em `send-message/route.ts:86` e `send-media/route.ts:143`
- Contamina histórico e analytics

### Invite de equipe não envia email
- Token gerado mas envio de email não implementado (TODO no código)

### `tabelas.md` desatualizado
- Não documenta: agents, CRM, flows, tts_cache, webhook_dedup, gateway_usage_logs, client_budgets
- CLAUDE.md manda checar tabelas.md antes de queries — mas o arquivo está incompleto

---

## MÉDIOS (P3)

### Storage duplicado de mensagens
- `n8n_chat_histories` (bot pipeline) e `messages` (conversations FK) são tabelas separadas
- Sincronização entre elas não é clara no código

### TypeScript `strict: false`
- Permite null unchecked, implicit any, casts perigosos
- Vários `as any` em `direct-ai-client.ts` e `generateAIResponse.ts`

### `getOpenAIClient()` deprecated mas presente
- Se chamada sem `clientId` → usa `process.env.OPENAI_API_KEY` (chave compartilhada)

---

## VULNERABILIDADES JÁ RESOLVIDAS

| ID | Fix | Onde |
|----|-----|------|
| VULN-002 | Rate limiting webhook verification | webhook/[clientId]/route.ts:58 |
| VULN-006 | Redis + PostgreSQL dedup | webhook/[clientId]/route.ts:461 |
| VULN-008 | Audit log para mudanças de credencial | vault/secrets/route.ts |
| VULN-009 | Mascaramento de secrets nas respostas API | vault/secrets/route.ts:159 |
| VULN-011 | Security headers (CORS, X-Frame, etc.) | next.config.js:56 |
| VULN-012 | HMAC validation no webhook | webhook/[clientId]/route.ts:218 |
| VULN-013 | Zod input validation em API routes | vault/secrets/route.ts:219 |
