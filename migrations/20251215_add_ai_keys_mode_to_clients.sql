-- Add AI keys mode to clients (platform-only default, BYOK optional)
-- platform_only: always use shared_gateway_config provider keys
-- byok_allowed: prefer client Vault keys when present, else fallback to shared keys

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS ai_keys_mode TEXT NOT NULL DEFAULT 'platform_only';

-- Backfill/normalize in case the column already existed (e.g. nullable from an older deploy)
UPDATE public.clients
SET ai_keys_mode = 'platform_only'
WHERE ai_keys_mode IS NULL;

ALTER TABLE public.clients
ALTER COLUMN ai_keys_mode SET DEFAULT 'platform_only';

ALTER TABLE public.clients
ALTER COLUMN ai_keys_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_ai_keys_mode_check'
  ) THEN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_ai_keys_mode_check
    CHECK (ai_keys_mode IN ('platform_only', 'byok_allowed'));
  END IF;
END $$;
