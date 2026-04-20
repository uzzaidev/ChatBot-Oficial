# Sprint 4 — Operador Humano: Feedback que Corrige o Sistema

> **Duração:** 1–2 semanas
> **Pré-requisito:** Sprints 1, 2, 3
> **Meta:** fluxo **rápido** (lista → conversa → detalhe) e feedback humano que alimenta melhoria do sistema.

---

## 1. Objetivo

1. Tabela `human_feedback` para registrar revisão manual.
2. UI 3-painéis (`EvaluationList` / `ConversationReview` / `EvaluationDetails`).
3. Atalhos de teclado (J/K/1/2/3) para alta produtividade.
4. Promote-to-GT: operador transforma trace + correção em entry de ground truth.
5. Alertas básicos para FAIL/REVIEW (badge no menu, opcionalmente email).

---

## 2. Definition of Done (DoD)

- [ ] Migration `human_feedback` aplicada com RLS.
- [ ] Página `/dashboard/quality/evaluations` em produção, com 3 painéis.
- [ ] Operador consegue revisar 1 FAIL em < 90s (cronometrado).
- [ ] Atalhos J/K (próximo/anterior) e 1/2/3 (correto/incorreto/parcial) funcionam.
- [ ] Promote-to-GT cria nova linha em `ground_truth` com `source='operator_correction'` e `source_trace_id`.
- [ ] Trilha auditável: quem corrigiu, quando, vínculo com `trace_id`.
- [ ] Cobertura ≥ 70% em componentes (`EvaluationList`, `HumanFeedbackModal`).
- [ ] E2E: fluxo completo de revisão valida em CI.

---

## 3. Backlog detalhado

### 3.1 Banco

#### `supabase/migrations/20260513120000_create_human_feedback.sql`

```sql
CREATE TABLE human_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES agent_evaluations(id) ON DELETE SET NULL,
  client_id UUID NOT NULL,
  
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  
  verdict TEXT NOT NULL CHECK (verdict IN ('correct', 'incorrect', 'partial')),
  
  correction_text TEXT,
  reason TEXT,
  error_category TEXT CHECK (error_category IN (
    'wrong_chunk', 'bad_generation', 'missing_info', 'hallucination', 'gt_outdated', 'other'
  )),
  
  marked_as_ground_truth BOOLEAN NOT NULL DEFAULT false,
  ground_truth_id UUID REFERENCES ground_truth(id),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_human_feedback_trace_id ON human_feedback(trace_id);
CREATE INDEX idx_human_feedback_operator_id ON human_feedback(operator_id);
CREATE INDEX idx_human_feedback_verdict ON human_feedback(verdict);
CREATE INDEX idx_human_feedback_created_at ON human_feedback(created_at DESC);

-- Operador só pode ter 1 feedback por trace (UNIQUE)
CREATE UNIQUE INDEX uniq_human_feedback_trace_op ON human_feedback(trace_id, operator_id);

ALTER TABLE human_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "human_feedback_tenant_isolation" ON human_feedback
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "human_feedback_service_role" ON human_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 3.2 APIs

#### `src/app/api/evaluations/[traceId]/human-feedback/route.ts` *(NOVO)*

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getCurrentUserClientId, getCurrentUserId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

const Body = z.object({
  verdict: z.enum(['correct', 'incorrect', 'partial']),
  correction_text: z.string().max(10000).optional(),
  reason: z.string().max(500).optional(),
  error_category: z.enum(['wrong_chunk', 'bad_generation', 'missing_info', 'hallucination', 'gt_outdated', 'other']).optional(),
  promote_to_ground_truth: z.boolean().default(false)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    const clientId = await getCurrentUserClientId()
    const userId = await getCurrentUserId()
    if (!clientId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = Body.parse(await request.json())
    const supabase = await createServerClient()
    
    // Validar trace pertence ao cliente
    const { data: trace } = await supabase
      .from('message_traces').select('id, user_message')
      .eq('id', params.traceId).eq('client_id', clientId).single()
    if (!trace) return NextResponse.json({ error: 'Trace not found' }, { status: 404 })
    
    const { data: evaluation } = await supabase
      .from('agent_evaluations').select('id')
      .eq('trace_id', params.traceId).maybeSingle()
    
    let groundTruthId: string | null = null
    
    if (body.promote_to_ground_truth && body.correction_text) {
      const { embedding } = await generateEmbedding(trace.user_message, undefined, clientId)
      const { data: gt, error: gtErr } = await supabase.from('ground_truth').insert({
        client_id: clientId,
        user_query: trace.user_message,
        expected_response: body.correction_text,
        query_embedding: embedding,
        source: 'operator_correction',
        source_trace_id: params.traceId,
        created_by: userId,
        confidence: 0.85,
        version: 1
      }).select('id').single()
      if (gtErr) throw gtErr
      groundTruthId = gt.id
    }
    
    const { data: feedback, error: insertErr } = await supabase.from('human_feedback').upsert({
      trace_id: params.traceId,
      evaluation_id: evaluation?.id ?? null,
      client_id: clientId,
      operator_id: userId,
      verdict: body.verdict,
      correction_text: body.correction_text,
      reason: body.reason,
      error_category: body.error_category,
      marked_as_ground_truth: body.promote_to_ground_truth,
      ground_truth_id: groundTruthId
    }, { onConflict: 'trace_id,operator_id' }).select('*').single()
    
    if (insertErr) throw insertErr
    
    // Atualizar status do trace
    await supabase.from('message_traces')
      .update({ status: 'human_reviewed' })
      .eq('id', params.traceId)
    
    return NextResponse.json({ data: feedback })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid body', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### 3.3 Frontend (componentes)

#### `src/components/quality/EvaluationList.tsx` *(NOVO — Painel A)*

- Filtros: score range (0-10), verdict (PASS/REVIEW/FAIL), "sem revisão humana", período (24h/7d/30d), categoria.
- Lista de itens com: avatar, telefone, score badge, verdict badge, tempo atrás.
- Ordenação default: FAIL → REVIEW → PASS, mais recente primeiro.
- Atalhos: `J` próximo, `K` anterior, `Enter` abre detalhe.

#### `src/components/quality/ConversationReview.tsx` *(NOVO — Painel B)*

- Render conversa selecionada (mensagens user + agent).
- Para mensagens do agent: badge inline com score + verdict + botões (1: correto, 2: incorreto, 3: parcial).
- Atalhos: `1`/`2`/`3` aplicam veredito ao item focado.

#### `src/components/quality/EvaluationDetails.tsx` *(NOVO — Painel C)*

- Score breakdown (4 dimensões, com reasoning expansível).
- Chunks recuperados (id, similarity, preview, link "ver completo", botão "marcar irrelevante" — Sprint 5).
- Custo + latência por estágio.
- Histórico de conversa (últimas 15 msgs).
- Prompt completo (collapse).

#### `src/components/quality/HumanFeedbackModal.tsx` *(NOVO)*

Modal contextual quando operador marca incorreto/parcial. Campos:
- Motivo (radio): wrong_chunk / bad_generation / missing_info / hallucination / gt_outdated / other
- Correction text (textarea)
- Checkbox: "Promover essa correção a Ground Truth"
- Botões: Cancelar / Confirmar (`Esc` / `Enter`)

#### `src/components/quality/ScoreBadge.tsx` *(NOVO)*

```tsx
export const ScoreBadge: React.FC<{ score: number; verdict?: 'PASS' | 'REVIEW' | 'FAIL' }> = ({ score, verdict }) => {
  const color = score >= 7 ? 'green' : score >= 4 ? 'yellow' : 'red'
  // ... render badge com cor + ícone do verdict
}
```

#### Hooks

- `src/hooks/useEvaluations.ts` — lista, filtros, paginação.
- `src/hooks/useHumanFeedback.ts` — submit feedback, promote-to-GT.

#### Página

- `src/app/dashboard/quality/evaluations/page.tsx` — layout 3 colunas (responsivo).
- `src/app/dashboard/quality/evaluations/[id]/page.tsx` — vista focada de 1 evaluation (deep link).

#### Sidebar

- Adicionar "Qualidade > Revisões" com badge do número de FAIL/REVIEW pendentes.

### 3.4 Alertas básicos

- Componente `QualityAlertBadge` no header — número de mensagens com `status='needs_review'`.
- Toast quando nova evaluation FAIL chega (via Supabase Realtime — opcional).

---

## 4. Checklist de afazeres (Sprint 4)

### Banco
- [ ] Backup
- [ ] Migration `20260513120000_create_human_feedback.sql`
- [ ] Validar UNIQUE (trace_id, operator_id) — operador único por trace
- [ ] Aplicar prod

### APIs
- [ ] `POST /api/evaluations/[traceId]/human-feedback`
- [ ] `GET /api/evaluations/[traceId]` — incluir `human_feedback` agregado
- [ ] Tratar promote-to-GT atomicamente (transação)

### Componentes
- [ ] `EvaluationList.tsx` (Painel A) com filtros e atalhos J/K
- [ ] `ConversationReview.tsx` (Painel B) com inline scoring
- [ ] `EvaluationDetails.tsx` (Painel C) com breakdown
- [ ] `HumanFeedbackModal.tsx` com validação
- [ ] `ScoreBadge.tsx` reutilizável
- [ ] `QualityAlertBadge.tsx` no header

### Hooks
- [ ] `useEvaluations` — paginação + filtros
- [ ] `useHumanFeedback` — submit + promote
- [ ] `useKeyboardShortcuts` (helper opcional)

### Páginas
- [ ] `/dashboard/quality/evaluations` (3 painéis)
- [ ] `/dashboard/quality/evaluations/[id]` (deep link)
- [ ] Atualizar Sidebar com badge

### Testes (ver §5)

### Observação
- [ ] Dogfooding: equipe revisa 50 evaluations reais antes do go-live
- [ ] Coletar feedback de UX: tempo médio, atalhos, modal
- [ ] Iterar UI antes de oferecer ao cliente piloto

---

## 5. Bateria de testes — Sprint 4

### 5.1 Unit — `HumanFeedbackModal`

**Arquivo:** `src/components/quality/HumanFeedbackModal.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HumanFeedbackModal } from './HumanFeedbackModal'

describe('HumanFeedbackModal', () => {
  const baseProps = {
    traceId: 't1',
    currentScore: 4.2,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn()
  }
  
  it('exibe score atual no header de contexto', () => {
    render(<HumanFeedbackModal {...baseProps} />)
    expect(screen.getByText(/4.2/)).toBeInTheDocument()
  })
  
  it('exige seleção de motivo quando verdict=incorrect', async () => {
    render(<HumanFeedbackModal {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Incorreto'))
    fireEvent.click(screen.getByText('Confirmar'))
    expect(baseProps.onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/selecione um motivo/i)).toBeInTheDocument()
  })
  
  it('chama onSubmit com payload correto', async () => {
    render(<HumanFeedbackModal {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Incorreto'))
    fireEvent.click(screen.getByLabelText('Geração interpretou errado'))
    fireEvent.change(screen.getByLabelText(/correção/i), { target: { value: 'resposta correta' } })
    fireEvent.click(screen.getByLabelText(/promover.*ground truth/i))
    fireEvent.click(screen.getByText('Confirmar'))
    
    expect(baseProps.onSubmit).toHaveBeenCalledWith({
      verdict: 'incorrect',
      error_category: 'bad_generation',
      correction_text: 'resposta correta',
      promote_to_ground_truth: true,
      reason: undefined
    })
  })
  
  it('Esc fecha o modal', () => {
    render(<HumanFeedbackModal {...baseProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(baseProps.onClose).toHaveBeenCalled()
  })
  
  it('Enter submete se há verdict válido', () => {
    render(<HumanFeedbackModal {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Correto'))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(baseProps.onSubmit).toHaveBeenCalled()
  })
})
```

### 5.2 Unit — `EvaluationList` filtros e atalhos

**Arquivo:** `src/components/quality/EvaluationList.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EvaluationList } from './EvaluationList'

vi.mock('@/hooks/useEvaluations', () => ({
  useEvaluations: () => ({
    evaluations: [
      { id: 'e1', trace_id: 't1', verdict: 'FAIL', composite_score: 2.5 },
      { id: 'e2', trace_id: 't2', verdict: 'PASS', composite_score: 8.5 }
    ],
    loading: false,
    setFilters: vi.fn()
  })
}))

describe('EvaluationList', () => {
  it('ordena FAIL antes de PASS por padrão', () => {
    render(<EvaluationList onSelect={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('FAIL')
    expect(items[1].textContent).toContain('PASS')
  })
  
  it('atalho J avança seleção', () => {
    const onSelect = vi.fn()
    render(<EvaluationList onSelect={onSelect} />)
    fireEvent.keyDown(document, { key: 'j' })
    fireEvent.keyDown(document, { key: 'j' })
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'e2' }))
  })
  
  it('atalho K volta seleção', () => {
    const onSelect = vi.fn()
    render(<EvaluationList onSelect={onSelect} />)
    fireEvent.keyDown(document, { key: 'j' })
    fireEvent.keyDown(document, { key: 'k' })
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'e1' }))
  })
  
  it('filtro de verdict atualiza setFilters', () => {
    const { setFilters } = require('@/hooks/useEvaluations').useEvaluations()
    render(<EvaluationList onSelect={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('FAIL'))
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ verdict: 'FAIL' }))
  })
})
```

### 5.3 Integration — POST human-feedback

**Arquivo:** `src/app/api/evaluations/[traceId]/human-feedback/route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn()
}

vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))
vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) })
}))
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUserClientId: vi.fn().mockResolvedValue('client-A'),
  getCurrentUserId: vi.fn().mockResolvedValue('user-1')
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.single = vi.fn().mockResolvedValue({ data: { id: 'fb1' }, error: null })
  mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'eval-1' }, error: null })
})

const req = (body: any) => new NextRequest('http://localhost', {
  method: 'POST', body: JSON.stringify(body)
})

describe('POST human-feedback', () => {
  it('rejeita 404 se trace não pertence ao client', async () => {
    mockSupabase.single = vi.fn().mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(req({ verdict: 'correct' }), { params: { traceId: 'tX' } })
    expect(res.status).toBe(404)
  })
  
  it('cria feedback com verdict válido', async () => {
    mockSupabase.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: 't1', user_message: 'q' }, error: null })  // get trace
      .mockResolvedValueOnce({ data: { id: 'fb1' }, error: null })                     // upsert feedback
    
    const res = await POST(req({ verdict: 'correct' }), { params: { traceId: 't1' } })
    expect(res.status).toBe(200)
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: 'correct', operator_id: 'user-1' }),
      expect.objectContaining({ onConflict: 'trace_id,operator_id' })
    )
  })
  
  it('promote_to_ground_truth=true cria entry em ground_truth', async () => {
    mockSupabase.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: 't1', user_message: 'qual horario?' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'gt-new' }, error: null })  // GT insert
      .mockResolvedValueOnce({ data: { id: 'fb1' }, error: null })     // feedback
    
    await POST(req({
      verdict: 'incorrect',
      correction_text: 'das 9h às 18h',
      promote_to_ground_truth: true
    }), { params: { traceId: 't1' } })
    
    // Validar que insert de ground_truth foi chamado
    const insertCalls = mockSupabase.insert.mock.calls
    expect(insertCalls.some((c: any[]) => c[0].source === 'operator_correction')).toBe(true)
  })
  
  it('promote_to_ground_truth sem correction_text NÃO cria GT', async () => {
    mockSupabase.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: 't1', user_message: 'q' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'fb1' }, error: null })
    
    await POST(req({ verdict: 'correct', promote_to_ground_truth: true }), { params: { traceId: 't1' } })
    
    const insertCalls = mockSupabase.insert.mock.calls
    expect(insertCalls.some((c: any[]) => c[0].source === 'operator_correction')).toBe(false)
  })
  
  it('atualiza status do trace para human_reviewed', async () => {
    mockSupabase.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: 't1', user_message: 'q' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'fb1' }, error: null })
    
    await POST(req({ verdict: 'correct' }), { params: { traceId: 't1' } })
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'human_reviewed' })
  })
  
  it('valida verdict inválido com 400', async () => {
    const res = await POST(req({ verdict: 'WHATEVER' }), { params: { traceId: 't1' } })
    expect(res.status).toBe(400)
  })
})
```

### 5.4 E2E — fluxo completo de revisão (Playwright)

**Arquivo:** `tests/e2e/operator-review-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/operator-A.json' })

test('operador completa revisão de FAIL em < 90s', async ({ page }) => {
  await page.goto('/dashboard/quality/evaluations')
  
  await expect(page.locator('[data-testid=eval-item]').first()).toBeVisible()
  
  const start = Date.now()
  
  // 1. Selecionar primeiro FAIL via atalho J
  await page.keyboard.press('j')
  
  // 2. Painel de detalhes carrega
  await expect(page.locator('[data-testid=eval-details]')).toBeVisible()
  
  // 3. Apertar 2 (incorreto)
  await page.keyboard.press('2')
  
  // 4. Modal abre — preencher motivo
  await page.click('label:has-text("Geração interpretou errado")')
  await page.fill('[name=correction_text]', 'A resposta correta seria das 9h às 18h.')
  await page.click('input[name=promote_to_ground_truth]')
  
  // 5. Confirmar com Enter
  await page.keyboard.press('Enter')
  
  // 6. Toast de sucesso
  await expect(page.locator('[data-testid=toast-success]')).toBeVisible({ timeout: 5000 })
  
  expect(Date.now() - start).toBeLessThan(90_000)
})

test('promote-to-GT cria entry visível em /ground-truth', async ({ page }) => {
  await page.goto('/dashboard/quality/evaluations')
  await page.keyboard.press('j')
  await page.keyboard.press('2')
  await page.click('label:has-text("Outro")')
  await page.fill('[name=correction_text]', 'Resposta promovida E2E')
  await page.click('input[name=promote_to_ground_truth]')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-testid=toast-success]')).toBeVisible()
  
  await page.goto('/dashboard/quality/ground-truth')
  await expect(page.getByText('Resposta promovida E2E')).toBeVisible({ timeout: 5000 })
})

test('badge de pendentes diminui após revisão', async ({ page }) => {
  await page.goto('/dashboard')
  const badgeBefore = await page.locator('[data-testid=quality-alert-badge]').textContent()
  const before = Number(badgeBefore)
  
  await page.goto('/dashboard/quality/evaluations')
  await page.keyboard.press('j')
  await page.keyboard.press('1')  // marca correto
  await expect(page.locator('[data-testid=toast-success]')).toBeVisible()
  
  await page.goto('/dashboard')
  const badgeAfter = await page.locator('[data-testid=quality-alert-badge]').textContent()
  expect(Number(badgeAfter)).toBe(before - 1)
})
```

### 5.5 Acessibilidade — keyboard navigation

**Arquivo:** `tests/e2e/quality-a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.use({ storageState: 'tests/e2e/.auth/operator-A.json' })

test('a11y: /dashboard/quality/evaluations não tem violações sérias', async ({ page }) => {
  await page.goto('/dashboard/quality/evaluations')
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(serious).toEqual([])
})

test('a11y: todos os botões têm rótulo acessível', async ({ page }) => {
  await page.goto('/dashboard/quality/evaluations')
  const buttons = await page.locator('button').all()
  for (const b of buttons) {
    const name = await b.getAttribute('aria-label') ?? await b.textContent()
    expect(name?.trim()).toBeTruthy()
  }
})
```

### 5.6 Performance — render lista com 1000 items

**Arquivo:** `src/components/quality/EvaluationList.perf.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { EvaluationList } from './EvaluationList'

vi.mock('@/hooks/useEvaluations', () => ({
  useEvaluations: () => ({
    evaluations: Array.from({ length: 1000 }, (_, i) => ({
      id: `e${i}`, trace_id: `t${i}`, verdict: i % 3 === 0 ? 'FAIL' : 'PASS', composite_score: Math.random() * 10
    })),
    loading: false,
    setFilters: vi.fn()
  })
}))

describe('perf: EvaluationList', () => {
  it('renderiza 1000 items em < 200ms (com virtualização)', () => {
    const start = performance.now()
    render(<EvaluationList onSelect={vi.fn()} />)
    expect(performance.now() - start).toBeLessThan(200)
  })
})
```

### 5.7 Trilha auditável — verifica que feedback é rastreável

**Arquivo:** `tests/integration/audit-trail.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe.skipIf(!process.env.E2E_CLIENT_A_ID)('audit trail: human_feedback', () => {
  it('feedback registra operator_id, trace_id, evaluation_id e timestamp', async () => {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    
    const { data } = await admin.from('human_feedback')
      .select('id, operator_id, trace_id, evaluation_id, created_at, marked_as_ground_truth, ground_truth_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    expect(data?.operator_id).toBeTruthy()
    expect(data?.trace_id).toBeTruthy()
    expect(data?.created_at).toBeTruthy()
    if (data?.marked_as_ground_truth) {
      expect(data?.ground_truth_id).toBeTruthy()
    }
  })
})
```

### 5.8 RLS — operador não vê feedback de outros clientes

**Arquivo:** `tests/security/rls-human-feedback.test.ts`

Mesmo padrão das outras RLS — confirmar isolamento cross-tenant em SELECT, INSERT, UPDATE.

### 5.9 Smoke manual

**Arquivo:** `tests/manual/sprint-4-smoke.md`

```markdown
1. Login como operador do cliente A
2. Abrir /dashboard/quality/evaluations
3. Verificar contagem no badge do menu = número de FAIL+REVIEW pendentes
4. Selecionar 1 FAIL com J
5. Apertar 2 (incorreto), preencher modal, marcar promote-to-GT, Enter
6. Verificar:
   - [ ] Toast de sucesso
   - [ ] Lista atualiza (FAIL sai do topo)
   - [ ] Badge decrementa
   - [ ] Em /ground-truth, nova entrada aparece com source=operator_correction
   - [ ] Em /traces/[id], status agora é "human_reviewed"
7. Logar como operador do cliente B → não deve ver nada do cliente A
```

---

## 6. Critérios de aceite (Sprint 4)

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Operador revisa FAIL em < 90s | §5.4 |
| 2 | Promote-to-GT cria entrada `source=operator_correction` | §5.3 + manual |
| 3 | Atalhos J/K/1/2/3 funcionam | §5.2 + §5.4 |
| 4 | Badge reflete contagem correta | §5.4 |
| 5 | UNIQUE (trace_id, operator_id) impede duplicatas | Migration + teste manual de duplo submit |
| 6 | A11y sem violações críticas | §5.5 |
| 7 | RLS isola feedback cross-tenant | §5.8 |
| 8 | Cobertura ≥ 70% nos novos componentes | `npm run test:coverage` |

---

## 7. Riscos do Sprint 4

| Risco | Mitigação |
|-------|-----------|
| UI lenta com 1000+ evaluations | Virtualização (`react-window` ou `tanstack-virtual`); paginar API |
| Operador comete erros sob pressão | Modal de confirmação para FAIL→correto e correto→FAIL |
| Conflito de feedback entre operadores | UNIQUE + UI mostra "X já revisou esta" + botão "discordar" cria nova linha de auditoria (S5) |
| Promote-to-GT gera GTs ruins | Confidence default 0.85 (vs 0.70 manual); validate workflow opcional |
| Realtime de Supabase não disponível em todas as contas | Fallback: poll a cada 30s para badge (já implementado) |
| Hotkeys conflitam com input fields | `useKeyboardShortcuts` ignora se `event.target instanceof HTMLInputElement` |

---

**Próximo:** [`05-rag-insights.md`](./05-rag-insights.md)
