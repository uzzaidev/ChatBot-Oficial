# Manual Profissional — CRM Automation V2

**Sistema:** UzzApp WhatsApp SaaS
**Versão:** 2.3 — atualizado pós-fix commit 75fb075
**Data:** 2026-03-31
**Status:** Pronto para operação com observabilidade e troubleshooting
**Princípio:** Determinístico primeiro, LLM depois com guardrails

---

## Índice

1. [Como o Motor Funciona Hoje](#1-como-o-motor-funciona-hoje)
2. [Regras Essenciais de Segurança](#2-regras-essenciais-de-segurança)
3. [Triggers Disponíveis](#3-triggers-disponíveis)
4. [Ações Disponíveis](#4-ações-disponíveis)
5. [Atualizações Importantes já Validadas](#5-atualizações-importantes-já-validadas)
6. [Configuração Mínima Obrigatória](#6-configuração-mínima-obrigatória)
7. [Padrão de Regra Profissional](#7-padrão-de-regra-profissional)
8. [Jornada Completa — Modelo Universal](#8-jornada-completa--modelo-universal)
9. [Pacotes por Segmento](#9-pacotes-por-segmento)
    - [9.1 Academia](#91--academia)
    - [9.2 Escola de Yoga](#92--escola-de-yoga)
    - [9.3 Clínica](#93--clínica)
    - [9.4 Advocacia](#94--escritório-de-advocacia)
10. [LLM: Quando Ligar e Como](#10-llm-quando-ligar-e-como)
11. [Mensagens de Teste Rápidas](#11-mensagens-de-teste-rápidas)
12. [SQL de Observabilidade](#12-sql-de-observabilidade)
13. [Troubleshooting Direto](#13-troubleshooting-direto)
14. [APIs de Automação](#14-apis-de-automação)
15. [Jobs e Crons](#15-jobs-e-crons)
16. [Integrações que Disparam Eventos](#16-integrações-que-disparam-eventos)
17. [Regra de Negociação vs Ganho](#17-regra-de-negociação-vs-ganho)
18. [Definição de "Pronto para Produção"](#18-definição-de-pronto-para-produção)

---

## 1. Como o Motor Funciona Hoje

### Constantes do engine (`src/lib/crm-automation-engine.ts`)

| Constante | Valor | Efeito |
|-----------|-------|--------|
| `MAX_TRACE_DEPTH` | `3` | Profundidade máxima de automações encadeadas antes de parar (loop guard) |
| `RULE_CACHE_TTL_MS` | `5 min` | Cache de regras ativas para evitar query a cada evento |
| `ACTIVITY_LOG_CACHE_TTL_MS` | `5 min` | Cache da tabela `crm_activity_log` |

### Fluxo de execução por evento

```
1. Recebe evento (trigger_type + trigger_data + card_id + client_id)
        ↓
2. Filtra regras ativas por client_id + trigger_type (usa cache 5min)
        ↓
3. Ordena por priority DESC, created_at ASC (maior prioridade primeiro)
        ↓
4. Para cada regra:
   ├─ Adquire lock por card_id (advisory lock — evita race condition)
   ├─ Verifica idempotência: event_hash/dedupe_key em crm_rule_executions
   │   └─ Se já existe row status='success' com mesmo dedupe_key → skip
   ├─ Verifica loop guard: depth <= MAX_TRACE_DEPTH (3)
   │   └─ Se depth > 3 → skip com skip_reason: loop_guard_depth_exceeded
   ├─ Avalia trigger_conditions (keywords, match_mode, inactivity_days, etc.)
   ├─ Avalia condition_tree (JsonLogic — AND/OR complexo)
   │   └─ Se não bate → skip com skip_reason: condition_tree_or_trigger_conditions_false
   ├─ Executa action_steps[] em ordem com on_error por step
   └─ Registra em crm_rule_executions (status, skip_reason, rule_version, trace_id, depth)
```

### Status possíveis em `crm_rule_executions`

| Status | Significado |
|--------|-------------|
| `success` | Todos os steps executaram sem erro |
| `skipped` | Regra pulada (ver skip_reason) |
| `failed` / `error` | Pelo menos um step falhou com `on_error: stop` |
| `partial` | Cadeia interrompida por `on_error: stop` após falha |
| `compensated` | Falha com `on_error: compensate` — rollback executado |

### `skip_reason` — valores completos do engine

| Valor | Causa |
|-------|-------|
| `loop_guard_depth_exceeded` | `depth > 3` — cadeia de automações muito longa |
| `condition_tree_or_trigger_conditions_false` | Condições da regra não satisfeitas |
| `duplicate_event` | Mesmo `dedupe_key` já tem `status='success'` para esta regra |
| `no_action_steps` | Regra sem steps configurados |
| `whatsapp_window_closed_text_requires_template` | `send_message` com `type=text` e janela 24h fechada |
| `notify_user_no_assignee` | Card sem responsável para `target=assigned_to` |
| `notify_user_no_active_users` | Nenhum usuário ativo no tenant |
| `notify_user_invalid_target` | `target` inválido |
| `notify_user_no_push_tokens_or_delivery_failed` | Sem tokens de push cadastrados |
| `card_locked_concurrent_process` | Outro processo já tem o lock do card |

### Onde cada componente vive

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/crm-automation-engine.ts` | Engine principal: `emitCrmAutomationEvent()`, `simulateCrmAutomationEvent()`, `retryCrmAutomationDlqBatch()`, `runDueScheduledCrmActions()` |
| `src/lib/crm-automation-constants.ts` | Definição de todos os triggers e ações |
| `src/lib/crm-intent-classifier.ts` | Classificador LLM com fallback determinístico |
| `src/lib/jobs/inactivity-check.ts` | Lógica do job de inatividade |
| `src/nodes/updateCRMCardStatus.ts` | Integração chatbot → CRM (status + eventos) |
| `src/nodes/captureLeadSource.ts` | Captura origem do lead → evento `lead_source` |

---

## 2. Regras Essenciais de Segurança

| Regra | Detalhe |
|-------|---------|
| **Ganho automático só por `payment_completed`** | `intent_detected` e `keyword_detected` movem para Negociação, NUNCA para Ganho |
| **`on_error: stop` para ações críticas** | `move_to_column`, `assign_to`, `send_message` — falha deve parar a cadeia |
| **`on_error: continue` só para ações acessórias** | `log_activity`, `add_note` — falha não é catastrófica |
| **`on_error: compensate` em cadeias com impacto** | Quando `move_to_column` + outras ações críticas estão na mesma cadeia |
| **Sempre usar `priority`** | Sem priority definida, a ordem de execução é indefinida quando múltiplas regras disparam no mesmo evento |
| **`client_id` sempre da sessão** | Nunca aceitar `client_id` do body ou query string — risco de bypass multi-tenant |
| **Regras de sistema (`is_system=true`) são imutáveis** | A API retorna erro ao tentar editar |

### Ações que suportam compensação (rollback)

| Ação | Compensação |
|------|-------------|
| `move_to_column` | ✅ Reverte para coluna anterior |
| `add_tag` | ✅ Remove a tag adicionada |
| `remove_tag` | ✅ Readiciona a tag removida |
| `assign_to` | ✅ Reverte para assignee anterior |
| `send_message` | ❌ Mensagem já enviada |
| `log_activity` | ❌ Log é auditoria — não reverter |
| `add_note` | ❌ Nota não é revertida automaticamente |
| `notify_user` | ❌ Notificação já enviada |

---

## 3. Triggers Disponíveis

### Triggers determinísticos (preferidos)

| ID | Quando dispara | Variáveis disponíveis em trigger_data |
|----|---------------|--------------------------------------|
| `message_received` | Cliente enviou mensagem | `message_type`, `message_text`, `is_first_message` |
| `message_sent` | Sistema enviou mensagem | `message_type`, `sent_by` |
| `keyword_detected` | Mensagem contém palavra(s)-chave | `message_text`, `detected_keywords[]` |
| `inactivity` | X dias sem resposta do cliente | `inactive_days`, `last_message_date` |
| `status_change` | Status da conversa mudou | `from_status`, `to_status` |
| `lead_source` | Lead de fonte específica | `source_type`, `campaign_name`, `ad_name`, `ad_id`, `contact_name`, `is_first_message` |
| `transfer_human` | Cliente solicitou atendente | `request_text`, `current_status` |
| `card_created` | Novo card criado no CRM | `contact_name`, `phone`, `source_type` |
| `tag_added` | Tag aplicada ao card | `tag_name`, `tag_id` |
| `card_moved` | Card movido entre colunas | `from_column_id`, `from_column_slug`, `to_column_id`, `to_column_slug` |
| `payment_completed` | Pagamento Stripe confirmado | `amount`, `currency`, `stripe_session_id`, `stripe_payment_intent_id`, `customer_email`, `customer_phone`, `product_name`, `payment_date` |

### Condições por trigger (`trigger_conditions`)

**`keyword_detected`**
```json
{
  "keywords": ["preço", "valor", "plano"],
  "match_mode": "any"
}
```
- `keywords`: array ou string separada por vírgula
- `match_mode`: `"any"` (basta uma) ou `"all"` (todas devem aparecer)

**`inactivity`**
```json
{ "inactivity_days": 3 }
```
- Job cron verifica a cada 15 min (Vercel Cron)
- Limite padrão: 500 cards por execução (configurável via query param, máx 2000)

**`status_change`**
```json
{ "from_status": "bot", "to_status": "human" }
```

**`lead_source`**
```json
{ "source_type": "meta_ads" }
```
- Valores: `"meta_ads"`, `"organic"`, `"direct"`, `"referral"`

**`tag_added`**
```json
{ "tag_id": "uuid-da-tag" }
```

**`card_moved`**
```json
{ "from_column_id": "uuid", "to_column_id": "uuid" }
```
- Pode filtrar por origem, destino, ou ambos

### Triggers LLM (opcionais — Fase 5)

> Exigem `llm_intent_enabled = TRUE` nas configurações do tenant. Desligados por padrão.

| ID | Condição | Variáveis disponíveis |
|----|----------|----------------------|
| `intent_detected` | LLM detecta intenção comercial com confiança ≥ threshold | `intent`, `confidence`, `message_text` |
| `urgency_detected` | Mensagem indica urgência | `urgency_level` (`high`/`medium`/`low`), `confidence`, `message_text` |

**`intent_detected` — condições:**
```json
{
  "intent": "close_sale",
  "confidence_min": 0.85
}
```

**`urgency_detected` — condições:**
```json
{
  "urgency_level": "high",
  "confidence_min": 0.85
}
```

### Fallback determinístico do classificador LLM

Quando o LLM está desligado, com timeout ou orçamento esgotado, o classificador usa
estas regras regex (de `src/lib/crm-intent-classifier.ts`):

| Intent | Padrão regex |
|--------|-------------|
| `close_sale` | `/(fechar\|comprar\|pagar\|assinar\|contratar\|matrícula)/i` |
| `schedule_trial` | `/(aula experimental\|agendar\|marcar\|horário\|consulta)/i` |
| `pricing` | `/(preço\|valor\|quanto\|mensalidade\|plano)/i` |
| `cancellation_risk` | `/(cancelar\|desistir\|não quero\|parar)/i` |
| `support_human` | `/(humano\|atendente\|pessoa\|falar com alguém)/i` |

**Urgência por regex:**
- Alta: `/(urgente\|agora\|hoje\|imediat\|rapido\|rápido)/i`
- Média: `/(quando\|prazo\|ainda hoje\|essa semana)/i`

---

## 4. Ações Disponíveis

### Tabela completa com parâmetros

| ID | Parâmetros obrigatórios | Parâmetros opcionais | Retry | Compensável |
|----|------------------------|---------------------|-------|-------------|
| `move_to_column` | `column_id` | — | Não | ✅ |
| `add_tag` | `tag_name` ou `tag_id` | — | Não | ✅ |
| `remove_tag` | `tag_name` ou `tag_id` | — | Não | ✅ |
| `assign_to` | `user_id` | — | Não | ✅ |
| `update_auto_status` | `auto_status` | — | Não | Não |
| `log_activity` | `activity_type`, `content` | — | Não | Não |
| `add_note` | `note_content` | — | Não | Não |
| `send_message` | `message_type` | `content`, `template_id`, `template_params`, `fallback_template_id` | ✅ 3x | Não |
| `notify_user` | `target` | `title`, `body`, `category` | ✅ 3x | Não |

### `update_auto_status` — valores válidos

```
awaiting_attendant | awaiting_client | neutral | resolved | awaiting_response | in_service
```

> ⚠️ **Importante (fix 75fb075):** O engine mapeia `resolved` → `neutral` internamente
> para evitar violação de constraint de banco. Se você configurar `resolved` em uma regra,
> o card receberá `neutral`. Use `neutral` diretamente para evitar confusão.

### `log_activity` — tipos válidos

```
note | event | system
```

### `send_message` — política de 24h

| Cenário | Comportamento |
|---------|--------------|
| `message_type=text`, janela aberta (< 24h) | Envia normalmente |
| `message_type=text`, janela fechada (> 24h) | **Skip** com `skip_reason: whatsapp_window_closed_text_requires_template` |
| `message_type=template`, qualquer janela | Envia normalmente |
| `fallback_template_id` configurado + janela fechada | Usa automaticamente o template de fallback |

### `notify_user` — destinos e categorias

| Parâmetro | Valores |
|-----------|---------|
| `target` | `assigned_to`, `all_admins`, `all_active` |
| `category` | `critical`, `important`, `normal`, `low` |

### Suporte a variáveis em `content`, `note_content`, `title`, `body`

```
{{contact_name}}      → nome do contato
{{phone}}             → telefone formatado
{{column_name}}       → nome da coluna atual
{{tag_name}}          → nome da tag (ações de tag)
{{detected_keywords}} → palavras-chave que dispararam a regra
{{inactive_days}}     → dias de inatividade
{{amount}}            → valor do pagamento
{{currency}}          → moeda do pagamento
{{product_name}}      → produto do pagamento
{{intent}}            → intenção detectada pelo LLM
{{confidence}}        → confiança do LLM (0–1)
```

---

## 5. Atualizações Importantes já Validadas

Estas correções foram aplicadas no commit **75fb075** e já estão em produção:

| # | Correção | Detalhe técnico |
|---|----------|----------------|
| 1 | `log_activity` grava em `crm_activity_log` com fallback seguro | Se a tabela não existir em algum tenant, o engine captura o erro e continua sem quebrar a cadeia |
| 2 | Compatibilidade sem `crm_cards.contact_name` | Engine não assume que a coluna existe — usa fallback silencioso para tenants antigos |
| 3 | Logs de execução com fallback de coluna ausente | Endpoints de log aceitam ausência de colunas novas (backward compat) |
| 4 | Mapeamento `resolved` → `neutral` | `update_auto_status(resolved)` é convertido para `neutral` antes de gravar — evita violação de constraint |
| 5 | `keyword_detected` com `status=success` ✅ | Testado e validado em produção |
| 6 | `intent_detected` com `status=success` ✅ | LLM e fallback regex ambos validados em produção |

---

## 6. Configuração Mínima Obrigatória

Execute nesta ordem antes de ativar qualquer regra:

### Passo 1 — Colunas do funil

Criar em `/dashboard/crm` → **Gerenciar Colunas**:

```
Novos Leads → Qualificação → Negociação → Follow-up → Ganho → Perdido → Pós-venda
```

### Passo 2 — Tags base

```
Anúncio | Orgânico | Lead Quente | Inativo 3d | Inativo 7d | Risco Churn | Comprou
```

### Passo 3 — Toggles gerais (`/api/crm/settings`)

| Toggle | Valor | Efeito |
|--------|-------|--------|
| `auto_create_cards` | `true` | Cria card automaticamente quando novo contato entra |
| `lead_tracking_enabled` | `true` | Preenche `source_type` para regras `lead_source` |
| `auto_tag_ads` | `true` | Tag automática para leads Meta Ads |
| `auto_status_enabled` | `true` | `update_auto_status` funciona |
| `llm_intent_enabled` | `false` | **Manter desligado na semana 1** |
| `llm_intent_threshold` | `0.90` | Threshold inicial conservador quando LLM for ligado |
| `notif_silence_start` | `22:00` | Início da janela de silêncio de notificações |
| `notif_silence_end` | `08:00` | Fim da janela de silêncio |
| `client_timezone` | `America/Sao_Paulo` | Fuso para calcular janela de silêncio |

### Passo 4 — Responsáveis

- Ao menos 1 usuário **admin** ativo
- Pelo menos 1 responsável comercial para `assign_to`

### Passo 5 — Meta API (se usar `send_message`)

- Access Token com permissão `whatsapp_business_messaging`
- Templates aprovados pela Meta para mensagens fora da janela de 24h
- `fallback_template_id` configurado em cada regra de `send_message`

---

## 7. Padrão de Regra Profissional

### Formato JSON completo

```json
{
  "name": "NEG-PRECO-v1",
  "description": "Detecta interesse em preço e move para Negociação",
  "trigger_type": "keyword_detected",
  "trigger_conditions": {
    "keywords": ["preço", "valor", "plano", "mensalidade"],
    "match_mode": "any"
  },
  "condition_tree": null,
  "is_active": true,
  "priority": 75,
  "action_steps": [
    {
      "action_type": "add_tag",
      "action_params": { "tag_name": "Interesse Preço" },
      "on_error": "continue"
    },
    {
      "action_type": "move_to_column",
      "action_params": { "column_id": "UUID_COLUNA_NEGOCIACAO" },
      "on_error": "compensate"
    },
    {
      "action_type": "log_activity",
      "action_params": {
        "activity_type": "status_change",
        "content": "Interesse em preço detectado via keyword: {{detected_keywords}}"
      },
      "on_error": "continue"
    }
  ]
}
```

### Regras de naming

```
[ETAPA]-[OBJETIVO]-v[N]

ACAD-NEG-PRECO-v1          → Academia, move para negociação por preço
CLIN-URG-KEYWORD-v1        → Clínica, urgência por keyword
YOGA-FECH-PAGAMENTO-v1     → Yoga, fechamento por pagamento
ADV-QUAL-AREA-v1           → Advocacia, qualificação por área jurídica
```

### Escala de prioridade

| Faixa | Uso |
|-------|-----|
| 100–90 | Fechamento, pagamento, urgência crítica, compliance |
| 89–70 | Lead quente, negociação ativa, transferência humano |
| 69–50 | Qualificação, origem de lead, primeiro contato |
| 49–30 | Inatividade, reengajamento, follow-up |
| 29–10 | Enriquecimento de tag, logging auxiliar |

### Testando uma regra antes de ativar

Use o endpoint de simulação (dry-run):

```bash
POST /api/crm/automation-rules/simulate

{
  "cardId": "uuid-do-card",
  "triggerType": "keyword_detected",
  "triggerData": {
    "message_text": "quero saber o preço do plano mensal",
    "detected_keywords": ["preço", "plano"]
  }
}
```

Retorna quais regras disparariam e quais seriam puladas com o motivo.

---

## 8. Jornada Completa — Modelo Universal

```
ENTRADA
  lead_source (meta_ads)  →  add_tag(Anúncio) + move_to_column(Qualificação)
  card_created (orgânico) →  add_tag(Orgânico) + move_to_column(Qualificação)
        ↓
INTERESSE COMERCIAL
  keyword_detected (preço/valor/plano)    →  move_to_column(Negociação) + tag
  keyword_detected (agenda/experimental)  →  move_to_column(Negociação) + Lead Quente
  intent_detected (pricing/schedule_trial) →  move_to_column(Negociação) [LLM opcional]
        ↓
PEDIDO DE HUMANO
  transfer_human  →  assign_to + update_auto_status(awaiting_attendant) + notify(critical)
        ↓
INATIVIDADE
  inactivity (3d)  →  add_tag(Inativo 3d) + move_to_column(Follow-up) + notify
  inactivity (7d)  →  add_tag(Inativo 7d) + send_message(template reengajamento)
        ↓
FECHAMENTO REAL
  payment_completed  →  move_to_column(Ganho) + add_tag(Comprou) + log_activity
        ↓
PÓS-VENDA
  payment_completed  →  move_to_column(Pós-venda) + add_tag(Onboarding Pendente)
  message_sent       →  log_activity(Boas-vindas enviadas)
        ↓
CHURN
  keyword_detected (cancelar/pausar)   →  add_tag(Risco Churn) + notify(critical)
  intent_detected (cancellation_risk)  →  add_tag(Risco Churn) + notify(critical) [LLM]
```

---

## 9. Pacotes por Segmento

> Estrutura de colunas padrão (todos os segmentos):
> `Novos Leads → Qualificação → Negociação → Follow-up → Ganho → Perdido → Pós-venda`
>
> Tags base (todos os segmentos):
> `Anúncio | Orgânico | Lead Quente | Inativo 3d | Inativo 7d | Risco Churn | Comprou/Fechou | Quer Falar com Humano`

---

### 9.1 — Academia

**Tags adicionais:** `Interesse Preço`

| ID | Trigger | Condição | Ações principais | Prioridade |
|----|---------|----------|-----------------|-----------|
| ACAD-01 | `lead_source` | `source_type=meta_ads` | add_tag(Anúncio) → Qualificação → log | 80 |
| ACAD-02 | `keyword_detected` | preço,valor,mensalidade,plano,pacote | add_tag(Interesse Preço) → Negociação | 75 |
| ACAD-03 | `keyword_detected` | aula experimental,teste,trial,aula grátis | add_tag(Lead Quente) → Negociação → notify(assigned_to) | 78 |
| ACAD-04 | `keyword_detected` | horário,turno,unidade,endereço,bairro | Negociação → log | 65 |
| ACAD-05 | `inactivity` | days>=3 | add_tag(Inativo 3d) → notify(all_admins) | 40 |
| ACAD-06 | `inactivity` | days>=7 | add_tag(Inativo 7d) → Follow-up → send_message(template) | 30 |
| ACAD-07 | `payment_completed` | — | **Ganho** → add_tag(Comprou/Fechou) → log | 100 |
| ACAD-08 | `keyword_detected` | cancelar,desistir,pausar | add_tag(Risco Churn) → notify(critical) | 90 |

**JSON de exemplo — ACAD-07:**
```json
{
  "name": "ACAD-FECH-PAGAMENTO-v1",
  "trigger_type": "payment_completed",
  "trigger_conditions": {},
  "priority": 100,
  "action_steps": [
    { "action_type": "move_to_column", "action_params": { "column_id": "UUID_GANHO" }, "on_error": "compensate" },
    { "action_type": "add_tag", "action_params": { "tag_name": "Comprou/Fechou" }, "on_error": "continue" },
    { "action_type": "log_activity", "action_params": { "activity_type": "event", "content": "Matrícula concluída — {{product_name}}" }, "on_error": "continue" }
  ]
}
```

---

### 9.2 — Escola de Yoga

**Tags adicionais:** `Aluno Ativo`, `Interesse Modalidade`

| ID | Trigger | Condição | Ações principais | Prioridade |
|----|---------|----------|-----------------|-----------|
| YOGA-01 | `lead_source` | `source_type=meta_ads` | add_tag(Anúncio) → Qualificação | 80 |
| YOGA-02 | `keyword_detected` | aula experimental,aula teste,primeira aula | add_tag(Lead Quente) → Negociação → notify | 78 |
| YOGA-03 | `keyword_detected` | hatha,vinyasa,ashtanga,yin,iniciante | add_tag(Interesse Modalidade) → log | 60 |
| YOGA-04 | `keyword_detected` | horário,manhã,noite,sábado | Negociação → log | 65 |
| YOGA-05 | `inactivity` | days>=3 | add_tag(Inativo 3d) → notify | 40 |
| YOGA-06 | `inactivity` | days>=7 | add_tag(Inativo 7d) → Follow-up → send_message(template) → add_note | 30 |
| YOGA-07 | `payment_completed` | — | **Ganho** → add_tag(Aluno Ativo) → log | 100 |
| YOGA-08 | `keyword_detected` | cancelar,pausar,não vou continuar | add_tag(Risco Churn) → notify(critical) | 90 |

---

### 9.3 — Clínica

**Tags adicionais:** `Quer Agendar`, `Convênio`, `Urgente`, `Paciente Ativo`

> Para urgência: criar **duas regras** — uma com `urgency_detected` (LLM, Fase 5)
> e uma com `keyword_detected` (fallback sempre ativo).

| ID | Trigger | Condição | Ações principais | Prioridade |
|----|---------|----------|-----------------|-----------|
| CLIN-01 | `lead_source` | `source_type=meta_ads` | add_tag(Anúncio) → Qualificação | 80 |
| CLIN-02 | `keyword_detected` | agendar,consulta,retorno,marcar | add_tag(Quer Agendar) → Negociação → notify | 75 |
| CLIN-03 | `keyword_detected` | convênio,plano de saúde,unimed,amil,bradesco | add_tag(Convênio) → log | 60 |
| CLIN-04a | `urgency_detected` (LLM) | urgency_level=high, confidence>=0.85 | add_tag(Urgente) → notify(critical) → Negociação | 95 |
| CLIN-04b | `keyword_detected` | urgente,dor forte,sangramento,emergência | add_tag(Urgente) → notify(critical) → Negociação | 95 |
| CLIN-05 | `transfer_human` | — | assign_to(recepcao) → awaiting_attendant → notify(critical) | 92 |
| CLIN-06 | `inactivity` | days>=3 | add_tag(Inativo 3d) → send_message(template) | 40 |
| CLIN-07 | `payment_completed` | — | **Ganho** → add_tag(Paciente Ativo) → log | 100 |
| CLIN-08 | `message_received` | condition_tree: resultado/exame/retorno | Pós-venda → add_note | 50 |

---

### 9.4 — Escritório de Advocacia

**Tags adicionais:** `Consulta Jurídica`, `Área Específica`, `Urgente`, `Cliente Ativo`

> Fechamento: `payment_completed` (honorários) **ou** webhook de contrato assinado
> configurado como evento equivalente.

| ID | Trigger | Condição | Ações principais | Prioridade |
|----|---------|----------|-----------------|-----------|
| ADV-01 | `lead_source` | `source_type=meta_ads` | add_tag(Anúncio) → Qualificação | 80 |
| ADV-02 | `keyword_detected` | consulta,advogado,processo,causa,jurídico | add_tag(Consulta Jurídica) → Negociação → notify | 75 |
| ADV-03 | `keyword_detected` | trabalhista,civil,família,previdenciário,criminal | add_tag(Área Específica) → assign_to(especialista) → log | 70 |
| ADV-04a | `urgency_detected` (LLM) | urgency_level=high, confidence>=0.85 | add_tag(Urgente) → notify(critical) → Negociação | 95 |
| ADV-04b | `keyword_detected` | liminar,prazo,audiência urgente,tutela | add_tag(Urgente) → notify(critical) → Negociação | 95 |
| ADV-05 | `transfer_human` | — | assign_to(advogado_plantao) → notify → awaiting_attendant | 92 |
| ADV-06 | `inactivity` | days>=3 | add_tag(Inativo 3d) → notify(all_admins) | 40 |
| ADV-07 | `inactivity` | days>=7 | add_tag(Inativo 7d) → Follow-up → send_message(template) → add_note | 30 |
| ADV-08 | `payment_completed` | — | **Ganho** → add_tag(Cliente Ativo) → log | 100 |

---

## 10. LLM: Quando Ligar e Como

### Configuração em `crm_settings`

| Campo | Padrão | Descrição |
|-------|--------|-----------|
| `llm_intent_enabled` | `false` | Master switch por tenant |
| `llm_intent_threshold` | `0.85` | Confiança mínima para trigger disparar |

### Parâmetros do classificador (`src/lib/crm-intent-classifier.ts`)

| Parâmetro | Valor |
|-----------|-------|
| Timeout do LLM | **2 segundos** |
| Orçamento diário padrão | **$2 USD** (env: `LLM_MAX_COST_PER_DAY`) |
| Modelos suportados | OpenAI `gpt-4o-mini`, Groq `llama-3.3-70b-versatile` |
| `reason` quando LLM falha | `"llm_timeout_fallback"`, `"llm_budget_exceeded"`, `"llm_intent_disabled"` |

### Cronograma de ativação recomendado

| Semana | Ação |
|--------|------|
| 1 | `llm_intent_enabled = false` — validar fluxo determinístico completo |
| 2 | Ativar em 1–2 tenants piloto. `threshold = 0.90`. Apenas `cancellation_risk` + `urgency_detected` |
| 3–4 | Monitorar: verificar `intent`, `confidence`, `skip_reason` em `crm_rule_executions` |
| 5+ | Se < 5% falsos positivos: reduzir threshold para `0.85`, ativar `intent_detected: close_sale` |

### Intenções LLM recomendadas por regra

| Intent | Threshold recomendado | Ação |
|--------|--------------------|------|
| `close_sale` | `0.90` (alto — estado sensível) | → Negociação + Lead Quente |
| `schedule_trial` | `0.85` | → Negociação + Lead Quente |
| `pricing` | `0.85` | → Negociação |
| `cancellation_risk` | `0.85` (melhor cedo que tarde) | Tag Risco Churn + notify critical |
| `support_human` | `0.85` | assign_to + awaiting_attendant |

### Monitoramento de LLM

```sql
SELECT
  trigger_data->>'intent' as intent,
  trigger_data->>'confidence' as confidence,
  status,
  skip_reason,
  COUNT(*) as count
FROM crm_rule_executions
WHERE event_type IN ('intent_detected', 'urgency_detected')
  AND executed_at > NOW() - INTERVAL '7 days'
  AND client_id = 'SEU_CLIENT_ID'
GROUP BY 1,2,3,4
ORDER BY count DESC;
```

---

## 11. Mensagens de Teste Rápidas

Use estas mensagens pelo WhatsApp de um número de teste para validar as regras:

| Objetivo | Mensagem | O que deve acontecer |
|----------|----------|---------------------|
| Teste básico de keyword | `pingcrm` | Execução `keyword_detected` com status=success |
| Interesse em preço | `quero saber preço e plano` | Card move para Negociação |
| Aula experimental | `posso fazer uma aula experimental?` | Card move para Negociação + tag Lead Quente |
| Intenção de fechar | `quero contratar hoje` | Card move para Negociação + Lead Quente (NÃO Ganho) |
| Ganho real | Webhook de pagamento Stripe | Card move para Ganho |
| Risco de churn | `estou pensando em cancelar` | Tag Risco Churn + notify critical |
| Urgência | `dor forte preciso urgente` | Tag Urgente + notify critical |

### Endpoint de simulação (sem efeito real)

```bash
curl -X POST /api/crm/automation-rules/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "uuid-do-card",
    "triggerType": "keyword_detected",
    "triggerData": {
      "message_text": "quero saber o preço",
      "detected_keywords": ["preço"]
    }
  }'
```

---

## 12. SQL de Observabilidade

### Últimas execuções (geral)

```sql
SELECT
  executed_at,
  event_type,
  status,
  skip_reason,
  error_message,
  depth,
  rule_version,
  result
FROM crm_rule_executions
WHERE client_id = 'SEU_CLIENT_ID'
ORDER BY executed_at DESC
LIMIT 50;
```

### Falhas recentes

```sql
SELECT
  executed_at,
  event_type,
  status,
  error_message,
  trigger_data,
  skip_reason
FROM crm_rule_executions
WHERE client_id = 'SEU_CLIENT_ID'
  AND status IN ('failed', 'error')
ORDER BY executed_at DESC
LIMIT 30;
```

### Atividades automáticas gravadas

```sql
SELECT
  created_at,
  card_id,
  activity_type,
  description,
  is_automated
FROM crm_activity_log
WHERE client_id = 'SEU_CLIENT_ID'
ORDER BY created_at DESC
LIMIT 50;
```

### Execuções por regra (últimos 7 dias)

```sql
SELECT
  r.name,
  r.priority,
  e.event_type,
  e.status,
  e.skip_reason,
  COUNT(*) as count
FROM crm_rule_executions e
JOIN crm_automation_rules r ON e.rule_id = r.id
WHERE e.client_id = 'SEU_CLIENT_ID'
  AND e.executed_at > NOW() - INTERVAL '7 days'
GROUP BY r.name, r.priority, e.event_type, e.status, e.skip_reason
ORDER BY r.priority DESC, count DESC;
```

### DLQ — ações com retry pendente

```sql
SELECT
  id,
  action_type,
  card_id,
  attempts,
  last_error,
  next_retry_at,
  exhausted_at
FROM crm_action_dlq
WHERE client_id = 'SEU_CLIENT_ID'
  AND exhausted_at IS NULL
ORDER BY next_retry_at ASC;
```

### DLQ — ações abandonadas (exaustas)

```sql
SELECT
  id,
  action_type,
  card_id,
  attempts,
  final_error,
  exhausted_at
FROM crm_action_dlq
WHERE client_id = 'SEU_CLIENT_ID'
  AND exhausted_at IS NOT NULL
ORDER BY exhausted_at DESC
LIMIT 20;
```

### Kill switch — verificar estado do engine

```sql
SELECT key, enabled, updated_at
FROM feature_flags
WHERE key = 'crm_engine_v2_enabled';

SELECT id, name, crm_engine_v2
FROM clients
ORDER BY name;
```

---

## 13. Troubleshooting Direto

### `skip_reason: condition_tree_or_trigger_conditions_false`

**Causa:** A regra foi encontrada, mas as condições não foram satisfeitas.

**Debug:**
1. Verificar `trigger_conditions` — as keywords estão corretas?
2. Verificar `match_mode`: `"any"` vs `"all"` — `"all"` exige todas as palavras
3. Se tem `condition_tree` (JsonLogic), testar o JSON isolado
4. Ver `trigger_data` na row de `crm_rule_executions` — o que chegou no evento?

```sql
SELECT trigger_data, skip_reason
FROM crm_rule_executions
WHERE rule_id = 'UUID_DA_REGRA'
  AND skip_reason = 'condition_tree_or_trigger_conditions_false'
ORDER BY executed_at DESC LIMIT 5;
```

---

### `intent` LLM não dispara

**Verificar em ordem:**
1. `llm_intent_enabled = TRUE` nas configurações do tenant?
2. Orçamento diário esgotado? Ver `reason: "llm_budget_exceeded"` em `crm_rule_executions.result`
3. LLM retornou em < 2s? Timeout? Ver `reason: "llm_timeout_fallback"`
4. `confidence` do resultado ≥ `confidence_min` configurado na regra?
5. Nome do `intent` na regra bate exatamente com o retornado pelo classificador?

**Intents válidos confirmados em código:**
`close_sale`, `schedule_trial`, `pricing`, `cancellation_risk`, `support_human`

---

### Card não move para a coluna esperada

**Verificar em ordem:**
1. Regra está `is_active = true`?
2. `trigger_type` bate com o evento gerado?
3. Outra regra com prioridade maior está sobrescrevendo?
4. Coluna de destino (`column_id`) existe e pertence ao mesmo tenant?
5. Ver `crm_rule_executions` — tem row com `skip_reason`?

---

### Sem log na UI do CRM

**Verificar:**
1. `log_activity` está na `action_steps` da regra?
2. API `/api/crm/automation-executions` retorna as execuções?
3. Tabela `crm_activity_log` existe para este tenant?
4. `is_automated = true` nas rows — filtro da UI pode estar escondendo?

---

### `send_message` não enviou

1. Verificar janela 24h: `last_message_at` do contato está < 24h?
2. Se `message_type=text` e janela fechada → `skip_reason: whatsapp_window_closed_text_requires_template`
3. Template com `message_type=template` e `template_id` correto?
4. Template aprovado no Meta Business Manager?
5. Verificar `crm_action_dlq` — a mensagem pode estar aguardando retry

---

### Notificação não chegou

1. Usuário alvo tem token de push em `push_tokens`?
2. `target` configurado corretamente?
3. Janela de silêncio ativa? Verificar `notif_silence_start`/`end` + `client_timezone`
4. Ver `skip_reason: notify_user_no_push_tokens_or_delivery_failed`
5. Verificar `crm_action_dlq` para retry

---

### `update_auto_status: resolved` não grava

**Causa conhecida (fix 75fb075):** `resolved` é mapeado internamente para `neutral`.
Se você configurou `resolved` como `auto_status`, o card receberá `neutral`.
**Solução:** Use `neutral` diretamente.

---

### Automação "funciona mas não muda CRM"

1. `result` na row de `crm_rule_executions` — o que o engine retornou?
2. `column_id` na ação existe e pertence ao tenant correto?
3. Card existe em `crm_cards` e está ativo?
4. RLS do Supabase — service role está sendo usado nas queries do engine?

---

## 14. APIs de Automação

### `GET /api/crm/automation-executions`

| Parâmetro | Padrão | Máx | Descrição |
|-----------|--------|-----|-----------|
| `status` | `all` | — | `success`, `failed`, `skipped`, `all` |
| `triggerType` | — | — | Filtro por trigger |
| `ruleId` | — | — | Filtro por regra |
| `days` | `7` | `365` | Janela de tempo |
| `limit` | `120` | `500` | Máx de resultados |

**Campos PII:** admins veem tudo. Outros usuários: `phone` mascarado (`5554 ***4789`).

---

### `GET /api/crm/automation-rules/:id/executions`

| Parâmetro | Padrão | Máx |
|-----------|--------|-----|
| `status` | `all` | — |
| `days` | `30` | `365` |
| `limit` | `50` | `200` |

---

### `POST /api/crm/automation-rules` — Criar regra

**Validações:**
- Nome único por tenant
- `trigger_type` deve ser válido (lista em `crm-automation-constants.ts`)
- `condition_tree` validado como JsonLogic se fornecido
- Ao menos uma ação em `action_steps` ou `action_type` (legado)
- Regras com `is_system = true` não podem ser editadas via API

---

### `POST /api/crm/automation-rules/simulate` — Simular (dry-run)

Retorna:
- `rules_matched[]` — regras que disparariam com steps que executariam
- `rules_skipped[]` — regras que não disparariam com motivo
- `dry_run: true` — confirma que nada foi executado

---

### `PATCH /api/crm/automation-rules/reorder` — Reordenar prioridades

```json
{
  "rules": [
    { "id": "uuid-regra-1", "priority": 100 },
    { "id": "uuid-regra-2", "priority": 90 }
  ]
}
```

Executado em transação PostgreSQL com `BEGIN`/`COMMIT`/`ROLLBACK`.

---

## 15. Jobs e Crons

### Crons configurados (Vercel Cron)

| Cron | Schedule | Endpoint | Max Duration | Parâmetros |
|------|----------|----------|-------------|-----------|
| Inatividade | `*/15 * * * *` | `GET /api/cron/inactivity-check` | 60s | `limit` (padrão 500, máx 2000) |
| DLQ Retry | Configurável | `GET /api/cron/crm-dlq-retry` | 60s | `limit` (padrão 50, máx 200) |
| Cleanup | `0 3 * * *` | `GET /api/cron/crm-executions-cleanup` | 60s | — |

**Autenticação:** Bearer token via header `Authorization: Bearer $CRON_SECRET`

### Job de inatividade — o que ele faz

```sql
-- Query principal (src/lib/jobs/inactivity-check.ts)
SELECT
  c.id AS card_id,
  c.client_id,
  c.last_message_at,
  FLOOR(EXTRACT(EPOCH FROM (NOW() - c.last_message_at)) / 86400)::int AS inactive_days
FROM crm_cards c
WHERE c.last_message_at IS NOT NULL
  AND c.last_message_at <= NOW() - INTERVAL '1 day'
  AND EXISTS (
    SELECT 1 FROM crm_automation_rules r
    WHERE r.client_id = c.client_id
      AND r.trigger_type = 'inactivity'
      AND r.is_active = true
  )
ORDER BY c.last_message_at ASC
LIMIT $1
```

**Retorno:**
```typescript
{ scanned: number, emitted: number, skipped: number, errors: number }
```

### Retry DLQ — políticas por ação

| Ação | Max tentativas | Delay base | Estratégia |
|------|---------------|-----------|-----------|
| `send_message` | 3 | 5 segundos | Backoff exponencial + jitter (0.75–1.25x) |
| `notify_user` | 3 | 10 segundos | Backoff exponencial + jitter |
| `scheduled_action` | 2 | 60 segundos | Backoff exponencial + jitter |

### Cleanup — políticas de retenção

| Dado | TTL | Motivo |
|------|-----|--------|
| `crm_rule_executions` status `success`/`skipped` | 90 dias | LGPD — minimização de dados |
| `crm_rule_executions` status `failed`/`error` | 180 dias | Diagnóstico pós-produção |
| `crm_action_dlq` exausto | 30 dias | Diagnóstico operacional |
| `crm_action_dlq` pendente | Sem TTL | Aguardando retry |
| `crm_activity_log` | 1 ano | Auditoria de negócio |

---

## 16. Integrações que Disparam Eventos

### `chatbotFlow.ts` — eventos emitidos por mensagem

Toda mensagem WhatsApp processada pode emitir (via `emitCrmAutomationEvent()`):

| Evento | Condição |
|--------|----------|
| `message_received` | Mensagem recebida do cliente |
| `message_sent` | Mensagem enviada pelo sistema |
| `intent_detected` | LLM classificou intenção com confiança ≥ threshold |
| `urgency_detected` | LLM detectou urgência com confiança ≥ threshold |

### `updateCRMCardStatus.ts` — eventos emitidos por status

| Input `event` | Eventos emitidos |
|---------------|-----------------|
| `message_received` | auto_status → `awaiting_attendant` |
| `message_sent` | auto_status → `awaiting_client` |
| `transfer_human` | auto_status → `awaiting_attendant` + emite `transfer_human` trigger |
| `close_conversation` | auto_status → `neutral` |
| `reopen_conversation` | auto_status baseado em `conversationStatus` |

**Criação automática de card (`ensureCRMCard()`):**
- Ativada quando `auto_create_cards = true` nas configurações
- Emite `card_created` trigger automaticamente
- Coluna padrão: `default_column_id` das configurações ou primeira coluna disponível

### `captureLeadSource.ts` — evento `lead_source`

Emitido quando:
- `referral.ctwa_clid` presente → `source_type = "meta_ads"`
- `referral.source_type === "ad"` → `source_type = "meta_ads"`
- Caso contrário → `source_type = "organic"` / `"direct"` / `"referral"`

### Webhook Stripe — evento `payment_completed`

- Requer `card_id` em `metadata` do Stripe Checkout Session
- Fallback: busca card por `customer_phone`
- Sem `card_id` e sem match por telefone → evento logado sem card, sem erro 500

---

## 17. Regra de Negociação vs Ganho

**Esta regra é inegociável e válida para todos os segmentos:**

| Sinal | Estado correto | Trigger recomendado |
|-------|---------------|---------------------|
| "vamos negociar" | Negociação | `keyword_detected` ou `intent_detected: pricing` |
| "me explica o valor" | Negociação | `keyword_detected` |
| "fechado, manda o link" | Negociação + Lead Quente | `intent_detected: close_sale` (threshold 0.90) |
| "vou pagar agora" (sem pagar) | Negociação + Lead Quente | `intent_detected: close_sale` |
| Pagamento confirmado no Stripe | **Ganho** | `payment_completed` |

**Fluxo correto:**
```
Intenção verbal → Negociação + Lead Quente → (humano finaliza) → payment_completed → Ganho
```

Nunca pular etapas. `payment_completed` é o único gatilho seguro para Ganho automático.

---

## 18. Definição de "Pronto para Produção"

### Checklist técnico

- [ ] Engine V2 ativo: `feature_flags.crm_engine_v2_enabled = true`
- [ ] Fluxo determinístico completo validado (todas as 8–10 regras base)
- [ ] `payment_completed → Ganho` testado com webhook real ou simulado
- [ ] `crm_activity_log` populando corretamente
- [ ] `crm_rule_executions` com histórico visível (sem falhas críticas em 24h)
- [ ] DLQ monitorada: zero items `exhausted_at IS NOT NULL` não investigados
- [ ] Kill switch disponível: `feature_flags` + `clients.crm_engine_v2`
- [ ] `llm_intent_enabled = false` no go-live (LLM só na semana 2+)
- [ ] Crons configurados no `vercel.json`: inactivity, dlq-retry, cleanup
- [ ] CRON_SECRET configurado no Vercel Environment Variables
- [ ] Templates Meta aprovados (se usar `send_message`)
- [ ] Pelo menos 1 admin e 1 responsável comercial configurados

### Rotina operacional

| Frequência | Ação |
|-----------|------|
| Diária | Revisar cards em Negociação, Follow-up, Risco Churn. Verificar DLQ exausta. |
| Semanal | Ver taxa de disparo por regra. Ajustar keywords com falsos positivos. |
| Quinzenal | Limpar regras duplicadas. Revisar naming e prioridades. |
| Mensal | KPIs: tempo 1º contato → Ganho, conversão por origem, recuperação inativos |

---

*Manual v2.3 — atualizado 2026-03-31 (pós-fix 75fb075)*
*Sistema: UzzApp WhatsApp SaaS — CRM Automation Engine*
*Arquivos técnicos de referência:*
*→ Engine: `src/lib/crm-automation-engine.ts`*
*→ Constantes: `src/lib/crm-automation-constants.ts`*
*→ Classificador LLM: `src/lib/crm-intent-classifier.ts`*
*→ PRD completo: `twin-plans/PRD_CRM_AUTOMATION_V2.md`*
