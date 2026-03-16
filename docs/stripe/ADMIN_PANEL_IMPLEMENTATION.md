# Admin Panel + Stripe Platform Billing (Contexto A)

## Data
- Implementado em 11/03/2026.

## Objetivo
- Separar claramente os dois contextos:
- Contexto A: UzzAI cobrando seus clientes (billing da plataforma).
- Contexto B: clientes UzzAI cobrando seus clientes finais (Stripe Connect).

## O que foi implementado

### 1. Banco e seguranca
- Migration criada: `supabase/migrations/20260311200000_platform_client_subscriptions.sql`.
- `clients` recebeu `plan_name`, `plan_status`, `trial_ends_at`, `notes`.
- Tabelas novas:
- `platform_client_subscriptions` (assinatura da plataforma por cliente).
- `platform_payment_history` (historico de faturas/pagamentos).
- RLS/policies adicionadas para acesso admin e visao por cliente.
- Ajuste de RLS no Contexto B para admin poder ler todos os dados Connect.

### 2. Protecao de rotas
- Arquivo atualizado: `proxy.ts`.
- `/dashboard/admin/*` agora exige `role = admin`.
- `/dashboard/payments/*` agora exige `admin` ou `client_admin`.
- Admin sem `client_id` passou a ser tratado como caso valido.

### 3. Helpers de autenticacao e admin
- `src/lib/auth-helpers.ts`: `getCurrentUserRole`, `requireAdmin`, `requireAdminOrClientAdmin`.
- `src/lib/admin-helpers.ts`: `normalizePlanStatus`, `centsToCurrency`, `buildMonthlySummary`.

### 4. APIs admin
- `GET /api/admin/clients`: lista clientes, busca, filtro de status e paginacao.
- `GET /api/admin/clients/[id]`: dados do cliente, owner, assinatura da plataforma e Stripe Connect.
- `GET /api/admin/clients/[id]/payment-history`: historico de pagamentos + resumo mensal (12 meses).

### 5. APIs Stripe Platform (Contexto A)
- `POST /api/stripe/platform/subscription`: ativa cliente no billing da plataforma (Customer + Subscription).
- `POST /api/stripe/platform/webhooks`: processa eventos da conta Platform.
- Webhook grava idempotencia em `webhook_events`.
- Webhook atualiza `platform_client_subscriptions`, `platform_payment_history` e `clients.plan_status`.

### 6. UI Admin final
- `src/app/dashboard/admin/page.tsx`: hub do painel admin.
- `src/app/dashboard/admin/clients/page.tsx`: tabela com busca, filtro, paginacao, acao `Ativar` e modal.
- `src/components/admin/ClientsTable.tsx`: tabela principal com status, ultimo pagamento e acoes.
- `src/components/admin/ClientDetailsModal.tsx`: modal com 3 abas (Dados, Historico, Plano).
- `src/components/admin/PaymentHistoryChart.tsx`: grafico de receita mensal com Recharts.

### 7. Variaveis de ambiente
- `.env.mobile.example` foi atualizado com:
- `NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br`
- `NEXT_PUBLIC_APP_URL=https://uzzapp.uzzai.com.br`
- `STRIPE_PLATFORM_PRICE_ID=price_1T9n2o4oGVf4uL6gpHjlCO8l`
- `STRIPE_PLATFORM_PRODUCT_ID=prod_U839DGKHweCEa0`
- `STRIPE_PLATFORM_SETUP_FEE_PRICE_ID=price_1T9n854oGVf4uL6gX0CL7qZC`
- `STRIPE_PLATFORM_SETUP_FEE_PRODUCT_ID=prod_U83EZ8MEm5CrU0`
- `STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_...`
- `UZZAI_PLATFORM_CLIENT_ID=00000000-0000-0000-0000-000000000099`
- `UZZAI_ADMIN_EMAIL=admin@uzzai.com.br`

## Nota sobre client_id do admin
- O insert automatico do cliente fixo `UZZAI` nao foi forçado na migration porque a tabela `clients` tem colunas obrigatorias de secrets.
- Como mitigacao, o `proxy.ts` permite `role=admin` sem `client_id`, preservando o acesso ao painel admin sem quebrar schema existente.

## Fluxo operacional (admin)
1. Admin acessa `/dashboard/admin/clients`.
2. Visualiza clientes cadastrados e status de plano.
3. Clica em `Ativar` para iniciar assinatura da plataforma.
4. Webhooks atualizam status e pagamentos automaticamente.
5. Admin abre `Detalhes` para analise completa do cliente.

## Passos manuais apos deploy
1. Aplicar migration no ambiente alvo.
2. Configurar `STRIPE_PLATFORM_WEBHOOK_SECRET` no ambiente server.
3. Registrar endpoint `/api/stripe/platform/webhooks` no Stripe Dashboard.
4. Validar fluxo de ativacao com um cliente de teste.
5. Confirmar recebimento de eventos `invoice.*` e `customer.subscription.*`.

## Handoff operacional
- Checklist detalhado de responsabilidades e validacoes:
- `docs/ADMIN_PANEL_HANDOFF_CHECKLIST.md`
- Playbook detalhado de webhooks:
- `docs/STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md`
