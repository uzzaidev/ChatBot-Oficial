# Macroprocessos — UzzApp

**Produto:** UzzApp WhatsApp SaaS
**Versão:** 1.0
**Data:** 2026-03-31
**Owner:** Pedro Vitor
**Status:** Ativo — documento vivo

> Este documento mapeia os macroprocessos operacionais do **produto UzzApp**.
> Para macroprocessos da empresa UzzAI, ver `MACROPROCESSOS-UZZAI.md`.
>
> **Legenda de automação:**
> `[AUTO]` = totalmente automatizado (agente/cron) |
> `[SEMI]` = requer decisão humana pontual |
> `[MANUAL]` = sem automação — execução manual |
> `[⚠️ HUMANO]` = exige interação humana obrigatória (ex: WhatsApp real)

---

## Visão Geral

| # | Macroprocesso | Processos | Automação | Prioridade |
|---|---------------|-----------|-----------|-----------|
| 1 | [Onboarding de Cliente](#1-onboarding-de-cliente) | 6 | Alta | 🔴 Alta |
| 2 | [Operações do Chatbot](#2-operações-do-chatbot) | 4 | Total | 🔴 Alta |
| 3 | [CRM Automation](#3-crm-automation) | 5 | Alta | 🔴 Alta |
| 4 | [Desenvolvimento e Features](#4-desenvolvimento-e-features) | 4 | Alta | 🔴 Alta |
| 5 | [QA e Validação](#5-qa-e-validação) | 4 | Parcial | 🔴 Alta |
| 6 | [Monitoramento e Observabilidade](#6-monitoramento-e-observabilidade) | 3 | Alta | 🟡 Média |
| 7 | [Gestão Multi-tenant](#7-gestão-multi-tenant) | 3 | Alta | 🟡 Média |
| 8 | [Integrações Externas](#8-integrações-externas) | 4 | Parcial | 🟡 Média |

---

## 1. Onboarding de Cliente

> **Objetivo:** Levar um novo cliente de zero até bot respondendo no WhatsApp com CRM configurado.
> Referência completa: `docs/CHECKLIST_ONBOARDING_CLIENTE.md`

---

### 1.1 Coleta de Informações e Configuração Meta

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Coletar WABA ID, número WhatsApp, Access Token Meta; configurar App Meta; obter Meta Verify Token; configurar telefone no Meta Business Suite |
| **Workflow** | 1. Preencher formulário de dados do cliente → 2. Acessar Meta Business Manager → 3. Criar App ou acessar existente → 4. Obter `META_ACCESS_TOKEN` (System User, não personal) → 5. Configurar número de telefone → 6. Salvar tokens com segurança |
| **Prazo** | Até 2 dias úteis |
| **Saída esperada** | Token Meta válido + número de telefone ativo |
| **Responsável** | Pedro Vitor + cliente |
| **Automação** | `[MANUAL]` — requer acesso ao painel Meta do cliente |
| **Referência** | `docs/GUIA_META_ADS_CONFIGURACAO.md` |

---

### 1.2 Criação do Cliente na Plataforma

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Criar registro em `clients`; configurar Vault com credenciais; definir `META_PHONE_NUMBER_ID`; configurar `WEBHOOK_BASE_URL` |
| **Workflow** | 1. Acessar `/dashboard/admin/clients` → 2. Criar novo cliente → 3. Preencher nome, número, WABA ID → 4. Acessar Vault e adicionar `META_ACCESS_TOKEN`, chave OpenAI/Groq → 5. Testar: `GET /api/test/vault-config?clientId=X` |
| **Prazo** | 30 minutos |
| **Saída esperada** | Cliente ativo com credenciais no Vault |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — interface `/dashboard/admin/clients` |

---

### 1.3 Configuração de Webhook Meta

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Registrar URL do webhook no Meta; configurar `META_VERIFY_TOKEN`; verificar assinatura |
| **Workflow** | 1. URL do webhook: `https://chat.luisfboff.com/api/webhook/{clientId}` → 2. Registrar no Meta App Dashboard → 3. Meta envia GET com `hub.challenge` → 4. Sistema responde → 5. Confirmar verificação no painel Meta |
| **Prazo** | 15 minutos |
| **Saída esperada** | Webhook verificado (ícone verde no Meta Dashboard) |
| **Responsável** | Pedro Vitor |
| **Automação** | `[⚠️ HUMANO]` — requer acesso ao Meta App Dashboard do cliente |

---

### 1.4 Configuração do Prompt e Bot

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Definir persona do bot; configurar prompt do sistema; ajustar temperatura e modelo; testar resposta |
| **Workflow** | 1. Acessar `/dashboard/settings` → 2. Escrever prompt do sistema (persona + regras) → 3. Configurar modelo preferido (Groq/OpenAI) → 4. Testar: `POST /api/test/nodes/ai-response` → 5. Ajustar até satisfatório |
| **Prazo** | 1–2 horas |
| **Saída esperada** | Bot com persona adequada ao segmento do cliente |
| **Responsável** | Pedro Vitor + cliente |
| **Automação** | `[SEMI]` — interface `/dashboard/settings` |

---

### 1.5 Importação de Contatos e Configuração CRM

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Preparar CSV; importar contatos; criar colunas do funil; criar tags base; configurar regras de automação iniciais |
| **Workflow** | 1. Converter Excel → CSV: `node xlsx-to-csv.js arquivo.xlsx` → 2. Verificar formato: telefone com 8–11 dígitos → 3. Importar via `/dashboard/contacts` → 4. Criar colunas e tags em `/dashboard/crm` → 5. Ativar 10 regras base do segmento |
| **Prazo** | 2–4 horas |
| **Saída esperada** | Contatos importados + CRM configurado com funil e regras ativas |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — interface + script CLI para conversão |
| **Referência** | `docs/MANUAL_CRM_AUTOMATION_V2.md` § 19 |

---

### 1.6 Teste End-to-End e Go-Live

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Enviar mensagem de teste real; validar recebimento; validar resposta do bot; validar card CRM criado; validar automação disparou |
| **Workflow** | 1. Enviar WhatsApp de número externo para o número do cliente → 2. Verificar log em `/dashboard/debug` → 3. Verificar card criado em `/dashboard/crm` → 4. Verificar `crm_rule_executions` → 5. Enviar mensagem com keyword configurada → 6. Validar card movido de coluna |
| **Prazo** | 1 hora |
| **Saída esperada** | Bot respondendo + CRM atualizando automaticamente |
| **Responsável** | Pedro Vitor |
| **Automação** | `[⚠️ HUMANO]` — requer envio real de WhatsApp para validação final |

---

## 2. Operações do Chatbot

> **Objetivo:** Garantir o processamento contínuo e correto de todas as mensagens WhatsApp.

---

### 2.1 Processamento de Mensagens (Pipeline 14 Nós)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Receber webhook Meta; processar pipeline; enviar resposta |
| **Workflow** | `WhatsApp → webhook/[clientId] → chatbotFlow.ts → 14 nós → resposta` |
| **Nós do pipeline** | 1. Filter Status → 2. Parse Message → 3. Check/Create Customer → 4. Download Media → 5. Normalize → 6. Push Redis → 7. Save User Message → 8. Batch (30s) → 9. Get History ‖ 10. Get RAG → 11. Generate AI → 12. Format → 13. Send + Save → (14. CRM Events) |
| **Prazo** | < 30 segundos por mensagem (30s = janela de batching) |
| **Saída esperada** | Resposta enviada ao usuário + histórico salvo + CRM atualizado |
| **Responsável** | Sistema — totalmente autônomo |
| **Automação** | `[AUTO]` |

---

### 2.2 Batching e Anti-spam Redis

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Acumular mensagens de 30s no Redis; evitar respostas duplicadas; processar batch único |
| **Workflow** | Mensagem recebida → push para Redis com TTL → aguarda 30s → se nova mensagem chega, reinicia timer → processa tudo junto |
| **Configuração** | `REDIS_URL` em `.env.local`; TTL configurável por cliente |
| **Responsável** | Sistema |
| **Automação** | `[AUTO]` |

---

### 2.3 Handoff Humano

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Detectar trigger de transferência; parar bot; notificar responsável; registrar resumo da conversa; enviar e-mail |
| **Workflow** | Tool call `transferir_atendimento` → status = `humano` → sumarizar conversa → enviar e-mail Gmail → bot para de responder → CRM: `assign_to` + `awaiting_attendant` |
| **Responsável** | Sistema (trigger) + humano (atendimento) |
| **Automação** | `[SEMI]` — bot transfere automaticamente, humano atende |

---

### 2.4 RAG (Base de Conhecimento)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Upload de documentos; chunking e embeddings; busca semântica em contexto de resposta |
| **Workflow** | Upload PDF/TXT em `/dashboard/knowledge` → chunking 500 tokens (20% overlap) → embedding OpenAI → pgvector → busca cosine similarity > 0.8 → top 5 chunks injetados no prompt |
| **Responsável** | Pedro Vitor (upload) + Sistema (busca) |
| **Automação** | `[SEMI]` — upload manual, busca automática |

---

## 3. CRM Automation

> **Objetivo:** Automatizar a jornada do lead do primeiro contato até pós-venda.
> Referência completa: `docs/MANUAL_CRM_AUTOMATION_V2.md`

---

### 3.1 Gestão de Regras de Automação

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Criar, editar, testar e reordenar regras |
| **Workflow** | 1. Acessar `/dashboard/crm` → aba Automações → 2. Criar regra com trigger + condições + action_steps → 3. Simular: `POST /api/crm/automation-rules/simulate` → 4. Ativar → 5. Monitorar execuções |
| **Prazo** | Configuração inicial: 2–4h; ajustes: contínuo |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — interface + simulação automatizada |

---

### 3.2 Engine de Automação (Execução em Tempo Real)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Processar eventos; avaliar regras; executar action_steps; registrar execuções |
| **Ciclo** | Evento → filtrar regras → ordenar por priority → lock por card_id → idempotência → condições → action_steps[] → log |
| **Responsável** | Sistema — `src/lib/crm-automation-engine.ts` |
| **Automação** | `[AUTO]` |

---

### 3.3 Jobs de Automação Agendados (Crons)

| Cron | Schedule | Endpoint | Função |
|------|----------|----------|--------|
| Inatividade | `*/30 * * * *` | `/api/cron/inactivity-check` | Verifica cards sem resposta e dispara trigger `inactivity` |
| Retry DLQ | `*/5 * * * *` | `/api/cron/crm-dlq-retry` | Retenta ações externas que falharam (`send_message`, `notify_user`) |
| Cleanup | `0 3 * * *` | `/api/cron/crm-executions-cleanup` | Limpa logs antigos (90d success, 180d error, 30d DLQ) |
| Scheduled Actions | `*/2 * * * *` | `/api/cron/crm-scheduled-actions` | Executa ações agendadas com atraso |

---

### 3.4 Configuração LLM Intent Classifier

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Ativar/desativar LLM; ajustar threshold; monitorar falsos positivos |
| **Parâmetros** | `llm_intent_enabled`, `llm_intent_threshold` (0–1, padrão 0.85), timeout 2s, orçamento $2/dia |
| **Fallback** | Regex determinístico quando LLM indisponível |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — toggle em `/api/crm/settings` |

---

### 3.5 Monitoramento de Automações

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Revisar execuções, falhas, DLQ; ajustar regras com baixa eficiência |
| **Workflow** | Acessar `/dashboard/crm` → aba Execuções → filtrar por status/trigger → investigar `skip_reason` → corrigir regra |
| **Frequência** | Diária (5min) + semanal (15min) |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — visualização + queries SQL de observabilidade |
| **Referência** | `docs/MANUAL_CRM_AUTOMATION_V2.md` § 12 |

---

## 4. Desenvolvimento e Features

> **Metodologia obrigatória (validada em produção 30/03):**
> Checkpoint antes da janela de contexto do agente acabar.
> Registrar: quais arquivos mudaram, o que mudou, por quê.

---

### 4.1 Ciclo de Feature

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Análise → plano → implementação → teste → merge → documentação |
| **Workflow** | 1. Criar plano: `twin-planner` → 2. Revisar plano com `twin-architect` → 3. Implementar: `twin-coder` → 4. **Checkpoint intermediário** a cada 2h → 5. Testar: `twin-tester` → 6. Documentar: `twin-documenter` → 7. Merge |
| **Regra crítica** | **NUNCA** fazer deploy sem passar pelo processo de QA (§ 5) |
| **Responsável** | Pedro Vitor + Luis |
| **Automação** | `[SEMI]` — agentes Claude Code assistem cada etapa |

---

### 4.2 Database — Migrations

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Criar, revisar e aplicar migrations; nunca DDL direto no Supabase Dashboard |
| **Workflow** | 1. `supabase migration new nome_da_mudanca` → 2. Editar SQL na migration → 3. Testar: `supabase db reset` (local) → 4. Aplicar: `supabase db push` → 5. Commit do arquivo de migration |
| **Regra** | SEMPRE usar migrations — NUNCA executar DDL no Dashboard |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — CLI Supabase |
| **Referência** | `db/MIGRATION_WORKFLOW.md`, `docs/tables/tabelas.md` |

---

### 4.3 Code Review e Qualidade

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Revisão antes de merge; verificação de padrões; análise de segurança |
| **Workflow** | PR aberto → `twin-reviewer` analisa → issues reportados → correções → aprovação → merge |
| **Padrões obrigatórios** | Supabase client (nunca `pg` em serverless); `await` em webhooks; snake_case em tabelas; `client_id` da sessão (nunca do body) |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — `twin-reviewer` + `simplify` skill |

---

### 4.4 Deploy

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Validação pré-deploy; push para main (deploy automático Vercel); monitoramento pós-deploy |
| **Workflow** | 1. Testes passando → 2. `npx tsc --noEmit` (zero erros) → 3. `npm run lint` → 4. `git push origin main` → 5. Monitorar Vercel dashboard → 6. Smoke test em produção (`/api/test/supabase-connection`) |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — Vercel CI/CD automático, validação manual |

---

## 5. QA e Validação

> **Contexto crítico (Pedro, 31/03):** features foram entregues sem teste, resultando em debugging
> noturno. Cultura de testes é inegociável. Testar é parte do desenvolvimento, não etapa opcional.
>
> **Inovação:** este macroprocesso inclui um **workflow de QA automatizado via SQL + CLI** onde
> agentes validam automaticamente os processos e indicam quando é necessária interação humana.

---

### 5.1 QA Automatizado — Workflow SQL via CLI

> **Objetivo:** Agentes de IA executam baterias de testes via SQL e APIs, reportando o que passou,
> o que falhou, e **marcando explicitamente os casos que exigem interação humana** (ex: enviar
> mensagem real no WhatsApp para disparar um trigger).

#### Estrutura do workflow

```
Agente QA inicia
  ↓
Fase 1: Validação de Infraestrutura [AUTO]
  → Conexão Supabase, Redis, Vault
  ↓
Fase 2: Validação de Schema [AUTO]
  → Tabelas existem, colunas corretas, índices presentes
  ↓
Fase 3: Testes de Engine CRM [AUTO]
  → Simular eventos via API, verificar crm_rule_executions
  ↓
Fase 4: Testes que Exigem WhatsApp [⚠️ HUMANO]
  → Agente para e informa o que o humano deve fazer
  ↓
Fase 5: Validação Pós-Interação [AUTO]
  → Verifica resultados após ação humana
  ↓
Relatório final com ✅ / ❌ / ⏳ por cenário
```

---

#### Fase 1 — Infraestrutura [AUTO]

```bash
# Executar via CLI (requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local)

# Teste de conexão Supabase
curl -s http://localhost:3000/api/test/supabase-connection | jq '.status'

# Teste de Vault (client específico)
curl -s "http://localhost:3000/api/test/vault-config?clientId=CLIENT_ID" | jq '.vault_keys'
```

**Critério de sucesso:** `status: "ok"` + todas as chaves Vault presentes

---

#### Fase 2 — Schema do Banco [AUTO]

```sql
-- Verificar tabelas CRM essenciais
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'clients', 'clientes_whatsapp', 'crm_columns', 'crm_cards',
    'crm_tags', 'crm_card_tags', 'crm_automation_rules',
    'crm_rule_executions', 'crm_action_dlq', 'crm_activity_log',
    'feature_flags', 'push_tokens', 'lead_sources'
  )
ORDER BY table_name;
-- Esperado: 13 linhas

-- Verificar colunas críticas adicionadas nas migrations V2
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'crm_rule_executions'
  AND column_name IN (
    'event_hash', 'trace_id', 'depth', 'skip_reason',
    'rule_version', 'result', 'event_type'
  );
-- Esperado: 7 linhas

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'crm_automation_rules'
  AND column_name IN ('condition_tree', 'action_steps', 'version');
-- Esperado: 3 linhas

-- Verificar índice de idempotência
SELECT indexname
FROM pg_indexes
WHERE tablename = 'crm_rule_executions'
  AND indexname = 'uq_crm_rule_exec_success_dedupe';
-- Esperado: 1 linha

-- Verificar trigger de versionamento de regra
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trg_increment_rule_version';
-- Esperado: 1 linha

-- Verificar feature flags
SELECT key, enabled
FROM feature_flags
WHERE key = 'crm_engine_v2_enabled';
-- Esperado: 1 linha com enabled=TRUE

-- Verificar engine V2 ativo por padrão para novos clientes
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'crm_engine_v2';
-- Esperado: 'true'
```

---

#### Fase 3 — Engine CRM (Simulações) [AUTO]

```bash
# Simular evento keyword_detected para card existente
curl -s -X POST http://localhost:3000/api/crm/automation-rules/simulate \
  -H "Content-Type: application/json" \
  -H "Cookie: [session_cookie]" \
  -d '{
    "cardId": "UUID_CARD_TESTE",
    "triggerType": "keyword_detected",
    "triggerData": {
      "message_text": "pingcrm preço plano",
      "detected_keywords": ["pingcrm", "preço", "plano"]
    }
  }' | jq '{
    dry_run: .dry_run,
    matched: (.rules_matched | length),
    skipped: (.rules_skipped | length)
  }'
# Esperado: dry_run=true, matched >= 1
```

```sql
-- Verificar execuções recentes (últimas 24h)
SELECT
  event_type,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures
FROM crm_rule_executions
WHERE client_id = 'CLIENT_ID_TESTE'
  AND executed_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, status
ORDER BY count DESC;

-- Verificar idempotência: mesma chave nunca gera 2 success
SELECT dedupe_key, COUNT(*) as count
FROM crm_rule_executions
WHERE client_id = 'CLIENT_ID_TESTE'
  AND status = 'success'
  AND dedupe_key IS NOT NULL
GROUP BY dedupe_key
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas (nenhuma duplicata)

-- Verificar DLQ sem itens exaustos não investigados
SELECT id, action_type, card_id, attempts, final_error, exhausted_at
FROM crm_action_dlq
WHERE client_id = 'CLIENT_ID_TESTE'
  AND exhausted_at IS NOT NULL
  AND exhausted_at > NOW() - INTERVAL '7 days';
-- Esperado: 0 linhas (ou investigar se > 0)

-- Verificar loop guard funcionando
SELECT trace_id, MAX(depth) as max_depth
FROM crm_rule_executions
WHERE client_id = 'CLIENT_ID_TESTE'
  AND trace_id IS NOT NULL
GROUP BY trace_id
HAVING MAX(depth) > 3;
-- Esperado: 0 linhas (nenhum trace ultrapassou depth=3)
```

---

#### Fase 4 — Testes com WhatsApp Real [⚠️ HUMANO]

> **O agente para aqui e instrui o humano exatamente o que fazer.**
> Após cada ação, o humano confirma e o agente valida o resultado no banco.

```
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️  INTERAÇÃO HUMANA NECESSÁRIA — QA FASE 4                    ║
║                                                                  ║
║  Envie as mensagens abaixo pelo WhatsApp para o número           ║
║  de teste do cliente: +55 [NUMERO_TESTE]                         ║
║                                                                  ║
║  TESTE 4.1 — Criação de card                                     ║
║  → Envie: "Olá, quero saber mais sobre vocês"                    ║
║  → Aguarde 10s                                                   ║
║  → Confirme: card criado em "Novos Leads"? [S/N]                 ║
║                                                                  ║
║  TESTE 4.2 — Keyword trigger                                     ║
║  → Envie: "Qual o preço do plano?"                               ║
║  → Aguarde 35s (batching 30s)                                    ║
║  → Confirme: card moveu para "Negociação"? [S/N]                 ║
║                                                                  ║
║  TESTE 4.3 — Bot respondeu?                                      ║
║  → Confirme: você recebeu resposta do bot? [S/N]                 ║
║                                                                  ║
║  TESTE 4.4 — Transferência para humano                           ║
║  → Envie: "Quero falar com um atendente"                         ║
║  → Confirme: notificação recebida no app? [S/N]                  ║
║                                                                  ║
║  TESTE 4.5 — Mídia (se cliente usa)                              ║
║  → Envie uma foto ou áudio                                       ║
║  → Confirme: bot reconheceu a mídia? [S/N]                       ║
║                                                                  ║
║  Após confirmar cada teste, o agente validará o banco.           ║
╚══════════════════════════════════════════════════════════════════╝
```

---

#### Fase 5 — Validação Pós-Interação [AUTO]

```sql
-- Após Teste 4.1: verificar card criado
SELECT id, column_id, last_message_at, auto_status
FROM crm_cards
WHERE client_id = 'CLIENT_ID_TESTE'
  AND phone = 55_NUMERO_TESTE
  AND created_at > NOW() - INTERVAL '5 minutes';
-- Esperado: 1 linha

-- Após Teste 4.2: verificar trigger keyword_detected
SELECT status, skip_reason, result, executed_at
FROM crm_rule_executions
WHERE client_id = 'CLIENT_ID_TESTE'
  AND event_type = 'keyword_detected'
  AND executed_at > NOW() - INTERVAL '5 minutes'
ORDER BY executed_at DESC LIMIT 5;
-- Esperado: ao menos 1 row com status='success'

-- Após Teste 4.2: verificar card na coluna correta
SELECT col.name as coluna
FROM crm_cards c
JOIN crm_columns col ON c.column_id = col.id
WHERE c.client_id = 'CLIENT_ID_TESTE'
  AND c.phone = 55_NUMERO_TESTE;
-- Esperado: 'Negociação'

-- Após Teste 4.4: verificar log de transferência
SELECT activity_type, description, is_automated, created_at
FROM crm_activity_log
WHERE client_id = 'CLIENT_ID_TESTE'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 5;
-- Esperado: row com activity_type='system' e is_automated=true
```

---

#### Template de Relatório QA

```
════════════════════════════════════
RELATÓRIO QA — UzzApp
Cliente: [NOME]
Data: [DATA]
Executor: [AGENTE/PESSOA]
════════════════════════════════════

FASE 1 — Infraestrutura
  [✅] Conexão Supabase
  [✅] Vault: chaves presentes
  [✅] Redis: conectado

FASE 2 — Schema
  [✅] 13/13 tabelas CRM presentes
  [✅] 7/7 colunas crm_rule_executions
  [✅] Índice de idempotência presente
  [✅] Trigger de versão de regra presente
  [✅] Feature flag engine V2: enabled=TRUE

FASE 3 — Engine CRM
  [✅] Simulação keyword_detected: 2 regras matcharam
  [✅] Idempotência: 0 duplicatas
  [✅] DLQ exausta: 0 itens pendentes
  [✅] Loop guard: 0 traces com depth > 3

FASE 4 — WhatsApp Real [⚠️ HUMANO]
  [✅] 4.1 Card criado automaticamente
  [✅] 4.2 Keyword trigger: card moveu para Negociação
  [✅] 4.3 Bot respondeu
  [⏳] 4.4 Notificação de transferência: aguardando
  [N/A] 4.5 Mídia: não testado nesta sessão

FASE 5 — Pós-Interação
  [✅] Card criado com telefone correto
  [✅] keyword_detected: status=success em crm_rule_executions
  [✅] Card na coluna 'Negociação'
  [✅] Log de atividade criado

RESULTADO GERAL: ✅ APROVADO (18/19 — 1 pendente)
PRÓXIMA BATERIA: [DATA]
════════════════════════════════════
```

---

### 5.2 Testes de Nodes Individuais [AUTO]

Endpoints disponíveis em `src/app/api/test/nodes/`:

```bash
# Executar individualmente via CLI
BASE=http://localhost:3000/api/test/nodes

curl $BASE/filter-status    # Filtro de updates do Meta
curl $BASE/parse-message    # Parse de mensagem
curl $BASE/check-customer   # Check/create customer
curl $BASE/normalize        # Normalização de texto
curl $BASE/chat-history     # Histórico de conversa
curl $BASE/rag-context      # Contexto RAG
curl $BASE/ai-response      # Resposta AI (usa tokens reais)
curl $BASE/format-response  # Formatação da resposta
curl $BASE/push-redis       # Push para Redis
curl $BASE/batch            # Batching
curl $BASE/send-whatsapp    # Envio WhatsApp (⚠️ envia de verdade)
```

**Critério de sucesso:** HTTP 200 em todos, sem `error` no body.

---

### 5.3 Testes de Regressão Pós-Deploy [SEMI]

```bash
# Smoke test imediato após deploy (< 2 minutos)
curl https://chat.luisfboff.com/api/test/supabase-connection
curl https://chat.luisfboff.com/api/health  # se existir

# Verificar crons ativos no Vercel
# Dashboard → Settings → Cron Jobs → confirmar 4 crons ativos
```

```sql
-- Verificar últimas execuções pós-deploy (primeiros 30min)
SELECT
  executed_at,
  event_type,
  status,
  error_message
FROM crm_rule_executions
WHERE executed_at > NOW() - INTERVAL '30 minutes'
ORDER BY executed_at DESC
LIMIT 20;
-- Esperado: sem error_message preenchido
```

---

### 5.4 Bateria de Testes por Segmento [⚠️ HUMANO + AUTO]

> Para cada novo cliente, executar bateria específica do segmento.
> Baseada nas jornadas de `docs/MANUAL_CRM_AUTOMATION_V2.md` § 9.

| Segmento | Mensagens de teste WhatsApp | Resultado esperado |
|----------|----------------------------|-------------------|
| Academia | "quero saber o preço da mensalidade" | Card → Negociação + tag Interesse Preço |
| Academia | "posso fazer uma aula experimental?" | Card → Negociação + tag Lead Quente |
| Yoga | "tenho interesse em hatha yoga" | Tag Interesse Modalidade |
| Clínica | "quero agendar uma consulta" | Card → Negociação + tag Quer Agendar + notify |
| Clínica | "estou com dor forte urgente" | Tag Urgente + notify(critical) |
| Advocacia | "preciso de ajuda com processo trabalhista" | Tag Área Específica + assign especialista |
| Todos | "quero cancelar" | Tag Risco Churn + notify(critical) |
| Todos | [Webhook Stripe teste] | Card → Ganho + tag Comprou |

---

## 6. Monitoramento e Observabilidade

---

### 6.1 Monitoramento em Tempo Real

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Verificar pipeline ativo; logs de webhook; erros em tempo real |
| **Acesso** | `/dashboard/debug` — logs em tempo real; `/dashboard/backend` — métricas do sistema |
| **Responsável** | Pedro Vitor |
| **Automação** | `[AUTO]` — dashboards atualizando em tempo real |

---

### 6.2 Alertas Operacionais

Queries de alerta executadas diariamente:

```sql
-- Webhooks com erro nas últimas 24h
SELECT
  executed_at,
  event_type,
  error_message,
  trigger_data->>'phone' as phone
FROM crm_rule_executions
WHERE executed_at > NOW() - INTERVAL '24 hours'
  AND status IN ('failed', 'error')
ORDER BY executed_at DESC;

-- DLQ exausta — ações que falharam definitivamente
SELECT
  client_id,
  action_type,
  card_id,
  attempts,
  final_error,
  exhausted_at
FROM crm_action_dlq
WHERE exhausted_at > NOW() - INTERVAL '24 hours';

-- Budget de IA: uso por cliente hoje
SELECT
  c.name,
  COUNT(*) as requests,
  SUM(gul.total_tokens) as tokens,
  SUM(gul.cost_brl) as cost_brl
FROM gateway_usage_logs gul
JOIN clients c ON gul.client_id = c.id
WHERE gul.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.name
ORDER BY cost_brl DESC;

-- Verificar crons rodando (última execução esperada)
-- inactivity-check: última < 35 min atrás
-- crm-dlq-retry: última < 10 min atrás
-- crm-scheduled-actions: última < 5 min atrás
```

---

### 6.3 KPIs de Produto (Mensal)

```sql
-- Taxa de conversão por origem de lead
SELECT
  ls.source_type,
  COUNT(DISTINCT c.id) as total_leads,
  COUNT(DISTINCT CASE WHEN col.slug = 'ganho' THEN c.id END) as ganhos,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN col.slug = 'ganho' THEN c.id END)
    / NULLIF(COUNT(DISTINCT c.id), 0), 1) as taxa_conversao_pct
FROM crm_cards c
LEFT JOIN lead_sources ls ON ls.card_id = c.id AND ls.client_id = c.client_id
LEFT JOIN crm_columns col ON c.column_id = col.id
WHERE c.client_id = 'CLIENT_ID'
  AND c.created_at > NOW() - INTERVAL '30 days'
GROUP BY ls.source_type;

-- Tempo médio para Ganho (dias)
SELECT
  AVG(EXTRACT(EPOCH FROM (
    MAX(CASE WHEN col.slug = 'ganho' THEN e.executed_at END) - c.created_at
  )) / 86400) as avg_dias_ate_ganho
FROM crm_cards c
JOIN crm_rule_executions e ON e.card_id = c.id
JOIN crm_columns col ON c.column_id = col.id
WHERE c.client_id = 'CLIENT_ID'
  AND col.slug = 'ganho';

-- Taxa de reengajamento de inativos
SELECT
  COUNT(CASE WHEN status = 'success' THEN 1 END) as disparos_inactividade,
  COUNT(CASE WHEN event_type = 'message_received'
    AND executed_at > (SELECT MIN(e2.executed_at)
      FROM crm_rule_executions e2
      WHERE e2.card_id = e.card_id AND e2.event_type = 'inactivity')
    THEN 1 END) as retornaram
FROM crm_rule_executions e
WHERE client_id = 'CLIENT_ID'
  AND event_type = 'inactivity'
  AND executed_at > NOW() - INTERVAL '30 days';
```

---

## 7. Gestão Multi-tenant

---

### 7.1 Isolamento e Segurança por Tenant

| Campo | Conteúdo |
|-------|---------|
| **Regra inviolável** | `client_id` SEMPRE da sessão autenticada — NUNCA do body, query string ou header externo |
| **RLS** | Policies no Supabase garantem isolamento; `user_profiles` é a tabela de referência (não `auth.users`) |
| **Vault** | Cada cliente tem suas próprias chaves API no Supabase Vault — zero compartilhamento |
| **Automação** | `[AUTO]` — Supabase RLS garante isolamento sem código adicional |

---

### 7.2 Gerenciamento de Credenciais (Vault)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Adicionar, atualizar e revogar chaves API por cliente |
| **Credenciais por cliente** | `META_ACCESS_TOKEN`, `OPENAI_API_KEY` ou `GROQ_API_KEY`, `META_PHONE_NUMBER_ID` |
| **Workflow** | Acessar Supabase → Vault → criar/atualizar secret com nome `client:{id}:{key}` |
| **Teste** | `GET /api/test/vault-config?clientId=X` |
| **Responsável** | Pedro Vitor |
| **Automação** | `[MANUAL]` — interface Supabase Vault |

---

### 7.3 Feature Flags e Rollout Controlado

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Ativar/desativar features por tenant; rollout gradual; kill switch de emergência |
| **Kill switch** | `UPDATE feature_flags SET enabled=FALSE WHERE key='crm_engine_v2_enabled'` — para todos os tenants em < 30s |
| **Por tenant** | `UPDATE clients SET crm_engine_v2=FALSE WHERE id='uuid'` — para tenant específico |
| **Rollout recomendado** | 5% (canary 48h) → 25% (beta 1 semana) → 100% (GA) |
| **Responsável** | Pedro Vitor |
| **Automação** | `[SEMI]` — SQL direto no Supabase |

---

## 8. Integrações Externas

---

### 8.1 Meta WhatsApp Business API

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Manter tokens atualizados; gerenciar templates; monitorar rate limits |
| **Atenção** | Token de 60 dias (`EAA...`) expira — monitorar e renovar via System User |
| **Templates** | Aprovar novos templates para mensagens fora da janela 24h (pode levar 24–48h) |
| **Versão API** | v18.0 |
| **Responsável** | Pedro Vitor |
| **Automação** | `[MANUAL]` — gestão no Meta Business Manager |

---

### 8.2 Meta Ads (Lead Ads + CAPI)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Configurar webhook `leadgen`; capturar `ctwa_clid`; rastrear origem Meta Ads; enviar eventos CAPI |
| **Workflow** | Ver `docs/GUIA_META_ADS_CONFIGURACAO.md` (passo a passo completo para leigos) |
| **Permissões** | `ads_read`, `leads_retrieval`, `whatsapp_business_manage_events` |
| **Responsável** | Pedro Vitor + cliente |
| **Automação** | `[SEMI]` — configuração manual no Meta, execução automática |

---

### 8.3 Stripe (Pagamentos)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Configurar webhook Stripe; garantir `card_id` no metadata do Checkout; processar `payment_completed` |
| **Regra crítica** | Sempre passar `card_id` (UUID do CRM) no `metadata` do Stripe Checkout Session |
| **Fallback** | Se sem `card_id`, buscar card por telefone do cliente |
| **Sem `card_id` e sem telefone** | Evento logado sem card, sem erro 500 |
| **Responsável** | Pedro Vitor |
| **Automação** | `[AUTO]` — webhook processa automaticamente |

---

### 8.4 OpenAI / Groq (AI)

| Campo | Conteúdo |
|-------|---------|
| **Atividades** | Monitorar uso e custos; alertar quando próximo do budget; trocar modelo se necessário |
| **Budget** | Configurável por cliente via `client_budgets`; enforcement automático em `checkBudgetAvailable()` |
| **Monitoramento** | `/dashboard/openai-analytics` + `/dashboard/ai-gateway` |
| **Responsável** | Pedro Vitor |
| **Automação** | `[AUTO]` — tracking e enforcement automáticos |

---

## Apêndice A — Comandos CLI Rápidos

```bash
# Desenvolvimento
npm install                      # Instalar dependências
npm run dev                      # Servidor local
npx tsc --noEmit                 # Verificar tipos
npm run lint                     # Lint

# Database
supabase migration new <nome>    # Nova migration
supabase db push                 # Aplicar migrations em produção
supabase db diff                 # Ver mudanças pendentes
supabase db reset                # Reset local (cuidado!)

# Conversão de arquivos
node xlsx-to-csv.js arquivo.xlsx                         # Converter para CSV
node xlsx-to-csv.js arquivo.xlsx --sheet "Aba"           # Aba específica
node xlsx-to-csv.js arquivo.xlsx --delimiter ";"         # Delimitador ponto-e-vírgula
node xlsx-to-csv.js arquivo.xlsx --list-sheets           # Listar abas

# Backup do banco
cd db && ./backup-complete.bat   # Backup completo (Windows)

# Testes de nós individuais
curl http://localhost:3000/api/test/nodes/ai-response
curl http://localhost:3000/api/test/nodes/check-customer
curl http://localhost:3000/api/test/supabase-connection
```

---

## Apêndice B — Alertas Operacionais Críticos

> Verificar **diariamente** (< 5 minutos):

| Alerta | Query / Verificação | Ação se disparar |
|--------|-------------------|-----------------|
| DLQ exausta | `SELECT COUNT(*) FROM crm_action_dlq WHERE exhausted_at > NOW() - INTERVAL '24h'` | Investigar `final_error`, corrigir ação manualmente |
| Falhas no engine | `SELECT COUNT(*) FROM crm_rule_executions WHERE status='error' AND executed_at > NOW() - INTERVAL '24h'` | Ver `error_message`, corrigir regra ou código |
| Budget próximo do limite | `/dashboard/ai-gateway` → usage por cliente | Alertar cliente, aumentar budget ou otimizar |
| Token Meta expirado | Webhook retorna 401 nos logs | Renovar via System User no Meta Business Manager |
| Cron de inatividade parado | Última execução > 35min atrás | Verificar Vercel Cron Dashboard, reiniciar se necessário |

---

## Apêndice C — Arquivos de Referência

| Arquivo | Conteúdo |
|---------|---------|
| `docs/CHECKLIST_ONBOARDING_CLIENTE.md` | Checklist completo de onboarding passo a passo |
| `docs/MANUAL_CRM_AUTOMATION_V2.md` | Manual completo do CRM Automation (triggers, ações, jornadas, SQL) |
| `docs/GUIA_META_ADS_CONFIGURACAO.md` | Guia passo a passo para configurar Meta Ads e tokens |
| `docs/tables/tabelas.md` | Schema do banco — **consultar antes de qualquer query** |
| `twin-plans/PRD_CRM_AUTOMATION_V2.md` | PRD técnico completo do CRM Automation Engine V2 |
| `db/MIGRATION_WORKFLOW.md` | Workflow de migrations |
| `CLAUDE.md` | Guia técnico principal do projeto (regras críticas, padrões) |

---

*Macroprocessos UzzApp v1.0 — 2026-03-31*
*Owner: Pedro Vitor*
*Revisão sugerida: quinzenal ou após mudança arquitetural significativa*
