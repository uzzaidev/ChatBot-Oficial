-- =============================================================================
-- Notification Logs JSON Indexes
-- Date: 2026-03-16
-- =============================================================================

-- Speeds up lookups used by push lifecycle and budget-alert dedup
CREATE INDEX IF NOT EXISTS idx_notification_logs_data_type
  ON public.notification_logs ((data->>'type'));

CREATE INDEX IF NOT EXISTS idx_notification_logs_data_phone
  ON public.notification_logs ((data->>'phone'));

CREATE INDEX IF NOT EXISTS idx_notification_logs_data_wamid
  ON public.notification_logs ((data->>'wamid'));

CREATE INDEX IF NOT EXISTS idx_notification_logs_budget_threshold
  ON public.notification_logs ((data->>'threshold'))
  WHERE (data->>'type') = 'budget_alert';

CREATE INDEX IF NOT EXISTS idx_notification_logs_budget_period_start
  ON public.notification_logs ((data->>'period_start'))
  WHERE (data->>'type') = 'budget_alert';
