# Sprint 6 — Hardening, LGPD e Go-Live

**Duração:** 2 semanas (10 dias úteis)
**Pré-requisitos:** Sprints 0–5 concluídas, suite de eval estável, métricas baseline coletadas há ≥7 dias.
**Equipe sugerida:** 1 dev backend (lead), 1 dev DevOps/SRE, 1 PM/QA, 1 Compliance/Jurídico (consultivo).

---

## 1. Objetivo

Endurecer o sistema (rate-limit, idempotência, retries, circuit breaker), garantir conformidade LGPD (TTL, sanitização, direito ao esquecimento), instrumentar observabilidade de produção (métricas, alertas, runbook), travar custos (orçamento + alertas), validar performance sob carga e executar **go-live controlado** com rollout por cliente.

> **DoR:** Todas as 5 sprints anteriores aprovadas em staging por ≥7 dias com tráfego sintético, score humano-vs-juiz com Cohen's κ ≥ 0,6 (Sprint 3) e ≥3 ground-truths promovidas via UI da Sprint 4.

---

## 2. Definition of Done

- [ ] Rate limiting ativo em **todas** as APIs novas (`/api/traces`, `/api/ground-truth`, `/api/evaluations/*`, `/api/quality-patterns/*`).
- [ ] Idempotência garantida em fila de evaluation e fila de reprocessamento (chaves únicas + lock advisory).
- [ ] Retries com backoff exponencial em chamadas Anthropic (3 tentativas, jitter).
- [ ] Circuit breaker em `evaluation-engine` (abre após 10 falhas em 60s, half-open após 30s).
- [ ] **LGPD compliance:**
  - [ ] TTL de 90 dias em `message_traces`, `retrieval_traces`, `agent_evaluations`, `human_feedback` (cron diário).
  - [ ] PII sanitization auditada por Compliance (CPF, cartão, email, telefone, endereço).
  - [ ] Endpoint `DELETE /api/lgpd/forget/[customerPhone]` funcional + auditado.
  - [ ] Política de privacidade do produto atualizada com cláusula de retenção e processamento por LLM externo.
- [ ] Suite de eval (Sprint 3) integrada em CI como gate (PRs que reduzem score médio em >5pp falham).
- [ ] Dashboards Grafana/Supabase Studio publicados:
  - [ ] **Cost dashboard** (gasto Anthropic + OpenAI + Groq por cliente, alertas em 80%/100% do budget).
  - [ ] **Quality dashboard** (verdict distribution, score médio, kappa juiz-vs-humano, improvement-rate).
  - [ ] **Latency dashboard** (trace logger p95, evaluation worker p95, GT match p95).
- [ ] Runbook publicado em `docs/runbooks/observabilidade.md` com 8 cenários (judge offline, embedding offline, fila lotada, custo estourado, RLS leak, etc).
- [ ] Load test passando com 50 RPS sustentados por 30 min sem degradação >10% no flow original.
- [ ] Rollout controlado: feature flags por `client_id`, lista de clientes piloto definida, plano de rollback em <5 min documentado.
- [ ] Postmortem template criado e treinamento da equipe agendado.

---

## 3. Backlog detalhado

### 3.1 Rate limiting e proteção de APIs (2 dias)

**Estratégia:** Upstash Redis ratelimit (ou middleware custom com Redis existente).

**Limites por endpoint (por IP + por user):**

| Endpoint | Limite |
|---|---|
| `POST /api/ground-truth` | 30/min user |
| `PATCH /api/ground-truth/[id]` | 30/min user |
| `POST /api/evaluations/[traceId]/human-feedback` | 60/min user |
| `GET /api/traces` | 120/min user |
| `GET /api/traces/[id]` | 300/min user |
| `POST /api/quality-patterns/[id]/resolve` | 30/min user |
| `DELETE /api/lgpd/forget/[phone]` | 5/min user (rate baixo intencional) |

**Implementação:**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const createRateLimiter = (limit: number, windowSec: number) =>
  new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: true,
  })

export const rateLimiters = {
  groundTruthWrite: createRateLimiter(30, 60),
  humanFeedback: createRateLimiter(60, 60),
  tracesRead: createRateLimiter(120, 60),
  lgpdForget: createRateLimiter(5, 60),
}
```

```typescript
// src/middleware.ts (extender existente)
import { rateLimiters } from '@/lib/rate-limit'

const matchLimiter = (pathname: string, method: string) => {
  if (method === 'POST' && pathname.startsWith('/api/ground-truth')) return rateLimiters.groundTruthWrite
  if (method === 'POST' && pathname.includes('/human-feedback')) return rateLimiters.humanFeedback
  // ...
  return null
}

export async function middleware(req: NextRequest) {
  const limiter = matchLimiter(req.nextUrl.pathname, req.method)
  if (limiter) {
    const id = req.headers.get('x-user-id') ?? req.ip ?? 'anonymous'
    const { success, limit, reset, remaining } = await limiter.limit(id)
    if (!success) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', limit, reset, remaining },
        { status: 429, headers: { 'X-RateLimit-Reset': String(reset) } }
      )
    }
  }
  return NextResponse.next()
}
```

**Decisão:** Usar Upstash REST (compatível com Vercel Edge) em vez do Redis ioredis existente, para evitar acoplamento ao client batch.

### 3.2 Idempotência e locks (1,5 dia)

**Problema:** Se uma trace é enfileirada 2× (network retry), gera 2 evaluations.

**Solução:**
- **Chave de idempotência** em `evaluation_reprocessing_queue.idempotency_key` (UNIQUE).
- Para `runEvaluation`, usar **advisory lock** Postgres por `trace_id`:

```typescript
// src/lib/locks.ts
import { createServerClient } from '@/lib/supabase'

export const withTraceLock = async <T>(traceId: string, fn: () => Promise<T>): Promise<T | null> => {
  const supabase = createServerClient()
  const lockKey = hashToInt(traceId)
  const { data: acquired } = await supabase.rpc('try_advisory_lock', { key: lockKey })
  if (!acquired) return null
  try { return await fn() }
  finally { await supabase.rpc('release_advisory_lock', { key: lockKey }) }
}

const hashToInt = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
```

**Migration:**
```sql
CREATE OR REPLACE FUNCTION try_advisory_lock(key BIGINT) RETURNS BOOLEAN AS $$
  SELECT pg_try_advisory_lock(key);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION release_advisory_lock(key BIGINT) RETURNS BOOLEAN AS $$
  SELECT pg_advisory_unlock(key);
$$ LANGUAGE SQL;
```

### 3.3 Retries e circuit breaker (1,5 dia)

**Wrapper para Anthropic:**

```typescript
// src/lib/resilient-anthropic.ts
import Anthropic from '@anthropic-ai/sdk'
import { CircuitBreaker } from './circuit-breaker'

const breaker = new CircuitBreaker({
  failureThreshold: 10,
  windowMs: 60_000,
  cooldownMs: 30_000,
})

export const callJudgeWithResilience = async (input: JudgeInput): Promise<JudgeOutput> => {
  return breaker.execute(async () => {
    let lastError: Error | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const delay = attempt === 0 ? 0 : Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500
        if (delay > 0) await sleep(delay)
        return await callAnthropic(input)
      } catch (err) {
        lastError = err as Error
        if (!isRetriable(err)) throw err
      }
    }
    throw lastError
  })
}

const isRetriable = (err: unknown): boolean => {
  if (!(err instanceof Anthropic.APIError)) return false
  return [429, 500, 502, 503, 504].includes(err.status ?? 0)
}
```

**Circuit breaker simples:**
```typescript
// src/lib/circuit-breaker.ts
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures: number[] = []
  private openedAt = 0

  constructor(private opts: { failureThreshold: number; windowMs: number; cooldownMs: number }) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.opts.cooldownMs) {
        throw new Error('circuit_open')
      }
      this.state = 'half-open'
    }
    try {
      const result = await fn()
      if (this.state === 'half-open') { this.state = 'closed'; this.failures = [] }
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }

  private recordFailure() {
    const now = Date.now()
    this.failures = this.failures.filter(t => now - t < this.opts.windowMs)
    this.failures.push(now)
    if (this.failures.length >= this.opts.failureThreshold) {
      this.state = 'open'
      this.openedAt = now
    }
  }
}
```

### 3.4 LGPD — TTL e direito ao esquecimento (2 dias)

**Migration `20260601100000_lgpd_ttl.sql`:**

```sql
-- TTL de 90 dias via cron (pg_cron extension)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job de limpeza diário às 03:00 UTC
SELECT cron.schedule(
  'lgpd_purge_old_traces',
  '0 3 * * *',
  $$
    DELETE FROM message_traces WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM agent_evaluations WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM human_feedback WHERE created_at < NOW() - INTERVAL '90 days';
    -- retrieval_traces e ground_truth NÃO são purgados (não contém PII bruta após sanitize)
  $$
);

-- Tabela de auditoria de exclusões LGPD
CREATE TABLE lgpd_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  customer_phone TEXT NOT NULL,
  requested_by UUID REFERENCES user_profiles(id),
  rows_deleted JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lgpd_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all ON lgpd_deletion_log FOR ALL
  USING (auth.role() = 'service_role');
```

**Endpoint `DELETE /api/lgpd/forget/[customerPhone]`:**

```typescript
// src/app/api/lgpd/forget/[customerPhone]/route.ts
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { customerPhone: string } }) {
  const { customerPhone } = params
  const supabase = createServerClient()
  const userId = req.headers.get('x-user-id')
  const clientId = req.headers.get('x-client-id')
  if (!userId || !clientId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const phone = customerPhone.replace(/\D/g, '')
  if (phone.length < 10) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })

  const counts: Record<string, number> = {}
  for (const table of ['message_traces', 'agent_evaluations', 'human_feedback']) {
    const { count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('client_id', clientId)
      .eq('customer_phone', phone)
    counts[table] = count ?? 0
  }

  await supabase.from('lgpd_deletion_log').insert({
    client_id: clientId,
    customer_phone: phone,
    requested_by: userId,
    rows_deleted: counts,
  })

  return NextResponse.json({ deleted: counts })
}
```

**Auditoria de PII sanitization:**
- Reaplicar `sanitizePII` em **amostra** de 100 traces aleatórias.
- Compliance valida: nenhum CPF, cartão, email visível.
- Documentar regex usadas em `docs/lgpd/sanitization-rules.md`.

### 3.5 Eval suite como CI gate (1 dia)

**Workflow `.github/workflows/eval-gate.yml`:**

```yaml
name: Eval Suite Gate
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Run eval suite (golden set)
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_CI }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_CI }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_TEST }}
        run: npm run eval:ci -- --baseline=main --threshold=-0.05
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with: { name: eval-report, path: reports/eval/ }
```

**Script `npm run eval:ci`:**
- Roda 50 casos do "golden set" (selecionados em S3).
- Compara score médio com baseline (último merge na main).
- Falha se delta < `-threshold` (default -5pp).
- Publica diff JSON e markdown como artefato.

### 3.6 Observabilidade de produção (2 dias)

**Métricas chave (Supabase + custom):**

| Métrica | Fonte | Alerta |
|---|---|---|
| `traces_per_minute` | `count(*) from message_traces where created_at > now() - 1m` | >2× baseline = warn |
| `evaluation_lag_p95` | `evaluated_at - sampled_at` em `agent_evaluations` | >120s = warn, >300s = crit |
| `judge_failure_rate` | erros / total chamadas Sonnet | >5% em 5 min = warn |
| `cost_burn_rate_brl` | `sum(cost_brl) / hour` por cliente | >budget_hourly * 1.5 = warn |
| `gt_pgvector_p95` | duration de `match_ground_truth` | >100ms = warn |
| `verdict_pass_rate` | `pass / total` em janela 1h | <60% = warn (qualidade caindo) |

**Implementação:**
- View materializada `vw_observability_realtime` refresh a cada 1 min.
- Endpoints `GET /api/metrics/[name]` para Grafana scraping.
- Alertas via Slack webhook + email para `oncall@uzzapp`.

### 3.7 Runbook (1 dia)

`docs/runbooks/observabilidade.md` com 8 cenários:

1. **Judge LLM offline** → circuit breaker abre → traces continuam → eval retomada quando volta. Verificar dashboard Anthropic status.
2. **Embedding (OpenAI) offline** → trace-logger marca `embedding_failed=true` → fallback para texto exato em GT match → reprocessar quando voltar.
3. **Fila de reprocessamento lotada (>10k)** → pausar trigger de GT update → drenar manualmente em batches via `processReprocessingBatch`.
4. **Custo estourado para cliente** → `client_budgets.exhausted=true` → flow rejeita novas mensagens com erro educado → notificar comercial.
5. **RLS leak suspeito** → script de auditoria cross-tenant; revogar policies se confirmado; postmortem obrigatório.
6. **Score médio caindo >10pp em 24h** → abrir incidente; investigar prompt drift, mudança no modelo, novo cliente com domínio incompatível.
7. **Latência do flow original >2× baseline** → suspeitar do trace-logger; verificar se setImmediate está realmente fire-and-forget; rollback do flag.
8. **Pattern detector gerando ruído (>20 patterns/dia)** → ajustar `min_cluster_size` para cima; revisar threshold de cosine.

### 3.8 Cost guardrails (1 dia)

- **Budget por cliente** já existe em `client_budgets` (Sprint 0/CLAUDE.md). Estender com `monthly_budget_brl` e `daily_budget_brl`.
- **Trigger preventivo:** ao atingir 80% do diário, judge sampling cai de 20% → 5%; ao atingir 100%, pausa eval (mensagens continuam).
- **Alerta Slack** em 50%, 80%, 100% (idempotente via `client_budget_alerts_sent`).

```sql
-- Migration
ALTER TABLE client_budgets ADD COLUMN daily_budget_brl NUMERIC(10,2);
ALTER TABLE client_budgets ADD COLUMN current_daily_brl NUMERIC(10,2) DEFAULT 0;
ALTER TABLE client_budgets ADD COLUMN daily_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day');

CREATE TABLE client_budget_alerts_sent (
  client_id UUID NOT NULL REFERENCES clients(id),
  threshold_pct INT NOT NULL,
  period_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (client_id, threshold_pct, period_date)
);
```

### 3.9 Load testing (1 dia)

**Cenário 1 — Steady state:**
- 50 RPS no `/api/webhook/[clientId]` por 30 min, com sampling 20%.
- Esperado: p95 do flow original sem degradação >10%, p95 do eval-worker <120s, sem perda de mensagens.

**Cenário 2 — Burst:**
- 200 RPS por 60s, depois cair para 30 RPS.
- Esperado: rate-limit não dispara em webhook, fila absorve e drena em <5 min.

**Cenário 3 — Judge offline:**
- Bloquear `api.anthropic.com` via `iptables` no runner.
- Esperado: circuit breaker abre em <60s, sem impacto no fluxo principal, alertas disparados.

**Ferramentas:** k6 (preferido) ou autocannon. Scripts em `tests/load/*.js`.

### 3.10 Rollout controlado (1 dia)

**Feature flags por cliente** (`clients.feature_flags JSONB`):

```json
{
  "observability_enabled": true,
  "evaluation_enabled": true,
  "rag_insights_enabled": false
}
```

**Plano de rollout:**

| Semana | Clientes ativos | Critério para próxima fase |
|---|---|---|
| 1 | 1 cliente piloto interno (uzzapp-dogfood) | Sem incidentes 5 dias |
| 2 | +3 clientes amigos (cobertura grátis) | Score médio ≥ 7,0; sem queda no flow |
| 3 | +10 clientes pagos (opt-in) | Cost burn dentro do budget; CSAT ≥ 4 |
| 4 | Geral disponível (opt-out) | — |

**Plano de rollback (<5 min):**
1. `UPDATE clients SET feature_flags = jsonb_set(feature_flags, '{observability_enabled}', 'false')`
2. Nodes verificam flag antes de chamar trace-logger e evaluation-worker.
3. Sem necessidade de redeploy.

### 3.11 Postmortem template e treinamento (0,5 dia)

Template em `docs/postmortems/TEMPLATE.md`:
- Resumo (2 linhas)
- Timeline (UTC)
- Impacto (clientes, mensagens, custo)
- Causa raiz (5 whys)
- O que correu bem / mal
- Action items (com owner e prazo)

Treinamento de 1h com toda equipe: como ler dashboards, runbook walkthrough, simulação de 1 cenário (judge offline).

---

## 4. Checklist por dia

### Semana 1

- **Dia 1** — Rate limiting (Upstash setup, middleware, 7 endpoints).
- **Dia 2** — Rate limiting (testes, ajuste de limites, métricas) + início idempotência (advisory locks).
- **Dia 3** — Idempotência (chaves únicas, locks) + retries Anthropic (wrapper).
- **Dia 4** — Circuit breaker (impl + testes) + revisão de testes de resiliência da Sprint 3.
- **Dia 5** — LGPD migration (TTL, deletion_log) + endpoint `forget` + testes.

### Semana 2

- **Dia 6** — Auditoria PII com Compliance + atualização da política de privacidade + LGPD docs.
- **Dia 7** — Eval CI gate (workflow, script, baseline) + cost guardrails (budget triggers).
- **Dia 8** — Observabilidade (views, métricas, dashboards Grafana ou Supabase Studio).
- **Dia 9** — Load testing (3 cenários, ajustes) + runbook (8 cenários).
- **Dia 10** — Rollout controlado (feature flags, lista piloto, rollback drill) + postmortem template + treinamento + go/no-go meeting.

---

## 5. Bateria de testes — Sprint 6 (rigorosa)

### 5.1 Unit — Rate limiter

`tests/unit/rate-limit.test.ts`:
- Permite N requests dentro da janela.
- Bloqueia request N+1 com 429.
- Reset funciona após janela.
- Identidade composta (user+IP) isola corretamente.

### 5.2 Unit — Circuit breaker

`tests/unit/circuit-breaker.test.ts`:
- State machine: `closed → open` após N falhas.
- `open → half-open` após cooldown.
- `half-open → closed` em sucesso, `→ open` em falha.
- Janela deslizante: falhas antigas expiram.

### 5.3 Unit — Resilient Anthropic wrapper

`tests/unit/resilient-anthropic.test.ts`:
- Retries em 429/5xx (3 tentativas) com backoff jitterizado.
- NÃO retry em 4xx (exceto 429).
- Propaga erro após 3 falhas.
- Circuit breaker integration: rejeita imediato quando aberto.

### 5.4 Integration — Idempotência

`tests/integration/idempotency.test.ts`:
- Enfileirar mesma trace 2× cria 1 registro (UNIQUE).
- `withTraceLock` impede execução concorrente.
- Lock liberado em caso de exception (try/finally).

### 5.5 Integration — LGPD forget

`tests/integration/lgpd-forget.test.ts`:
- DELETE remove registros de `message_traces`, `agent_evaluations`, `human_feedback` para o telefone.
- NÃO remove de outros clientes (RLS implicit via `client_id`).
- Cria registro em `lgpd_deletion_log` com counts corretos.
- Retorna 401 sem auth, 400 para telefone inválido.

### 5.6 Integration — TTL cron

`tests/integration/lgpd-ttl.test.ts`:
- Inserir 5 traces com `created_at = NOW() - 91 days` e 5 com `now()`.
- Executar `DELETE FROM message_traces WHERE created_at < NOW() - INTERVAL '90 days'` manualmente.
- Verificar que apenas as antigas foram deletadas.
- Verificar que `pg_cron.job` está agendado.

### 5.7 Security — PII audit

`tests/security/pii-audit.test.ts`:
- Sample 100 traces aleatórias do banco de staging.
- Aplicar regexes de CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}` e `\d{11}`), cartão (Luhn check), email, telefone.
- Asseverar 0 matches em campos sanitizados.
- Compliance assina off via PR review obrigatório.

### 5.8 Performance — Load test 50 RPS

`tests/load/steady-state.k6.js`:
- 50 RPS por 30 min em `/api/webhook/[clientId]`.
- Métricas: p50, p95, p99 do flow + eval lag + erro rate.
- Critérios: p95 flow ≤ baseline × 1.10, eval lag p95 < 120s, erro rate < 0.5%.

### 5.9 Performance — Burst test

`tests/load/burst.k6.js`:
- 200 RPS por 60s, depois 30 RPS por 5 min.
- Esperado: webhook responde 200 em ≥99% (rate-limit não dispara), fila de eval drena em <5 min.

### 5.10 Resiliência — Judge offline (chaos)

`tests/chaos/judge-offline.test.ts`:
- Mock Anthropic SDK para lançar `503` em todas as chamadas.
- Disparar 100 traces.
- Asseverar: flow original responde 100% das mensagens, circuit breaker abre, métrica `judge_failure_rate` > 80%.
- Restaurar mock; asseverar circuit fecha em half-open após 30s.

### 5.11 Eval suite gate (CI)

`tests/eval/golden-set.test.ts`:
- Roda 50 casos definidos em `tests/eval/cases/*.json`.
- Compara score médio com baseline armazenado em `reports/eval/baseline.json`.
- Falha se delta < -0.05 (5pp).
- Gera relatório markdown em `reports/eval/run-{sha}.md`.

### 5.12 Observabilidade — Métricas e alertas

`tests/integration/metrics.test.ts`:
- Inserir dados sintéticos em `agent_evaluations` que disparam thresholds.
- Verificar que view `vw_observability_realtime` retorna valores esperados.
- Mockear webhook Slack e asseverar payload do alerta.

### 5.13 Manual — Drill de rollback

Procedimento documentado:
1. Habilitar feature flag em cliente piloto.
2. Disparar 10 mensagens reais.
3. Executar comando de rollback (`UPDATE clients SET feature_flags...`).
4. Cronometrar tempo até trace-logger parar de gravar (target <5 min).
5. Verificar fluxo original 100% funcional pós-rollback.

### 5.14 Manual — Tabletop exercise (cenário runbook)

Equipe simula incidente "judge offline por 30 min" usando runbook:
- SRE detecta alerta.
- Segue runbook passo a passo.
- Mede tempo até comunicar status aos clientes piloto.
- Identifica gaps no runbook e atualiza.

---

## 6. Critérios de aceite

- ✅ Todas as APIs novas com rate-limit testado.
- ✅ Idempotência: 0 evaluations duplicadas em load test.
- ✅ Resiliência: judge offline = 0 mensagens perdidas, circuit fecha em <60s após retorno.
- ✅ LGPD: PII audit assinada por Compliance, política publicada, endpoint `forget` testado, TTL operacional.
- ✅ CI eval gate: bloqueia PR de regressão simulada (>-5pp).
- ✅ Cost: alertas em 50/80/100% testados; sampling cai automaticamente em 80%.
- ✅ Observabilidade: 3 dashboards publicados, 6 métricas críticas com alertas.
- ✅ Load: 50 RPS sustentado sem degradação; burst absorvido.
- ✅ Runbook: 8 cenários documentados, 1 testado em tabletop.
- ✅ Rollout: cliente piloto rodando 5 dias sem incidentes; rollback drill < 5 min.
- ✅ Treinamento concluído com toda equipe.

---

## 7. Riscos e mitigações

| ID | Risco | Mitigação |
|---|---|---|
| R6-1 | Rate-limit muito agressivo bloqueia uso legítimo | Coletar p99 de uso por endpoint na semana de staging; setar limite em 3× p99 |
| R6-2 | Advisory lock cria contenção | Hash do trace_id distribui; monitorar `pg_locks`; ajustar se >50ms p95 |
| R6-3 | Circuit breaker abre por flapping | Janela 60s + threshold 10 evita oscilação; ajustar empiricamente |
| R6-4 | TTL deleta dados ainda úteis para análise | Backup S3 mensal antes do purge; janela 90d acordada com produto |
| R6-5 | LGPD endpoint usado abusivamente (DoS de exclusões) | Rate-limit 5/min + audit log + revisão semanal de logs |
| R6-6 | CI eval gate gera flakiness | Rodar 3× e usar média; threshold conservador (-5pp); seed fixo |
| R6-7 | Custo extrapola mesmo com guardrails | Hard kill switch global por env var `OBS_KILL_SWITCH=true` |
| R6-8 | Rollout piloto encontra bug crítico | Plano de rollback <5 min testado; comunicação proativa ao cliente |
| R6-9 | Equipe não internaliza runbook | Tabletop obrigatório; rotação de oncall com mentor |
| R6-10 | Métricas falsas (view materializada stale) | Refresh a cada 1 min + alerta se idade da view >5 min |

---

## 8. Métricas de sucesso pós-go-live (30 dias)

- **Cobertura:** ≥80% das mensagens dos clientes piloto têm trace.
- **Eval coverage:** 20% das traces (sampling target) com evaluation persistida.
- **Custo:** Anthropic ≤ R$ X/mês por cliente piloto (definir em S0).
- **Qualidade:** improvement-rate semanal positivo em ≥2 das primeiras 4 semanas.
- **Operação:** 0 incidentes Sev1; ≤2 Sev2; MTTR Sev2 < 30 min.
- **Adoção interna:** ≥3 ground-truths/dia promovidas via UI; ≥5 patterns resolvidos/semana.

---

## 9. Saída e handoff

**Artefatos finais:**
- Código mergeado em `main` com feature flags por cliente.
- Migrations aplicadas em produção.
- Dashboards publicados e linkados em `docs/runbooks/observabilidade.md`.
- Política de privacidade atualizada e publicada.
- Runbook + postmortem template + treinamento gravado.
- Relatório de go-live com métricas baseline (semana 0) e plano de revisão mensal.

**Handoff para CS/Suporte:**
- Treinamento de 30 min sobre como acessar UI de feedback humano.
- FAQ sobre LGPD para responder a clientes.
- Canal Slack `#obs-uzzapp` para dúvidas.

---

## 10. Próximo

Após Sprint 6, entrar em **modo manutenção + iteração contínua:**
- Revisão mensal de métricas e patterns.
- Backlog de melhorias priorizado por impact em improvement-rate.
- Considerar Sprint 7 (futura): auto-promoção de GT por consenso humano (3+ feedbacks coincidentes), análise de drift de prompt, retraining periódico do juiz com human feedback.

→ Ver `QA-STRATEGY.md` para visão transversal de testes em todas as sprints.
