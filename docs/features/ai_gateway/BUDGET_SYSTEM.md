# 💰 Budget System 2.0 - Multi-Dimensional Tracking

**Data:** 2025-12-13
**Versão:** 2.0 (Multi-API Support)

---

## 🎯 Objetivo

Sistema de budget **multi-dimensional** que rastreia uso de **TODAS** as APIs de IA:
- 💬 **Chat Completions** (tokens)
- 🎤 **Whisper** (minutos de áudio)
- 👁️ **Vision** (número de imagens)
- 🔍 **Embeddings** (número de requests)
- 🖼️ **Image Generation** (número de imagens) - futuro

**Com limites por tipo** e budget total em R$.

---

## 📊 Estrutura do Sistema

### 1. Budget Total (R$)

**Tabela:** `client_budgets`

```sql
CREATE TABLE client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) UNIQUE,

  -- Budget total em BRL
  total_budget_brl DECIMAL(10,2) DEFAULT 100.00,
  current_usage_brl DECIMAL(10,2) DEFAULT 0.00,
  usage_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_budget_brl > 0
      THEN (current_usage_brl / total_budget_brl) * 100
      ELSE 0
    END
  ) STORED,

  -- Período
  budget_period TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  period_start_at TIMESTAMPTZ DEFAULT NOW(),
  next_reset_at TIMESTAMPTZ,

  -- Alertas
  alert_80_sent BOOLEAN DEFAULT false,
  alert_90_sent BOOLEAN DEFAULT false,
  alert_100_sent BOOLEAN DEFAULT false,

  -- Pausa automática
  pause_at_limit BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Limites por API Type

**Tabela:** `client_budget_limits`

```sql
CREATE TABLE client_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),

  -- Tipo de API
  api_type TEXT NOT NULL, -- 'chat', 'whisper', 'vision', 'embeddings', 'image-gen'

  -- Tipo de limite e valor
  limit_type TEXT NOT NULL, -- 'tokens', 'minutes', 'images', 'requests'
  limit_value INTEGER NOT NULL, -- Ex: 50 (50 imagens)
  current_usage INTEGER DEFAULT 0,

  -- Porcentagem de uso
  usage_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN limit_value > 0
      THEN (current_usage::DECIMAL / limit_value) * 100
      ELSE 0
    END
  ) STORED,

  -- Período (herda do budget geral ou customizado)
  period TEXT DEFAULT 'monthly',
  period_start_at TIMESTAMPTZ DEFAULT NOW(),
  next_reset_at TIMESTAMPTZ,

  -- Alertas específicos para este tipo
  alert_80_sent BOOLEAN DEFAULT false,
  alert_90_sent BOOLEAN DEFAULT false,
  alert_100_sent BOOLEAN DEFAULT false,

  -- Ação ao atingir limite
  pause_api_at_limit BOOLEAN DEFAULT false, -- Pausa só essa API
  is_paused BOOLEAN DEFAULT false,

  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, api_type)
);
```

---

### 3. Tracking de Uso (Unificado)

**Tabela:** `gateway_usage_logs` (modificada)

```sql
ALTER TABLE gateway_usage_logs
ADD COLUMN IF NOT EXISTS api_type TEXT DEFAULT 'chat',
ADD COLUMN IF NOT EXISTS input_units INTEGER, -- Para Whisper (segundos), Vision (imagens)
ADD COLUMN IF NOT EXISTS output_units INTEGER; -- Para Image Gen (imagens geradas)

-- Tipos possíveis:
-- 'chat' - Chat completions (input_tokens, output_tokens)
-- 'whisper' - Audio transcription (input_units = segundos)
-- 'vision' - Image analysis (output_units = número de imagens)
-- 'embeddings' - Text embeddings (input_tokens)
-- 'image-gen' - Image generation (output_units = imagens geradas)
```

---

## 🎮 Exemplos de Configuração por Plano

### Plano Free
```sql
-- Budget total: R$ 20/mês
INSERT INTO client_budgets (client_id, total_budget_brl, budget_period, pause_at_limit)
VALUES ('client-uuid', 20.00, 'monthly', true);

-- Limites por API
INSERT INTO client_budget_limits (client_id, api_type, limit_type, limit_value, pause_api_at_limit)
VALUES
  ('client-uuid', 'chat', 'tokens', 50000, true),       -- 50k tokens/mês
  ('client-uuid', 'whisper', 'minutes', 30, true),      -- 30 min/mês
  ('client-uuid', 'vision', 'images', 20, true),        -- 20 imagens/mês
  ('client-uuid', 'embeddings', 'requests', 500, true); -- 500 requests/mês
```

### Plano Basic
```sql
-- Budget total: R$ 100/mês
INSERT INTO client_budgets (client_id, total_budget_brl, budget_period, pause_at_limit)
VALUES ('client-uuid', 100.00, 'monthly', true);

-- Limites por API
INSERT INTO client_budget_limits (client_id, api_type, limit_type, limit_value, pause_api_at_limit)
VALUES
  ('client-uuid', 'chat', 'tokens', 500000, true),      -- 500k tokens/mês
  ('client-uuid', 'whisper', 'minutes', 200, true),     -- 200 min/mês
  ('client-uuid', 'vision', 'images', 100, true),       -- 100 imagens/mês
  ('client-uuid', 'embeddings', 'requests', 5000, true); -- 5k requests/mês
```

### Plano Pro
```sql
-- Budget total: R$ 500/mês
INSERT INTO client_budgets (client_id, total_budget_brl, budget_period, pause_at_limit)
VALUES ('client-uuid', 500.00, 'monthly', false); -- Não pausa

-- Limites por API (soft limits - apenas alertas)
INSERT INTO client_budget_limits (client_id, api_type, limit_type, limit_value, pause_api_at_limit)
VALUES
  ('client-uuid', 'chat', 'tokens', 5000000, false),     -- 5M tokens/mês
  ('client-uuid', 'whisper', 'minutes', 1000, false),    -- 1000 min/mês
  ('client-uuid', 'vision', 'images', 500, false),       -- 500 imagens/mês
  ('client-uuid', 'embeddings', 'requests', 50000, false); -- 50k requests/mês
```

### Plano Enterprise
```sql
-- Budget ilimitado (muito alto)
INSERT INTO client_budgets (client_id, total_budget_brl, budget_period, pause_at_limit)
VALUES ('client-uuid', 999999.00, 'monthly', false);

-- Sem limites por API (ou limites muito altos apenas para monitoramento)
INSERT INTO client_budget_limits (client_id, api_type, limit_type, limit_value, enabled)
VALUES
  ('client-uuid', 'chat', 'tokens', 999999999, false),      -- Ilimitado
  ('client-uuid', 'whisper', 'minutes', 999999, false),     -- Ilimitado
  ('client-uuid', 'vision', 'images', 999999, false),       -- Ilimitado
  ('client-uuid', 'embeddings', 'requests', 999999, false); -- Ilimitado
```

---

## 🔧 Funções de Tracking

### 1. Log de Uso Unificado

**Arquivo:** `src/lib/ai-gateway/api-tracking.ts`

```typescript
export type APIType = 'chat' | 'whisper' | 'vision' | 'embeddings' | 'image-gen'

export interface LogAPIUsageParams {
  clientId: string
  conversationId?: string
  phone?: string
  apiType: APIType
  provider: string
  modelName: string

  // Para chat/embeddings
  inputTokens?: number
  outputTokens?: number

  // Para whisper (segundos de áudio)
  // Para vision (número de imagens analisadas)
  // Para image-gen (número de imagens geradas)
  inputUnits?: number
  outputUnits?: number

  latencyMs: number
  wasCached?: boolean
  wasFallback?: boolean
  metadata?: any
}

export const logAPIUsage = async (params: LogAPIUsageParams) => {
  const {
    clientId,
    apiType,
    inputTokens = 0,
    outputTokens = 0,
    inputUnits = 0,
    outputUnits = 0,
  } = params

  // 1. Calcular custo em USD
  const costUSD = calculateAPICost(params)

  // 2. Converter para BRL
  const costBRL = await convertUSDtoBRL(costUSD)

  // 3. Inserir log
  await supabase.from('gateway_usage_logs').insert({
    client_id: clientId,
    conversation_id: params.conversationId,
    phone: params.phone,
    api_type: apiType,
    provider: params.provider,
    model_name: params.modelName,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    input_units: inputUnits,
    output_units: outputUnits,
    cost_usd: costUSD,
    cost_brl: costBRL,
    latency_ms: params.latencyMs,
    was_cached: params.wasCached || false,
    was_fallback: params.wasFallback || false,
    metadata: params.metadata,
  })

  // 4. Incrementar budgets
  await incrementBudgets(clientId, apiType, {
    costBRL,
    tokens: inputTokens + outputTokens,
    minutes: apiType === 'whisper' ? Math.ceil(inputUnits / 60) : 0,
    images: apiType === 'vision' ? outputUnits : (apiType === 'image-gen' ? outputUnits : 0),
    requests: apiType === 'embeddings' ? 1 : 0,
  })

  // 5. Checar limites
  await checkBudgetLimits(clientId, apiType)
}
```

---

### 2. Cálculo de Custo por API

```typescript
const calculateAPICost = (params: LogAPIUsageParams): number => {
  const { apiType, modelName, inputTokens = 0, outputTokens = 0, inputUnits = 0, outputUnits = 0 } = params

  // Preços OpenAI (atualizar conforme necessário)
  const pricing = {
    chat: {
      'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
      'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    },
    whisper: {
      'whisper-1': 0.006 / 60, // $0.006 por minuto
    },
    vision: {
      'gpt-4o': 0.01275 / 1000, // Por 1k tokens + $0.00765 por imagem
    },
    embeddings: {
      'text-embedding-3-small': 0.00002 / 1000,
      'text-embedding-3-large': 0.00013 / 1000,
    },
  }

  switch (apiType) {
    case 'chat':
      const chatPricing = pricing.chat[modelName] || pricing.chat['gpt-4o-mini']
      return (inputTokens * chatPricing.input) + (outputTokens * chatPricing.output)

    case 'whisper':
      return inputUnits * pricing.whisper['whisper-1'] // inputUnits = segundos

    case 'vision':
      const imageCost = outputUnits * 0.00765 // Por imagem
      const tokensCost = (inputTokens + outputTokens) * pricing.vision['gpt-4o']
      return imageCost + tokensCost

    case 'embeddings':
      const embPricing = pricing.embeddings[modelName] || pricing.embeddings['text-embedding-3-small']
      return inputTokens * embPricing

    default:
      return 0
  }
}
```

---

### 3. Incrementar Budgets

```typescript
const incrementBudgets = async (
  clientId: string,
  apiType: APIType,
  usage: {
    costBRL: number
    tokens?: number
    minutes?: number
    images?: number
    requests?: number
  }
) => {
  const supabase = createServerClient()

  // 1. Incrementar budget total (BRL)
  await supabase.rpc('increment_total_budget', {
    p_client_id: clientId,
    p_cost_brl: usage.costBRL,
  })

  // 2. Incrementar limite específico da API
  const limitType = {
    chat: 'tokens',
    whisper: 'minutes',
    vision: 'images',
    embeddings: 'requests',
    'image-gen': 'images',
  }[apiType]

  const incrementValue = {
    tokens: usage.tokens || 0,
    minutes: usage.minutes || 0,
    images: usage.images || 0,
    requests: usage.requests || 0,
  }[limitType]

  await supabase.rpc('increment_api_limit', {
    p_client_id: clientId,
    p_api_type: apiType,
    p_increment: incrementValue,
  })
}
```

---

### 4. Checar Limites e Pausar

```typescript
const checkBudgetLimits = async (clientId: string, apiType: APIType) => {
  const supabase = createServerClient()

  // 1. Checar budget total
  const { data: totalBudget } = await supabase
    .from('client_budgets')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (totalBudget && totalBudget.usage_percentage >= 100 && totalBudget.pause_at_limit) {
    // Pausar TUDO
    await supabase
      .from('client_budgets')
      .update({ is_paused: true })
      .eq('client_id', clientId)

    await sendBudgetAlert(clientId, 'total', 100)
  }

  // 2. Checar limite específico da API
  const { data: apiLimit } = await supabase
    .from('client_budget_limits')
    .select('*')
    .eq('client_id', clientId)
    .eq('api_type', apiType)
    .single()

  if (apiLimit && apiLimit.usage_percentage >= 100 && apiLimit.pause_api_at_limit) {
    // Pausar APENAS essa API
    await supabase
      .from('client_budget_limits')
      .update({ is_paused: true })
      .eq('id', apiLimit.id)

    await sendBudgetAlert(clientId, apiType, 100)
  }
}
```

---

## 📱 Dashboard UI

### Budget Overview Card

```typescript
<BudgetOverview>
  {/* Budget Total */}
  <BudgetCard
    title="Budget Total"
    current={45.50}
    limit={100.00}
    unit="BRL"
    percentage={45.5}
    color={getColor(45.5)} // green/yellow/orange/red
  />

  {/* Budget por API */}
  <BudgetCard
    title="Chat"
    current={325000}
    limit={500000}
    unit="tokens"
    percentage={65}
  />

  <BudgetCard
    title="Whisper"
    current={120}
    limit={200}
    unit="min"
    percentage={60}
  />

  <BudgetCard
    title="Vision"
    current={45}
    limit={100}
    unit="imagens"
    percentage={45}
  />

  <BudgetCard
    title="Embeddings"
    current={2500}
    limit={5000}
    unit="requests"
    percentage={50}
  />
</BudgetOverview>
```

---

## 🔄 Reset de Períodos

**Cron Job:** `/api/cron/reset-budget-periods`

```typescript
export async function GET() {
  const supabase = createServerClient()

  // Reset budgets totais
  await supabase.rpc('reset_expired_budgets')

  // Reset limites por API
  await supabase.rpc('reset_expired_api_limits')

  return NextResponse.json({ success: true })
}
```

**Functions SQL:**

```sql
CREATE OR REPLACE FUNCTION reset_expired_budgets()
RETURNS void AS $$
BEGIN
  UPDATE client_budgets
  SET
    current_usage_brl = 0,
    alert_80_sent = false,
    alert_90_sent = false,
    alert_100_sent = false,
    is_paused = false,
    period_start_at = NOW(),
    next_reset_at = CASE budget_period
      WHEN 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN 'weekly' THEN NOW() + INTERVAL '1 week'
      WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
    END
  WHERE next_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_expired_api_limits()
RETURNS void AS $$
BEGIN
  UPDATE client_budget_limits
  SET
    current_usage = 0,
    alert_80_sent = false,
    alert_90_sent = false,
    alert_100_sent = false,
    is_paused = false,
    period_start_at = NOW(),
    next_reset_at = CASE period
      WHEN 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN 'weekly' THEN NOW() + INTERVAL '1 week'
      WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
    END
  WHERE next_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Analytics Queries

### Uso Total por Cliente

```sql
SELECT
  client_id,
  api_type,
  COUNT(*) as total_requests,
  SUM(total_tokens) as total_tokens,
  SUM(input_units) as total_input_units,
  SUM(output_units) as total_output_units,
  SUM(cost_brl) as total_cost_brl,
  AVG(latency_ms) as avg_latency_ms
FROM gateway_usage_logs
WHERE client_id = 'client-uuid'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY client_id, api_type;
```

### Top Clientes por Custo

```sql
SELECT
  c.name,
  SUM(gul.cost_brl) as total_cost,
  COUNT(*) as total_requests,
  SUM(CASE WHEN gul.api_type = 'chat' THEN gul.cost_brl ELSE 0 END) as chat_cost,
  SUM(CASE WHEN gul.api_type = 'whisper' THEN gul.cost_brl ELSE 0 END) as whisper_cost,
  SUM(CASE WHEN gul.api_type = 'vision' THEN gul.cost_brl ELSE 0 END) as vision_cost,
  SUM(CASE WHEN gul.api_type = 'embeddings' THEN gul.cost_brl ELSE 0 END) as embeddings_cost
FROM gateway_usage_logs gul
JOIN clients c ON c.id = gul.client_id
WHERE gul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name
ORDER BY total_cost DESC
LIMIT 10;
```

---

## 🎯 Benefícios

1. **Controle Granular**
   - Limites por tipo de API
   - Budget total em R$
   - Pausar API específica ou tudo

2. **Flexibilidade por Plano**
   - Free: limites baixos
   - Pro: limites altos
   - Enterprise: ilimitado

3. **Analytics Completo**
   - Tracking de TODAS as APIs
   - Custo real total
   - Breakdown por tipo

4. **Alerts Inteligentes**
   - 80%/90%/100% por API
   - 80%/90%/100% total
   - Pause automático

---

## 🚀 Implementação

**Ordem:**
1. Migration: Adicionar colunas em `gateway_usage_logs`
2. Migration: Criar tabela `client_budget_limits`
3. Migration: Atualizar `client_budgets`
4. Criar `api-tracking.ts`
5. Atualizar todas as funções em `openai.ts`
6. Criar UI de budget management
7. Criar cron jobs

**Tempo estimado:** 6-8 horas

---

**Próximo:** Criar migrations e implementar tracking!
