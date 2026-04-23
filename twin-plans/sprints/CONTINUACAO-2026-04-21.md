# Documento de Continuação — 2026-04-21

> **Gerado em:** 2026-04-21 com base na análise do estado real do código vs plano de sprints.
> **Progresso declarado:** 49,3% (105/213 itens)
> **Próximo passo imediato:** seção 3 deste documento.

---

## 0. Atualizacao 2026-04-23 (checks)

### Concluido desde a versao original
- [x] Fase A2 concluida: paginas de traces + detalhe + custo diario no dashboard.
- [x] Fase B1/B2 concluida: vitest/msw/playwright instalados e baseline de testes ativo.
- [x] CI atualizado e funcional para os testes atuais.
- [x] Mitigacao de anexos em producao (commit b7322da):
  - gate de intencao explicita para buscar_documento
  - cooldown anti-duplicidade de anexo
  - stage-gate para evitar anexo comercial precoce
  - telemetria de decisao de gate em trace/tool-call
- [x] Testes unitarios da mitigacao adicionados e passando.

### Pendente para fechamento operacional (A1)
- [ ] Validacao real de 20 conversas com captura cadastral (meta >= 95%).
- [ ] Validacao real de traces/retrieval/tool_calls em WhatsApp.
- [ ] Bootstrap do cliente piloto com >=30 entradas em ground truth.
- [ ] Confirmar agent_evaluations com volume real (>=100) para liberar S5.
- [ ] Dogfooding S4 com revisao de FAILs e promocoes para ground truth.

### Estado atual do plano
- [x] Nao iniciar S5 sem pre-requisitos.
- [ ] S5 (RAG Insights) ainda nao iniciado.
- [ ] S6 (Hardening Go-Live) ainda nao iniciado.

---
## 1. Diagnóstico: O que realmente existe

### ✅ Código implementado e confirmado no repositório

| Artefato | Localização | Sprint |
|----------|------------|--------|
| Migrations S1–S4 | `supabase/migrations/20260422..., 20260429..., 20260506..., 20260513...` | S1–S4 |
| `trace-logger.ts` | `src/lib/trace-logger.ts` | S1 |
| `ground-truth-matcher.ts` | `src/lib/ground-truth-matcher.ts` | S2 |
| `evaluation-engine.ts` | `src/lib/evaluation-engine.ts` | S3 |
| `evaluation-worker.ts` | `src/lib/evaluation-worker.ts` | S3 |
| `extractContactDataFallback.ts` | `src/nodes/extractContactDataFallback.ts` | S1 |
| APIs `/api/traces/*` | `src/app/api/traces/` (3 rotas) | S1 |
| APIs `/api/ground-truth/*` | `src/app/api/ground-truth/` (4 rotas) | S2 |
| APIs `/api/evaluations/*` | `src/app/api/evaluations/` (5 rotas) | S3 |
| Componentes quality UI | `src/components/quality/` (10 componentes) | S3/S4 |
| Páginas quality dashboard | `/dashboard/quality/evaluations`, `/dashboard/quality/ground-truth` | S3/S4 |
| RPC `submit_human_feedback_atomic` | `supabase/migrations/20260513123000...` | S4 |

### ❌ Itens planejados mas AUSENTES no código

| Artefato | Sprint | Impacto |
|----------|--------|---------|
| `vitest.config.ts` | S0 | CRÍTICO — todos os testes do DoD estão bloqueados |
| Diretório `tests/` | S0 | CRÍTICO — zero testes unitários/integração |
| `msw`, `playwright` instalados | S0 | ALTO — sem mocks controlados, sem E2E |
| CI GitHub Actions (`test.yml`) | S0 | ALTO — sem gate automatizado em PRs |
| `/dashboard/quality/traces/page.tsx` | S1 | MÉDIO — visualização de traces ausente |
| `/dashboard/quality/traces/[id]/page.tsx` | S1 | MÉDIO — detalhe de trace ausente |
| `CostTodayBadge.tsx` | S1 | BAIXO — widget de custo no dashboard |
| S5 inteiro (RAG Insights) | S5 | ALTO — 30 itens = 0% |
| S6 inteiro (Hardening Go-Live) | S6 | CRÍTICO para produção — 11 itens = 0% |

---

## 2. Desvios do plano detectados

### DEV-001 — Juiz automático usa `callDirectAI`, não Anthropic SDK
**Plano original (S3):** usar Claude 3.5 Sonnet via `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`.
**Implementado:** `evaluation-engine.ts` usa `callDirectAI()` com `EVALUATION_JUDGE_PROVIDER` (default: `openai`) e `EVALUATION_JUDGE_MODEL` (default: `gpt-4o-mini`).

**Avaliação:** ✅ Decisão melhor que o plano. Elimina `ANTHROPIC_API_KEY` desnecessária, usa vault por cliente, mantém consistência. **Documentar como ADR-012 e atualizar S3.**

### DEV-002 — Tooling de testes: jest no lugar de vitest
**Plano original (S0):** instalar `vitest`, `msw`, `playwright`.
**Estado atual:** `package.json` tem `"test": "jest"` mas **nenhum arquivo de configuração jest existe** e nenhum teste foi criado. O projeto efetivamente não tem infraestrutura de testes.

**Avaliação:** ⚠️ Não é desvio intencional — é dívida técnica. Precisa ser resolvido antes de S5.

### DEV-003 — `ANTHROPIC_API_KEY` nunca foi necessária
Por consequência do DEV-001, a variável `ANTHROPIC_API_KEY` que estava marcada como pendente em S0 não é mais necessária. Limpar da lista de pendências.

### DEV-004 — Página `/dashboard/quality/traces` não criada
**Plano S1:** criar lista e detalhe de traces no dashboard.
**Estado:** as páginas de `evaluations` foram criadas, mas traces têm apenas API. O operador não tem UI para ver os traces brutos.

---

## 3. Sequência de execução para zerar os 108 itens

> **Princípio:** fechar pendências operacionais de S1–S4 primeiro (validações reais), depois tooling, depois S5, depois S6. Não iniciar S5 sem testes passando.

### Fase A — Fechamento operacional S1–S4 (estimativa: 3–5 dias)

#### A1 — Validação com tráfego real (S1, S2, S3, S4)
Estes itens só podem ser fechados com dados reais. Executar na ordem:

1. **S1 — 20 conversas reais com dados cadastrais**
   - Enviar 20 mensagens com email + CPF + endereço para o número de teste
   - Verificar em `clientes_whatsapp.metadata` se todos os campos aparecem
   - Meta: ≥19/20 (95%)
   - Se falhar: ajustar heurística em `extractContactDataFallback.ts`

2. **S1 — 5 mensagens de WhatsApp para validar traces**
   - Confirmar que `message_traces` gera registro com timestamps coerentes
   - Confirmar que `retrieval_traces` aparece quando RAG é usado
   - Confirmar que `tool_call_traces` registra tools chamadas

3. **S2 — Bootstrap do cliente piloto (≥30 entradas Ground Truth)**
   - Acessar `/dashboard/quality/ground-truth`
   - Criar manualmente 30 entradas nas categorias: planos, horários, inscrição, pagamento, cancelamento
   - Validar acurácia do matcher: testar 30 perguntas similares → meta ≥26/30 (87%)

4. **S3 — Validar que evaluations estão sendo geradas**
   - Confirmar que `agent_evaluations` tem registros após tráfego real
   - Verificar custo médio por avaliação (meta: < $0.02)
   - Verificar latência p95 (meta: < 5s)
   - Confirmar sampling 20% funcionando

5. **S4 — Dogfooding operador: revisar 5 FAILs**
   - Acessar `/dashboard/quality/evaluations`
   - Filtrar por verdict `FAIL`
   - Revisar 5 avaliações, usar feedback (correto/incorreto/parcial)
   - Confirmar que atalhos J/K/1/2/3 funcionam
   - Promover 3 correções para Ground Truth

#### A2 — Páginas de traces ausentes (S1 pendente)
Criar as páginas que faltam:
- `src/app/dashboard/quality/traces/page.tsx` — lista paginada de `message_traces`
- `src/app/dashboard/quality/traces/[id]/page.tsx` — detalhe com retrieval + tool_calls
- `src/components/quality/CostTodayBadge.tsx` — soma `cost_usd` do dia

### Fase B — Infraestrutura de testes (S0 dívida técnica, pré-requisito S5)

> ⚠️ S5 tem como DoD: "cobertura ≥ 80% nos novos módulos". S6 exige "suite de eval integrada em CI como gate". Sem vitest, S5 e S6 não podem ser validados.

#### B1 — Instalar tooling
```bash
npm install -D vitest @vitest/coverage-v8 @vitest/ui
npm install -D msw
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Verificar: o projeto usa `jest` no `package.json` mas sem configuração. **Substituir por vitest** (mais rápido, sem config extra, compatível com ESM do Next.js).

Atualizar `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

Criar `vitest.config.ts` e `tests/setup.ts` conforme spec em `00-sprint-zero-prep.md` §3.5.

#### B2 — Criar testes prioritários (o mínimo para desbloquear S5)
Prioridade de cobertura (por risco, não por completude):

1. `tests/unit/trace-logger.test.ts` — `sanitizePII` + latências (spec: S1 §5.1)
2. `tests/unit/ground-truth-matcher.test.ts` — threshold + isolamento (spec: S2 §5.1)
3. `tests/unit/evaluation-engine.test.ts` — schema zod + composite score (spec: S3 §5.1)
4. `tests/unit/evaluation-worker.test.ts` — sampling 20% + idempotência (spec: S3 §5.2)
5. `tests/integration/traces-api.test.ts` — auth + client_id filter (spec: S1 §5.2)
6. `tests/integration/ground-truth-api.test.ts` — CRUD + imutabilidade (spec: S2 §5.2–5.3)

**Não** criar agora: testes E2E Playwright (fica para S6), testes de carga, testes RLS com tokens reais.

#### B3 — CI mínimo
Criar `.github/workflows/test.yml` conforme spec em `00-sprint-zero-prep.md` §3.6.
Gate em PRs: `npm run test:coverage` + `npx tsc --noEmit`.

### Fase C — Sprint 5: RAG Insights (estimativa: 5–7 dias)

**Pré-requisitos obrigatórios antes de iniciar:**
- [ ] A1 concluído (dados reais validados)
- [x] B1+B2 concluídos (vitest rodando com ≥6 testes)
- [ ] `agent_evaluations` tem ≥100 registros reais

**Sequência interna de S5:**

1. **Banco:** migration `20260520120000_quality_insights.sql`
   - `evaluation_reprocessing_queue`
   - `quality_patterns`
   - Coluna `metadata` em `documents` (se não existir)

2. **Structure-aware chunker**
   - Modificar `src/lib/document-chunker.ts` (ou equivalente)
   - Parâmetro `strategy: 'structure-aware' | 'fixed-size'` via `bot_configurations`
   - Fallback automático para fixed-size se nenhum header markdown detectado

3. **Pattern detector**
   - `src/lib/quality-pattern-detector.ts`
   - Query: 3+ evaluations FAIL com `user_message` similar (cosine > 0.85) nos últimos 7 dias
   - Persiste em `quality_patterns`
   - Expor via `GET /api/quality-patterns`

4. **Re-avaliação automática**
   - `src/lib/gt-reeval-trigger.ts`
   - Trigger: quando GT é atualizado (PATCH `/api/ground-truth/[id]`), busca 30 traces similares
   - Enfileira em `evaluation_reprocessing_queue`
   - Worker consome fila: `src/lib/reeval-worker.ts`

5. **Chunk marking**
   - `PATCH /api/knowledge/chunks/[id]/mark-irrelevant`
   - Persiste `metadata.is_irrelevant = true` em `documents`
   - UI: botão no painel de detalhe de trace (S4 já mostra chunks)

6. **Métricas improvement_rate**
   - `GET /api/evaluations/stats?period=weekly` — retorna score médio por semana
   - Widget no dashboard de qualidade

### Fase D — Sprint 6: Hardening Go-Live (estimativa: 7–10 dias)

**Pré-requisitos obrigatórios:**
- [ ] S5 concluído
- [ ] ≥7 dias de tráfego real com traces + evaluations
- [ ] Cohen's kappa juiz vs humano calculado (meta ≥ 0.6)
- [ ] ≥3 ground-truths promovidas via UI (S4)

**Sequência interna de S6 (da spec `06-hardening-go-live.md`):**

1. Rate limiting em todas as APIs novas (Upstash Redis / middleware)
2. Idempotência na fila de evaluations (lock advisory PostgreSQL)
3. Retries com backoff exponencial nas chamadas ao juiz AI
4. Circuit breaker em `evaluation-engine`
5. LGPD: TTL 90 dias + endpoint `DELETE /api/lgpd/forget/[phone]`
6. PII sanitization: auditar CPF, cartão, email, telefone, endereço
7. Suite de eval como gate em CI (PRs que caem >5pp no score falham)
8. Dashboards: cost, quality, latency
9. Runbook `docs/runbooks/observabilidade.md` (8 cenários)
10. Load test: 50 RPS por 30 min sem degradação >10%
11. Rollout por `client_id` com feature flags + plano de rollback

---

## 4. Problemas que precisam de decisão antes de avançar

### DECISÃO-001 — jest vs vitest
O `package.json` tem `"test": "jest"` sem configuração. Os planos especificam vitest.
**Recomendação:** substituir por vitest (elimina config extra, compatível com Next.js ESM).
**Risco:** nenhum — não há testes jest existentes para migrar.
**Ação:** Pedro decide e executa fase B.

### DECISÃO-002 — ADR-012: juiz usa callDirectAI
O plano S3 especificava Anthropic como juiz. A implementação usa `callDirectAI` com OpenAI.
**Recomendação:** formalizar como ADR-012 em `00-stack-e-arquitetura.md`.
Implicação: `ANTHROPIC_API_KEY` pode ser removida das pendências de S0.

### DECISÃO-003 — Cliente piloto para bootstrap do Ground Truth
O DoD de S2 exige ≥30 entradas no cliente piloto (Yoga Escola ou equivalente).
Precisa de confirmação: **qual client_id usar para o bootstrap manual?**

### DECISÃO-004 — Sampling em produção
O sampling default (20%) precisa ser confirmado em `bot_configurations` para o cliente piloto.
Verificar se a linha `key='quality:sampling_rate', value='0.20'` existe na tabela.

---

## 5. Riscos atuais (2026-04-21)

| # | Risco | Severidade | Mitigação |
|---|-------|-----------|----------|
| R1 | Zero testes automatizados — qualquer refactor pode quebrar silenciosamente | ALTO | Fase B antes de qualquer feature nova |
| R2 | Traces existem mas nunca foram validados com tráfego real | ALTO | Fase A1 imediata |
| R3 | S5 e S6 dependem de base de avaliações real — sem dados, não tem como calibrar | ALTO | Não iniciar S5 sem ≥100 registros em `agent_evaluations` |
| R4 | `evaluation-engine` pode estar falhando silenciosamente em prod (FIX-004 corrigiu supressão de erros, mas não validado) | MÉDIO | Validar em S3 Fase A (item 4) |
| R5 | S6 exige Cohen's kappa ≥ 0.6 mas S4 ainda não tem operadores revisando em produção | MÉDIO | Iniciar dogfooding S4 imediatamente |
| R6 | TTL e LGPD (S6) podem exigir consultoria jurídica — lead time longo | MÉDIO | Disparar contato jurídico enquanto S5 roda |

---

## 6. Checklist de próximos passos imediatos (para esta sessão ou próxima)

### Agora (decisões rápidas, <1h)
- [ ] Confirmar DEV-001: aprovar uso de `callDirectAI` como juiz (formalizar ADR-012)
- [ ] Confirmar DECISÃO-001: confirmar que jest será substituído por vitest
- [ ] Identificar qual `client_id` usar como piloto para bootstrap S2

### Esta semana (Fase A — validação real)
- [ ] Enviar 5 mensagens WhatsApp e confirmar traces em `message_traces`
- [ ] Enviar 20 mensagens com dados cadastrais e medir taxa de captura
- [ ] Criar 30 entradas de Ground Truth no cliente piloto
- [ ] Acessar `/dashboard/quality/evaluations` e revisar 5 FAILs como operador
- [ ] Verificar se `quality:sampling_rate = 0.20` está em `bot_configurations`

### Esta semana (Fase A2 — frontend S1)
- [x] Criar `src/app/dashboard/quality/traces/page.tsx`
- [x] Criar `src/app/dashboard/quality/traces/[id]/page.tsx`
- [x] Criar `src/components/quality/CostTodayBadge.tsx`

### Próxima semana (Fase B — tooling)
- [x] Instalar vitest + msw + playwright
- [x] Criar `vitest.config.ts`
- [x] Criar `tests/setup.ts` + `tests/mocks/server.ts`
- [x] Criar os 6 testes prioritários (Fase B2)
- [x] Criar/atualizar CI `.github/workflows/ci.yml`

### Após Fase B (Fase C — S5)
- [ ] Iniciar Sprint 5 somente após B1+B2+A1 concluídos

---

## 7. Instruções para próximo agente

Se você está retomando este plano, siga estas prioridades:

1. **Leia este documento primeiro** — ele reflete o estado de 2026-04-21.
2. **Verifique o estado atual** com `git log --oneline -10` e `ls src/app/dashboard/quality/`.
3. **Não implemente S5 ainda** — há pré-requisitos de Fase A e B não cumpridos.
4. **A maior lacuna técnica** é o tooling de testes (vitest não instalado, `tests/` não existe).
5. **A maior lacuna operacional** é a ausência de dados reais validados (traces, evaluations, ground-truth entries).
6. **Para criar páginas de traces** (Fase A2), seguir o padrão das páginas em `src/app/dashboard/quality/evaluations/` — mesma estrutura, dados de `message_traces` + `retrieval_traces` + `tool_call_traces`.
7. **Para testes** (Fase B), seguir as specs em:
   - S1 §5.1 para `trace-logger.test.ts`
   - S2 §5.1 para `ground-truth-matcher.test.ts`
   - S3 §5.1–5.2 para `evaluation-engine.test.ts` e `evaluation-worker.test.ts`

---

*Documento gerado em 2026-04-21 por análise de: git status, glob de src/, migrations aplicadas, package.json e arquivos de sprint.*




## Atualizacao 2026-04-23 - Ajuste de captura cadastral (execucao)

Contexto medido em producao:
- `contatos_no_periodo=19`
- `com_email=3`, `com_cpf=4`, `com_objetivo=8`
- `com_experiencia=0`, `com_periodo_ou_dia=0`

Plano executado:
- [x] Expandir schema da tool `registrar_dado_cadastral` para aceitar:
  - `experiencia`, `experiencia_yoga`, `periodo_preferido`, `dia_preferido`
- [x] Atualizar `updateContactMetadata` com aliases:
  - `experiencia_previa`, `yoga_experience`, `periodo`, `turno`, `dia`
- [x] Atualizar fallback extractor para os novos campos
- [x] Reforcar detector `hasLikelyContactData` para linguagem natural sem formato `campo:valor`
- [x] Expor novos campos nos dados ja coletados do prompt de geracao (evita perguntar de novo)
- [x] Cobertura de testes unitarios:
  - `tests/unit/extract-contact-data-fallback.test.ts`
  - `tests/unit/update-contact-metadata.test.ts`
- [x] Validacao tecnica:
  - `pnpm exec tsc --noEmit`
  - `pnpm test:vitest -- tests/unit/extract-contact-data-fallback.test.ts tests/unit/update-contact-metadata.test.ts`

Proximo checkpoint operacional:
- [ ] Recoletar os mesmos KPIs por 24h no tenant piloto
- [ ] Meta minima: `com_experiencia >= 40%` e `com_periodo_ou_dia >= 40%` dos contatos novos
- [ ] Se ficar abaixo da meta, ajustar prompt de tenant + pesos de deteccao de fallback

## Atualizacao 2026-04-23 - Implementacoes paralelas enquanto rodam iteracoes

- [x] Reconciliação de traces implementada (serviço + cron):
  - `src/lib/trace-reconciliation.ts`
  - `src/app/api/cron/traces-reconcile/route.ts`
- [x] Classificação de pending por bucket implementada:
  - `src/lib/trace-status.ts`
  - `src/lib/trace-logger.ts` (persistência em metadata)
  - `src/app/api/traces/route.ts` (meta.pendingBuckets)
- [x] Alertas operacionais implementados:
  - `src/app/api/quality/alerts/route.ts`
- [x] Fallback resiliente para falha de IA atualizado:
  - `src/flows/chatbotFlow.ts` (categoria de fallback + mensagem de contingencia)
- [x] Testes adicionados (unit + integration):
  - `tests/unit/trace-status.test.ts`
  - `tests/unit/trace-reconciliation.test.ts`
  - `tests/integration/quality-alerts-api.test.ts`
  - `tests/integration/traces-reconcile-cron-api.test.ts`
- [x] Painel de traces atualizado com sinais de operacao:
  - cards de cobertura cadastral
  - card de alertas 15m
  - bucket principal de pending

## Atualizacao 2026-04-23 - Fechamento operacional de observabilidade

- [x] Cron de reconciliacao agendado no deploy:
  - `vercel.json` com `/api/cron/traces-reconcile` a cada 10 minutos.
- [x] Reconciliacao por webhook de status endurecida:
  - `src/lib/trace-reconciliation.ts` agora faz merge seguro de `metadata` via SQL (`jsonb ||`), sem sobrescrever campos existentes.
- [x] SQL oficial de validacao por tenant criado:
  - `scripts/quality-trace-validation.sql`
  - inclui: trace health, pending buckets, reconciliacao trace x chat history, cobertura cadastral (com cast-safe `telefone::text`) e cobertura de evaluations.
- [ ] Rodar o SQL do tenant piloto apos 24h para validar melhora de `pending` e cobertura de cadastro.

## Atualizacao 2026-04-23 - Reconciliacao em producao (checkpoint)

- [x] Deploy de hotfix aplicado (`21e96a6`) com fallback de status para ambientes com constraint antigo.
- [x] Execucao manual da reconciliacao no tenant piloto (`0c17ca30-ad42-48c9-8e40-8c83e3e11da2`) concluida.
- [x] Resultado real (`dryRun=false`): `scanned=4`, `changed=4`, `statusToSuccess=4`, `errors=0`.
- [x] Verificacao imediata (`dryRun=true`): `scanned=0`, `changed=0`, `errors=0`.
- [ ] Proximo checkpoint: aguardar 24h e reexecutar validacao completa por SQL (`scripts/quality-trace-validation.sql`).
- [ ] Seguranca operacional pendente: rotacionar `CRON_SECRET` apos os testes.

## Atualizacao 2026-04-23 - Avanco paralelo (S2/S4 + automacao de KPI diario)

- [x] Relatorio diario automatizado implementado (item 4):
  - `src/lib/quality-daily-report.ts` (calculo + snapshot + listagem)
  - `src/app/api/quality/daily-report/route.ts` (GET historico / POST gerar+persistir)
  - `src/app/api/cron/quality-daily-report/route.ts` (execucao automatica por cron)
  - `supabase/migrations/20260520121000_create_quality_daily_reports.sql`
  - `vercel.json` com cron diario `/api/cron/quality-daily-report` (`10 7 * * *`)
- [x] Cobertura de testes para o novo fluxo:
  - `tests/integration/quality-daily-report-api.test.ts`
  - `tests/integration/quality-daily-report-cron-api.test.ts`
- [x] Apoio operacional S4 (review de FAILs) adicionado:
  - `scripts/s4-fail-review-queue.sql`
  - `GET /api/evaluations/review-queue`
- [x] Apoio operacional S2 (bootstrap Ground Truth) adicionado:
  - `scripts/s2-bootstrap-ground-truth-candidates.sql`
  - `src/app/api/ground-truth/bootstrap-candidates/route.ts`
- [ ] Proximo passo operacional: usar os candidatos para fechar as 30 entradas iniciais de GT no tenant piloto.

## Checkpoint 24h - 2026-04-24 (tenant piloto)

Status atual registrado em 2026-04-23:
- [x] Migration `quality_daily_reports` aplicada.
- [x] Cron/manual de KPI diario executado com sucesso (`stored=1`, `failed=0`).
- [x] Reconciliacao de traces estabilizada (execucao real sem erros para o tenant piloto).

Coleta obrigatoria no checkpoint (D+1):
- [ ] Reexecutar `scripts/quality-trace-validation.sql` para `client_id=0c17ca30-ad42-48c9-8e40-8c83e3e11da2`.
- [ ] Confirmar em `quality_daily_reports` o snapshot do dia:
  - `total_traces`, `success_count`, `pending_count`, `success_rate_pct`
  - `metadata_capture.com_experiencia`
  - `metadata_capture.com_periodo_ou_dia`
  - `evaluation_coverage.eval_coverage_pct`
- [ ] Verificar alertas (`alerts_snapshot`) e classificar se houve regressao operacional.

Criterio para seguir para S5 sem retrabalho:
- [ ] Pending sob controle (sem nova onda de `pending` com erro de status).
- [ ] Captura cadastral minima: experiencia >= 40% e periodo/dia >= 40%.
- [ ] Pipeline de quality estavel (cron diario + reconciliacao sem erros).

Decisao no checkpoint:
- Se todos os criterios passarem: iniciar execucao de S5.
- Se algum criterio falhar: iterar prompt/extractor e repetir checkpoint em +24h.

## Atualizacao 2026-04-23 - Readiness automatizado para checkpoint D+1

- [x] API de prontidao do checkpoint criada:
  - `GET /api/quality/checkpoint-readiness`
  - `src/lib/quality-checkpoint-readiness.ts`
  - `src/app/api/quality/checkpoint-readiness/route.ts`
- [x] Card operacional no dashboard de Qualidade:
  - `src/components/quality/QualityCheckpointReadinessCard.tsx`
  - integrado em `src/components/quality/QualityDashboard.tsx`
- [x] Script SQL unico para checkpoint manual no Supabase:
  - `scripts/quality-checkpoint-readiness.sql`
- [x] Testes adicionados:
  - `tests/unit/quality-checkpoint-readiness.test.ts`
  - `tests/integration/quality-checkpoint-readiness-api.test.ts`

Com isso, o que depende de implementacao ficou adiantado.
O que ainda depende de espera real:
- [ ] Rodar checkpoint apos 24h de novos dados no tenant piloto.
- [ ] Confirmar criterios e decidir inicio de S5.
