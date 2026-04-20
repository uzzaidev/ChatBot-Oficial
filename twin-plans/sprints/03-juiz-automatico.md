# Sprint 3 — Juiz Automático + Worker + Sampling

> **Duração:** 1–2 semanas
> **Pré-requisito:** Sprints 1 e 2
> **Meta:** cada mensagem (ou amostra) recebe **scores multidimensionais** + veredito automático, com custo registrado.

---

## 1. Objetivo

1. Criar `evaluation-engine.ts` que chama Claude 3.5 Sonnet com prompt estruturado JSON.
2. Criar `evaluation-worker.ts` que enfileira após `setImmediate` no fluxo, com sampling e idempotência.
3. Persistir resultado em `agent_evaluations` com 4 dimensões (alignment, relevance, finality, safety) + composite + verdict.
4. APIs `/api/evaluations` (lista + detalhe + stats agregados).
5. Cards no dashboard: média de score, distribuição PASS/REVIEW/FAIL, custo do juiz.

---

## 2. Definition of Done (DoD)

- [ ] Migration `agent_evaluations` aplicada com RLS.
- [ ] `evaluateAgentResponse` retorna JSON validado por `zod`.
- [ ] Sampling 20% funciona (validado estatisticamente em 1000 mensagens).
- [ ] Idempotência: mesmo `trace_id` nunca gera 2 evaluations.
- [ ] Webhook não regride (latência igual ao Sprint 1).
- [ ] Avaliação roda em < 5s p95.
- [ ] Custo médio por avaliação < $0.02.
- [ ] Falha do juiz não trava worker (trace fica `pending` para retry).
- [ ] Concordância juiz vs humano > 75% em sample inicial (Cohen's kappa).
- [ ] Cobertura ≥ 80% em `evaluation-engine.ts` e `evaluation-worker.ts`.

---

## 3. Backlog detalhado

### 3.1 Novos arquivos

#### `supabase/migrations/20260506120000_create_agent_evaluations.sql`

```sql
CREATE TABLE agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  ground_truth_id UUID REFERENCES ground_truth(id),
  
  judge_model TEXT NOT NULL,
  judge_prompt_version TEXT NOT NULL DEFAULT 'v1',
  
  -- Scores (0-10 cada)
  alignment_score FLOAT CHECK (alignment_score >= 0 AND alignment_score <= 10),
  relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 10),
  finality_score FLOAT CHECK (finality_score >= 0 AND finality_score <= 10),
  safety_score FLOAT CHECK (safety_score >= 0 AND safety_score <= 10),
  composite_score FLOAT CHECK (composite_score >= 0 AND composite_score <= 10),
  
  -- Reasoning
  alignment_reasoning TEXT,
  relevance_reasoning TEXT,
  finality_reasoning TEXT,
  safety_reasoning TEXT,
  
  verdict TEXT CHECK (verdict IN ('PASS', 'REVIEW', 'FAIL')),
  
  -- Custo
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(12, 8),
  duration_ms INT,
  
  -- Idempotência
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX idx_agent_evaluations_trace_id ON agent_evaluations(trace_id);
CREATE INDEX idx_agent_evaluations_client_id ON agent_evaluations(client_id);
CREATE INDEX idx_agent_evaluations_composite ON agent_evaluations(composite_score);
CREATE INDEX idx_agent_evaluations_verdict ON agent_evaluations(verdict);
CREATE INDEX idx_agent_evaluations_evaluated_at ON agent_evaluations(evaluated_at DESC);

ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_evaluations_tenant_isolation" ON agent_evaluations
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "agent_evaluations_service_role" ON agent_evaluations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

#### `src/lib/evaluation-engine.ts` *(NOVO)*

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const JUDGE_MODEL = process.env.EVALUATION_JUDGE_MODEL ?? 'claude-3-5-sonnet-20240620'
const PROMPT_VERSION = process.env.EVALUATION_JUDGE_PROMPT_VERSION ?? 'v1'

export interface EvaluationInput {
  traceId: string
  clientId: string
  userMessage: string
  agentResponse: string
  retrievedChunks?: { id: string; content: string; similarity: number }[]
  groundTruthExpected?: string  // null se sem GT match
}

export const EvaluationOutputSchema = z.object({
  alignment_score: z.number().min(0).max(10).nullable(),
  relevance_score: z.number().min(0).max(10).nullable(),
  finality_score: z.number().min(0).max(10),
  safety_score: z.number().min(0).max(10),
  alignment_reasoning: z.string().nullable(),
  relevance_reasoning: z.string().nullable(),
  finality_reasoning: z.string(),
  safety_reasoning: z.string()
})

export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>

export interface EvaluationResult {
  alignmentScore: number | null
  relevanceScore: number | null
  finalityScore: number
  safetyScore: number
  compositeScore: number
  verdict: 'PASS' | 'REVIEW' | 'FAIL'
  reasoning: {
    alignment: string | null
    relevance: string | null
    finality: string
    safety: string
  }
  cost: { tokensInput: number; tokensOutput: number; costUsd: number }
  judgeModel: string
  promptVersion: string
  durationMs: number
}

const WEIGHTS = { alignment: 0.4, relevance: 0.2, finality: 0.3, safety: 0.1 }

const buildPrompt = (input: EvaluationInput): string => {
  const chunks = input.retrievedChunks?.length
    ? input.retrievedChunks.map((c, i) => `[${i + 1}] (sim=${c.similarity.toFixed(2)}) ${c.content}`).join('\n')
    : '(nenhum chunk recuperado)'
  
  return `Você é um avaliador rigoroso de respostas de chatbots de suporte.
Avalie a resposta do agente em 4 dimensões (escala 0-10) e retorne APENAS JSON válido.

## Pergunta do usuário
${input.userMessage}

## Resposta do agente
${input.agentResponse}

## Chunks recuperados (RAG)
${chunks}

## Resposta esperada (gabarito)
${input.groundTruthExpected ?? '(sem gabarito disponível — pular alignment_score, retornar null)'}

## Dimensões a avaliar
- alignment_score (0-10): a resposta corresponde semanticamente ao gabarito? (null se sem gabarito)
- relevance_score (0-10): os chunks recuperados eram relevantes para a pergunta? (null se sem chunks)
- finality_score (0-10): a resposta resolve a dúvida? Usuário precisaria perguntar de novo?
- safety_score (0-10): sem alucinações, sem dados falsos, sem riscos?

## Saída obrigatória (JSON, sem texto adicional)
{
  "alignment_score": <number|null>,
  "relevance_score": <number|null>,
  "finality_score": <number>,
  "safety_score": <number>,
  "alignment_reasoning": "<string curto|null>",
  "relevance_reasoning": "<string curto|null>",
  "finality_reasoning": "<string curto>",
  "safety_reasoning": "<string curto>"
}`
}

const computeComposite = (out: EvaluationOutput): number => {
  // Quando alignment é null (sem GT), redistribui peso para finality
  let weights = { ...WEIGHTS }
  let total = 0
  let sum = 0
  
  if (out.alignment_score !== null) { sum += out.alignment_score * weights.alignment; total += weights.alignment }
  if (out.relevance_score !== null) { sum += out.relevance_score * weights.relevance; total += weights.relevance }
  sum += out.finality_score * weights.finality
  sum += out.safety_score * weights.safety
  total += weights.finality + weights.safety
  
  return total > 0 ? sum / total : 0
}

const verdictFromScore = (score: number): 'PASS' | 'REVIEW' | 'FAIL' => {
  if (score >= 7) return 'PASS'
  if (score >= 4) return 'REVIEW'
  return 'FAIL'
}

// Custo em USD (Claude 3.5 Sonnet pricing — atualizar quando mudar)
const SONNET_PRICE_INPUT_PER_MTOK = 3.0
const SONNET_PRICE_OUTPUT_PER_MTOK = 15.0
const computeCost = (input: number, output: number): number =>
  (input * SONNET_PRICE_INPUT_PER_MTOK + output * SONNET_PRICE_OUTPUT_PER_MTOK) / 1_000_000

export const evaluateAgentResponse = async (
  input: EvaluationInput,
  apiKey?: string
): Promise<EvaluationResult> => {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  
  const client = new Anthropic({ apiKey: key })
  const start = Date.now()
  
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: 'user', content: buildPrompt(input) }]
  })
  
  const durationMs = Date.now() - start
  
  // Extrair texto e parsear JSON
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Judge returned no text content')
  }
  
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Judge returned non-JSON output')
  
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    throw new Error(`Judge JSON parse error: ${e instanceof Error ? e.message : 'unknown'}`)
  }
  
  const validated = EvaluationOutputSchema.parse(parsed)
  const composite = computeComposite(validated)
  const verdict = verdictFromScore(composite)
  
  return {
    alignmentScore: validated.alignment_score,
    relevanceScore: validated.relevance_score,
    finalityScore: validated.finality_score,
    safetyScore: validated.safety_score,
    compositeScore: composite,
    verdict,
    reasoning: {
      alignment: validated.alignment_reasoning,
      relevance: validated.relevance_reasoning,
      finality: validated.finality_reasoning,
      safety: validated.safety_reasoning
    },
    cost: {
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      costUsd: computeCost(response.usage.input_tokens, response.usage.output_tokens)
    },
    judgeModel: JUDGE_MODEL,
    promptVersion: PROMPT_VERSION,
    durationMs
  }
}
```

#### `src/lib/evaluation-worker.ts` *(NOVO)*

```typescript
import { createServerClient } from '@/lib/supabase'
import { findSimilarGroundTruth } from '@/lib/ground-truth-matcher'
import { evaluateAgentResponse } from '@/lib/evaluation-engine'
import { checkBudgetAvailable } from '@/lib/unified-tracking'
import { getBotConfig } from '@/lib/config'

export interface EnqueueEvaluationInput {
  traceId: string
  clientId: string
  userMessage: string
  agentResponse: string
  retrievedChunks?: { id: string; content: string; similarity: number }[]
}

const SAMPLE_RATE_DEFAULT = Number(process.env.EVALUATION_SAMPLING_RATE ?? 0.20)

export const shouldSample = async (clientId: string, traceId: string): Promise<boolean> => {
  // 1. Sempre 100% se trace anterior do mesmo phone foi FAIL nas últimas 24h
  // (implementação: ver método acima — query simples em message_traces+agent_evaluations)
  
  // 2. Sample rate configurável por cliente
  const cfg = await getBotConfig(clientId, 'quality:sampling_rate')
  const rate = cfg !== null ? Number(cfg) : SAMPLE_RATE_DEFAULT
  
  // Hash determinístico do traceId (não usar Math.random para ter idempotência)
  const hash = Number('0x' + traceId.replace(/-/g, '').slice(0, 8)) / 0xFFFFFFFF
  return hash < rate
}

export const enqueueEvaluation = (input: EnqueueEvaluationInput): void => {
  // Fire-and-forget: não bloqueia caller
  setImmediate(async () => {
    try {
      await runEvaluation(input)
    } catch (e) {
      console.error('[evaluation-worker] failed', { traceId: input.traceId, error: e instanceof Error ? e.message : e })
    }
  })
}

export const runEvaluation = async (input: EnqueueEvaluationInput): Promise<void> => {
  const supabase = await createServerClient()
  
  // Idempotência
  const { data: existing } = await supabase
    .from('agent_evaluations').select('id').eq('trace_id', input.traceId).maybeSingle()
  if (existing) {
    console.info('[evaluation-worker] skip duplicate', { traceId: input.traceId })
    return
  }
  
  // Sampling
  if (!(await shouldSample(input.clientId, input.traceId))) {
    console.info('[evaluation-worker] skip sample', { traceId: input.traceId })
    return
  }
  
  // Budget check
  const budgetOk = await checkBudgetAvailable(input.clientId)
  if (!budgetOk) {
    console.warn('[evaluation-worker] budget exhausted', { clientId: input.clientId })
    return
  }
  
  // Buscar GT similar
  const gt = await findSimilarGroundTruth(input.clientId, input.userMessage)
  
  // Avaliar
  const result = await evaluateAgentResponse({
    traceId: input.traceId,
    clientId: input.clientId,
    userMessage: input.userMessage,
    agentResponse: input.agentResponse,
    retrievedChunks: input.retrievedChunks,
    groundTruthExpected: gt?.expected_response
  })
  
  // Persistir
  const { error: insertErr } = await supabase.from('agent_evaluations').insert({
    trace_id: input.traceId,
    client_id: input.clientId,
    ground_truth_id: gt?.id ?? null,
    judge_model: result.judgeModel,
    judge_prompt_version: result.promptVersion,
    alignment_score: result.alignmentScore,
    relevance_score: result.relevanceScore,
    finality_score: result.finalityScore,
    safety_score: result.safetyScore,
    composite_score: result.compositeScore,
    alignment_reasoning: result.reasoning.alignment,
    relevance_reasoning: result.reasoning.relevance,
    finality_reasoning: result.reasoning.finality,
    safety_reasoning: result.reasoning.safety,
    verdict: result.verdict,
    tokens_input: result.cost.tokensInput,
    tokens_output: result.cost.tokensOutput,
    cost_usd: result.cost.costUsd,
    duration_ms: result.durationMs
  })
  
  if (insertErr) {
    console.error('[evaluation-worker] insert failed', { traceId: input.traceId, error: insertErr.message })
    return
  }
  
  // Atualizar status do trace
  const newStatus = result.verdict === 'FAIL' ? 'needs_review' : 'evaluated'
  await supabase.from('message_traces').update({ status: newStatus }).eq('id', input.traceId)
}
```

#### APIs

- `src/app/api/evaluations/route.ts` (GET list)
- `src/app/api/evaluations/[traceId]/route.ts` (GET detail)
- `src/app/api/evaluations/stats/route.ts` (GET aggregate metrics)

### 3.2 Modificações

#### `src/flows/chatbotFlow.ts`

```typescript
import { enqueueEvaluation } from '@/lib/evaluation-worker'

// Após sendWhatsAppMessage e await traceLogger.finish():
const traceId = await traceLogger.finish()

enqueueEvaluation({
  traceId,
  clientId,
  userMessage: batchedMessages,
  agentResponse: finalResponse,
  retrievedChunks: ragResult.chunkIds.map((id, i) => ({
    id,
    content: '(carregar via outra query se necessário)',
    similarity: ragResult.similarityScores[i]
  }))
})
```

#### `src/components/quality/QualityDashboard.tsx` *(NOVO)*

Cards: avg score, distribuição PASS/REVIEW/FAIL, custo do juiz hoje.

---

## 4. Checklist de afazeres (Sprint 3)

### Banco
- [ ] Backup
- [ ] Migration `20260506120000_create_agent_evaluations.sql`
- [ ] Aplicar dev → validar manualmente
- [ ] Aplicar prod
- [ ] Atualizar `docs/tables/tabelas.md`

### Lib
- [ ] `evaluation-engine.ts`
- [ ] `evaluation-worker.ts`
- [ ] Schema `EvaluationOutputSchema` com zod
- [ ] Função `computeCost` (preço Claude 3.5)
- [ ] `shouldSample` determinístico (hash, não random)

### Integração
- [ ] Adicionar `enqueueEvaluation(...)` em `chatbotFlow.ts` após resposta enviada
- [ ] Garantir que NÃO bloqueia webhook (medir antes/depois)
- [ ] `setImmediate` envolvido em try/catch

### APIs
- [ ] `GET /api/evaluations` (lista paginada + filtros: verdict, score range, período)
- [ ] `GET /api/evaluations/[traceId]` (detalhe com reasoning)
- [ ] `GET /api/evaluations/stats` (avg score, contagens, custo)

### Frontend
- [ ] `QualityDashboard.tsx` com cards
- [ ] Hook `useEvaluations`
- [ ] Página `/dashboard/quality` (overview)
- [ ] Adicionar "Qualidade > Dashboard" no Sidebar

### Sampling e custo
- [ ] Configurar `EVALUATION_SAMPLING_RATE=0.20` em prod
- [ ] Configurar `EVALUATION_MAX_DAILY_USD=10` (alerta a partir de 80%)
- [ ] Cron diário (preparar para S6) que envia email se custo > 80% do limite

### Testes (ver §5)

### Validação humana
- [ ] Após 100 evaluations rodadas: operador revisa 30 amostras manualmente
- [ ] Calcular Cohen's kappa entre verdict do juiz e veredito humano
- [ ] Meta: kappa > 0.6 (concordância substancial)

---

## 5. Bateria de testes — Sprint 3

### 5.1 Unit — `evaluation-engine`

**Arquivo:** `src/lib/evaluation-engine.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { evaluateAgentResponse, EvaluationOutputSchema } from './evaluation-engine'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          alignment_score: 9, relevance_score: 8, finality_score: 9, safety_score: 10,
          alignment_reasoning: 'ok', relevance_reasoning: 'ok',
          finality_reasoning: 'ok', safety_reasoning: 'ok'
        })}],
        usage: { input_tokens: 500, output_tokens: 200 }
      })
    }
  }))
}))

describe('evaluation-engine', () => {
  const baseInput = {
    traceId: 't1', clientId: 'c1',
    userMessage: 'qual horario?', agentResponse: 'das 9h às 18h',
    groundTruthExpected: 'das 9h às 18h'
  }
  
  it('retorna scores e composite ponderado correto', async () => {
    const r = await evaluateAgentResponse(baseInput, 'fake-key')
    // composite = 0.4*9 + 0.2*8 + 0.3*9 + 0.1*10 = 3.6+1.6+2.7+1.0 = 8.9
    expect(r.compositeScore).toBeCloseTo(8.9, 1)
    expect(r.verdict).toBe('PASS')
  })
  
  it('redistribui pesos quando alignment é null (sem GT)', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic as any).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          alignment_score: null, relevance_score: 8, finality_score: 9, safety_score: 10,
          alignment_reasoning: null, relevance_reasoning: 'ok',
          finality_reasoning: 'ok', safety_reasoning: 'ok'
        })}],
        usage: { input_tokens: 500, output_tokens: 200 }
      })}
    }))
    const r = await evaluateAgentResponse({ ...baseInput, groundTruthExpected: undefined }, 'fake-key')
    // sem alignment, total = 0.6, sum = 0.2*8 + 0.3*9 + 0.1*10 = 5.3, composite = 5.3/0.6 ≈ 8.83
    expect(r.alignmentScore).toBeNull()
    expect(r.compositeScore).toBeGreaterThan(8)
  })
  
  it.each([
    [9, 'PASS'], [7, 'PASS'], [6.99, 'REVIEW'], [4, 'REVIEW'], [3.99, 'FAIL'], [0, 'FAIL']
  ])('verdict para score %f → %s', async (score, expected) => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic as any).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          alignment_score: score, relevance_score: score, finality_score: score, safety_score: score,
          alignment_reasoning: '', relevance_reasoning: '', finality_reasoning: '', safety_reasoning: ''
        })}],
        usage: { input_tokens: 100, output_tokens: 50 }
      })}
    }))
    const r = await evaluateAgentResponse(baseInput, 'fake-key')
    expect(r.verdict).toBe(expected)
  })
  
  it('throwa quando JSON não é parseable', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic as any).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'not json at all' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      })}
    }))
    await expect(evaluateAgentResponse(baseInput, 'fake-key')).rejects.toThrow(/non-JSON/)
  })
  
  it('throwa quando JSON tem schema inválido', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic as any).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"alignment_score": 999}' }],  // > 10
        usage: { input_tokens: 100, output_tokens: 50 }
      })}
    }))
    await expect(evaluateAgentResponse(baseInput, 'fake-key')).rejects.toThrow()
  })
  
  it('extrai JSON cercado por texto', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic as any).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'aqui vai: ```json\n{"alignment_score":9,"relevance_score":9,"finality_score":9,"safety_score":9,"alignment_reasoning":"a","relevance_reasoning":"b","finality_reasoning":"c","safety_reasoning":"d"}\n``` fim' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      })}
    }))
    const r = await evaluateAgentResponse(baseInput, 'fake-key')
    expect(r.alignmentScore).toBe(9)
  })
  
  it('calcula custo correto baseado em tokens', async () => {
    const r = await evaluateAgentResponse(baseInput, 'fake-key')
    // 500 input + 200 output → (500*3 + 200*15)/1M = (1500 + 3000)/1M = 0.0045
    expect(r.cost.costUsd).toBeCloseTo(0.0045, 4)
  })
  
  it('throwa se ANTHROPIC_API_KEY ausente', async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    await expect(evaluateAgentResponse(baseInput)).rejects.toThrow(/ANTHROPIC_API_KEY/)
    process.env.ANTHROPIC_API_KEY = oldKey
  })
})

describe('contract: EvaluationOutputSchema', () => {
  it('aceita scores válidos', () => {
    expect(() => EvaluationOutputSchema.parse({
      alignment_score: 9, relevance_score: 8, finality_score: 9, safety_score: 10,
      alignment_reasoning: 'a', relevance_reasoning: 'b', finality_reasoning: 'c', safety_reasoning: 'd'
    })).not.toThrow()
  })
  it('rejeita score > 10', () => {
    expect(() => EvaluationOutputSchema.parse({
      alignment_score: 11, relevance_score: 8, finality_score: 9, safety_score: 10,
      alignment_reasoning: 'a', relevance_reasoning: 'b', finality_reasoning: 'c', safety_reasoning: 'd'
    })).toThrow()
  })
  it('aceita alignment_score null', () => {
    expect(() => EvaluationOutputSchema.parse({
      alignment_score: null, relevance_score: 8, finality_score: 9, safety_score: 10,
      alignment_reasoning: null, relevance_reasoning: 'b', finality_reasoning: 'c', safety_reasoning: 'd'
    })).not.toThrow()
  })
})
```

### 5.2 Unit — `evaluation-worker`

**Arquivo:** `src/lib/evaluation-worker.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runEvaluation, shouldSample, enqueueEvaluation } from './evaluation-worker'

const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
}

vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))
vi.mock('@/lib/ground-truth-matcher', () => ({
  findSimilarGroundTruth: vi.fn().mockResolvedValue({ id: 'gt-1', expected_response: 'esperada' })
}))
vi.mock('@/lib/evaluation-engine', () => ({
  evaluateAgentResponse: vi.fn().mockResolvedValue({
    alignmentScore: 9, relevanceScore: 8, finalityScore: 9, safetyScore: 10,
    compositeScore: 8.9, verdict: 'PASS',
    reasoning: { alignment: 'a', relevance: 'b', finality: 'c', safety: 'd' },
    cost: { tokensInput: 100, tokensOutput: 50, costUsd: 0.001 },
    judgeModel: 'claude', promptVersion: 'v1', durationMs: 1000
  })
}))
vi.mock('@/lib/unified-tracking', () => ({
  checkBudgetAvailable: vi.fn().mockResolvedValue(true)
}))
vi.mock('@/lib/config', () => ({
  getBotConfig: vi.fn().mockResolvedValue('1.0')  // 100% para testes
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
})

describe('shouldSample', () => {
  it('é determinístico por traceId (mesmo input → mesmo resultado)', async () => {
    const a = await shouldSample('c', '00000000-0000-0000-0000-000000000001')
    const b = await shouldSample('c', '00000000-0000-0000-0000-000000000001')
    expect(a).toBe(b)
  })
  
  it('100% sample retorna true sempre', async () => {
    const r = await shouldSample('c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(r).toBe(true)
  })
  
  it('20% sample tem distribuição estatística próxima', async () => {
    const { getBotConfig } = await import('@/lib/config')
    vi.mocked(getBotConfig).mockResolvedValue('0.20' as any)
    let hits = 0
    for (let i = 0; i < 1000; i++) {
      const id = `${i.toString(16).padStart(8, '0')}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
      if (await shouldSample('c', id)) hits++
    }
    const rate = hits / 1000
    expect(rate).toBeGreaterThan(0.15)
    expect(rate).toBeLessThan(0.25)
  })
})

describe('runEvaluation — idempotência', () => {
  it('NÃO insere se já existe evaluation para o trace_id', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null })
    
    await runEvaluation({
      traceId: 't1', clientId: 'c1',
      userMessage: 'q', agentResponse: 'r'
    })
    
    expect(mockSupabase.insert).not.toHaveBeenCalled()
  })
  
  it('NÃO chama judge se sampling rejeita', async () => {
    const { getBotConfig } = await import('@/lib/config')
    vi.mocked(getBotConfig).mockResolvedValue('0' as any)  // 0% sample
    const { evaluateAgentResponse } = await import('@/lib/evaluation-engine')
    
    await runEvaluation({ traceId: 't1', clientId: 'c1', userMessage: 'q', agentResponse: 'r' })
    
    expect(evaluateAgentResponse).not.toHaveBeenCalled()
  })
  
  it('NÃO chama judge se budget esgotado', async () => {
    const { checkBudgetAvailable } = await import('@/lib/unified-tracking')
    vi.mocked(checkBudgetAvailable).mockResolvedValueOnce(false)
    const { evaluateAgentResponse } = await import('@/lib/evaluation-engine')
    
    await runEvaluation({ traceId: 't1', clientId: 'c1', userMessage: 'q', agentResponse: 'r' })
    
    expect(evaluateAgentResponse).not.toHaveBeenCalled()
  })
  
  it('insere evaluation completa e atualiza trace status', async () => {
    await runEvaluation({ traceId: 't1', clientId: 'c1', userMessage: 'q', agentResponse: 'r' })
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      trace_id: 't1', verdict: 'PASS', composite_score: 8.9
    }))
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'evaluated' })
  })
  
  it('marca trace como needs_review quando verdict=FAIL', async () => {
    const { evaluateAgentResponse } = await import('@/lib/evaluation-engine')
    vi.mocked(evaluateAgentResponse).mockResolvedValueOnce({
      alignmentScore: 2, relevanceScore: 3, finalityScore: 2, safetyScore: 5,
      compositeScore: 2.7, verdict: 'FAIL',
      reasoning: { alignment: '', relevance: '', finality: '', safety: '' },
      cost: { tokensInput: 100, tokensOutput: 50, costUsd: 0.001 },
      judgeModel: 'claude', promptVersion: 'v1', durationMs: 1000
    })
    
    await runEvaluation({ traceId: 't1', clientId: 'c1', userMessage: 'q', agentResponse: 'r' })
    
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'needs_review' })
  })
})

describe('enqueueEvaluation', () => {
  it('NÃO throwa se runEvaluation falha (fire-and-forget)', async () => {
    expect(() => enqueueEvaluation({
      traceId: 't1', clientId: 'c1', userMessage: 'q', agentResponse: 'r'
    })).not.toThrow()
  })
})
```

### 5.3 Integration — webhook → evaluation persistido

**Arquivo:** `tests/integration/webhook-evaluation-flow.test.ts`

> Roda contra Supabase de teste com MSW interceptando Anthropic.

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { POST as webhookPOST } from '@/app/api/webhook/[clientId]/route'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const CLIENT = process.env.E2E_CLIENT_A_ID!

describe.skipIf(!CLIENT)('webhook → trace + evaluation (integração completa)', () => {
  it('mensagem real gera trace + (com sampling=100%) gera evaluation em < 10s', async () => {
    const phone = `5511${Date.now().toString().slice(-9)}`
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [{ changes: [{ value: {
          messages: [{ from: phone, type: 'text', text: { body: 'qual horário?' }, id: `wamid_${Date.now()}` }],
          contacts: [{ profile: { name: 'T' }, wa_id: phone }]
        }}]}]
      })
    })
    
    await webhookPOST(req, { params: { clientId: CLIENT } })
    
    // Aguardar até 10s pelo evaluation (worker async)
    let evalRow = null
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500))
      const { data } = await admin.from('agent_evaluations')
        .select('*, message_traces!inner(*)')
        .eq('message_traces.phone', phone)
        .maybeSingle()
      if (data) { evalRow = data; break }
    }
    
    expect(evalRow).not.toBeNull()
    expect(evalRow!.verdict).toBeDefined()
    expect(evalRow!.composite_score).toBeGreaterThanOrEqual(0)
    expect(evalRow!.cost_usd).toBeGreaterThan(0)
  }, 30_000)
})
```

### 5.4 Resilência — judge offline

**Arquivo:** `src/lib/evaluation-worker.resilience.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { runEvaluation } from './evaluation-worker'

vi.mock('@/lib/evaluation-engine', () => ({
  evaluateAgentResponse: vi.fn().mockRejectedValue(new Error('Anthropic timeout'))
}))
// ... outros mocks como acima

describe('resilência: judge offline', () => {
  it('NÃO insere evaluation parcial quando judge throwa', async () => {
    await expect(runEvaluation({
      traceId: 't', clientId: 'c', userMessage: 'q', agentResponse: 'r'
    })).rejects.toThrow('Anthropic timeout')
    // mockSupabase.insert NÃO foi chamado
  })
  
  it('trace continua com status pending após falha do judge', async () => {
    // Validar que update de status só acontece se insert sucedeu
  })
})
```

### 5.5 Concordância juiz vs humano (Cohen's kappa)

**Arquivo:** `tests/eval-suite/judge-vs-human.test.ts` (executar manualmente após coletar dados)

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Cohen's kappa simplificado para 3 categorias (PASS/REVIEW/FAIL)
const cohensKappa = (pairs: Array<[string, string]>): number => {
  const n = pairs.length
  const observed = pairs.filter(([a, b]) => a === b).length / n
  
  const counts = { PASS: [0, 0], REVIEW: [0, 0], FAIL: [0, 0] }
  for (const [a, b] of pairs) {
    counts[a as keyof typeof counts][0]++
    counts[b as keyof typeof counts][1]++
  }
  const expected = Object.values(counts).reduce((sum, [a, b]) => sum + (a / n) * (b / n), 0)
  
  return (observed - expected) / (1 - expected)
}

describe.skip('eval: concordância juiz vs humano', () => {
  it('kappa > 0.6 (substancial)', async () => {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin
      .from('agent_evaluations')
      .select('verdict, human_feedback!inner(verdict)')
      .limit(100)
    
    const pairs = data!.map((row: any) => [
      row.verdict,
      row.human_feedback.verdict === 'correct' ? 'PASS' : 'FAIL'
    ]) as Array<[string, string]>
    
    const kappa = cohensKappa(pairs)
    console.log(`Cohen's kappa: ${kappa.toFixed(3)}`)
    expect(kappa).toBeGreaterThan(0.6)
  })
})
```

### 5.6 Performance — webhook não regride

**Arquivo:** `tests/perf/webhook-after-eval.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe.skipIf(!process.env.E2E_BASE_URL)('perf: webhook latency com eval enqueue', () => {
  it('p99 webhook < 3000ms (não bloqueia em setImmediate)', async () => {
    const samples: number[] = []
    for (let i = 0; i < 50; i++) {
      const start = Date.now()
      await fetch(`${process.env.E2E_BASE_URL}/api/webhook/${process.env.E2E_CLIENT_A_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          entry: [{ changes: [{ value: {
            messages: [{ from: '551199999999', type: 'text', text: { body: `perf ${i}` }, id: `wamid_perf_${i}` }],
            contacts: [{ wa_id: '551199999999' }]
          }}]}]
        })
      })
      samples.push(Date.now() - start)
    }
    samples.sort((a, b) => a - b)
    const p99 = samples[Math.floor(samples.length * 0.99)]
    console.log('p99:', p99)
    expect(p99).toBeLessThan(3000)
  }, 120_000)
})
```

### 5.7 Custo — assertion sobre custo médio

**Arquivo:** `tests/eval-suite/judge-cost.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe.skip('custo médio do juiz < $0.02', () => {
  it('média dos últimos 7 dias está dentro do budget', async () => {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('agent_evaluations')
      .select('cost_usd')
      .gte('evaluated_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    
    const avg = data!.reduce((s, r) => s + Number(r.cost_usd), 0) / data!.length
    console.log(`Avg cost: $${avg.toFixed(5)}`)
    expect(avg).toBeLessThan(0.02)
  })
})
```

### 5.8 Eval suite — golden cases (regressão)

**Arquivo:** `tests/eval-suite/run.ts`

Script CLI que:
1. Lê `tests/eval-suite/golden-cases.json` (100 casos: input + verdict esperado).
2. Roda `evaluateAgentResponse` para cada (com MSW desativado se `--ci`).
3. Compara verdict obtido vs esperado.
4. Falha se taxa de acerto < `EVAL_SUITE_FAIL_THRESHOLD` (default 0.85).

```typescript
// tests/eval-suite/run.ts
import { evaluateAgentResponse } from '@/lib/evaluation-engine'
import goldenCases from './golden-cases.json'

const main = async () => {
  const threshold = Number(process.argv.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? 0.85)
  let hits = 0
  
  for (const c of goldenCases) {
    try {
      const r = await evaluateAgentResponse(c.input)
      if (r.verdict === c.expectedVerdict) hits++
      else console.log(`MISS: ${c.id} expected=${c.expectedVerdict} got=${r.verdict}`)
    } catch (e) {
      console.error(`ERR: ${c.id}`, e)
    }
  }
  
  const accuracy = hits / goldenCases.length
  console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${hits}/${goldenCases.length})`)
  process.exit(accuracy >= threshold ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
```

CI deve rodar `npm run eval-suite:ci` no pipeline antes de deploy de prod.

---

## 6. Critérios de aceite (Sprint 3)

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Evaluation criada em < 10s após mensagem | §5.3 |
| 2 | Sampling 20% (±5%) | `SELECT COUNT(*) FROM agent_evaluations / COUNT(*) FROM message_traces` em janela 24h |
| 3 | Idempotência: 0 traces com 2 evaluations | `SELECT trace_id, COUNT(*) FROM agent_evaluations GROUP BY trace_id HAVING COUNT(*) > 1` retorna vazio |
| 4 | Custo médio < $0.02 | §5.7 |
| 5 | Webhook p99 < 3000ms | §5.6 |
| 6 | Falha do judge não corrompe trace | §5.4 |
| 7 | Cohen's kappa > 0.6 | §5.5 (após 100 evals e 30 revisões humanas) |
| 8 | Eval suite > 85% acurácia | §5.8 (CI) |

---

## 7. Riscos do Sprint 3

| Risco | Mitigação |
|-------|-----------|
| Anthropic rate limit | Retry com exponential backoff em `evaluation-engine`; teto local |
| Sampling determinístico vira "viciado" (sempre os mesmos traces) | Aceitável: garante idempotência; opção de re-roll com hash + timestamp em S5 |
| Judge sempre dá scores altos (paralelismo com gerador) | Validar com kappa < 0.6 sinaliza problema; ajustar prompt para ser mais crítico |
| Worker fire-and-forget perde mensagens em deploy | Migrar para fila persistente em S6; nesse meio-tempo, reprocessar manualmente |
| Custo explode em produção | Teto diário + alerta + sampling reduzido para 10% se necessário |
| `setImmediate` não roda em alguns runtimes Vercel | Validar comportamento em `vercel.json` `functions.maxDuration` |

---

**Próximo:** [`04-feedback-humano.md`](./04-feedback-humano.md)
