# 📝 AI Gateway - Resumo de Mudanças

**Data:** 2025-12-13
**Versão:** 2.0 com Tracking Unificado

---

## 🎯 O Que Mudou

### Decisão Crítica: Tracking Unificado

**Problema Original:**
- Chat completions → Rastreado ✅
- Whisper, Vision, Embeddings → **NÃO rastreado** ❌
- Analytics incompleto
- Budget não funciona corretamente

**Nova Solução:**
- **TODAS as APIs** rastreadas na mesma tabela
- Budget **multi-dimensional** por API type
- Analytics **completo e unificado**

---

## 📊 Arquitetura Nova

### 1. Gateway Usage Logs (Modificado)

**ANTES:**
```sql
gateway_usage_logs:
  - provider, model_name
  - input_tokens, output_tokens
  - cost_usd, cost_brl
```

**DEPOIS:**
```sql
gateway_usage_logs:
  - api_type: 'chat' | 'whisper' | 'vision' | 'embeddings' | 'image-gen'
  - provider, model_name
  - input_tokens, output_tokens
  - input_units: INTEGER    -- Whisper (segundos)
  - output_units: INTEGER   -- Vision/Image-gen (imagens)
  - cost_usd, cost_brl
```

---

### 2. Budget System (Multi-Dimensional)

**ANTES:**
```sql
client_budgets:
  - budget_limit: 100000 tokens
  - budget_type: 'tokens'
```

**DEPOIS:**
```sql
-- Budget Total (R$)
client_budgets:
  - total_budget_brl: 100.00
  - current_usage_brl: 45.50

-- Limites por API Type
client_budget_limits:
  - api_type: 'chat' | 'whisper' | 'vision' | 'embeddings'
  - limit_type: 'tokens' | 'minutes' | 'images' | 'requests'
  - limit_value: 50
  - current_usage: 32
```

**Exemplo Plano Free:**
- 💰 Budget Total: R$ 20/mês
- 💬 Chat: 50k tokens/mês
- 🎤 Whisper: 30 min/mês
- 👁️ Vision: 20 imagens/mês
- 🔍 Embeddings: 500 requests/mês

---

## 🔧 Implementação

### Novos Arquivos

1. **`src/lib/ai-gateway/api-tracking.ts`**
   - `logAPIUsage()` - Função unificada para TODAS as APIs
   - `calculateAPICost()` - Custo por API type
   - `incrementBudgets()` - Increment multi-dimensional
   - `checkBudgetLimits()` - Checar limites por API

2. **Migration: `20251213_unified_api_tracking.sql`**
   - ALTER `gateway_usage_logs` (api_type, units)
   - CREATE `client_budget_limits`
   - Functions: increment/reset budgets

3. **`docs/features/ai_gateway/BUDGET_SYSTEM.md`**
   - Documentação completa do sistema
   - Exemplos de configuração por plano
   - Queries de analytics

### Arquivos Modificados

1. **`src/lib/openai.ts`**
   - `transcribeAudio()` → adicionar `logAPIUsage()`
   - `analyzeImage()` → adicionar `logAPIUsage()`
   - `generateEmbedding()` → adicionar `logAPIUsage()`

2. **`src/lib/ai-gateway/usage-tracking.ts`**
   - Renomear `logGatewayUsage()` → `logAPIUsage()`
   - Adicionar suporte para api_type
   - Adicionar cálculo de custos por tipo

---

## 📱 Dashboard UI

### Budget Overview (NOVO)

```typescript
<BudgetDashboard>
  {/* Budget Total */}
  <BudgetCard title="Total" current={45.50} limit={100} unit="BRL" />

  {/* Budget por API */}
  <BudgetCard title="Chat" current={325k} limit={500k} unit="tokens" />
  <BudgetCard title="Whisper" current={120} limit={200} unit="min" />
  <BudgetCard title="Vision" current={45} limit={100} unit="imagens" />
  <BudgetCard title="Embeddings" current={2500} limit={5000} unit="requests" />
</BudgetDashboard>
```

### Analytics Breakdown (NOVO)

```sql
-- Custo por API Type
SELECT
  api_type,
  COUNT(*) as requests,
  SUM(cost_brl) as cost,
  AVG(latency_ms) as avg_latency
FROM gateway_usage_logs
WHERE client_id = 'xxx'
GROUP BY api_type;

-- Resultado:
-- chat      | 1500 | R$ 15,00
-- whisper   | 120  | R$ 3,60
-- vision    | 50   | R$ 2,50
-- embeddings| 2500 | R$ 0,50
-- TOTAL     | 4170 | R$ 21,60
```

---

## 🎯 Benefícios

### 1. Analytics Completo
- ✅ Custo REAL total (incluindo Whisper/Vision)
- ✅ Breakdown por API type
- ✅ Tracking de TODAS as APIs
- ✅ Latência por API type

### 2. Budget Inteligente
- ✅ Limites por API (50 imagens, 130min áudio)
- ✅ Budget total em R$
- ✅ Alertas específicos por API
- ✅ Pause individual ou total

### 3. Flexibilidade
- ✅ Planos customizados por cliente
- ✅ Free: limites baixos
- ✅ Pro: limites altos
- ✅ Enterprise: ilimitado

### 4. Compliance
- ✅ Rastreamento completo para auditoria
- ✅ Custos reais por cliente
- ✅ Billing preciso

---

## 📅 Cronograma Atualizado

### Dia 1 (7-8h) - Tracking Unificado + Cleanup
1. **Implementar Tracking** (3h)
   - Migration
   - api-tracking.ts
   - Atualizar openai.ts

2. **Remover Legado** (2h)
   - Legacy path
   - Código morto

3. **Habilitar 100%** (1h)
   - SQL
   - Sidebar
   - .env

4. **Testar E2E** (1h + 30min)
   - Chat, Whisper, Vision
   - Verificar logs

### Dia 2 (6-7h) - Cache & Analytics
- Cache Config UI
- Analytics Integration
- Cache Logging

### Dia 3 (6-8h) - Model Registry
- Model Registry UI
- Test Model API
- Adicionar novos providers

### Dia 4 (7-8h) - Budget UI
- Budget Management Dashboard
- Budget Configuration
- Cron Jobs

### Dia 5 (4-6h) - Testes & Docs
- E2E tests
- Load tests
- Documentação

---

## 🔄 Migração de Dados

### Dados Históricos

**Opcional:** Migrar dados de `usage_logs` antigo para `gateway_usage_logs`

```sql
INSERT INTO gateway_usage_logs (
  client_id,
  conversation_id,
  phone,
  api_type,
  provider,
  model_name,
  input_tokens,
  output_tokens,
  total_tokens,
  cost_usd,
  cost_brl,
  created_at
)
SELECT
  client_id,
  conversation_id,
  phone,
  'chat' as api_type, -- Assume que dados antigos são chat
  provider,
  model_name,
  input_tokens,
  output_tokens,
  total_tokens,
  cost_usd,
  cost_brl,
  created_at
FROM usage_logs
WHERE created_at >= '2025-01-01'; -- Últimos meses
```

---

## 📚 Documentação Criada

1. **`BUDGET_SYSTEM.md`** - Sistema de budget completo
2. **`PRODUCTION_PLAN.md`** (atualizado) - Cronograma revisado
3. **`CHANGES_SUMMARY.md`** (este arquivo) - Resumo de mudanças

---

## 🚀 Próximos Passos

**AGORA:**
1. Revisar documentação (BUDGET_SYSTEM.md, PRODUCTION_PLAN.md)
2. Aprovar mudanças
3. Começar implementação Dia 1

**Perguntas para decidir:**
- [ ] Migrar dados históricos de `usage_logs`?
- [ ] Configurar budgets padrão por plano agora ou depois?
- [ ] Habilitar pause automático para Free plan?

---

**Pronto para começar?** 🚀
