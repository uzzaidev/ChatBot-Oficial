# QA Strategy — Observabilidade, Avaliação e Feedback (Sprints 1–6)

Documento transversal que define **como** testamos, **quanto** testamos e **quando** testamos cada camada do sistema. Aplica-se às Sprints 1 a 6 e ao código que sobreviver ao produto.

---

## 1. Princípios

1. **Test pyramid invertida ao mínimo** — mais unidade que integração; mais integração que E2E; E2E reservado para fluxos críticos de usuário.
2. **Eval suite > test suite** para qualidade de IA — testes determinísticos validam código; eval suite valida **comportamento do agente**.
3. **Fast feedback** — toda PR roda unit + lint + typecheck em <3 min. Integration em <8 min. Eval gate em <15 min.
4. **Sem flakiness tolerada** — teste flaky vai para `it.skip` com issue obrigatória; rerun automático ≤1.
5. **Colocação por responsabilidade**, não por tipo — `tests/unit/` espelha `src/`, `tests/integration/` agrupa por feature.
6. **Determinismo** — fixtures versionadas, seeds fixos, time mocks, IDs determinísticos.
7. **Mocks só nas bordas** — Anthropic, OpenAI, Meta sempre mockados; Supabase sempre real (test instance).

---

## 2. Pirâmide de testes (alvo de cobertura)

```
                       /\
                      /  \      E2E (5%)
                     /----\     ~30 testes ─ flow crítico ponta a ponta
                    /      \
                   /--------\   Integration (25%)
                  /          \  ~150 testes ─ APIs, DB, RPCs
                 /------------\
                /              \ Unit (70%)
               /----------------\ ~400 testes ─ funções puras, schemas, helpers
```

**Cobertura mínima por tipo de arquivo:**

| Tipo | Cobertura mínima | Ferramenta |
|---|---|---|
| `src/lib/*.ts` (utils, clients) | 90% lines | vitest + c8 |
| `src/nodes/*.ts` (nodes do flow) | 85% branches | vitest |
| `src/app/api/**/route.ts` | 80% (integration) | vitest + supertest |
| `src/components/**/*.tsx` | 70% (RTL) | vitest + @testing-library |
| `src/flows/*.ts` (orquestradores) | 75% lines | vitest + integration |
| Migrations SQL | 100% smoke (apply+rollback) | supabase CLI |

**Não medimos cobertura em:**
- `src/components/ui/*` (shadcn gerados)
- `*.config.ts`, `*.d.ts`
- Stories e documentação

---

## 3. Tipos de teste — quando usar cada um

### 3.1 Unit
- **Quando:** função pura, sem I/O, lógica determinística (e.g., `sanitizePII`, `computeComposite`, `shouldSample`).
- **Tempo:** <50ms por teste, <30s suite inteira.
- **Mocks:** zero (ou apenas time/Math.random).
- **Exemplo:** `tests/unit/sanitize-pii.test.ts`, `tests/unit/composite-score.test.ts`.

### 3.2 Contract
- **Quando:** validar formato de dados entre módulos (zod schemas, response shapes de APIs externas).
- **Tempo:** <100ms por teste.
- **Mocks:** payloads JSON de exemplo versionados em `tests/fixtures/`.
- **Exemplo:** `tests/contract/judge-output-schema.test.ts` valida que mock de Anthropic passa pelo zod.

### 3.3 Integration
- **Quando:** envolve Supabase real, Redis real, APIs internas chamando lib internas.
- **Tempo:** <2s por teste, <5min suite.
- **Mocks:** APIs externas (Anthropic, OpenAI, Meta) via MSW; banco e Redis reais.
- **Setup:** test database isolado por suite (schema reset entre testes via `truncate`).
- **Exemplo:** `tests/integration/traces-api.test.ts`, `tests/integration/ground-truth-crud.test.ts`.

### 3.4 Security
- **Quando:** RLS, autenticação, autorização, sanitização, rate-limit.
- **Mocks:** múltiplos `client_id` e `user_id` em fixtures para validar isolamento.
- **Exemplo:** `tests/security/rls-multi-tenant.test.ts` cria 2 clients e tenta cross-read.

### 3.5 Performance / Load
- **Quando:** garantir budgets de latência e throughput.
- **Ferramenta:** k6 (preferido) ou autocannon.
- **Quando rodar:** semanal em staging + antes de release.
- **Budgets globais (ver § 7).**

### 3.6 E2E
- **Quando:** fluxos críticos de usuário (UI feedback humano, upload de doc + GT match).
- **Ferramenta:** Playwright.
- **Tempo:** <30s por teste, <5min suite.
- **Restrição:** ≤30 testes totais, todos com justificativa documentada.
- **Exemplo:** `tests/e2e/human-review.spec.ts`.

### 3.7 Accessibility
- **Quando:** componentes UI novos.
- **Ferramenta:** `@axe-core/playwright` integrado nos E2E.
- **Critério:** zero violações de severidade `serious` ou `critical`.

### 3.8 Resilience / Chaos
- **Quando:** dependências externas (Anthropic, OpenAI, Redis).
- **Como:** mock que injeta falhas (timeout, 503, latência alta).
- **Exemplo:** `tests/chaos/judge-offline.test.ts`.

### 3.9 Eval suite (qualidade de IA)
- **Quando:** validar que o juiz ou o agente continua produzindo saídas dentro do esperado.
- **Composição:** ~50 casos "golden" + ~10 casos adversariais + ~10 edge cases.
- **Ferramenta:** vitest + Claude (real) + comparação contra baseline.
- **Quando rodar:** PR via CI gate + nightly em staging com sample maior.
- **Critério:** delta de score médio > -5pp falha PR.

---

## 4. Naming e organização

### 4.1 Estrutura de pastas

```
tests/
├── unit/
│   ├── sanitize-pii.test.ts
│   ├── composite-score.test.ts
│   ├── circuit-breaker.test.ts
│   └── ...
├── integration/
│   ├── traces-api.test.ts
│   ├── ground-truth-crud.test.ts
│   ├── lgpd-forget.test.ts
│   └── ...
├── contract/
│   └── judge-output-schema.test.ts
├── security/
│   ├── rls-multi-tenant.test.ts
│   └── pii-audit.test.ts
├── perf/
│   ├── trace-logger-overhead.test.ts
│   └── pgvector-match.test.ts
├── chaos/
│   └── judge-offline.test.ts
├── e2e/
│   └── human-review.spec.ts
├── eval/
│   ├── golden-set.test.ts
│   └── cases/
│       ├── billing-001.json
│       └── ...
├── load/
│   ├── steady-state.k6.js
│   └── burst.k6.js
├── fixtures/
│   ├── traces/
│   ├── ground-truths/
│   └── judge-responses/
├── setup/
│   ├── vitest.setup.ts
│   ├── msw-server.ts
│   └── db-helpers.ts
└── helpers/
    ├── make-trace.ts
    ├── make-evaluation.ts
    └── auth-headers.ts
```

### 4.2 Nomes

- **Arquivo:** `feature-or-module.test.ts` (kebab-case, sufixo `.test.ts` ou `.spec.ts` para E2E).
- **Suite (`describe`):** nome do módulo: `describe('sanitizePII', () => {...})`.
- **Caso (`it`):** descreve comportamento esperado: `it('mascarates CPF in formato XXX.XXX.XXX-XX', () => {...})`.
- **Não usar:** "should", "test that", "works correctly".

### 4.3 Estrutura AAA

Todo teste segue **Arrange / Act / Assert** com linhas em branco separadoras:

```typescript
it('mascarates CPF in formato XXX.XXX.XXX-XX', () => {
  // arrange
  const input = 'meu CPF é 123.456.789-00 ok'

  // act
  const output = sanitizePII(input)

  // assert
  expect(output).toBe('meu CPF é [CPF] ok')
})
```

---

## 5. Mocks, stubs e fixtures

### 5.1 APIs externas (MSW)

**`tests/setup/msw-server.ts`:**

```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const handlers = [
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    const body = await request.json() as any
    // delegar para fixture baseado no system prompt ou conteúdo
    const fixture = pickAnthropicFixture(body)
    return HttpResponse.json(fixture)
  }),
  http.post('https://api.openai.com/v1/embeddings', () =>
    HttpResponse.json({ data: [{ embedding: makeFakeEmbedding() }] })
  ),
  // ... Meta, Groq, etc
]

export const server = setupServer(...handlers)
```

**`vitest.setup.ts`:**

```typescript
import { server } from './msw-server'
import { beforeAll, afterEach, afterAll } from 'vitest'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Regra:** `onUnhandledRequest: 'error'` força explicitar todos os mocks. Não há "passthrough silencioso".

### 5.2 Supabase

**Estratégia:** banco real, isolamento por **schema temporário** ou **truncate seletivo**.

```typescript
// tests/setup/db-helpers.ts
export const resetTestData = async () => {
  const supabase = createServerClient()
  await supabase.rpc('truncate_test_tables', {
    tables: ['message_traces', 'agent_evaluations', 'ground_truth', 'human_feedback']
  })
}

beforeEach(async () => { await resetTestData() })
```

**Migration helper de teste:**
```sql
CREATE OR REPLACE FUNCTION truncate_test_tables(tables TEXT[]) RETURNS VOID AS $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Restrição:** apenas em ambiente `NEXT_PUBLIC_ENV=test` (verificação no início do helper).

### 5.3 Redis

- Para testes de batching (Sprint 1+): usar Redis real com prefixo `test:` em todas as chaves.
- `afterEach`: `redis.del(await redis.keys('test:*'))`.

### 5.4 Time

- Usar `vi.useFakeTimers()` em testes que dependem de `Date.now()`, `setTimeout`, `setInterval`.
- Reset em `afterEach` com `vi.useRealTimers()`.

### 5.5 IDs determinísticos

- Em testes, sobrescrever `crypto.randomUUID` ou usar wrapper `generateId()` mockável.
- Fixtures usam UUIDs fixos (e.g., `'00000000-0000-4000-8000-000000000001'`).

### 5.6 Fixtures versionadas

`tests/fixtures/judge-responses/billing-pass.json`:
```json
{
  "alignment": 9,
  "relevance": 8,
  "finality": 9,
  "safety": 10,
  "verdict": "PASS",
  "rationale": "Resposta correta e completa"
}
```

**Regra:** mudou um schema de output → atualizar todos os fixtures + bump de versão em `tests/fixtures/VERSION`.

---

## 6. Test data management

### 6.1 Builders / factories

`tests/helpers/make-trace.ts`:
```typescript
export const makeTrace = (overrides: Partial<MessageTrace> = {}): MessageTrace => ({
  id: 'trace-001',
  client_id: 'client-001',
  customer_phone: '5511999999999',
  user_message: 'Teste',
  ai_response: 'Resposta',
  retrieval_used: false,
  status: 'completed',
  created_at: new Date('2026-04-01T10:00:00Z').toISOString(),
  ...overrides,
})
```

**Por quê builders?** Mudar um campo obrigatório do schema = mudar 1 linha do builder, não 200 testes.

### 6.2 Multi-tenant fixtures

Sempre 2+ clientes em fixtures de RLS:
```typescript
export const seedTwoClients = async () => {
  await supabase.from('clients').insert([
    { id: 'client-A', name: 'Cliente A' },
    { id: 'client-B', name: 'Cliente B' },
  ])
  await supabase.from('user_profiles').insert([
    { id: 'user-A', client_id: 'client-A', role: 'operator' },
    { id: 'user-B', client_id: 'client-B', role: 'operator' },
  ])
}
```

### 6.3 Eval suite cases

`tests/eval/cases/billing-001.json`:
```json
{
  "id": "billing-001",
  "category": "billing",
  "user_message": "Quanto custa o plano premium?",
  "context_documents": ["doc:planos-precos"],
  "expected_min_score": 7,
  "expected_verdict": "PASS",
  "tags": ["happy-path", "rag-required"]
}
```

**Categorias mínimas:**
- happy-path (30 casos)
- adversarial (10 casos: injection, jailbreak, off-topic)
- edge (10 casos: ambiguidade, multi-intenção, falta de contexto)

---

## 7. Performance budgets (globais)

| Camada | Métrica | Budget | Origem |
|---|---|---|---|
| Trace logger | Overhead p95 vs flow original | <50ms | Sprint 1 |
| Trace persist (DB) | INSERT p95 | <30ms | Sprint 1 |
| GT pgvector match | Query p95 (10k embeddings) | <100ms | Sprint 2 |
| Evaluation engine | Round-trip Anthropic p95 | <8s | Sprint 3 |
| Evaluation lag | sampled→evaluated p95 | <120s | Sprint 3 |
| API `/api/traces` | GET list p95 | <200ms | Sprint 1 |
| UI feedback humano | First contentful paint | <1.5s | Sprint 4 |
| UI list 1000 items | Render + scroll p95 | <200ms | Sprint 4 |
| Pattern detector | Run em 1k FAILs | <10s | Sprint 5 |
| Reprocessing batch | 100 traces | <60s | Sprint 5 |

**Como verificar:** test `tests/perf/*` mede e falha se exceder budget × 1.2 (margem de variação).

---

## 8. CI/CD integration

### 8.1 Pipelines

| Trigger | Pipeline | SLA |
|---|---|---|
| `push` em branch | lint + typecheck + unit | <3 min |
| `pull_request` | + integration + contract + security | <8 min |
| `pull_request` | + eval suite gate | <15 min |
| `pre-merge` | + E2E smoke (5 testes) | <5 min |
| nightly em main | + E2E full + perf + load | <30 min |
| weekly | + chaos + load com escala 2× | <60 min |

### 8.2 Workflow files

`.github/workflows/`:
- `ci.yml` — lint, typecheck, unit, integration, contract, security
- `eval-gate.yml` — eval suite (Sprint 6)
- `e2e.yml` — Playwright nightly
- `perf.yml` — k6 nightly
- `chaos.yml` — chaos weekly

### 8.3 Branch protection

- `main` requer:
  - ✅ ci.yml verde
  - ✅ eval-gate.yml verde
  - ✅ 1 review aprovado
  - ✅ branch atualizada com main

### 8.4 Cache e paralelização

- `node_modules` cache (chave: `package-lock.json`).
- Vitest com `--threads` (4 workers em CI).
- Test database por matrix shard (vitest pool).

---

## 9. Eval suite — filosofia

### 9.1 Diferença vs unit/integration

| Aspecto | Unit/Integration | Eval suite |
|---|---|---|
| Verdict | binário (pass/fail) | gradiente (score 0-10) |
| Determinismo | total | estatístico (LLM tem variância) |
| Falha aceitável | nunca | até 5pp degradação vs baseline |
| Custo | grátis | $$$ (chamadas reais Anthropic) |
| Frequência | toda PR | toda PR (gate) + nightly (full) |

### 9.2 Mitigando flakiness do LLM

- Rodar cada caso **3 vezes** e usar média (mediana se variância >2pp).
- Seed via `temperature=0` no juiz (Anthropic respeita parcialmente).
- Baseline armazenado em `reports/eval/baseline.json`, atualizado a cada merge.
- Threshold de comparação configurável (default -5pp).

### 9.3 Curadoria de casos

- Adicionar caso novo = revisão obrigatória de 2 pessoas (1 dev + 1 PM/domain).
- Caso "controverso" (humanos discordam do score esperado) → mover para `cases/discuss/` até consenso.
- Revisão trimestral de toda a eval suite (alguns casos viram irrelevantes com mudança de produto).

---

## 10. Métricas de qualidade do próprio sistema de testes

Acompanhamos:

| Métrica | Meta | Alerta |
|---|---|---|
| Cobertura geral (lines) | ≥80% | <75% |
| Cobertura branches | ≥75% | <70% |
| Tempo total CI (PR) | <8 min | >12 min |
| Flaky test ratio | <1% | >2% |
| Eval suite custo | <R$ 30/run | >R$ 50 |
| Eval suite tempo | <12 min | >18 min |
| Casos eval cobrindo categorias | 30/10/10 mínimo | <25/8/8 |

---

## 11. Anti-patterns proibidos

❌ **Sleep arbitrário** (`await sleep(2000)`) — usar `waitFor` com timeout explícito.
❌ **Mocks em código de produção** (`if (process.env.NODE_ENV === 'test')`) — usar DI.
❌ **Testes que dependem de ordem** — sempre `beforeEach` reset.
❌ **Snapshot tests gigantes** — usar para dados estruturados pequenos; preferir asserts explícitos.
❌ **Testes sem assertion** — vitest deve falhar pipeline.
❌ **Lógica complexa no teste** (loops com if) — split em casos parametrizados (`it.each`).
❌ **Mock de fs/path/crypto sem necessidade** — afeta legibilidade; só se realmente isolar.
❌ **Comentário "TODO: fix this test"** sem issue linkada.

---

## 12. Onboarding — escrevendo seu primeiro teste

1. Identifique o tipo: unit / integration / etc (§ 3).
2. Escolha a pasta certa (§ 4.1).
3. Use builder existente em `tests/helpers/` ou crie um novo se necessário.
4. Mock APIs externas via MSW (§ 5.1).
5. AAA structure (§ 4.3).
6. Rode local: `npm run test -- path/to/your.test.ts --watch`.
7. Verifique cobertura: `npm run test:coverage -- path/to/your.test.ts`.
8. Commit + PR — CI valida.

---

## 13. Cheat sheet — comandos

```bash
# Executar suite completa
npm run test                       # vitest run all
npm run test:watch                 # vitest watch mode
npm run test:coverage              # com c8

# Por tipo
npm run test:unit
npm run test:integration
npm run test:e2e                   # playwright
npm run test:perf
npm run test:chaos

# Eval
npm run eval                       # roda golden set local
npm run eval:ci -- --threshold=-0.05

# Load
npm run load:steady                # k6 50 RPS 30 min
npm run load:burst                 # k6 burst test

# Debug
npm run test -- --reporter=verbose --no-coverage
npm run test -- -t "nome do teste"  # roda apenas casos com match
```

---

## 14. Referências e leituras recomendadas

- **Test-Driven Development** — Kent Beck (capítulos 1–10)
- **Anthropic — Evaluating LLM Outputs** — guia oficial de eval
- **MSW docs** — https://mswjs.io
- **Vitest docs** — https://vitest.dev
- **Playwright best practices** — https://playwright.dev/docs/best-practices
- **k6 docs** — https://k6.io/docs/
- Caso interno: postmortem da migração `pg → Supabase` (lição: testes de integração contra DB real teriam pego o hang em 30s).

---

## 15. Glossário rápido

- **Golden set** — conjunto curado de casos cuja resposta esperada é estável e revisada manualmente.
- **Adversarial case** — entrada projetada para provocar falha (injection, off-topic, ambiguidade).
- **Baseline** — score médio do último merge na main; usado para comparação de regressão.
- **Flaky** — teste que falha intermitentemente sem mudança de código.
- **MSW** — Mock Service Worker; intercepta HTTP em runtime de teste.
- **κ de Cohen** — coeficiente de concordância entre 2 avaliadores; meta ≥0,6 (juiz vs humano).

---

## 16. Próximos passos

- [ ] Setup inicial: `vitest.config.ts`, `playwright.config.ts`, MSW server, db-helpers, builders básicos (Sprint 0).
- [ ] Implementar testes Sprint 1 (§ 5 do doc da Sprint 1) seguindo este guia.
- [ ] Revisão deste documento após Sprint 3 (juiz introduz eval suite — pode haver ajustes na seção 9).
- [ ] Revisão final pós Sprint 6 (incluir lições do go-live).

---

← Voltar para [`PLANO_SPRINTS_OBSERVABILIDADE_E_FEEDBACK.md`](../PLANO_SPRINTS_OBSERVABILIDADE_E_FEEDBACK.md)
