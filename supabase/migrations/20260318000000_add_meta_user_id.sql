-- Add meta_user_id to clients table
-- Used by deauth handler to find which client to disable when Meta revokes permissions
-- Also stores provisioning_status for tracking auto-provisioning steps

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS meta_user_id TEXT;

-- Index for fast lookup during deauth (only non-null values)
CREATE INDEX IF NOT EXISTS idx_clients_meta_user_id
  ON public.clients(meta_user_id)
  WHERE meta_user_id IS NOT NULL;

-- Track provisioning steps completed during OAuth
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS provisioning_status JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.meta_user_id IS 'Meta user ID from OAuth, used for deauth callback matching';
COMMENT ON COLUMN public.clients.provisioning_status IS 'Tracks auto-provisioning steps: {waba_subscribed, phone_registered}';
