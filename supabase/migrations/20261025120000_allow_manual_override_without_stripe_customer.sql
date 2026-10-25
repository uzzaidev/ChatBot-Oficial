-- Manual access overrides (POST /api/admin/billing/override) create a
-- platform_client_subscriptions row without Stripe IDs. stripe_customer_id was
-- NOT NULL, so every override silently failed. UNIQUE still applies to non-null values.
ALTER TABLE public.platform_client_subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL;
