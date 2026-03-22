# AI CONTEXT PACK - ChatBot-Oficial

**Gerado em:** 2026-02-16 (America/Sao_Paulo)
**Commit:** 65e6482dd1089c24bcc477681b8e3339a27e3afd
**Branch:** stripe

## Propósito Deste Documento

Este é o **GUIA DEFINITIVO** para uma IA entender completamente o projeto ChatBot-Oficial e sugerir melhorias com contexto 100% confiável.

**Todos os dados aqui são FACTUAIS, extraídos do código-fonte e backups reais.**

---

## 1. O QUE É ESTE SISTEMA? (Elevator Pitch)

**ChatBot-Oficial** é uma **plataforma SaaS multi-tenant** que permite empresas (clientes) criarem chatbots AI para WhatsApp Business.

**Modelo de negócio:**
- **Platform (UzzAI):** Vende plataforma SaaS para clientes (subscriptions via Stripe Platform)
- **Clients (SaaS customers):** Configuram chatbots, usam créditos AI, opcionalmente vendem produtos (Stripe Connect)
- **End-users (consumers):** Conversam com chatbots via WhatsApp, compram produtos em lojas

**Stack principal:** Next.js 16 + Supabase + Multi-Provider AI (Groq/OpenAI/Anthropic/Google) + Meta WhatsApp Business API + Stripe Connect

**Deploy:** Vercel (serverless) + Supabase Cloud + Upstash Redis

---

## 2. ARQUITETURA EM 3 BULLETS

1. **Event-driven Pipeline:** WhatsApp webhook → 14-node orchestrator (chatbotFlow) → AI response → WhatsApp send
2. **Multi-tenant Isolation:** RLS em PostgreSQL + Vault (client-specific API keys) + client_id em todas tabelas
3. **Serverless-first:** Vercel functions + Supabase Supavisor pooler (NUNCA `pg` direto) + Redis batching

---

## 3. ARQUIVOS MAIS CRÍTICOS (Top 10)

| Arquivo | Propósito | Por que é crítico |
|---------|-----------|-------------------|
| `src/flows/chatbotFlow.ts` | Orquestrador do pipeline principal | Coração do sistema - processa mensagens WhatsApp |
| `src/lib/direct-ai-client.ts` | Interface AI multi-provider | Todas chamadas AI passam por aqui |
| `src/lib/vault.ts` | Gerenciador de credentials | Multi-tenant isolation - cada cliente usa próprias keys |
| `src/app/api/webhook/received/route.ts` | Webhook WhatsApp | Entry point de todas mensagens |
| `src/lib/supabase.ts` | Supabase client factory | Toda interação com DB |
| `src/nodes/*.ts` | Node functions (25+ arquivos) | Lógica de negócio atômica |
| `src/app/dashboard/page.tsx` | Dashboard principal | UI principal do SaaS |
| `supabase/migrations/*.sql` | Migrations (20 arquivos) | Schema do banco |
| `next.config.js` | Configuração Next.js | Build web + mobile, security headers |
| `.env.mobile.example` | Env vars template | Todas configurações necessárias |

---

## 4. COMO O SISTEMA FUNCIONA? (Core Flow)

### Fluxo Simplificado (30 segundos):

```
WhatsApp User → Meta Cloud API → /api/webhook/received
  ↓
ChatbotFlow (14 nodes):
  1. Filter status updates
  2. Parse message
  3. Check/create customer (DB)
  4. Download media (se tiver)
  5. Normalize message
  6. Push to Redis (batching)
  7. Save user message (DB)
  8. Wait 30s + batch messages (Redis)
  9. Get chat history (DB, last 15 msgs)
  10. Get RAG context (pgvector search)
  11. Generate AI response (Groq/OpenAI via Vault keys)
      ↓ (se tool call: transferir_atendimento)
      → Update status='humano', send email, STOP
  12. Format response (remove tool tags, split \n\n)
  13. Send WhatsApp (Meta API, 2s delay entre msgs)
  14. Save bot message (DB, intercalado com send)
  ↓
Meta Cloud API → WhatsApp User
```

**Tempo total:** ~30-35s (dominado por batching de 30s)

---

## 5. DECISÕES ARQUITETURAIS CRÍTICAS (Não Mexer Sem Motivo)

### 5.1 NUNCA usar `pg` direto em serverless

**Problema:** Connection pooling do `pg` trava em Vercel (serverless)

**Solução:** Sempre Supabase client (usa Supavisor pooler)

**Evidência:** CLAUDE.md Critical Decision #1

### 5.2 Webhook MUST await

**Problema:** Serverless functions terminam após HTTP response, matando async work

**Solução:** `await processChatbotMessage()` antes de retornar

**Evidência:** CLAUDE.md Critical Decision #2

### 5.3 Redis Batching (30s)

**Problema:** Usuário envia 3 mensagens rápido → 3 respostas AI (custo triplo, confuso)

**Solução:** Batch messages por 30s, concatenar, 1 AI call

**Evidência:** chatbotFlow.ts:8 (batchMessages), CLAUDE.md

### 5.4 Direct AI Client (no gateway)

**Decisão:** Removeram abstração de gateway, agora SDKs diretos

**Razão:** Mais simples, melhor isolamento, erros transparentes

**Evidência:** direct-ai-client.ts:1-13

### 5.5 Vault Credentials (client-specific)

**Decisão:** Cada cliente tem próprias API keys no Supabase Vault

**Razão:** Isolamento completo multi-tenant, sem shared keys

**Evidência:** vault.ts, direct-ai-client.ts:18

---

## 6. TABELAS PRINCIPAIS (Database)

**⚠️ CRÍTICO:** Schema em português, shared com sistema de poker (legado)

| Tabela | Propósito | Tenant Field | Notas |
|--------|-----------|--------------|-------|
| `clients` | Clientes SaaS | N/A (root) | id, name, config JSON |
| `user_profiles` | Usuários | `client_id` | RLS policies usam ESTA tabela |
| `clientes_whatsapp` | Contatos WhatsApp | `client_id` | telefone é NUMERIC, não TEXT |
| `n8n_chat_histories` | Chat memory | `client_id` | message JSONB (type DENTRO do JSON) |
| `documents` | RAG knowledge | `client_id` | embedding vector(1536) |
| `conversations` | State tracking | `client_id` | |
| `messages` | Message history | `client_id` | |
| `gateway_usage_logs` | AI usage | `client_id` | promptTokens, completionTokens, cost_brl |
| `ai_models_registry` | Model catalog | N/A (shared) | Pricing por model |
| `client_budgets` | Budget limits | `client_id` | budget_limit_brl, period |

**Migrations:** `supabase/migrations/` (20 arquivos)

**ATENÇÃO:**
- `telefone` é NUMERIC → cast com `::TEXT` se comparar strings
- `n8n_chat_histories.type` NÃO É COLUNA, é campo dentro de `message JSONB`
- Table names sem espaços (era "Clientes WhatsApp", agora `clientes_whatsapp`)

**Evidência:** CLAUDE.md Critical Decisions #3, #4

---

## 7. MULTI-TENANCY (Como funciona?)

### Caminho do Tenant (Request → Response):

```
1. User login → Supabase Auth → JWT
2. Fetch user_profiles → Extract client_id
3. Armazenar client_id em context/state
4. Todas queries filtram por client_id (via RLS ou manual)
5. AI calls → Fetch Vault keys usando client_id
6. Logs salvos com client_id
```

**RLS Policies (esperado):**
```sql
-- Exemplo (não verificado, mas padrão)
CREATE POLICY "tenant_isolation"
ON table_name
FOR ALL
USING (client_id = (
  SELECT client_id FROM user_profiles WHERE id = auth.uid()
))
```

**Evidência:**
- dashboard/page.tsx:37-42 (fetch client_id)
- direct-ai-client.ts:18 (Vault keys por cliente)

---

## 8. AI PROVIDERS (Como escolher?)

**Suportados:**
- Groq (Llama 3.3 70B) - **DEFAULT para chatbot** (rápido, barato)
- OpenAI (GPT-4o-mini, Whisper, Vision, Embeddings) - Whisper para áudio, Embeddings para RAG
- Anthropic (Claude Opus/Sonnet) - Alternativo
- Google (Gemini) - Alternativo

**Configuração:** `clients.config.primaryModelProvider` ('openai' | 'groq')

**Budget Enforcement:**
```typescript
// Pre-flight check ANTES de cada AI call
const canProceed = await checkBudgetAvailable(clientId)
if (!canProceed) throw new Error('Budget exceeded')

// Após call
await logDirectAIUsage({ clientId, promptTokens, completionTokens, cost_brl })
```

**Evidência:** direct-ai-client.ts:19-20

---

## 9. STRIPE CONNECT (Dual Context)

**Contexto A - Platform Billing (UzzAI cobra clientes):**
- Stripe account: Platform (UzzAI)
- Produtos: Subscriptions, Setup fees
- Webhooks: V1 (`STRIPE_WEBHOOK_SECRET`)

**Contexto B - Client Stores (Clientes cobram consumidores):**
- Stripe accounts: Connected Accounts (1 por cliente)
- Produtos: Definidos pelo cliente em `/dashboard/payments/products`
- Store pública: `/store/[clientSlug]`
- Checkout: Stripe Checkout Session
- Platform fee: 10% (`STRIPE_APPLICATION_FEE_PERCENT=10`)
- Webhooks: V2 Thin Events (`STRIPE_CONNECT_WEBHOOK_SECRET`)

**Evidência:** .env.mobile.example:59-90

---

## 10. MOBILE (Capacitor)

**Build strategy:**
- Web: Standard Next.js (SSR/SSG)
- Mobile: Static export (`output: 'export'`)

**Implicações:**
- NO server-side features (API routes)
- ALL env vars must be `NEXT_PUBLIC_*`
- API calls → `NEXT_PUBLIC_API_URL` (produção)
- Images: `unoptimized: true`

**Features mobile-only:**
- Biometric auth (FaceID/TouchID/Fingerprint)
- Push notifications (Firebase)
- Deep links (`uzzapp://...`)

**Evidência:** next.config.js:2-5, package.json:27-35

---

## 11. TESTES & QUALIDADE

**Test framework:** Jest 30.2.0 + ts-jest

**Scripts:**
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint           # ESLint check
```

**TypeScript:**
- `strict: false` ⚠️ (type safety reduzida)
- Path alias: `@/*` → `./src/*`

**Evidência:** package.json:14-16, tsconfig.json:10

---

## 12. SEGURANÇA

**Headers configurados (next.config.js):**
- CORS: `*` para `/api/*`, restrito `graph.facebook.com` para `/api/webhook/*`
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(self)

**Auth:**
- Supabase Auth (email/senha + OAuth)
- JWT sessions
- RLS em todas tabelas tenant-specific

**Secrets:**
- Supabase Vault (client API keys)
- Environment vars (platform keys)

**Evidência:** next.config.js:57-125

---

## 13. PRINCIPAIS INTEGRAÇÕES

| Serviço | Propósito | Auth Method | Endpoint/SDK |
|---------|-----------|-------------|--------------|
| **Meta WhatsApp Business API** | Enviar/receber mensagens | Bearer token (`META_ACCESS_TOKEN`) | graph.facebook.com/v18.0 |
| **Groq** | AI chatbot (Llama 3.3 70B) | API Key (Vault) | Groq SDK |
| **OpenAI** | Whisper, Vision, Embeddings | API Key (Vault) | OpenAI SDK |
| **Supabase** | DB, Auth, Storage, Vault, Realtime | Service Role Key | Supabase JS SDK |
| **Stripe** | Platform + Connect billing | Secret Key | Stripe SDK |
| **Upstash Redis** | Message batching | URL + token | Redis protocol |
| **Gmail** | Human handoff emails | App Password | Nodemailer |
| **Google Calendar** | Calendar integration | OAuth 2.0 | Google APIs |
| **Microsoft Calendar** | Calendar integration | OAuth 2.0 | Microsoft Graph |

**Evidência:** package.json dependencies, .env.mobile.example

---

## 14. MÉTRICAS DE CÓDIGO

**Repositório:**
- Diretórios em src/: 301
- Arquivos em src/: 564
- TypeScript files: 562
- Pages (rotas): 54
- API routes: 100+
- Components: 90+
- Node functions: 25+
- Lib files: 53

**Evidência:** Bash counts, Glob results

---

## 15. ONDE ESTÁ CADA COISA? (Quick Reference)

| Você quer... | Vá para... |
|--------------|-----------|
| Entender pipeline principal | `src/flows/chatbotFlow.ts` |
| Modificar lógica de negócio | `src/nodes/*.ts` (nodes são pure functions) |
| Adicionar provider AI | `src/lib/direct-ai-client.ts` |
| Configurar multi-tenant | `src/lib/vault.ts` + RLS policies |
| Modificar UI do dashboard | `src/app/dashboard/**/page.tsx` |
| Criar novo endpoint | `src/app/api/**/route.ts` |
| Alterar schema do banco | `supabase migration new <name>` |
| Configurar Stripe | `src/lib/stripe.ts`, `src/lib/stripe-connect.ts` |
| Debug webhook WhatsApp | `/api/test/simulate-webhook`, `/api/debug/webhook-config/[clientId]` |
| Ver logs de execução | `/api/debug/executions`, `/dashboard/backend` |
| Gerenciar budgets | `/dashboard/admin/budget-plans` |
| Upload conhecimento (RAG) | `/dashboard/knowledge` |
| Criar flows visuais | `/dashboard/flows` |
| Templates WhatsApp | `/dashboard/templates` |

---

## 16. RISCOS CONHECIDOS

| Risco | Impacto | Mitigação Atual | Ação Recomendada |
|-------|---------|-----------------|-------------------|
| **TypeScript strict: false** | Type errors em runtime | Manual testing | Habilitar strict mode gradualmente |
| **Test routes em produção** | Exposição de debug endpoints | Nenhuma | Auth guard ou remover em build |
| **Admin routes sem RBAC** | Acesso não autorizado | Esperado ter check | Verificar role check em middleware |
| **`pg` usage** | Hang em serverless | Documented | Audit codebase, replace com Supabase |
| **Shared DB com poker** | Schema conflicts | Table naming careful | Considerar DB separation |

**Evidência:** tsconfig.json:10, test pages, CLAUDE.md warnings

---

## 17. PRÓXIMOS PASSOS PARA IA ANALISADORA

**Para entender sistema:**
1. Ler `91_MAIN_FLOWS.md` (fluxogramas visuais)
2. Ler `04_ARCHITECTURE_FROM_CODE.md` (arquitetura detalhada)
3. Ler `05_ROUTES_FROM_CODE.md` (todas rotas catalogadas)
4. Ler `CLAUDE.md` (guia operacional)

**Para sugerir melhorias:**
1. Identificar bottlenecks em `chatbotFlow.ts` (ex: 30s batching pode ser otimizado?)
2. Verificar RLS policies em migrations (estão completas?)
3. Analisar test coverage (existem testes suficientes?)
4. Revisar error handling (todos edge cases cobertos?)
5. Avaliar performance (N+1 queries? Indices faltando?)

**Para implementar feature:**
1. Verificar se afeta multi-tenancy (adicionar client_id?)
2. Verificar se precisa migration (alterar schema?)
3. Verificar se precisa Vault credential (nova integração?)
4. Verificar se precisa node function (parte do pipeline?)
5. Seguir code patterns (functional, pure functions, TypeScript)

---

## 18. PERGUNTAS FREQUENTES (IA)

**Q: Posso adicionar um provider AI novo (ex: Cohere)?**
A: Sim. Adicionar em `direct-ai-client.ts`, instalar SDK, adicionar case no switch provider. Vault credential: `client_{uuid}_cohere_api_key`.

**Q: Como adicionar um novo field em clientes_whatsapp?**
A: `supabase migration new add_field`, escrever `ALTER TABLE`, `supabase db push`. Atualizar type em `src/lib/types.ts`.

**Q: O sistema suporta múltiplos idiomas?**
A: UI em português. AI pode responder em qualquer idioma (depende do prompt). Para internacionalizar UI, adicionar i18n.

**Q: Como escalar para 1M de mensagens/dia?**
A: Bottlenecks esperados:
- Supabase (RLS overhead) → Considerar connection pooler maior
- Redis batching (30s delay) → Ajustar timeout dinamicamente
- AI calls (rate limits) → Implementar queue (BullMQ/SQS)
- Vercel functions (cold starts) → Considerar Dedicated/Edge

**Q: Posso rodar self-hosted?**
A: Sim, mas precisa:
- PostgreSQL com pgvector
- Redis instance
- Supabase Auth (ou substituir por outro)
- Vault alternativo (HashiCorp Vault, AWS Secrets Manager)
- Deployment (não-serverless): Node.js server, PM2, nginx

**Q: Como debugar mensagem WhatsApp não recebida?**
A:
1. Verificar Meta Dashboard > Webhooks (log de deliveries)
2. Verificar `/api/test/simulate-webhook` (simular localmente)
3. Verificar `/api/debug/webhook-config/[clientId]` (config correta?)
4. Verificar logs Vercel (function logs)
5. Verificar `execution_logs` table (pipeline executou?)

---

## 19. COMANDOS ESSENCIAIS

```bash
# Dev
npm install
npm run dev                  # localhost:3000

# Build
npm run build                # Web production
npm run build:mobile         # Mobile static export
npm run cap:sync             # Sync Capacitor

# Test
npm run test
npm run lint

# Database
supabase migration new <name>
supabase db push
supabase db diff

# Backup
cd db && .\backup-complete.bat
```

---

## 20. CONTATO & SUPORTE

**Documentação oficial:** `CLAUDE.md` (no repositório)

**Migrations workflow:** `db/MIGRATION_WORKFLOW.md`

**Restore guide:** `db/RESTORE_GUIDE.md`

**GitHub:** (não especificado neste checkpoint)

**Supabase Project:** https://app.supabase.com (requer credenciais)

**Vercel:** https://vercel.com (deployment)

---

## CHECKLIST FINAL ANTES DE MODIFICAR CÓDIGO

- [ ] Li `CLAUDE.md` (guia operacional)?
- [ ] Li `91_MAIN_FLOWS.md` (fluxos do sistema)?
- [ ] Entendi multi-tenancy (client_id em tudo)?
- [ ] Sei onde ficam os nodes (`src/nodes/*.ts`)?
- [ ] Sei que NO serverless usar Supabase client, não `pg`?
- [ ] Sei que webhook precisa `await`?
- [ ] Criei migration se alterei schema?
- [ ] Testei localmente com `/api/test/*` endpoints?
- [ ] Considerei impacto em mobile (static export)?
- [ ] Adicionei logs para debugging futuro?

---

**FIM DO AI CONTEXT PACK**

Este checkpoint contém **TODA** informação necessária para uma IA trabalhar neste projeto com contexto completo. Todos dados são factuais, extraídos de código real e backups.

**Data de validade:** 2026-02-16 (commit 65e6482). Para mudanças posteriores, gerar novo checkpoint.
