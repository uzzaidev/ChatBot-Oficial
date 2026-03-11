-- ============================================================================
-- MIGRATION: Platform Client Subscriptions
-- Contexto A: UzzAI cobrando seus clientes (plataforma)
-- Data: 2026-03-11
-- ============================================================================

-- Campos de acesso rapido para status do plano no cadastro de clientes.
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'trial'
  CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_plan_status ON public.clients(plan_status);

-- Tabela principal: assinaturas da plataforma por cliente.
CREATE TABLE IF NOT EXISTS public.platform_client_subscriptions (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  stripe_customer_id          TEXT        NOT NULL UNIQUE,
  stripe_subscription_id      TEXT        UNIQUE,
  stripe_price_id             TEXT,

  plan_name                   TEXT        NOT NULL DEFAULT 'pro',
  plan_amount                 INTEGER     NOT NULL DEFAULT 25000,
  plan_currency               TEXT        NOT NULL DEFAULT 'brl',
  plan_interval               TEXT        DEFAULT 'month'
                              CHECK (plan_interval IN ('month', 'year')),
  status                      TEXT        NOT NULL DEFAULT 'trial'
                              CHECK (status IN ('trial','active','past_due','canceled','suspended','incomplete')),

  trial_start                 TIMESTAMPTZ,
  trial_end                   TIMESTAMPTZ,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN     DEFAULT false,
  canceled_at                 TIMESTAMPTZ,

  setup_fee_paid              BOOLEAN     DEFAULT false,
  setup_fee_amount            INTEGER,
  setup_fee_paid_at           TIMESTAMPTZ,

  last_payment_at             TIMESTAMPTZ,
  last_payment_amount         INTEGER,
  last_payment_status         TEXT,

  metadata                    JSONB       DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_subs_client_id
  ON public.platform_client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_status
  ON public.platform_client_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_subs_stripe_customer
  ON public.platform_client_subscriptions(stripe_customer_id);

DROP TRIGGER IF EXISTS update_platform_subs_updated_at ON public.platform_client_subscriptions;
CREATE TRIGGER update_platform_subs_updated_at
  BEFORE UPDATE ON public.platform_client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.platform_client_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all platform subscriptions" ON public.platform_client_subscriptions;
CREATE POLICY "Admins can manage all platform subscriptions"
  ON public.platform_client_subscriptions
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

DROP POLICY IF EXISTS "Clients can view own subscription" ON public.platform_client_subscriptions;
CREATE POLICY "Clients can view own subscription"
  ON public.platform_client_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    client_id = get_current_user_client_id()
  );

-- Historico de pagamentos da plataforma.
CREATE TABLE IF NOT EXISTS public.platform_payment_history (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform_subscription_id    UUID        REFERENCES public.platform_client_subscriptions(id) ON DELETE SET NULL,

  stripe_invoice_id           TEXT        NOT NULL UNIQUE,
  stripe_payment_intent_id    TEXT        UNIQUE,

  amount                      INTEGER     NOT NULL,
  currency                    TEXT        NOT NULL DEFAULT 'brl',
  status                      TEXT        NOT NULL,

  period_start                TIMESTAMPTZ,
  period_end                  TIMESTAMPTZ,
  paid_at                     TIMESTAMPTZ,

  invoice_url                 TEXT,
  invoice_pdf                 TEXT,

  metadata                    JSONB       DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_client_id
  ON public.platform_payment_history(client_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status
  ON public.platform_payment_history(status);

ALTER TABLE public.platform_payment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all payment history" ON public.platform_payment_history;
CREATE POLICY "Admins can view all payment history"
  ON public.platform_payment_history
  FOR SELECT
  TO authenticated
  USING (user_has_role('admin'));

DROP POLICY IF EXISTS "Clients can view own payment history" ON public.platform_payment_history;
CREATE POLICY "Clients can view own payment history"
  ON public.platform_payment_history
  FOR SELECT
  TO authenticated
  USING (
    client_id = get_current_user_client_id()
  );

DROP POLICY IF EXISTS "Service role full access payment history" ON public.platform_payment_history;
CREATE POLICY "Service role full access payment history"
  ON public.platform_payment_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ajuste do Contexto B: permitir admin da plataforma ver todo Stripe Connect.
DROP POLICY IF EXISTS "Admins can manage all stripe accounts" ON public.stripe_accounts;
CREATE POLICY "Admins can manage all stripe accounts"
  ON public.stripe_accounts
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

DROP POLICY IF EXISTS "Admins can manage all stripe products" ON public.stripe_products;
CREATE POLICY "Admins can manage all stripe products"
  ON public.stripe_products
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

DROP POLICY IF EXISTS "Admins can manage all stripe subscriptions" ON public.stripe_subscriptions;
CREATE POLICY "Admins can manage all stripe subscriptions"
  ON public.stripe_subscriptions
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

DROP POLICY IF EXISTS "Admins can manage all stripe orders" ON public.stripe_orders;
CREATE POLICY "Admins can manage all stripe orders"
  ON public.stripe_orders
  FOR ALL
  TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

DROP POLICY IF EXISTS "Admins can read webhook events" ON public.webhook_events;
CREATE POLICY "Admins can read webhook events"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (user_has_role('admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_client_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_payment_history TO service_role;
GRANT SELECT ON public.platform_client_subscriptions TO authenticated;
GRANT SELECT ON public.platform_payment_history TO authenticated;

