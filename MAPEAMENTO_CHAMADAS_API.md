# Mapeamento de Chamadas API - Migração para AI Gateway

> **Objetivo:** Centralizar TODAS as chamadas de modelos de IA através do Vercel AI Gateway para obter cache, economia, monitoramento e fallback automático.

---

## 📊 Status Atual: Resumo Executivo

| API Type | Modelo Atual | Modelo Gateway | Ação | Budget Tracking |
|----------|--------------|----------------|------|-----------------|
| **Chat (main)** | gpt-4o-mini / llama-3.3-70b | `openai/gpt-4o-mini` | ✅ No Gateway | ✅ `gateway_usage_logs` |
| **Embeddings** | text-embedding-3-small | `openai/text-embedding-3-small` | 🔄 Migrar | → `gateway_usage_logs` |
| **Vision** | gpt-4o | `openai/gpt-4o` | 🔄 Migrar | → `gateway_usage_logs` |
| **PDF Summary** | gpt-4o | `openai/gpt-4o` | 🔄 Migrar | → `gateway_usage_logs` |
| **Whisper** | whisper-1 | ❌ N/A | ⚠️ SDK Direto | ⚠️ Melhorar tracking |
| **TTS (OpenAI)** | tts-1-hd | ❌ N/A | ⚠️ SDK Direto | ⚠️ Melhorar tracking |
| **TTS (ElevenLabs)** | eleven_multilingual_v1 | ❌ N/A | ⚠️ SDK Direto | ✅ `unified_usage_logs` |

**Legenda:**
- ✅ No Gateway = Funcionando via AI Gateway
- 🔄 Migrar = Pode migrar para Gateway (tem suporte)
- ⚠️ SDK Direto = Gateway não suporta, mantém SDK direto + tracking

---

## 🎯 Plano de Ação Atualizado

### ✅ MIGRAR para Gateway (Tem Suporte)

| API | Modelo Gateway | Benefício | Prioridade |
|-----|----------------|-----------|------------|
| **Embeddings** | `openai/text-embedding-3-small` | Dashboard + tracking unificado | 🔥 Alta |
| **Vision** | `openai/gpt-4o` | Prompt cache (~60% economia) | 🔥 Alta |
| **PDF Summary** | `openai/gpt-4o` | Prompt cache (~70% economia) | 🔶 Média |

### ⚠️ MANTER Direto + Melhorar Tracking

| API | Modelo | Tracking Atual | Tracking Necessário |
|-----|--------|----------------|---------------------|
| **Whisper** | whisper-1 | ✅ Tokens (estimados) | ⚠️ Budget em R$ e tokens |
| **TTS** | tts-1-hd | ✅ Caracteres + R$ | ⚠️ Budget em tokens |
| **TTS (ElevenLabs)** | eleven_multilingual_v1 | ✅ Completo | ✅ OK |

---

## 🔧 Melhorias de Tracking para SDKs Diretos

### Problema Atual

**Whisper e TTS (OpenAI)** usam SDK direto (Gateway não suporta), mas o tracking está **incompleto**:

❌ Não salvam em `gateway_usage_logs` (tabela unificada)
❌ Não têm budget control por cliente
❌ Não incrementam `client_budgets.tokens_used_current_period`

### Solução: Unificar Tracking

**Objetivo:** SDKs diretos devem ter o **mesmo tracking** que APIs no Gateway.

#### 1. Whisper - Melhorar Tracking

**Arquivo:** `src/lib/openai.ts:48-123`

**Tracking atual:**
```typescript
await logAPIUsage({
  clientId,
  phone,
  apiType: "whisper",
  provider: "openai",
  modelName: "whisper-1",
  inputUnits: estimatedDurationSeconds, // ⚠️ segundos, não tokens
  latencyMs,
});
```

**Problemas:**
- Salva em `usage_logs` (legacy)
- Não calcula custo em R$
- Não incrementa budget
- inputUnits = segundos (deveria ser tokens estimados)

**Solução proposta:**
```typescript
// Calcular tokens estimados (Whisper cobra por minuto, não por token)
const estimatedTokens = Math.ceil((estimatedDurationSeconds / 60) * 1000);

// Calcular custo ($0.006/minuto)
const costUSD = (estimatedDurationSeconds / 60) * 0.006;

// Salvar em gateway_usage_logs (unificado)
await logGatewayUsage(
  clientId,
  conversationId,
  phone,
  {
    provider: 'openai',
    model: 'whisper-1',
    inputTokens: estimatedTokens,
    outputTokens: 0,
    totalTokens: estimatedTokens,
    cachedInputTokens: 0,
    costUSD,
    latencyMs,
    metadata: {
      audioSeconds: estimatedDurationSeconds,
      apiType: 'whisper'
    }
  }
);

// ✅ Incrementar budget automaticamente (via logGatewayUsage)
```

**Benefícios:**
- ✅ Aparece no dashboard unificado
- ✅ Budget control por cliente
- ✅ Conversão USD → BRL automática
- ✅ Tracking de tokens (mesmo que estimados)

---

#### 2. TTS (OpenAI) - Melhorar Tracking

**Arquivo:** `src/nodes/convertTextToSpeech.ts:229-262`

**Tracking atual:**
```typescript
// Legacy tracking
await supabase.from("tts_usage_logs").insert({
  client_id: clientId,
  phone: "system",
  event_type: "generated",
  text_length: text.length,
  from_cache: false,
});

// Unified tracking
await trackUnifiedUsage({
  clientId,
  phone: "system",
  apiType: "tts",
  provider: usedProvider,
  modelName,
  characters: text.length, // ⚠️ caracteres, não tokens
  costUSD,
  latencyMs: 0,
});
```

**Problemas:**
- Usa `characters` (não tokens)
- Não incrementa budget em tokens
- Salva em `unified_usage_logs` (separado de `gateway_usage_logs`)

**Solução proposta:**
```typescript
// Estimar tokens (aproximadamente 1 token = 4 caracteres)
const estimatedTokens = Math.ceil(text.length / 4);

// Custo já calculado corretamente
const costUSD = model === "tts-1-hd"
  ? (text.length / 1_000_000) * 15.0
  : (text.length / 1_000_000) * 7.5;

// Salvar em gateway_usage_logs (unificado)
await logGatewayUsage(
  clientId,
  conversationId,
  phone,
  {
    provider: 'openai',
    model: model,
    inputTokens: estimatedTokens,
    outputTokens: 0,
    totalTokens: estimatedTokens,
    cachedInputTokens: 0,
    costUSD,
    latencyMs: 0,
    metadata: {
      characters: text.length,
      voice,
      speed,
      apiType: 'tts',
      fromCache: false
    }
  }
);
```

**Benefícios:**
- ✅ Tracking unificado com chat/vision/embeddings
- ✅ Budget control por tokens
- ✅ Dashboard único

---

### 3. Budget Control - Client Budgets

**Objetivo:** Todos os clientes devem ter limite de budget em **tokens** e **R$**.

**Tabela:** `client_budgets`

```sql
CREATE TABLE client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),

  -- Budget em tokens
  tokens_limit_per_period INTEGER, -- ex: 1_000_000 tokens/mês
  tokens_used_current_period INTEGER DEFAULT 0,
  tokens_period_start TIMESTAMPTZ DEFAULT NOW(),
  tokens_period_end TIMESTAMPTZ,

  -- Budget em reais
  brl_limit_per_period NUMERIC(10,2), -- ex: R$ 100,00/mês
  brl_used_current_period NUMERIC(10,2) DEFAULT 0.00,
  brl_period_start TIMESTAMPTZ DEFAULT NOW(),
  brl_period_end TIMESTAMPTZ,

  -- Alertas
  alert_threshold_percentage INTEGER DEFAULT 80, -- alerta em 80%
  alert_sent BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Função de incremento:**
```typescript
// src/lib/ai-gateway/usage-tracking.ts

export const logGatewayUsage = async (
  clientId: string,
  conversationId: string | null,
  phone: string | null,
  usage: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    // ...
  }
) => {
  // 1. Salvar log
  await supabase.from('gateway_usage_logs').insert({
    client_id: clientId,
    conversation_id: conversationId,
    phone,
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: usage.costUSD,
    cost_brl: await convertUSDtoBRL(usage.costUSD),
    // ...
  });

  // 2. Incrementar budget do cliente
  const costBRL = await convertUSDtoBRL(usage.costUSD);
  const totalTokens = usage.inputTokens + usage.outputTokens;

  await supabase.rpc('increment_client_budget', {
    p_client_id: clientId,
    p_tokens: totalTokens,
    p_cost_brl: costBRL
  });

  // 3. Verificar se excedeu limite
  const { data: budget } = await supabase
    .from('client_budgets')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (budget) {
    const tokenUsagePercent = (budget.tokens_used_current_period / budget.tokens_limit_per_period) * 100;
    const brlUsagePercent = (budget.brl_used_current_period / budget.brl_limit_per_period) * 100;

    if (tokenUsagePercent >= budget.alert_threshold_percentage ||
        brlUsagePercent >= budget.alert_threshold_percentage) {
      await sendBudgetAlert(clientId, {
        tokenUsagePercent,
        brlUsagePercent
      });
    }
  }
};
```

**RPC Function (PostgreSQL):**
```sql
CREATE OR REPLACE FUNCTION increment_client_budget(
  p_client_id UUID,
  p_tokens INTEGER,
  p_cost_brl NUMERIC
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO client_budgets (
    client_id,
    tokens_used_current_period,
    brl_used_current_period
  )
  VALUES (
    p_client_id,
    p_tokens,
    p_cost_brl
  )
  ON CONFLICT (client_id) DO UPDATE SET
    tokens_used_current_period = client_budgets.tokens_used_current_period + p_tokens,
    brl_used_current_period = client_budgets.brl_used_current_period + p_cost_brl,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

### 4. Dashboard de Budget

**Página:** `/dashboard/ai-gateway/budget`

**Cards:**
```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Tokens Usados        │  │ Custo em Reais       │  │ Status do Período    │
│                      │  │                      │  │                      │
│ 750K / 1M            │  │ R$ 78,50 / R$ 100    │  │ Renovação: 5 dias    │
│ [████████░░] 75%     │  │ [████████░░] 78.5%   │  │ 📊 Dentro do limite  │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

**Tabela de uso por API:**
```
┌─────────────┬────────────┬──────────────┬────────────┬──────────────┐
│ API         │ Requests   │ Tokens       │ % Budget   │ Custo (R$)   │
├─────────────┼────────────┼──────────────┼────────────┼──────────────┤
│ Chat        │ 1,234      │ 500K (50%)   │ ████████   │ R$ 45,20     │
│ Embeddings  │ 456        │ 150K (15%)   │ ███░░░░░   │ R$ 8,30      │
│ Vision      │ 89         │ 80K (8%)     │ ██░░░░░░   │ R$ 18,50     │
│ Whisper     │ 234        │ 15K (1.5%)   │ ░░░░░░░░   │ R$ 4,80      │
│ TTS         │ 156        │ 5K (0.5%)    │ ░░░░░░░░   │ R$ 1,70      │
└─────────────┴────────────┴──────────────┴────────────┴──────────────┘
```

---

## 1. ✅ Chat Principal (JÁ NO GATEWAY)

### Status: ✅ FUNCIONANDO

**Arquivo:** [src/nodes/generateAIResponse.ts](src/nodes/generateAIResponse.ts)

**Como funciona:**
```typescript
import { callAI } from "@/lib/ai-gateway";

const result = await callAI({
  messages,
  tools,
  config,
  clientId,
  phone,
  conversationId
});
```

**Modelos suportados:**
- ✅ OpenAI: gpt-4o, gpt-4o-mini
- ✅ Groq: llama-3.3-70b-versatile
- ✅ Anthropic: claude-3-5-sonnet
- ✅ Google: gemini-2.0-flash-exp

**Benefícios atuais:**
- ✅ Prompt cache (economiza 60-70% tokens)
- ✅ Dashboard Vercel com métricas
- ✅ Fallback automático entre providers
- ✅ Tracking multi-tenant (`gateway_usage_logs`)

---

## 2. ❌ Whisper (Transcrição de Áudio)

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**1. Função principal:**
- **Arquivo:** [src/lib/openai.ts:48-123](src/lib/openai.ts#L48)
- **Função:** `transcribeAudio()`
- **Modelo:** `whisper-1`

```typescript
const client = new OpenAI({ apiKey: resolvedApiKey });

const transcription = await client.audio.transcriptions.create({
  file: transcriptionFile,
  model: "whisper-1",
  language: "pt",
});
```

**2. Wrapper node:**
- **Arquivo:** [src/nodes/transcribeAudio.ts](src/nodes/transcribeAudio.ts)
- **Usa:** `transcribeAudioWithWhisper()` do `@/lib/openai`

### Por que está chamando direto:
- Implementado antes do AI Gateway
- Usa SDK do OpenAI (`openai` npm package)

### Volume de uso:
- 🔥 **Alto** - Áudios são comuns em WhatsApp

### Tracking atual:
- ✅ Já salva em `usage_logs` via `logAPIUsage()`
- ✅ Tracking por `client_id`
- ⚠️ Mas **não usa** `gateway_usage_logs` (tabela nova)

### Como migrar:

**Opção 1: Gateway direto (se suportado)**
```typescript
// Verificar se AI Gateway suporta Whisper
import { createGatewayInstance } from '@/lib/ai-gateway/providers';

const gateway = createGatewayInstance(gatewayApiKey);
// Usar gateway('openai/whisper-1') se disponível
```

**Opção 2: Manter direto + unificar tracking**
```typescript
// Se Gateway NÃO suportar Whisper, apenas centralizar tracking
await logGatewayUsage(
  clientId,
  conversationId,
  phone,
  {
    provider: 'openai',
    model: 'whisper-1',
    inputTokens: estimatedTokens,
    outputTokens: 0,
    costUSD: (estimatedDurationSeconds / 60) * 0.006, // $0.006/min
    latencyMs
  }
);
```

---

## 3. ❌ Embeddings (RAG / Busca Semântica)

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**1. Função principal:**
- **Arquivo:** [src/lib/openai.ts:269-336](src/lib/openai.ts#L269)
- **Função:** `generateEmbedding()`
- **Modelo:** `text-embedding-3-small`

```typescript
const client = new OpenAI({ apiKey: resolvedApiKey });

const response = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: text,
});
```

**2. Usado por:**
- **RAG Search:** [src/nodes/searchDocumentInKnowledge.ts:181](src/nodes/searchDocumentInKnowledge.ts#L181)
- **Document Upload:** [src/app/api/documents/upload/route.ts](src/app/api/documents/upload/route.ts)
- **Chunking:** [src/nodes/processDocumentWithChunking.ts](src/nodes/processDocumentWithChunking.ts)

### Por que está chamando direto:
- Embeddings implementados antes do Gateway
- API de embeddings é diferente de chat (não usa `generateText()`)

### Volume de uso:
- 🔥 **Médio-Alto** - Gera embedding para:
  - Cada chunk de documento (upload)
  - Cada busca RAG (por conversa)

### Tracking atual:
- ✅ Já salva em `usage_logs` via `logAPIUsage()`
- ✅ Tracking por `client_id`

### Como migrar:

**Verificar suporte do Gateway:**
```typescript
// Gateway pode suportar embeddings via Vercel AI SDK:
import { embed } from 'ai';
import { createGatewayInstance } from '@/lib/ai-gateway/providers';

const gateway = createGatewayInstance(gatewayApiKey);

const { embedding } = await embed({
  model: gateway('openai/text-embedding-3-small'),
  value: text
});
```

**Se não suportado, manter direto + unificar tracking:**
```typescript
await logGatewayUsage(
  clientId,
  conversationId,
  phone,
  {
    provider: 'openai',
    model: 'text-embedding-3-small',
    inputTokens: usage.prompt_tokens,
    outputTokens: 0,
    costUSD: (usage.prompt_tokens / 1_000_000) * 0.02, // $0.02/1M tokens
    latencyMs
  }
);
```

---

## 4. ❌ Vision (Análise de Imagens)

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**Arquivo:** [src/lib/openai.ts:172-267](src/lib/openai.ts#L172)
- **Função:** `analyzeImageFromBuffer()`
- **Modelo:** `gpt-4o` (vision)

```typescript
const client = new OpenAI({ apiKey: resolvedApiKey });

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    }
  ],
  max_tokens: 1000,
});
```

### Por que está chamando direto:
- Usa formato especial de mensagem (multimodal)
- Implementado antes do Gateway

### Volume de uso:
- 🔶 **Médio** - Quando usuário envia imagem no WhatsApp

### Tracking atual:
- ✅ Já salva em `usage_logs` via `logAPIUsage()`
- ✅ Tracking por `client_id` e `phone`

### Como migrar:

**Gateway provavelmente suporta Vision:**
```typescript
import { generateText } from 'ai';
import { createGatewayInstance } from '@/lib/ai-gateway/providers';

const gateway = createGatewayInstance(gatewayApiKey);

const result = await generateText({
  model: gateway('openai/gpt-4o'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image', image: imageBuffer } // ou dataUrl
      ]
    }
  ]
});
```

**Benefícios da migração:**
- ✅ Prompt cache (se prompt for longo)
- ✅ Dashboard Vercel
- ✅ Fallback automático

---

## 5. ❌ TTS - Text-to-Speech (OpenAI)

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**Arquivo:** [src/nodes/convertTextToSpeech.ts:169-181](src/nodes/convertTextToSpeech.ts#L169)
- **Modelos:** `tts-1`, `tts-1-hd`
- **Voices:** alloy, echo, fable, onyx, nova, shimmer

```typescript
const openai = new OpenAI({ apiKey: finalOpenaiKey });

const mp3Response = await openai.audio.speech.create({
  model: selectedModel,
  voice: selectedVoice,
  input: text,
  speed: speed,
  response_format: "mp3",
});
```

### Por que está chamando direto:
- API de áudio (não é chat/text generation)
- Retorna áudio binário (não text)

### Volume de uso:
- 🔶 **Médio** - Quando bot responde com áudio
- ✅ **Tem cache próprio** (`tts_cache` table)

### Tracking atual:
- ✅ Tracking em `tts_usage_logs`
- ✅ Tracking unificado em `unified_usage_logs` via `trackUnifiedUsage()`

### Como migrar:

**⚠️ Verificar se Gateway suporta TTS:**
- TTS não é modelo de text generation
- Provavelmente **NÃO suportado** pelo Vercel AI Gateway

**Recomendação:**
- ✅ Manter chamada direta (já tem cache próprio)
- ✅ Unificar tracking (já usa `trackUnifiedUsage()`)
- ❌ Não migrar para Gateway (não aplicável)

---

## 6. ❌ TTS - ElevenLabs

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**Arquivo:** [src/nodes/convertTextToSpeech.ts:112](src/nodes/convertTextToSpeech.ts#L112)
- **Provider:** ElevenLabs
- **Função:** `elevenLabsTTS()`
- **Modelos:** eleven_monolingual_v1, eleven_multilingual_v1, eleven_turbo_v2

### Por que está chamando direto:
- Provider alternativo (não é OpenAI/Anthropic/Groq/Google)
- API própria da ElevenLabs

### Volume de uso:
- 🔻 **Baixo** - Usado opcionalmente (fallback do OpenAI TTS)

### Como migrar:

**❌ Gateway NÃO suporta ElevenLabs**
- Vercel AI Gateway só suporta: OpenAI, Anthropic, Groq, Google
- ElevenLabs não está na lista

**Recomendação:**
- ✅ Manter chamada direta
- ✅ Tracking já está unificado via `trackUnifiedUsage()`

---

## 7. ❌ PDF Summary (GPT-4o)

### Status: ❌ CHAMADA DIRETA

### Onde está sendo chamado:

**Arquivo:** [src/lib/openai.ts:357-446](src/lib/openai.ts#L357)
- **Função:** `summarizePDFContent()`
- **Modelo:** `gpt-4o`

```typescript
const client = new OpenAI({ apiKey: resolvedApiKey });

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 1500,
});
```

### Por que está chamando direto:
- Implementado antes do Gateway
- Função utilitária específica

### Volume de uso:
- 🔻 **Baixo** - Só ao fazer upload de PDF

### Tracking atual:
- ✅ Já salva em `usage_logs` via `logAPIUsage()`

### Como migrar:

**Fácil migração:**
```typescript
import { generateText } from 'ai';
import { createGatewayInstance } from '@/lib/ai-gateway/providers';

const gateway = createGatewayInstance(gatewayApiKey);

const result = await generateText({
  model: gateway('openai/gpt-4o'),
  prompt: prompt,
  maxTokens: 1500
});
```

**Benefícios:**
- ✅ Prompt cache (prompt é longo ~12K caracteres)
- ✅ Dashboard
- ✅ Economia

---

## 8. ❌ Groq Chat (Legacy)

### Status: ❌ CHAMADA DIRETA (mas não usado)

### Onde está:

**Arquivo:** [src/lib/groq.ts:66-129](src/lib/groq.ts#L66)
- **Função:** `generateChatCompletion()`
- **Modelos:** llama-3.3-70b-versatile

### Por que existe:
- Implementação legacy antes do Gateway
- **NÃO está sendo usada** (substituída por `callAI()`)

### Como migrar:

**✅ Já migrado!** - `generateAIResponse.ts` usa `callAI()` que já suporta Groq via Gateway.

**Ação recomendada:**
- ⚠️ Deprecar `src/lib/groq.ts`
- ⚠️ Remover imports não usados

---

## 9. ❌ Detect Repetition (Fast Track Router)

### Status: ⚠️ VERIFICAR

**Arquivo:** [src/nodes/detectRepetition.ts](src/nodes/detectRepetition.ts)

**Precisa verificar:**
- Se usa `callAI()` (Gateway) ou chamada direta
- Modelo usado
- Se tem prompt cache ativo

---

## 📋 Plano de Migração

### Fase 1: Migrações Prioritárias (Alta economia)

#### 1.1. Whisper (🔥 Alta prioridade)
- [ ] Verificar se Vercel AI Gateway suporta Whisper
- [ ] Se sim: migrar para `gateway('openai/whisper-1')`
- [ ] Se não: unificar tracking em `gateway_usage_logs`
- [ ] Testar com áudio real
- [ ] Validar custos no dashboard

#### 1.2. Embeddings (🔥 Alta prioridade)
- [ ] Verificar suporte do Gateway para embeddings
- [ ] Migrar `generateEmbedding()` para usar Gateway
- [ ] Atualizar RAG search
- [ ] Atualizar document upload
- [ ] Testar busca semântica
- [ ] Validar custos

#### 1.3. Vision (🔥 Alta prioridade)
- [ ] Migrar `analyzeImageFromBuffer()` para Gateway
- [ ] Testar com imagens reais
- [ ] Validar cache (prompt pode ser cacheado)
- [ ] Validar custos

### Fase 2: Migrações Secundárias

#### 2.1. PDF Summary (🔶 Média prioridade)
- [ ] Migrar `summarizePDFContent()` para Gateway
- [ ] Aproveitar prompt cache (prompt é longo)
- [ ] Testar com PDFs reais
- [ ] Economia esperada: ~60% após primeiro upload

### Fase 3: Limpeza

#### 3.1. Groq Legacy
- [ ] Remover `src/lib/groq.ts` (não usado)
- [ ] Remover imports obsoletos

#### 3.2. Unificar Tracking
- [ ] Garantir que TODAS as APIs salvam em `gateway_usage_logs`
- [ ] Deprecar `usage_logs` (legacy)
- [ ] Migrar dados históricos se necessário

---

## 🎯 Benefícios Esperados da Migração Completa

### Economia de Custos

**Whisper:**
- Sem prompt cache (API de áudio)
- Benefício: centralização + dashboard

**Embeddings:**
- Sem prompt cache (não é chat)
- Benefício: centralização + dashboard

**Vision:**
- ✅ Prompt cache: ~60% economia (prompt repetido)
- Exemplo: "Descreva esta imagem" cacheado

**PDF Summary:**
- ✅ Prompt cache: ~70% economia (prompt longo ~12K tokens)
- Economia em uploads sequenciais

### Outros Benefícios

- ✅ **Dashboard unificado** (Vercel)
- ✅ **Fallback automático** entre providers
- ✅ **Tracking centralizado** (`gateway_usage_logs`)
- ✅ **Budget control** por cliente
- ✅ **Cache metrics** (hit rate, tokens saved)

---

## 📊 Resumo Executivo Final

| API | Modelo | Ação | Budget Tracking | Economia |
|-----|--------|------|-----------------|----------|
| **Chat** | gpt-4o-mini | ✅ No Gateway | ✅ Completo | 60-70% (ativo) |
| **Embeddings** | text-embedding-3-small | 🔄 Migrar Gateway | → Unificado | Dashboard |
| **Vision** | gpt-4o | 🔄 Migrar Gateway | → Unificado | ~60% (cache) |
| **PDF Summary** | gpt-4o | 🔄 Migrar Gateway | → Unificado | ~70% (cache) |
| **Whisper** | whisper-1 | ⚠️ Direto + Tracking | 🔧 Melhorar | Dashboard |
| **TTS** | tts-1-hd | ⚠️ Direto + Tracking | 🔧 Melhorar | Dashboard |
| **ElevenLabs** | eleven_multilingual_v1 | ⚠️ Direto | ✅ OK | - |

---

## 🔍 Como Verificar Suporte do Gateway

### Teste rápido:

```bash
# Testar Whisper
curl http://localhost:3000/api/test/gateway-whisper

# Testar Embeddings
curl http://localhost:3000/api/test/gateway-embeddings

# Testar Vision
curl http://localhost:3000/api/test/gateway-vision
```

### Consultar documentação:

- [Vercel AI SDK - Audio](https://sdk.vercel.ai/docs/ai-sdk-core/audio)
- [Vercel AI SDK - Embeddings](https://sdk.vercel.ai/docs/ai-sdk-core/embeddings)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

---

## 📝 Notas Técnicas

### Por que TTS deve ficar direto:

1. **API diferente** (retorna áudio binário, não texto)
2. **Já tem cache próprio** (`tts_cache` table com hit rate alto)
3. **Gateway não suporta** (foco em text generation)
4. **Tracking já unificado** (`trackUnifiedUsage()`)

### Por que ElevenLabs fica direto:

1. **Provider não suportado** pelo Vercel AI Gateway
2. **API própria** (não é OpenAI/Anthropic/Groq/Google)
3. **Uso baixo** (fallback opcional)

---

## ✅ Checklist de Migração

### Antes de migrar qualquer API:

- [ ] Confirmar suporte do Gateway (docs/testes)
- [ ] Ler código atual e entender fluxo
- [ ] Identificar onde é usado
- [ ] Estimar volume de uso
- [ ] Calcular economia esperada

### Durante migração:

- [ ] Criar branch `feat/gateway-[api-name]`
- [ ] Implementar migração
- [ ] Atualizar tracking para `gateway_usage_logs`
- [ ] Testar localmente
- [ ] Validar custos no dashboard
- [ ] Commit com mensagem clara

### Após migração:

- [ ] Deploy em staging
- [ ] Testar em produção (1 cliente)
- [ ] Monitorar dashboard Vercel (24h)
- [ ] Validar economia real
- [ ] Deploy para todos os clientes
- [ ] Documentar em changelog

---

**Última atualização:** 17/12/2024
**Autor:** Claude Code
**Revisão:** Pendente
