-- Add grace_period_ends_at to clients for billing lifecycle tracking
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Add index for cron enforcement queries
CREATE INDEX IF NOT EXISTS idx_clients_grace_period
ON public.clients(grace_period_ends_at)
WHERE grace_period_ends_at IS NOT NULL;

COMMENT ON COLUMN public.clients.grace_period_ends_at
IS 'Data limite do periodo de carencia apos inadimplencia. Apos esta data, WhatsApp e desconectado automaticamente.';
