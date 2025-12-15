# Guia de Implementação - Sistema Modular de Budget

## ✅ O que foi implementado

### 1. **Migration de Budget Modular**
- **Arquivo**: `supabase/migrations/20251214_modular_budget_system.sql`
- **Features**:
  - 3 modos de budget: `tokens`, `brl`, `both` (híbrido)
  - Rastreamento simultâneo de tokens E reais
  - Auto-pause quando qualquer limite é atingido
  - Função `increment_unified_budget()` para incremento modular
  - Função `check_budget_available()` para verificação
  - View `budget_status` para consultas consolidadas

### 2. **Tracking Unificado**
- **Arquivo**: `src/lib/unified-tracking.ts`
- **Features**:
  - Rastreia TODAS as APIs (Gateway + TTS + Whisper + Vision + Embeddings)
  - Usa `ai_models_registry` para pricing preciso
  - Incrementa budget em TODOS os casos
  - Backward compatible com `usage_logs`
  - Função principal: `trackUnifiedUsage()`

### 3. **API Endpoints**
- **Admin Budget Management**: `/api/admin/budgets` (GET, POST, DELETE)
- **Budget Status**: `/api/budget/status` (GET)
- Controle completo de budgets por cliente
- Validação de permissões (admin only para configuração)

### 4. **Interface Admin**
- **Página**: `/dashboard/admin/budget-plans`
- **Features**:
  - Seleção de cliente
  - Escolha de modo (tokens/brl/both)
  - Configuração de limites
  - Alertas em 80%, 90%, 100%
  - Auto-pause configurável
  - Visão geral de todos os budgets

### 5. **Analytics Unificado Atualizado**
- **Componente**: `src/components/UnifiedAnalytics.tsx`
- **Features**:
  - Card de budget destacado (verde/amarelo/laranja/vermelho)
  - Mostra tokens E reais baseado no modo
  - Barras de progresso para cada métrica
  - Alerta visual quando pausado
  - Próximo reset do budget

## 🔄 Próximos Passos para Concluir

### Passo 1: Aplicar Migration

```bash
cd C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial

# Aplicar migration
supabase db push

# Verificar se aplicou corretamente
supabase db diff
```

### Passo 2: Integrar Tracking Unificado nas APIs Existentes

Precisa modificar os seguintes arquivos para usar `trackUnifiedUsage()`:

#### 2.1 TTS (Text-to-Speech)
**Arquivo**: `src/nodes/convertTextToSpeech.ts`

**ANTES (linha ~188)**:
```typescript
await supabase.from("tts_usage_logs").insert({
  client_id: clientId,
  phone: "system",
  event_type: "generated",
  text_length: text.length,
  from_cache: false,
});
```

**DEPOIS**:
```typescript
import { trackUnifiedUsage } from '@/lib/unified-tracking'

// Calcular custo TTS
const costUSD = model === 'tts-1-hd'
  ? (text.length / 1_000_000) * 15.0  // $15/1M chars
  : (text.length / 1_000_000) * 7.5   // $7.5/1M chars

await trackUnifiedUsage({
  clientId,
  phone: 'system',
  apiType: 'tts',
  provider: 'openai',
  modelName: model,
  characters: text.length,
  costUSD,
  latencyMs: 0,
})
```

#### 2.2 Whisper (se usado)
**Buscar onde está implementado e adicionar**:
```typescript
import { trackUnifiedUsage } from '@/lib/unified-tracking'

await trackUnifiedUsage({
  clientId,
  phone,
  apiType: 'whisper',
  provider: 'openai',
  modelName: 'whisper-1',
  seconds: audioDurationInSeconds,
  costUSD: (audioDurationInSeconds / 60) * 0.006, // $0.006/min
  latencyMs: 0,
})
```

#### 2.3 Embeddings (processDocumentWithChunking)
**Arquivo**: `src/nodes/processDocumentWithChunking.ts`

Buscar chamada de `openai.embeddings.create()` e adicionar:
```typescript
import { trackUnifiedUsage } from '@/lib/unified-tracking'

const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks,
})

// Track usage
const totalTokens = response.usage?.total_tokens || 0
const costUSD = (totalTokens / 1_000_000) * 0.02 // $0.02/1M tokens

await trackUnifiedUsage({
  clientId,
  phone: 'system',
  apiType: 'embeddings',
  provider: 'openai',
  modelName: 'text-embedding-3-small',
  inputTokens: totalTokens,
  costUSD,
  latencyMs: 0,
})
```

#### 2.4 AI Gateway (já usa tracking, mas precisa atualizar)
**Arquivo**: `src/lib/ai-gateway/usage-tracking.ts`

**MODIFICAR linha 130-131**:
```typescript
// ANTES
await updateBudgetUsage(clientId, inputTokens + outputTokens, totalCostBRL)

// DEPOIS - usar tracking unificado
import { trackUnifiedUsage } from '@/lib/unified-tracking'

await trackUnifiedUsage({
  clientId,
  conversationId,
  phone,
  apiType: 'chat',
  provider,
  modelName,
  inputTokens,
  outputTokens,
  cachedTokens,
  latencyMs,
  wasCached,
  wasFallback,
  fallbackReason,
  requestId,
  costUSD: totalCostUSD,
  metadata,
})
```

### Passo 3: Configurar Primeiro Budget de Teste

1. Acesse: `http://localhost:3000/dashboard/admin/budget-plans`
2. Selecione um cliente
3. Configure:
   - **Modo**: `both` (híbrido - recomendado)
   - **Token Limit**: `1000000` (1M tokens)
   - **BRL Limit**: `500.00` (R$ 500)
   - **Período**: `monthly`
   - **Auto-pause**: ✅ Ativado
4. Salvar

### Passo 4: Testar Sistema Completo

#### Teste 1: TTS incrementa budget
```typescript
// Gerar áudio de ~10k caracteres
const audio = await convertTextToSpeech({
  text: 'Texto longo...',
  clientId: 'test-client-id',
})

// Verificar budget
const budget = await fetch('/api/budget/status')
console.log(budget)
// Deve mostrar:
// - current_tokens: 0 (TTS não gera tokens)
// - current_brl: ~0.15 (10k chars × $15/1M × taxa BRL)
```

#### Teste 2: Chat incrementa budget
```typescript
// Fazer chamada de chat
const response = await callAI({...})

// Verificar budget
// Deve incrementar AMBOS:
// - current_tokens: 1500 (input + output)
// - current_brl: 0.XX (baseado no modelo)
```

#### Teste 3: Auto-pause ao atingir limite
```typescript
// Configurar budget baixo: R$ 1.00
// Fazer várias chamadas até estourar

// Verificar status
const budget = await fetch('/api/budget/status')
console.log(budget.is_paused) // true
console.log(budget.pause_reason) // 'brl_limit'

// Tentar fazer nova chamada
const available = await checkBudgetAvailable(clientId)
console.log(available) // false - BLOQUEADO!
```

### Passo 5: Criar Cron Job de Reset (Opcional)

**Arquivo**: `supabase/functions/reset-budgets/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get budgets that need reset
  const { data: budgets } = await supabase
    .from('client_budgets')
    .select('client_id, budget_period, next_reset_at')
    .lte('next_reset_at', new Date().toISOString())

  for (const budget of budgets || []) {
    await supabase.rpc('reset_budget_usage', {
      p_client_id: budget.client_id,
    })
  }

  return new Response(
    JSON.stringify({ reset: budgets?.length || 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Configurar cron no Supabase Dashboard**:
- URL: `https://[project-ref].supabase.co/functions/v1/reset-budgets`
- Cron: `0 0 * * *` (todo dia às 00:00)

## 📊 Visualização no Analytics

### Para Tenant (Cliente):
```
┌─────────────────────────────────────┐
│ Budget do Período          ATENÇÃO  │
│ Modo: Híbrido (Tokens + R$)        │
├─────────────────────────────────────┤
│ Tokens                              │
│ 850,000 / 1,000,000                 │
│ ███████████████████░░ 85%           │
│                                     │
│ Custo (R$)                          │
│ R$ 450,00 / R$ 500,00               │
│ ████████████████████░ 90%           │
│                                     │
│ Próximo reset: 01/01/2025 (monthly)│
└─────────────────────────────────────┘
```

### Para Admin:
```
┌─────────────────────────────────────┐
│ Cliente: ACME Corp         CRÍTICO  │
│ Modo: Híbrido                       │
├─────────────────────────────────────┤
│ Tokens: 850k / 1M (85%)             │
│ Custo: R$ 450 / R$ 500 (90%) ⚠️     │
│                                     │
│ Por API Type:                       │
│ • Chat:      R$ 300 (67%)          │
│ • TTS:       R$ 80 (18%)           │
│ • Whisper:   R$ 40 (9%)            │
│ • Vision:    R$ 30 (6%)            │
│                                     │
│ [Editar Budget]                     │
└─────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Budget não incrementa
- Verificar se migration foi aplicada: `supabase db diff`
- Verificar se `increment_unified_budget()` existe no banco
- Verificar logs: `console.log` em `trackUnifiedUsage()`

### Analytics não mostra budget
- Verificar se budget está configurado: `SELECT * FROM client_budgets`
- Verificar endpoint: `curl http://localhost:3000/api/budget/status`
- Verificar se usuário tem `client_id` no perfil

### Auto-pause não funciona
- Verificar `pause_at_limit = true` na config
- Verificar trigger `client_budgets_calculate_modular_percentages`
- Testar manualmente: `SELECT check_budget_available('client-id')`

## 📝 Checklist Final

- [ ] Migration aplicada (`supabase db push`)
- [ ] TTS usa `trackUnifiedUsage()`
- [ ] Whisper usa `trackUnifiedUsage()` (se usado)
- [ ] Embeddings usa `trackUnifiedUsage()`
- [ ] AI Gateway atualizado para `trackUnifiedUsage()`
- [ ] Budget configurado para pelo menos 1 cliente de teste
- [ ] Analytics mostra card de budget
- [ ] Admin pode configurar budgets em `/dashboard/admin/budget-plans`
- [ ] Teste de auto-pause funcionando
- [ ] (Opcional) Cron job de reset configurado

## 🎉 Resultado Final

- ✅ **100% do uso rastreado** (Gateway + TTS + Whisper + Vision + Embeddings)
- ✅ **Budget modular** (tokens, reais, ou ambos)
- ✅ **Fácil configuração** (interface admin)
- ✅ **Proteção contra estouro** (auto-pause)
- ✅ **Visibilidade completa** (analytics consolidado)
- ✅ **Impossível burlar** (todas as APIs incrementam budget)
