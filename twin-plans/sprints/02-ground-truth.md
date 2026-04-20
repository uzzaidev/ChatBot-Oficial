# Sprint 2 — Ground Truth (gabarito) + Matcher + UI básica

> **Duração:** 1 semana
> **Pré-requisito:** Sprint 1 ([`01-traces-fundacao.md`](./01-traces-fundacao.md))
> **Meta:** ter um banco de **pergunta → resposta esperada** por cliente, com versionamento imutável e busca por similaridade vetorial.

---

## 1. Objetivo

Construir a base de **gabarito** que será usada pelo juiz (S3) para avaliar respostas:

1. Tabela `ground_truth` com versionamento imutável (ADR-003).
2. `ground-truth-matcher.ts` que faz cosine similarity em pgvector.
3. APIs CRUD `/api/ground-truth` + endpoint `from-trace`.
4. UI mínima de `GroundTruthManager` em `/dashboard/quality/ground-truth`.

---

## 2. Definition of Done (DoD)

- [ ] Migration `ground_truth` aplicada com índice ivfflat.
- [ ] `findSimilarGroundTruth(clientId, query, threshold)` retorna entrada mais similar acima do threshold.
- [ ] CRUD completo via API com soft delete e versionamento (update cria nova versão, mantém antiga).
- [ ] UI permite **criar / listar / editar / desativar / validar** entrada em < 60s por operação.
- [ ] Cliente piloto (Yoga Escola) tem ≥ 30 entradas curadas (manual).
- [ ] Acurácia do matcher: top-1 cosine > 85% em dataset curado de 30 casos.
- [ ] Cobertura: ≥ 80% em `ground-truth-matcher.ts`; 100% das APIs.

---

## 3. Backlog detalhado

### 3.1 Novos arquivos

#### `supabase/migrations/20260429120000_create_ground_truth.sql`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Conteúdo
  user_query TEXT NOT NULL,
  expected_response TEXT NOT NULL,
  query_embedding VECTOR(1536),  -- text-embedding-3-small
  
  -- Categorização
  category TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Curadoria
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID[] DEFAULT ARRAY[]::UUID[],
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.70 CHECK (confidence >= 0 AND confidence <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Versionamento imutável
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES ground_truth(id),         -- versão anterior
  superseded_by UUID REFERENCES ground_truth(id),     -- substituído por
  
  -- Origem
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'mined', 'synthetic', 'operator_correction')),
  source_trace_id UUID REFERENCES message_traces(id),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ground_truth_client_id ON ground_truth(client_id);
CREATE INDEX idx_ground_truth_category ON ground_truth(category);
CREATE INDEX idx_ground_truth_is_active ON ground_truth(is_active);
CREATE INDEX idx_ground_truth_embedding
  ON ground_truth USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 50);

-- Trigger updated_at
CREATE TRIGGER trg_ground_truth_updated_at
  BEFORE UPDATE ON ground_truth
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE ground_truth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ground_truth_tenant_isolation" ON ground_truth
  FOR ALL
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "ground_truth_service_role" ON ground_truth
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Função RPC para busca vetorial
CREATE OR REPLACE FUNCTION match_ground_truth(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.80,
  match_count INT DEFAULT 5,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_query TEXT,
  expected_response TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gt.id,
    gt.user_query,
    gt.expected_response,
    gt.category,
    1 - (gt.query_embedding <=> query_embedding) AS similarity
  FROM ground_truth gt
  WHERE gt.is_active = true
    AND gt.client_id = COALESCE(filter_client_id, gt.client_id)
    AND 1 - (gt.query_embedding <=> query_embedding) > match_threshold
  ORDER BY gt.query_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### `src/lib/ground-truth-matcher.ts` *(NOVO)*

```typescript
import { generateEmbedding } from '@/lib/openai'
import { createServerClient } from '@/lib/supabase'
import { getBotConfig } from '@/lib/config'

export interface GroundTruthEntry {
  id: string
  user_query: string
  expected_response: string
  category: string | null
  similarity: number
}

export interface FindSimilarOptions {
  threshold?: number     // default vem de bot_config (rag:gt_threshold) ou 0.80
  limit?: number         // default 1
  openaiApiKey?: string
}

export const findSimilarGroundTruth = async (
  clientId: string,
  userQuery: string,
  options: FindSimilarOptions = {}
): Promise<GroundTruthEntry | null> => {
  const list = await findSimilarGroundTruthList(clientId, userQuery, { ...options, limit: 1 })
  return list[0] ?? null
}

export const findSimilarGroundTruthList = async (
  clientId: string,
  userQuery: string,
  options: FindSimilarOptions = {}
): Promise<GroundTruthEntry[]> => {
  const cfgThreshold = await getBotConfig(clientId, 'quality:gt_threshold')
  const threshold = options.threshold ?? (cfgThreshold !== null ? Number(cfgThreshold) : 0.80)
  const limit = options.limit ?? 1
  
  const { embedding } = await generateEmbedding(userQuery, options.openaiApiKey, clientId)
  if (embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimensions: expected 1536, got ${embedding.length}`)
  }
  
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('match_ground_truth', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_client_id: clientId
  })
  
  if (error) {
    console.error('[ground-truth-matcher] match failed', { clientId, error: error.message })
    return []
  }
  
  return (data ?? []) as GroundTruthEntry[]
}
```

#### `src/app/api/ground-truth/route.ts` *(NOVO)*

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getCurrentUserClientId, getCurrentUserId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

const ListQuery = z.object({
  category: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

const CreateBody = z.object({
  user_query: z.string().min(1).max(2000),
  expected_response: z.string().min(1).max(10000),
  category: z.string().max(80).optional(),
  subcategory: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  confidence: z.number().min(0).max(1).default(0.70),
  source: z.enum(['manual', 'mined', 'synthetic', 'operator_correction']).default('manual'),
  source_trace_id: z.string().uuid().optional()
})

export async function GET(request: NextRequest) {
  try {
    const clientId = await getCurrentUserClientId()
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const params = ListQuery.parse(Object.fromEntries(request.nextUrl.searchParams))
    
    const supabase = await createServerClient()
    let q = supabase.from('ground_truth').select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1)
    
    if (params.category) q = q.eq('category', params.category)
    if (params.active) q = q.eq('is_active', params.active === 'true')
    
    const { data, error, count } = await q
    if (error) throw error
    return NextResponse.json({ data, total: count })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid params', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getCurrentUserClientId()
    const userId = await getCurrentUserId()
    if (!clientId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = CreateBody.parse(await request.json())
    
    const { embedding } = await generateEmbedding(body.user_query, undefined, clientId)
    
    const supabase = await createServerClient()
    const { data, error } = await supabase.from('ground_truth').insert({
      client_id: clientId,
      user_query: body.user_query,
      expected_response: body.expected_response,
      query_embedding: embedding,
      category: body.category,
      subcategory: body.subcategory,
      tags: body.tags,
      confidence: body.confidence,
      source: body.source,
      source_trace_id: body.source_trace_id ?? null,
      created_by: userId,
      version: 1
    }).select('*').single()
    
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid body', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### `src/app/api/ground-truth/[id]/route.ts` *(NOVO)*

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getCurrentUserClientId, getCurrentUserId } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

const PatchBody = z.object({
  user_query: z.string().min(1).max(2000).optional(),
  expected_response: z.string().min(1).max(10000).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  confidence: z.number().min(0).max(1).optional()
})

// PATCH cria NOVA versão (ADR-003: imutabilidade)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const clientId = await getCurrentUserClientId()
  const userId = await getCurrentUserId()
  if (!clientId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = PatchBody.parse(await request.json())
  const supabase = await createServerClient()
  
  const { data: original, error: getErr } = await supabase
    .from('ground_truth').select('*').eq('id', params.id).eq('client_id', clientId).single()
  if (getErr || !original) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  const userQuery = body.user_query ?? original.user_query
  const embedding = body.user_query
    ? (await generateEmbedding(userQuery, undefined, clientId)).embedding
    : original.query_embedding
  
  const { data: newVersion, error: insertErr } = await supabase.from('ground_truth').insert({
    client_id: clientId,
    user_query: userQuery,
    expected_response: body.expected_response ?? original.expected_response,
    query_embedding: embedding,
    category: body.category ?? original.category,
    subcategory: original.subcategory,
    tags: body.tags ?? original.tags,
    confidence: body.confidence ?? original.confidence,
    source: 'manual',
    parent_id: original.id,
    version: original.version + 1,
    created_by: userId
  }).select('*').single()
  
  if (insertErr) throw insertErr
  
  // Marcar antiga como superseded
  await supabase.from('ground_truth')
    .update({ superseded_by: newVersion.id, is_active: false })
    .eq('id', original.id)
  
  return NextResponse.json({ data: newVersion })
}

// DELETE = soft delete (is_active=false)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const clientId = await getCurrentUserClientId()
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const supabase = await createServerClient()
  const { error } = await supabase.from('ground_truth')
    .update({ is_active: false })
    .eq('id', params.id).eq('client_id', clientId)
  
  if (error) throw error
  return NextResponse.json({ success: true })
}
```

#### `src/app/api/ground-truth/from-trace/route.ts` *(NOVO)*

POST com `{ trace_id, expected_response, category? }` cria GT a partir de um trace (usado em S4).

#### Componentes UI

- `src/components/quality/GroundTruthManager.tsx` (lista + filtros)
- `src/components/quality/GroundTruthFormModal.tsx` (criar/editar)
- `src/app/dashboard/quality/ground-truth/page.tsx`
- `src/components/Sidebar.tsx` — adicionar item "Qualidade > Ground Truth"
- `src/hooks/useGroundTruth.ts`

---

## 4. Checklist de afazeres (Sprint 2)

### Banco
- [ ] Backup antes da migration
- [ ] Validar `vector` extension habilitada em prod
- [ ] Aplicar migration `20260429120000_create_ground_truth.sql`
- [ ] Validar RPC `match_ground_truth` com vetor de teste manualmente
- [ ] Atualizar `docs/tables/tabelas.md`

### Lib
- [ ] Implementar `findSimilarGroundTruth` + `findSimilarGroundTruthList`
- [ ] Validar dim 1536 em runtime (throwa se diferente)
- [ ] Cachear `getBotConfig('quality:gt_threshold')` se chamado em loop quente

### APIs
- [ ] `GET /api/ground-truth` (lista paginada + filtros)
- [ ] `POST /api/ground-truth` (criar com embedding)
- [ ] `PATCH /api/ground-truth/[id]` (cria nova versão)
- [ ] `DELETE /api/ground-truth/[id]` (soft delete)
- [ ] `POST /api/ground-truth/[id]/validate` (operador valida)
- [ ] `POST /api/ground-truth/from-trace` (criar a partir de trace)

### UI
- [ ] `GroundTruthManager.tsx` — lista com filtros (categoria, ativo)
- [ ] `GroundTruthFormModal.tsx` — criar/editar com validação
- [ ] Página `/dashboard/quality/ground-truth`
- [ ] Adicionar "Qualidade > Ground Truth" no Sidebar
- [ ] Hook `useGroundTruth`
- [ ] Botão "Promote to Ground Truth" em telas de trace (S4 prep)

### Bootstrap inicial
- [ ] Cliente piloto: criar 30 entradas manuais (categorias: planos, horários, inscrição, pagamento, cancelamento)
- [ ] Validar que matcher acerta top-1 em pelo menos 26/30 (87%)

### Testes (ver §5)
- [ ] Unit: matcher
- [ ] Integration: APIs CRUD
- [ ] Imutabilidade: PATCH cria nova versão
- [ ] Vector search: similaridade correta
- [ ] RLS: isolamento

### Documentação
- [ ] Atualizar `docs/tables/tabelas.md`
- [ ] Pequeno guia em `docs/features/ground-truth.md` (como criar entradas)

---

## 5. Bateria de testes — Sprint 2

### 5.1 Testes unitários — `ground-truth-matcher`

**Arquivo:** `src/lib/ground-truth-matcher.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findSimilarGroundTruth, findSimilarGroundTruthList } from './ground-truth-matcher'

vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) })
}))

const mockRpc = vi.fn()
vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => ({ rpc: mockRpc }))
}))

vi.mock('@/lib/config', () => ({
  getBotConfig: vi.fn().mockResolvedValue(null)
}))

describe('ground-truth-matcher', () => {
  beforeEach(() => {
    mockRpc.mockClear()
  })
  
  it('retorna entrada mais similar acima do threshold', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { id: 'g1', user_query: 'q1', expected_response: 'r1', category: 'cat', similarity: 0.92 }
      ],
      error: null
    })
    const r = await findSimilarGroundTruth('client-A', 'qual o horário?')
    expect(r?.id).toBe('g1')
    expect(r?.similarity).toBe(0.92)
  })
  
  it('retorna null se nenhuma entrada acima do threshold', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    const r = await findSimilarGroundTruth('client-A', 'algo desconhecido')
    expect(r).toBeNull()
  })
  
  it('passa threshold customizado para RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await findSimilarGroundTruth('client-A', 'q', { threshold: 0.95 })
    expect(mockRpc).toHaveBeenCalledWith('match_ground_truth', expect.objectContaining({
      match_threshold: 0.95
    }))
  })
  
  it('aplica filter_client_id para isolamento', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await findSimilarGroundTruth('client-A', 'q')
    expect(mockRpc).toHaveBeenCalledWith('match_ground_truth', expect.objectContaining({
      filter_client_id: 'client-A'
    }))
  })
  
  it('throwa se embedding tem dimensão errada', async () => {
    const { generateEmbedding } = await import('@/lib/openai')
    vi.mocked(generateEmbedding).mockResolvedValueOnce({ embedding: new Array(512).fill(0.1) } as any)
    await expect(findSimilarGroundTruth('c', 'q')).rejects.toThrow(/Invalid embedding dimensions/)
  })
  
  it('retorna [] e loga erro quando RPC falha', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc fail' } })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await findSimilarGroundTruthList('c', 'q')
    expect(r).toEqual([])
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  
  it('lê threshold de bot_configurations quando não passado', async () => {
    const { getBotConfig } = await import('@/lib/config')
    vi.mocked(getBotConfig).mockResolvedValueOnce(0.85 as any)
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    await findSimilarGroundTruth('c', 'q')
    expect(mockRpc).toHaveBeenCalledWith('match_ground_truth', expect.objectContaining({
      match_threshold: 0.85
    }))
  })
})
```

### 5.2 Testes de integração — APIs CRUD

**Arquivo:** `src/app/api/ground-truth/route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

const mockChain: any = {}
const mockSupabase = {
  from: vi.fn(() => mockChain)
}

vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn(() => mockSupabase) }))
vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) })
}))
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUserClientId: vi.fn().mockResolvedValue('client-A'),
  getCurrentUserId: vi.fn().mockResolvedValue('user-1')
}))

const makeReq = (url: string, init: any = {}) =>
  new NextRequest(new URL(url, 'http://localhost'), init)

beforeEach(() => {
  Object.assign(mockChain, {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'g1' }, error: null })
  })
  mockChain.range = vi.fn().mockResolvedValue({ data: [{ id: 'g1' }], count: 1, error: null })
  vi.clearAllMocks()
})

describe('POST /api/ground-truth', () => {
  it('valida payload com zod', async () => {
    const res = await POST(makeReq('http://localhost/api/ground-truth', {
      method: 'POST',
      body: JSON.stringify({ user_query: '' }) // inválido
    }))
    expect(res.status).toBe(400)
  })
  
  it('cria entrada com embedding gerado', async () => {
    const res = await POST(makeReq('http://localhost/api/ground-truth', {
      method: 'POST',
      body: JSON.stringify({
        user_query: 'qual o horário?',
        expected_response: 'das 9h às 18h'
      })
    }))
    expect(res.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'client-A',
      version: 1,
      query_embedding: expect.any(Array)
    }))
  })
  
  it('rejeita user_query > 2000 chars', async () => {
    const res = await POST(makeReq('http://localhost/api/ground-truth', {
      method: 'POST',
      body: JSON.stringify({
        user_query: 'x'.repeat(2001),
        expected_response: 'r'
      })
    }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/ground-truth', () => {
  it('aplica filtro de client_id automaticamente', async () => {
    await GET(makeReq('http://localhost/api/ground-truth'))
    expect(mockChain.eq).toHaveBeenCalledWith('client_id', 'client-A')
  })
  
  it('aplica filtro de categoria quando presente', async () => {
    await GET(makeReq('http://localhost/api/ground-truth?category=horarios'))
    expect(mockChain.eq).toHaveBeenCalledWith('category', 'horarios')
  })
})
```

### 5.3 Imutabilidade — PATCH cria nova versão

**Arquivo:** `src/app/api/ground-truth/[id]/route.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { PATCH, DELETE } from './route'
import { NextRequest } from 'next/server'

let originalEntry = {
  id: 'g1',
  client_id: 'client-A',
  user_query: 'antiga',
  expected_response: 'antiga',
  query_embedding: new Array(1536).fill(0.1),
  category: 'cat',
  subcategory: null,
  tags: [],
  confidence: 0.7,
  version: 1
}

const mockChain: any = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn()
}

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(() => mockChain) }))
}))
vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.2) })
}))
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUserClientId: vi.fn().mockResolvedValue('client-A'),
  getCurrentUserId: vi.fn().mockResolvedValue('user-1')
}))

const makeReq = (body: any) => new NextRequest('http://localhost/api/ground-truth/g1', {
  method: 'PATCH',
  body: JSON.stringify(body)
})

describe('PATCH /api/ground-truth/[id] — imutabilidade', () => {
  it('cria NOVA linha com version+1 e parent_id apontando para original', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: originalEntry, error: null })  // GET original
      .mockResolvedValueOnce({ data: { id: 'g2', version: 2 }, error: null }) // INSERT new
    
    await PATCH(makeReq({ expected_response: 'nova resposta' }), { params: { id: 'g1' } })
    
    expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      parent_id: 'g1',
      version: 2,
      expected_response: 'nova resposta'
    }))
  })
  
  it('marca original como superseded e is_active=false', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: originalEntry, error: null })
      .mockResolvedValueOnce({ data: { id: 'g2', version: 2 }, error: null })
    
    await PATCH(makeReq({ expected_response: 'nova' }), { params: { id: 'g1' } })
    
    expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
      superseded_by: 'g2',
      is_active: false
    }))
  })
  
  it('regera embedding APENAS se user_query mudou', async () => {
    const { generateEmbedding } = await import('@/lib/openai')
    mockChain.single
      .mockResolvedValueOnce({ data: originalEntry, error: null })
      .mockResolvedValueOnce({ data: { id: 'g2', version: 2 }, error: null })
    
    await PATCH(makeReq({ expected_response: 'nova' }), { params: { id: 'g1' } })
    expect(generateEmbedding).not.toHaveBeenCalled()
    
    vi.mocked(generateEmbedding).mockClear()
    mockChain.single
      .mockResolvedValueOnce({ data: originalEntry, error: null })
      .mockResolvedValueOnce({ data: { id: 'g3', version: 3 }, error: null })
    
    await PATCH(makeReq({ user_query: 'nova pergunta' }), { params: { id: 'g1' } })
    expect(generateEmbedding).toHaveBeenCalledWith('nova pergunta', undefined, 'client-A')
  })
  
  it('retorna 404 se entrada não pertence ao client', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    const res = await PATCH(makeReq({ expected_response: 'x' }), { params: { id: 'gX' } })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/ground-truth/[id] — soft delete', () => {
  it('seta is_active=false (não DELETE físico)', async () => {
    mockChain.eq = vi.fn().mockResolvedValueOnce({ error: null })
    const res = await DELETE(new NextRequest('http://localhost/api/ground-truth/g1'), { params: { id: 'g1' } })
    expect(res.status).toBe(200)
    expect(mockChain.update).toHaveBeenCalledWith({ is_active: false })
  })
})
```

### 5.4 Acurácia do matcher — eval suite mini

**Arquivo:** `tests/eval-suite/ground-truth-matcher.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { findSimilarGroundTruth } from '@/lib/ground-truth-matcher'

const CLIENT_PILOT = process.env.E2E_CLIENT_A_ID

const goldenCases = [
  { query: 'qual horario funcionamento', expectedCategory: 'horarios' },
  { query: 'a que horas voces abrem', expectedCategory: 'horarios' },
  { query: 'qual valor do plano', expectedCategory: 'planos' },
  { query: 'quanto custa', expectedCategory: 'planos' },
  { query: 'como faço inscrição', expectedCategory: 'inscricao' },
  // ... 30 casos curados
]

describe.skipIf(!CLIENT_PILOT)('eval: matcher accuracy (cliente piloto)', () => {
  it('top-1 acerta categoria em > 85% dos casos curados', async () => {
    let hits = 0
    for (const c of goldenCases) {
      const r = await findSimilarGroundTruth(CLIENT_PILOT!, c.query, { threshold: 0.5 })
      if (r?.category === c.expectedCategory) hits++
    }
    const accuracy = hits / goldenCases.length
    console.log(`Matcher accuracy: ${(accuracy * 100).toFixed(1)}%`)
    expect(accuracy).toBeGreaterThanOrEqual(0.85)
  }, 60_000)
})
```

### 5.5 Vector search — sanidade pgvector

**Arquivo:** `tests/integration/pgvector-match-gt.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const CLIENT = process.env.E2E_CLIENT_A_ID!

describe.skipIf(!CLIENT)('pgvector match_ground_truth', () => {
  const ids: string[] = []
  
  beforeAll(async () => {
    const e1 = new Array(1536).fill(0.1); e1[0] = 1.0
    const e2 = new Array(1536).fill(0.1); e2[0] = -1.0
    const { data: a } = await admin.from('ground_truth').insert({
      client_id: CLIENT, user_query: 'A', expected_response: 'A', query_embedding: e1
    }).select('id').single()
    const { data: b } = await admin.from('ground_truth').insert({
      client_id: CLIENT, user_query: 'B', expected_response: 'B', query_embedding: e2
    }).select('id').single()
    ids.push(a!.id, b!.id)
  })
  
  afterAll(async () => {
    if (ids.length) await admin.from('ground_truth').delete().in('id', ids)
  })
  
  it('vetor similar a A retorna A primeiro', async () => {
    const probe = new Array(1536).fill(0.1); probe[0] = 0.95
    const { data, error } = await admin.rpc('match_ground_truth', {
      query_embedding: probe,
      match_threshold: 0.0,
      match_count: 5,
      filter_client_id: CLIENT
    })
    expect(error).toBeNull()
    expect(data?.[0].user_query).toBe('A')
  })
  
  it('respeita filter_client_id', async () => {
    const probe = new Array(1536).fill(0.1); probe[0] = 0.95
    const { data } = await admin.rpc('match_ground_truth', {
      query_embedding: probe,
      match_threshold: 0.0,
      match_count: 5,
      filter_client_id: '00000000-0000-0000-0000-000000000000'
    })
    expect(data).toEqual([])
  })
})
```

### 5.6 RLS — isolamento ground_truth

**Arquivo:** `tests/security/rls-ground-truth.test.ts`

Mesmo padrão do §5.5 do Sprint 1 — confirmar que operador A não vê GT de B, não consegue inserir cross-tenant, não consegue ler embeddings de outros clientes.

### 5.7 E2E UI — operador cria entrada em < 60s

**Arquivo:** `tests/e2e/ground-truth-crud.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/operator-A.json' })

test('operador cria nova entrada de GT em < 60s', async ({ page }) => {
  await page.goto('/dashboard/quality/ground-truth')
  
  const start = Date.now()
  await page.click('button:has-text("Nova entrada")')
  await page.fill('[name=user_query]', 'Qual o horário de funcionamento?')
  await page.fill('[name=expected_response]', 'Funcionamos das 9h às 18h, segunda a sexta.')
  await page.selectOption('[name=category]', 'horarios')
  await page.click('button:has-text("Salvar")')
  
  await expect(page.getByText('Qual o horário de funcionamento?')).toBeVisible({ timeout: 10_000 })
  expect(Date.now() - start).toBeLessThan(60_000)
})

test('operador edita entrada → cria nova versão (antiga fica oculta)', async ({ page }) => {
  await page.goto('/dashboard/quality/ground-truth')
  await page.click('text=Editar')
  await page.fill('[name=expected_response]', 'Funcionamos das 8h às 19h.')
  await page.click('button:has-text("Salvar")')
  
  await expect(page.getByText('Funcionamos das 8h às 19h.')).toBeVisible()
  await expect(page.getByText('Funcionamos das 9h às 18h')).not.toBeVisible()  // antiga oculta
  
  await page.click('input[name=showInactive]')
  await expect(page.getByText('v1')).toBeVisible()  // antiga aparece quando inclui inativas
})
```

### 5.8 Performance — busca em pgvector

**Arquivo:** `tests/perf/gt-matcher.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { findSimilarGroundTruthList } from '@/lib/ground-truth-matcher'

describe.skipIf(!process.env.E2E_CLIENT_A_ID)('perf: GT matcher', () => {
  it('busca em base de 100 entradas leva < 500ms', async () => {
    const start = performance.now()
    await findSimilarGroundTruthList(process.env.E2E_CLIENT_A_ID!, 'qual horário', { limit: 5 })
    expect(performance.now() - start).toBeLessThan(500)
  })
})
```

---

## 6. Critérios de aceite (Sprint 2)

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | 30+ entradas curadas no cliente piloto | `SELECT COUNT(*) FROM ground_truth WHERE client_id=... AND is_active=true` |
| 2 | PATCH cria nova versão e desativa antiga | §5.3 |
| 3 | Matcher acurácia > 85% top-1 | §5.4 |
| 4 | Busca em pgvector < 500ms | §5.8 |
| 5 | RLS isola tenants | §5.6 |
| 6 | Operador cria entrada via UI em < 60s | §5.7 |
| 7 | Cobertura ≥ 80% no matcher | `npm run test:coverage` |

---

## 7. Riscos do Sprint 2

| Risco | Mitigação |
|-------|-----------|
| Embedding cost para bootstrap (100+ entradas) | OpenAI tem custo baixo (~$0.0001/req); aceitável |
| Bootstrap sintético gera GTs ruins | Adiar para Sprint 5; começar com manual |
| Index ivfflat lento se base < 100 entradas | Aceitável; otimizar com `lists` quando passar de 1000 |
| Operador erra categoria → busca degradada | Validation em validate UI; categorias predefinidas |
| Imutabilidade gera muitas versões obsoletas | Job de cleanup (S6) que remove `is_active=false` antigas após 365 dias |

---

**Próximo:** [`03-juiz-automatico.md`](./03-juiz-automatico.md)
