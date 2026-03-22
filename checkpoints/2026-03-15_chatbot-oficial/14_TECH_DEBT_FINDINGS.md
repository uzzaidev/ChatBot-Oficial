# Tech Debt Findings

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Análise:** Baseada em código-fonte + migrations + documentação

---

## 📊 Overview

Este documento identifica **dívidas técnicas** encontradas no projeto - código/arquitetura que funciona MAS precisa de refatoração, melhorias ou atenção futura.

**Critérios:**
- ✅ **Funciona** (não quebra em produção)
- ⚠️ **Subótimo** (pode causar problemas no futuro)
- 🔧 **Manutenibilidade** (dificulta evolução)
- 📈 **Escalabilidade** (não cresce bem)

---

## 🔴 HIGH PRIORITY (Impacto Alto)

### 1. ⚠️ `pg` Library Ainda Instalada

**Location:** `package.json`, `src/lib/postgres.ts`

**Issue:** Biblioteca `pg` v8.16.3 instalada apesar de não funcionar em serverless (Vercel).

**Evidence:**
```json
// package.json
"pg": "^8.16.3"
```

**Why Tech Debt:**
- CLAUDE.md documenta que NÃO deve ser usado em serverless
- 12_ERRORS_EDGE_CASES.md lista como erro conhecido (NODE 3 freezing)
- Mas biblioteca ainda está nas dependências

**Risk:**
- Desenvolvedor novo pode usar `pg` sem saber que quebra
- Aumenta bundle size desnecessariamente
- Confusão: "se está no package.json, posso usar?"

**Recommendation:**
```bash
# REMOVER completamente
npm uninstall pg

# Auditar código para garantir que não há uso
grep -r "require('pg')" src/
grep -r "from 'pg'" src/
```

**Affected Files:**
- `src/lib/postgres.ts` - Provavelmente não usado em API routes (precisa verificar)
- Qualquer outro arquivo que importe de `pg`

**Effort:** 2 horas (auditoria + remoção + testes)

---

### 2. ⚠️ Capacitor Version Mismatch

**Location:** `package.json`

**Issue:** CLI v8.0.1 mas core/platforms v7.4.4

**Evidence:**
```json
"@capacitor/cli": "^8.0.1",      // v8
"@capacitor/core": "^7.4.4",     // v7
"@capacitor/android": "^7.4.4",  // v7
"@capacitor/ios": "^7.4.4"       // v7
```

**Why Tech Debt:**
- Pode causar build failures (API mismatch)
- Documentado em 03_DEPENDENCIES.md e 12_ERRORS_EDGE_CASES.md
- Funciona AGORA, mas pode quebrar ao adicionar plugins

**Risk:**
- Novo plugin pode exigir v8
- Build pode falhar em CI/CD inesperadamente
- Upgrade forçado no futuro (mais difícil)

**Recommendation:**
```bash
# Opção 1: Downgrade CLI para v7
npm install @capacitor/cli@^7.4.4

# Opção 2: Upgrade tudo para v8 (preferido)
npm install @capacitor/core@^8.0.0 @capacitor/android@^8.0.0 @capacitor/ios@^8.0.0
```

**Effort:** 1 hora (upgrade + sync + teste mobile)

---

### 3. ⚠️ ESLint 9 Bleeding Edge

**Location:** `package.json`

**Issue:** ESLint 9.23.0 é MUITO recente (Janeiro 2026), ecossistema de plugins ainda não estabilizado.

**Evidence:**
```json
"eslint": "^9.23.0"
```

**Why Tech Debt:**
- Plugins podem não ser compatíveis
- Build pode quebrar com novos plugins
- Documentado em 12_ERRORS_EDGE_CASES.md

**Risk:**
- CI/CD pode falhar com novos pacotes
- Equipe pode perder tempo debugando incompatibilidades
- Dificulta onboarding (configuração complexa)

**Recommendation:**
```bash
# Downgrade para versão estável (ESLint 8)
npm install --save-dev eslint@^8.57.0

# Ou aguardar 3-6 meses para ecossistema estabilizar
```

**Effort:** 30 minutos (downgrade) ou 0 (aguardar)

---

### 4. ⚠️ Hardcoded Delays (Magic Numbers)

**Location:** `src/flows/chatbotFlow.ts`, `src/nodes/*`

**Issue:** Delays hardcoded em vez de configuráveis

**Evidence:**
```typescript
// chatbotFlow.ts:1650
await new Promise(resolve => setTimeout(resolve, 2000)) // 2s hardcoded

// batchMessages.ts
const BATCH_WINDOW_MS = 10 * 1000 // 10s hardcoded
```

**Why Tech Debt:**
- Não pode ajustar delay sem deploy
- Cliente pode querer respostas mais rápidas/lentas
- Dificulta A/B testing

**Current State:**
- `messageDelayMs` vem de config (✅ BOM)
- Mas batch window e outros delays são hardcoded (❌ RUIM)

**Recommendation:**
```typescript
// Adicionar a bot_configurations
{
  "messageDelayMs": 2000,        // Já existe
  "batchWindowMs": 10000,        // NOVO
  "mediaProcessingTimeoutMs": 30000  // NOVO
}
```

**Effort:** 2 horas (migração + testes)

---

### 5. ⚠️ No Budget Exhaustion Handling in Flow

**Location:** `src/flows/chatbotFlow.ts`

**Issue:** Quando cliente atinge budget limit, AI call falha MAS flow não trata especificamente.

**Evidence:**
- `src/lib/unified-tracking.ts` tem `checkBudgetAvailable()`
- `src/lib/direct-ai-client.ts` lança erro se budget exceeded
- MAS `chatbotFlow.ts` não trata esse erro de forma especial

**Why Tech Debt:**
- Cliente recebe mensagem de erro genérica
- Não há notificação ao admin
- Não há mensagem amigável ao usuário WhatsApp

**Recommendation:**
```typescript
// chatbotFlow.ts - NODE 12: Generate AI Response
try {
  aiResponse = await callDirectAI(...)
} catch (error) {
  if (error.message.includes('Budget exceeded')) {
    // Notificar admin
    await notifyAdminBudgetExceeded(clientId)

    // Enviar mensagem amigável ao usuário
    await sendTextMessage({
      phone,
      message: "Desculpe, nosso sistema está temporariamente indisponível. Nossa equipe foi notificada."
    })

    // Transferir para humano automaticamente
    await updateCustomerStatus(phone, clientId, 'humano')

    return { success: false, reason: 'budget_exceeded' }
  }
  throw error // Outros erros
}
```

**Effort:** 3 horas (implementação + notificação + testes)

---

## 🟡 MEDIUM PRIORITY (Impacto Médio)

### 6. ⚠️ No Config Cache Invalidation

**Location:** `src/lib/config.ts`

**Issue:** Config tem cache de 5min, mas sem endpoint para invalidar manualmente.

**Evidence:**
```typescript
// config.ts:26
const BOT_CONFIG_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
```

**Why Tech Debt:**
- Admin altera config no Vault → aguarda 5min para efeito
- Não há forma de forçar reload
- Dificulta debugging ("mudei mas não funcionou!")

**Recommendation:**
```typescript
// src/app/api/admin/invalidate-config-cache/route.ts
export async function POST() {
  clearBotConfigCache() // Função já existe
  return NextResponse.json({ success: true, message: 'Cache cleared' })
}
```

**Effort:** 1 hora (endpoint + auth + testes)

---

### 7. ⚠️ No Storage Quota Monitoring

**Location:** Supabase Storage (media files)

**Issue:** Nenhum monitoramento de storage quota. Free tier = 1GB.

**Why Tech Debt:**
- Quando estoura, uploads falham silenciosamente
- Nenhum alerta antecipado
- Cliente pode reportar "áudio não funciona" sem entender por quê

**Recommendation:**
```sql
-- Nova tabela
CREATE TABLE storage_metrics (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  bucket_name TEXT,
  total_size_bytes BIGINT,
  file_count INT,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job diário para medir
-- Alertar quando > 80% da quota
```

**Effort:** 4 horas (tabela + job + dashboard)

---

### 8. ⚠️ No Rate Limit Handling

**Location:** `src/lib/meta-whatsapp.ts`

**Issue:** Nenhum handling para 429 Too Many Requests da Meta API.

**Evidence:**
- 12_ERRORS_EDGE_CASES.md documenta limite de 80 msg/s
- Código tem delay de 2s entre mensagens (ajuda)
- MAS não trata 429 com exponential backoff

**Why Tech Debt:**
- Se Meta retornar 429, mensagem falha permanentemente
- Não há retry com backoff
- Pode perder mensagens em picos de tráfego

**Recommendation:**
```typescript
// meta-whatsapp.ts - Adicionar retry com backoff
async function sendWithRetry(payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendMessage(payload)
    } catch (error) {
      if (error.response?.status === 429) {
        const backoffMs = Math.pow(2, i) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

**Effort:** 2 horas (implementação + testes)

---

### 9. ⚠️ Type Safety Issues

**Location:** Múltiplos arquivos

**Issue:** TypeScript strict mode desabilitado (`"strict": false` em tsconfig.json)

**Evidence:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false  // ⚠️
  }
}
```

**Why Tech Debt:**
- Permite `any` implícito
- Dificulta refatoração (tipos fracos)
- Mais bugs em runtime

**Examples:**
```typescript
// checkOrCreateCustomer.ts:78
const supabaseAny = supabase as any  // Workaround for type issues
await supabaseAny.from('clientes_whatsapp')...
```

**Recommendation:**
```bash
# Habilitar strict mode gradualmente
1. strict: true
2. Rodar `npx tsc --noEmit`
3. Corrigir erros em lotes (por módulo)
4. Usar `@ts-expect-error` para casos edge (temporário)
```

**Effort:** 20 horas (projeto grande, muitos arquivos)

---

### 10. ⚠️ No Automated Cleanup Jobs

**Location:** Supabase Storage, `tts_cache`, `execution_logs`

**Issue:** Tabelas e storage acumulam dados indefinidamente.

**Why Tech Debt:**
- Storage cresce sem limite
- Queries ficam lentas (scan de milhões de rows)
- Custo aumenta desnecessariamente

**Tables Affected:**
```sql
tts_cache            -- Áudios TTS gerados (nunca expiram)
execution_logs       -- Logs de execução (nunca expiram)
audit_logs           -- Logs de auditoria (cresce indefinidamente)
n8n_chat_histories   -- Histórico de chat (nunca limpa old conversations)
```

**Recommendation:**
```sql
-- Job semanal
DELETE FROM tts_cache WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM execution_logs WHERE timestamp < NOW() - INTERVAL '90 days';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Storage cleanup (Supabase Storage API)
-- Deletar arquivos > 90 dias em bucket 'media'
```

**Effort:** 6 horas (jobs + testes + monitoramento)

---

### 11. ⚠️ No Client_ID Enforcement Linter

**Location:** Todas queries multi-tenant

**Issue:** Nenhum linter/hook para garantir `.eq('client_id', clientId)` em queries.

**Why Tech Debt:**
- Desenvolvedor pode esquecer filtro
- RLS salva, mas é última linha de defesa
- Pode vazar dados em service role queries

**Recommendation:**
```javascript
// .eslintrc.js - Custom rule
rules: {
  'custom/require-client-id-filter': 'error'
}

// Ou pre-commit hook
git diff --cached | grep -E "\.from\(" | grep -v "client_id"
```

**Effort:** 4 horas (regra ESLint custom + documentação)

---

## 🟢 LOW PRIORITY (Melhorias)

### 12. 📦 Bundle Size Not Monitored

**Issue:** Nenhum tracking de bundle size ao longo do tempo.

**Recommendation:**
```bash
# Adicionar ao CI
ANALYZE=true npm run build
# Comparar com commit anterior
# Alertar se crescimento > 10%
```

**Effort:** 2 horas

---

### 13. 📝 Falta Testes Unitários

**Issue:** Poucos testes (verificar `13_TESTS_COVERAGE_MAP.md` quando criado).

**Recommendation:**
- Adicionar testes para nodes críticos (generateAIResponse, batchMessages, etc.)
- Target: 60% coverage em nodes

**Effort:** 40 horas (cobertura completa)

---

### 14. 🔍 No Sentry/Error Tracking

**Issue:** Erros logados no console, mas sem agregação/alertas.

**Recommendation:**
```bash
npm install @sentry/nextjs
# Configurar para produção
# Alertar erros > 5/min
```

**Effort:** 3 horas

---

### 15. 📊 No Health Check Endpoint

**Issue:** Nenhum endpoint para verificar health de dependências (Supabase, Redis, OpenAI).

**Recommendation:**
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkSupabase(),
    checkRedis(),
    checkOpenAI(),
  ])

  const status = checks.every(c => c.status === 'fulfilled') ? 200 : 503
  return NextResponse.json({ checks }, { status })
}
```

**Effort:** 2 horas

---

### 16. 🎨 Inconsistent Code Style

**Issue:** Mix de estilos (alguns arquivos com classes, outros functional).

**Evidence:**
```typescript
// Alguns arquivos
export class Foo { ... }

// Outros arquivos (maioria)
export const foo = () => { ... }
```

**Recommendation:**
- Enforçar functional style (conforme CLAUDE.md)
- Refatorar classes remanescentes

**Effort:** 6 horas

---

### 17. 📖 Outdated Documentation

**Location:** `docs/` directory

**Issue:** Documentação pode estar desatualizada vs código real.

**Evidence:**
- Múltiplos arquivos em `docs/architecture/`, `docs/tables/`, `docs/stripe/`
- Nenhum processo de sync automático
- Este checkpoint (2026-03-15) é primeira análise completa do código

**Recommendation:**
- Marcar docs desatualizados com `⚠️ LEGADO` (conforme este checkpoint)
- Usar arquivos deste checkpoint como source of truth
- Implementar testes de documentação (doc snippets executam?)

**Effort:** 8 horas (auditoria + marcação)

---

### 18. 🔐 Secrets Management Inconsistency

**Location:** `.env.local`, Supabase Vault

**Issue:** Algumas secrets em `.env.local`, outras em Vault (sem padrão claro).

**Current State:**
- **Vault:** API keys de clientes (OpenAI, Groq)
- **.env.local:** Credenciais globais (Supabase, Meta, Gmail)

**Why Confusing:**
- Novo desenvolvedor não sabe onde colocar nova secret
- Migração para Vault incompleta?

**Recommendation:**
```
REGRA CLARA:
- .env.local → Credenciais da PLATAFORMA (Supabase, Meta, Vercel)
- Vault → Credenciais dos CLIENTES (OpenAI keys, Groq keys)
```

**Effort:** 1 hora (documentação)

---

### 19. 🌐 CORS Headers Too Permissive

**Location:** `next.config.js`

**Issue:** CORS permite `*` (all origins) em API routes.

**Evidence:**
```javascript
// next.config.js
headers: [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*'  // ⚠️ Too permissive
  }
]
```

**Why Tech Debt:**
- Permite qualquer site fazer requests
- Webhook routes deveriam aceitar SOMENTE Meta

**Recommendation:**
```javascript
// Diferentes headers por rota
/api/webhook/received → Allow-Origin: graph.facebook.com
/api/* (outros) → Allow-Origin: https://uzzapp.uzzai.com.br
```

**Effort:** 2 horas

---

### 20. 🗂️ No Migration Rollback Strategy

**Location:** `supabase/migrations/`

**Issue:** 107 migrations, nenhuma com rollback automático.

**Evidence:**
- `db/MIGRATION_WORKFLOW.md` menciona "criar reversal migration"
- Mas nenhuma migration tem `DOWN` migration

**Recommendation:**
```sql
-- Padrão: cada migration com comentário de rollback
-- migration.sql
-- UP
CREATE TABLE foo (...)

-- DOWN (rollback instructions)
-- DROP TABLE foo;
```

**Effort:** 1 hora (documentação + template)

---

## 📊 Summary Table

| Priority | Issue | Impact | Effort | ROI |
|----------|-------|--------|--------|-----|
| 🔴 HIGH | Remove `pg` library | Data corruption risk | 2h | ⭐⭐⭐⭐⭐ |
| 🔴 HIGH | Fix Capacitor version mismatch | Build failures | 1h | ⭐⭐⭐⭐⭐ |
| 🔴 HIGH | Downgrade ESLint 9 | CI/CD stability | 0.5h | ⭐⭐⭐⭐ |
| 🔴 HIGH | Make delays configurable | User experience | 2h | ⭐⭐⭐⭐ |
| 🔴 HIGH | Budget exhaustion handling | Revenue loss | 3h | ⭐⭐⭐⭐⭐ |
| 🟡 MED | Config cache invalidation | Admin UX | 1h | ⭐⭐⭐ |
| 🟡 MED | Storage quota monitoring | Cost control | 4h | ⭐⭐⭐⭐ |
| 🟡 MED | Rate limit handling | Message delivery | 2h | ⭐⭐⭐⭐ |
| 🟡 MED | Enable TypeScript strict | Code quality | 20h | ⭐⭐⭐ |
| 🟡 MED | Automated cleanup jobs | Cost + performance | 6h | ⭐⭐⭐⭐ |
| 🟡 MED | Client_ID linter | Security | 4h | ⭐⭐⭐ |
| 🟢 LOW | Bundle size monitoring | Performance | 2h | ⭐⭐ |
| 🟢 LOW | Unit tests | Maintainability | 40h | ⭐⭐⭐ |
| 🟢 LOW | Sentry integration | Observability | 3h | ⭐⭐⭐ |
| 🟢 LOW | Health check endpoint | Ops | 2h | ⭐⭐ |
| 🟢 LOW | Consistent code style | Maintainability | 6h | ⭐⭐ |
| 🟢 LOW | Update documentation | Knowledge | 8h | ⭐⭐⭐ |
| 🟢 LOW | Secrets management docs | Onboarding | 1h | ⭐⭐ |
| 🟢 LOW | Restrict CORS | Security | 2h | ⭐⭐ |
| 🟢 LOW | Migration rollback docs | Ops | 1h | ⭐ |

**Total Estimated Effort:** ~112 hours (~14 days)

---

## 🎯 Recommended Action Plan

### Sprint 1 (Week 1)
1. ✅ Remove `pg` library + audit (2h)
2. ✅ Fix Capacitor versions (1h)
3. ✅ Downgrade ESLint to 8.x (0.5h)
4. ✅ Budget exhaustion handling (3h)
5. ✅ Rate limit handling (2h)

**Total:** 8.5h

### Sprint 2 (Week 2)
6. ✅ Make delays configurable (2h)
7. ✅ Config cache invalidation endpoint (1h)
8. ✅ Storage quota monitoring (4h)
9. ✅ Automated cleanup jobs (6h)
10. ✅ Health check endpoint (2h)

**Total:** 15h

### Sprint 3 (Week 3)
11. ✅ Client_ID enforcement linter (4h)
12. ✅ Sentry integration (3h)
13. ✅ Restrict CORS headers (2h)
14. ✅ Documentation audit + LEGADO marking (8h)

**Total:** 17h

### Long-term (Backlog)
- Enable TypeScript strict mode (20h)
- Unit tests (40h)
- Code style refactoring (6h)

---

## 🔍 Monitoring Recommendations

**After implementing fixes, monitor:**
1. Error rates (Sentry)
2. Budget exhaustion events
3. Storage growth
4. API rate limit 429s
5. Build failures in CI/CD

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Total items: 20*
