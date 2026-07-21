-- ============================================================================
-- MIGRATION: Subscription Renewal Reminders
-- Log de envio do aviso de renovacao automatica (D-7) para evitar duplicidade.
-- Data: 2026-07-21
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_renewal_reminders (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subscription_id   UUID        REFERENCES public.platform_client_subscriptions(id) ON DELETE CASCADE,

  period_end        TIMESTAMPTZ NOT NULL,
  email_to          TEXT        NOT NULL,

  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(client_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_client_id
  ON public.subscription_renewal_reminders(client_id);

ALTER TABLE public.subscription_renewal_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all renewal reminders" ON public.subscription_renewal_reminders;
CREATE POLICY "Admins can view all renewal reminders"
  ON public.subscription_renewal_reminders
  FOR SELECT
  TO authenticated
  USING (user_has_role('admin'));

DROP POLICY IF EXISTS "Clients can view own renewal reminders" ON public.subscription_renewal_reminders;
CREATE POLICY "Clients can view own renewal reminders"
  ON public.subscription_renewal_reminders
  FOR SELECT
  TO authenticated
  USING (
    client_id = get_current_user_client_id()
  );

DROP POLICY IF EXISTS "Service role full access renewal reminders" ON public.subscription_renewal_reminders;
CREATE POLICY "Service role full access renewal reminders"
  ON public.subscription_renewal_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_renewal_reminders TO service_role;
GRANT SELECT ON public.subscription_renewal_reminders TO authenticated;
