# PRD — CRM Automation Engine V2

**Projeto:** UzzApp WhatsApp SaaS
**Versão:** 2.3 (enterprise-ready — concorrência, retry, transação, LGPD, rollout)
**Data:** 2026-03-30
**Status:** Aguardando execução
**Tipo:** Product Requirements Document (PRD Técnico)

---

## Changelog desta versão

| # | Severidade | Ajuste |
|---|-----------|--------|
| 1 | Crítico | Definido modelo de execução único: Engine TS é canônico, SQL vira legado |
| 2 | Crítico | Adicionado `event_id`, `event_hash`, `dedupe_key` + índice único em `crm_rule_executions` |
| 3 | Crítico | Schema evoluído para `action_steps[]` (multi-ação por regra) com status por step |
| 4 | Alto | Inatividade agora exige job scheduler explícito (não só flag) |
| 5 | Alto | Loop guard adicionado: `trace_id` + `depth <= 3` em eventos encadeados |
| 6 | Alto | Policy WhatsApp 24h: `send_message` fora da janela → `template_only` obrigatório |
| 7 | Alto | Correlação Stripe→CRM definida via `card_id` em `metadata` do checkout |
| 8 | Médio | `condition_tree` (JsonLogic) definido como contrato de AND/OU |
| 9 | Médio | Regra de segurança multi-tenant: `client_id` sempre da sessão, nunca do body |
| 10 | Médio | Push tokens: usar tabela `push_tokens` existente (não criar duplicata) |
| 11 | Alto | Concorrência por card: lock/serialização por `card_id` no engine |
| 12 | Alto | Política de retry + DLQ: `max_retries`, backoff exponencial, dead-letter queue |
| 13 | Alto | Semântica transacional: `on_error: compensate` com rollback parcial de steps |
| 14 | Médio | Versionamento de regra: `rule_version` no log de execução para auditoria |
| 15 | Médio | LGPD / retenção: TTL de `crm_rule_executions` + mascaramento de PII |
| 16 | Alto | Rollout controlado: canário por tenant + kill switch global de emergência |

---

## Índice

0. [Gates Obrigatórios de Produção](#0-gates-obrigatórios-de-produção) ← **leia antes de qualquer fase**
1. [Visão Geral](#1-visão-geral)
2. [Estado Atual — O que já existe](#2-estado-atual)
3. [Decisão de Arquitetura — Engine TS vs SQL](#3-decisão-de-arquitetura)
4. [Arquitetura do Motor](#4-arquitetura-do-motor)
5. [Contratos Técnicos Críticos](#5-contratos-técnicos-críticos)
6. [Decisão: Determinístico vs LLM](#6-decisão-determinístico-vs-llm)
7. [Jornada do Lead — Funil Completo](#7-jornada-do-lead)
8. [Roadmap em Fases](#8-roadmap-em-fases)
9. [Schema de Banco — Mudanças por Fase](#9-schema-de-banco)
10. [Endpoints Novos / Modificados](#10-endpoints)
11. [Arquivos a Modificar por Fase](#11-arquivos-a-modificar)
12. [Templates de Regras por Segmento](#12-templates-por-segmento)
13. [KPIs e Critérios de Aceite](#13-kpis-e-critérios-de-aceite)
14. [Go-Live Readiness Board](#14-go-live-readiness-board)
15. [Contratos Enterprise](#15-contratos-enterprise) ← concorrência, retry, transação, LGPD, rollout

---

---

## 0. Gates Obrigatórios de Produção

> **Regra:** Nenhuma fase avança para produção sem que todos os gates da fase
> anterior estejam com status ✅. Estes são critérios **bloqueantes**, não sugestões.

Esta seção consolida os 8 gates de confiabilidade operacional em um único painel.
Cada gate é detalhado tecnicamente na Seção 5. Aqui está o mapa de rastreamento.

---

### Painel de Gates

| # | Gate | Fase obrigatória | Seção técnica | Status inicial |
|---|------|-----------------|--------------|----------------|
| G1 | Motor canônico único (Engine TS, SQL descontinuado) | Fase 1 | [5. Contratos → 3. Arquitetura](#3-decisão-de-arquitetura) | 🔴 Pendente |
| G2 | Idempotência formal (`event_hash` + índice único) | Fase 1 | [5.1 Idempotência](#51--idempotência-event_hash--dedupe) | 🔴 Pendente |
| G3 | Loop guard (`trace_id` + `depth <= 3` + no-op) | Fase 1 | [5.2 Loop Guard](#52--loop-guard-trace_id--depth) | 🔴 Pendente |
| G4 | Scheduler real para inatividade (job cron) | Fase 1 | [5.8 Job de Inatividade](#58--job-de-inatividade) | 🔴 Pendente |
| G5 | Policy WhatsApp 24h (`send_message`) | Fase 2 | [5.5 Policy 24h](#55--policy-whatsapp-24h) | 🔴 Pendente |
| G6 | Condition tree validável (JsonLogic) | Fase 2 | [5.4 JsonLogic](#54--condições-andou-jsonlogic) | 🔴 Pendente |
| G7 | Correlação Stripe → card via `card_id` em metadata | Fase 3 | [5.6 Correlação Stripe](#56--correlação-stripe--crm) | 🔴 Pendente |
| G8 | `client_id` sempre da sessão (nunca do body/query) | Fase 1 | [5.7 Segurança Multi-tenant](#57--segurança-multi-tenant-client_id-sempre-da-sessão) | 🔴 Pendente |
| G9 | Lock por `card_id` (sem corrida entre eventos simultâneos) | Fase 1 | [15.1 Concorrência](#151--concorrência-por-card) | 🔴 Pendente |
| G10 | Retry + DLQ para ações externas | Fase 2 | [15.2 Retry e DLQ](#152--política-de-retry--dlq) | 🔴 Pendente |
| G11 | `on_error: compensate` com rollback de steps | Fase 2 | [15.3 Semântica Transacional](#153--semântica-transacional-dos-action_steps) | 🔴 Pendente |
| G12 | `rule_version` registrado em cada execução | Fase 1 | [15.4 Versionamento de Regra](#154--versionamento-de-regra) | 🔴 Pendente |
| G13 | TTL de dados + mascaramento de PII | Fase 1 | [15.5 LGPD e Retenção](#155--lgpd--retenção) | 🔴 Pendente |
| G14 | Kill switch global + canário por tenant | Fase 1 | [15.6 Rollout Controlado](#156--rollout-controlado--kill-switch) | 🔴 Pendente |

---

### Como usar este painel

1. Ao iniciar uma fase, marcar gates como 🟡 Em progresso
2. Ao ter prova funcional (teste passando), marcar como ✅ Aprovado
3. Só avançar para a próxima fase com todos os gates da fase atual em ✅

**Prova aceitável por gate:**

| Gate | O que comprova ✅ |
|------|-----------------|
| G1 | Grep no codebase: zero chamadas para `process_crm_automation_rules()`. Renomeada para `_deprecated_*` |
| G2 | Teste: enviar mesmo webhook 3x → `crm_rule_executions` tem 1 row com status `success`, 2 com `skipped` |
| G3 | Teste: criar regra `card_moved → move_to_column` para a mesma coluna → zero execuções além da primeira |
| G4 | Teste: card com `last_message_at = NOW() - 4 days` → após job rodar → `crm_rule_executions` tem entrada |
| G5 | Teste: `send_message` para contato sem mensagem há 25h com `message_type: "text"` → `skip_reason: whatsapp_window_closed_text_requires_template` |
| G6 | Teste: regra com `condition_tree` inválido → `POST /api/crm/automation-rules` retorna 400 com mensagem clara |
| G7 | Teste: Stripe webhook sem `card_id` em metadata → evento logado sem card, sem erro 500 |
| G8 | Teste: `GET /api/crm/automation-rules?clientId=outro-tenant` → retorna dados do tenant da sessão, não do `clientId` do query |
| G9 | Teste: 10 eventos simultâneos para o mesmo `card_id` → zero duplicatas em `crm_card_tags` e `crm_rule_executions` |
| G10 | Teste: `send_message` falhando 3x → row em `crm_action_dlq` com `final_error` preenchido após backoff |
| G11 | Teste: `move_to_column` ok + `add_tag` falha + `on_error: compensate` → card retorna à coluna original |
| G12 | Teste: alterar regra → execuções antigas retêm `rule_version` anterior; novas têm versão incrementada |
| G13 | Teste: `SELECT phone FROM crm_rule_executions WHERE executed_at < NOW() - INTERVAL '90 days'` → zero rows |
| G14 | Teste: `feature_flags.crm_engine_enabled = false` → zero eventos processados; log confirma kill switch ativo |

---

## 1. Visão Geral

### Problema atual

O sistema de automação CRM existe no banco e na UI, mas está **incompleto e subutilizado**:

- Alerta de inatividade está desligado por padrão — e mesmo ligado, não dispara sem scheduler
- Não existe trigger para palavra-chave → lead quente não é detectado
- Não existe ação de enviar mensagem → sem follow-up automático
- Não existe ação de notificar responsável → atendente não sabe quando agir
- O Stripe não conecta ao CRM → venda fechada não atualiza o funil
- Não existe histórico de execuções visível na UI
- Regras têm uma única ação por regra → fluxos "mover + taguear + notificar" exigem 3 regras
- Não existe modo de teste/simulação

### Objetivo

Automatizar o funil de leads ponta a ponta para que o cliente consiga configurar
**sem código** toda a jornada: entrada → qualificação → oportunidade → conversão → pós-venda.

### Princípio central

> O motor de automação deve ser **confiável antes de ser inteligente**.
> Determinístico primeiro. LLM como copiloto opcional depois.

---

## 2. Estado Atual

### O que já existe (não reescrever)

| Componente | Localização | Status |
|-----------|------------|--------|
| Tabela `crm_automation_rules` | migration `20260131160000` | ✅ Existe |
| Tabela `crm_rule_executions` | migration `20260131160000` | ✅ Existe (sem UI, sem dedupe) |
| Tabela `crm_settings` | migration `20260131160000` | ✅ Existe |
| Tabela `crm_cards` | migration `20260131130423` | ✅ Existe |
| Tabela `crm_columns` | migration `20260131130423` | ✅ Existe |
| Tabela `lead_sources` | migration `20260131160000` | ✅ Existe |
| Tabela `push_tokens` | types.ts:1013 | ✅ Existe — usar esta |
| Função SQL `process_crm_automation_rules()` | migration `20260131160000` | ⚠️ Legado — deprecar |
| API `GET/POST/PATCH/DELETE /api/crm/automation-rules` | route.ts | ✅ Existe (bug: clientId por query) |
| API `GET /api/crm/cards` | route.ts | ✅ Existe |
| API `POST /api/crm/cards/[id]/move` | route.ts | ✅ Existe |
| UI de regras no dashboard | dashboard/crm | ✅ Existe |
| Constantes de triggers/ações | `lib/crm-automation-constants.ts` | ✅ Existe (incompleto) |

### Gaps identificados

| Recurso | Trigger/Ação | Banco | UI | Flow |
|---------|-------------|-------|----|------|
| Multi-ação por regra | `action_steps[]` | ❌ | ❌ | ❌ |
| Palavra-chave | `keyword_detected` | ❌ | ❌ | ❌ |
| Enviar mensagem | `send_message` | ❌ | ❌ | ❌ |
| Notificar responsável | `notify_user` | ❌ | ❌ | ❌ |
| Card movido | `card_moved` | ❌ | ❌ | ❌ |
| Pagamento concluído | `payment_completed` | ❌ | ❌ | ❌ |
| Intenção LLM | `intent_detected` | ❌ | ❌ | ❌ |
| Histórico de execuções | — | ✅ | ❌ | — |
| Condições AND/OU | `condition_tree` | ❌ | ❌ | ❌ |
| Simulador de regras | — | ❌ | ❌ | — |
| Prioridade reordenável | — | ✅ | ❌ | — |
| Inatividade ligada + scheduler | — | ✅ flag | Desligada | ❌ sem job |
| Idempotência / dedupe | `event_hash` | ❌ | — | ❌ |
| Loop guard | `trace_id + depth` | ❌ | — | ❌ |
| Policy WhatsApp 24h | — | ❌ | ❌ | ❌ |
| Correlação Stripe→card | `card_id em metadata` | ❌ | ❌ | ❌ |

---

## 3. Decisão de Arquitetura — Engine TS vs SQL

### Problema

O PRD anterior mencionava tanto a função SQL `process_crm_automation_rules()`
quanto um novo `AutomationEngine` TypeScript sem definir qual seria a fonte da
verdade. Isso criaria divergência de regras e bugs difíceis de rastrear.

### Decisão: Engine TypeScript é canônico

```
┌────────────────────────────────────────────────────────────┐
│  FONTE DA VERDADE: src/lib/crm-automation-engine.ts (TS)   │
│                                                            │
│  ✅ Avalia regras                                           │
│  ✅ Resolve condition_tree (JsonLogic)                      │
│  ✅ Executa action_steps em sequência                       │
│  ✅ Garante idempotência via event_hash                     │
│  ✅ Aplica loop guard via trace_id + depth                  │
│  ✅ Aplica policy WhatsApp 24h                              │
│  ✅ Registra crm_rule_executions                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  LEGADO: process_crm_automation_rules() (SQL)              │
│                                                            │
│  ⚠️ NÃO É MAIS CHAMADA pelo código a partir da Fase 1      │
│  ⚠️ Mantida apenas como read-only histórico                 │
│  ⚠️ Não remover na migration — renomear para               │
│     _deprecated_process_crm_automation_rules()             │
└────────────────────────────────────────────────────────────┘
```

### Por que TS em vez de SQL

| Critério | SQL | TypeScript |
|---------|-----|-----------|
| Lógica condicional complexa (AND/OR/JsonLogic) | Difícil | Natural |
| Chamadas externas (WhatsApp API, push) | Impossível | Direto |
| Loop guard e trace propagation | Muito difícil | Simples |
| Testabilidade unitária | Difícil | Fácil (jest) |
| Stack traces de erro | Opacos | Ricos |
| Cache de configurações | Impossível | Sim (Map<>) |

### Regra absoluta

> **Nenhum código novo deve chamar a função SQL diretamente.**
> Todo disparo de automação passa por `AutomationEngine.emit()`.

---

## 4. Arquitetura do Motor

```
┌─────────────────────────────────────────────────────────────────┐
│  EVENTOS NORMALIZADOS (Camada 1)                                 │
│                                                                  │
│  lead.first_message        → primeira mensagem do contato        │
│  lead.message_received     → qualquer mensagem                   │
│  lead.keyword_detected     → palavra-chave encontrada            │
│  lead.inactivity           → X dias sem mensagem (emitido p/job) │
│  lead.intent_detected      → sinal LLM (Fase 5)                  │
│  lead.payment_completed    → Stripe webhook                      │
│  crm.card_created          → card novo                           │
│  crm.card_moved            → card movido de coluna               │
│  crm.status_change         → bot/humano/transferido              │
│  crm.transfer_human        → solicitou atendente                 │
│  crm.tag_added             → tag aplicada                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ AutomationEngine.emit(event, data)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  MOTOR — AutomationEngine (src/lib/crm-automation-engine.ts)     │
│                                                                  │
│  1. Gerar event_id (uuid) + event_hash (sha256 do payload)       │
│  2. Verificar idempotência: hash já processado? → skip           │
│  3. Verificar loop guard: trace depth > 3? → abort + log         │
│  4. Buscar regras ativas para o trigger (cache 5min)             │
│  5. Para cada regra: avaliar condition_tree (JsonLogic)          │
│  6. Executar action_steps em sequência                           │
│  7. Registrar cada step em crm_rule_executions                   │
│  8. Em caso de erro num step: logar, continuar próximos steps    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ executa
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  AÇÕES (Camada 3)                                                │
│                                                                  │
│  move_to_column    → crm_cards.column_id (no-op se igual)        │
│  add_tag           → crm_card_tags                               │
│  remove_tag        → crm_card_tags                               │
│  assign_to         → crm_cards.assigned_to                       │
│  update_auto_status → crm_cards.auto_status                      │
│  send_message      → Meta API (com policy 24h)                   │
│  notify_user       → push_tokens (tabela existente) / Gmail      │
│  log_activity      → crm_activity_log                            │
│  add_note          → crm_cards notes                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ registra
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  OBSERVABILIDADE (Camada 4)                                      │
│                                                                  │
│  crm_rule_executions — log por step (event_hash, trace_id, depth)│
│  UI: "Esta regra disparou 47x, 2 erros nos últimos 7 dias"       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Contratos Técnicos Críticos

Esta seção define os contratos que **devem** ser implementados exatamente
como descritos, pois são as bases de segurança e confiabilidade do motor.

---

### 5.1 — Idempotência: event_hash + dedupe

**Problema:** Webhooks Meta e Stripe podem reenviar o mesmo evento em retries.
Sem dedupe, a mesma regra executa duas vezes para o mesmo evento.

**Solução:**

```typescript
// Gerar hash determinístico do evento
const event_hash = sha256(JSON.stringify({
  event_type: 'lead.keyword_detected',
  card_id:    'uuid-do-card',
  client_id:  'uuid-do-cliente',
  payload:    { keyword: 'preço', message: 'qual o preço?' }
}))

// Antes de executar: verificar se já foi processado
const { data: existing } = await supabase
  .from('crm_rule_executions')
  .select('id')
  .eq('event_hash', event_hash)
  .eq('rule_id', rule.id)
  .maybeSingle()

if (existing) return { skipped: true, reason: 'duplicate_event' }
```

**Schema adicionado em `crm_rule_executions`:**
```sql
ALTER TABLE crm_rule_executions
  ADD COLUMN IF NOT EXISTS event_id     UUID,
  ADD COLUMN IF NOT EXISTS event_hash   TEXT,
  ADD COLUMN IF NOT EXISTS trace_id     UUID,
  ADD COLUMN IF NOT EXISTS depth        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source       TEXT,   -- 'chatbot_flow', 'stripe_webhook', 'inactivity_job'
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS skip_reason  TEXT,
  ADD COLUMN IF NOT EXISTS step_index   INTEGER DEFAULT 0;

-- Índice único para garantir dedupe no banco
CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_executions_dedupe
  ON crm_rule_executions (rule_id, event_hash)
  WHERE status != 'skipped';
```

---

### 5.2 — Loop Guard: trace_id + depth

**Problema:** `card_moved` → `move_to_column` → `card_moved` → loop infinito.

**Solução:**

```typescript
// Cada evento carrega um trace_id e depth
interface AutomationEvent {
  type: string
  data: Record<string, unknown>
  trace_id: string    // mesmo UUID em toda a cadeia de eventos originada de um disparo
  depth: number       // incrementado a cada re-emissão
}

// No engine, antes de executar:
if (event.depth > 3) {
  log.warn(`Loop guard: trace ${event.trace_id} atingiu depth ${event.depth}. Abortando.`)
  await logExecution({ status: 'aborted', skip_reason: 'loop_guard_depth_exceeded' })
  return
}

// Ao re-emitir evento a partir de uma ação (ex: move_to_column emite card_moved):
AutomationEngine.emit({
  ...newEvent,
  trace_id: event.trace_id,   // propaga o mesmo trace
  depth: event.depth + 1      // incrementa
})

// No-op explícito em move_to_column:
if (card.column_id === action_params.column_id) {
  return { skipped: true, reason: 'already_in_target_column' }
  // Não emite card_moved → não causa loop
}
```

---

### 5.3 — Multi-ação por regra: `action_steps[]`

**Problema:** Schema atual tem `action_type` (string) + `action_params` (JSONB) — uma ação por regra.
O PRD propõe fluxos "Tag + Mover + Notificar" que exigiriam 3 regras.

**Decisão:** Migrar para `action_steps[]` com rollback parcial.

**Migration:**
```sql
-- Adicionar coluna nova (sem remover as antigas por retrocompatibilidade)
ALTER TABLE crm_automation_rules
  ADD COLUMN IF NOT EXISTS action_steps JSONB DEFAULT '[]';

-- action_steps formato:
-- [
--   { "type": "add_tag",       "params": { "tag_id": "uuid" },        "on_error": "continue" },
--   { "type": "move_to_column","params": { "column_id": "uuid" },     "on_error": "continue" },
--   { "type": "notify_user",   "params": { "target": "assigned_to" },"on_error": "skip" }
-- ]
```

**Retrocompatibilidade:** Se `action_steps` for `[]` ou `null`, o engine usa
`action_type` + `action_params` (comportamento atual). Migração gradual.

**`on_error` por step:**
- `"continue"` → erro neste step, executa os próximos mesmo assim
- `"stop"` → erro neste step, para a execução da regra
- `"skip"` → se falhar, simplesmente ignora (não loga como erro)

**Registro por step em `crm_rule_executions`:**
```
execution_id  rule_id  step_index  action_type   status   error_message
uuid-1        rule-A   0           add_tag        success  null
uuid-2        rule-A   1           move_to_column success  null
uuid-3        rule-A   2           notify_user    failed   "No push token for user"
```

---

### 5.4 — Condições AND/OU: JsonLogic

**Problema:** O schema atual de `trigger_conditions` é um JSONB flat sem lógica composta.
Não suporta "veio de anúncio E é primeira mensagem" de forma estruturada.

**Decisão:** Adotar [JsonLogic](https://jsonlogic.com/) como contrato de `condition_tree`.

**Migration:**
```sql
ALTER TABLE crm_automation_rules
  ADD COLUMN IF NOT EXISTS condition_tree JSONB DEFAULT NULL;
-- NULL = sem condição (compatível com todos os eventos do trigger)
-- Coexiste com trigger_conditions (legado)
```

**Exemplos de condition_tree:**
```json
// AND simples
{
  "and": [
    { "==": [{ "var": "source_type" }, "meta_ads"] },
    { "==": [{ "var": "is_first_message" }, true] }
  ]
}

// OR de palavras-chave
{
  "or": [
    { "in": ["preço", { "var": "message_text" }] },
    { "in": ["valor", { "var": "message_text" }] },
    { "in": ["mensalidade", { "var": "message_text" }] }
  ]
}

// Threshold de confidence (Fase 5)
{
  "and": [
    { "==": [{ "var": "intent" }, "quer_aula_experimental"] },
    { ">=": [{ "var": "confidence" }, 0.85] }
  ]
}
```

**Avaliação no engine:**
```typescript
import jsonLogic from 'json-logic-js'

const shouldExecute = rule.condition_tree
  ? jsonLogic.apply(rule.condition_tree, eventData)
  : true  // sem condition_tree = executa sempre
```

**Validação no backend:** `POST /api/crm/automation-rules` deve validar
`condition_tree` antes de salvar (jsonLogic.truthy check ou schema JSON).

---

### 5.5 — Policy WhatsApp 24h

**Problema:** A ação `send_message` com texto livre falha silenciosamente
quando o contato não enviou mensagem nas últimas 24 horas (janela de sessão Meta).

**Regra aplicada pelo engine antes de executar `send_message`:**

```typescript
const checkWhatsAppWindow = async (phone: string): Promise<'open' | 'closed'> => {
  // Busca última mensagem RECEBIDA (direction = 'incoming') do contato
  const { data } = await supabase
    .from('n8n_chat_histories')
    .select('created_at')
    .eq('telefone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return 'closed'
  const hoursAgo = (Date.now() - new Date(data.created_at).getTime()) / 3600000
  return hoursAgo <= 24 ? 'open' : 'closed'
}

// No executor de send_message:
const window = await checkWhatsAppWindow(card.phone)

if (window === 'closed') {
  if (action_params.message_type === 'text') {
    // Texto livre fora da janela → não envia, loga como skip
    return {
      skipped: true,
      skip_reason: 'whatsapp_window_closed_text_requires_template'
    }
  }
  if (action_params.message_type === 'template') {
    // Template aprovado → pode enviar fora da janela
    // Continua normalmente
  }
}
```

**Schema da ação `send_message` (completo):**
```json
{
  "type": "send_message",
  "params": {
    "message_type": "text",
    "content": "Oi {{contact_name}}! Vi que você ficou inativo há {{inactive_days}} dias.",
    "fallback_template_id": "uuid-do-template-aprovado",
    "delay_minutes": 0
  },
  "on_error": "continue"
}
```

Se `fallback_template_id` estiver preenchido e a janela estiver fechada,
o engine usa o template em vez do texto livre.

---

### 5.6 — Correlação Stripe → CRM

**Problema:** O webhook do Stripe recebe `customer_email` e `amount`, mas não
necessariamente o telefone WhatsApp do comprador. O match com `crm_cards` pode falhar.

**Solução: `card_id` no metadata do Checkout Session**

A chave de correlação deve ser inserida no momento da criação do Checkout Session:

```typescript
// Ao criar Checkout Session (src/app/api/stripe/checkout/route.ts)
const session = await stripe.checkout.sessions.create({
  // ... configurações normais ...
  metadata: {
    client_id: clientId,
    card_id:   crmCardId,      // UUID do card no CRM ← chave de correlação
    phone:     normalizedPhone // fallback
  }
})
```

**No webhook `checkout.session.completed`:**
```typescript
const cardId = event.data.object.metadata?.card_id
const phone  = event.data.object.metadata?.phone

// Estratégia de resolução em ordem de confiança:
// 1. card_id no metadata → match direto, mais confiável
// 2. phone no metadata   → buscar card por telefone
// 3. customer_email      → buscar contato por e-mail → telefone → card
// 4. Nenhum match        → logar evento sem card associado, não quebra o flow
```

**Implicação:** A página de checkout ou o fluxo que gera o link de pagamento
precisa ter acesso ao `card_id`. Se o pagamento for iniciado via WhatsApp
(bot envia link), o `card_id` já está disponível no contexto do flow.

---

### 5.7 — Segurança Multi-tenant: client_id sempre da sessão

**Regra absoluta para todos os endpoints de CRM:**

> `client_id` nunca vem do body ou query string enviado pelo frontend.
> Sempre extraído de `getClientIdFromSession()`.

**Problema encontrado:** A rota `GET /api/crm/automation-rules` recebe
`clientId` por query string, o que é uma vulnerabilidade de tenant bypass.

**Padrão correto:**
```typescript
// ❌ NUNCA fazer isto
const clientId = searchParams.get('clientId')

// ✅ SEMPRE fazer isto
const clientId = await getClientIdFromSession(request as any)
if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Fix necessário:** `src/app/api/crm/automation-rules/route.ts` linha 18 —
remover `clientId` do query param e usar sessão.

---

### 5.8 — Job de Inatividade

**Problema:** Ativar a flag `is_active = true` na regra de inatividade não
faz nada sem um processo que periodicamente emita o evento `lead.inactivity`.

**Solução: Job periódico (cron)**

```typescript
// src/lib/jobs/inactivity-check.ts
// Executado via: GET /api/cron/inactivity-check (protegido por CRON_SECRET)

export async function runInactivityCheck() {
  // Buscar clientes com regra de inatividade ativa
  const rules = await supabase
    .from('crm_automation_rules')
    .select('client_id, trigger_conditions')
    .eq('trigger_type', 'inactivity')
    .eq('is_active', true)

  for (const rule of rules) {
    const days = rule.trigger_conditions?.inactivity_days ?? 3

    // Buscar cards cujo last_message_at ficou X dias atrás
    // E que não foram processados por esta regra recentemente
    const { data: cards } = await supabase
      .from('crm_cards')
      .select('id, phone, client_id, last_message_at')
      .eq('client_id', rule.client_id)
      .lt('last_message_at', `NOW() - INTERVAL '${days} days'`)
      .not('auto_status', 'eq', 'resolved') // não reprocessar resolvidos

    for (const card of cards) {
      await AutomationEngine.emit({
        type: 'lead.inactivity',
        data: {
          inactive_days: days,
          last_message_at: card.last_message_at
        },
        card_id: card.id,
        client_id: card.client_id,
        trace_id: uuid(),
        depth: 0,
        source: 'inactivity_job'
      })
    }
  }
}
```

**Endpoint protegido:**
```
GET /api/cron/inactivity-check
Header: Authorization: Bearer ${CRON_SECRET}
```

**Frequência recomendada:** A cada 15 minutos (via Vercel Cron ou serviço externo).

**Janelas de silêncio** (não enviar notificações de inatividade à noite):
```typescript
// crm_settings: adicionar notif_silence_start / notif_silence_end
// Padrão: 22:00–08:00 horário do cliente
if (isInSilenceWindow(clientTimezone)) {
  // Loga inatividade mas não dispara notify_user nem send_message
  // Reagenda para depois da janela de silêncio
}
```

---

### 5.9 — LLM: Timeout, Fallback e Custo

Aplicado na Fase 5. Contrato definido agora para evitar retrabalho.

```typescript
interface IntentClassificationResult {
  intent: string
  confidence: number       // 0.0 – 1.0
  urgency: 'low' | 'medium' | 'high'
  sentiment: 'positive' | 'neutral' | 'negative'
  fallback_used: boolean   // true se LLM falhou e keyword foi usado
}

// Garantias de segurança no classificador:
const LLM_TIMEOUT_MS       = 2000   // máx 2s, não bloqueia o flow principal
const LLM_MAX_COST_PER_DAY = 0.50   // R$ 0,50/dia por cliente (verificado em client_budgets)
const MIN_CONFIDENCE       = 0.80   // threshold padrão, configurável por cliente

// Se LLM falha (timeout, erro, custo excedido):
// → fallback para keyword determinístico
// → intent classificado como 'unknown' com confidence = 0
// → automações de intent_detected NÃO disparam
// → automações de keyword_detected disparam normalmente
```

**Validação de resposta LLM (strict schema):**
```typescript
const IntentSchema = z.object({
  intent:     z.string().max(50),
  confidence: z.number().min(0).max(1),
  urgency:    z.enum(['low', 'medium', 'high']),
  sentiment:  z.enum(['positive', 'neutral', 'negative'])
})
// Se resposta não valida → tratar como fallback
```

---

## 6. Decisão: Determinístico vs LLM

### Arquitetura híbrida

```
┌──────────────────────────────────────────────────────────┐
│  Camada Determinística (Fases 1–4)                        │
│  ─────────────────────────────────                        │
│  Regras explícitas: se mensagem contém "preço" → mover   │
│  Resultado: previsível, auditável, sem custo extra de IA  │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼ (Fase 5 — feature flag por cliente)
┌──────────────────────────────────────────────────────────┐
│  Camada LLM (copiloto, não executor)                      │
│  ──────────────────────────────────                       │
│  LLM analisa mensagem → retorna JSON validado:            │
│  { intent, confidence, urgency, sentiment }               │
│                                                           │
│  Motor avalia: confidence >= threshold? (default: 0.85)   │
│  → SIM: executa ações da regra                            │
│  → NÃO: ignora, keyword determinística assume             │
│                                                           │
│  LLM NUNCA executa ação diretamente.                      │
│  LLM com timeout/erro → fallback automático.              │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Jornada do Lead

### Funil completo com automações por fase

```
TOPO — ENTRADA
──────────────
Lead vê anúncio Meta Ads → clica (CTWA) → envia primeira mensagem

  EVENT: lead.first_message
    Step 1: move_to_column  → "Novos Leads"
    Step 2: add_tag         → "Anúncio" (se source_type = meta_ads)
    Step 3: add_tag         → "{{campaign_name}}"
    Step 4: notify_user     → assigned_to (se configurado)


MEIO — QUALIFICAÇÃO
───────────────────
Bot conversa, lead responde

  EVENT: lead.keyword_detected
    "preço, valor, quanto, mensalidade"
    Step 1: add_tag        → "Interesse Preço"
    Step 2: move_to_column → "Oportunidade"

    "experimental, aula grátis, teste"
    Step 1: add_tag        → "Quer Experimental"
    Step 2: move_to_column → "Quente"
    Step 3: notify_user    → assigned_to (imediato)

    "urgente, hoje, agora"
    Step 1: add_tag     → "Urgente"
    Step 2: notify_user → assigned_to (imediato)


MEIO — REENGAJAMENTO
──────────────────────────────
Lead parou de responder

  EVENT: lead.inactivity (disparado pelo job a cada 15min)
    3 dias:
    Step 1: add_tag     → "Inativo 3d"
    Step 2: notify_user → assigned_to

    7 dias:
    Step 1: add_tag      → "Inativo 7d"
    Step 2: move_to_column → "Reengajamento"
    Step 3: send_message → follow-up (text se janela aberta, template se fechada)


ATENDIMENTO HUMANO
──────────────────
  EVENT: crm.transfer_human
    Step 1: update_auto_status → "awaiting_attendant"
    Step 2: move_to_column     → "Atendimento Humano"
    Step 3: notify_user        → assigned_to


FUNDO — CONVERSÃO
─────────────────
  EVENT: lead.payment_completed (Stripe → card_id em metadata)
    Step 1: move_to_column → "Clientes"
    Step 2: add_tag        → "Comprou"
    Step 3: add_tag        → "{{product_name}}"
    Step 4: log_activity   → "Pagamento de R$ {{amount}} confirmado"
    Step 5: send_message   → "Parabéns! Acesso confirmado. {{next_steps}}"

  EVENT: crm.card_moved (atendente arrasta para "Fechado")
    Step 1: log_activity → "Negociação encerrada pelo atendente"
```

---

## 8. Roadmap em Fases

---

### Fase 1 — Quick Wins *(baixo risco, alto impacto imediato)*

**Objetivo:** Fechar gaps críticos sem mudar a arquitetura existente.

#### 1.1 — Criar AutomationEngine.ts (esqueleto)

- Criar `src/lib/crm-automation-engine.ts` com função `emit()` mínima
- Implementar idempotência via `event_hash` (seção 5.1)
- Implementar loop guard via `trace_id + depth` (seção 5.2)
- **Deprecar** função SQL: renomear para `_deprecated_process_crm_automation_rules`

#### 1.2 — Fix de segurança multi-tenant

- `src/app/api/crm/automation-rules/route.ts`: remover `clientId` de query param
- Usar `getClientIdFromSession()` em todos os métodos da rota

#### 1.3 — Ligar inatividade + criar job

- Migration: `UPDATE crm_automation_rules SET is_active=true WHERE trigger_type='inactivity'`
- Criar `src/app/api/cron/inactivity-check/route.ts` (protegido por `CRON_SECRET`)
- Criar `src/lib/jobs/inactivity-check.ts` com lógica do job
- Configurar no `vercel.json`: `"crons": [{ "path": "/api/cron/inactivity-check", "schedule": "*/15 * * * *" }]`

#### 1.4 — Trigger `card_moved`

- `src/app/api/crm/cards/[id]/move/route.ts`: chamar `AutomationEngine.emit('crm.card_moved', ...)`
- Adicionar `card_moved` em `crm-automation-constants.ts`
- No executor `move_to_column`: verificar no-op (coluna destino igual à atual)

#### 1.5 — Condição `is_first_message`

- Adicionar ao `condition_tree` evaluation (via JsonLogic já implementado)
- UI: checkbox "Apenas primeira mensagem" no editor

**Migration Fase 1:**
```sql
-- Campos de dedupe e rastreamento em crm_rule_executions
ALTER TABLE crm_rule_executions
  ADD COLUMN IF NOT EXISTS event_id     UUID,
  ADD COLUMN IF NOT EXISTS event_hash   TEXT,
  ADD COLUMN IF NOT EXISTS trace_id     UUID,
  ADD COLUMN IF NOT EXISTS depth        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source       TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS skip_reason  TEXT,
  ADD COLUMN IF NOT EXISTS step_index   INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_executions_dedupe
  ON crm_rule_executions (rule_id, event_hash)
  WHERE status != 'skipped';

-- Suporte a multi-ação e condition_tree na tabela de regras
ALTER TABLE crm_automation_rules
  ADD COLUMN IF NOT EXISTS action_steps    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS condition_tree  JSONB DEFAULT NULL;

-- Deprecar função SQL
ALTER FUNCTION process_crm_automation_rules(UUID, UUID, TEXT, JSONB)
  RENAME TO _deprecated_process_crm_automation_rules;
```

### ✅ Gate de Aprovação — Fase 1

> **Bloqueante:** Fase 2 só inicia após todos os itens abaixo estarem aprovados.

| Gate | Critério de prova | Status |
|------|-------------------|--------|
| **G1** Motor canônico | `grep -r "process_crm_automation_rules" src/` retorna zero resultados | 🔴 |
| **G2** Idempotência | Enviar mesmo webhook 3x → 1 `success` + 2 `skipped` em `crm_rule_executions` | 🔴 |
| **G3** Loop guard | Regra `card_moved → move_to_column` para mesma coluna → zero execuções em cadeia | 🔴 |
| **G4** Job scheduler | Card com `last_message_at = NOW() - 4 days` → entrada em `crm_rule_executions` após job | 🔴 |
| **G8** Segurança tenant | `GET /api/crm/automation-rules?clientId=OUTRO` → retorna dados do tenant da sessão | 🔴 |

---

### Fase 2 — Automação Comercial Real

**Objetivo:** O funil reage a intenção de compra e mantém lead engajado.

#### 2.1 — Trigger `keyword_detected`

```json
{
  "trigger_type": "keyword_detected",
  "condition_tree": {
    "or": [
      { "in": ["preço", { "var": "message_text_lower" }] },
      { "in": ["valor", { "var": "message_text_lower" }] }
    ]
  }
}
```

- Palavras-chave do cliente cacheadas junto com `bot_configurations` (5min TTL)
- Verificação feita no Node 5 do `chatbotFlow.ts` (após normalizeMessage)
- Sem query ao banco por mensagem — tudo em memória

#### 2.2 — Ação `send_message` com policy 24h (seção 5.5)

#### 2.3 — Ação `notify_user` via `push_tokens` existente

- **Usar tabela `push_tokens` que já existe** (não criar `user_push_tokens`)
- `target: "assigned_to"` → buscar token via `push_tokens.user_id = card.assigned_to`
- `target: "all_admins"` → buscar todos `user_profiles` com `role='admin'` do cliente
- Canal fallback: Gmail SMTP (já existe para handoff humano)

#### 2.4 — Multi-ação via `action_steps[]` (seção 5.3)

- Engine passa a executar `action_steps` quando preenchido
- Retrocompatível com `action_type` legado (se `action_steps = []`)
- UI: adicionar/remover steps no editor de regra

### ✅ Gate de Aprovação — Fase 2

> **Bloqueante:** Fase 3 só inicia após todos os itens abaixo estarem aprovados.

| Gate | Critério de prova | Status |
|------|-------------------|--------|
| **G5** Policy 24h | `send_message` text para contato inativo há 25h → `skip_reason: whatsapp_window_closed_text_requires_template` em `crm_rule_executions` | 🔴 |
| **G6** JsonLogic | `POST /api/crm/automation-rules` com `condition_tree` malformado → HTTP 400 com mensagem de erro | 🔴 |
| Keywords em memória | Mensagem "preço" → `keyword_detected` dispara sem query ao banco (verificar via logs de DB) | 🔴 |
| Multi-step | Regra com 3 steps, step 2 falha (`on_error: "continue"`) → step 3 executa e tem entrada própria em `crm_rule_executions` | 🔴 |
| `push_tokens` | `notify_user` usa tabela `push_tokens` existente; nenhuma tabela `user_push_tokens` criada no banco | 🔴 |

---

### Fase 3 — Conversão e Receita

**Objetivo:** Venda fechada = CRM atualizado automaticamente.

#### 3.1 — Correlação Stripe → CRM (seção 5.6)

- `src/app/api/stripe/checkout/route.ts` (ou onde o session é criado): incluir `card_id` em `metadata`
- `src/app/api/stripe/webhooks/route.ts`: resolver card via `metadata.card_id` → `metadata.phone` → e-mail
- Chamar `AutomationEngine.emit('lead.payment_completed', { amount, product_name, card_id })`

#### 3.2 — Variáveis de pagamento

```
{{amount}}       → "R$ 99,00"
{{product_name}} → nome do produto
{{payment_date}} → data formatada
{{next_steps}}   → configurável por cliente (campo em crm_settings)
```

### ✅ Gate de Aprovação — Fase 3

> **Bloqueante:** Fase 4 só inicia após todos os itens abaixo estarem aprovados.

| Gate | Critério de prova | Status |
|------|-------------------|--------|
| **G7** Correlação Stripe | Checkout com `card_id` em metadata → card movido para "Clientes" em < 5s após webhook | 🔴 |
| Fallback sem `card_id` | Checkout sem `card_id` em metadata → evento logado sem card associado, zero erros 500 | 🔴 |
| Variáveis de pagamento | `{{amount}}` substituído corretamente por `R$ 99,00` no template enviado | 🔴 |

---

### Fase 4 — Operação Profissional

**Objetivo:** Equipe consegue auditar, priorizar, simular e agendar automações.

#### 4.1 — UI de histórico de execuções

- `GET /api/crm/automation-rules/[id]/executions`
- Fonte: tabela `crm_rule_executions` com filtros por status e período
- Mostrar: `contact_name`, `event_hash`, `depth`, `source`, `skip_reason`, steps

#### 4.2 — Reordenação de prioridade

- Drag-and-drop na lista (dnd-kit, já instalado para o Kanban)
- `PATCH /api/crm/automation-rules/reorder` → `[{ id, priority }]` em batch

#### 4.3 — Simulador de regras (dry-run)

```
POST /api/crm/automation-rules/simulate
Body: { message: "quanto custa?", phone: "5554...", dry_run: true }
Response: {
  rules_matched: [{ rule_id, steps_would_execute: [...] }],
  rules_skipped: [{ rule_id, reason: "condition_tree_false" }]
}
```

Motor executa normalmente mas com flag `dry_run = true` → nenhum side effect,
nenhum registro em `crm_rule_executions`.

#### 4.4 — Ações com delay + janela de silêncio (seção 5.8)

**Migration:**
```sql
CREATE TABLE IF NOT EXISTS crm_scheduled_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id      UUID REFERENCES crm_automation_rules(id) ON DELETE SET NULL,
  card_id      UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL,
  action_params JSONB NOT NULL,
  execute_at   TIMESTAMPTZ NOT NULL,
  executed_at  TIMESTAMPTZ,
  status       TEXT DEFAULT 'pending', -- pending, executed, cancelled, failed
  error_message TEXT,
  trace_id     UUID,
  depth        INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scheduled_actions_execute
  ON crm_scheduled_actions (execute_at, status)
  WHERE status = 'pending';

-- Silêncio de notificações por cliente
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS notif_silence_start TIME DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS notif_silence_end   TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS client_timezone     TEXT DEFAULT 'America/Sao_Paulo';
```

---

### Fase 5 — LLM Assistido *(feature flag, opcional)*

**Objetivo:** Detectar intenções implícitas que keywords não capturam.

**Ativação:** `crm_settings.llm_intent_enabled = true` por cliente

- Sinal LLM como JSON estruturado (seção 5.9)
- Threshold configurável (default 0.85)
- Timeout máximo 2s, fallback para keyword determinístico
- Budget diário por cliente (`LLM_MAX_COST_PER_DAY`)
- Triggers novos: `intent_detected`, `urgency_detected`

**Migration:**
```sql
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS llm_intent_enabled   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS llm_intent_threshold NUMERIC(3,2) DEFAULT 0.85;
```

### ✅ Gate de Aprovação — Fase 4

> Fase 5 (LLM) é opcional. Mas antes de ativar para qualquer cliente, estes critérios devem ser válidos.

| Gate | Critério de prova | Status |
|------|-------------------|--------|
| Simulador dry-run | `POST .../simulate` → zero inserts em `crm_rule_executions`, zero mensagens enviadas | 🔴 |
| Histórico completo | UI exibe `skip_reason`, `depth`, `source`, `step_index` para cada execução | 🔴 |
| Reordenação | Regras reordenadas → próxima execução respeita nova ordem de prioridade | 🔴 |
| Ação com delay | `delay_minutes: 60` → entrada em `crm_scheduled_actions` com `execute_at = NOW() + 1h` | 🔴 |

### ✅ Gate de Aprovação — Fase 5 (LLM)

> Fase 5 nunca deve degradar o comportamento das Fases 1–4 para clientes sem a feature habilitada.

| Gate | Critério de prova | Status |
|------|-------------------|--------|
| Isolamento | Cliente com `llm_intent_enabled = false` → zero chamadas ao classificador LLM | 🔴 |
| Timeout sem bloqueio | LLM demorando > 2s → flow principal responde normalmente, `fallback_used: true` no log | 🔴 |
| Schema inválido | Resposta LLM fora do schema Zod → `fallback_used: true`, nenhuma automação de `intent_detected` dispara | 🔴 |
| Threshold | `confidence = 0.79` com `llm_intent_threshold = 0.80` → regra NÃO executa | 🔴 |
| Budget | Cliente com custo LLM diário excedido → classificador desabilitado, keyword assume | 🔴 |

---

## 9. Schema de Banco

### Resumo de migrations por fase

| Fase | Migration | O que faz |
|------|-----------|-----------|
| 1 | `TIMESTAMP_automation_engine_v2.sql` | Dedupe fields, action_steps, condition_tree, deprecar SQL fn |
| 2 | `TIMESTAMP_push_tokens_check.sql` | Verificar se `push_tokens` precisa de campo `client_id` |
| 3 | Nenhuma nova tabela | Lógica no webhook Stripe |
| 4 | `TIMESTAMP_scheduled_actions.sql` | `crm_scheduled_actions` + silence window em `crm_settings` |
| 5 | `TIMESTAMP_llm_settings.sql` | `llm_intent_enabled` em `crm_settings` |

> **Regra:** Nunca executar DDL diretamente no Supabase Dashboard.
> Sempre via `supabase migration new` + `supabase db push`.

---

## 10. Endpoints

### Novos endpoints (com regra de segurança aplicada)

| Método | Path | Fase | Auth |
|--------|------|------|------|
| `GET` | `/api/cron/inactivity-check` | 1 | `CRON_SECRET` header |
| `POST` | `/api/crm/automation-rules/simulate` | 4 | sessão |
| `GET` | `/api/crm/automation-rules/[id]/executions` | 4 | sessão |
| `PATCH` | `/api/crm/automation-rules/reorder` | 4 | sessão |
| `GET` | `/api/crm/scheduled-actions` | 4 | sessão |
| `DELETE` | `/api/crm/scheduled-actions/[id]` | 4 | sessão |

### Endpoints com fix necessário

| Método | Path | Fix |
|--------|------|-----|
| `GET` | `/api/crm/automation-rules` | Remover `clientId` de query → usar sessão |
| `POST` | `/api/crm/automation-rules` | Remover `clientId` de body → usar sessão |
| `POST` | `/api/stripe/webhooks` | Emitir `payment_completed` com resolução por `card_id` |
| `POST` | `/api/crm/cards/[id]/move` | Emitir `card_moved` + no-op guard |

### Regra de segurança (obrigatória em todos os novos endpoints)

```typescript
// Template padrão para TODOS os endpoints de CRM
export async function GET(request: NextRequest) {
  const clientId = await getClientIdFromSession(request as any)
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // NUNCA: const clientId = searchParams.get('clientId')
  // NUNCA: const { clientId } = await request.json()
}
```

---

## 11. Arquivos a Modificar por Fase

### Fase 1

```
src/lib/crm-automation-engine.ts          ← NOVO (esqueleto com emit, dedupe, loop guard)
src/lib/jobs/inactivity-check.ts          ← NOVO
src/app/api/cron/inactivity-check/route.ts ← NOVO
src/app/api/crm/automation-rules/route.ts  → fix segurança clientId
src/app/api/crm/cards/[id]/move/route.ts   → emitir card_moved
src/lib/crm-automation-constants.ts        → card_moved, is_first_message
vercel.json                                → adicionar cron entry
supabase/migrations/TIMESTAMP_*.sql        → campos dedupe, action_steps, deprecar fn SQL
```

### Fase 2

```
src/lib/crm-automation-engine.ts  → executores: keyword, send_message (+ 24h policy), notify_user, action_steps
src/flows/chatbotFlow.ts          → Node 5: emitir keyword_detected; Node 3: emitir first_message
src/lib/crm-automation-constants.ts → keyword_detected, send_message, notify_user
```

### Fase 3

```
src/app/api/stripe/webhooks/route.ts      → emitir payment_completed + resolver card_id
src/app/api/stripe/checkout/route.ts      → incluir card_id em metadata
src/lib/crm-automation-engine.ts          → executor payment_completed
src/lib/crm-automation-constants.ts       → payment_completed + variáveis
```

### Fase 4

```
src/lib/crm-automation-engine.ts                       → dry_run mode, delay → scheduled_actions
src/components/crm/AutomationRuleHistory.tsx           ← NOVO
src/components/crm/AutomationRuleEditor.tsx            → suporte action_steps, condition_tree UI
src/app/api/crm/automation-rules/simulate/route.ts     ← NOVO
src/app/api/crm/automation-rules/[id]/executions/route.ts ← NOVO
src/app/api/crm/automation-rules/reorder/route.ts      ← NOVO
src/app/api/crm/scheduled-actions/route.ts             ← NOVO
supabase/migrations/TIMESTAMP_scheduled_actions.sql    ← NOVO
```

### Fase 5

```
src/lib/crm-intent-classifier.ts   ← NOVO (LLM + Zod schema + fallback)
src/flows/chatbotFlow.ts           → após Node 12: classificar intent se enabled
src/lib/crm-automation-constants.ts → intent_detected, urgency_detected
supabase/migrations/TIMESTAMP_llm_settings.sql ← NOVO
```

---

## 12. Templates por Segmento

Templates importáveis com 1 clique. Cada template usa `action_steps[]` e `condition_tree`.

### Academia / Fitness

| Regra | Trigger | Condition tree | Steps |
|-------|---------|---------------|-------|
| Lead de anúncio | `lead.first_message` | `source_type = meta_ads` | Tag "Anúncio" → Mover "Novos Leads" → Notify |
| Quer saber preço | `keyword_detected` | OR: preço, valor, mensalidade, plano | Tag "Interesse Preço" → Mover "Oportunidade" |
| Quer experimental | `keyword_detected` | OR: experimental, aula grátis, teste | Tag "Quer Experimental" → Mover "Quente" → Notify |
| Risco de churn | `keyword_detected` | OR: cancelar, desistir, não quero | Tag "Risco Churn" → Notify urgente |
| Inativo 3 dias | `lead.inactivity` | `inactive_days >= 3` | Tag "Inativo 3d" → Notify |
| Inativo 7 dias | `lead.inactivity` | `inactive_days >= 7` | Tag "Inativo 7d" → Mover "Reengajamento" → send_message |
| Pediu humano | `crm.transfer_human` | — | update_auto_status → Mover "Atendimento" → Notify |
| Venda fechada | `payment_completed` | — | Mover "Clientes" → Tag "Aluno Ativo" → log_activity |

### Clínica / Saúde

| Regra | Trigger | Condition tree | Steps |
|-------|---------|---------------|-------|
| Quer agendar | `keyword_detected` | OR: agendar, consulta, marcar, horário | Tag "Quer Agendar" → Mover "Agendamento" |
| Tem convênio | `keyword_detected` | OR: convênio, plano de saúde, unimed | Tag "Tem Convênio" |
| Pós-consulta | `keyword_detected` | OR: resultado, exame, retorno | Tag "Pós-Consulta" → Notify |
| Inativo 5 dias | `lead.inactivity` | `inactive_days >= 5` | Notify responsável |
| Venda fechada | `payment_completed` | — | Mover "Pacientes" → Tag "Paciente Ativo" |

### Escola / Educação

| Regra | Trigger | Condition tree | Steps |
|-------|---------|---------------|-------|
| Quer matrícula | `keyword_detected` | OR: matrícula, inscrição, vaga, turma | Tag "Interesse Matrícula" → Mover "Quente" |
| Quer bolsa | `keyword_detected` | OR: bolsa, desconto, financiamento | Tag "Quer Bolsa" → Notify |
| Inativo 5 dias | `lead.inactivity` | `inactive_days >= 5` | send_message follow-up |
| Venda fechada | `payment_completed` | — | Mover "Alunos" → Tag "Matriculado" |

---

## 13. KPIs e Critérios de Aceite

### Critérios de aceite técnicos por fase

**Fase 1**
- [ ] Mesmo webhook reenviado 3x → regra executa apenas 1x (dedupe via `event_hash`)
- [ ] Regra `card_moved` → `move_to_column` para mesma coluna → no-op, sem loop
- [ ] Regra com `depth = 4` → abortada com log `loop_guard_depth_exceeded`
- [ ] `GET /api/crm/automation-rules` sem sessão → 401 (não aceita `clientId` por query)
- [ ] Job de inatividade processa cards sem disparar para clientes sem regra ativa
- [ ] Função SQL `process_crm_automation_rules` renomeada, nenhuma rota a chama

**Fase 2**
- [ ] Mensagem "quanto custa" → `keyword_detected` dispara em < 200ms sem query ao banco
- [ ] `send_message` fora janela 24h com `message_type: "text"` → skip com `skip_reason`
- [ ] `send_message` fora janela 24h com `fallback_template_id` → usa template
- [ ] `notify_user` usa `push_tokens` existente, não cria tabela duplicada
- [ ] Regra com 3 steps: step 2 falha → step 3 executa (se `on_error: "continue"`)

**Fase 3**
- [ ] Checkout criado com `card_id` em metadata → webhook resolve card corretamente
- [ ] Checkout sem `card_id` em metadata → tenta fallback por phone → loga evento sem card
- [ ] `payment_completed` → card movido para coluna correta em < 5s

**Fase 4**
- [ ] Simulador retorna regras que disparariam sem side effects (nenhum insert em executions)
- [ ] Reordenação salva e próxima execução respeita nova ordem
- [ ] Histórico mostra `skip_reason`, `depth`, `source` por execução

**Fase 5**
- [ ] LLM com timeout → fallback, flow não bloqueia
- [ ] Resposta LLM fora do schema Zod → fallback, log de erro
- [ ] `confidence = 0.79` com threshold `0.80` → regra NÃO dispara

### KPIs de negócio

| KPI | Meta |
|-----|------|
| Tempo até primeiro atendimento | < 2 minutos |
| Taxa de leads classificados automaticamente | > 60% |
| Taxa de conversão por campanha (mensurável) | Rastreável no dashboard |
| Leads recuperados por inatividade | > 10% dos inativos |
| % execuções com erro | < 5% por regra |
| Execuções duplicadas (dedupe funcionando) | 0% |

### Ordem de execução recomendada

```
Fase 1 → imediato  (corrige segurança + liga inatividade + schema novo)
Fase 2 → próximo   (núcleo comercial)
Fase 3 → após F2   (conecta receita)
Fase 4 → após F3   (confiança operacional)
Fase 5 → opcional  (só com F1–F4 estáveis por > 1 semana)
```

---

## 14. Go-Live Readiness Board

> Este é o painel final de aprovação antes de considerar o sistema "pronto para produção com clientes reais".
> Copiar e preencher antes de cada go-live de fase.

---

### Como usar

1. Ao finalizar a implementação de uma fase, preencher a coluna "Evidência"
2. Submeter para revisão de outro dev ou do responsável do projeto
3. Só marcar ✅ após alguém além do implementador ter validado a evidência
4. Registrar data de aprovação

---

### Board — Fase 1

| # | Requisito | Evidência esperada | Aprovado por | Data |
|---|-----------|-------------------|-------------|------|
| G1 | Motor TS canônico | Output de `grep -r "_deprecated_process_crm" src/` mostra a fn renomeada | — | — |
| G2 | Idempotência | Screenshot de `crm_rule_executions` com 1 `success` + 2 `skipped` para mesmo `event_hash` | — | — |
| G3 | Loop guard | Log mostrando `loop_guard_depth_exceeded` ao tentar depth > 3 | — | — |
| G4 | Job inatividade | Log do cron mostrando cards processados + entradas em `crm_rule_executions` com `source: inactivity_job` | — | — |
| G8 | Segurança tenant | Request com `clientId` de outro tenant no query → response contém apenas dados do tenant da sessão | — | — |
| — | Migrations aplicadas | `supabase db push` sem erros, colunas novas visíveis no Supabase Dashboard | — | — |
| — | Função SQL renomeada | Query `SELECT proname FROM pg_proc WHERE proname = 'process_crm_automation_rules'` retorna zero rows | — | — |

**Status Fase 1:** 🔴 Não iniciada

---

### Board — Fase 2

| # | Requisito | Evidência esperada | Aprovado por | Data |
|---|-----------|-------------------|-------------|------|
| G5 | Policy 24h | Log de `skip_reason: whatsapp_window_closed_text_requires_template` em `crm_rule_executions` | — | — |
| G6 | JsonLogic válido | `POST /api/crm/automation-rules` com JSON inválido → HTTP 400 com body `{ error: "condition_tree inválido: ..." }` | — | — |
| — | Keyword em memória | Perfil de query no Supabase: zero queries à tabela `crm_automation_rules` durante processamento de mensagem com keyword | — | — |
| — | Multi-step com falha | Log mostrando step 1 success, step 2 failed, step 3 success (com `on_error: "continue"`) | — | — |
| — | Push via tabela existente | `SELECT * FROM push_tokens WHERE user_id = [assigned_to]` retorna token; notificação entregue | — | — |

**Status Fase 2:** 🔴 Bloqueada (aguarda Fase 1)

---

### Board — Fase 3

| # | Requisito | Evidência esperada | Aprovado por | Data |
|---|-----------|-------------------|-------------|------|
| G7 | Correlação Stripe | Stripe webhook log → `card_id` resolvido → card movido → log em `crm_rule_executions` em < 5s | — | — |
| — | Fallback sem card_id | Stripe webhook sem `card_id` em metadata → `crm_rule_executions` com `skip_reason: no_card_resolved` | — | — |
| — | Variável `{{amount}}` | Mensagem WhatsApp recebida com valor formatado corretamente (ex: `R$ 99,00`) | — | — |

**Status Fase 3:** 🔴 Bloqueada (aguarda Fase 2)

---

### Board — Fase 4

| # | Requisito | Evidência esperada | Aprovado por | Data |
|---|-----------|-------------------|-------------|------|
| — | Simulador sem side effects | Após `POST .../simulate`: zero novas rows em `crm_rule_executions`, zero mensagens no WhatsApp | — | — |
| — | Histórico completo na UI | Screenshot da UI mostrando `skip_reason`, `depth`, `source` para cada execução | — | — |
| — | Reordenação respeitada | Duas regras para mesmo trigger: reordenar → regra B executa antes de A conforme nova prioridade | — | — |
| — | Ação com delay | Row em `crm_scheduled_actions` com `execute_at = NOW() + delay_minutes` e `status: pending` | — | — |

**Status Fase 4:** 🔴 Bloqueada (aguarda Fase 3)

---

### Board — Fase 5 (LLM) — Opcional

| # | Requisito | Evidência esperada | Aprovado por | Data |
|---|-----------|-------------------|-------------|------|
| — | Isolamento por flag | Cliente com flag OFF: zero chamadas ao `crm-intent-classifier` nos logs | — | — |
| — | Timeout sem bloqueio | Simular LLM lento (mock 3s): flow responde normalmente, `fallback_used: true` no resultado | — | — |
| — | Threshold respeitado | Regra com `min_confidence: 0.80`, LLM retorna `0.79` → rule NOT in `crm_rule_executions` | — | — |
| — | Schema inválido → fallback | LLM retorna JSON sem campo `confidence` → `fallback_used: true`, zero automações de intent | — | — |
| — | Budget diário | Simular custo acumulado > `LLM_MAX_COST_PER_DAY` → próxima classificação retorna fallback com `reason: budget_exceeded` | — | — |

**Status Fase 5:** 🔴 Bloqueada (aguarda Fase 4 estável por ≥ 1 semana)

---

### Definição de "Pronto para Produção"

Um sistema está pronto para produção quando:

1. ✅ Todos os gates da fase correspondente estão aprovados
2. ✅ Nenhum teste de aprovação foi auto-aprovado pelo mesmo dev que implementou
3. ✅ Migration aplicada em ambiente de staging sem erros antes de produção
4. ✅ Rollback documentado: "se algo falhar, o que desfazer?"
5. ✅ Monitoramento ativo: `/dashboard/backend` + query em `crm_rule_executions` nas primeiras 24h

---

## 15. Contratos Enterprise

> Esta seção define os 6 contratos de confiabilidade que elevam o engine de
> "funciona" para "opera com segurança em produção multi-tenant".
> Cada contrato tem: problema, solução técnica com código, migration SQL quando
> necessário, e referência ao gate que o comprova (Seção 0).

---

### 15.1 — Concorrência por Card

**Gate de referência:** G9 (Fase 1)

#### Problema

Quando dois webhooks chegam simultaneamente para o mesmo `card_id` (ex: mensagem
recebida + status mudou ao mesmo tempo), o engine pode processar as duas regras
em paralelo, causando:

- `crm_card_tags` com tags duplicadas (UNIQUE viola ou silenciosamente ignora)
- `crm_cards.column_id` sobrescrito pela execução que terminou por último
- `crm_rule_executions` com `depth` incorreto (lidas antes de cada uma incrementar)

#### Solução — Advisory Lock por `card_id`

O Supabase PostgreSQL suporta **advisory locks** por sessão ou por transação.
O engine deve adquirir um lock por `card_id` antes de processar qualquer
`action_step` que modifique o card.

```typescript
// src/lib/crm-engine/card-lock.ts

export const withCardLock = async <T>(
  supabase: SupabaseClient,
  cardId: string,
  fn: () => Promise<T>
): Promise<T> => {
  // Converte UUID para bigint deterministicamente (primeiros 8 bytes)
  const lockKey = uuidToLockKey(cardId)

  // Adquire advisory lock (bloqueia se outro processo já tem o lock)
  const { error: lockError } = await supabase.rpc('pg_try_advisory_xact_lock', {
    key: lockKey,
  })

  if (lockError) {
    // Lock não adquirido → outro processo está processando este card
    // Retornar skip para evitar processamento duplicado
    throw new CardLockConflictError(`Card ${cardId} locked by concurrent process`)
  }

  return fn()  // Lock liberado automaticamente ao fim da transação
}

// Converte os primeiros 8 bytes do UUID para bigint (sem colisões para UUIDs v4)
const uuidToLockKey = (uuid: string): bigint => {
  const hex = uuid.replace(/-/g, '').substring(0, 16)
  return BigInt('0x' + hex)
}
```

**Uso no engine:**

```typescript
// src/lib/crm-engine/automation-engine.ts

export const processRuleForCard = async (
  supabase: SupabaseClient,
  event: CrmEvent,
  rule: AutomationRule
): Promise<RuleExecutionResult> => {
  try {
    return await withCardLock(supabase, event.cardId, async () => {
      // Todo processamento de action_steps ocorre dentro do lock
      return await executeActionSteps(supabase, event, rule)
    })
  } catch (err) {
    if (err instanceof CardLockConflictError) {
      return { status: 'skipped', skipReason: 'card_locked_concurrent_process' }
    }
    throw err
  }
}
```

**Por que advisory lock e não SELECT FOR UPDATE?**

`SELECT FOR UPDATE` exige que o card exista e que a transação envolva a linha.
Advisory locks funcionam mesmo quando a ação não modifica o card diretamente
(ex: só adiciona tag ou envia mensagem). São mais flexíveis e têm overhead menor.

**Alternativa em fila (Fase 2+):**

Para volumes altos (> 50 eventos/s por tenant), substituir o advisory lock por
uma fila por `card_id` via Redis `LPUSH`/`BRPOP` com consumer single-threaded
por card. Isso elimina o lock no banco e melhora o throughput.

---

### 15.2 — Política de Retry + DLQ

**Gate de referência:** G10 (Fase 2)

#### Problema

Ações externas (`send_message`, `notify_user`) podem falhar por razões transitórias:
rate limit do WhatsApp, timeout de rede, serviço temporariamente indisponível.
Sem retry, uma falha transitória descarta a ação silenciosamente.
Sem DLQ, falhas permanentes se perdem sem diagnóstico.

#### Solução

**Tabela DLQ:**

```sql
-- Migration: supabase migration new crm_action_dlq

CREATE TABLE crm_action_dlq (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id),
  execution_id  UUID REFERENCES crm_rule_executions(id),
  card_id       UUID,
  rule_id       UUID REFERENCES crm_automation_rules(id),
  step_index    INTEGER NOT NULL,
  action_type   TEXT NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}',
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  final_error   TEXT,         -- preenchido quando esgota tentativas
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ,
  exhausted_at  TIMESTAMPTZ   -- preenchido quando abandona
);

CREATE INDEX idx_crm_dlq_next_retry
  ON crm_action_dlq(next_retry_at)
  WHERE exhausted_at IS NULL;

CREATE INDEX idx_crm_dlq_client
  ON crm_action_dlq(client_id, created_at DESC);
```

**Lógica de retry com backoff exponencial:**

```typescript
// src/lib/crm-engine/retry-policy.ts

export const RETRY_CONFIG = {
  send_message: { maxAttempts: 3, baseDelayMs: 5_000 },
  notify_user:  { maxAttempts: 3, baseDelayMs: 10_000 },
  scheduled_action: { maxAttempts: 2, baseDelayMs: 60_000 },
} satisfies Record<string, RetryConfig>

export const calcNextRetry = (
  actionType: string,
  attempts: number
): Date | null => {
  const config = RETRY_CONFIG[actionType]
  if (!config || attempts >= config.maxAttempts) return null

  // Backoff exponencial com jitter: delay * 2^attempt * (0.75 + rand * 0.5)
  const jitter = 0.75 + Math.random() * 0.5
  const delayMs = config.baseDelayMs * Math.pow(2, attempts) * jitter

  return new Date(Date.now() + delayMs)
}

export const sendToDeadLetterQueue = async (
  supabase: SupabaseClient,
  params: {
    clientId: string
    executionId: string | null
    cardId: string | null
    ruleId: string
    stepIndex: number
    actionType: string
    actionParams: Record<string, unknown>
    attempts: number
    lastError: string
    nextRetryAt: Date | null
  }
): Promise<void> => {
  const supabaseAny = supabase as any

  if (params.nextRetryAt) {
    // Ainda tem tentativas — agendar retry
    await supabaseAny.from('crm_action_dlq').insert({
      client_id:    params.clientId,
      execution_id: params.executionId,
      card_id:      params.cardId,
      rule_id:      params.ruleId,
      step_index:   params.stepIndex,
      action_type:  params.actionType,
      action_params: params.actionParams,
      attempts:     params.attempts,
      last_error:   params.lastError,
      next_retry_at: params.nextRetryAt.toISOString(),
    })
  } else {
    // Esgotou tentativas — marcar como abandonado
    await supabaseAny.from('crm_action_dlq').insert({
      client_id:    params.clientId,
      execution_id: params.executionId,
      card_id:      params.cardId,
      rule_id:      params.ruleId,
      step_index:   params.stepIndex,
      action_type:  params.actionType,
      action_params: params.actionParams,
      attempts:     params.attempts,
      last_error:   params.lastError,
      final_error:  params.lastError,
      exhausted_at: new Date().toISOString(),
    })
  }
}
```

**Job de retry (Vercel Cron):**

```typescript
// src/app/api/cron/crm-dlq-retry/route.ts
// vercel.json: { "path": "/api/cron/crm-dlq-retry", "schedule": "*/5 * * * *" }

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const supabaseAny = supabase as any

  // Busca items prontos para retry (não exaustos, com next_retry_at no passado)
  const { data: items } = await supabaseAny
    .from('crm_action_dlq')
    .select('*')
    .is('exhausted_at', null)
    .lte('next_retry_at', new Date().toISOString())
    .limit(50)

  for (const item of items ?? []) {
    await retryDlqItem(supabase, item)
  }

  return NextResponse.json({ retried: items?.length ?? 0 })
}
```

**Ações que usam retry:** apenas ações externas.

| Ação | Retry | Razão |
|------|-------|-------|
| `send_message` | ✅ Sim | Rate limit / timeout de rede WhatsApp |
| `notify_user` | ✅ Sim | Push service pode estar lento |
| `scheduled_action` | ✅ Sim | Job pode ter perdido o slot de execução |
| `move_to_column` | ❌ Não | Operação interna, falha = bug → corrigir |
| `add_tag` / `remove_tag` | ❌ Não | Operação interna, idempotente por design |
| `add_note` / `log_activity` | ❌ Não | Falha não é catastrófica; silent drop OK |

---

### 15.3 — Semântica Transacional dos `action_steps`

**Gate de referência:** G11 (Fase 2)

#### Problema

Uma regra com `action_steps` múltiplos pode executar parcialmente:
`move_to_column` OK → `add_tag` OK → `send_message` falha.
Sem tratamento, o card está em estado inconsistente: coluna mudou, tag aplicada,
mas mensagem nunca enviada e o usuário não sabe.

A flag `on_error` por step define o comportamento, mas o campo `compensate`
precisa de contrato explícito.

#### Contrato de `on_error`

```typescript
// src/lib/crm-engine/types.ts

export type OnErrorPolicy = 'continue' | 'stop' | 'compensate'

export interface ActionStep {
  action_type:   string
  action_params: Record<string, unknown>
  on_error:      OnErrorPolicy  // default: 'stop'
}
```

| Valor | Comportamento ao falhar |
|-------|------------------------|
| `continue` | Log do erro, segue para o próximo step |
| `stop` | Interrompe a cadeia, steps restantes não executam |
| `compensate` | Interrompe + executa compensações dos steps anteriores que registraram rollback |

#### Implementação de compensação

Cada `ActionStep` que suporta compensação deve retornar um `CompensationStep`:

```typescript
// src/lib/crm-engine/action-handlers/move-to-column.ts

export const executeMoveToColumn = async (
  supabase: SupabaseClient,
  cardId: string,
  params: { columnId: string }
): Promise<ActionResult> => {
  const supabaseAny = supabase as any

  // Guarda estado anterior para compensação
  const { data: card } = await supabaseAny
    .from('crm_cards')
    .select('column_id')
    .eq('id', cardId)
    .single()

  const previousColumnId = card?.column_id

  await supabaseAny
    .from('crm_cards')
    .update({ column_id: params.columnId })
    .eq('id', cardId)

  return {
    success: true,
    // Compensação: voltar para a coluna anterior
    compensation: previousColumnId
      ? { action_type: 'move_to_column', params: { columnId: previousColumnId } }
      : null,
  }
}
```

**Executor da cadeia com compensação:**

```typescript
// src/lib/crm-engine/action-chain-executor.ts

export const executeActionChain = async (
  supabase: SupabaseClient,
  event: CrmEvent,
  steps: ActionStep[]
): Promise<ChainResult> => {
  const completedSteps: Array<{ stepIndex: number; compensation: CompensationStep | null }> = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    try {
      const result = await executeStep(supabase, event, step, i)
      completedSteps.push({ stepIndex: i, compensation: result.compensation ?? null })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      if (step.on_error === 'compensate') {
        // Executar compensações em ordem reversa
        const compensationsToRun = completedSteps
          .filter(s => s.compensation !== null)
          .reverse()

        for (const cs of compensationsToRun) {
          try {
            await executeStep(supabase, event, cs.compensation!, cs.stepIndex)
          } catch (compErr) {
            // Compensação falhou — logar mas não abortar (melhor esforço)
            console.error(`Compensation failed for step ${cs.stepIndex}:`, compErr)
          }
        }

        return { status: 'compensated', failedStep: i, error: errorMsg, compensationsRan: compensationsToRun.length }
      }

      if (step.on_error === 'stop') {
        return { status: 'partial', failedStep: i, error: errorMsg, completedSteps: completedSteps.length }
      }

      // on_error: 'continue' — logar e seguir
      console.warn(`Step ${i} failed (continuing):`, errorMsg)
    }
  }

  return { status: 'success', completedSteps: completedSteps.length }
}
```

#### Steps que suportam compensação

| Step | Compensação disponível |
|------|----------------------|
| `move_to_column` | ✅ Reverter para coluna anterior |
| `add_tag` | ✅ Remover a tag adicionada |
| `remove_tag` | ✅ Readicionar a tag removida |
| `assign_to` | ✅ Reverter para assignee anterior |
| `send_message` | ❌ Mensagem já enviada; compensação não tem sentido |
| `log_activity` | ❌ Log é auditoria; não reverter |
| `add_note` | ❌ Nota criada; não remover automaticamente |

---

### 15.4 — Versionamento de Regra

**Gate de referência:** G12 (Fase 1)

#### Problema

Quando uma regra é editada (muda o trigger, as condições, ou os steps), as
execuções antigas ficam registradas em `crm_rule_executions` sem indicar qual
versão da regra estava ativa. Isso impossibilita:

- Auditar "a regra X na versão Y causou este comportamento"
- Rollback de regra: saber que versão reverter
- Debug: regra parecia certa, mas há 2 dias era diferente

#### Solução

**Campo `version` na tabela de regras:**

```sql
-- Já existe em crm_automation_rules como INTEGER DEFAULT 1
-- Incrementar via trigger a cada UPDATE
CREATE OR REPLACE FUNCTION increment_rule_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementa apenas quando campos relevantes mudam
  IF (NEW.trigger_type, NEW.condition_tree::text, NEW.action_steps::text)
     IS DISTINCT FROM
     (OLD.trigger_type, OLD.condition_tree::text, OLD.action_steps::text)
  THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_rule_version
  BEFORE UPDATE ON crm_automation_rules
  FOR EACH ROW EXECUTE FUNCTION increment_rule_version();
```

**Campo `rule_version` em `crm_rule_executions`:**

```sql
-- Migration: supabase migration new crm_rule_executions_add_version

ALTER TABLE crm_rule_executions
  ADD COLUMN IF NOT EXISTS rule_version INTEGER NOT NULL DEFAULT 1;
```

**Populado no engine no momento da execução:**

```typescript
// src/lib/crm-engine/automation-engine.ts

const logExecution = async (
  supabase: SupabaseClient,
  params: LogExecutionParams
): Promise<void> => {
  const supabaseAny = supabase as any

  await supabaseAny.from('crm_rule_executions').insert({
    rule_id:      params.ruleId,
    rule_version: params.rule.version,  // ← capturado no momento da execução
    client_id:    params.clientId,
    card_id:      params.cardId,
    event_type:   params.eventType,
    event_hash:   params.eventHash,
    trace_id:     params.traceId,
    depth:        params.depth,
    status:       params.status,
    skip_reason:  params.skipReason ?? null,
    result:       params.result ?? null,
    executed_at:  new Date().toISOString(),
  })
}
```

**Consulta de auditoria:**

```sql
-- Ver qual versão de cada regra causou execuções na última semana
SELECT
  r.name,
  e.rule_version,
  COUNT(*) as executions,
  SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) as errors
FROM crm_rule_executions e
JOIN crm_automation_rules r ON e.rule_id = r.id
WHERE e.executed_at > NOW() - INTERVAL '7 days'
GROUP BY r.name, e.rule_version
ORDER BY r.name, e.rule_version;
```

---

### 15.5 — LGPD / Retenção

**Gate de referência:** G13 (Fase 1)

#### Problema

`crm_rule_executions` acumula dados indefinidamente, incluindo:
- `contact_phone` (dado pessoal — LGPD Art. 5, I)
- `contact_name` (dado pessoal)
- Conteúdo de mensagens em `result` JSONB

Sem TTL, a tabela cresce sem limite e dados pessoais são retidos além do necessário.

#### Solução — TTL de 90 dias

**Job de limpeza (Vercel Cron):**

```typescript
// src/app/api/cron/crm-executions-cleanup/route.ts
// vercel.json: { "path": "/api/cron/crm-executions-cleanup", "schedule": "0 3 * * *" }
// Executa diariamente às 03:00 UTC

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const supabaseAny = supabase as any

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabaseAny
    .from('crm_rule_executions')
    .delete({ count: 'exact' })
    .lt('executed_at', cutoff)
    .in('status', ['success', 'skipped'])  // Manter erros por mais tempo para diagnóstico

  // Erros: reter 180 dias para análise
  const errorCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { count: errorCount } = await supabaseAny
    .from('crm_rule_executions')
    .delete({ count: 'exact' })
    .lt('executed_at', errorCutoff)
    .eq('status', 'error')

  // Limpar DLQ exausto com mais de 30 dias
  const dlqCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabaseAny
    .from('crm_action_dlq')
    .delete()
    .not('exhausted_at', 'is', null)
    .lt('exhausted_at', dlqCutoff)

  return NextResponse.json({ deleted: { executions: count, errors: errorCount } })
}
```

#### Mascaramento de PII em exports e UI

Para a tela `/dashboard/crm/automation-log` e qualquer endpoint que retorne
histórico de execuções, o telefone deve ser mascarado para usuários sem
permissão `admin`:

```typescript
// src/lib/crm-engine/pii-mask.ts

export const maskPhone = (phone: string | null): string => {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return '***'
  // Mostra DDD + primeiros 2 dígitos, mascara o resto
  // ex: 5554992524789 → 5554 9***4789
  const prefix = digits.substring(0, 4)
  const suffix = digits.substring(digits.length - 4)
  return `${prefix} ***${suffix}`
}

export const maskContactInResult = (result: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!result) return null
  return {
    ...result,
    phone: result.phone ? maskPhone(String(result.phone)) : undefined,
    contact_phone: result.contact_phone ? maskPhone(String(result.contact_phone)) : undefined,
  }
}
```

**Política de retenção resumida:**

| Dado | TTL | Razão |
|------|-----|-------|
| Execuções `success`/`skipped` | 90 dias | Dados pessoais, minimização LGPD |
| Execuções `error` | 180 dias | Diagnóstico de bugs pós-produção |
| DLQ exausto | 30 dias | Diagnóstico operacional |
| DLQ pendente | Sem TTL | Aguardando retry — não pode apagar |
| `crm_activity_log` | 1 ano | Auditoria de negócio (maior retenção) |

---

### 15.6 — Rollout Controlado + Kill Switch

**Gate de referência:** G14 (Fase 1)

#### Problema

Ativar o novo engine para todos os tenants simultaneamente é arriscado.
Um bug de edge case pode afetar todos os clientes ao mesmo tempo, sem possibilidade
de rollback rápido sem deploy.

#### Solução — Canary por Tenant + Kill Switch Global

**Tabela de feature flags (se não existir):**

```sql
-- Migration: supabase migration new feature_flags

CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kill switch global do engine CRM
INSERT INTO feature_flags (key, enabled, description)
VALUES ('crm_engine_v2_enabled', FALSE, 'Master switch para o novo engine de automação CRM V2');
```

**Campo de opt-in por tenant:**

```sql
-- Migration: supabase migration new clients_crm_engine_flag

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS crm_engine_v2 BOOLEAN NOT NULL DEFAULT FALSE;
```

**Verificação no engine (dupla guarda):**

```typescript
// src/lib/crm-engine/feature-gate.ts

export const isCrmEngineV2Enabled = async (
  supabase: SupabaseClient,
  clientId: string
): Promise<boolean> => {
  const supabaseAny = supabase as any

  // 1. Kill switch global — se desativado, nenhum tenant usa o engine
  const { data: flag } = await supabaseAny
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'crm_engine_v2_enabled')
    .single()

  if (!flag?.enabled) return false

  // 2. Flag por tenant — opt-in gradual
  const { data: client } = await supabaseAny
    .from('clients')
    .select('crm_engine_v2')
    .eq('id', clientId)
    .single()

  return client?.crm_engine_v2 === true
}
```

**Uso no webhook e no cron:**

```typescript
// src/app/api/cron/inactivity-check/route.ts (e outros entry points)

const engineEnabled = await isCrmEngineV2Enabled(supabase, clientId)

if (engineEnabled) {
  await runAutomationEngineV2(supabase, event)
} else {
  // Fallback: engine legado (SQL function) ou no-op se cliente nunca teve regras
  await runLegacyAutomationEngine(supabase, event)
}
```

**Estratégia de rollout em 3 estágios:**

```
Estágio 1 — Canary (5% dos tenants)
  Selecionar 1-2 tenants internos ou de confiança
  Ativar: UPDATE clients SET crm_engine_v2 = TRUE WHERE id IN ('uuid1', 'uuid2')
  Monitorar 48h: /dashboard/backend + query em crm_rule_executions

Estágio 2 — Beta (25% dos tenants)
  Estágio 1 estável por 48h sem erros novos
  Ativar próximos tenants selecionados
  Monitorar 1 semana

Estágio 3 — GA (100% dos tenants)
  Estágio 2 estável por 1 semana
  Ativar kill switch global: UPDATE feature_flags SET enabled = TRUE WHERE key = 'crm_engine_v2_enabled'
  Opcionalmente: setar DEFAULT TRUE em clients.crm_engine_v2 para novos clientes
```

**Kill switch de emergência (< 30 segundos para ativar):**

```sql
-- Para TODOS os tenants instantaneamente, sem deploy:
UPDATE feature_flags
  SET enabled = FALSE, updated_at = NOW()
  WHERE key = 'crm_engine_v2_enabled';

-- Para um tenant específico:
UPDATE clients
  SET crm_engine_v2 = FALSE
  WHERE id = 'uuid-do-tenant';
```

> ⚠️ **O kill switch não para execuções em andamento.** Ele previne novas
> execuções. Execuções já iniciadas completam ou falham naturalmente.
> Para parar execuções em andamento, seria necessário pausar o cron no painel
> da Vercel (Dashboard → Settings → Cron Jobs).

**Monitoramento de rollout:**

```sql
-- Distribuição atual do engine por tenant
SELECT
  crm_engine_v2,
  COUNT(*) as tenants
FROM clients
GROUP BY crm_engine_v2;

-- Erro rate nas últimas 6h (comparar canary vs restante)
SELECT
  c.crm_engine_v2 as is_v2,
  COUNT(*) as executions,
  SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) as errors,
  ROUND(100.0 * SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) / COUNT(*), 2) as error_pct
FROM crm_rule_executions e
JOIN clients c ON e.client_id = c.id
WHERE e.executed_at > NOW() - INTERVAL '6 hours'
GROUP BY c.crm_engine_v2;
```

---

*PRD v2.3 — 2026-03-30*
*Sistema: UzzApp WhatsApp SaaS — CRM Automation Engine*
