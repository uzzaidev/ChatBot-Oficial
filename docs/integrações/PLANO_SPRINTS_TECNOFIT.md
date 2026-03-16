# 🏋️ Integração Tecnofit — Plano de Sprints

**Criado:** 2026-02-10
**Objetivo:** Integrar o ChatBot WhatsApp com o Tecnofit para importar contatos e agendar aulas experimentais via WhatsApp
**Status:** 📋 Aguardando credenciais Tecnofit (desenvolvimento pode iniciar)

---

## 🎯 Escopo do Projeto

### O que será construído

| Funcionalidade | Descrição |
|---|---|
| **Importação de Contatos** | Sincronizar alunos/prospects do Tecnofit → CRM do chatbot |
| **Lookup de Cliente** | Agente consulta dados do cliente no Tecnofit via WhatsApp |
| **Detecção de Intenção** | IA detecta quando usuário quer agendar aula experimental |
| **Fluxo de Agendamento** | Bot coleta dados → cria lead → notifica academia |
| **Dashboard** | Painel para configurar API keys, ver sync status, logs |

### O que NÃO entra neste escopo (limitação da API v1)

> A API v1 da Tecnofit **não possui endpoint de agendamento de turmas/aulas**.
> O bot irá **coletar a intenção e dados do prospect** → criar card no CRM → notificar humano para confirmar no sistema Tecnofit.
> Quando a Tecnofit disponibilizar endpoint de agendamento, adicionaremos automação completa.

---

## 🏗️ Arquitetura da Solução

```
WhatsApp Message
      ↓
[Webhook] → [chatbotFlow - 14 nodes]
      ↓
[generateAIResponse] → detecta intenção "aula experimental"
      ↓
[tool: schedule_trial_class] → coleta nome, telefone, preferência
      ↓
┌────────────────────────────────────────────────┐
│  TecnofitAdapter                               │
│  1. Verifica se prospect já existe no Tecnofit │
│  2. Cria CRM card com dados coletados          │
│  3. Registra lead_source = 'whatsapp_bot'      │
│  4. Notifica academia (email/WhatsApp)         │
└────────────────────────────────────────────────┘
      ↓
[Bot responde] → "Ótimo! Em breve entraremos em contato para confirmar"
```

```
Dashboard Admin
      ↓
[/dashboard/tecnofit] → configura API keys (salva no Vault)
      ↓
[Botão: Sincronizar] → POST /api/integrations/tecnofit/sync
      ↓
[TecnofitAdapter] → importa clientes paginando → upsert CRM cards
```

---

## 📦 Sprints

---

## Sprint 1 — Infraestrutura Base

**Objetivo:** Criar toda a infraestrutura necessária: banco de dados, tipos TypeScript, configuração de secrets via Vault, e o cliente HTTP para a API Tecnofit.

**Entregáveis:**
- Migrations SQL criadas e aplicadas
- `src/lib/types.ts` atualizado com interfaces Tecnofit
- `src/lib/config.ts` buscando secrets Tecnofit do Vault
- `src/lib/tecnofit.ts` (cliente HTTP completo)

### Checklist Sprint 1

#### 1.1 — Migrations de Banco de Dados

- [ ] Criar migration: `supabase migration new add_tecnofit_config_to_clients`
  - Colunas na tabela `clients`:
    - `tecnofit_api_key_secret_id UUID REFERENCES vault.secrets(id)`
    - `tecnofit_api_secret_secret_id UUID REFERENCES vault.secrets(id)`
    - `tecnofit_base_url TEXT DEFAULT 'https://integracao.tecnofit.com.br/v1'`
    - `tecnofit_company_id TEXT` (para multi-empresa)
    - `tecnofit_enabled BOOLEAN DEFAULT FALSE`
    - `tecnofit_auto_sync BOOLEAN DEFAULT FALSE`
    - `tecnofit_sync_interval_hours INTEGER DEFAULT 24`

- [ ] Criar migration: `supabase migration new create_tecnofit_sync_metadata`
  - Tabela `tecnofit_sync_metadata`:
    - `id UUID PK`
    - `client_id UUID FK → clients(id)`
    - `last_sync_at TIMESTAMPTZ`
    - `last_sync_type TEXT` (`clients` | `full`)
    - `synced_count INTEGER DEFAULT 0`
    - `error_count INTEGER DEFAULT 0`
    - `error_details JSONB`
    - `status TEXT DEFAULT 'idle'` (`idle` | `syncing` | `error`)
    - `status_message TEXT`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`
    - `updated_at TIMESTAMPTZ DEFAULT NOW()`
    - `UNIQUE(client_id)`
  - Trigger `updated_at`
  - RLS policy: user_profiles pode SELECT do seu client_id
  - Índice em `client_id` e `last_sync_at`

- [ ] Criar migration: `supabase migration new add_tecnofit_indexes_to_crm`
  - Índice GIN em `crm_cards(custom_fields->>'tecnofit_id')`
  - Índice em `lead_sources(client_id, source_type)` WHERE `source_type = 'tecnofit'`

- [ ] Criar migration: `supabase migration new create_tecnofit_trial_requests`
  - Tabela `tecnofit_trial_requests`:
    - `id UUID PK`
    - `client_id UUID FK → clients(id)`
    - `crm_card_id UUID FK → crm_cards(id)`
    - `prospect_name TEXT NOT NULL`
    - `prospect_phone TEXT NOT NULL`
    - `prospect_email TEXT`
    - `preferred_modality TEXT` (musculação, natação, crossfit, etc.)
    - `preferred_days TEXT[]` (segunda, terça, etc.)
    - `preferred_time TEXT` (manhã, tarde, noite)
    - `notes TEXT`
    - `status TEXT DEFAULT 'pending'` (`pending` | `confirmed` | `cancelled`)
    - `confirmed_at TIMESTAMPTZ`
    - `confirmed_by TEXT`
    - `tecnofit_customer_id INTEGER` (preenchido após criar no Tecnofit)
    - `whatsapp_session_id TEXT` (session do chatbot)
    - `created_at TIMESTAMPTZ DEFAULT NOW()`
    - `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - Trigger `updated_at`
  - RLS policy
  - Índices em `client_id`, `prospect_phone`, `status`

- [ ] Aplicar todas as migrations: `supabase db push`
- [ ] Verificar migrations no dashboard Supabase

#### 1.2 — TypeScript Types

- [ ] Atualizar `src/lib/types.ts`:
  - Adicionar `tecnofit?: TecnofitConfig` na interface `ClientConfig`
  - Criar interface `TecnofitConfig` com: `apiKey`, `apiSecret`, `baseUrl`, `companyId`, `enabled`, `autoSync`
  - Criar interface `TecnofitCustomer` (mapeamento da resposta da API)
  - Criar interface `TecnofitContract`
  - Criar interface `TecnofitModality`
  - Criar interface `TecnofitAttendance`
  - Criar interface `TecnofitTrialRequest`
  - Criar interface `TecnofitSyncResult`

#### 1.3 — Config e Vault

- [ ] Atualizar `src/lib/config.ts` (`getClientConfig`):
  - Buscar `tecnofit_api_key_secret_id` e resolver via Vault em paralelo
  - Buscar `tecnofit_api_secret_secret_id` e resolver via Vault em paralelo
  - Incluir `tecnofit_enabled`, `tecnofit_company_id`, `tecnofit_base_url` no retorno
  - Manter padrão de `getSecretsParallel()` já existente

#### 1.4 — Cliente HTTP Tecnofit

- [ ] Criar `src/lib/tecnofit.ts`:
  - `loginTecnofit(credentials)` → POST `/v1/auth/login`
  - `getTecnofitToken(clientId, credentials)` → com cache em Map (por `clientId`)
    - Cache: token + expiresAt, renovar 5min antes de expirar
  - `createTecnofitClient(clientId, credentials)` → AxiosInstance configurada
    - Interceptor: Auto-refresh token em 401
    - Interceptor: Rate limiting (delay 600ms entre requests)
    - Interceptor: Retry com backoff exponencial em 429
    - Timeout: 15000ms
  - `listCompanies(clientId, credentials, options?)` → GET `/v1/companies`
  - `listCustomers(clientId, credentials, options?)` → GET `/v1/customers`
  - `getCustomer(clientId, credentials, customerId)` → GET `/v1/customers/{id}`
  - `getCustomerContacts(clientId, credentials, customerId)` → GET `/v1/customers/{id}/contacts`
  - `listContracts(clientId, credentials, options?)` → GET `/v1/contracts`
  - `listModalities(clientId, credentials, options?)` → GET `/v1/modalities`
  - `getCustomerAttendances(clientId, credentials, customerId, startDate, endDate, options?)` → GET `/v1/customers/{id}/attendances`
  - `listAttendances(clientId, credentials, startDate, endDate, type, options?)` → GET `/v1/attendances`

- [ ] Criar `src/app/api/test/tecnofit-connection/route.ts`:
  - Endpoint de teste: valida credenciais fazendo login + listando empresas
  - Retorna `{ success, companies, error }`

- [ ] Testar conexão (quando credenciais estiverem disponíveis):
  - `curl http://localhost:3000/api/test/tecnofit-connection`

---

## Sprint 2 — Importação de Contatos

**Objetivo:** Sincronizar clientes/prospects do Tecnofit para o CRM do chatbot, com deduplicação inteligente, paginação e rastreamento de origem.

**Entregáveis:**
- `src/lib/tecnofit-adapter.ts` (adapter + sync)
- API routes de sync e status
- Sync funcional com paginação completa

### Checklist Sprint 2

#### 2.1 — Adapter de Dados

- [ ] Criar `src/lib/tecnofit-adapter.ts`:
  - `normalizePhone(phone)` → formata para `55XXXXXXXXXXX`
  - `mapTecnofitCustomerToCRMCard(customer)` → mapeia campos
  - `mapTecnofitContactsToCard(contacts)` → mapeia contatos do cliente
  - `buildCardDescription(data)` → descrição formatada para o CRM
  - `findExistingCRMCard(supabase, clientId, tecnofitId, phone)` → busca card existente
  - `upsertCRMCard(supabase, clientId, cardData, tecnofitId)` → cria ou atualiza card
  - `recordLeadSource(supabase, clientId, cardId, tecnofit_id)` → registra `source_type = 'tecnofit'`
  - `syncTecnofitClients(clientId, credentials)` → sincronização paginada completa:
    - Loop enquanto `hasMore = true`
    - Para cada cliente: buscar contatos (GET /customers/{id}/contacts)
    - Upsert no CRM
    - Registrar lead source
    - Atualizar `tecnofit_sync_metadata` com progresso
    - Retornar `{ success, synced, errors, errorDetails }`
  - `updateSyncMetadata(supabase, clientId, data)` → atualiza metadata de sync

#### 2.2 — API Routes de Sincronização

- [ ] Criar `src/app/api/integrations/tecnofit/sync/route.ts`:
  - `POST` → inicia sync
  - Validar autenticação (`getClientIdFromSession`)
  - Validar se Tecnofit está configurado (`tecnofit_enabled = true`)
  - Verificar se já há sync em andamento (status = 'syncing')
  - Iniciar sync com `syncTecnofitClients()`
  - Rate limiting com `withRateLimit(apiUserLimiter)`
  - Retornar resultado com estatísticas

- [ ] Criar `src/app/api/integrations/tecnofit/status/route.ts`:
  - `GET` → retorna status da última sync
  - Busca da tabela `tecnofit_sync_metadata`
  - Retorna metadata completo ou estado `never_synced`

- [ ] Criar `src/app/api/integrations/tecnofit/customers/route.ts`:
  - `GET` → lista clientes importados do Tecnofit (com paginação)
  - Busca `crm_cards` com `custom_fields->>'tecnofit_id' IS NOT NULL`
  - Suporte a `search`, `page`, `limit`

- [ ] Criar `src/app/api/integrations/tecnofit/companies/route.ts`:
  - `GET` → lista empresas/unidades disponíveis no Tecnofit
  - Usa `listCompanies()` do cliente HTTP
  - Cache Redis 1 hora

#### 2.3 — Configuração via API

- [ ] Criar `src/app/api/client/tecnofit-config/route.ts`:
  - `GET` → retorna configuração atual (sem mostrar secrets)
  - `POST` → salva API key e secret no Vault, atualiza `clients` table
  - `DELETE` → remove integração (apaga secrets do Vault)
  - Validação: API key = 21 chars, API secret = 26 chars

#### 2.4 — Testes do Sync

- [ ] Testar sync com dados reais ou mock
- [ ] Verificar deduplicação (rodar sync 2x, não deve duplicar cards)
- [ ] Verificar paginação (sync com academia com 200+ clientes)
- [ ] Verificar tratamento de erros (cliente sem telefone, campos vazios)
- [ ] Verificar `lead_sources` criados corretamente

---

## Sprint 3 — Agente WhatsApp + Detecção de Intenção

**Objetivo:** Treinar o agente de IA para detectar interesse em aulas experimentais, fazer lookup de clientes no Tecnofit, e coletar dados necessários para agendamento.

**Entregáveis:**
- Tool `consultar_cliente_tecnofit` no agente
- Tool `agendar_aula_experimental` no agente
- Prompt atualizado com contexto Tecnofit
- Fluxo conversacional para agendamento

### Checklist Sprint 3

#### 3.1 — Tools do Agente

- [ ] Atualizar `src/nodes/generateAIResponse.ts`:
  - Adicionar tool `consultar_cliente_tecnofit`:
    ```
    Consulta informações de um cliente no sistema Tecnofit da academia.
    Use quando o usuário perguntar sobre seus planos, frequência, contratos.
    Parâmetros: phone (string) ou cpf (string)
    ```
  - Adicionar tool `agendar_aula_experimental`:
    ```
    Registra uma solicitação de aula experimental.
    Use quando o usuário demonstrar interesse em conhecer a academia.
    Parâmetros: nome (string), telefone (string), modalidade (string?),
    preferencia_dia (string?), preferencia_horario (string?)
    ```
  - Adicionar tool `listar_modalidades_tecnofit`:
    ```
    Lista as modalidades/atividades disponíveis na academia.
    Use quando o usuário perguntar o que tem disponível.
    Parâmetros: nenhum
    ```

#### 3.2 — Handlers de Tool Calls

- [ ] Criar `src/nodes/handleTecnofitToolCall.ts`:
  - `handleConsultarClienteTecnofit(phone, clientId)`:
    - Busca por telefone no Tecnofit ou no CRM
    - Retorna nome, contratos ativos, frequência
    - Formata resposta em português
  - `handleAgendarAulaExperimental(data, clientId, sessionId)`:
    - Cria `tecnofit_trial_requests` no banco
    - Cria/atualiza CRM card
    - Notifica academia (email + WhatsApp interno)
    - Retorna confirmação formatada
  - `handleListarModalidades(clientId)`:
    - Busca modalidades no Tecnofit (com cache Redis 1h)
    - Formata lista em português

- [ ] Atualizar `src/flows/chatbotFlow.ts`:
  - Adicionar rota para Tecnofit tool calls após `generateAIResponse`
  - Tratar `agendar_aula_experimental` → `handleTecnofitToolCall`
  - Tratar `consultar_cliente_tecnofit` → `handleTecnofitToolCall`
  - Tratar `listar_modalidades_tecnofit` → `handleTecnofitToolCall`

#### 3.3 — Atualização do System Prompt

- [ ] Atualizar configuração padrão do prompt do agente:
  - Adicionar contexto: "Você é o assistente virtual da academia [nome]. Pode ajudar a consultar informações sobre planos, marcar aulas experimentais e tirar dúvidas."
  - Exemplos de intenção para agendamento: "quero conhecer", "aula experimental", "experimentar", "visitar", "ver os planos", "me matricular"
  - Instrução: sempre coletar nome + telefone antes de registrar agendamento
  - Instrução: confirmar disponibilidade antes de finalizar agendamento

#### 3.4 — Notificação para Academia

- [ ] Criar `src/lib/tecnofit-notifications.ts`:
  - `notifyNewTrialRequest(clientId, trialData)`:
    - Envia email para academia (via Gmail handler existente)
    - Formata email com dados do prospect
    - Inclui link para CRM card

- [ ] Criar `src/app/api/integrations/tecnofit/trial-requests/route.ts`:
  - `GET` → lista solicitações pendentes (dashboard admin)
  - `PATCH /{id}` → atualiza status (confirmar/cancelar)

#### 3.5 — Testes do Agente

- [ ] Testar diálogo: "Quero fazer uma aula experimental"
- [ ] Testar diálogo: "Que modalidades vocês têm?"
- [ ] Testar diálogo: "Quero saber minha frequência"
- [ ] Testar coleta de dados incompletos (bot deve pedir os faltantes)
- [ ] Testar casos edge: prospect já existe, telefone inválido

---

## Sprint 4 — Dashboard UI

**Objetivo:** Interface administrativa para configurar a integração, acompanhar syncs, visualizar solicitações de aulas experimentais e gerenciar leads Tecnofit.

**Entregáveis:**
- Página `/dashboard/tecnofit` completa
- Seção Tecnofit em `/dashboard/settings`
- Lista de trial requests no `/dashboard/crm`

### Checklist Sprint 4

#### 4.1 — Página Principal Tecnofit

- [ ] Criar `src/app/dashboard/tecnofit/page.tsx`:
  - **Hero section**: status da integração (ativo/inativo)
  - **Card: Última sincronização**:
    - Data/hora da última sync
    - Clientes sincronizados
    - Erros (se houver)
    - Botão "Sincronizar Agora"
    - Indicador de loading durante sync
  - **Card: Estatísticas**:
    - Total de clientes importados
    - Total de prospects
    - Aulas experimentais agendadas (pendentes / confirmadas)
  - **Tabela: Clientes Tecnofit**:
    - Colunas: Nome, Telefone, Tipo, Status, Tecnofit ID, Sincronizado em
    - Filtros: tipo (aluno/prospect), status
    - Paginação
    - Link para CRM card
  - **Tabela: Solicitações de Aula Experimental**:
    - Colunas: Nome, Telefone, Modalidade, Preferência, Status, Criado em
    - Ações: Confirmar / Cancelar
    - Filtro por status (pendente/confirmado/cancelado)

- [ ] Criar componente `src/components/tecnofit/TecnofitSyncStatus.tsx`
- [ ] Criar componente `src/components/tecnofit/TecnofitCustomersTable.tsx`
- [ ] Criar componente `src/components/tecnofit/TrialRequestsTable.tsx`

#### 4.2 — Configurações (Settings)

- [ ] Atualizar `src/app/dashboard/settings/page.tsx`:
  - Adicionar seção "Integração Tecnofit"
  - Campo: API Key (input type=password, 21 chars)
  - Campo: API Secret (input type=password, 26 chars)
  - Campo: Company ID (para multi-empresa, opcional)
  - Toggle: Habilitar integração
  - Toggle: Sincronização automática (diária)
  - Botão: "Testar Conexão" → chama `/api/test/tecnofit-connection`
  - Indicador: "Conexão OK" / "Erro: credenciais inválidas"

#### 4.3 — Navegação

- [ ] Adicionar link "Tecnofit" no sidebar do dashboard
  - Ícone: dumbbell ou similar
  - Somente visível se `tecnofit_enabled = true` OU se é admin

#### 4.4 — Hooks React

- [ ] Criar `src/hooks/useTecnofitSync.ts`:
  - Estado: `syncing`, `lastSync`, `error`
  - Função: `startSync()` → POST + polling de status
  - Polling: GET `/api/integrations/tecnofit/status` a cada 3s durante sync

- [ ] Criar `src/hooks/useTrialRequests.ts`:
  - Lista de trial requests com filtros
  - Função: `confirmRequest(id)`, `cancelRequest(id)`

---

## Sprint 5 — Sincronização Automática e Cache

**Objetivo:** Implementar sync automático agendado, cache Redis para dados estáticos, e otimizações de performance.

**Entregáveis:**
- Cron job para sync automático
- Cache Redis para modalidades, contratos e empresas
- Otimizações de rate limiting

### Checklist Sprint 5

#### 5.1 — Cron Job de Sync Automático

- [ ] Criar `src/app/api/cron/tecnofit-sync/route.ts`:
  - Rota protegida por `CRON_SECRET`
  - Busca todos os `clients` com `tecnofit_enabled = true` e `tecnofit_auto_sync = true`
  - Para cada cliente: verifica se já passou `tecnofit_sync_interval_hours` desde última sync
  - Executa `syncTecnofitClients()` para cada cliente
  - Logs de resultado

- [ ] Configurar Vercel Cron (em `vercel.json`):
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/tecnofit-sync",
        "schedule": "0 3 * * *"
      }
    ]
  }
  ```
  (Executa às 3h da manhã, horário do servidor)

#### 5.2 — Cache Redis

- [ ] Atualizar `src/lib/tecnofit.ts`:
  - `listModalitiesCached(clientId, credentials)` → cache 1h
  - `listContractsCached(clientId, credentials, options?)` → cache 1h
  - `listCompaniesCached(clientId, credentials)` → cache 4h
  - Helper: `getTecnofitCacheKey(type, clientId, params)` → chave padronizada
  - Helper: `invalidateTecnofitCache(clientId)` → limpa todo cache do cliente

#### 5.3 — Otimizações

- [ ] Sync incremental: filtrar por `createStartDate` desde a última sync
  - `lastSyncAt` → usar como `createStartDate` no próximo sync
  - Ainda rodar sync completo mensal para não perder updates

- [ ] Batch de contatos: ao invés de chamar `/customers/{id}/contacts` para cada cliente individualmente, otimizar para buscar em lotes quando necessário

- [ ] Circuit breaker: se Tecnofit retornar 500 3x seguidas, pausar sync por 1h

---

## Sprint 6 — Testes, Polimento e Documentação

**Objetivo:** Garantir qualidade, robusteidade e documentação completa da integração.

**Entregáveis:**
- Testes de integração
- Tratamento de erros robusto
- Documentação atualizada

### Checklist Sprint 6

#### 6.1 — Tratamento de Erros

- [ ] Revisar todos os try-catch em `tecnofit.ts` e `tecnofit-adapter.ts`
- [ ] Logar erros com contexto suficiente (sem expor secrets)
- [ ] Erros de configuração devem ser detectados cedo (antes de fazer chamadas)
- [ ] Mensagens de erro amigáveis no dashboard

#### 6.2 — Testes

- [ ] Criar `src/app/api/test/tecnofit-sync/route.ts`:
  - Simula sync com dados mock (sem chamar API real)
  - Útil para testar o fluxo sem credenciais

- [ ] Testar rate limit: simular 150 requests e verificar que não ultrapassa 100/min
- [ ] Testar token refresh: simular expiração de token durante sync
- [ ] Testar 429: verificar que retry funciona corretamente
- [ ] Testar sync com 0 clientes, 10 clientes, 200+ clientes

#### 6.3 — Segurança

- [ ] Verificar que API keys nunca aparecem em logs
- [ ] Verificar que todas as rotas têm `getClientIdFromSession()`
- [ ] Verificar RLS policies nas tabelas novas
- [ ] Verificar que cron endpoint só aceita chamadas com `CRON_SECRET`

#### 6.4 — Documentação

- [ ] Atualizar `CLAUDE.md` com:
  - Seção sobre integração Tecnofit
  - Arquivos chave: `src/lib/tecnofit.ts`, `src/lib/tecnofit-adapter.ts`
  - Endpoints: `/api/integrations/tecnofit/*`
  - Tabelas novas: `tecnofit_sync_metadata`, `tecnofit_trial_requests`

- [ ] Criar `docs/integrações/TECNOFIT_SETUP_GUIDE.md`:
  - Como obter credenciais no Tecnofit
  - Passo a passo de configuração no dashboard
  - Como verificar se o sync funcionou
  - Troubleshooting comum

- [ ] Atualizar `docs/tables/tabelas.md` com novas tabelas

---

## 📊 Resumo de Arquivos Novos/Modificados

### Novos Arquivos

```
src/lib/
  tecnofit.ts                    # HTTP client + JWT + rate limiting
  tecnofit-adapter.ts            # Sync de dados + mapeamento
  tecnofit-notifications.ts      # Notificações para academia

src/nodes/
  handleTecnofitToolCall.ts      # Handler de tool calls do agente

src/app/api/
  integrations/tecnofit/
    sync/route.ts                # POST: iniciar sync
    status/route.ts              # GET: status da sync
    customers/route.ts           # GET: listar importados
    companies/route.ts           # GET: listar unidades
    trial-requests/route.ts      # GET/PATCH: aulas experimentais
  client/
    tecnofit-config/route.ts     # GET/POST/DELETE: configuração
  cron/
    tecnofit-sync/route.ts       # Cron job auto sync
  test/
    tecnofit-connection/route.ts # Testar conexão
    tecnofit-sync/route.ts       # Testar sync com mock

src/app/dashboard/
  tecnofit/
    page.tsx                     # Página principal

src/components/tecnofit/
  TecnofitSyncStatus.tsx
  TecnofitCustomersTable.tsx
  TrialRequestsTable.tsx

src/hooks/
  useTecnofitSync.ts
  useTrialRequests.ts

supabase/migrations/
  TIMESTAMP_add_tecnofit_config_to_clients.sql
  TIMESTAMP_create_tecnofit_sync_metadata.sql
  TIMESTAMP_add_tecnofit_indexes_to_crm.sql
  TIMESTAMP_create_tecnofit_trial_requests.sql
```

### Arquivos Modificados

```
src/lib/types.ts                 # + TecnofitConfig, TecnofitCustomer, etc.
src/lib/config.ts                # + busca secrets Tecnofit do Vault
src/nodes/generateAIResponse.ts  # + tools Tecnofit
src/flows/chatbotFlow.ts         # + rota para Tecnofit tool calls
src/app/dashboard/settings/
  page.tsx                       # + seção configuração Tecnofit
vercel.json                      # + cron job config
```

---

## 🚦 Dependências e Pré-requisitos

### Para iniciar desenvolvimento (disponível agora)

- [x] Codebase atual
- [x] Padrões existentes (`meta.ts`, `vault.ts`, `rate-limit.ts`, `redis.ts`)
- [x] Documentação da API Tecnofit
- [x] Schema de banco de dados

### Para testes com dados reais (aguardando)

- [ ] **Credenciais Tecnofit** (api_key 21 chars + api_secret 26 chars)
  - Obter: Login no Tecnofit → Loja de Adicionais → "API Aberta"
  - Contato com gerente Tecnofit para ativação
- [ ] **Ambiente de produção/staging** com Tecnofit configurado

---

## 📋 Mapeamento de Dados Tecnofit → CRM

| Campo Tecnofit | Campo CRM | Tipo | Observações |
|---|---|---|---|
| `id` | `custom_fields.tecnofit_id` | integer | Chave única |
| `name` | `title` | string | Nome do card |
| `email` | `custom_fields.email` | string | |
| `cpf` | `custom_fields.cpf` | string | |
| `type` | `custom_fields.client_type` | `customer`/`prospect` | Aluno ou Prospect |
| `gender` | `custom_fields.gender` | `F`/`M` | |
| `status` | `custom_fields.tecnofit_status` | string | Status no Tecnofit |
| `createdAt` | `custom_fields.tecnofit_created_at` | ISO date | Data no Tecnofit |
| contacts[0].value | `phone` | string normalizado | Telefone principal |
| contacts[].value | `custom_fields.contacts` | array | Todos os contatos |
| — | `lead_source = 'tecnofit'` | — | Origem registrada |

---

## ⚠️ Limitações Conhecidas da API Tecnofit v1

| Limitação | Impacto | Solução Adotada |
|---|---|---|
| Sem endpoint de agendamento de turmas | Não dá para marcar aula diretamente | Bot coleta dados → CRM → humano confirma no Tecnofit |
| Sem webhook (push) | Não recebe notificação de novos alunos | Sync periódico agendado (cron job) |
| Sem endpoint de criação de clientes | Não cria prospect automaticamente no Tecnofit | Cria no CRM e humano cria no Tecnofit manualmente |
| Rate limit: 100 req/min | Sync de academias grandes é lento | Paginação com delay, sync incremental |
| Sem sandbox/test env | Testes com dados reais | Mocks + endpoint de test com dados simulados |

---

**Última atualização:** 2026-02-10
**Próximo passo:** Iniciar Sprint 1 (todos os pré-requisitos de código estão disponíveis)
