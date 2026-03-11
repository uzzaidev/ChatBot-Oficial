# Painel Admin UzzAI — Plano de Implementação

> **Versão:** 2.0
> **Data:** 11/03/2026
> **Status:** Planejamento finalizado — decisões arquiteturais tomadas, pronto para implementação
> **URL de produção:** `uzzapp.uzzai.com.br`
> **Contexto:** Integração com o que já existe (roles, Stripe Connect, estrutura de auth)

---

## Índice

1. [Contexto: O que já existe](#1-contexto-o-que-já-existe)
2. [O problema levantado — Dois contextos de pagamento](#2-o-problema-levantado--dois-contextos-de-pagamento)
3. [Quem acessa o quê — Mapa de permissões](#3-quem-acessa-o-quê--mapa-de-permissões)
4. [O que o painel admin precisa mostrar](#4-o-que-o-painel-admin-precisa-mostrar)
5. [Impacto nas migrations existentes](#5-impacto-nas-migrations-existentes)
6. [Nova migration necessária](#6-nova-migration-necessária)
7. [Estrutura de arquivos a criar](#7-estrutura-de-arquivos-a-criar)
8. [Middleware de proteção de rotas](#8-middleware-de-proteção-de-rotas)
9. [API Routes do admin](#9-api-routes-do-admin)
10. [UI: Tabela de clientes + Modal](#10-ui-tabela-de-clientes--modal)
11. [Plano de implementação — Fases](#11-plano-de-implementação--fases)
12. [Perguntas em aberto antes de implementar](#12-perguntas-em-aberto-antes-de-implementar)

---

## 1. Contexto: O que já existe

### Implementado até 11/03/2026

**Stripe Connect (completo):**
- `src/lib/stripe.ts` + `src/lib/stripe-connect.ts` — biblioteca core
- `src/app/api/stripe/*` — todas as rotas (account, products, checkout, webhooks V1+V2, billing portal)
- `src/app/dashboard/payments/*` — painel de pagamentos para clientes
- `src/app/store/[clientSlug]/*` — storefront público
- `src/components/Stripe*.tsx` + `ProductCard`, `ProductForm`, `SubscriptionsList`
- Migration `20260311130500_stripe_connect.sql` — tabelas `stripe_accounts`, `stripe_products`, `stripe_subscriptions`, `stripe_orders`, `webhook_events`

**Auth e Roles (já existe no banco):**
- Migration `008_phase4_admin_roles.sql` — já aplicada
- Coluna `role` em `user_profiles` com valores: `admin` | `client_admin` | `user`
- Funções SQL: `get_current_user_role()`, `user_has_role()`, `user_is_admin()`
- Tabela `user_invites` para convidar membros da equipe
- RLS: super admins (`admin`) têm acesso total; `client_admin` vê apenas o próprio client

**Estrutura de pastas admin:**
- `/dashboard/admin/budget-plans` — existe mas incompleto
- Não existe proteção de rota middleware para `/dashboard/admin/`

---

## 2. O problema levantado — Dois contextos de pagamento

Este é o ponto mais importante do documento. Existem **dois contextos de pagamento completamente diferentes** no sistema, e confundi-los causa problemas sérios.

### Contexto A — UzzAI cobra seus clientes (Platform billing)

```
UzzAI (Pedro) → cobra R$ 250/mês → Cliente X (empresa que usa UzzApp)
```

- **Quem paga:** Os clientes da UzzAI (as empresas que contratam o UzzApp)
- **O que é cobrado:** Assinatura do UzzApp (R$ 250/mês + setup fee R$ 1.000)
- **Onde fica no Stripe:** Na conta Platform da UzzAI, como subscription normal
- **Quem vê:** Apenas Pedro / equipe UzzAI (`role = 'admin'`)
- **Status atual:** ⚠️ **Não implementado** — não há tabela rastreando essas assinaturas

### Contexto B — Clientes da UzzAI cobram seus próprios clientes (Connect)

```
Cliente X (empresa) → cobra → Clientes do Cliente X (compradores finais)
```

- **Quem paga:** Os compradores finais dos clientes da UzzAI
- **O que é cobrado:** Produtos/serviços do Cliente X
- **Onde fica no Stripe:** Na Connected Account do Cliente X (`acct_xxx`)
- **Quem vê:** O próprio Cliente X no painel (`role = 'client_admin'`)
- **Status atual:** ✅ **Implementado** — toda a estrutura Stripe Connect

### O que Pedro precisa ver no painel admin

**Contexto A** — A situação financeira da UzzAI:
> "Quais dos meus clientes estão pagando o UzzApp? Qual o plano de cada um? Quando foi o último pagamento? Tem algum inadimplente?"

Isso é o painel de admin que Pedro levantou na conversa. Ele **não** precisa ver os dados de pagamento dos clientes dos seus clientes (Contexto B).

---

## 3. Quem acessa o quê — Mapa de permissões

```
role = 'admin'         → Pedro / equipe UzzAI
role = 'client_admin'  → Dono de uma empresa cliente (ex: dono de pet shop que usa UzzApp)
role = 'user'          → Funcionário de uma empresa cliente
```

### Mapa de acesso por rota

| Rota | `admin` | `client_admin` | `user` |
|------|---------|----------------|--------|
| `/dashboard/admin/*` | ✅ | ❌ | ❌ |
| `/dashboard/payments/*` | ✅ | ✅ | ❌ |
| `/dashboard/knowledge/*` | ✅ | ✅ | ✅ |
| `/dashboard/conversations/*` | ✅ | ✅ | ✅ |
| `/store/[slug]/*` | público | público | público |

> **Problema atual:** `/dashboard/payments` não tem proteção de role — qualquer usuário logado pode acessar. Precisa ser corrigido.

> **Nota importante:** O admin (`role = 'admin'`) não tem `client_id` associado a um cliente específico — ele é da plataforma UzzAI. Isso precisa ser tratado nas queries (verificar se `client_id IS NULL` para admins ou criar um `client_id` especial para a UzzAI).

---

## 4. O que o painel admin precisa mostrar

### Tela principal — Tabela de clientes

**Colunas da tabela:**

| Coluna | Dado | Fonte |
|--------|------|-------|
| Cliente | `clients.name` | Supabase |
| Plano | `platform_client_subscriptions.plan_name` | Nova tabela (ver seção 6) |
| Status | `platform_client_subscriptions.status` | Nova tabela / Stripe |
| Último pagamento | `platform_client_subscriptions.last_payment_at` | Stripe webhook |
| Ações | Botão "Ver detalhes" | — |

**Comportamento:**
- Paginação (20 por página)
- Busca por nome ou email
- Filtro por status (active, past_due, canceled, trial)
- Ordenação por último pagamento

---

### Modal de detalhes do cliente

**Aba 1 — Dados do cliente:**
```
Nome:          [clients.name]
Email:         [user_profiles.email do client_admin]
Empresa:       [clients.name]
Telefone:      [clients.phone ou user_profiles.phone]
Último login:  [auth.users.last_sign_in_at via Supabase Admin API]
Criado em:     [clients.created_at]
Status conta:  [user_profiles.is_active]
```

**Aba 2 — Histórico de pagamentos:**
```
Gráfico: receita mensal dos últimos 12 meses (linha)
Tabela:
  Data    | Valor    | Status    | Fatura PDF
  Jan/26  | R$ 250   | Pago ✅   | [link]
  Dez/25  | R$ 250   | Pago ✅   | [link]
  Nov/25  | R$ 250   | Falhou ❌ | [link]
```

**Aba 3 — Informações do plano:**
```
Plano atual:          Pro (R$ 250/mês)
Trial até:            [data ou N/A]
Próxima cobrança:     [data]
Setup fee pago:       Sim / Não
Método de pagamento:  Visa •••• 4242
```

---

## 5. Impacto nas migrations existentes

### Migration `008_phase4_admin_roles.sql` — Sem mudanças

A estrutura de roles já está correta. Nenhuma alteração necessária.

### Migration `20260311130500_stripe_connect.sql` — Sem mudanças

As tabelas `stripe_accounts`, `stripe_products`, `stripe_subscriptions`, `stripe_orders` são para o **Contexto B** (clientes cobrando seus clientes). Não devem ser alteradas.

Porém, a **RLS das tabelas Stripe Connect** precisa ser revisada para garantir que:
- `admin` (Pedro) consiga ver TODOS os dados de todos os clientes
- `client_admin` vê apenas os dados do próprio `client_id`

Verificar se as políticas atuais cobrem o caso `role = 'admin'` com `client_id = NULL`.

### Tabela `clients` — Adicionar campos úteis

```sql
-- Em nova migration
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'trial'
  CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT; -- notas internas (só admin vê)
```

---

## 6. Nova migration necessária

**Arquivo:** `supabase/migrations/20260311200000_platform_client_subscriptions.sql`

Esta migration cria a infraestrutura para rastrear como a UzzAI cobra seus próprios clientes (Contexto A).

```sql
-- ============================================================================
-- MIGRATION: Platform Client Subscriptions
-- Rastreia assinaturas dos clientes da UzzAI no plano UzzApp
-- DIFERENTE de stripe_subscriptions (que é dos clientes cobrando seus clientes)
-- ============================================================================

-- Campos adicionais em clients para status rápido
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS plan_name       TEXT    DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS plan_status     TEXT    DEFAULT 'trial'
  CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
ADD COLUMN IF NOT EXISTS trial_ends_at   TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes           TEXT;   -- notas internas, só admin

-- Tabela principal: assinatura da plataforma por cliente
CREATE TABLE IF NOT EXISTS public.platform_client_subscriptions (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- IDs do Stripe Platform (não de Connected Account)
  stripe_customer_id          TEXT        NOT NULL UNIQUE,  -- cus_... na conta Platform
  stripe_subscription_id      TEXT        UNIQUE,           -- sub_... na conta Platform
  stripe_price_id             TEXT,                         -- price_... na conta Platform

  -- Plano e status
  plan_name                   TEXT        NOT NULL DEFAULT 'pro',  -- 'pro', 'enterprise', etc.
  plan_amount                 INTEGER     NOT NULL DEFAULT 25000,   -- em centavos (R$ 250,00)
  plan_currency               TEXT        NOT NULL DEFAULT 'brl',
  plan_interval               TEXT        DEFAULT 'month'
                              CHECK (plan_interval IN ('month', 'year')),
  status                      TEXT        NOT NULL DEFAULT 'trial'
                              CHECK (status IN ('trial','active','past_due','canceled','suspended','incomplete')),

  -- Datas importantes
  trial_start                 TIMESTAMPTZ,
  trial_end                   TIMESTAMPTZ,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN     DEFAULT false,
  canceled_at                 TIMESTAMPTZ,

  -- Setup fee (cobrança única)
  setup_fee_paid              BOOLEAN     DEFAULT false,
  setup_fee_amount            INTEGER,                      -- em centavos
  setup_fee_paid_at           TIMESTAMPTZ,

  -- Último pagamento
  last_payment_at             TIMESTAMPTZ,
  last_payment_amount         INTEGER,
  last_payment_status         TEXT,

  -- Metadata
  metadata                    JSONB       DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(client_id) -- um plano por cliente
);

CREATE INDEX IF NOT EXISTS idx_platform_subs_client_id
  ON public.platform_client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_status
  ON public.platform_client_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_subs_stripe_customer
  ON public.platform_client_subscriptions(stripe_customer_id);

-- Trigger updated_at
CREATE TRIGGER update_platform_subs_updated_at
  BEFORE UPDATE ON public.platform_client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: somente admin pode ver todas; cliente vê apenas o próprio
ALTER TABLE public.platform_client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all platform subscriptions"
  ON public.platform_client_subscriptions FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "Clients can view own subscription"
  ON public.platform_client_subscriptions FOR SELECT TO authenticated
  USING (client_id = get_current_user_client_id());

-- Tabela de histórico de pagamentos da plataforma
CREATE TABLE IF NOT EXISTS public.platform_payment_history (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform_subscription_id    UUID        REFERENCES public.platform_client_subscriptions(id),

  stripe_invoice_id           TEXT        NOT NULL UNIQUE,  -- in_...
  stripe_payment_intent_id    TEXT        UNIQUE,           -- pi_...

  amount                      INTEGER     NOT NULL,          -- em centavos
  currency                    TEXT        NOT NULL DEFAULT 'brl',
  status                      TEXT        NOT NULL,          -- paid, open, void, uncollectible

  period_start                TIMESTAMPTZ,
  period_end                  TIMESTAMPTZ,
  paid_at                     TIMESTAMPTZ,

  invoice_url                 TEXT,       -- link para fatura no Stripe
  invoice_pdf                 TEXT,       -- link para PDF da fatura

  metadata                    JSONB       DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_client_id
  ON public.platform_payment_history(client_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status
  ON public.platform_payment_history(status);

ALTER TABLE public.platform_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment history"
  ON public.platform_payment_history FOR SELECT TO authenticated
  USING (user_has_role('admin'));

CREATE POLICY "Clients can view own payment history"
  ON public.platform_payment_history FOR SELECT TO authenticated
  USING (client_id = get_current_user_client_id());

CREATE POLICY "Service role full access payment history"
  ON public.platform_payment_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 7. Estrutura de arquivos a criar

```
src/
├── app/
│   ├── api/
│   │   └── admin/                        ← NEW — rotas protegidas por role=admin
│   │       ├── clients/route.ts          ← GET lista todos os clientes + plano
│   │       ├── clients/[id]/route.ts     ← GET detalhes de um cliente
│   │       └── clients/[id]/
│   │           └── payment-history/route.ts ← GET histórico de pagamentos
│   │
│   ├── api/stripe/
│   │   └── platform/                     ← NEW — billing da plataforma (Contexto A)
│   │       ├── subscription/route.ts     ← checkout de assinatura do UzzApp
│   │       └── webhooks/route.ts         ← webhooks de cobrança de clientes
│   │
│   └── dashboard/
│       └── admin/
│           ├── budget-plans/             ← existe
│           └── clients/                  ← NEW — lista de clientes com plano
│               └── page.tsx
│
├── components/
│   ├── admin/                            ← NEW — pasta para componentes admin
│   │   ├── ClientsTable.tsx              ← tabela de clientes
│   │   ├── ClientDetailsModal.tsx        ← modal com 3 abas
│   │   └── PaymentHistoryChart.tsx       ← gráfico de receita mensal
│   └── ...
│
└── lib/
    └── admin-helpers.ts                  ← NEW — funções auxiliares do admin
```

---

## 8. Middleware de proteção de rotas

**Arquivo:** `src/middleware.ts` (criar ou atualizar)

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  const { data: { session } } = await supabase.auth.getSession()

  // Redirecionar para login se não autenticado
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Proteger rotas /dashboard/admin — somente role=admin
  if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Redirecionar para dashboard normal se não for admin
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Proteger /dashboard/payments — somente admin ou client_admin
  if (request.nextUrl.pathname.startsWith('/dashboard/payments')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!['admin', 'client_admin'].includes(profile?.role || '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
}
```

---

## 9. API Routes do admin

### `GET /api/admin/clients`

Retorna todos os clientes com status do plano. Protegida: somente `role = 'admin'`.

```typescript
// Dados retornados por cliente:
{
  id: string
  name: string
  email: string           // email do client_admin
  plan_name: string
  plan_status: string     // active | past_due | trial | canceled
  last_payment_at: string
  last_payment_amount: number
  trial_ends_at: string | null
  stripe_customer_id: string
  created_at: string
}
```

### `GET /api/admin/clients/[id]`

Retorna detalhes completos de um cliente:

```typescript
{
  client: {
    id, name, email, phone, created_at, notes
  },
  owner: {                 // user_profile do client_admin
    full_name, email, phone, last_sign_in_at, is_active
  },
  subscription: {          // platform_client_subscriptions
    plan_name, status, current_period_start, current_period_end,
    trial_end, cancel_at_period_end, setup_fee_paid
  },
  stripe_connect: {        // stripe_accounts (Contexto B)
    stripe_account_id, account_status, charges_enabled
  }
}
```

### `GET /api/admin/clients/[id]/payment-history`

Retorna histórico paginado de pagamentos para o gráfico e tabela:

```typescript
{
  payments: [
    {
      id, stripe_invoice_id, amount, currency, status,
      period_start, period_end, paid_at, invoice_url, invoice_pdf
    }
  ],
  monthly_summary: [       // para o gráfico de linha
    { month: '2026-01', total: 25000, count: 1 },
    { month: '2025-12', total: 25000, count: 1 },
    ...                    // últimos 12 meses
  ]
}
```

---

## 10. UI: Tabela de clientes + Modal

### Tabela principal `/dashboard/admin/clients`

```
┌──────────────────────────────────────────────────────────────────┐
│  Clientes UzzApp                          [Buscar...]  [Filtrar▼] │
├────────────────┬──────────┬───────────┬────────────────┬─────────┤
│ Cliente        │ Plano    │ Status    │ Último pag.    │         │
├────────────────┼──────────┼───────────┼────────────────┼─────────┤
│ Pet Shop Silva │ Pro      │ ✅ Ativo  │ 01/03/2026     │ [Ver]   │
│ Clínica Zen    │ Pro      │ ⚠️ Atraso │ 15/01/2026     │ [Ver]   │
│ Tech Solutions │ Trial    │ 🔵 Trial  │ —              │ [Ver]   │
│ Farmácia ABC   │ Pro      │ ❌ Cancel │ 10/02/2026     │ [Ver]   │
└────────────────┴──────────┴───────────┴────────────────┴─────────┘
```

**Badges de status:**
- `active` → verde ✅ Ativo
- `trial` → azul 🔵 Trial (+ dias restantes)
- `past_due` → amarelo ⚠️ Atraso
- `canceled` → vermelho ❌ Cancelado
- `suspended` → cinza ⏸️ Suspenso

---

### Modal de detalhes

```
┌─────────────────────────────────────────────────┐
│ Pet Shop Silva                              [×]  │
├─────────────────────────────────────────────────┤
│ [Dados]  [Histórico de Pagamentos]  [Plano]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Dados do cliente                               │
│  Nome:        João Silva                        │
│  Email:       joao@petshop.com                  │
│  Empresa:     Pet Shop Silva                    │
│  Último login: 10/03/2026 às 14:32              │
│  Conta ativa:  ✅ Sim                           │
│  Cliente desde: 15/01/2026                      │
│                                                 │
│  Stripe Connect                                 │
│  Status:      ✅ Ativo (card_payments: active)  │
│  Conta:       acct_1abc...                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────┐
│ Pet Shop Silva                              [×]  │
├─────────────────────────────────────────────────┤
│ [Dados]  [Histórico de Pagamentos]  [Plano]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Receita mensal                                 │
│  ╭────────────────────────────────────────╮    │
│  │  R$250 ─────────────────────╮          │    │
│  │                             │          │    │
│  │  R$0                        ╰──        │    │
│  │  Ago  Set  Out  Nov  Dez  Jan  Fev  Mar│    │
│  ╰────────────────────────────────────────╯    │
│                                                 │
│  Data         │ Valor    │ Status  │ Fatura     │
│  01/03/2026   │ R$ 250   │ ✅ Pago │ [PDF]      │
│  01/02/2026   │ R$ 250   │ ✅ Pago │ [PDF]      │
│  01/01/2026   │ R$ 250   │ ⚠️ Falhou│ [PDF]     │
│  15/01/2026   │ R$ 1.000 │ ✅ Pago │ [PDF]      │
│               │          │ (Setup) │            │
└─────────────────────────────────────────────────┘
```

---

## 11. Plano de implementação — Fases

### Fase A — Infraestrutura (pré-requisito para tudo)

**A1. Middleware de rotas** (1-2h)
- Criar `src/middleware.ts`
- Proteger `/dashboard/admin` — somente `role = 'admin'`
- Proteger `/dashboard/payments` — somente `admin` ou `client_admin`
- **Crítico:** Sem isso, qualquer usuário acessa qualquer página

**A2. Verificar role do usuário logado** (1h)
- Criar helper `src/lib/auth-helpers.ts` com função `getCurrentUserRole()`
- Usar nas páginas que precisam saber o role

---

### Fase B — Migration de billing da plataforma

**B1. Criar migration** `20260311200000_platform_client_subscriptions.sql`
- Tabelas: `platform_client_subscriptions`, `platform_payment_history`
- Alterar `clients` para adicionar `plan_status`, `plan_name`, `trial_ends_at`
- Executar: `supabase db push`

**B2. Webhook da plataforma**
- Criar `src/app/api/stripe/platform/webhooks/route.ts`
- Ouvir eventos V1 da conta Platform (não de Connected Accounts)
- Handlers: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Atualizar `platform_client_subscriptions` e `platform_payment_history`

---

### Fase C — API Routes do admin

**C1.** `GET /api/admin/clients` — lista todos os clientes com plano
**C2.** `GET /api/admin/clients/[id]` — detalhes completos
**C3.** `GET /api/admin/clients/[id]/payment-history` — histórico + resumo mensal

Todas verificam `role = 'admin'` no início da função.

---

### Fase D — UI do painel admin

**D1.** `src/app/dashboard/admin/clients/page.tsx` — tabela com filtros e busca
**D2.** `src/components/admin/ClientsTable.tsx` — componente da tabela
**D3.** `src/components/admin/ClientDetailsModal.tsx` — modal com 3 abas
**D4.** `src/components/admin/PaymentHistoryChart.tsx` — gráfico de linha (recharts, já usado no projeto)

---

### Fase E — Como criar assinatura de um cliente no plano UzzApp

Quando um cliente novo se cadastra, criar um Customer Stripe + iniciar trial:

```typescript
// Ao criar um novo cliente
const customer = await stripeClient.customers.create({
  email: clientEmail,
  name: clientName,
  metadata: { client_id: clientId }
})

const subscription = await stripeClient.subscriptions.create({
  customer: customer.id,
  items: [{ price: process.env.STRIPE_PLATFORM_PRICE_ID }],
  trial_period_days: 14,
})

// Salvar em platform_client_subscriptions
await supabase.from('platform_client_subscriptions').insert({
  client_id: clientId,
  stripe_customer_id: customer.id,
  stripe_subscription_id: subscription.id,
  status: 'trial',
  trial_start: new Date(),
  trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
})
```

---

## 12. Decisões Arquiteturais — Resolvidas

Todas as perguntas abertas foram respondidas em 11/03/2026.

---

### Decisão 1 — Client_id do admin: cliente especial "UzzAI"

**Solução adotada:** Criar um registro fixo na tabela `clients` representando a própria UzzAI.

```sql
-- Na migration de admin, inserir o cliente plataforma:
INSERT INTO public.clients (id, name, email, ...)
VALUES (
  '00000000-0000-0000-0000-000000000099',  -- UUID fixo e memorável
  'UzzAI',
  'admin@uzzai.com.br',
  ...
)
ON CONFLICT (id) DO NOTHING;

-- O usuário admin@uzzai.com.br terá:
-- user_profiles.role = 'admin'
-- user_profiles.client_id = '00000000-0000-0000-0000-000000000099'
```

**Por que esta abordagem:**
- Mantém `client_id NOT NULL` em `user_profiles` — sem quebrar schema existente
- As RLS que verificam `client_id = get_current_user_client_id()` continuam funcionando
- O admin tem um client_id real, mas as policies especiais de `role = 'admin'` sobrescrevem com acesso total
- Fácil de identificar nos logs e queries

**Env para o cliente UzzAI:**
```env
UZZAI_PLATFORM_CLIENT_ID=00000000-0000-0000-0000-000000000099
UZZAI_ADMIN_EMAIL=admin@uzzai.com.br
```

---

### Decisão 2 — Fluxo de onboarding de clientes hoje

**Fluxo atual (semi-manual):**
1. Cliente cria conta na plataforma via email (`uzzapp.uzzai.com.br/signup`)
2. Cliente tem acesso limitado/trial automaticamente
3. Pedro/equipe UzzAI realiza o setup manualmente
4. Pedro dá acesso completo ao cliente (ativa o plano no banco)

**Impacto no painel admin:**

O painel admin precisa ter uma ação manual de "Ativar cliente" que:
1. Cria o Customer no Stripe Platform
2. Inicia a subscription (trial ou pago)
3. Atualiza `platform_client_subscriptions`
4. Atualiza `clients.plan_status = 'active'`

Isso permite que Pedro veja no painel: "Clientes que se cadastraram mas ainda não foram ativados" — coluna extra `Ativado: Sim / Não`.

**No futuro (automatizar):** O webhook de `auth.users` pode disparar a criação do Customer Stripe automaticamente, mas hoje o setup manual é o fluxo. O painel admin facilita e centraliza esse processo.

---

### Decisão 3 — IDs do Stripe Platform

Ambos os produtos criados no Stripe Dashboard em 11/03/2026:

**Assinatura mensal:**

| Campo | Valor |
|-------|-------|
| Nome | UzzApp teste |
| Product ID | `prod_U839DGKHweCEa0` |
| Price ID | `price_1T9n2o4oGVf4uL6gpHjlCO8l` |
| Valor | R$ 249,00/mês (recorrente) |

**Setup fee (one-time):**

| Campo | Valor |
|-------|-------|
| Nome | Setup UzzApp |
| Product ID | `prod_U83EZ8MEm5CrU0` |
| Price ID | `price_1T9n854oGVf4uL6gX0CL7qZC` |
| Valor | R$ 1.000,00 (único) |

```env
# Stripe Platform — IDs reais de produção
STRIPE_PLATFORM_PRICE_ID=price_1T9n2o4oGVf4uL6gpHjlCO8l        # R$ 249,00/mês — UzzApp Pro
STRIPE_PLATFORM_PRODUCT_ID=prod_U839DGKHweCEa0

STRIPE_PLATFORM_SETUP_FEE_PRICE_ID=price_1T9n854oGVf4uL6gX0CL7qZC  # R$ 1.000,00 — Setup UzzApp
STRIPE_PLATFORM_SETUP_FEE_PRODUCT_ID=prod_U83EZ8MEm5CrU0
```

---

### Decisão 4 — URL e acesso ao painel admin

**URL de produção:** `uzzapp.uzzai.com.br` (não mais `uzzapp.uzzai.com.br`)

**Acesso ao painel admin:**
- URL: `uzzapp.uzzai.com.br/dashboard/admin`
- Login: `admin@uzzai.com.br` (conta com `role = 'admin'`)
- Mesma aplicação, mesmo domínio — middleware controla o acesso por role

**Não há subdomínio separado para admin.** A proteção é via middleware (`role = 'admin'`) + RLS no banco. Qualquer tentativa de acessar `/dashboard/admin` com outro role é redirecionada para `/dashboard`.

**Atualizar todas as referências de URL:**
```
uzzapp.uzzai.com.br  →  uzzapp.uzzai.com.br
```
Isso afeta: `.env.local`, `WEBHOOK_BASE_URL`, `NEXT_PUBLIC_APP_URL`, documentações.

---

### Decisão 5 — `last_sign_in_at` do Supabase

Usar `service_role` na API admin para buscar `auth.users.last_sign_in_at`. Seguro porque:
- A rota `/api/admin/clients/[id]` já verifica `role = 'admin'` antes de qualquer query
- O `service_role` nunca é exposto ao frontend — fica apenas no servidor
- Dados retornados ao frontend: apenas `last_sign_in_at` (string formatada), sem dados sensíveis de auth

```typescript
// Na API route /api/admin/clients/[id]
// Somente após verificar role = 'admin':
const supabaseAdmin = createServiceClient() // service_role
const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
const lastLogin = authUser?.user?.last_sign_in_at
```

---

## Resumo: O que mudar do que já existe

| Item | Mudança necessária | Decisão |
|------|--------------------|---------|
| `clients` tabela | Inserir client UzzAI com UUID fixo | UUID `00000000-0000-0000-0000-000000000099` |
| `clients` tabela | Adicionar `plan_status`, `plan_name`, `trial_ends_at`, `notes` | Nova migration |
| `stripe_accounts` RLS | Política para `admin` ver todos os clientes | `user_has_role('admin')` |
| `stripe_subscriptions` RLS | Política para `admin` ver todos | `user_has_role('admin')` |
| `stripe_products` RLS | Política para `admin` ver todos | `user_has_role('admin')` |
| `stripe_orders` RLS | Política para `admin` ver todos | `user_has_role('admin')` |
| Middleware | Proteger `/dashboard/admin` e `/dashboard/payments` | `src/middleware.ts` |
| Nova migration | `platform_client_subscriptions` + `platform_payment_history` | Contexto A |
| Webhook platform | Eventos da conta Platform (billing UzzAI→clientes) | `/api/stripe/platform/webhooks` |
| Admin pages | `/dashboard/admin/clients` — tabela + modal | Ação manual "Ativar cliente" |
| URLs no projeto | `chat.luisfboff.com` → `uzzapp.uzzai.com.br` | Todas as envs e docs |
| Envs novas | `STRIPE_PLATFORM_PRICE_ID`, `STRIPE_PLATFORM_SETUP_FEE_PRICE_ID` | Criar no Stripe Dashboard |
| Envs novas | `UZZAI_PLATFORM_CLIENT_ID`, `UZZAI_ADMIN_EMAIL` | Fixos após migration |

---

## Próximos passos imediatos

1. **Produtos no Stripe Dashboard** ✅ Ambos criados
   - ✅ UzzApp Pro — R$ 249/mês → `price_1T9n2o4oGVf4uL6gpHjlCO8l`
   - ✅ Setup UzzApp — R$ 1.000 one-time → `price_1T9n854oGVf4uL6gX0CL7qZC`

2. **Criar a migration de admin** com:
   - INSERT do cliente UzzAI (UUID fixo)
   - ALTER TABLE clients (plan_status, plan_name, etc.)
   - Tabelas platform_client_subscriptions + platform_payment_history
   - RLS admin nas tabelas Stripe Connect

3. **Criar `src/middleware.ts`** — proteção de rotas por role

4. **Implementar `/dashboard/admin/clients`** — tabela + modal

5. **Atualizar todas as URLs** de `chat.luisfboff.com` para `uzzapp.uzzai.com.br`

---

*Documento versão 2.0 — 11/03/2026. Complementa `STRIPE_CONNECT_INTEGRATION.md`. Todas as decisões arquiteturais tomadas, pronto para implementação.*
