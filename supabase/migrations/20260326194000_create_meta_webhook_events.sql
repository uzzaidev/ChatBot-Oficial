-- Store raw Meta webhook payloads before processing so failed handlers can be replayed/debugged.

CREATE TABLE IF NOT EXISTS public.meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  waba_id TEXT,
  webhook_field TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  signature TEXT,
  raw_body TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_client_id
  ON public.meta_webhook_events(client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_waba_id
  ON public.meta_webhook_events(waba_id)
  WHERE waba_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_field
  ON public.meta_webhook_events(webhook_field);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_status
  ON public.meta_webhook_events(processing_status);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_received_at
  ON public.meta_webhook_events(received_at DESC);

ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages meta webhook events" ON public.meta_webhook_events;
CREATE POLICY "Service role manages meta webhook events"
  ON public.meta_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.meta_webhook_events IS
  'Arquivo bruto dos webhooks da Meta/WhatsApp para debug, replay manual e investigação de falhas de processamento.';

COMMENT ON COLUMN public.meta_webhook_events.raw_body IS
  'Payload bruto exatamente como recebido da Meta.';

COMMENT ON COLUMN public.meta_webhook_events.payload IS
  'Payload parseado em JSONB para inspeção e consultas.';
