# 📊 VALIDAÇÃO DE TRACKING - GUIA COMPLETO

> **Objetivo:** Documentar EXATAMENTE o que passa pelo Gateway, o que não passa, quais APIs são necessárias, e como fazer a validação (prova real) dos custos.

---

## 🎯 RESUMO EXECUTIVO

| API | Passa pelo Gateway? | API Key Necessária? | Provider da Key | Aparece no Vercel Dashboard? | Aparece no Provider Dashboard? | Tracking Unificado? |
|-----|---------------------|---------------------|-----------------|----------------------------|------------------------------|---------------------|
| **Chat (OpenAI)** | ✅ SIM | ❌ NÃO* | Gateway Config | ✅ SIM | ✅ SIM (via Gateway) | ✅ `gateway_usage_logs` |
| **Chat (Groq)** | ✅ SIM | ❌ NÃO* | Gateway Config | ✅ SIM | ✅ SIM (via Gateway) | ✅ `gateway_usage_logs` |
| **Vision (GPT-4o)** | ✅ SIM | ❌ NÃO* | Gateway Config | ✅ SIM | ✅ SIM (via Gateway) | ✅ `gateway_usage_logs` |
| **PDF Summary** | ✅ SIM | ❌ NÃO* | Gateway Config | ✅ SIM | ✅ SIM (via Gateway) | ✅ `gateway_usage_logs` |
| **Embeddings** | ⚠️ DIRETO** | ✅ SIM | Gateway Config | ❌ NÃO | ✅ SIM (direto) | ✅ `gateway_usage_logs` |
| **Whisper** | ❌ NÃO | ✅ SIM | Env ou Vault | ❌ NÃO | ✅ SIM (direto) | ⚠️ `usage_logs` (legacy) |
| **TTS (OpenAI)** | ❌ NÃO | ✅ SIM | Gateway Config | ❌ NÃO | ✅ SIM (direto) | ⚠️ `tts_usage_logs` (legacy) |
| **TTS (ElevenLabs)** | ❌ NÃO | ✅ SIM | Env | ❌ NÃO | ✅ SIM (direto) | ✅ `gateway_usage_logs` |

**Legendas:**
- `*` = API Key configurada UMA VEZ no Gateway (compartilhada por todos os clientes)
- `**` = Usa provider OpenAI direto, mas com tracking unificado manual

---

## 📋 DETALHAMENTO POR API

### 1. ✅ Chat (OpenAI e Groq) - PASSA PELO GATEWAY

**Arquivos:**
- `src/nodes/generateAIResponse.ts`
- `src/lib/ai-gateway/index.ts` (função `callAI()`)

**Fluxo:**
```
Seu código → Vercel AI Gateway (vck_...) → OpenAI/Groq (com keys compartilhadas)
```

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | `/dashboard/ai-gateway/setup` | ✅ SIM (todos os clientes) |
| Groq | `gsk_...` | `/dashboard/ai-gateway/setup` | ✅ SIM (todos os clientes) |
| Gateway | `vck_...` | `/dashboard/ai-gateway/setup` | ✅ SIM (1 key para tudo) |

**Onde Aparece:**
- ✅ **Seu Dashboard** (`/dashboard/ai-gateway`) - Completo (tokens, custo BRL, cache)
- ✅ **Vercel AI Dashboard** (https://vercel.com/ai) - Requests, cache hits, latência
- ✅ **OpenAI Dashboard** (https://platform.openai.com/usage) - Tokens cobrados (via Gateway)
- ✅ **Groq Dashboard** (https://console.groq.com/usage) - Tokens cobrados (via Gateway)

**Tracking:**
- Tabela: `gateway_usage_logs`
- Cache: Sim (`cached_tokens`, `was_cached`)
- Custo BRL: Sim (conversão USD→BRL automática)
- Budget: Sim (incrementa automaticamente)

**Validação (Prova Real):**
```sql
-- Total rastreado no seu sistema (últimos 30 dias)
SELECT
  provider,
  model_name,
  SUM(input_tokens + output_tokens - cached_tokens) as tokens_cobrados,
  SUM(cached_tokens) as tokens_economizados_cache,
  SUM(cost_brl) as custo_total_brl
FROM gateway_usage_logs
WHERE api_type = 'chat'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY provider, model_name;
```

**Comparar com:**
- **OpenAI**: https://platform.openai.com/usage → Tokens = `tokens_cobrados` (deve bater ±2%)
- **Groq**: https://console.groq.com/usage → Tokens = `tokens_cobrados` (deve bater ±2%)
- **Vercel**: https://vercel.com/ai → Cache hit rate, latência média

---

### 2. ✅ Vision (GPT-4o) - PASSA PELO GATEWAY

**Arquivos:**
- `src/lib/openai.ts` - `analyzeImageFromBuffer()`
- `src/nodes/analyzeImage.ts`

**Fluxo:**
```
Seu código → Vercel AI Gateway → OpenAI GPT-4o Vision
```

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | `/dashboard/ai-gateway/setup` | ✅ SIM |
| Gateway | `vck_...` | `/dashboard/ai-gateway/setup` | ✅ SIM |

**Onde Aparece:**
- ✅ **Seu Dashboard** - Completo (com cache!)
- ✅ **Vercel AI Dashboard** - Requests, cache hits
- ✅ **OpenAI Dashboard** - Tokens cobrados (via Gateway)

**Tracking:**
- Tabela: `gateway_usage_logs`
- Cache: **SIM!** (~60% economia se prompt > 1024 tokens)
- Metadata: `{ apiType: 'vision', imageAnalysis: true, mimeType }`

**Benefício de Cache:**
- Prompt fixo + imagens diferentes = cache no prompt
- Economia: ~60% nos tokens de input

**Validação:**
```sql
SELECT
  COUNT(*) as total_requests,
  SUM(input_tokens) as total_input,
  SUM(cached_tokens) as tokens_economizados,
  ROUND(100.0 * SUM(cached_tokens) / NULLIF(SUM(input_tokens), 0), 2) as cache_hit_rate_pct,
  SUM(cost_brl) as custo_total
FROM gateway_usage_logs
WHERE metadata->>'apiType' = 'vision'
  AND created_at > NOW() - INTERVAL '30 days';
```

---

### 3. ✅ PDF Summary - PASSA PELO GATEWAY

**Arquivos:**
- `src/lib/openai.ts` - `summarizePDFContent()`
- `src/nodes/analyzeDocument.ts`

**Fluxo:**
```
Seu código → Vercel AI Gateway → OpenAI GPT-4o
```

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | `/dashboard/ai-gateway/setup` | ✅ SIM |
| Gateway | `vck_...` | `/dashboard/ai-gateway/setup` | ✅ SIM |

**Onde Aparece:**
- ✅ **Seu Dashboard** - Completo (com cache!)
- ✅ **Vercel AI Dashboard** - Requests, cache hits
- ✅ **OpenAI Dashboard** - Tokens cobrados

**Tracking:**
- Tabela: `gateway_usage_logs`
- Cache: **SIM!** (~70% economia - prompts grandes)
- Metadata: `{ apiType: 'pdf_summary', filename, pdfLengthChars }`

**Benefício de Cache:**
- Prompt padrão de 3k+ tokens = cacheia automaticamente
- PDFs similares = economia massiva

**Validação:**
```sql
SELECT
  COUNT(*) as total_pdfs,
  AVG((metadata->>'pdfLengthChars')::integer) as avg_pdf_size_chars,
  SUM(cached_tokens) as tokens_economizados,
  SUM(cost_brl) as custo_total
FROM gateway_usage_logs
WHERE metadata->>'apiType' = 'pdf_summary'
  AND created_at > NOW() - INTERVAL '30 days';
```

---

### 4. ⚠️ Embeddings - SDK DIRETO (mas tracking unificado)

**Arquivos:**
- `src/lib/openai.ts` - `generateEmbedding()`

**Fluxo:**
```
Seu código → OpenAI SDK Direto (embed()) → OpenAI API
            ↓
    Tracking manual → gateway_usage_logs
```

**POR QUE NÃO PASSA PELO GATEWAY?**
- Gateway não suporta `EmbeddingModel` (só `LanguageModel`)
- Vercel AI SDK `embed()` precisa de provider direto

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | `/dashboard/ai-gateway/setup` | ✅ SIM (pega da config do Gateway) |

**Onde Aparece:**
- ✅ **Seu Dashboard** - Completo
- ❌ **Vercel AI Dashboard** - NÃO aparece (não passa pelo Gateway)
- ✅ **OpenAI Dashboard** - Tokens cobrados (chamada direta)

**Tracking:**
- Tabela: `gateway_usage_logs` (log manual via `logGatewayUsage()`)
- Cache: Não (embeddings são determinísticos)
- Metadata: `{ apiType: 'embeddings' }`

**Validação:**
```sql
-- No seu sistema
SELECT
  COUNT(*) as total_embeddings,
  SUM(input_tokens) as total_tokens,
  SUM(cost_brl) as custo_total
FROM gateway_usage_logs
WHERE metadata->>'apiType' = 'embeddings'
  AND created_at > NOW() - INTERVAL '30 days';

-- Calcular custo esperado no OpenAI
-- text-embedding-3-small = $0.02 per 1M tokens
-- Custo USD = (total_tokens / 1_000_000) * 0.02
```

**Comparar:**
- OpenAI Dashboard → Usage → Embeddings → Deve bater com `total_tokens`

---

### 5. ❌ Whisper - SDK DIRETO (tracking legacy)

**Arquivos:**
- `src/lib/openai.ts` - `transcribeAudio()`

**Fluxo:**
```
Seu código → OpenAI SDK Direto → Whisper API
            ↓
    Tracking legacy → usage_logs (NOT gateway_usage_logs)
```

**⚠️ PROBLEMA:** Tracking ainda não está unificado!

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | Env ou Vault | ⚠️ Depende da implementação |

**Onde Aparece:**
- ⚠️ **Seu Dashboard** - Parcial (não aparece no dashboard de Gateway)
- ❌ **Vercel AI Dashboard** - NÃO
- ✅ **OpenAI Dashboard** - Tokens/minutos cobrados

**Tracking Atual:**
- Tabela: `usage_logs` (LEGACY)
- Unidade: Segundos de áudio (`input_units`)
- Custo: NÃO calcula BRL
- Budget: NÃO incrementa

**🔧 O QUE PRECISA SER FEITO:**
```typescript
// Migrar de logAPIUsage() para logGatewayUsage()
const estimatedTokens = Math.ceil((durationSeconds / 60) * 1000);
const costUSD = (durationSeconds / 60) * 0.006; // $0.006/min

await logGatewayUsage({
  clientId,
  conversationId,
  phone,
  provider: 'openai',
  modelName: 'whisper-1',
  inputTokens: estimatedTokens,
  outputTokens: 0,
  cachedTokens: 0,
  costUSD,
  latencyMs,
  metadata: { apiType: 'whisper', audioSeconds: durationSeconds }
});
```

**Validação:**
```sql
-- Tracking atual (legacy)
SELECT
  COUNT(*) as total_transcriptions,
  SUM(input_units) as total_seconds,
  SUM(input_units) / 60.0 as total_minutes
FROM usage_logs
WHERE api_type = 'whisper'
  AND created_at > NOW() - INTERVAL '30 days';

-- Calcular custo esperado
-- Whisper = $0.006 per minute
-- Custo USD = (total_minutes) * 0.006
```

**Comparar:**
- OpenAI Dashboard → Usage → Audio → Whisper → Deve bater com `total_minutes`

---

### 6. ❌ TTS (OpenAI) - SDK DIRETO (tracking parcial)

**Arquivos:**
- `src/nodes/convertTextToSpeech.ts`

**Fluxo:**
```
Seu código → OpenAI SDK Direto → TTS API
            ↓
    Tracking → tts_usage_logs + unified_usage_logs (LEGACY)
```

**⚠️ PROBLEMA:** Tracking em 2 tabelas diferentes!

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| OpenAI | `sk-proj-...` | Gateway Config | ✅ SIM |

**Onde Aparece:**
- ⚠️ **Seu Dashboard** - Parcial (não no dashboard de Gateway)
- ❌ **Vercel AI Dashboard** - NÃO
- ✅ **OpenAI Dashboard** - Caracteres cobrados

**Tracking Atual:**
- Tabela 1: `tts_usage_logs` (cache, event_type)
- Tabela 2: `unified_usage_logs` (custo, caracteres)
- Unidade: Caracteres (`characters`)
- Custo: SIM (USD)
- Budget: ⚠️ Não incrementa em tokens

**🔧 O QUE PRECISA SER FEITO:**
```typescript
// Migrar de trackUnifiedUsage() para logGatewayUsage()
const estimatedTokens = Math.ceil(text.length / 4);
const costUSD = (text.length / 1_000_000) * 15.0; // tts-1-hd

await logGatewayUsage({
  clientId,
  conversationId,
  phone,
  provider: 'openai',
  modelName: 'tts-1-hd',
  inputTokens: estimatedTokens,
  outputTokens: 0,
  cachedTokens: 0,
  costUSD,
  latencyMs: 0,
  metadata: { apiType: 'tts', characters: text.length, voice, speed }
});
```

**Validação:**
```sql
-- Tracking atual
SELECT
  COUNT(*) as total_generations,
  SUM(characters) as total_characters,
  SUM(cost_usd) as total_cost_usd
FROM unified_usage_logs
WHERE api_type = 'tts'
  AND provider = 'openai'
  AND created_at > NOW() - INTERVAL '30 days';

-- Calcular custo esperado
-- tts-1-hd = $15.00 per 1M characters
-- Custo USD = (total_characters / 1_000_000) * 15.0
```

**Comparar:**
- OpenAI Dashboard → Usage → Audio → TTS → Deve bater com `total_characters`

---

### 7. ❌ TTS (ElevenLabs) - SDK DIRETO (tracking OK)

**Arquivos:**
- `src/nodes/convertTextToSpeech.ts`
- `src/lib/elevenlabs.ts`

**Fluxo:**
```
Seu código → ElevenLabs SDK Direto → ElevenLabs API
            ↓
    Tracking → unified_usage_logs (OK)
```

**API Keys Necessárias:**
| Provider | Key Format | Onde Configurar | Compartilhada? |
|----------|-----------|-----------------|----------------|
| ElevenLabs | `sk_...` | `.env` (`ELEVENLABS_API_KEY`) | ✅ SIM |

**Onde Aparece:**
- ⚠️ **Seu Dashboard** - Parcial
- ❌ **Vercel AI Dashboard** - NÃO
- ✅ **ElevenLabs Dashboard** - Caracteres cobrados

**Tracking Atual:**
- Tabela: `unified_usage_logs`
- Unidade: Caracteres
- Custo: SIM (USD)
- Budget: ⚠️ Não incrementa em tokens

**Validação:**
```sql
SELECT
  COUNT(*) as total_generations,
  SUM(characters) as total_characters,
  SUM(cost_usd) as total_cost_usd
FROM unified_usage_logs
WHERE api_type = 'tts'
  AND provider = 'elevenlabs'
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🔑 QUAIS API KEYS VOCÊ PRECISA FORNECER?

### ✅ API Keys Necessárias (Configurar UMA VEZ)

| Provider | Key Format | Onde Conseguir | Onde Configurar | Usada Por |
|----------|-----------|----------------|-----------------|-----------|
| **Vercel AI Gateway** | `vck_...` | https://vercel.com/ai | `/dashboard/ai-gateway/setup` | Chat, Vision, PDF |
| **OpenAI** | `sk-proj-...` | https://platform.openai.com/api-keys | `/dashboard/ai-gateway/setup` | Chat, Vision, PDF, Embeddings, Whisper, TTS |
| **Groq** | `gsk_...` | https://console.groq.com/keys | `/dashboard/ai-gateway/setup` | Chat (Llama 3.3) |
| **ElevenLabs** | `sk_...` | https://elevenlabs.io/app/settings/api-keys | `.env` → `ELEVENLABS_API_KEY` | TTS (vozes premium) |

### 📋 Setup Completo (Passo a Passo)

#### 1. **Gateway Keys** (3 keys - configurar no dashboard)

```bash
# 1. Ir para: /dashboard/ai-gateway/setup
# 2. Colar as keys:
#    - Gateway API Key: vck_...
#    - OpenAI API Key: sk-proj-...
#    - Groq API Key: gsk_...
# 3. Salvar
```

#### 2. **ElevenLabs Key** (configurar no .env)

```bash
# .env.local ou .env
ELEVENLABS_API_KEY=sk_...
```

#### 3. **Ativar Gateway por Cliente**

```sql
-- Ativar Gateway para um cliente específico
UPDATE clients
SET use_ai_gateway = true
WHERE id = 'uuid-do-cliente';

-- Ou ativar para TODOS os clientes
UPDATE clients
SET use_ai_gateway = true;
```

---

## 🧪 VALIDAÇÃO AUTOMÁTICA - ENDPOINT

**Criar:** `/api/admin/validate-billing`

**O que faz:**
1. Pega dados do seu DB (últimos 30 dias)
2. Compara com usage dos providers (via APIs)
3. Retorna relatório com discrepâncias

**Implementação:**

```typescript
// src/app/api/admin/validate-billing/route.ts
export async function GET(request: NextRequest) {
  // 1. Buscar do seu DB
  const { data: logs } = await supabase
    .from('gateway_usage_logs')
    .select('*')
    .gte('created_at', thirtyDaysAgo);

  // 2. Agrupar por provider
  const byProvider = groupBy(logs, 'provider');

  // 3. Buscar do OpenAI
  const openaiUsage = await fetchOpenAIUsage(); // API externa

  // 4. Comparar
  const report = {
    openai: {
      yourSystem: byProvider.openai.totalTokens,
      provider: openaiUsage.totalTokens,
      difference: Math.abs(byProvider.openai.totalTokens - openaiUsage.totalTokens),
      percentageDiff: calculatePercentageDiff(...),
      status: difference < 1000 ? 'OK' : 'WARNING'
    },
    groq: { ... },
    // ...
  };

  return NextResponse.json(report);
}
```

---

## 📊 DASHBOARD DE VALIDAÇÃO

**Criar:** `/dashboard/ai-gateway/validation`

**Seções:**

### 1. Resumo Geral
```
╔════════════════════════════════════════════════════════════╗
║  RESUMO GERAL DE CUSTOS (últimos 30 dias)                 ║
╠════════════════════════════════════════════════════════════╣
║  Total rastreado:              R$ 1.245,67                 ║
║  Cache economizado:            R$ 423,12 (34%)            ║
║  Custo real (sem cache):       R$ 822,55                  ║
╚════════════════════════════════════════════════════════════╝
```

### 2. Comparação por Provider
```
┌─────────────┬─────────────┬──────────────┬─────────────┬────────────┐
│ Provider    │ Seu Sistema │ Provider     │ Diferença   │ Status     │
├─────────────┼─────────────┼──────────────┼─────────────┼────────────┤
│ OpenAI      │ 3.5M tokens │ 3.52M tokens │ +20K (0.5%) │ ✅ OK      │
│ Groq        │ 15.2M       │ 15.18M       │ -20K (0.1%) │ ✅ OK      │
│ ElevenLabs  │ 145K chars  │ 145K chars   │ 0           │ ✅ OK      │
└─────────────┴─────────────┴──────────────┴─────────────┴────────────┘
```

### 3. Detalhamento por API
```
┌─────────────────┬────────────┬──────────────┬────────────────┬──────────┐
│ API Type        │ Requests   │ Tokens       │ Custo BRL      │ Cache    │
├─────────────────┼────────────┼──────────────┼────────────────┼──────────┤
│ Chat (Groq)     │ 1,247      │ 15.2M        │ R$ 255,25      │ 68%      │
│ Chat (OpenAI)   │ 89         │ 2.3M         │ R$ 178,40      │ 62%      │
│ Vision          │ 156        │ 3.1M         │ R$ 234,60      │ 59%      │
│ PDF Summary     │ 23         │ 890K         │ R$ 67,20       │ 72%      │
│ Embeddings      │ 892        │ 605K         │ R$ 12,10       │ -        │
│ Whisper         │ 342        │ 127min       │ R$ 45,80       │ -        │
│ TTS (OpenAI)    │ 178        │ 145K chars   │ R$ 29,20       │ -        │
│ TTS (ElevenLabs)│ 45         │ 38K chars    │ R$ 15,30       │ -        │
└─────────────────┴────────────┴──────────────┴────────────────┴──────────┘
```

---

## ⚠️ CÓDIGO LEGACY ENCONTRADO

### Arquivos que AINDA usam SDK direto (REMOVER):

1. **`src/lib/groq.ts`** - SDK Groq direto
   - ❌ Usado em: `src/nodes/classifyIntent.ts`
   - ❌ Usado em: `src/app/api/client/test-model/route.ts`
   - ✅ **AÇÃO:** Migrar para usar `callAI()` do Gateway

2. **`src/lib/openai.ts` - `generateChatCompletionOpenAI()`**
   - ❌ Usado em: `src/app/api/client/test-model/route.ts`
   - ✅ **AÇÃO:** Migrar para usar `callAI()` do Gateway

---

## 📝 CHECKLIST COMPLETO

### ✅ Já Implementado
- [x] Chat (OpenAI/Groq) via Gateway
- [x] Vision via Gateway
- [x] PDF Summary via Gateway
- [x] Embeddings com tracking unificado
- [x] Budget checks em todas as APIs
- [x] conversationId propagation

### ⚠️ Precisa Melhorar (FASE 7)
- [ ] Whisper: Migrar tracking para `gateway_usage_logs`
- [ ] TTS (OpenAI): Migrar tracking para `gateway_usage_logs`
- [ ] TTS (ElevenLabs): Migrar tracking para `gateway_usage_logs`
- [ ] Remover tabelas legacy (`usage_logs`, `tts_usage_logs`, `unified_usage_logs`)

### 🚀 Precisa Criar (FASE 1-3)
- [ ] Email Alerts (80%, 90%, 100%)
- [ ] Cron Job para reset de budget
- [ ] Dashboard de validação (`/dashboard/ai-gateway/validation`)
- [ ] Endpoint de validação (`/api/admin/validate-billing`)

### 🗑️ Precisa Remover (Legacy)
- [ ] `src/lib/groq.ts` - Substituir por Gateway
- [ ] `src/nodes/classifyIntent.ts` - Migrar para Gateway
- [ ] `src/app/api/client/test-model/route.ts` - Migrar para Gateway
- [ ] `generateChatCompletionOpenAI()` em `openai.ts` - Remover

---

## 🎯 RESULTADO FINAL ESPERADO

Após todas as melhorias:

### Tracking 100% Unificado
✅ **UMA tabela** para todas as APIs (`gateway_usage_logs`)
✅ **UM dashboard** para visualização completa
✅ **Budget control** único em tokens + BRL
✅ **Validação automática** semanal

### API Keys Simplificadas
✅ **3 keys no dashboard** (Gateway, OpenAI, Groq)
✅ **1 key no .env** (ElevenLabs)
✅ **ZERO configuração por cliente** (keys compartilhadas)

### Economia Máxima
✅ **Cache automático** em Chat, Vision, PDF (60-70%)
✅ **Fallback automático** entre providers
✅ **Custos transparentes** (BRL real-time)

### Observabilidade Total
✅ **Prova real** dos custos (seu DB vs providers)
✅ **Discrepâncias** detectadas automaticamente
✅ **Alertas** de budget (email progressivo)

---

## 📞 SUPORTE

**Dúvidas sobre tracking:**
- Ver logs: `/dashboard/debug`
- Ver gateway: `/dashboard/ai-gateway`
- Ver budget: `/dashboard/ai-gateway/budget`

**Validação manual:**
```sql
-- Script de validação completo
\i validacao_custos_30_dias.sql
```

---

**Última atualização:** 2025-01-XX
**Versão:** 1.0
