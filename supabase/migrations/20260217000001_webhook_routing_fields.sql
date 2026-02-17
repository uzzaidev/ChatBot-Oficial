-- Migration: Add webhook routing fields for single-webhook multi-tenant support
-- Safe to run on existing DB: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS

-- 1. Unique constraint on meta_waba_id (prevent duplicate WABAs)
-- Only adds if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_meta_waba_id_unique'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_meta_waba_id_unique UNIQUE (meta_waba_id);
  END IF;
END $$;

-- 2. Index for fast WABA → client lookup
CREATE INDEX IF NOT EXISTS idx_clients_meta_waba_id
  ON clients(meta_waba_id)
  WHERE meta_waba_id IS NOT NULL;

-- 3. Webhook routing mode (legacy = old per-client URL, waba = new single webhook)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS webhook_routing_mode TEXT DEFAULT 'legacy'
  CHECK (webhook_routing_mode IN ('legacy', 'waba', 'both'));

-- 4. Auto-provisioned flag
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auto_provisioned BOOLEAN DEFAULT false;

-- 5. Provisioned timestamp
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ;

COMMENT ON COLUMN clients.webhook_routing_mode IS 'Webhook routing: legacy (per-client URL), waba (single URL by WABA ID), both (migration phase)';
COMMENT ON COLUMN clients.auto_provisioned IS 'true if client was created automatically via Embedded Signup OAuth flow';
COMMENT ON COLUMN clients.provisioned_at IS 'When auto-provisioning occurred';

-- 6. Make meta_verify_token_secret_id nullable
-- New OAuth-created clients use the shared platform verify token (META_PLATFORM_VERIFY_TOKEN)
-- instead of a per-client verify token, so this field is not required for them.
-- Legacy clients keep their existing value.
ALTER TABLE clients
  ALTER COLUMN meta_verify_token_secret_id DROP NOT NULL;
