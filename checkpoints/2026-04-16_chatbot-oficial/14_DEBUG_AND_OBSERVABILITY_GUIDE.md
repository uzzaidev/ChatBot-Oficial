# Guia de Debug e Observabilidade — UZZ.AI ChatBot

> **Versão:** Sprint 1 (implementado em 2026-04-20)
> **Referência de código:** commit `57fbe51`

Este documento é o mapa único de tudo que pode ser inspecionado, debugado e monitorado no sistema. Inclui localização exata de cada log, o que cada campo significa e queries prontas para diagnóstico.

---

## Índice

1. [Camadas de observabilidade](#1-camadas-de-observabilidade)
2. [Tabelas de trace (Supabase)](#2-tabelas-de-trace-supabase)
3. [APIs de consulta](#3-apis-de-consulta)
4. [Dashboard visual](#4-dashboard-visual)
5. [Logs de console (Vercel/servidor)](#5-logs-de-console-vercelservidor)
6. [Queries de diagnóstico prontas](#6-queries-de-diagnóstico-prontas)
7. [Mapa de cobertura por estágio do pipeline](#7-mapa-de-cobertura-por-estágio-do-pipeline)
8. [Cenários de debug — passo a passo](#8-cenários-de-debug--passo-a-passo)
9. [Limitações conhecidas](#9-limitações-conhecidas)

---

## 1. Camadas de observabilidade

```
┌────────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — Dashboard visual                                       │
│  /dashboard → TracesWidget → custo hoje + últimas mensagens        │
├────────────────────────────────────────────────────────────────────┤
│  CAMADA 2 — APIs REST (JSON)                                       │
│  GET /api/traces          → lista filtrada de mensagens            │
│  GET /api/traces/[id]     → detalhe completo: RAG + tool calls     │
├────────────────────────────────────────────────────────────────────┤
│  CAMADA 3 — Tabelas Supabase (SQL direto)                          │
│  message_traces           → uma linha por mensagem                 │
│  retrieval_traces         → RAG por mensagem                       │
│  tool_call_traces         → cada tool call emitida                 │
├────────────────────────────────────────────────────────────────────┤
│  CAMADA 4 — Logs de console (Vercel Functions)                     │
│  [trace-logger] *         → erros de escrita nas tabelas           │
│  [chatbotFlow] *          → erros de processamento                 │
│  [GET /api/traces*]       → erros nas APIs                         │
└────────────────────────────────────────────────────────────────────┘
```

**Arquivos que produzem esses logs:**

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/trace-logger.ts` | Escrita em todas as 3 tabelas de trace |
| `src/flows/chatbotFlow.ts` | Instrumentação de estágios e tool calls |
| `src/app/api/traces/route.ts` | API de lista |
| `src/app/api/traces/[id]/route.ts` | API de detalhe |
| `src/components/TracesWidget.tsx` | Widget do dashboard |

---

## 2. Tabelas de trace (Supabase)

### 2.1 `message_traces` — uma linha por mensagem processada

**Acesso:** Supabase Dashboard → Table Editor → `message_traces`

| Coluna | Tipo | O que informa |
|--------|------|---------------|
| `id` | UUID | Identificador único do trace |
| `client_id` | UUID | Tenant (multi-tenant isolation) |
| `phone` | TEXT | Número WhatsApp do usuário |
| `whatsapp_message_id` | TEXT | WAMID do Meta — usado para dedup |
| `conversation_id` | TEXT | ID da conversa no sistema |
| `status` | TEXT | `pending` / `evaluated` / `failed` / `needs_review` / `human_reviewed` |
| `user_message` | TEXT | Mensagem do usuário (sanitizada: CPF, cartão, email mascarados) |
| `agent_response` | TEXT | Resposta enviada pelo bot (sanitizada) |
| `model_used` | TEXT | Modelo usado: `gpt-4o-mini`, `llama-3.3-70b-versatile`, etc. |
| `tokens_input` | INT | Tokens consumidos no prompt |
| `tokens_output` | INT | Tokens gerados na resposta |
| `cost_usd` | DECIMAL | Custo em USD com 8 casas decimais |
| `latency_total_ms` | INT | Tempo total: webhook recebido → resposta enviada |
| `latency_generation_ms` | INT | Só o tempo da chamada LLM |
| `latency_retrieval_ms` | INT | Só o tempo do RAG (pgvector search) |
| `latency_embedding_ms` | INT | Só o tempo de gerar o embedding |
| `webhook_received_at` | TIMESTAMPTZ | Momento de entrada no sistema |
| `normalized_at` | TIMESTAMPTZ | Após parse e normalização da mensagem |
| `context_loaded_at` | TIMESTAMPTZ | Após carregar dados do cliente |
| `embedding_started_at` | TIMESTAMPTZ | Início do embedding |
| `embedding_completed_at` | TIMESTAMPTZ | Fim do embedding |
| `retrieval_started_at` | TIMESTAMPTZ | Início do RAG |
| `retrieval_completed_at` | TIMESTAMPTZ | Fim do RAG |
| `generation_started_at` | TIMESTAMPTZ | Início da chamada LLM |
| `generation_completed_at` | TIMESTAMPTZ | Fim da chamada LLM |
| `sent_at` | TIMESTAMPTZ | Momento em que a resposta foi enviada ao WhatsApp |
| `evaluation_enqueued_at` | TIMESTAMPTZ | Quando entrou na fila de avaliação (Sprint 2+) |
| `metadata` | JSONB | `{ stages: { ... metadata por estágio }, error: "msg se falhou" }` |
| `created_at` | TIMESTAMPTZ | Criação do registro |

**Status possíveis e o que significam:**

| Status | Significado |
|--------|------------|
| `pending` | Processado, aguarda avaliação automática (Sprint 2+) |
| `evaluated` | Avaliado pelo juiz automático |
| `needs_review` | Juiz marcou para revisão humana |
| `human_reviewed` | Revisado por operador |
| `failed` | Erro durante processamento — ver `metadata.error` |

---

### 2.2 `retrieval_traces` — detalhe do RAG por mensagem

**Acesso:** Supabase → `retrieval_traces`

| Coluna | Tipo | O que informa |
|--------|------|---------------|
| `trace_id` | UUID | FK para `message_traces.id` |
| `client_id` | UUID | Tenant |
| `chunk_ids` | TEXT[] | IDs dos chunks retornados pelo pgvector |
| `similarity_scores` | FLOAT[] | Score cosine de cada chunk (ex: `[0.87, 0.81, 0.76]`) |
| `top_k` | INT | Quantos chunks foram buscados |
| `threshold` | FLOAT | Limiar mínimo de similaridade usado |
| `retrieval_strategy` | TEXT | `cosine_top_k` (padrão) |
| `created_at` | TIMESTAMPTZ | Timestamp do retrieval |

> **NULL = RAG não foi chamado** para essa mensagem (ex: mensagem simples, transferência de atendimento).

---

### 2.3 `tool_call_traces` — cada tool call emitida

**Acesso:** Supabase → `tool_call_traces`

| Coluna | Tipo | O que informa |
|--------|------|---------------|
| `trace_id` | UUID | FK para `message_traces.id` |
| `client_id` | UUID | Tenant |
| `tool_name` | TEXT | Nome da tool chamada (ver tabela abaixo) |
| `tool_call_id` | TEXT | ID retornado pelo provider LLM |
| `arguments` | JSONB | Input exato que o LLM mandou para a tool |
| `result` | JSONB | Output que a tool retornou |
| `status` | TEXT | `success` / `error` / `rejected` / `fallback_triggered` |
| `error_message` | TEXT | Detalhe do erro (se `status = error`) |
| `source` | TEXT | `agent` (LLM decidiu) ou `fallback` (extractor automático) |
| `sequence_index` | INT | Ordem de execução (0 = primeira tool da mensagem) |
| `started_at` | TIMESTAMPTZ | Início da execução da tool |
| `completed_at` | TIMESTAMPTZ | Fim da execução da tool |
| `latency_ms` | INT | Tempo de execução da tool |

**Tools mapeadas e seus status possíveis:**

| `tool_name` | `source` possível | `status` possível | Notas |
|-------------|-------------------|-------------------|-------|
| `registrar_dado_cadastral` | `agent`, `fallback` | `success`, `error`, `rejected` | `rejected` = campo inválido ou não permitido; `result.rejected[]` lista motivos |
| `transferir_atendimento` | `agent` | `success`, `error` | Aciona handoff humano |
| `buscar_documento` | `agent` | `success`, `error` | RAG semântico manual |
| `verificar_agenda` | `agent` | `success`, `error` | Consulta calendário |
| `criar_evento_agenda` | `agent` | `success`, `error` | Cria evento no calendário |
| `cancelar_evento_agenda` | `agent` | `success`, `error` | Cancela evento |
| `enviar_resposta_em_audio` | `agent` | `success`, `error`, `rejected` | `rejected` = sem texto para converter |

**O que significa cada `status` de tool:**

| Status | Quando ocorre |
|--------|--------------|
| `success` | Tool executou e salvou/retornou sem erro |
| `error` | Exceção durante execução (DB, API externa, etc.) |
| `rejected` | Input inválido — campo não permitido, formato errado, etc. |
| `fallback_triggered` | `extractContactDataFallback` detectou dados e chamou a tool automaticamente |

---

## 3. APIs de consulta

### `GET /api/traces` — lista de mensagens

**Requer:** usuário autenticado (JWT via Supabase)

**Parâmetros:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limit` | int | 50 | Máximo 200 |
| `offset` | int | 0 | Paginação |
| `from` | ISO string | — | `created_at >= from` |
| `to` | ISO string | — | `created_at <= to` |
| `phone` | string | — | Filtro exato por número |
| `status` | string | — | `pending`, `failed`, etc. |

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "phone": "5548999990000",
      "status": "pending",
      "user_message": "quero saber sobre...",
      "agent_response": "Claro! ...",
      "model_used": "llama-3.3-70b-versatile",
      "tokens_input": 1240,
      "tokens_output": 180,
      "cost_usd": 0.00023400,
      "latency_total_ms": 1820,
      "latency_generation_ms": 1340,
      "latency_retrieval_ms": 210,
      "webhook_received_at": "2026-04-20T14:32:00Z",
      "sent_at": "2026-04-20T14:32:01.82Z",
      "created_at": "2026-04-20T14:32:01.9Z"
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "costTodayUsd": 0.004512
  }
}
```

**Exemplos de uso:**
```bash
# Últimas 10 mensagens com falha
GET /api/traces?status=failed&limit=10

# Mensagens de um número específico hoje
GET /api/traces?phone=5548999990000&from=2026-04-20T00:00:00Z

# Paginação
GET /api/traces?limit=50&offset=50
```

---

### `GET /api/traces/[id]` — detalhe completo

**Retorna o trace + retrieval + todas as tool calls:**

```json
{
  "data": {
    "id": "uuid",
    "phone": "5548999990000",
    "status": "pending",
    "user_message": "...",
    "agent_response": "...",
    "model_used": "llama-3.3-70b-versatile",
    "tokens_input": 1240,
    "tokens_output": 180,
    "cost_usd": 0.00023400,
    "latency_total_ms": 1820,
    "latency_generation_ms": 1340,
    "latency_retrieval_ms": 210,
    "metadata": {
      "stages": {},
      "error": null
    },

    "retrieval": {
      "chunk_ids": ["chunk-abc", "chunk-def"],
      "similarity_scores": [0.87, 0.81],
      "top_k": 5,
      "threshold": 0.78,
      "retrieval_strategy": "cosine_top_k",
      "created_at": "..."
    },

    "tool_calls": [
      {
        "tool_name": "registrar_dado_cadastral",
        "tool_call_id": "call_abc123",
        "arguments": { "dados": { "nome": "Maria", "cpf": "12345678900" } },
        "result": { "saved": ["nome", "cpf"], "rejected": [], "persisted": true },
        "status": "success",
        "error_message": null,
        "sequence_index": 0,
        "source": "agent",
        "latency_ms": 143,
        "started_at": "...",
        "completed_at": "..."
      }
    ]
  }
}
```

---

## 4. Dashboard visual

**Rota:** `/dashboard`

**TracesWidget** (card "Observabilidade"):
- Custo acumulado do dia em USD — puxa de `meta.costTodayUsd` da API
- Últimas 5 mensagens com:
  - Phone mascarado (`5548****00`)
  - Primeiros 40 chars da mensagem do usuário
  - Status com ícone colorido
  - Latência total formatada (`1.2s` ou `340ms`)
  - Custo por mensagem (`$0.00023`)
- Link "Ver todas via API" → abre `/api/traces` em nova aba

**Outros cards existentes (dados de `usage_logs` e `gateway_usage_logs`):**
- Total de Conversas
- Mensagens Enviadas
- Taxa de Resolução
- Custo Total (USD) — período selecionado, não apenas hoje

---

## 5. Logs de console (Vercel/servidor)

**Onde ver:** Vercel Dashboard → projeto → Functions → Logs (ou `npm run dev` local)

**Prefixos de log e o que significam:**

| Prefixo | Arquivo | Quando aparece |
|---------|---------|---------------|
| `[trace-logger] message_traces insert error:` | `src/lib/trace-logger.ts:209` | Falha ao salvar o trace principal |
| `[trace-logger] retrieval_traces insert error:` | `src/lib/trace-logger.ts:231` | Falha ao salvar dados do RAG |
| `[trace-logger] tool_call_traces insert error:` | `src/lib/trace-logger.ts:261` | Falha ao salvar tool calls |
| `[GET /api/traces]` | `src/app/api/traces/route.ts:82` | Erro na API de lista |
| `[GET /api/traces/[id]]` | `src/app/api/traces/[id]/route.ts:73` | Erro na API de detalhe |
| `[extractContactDataFallback]` | `src/nodes/extractContactDataFallback.ts` | Erros no fallback de captura |

> **Nota:** Se as tabelas ainda não existirem (migration não aplicada), o `trace-logger` suprime o erro silenciosamente — ele checa se a mensagem de erro contém o nome da tabela.

---

## 6. Queries de diagnóstico prontas

Execute no **Supabase SQL Editor** (`supabase.com → projeto → SQL Editor`):

### Visão geral das últimas 24h
```sql
SELECT
  DATE_TRUNC('hour', created_at) AS hora,
  COUNT(*) AS mensagens,
  COUNT(*) FILTER (WHERE status = 'failed') AS falhas,
  ROUND(AVG(latency_total_ms)) AS latencia_media_ms,
  ROUND(SUM(cost_usd)::numeric, 6) AS custo_usd
FROM message_traces
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC;
```

### Mensagens mais lentas (top 20)
```sql
SELECT
  phone,
  LEFT(user_message, 60) AS mensagem,
  latency_total_ms,
  latency_generation_ms,
  latency_retrieval_ms,
  model_used,
  created_at
FROM message_traces
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY latency_total_ms DESC
LIMIT 20;
```

### Todas as mensagens com falha + motivo
```sql
SELECT
  id,
  phone,
  LEFT(user_message, 80) AS mensagem,
  metadata->>'error' AS erro,
  created_at
FROM message_traces
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```

### Tool calls por tipo e status (7 dias)
```sql
SELECT
  tool_name,
  source,
  status,
  COUNT(*) AS total,
  ROUND(AVG(latency_ms)) AS latencia_media_ms
FROM tool_call_traces
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY tool_name, source, status
ORDER BY tool_name, total DESC;
```

### Conversas onde o fallback precisou agir (LLM não chamou a tool)
```sql
SELECT
  t.phone,
  LEFT(t.user_message, 80) AS mensagem,
  tc.arguments AS dados_extraidos,
  tc.result AS resultado,
  tc.created_at
FROM tool_call_traces tc
JOIN message_traces t ON t.id = tc.trace_id
WHERE tc.tool_name = 'registrar_dado_cadastral'
  AND tc.source = 'fallback'
ORDER BY tc.created_at DESC;
```

### Campos cadastrais rejeitados (validação falhando)
```sql
SELECT
  tc.arguments,
  tc.result,
  t.phone,
  tc.created_at
FROM tool_call_traces tc
JOIN message_traces t ON t.id = tc.trace_id
WHERE tc.tool_name = 'registrar_dado_cadastral'
  AND tc.status = 'rejected'
ORDER BY tc.created_at DESC
LIMIT 30;
```

### Taxa de captura cadastral por dia
```sql
SELECT
  DATE(created_at) AS dia,
  COUNT(*) FILTER (WHERE status = 'success') AS capturados,
  COUNT(*) AS total_tentativas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
    1
  ) AS taxa_pct
FROM tool_call_traces
WHERE tool_name = 'registrar_dado_cadastral'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY dia
ORDER BY dia DESC;
```

### Custo por tenant (últimas 24h)
```sql
SELECT
  client_id,
  COUNT(*) AS mensagens,
  SUM(tokens_input) AS tokens_in,
  SUM(tokens_output) AS tokens_out,
  ROUND(SUM(cost_usd)::numeric, 6) AS custo_usd
FROM message_traces
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY client_id
ORDER BY custo_usd DESC;
```

### Chunks RAG mais retornados (top chunks por relevância)
```sql
SELECT
  chunk_id,
  COUNT(*) AS vezes_retornado,
  ROUND(AVG(score)::numeric, 3) AS score_medio
FROM (
  SELECT
    UNNEST(chunk_ids) AS chunk_id,
    UNNEST(similarity_scores) AS score
  FROM retrieval_traces
  WHERE created_at > NOW() - INTERVAL '7 days'
) sub
GROUP BY chunk_id
ORDER BY vezes_retornado DESC
LIMIT 20;
```

### Latência do RAG vs geração por mensagem (correlação)
```sql
SELECT
  latency_retrieval_ms,
  latency_generation_ms,
  latency_total_ms,
  model_used,
  created_at
FROM message_traces
WHERE latency_retrieval_ms IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY latency_total_ms DESC
LIMIT 100;
```

---

## 7. Mapa de cobertura por estágio do pipeline

```
Webhook recebido
  → message_traces.webhook_received_at
  → message_traces.phone, whatsapp_message_id, user_message
  
Parse e normalização
  → message_traces.normalized_at
  
Dados do cliente carregados
  → message_traces.context_loaded_at
  
Embedding (se RAG ativo)
  → message_traces.embedding_started_at
  → message_traces.embedding_completed_at
  → message_traces.latency_embedding_ms
  
RAG — busca vetorial
  → message_traces.retrieval_started_at
  → message_traces.retrieval_completed_at
  → message_traces.latency_retrieval_ms
  → retrieval_traces (chunk_ids, similarity_scores, top_k, threshold)
  
Geração LLM
  → message_traces.generation_started_at
  → message_traces.generation_completed_at
  → message_traces.latency_generation_ms
  → message_traces.model_used
  → message_traces.tokens_input, tokens_output, cost_usd
  → message_traces.agent_response
  
Tool calls (0 a N por mensagem)
  → tool_call_traces (uma linha por tool)
    - tool_name, source, status
    - arguments (input), result (output)
    - started_at, completed_at, latency_ms
    - sequence_index (ordem)
  
Fallback de captura cadastral (se ativo)
  → tool_call_traces com source = 'fallback'
  → rodou via setImmediate após a resposta principal
  
Resposta enviada
  → message_traces.sent_at
  → message_traces.latency_total_ms (calculado como: NOW() - startedAt no finish())
  
Falha em qualquer estágio
  → message_traces.status = 'failed'
  → message_traces.metadata.error = "mensagem do erro"
```

---

## 8. Cenários de debug — passo a passo

### Cenário A: "O bot não respondeu uma mensagem"

1. Supabase SQL:
   ```sql
   SELECT id, status, metadata->>'error' AS erro, webhook_received_at, sent_at
   FROM message_traces
   WHERE phone = '55XXXXXXXXXXX'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
2. Se `status = 'failed'` → ver campo `erro`
3. Se `sent_at IS NULL` → pipeline travou antes do envio → ver qual timestamp de estágio é o último preenchido
4. Se nenhuma linha → webhook não chegou ou foi filtrado antes do trace (verificar `/api/webhook` logs no Vercel)

---

### Cenário B: "Bot está lento"

1. API: `GET /api/traces?status=pending&limit=20`
2. Comparar `latency_generation_ms` vs `latency_retrieval_ms` vs `latency_total_ms`
3. Se `latency_generation_ms` domina → problema no provider LLM (Groq/OpenAI)
4. Se `latency_retrieval_ms` domina → RAG lento → verificar índice pgvector em `documents`
5. Se `latency_total_ms - (generation + retrieval + embedding) > 500ms` → overhead em outro nó

---

### Cenário C: "Dado cadastral não foi salvo"

1. Buscar o trace da conversa:
   ```sql
   SELECT id FROM message_traces
   WHERE phone = '55XXXXXXXXXXX'
   ORDER BY created_at DESC LIMIT 1;
   ```
2. Ver tool calls desse trace:
   ```sql
   SELECT tool_name, source, status, arguments, result, error_message
   FROM tool_call_traces
   WHERE trace_id = '[ID DO PASSO 1]'
   AND tool_name = 'registrar_dado_cadastral';
   ```
3. Se **nenhuma linha** → LLM não chamou a tool E fallback também não detectou → revisar prompt ou heurística `hasLikelyContactData`
4. Se `source = 'fallback'` → LLM não chamou, mas extractor salvou ✅
5. Se `status = 'rejected'` → ver `result.rejected[]` para saber qual campo falhou validação
6. Se `status = 'error'` → ver `error_message` → provavelmente erro no RPC `merge_contact_metadata`

---

### Cenário D: "RAG não trouxe a informação certa"

1. Buscar trace da mensagem:
   ```sql
   SELECT r.chunk_ids, r.similarity_scores, r.threshold, r.top_k
   FROM retrieval_traces r
   JOIN message_traces m ON m.id = r.trace_id
   WHERE m.phone = '55XXXXXXXXXXX'
   ORDER BY r.created_at DESC LIMIT 1;
   ```
2. Ver os scores — se todos < 0.80 → chunks não são relevantes o suficiente → melhorar base de conhecimento
3. Se `chunk_ids` é vazio → embedding gerou vetor mas nenhum chunk passou o `threshold`
4. Buscar o conteúdo dos chunks na tabela `documents`:
   ```sql
   SELECT id, LEFT(content, 200) AS trecho, metadata
   FROM documents
   WHERE id = ANY(ARRAY['chunk-abc', 'chunk-def']);
   ```

---

### Cenário E: "Custo está alto inesperadamente"

1. Dashboard → TracesWidget → ver custo hoje
2. Detalhar por hora:
   ```sql
   SELECT DATE_TRUNC('hour', created_at) AS hora,
     COUNT(*) AS msgs,
     SUM(tokens_input + tokens_output) AS tokens,
     ROUND(SUM(cost_usd)::numeric, 6) AS custo_usd
   FROM message_traces
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY hora ORDER BY hora DESC;
   ```
3. Se pico em horário específico → verificar se há mensagens em loop ou spam
4. Comparar `tokens_input` médio — se muito alto → contexto (chat history ou RAG) está inflando o prompt

---

### Cenário F: "Transferência para humano não funcionou"

```sql
SELECT tc.status, tc.arguments, tc.result, tc.error_message, tc.latency_ms
FROM tool_call_traces tc
JOIN message_traces m ON m.id = tc.trace_id
WHERE tc.tool_name = 'transferir_atendimento'
  AND m.phone = '55XXXXXXXXXXX'
ORDER BY tc.created_at DESC LIMIT 5;
```

- `status = 'success'` mas atendimento não chegou → verificar envio de email (Gmail) nos logs do Vercel
- `status = 'error'` → ver `error_message` → provavelmente falha de atualização de status na `clientes_whatsapp`

---

## 9. Limitações conhecidas

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| `latency_total_ms` é calculado no `finish()`, não no `sent_at` | Pode incluir tempo de escrita no DB | Usar `sent_at - webhook_received_at` para latência real de negócio |
| Traces são escritos via `setImmediate` (fire-and-forget) | Se o processo morrer antes do flush, o trace se perde | Aceitável — perda eventual, não blocking |
| `user_message` e `agent_response` truncados em 100.000 chars | Mensagens muito longas cortadas | Extremamente raro no contexto WhatsApp |
| Sanitização PII remove CPF/cartão/email do texto | Análise de conteúdo fica limitada | Intencional — LGPD compliance |
| RLS: se `user_profiles` não existir na env, políticas de tenant não aplicam | Dados expostos entre tenants em ambientes de dev sem a tabela | Só afeta dev local sem migration completa; prod tem `user_profiles` |
| `message_traces` não tem FK hard para `clients` em algumas envs | Integridade referencial pode ser violada | FK condicional via `DO $$` — em prod com `clients` existente, FK é criada |
| Tool calls do `extractContactDataFallback` rodam após a resposta | O trace pode ter `sent_at` mas tool calls ainda processando | Normal — `source = 'fallback'` indica essa origem |

---

*Guia gerado em 2026-04-20 | Sprint 1 — commit `57fbe51` | Próxima atualização: Sprint 2 (avaliações automáticas)*
