# AI Gateway - Checklist de Implementação (Arquitetura Final - Shared Keys)

Checklist executável para implementação da integração com Vercel AI Gateway usando **keys compartilhadas**.

---

## ✅ Setup Inicial

- [ ] Instalar dependências: `npm install ai @ai-sdk/react @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/groq @ai-sdk/google zod`
- [ ] Criar conta no Vercel (se não tem)
- [ ] Acessar AI Gateway section no Vercel Dashboard
- [ ] Criar branch: `git checkout -b feature/ai-gateway`

---

## 🗄️ Fase 1: Database (Semana 1-2)

### Migrations ⭐ ARQUITETURA SIMPLIFICADA

- [ ] Criar `supabase/migrations/YYYYMMDD_simplify_to_shared_gateway_config.sql` ✅ **JÁ CRIADO**
  - [ ] Tabela `shared_gateway_config` (APENAS 1 REGISTRO)
  - [ ] DROP `gateway_configurations` (arquitetura antiga)
  - [ ] Tabela `ai_models_registry`
  - [ ] Tabela `gateway_usage_logs`
  - [ ] Tabela `gateway_cache_performance`
  - [ ] ALTER `clients` (add `use_ai_gateway` flag)
  - [ ] Indexes
  - [ ] RLS policies

- [ ] Criar `supabase/migrations/YYYYMMDD_seed_ai_models_registry.sql` ✅ **JÁ CRIADO**
  - [ ] Seed OpenAI (gpt-4o, gpt-4o-mini)
  - [ ] Seed Groq (llama-3.3-70b)
  - [ ] Seed Anthropic (claude-3-5-sonnet, claude-3-opus)
  - [ ] Seed Google (gemini-2.0-flash)

- [ ] Criar `supabase/migrations/YYYYMMDD_create_budget_tables.sql` ✅ **JÁ CRIADO**
  - [ ] Tabela `client_budgets`
  - [ ] Tabela `plan_budgets`
  - [ ] Functions: `increment_budget_usage()`, `reset_budget_usage()`, `is_budget_exceeded()`
  - [ ] Seed plan budgets (free, basic, pro, enterprise)

### Testes Database

- [ ] Aplicar migrations: `supabase db push`
- [ ] Verificar `shared_gateway_config` tem apenas 1 registro
- [ ] Testar RLS policies manualmente
- [ ] Verificar seed data em `ai_models_registry` (6 modelos)
- [ ] Verificar seed data em `plan_budgets` (4 planos)
- [ ] Backup schemas: `cd db && .\backup-complete.bat`

---

## 🔧 Fase 2: Backend Core (Semana 3-4) ⭐ SHARED CONFIG

### Novos Arquivos

- [ ] `src/lib/ai-gateway/index.ts` ✅ **JÁ CRIADO**
  - [ ] Interface `callAI()`
  - [ ] Função `callAIViaGateway()` (usa shared config)
  - [ ] Função `callAIDirectly()` (legacy fallback)
  - [ ] Fallback chain logic
  - [ ] **Extração de telemetria** (`experimental_telemetry`)
  - [ ] **Extração de headers** (`x-vercel-cache`, `x-vercel-ai-provider`, etc)
  - [ ] Conversão de mensagens
  - [ ] Tratamento de erros

- [ ] `src/lib/ai-gateway/providers.ts` ✅ **JÁ CRIADO**
  - [ ] `getGatewayProvider()` factory
  - [ ] **SEM baseURL customizada** (AI SDK auto-detecta `vck_...`)
  - [ ] Suporte OpenAI
  - [ ] Suporte Anthropic
  - [ ] Suporte Groq
  - [ ] Suporte Google

- [ ] `src/lib/ai-gateway/config.ts` ✅ **JÁ CRIADO - REESCRITO**
  - [ ] **`getSharedGatewayConfig()`** (busca config compartilhada)
  - [ ] **Cache de 5 minutos** (in-memory)
  - [ ] Decriptação de ALL keys do Vault
  - [ ] `shouldUseGateway(clientId)` (2-level flag check)
  - [ ] `isBudgetExceeded(clientId)`
  - [ ] `getBudgetUsage(clientId)`

- [ ] `src/lib/ai-gateway/usage-tracking.ts`
  - [ ] `logGatewayUsage()` (multi-tenant)
  - [ ] Cálculo de custo USD baseado em `ai_models_registry`
  - [ ] Conversão para BRL via `getExchangeRate()`
  - [ ] Insert em `gateway_usage_logs` (com `client_id`)
  - [ ] Update `gateway_cache_performance`
  - [ ] **Increment budget via `increment_budget_usage()`**

- [ ] `src/lib/currency.ts`
  - [ ] `getExchangeRate(from, to)` com cache 24h
  - [ ] `convertUSDtoBRL(usd)`
  - [ ] Fallback rate: 1 USD = 5.00 BRL

### Modificar Arquivos Existentes

- [ ] `src/nodes/generateAIResponse.ts`
  - [ ] Importar `callAI` e `shouldUseGateway`
  - [ ] Check `shouldUseGateway(config.id)`
  - [ ] Call `getSharedGatewayConfig()` (não mais per-client)
  - [ ] Pass `clientId` para tracking multi-tenant
  - [ ] Adicionar tracking via `logGatewayUsage()`
  - [ ] Manter backward compatibility (legacy SDK)

### Testes Backend

- [ ] Testar `getSharedGatewayConfig()` retorna config única
- [ ] Testar cache de 5 minutos funciona
- [ ] Testar `callAI()` com cliente de teste
- [ ] Testar fallback chain
- [ ] Testar conversão BRL
- [ ] Testar logging em `gateway_usage_logs` (multi-tenant)
- [ ] Testar budget increment

---

## 🎨 Fase 3: Frontend Dashboard (Semana 5-6)

### Páginas

- [x] `src/app/dashboard/ai-gateway/setup/page.tsx` (ADMIN ONLY - Config Global) ✅
  - [x] **Input Gateway API Key (`vck_...`)** - UMA key para TODOS ✅
  - [x] **Input OpenAI API Key** - UMA key para TODOS ✅
  - [x] **Input Groq API Key** - UMA key para TODOS ✅
  - [x] Input Anthropic API Key (opcional) ✅
  - [x] Input Google API Key (opcional) ✅
  - [x] Cache Settings (global) ✅
  - [x] Fallback Chain Builder (global) ✅
  - [x] Botão "Testar Gateway" ✅
  - [x] **Aviso: "Keys compartilhadas por todos os clientes"** ✅

- [x] `src/app/dashboard/ai-gateway/analytics/page.tsx` (ADMIN - Métricas Agregadas) ✅
  - [x] Cards: Total Requests (todos clientes), Cost BRL agregado, Cache Hit Rate global ✅
  - [x] Chart: Usage by Client (top 10) ✅
  - [x] Chart: Usage by Provider ✅
  - [x] Chart: Latency Over Time (agregado) ✅
  - [x] Table: Top Clients by Usage ✅
  - [ ] Table: Recent Requests (all clients)

- [ ] **ATUALIZAR `src/app/dashboard/analytics/page.tsx`** (Per-Client View)
  - [ ] Substituir source: `usage_logs` → `gateway_usage_logs`
  - [ ] **Filtrar por cliente:** `WHERE client_id = current_user_client`
  - [ ] **Adicionar métricas do Gateway:**
    - [ ] Chart: Latência P50/P95/P99 por modelo
    - [ ] Chart: Cache Performance com economia R$ (só deste cliente)
    - [ ] Table: Uso por Conversa (drill-down)
    - [ ] Table: Fallback Events (deste cliente)
    - [ ] Colunas novas em Usage by Model: Latência, Cache Hit Rate, Error Rate
  - [ ] **Budget Progress Bar no topo da página** (NOVO)
  - [ ] Durante migração: Toggle para alternar entre legacy/gateway data

- [ ] **ATUALIZAR `src/app/dashboard/settings/page.tsx`**
  - [ ] Adicionar seção "AI Gateway" (toggle per-client)
  - [ ] **Adicionar seção "Budget Configuration":**
    - [ ] Budget Type selector (tokens/BRL/USD)
    - [ ] Budget Limit input
    - [ ] Budget Period selector (daily/weekly/monthly)
    - [ ] Alert thresholds (80%, 90%, 100%)
    - [ ] Auto-pause toggle
    - [ ] Current usage progress bar
    - [ ] Save/Cancel buttons

### Componentes

- [x] `src/components/ModelSelector.tsx` ✅
  - [x] Fetch de /api/ai-gateway/models ✅
  - [x] Filtro por capabilities ✅
  - [x] Badge com provider ✅
  - [x] Pricing display ✅

- [x] `src/components/GatewayMetricsDashboard.tsx` ✅
  - [x] Hook `useGatewayMetrics()` ✅
  - [x] Render cards ✅
  - [x] Render charts (recharts) ✅
  - [x] Period selector (7d, 30d, 60d, 90d) ✅

- [ ] `src/components/FallbackChainBuilder.tsx`
  - [ ] Drag & drop interface
  - [ ] Add/remove modelos
  - [ ] Visual feedback ordem
  - [ ] Save como JSONB

- [x] **NOVO: `src/components/BudgetConfiguration.tsx`** ✅
  - [x] Budget type selector ✅
  - [x] Budget limit input com validação ✅
  - [x] Period selector ✅
  - [x] Alert thresholds checkboxes ✅
  - [x] Auto-pause toggle ✅
  - [x] Save/Cancel buttons ✅

- [x] **NOVO: `src/components/BudgetProgressBar.tsx`** ✅
  - [x] Progress bar com cores (green/yellow/orange/red) ✅
  - [x] Current usage / limit display ✅
  - [x] Percentage calculation ✅
  - [x] Days remaining in period ✅
  - [x] Projeção de uso (estimativa) ✅

- [x] **NOVO: `src/components/LatencyChart.tsx`** ✅
  - [x] LineChart com Recharts ✅
  - [x] 3 linhas: P50, P95, P99 ✅
  - [x] Tooltip com detalhes ✅
  - [x] Time range selector ✅

- [x] **NOVO: `src/components/CachePerformanceCard.tsx`** ✅
  - [x] Cache hit rate display ✅
  - [x] Savings calculation ✅
  - [x] Performance indicators ✅

- [x] **NOVO: `src/components/FallbackEventsTable.tsx`** ✅
  - [x] Table display ✅
  - [x] Event details ✅
  - [x] Success/failure status ✅

- [x] **NOVO: `src/components/ProviderBreakdownChart.tsx`** ✅
  - [x] Pie chart implementation ✅
  - [x] Provider distribution ✅

- [ ] **ATUALIZAR: `src/components/ConversationUsageTable.tsx`**
  - [ ] Adicionar coluna: Latência média
  - [ ] Adicionar coluna: Cache hit rate
  - [ ] Click row → drill-down detalhes da conversa
  - [ ] Export to CSV button

### Hooks

- [x] `src/hooks/useGatewayMetrics.ts` ✅
  - [x] Fetch de /api/ai-gateway/metrics ✅
  - [x] State management (loading, error, data) ✅
  - [x] Refetch function ✅
  - [x] Auto-refresh capability ✅

- [x] **NOVO: `src/hooks/useBudget.ts`** ✅
  - [x] Fetch de /api/budget/config ✅
  - [x] Fetch de /api/budget/current-usage ✅
  - [x] Real-time updates (polling every 5min) ✅
  - [x] Alert when approaching limit ✅
  - [x] Save and reset config functions ✅

---

## 🌐 Fase 4: API Routes (Semana 7-8)

- [x] **`src/app/api/ai-gateway/config/route.ts`** (ADMIN ONLY) ✅
  - [x] GET - buscar `shared_gateway_config` (única) ✅
  - [x] PUT - atualizar shared config (cache settings) ✅
  - [x] Error handling ✅
  - [x] Config cache clearing ✅

- [x] `src/app/api/ai-gateway/models/route.ts` ✅
  - [x] GET - listar modelos ativos ✅
  - [x] POST - criar novo modelo ✅
  - [x] PUT - atualizar modelo ✅
  - [x] DELETE - desabilitar modelo ✅
  - [x] Query param: capabilities filter ✅
  - [x] Ordenação por provider/model_name ✅

- [x] **`src/app/api/ai-gateway/metrics/route.ts`** (ADMIN - Agregado) ✅
  - [x] GET - agregar métricas de TODOS os clientes ✅
  - [x] Query params: period ✅
  - [x] Calcular: totalRequests (all), costBRL (all), cacheHitRate (global) ✅
  - [x] Calcular usage by client (top 10) ✅
  - [x] Calcular provider usage distribution ✅
  - [x] Retornar arrays para charts ✅

- [x] **`src/app/api/ai-gateway/cache/route.ts`** ✅
  - [x] GET - listar cache entries ✅
  - [x] DELETE - invalidar cache (single ou ALL) ✅
  - [x] Calcular savings ✅

- [x] **NOVO: `src/app/api/budget/config/route.ts`** ✅
  - [x] GET - buscar budget do cliente atual ✅
  - [x] POST - criar/atualizar budget ✅
  - [x] DELETE - resetar para default do plano ✅
  - [x] Validação: budget_limit > 0 ✅
  - [x] Upsert com conflict handling ✅

- [x] **NOVO: `src/app/api/budget/current-usage/route.ts`** ✅
  - [x] GET - calcular uso atual do período (filtrado por `client_id`) ✅
  - [x] Agregar de `gateway_usage_logs WHERE client_id = ...` ✅
  - [x] Retornar: usage, limit, percentage, remaining ✅
  - [x] Calcular projeção fim do período ✅
  - [x] Calcular dias restantes ✅

- [ ] **NOVO: `src/app/api/analytics/gateway/route.ts`** (Per-Client)
  - [ ] GET - analytics filtrado por `client_id`
  - [ ] Source: `gateway_usage_logs WHERE client_id = current_client`
  - [ ] Retornar dados para charts de `/dashboard/analytics`
  - [ ] Latency P50/P95/P99 (só deste cliente)
  - [ ] Cache performance (só deste cliente)
  - [ ] Fallback events (só deste cliente)

- [ ] `src/app/api/billing/summary/route.ts`
  - [ ] GET - resumo mensal (admin ou per-client)
  - [ ] Query params: month, clientId (optional - admin only)
  - [ ] Calcular markup sugerido
  - [ ] Breakdown por modelo/provider

- [ ] `src/app/api/cron/sync-model-pricing/route.ts`
  - [ ] GET - atualizar preços em `ai_models_registry`
  - [ ] Cron auth check

- [ ] `src/app/api/cron/check-gateway-alerts/route.ts`
  - [ ] GET - checar anomalias
  - [ ] Alert: error rate >5%
  - [ ] Alert: cost spike >200%
  - [ ] Send email/webhook

- [ ] **NOVO: `src/app/api/cron/check-budget-alerts/route.ts`**
  - [ ] GET - checar budgets de TODOS os clientes
  - [ ] Loop: para cada cliente com budget ativo
  - [ ] Calcular percentage usado
  - [ ] Alert em 80% (warning)
  - [ ] Alert em 90% (critical)
  - [ ] Alert em 100% (error)
  - [ ] Se `pause_at_limit = true`: pausar gateway (`is_paused = true`)
  - [ ] Send email/webhook notification
  - [ ] Registrar alert enviado (evitar duplicatas)

- [ ] **NOVO: `src/app/api/cron/reset-budget-periods/route.ts`**
  - [ ] GET - resetar budgets expirados
  - [ ] Check daily: budgets com `next_reset_at <= NOW()`
  - [ ] Call function: `reset_budget_usage(client_id)`
  - [ ] Log reset em audit_logs

### Config Cron Jobs

- [ ] Editar `vercel.json`
  - [ ] Add cron: /api/cron/sync-model-pricing (daily 2am)
  - [ ] Add cron: /api/cron/check-gateway-alerts (hourly)
  - [ ] **Add cron: /api/cron/check-budget-alerts (hourly)**
  - [ ] **Add cron: /api/cron/reset-budget-periods (daily 0am)**

---

## 🧪 Fase 5: Testes (Semana 9-10)

### Unit Tests

- [ ] `src/lib/ai-gateway/__tests__/index.test.ts`
  - [ ] Test: callAI() com gateway enabled
  - [ ] Test: callAI() com gateway disabled
  - [ ] Test: fallback automático
  - [ ] Test: error handling
  - [ ] Test: telemetry extraction

- [ ] `src/lib/ai-gateway/__tests__/config.test.ts`
  - [ ] Test: `getSharedGatewayConfig()` retorna config única
  - [ ] Test: cache de 5 minutos funciona
  - [ ] Test: `shouldUseGateway()` (2-level flags)
  - [ ] Test: `isBudgetExceeded()`

- [ ] `src/lib/ai-gateway/__tests__/usage-tracking.test.ts`
  - [ ] Test: logGatewayUsage() insere corretamente
  - [ ] Test: multi-tenant (client_id correto)
  - [ ] Test: conversão BRL
  - [ ] Test: budget increment

- [ ] `src/lib/__tests__/currency.test.ts`
  - [ ] Test: getExchangeRate() com cache 24h
  - [ ] Test: conversão USD→BRL
  - [ ] Test: fallback rate

### Integration Tests

- [ ] `tests/integration/gateway-e2e.test.ts`
  - [ ] Test: Enviar mensagem WhatsApp
  - [ ] Test: Processar via shared gateway
  - [ ] Test: Salvar usage log (multi-tenant)
  - [ ] Test: Custo BRL calculado
  - [ ] Test: Budget incrementado

### Load Tests

- [ ] `tests/load/gateway-load.test.ts`
  - [ ] 50 usuários simultâneos
  - [ ] 5 minutos duração
  - [ ] Target: Latency P95 < 2000ms
  - [ ] Target: Error rate < 0.5%
  - [ ] Test: Cache funciona sob carga

---

## 🚀 Fase 6: Migração (Semana 11-16)

### Setup Feature Flags

- [ ] Adicionar `ENABLE_AI_GATEWAY=false` em `.env` (produção)
- [ ] Adicionar `ENABLE_AI_GATEWAY=true` em `.env.local` (dev)

### Setup Shared Gateway Config (VOCÊ - ADMIN)

- [ ] Criar conta Vercel (se não tem)
- [ ] Acessar AI Gateway → **Create ONE API Key** (`vck_...`)
- [ ] Obter custom API keys:
  - [ ] OpenAI API key (sk-proj-...)
  - [ ] Groq API key (gsk_...)
  - [ ] Anthropic API key (sk-ant-...) - opcional
  - [ ] Google API key (AIza-...) - opcional
- [ ] Seguir `SETUP_GUIDE.md` (Passos 1-7)
- [ ] Adicionar keys ao Vault via SQL
- [ ] Atualizar `shared_gateway_config` com secret IDs

### Beta Testing (Semana 11-12)

- [ ] Deploy para produção (flag OFF global)
- [ ] **Configurar shared gateway config via `/dashboard/ai-gateway`**
- [ ] Criar budget de teste (ex: 100k tokens) para cliente interno
- [ ] Habilitar gateway para 1 cliente teste (`use_ai_gateway = true`)
- [ ] E2E tests em produção
- [ ] **Testar alertas de budget (simular 80%, 90%, 100%)**
- [ ] Verificar tracking multi-tenant funciona
- [ ] Selecionar 5 clientes beta
- [ ] Habilitar gateway para beta clients
- [ ] Monitorar métricas diariamente:
  - [ ] Error rate
  - [ ] Latency P95
  - [ ] Cache hit rate
  - [ ] Cost comparison
  - [ ] **Budget alerts funcionando**
  - [ ] **Analytics page mostrando dados do gateway**
  - [ ] **Multi-tenant tracking isolado**

### 25% Rollout (Semana 13)

- [ ] Habilitar para 25% clientes (sorted by created_at)
- [ ] Monitorar error rate < 0.5%
- [ ] Verificar cache hit rate > 30%
- [ ] Coletar feedback clientes
- [ ] Verificar budget system funcionando

### 50% Rollout (Semana 14)

- [ ] Expandir para 50% clientes
- [ ] Monitorar cache hit rate > 50%
- [ ] Verificar cost reduction > 20%

### 75% Rollout (Semana 15)

- [ ] Expandir para 75% clientes
- [ ] Verificar latency P95 < 2000ms

### 100% Rollout (Semana 16)

- [ ] Habilitar para 100% clientes
- [ ] Anunciar conclusão migração
- [ ] Verificar métricas finais:
  - [ ] Cache hit rate > 60%
  - [ ] Cost reduction > 30%
  - [ ] 0 downtime incidents
  - [ ] Dashboard usado por >80% clientes
  - [ ] Budget alerts funcionando para todos

---

## 📝 Pós-Implementação

- [ ] Documentar processo de setup (shared keys)
- [ ] **Documentar configuração de budget por plano**
- [ ] Criar guia para novos clientes
- [ ] Video tutorial: "Configurando AI Gateway (Admin)"
- [ ] **Video tutorial: "Configurando Budget (Cliente)"**
- [ ] Update `CLAUDE.md` com seção AI Gateway
- [ ] **Update `CLAUDE.md` com sistema de budget**
- [ ] Deprecar código legacy (openai.ts, groq.ts) após 1 mês
- [ ] **Opcional: Migrar dados históricos de usage_logs para gateway_usage_logs**

---

## 🎯 Métricas de Sucesso

### Beta
- [ ] 0 bugs críticos
- [ ] Error rate < 0.1%
- [ ] Latency overhead < 100ms
- [ ] Cache hit rate > 30%
- [ ] NPS > 8
- [ ] **Budget alerts funcionando**
- [ ] **Multi-tenant tracking isolado**

### 50% Rollout
- [ ] Error rate < 0.5%
- [ ] Cache hit rate > 50%
- [ ] Cost reduction > 20%
- [ ] Latency P95 < 2000ms

### 100% Rollout
- [ ] 100% clientes migrados
- [ ] Cache hit rate > 60%
- [ ] Cost reduction > 30%
- [ ] 0 downtime
- [ ] Dashboard usado por >80% clientes
- [ ] **Budget system usado por >50% clientes**

---

**Última Atualização:** 2025-12-12
**Versão:** 2.0 (Arquitetura Final - Shared Keys)
**Arquitetura:** UMA gateway key + provider keys compartilhadas + controle via budget
