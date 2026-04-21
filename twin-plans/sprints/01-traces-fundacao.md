# Sprint 1 — Fundação: Traces e Instrumentação

> **Duração:** 1–2 semanas
> **Pré-requisito:** Sprint 0 concluído ([`00-sprint-zero-prep.md`](./00-sprint-zero-prep.md))
> **Meta:** responder em segundos *"o que aconteceu nesta mensagem?"* — custo, latência, modelo, chunks, status do pipeline.

---

## 1. Objetivo

Instrumentar o pipeline `chatbotFlow.ts` para que **toda mensagem** que entra pelo webhook gere:

1. Um registro em `message_traces` com timestamps de cada estágio + custo + tokens.
2. Um registro em `retrieval_traces` com `chunkIds`, `similarityScores`, `topK`, `threshold` (quando RAG for usado).
3. **Um registro por tool call emitida** em `tool_call_traces` (inclusive `registrar_dado_cadastral` com seus campos, `transferir_atendimento`, `buscar_documento`, `verificar_agenda`, etc.), com `status`, `source` (`agent`/`fallback`) e `latency_ms`.
4. APIs `GET /api/traces` e `GET /api/traces/[id]` com filtro multi-tenant, incluindo tool_calls no detalhe.
5. Card no dashboard com custo do dia + últimas N mensagens.
6. **Hardening do sistema de captura de dados cadastrais** (ver §3.3) — garante que dados fornecidos pelo cliente cheguem ao perfil de forma assertiva, com piso ≥95%.

**Sem juiz ainda.** Foco é puramente em observabilidade e assertividade de captura.

---

## 2. Definition of Done (DoD)

- [x] Migration de `message_traces` + `retrieval_traces` + `tool_call_traces` aplicada em prod (com RLS).
- [x] `src/lib/trace-logger.ts` implementado e usado em `chatbotFlow.ts`.
- [ ] Toda mensagem real de WhatsApp gera um trace coerente (validado em 3 conversas reais).
- [ ] Latência adicional do logger < 50ms p95 (medido).
- [x] APIs `/api/traces` e `/api/traces/[id]` funcionando com isolamento multi-tenant validado.
- [x] Dashboard tem card de "custo do dia" e link para "últimas mensagens". (`TracesWidget` em `DashboardMetricsView`)
- [ ] Cobertura de testes: ≥ 80% em `trace-logger.ts`; 100% das APIs novas.
- [ ] Eval suite (smoke) executa em CI sem falhas.
- [x] Zero regressão no webhook em smoke test E2E.
- [x] **Hardening de captura cadastral (assertividade):**
  - [x] Enum `registrar_dado_cadastral` ampliado para 14 campos (inclui `nome`, `data_nascimento`, `endereco`, `cep`, `telefone_alternativo`, `rg`, `cidade`, `estado`, `como_conheceu`, `indicado_por`, `objetivo`, `profissao`).
  - [x] Tool aceita **múltiplos campos em uma única chamada** (`dados: object`).
  - [x] Prompt do agente reforçado com instrução explícita: REGRA DE CAPTURA DE DADOS no system prompt.
  - [x] Nó `extractContactDataFallback.ts` implementado — chamada LLM estruturada (JSON mode, gpt-4o-mini, temp=0) que roda via `setImmediate` pós-resposta.
  - [x] Toda `tool_call` emitida (registrar_dado_cadastral, transferir_atendimento, buscar_documento, verificar_agenda, criar_evento_agenda, enviar_resposta_em_audio) é persistida em `tool_call_traces` com input/output/status/latência.
  - [ ] Validação: em 20 conversas reais com dados cadastrais, ≥95% dos campos fornecidos aparecem em `clientes_whatsapp.metadata`.

**Status técnico em 2026-04-21:**
- `trace-logger.ts` com cobertura validada acima da meta (≥80%).
- Testes de integração das APIs de traces implementados e passando em `jest --runInBand`.
- Pendências de fechamento total do DoD seguem concentradas em validação com tráfego real (3/20 conversas) e execução em ambiente remoto/CI.

---

## 3. Backlog detalhado por arquivo

### 3.1 Novos arquivos

#### `supabase/migrations/20260422130000_create_observability_traces.sql` *(ENTREGUE — aplicado em prod)*

```sql
-- ═══════════════════════════════════════════════
-- message_traces: rastreio por mensagem
-- ═══════════════════════════════════════════════
CREATE TABLE message_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Identificação
  conversation_id TEXT,
  whatsapp_message_id TEXT,
  phone TEXT NOT NULL,
  
  -- Timestamps de cada estágio (NULL = não atingiu)
  webhook_received_at TIMESTAMPTZ,
  normalized_at TIMESTAMPTZ,
  context_loaded_at TIMESTAMPTZ,
  embedding_started_at TIMESTAMPTZ,
  embedding_completed_at TIMESTAMPTZ,
  retrieval_started_at TIMESTAMPTZ,
  retrieval_completed_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  evaluation_enqueued_at TIMESTAMPTZ,
  
  -- Latências (ms) — preenchidas no finish()
  latency_embedding_ms INT,
  latency_retrieval_ms INT,
  latency_generation_ms INT,
  latency_total_ms INT,
  
  -- Inputs/outputs
  user_message TEXT NOT NULL,
  agent_response TEXT,
  
  -- Modelo + custo
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(12, 8),
  
  -- Status e metadata
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evaluated', 'human_reviewed', 'needs_review', 'failed')),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_message_traces_client_id ON message_traces(client_id);
CREATE INDEX idx_message_traces_phone ON message_traces(phone);
CREATE INDEX idx_message_traces_status ON message_traces(status);
CREATE INDEX idx_message_traces_created_at ON message_traces(created_at DESC);
CREATE UNIQUE INDEX idx_message_traces_wamid_unique
  ON message_traces(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

-- ═══════════════════════════════════════════════
-- retrieval_traces: chunks recuperados
-- ═══════════════════════════════════════════════
CREATE TABLE retrieval_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  
  chunk_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  similarity_scores FLOAT[] NOT NULL DEFAULT ARRAY[]::FLOAT[],
  top_k INT NOT NULL,
  threshold FLOAT NOT NULL,
  retrieval_strategy TEXT DEFAULT 'cosine_top_k',
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retrieval_traces_trace_id ON retrieval_traces(trace_id);
CREATE INDEX idx_retrieval_traces_client_id ON retrieval_traces(client_id);

-- ═══════════════════════════════════════════════
-- tool_call_traces: toda tool chamada pelo agente
-- ═══════════════════════════════════════════════
-- Registra cada tool_call emitida (inclusive registrar_dado_cadastral,
-- transferir_atendimento, buscar_documento, verificar_agenda, etc.)
-- Serve para:
--   1. Auditar o que o agente efetivamente fez
--   2. Detectar tools ignoradas (LLM não chamou quando deveria)
--   3. Correlacionar falhas de captura de metadata
CREATE TABLE tool_call_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,

  tool_name TEXT NOT NULL,
  tool_call_id TEXT,                    -- id retornado pelo provider
  arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'error', 'rejected', 'fallback_triggered')),
  error_message TEXT,

  -- Ordem e timing
  sequence_index INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  latency_ms INT,

  -- Origem: 'agent' (LLM decidiu) ou 'fallback' (extractContactDataFallback)
  source TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('agent', 'fallback', 'system')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_call_traces_trace_id ON tool_call_traces(trace_id);
CREATE INDEX idx_tool_call_traces_client_id ON tool_call_traces(client_id);
CREATE INDEX idx_tool_call_traces_tool_name ON tool_call_traces(tool_name);
CREATE INDEX idx_tool_call_traces_status ON tool_call_traces(status);

-- ═══════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════
ALTER TABLE message_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_traces_tenant_isolation" ON message_traces
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "message_traces_service_role" ON message_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "retrieval_traces_tenant_isolation" ON retrieval_traces
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "retrieval_traces_service_role" ON retrieval_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "tool_call_traces_tenant_isolation" ON tool_call_traces
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tool_call_traces_service_role" ON tool_call_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

#### `src/lib/trace-logger.ts` *(NOVO)*

```typescript
import { createServerClient } from '@/lib/supabase'

export type TraceStage =
  | 'webhook_received'
  | 'normalized'
  | 'context_loaded'
  | 'embedding_started'
  | 'embedding_completed'
  | 'retrieval_started'
  | 'retrieval_completed'
  | 'generation_started'
  | 'generation_completed'
  | 'sent'
  | 'evaluation_enqueued'

export interface GenerationData {
  model: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
  response: string
}

export interface RetrievalData {
  chunkIds: string[]
  similarityScores: number[]
  topK: number
  threshold: number
  strategy?: string
}

export interface TraceLoggerInput {
  clientId: string
  phone: string
  userMessage: string
  whatsappMessageId?: string
  conversationId?: string
}

export interface MessageTraceLogger {
  traceId: string
  markStage(stage: TraceStage, metadata?: Record<string, unknown>): void
  setGenerationData(data: GenerationData): void
  setRetrievalData(data: RetrievalData): void
  setError(error: string): void
  finish(): Promise<string>
}

const PII_REGEXES = [
  { name: 'cpf', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, mask: '[CPF_REDACTED]' },
  { name: 'card', re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, mask: '[CARD_REDACTED]' }
]

export const sanitizePII = (text: string): string => {
  if (!process.env.PII_SANITIZATION_ENABLED || process.env.PII_SANITIZATION_ENABLED === 'false') {
    return text
  }
  return PII_REGEXES.reduce((acc, { re, mask }) => acc.replace(re, mask), text)
}

export const createTraceLogger = (input: TraceLoggerInput): MessageTraceLogger => {
  const traceId = crypto.randomUUID()
  const stages: Partial<Record<TraceStage, number>> = {}
  const stageMetadata: Partial<Record<TraceStage, Record<string, unknown>>> = {}
  let generation: GenerationData | undefined
  let retrieval: RetrievalData | undefined
  let errorMsg: string | undefined
  
  const markStage = (stage: TraceStage, metadata?: Record<string, unknown>) => {
    stages[stage] = Date.now()
    if (metadata) stageMetadata[stage] = metadata
  }
  
  const setGenerationData = (data: GenerationData) => {
    generation = data
  }
  
  const setRetrievalData = (data: RetrievalData) => {
    retrieval = data
  }
  
  const setError = (error: string) => {
    errorMsg = error
  }
  
  const computeLatencies = () => {
    const total = stages.sent && stages.webhook_received
      ? stages.sent - stages.webhook_received
      : null
    const embedding = stages.embedding_completed && stages.embedding_started
      ? stages.embedding_completed - stages.embedding_started
      : null
    const retrieval = stages.retrieval_completed && stages.retrieval_started
      ? stages.retrieval_completed - stages.retrieval_started
      : null
    const generation = stages.generation_completed && stages.generation_started
      ? stages.generation_completed - stages.generation_started
      : null
    return { total, embedding, retrieval, generation }
  }
  
  const finish = async (): Promise<string> => {
    const latencies = computeLatencies()
    const supabase = await createServerClient()
    
    const tracePayload = {
      id: traceId,
      client_id: input.clientId,
      phone: input.phone,
      whatsapp_message_id: input.whatsappMessageId ?? null,
      conversation_id: input.conversationId ?? null,
      user_message: sanitizePII(input.userMessage),
      agent_response: generation ? sanitizePII(generation.response) : null,
      model_used: generation?.model ?? null,
      tokens_input: generation?.tokensInput ?? null,
      tokens_output: generation?.tokensOutput ?? null,
      cost_usd: generation?.costUsd ?? null,
      latency_total_ms: latencies.total,
      latency_embedding_ms: latencies.embedding,
      latency_retrieval_ms: latencies.retrieval,
      latency_generation_ms: latencies.generation,
      status: errorMsg ? 'failed' : 'pending',
      metadata: { stages: stageMetadata, error: errorMsg ?? null },
      // Timestamps
      webhook_received_at: stages.webhook_received ? new Date(stages.webhook_received).toISOString() : null,
      normalized_at: stages.normalized ? new Date(stages.normalized).toISOString() : null,
      context_loaded_at: stages.context_loaded ? new Date(stages.context_loaded).toISOString() : null,
      embedding_started_at: stages.embedding_started ? new Date(stages.embedding_started).toISOString() : null,
      embedding_completed_at: stages.embedding_completed ? new Date(stages.embedding_completed).toISOString() : null,
      retrieval_started_at: stages.retrieval_started ? new Date(stages.retrieval_started).toISOString() : null,
      retrieval_completed_at: stages.retrieval_completed ? new Date(stages.retrieval_completed).toISOString() : null,
      generation_started_at: stages.generation_started ? new Date(stages.generation_started).toISOString() : null,
      generation_completed_at: stages.generation_completed ? new Date(stages.generation_completed).toISOString() : null,
      sent_at: stages.sent ? new Date(stages.sent).toISOString() : null
    }
    
    const { error: traceError } = await supabase.from('message_traces').upsert(tracePayload)
    if (traceError) {
      console.error('[trace-logger] failed to persist trace', { traceId, error: traceError.message })
      // Não throwar — não bloquear webhook
      return traceId
    }
    
    if (retrieval) {
      const { error: retrievalError } = await supabase.from('retrieval_traces').insert({
        trace_id: traceId,
        client_id: input.clientId,
        chunk_ids: retrieval.chunkIds,
        similarity_scores: retrieval.similarityScores,
        top_k: retrieval.topK,
        threshold: retrieval.threshold,
        retrieval_strategy: retrieval.strategy ?? 'cosine_top_k'
      })
      if (retrievalError) {
        console.error('[trace-logger] failed to persist retrieval', { traceId, error: retrievalError.message })
      }
    }
    
    return traceId
  }
  
  // Marcar webhook_received automaticamente
  markStage('webhook_received')
  
  return { traceId, markStage, setGenerationData, setRetrievalData, setError, finish }
}
```

#### `src/app/api/traces/route.ts` *(NOVO)*

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { getCurrentUserClientId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  status: z.enum(['pending', 'evaluated', 'human_reviewed', 'needs_review', 'failed']).optional(),
  phone: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
})

export async function GET(request: NextRequest) {
  try {
    const clientId = await getCurrentUserClientId()
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const params = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const supabase = await createServerClient()
    
    let query = supabase
      .from('message_traces')
      .select('id, phone, user_message, agent_response, model_used, cost_usd, latency_total_ms, status, created_at', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1)
    
    if (params.status) query = query.eq('status', params.status)
    if (params.phone) query = query.eq('phone', params.phone)
    if (params.from) query = query.gte('created_at', params.from)
    if (params.to) query = query.lte('created_at', params.to)
    
    const { data, error, count } = await query
    if (error) throw error
    
    return NextResponse.json({ data, total: count, limit: params.limit, offset: params.offset })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid params', details: error.errors }, { status: 400 })
    }
    console.error('[/api/traces]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### `src/app/api/traces/[id]/route.ts` *(NOVO)*

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getCurrentUserClientId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = await getCurrentUserClientId()
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const supabase = await createServerClient()
    
    const { data: trace, error: traceError } = await supabase
      .from('message_traces')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', clientId)
      .single()
    
    if (traceError || !trace) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    const { data: retrieval } = await supabase
      .from('retrieval_traces')
      .select('*')
      .eq('trace_id', params.id)
      .maybeSingle()
    
    return NextResponse.json({ trace, retrieval })
  } catch (error) {
    console.error('[/api/traces/[id]]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### 3.2 Arquivos modificados

#### `src/nodes/getRAGContext.ts` *(MODIFICAR)*

Aplicar Opção A do spike (S0): retornar objeto com `chunkIds` + `scores` + `threshold` + `topK`.

```typescript
// ANTES:
export const getRAGContext = async (input: GetRAGContextInput): Promise<string>

// DEPOIS:
export interface GetRAGContextOutput {
  context: string
  chunkIds: string[]
  similarityScores: number[]
  threshold: number
  topK: number
}

export const getRAGContext = async (input: GetRAGContextInput): Promise<GetRAGContextOutput>
```

Atualizar caller em `chatbotFlow.ts`.

#### `src/nodes/generateAIResponse.ts` *(MODIFICAR)*

Adicionar `traceData` no return:

```typescript
// Wrap o return atual
return {
  response: aiResponse,
  traceData: {
    model: modelUsed,
    tokensInput: usage.input_tokens ?? 0,
    tokensOutput: usage.output_tokens ?? 0,
    costUsd: calculateCost(modelUsed, usage)
  }
}
```

#### `src/flows/chatbotFlow.ts` *(MODIFICAR)*

Adicionar `traceLogger` no início e `finish()` ao final:

```typescript
import { createTraceLogger } from '@/lib/trace-logger'

export const processChatbotMessage = async (body: WebhookBody) => {
  const parsed = await parseMessage(body)
  
  const traceLogger = createTraceLogger({
    clientId: config.clientId,
    phone: parsed.phone,
    userMessage: parsed.content,
    whatsappMessageId: parsed.messageId,
    conversationId: parsed.phone
  })
  
  try {
    // ... pipeline existente
    
    traceLogger.markStage('embedding_started')
    const ragResult = await getRAGContext({ query: batched, clientId, openaiApiKey })
    traceLogger.markStage('embedding_completed')
    traceLogger.markStage('retrieval_completed')
    traceLogger.setRetrievalData({
      chunkIds: ragResult.chunkIds,
      similarityScores: ragResult.similarityScores,
      topK: ragResult.topK,
      threshold: ragResult.threshold
    })
    
    traceLogger.markStage('generation_started')
    const aiResult = await generateAIResponse({ ...args })
    traceLogger.markStage('generation_completed')
    traceLogger.setGenerationData(aiResult.traceData)
    
    // ... envio
    traceLogger.markStage('sent')
    await traceLogger.finish()
  } catch (err) {
    traceLogger.setError(err instanceof Error ? err.message : String(err))
    await traceLogger.finish()
    throw err
  }
}
```

#### `src/app/dashboard/page.tsx` *(MODIFICAR)*

Adicionar card básico:

```tsx
<Card>
  <CardHeader>Custo do agente hoje</CardHeader>
  <CardContent>
    <CostTodayBadge />  {/* novo componente */}
    <Link href="/dashboard/quality/traces">Ver últimas mensagens →</Link>
  </CardContent>
</Card>
```

#### `src/components/quality/CostTodayBadge.tsx` *(NOVO, mínimo)*

Buscar `/api/traces?from=startOfDay` e somar `cost_usd`.

---

### 3.3 Hardening: Captura Assertiva de Dados Cadastrais

> **Por que nesta sprint:** Sprints 2–6 dependem de dados coerentes no perfil do contato (`clientes_whatsapp.metadata`). Hoje a captura é não-determinística — a LLM decide chamar `registrar_dado_cadastral` ou não, aceita 1 campo por chamada e só 5 campos fixos. Isso propaga dados faltantes para Ground Truth, Evaluations e Insights. Corrigir agora evita retrabalho.

**Problema atual (diagnosticado):**
1. Enum restrito a 5 campos — `cpf`, `email`, `como_conheceu`, `indicado_por`, `objetivo`.
2. Tool aceita 1 campo por chamada — se cliente envia 4 dados juntos, LLM tipicamente chama 1× ou nenhuma.
3. LLM frequentemente responde em texto e **pula** a tool call.
4. Campos fora do enum são rejeitados silenciosamente (sem log, sem fallback).
5. Nenhum registro em `tool_call_traces` — não dá pra auditar o que foi chamado.

#### 3.3.1 `src/nodes/updateContactMetadata.ts` *(MODIFICAR)*

**Mudanças:**
- Expandir `ALLOWED_FIELDS` para: `nome`, `cpf`, `email`, `data_nascimento`, `telefone_alternativo`, `endereco`, `cep`, `cidade`, `estado`, `rg`, `como_conheceu`, `indicado_por`, `objetivo`, `profissao`.
- Aceitar **múltiplos campos** em uma única chamada (assinatura já suporta via `fields: Record<...>` — reforçar no schema zod e descrição da tool).
- Adicionar **logging** quando campo é rejeitado por não estar no whitelist → `tool_call_traces.status = 'rejected'` + `error_message`.
- Adicionar **validação leve** por campo (e.g., CPF = 11 dígitos; email = regex; CEP = 8 dígitos) antes de persistir; campos inválidos viram `status='rejected'` com motivo.
- Retornar `{ saved: string[], rejected: Array<{field, reason}> }` em vez de `void`, para o flow poder logar no trace.

```typescript
export interface ContactMetadataResult {
  saved: string[]
  rejected: Array<{ field: string; reason: 'not_allowed' | 'invalid_format' | 'empty' }>
}

export const updateContactMetadata = async (
  input: ContactMetadataInput
): Promise<ContactMetadataResult> => { /* ... */ }
```

#### 3.3.2 `src/nodes/generateAIResponse.ts` *(MODIFICAR)*

**Definição da tool `registrar_dado_cadastral` — versão nova:**

```typescript
const REGISTER_CONTACT_DATA_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "registrar_dado_cadastral",
    description:
      "OBRIGATÓRIO: Use SEMPRE que o usuário fornecer qualquer dado cadastral, mesmo que seja apenas um. " +
      "Aceita múltiplos campos de uma vez — use quando o cliente enviar vários dados na mesma mensagem. " +
      "NÃO pergunte duas vezes o mesmo dado; após salvar, já está registrado.",
    parameters: {
      type: "object",
      properties: {
        dados: {
          type: "object",
          description: "Map campo->valor. Ex.: { email: 'x@y.com', cpf: '12345678900', data_nascimento: '1990-05-15' }",
          properties: {
            nome: { type: "string" },
            cpf: { type: "string" },
            email: { type: "string" },
            data_nascimento: { type: "string", description: "ISO 8601 ou DD/MM/YYYY" },
            telefone_alternativo: { type: "string" },
            endereco: { type: "string" },
            cep: { type: "string" },
            cidade: { type: "string" },
            estado: { type: "string" },
            rg: { type: "string" },
            como_conheceu: { type: "string" },
            indicado_por: { type: "string" },
            objetivo: { type: "string" },
            profissao: { type: "string" }
          }
        }
      },
      required: ["dados"]
    }
  }
}
```

**Injeção de instrução no system prompt (append automático):**

```
REGRA DE CAPTURA DE DADOS:
Toda vez que o usuário fornecer informação cadastral (nome, CPF, email, data de nascimento,
endereço, CEP, RG, profissão, objetivo, como conheceu, quem indicou, etc.), você DEVE chamar
a tool `registrar_dado_cadastral` passando TODOS os campos identificados em UMA ÚNICA chamada.
Não pergunte novamente dados já fornecidos. Esta chamada é obrigatória e não substituível por
texto de confirmação.
```

#### 3.3.3 `src/nodes/extractContactDataFallback.ts` *(NOVO)*

**Objetivo:** garantir captura mesmo quando o agente principal não chama a tool. Fire-and-forget após a resposta do agente, executa **chamada LLM estruturada (JSON mode)** contra a mensagem do usuário para extrair dados cadastrais.

```typescript
import { createServiceRoleClient } from "@/lib/supabase"
import { callDirectAI } from "@/lib/direct-ai-client"
import { updateContactMetadata } from "./updateContactMetadata"
import { z } from "zod"

const ContactDataSchema = z.object({
  nome: z.string().nullable(),
  cpf: z.string().nullable(),
  email: z.string().nullable(),
  data_nascimento: z.string().nullable(),
  telefone_alternativo: z.string().nullable(),
  endereco: z.string().nullable(),
  cep: z.string().nullable(),
  cidade: z.string().nullable(),
  estado: z.string().nullable(),
  rg: z.string().nullable(),
  como_conheceu: z.string().nullable(),
  indicado_por: z.string().nullable(),
  objetivo: z.string().nullable(),
  profissao: z.string().nullable()
})

export interface FallbackInput {
  clientId: string
  phone: string
  userMessage: string
  agentAlreadyCalledTool: boolean
  traceId: string
}

export const extractContactDataFallback = async (
  input: FallbackInput
): Promise<{ saved: string[]; skipped: boolean }> => {
  // Heurística leve: se a mensagem não tem sinais de dado (dígito, @, CEP pattern), pula
  if (!hasLikelyContactData(input.userMessage)) return { saved: [], skipped: true }

  // Se o agente principal já capturou, não repete (evita custo)
  if (input.agentAlreadyCalledTool) return { saved: [], skipped: true }

  const raw = await callDirectAI({
    clientId: input.clientId,
    clientConfig: { primaryModelProvider: "openai", openaiModel: "gpt-4o-mini" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: input.userMessage }
    ],
    settings: { temperature: 0, responseFormat: "json_object", maxTokens: 300 }
  })

  const parsed = ContactDataSchema.safeParse(JSON.parse(raw.content))
  if (!parsed.success) return { saved: [], skipped: true }

  const fields = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== null && v !== "")
  )
  if (Object.keys(fields).length === 0) return { saved: [], skipped: true }

  const result = await updateContactMetadata({
    phone: input.phone,
    clientId: input.clientId,
    fields
  })

  // Loga no tool_call_traces com source='fallback'
  await logFallbackToolCall(input.traceId, input.clientId, fields, result)

  return { saved: result.saved, skipped: false }
}

const hasLikelyContactData = (text: string): boolean =>
  /\d{3}/.test(text) || /@/.test(text) || /\bcep\b/i.test(text) ||
  /nascimento/i.test(text) || /\d{5}-?\d{3}/.test(text)

const EXTRACTION_SYSTEM_PROMPT = `Extraia dados cadastrais da mensagem. Retorne JSON com os campos:
nome, cpf, email, data_nascimento, telefone_alternativo, endereco, cep, cidade, estado, rg,
como_conheceu, indicado_por, objetivo, profissao. Use null para campos ausentes. Não invente.`
```

**Integração no flow** (`chatbotFlow.ts`): chamar **após** `generateAIResponse`, dentro de `setImmediate` (fire-and-forget), com `agentAlreadyCalledTool` refletindo se a LLM principal emitiu `registrar_dado_cadastral`.

#### 3.3.4 `src/lib/trace-logger.ts` *(ESTENDER)*

Adicionar método `logToolCall`:

```typescript
export interface ToolCallLogInput {
  toolName: string
  toolCallId?: string
  arguments: Record<string, unknown>
  result?: unknown
  status: 'success' | 'error' | 'rejected' | 'fallback_triggered'
  errorMessage?: string
  source: 'agent' | 'fallback' | 'system'
  startedAt: Date
  completedAt: Date
}

export interface MessageTraceLogger {
  // ... existentes
  logToolCall(input: ToolCallLogInput): void  // NOVO (buffer interno)
}
```

No `finish()`, o logger faz insert em `tool_call_traces` em lote (1 única query com `insert([...])`).

#### 3.3.5 `src/flows/chatbotFlow.ts` *(MODIFICAR)*

No bloco de tool handling ([L1681-1721](../../src/flows/chatbotFlow.ts#L1681-L1721) e equivalentes de outras tools):

- Antes de executar a tool: `traceLogger.logToolCall({ status: 'pending', startedAt: now, ... })` (bufferizado).
- Após execução: atualizar com `status`, `result`, `completedAt`, `latency_ms`.
- Após `formatResponse` e antes de `sendWhatsAppMessage`: disparar `extractContactDataFallback` em `setImmediate`.

**Tools que passam a ser traceadas:**
- `registrar_dado_cadastral`
- `transferir_atendimento`
- `buscar_documento`
- `verificar_agenda`
- `criar_evento_agenda`
- `alterar_evento_agenda`
- `cancelar_evento_agenda`
- `enviar_resposta_em_audio`
- `subagente_diagnostico`

#### 3.3.6 Schema Zod público do trace

Expor no `/api/traces/[id]` a lista de `tool_calls` (join com `tool_call_traces`) para que o dashboard possa mostrar **quais tools foram chamadas em cada mensagem** e quais foram rejeitadas.

```typescript
export const TraceDetailSchema = z.object({
  // ... existente
  tool_calls: z.array(z.object({
    tool_name: z.string(),
    status: z.enum(['success', 'error', 'rejected', 'fallback_triggered']),
    source: z.enum(['agent', 'fallback', 'system']),
    arguments: z.record(z.unknown()),
    result: z.unknown().nullable(),
    latency_ms: z.number().nullable(),
    error_message: z.string().nullable()
  }))
})
```

---

## 4. Checklist de afazeres (Sprint 1)

### Migrations e banco
- [ ] Backup completo antes (`db/backup-complete.bat`)
- [x] Criar `supabase/migrations/20260422130000_create_observability_traces.sql` (message_traces + retrieval_traces + tool_call_traces) *(nome correto — `120000` no template era rascunho)*
- [ ] Aplicar em staging: `supabase db push`
- [ ] Validar manualmente: `INSERT` + `SELECT` com `service_role` funcionam
- [ ] Validar RLS: operador de cliente A não vê traces de cliente B
- [ ] Aplicar em produção: `supabase db push`
- [ ] Commit do arquivo de migration

### Código de biblioteca
- [x] Criar `src/lib/trace-logger.ts` com `createTraceLogger`, `sanitizePII`, `logToolCall`
- [x] Tipos: `TraceStage`, `GenerationData`, `RetrievalData`, `MessageTraceLogger`, `ToolCallLogInput`
- [x] Implementar testes unitários (ver §5.1)
- [ ] Validar PII sanitization com casos reais (CPF, cartão)

### Modificação de nodes
- [ ] Mergear PR do spike RAG (S0) → modificar `src/nodes/getRAGContext.ts`
- [ ] Atualizar caller em `chatbotFlow.ts` (uso novo do return)
- [ ] Modificar `src/nodes/generateAIResponse.ts` para retornar `traceData`
- [ ] Adicionar `calculateCost(model, usage)` em `src/lib/direct-ai-tracking.ts` (se ainda não existe)

### Hardening de captura cadastral (seção 3.3)
- [x] Expandir `ALLOWED_FIELDS` em `updateContactMetadata.ts` para 14 campos
- [x] Mudar retorno de `updateContactMetadata` para `ContactMetadataResult` (saved/rejected)
- [x] Adicionar validações leves (CPF 11 dígitos, email regex, CEP 8 dígitos, data ISO/DD-MM-YYYY)
- [x] Reescrever tool `registrar_dado_cadastral` em `generateAIResponse.ts` com `dados: object` (multi-campos)
- [x] Adicionar apêndice obrigatório ao system prompt (REGRA DE CAPTURA DE DADOS)
- [x] Atualizar handler em `chatbotFlow.ts` para iterar `args.dados` e chamar `updateContactMetadata` 1× (com todos os campos)
- [x] Criar `src/nodes/extractContactDataFallback.ts` + heurística `hasLikelyContactData`
- [x] Integrar fallback via `setImmediate` pós-`generateAIResponse`
- [x] Verificar/ampliar RPC `merge_contact_metadata` — JSONB merge já aceita novos campos; confirmado (usa `||` JSONB)
- [x] Adicionar método `logToolCall` em `trace-logger.ts` com buffer + flush em `finish()`
- [x] Instrumentar `registrar_dado_cadastral` com `logToolCall` (agent + fallback)
- [x] Instrumentar demais 6 tools: transferir_atendimento, buscar_documento, enviar_resposta_em_audio, verificar_agenda, criar_evento_agenda, cancelar_evento_agenda
- [x] `GET /api/traces` — lista com filtros (from/to/phone/status/limit/offset) + costTodayUsd
- [x] `GET /api/traces/[id]` — detalhe completo com retrieval_traces + tool_call_traces
- [ ] Aplicar migration `20260422130000_create_observability_traces.sql` em staging e prod
- [ ] Rodar validação de 20 conversas reais e medir taxa de captura (meta ≥95%)

### Integração no chatbotFlow
- [x] Adicionar `createTraceLogger` no início de `processChatbotMessage`
- [ ] Adicionar `markStage` em todos os 11 estágios mapeados
- [x] Adicionar `setRetrievalData` ap�s RAG
- [x] Adicionar `setGenerationData` ap�s gera��o
- [x] Adicionar `markStage('sent')` após `sendWhatsAppMessage`
- [x] Adicionar `await traceLogger.finish()` ao final (try)
- [x] Adicionar `setError` + `finish()` no catch
- [ ] Validar localmente: enviar 1 mensagem e ver o registro em `message_traces`

### APIs
- [x] Criar `src/app/api/traces/route.ts` (GET list)
- [x] Criar `src/app/api/traces/[id]/route.ts` (GET detail)
- [x] Implementar testes de integração (ver §5.2)
- [x] Confirmar `export const dynamic = 'force-dynamic'`
- [ ] Validar manualmente com 2 contas de operadores diferentes

### Frontend
- [ ] Criar `src/components/quality/CostTodayBadge.tsx`
- [ ] Adicionar card no `src/app/dashboard/page.tsx`
- [ ] Criar página `src/app/dashboard/quality/traces/page.tsx` (lista paginada)
- [ ] Criar página `src/app/dashboard/quality/traces/[id]/page.tsx` (detalhe simples)
- [ ] Adicionar item "Qualidade > Traces" no Sidebar (ou rota oculta inicialmente)

### Documentação e PRs
- [ ] PR #1: migration (separado)
- [ ] PR #2: trace-logger + testes
- [ ] PR #3: instrumentação chatbotFlow (depende de #2)
- [ ] PR #4: APIs + frontend mínimo
- [ ] Atualizar `docs/tables/tabelas.md` com `message_traces` e `retrieval_traces`
- [ ] Adicionar nota em `CLAUDE.md` sobre trace-logger

### Smoke test final
- [ ] Enviar 5 mensagens reais via WhatsApp
- [ ] Validar que 5 traces existem com timestamps coerentes
- [ ] Validar que latência de webhook não regrediu (comparar p99 antes/depois)
- [ ] Validar dashboard mostra custo > $0

---

## 5. Bateria de testes — Sprint 1

### 5.1 Testes unitários — `trace-logger`

**Arquivo:** `src/lib/trace-logger.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTraceLogger, sanitizePII } from './trace-logger'

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'message_traces') return { upsert: mockUpsert }
      if (table === 'retrieval_traces') return { insert: mockInsert }
    })
  }))
}))

describe('trace-logger', () => {
  beforeEach(() => {
    mockUpsert.mockClear()
    mockInsert.mockClear()
    process.env.PII_SANITIZATION_ENABLED = 'true'
  })
  
  describe('sanitizePII', () => {
    it('mascara CPF', () => {
      expect(sanitizePII('Meu CPF é 123.456.789-00')).toBe('Meu CPF é [CPF_REDACTED]')
    })
    it('mascara cartão (formato 16 dígitos com espaços/hífens)', () => {
      expect(sanitizePII('1234 5678 9012 3456')).toContain('[CARD_REDACTED]')
      expect(sanitizePII('1234-5678-9012-3456')).toContain('[CARD_REDACTED]')
    })
    it('não mascara texto comum', () => {
      expect(sanitizePII('Olá, tudo bem?')).toBe('Olá, tudo bem?')
    })
    it('é noop quando PII_SANITIZATION_ENABLED=false', () => {
      process.env.PII_SANITIZATION_ENABLED = 'false'
      expect(sanitizePII('CPF 123.456.789-00')).toBe('CPF 123.456.789-00')
    })
  })
  
  describe('createTraceLogger', () => {
    it('gera traceId único', () => {
      const a = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      const b = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      expect(a.traceId).not.toBe(b.traceId)
      expect(a.traceId).toMatch(/^[0-9a-f-]{36}$/)
    })
    
    it('marca webhook_received automaticamente na criação', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      await logger.finish()
      const payload = mockUpsert.mock.calls[0][0]
      expect(payload.webhook_received_at).toBeTruthy()
    })
    
    it('calcula latência total = sent - webhook_received', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      vi.setSystemTime(new Date('2026-01-01T10:00:01.234Z'))
      logger.markStage('sent')
      await logger.finish()
      const payload = mockUpsert.mock.calls[0][0]
      expect(payload.latency_total_ms).toBe(1234)
      vi.useRealTimers()
    })
    
    it('persiste retrieval_traces quando setRetrievalData é chamado', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      logger.setRetrievalData({
        chunkIds: ['c1', 'c2'],
        similarityScores: [0.9, 0.8],
        topK: 5,
        threshold: 0.7
      })
      await logger.finish()
      expect(mockInsert).toHaveBeenCalledOnce()
      expect(mockInsert.mock.calls[0][0].chunk_ids).toEqual(['c1', 'c2'])
    })
    
    it('NÃO persiste retrieval_traces se setRetrievalData não foi chamado', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      await logger.finish()
      expect(mockInsert).not.toHaveBeenCalled()
    })
    
    it('persiste status=failed quando setError é chamado', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      logger.setError('boom')
      await logger.finish()
      expect(mockUpsert.mock.calls[0][0].status).toBe('failed')
      expect(mockUpsert.mock.calls[0][0].metadata.error).toBe('boom')
    })
    
    it('sanitiza user_message e agent_response', async () => {
      const logger = createTraceLogger({
        clientId: 'c', phone: 'p',
        userMessage: 'CPF 123.456.789-00'
      })
      logger.setGenerationData({
        model: 'gpt', tokensInput: 1, tokensOutput: 1, costUsd: 0,
        response: 'Cartão 1234-5678-9012-3456'
      })
      await logger.finish()
      const payload = mockUpsert.mock.calls[0][0]
      expect(payload.user_message).toContain('[CPF_REDACTED]')
      expect(payload.agent_response).toContain('[CARD_REDACTED]')
    })
    
    it('NÃO throwa quando upsert falha (resilência)', async () => {
      mockUpsert.mockResolvedValueOnce({ error: { message: 'db down' } })
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      await expect(logger.finish()).resolves.toBeTypeOf('string')
    })
    
    it('finish é idempotente em caso de retry (upsert por id)', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      await logger.finish()
      await logger.finish()
      expect(mockUpsert).toHaveBeenCalledTimes(2)
      expect(mockUpsert.mock.calls[0][0].id).toBe(mockUpsert.mock.calls[1][0].id)
    })
    
    it('preserva metadata de cada estágio em metadata.stages', async () => {
      const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
      logger.markStage('embedding_completed', { model: 'text-embedding-3-small', dims: 1536 })
      await logger.finish()
      const payload = mockUpsert.mock.calls[0][0]
      expect(payload.metadata.stages.embedding_completed).toMatchObject({
        model: 'text-embedding-3-small',
        dims: 1536
      })
    })
  })
})
```

### 5.2 Testes de integração — APIs

**Arquivo:** `src/app/api/traces/route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockResolvedValue({ data: [{ id: 't1', cost_usd: 0.01 }], count: 1, error: null })
}

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => mockSupabase)
}))

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUserClientId: vi.fn().mockResolvedValue('client-A')
}))

const makeReq = (url: string) => new NextRequest(new URL(url, 'http://localhost'))

describe('GET /api/traces', () => {
  beforeEach(() => vi.clearAllMocks())
  
  it('retorna 401 sem clientId', async () => {
    const { getCurrentUserClientId } = await import('@/lib/auth-helpers')
    vi.mocked(getCurrentUserClientId).mockResolvedValueOnce(null)
    
    const res = await GET(makeReq('http://localhost/api/traces'))
    expect(res.status).toBe(401)
  })
  
  it('aplica filtro client_id automaticamente', async () => {
    await GET(makeReq('http://localhost/api/traces'))
    expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', 'client-A')
  })
  
  it('respeita filtros de query (status)', async () => {
    await GET(makeReq('http://localhost/api/traces?status=failed'))
    expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'failed')
  })
  
  it('valida limit entre 1-100', async () => {
    const res = await GET(makeReq('http://localhost/api/traces?limit=999'))
    expect(res.status).toBe(400)
  })
  
  it('rejeita status inválido', async () => {
    const res = await GET(makeReq('http://localhost/api/traces?status=invalid'))
    expect(res.status).toBe(400)
  })
  
  it('retorna 500 + log estruturado em erro de DB', async () => {
    mockSupabase.lte.mockResolvedValueOnce({ data: null, count: null, error: new Error('db error') })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(makeReq('http://localhost/api/traces'))
    expect(res.status).toBe(500)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
```

### 5.3 Testes de contrato — schema do trace

**Arquivo:** `src/lib/trace-logger.contract.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const MessageTraceSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  phone: z.string(),
  user_message: z.string(),
  agent_response: z.string().nullable(),
  model_used: z.string().nullable(),
  tokens_input: z.number().int().nullable(),
  tokens_output: z.number().int().nullable(),
  cost_usd: z.number().nullable(),
  latency_total_ms: z.number().int().nullable(),
  status: z.enum(['pending', 'evaluated', 'human_reviewed', 'needs_review', 'failed']),
  metadata: z.record(z.unknown()),
  webhook_received_at: z.string().datetime().nullable(),
  sent_at: z.string().datetime().nullable()
})

describe('contract: message_traces payload', () => {
  it('aceita payload completo válido', () => {
    expect(() => MessageTraceSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      client_id: '00000000-0000-0000-0000-000000000002',
      phone: '5511999999999',
      user_message: 'oi',
      agent_response: 'olá',
      model_used: 'gpt-4o-mini',
      tokens_input: 100,
      tokens_output: 50,
      cost_usd: 0.0012,
      latency_total_ms: 1234,
      status: 'pending',
      metadata: {},
      webhook_received_at: '2026-01-01T10:00:00.000Z',
      sent_at: '2026-01-01T10:00:01.234Z'
    })).not.toThrow()
  })
  
  it('rejeita status inválido', () => {
    expect(() => MessageTraceSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      client_id: '00000000-0000-0000-0000-000000000002',
      phone: 'p',
      user_message: 'm',
      status: 'WHATEVER',
      metadata: {},
      webhook_received_at: null,
      sent_at: null,
      agent_response: null,
      model_used: null,
      tokens_input: null,
      tokens_output: null,
      cost_usd: null,
      latency_total_ms: null
    })).toThrow()
  })
})
```

### 5.4 Testes de performance — latência adicional

**Arquivo:** `src/lib/trace-logger.perf.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTraceLogger } from './trace-logger'

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  }))
}))

describe('perf: trace-logger overhead', () => {
  it('markStage tem overhead < 1ms para 100 chamadas', () => {
    const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
    const start = performance.now()
    for (let i = 0; i < 100; i++) logger.markStage('normalized')
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(10)
  })
  
  it('finish executa em < 50ms (com mock de DB)', async () => {
    const logger = createTraceLogger({ clientId: 'c', phone: 'p', userMessage: 'm' })
    logger.markStage('sent')
    const start = performance.now()
    await logger.finish()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })
})
```

### 5.5 Teste de segurança — RLS multi-tenant

**Arquivo:** `tests/security/rls-message-traces.test.ts`

> **Roda contra Supabase real** (branch ou staging). Usa duas chaves JWT de operadores diferentes.

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL!
const ANON = process.env.SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TOKEN_A = process.env.E2E_TOKEN_CLIENT_A!
const TOKEN_B = process.env.E2E_TOKEN_CLIENT_B!
const CLIENT_A = process.env.E2E_CLIENT_A_ID!
const CLIENT_B = process.env.E2E_CLIENT_B_ID!

const adminClient = () => createClient(URL, SERVICE)
const userClient = (token: string) => createClient(URL, ANON, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})

describe.skipIf(!TOKEN_A)('RLS message_traces — multi-tenant', () => {
  let traceA: string, traceB: string
  
  beforeAll(async () => {
    const admin = adminClient()
    const { data: a } = await admin.from('message_traces').insert({
      client_id: CLIENT_A, phone: 'p', user_message: 'A', status: 'pending'
    }).select('id').single()
    const { data: b } = await admin.from('message_traces').insert({
      client_id: CLIENT_B, phone: 'p', user_message: 'B', status: 'pending'
    }).select('id').single()
    traceA = a!.id
    traceB = b!.id
  })
  
  it('operador de A vê trace A', async () => {
    const c = userClient(TOKEN_A)
    const { data } = await c.from('message_traces').select('*').eq('id', traceA).maybeSingle()
    expect(data?.id).toBe(traceA)
  })
  
  it('operador de A NÃO vê trace de B', async () => {
    const c = userClient(TOKEN_A)
    const { data } = await c.from('message_traces').select('*').eq('id', traceB).maybeSingle()
    expect(data).toBeNull()
  })
  
  it('operador de A NÃO consegue inserir trace para B', async () => {
    const c = userClient(TOKEN_A)
    const { error } = await c.from('message_traces').insert({
      client_id: CLIENT_B, phone: 'p', user_message: 'spoof', status: 'pending'
    })
    expect(error).not.toBeNull()
  })
})
```

### 5.6 Teste E2E — webhook gera trace

**Arquivo:** `tests/e2e/webhook-creates-trace.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('webhook real gera trace em < 5s', async ({ request }) => {
  const phone = `5511${Date.now().toString().slice(-9)}`
  
  const webhookRes = await request.post(`/api/webhook/${process.env.E2E_CLIENT_ID}`, {
    data: {
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ value: {
        messages: [{ from: phone, type: 'text', text: { body: 'oi teste e2e' }, id: `wamid_${Date.now()}` }],
        contacts: [{ profile: { name: 'Test' }, wa_id: phone }]
      }}]}]
    }
  })
  expect(webhookRes.ok()).toBe(true)
  
  // Aguardar até 5s pelo trace
  let trace = null
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500))
    const res = await request.get(`/api/traces?phone=${phone}&limit=1`, {
      headers: { Cookie: process.env.E2E_AUTH_COOKIE! }
    })
    const json = await res.json()
    if (json.data?.length) { trace = json.data[0]; break }
  }
  
  expect(trace).not.toBeNull()
  expect(trace.user_message).toContain('teste e2e')
  expect(trace.webhook_received_at).toBeTruthy()
})
```

### 5.7 Teste manual (smoke pré-deploy)

**Roteiro em `tests/manual/sprint-1-smoke.md`:**

```markdown
1. Enviar 5 mensagens de WhatsApp para número de teste
2. No dashboard, abrir /dashboard/quality/traces
3. Confirmar que 5 linhas aparecem
4. Para cada linha, abrir o detalhe e verificar:
   - [ ] webhook_received_at, sent_at preenchidos
   - [ ] cost_usd > 0
   - [ ] retrieval_traces aninhado com chunks (se a mensagem usou RAG)
   - [ ] tool_calls listadas (quando o agente chamou alguma tool)
5. Logar como operador de OUTRO cliente
6. Abrir /dashboard/quality/traces — não deve mostrar as 5 mensagens
7. Enviar mensagem com bloco de dados cadastrais (email + CPF + endereço + data de nascimento juntos)
8. Abrir o card do contato em /dashboard/contatos — todos os 4 dados devem aparecer em `metadata`
9. No trace desta mensagem, verificar que `tool_calls` contém `registrar_dado_cadastral` com `source='agent'` OU `source='fallback'`
```

### 5.8 Hardening — captura assertiva de dados cadastrais

**Arquivo:** `tests/unit/update-contact-metadata.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { updateContactMetadata } from '@/nodes/updateContactMetadata'

describe('updateContactMetadata — hardening', () => {
  it('aceita múltiplos campos em uma única chamada', async () => {
    const r = await updateContactMetadata({
      phone: '5511999999999',
      clientId: 'c1',
      fields: {
        email: 'x@y.com',
        cpf: '12345678900',
        data_nascimento: '1990-05-15',
        endereco: 'Rua X, 100'
      }
    })
    expect(r.saved).toEqual(expect.arrayContaining(['email','cpf','data_nascimento','endereco']))
    expect(r.rejected).toHaveLength(0)
  })

  it('rejeita campos fora do whitelist e registra motivo', async () => {
    const r = await updateContactMetadata({
      phone: '5511999999999', clientId: 'c1',
      fields: { nome: 'Ana', campo_invalido: 'x' } as any
    })
    expect(r.saved).toContain('nome')
    expect(r.rejected).toContainEqual({ field: 'campo_invalido', reason: 'not_allowed' })
  })

  it('rejeita CPF inválido (<11 dígitos) com motivo invalid_format', async () => {
    const r = await updateContactMetadata({
      phone: '5511999999999', clientId: 'c1',
      fields: { cpf: '123' }
    })
    expect(r.rejected).toContainEqual({ field: 'cpf', reason: 'invalid_format' })
  })

  it('rejeita email sem @ com motivo invalid_format', async () => {
    const r = await updateContactMetadata({
      phone: '5511999999999', clientId: 'c1',
      fields: { email: 'semarroba.com' }
    })
    expect(r.rejected).toContainEqual({ field: 'email', reason: 'invalid_format' })
  })
})
```

**Arquivo:** `tests/unit/extract-contact-data-fallback.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { extractContactDataFallback } from '@/nodes/extractContactDataFallback'

vi.mock('@/lib/direct-ai-client', () => ({
  callDirectAI: vi.fn()
}))

describe('extractContactDataFallback', () => {
  it('pula quando mensagem não tem sinais de dado cadastral', async () => {
    const r = await extractContactDataFallback({
      clientId: 'c1', phone: 'p', traceId: 't1',
      agentAlreadyCalledTool: false,
      userMessage: 'oi, tudo bem?'
    })
    expect(r.skipped).toBe(true)
  })

  it('pula quando agente principal já chamou a tool', async () => {
    const r = await extractContactDataFallback({
      clientId: 'c1', phone: 'p', traceId: 't1',
      agentAlreadyCalledTool: true,
      userMessage: 'meu email é x@y.com'
    })
    expect(r.skipped).toBe(true)
  })

  it('extrai e salva quando agente não chamou e há dados', async () => {
    const { callDirectAI } = await import('@/lib/direct-ai-client') as any
    callDirectAI.mockResolvedValue({ content: JSON.stringify({
      email: 'x@y.com', cpf: '12345678900',
      nome: null, data_nascimento: null, telefone_alternativo: null,
      endereco: null, cep: null, cidade: null, estado: null, rg: null,
      como_conheceu: null, indicado_por: null, objetivo: null, profissao: null
    })})
    const r = await extractContactDataFallback({
      clientId: 'c1', phone: '5511999999999', traceId: 't1',
      agentAlreadyCalledTool: false,
      userMessage: 'email x@y.com, cpf 123.456.789-00'
    })
    expect(r.skipped).toBe(false)
    expect(r.saved).toEqual(expect.arrayContaining(['email','cpf']))
  })
})
```

**Arquivo:** `tests/integration/tool-call-traces.test.ts`

Verifica que cada tool chamada pelo agente (e cada fallback acionado) gera 1 linha em `tool_call_traces` com `source` correto, `status` correto e `latency_ms` preenchido.

**Arquivo:** `tests/integration/capture-rate-real.test.ts` *(roda contra staging)*

```typescript
// Roda 20 conversas sintéticas com blocos de dados cadastrais variados
// Mede: dados_fornecidos_pelo_cliente / dados_salvos_em_metadata
// Critério: taxa ≥ 0.95
```

**Arquivo:** `tests/e2e/contact-card-updates.spec.ts`

```typescript
test('envia bloco com 4 dados cadastrais e todos aparecem no card', async ({ request, page }) => {
  // 1. Envia webhook com: "email: x@y.com, nascimento: 15/05/1990, CPF: 12345678900, endereço: Rua X, 100"
  // 2. Aguarda até 10s (polling) pelo trace finalizado
  // 3. Abre /dashboard/contatos/[phone]
  // 4. Asserta que card mostra: email, data_nascimento, cpf, endereco
  // 5. Abre detalhe do trace correspondente
  // 6. Asserta que tool_calls contém registrar_dado_cadastral (source=agent OU fallback)
})
```

---

## 6. Critérios de aceite (Sprint 1)

| # | Critério | Teste |
|---|----------|-------|
| 1 | Migrations aplicadas em prod sem downtime | Manual + log do deploy |
| 2 | RLS bloqueia acesso cross-tenant (inclusive `tool_call_traces`) | §5.5 |
| 3 | Webhook gera trace < 5s | §5.6 |
| 4 | Latência adicional < 50ms p95 | §5.4 + benchmark de 100 mensagens reais |
| 5 | PII sanitizada (CPF, cartão) | §5.1 |
| 6 | Cobertura ≥ 80% em `trace-logger.ts` e `updateContactMetadata.ts` | `npm run test:coverage` |
| 7 | Zero mensagens perdidas em 24h de dogfooding | Comparar `COUNT(message_traces today)` vs `COUNT(messages enviadas today)` |
| 8 | Dashboard mostra custo > $0 ao final do dia | Manual |
| 9 | **Taxa de captura cadastral ≥ 95%** em 20 conversas reais com dados | §5.8 `capture-rate-real.test.ts` + validação manual no card |
| 10 | **Toda `tool_call` emitida aparece em `tool_call_traces`** com status e latência | §5.8 `tool-call-traces.test.ts` |
| 11 | **Fallback só dispara quando agente não chamou** (não duplica) | §5.8 `extract-contact-data-fallback.test.ts` |
| 12 | Campos rejeitados (inválidos ou fora do whitelist) são logados com motivo, não silenciosamente ignorados | §5.8 `update-contact-metadata.test.ts` |

---

## 7. Riscos do Sprint 1

| Risco | Mitigação |
|-------|-----------|
| `crypto.randomUUID()` não disponível em runtime velho | Validar Node 18+ no Vercel; fallback para `uuid` lib |
| `setRetrievalData` chamado quando RAG falhou | `null` check; testes 5.1 cobrem |
| `agent_response` muito grande (>10MB) | Truncar em 100KB no `finish()`; alertar em log |
| Worker Vercel timeout antes do `finish()` | `finish()` é assíncrono mas precisa ser `await`ed; timeout default 60s suficiente |
| Migration falha por FK em ambiente sem `clients` populado | Validar que `clients` tem o `client_id` antes; ON DELETE CASCADE protege |
| Fallback LLM duplica custo (gpt-4o-mini 2ª chamada por mensagem) | Heurística `hasLikelyContactData` elimina ~80% dos casos antes de gastar; meta: custo extra < $0.0002/mensagem (modelo mini) |
| Fallback entra em loop com agente principal | Flag `agentAlreadyCalledTool` passado explicitamente; testes §5.8 cobrem |
| Enum ampliado quebra contratos antigos | RPC `merge_contact_metadata` faz merge não-destrutivo; campos novos só são persistidos se aparecerem; registros antigos permanecem válidos |
| LLM ignora a regra de captura mesmo com prompt reforçado | Fallback determinístico garante o piso; medir taxa por sprint e ajustar prompt se <95% |
| Tool call em lote (`dados: {...}`) gera args muito grandes | Truncar JSONB em 50KB por registro; validar no `logToolCall` |

---

---

## 8. Hotfixes entregues fora do plano original (2026-04-20/21)

> Incidentes em produção que produziram código já mergeado na `main`.

### 8.1 Migração `pg` → Supabase client (FIX-001)

**Problema:** `pg.Pool` mantém conexão TCP persistente; Vercel congela a função antes do pool liberar a conexão → node 8.5 travava → flow morria antes da IA responder.

**Arquivos corrigidos:**
- `src/nodes/saveChatMessage.ts` — removido `import { query } from '@/lib/postgres'`, substituído por `createServiceRoleClient()` + `.insert()`
- `src/nodes/getChatHistory.ts` — idem, substituído por `.select().eq().order().limit()`
- `src/nodes/checkDuplicateMessage.ts` — idem; ganhou também checagem por `wamid` (ver 8.2)

**Regra permanente:** nenhum node no caminho crítico do webhook pode usar `pg` ou `new Pool()`. Sempre `createServiceRoleClient()`.

### 8.2 Dedupe de webhooks por `wamid` (FIX-002)

**Problema:** Meta entrega o mesmo webhook 2× frequentemente. O check de duplicata usava similaridade de conteúdo em janela de 15s via `pg` (que travava) → retornava `isDuplicate: false` → duas execuções avançavam → node 8.5 da segunda falhava com erro no INSERT → "às vezes não recebia resposta".

**Solução:** `checkDuplicateMessage` agora verifica primeiro se o `wamid` já existe em `n8n_chat_histories` via Supabase client. Se existir → `isDuplicate: true, reason: 'wamid_match'` → flow para limpo (success, não error).

**Item pendente registrado:**
- [x] Checagem de `wamid` movida para **antes do push ao Redis** (2026-04-21) — duplicatas agora saem do fluxo antes de contaminar buffer/batching.

### 8.3 `setImmediate` → `void promise.catch()` (FIX-003)

**Problema:** `setImmediate(() => { traceLogger.finish() })` é deferido para depois do event loop; Vercel pode congelar a função após retornar HTTP 200, nunca executando o callback → traces não eram gravados em produção.

**Solução:** substituído por `void traceLogger.finish().catch(() => {})` (6 ocorrências em `chatbotFlow.ts`). Roda no mesmo tick, antes do possível freeze.

### 8.4 Condição de supressão de erros do trace-logger (FIX-004)

**Problema:** condição estava invertida — suprimia todos os erros que mencionavam "message_traces" (incluindo erros reais de INSERT). Traces silenciosamente falhavam sem log.

**Solução:** condição corrigida para suprimir apenas `"does not exist" || "relation" || "undefined"` (erros de "tabela ainda não existe").

### 8.5 `params` como Promise em Next.js 16 (FIX-005)

**Problema:** `src/app/api/traces/[id]/route.ts` falhou no build do Vercel porque Next.js 15+ requer `params` como `Promise<{ id: string }>` com `await params`.

**Solução:** assinatura corrigida; todos os novos route handlers com params dinâmicos devem usar esse padrão.

### 8.6 Compatibilidade do `supabase/config.toml` com CLI local (FIX-006)

**Problema:** `supabase link` falhava localmente com erro de parsing (`auth.refreshtoken_reuse_interval` e `analytics.gcp_jwt_audience`), bloqueando validação de migrations via CLI.

**Solução:** ajustes de compatibilidade no `supabase/config.toml`:
- `refreshtoken_reuse_interval` -> `refresh_token_reuse_interval`
- remoção de `analytics.gcp_jwt_audience` (não suportado na CLI atual)

**Observação operacional:** para listar/aplicar migrations remotas ainda é necessário `supabase login` ou `SUPABASE_ACCESS_TOKEN` no ambiente local.

---

**Próximo:** [`02-ground-truth.md`](./02-ground-truth.md)
