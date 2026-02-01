-- ============================================================================
-- META ADS FEATURES - PHASE 2.5
-- Budget Alerts, Lead Ads Tracking, Audience Sync
-- ============================================================================

-- Budget Alerts Table
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_spend', 'monthly_spend', 'campaign_spend', 'cpl_threshold')),
  threshold NUMERIC(12, 2) NOT NULL,
  current_value NUMERIC(12, 2) DEFAULT 0,
  campaign_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  notification_channels TEXT[] DEFAULT ARRAY['dashboard'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, name)
);

-- Index for active alerts lookup
CREATE INDEX IF NOT EXISTS idx_budget_alerts_active 
ON public.budget_alerts(client_id, is_active) 
WHERE is_active = true;

-- Notifications Table (for dashboard alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON public.notifications(client_id, read, created_at DESC) 
WHERE read = false;

-- Lead Ads Events Log (for tracking leadgen webhook events)
CREATE TABLE IF NOT EXISTS public.lead_ads_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  leadgen_id TEXT NOT NULL,
  form_id TEXT,
  ad_id TEXT,
  campaign_id TEXT,
  page_id TEXT,
  phone TEXT,
  email TEXT,
  full_name TEXT,
  lead_data JSONB DEFAULT '{}',
  card_id UUID REFERENCES public.crm_cards(id) ON DELETE SET NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, leadgen_id)
);

-- Index for unprocessed leads
CREATE INDEX IF NOT EXISTS idx_lead_ads_unprocessed 
ON public.lead_ads_events(client_id, processed, created_at) 
WHERE processed = false;

-- Audience Sync History
CREATE TABLE IF NOT EXISTS public.audience_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  audience_id TEXT NOT NULL,
  audience_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_filter JSONB DEFAULT '{}',
  users_synced INTEGER DEFAULT 0,
  session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for recent syncs
CREATE INDEX IF NOT EXISTS idx_audience_sync_recent 
ON public.audience_sync_history(client_id, created_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Budget Alerts
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_alerts_select" ON public.budget_alerts
  FOR SELECT USING (true);

CREATE POLICY "budget_alerts_all" ON public.budget_alerts
  FOR ALL USING (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "notifications_all" ON public.notifications
  FOR ALL USING (true);

-- Lead Ads Events
ALTER TABLE public.lead_ads_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_ads_events_select" ON public.lead_ads_events
  FOR SELECT USING (true);

CREATE POLICY "lead_ads_events_all" ON public.lead_ads_events
  FOR ALL USING (true);

-- Audience Sync History
ALTER TABLE public.audience_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audience_sync_history_select" ON public.audience_sync_history
  FOR SELECT USING (true);

CREATE POLICY "audience_sync_history_all" ON public.audience_sync_history
  FOR ALL USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.budget_alerts IS 'Budget monitoring alerts for Meta Ads spend';
COMMENT ON TABLE public.notifications IS 'Dashboard notifications for alerts and events';
COMMENT ON TABLE public.lead_ads_events IS 'Lead Ads form submissions from Meta webhook';
COMMENT ON TABLE public.audience_sync_history IS 'History of CRM to Meta audience syncs';

COMMENT ON COLUMN public.budget_alerts.alert_type IS 'Type: daily_spend, monthly_spend, campaign_spend, cpl_threshold';
COMMENT ON COLUMN public.budget_alerts.notification_channels IS 'Array of: email, dashboard, webhook';
COMMENT ON COLUMN public.lead_ads_events.lead_data IS 'Full lead form data from Meta API';
