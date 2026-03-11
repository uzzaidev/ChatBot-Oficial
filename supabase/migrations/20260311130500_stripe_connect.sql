-- ============================================================================
-- MIGRATION: Stripe Connect module (accounts, products, subscriptions, orders)
-- Data: 2026-03-11
-- ============================================================================

-- Reutiliza trigger padrao de updated_at caso ainda nao exista.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Tabela: stripe_accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stripe_account_id   TEXT        NOT NULL UNIQUE,
  account_status      TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (account_status IN ('pending','onboarding','active','restricted','disabled')),
  charges_enabled     BOOLEAN     NOT NULL DEFAULT false,
  payouts_enabled     BOOLEAN     NOT NULL DEFAULT false,
  details_submitted   BOOLEAN     NOT NULL DEFAULT false,
  country             TEXT        NOT NULL DEFAULT 'us',
  currency            TEXT        NOT NULL DEFAULT 'usd',
  requirements        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_client_id
  ON public.stripe_accounts(client_id);

-- ============================================================================
-- Tabela: stripe_products
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_products (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stripe_account_id   TEXT        NOT NULL,
  stripe_product_id   TEXT        NOT NULL UNIQUE,
  stripe_price_id     TEXT,
  name                TEXT        NOT NULL,
  description         TEXT,
  type                TEXT        NOT NULL DEFAULT 'one_time'
                      CHECK (type IN ('one_time','subscription')),
  amount              INTEGER     NOT NULL DEFAULT 0,
  currency            TEXT        NOT NULL DEFAULT 'usd',
  interval            TEXT        CHECK (interval IS NULL OR interval IN ('month','year')),
  active              BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_products_client_id
  ON public.stripe_products(client_id);

CREATE INDEX IF NOT EXISTS idx_stripe_products_active
  ON public.stripe_products(active);

CREATE INDEX IF NOT EXISTS idx_stripe_products_account
  ON public.stripe_products(stripe_account_id);

-- ============================================================================
-- Tabela: stripe_subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                 UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stripe_account_id         TEXT        NOT NULL,
  stripe_subscription_id    TEXT        NOT NULL UNIQUE,
  stripe_customer_id        TEXT        NOT NULL,
  stripe_price_id           TEXT        NOT NULL,
  product_id                UUID        REFERENCES public.stripe_products(id) ON DELETE SET NULL,
  status                    TEXT        NOT NULL,
  customer_email            TEXT,
  customer_name             TEXT,
  customer_phone            TEXT,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN     NOT NULL DEFAULT false,
  canceled_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_client_id
  ON public.stripe_subscriptions(client_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
  ON public.stripe_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_account
  ON public.stripe_subscriptions(stripe_account_id);

-- ============================================================================
-- Tabela: stripe_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_orders (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                 UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stripe_account_id         TEXT        NOT NULL,
  stripe_payment_intent_id  TEXT        NOT NULL UNIQUE,
  stripe_session_id         TEXT,
  product_id                UUID        REFERENCES public.stripe_products(id) ON DELETE SET NULL,
  status                    TEXT        NOT NULL,
  amount                    INTEGER     NOT NULL,
  application_fee_amount    INTEGER,
  currency                  TEXT        NOT NULL DEFAULT 'usd',
  customer_email            TEXT,
  customer_name             TEXT,
  customer_phone            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_client_id
  ON public.stripe_orders(client_id);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_status
  ON public.stripe_orders(status);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_account
  ON public.stripe_orders(stripe_account_id);

-- ============================================================================
-- Tabela: webhook_events (idempotencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id   TEXT        NOT NULL UNIQUE,
  event_scope       TEXT        NOT NULL DEFAULT 'v1',
  event_type        TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received','processing','processed','failed')),
  error_message     TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_scope
  ON public.webhook_events(event_scope);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(status);

-- ============================================================================
-- Triggers de updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_stripe_accounts_updated_at ON public.stripe_accounts;
CREATE TRIGGER update_stripe_accounts_updated_at
  BEFORE UPDATE ON public.stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_products_updated_at ON public.stripe_products;
CREATE TRIGGER update_stripe_products_updated_at
  BEFORE UPDATE ON public.stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_subscriptions_updated_at ON public.stripe_subscriptions;
CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_orders_updated_at ON public.stripe_orders;
CREATE TRIGGER update_stripe_orders_updated_at
  BEFORE UPDATE ON public.stripe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own stripe account" ON public.stripe_accounts;
DROP POLICY IF EXISTS "Users can insert own stripe account" ON public.stripe_accounts;
DROP POLICY IF EXISTS "Users can update own stripe account" ON public.stripe_accounts;
CREATE POLICY "Users can read own stripe account"
  ON public.stripe_accounts
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own stripe account"
  ON public.stripe_accounts
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update own stripe account"
  ON public.stripe_accounts
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read own stripe products" ON public.stripe_products;
DROP POLICY IF EXISTS "Users can write own stripe products" ON public.stripe_products;
DROP POLICY IF EXISTS "Anon can read active stripe products" ON public.stripe_products;
CREATE POLICY "Users can read own stripe products"
  ON public.stripe_products
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can write own stripe products"
  ON public.stripe_products
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Anon can read active stripe products"
  ON public.stripe_products
  FOR SELECT
  TO anon
  USING (active = true);

DROP POLICY IF EXISTS "Users can read own stripe subscriptions" ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "Users can write own stripe subscriptions" ON public.stripe_subscriptions;
CREATE POLICY "Users can read own stripe subscriptions"
  ON public.stripe_subscriptions
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can write own stripe subscriptions"
  ON public.stripe_subscriptions
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read own stripe orders" ON public.stripe_orders;
DROP POLICY IF EXISTS "Users can write own stripe orders" ON public.stripe_orders;
CREATE POLICY "Users can read own stripe orders"
  ON public.stripe_orders
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can write own stripe orders"
  ON public.stripe_orders
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Nenhuma policy para webhook_events (somente service_role deve acessar).

-- ============================================================================
-- Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_orders TO authenticated;
GRANT SELECT ON public.stripe_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_orders TO service_role;

