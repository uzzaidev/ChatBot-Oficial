# Sprint 0 — Preparação (3–5 dias úteis)

> **Meta:** desbloquear a implementação dos sprints S1–S6 sem retrabalho.
> Sem código de produção; apenas decisões, configurações e spikes.

---

## 1. Objetivo

1. Garantir que **chaves, RLS, sampling e migrations** estão definidos antes de qualquer commit de feature.
2. Spike técnico: provar que `getRAGContext` consegue retornar `chunkIds` + `scores` sem quebrar o fluxo.
3. Setup do tooling de testes (vitest + msw + playwright) no projeto.

## 2. Definition of Done (DoD)

- [ ] `ANTHROPIC_API_KEY` provisionada e acessível no Vault (ou env, com decisão documentada).
- [ ] Sampling rate decidido (default 20%) e parametrizável via `bot_configurations`.
- [ ] RLS template revisado com base em `user_profiles` (não `auth.users`).
- [ ] Migrations fatiadas planejadas (uma por sprint).
- [ ] Spike `getRAGContext` retorna `chunkIds`/`scores` em PR aprovado (mas ainda não merged se quiser esperar S1).
- [ ] `vitest`, `msw`, `playwright`, `supertest`, `autocannon` instalados; scripts no `package.json`.
- [ ] CI (GitHub Actions) executa `npm run test` em PR.
- [ ] Documento de pré-requisitos commitado ([`./00-stack-e-arquitetura.md`](./00-stack-e-arquitetura.md) atualizado se necessário).

---

## 3. Backlog detalhado

### 3.1 Provisionamento Anthropic

| Tarefa | Responsável | Esforço |
|--------|-------------|---------|
| Criar conta Anthropic + chave API (sandbox + prod) | Tech Lead | 30min |
| Decidir escopo: per-tenant vs plataforma | Tech Lead + Negócio | 30min |
| Configurar no Vault (se per-tenant) ou `.env.local` (se plataforma) | Dev | 15min |
| Adicionar limite de gasto na própria Anthropic console (ex.: $50/mês inicial) | Tech Lead | 5min |
| Documentar em `.env.example` | Dev | 5min |

**Decisão recomendada:** começar com chave **da plataforma** (mais simples). Migrar para per-tenant na S6 se algum cliente exigir isolamento total.

### 3.2 Sampling

| Tarefa | Detalhe |
|--------|---------|
| Definir default | 20% aleatório + 100% se trace anterior do mesmo `phone` foi FAIL nas últimas 24h |
| Schema de configuração | Linha em `bot_configurations`: `key='quality:sampling_rate'`, `value='0.20'` |
| Cliente piloto | Yoga Escola — 20% inicial (ajustar após 1 semana com dados reais) |

### 3.3 RLS template

Revisar e validar com query de teste em `user_profiles`:

```sql
-- Template a ser usado em S1–S4
CREATE POLICY "<tabela>_tenant_isolation" ON <tabela>
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "<tabela>_service_role" ON <tabela>
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Validação:** rodar manualmente em duas contas de operadores diferentes (clientes diferentes) e confirmar isolamento.

### 3.4 Spike `getRAGContext`

Hoje retorna `string`. Precisa retornar:

```typescript
export interface GetRAGContextOutput {
  context: string                 // já existe (concatenado)
  chunkIds: string[]              // NOVO
  similarityScores: number[]      // NOVO
  threshold: number               // NOVO (já calculado internamente)
  topK: number                    // NOVO
}
```

**Restrições:**
- Não quebrar callers existentes em `chatbotFlow.ts` (manter `string` como output principal ou wrap em objeto).
- **Opção A (recomendada):** mudar return para objeto e adaptar caller (1 lugar).
- **Opção B:** criar `getRAGContextWithMetadata()` ao lado, mantendo o atual.

**PR do spike:** pode ficar em branch `spike/rag-metadata`, sem merge. Validar viabilidade.

### 3.5 Setup de tooling

```bash
# Test runner
npm install -D vitest @vitest/coverage-v8 @vitest/ui

# Mocks
npm install -D msw

# E2E
npm install -D @playwright/test
npx playwright install --with-deps chromium

# Carga
npm install -D autocannon

# Anthropic SDK (já será usada em S3)
npm install @anthropic-ai/sdk
```

`vitest.config.ts` na raiz:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', '.next', 'tests', '**/*.config.*']
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

`tests/setup.ts`:

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`playwright.config.ts` na raiz:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
})
```

### 3.6 CI

`.github/workflows/test.yml` (criar ou complementar):

```yaml
name: Tests
on: [pull_request]
jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:coverage -- --reporter=verbose
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
```

---

## 4. Checklist de afazeres (Sprint 0)

### Segurança e configuração
- [ ] Criar `ANTHROPIC_API_KEY` na console Anthropic
- [ ] Definir limite de gasto na Anthropic console ($50 inicial)
- [ ] Adicionar `ANTHROPIC_API_KEY` no `.env.local`
- [ ] Adicionar `ANTHROPIC_API_KEY` em Vercel (production + preview)
- [ ] Atualizar `.env.example` com novas variáveis (sem valores reais)
- [ ] Documentar em `docs/operations/secrets.md` (criar se não existe)

### Decisões e ADRs
- [ ] Decidir sampling default (20% confirmado)
- [ ] Decidir escopo Anthropic (plataforma vs per-tenant)
- [ ] Aprovar ADR-001 a ADR-010 (ver [`./00-stack-e-arquitetura.md`](./00-stack-e-arquitetura.md))

### Banco de dados
- [ ] Validar template de RLS em ambiente de teste com 2 `client_id`
- [ ] Confirmar que `user_profiles` tem coluna `client_id`
- [ ] Backup completo antes de iniciar S1 (`cd db && .\backup-complete.bat`)

### Spike RAG
- [ ] Criar branch `spike/rag-metadata`
- [ ] Implementar Opção A (return objeto) em `getRAGContext.ts`
- [ ] Validar que `chatbotFlow.ts` continua funcionando
- [ ] Documentar resultado e decisão em PR

### Tooling
- [ ] Instalar `vitest`, `@vitest/coverage-v8`, `@vitest/ui`
- [ ] Instalar `msw`
- [ ] Instalar `@playwright/test` + `npx playwright install`
- [ ] Instalar `autocannon`
- [ ] Instalar `@anthropic-ai/sdk`
- [ ] Criar `vitest.config.ts`
- [ ] Criar `playwright.config.ts`
- [ ] Criar `tests/setup.ts`
- [ ] Criar `tests/mocks/server.ts` (MSW)
- [ ] Criar `tests/mocks/anthropic.handlers.ts` (handlers mock)
- [ ] Criar `tests/fixtures/` com 1 fixture de exemplo
- [ ] Adicionar scripts `test`, `test:watch`, `test:coverage`, `test:e2e` no `package.json`
- [ ] Criar/atualizar `.github/workflows/test.yml`

### Documentação
- [ ] Atualizar `CLAUDE.md` com referência ao plano mestre
- [ ] Commitar todos os documentos `twin-plans/sprints/*.md`
- [ ] Comunicar plano à equipe (review de 30min)

---

## 5. Bateria de testes — Sprint 0

> Sprint 0 é mais decisão/setup que código. Os testes aqui validam o **tooling** e a **prontidão**.

### 5.1 Smoke test do tooling

**Arquivo:** `tests/smoke.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('tooling smoke', () => {
  it('vitest está funcionando', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('alias @ resolve para src/', async () => {
    const mod = await import('@/lib/types')
    expect(mod).toBeDefined()
  })
})
```

**Critério de aceite:** `npm run test` passa em local e CI.

### 5.2 Smoke test do MSW

**Arquivo:** `tests/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node'
import { handlers as anthropicHandlers } from './anthropic.handlers'
import { handlers as openaiHandlers } from './openai.handlers'

export const server = setupServer(...anthropicHandlers, ...openaiHandlers)
```

**Arquivo:** `tests/mocks/anthropic.handlers.ts`

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: '{"alignment_score": 9.0}' }],
      usage: { input_tokens: 100, output_tokens: 50 }
    })
  })
]
```

**Teste:** `tests/mocks/msw.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'

describe('MSW intercepta Anthropic', () => {
  it('retorna mock em vez de chamar API real', async () => {
    const client = new Anthropic({ apiKey: 'test-key' })
    const res = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'test' }]
    })
    expect(res.id).toBe('msg_mock')
  })
})
```

**Critério de aceite:** teste passa **sem** chamar Anthropic real (validar offline).

### 5.3 Validação RLS template

**Arquivo:** `tests/manual/rls-template.test.ts` (manual, marcado `.skip` por padrão)

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe.skip('RLS template — manual (rodar com 2 contas reais)', () => {
  it('operador de cliente A não vê dados de cliente B', async () => {
    // 1. Criar tabela de teste rls_test (uuid id, uuid client_id)
    // 2. Inserir 2 linhas: clientA e clientB
    // 3. Logar como operador de clientA
    // 4. SELECT * FROM rls_test → deve retornar só clientA
    // 5. Tentar inserir em clientB → deve falhar
    // (executar manualmente no início; automatizar em S1)
  })
})
```

### 5.4 Spike RAG — teste de integração

**Arquivo:** `src/nodes/getRAGContext.test.ts` (na branch spike)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getRAGContext } from './getRAGContext'

vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) })
}))

vi.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    rpc: vi.fn().mockResolvedValue({
      data: [
        { id: 'chunk_1', content: 'foo', metadata: {}, similarity: 0.9 },
        { id: 'chunk_2', content: 'bar', metadata: {}, similarity: 0.85 }
      ],
      error: null
    })
  })
}))

vi.mock('@/lib/config', () => ({
  getBotConfig: vi.fn().mockResolvedValue(null)  // fallback defaults
}))

describe('getRAGContext (com metadata)', () => {
  it('retorna context + chunkIds + similarityScores', async () => {
    const result = await getRAGContext({ query: 'q', clientId: 'c1' })
    
    expect(result.context).toContain('foo')
    expect(result.chunkIds).toEqual(['chunk_1', 'chunk_2'])
    expect(result.similarityScores).toEqual([0.9, 0.85])
    expect(result.topK).toBe(5)            // default
    expect(result.threshold).toBe(0.7)     // default
  })
  
  it('retorna arrays vazios se nenhum chunk match', async () => {
    // ... mock retorna data: []
    // expect(result.chunkIds).toEqual([])
  })
})
```

**Critério de aceite:** teste passa; nenhum caller existente quebra.

### 5.5 CI smoke

**Validação manual:** abrir PR sintético com 1 alteração de código + `tests/smoke.test.ts` e confirmar:
- [ ] GitHub Actions executa `npm run test`
- [ ] Coverage é gerado e enviado como artifact
- [ ] PR fica vermelho se teste falhar (testar com `expect(1).toBe(2)`)

---

## 6. Critérios de aceite (Sprint 0)

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | Anthropic key disponível em todos os ambientes | `console.log(!!process.env.ANTHROPIC_API_KEY)` em dev/staging/prod |
| 2 | `vitest run` executa sem erros | Rodar localmente |
| 3 | MSW intercepta chamadas Anthropic em testes | Teste 5.2 passa offline |
| 4 | Spike RAG aprovado em PR review | Branch existe, PR aberto, decisão documentada |
| 5 | CI executa testes em PR | Workflow rodando em pelo menos 1 PR |
| 6 | RLS template validado manualmente com 2 clientes | Print/screenshot anexado em PR |
| 7 | Backlog dos S1–S6 confirmado | Reunião de planning + estimativas ratificadas |

---

## 7. Riscos do Sprint 0

| Risco | Mitigação |
|-------|-----------|
| Anthropic não aprova conta a tempo | Solicitar com 1 semana de antecedência; ter conta backup |
| Spike RAG quebra mais que esperado | Optar por Opção B (função paralela) e migrar gradual |
| MSW não funciona com `@anthropic-ai/sdk` | Validar antes de S3; usar `nock` como fallback |
| Equipe sem familiaridade com vitest | Pair programming; sessão de 1h de onboarding |

---

## 8. Saída do Sprint 0

- ADRs aprovados.
- Tooling rodando em CI.
- Backlog do Sprint 1 destrancado.
- Risco anotado: uso de `pg` em hot path (não introduzir em código novo, mitigar em S6).

**Próximo:** [`01-traces-fundacao.md`](./01-traces-fundacao.md)
