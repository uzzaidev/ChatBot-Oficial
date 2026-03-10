-- Migration: create_account_deletion_requests
-- Tracks LGPD Art. 18 account/data deletion requests submitted by users or clients.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id     UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  email         TEXT        NOT NULL,
  requester_name TEXT,
  cnpj          TEXT,
  reason        TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  processed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT,
  certificate_issued BOOLEAN DEFAULT FALSE
);

-- Index for status-based queue processing
CREATE INDEX idx_deletion_requests_status
  ON public.account_deletion_requests(status, requested_at);

-- Index for lookup by email
CREATE INDEX idx_deletion_requests_email
  ON public.account_deletion_requests(email);

-- RLS: only service_role can read/write (admin-only table)
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own request (public-facing form, if implemented)
CREATE POLICY "users_can_insert_own_deletion_request"
  ON public.account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own request status
CREATE POLICY "users_can_view_own_deletion_request"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access (for admin processing)
CREATE POLICY "service_role_full_access"
  ON public.account_deletion_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.account_deletion_requests IS
  'LGPD Art. 18 — Tracks account and personal data deletion requests. '
  'Retention: requests kept for 5 years for audit trail (legal obligation). '
  'SLA: 15 business days to process per privacy policy.';

COMMENT ON COLUMN public.account_deletion_requests.status IS
  'pending = received, not yet processed; '
  'in_progress = being processed; '
  'completed = data deleted, certificate available; '
  'cancelled = cancelled by user or not applicable';
