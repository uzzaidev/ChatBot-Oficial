# Sprint 5 — RAG Insights, Chunking e Loop Fechado

> **Duração:** 1 semana
> **Pré-requisito:** Sprints 1–4
> **Meta:** dar **controle** sobre *por que* a resposta foi ruim e fechar o loop entre correções humanas e melhoria automática.

---

## 1. Objetivo

1. Painel detalhado de chunks por avaliação (S4 já mostra; aqui adiciona ações).
2. Marcar chunk como irrelevante (metadata para reprocessing futuro).
3. Chunking structure-aware (markdown headers — ADR-005).
4. Detecção de padrão: 3+ erros similares → alerta no dashboard.
5. Re-avaliação de histórico afetado quando GT é atualizado.
6. Métrica de "improvement rate" semana a semana.

---

## 2. Definition of Done (DoD)

- [ ] UI permite marcar chunk como irrelevante; flag persistida em `documents.metadata`.
- [ ] Novo chunker structure-aware ativo (com fallback ao antigo via flag).
- [ ] Detecção de padrão: query similar a >= 3 evaluations FAIL nas últimas 7 dias dispara alerta.
- [ ] Re-avaliação automática (job): quando GT é atualizado, 30 traces afetados (similaridade > 0.85) são reavaliados.
- [ ] Dashboard mostra `improvement_rate` (variação % do composite_score semana vs semana).
- [ ] Cobertura ≥ 80% nos novos módulos (chunker, pattern-detector, re-evaluator).

---

## 3. Backlog detalhado

### 3.1 Banco

#### `supabase/migrations/20260520120000_quality_insights.sql`

```sql
-- Adicionar metadata em documents (se não existir)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_documents_metadata_irrelevant
  ON documents ((metadata->>'is_irrelevant'));

-- Job de re-avaliação (fila simples em tabela)
CREATE TABLE evaluation_reprocessing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  reason TEXT NOT NULL,             -- 'gt_updated' | 'manual'
  trigger_id UUID,                   -- ground_truth_id que disparou
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reproc_queue_status ON evaluation_reprocessing_queue(status, scheduled_at);

ALTER TABLE evaluation_reprocessing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reproc_queue_service_role" ON evaluation_reprocessing_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tabela de padrões detectados
CREATE TABLE quality_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,        -- 'recurring_fail' | 'low_relevance_chunk' | 'gt_drift'
  description TEXT NOT NULL,
  example_trace_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  example_count INT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_quality_patterns_client_unresolved
  ON quality_patterns(client_id, resolved) WHERE resolved = false;

ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quality_patterns_tenant_isolation" ON quality_patterns
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "quality_patterns_service_role" ON quality_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 3.2 Módulos

#### `src/lib/chunker-structure-aware.ts` *(NOVO)*

Quebra documentos por headings markdown (H1/H2 como boundary) com tamanho mínimo/máximo.

```typescript
export interface StructureAwareChunkOptions {
  minTokens?: number          // default 100
  maxTokens?: number          // default 600
  overlapTokens?: number      // default 50
}

export interface Chunk {
  content: string
  tokens: number
  headingPath: string[]        // ['H1 título', 'H2 seção']
  metadata: Record<string, unknown>
}

export const chunkByHeadings = (
  markdown: string,
  options: StructureAwareChunkOptions = {}
): Chunk[]
```

#### `src/lib/quality-pattern-detector.ts` *(NOVO)*

Detecta padrões a partir de evaluations recentes (executar via cron diário em S6).

```typescript
export const detectRecurringFails = async (
  clientId: string,
  windowDays: number = 7,
  minOccurrences: number = 3
): Promise<{ patterns: QualityPattern[]; created: number }>
```

Estratégia:
1. Pegar todas FAIL dos últimos N dias.
2. Agrupar por similarity de embedding da `user_message` (cluster simples por threshold).
3. Se cluster >= minOccurrences, criar `quality_patterns` (ou atualizar se já existe).

#### `src/lib/evaluation-reprocessor.ts` *(NOVO)*

Quando GT é atualizado, enfileirar traces afetados para re-avaliação.

```typescript
export const enqueueReprocessingForGroundTruthChange = async (
  groundTruthId: string,
  windowDays: number = 30,
  similarityThreshold: number = 0.85
): Promise<{ enqueued: number }>

export const processReprocessingBatch = async (limit: number = 50): Promise<{ processed: number }>
```

#### `src/lib/quality-metrics.ts` *(NOVO)*

```typescript
export const computeImprovementRate = async (
  clientId: string
): Promise<{
  thisWeek: number
  lastWeek: number
  delta: number
  deltaPercent: number
}>
```

### 3.3 APIs

- `POST /api/quality/chunks/[chunkId]/mark-irrelevant` — operador marca chunk
- `POST /api/quality/patterns/[id]/resolve` — operador marca padrão como resolvido
- `GET /api/quality/patterns` — lista padrões abertos
- `GET /api/quality/improvement-rate` — métrica semana a semana

### 3.4 Modificações

#### `src/components/quality/EvaluationDetails.tsx`

Adicionar botão "Marcar irrelevante" em cada chunk; chamar API.

#### `src/components/quality/QualityDashboard.tsx`

- Adicionar widget "Improvement rate" (delta %)
- Adicionar lista de "Padrões abertos" (quality_patterns onde `resolved=false`)

#### `src/lib/chunking.ts` (existente)

Adicionar flag para escolher chunker (default: novo structure-aware; antigo mantido como fallback).

### 3.5 Cron / jobs

- Job diário: `detectRecurringFails` por cliente (preparado para S6 quando vira cron real)
- Job a cada 5min: `processReprocessingBatch(50)` 

---

## 4. Checklist de afazeres (Sprint 5)

### Banco
- [ ] Backup
- [ ] Migration `20260520120000_quality_insights.sql`
- [ ] Validar RLS em `quality_patterns`

### Lib — chunker
- [ ] `chunker-structure-aware.ts` com tokenização correta
- [ ] Flag em `bot_configurations`: `rag:chunker_strategy = 'structure-aware' | 'fixed-size'`
- [ ] Manter `chunking.ts` antigo como fallback
- [ ] Reprocessing opcional de docs existentes (script CLI)

### Lib — pattern detector
- [ ] `quality-pattern-detector.ts` com clustering simples
- [ ] Idempotência: não duplicar padrões já abertos
- [ ] Atualizar `last_seen_at` quando padrão recorre

### Lib — reprocessor
- [ ] `evaluation-reprocessor.ts` com fila baseada em tabela
- [ ] Trigger ao salvar GT promovida (S4) → enfileirar candidatos
- [ ] Idempotência por trace_id

### Lib — métricas
- [ ] `computeImprovementRate` com janela de 7 dias

### APIs
- [ ] `POST /api/quality/chunks/[chunkId]/mark-irrelevant`
- [ ] `POST /api/quality/patterns/[id]/resolve`
- [ ] `GET /api/quality/patterns`
- [ ] `GET /api/quality/improvement-rate`

### Frontend
- [ ] Botão "Marcar irrelevante" em `EvaluationDetails`
- [ ] Widget "Improvement rate" no `QualityDashboard`
- [ ] Lista de padrões abertos no `QualityDashboard`
- [ ] Modal "Resolver padrão" (opcional comentário)

### Validação
- [ ] Reprocessar 1 documento real com novo chunker e comparar `relevance_score` (antes/depois) por 1 semana
- [ ] Esperar redução >= 15% em FAIL por relevance no janela

---

## 5. Bateria de testes — Sprint 5

### 5.1 Unit — chunker structure-aware

**Arquivo:** `src/lib/chunker-structure-aware.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { chunkByHeadings } from './chunker-structure-aware'

describe('chunker-structure-aware', () => {
  it('quebra por H1 e H2', () => {
    const md = `# Título Principal
texto da intro

## Seção A
conteudo A

## Seção B
conteudo B`
    const chunks = chunkByHeadings(md, { minTokens: 1, maxTokens: 100 })
    expect(chunks).toHaveLength(2)  // Seção A e Seção B (intro abaixo do mínimo absorvida)
    expect(chunks[0].headingPath).toEqual(['Título Principal', 'Seção A'])
    expect(chunks[1].headingPath).toEqual(['Título Principal', 'Seção B'])
  })
  
  it('respeita maxTokens (quebra dentro de seção grande)', () => {
    const longText = 'palavra '.repeat(2000)
    const md = `# Título\n\n## Seção\n${longText}`
    const chunks = chunkByHeadings(md, { maxTokens: 500 })
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(c => expect(c.tokens).toBeLessThanOrEqual(550))  // tolerância 10%
  })
  
  it('respeita minTokens (mescla seções pequenas)', () => {
    const md = `# T\n\n## A\nshort\n## B\nshort\n## C\nshort`
    const chunks = chunkByHeadings(md, { minTokens: 100, maxTokens: 500 })
    expect(chunks).toHaveLength(1)
  })
  
  it('inclui overlap configurável entre chunks consecutivos', () => {
    const md = `# T\n\n## A\n${'abc '.repeat(300)}\n\n## B\n${'def '.repeat(300)}`
    const chunks = chunkByHeadings(md, { maxTokens: 200, overlapTokens: 30 })
    if (chunks.length >= 2) {
      const tail = chunks[0].content.slice(-100)
      const head = chunks[1].content.slice(0, 100)
      // Há sobreposição visível
      expect(tail.length + head.length).toBeGreaterThan(50)
    }
  })
  
  it('preserva metadata.headingPath em cada chunk', () => {
    const md = `# Doc\n\n## Pagamento\nconteudo`
    const chunks = chunkByHeadings(md)
    expect(chunks[0].metadata.headingPath).toEqual(['Doc', 'Pagamento'])
  })
  
  it('lida com markdown sem headings (fallback fixed-size)', () => {
    const md = 'apenas texto sem headings que deveria virar 1 ou mais chunks por tamanho'
    const chunks = chunkByHeadings(md, { maxTokens: 1000 })
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks[0].headingPath).toEqual([])
  })
})
```

### 5.2 Unit — pattern detector

**Arquivo:** `src/lib/quality-pattern-detector.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectRecurringFails } from './quality-pattern-detector'

const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn()
}

vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))
vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) })
}))

describe('detectRecurringFails', () => {
  beforeEach(() => vi.clearAllMocks())
  
  it('retorna {created: 0} quando há < minOccurrences FAIL', async () => {
    mockSupabase.gte.mockResolvedValueOnce({
      data: [
        { trace_id: 't1', user_message: 'q1' },
        { trace_id: 't2', user_message: 'q2' }
      ], error: null
    })
    
    const r = await detectRecurringFails('c1', 7, 3)
    expect(r.created).toBe(0)
  })
  
  it('cria padrão quando >= 3 FAIL similares', async () => {
    // Simular 3 mensagens muito similares
    mockSupabase.gte.mockResolvedValueOnce({
      data: [
        { trace_id: 't1', user_message: 'qual horário?' },
        { trace_id: 't2', user_message: 'que horas abrem?' },
        { trace_id: 't3', user_message: 'horário de funcionamento' }
      ], error: null
    })
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })  // sem padrão prévio
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'p1' }, error: null })  // insert
    
    const r = await detectRecurringFails('c1', 7, 3)
    expect(r.created).toBeGreaterThanOrEqual(1)
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      pattern_type: 'recurring_fail',
      example_count: expect.any(Number)
    }))
  })
  
  it('atualiza padrão existente em vez de duplicar', async () => {
    mockSupabase.gte.mockResolvedValueOnce({
      data: [
        { trace_id: 't1', user_message: 'qual horário?' },
        { trace_id: 't2', user_message: 'que horas abrem?' },
        { trace_id: 't3', user_message: 'horário de funcionamento' }
      ], error: null
    })
    mockSupabase.maybeSingle.mockResolvedValue({
      data: { id: 'existing-p', example_count: 5, example_trace_ids: ['told1'] },
      error: null
    })
    
    await detectRecurringFails('c1', 7, 3)
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      example_count: expect.any(Number),
      last_seen_at: expect.any(String)
    }))
    expect(mockSupabase.insert).not.toHaveBeenCalled()
  })
})
```

### 5.3 Unit — reprocessor

**Arquivo:** `src/lib/evaluation-reprocessor.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  enqueueReprocessingForGroundTruthChange,
  processReprocessingBatch
} from './evaluation-reprocessor'

const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn()
}

vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))
vi.mock('@/lib/evaluation-worker', () => ({
  runEvaluation: vi.fn().mockResolvedValue(undefined)
}))

describe('enqueueReprocessingForGroundTruthChange', () => {
  it('enfileira traces com query similar à GT atualizada', async () => {
    mockSupabase.single = vi.fn().mockResolvedValueOnce({
      data: { id: 'gt1', client_id: 'c1', user_query: 'qual horário', query_embedding: new Array(1536).fill(0.1) },
      error: null
    })
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { trace_id: 't1', similarity: 0.92 },
        { trace_id: 't2', similarity: 0.88 }
      ],
      error: null
    })
    
    const r = await enqueueReprocessingForGroundTruthChange('gt1')
    expect(r.enqueued).toBe(2)
    expect(mockSupabase.insert).toHaveBeenCalled()
  })
  
  it('idempotência: NÃO enfileira trace já em fila pending', async () => {
    // Simular que t1 já existe em queue
    // Esperado: insert filtra duplicatas (ou DB tem ON CONFLICT DO NOTHING)
  })
})

describe('processReprocessingBatch', () => {
  it('processa N items pendentes e marca status=done em sucesso', async () => {
    mockSupabase.eq = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'q1', trace_id: 't1', client_id: 'c1' }],
      error: null
    })
    
    const r = await processReprocessingBatch(10)
    expect(r.processed).toBe(1)
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }))
  })
  
  it('marca status=failed e incrementa attempts em erro', async () => {
    const { runEvaluation } = await import('@/lib/evaluation-worker')
    vi.mocked(runEvaluation).mockRejectedValueOnce(new Error('boom'))
    
    mockSupabase.eq = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'q1', trace_id: 't1', client_id: 'c1', attempts: 0 }],
      error: null
    })
    
    await processReprocessingBatch(10)
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed', attempts: 1
    }))
  })
})
```

### 5.4 Integration — promote-to-GT dispara reprocessamento

**Arquivo:** `tests/integration/gt-update-triggers-reprocessing.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const CLIENT = process.env.E2E_CLIENT_A_ID!

describe.skipIf(!CLIENT)('GT update → reprocessing queue', () => {
  it('promote-to-GT enfileira traces afetados em < 5s', async () => {
    // 1. Criar 3 traces com mensagens similares
    // 2. Promover correção via API human-feedback
    // 3. Aguardar até 5s
    // 4. Validar evaluation_reprocessing_queue tem entradas com status=pending
  })
})
```

### 5.5 Métrica improvement-rate

**Arquivo:** `src/lib/quality-metrics.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { computeImprovementRate } from './quality-metrics'

const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn()
}
vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))

describe('computeImprovementRate', () => {
  it('calcula delta % corretamente', async () => {
    mockSupabase.lt = vi.fn()
      .mockResolvedValueOnce({ data: [{ avg: 8.0 }], error: null })  // thisWeek
      .mockResolvedValueOnce({ data: [{ avg: 7.0 }], error: null })  // lastWeek
    
    const r = await computeImprovementRate('c1')
    expect(r.thisWeek).toBe(8.0)
    expect(r.lastWeek).toBe(7.0)
    expect(r.delta).toBeCloseTo(1.0, 2)
    expect(r.deltaPercent).toBeCloseTo(14.28, 1)  // (8-7)/7 * 100
  })
  
  it('retorna delta=0 quando não há dados na semana anterior', async () => {
    mockSupabase.lt = vi.fn()
      .mockResolvedValueOnce({ data: [{ avg: 8.0 }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
    
    const r = await computeImprovementRate('c1')
    expect(r.lastWeek).toBe(0)
    expect(r.deltaPercent).toBe(0)
  })
})
```

### 5.6 A/B chunking — antes vs depois

**Arquivo:** `tests/eval-suite/chunking-ab.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe.skip('A/B: chunking structure-aware reduz FAIL por relevance em > 15%', () => {
  it('compara janela de 7 dias antes/depois do switch', async () => {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const SWITCH_DATE = process.env.CHUNKER_SWITCH_DATE!
    
    const { data: before } = await admin.from('agent_evaluations')
      .select('relevance_score')
      .lt('evaluated_at', SWITCH_DATE)
      .gte('evaluated_at', new Date(new Date(SWITCH_DATE).getTime() - 7 * 86400e3).toISOString())
    
    const { data: after } = await admin.from('agent_evaluations')
      .select('relevance_score')
      .gte('evaluated_at', SWITCH_DATE)
      .lt('evaluated_at', new Date(new Date(SWITCH_DATE).getTime() + 7 * 86400e3).toISOString())
    
    const failBefore = before!.filter((r: any) => r.relevance_score < 4).length / before!.length
    const failAfter = after!.filter((r: any) => r.relevance_score < 4).length / after!.length
    
    const reduction = (failBefore - failAfter) / failBefore
    console.log(`FAIL rate: before=${(failBefore*100).toFixed(1)}% after=${(failAfter*100).toFixed(1)}% reduction=${(reduction*100).toFixed(1)}%`)
    expect(reduction).toBeGreaterThan(0.15)
  })
})
```

### 5.7 E2E — operador marca chunk irrelevante

**Arquivo:** `tests/e2e/mark-chunk-irrelevant.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/operator-A.json' })

test('marcar chunk irrelevante reflete em metadata', async ({ page, request }) => {
  await page.goto('/dashboard/quality/evaluations')
  await page.keyboard.press('j')
  
  await page.click('[data-testid=details-tab]')
  await page.click('[data-testid=chunk-mark-irrelevant]')
  await expect(page.locator('[data-testid=chunk-irrelevant-badge]')).toBeVisible()
  
  // Validar via API
  const chunkId = await page.locator('[data-testid=chunk-id]').first().textContent()
  const res = await request.get(`/api/documents/${chunkId}`)
  const json = await res.json()
  expect(json.metadata.is_irrelevant).toBe(true)
  expect(json.metadata.marked_by).toBeTruthy()
})
```

### 5.8 Performance — pattern detector em base com 10k evaluations

**Arquivo:** `tests/perf/pattern-detector.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { detectRecurringFails } from '@/lib/quality-pattern-detector'

describe.skipIf(!process.env.E2E_CLIENT_A_ID)('perf: detectRecurringFails', () => {
  it('processa janela de 10k evaluations em < 30s', async () => {
    const start = Date.now()
    await detectRecurringFails(process.env.E2E_CLIENT_A_ID!, 30, 3)
    expect(Date.now() - start).toBeLessThan(30_000)
  }, 60_000)
})
```

---

## 6. Critérios de aceite (Sprint 5)

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Chunker structure-aware funciona | §5.1 |
| 2 | Pattern detector identifica clusters | §5.2 |
| 3 | Reprocessor enfileira sem duplicar | §5.3 + §5.4 |
| 4 | Improvement rate calculada corretamente | §5.5 |
| 5 | A/B chunking reduz FAIL > 15% (após 1 sem) | §5.6 |
| 6 | UI marca chunk irrelevante | §5.7 |
| 7 | Loop completo: GT update → reprocess | §5.4 |

---

## 7. Riscos do Sprint 5

| Risco | Mitigação |
|-------|-----------|
| Pattern detector cria muito ruído | Threshold ajustável; UI permite "marcar resolved" e "ignore" |
| Reprocessing custa muito (custo do juiz × N traces) | Limitar batch (máx 50/dia); operador pode pausar via flag |
| Chunker novo quebra docs em produção | Flag de feature; rollback rápido para chunker antigo; processar paralelo e comparar |
| GT outdated dispara reprocessing infinito | Idempotência por trace_id na fila; cooldown de 24h por trace |
| Métrica improvement-rate confunde quando volume varia muito semana-a-semana | Mostrar também volume absoluto; documentar interpretação |

---

**Próximo:** [`06-hardening-go-live.md`](./06-hardening-go-live.md)
