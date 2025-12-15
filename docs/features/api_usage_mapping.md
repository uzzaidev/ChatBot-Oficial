# Mapeamento de Uso de APIs - Gateway vs Legacy

## Status Atual (Dezembro 2024)

### APIs que usam AI Gateway (✅ Rastreado no Budget)
1. **Chat Completions** (via `callAI()`)
   - OpenAI GPT-4o, GPT-4-turbo, GPT-3.5-turbo
   - Anthropic Claude 3.5 Sonnet, Claude 3.5 Haiku
   - Groq Llama 3.3 70B, Llama 3.1 70B
   - Google Gemini 2.0 Flash
   - **Tracking**: `gateway_usage_logs` → `client_budgets`

### APIs que usam chamadas DIRETAS (❌ NÃO rastreado no Budget)

#### 1. **TTS (Text-to-Speech)** - OpenAI TTS
   - **Arquivo**: `src/nodes/convertTextToSpeech.ts`
   - **Modelos**: `tts-1`, `tts-1-hd`
   - **Chamada**: `openai.audio.speech.create()`
   - **Tracking Atual**: `tts_usage_logs` (apenas log, NÃO incrementa budget)
   - **Custo**: ~$15 por 1M caracteres (HD) ou $7.50 (Standard)
   - **⚠️ PROBLEMA**: Cliente pode gastar sem limite em TTS

#### 2. **Whisper (Audio → Text)** - OpenAI Whisper
   - **Arquivo**: Precisa investigar onde é usado
   - **Modelo**: `whisper-1`
   - **Chamada**: `openai.audio.transcriptions.create()`
   - **Tracking Atual**: `usage_logs` com source='whisper'
   - **Custo**: $0.006 por minuto de áudio
   - **⚠️ PROBLEMA**: NÃO incrementa budget

#### 3. **Vision (Image Analysis)** - GPT-4o Vision
   - **Arquivo**: Precisa investigar
   - **Modelo**: `gpt-4o`, `gpt-4-vision`
   - **Chamada**: `openai.chat.completions.create()` com image_url
   - **Tracking Atual**: Possivelmente `usage_logs`
   - **Custo**: ~$0.01275 por imagem (1024x1024 high detail)
   - **⚠️ PROBLEMA**: NÃO incrementa budget

#### 4. **Embeddings** - OpenAI Embeddings
   - **Arquivo**: `src/nodes/processDocumentWithChunking.ts`
   - **Modelos**: `text-embedding-3-small`, `text-embedding-3-large`
   - **Chamada**: `openai.embeddings.create()`
   - **Tracking Atual**: Possivelmente `usage_logs`
   - **Custo**: $0.02 - $0.13 por 1M tokens
   - **⚠️ PROBLEMA**: NÃO incrementa budget

### Legacy Usage Tracking (`usage_logs`)
- **Arquivo**: `src/lib/usageTracking.ts`
- **Função**: `logUsage()`, `logOpenAIUsage()`, `logGroqUsage()`
- **Destino**: Tabela `usage_logs`
- **Campos**:
  - `source`: 'openai' | 'groq' | 'whisper' | 'meta'
  - `model`: Nome do modelo
  - `prompt_tokens`, `completion_tokens`, `total_tokens`
  - `cost_usd`: Custo calculado
- **⚠️ CRÍTICO**: NÃO chama `increment_budget_usage()`

## Problema Identificado

### Cenário Real:
```
Cliente com budget de R$ 500/mês (tipo: 'brl'):

Uso via AI Gateway (Chat):
- 100k tokens GPT-4o → R$ 120
- Budget tracking: R$ 120 / R$ 500 = 24% ✅

Uso DIRETO (sem Gateway):
- 50h de TTS (HD) → ~R$ 350
- 1000 minutos Whisper → ~R$ 28
- 500 imagens Vision → ~R$ 30
- TOTAL DIRETO: R$ 408

Budget mostrado: 24% (R$ 120 / R$ 500)
Gasto REAL: R$ 528 (R$ 120 + R$ 408) → 105.6% 🔴
```

**Resultado**: Cliente ultrapassou budget em 5.6% sem alerta!

## Solução Proposta

### 1. Wrapper Unificado de Tracking

Criar `src/lib/unified-usage-tracking.ts`:

```typescript
/**
 * UNIFIED USAGE TRACKING
 *
 * Rastreia TODAS as chamadas de API (Gateway + Legacy)
 * Incrementa budget em TODOS os casos
 */

export interface UnifiedTrackingParams {
  clientId: string
  conversationId?: string
  phone: string
  apiType: 'chat' | 'tts' | 'whisper' | 'vision' | 'embeddings'
  provider: string
  modelName: string

  // Tokens (chat, embeddings)
  inputTokens?: number
  outputTokens?: number

  // Unidades específicas
  characters?: number  // TTS: caracteres
  seconds?: number     // Whisper: segundos de áudio
  images?: number      // Vision: número de imagens

  costUSD: number      // Custo calculado
  metadata?: any
}

export const trackUnifiedUsage = async (params: UnifiedTrackingParams) => {
  // 1. Calcular custo BRL
  const costBRL = await convertUSDtoBRL(params.costUSD)

  // 2. Inserir em gateway_usage_logs (unificado)
  await insertGatewayLog({...params, costBRL})

  // 3. SEMPRE incrementar budget (Gateway ou Legacy)
  await incrementBudget(params.clientId, costBRL)

  // 4. Backward compatibility: inserir em usage_logs também
  if (isLegacyAPI(params.apiType)) {
    await insertLegacyLog(params)
  }
}
```

### 2. Refatorar Chamadas Diretas

#### TTS (`convertTextToSpeech.ts`):
```typescript
// ANTES
await supabase.from("tts_usage_logs").insert({...})

// DEPOIS
await trackUnifiedUsage({
  clientId,
  apiType: 'tts',
  provider: 'openai',
  modelName: 'tts-1-hd',
  characters: text.length,
  costUSD: estimateTTSCost(text.length, model),
  phone,
})
```

#### Whisper:
```typescript
await trackUnifiedUsage({
  apiType: 'whisper',
  provider: 'openai',
  modelName: 'whisper-1',
  seconds: audioDuration,
  costUSD: (audioDuration / 60) * 0.006,
  ...
})
```

#### Vision:
```typescript
await trackUnifiedUsage({
  apiType: 'vision',
  provider: 'openai',
  modelName: 'gpt-4o-vision',
  images: imageCount,
  costUSD: imageCount * 0.01275,
  ...
})
```

#### Embeddings:
```typescript
await trackUnifiedUsage({
  apiType: 'embeddings',
  provider: 'openai',
  modelName: 'text-embedding-3-small',
  inputTokens: tokens,
  costUSD: (tokens / 1_000_000) * 0.02,
  ...
})
```

### 3. Consolidar Budget Tracking

Modificar `increment_budget_usage()` para aceitar TODOS os tipos:

```sql
CREATE OR REPLACE FUNCTION increment_budget_usage(
  p_client_id UUID,
  p_cost_brl NUMERIC
)
RETURNS void AS $$
BEGIN
  -- Incrementar budget baseado no tipo configurado
  UPDATE client_budgets
  SET current_usage = current_usage +
    CASE
      WHEN budget_type = 'brl' THEN p_cost_brl
      WHEN budget_type = 'usd' THEN p_cost_brl / get_exchange_rate('BRL', 'USD')
      WHEN budget_type = 'tokens' THEN 0 -- Token tracking para chat apenas
    END
  WHERE client_id = p_client_id;

  -- Auto-pausar se atingiu limite
  UPDATE client_budgets
  SET is_paused = true
  WHERE client_id = p_client_id
    AND current_usage >= budget_limit
    AND pause_at_limit = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Analytics Unificado

#### Para TENANT:
- **KPI Card**: "Custo Total" (Gateway + TTS + Whisper + Vision + Embeddings)
- **NÃO mostrar** diferença entre Gateway e Legacy
- **Apenas** mostrar total consolidado vs budget

#### Para ADMIN:
- **Breakdown detalhado**:
  - Uso por API Type (chat, tts, whisper, vision, embeddings)
  - Uso por Provider (openai, groq, anthropic, google)
  - Uso por Cliente
  - **Tag especial**: "Via Gateway" vs "Direto"

## Implementação

### Fase 1: Tracking Unificado
- [ ] Criar `unified-usage-tracking.ts`
- [ ] Migrar TTS para usar tracking unificado
- [ ] Migrar Whisper para usar tracking unificado
- [ ] Migrar Vision para usar tracking unificado
- [ ] Migrar Embeddings para usar tracking unificado

### Fase 2: Budget Consolidado
- [ ] Modificar `increment_budget_usage()` para aceitar custo BRL direto
- [ ] Testar com TTS, Whisper, Vision, Embeddings
- [ ] Validar que budget reflete uso TOTAL

### Fase 3: Analytics
- [ ] Atualizar `/api/analytics/unified` para incluir TTS, Whisper, Vision, Embeddings
- [ ] Tenant: Mostrar custo total consolidado
- [ ] Admin: Mostrar breakdown por API type
- [ ] Adicionar card de Budget na página de analytics

## Testes

### Cenário 1: Cliente usa apenas Gateway
- Gasta R$ 100 em chat
- Budget deve mostrar: R$ 100 / R$ 500 = 20%

### Cenário 2: Cliente usa apenas TTS
- Gasta R$ 200 em TTS
- Budget deve mostrar: R$ 200 / R$ 500 = 40%

### Cenário 3: Cliente usa TUDO
- R$ 100 chat + R$ 200 TTS + R$ 50 Whisper + R$ 100 Vision
- Budget deve mostrar: R$ 450 / R$ 500 = 90% ⚠️

### Cenário 4: Auto-pause
- Budget: R$ 500, pause_at_limit = true
- Gasta R$ 500 → Sistema deve pausar TODAS as APIs
