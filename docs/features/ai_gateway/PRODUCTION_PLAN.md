# 🚀 AI Gateway - Plano de Produção (100% Rollout)

**Data:** 2025-12-13
**Status Atual:** Backend completo, Frontend parcial
**Meta:** Produção 100% em 3-5 dias

---

## ✅ Decisões Tomadas

1. **Legado:** Remover TUDO - só AI Gateway ✅
2. **Rollout:** Habilitar para TODOS os clientes ✅
3. **Cache:** Conservador (1h) + configurável via frontend ✅
4. **Modelos:** Híbrido (registry + custom + test button)
5. **Tracking Unificado:** TODAS as APIs (chat, whisper, vision, embeddings) ✅
6. **Budget Multi-Dimensional:** Limites por API type + total R$ ✅

---

## 📊 Estado Atual (O Que Temos)

### ✅ Fase 1: Database - 100% COMPLETO
- ✅ 6 migrations aplicadas
- ✅ `shared_gateway_config` (1 registro)
- ✅ `ai_models_registry` (6 modelos seed)
- ✅ `gateway_usage_logs` (tracking multi-tenant)
- ✅ `client_budgets` (budget system)
- ✅ Vault RPC functions (create_vault_secret, get_vault_secret)

### ✅ Fase 2: Backend Core - 95% COMPLETO
- ✅ `src/lib/ai-gateway/index.ts` (callAI, fallback)
- ✅ `src/lib/ai-gateway/providers.ts` (OpenAI, Groq, Anthropic, Google)
- ✅ `src/lib/ai-gateway/config.ts` (getSharedGatewayConfig, cache 5min)
- ✅ `src/lib/ai-gateway/usage-tracking.ts` (logGatewayUsage, BRL conversion)
- ✅ `src/lib/currency.ts` (USD→BRL com cache 24h)
- ✅ `src/nodes/generateAIResponse.ts` (integração gateway)
- ⚠️ **LEGADO PRESENTE:** Ainda tem código direct SDK (precisa remover)

### 🟡 Fase 3: Frontend - 20% COMPLETO
- ✅ `/dashboard/ai-gateway/setup` (configurar keys)
- ❌ `/dashboard/ai-gateway/analytics` (métricas agregadas - ADMIN)
- ❌ `/dashboard/ai-gateway/cache` (cache viewer)
- ❌ `/dashboard/ai-gateway/models` (model registry UI)
- ❌ `/dashboard/ai-gateway/budgets` (budget management)
- ❌ `/dashboard/analytics` (atualizar para gateway_usage_logs)
- ❌ Cache config UI (TTL, enabled)

### 🟡 Fase 4: API Routes - 30% COMPLETO
- ✅ `/api/ai-gateway/setup` (POST - salvar keys)
- ✅ `/api/test/gateway` (GET - testar)
- ❌ `/api/ai-gateway/config` (GET/PUT cache settings)
- ❌ `/api/ai-gateway/models` (CRUD models)
- ❌ `/api/ai-gateway/metrics` (analytics agregado)
- ❌ `/api/ai-gateway/cache` (listar, invalidar)
- ❌ `/api/budget/*` (CRUD budgets)
- ❌ `/api/analytics/gateway` (per-client)
- ❌ Cron jobs (budget alerts, reset periods)

### ❌ Fase 5: Testes - 0% COMPLETO
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E WhatsApp test

---

## 🔄 MUDANÇA CRÍTICA: Tracking Unificado

### ⚠️ Problema Identificado

**ANTES:**
- ✅ Chat completions → AI Gateway → tracking ✅
- ❌ Whisper → OpenAI direto → **SEM tracking** ❌
- ❌ Vision → OpenAI direto → **SEM tracking** ❌
- ❌ Embeddings → OpenAI direto → **SEM tracking** ❌

**Impacto:**
- Analytics incompleto
- Custo real não rastreado
- Budget não funciona corretamente

### ✅ Solução: API Tracking Unificado

**DEPOIS:**
- ✅ Chat completions → tracking em `gateway_usage_logs`
- ✅ Whisper → tracking em `gateway_usage_logs`
- ✅ Vision → tracking em `gateway_usage_logs`
- ✅ Embeddings → tracking em `gateway_usage_logs`
- ✅ **Budget Multi-Dimensional** por API type

**Mudanças:**

1. **Adicionar colunas em `gateway_usage_logs`:**
   ```sql
   api_type: 'chat' | 'whisper' | 'vision' | 'embeddings'
   input_units: INTEGER  -- Para Whisper (segundos)
   output_units: INTEGER -- Para Vision/Image-gen (imagens)
   ```

2. **Nova tabela `client_budget_limits`:**
   - Limites por API type (tokens, minutos, imagens, requests)
   - Exemplo: Free plan = 50 imagens/mês, 130min áudio

3. **Função `logAPIUsage()` unificada:**
   - Substitui `logGatewayUsage()` (só chat)
   - Rastreia TODAS as APIs
   - Calcula custo por tipo
   - Incrementa budgets multi-dimensional

**Ver:** `docs/features/ai_gateway/BUDGET_SYSTEM.md` para detalhes completos

---

## 🎯 O Que Falta para 100% Produção

### 🔴 CRÍTICO (Blocker para PRD)

#### 1. Remover Código Legado ⏱️ 2h
**Objetivo:** Forçar uso exclusivo do AI Gateway

**Arquivos a modificar:**
```typescript
// src/nodes/generateAIResponse.ts
// DELETAR linhas 354-381 (legacy path)
export const generateAIResponse = async (input: GenerateAIResponseInput): Promise<AIResponse> => {
  // ...

  // ❌ DELETAR TODO ESTE BLOCO:
  if (config.primaryProvider === "openai") {
    return await generateChatCompletionOpenAI(...)
  } else {
    return await generateChatCompletion(...)
  }

  // ✅ SUBSTITUIR POR:
  throw new Error('AI Gateway is required but disabled for this client')
}
```

**Arquivos a deletar:**
- ❌ `src/lib/groq.ts` (não mais usado)
- ❌ `src/lib/openai.ts` (não mais usado)

**Verificar imports:**
```bash
# Buscar onde groq.ts/openai.ts ainda são importados
grep -r "from '@/lib/groq'" src/
grep -r "from '@/lib/openai'" src/
```

---

#### 2. Habilitar Gateway para TODOS ⏱️ 30min
**Objetivo:** 100% rollout

```sql
-- Habilitar para TODOS os clientes ativos
UPDATE clients
SET use_ai_gateway = true
WHERE status = 'active';

-- Verificar
SELECT
  COUNT(*) FILTER (WHERE use_ai_gateway = true) as enabled,
  COUNT(*) FILTER (WHERE use_ai_gateway = false) as disabled,
  COUNT(*) as total
FROM clients;
```

**Adicionar ao .env.production:**
```env
ENABLE_AI_GATEWAY=true
```

---

#### 3. Teste WhatsApp Real ⏱️ 30min
**Checklist:**
- [ ] Enviar mensagem para cliente teste
- [ ] Verificar resposta da IA
- [ ] Verificar `gateway_usage_logs` foi criado
- [ ] Verificar `cost_brl` está correto
- [ ] Verificar `client_id` está correto (multi-tenant)
- [ ] Testar fallback (desabilitar OpenAI no setup temporariamente)
- [ ] Testar cache (enviar mesma pergunta 2x)

---

### 🟡 IMPORTANTE (Necessário antes PRD)

#### 4. Cache Configuration UI ⏱️ 3h
**Objetivo:** Admin pode configurar cache via frontend

**Página:** `/dashboard/ai-gateway/setup` (adicionar seção)

**Features:**
- Toggle: Cache Enabled (on/off)
- Input: Cache TTL (seconds) - default 3600
- Info: "Respostas idênticas serão cacheadas por este tempo"
- Save button → PUT /api/ai-gateway/config

**API Route:** `/api/ai-gateway/config/route.ts`
```typescript
export async function GET() {
  const config = await getSharedGatewayConfig()
  return NextResponse.json({
    cacheEnabled: config.cacheEnabled,
    cacheTTLSeconds: config.cacheTTLSeconds,
    defaultFallbackChain: config.defaultFallbackChain,
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  // Update shared_gateway_config
  await supabase
    .from('shared_gateway_config')
    .update({
      cache_enabled: body.cacheEnabled,
      cache_ttl_seconds: body.cacheTTLSeconds,
    })
    .eq('id', configId)

  // Clear cache
  clearConfigCache()

  return NextResponse.json({ success: true })
}
```

---

#### 5. Analytics Integration ⏱️ 4h
**Objetivo:** Dashboard `/dashboard/analytics` mostra dados do gateway

**Modificar:** `src/app/dashboard/analytics/page.tsx`

**Changes:**
```typescript
// ANTES (legacy)
const { data } = await supabase
  .from('usage_logs')
  .select('*')
  .eq('client_id', clientId)

// DEPOIS (gateway)
const { data } = await supabase
  .from('gateway_usage_logs')
  .select('*')
  .eq('client_id', clientId)
```

**Novas métricas:**
- **Latência P50/P95/P99:** Chart linha ao longo do tempo
- **Cache Hit Rate:** Gauge (%) + savings em R$
- **Provider Breakdown:** Pie chart (% uso por provider)
- **Fallback Events:** Table (quando, por quê, modelo usado)

**Componentes a criar:**
- `<LatencyChart />` - Recharts LineChart
- `<CachePerformanceCard />` - Card com gauge
- `<ProviderBreakdownChart />` - Pie chart
- `<FallbackEventsTable />` - Table

---

#### 6. Implementar Cache Logging ⏱️ 2h
**Problema:** `gateway_cache_performance` não está sendo populado

**Arquivo:** `src/lib/ai-gateway/index.ts`

**Adicionar após cada `generateText`:**
```typescript
const result = await generateText({ ... })

// Log cache performance
if (result.response?.headers?.['x-vercel-ai-cache-status']) {
  await logCachePerformance({
    cacheKey: generateCacheKey(messages),
    wasCached: result.response.headers['x-vercel-ai-cache-status'] === 'hit',
    latencyMs: Date.now() - startTime,
    tokensS saved: wasCached ? result.usage.promptTokens : 0,
  })
}
```

**Nova função:** `src/lib/ai-gateway/cache-tracking.ts`
```typescript
export const logCachePerformance = async (data: {
  cacheKey: string
  wasCached: boolean
  latencyMs: number
  tokensSaved: number
}) => {
  const supabase = createServerClient()

  // Upsert (increment hit_count if exists)
  await supabase.rpc('upsert_cache_performance', {
    p_cache_key: data.cacheKey,
    p_was_cached: data.wasCached,
    p_latency_ms: data.latencyMs,
    p_tokens_saved: data.tokensSaved,
  })
}
```

**Migration:** `20251213_add_cache_upsert_function.sql`
```sql
CREATE OR REPLACE FUNCTION upsert_cache_performance(
  p_cache_key TEXT,
  p_was_cached BOOLEAN,
  p_latency_ms INTEGER,
  p_tokens_saved INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO gateway_cache_performance (
    cache_key, hit_count, last_accessed_at, latency_ms, tokens_saved
  ) VALUES (
    p_cache_key, 1, NOW(), p_latency_ms, p_tokens_saved
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    hit_count = gateway_cache_performance.hit_count + 1,
    last_accessed_at = NOW(),
    latency_ms = p_latency_ms,
    tokens_saved = gateway_cache_performance.tokens_saved + p_tokens_saved;
END;
$$ LANGUAGE plpgsql;
```

---

### 🟢 NICE TO HAVE (Pode ser pós-PRD)

#### 7. Model Registry UI ⏱️ 6h
**Objetivo:** Admin adiciona novos modelos sem code change

**Página:** `/dashboard/ai-gateway/models`

**Features:**
```typescript
interface ModelFormData {
  provider: 'openai' | 'anthropic' | 'groq' | 'google' | 'custom'
  modelName: string // Free text (suporta modelos futuros!)
  displayName: string
  costPer1kInputTokens: number
  costPer1kOutputTokens: number
  maxContextWindow: number
  maxOutputTokens: number
  supportsVision: boolean
  supportsTools: boolean
  enabled: boolean
}
```

**3 Modos de Adicionar:**

**Modo 1: Selecionar de Registry (Dropdown)**
- Lista modelos conhecidos do `ai_models_registry`
- Já tem custos pré-preenchidos
- ✅ Simples, rápido

**Modo 2: Custom Model (Free Text)**
- Provider: dropdown (openai, anthropic, groq, google)
- Model Name: **free text input** ← Aceita qualquer modelo!
- Display Name: free text
- Custos: inputs manuais
- ⚠️ Não validado

**Modo 3: Test Before Save**
- Botão "Test Model" antes de salvar
- Faz chamada real ao modelo (10 tokens)
- Retorna: success/error + custos reais
- ✅ Valida que modelo existe
- ✅ Descobre custos automaticamente (via usage)

**Exemplo de uso:**
1. Admin quer adicionar GPT-5 (modelo futuro que acabou de sair)
2. Seleciona Provider: OpenAI
3. Digita Model Name: `gpt-5-ultra` (free text!)
4. Clica "Test Model"
5. Sistema tenta chamar o modelo
6. Se funciona: salva no registry
7. Se falha: mostra erro

**API Routes:**
```typescript
// POST /api/ai-gateway/models
export async function POST(request: NextRequest) {
  const body: ModelFormData = await request.json()

  // Insert em ai_models_registry
  await supabase.from('ai_models_registry').insert({
    provider: body.provider,
    model_name: body.modelName,
    display_name: body.displayName,
    cost_per_1k_input_tokens: body.costPer1kInputTokens,
    cost_per_1k_output_tokens: body.costPer1kOutputTokens,
    max_context_window: body.maxContextWindow,
    max_output_tokens: body.maxOutputTokens,
    supports_vision: body.supportsVision,
    supports_tools: body.supportsTools,
    enabled: body.enabled,
    verified: false, // Só vira true após test
  })
}

// POST /api/ai-gateway/models/test
export async function POST(request: NextRequest) {
  const { provider, modelName, apiKey } = await request.json()

  try {
    const providerInstance = getGatewayProvider(provider, apiKey)
    const result = await generateText({
      model: providerInstance(modelName),
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 10,
    })

    return NextResponse.json({
      success: true,
      usage: result.usage,
      cost: calculateCost(result.usage), // Estimar custo
      latency: result.latencyMs,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 400 })
  }
}
```

**Benefícios:**
- ✅ Adicionar Grok, Anthropic Claude Opus 4, Gemini Pro sem deploy
- ✅ Testar modelos novos antes de produção
- ✅ Atualizar custos quando provider muda pricing
- ✅ Habilitar/desabilitar modelos dinamicamente

---

#### 8. Cache Viewer Dashboard ⏱️ 4h
**Página:** `/dashboard/ai-gateway/cache`

**Features:**
- Listar top 50 prompts em cache
- Mostrar TTL restante
- Mostrar hit count (quantas vezes foi usado)
- Savings estimado (tokens * custo)
- Botão "Invalidate" por prompt
- Botão "Clear All Cache"

**Query:**
```sql
SELECT
  cache_key,
  LEFT(prompt_preview, 100) as prompt_preview,
  hit_count,
  tokens_saved,
  tokens_saved * 0.0002 as savings_brl, -- Estimativa
  last_accessed_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) as ttl_seconds
FROM gateway_cache_performance
WHERE expires_at > NOW()
ORDER BY hit_count DESC
LIMIT 50;
```

**API Route:** `/api/ai-gateway/cache/route.ts`
```typescript
export async function GET() {
  // Query acima
}

export async function DELETE(request: NextRequest) {
  const { cacheKey } = await request.json()

  if (cacheKey === 'ALL') {
    await supabase.from('gateway_cache_performance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  } else {
    await supabase.from('gateway_cache_performance').delete().eq('cache_key', cacheKey)
  }

  // Também invalidar no Vercel Gateway (se possível)
  // Nota: Vercel AI Gateway não tem API pública para invalidar cache
  // Cache expira automaticamente após TTL

  return NextResponse.json({ success: true })
}
```

---

#### 9. Budget Management UI ⏱️ 5h
**Página:** `/dashboard/ai-gateway/budgets` (ADMIN)

**Features:**
- Table: todos os clientes + budget atual
- Filtros: plan, budget_type, is_paused
- Editar budget inline
- Progress bar por cliente (% usado)
- Alertas: clientes próximos do limite (80%+)
- Botão "Pause/Unpause" por cliente
- Exportar CSV

**Componente:** `<BudgetProgressBar />`
```typescript
interface BudgetProgressBarProps {
  current: number
  limit: number
  type: 'tokens' | 'brl' | 'usd'
}

// Colors:
// 0-50%: green
// 50-80%: yellow
// 80-100%: orange
// 100%+: red
```

**API Route:** `/api/budget/config/route.ts`
```typescript
export async function GET() {
  // Admin: todos os clientes
  // Cliente: apenas seu budget
  const { data } = await supabase
    .from('client_budgets')
    .select('*, clients(name, plan)')
    .order('current_usage_percentage', { descending: true })

  return NextResponse.json({ budgets: data })
}

export async function PUT(request: NextRequest) {
  const { clientId, budgetLimit, budgetType, budgetPeriod } = await request.json()

  await supabase
    .from('client_budgets')
    .upsert({
      client_id: clientId,
      budget_limit: budgetLimit,
      budget_type: budgetType,
      budget_period: budgetPeriod,
    })

  return NextResponse.json({ success: true })
}
```

---

#### 10. Cron Jobs (Budget Alerts) ⏱️ 3h

**Arquivo:** `src/app/api/cron/check-budget-alerts/route.ts`
```typescript
export async function GET(request: NextRequest) {
  // Verificar authorization (Vercel Cron secret)
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Buscar todos os budgets ativos
  const { data: budgets } = await supabase
    .from('client_budgets')
    .select('*, clients(name, notification_email)')
    .eq('is_active', true)

  for (const budget of budgets) {
    const percentage = budget.current_usage_percentage

    // Alert 80%
    if (percentage >= 80 && percentage < 90 && !budget.alert_80_sent) {
      await sendBudgetAlert(budget.client_id, 80, 'warning')
      await supabase.from('client_budgets').update({ alert_80_sent: true }).eq('id', budget.id)
    }

    // Alert 90%
    if (percentage >= 90 && percentage < 100 && !budget.alert_90_sent) {
      await sendBudgetAlert(budget.client_id, 90, 'critical')
      await supabase.from('client_budgets').update({ alert_90_sent: true }).eq('id', budget.id)
    }

    // Alert 100% + Pause
    if (percentage >= 100 && !budget.is_paused) {
      await sendBudgetAlert(budget.client_id, 100, 'error')

      if (budget.pause_at_limit) {
        await supabase.from('client_budgets').update({ is_paused: true }).eq('id', budget.id)
        console.log(`[Budget] Paused client ${budget.client_id} - exceeded limit`)
      }
    }
  }

  return NextResponse.json({ success: true, checked: budgets.length })
}

async function sendBudgetAlert(clientId: string, percentage: number, severity: string) {
  // Send email via Resend/SendGrid
  // Or webhook notification
  console.log(`[Budget Alert] Client ${clientId} at ${percentage}% - ${severity}`)
}
```

**Arquivo:** `src/app/api/cron/reset-budget-periods/route.ts`
```typescript
export async function GET(request: NextRequest) {
  // Auth check

  const supabase = createServerClient()

  // Buscar budgets que expiraram
  const { data: expiredBudgets } = await supabase
    .from('client_budgets')
    .select('*')
    .lte('next_reset_at', new Date().toISOString())

  for (const budget of expiredBudgets) {
    await supabase.rpc('reset_budget_usage', {
      p_client_id: budget.client_id
    })

    console.log(`[Budget] Reset budget for client ${budget.client_id}`)
  }

  return NextResponse.json({ success: true, reset: expiredBudgets.length })
}
```

**Config:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/check-budget-alerts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/reset-budget-periods",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 📅 CRONOGRAMA EXECUTÁVEL (ATUALIZADO)

### **Dia 1: Tracking Unificado & Cleanup** (7-8h)
- [ ] ⏱️ 3h - **Implementar Tracking Unificado**
  - [ ] Migration: Adicionar `api_type`, `input_units`, `output_units` em `gateway_usage_logs`
  - [ ] Migration: Criar tabela `client_budget_limits`
  - [ ] Criar `src/lib/ai-gateway/api-tracking.ts`
  - [ ] Atualizar `openai.ts` para logar Whisper/Vision/Embeddings

- [ ] ⏱️ 2h - **Remover código legado**
  - [ ] Deletar legacy path de `generateAIResponse.ts`
  - [ ] Deletar `executeDiagnosticSubagent.ts` (código morto)
  - [ ] Verificar imports quebrados

- [ ] ⏱️ 1h - **Habilitar 100%**
  - [ ] SQL: Habilitar gateway para TODOS os clientes
  - [ ] Adicionar AI Gateway no sidebar
  - [ ] Adicionar `ENABLE_AI_GATEWAY=true` em .env.production

- [ ] ⏱️ 1h - **Teste WhatsApp E2E**
  - [ ] Enviar mensagem de chat
  - [ ] Enviar áudio (Whisper)
  - [ ] Enviar imagem (Vision)
  - [ ] Verificar logs em `gateway_usage_logs` (todos os types)

- [ ] ⏱️ 30min - **Monitorar**
  - [ ] Verificar error rate < 0.5%
  - [ ] Verificar todos os API types sendo logados
  - [ ] Verificar custos BRL corretos

**Entrega:** Tracking 100% completo + Gateway habilitado para todos

---

### **Dia 2: Cache & Analytics** (6-7h)
- [ ] ⏱️ 3h - Cache Configuration UI (TTL, enabled)
- [ ] ⏱️ 2h - Implementar cache logging (populate table)
- [ ] ⏱️ 4h - Integrar analytics dashboard (latency, cache, fallback)
- [ ] ⏱️ 1h - Testar todos os charts

**Entrega:** Dashboard analytics funcionando com dados reais

---

### **Dia 3: Model Registry** (6-8h)
- [ ] ⏱️ 4h - Model Registry UI (list, add, edit, delete)
- [ ] ⏱️ 2h - Test Model API (validação antes de salvar)
- [ ] ⏱️ 2h - Adicionar Anthropic Claude, Google Gemini via UI
- [ ] ⏱️ 1h - Testar fallback com novos modelos

**Entrega:** Modularidade - adicionar modelos sem code change

---

### **Dia 4: Budget & Cache Viewer** (7-8h)
- [ ] ⏱️ 4h - Cache Viewer Dashboard (listar, invalidar)
- [ ] ⏱️ 5h - Budget Management UI (admin dashboard)
- [ ] ⏱️ 3h - Cron jobs (budget alerts, reset periods)
- [ ] ⏱️ 1h - Testar alertas (simular 80%, 90%, 100%)

**Entrega:** Budget system 100% funcional

---

### **Dia 5: Testes & Documentação** (4-6h)
- [ ] ⏱️ 2h - E2E tests (WhatsApp completo)
- [ ] ⏱️ 2h - Load test (50 usuários simultâneos)
- [ ] ⏱️ 2h - Atualizar CLAUDE.md com AI Gateway
- [ ] ⏱️ 1h - Criar guia de migração para clientes
- [ ] ⏱️ 1h - Verificar métricas finais:
  - Error rate < 0.5%
  - Cache hit rate > 30%
  - Latency P95 < 2s
  - 100% clientes habilitados
  - Budget tracking funcionando

**Entrega:** Sistema 100% pronto para produção

---

## 🎯 Métricas de Sucesso

### Semana 1 (Pós-Deploy)
- [ ] 0 bugs críticos
- [ ] Error rate < 0.5%
- [ ] Cache hit rate > 30%
- [ ] Latency P95 < 2000ms
- [ ] 100% clientes usando gateway
- [ ] Budget alerts funcionando

### Mês 1
- [ ] Cache hit rate > 50%
- [ ] Cost reduction > 20%
- [ ] Budget system usado por >50% clientes
- [ ] Dashboard acessado por >80% clientes
- [ ] NPS > 8

---

## 🤔 Decisão: Modelos Dinâmicos

### Resposta à Pergunta do Usuário

**"Preciso pré-configurar modelos no backend?"**
- **Não!** Com Model Registry UI (Dia 3), adiciona via frontend

**"Se sair modelo novo que gateway aceita, funciona?"**
- **Sim!** Free text input aceita qualquer modelo
- Botão "Test" valida antes de salvar
- Não precisa code change

**"Temos API para listar modelos do gateway?"**
- **Não.** Vercel AI SDK não fornece
- **Solução:** Registry manual + test button
- Admin adiciona modelo → testa → salva

**Exemplo:** GPT-5 sai amanhã
1. Admin acessa `/dashboard/ai-gateway/models`
2. Clica "Add Model"
3. Seleciona Provider: OpenAI
4. Digita Model Name: `gpt-5-ultra`
5. Clica "Test Model"
6. Se funciona: salva
7. Modelo disponível para todos os clientes

---

## 📋 Checklist Final

### Antes de PRD
- [ ] Código legado removido
- [ ] 100% clientes habilitados
- [ ] Teste WhatsApp passou
- [ ] Cache logging funcionando
- [ ] Analytics dashboard mostrando dados
- [ ] Cache configuration UI funcionando
- [ ] .env.production configurado

### Nice to Have (pode ser pós-PRD)
- [ ] Model Registry UI
- [ ] Cache Viewer Dashboard
- [ ] Budget Management UI
- [ ] Cron jobs configurados
- [ ] Load tests passando

---

**Próximo Passo:** Começar pelo **Dia 1 (Cleanup & Habilitar)**

Quer que eu comece implementando a remoção do código legado?
