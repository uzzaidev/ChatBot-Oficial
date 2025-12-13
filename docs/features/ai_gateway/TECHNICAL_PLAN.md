# AI Gateway Integration Plan - ARQUITETURA FINAL

## Objetivo

Implementar integração com **Vercel AI Gateway** no chatbot WhatsApp SaaS multi-tenant, permitindo:

- **UMA Gateway Key COMPARTILHADA** (vck_...) para todos os clientes
- **Keys de Providers COMPARTILHADAS** (OpenAI, Groq, Anthropic, Google)
- **Controle por cliente via BUDGET** (tokens/BRL)
- **Dashboard de métricas** (tokens, custos em BRL, cache performance) visível para cada cliente
- **Seleção de modelos** pelo cliente via interface
- **Sistema de rastreamento de custos** (sem cobrança automática - fase futura)
- **Cache inteligente** e **fallback automático**

---

## ⚠️ Decisões Importantes Tomadas

### 1. **Arquitetura de Keys - SHARED (DECISÃO FINAL)**

✅ **UMA gateway key (`vck_...`) compartilhada por TODOS os clientes**
✅ **Custom API keys dos providers (OpenAI, Groq, etc) compartilhadas**
✅ **Controle multi-tenant via BUDGET por cliente**
✅ **Tracking customizado no banco de dados (multi-tenant)**

**Por que shared keys?**
- Vercel AI Gateway com custom keys = **SEM MARKUP** (grátis!)
- Gateway fornece infraestrutura (cache, fallback, rate limiting)
- Você paga apenas o custo real dos providers (OpenAI, Groq, etc)
- Controle multi-tenant via budget system + tracking customizado
- Dashboard do Vercel mostra uso agregado de TODOS os clientes
- Seu banco de dados rastreia uso individual por `client_id`

**Workflow:**
1. Você cria UMA gateway key no Vercel (`vck_...`)
2. Você configura suas custom API keys (OpenAI, Groq, Anthropic, Google)
3. Todas as keys são armazenadas no Supabase Vault (criptografadas)
4. Sistema busca keys do Vault (cache de 5 minutos)
5. Cada request inclui `client_id` para tracking multi-tenant
6. Budget system controla limite por cliente

### 2. **Providers Habilitados**

- ✅ OpenAI (GPT-4o, GPT-4o-mini) - Já em uso
- ✅ Groq (Llama 3.3 70B) - Já em uso
- ✅ Anthropic (Claude 3.5 Sonnet, Claude 3 Opus) - NOVO
- ✅ Google (Gemini 2.0 Flash) - NOVO

### 3. **Billing**

Dashboard mostra gastos em BRL para cada cliente, mas sem cobrança automática (você cobra manualmente). Sistema de cobrança automática fica para Fase 2.

**Como funciona:**
- Vercel dashboard: uso agregado de todos os clientes
- Seu banco de dados: uso individual por cliente (`gateway_usage_logs`)
- Conversão automática USD → BRL com Exchange Rate API
- Budget alerts quando cliente atinge 80%/90%/100%

### 4. **Gateway Benefits**

- ✅ Cache grátis (economia de 70% em requests repetidos)
- ✅ Fallback automático entre providers
- ✅ Rate limiting unificado
- ✅ Telemetria rica (latência, tokens, cache hits)
- ✅ ZERO markup sobre preços dos providers

---

## 🗄️ FASE 1: Database Schema (Semana 1-2)

### Tabelas a Criar:

#### 1. **`shared_gateway_config`** ⭐ NOVA ARQUITETURA

Config global compartilhada - APENAS 1 REGISTRO

```sql
CREATE TABLE IF NOT EXISTS shared_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gateway key (vck_...) - COMPARTILHADA por todos os clientes
  gateway_api_key_secret_id UUID REFERENCES vault.secrets(id),

  -- Provider API keys (custom keys) - COMPARTILHADAS
  openai_api_key_secret_id UUID REFERENCES vault.secrets(id),
  groq_api_key_secret_id UUID REFERENCES vault.secrets(id),
  anthropic_api_key_secret_id UUID REFERENCES vault.secrets(id),
  google_api_key_secret_id UUID REFERENCES vault.secrets(id),

  -- Cache settings (global)
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_seconds INTEGER DEFAULT 3600,

  -- Default fallback chain (global)
  -- Example: ["openai/gpt-4o-mini", "groq/llama-3.3-70b-versatile"]
  default_fallback_chain JSONB DEFAULT '[]'::jsonb,

  -- Rate limits (global)
  max_requests_per_minute INTEGER DEFAULT 1000,
  max_tokens_per_minute INTEGER DEFAULT 500000,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ONE record allowed in this table
CREATE UNIQUE INDEX idx_shared_gateway_config_singleton
  ON shared_gateway_config ((true));
```

#### 2. **`ai_models_registry`**

Catálogo de modelos com pricing (MANTIDO)

```sql
CREATE TABLE ai_models_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  gateway_identifier TEXT NOT NULL UNIQUE,
  capabilities JSONB NOT NULL,
  context_window INTEGER,
  max_output_tokens INTEGER,
  input_price_per_million NUMERIC(10, 6) NOT NULL,
  output_price_per_million NUMERIC(10, 6) NOT NULL,
  cached_input_price_per_million NUMERIC(10, 6),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_name)
);
```

#### 3. **`gateway_usage_logs`**

Logs de uso com métricas do gateway - MULTI-TENANT

```sql
CREATE TABLE gateway_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id), -- ⭐ MULTI-TENANT
  conversation_id UUID REFERENCES conversations(id),
  phone TEXT NOT NULL,
  request_id TEXT,
  model_registry_id UUID REFERENCES ai_models_registry(id),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  was_cached BOOLEAN DEFAULT false,
  was_fallback BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  cost_usd NUMERIC(12, 8),
  cost_brl NUMERIC(12, 2),
  usd_to_brl_rate NUMERIC(8, 4),
  metadata JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gateway_usage_logs_client_id
  ON gateway_usage_logs(client_id);
CREATE INDEX idx_gateway_usage_logs_created_at
  ON gateway_usage_logs(created_at DESC);
```

#### 4. **`gateway_cache_performance`**

Métricas agregadas de cache - MULTI-TENANT

```sql
CREATE TABLE gateway_cache_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id), -- ⭐ MULTI-TENANT
  date DATE NOT NULL,
  hour INTEGER,
  total_requests INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate NUMERIC(5, 2),
  tokens_saved INTEGER NOT NULL DEFAULT 0,
  cost_saved_usd NUMERIC(10, 4),
  cost_saved_brl NUMERIC(10, 2),
  avg_latency_cached_ms INTEGER,
  avg_latency_uncached_ms INTEGER,
  latency_improvement_pct NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, date, hour)
);
```

#### 5. **`client_budgets`**

Budget control por cliente

```sql
CREATE TABLE client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),

  -- Budget Configuration
  budget_type TEXT NOT NULL, -- 'tokens' | 'brl' | 'usd'
  budget_limit NUMERIC NOT NULL,
  budget_period TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly'

  -- Current Usage (auto-updated)
  current_usage NUMERIC DEFAULT 0,
  usage_percentage NUMERIC(5, 2) GENERATED ALWAYS AS
    (CASE WHEN budget_limit > 0 THEN (current_usage / budget_limit * 100) ELSE 0 END) STORED,

  -- Period tracking
  period_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_reset_at TIMESTAMPTZ NOT NULL,

  -- Alerts
  alert_threshold_80 BOOLEAN DEFAULT true,
  alert_threshold_90 BOOLEAN DEFAULT true,
  alert_threshold_100 BOOLEAN DEFAULT true,
  pause_at_limit BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,

  -- Notifications
  notification_email TEXT,
  notification_webhook TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);
```

### Modificações em Tabelas Existentes:

```sql
-- Adicionar coluna na tabela clients (feature flag por cliente)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS use_ai_gateway BOOLEAN DEFAULT false;

-- NOTA: NÃO precisamos de gateway_api_key_secret_id por cliente
-- Keys são compartilhadas na tabela shared_gateway_config
```

### Seed Data para `ai_models_registry`:

```sql
INSERT INTO ai_models_registry (provider, model_name, gateway_identifier, capabilities, context_window, max_output_tokens, input_price_per_million, output_price_per_million, is_active, description) VALUES

-- OpenAI
('openai', 'gpt-4o', 'openai/gpt-4o', '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb, 128000, 16384, 2.50, 10.00, true, 'OpenAI GPT-4o - Multimodal flagship model'),
('openai', 'gpt-4o-mini', 'openai/gpt-4o-mini', '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb, 128000, 16384, 0.150, 0.600, true, 'OpenAI GPT-4o Mini - Cost-effective multimodal'),

-- Groq
('groq', 'llama-3.3-70b-versatile', 'groq/llama-3.3-70b-versatile', '{"text": true, "tools": true, "streaming": true}'::jsonb, 131072, 32768, 0.590, 0.790, true, 'Meta Llama 3.3 70B on Groq - Fast inference'),

-- Anthropic
('anthropic', 'claude-3-5-sonnet-20241022', 'anthropic/claude-3-5-sonnet-20241022', '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb, 200000, 8192, 3.00, 15.00, true, 'Anthropic Claude 3.5 Sonnet'),
('anthropic', 'claude-3-opus-20240229', 'anthropic/claude-3-opus-20240229', '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb, 200000, 4096, 15.00, 75.00, true, 'Anthropic Claude 3 Opus'),

-- Google
('google', 'gemini-2.0-flash-exp', 'google/gemini-2.0-flash-exp', '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb, 1000000, 8192, 0.00, 0.00, true, 'Google Gemini 2.0 Flash');
```

---

## 🔧 FASE 2: Backend Core (Semana 3-4)

### Arquivos a Criar:

#### `src/lib/ai-gateway/index.ts`

Interface unificada para chamadas AI.

**Função principal:**
```typescript
export const callAI = async (config: AICallConfig): Promise<AIResponse> => {
  const startTime = Date.now()

  // Check if gateway should be used (env var + client flag)
  const useGateway = await shouldUseGateway(config.clientId)

  if (useGateway) {
    // Get SHARED gateway configuration
    const gatewayConfig = await getSharedGatewayConfig() // ⭐ SHARED!

    if (!gatewayConfig) {
      console.warn('[AI Gateway] Gateway enabled but no config found')
      return await callAIDirectly(config, startTime)
    }

    return await callAIViaGateway(config, gatewayConfig, startTime)
  } else {
    return await callAIDirectly(config, startTime) // Legacy SDK
  }
}
```

**Extração de telemetria:**
```typescript
const result = await generateText({
  model: providerInstance(primaryModel),
  messages,
  tools,
  experimental_telemetry: { isEnabled: true }, // ✅ Enable
})

// ✅ Extract gateway headers
const headers = result.response?.headers || {}
const wasCached = headers['x-vercel-cache'] === 'HIT'
const actualProvider = headers['x-vercel-ai-provider'] || provider
const actualModel = headers['x-vercel-ai-model'] || primaryModel
const requestId = headers['x-vercel-ai-request-id']
```

#### `src/lib/ai-gateway/config.ts` ⭐ REESCRITO

Helper para buscar configuração COMPARTILHADA.

```typescript
let cachedConfig: SharedGatewayConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const getSharedGatewayConfig = async (): Promise<SharedGatewayConfig | null> => {
  // Check 5-minute cache
  const now = Date.now()
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig
  }

  const supabase = createServerClient()

  // Fetch shared config (only 1 record exists)
  const { data: config } = await supabase
    .from('shared_gateway_config')
    .select('*')
    .single()

  if (!config) return null

  // Decrypt ALL keys from Vault
  const gatewayApiKey = await decryptSecret(config.gateway_api_key_secret_id)
  const openaiKey = await decryptSecret(config.openai_api_key_secret_id)
  const groqKey = await decryptSecret(config.groq_api_key_secret_id)
  // ... etc

  const sharedConfig = {
    gatewayApiKey,
    providerKeys: { openai: openaiKey, groq: groqKey, ... },
    cacheEnabled: config.cache_enabled,
    defaultFallbackChain: config.default_fallback_chain,
    ...
  }

  // Update cache
  cachedConfig = sharedConfig
  cacheTimestamp = now

  return sharedConfig
}

export const shouldUseGateway = async (clientId: string): Promise<boolean> => {
  // Level 1: Global env var
  if (process.env.ENABLE_AI_GATEWAY !== 'true') return false

  // Level 2: Client flag
  const { data } = await supabase
    .from('clients')
    .select('use_ai_gateway')
    .eq('id', clientId)
    .single()

  return data?.use_ai_gateway === true
}
```

**Workflow SIMPLIFICADO:**
1. Sistema chama `getSharedGatewayConfig()` (cache de 5 minutos)
2. Busca 1 único registro de `shared_gateway_config`
3. Decripta todas as keys do Vault
4. Retorna config compartilhada para TODOS os clientes

#### `src/lib/ai-gateway/providers.ts`

Factory functions para providers.

**KEY CHANGE:** NO baseURL needed (AI SDK auto-detects `vck_...`)

```typescript
export const getGatewayProvider = (provider: SupportedProvider, apiKey: string) => {
  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey, // vck_... key - AI SDK routes automatically!
        // NO baseURL needed!
      })

    case 'anthropic':
      return createAnthropic({ apiKey })

    case 'groq':
      return createGroq({ apiKey })

    case 'google':
      return createGoogleGenerativeAI({ apiKey })
  }
}
```

#### `src/lib/ai-gateway/usage-tracking.ts`

Tracking aprimorado com multi-tenant.

```typescript
export const logGatewayUsage = async (params: {
  clientId: string // ⭐ MULTI-TENANT
  conversationId?: string
  phone: string
  provider: string
  modelName: string
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  wasCached: boolean
  latencyMs: number
  // ...
}) => {
  // 1. Get model pricing from ai_models_registry
  const modelData = await getModelPricing(provider, modelName)

  // 2. Calculate cost in USD
  const inputCostUSD = (inputTokens / 1_000_000) * modelData.input_price
  const outputCostUSD = (outputTokens / 1_000_000) * modelData.output_price

  // 3. Convert to BRL
  const usdToBrlRate = await getExchangeRate('USD', 'BRL')
  const costBRL = await convertUSDtoBRL(totalCostUSD)

  // 4. Insert to gateway_usage_logs
  await supabase.from('gateway_usage_logs').insert({
    client_id: clientId, // ⭐ Track por cliente
    provider,
    model_name: modelName,
    total_tokens: totalTokens,
    cost_usd: totalCostUSD,
    cost_brl: costBRL,
    was_cached: wasCached,
    ...
  })

  // 5. Update client budget
  await incrementBudgetUsage(clientId, totalTokens, costBRL)
}
```

#### `src/lib/currency.ts`

Conversão USD → BRL com cache de 24h.

```typescript
export const getExchangeRate = async (from: string, to: string): Promise<number> => {
  // Check cache (24h)
  // Fetch from Exchange Rate API
  // Fallback: 1 USD = 5.00 BRL
}

export const convertUSDtoBRL = async (usd: number): Promise<number> => {
  const rate = await getExchangeRate('USD', 'BRL')
  return usd * rate
}
```

### Arquivos a Modificar:

#### `src/nodes/generateAIResponse.ts`

Integrar abstração layer.

```typescript
// NEW: Check if gateway enabled
const useGateway = await shouldUseGateway(config.id)

if (useGateway) {
  // Convert to CoreMessage format
  const coreMessages: CoreMessage[] = messages.map(...)

  // Call via SHARED gateway
  const result = await callAI({
    clientId: config.id, // ⭐ Pass client_id for multi-tenant tracking
    clientConfig: { ... },
    messages: coreMessages,
    tools: { ... }
  })

  // Log usage (multi-tenant)
  await logGatewayUsage({
    clientId: config.id, // ⭐ Track por cliente
    ...result.usage
  })

  return convertedResponse
}

// LEGACY: Direct SDK path (unchanged)
if (config.primaryProvider === 'openai') { ... }
```

---

## 🎨 FASE 3: Frontend Dashboard (Semana 5-6)

### Páginas:

#### `/dashboard/ai-gateway` - Configuração Global (ADMIN ONLY)

**IMPORTANTE:** Esta página é para ADMIN configurar as keys COMPARTILHADAS.

- Input Gateway API Key (`vck_...`) - UMA key para todos
- Input OpenAI API Key - UMA key para todos
- Input Groq API Key - UMA key para todos
- Input Anthropic API Key (opcional)
- Input Google API Key (opcional)
- Cache Settings (global)
- Fallback Chain Builder (global)
- Test Gateway button

#### `/dashboard/ai-gateway/metrics` - Métricas Gerais

Dashboard agregado de todos os clientes (admin view).

#### `/dashboard/analytics` - ATUALIZAR (Per-Client View)

**Migração automática para dados do gateway:**

1. **Substituir source:** `usage_logs` → `gateway_usage_logs`
2. **Filtrar por cliente:** `WHERE client_id = current_client`
3. **Adicionar métricas:**
   - Latency P50/P95/P99
   - Cache hit rate com economia R$
   - Fallback events
   - Usage by conversation (drill-down)

4. **Budget Progress Bar no topo** (NOVO)

### Sistema de Budget:

**Configuração em `/dashboard/settings`:**

```typescript
<Card>
  <CardTitle>AI Usage Budget</CardTitle>
  <CardContent>
    {/* Budget Type */}
    <Select value={budgetType}>
      <option value="tokens">Tokens</option>
      <option value="brl">Reais (BRL)</option>
    </Select>

    {/* Budget Limit */}
    <Input type="number" label="Budget Limit" />

    {/* Budget Period */}
    <Select value={budgetPeriod}>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </Select>

    {/* Alerts */}
    <Checkbox checked={alert80} label="Alert at 80%" />
    <Checkbox checked={alert90} label="Alert at 90%" />
    <Checkbox checked={alert100} label="Alert at 100%" />
    <Checkbox checked={pauseAtLimit} label="Auto-pause at 100%" />

    {/* Progress Bar */}
    <ProgressBar
      current={currentUsage}
      limit={budgetLimit}
      percentage={usagePercentage}
    />
  </CardContent>
</Card>
```

---

## 🌐 FASE 4: API Routes (Semana 7-8)

### Rotas:

- **`/api/ai-gateway/config`** - CRUD shared config (admin only)
- **`/api/ai-gateway/models`** - Listagem modelos
- **`/api/ai-gateway/metrics`** - Métricas agregadas
- **`/api/budget/config`** - CRUD budget por cliente
- **`/api/budget/current-usage`** - Uso atual do período
- **`/api/analytics/gateway`** - Analytics filtrado por cliente
- **`/api/cron/check-budget-alerts`** - Alertas budget (hourly)
- **`/api/cron/reset-budget-periods`** - Reset budgets (daily)

---

## 🧪 FASE 5: Testes (Semana 9-10)

- Unit tests (backend core)
- Integration tests (E2E WhatsApp)
- Load tests (50 users, 5 min)

---

## 🚀 FASE 6: Migração Gradual (Semana 11-16)

**Feature Flags (2 níveis):**
1. `ENABLE_AI_GATEWAY=true` (env var - global)
2. `clients.use_ai_gateway=true` (DB - per client)

**Timeline:**
- Semana 11-12: Beta (1 cliente interno + 5 beta clients)
- Semana 13: 25% rollout
- Semana 14: 50% rollout
- Semana 15: 75% rollout
- Semana 16: 100% rollout

---

## 💰 Estimativa de Custos

### Desenvolvimento:
- Backend: 40h × $50 = **$2,000**
- Frontend: 30h × $50 = **$1,500**
- Testes: 20h × $40 = **$800**
- Docs: 10h × $30 = **$300**
- **Total:** **$4,600**

### Infraestrutura Mensal:
- **Vercel AI Gateway:** Pay-as-you-go (SEM markup - custom keys!)
  - Você paga apenas OpenAI + Groq + Anthropic + Google
  - Cache reduz 70% do custo real
- Supabase: +10MB (free tier)
- Exchange Rate API: Free (1500 req/mês)
- **Total:** **~$0/mês fixo** + usage variável

### Economia Esperada:
- Cache savings: **70%** em 30% requests = **21%** total
- Fallback automático: **~5%**
- **Total:** **~25-30% redução** em custos AI

### ROI:
Com 20 clientes gastando média de $500/mês:
- Custo atual: $10,000/mês
- Com gateway + cache: $7,000/mês
- **Economia:** $3,000/mês
- **ROI:** 4,600 / 3,000 = **1.5 meses** ✅

---

## 📁 Arquivos Críticos

### Database:
- `supabase/migrations/YYYYMMDD_simplify_to_shared_gateway_config.sql` ⭐
- `supabase/migrations/YYYYMMDD_create_budget_tables.sql`
- `supabase/migrations/YYYYMMDD_seed_ai_models_registry.sql`

### Backend Core:
- `src/lib/ai-gateway/index.ts` ⭐
- `src/lib/ai-gateway/config.ts` ⭐ (reescrito)
- `src/lib/ai-gateway/providers.ts`
- `src/lib/ai-gateway/usage-tracking.ts`
- `src/lib/currency.ts`
- `src/nodes/generateAIResponse.ts` (modificado)

### API Routes:
- `src/app/api/ai-gateway/config/route.ts`
- `src/app/api/budget/config/route.ts`
- `src/app/api/analytics/gateway/route.ts`

### Frontend:
- `src/app/dashboard/ai-gateway/page.tsx` (admin config)
- `src/app/dashboard/analytics/page.tsx` (atualizar)
- `src/components/BudgetConfiguration.tsx`

---

## 🎯 Próximos Passos

**Setup (VOCÊ precisa fazer):**
1. Criar conta Vercel (se não tem)
2. Acessar AI Gateway → Create API Key
3. Copiar key (`vck_...`)
4. Obter custom keys (OpenAI, Groq, Anthropic, Google)
5. Seguir `SETUP_GUIDE.md`

**Implementação:**
1. Database (Semana 1-2) - migrations + seed
2. Backend (Semana 3-4) - shared config + tracking
3. Frontend (Semana 5-6) - admin config + budget UI
4. API Routes (Semana 7-8) - budget + analytics
5. Testes (Semana 9-10)
6. Rollout (Semana 11-16)

---

**Versão:** 2.0 (Arquitetura Final - Shared Keys)
**Data:** 2025-12-12
**Status:** Pronto para implementação
