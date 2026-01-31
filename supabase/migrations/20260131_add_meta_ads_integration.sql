-- =============================================================================
-- META ADS INTEGRATION - Conversions API & Marketing API Support
-- Description: Adds columns and tables for Meta Ads conversion tracking
-- 
-- NOTE: Run each section separately if you encounter deadlocks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD META ADS COLUMNS TO CLIENTS TABLE
-- Store per-client Meta configuration for Conversions API
-- These values are stored directly (not in vault) as they are IDs, not secrets
-- -----------------------------------------------------------------------------

DO $$ 
BEGIN
  -- WhatsApp Business Account ID (for Conversions API user_data)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'meta_waba_id') THEN
    ALTER TABLE clients ADD COLUMN meta_waba_id TEXT;
  END IF;

  -- Dataset ID for Conversions API events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'meta_dataset_id') THEN
    ALTER TABLE clients ADD COLUMN meta_dataset_id TEXT;
  END IF;

  -- Ad Account ID for Marketing API insights
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'meta_ad_account_id') THEN
    ALTER TABLE clients ADD COLUMN meta_ad_account_id TEXT;
  END IF;
END $$;

COMMENT ON COLUMN clients.meta_waba_id IS 'WhatsApp Business Account ID for Conversions API';
COMMENT ON COLUMN clients.meta_dataset_id IS 'Meta Dataset ID for Conversions API events';
COMMENT ON COLUMN clients.meta_ad_account_id IS 'Meta Ad Account ID for Marketing API (without act_ prefix)';

-- -----------------------------------------------------------------------------
-- 2. CREATE CONVERSION EVENTS LOG TABLE
-- Track all sent conversion events for debugging and audit
-- Run this section AFTER section 1 completes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversion_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Event identification (card_id FK added later to avoid deadlock)
  card_id UUID,
  phone NUMERIC NOT NULL,
  event_id TEXT, -- Unique event ID for deduplication (uuid)
  
  -- Event details
  event_name TEXT NOT NULL CHECK (event_name IN ('Lead', 'QualifiedLead', 'InitiateCheckout', 'Purchase', 'CustomEvent')),
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Meta Ads tracking
  ctwa_clid TEXT, -- Click-to-WhatsApp click ID
  campaign_id TEXT,
  ad_id TEXT,
  
  -- Custom data
  custom_data JSONB DEFAULT '{}', -- value, currency, etc.
  
  -- API response tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  response JSONB, -- Full API response
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'success', 'error', 'skipped')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_event_id UNIQUE (client_id, event_id)
);

-- Add FK to crm_cards separately (avoids deadlock)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversion_events_log_card_id_fkey'
  ) THEN
    ALTER TABLE conversion_events_log 
    ADD CONSTRAINT conversion_events_log_card_id_fkey 
    FOREIGN KEY (card_id) REFERENCES crm_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversion_events_client ON conversion_events_log(client_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_card ON conversion_events_log(card_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_status ON conversion_events_log(status);
CREATE INDEX IF NOT EXISTS idx_conversion_events_name ON conversion_events_log(event_name);
CREATE INDEX IF NOT EXISTS idx_conversion_events_time ON conversion_events_log(event_time DESC);

COMMENT ON TABLE conversion_events_log IS 'Log of conversion events sent to Meta Conversions API';
COMMENT ON COLUMN conversion_events_log.event_id IS 'Unique event ID for deduplication (prevents double-sending)';
COMMENT ON COLUMN conversion_events_log.ctwa_clid IS 'Click-to-WhatsApp click ID from lead_sources';

-- -----------------------------------------------------------------------------
-- 3. ADD event_id TO LEAD_SOURCES FOR DEDUPLICATION
-- Optional column, won't break existing data
-- Run this section AFTER section 2 completes
-- -----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lead_sources' AND column_name = 'conversion_event_sent') THEN
    ALTER TABLE lead_sources ADD COLUMN conversion_event_sent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lead_sources' AND column_name = 'conversion_event_id') THEN
    ALTER TABLE lead_sources ADD COLUMN conversion_event_id UUID;
  END IF;
END $$;

-- Add FK separately to avoid deadlock
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_sources_conversion_event_id_fkey'
  ) THEN
    ALTER TABLE lead_sources 
    ADD CONSTRAINT lead_sources_conversion_event_id_fkey 
    FOREIGN KEY (conversion_event_id) REFERENCES conversion_events_log(id);
  END IF;
END $$;

COMMENT ON COLUMN lead_sources.conversion_event_sent IS 'Whether Lead conversion event was already sent';
COMMENT ON COLUMN lead_sources.conversion_event_id IS 'Reference to the conversion event log entry';

-- -----------------------------------------------------------------------------
-- 4. ENABLE RLS ON NEW TABLE
-- -----------------------------------------------------------------------------

ALTER TABLE conversion_events_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own client conversion events" ON conversion_events_log;
DROP POLICY IF EXISTS "Service role full access on conversion_events_log" ON conversion_events_log;

-- Policy: Users can only see their own client's conversion events
CREATE POLICY "Users can view own client conversion events"
  ON conversion_events_log
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can do anything (for API routes)
CREATE POLICY "Service role full access on conversion_events_log"
  ON conversion_events_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------------
-- 5. CREATE COLUMN → EVENT MAPPING TABLE (Optional)
-- Configurable mapping from CRM column to conversion event
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_column_event_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES crm_columns(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN ('Lead', 'QualifiedLead', 'InitiateCheckout', 'Purchase', 'CustomEvent')),
  
  -- Enable/disable per column
  enabled BOOLEAN DEFAULT true,
  
  -- Custom event details
  include_value BOOLEAN DEFAULT false, -- Include estimated_value from card
  currency TEXT DEFAULT 'BRL',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_column_event UNIQUE (column_id)
);

CREATE INDEX IF NOT EXISTS idx_column_event_client ON crm_column_event_mapping(client_id);
CREATE INDEX IF NOT EXISTS idx_column_event_column ON crm_column_event_mapping(column_id);

COMMENT ON TABLE crm_column_event_mapping IS 'Maps CRM columns to Meta conversion events';

-- Enable RLS
ALTER TABLE crm_column_event_mapping ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own client column mappings" ON crm_column_event_mapping;
DROP POLICY IF EXISTS "Service role full access on column_event_mapping" ON crm_column_event_mapping;

CREATE POLICY "Users can view own client column mappings"
  ON crm_column_event_mapping
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on column_event_mapping"
  ON crm_column_event_mapping
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------------
-- 6. INSERT DEFAULT COLUMN MAPPINGS FOR EXISTING CLIENTS
-- Maps default columns to standard Meta events
-- -----------------------------------------------------------------------------

-- Note: Run this after migration for each client that wants conversion tracking
-- INSERT INTO crm_column_event_mapping (client_id, column_id, event_name, include_value)
-- SELECT 
--   c.client_id,
--   c.id,
--   CASE c.slug
--     WHEN 'novo' THEN 'Lead'
--     WHEN 'qualificando' THEN 'QualifiedLead'
--     WHEN 'proposta' THEN 'InitiateCheckout'
--     WHEN 'fechado' THEN 'Purchase'
--     ELSE NULL
--   END,
--   CASE WHEN c.slug = 'fechado' THEN true ELSE false END
-- FROM crm_columns c
-- WHERE c.slug IN ('novo', 'qualificando', 'proposta', 'fechado')
--   AND NOT EXISTS (
--     SELECT 1 FROM crm_column_event_mapping m WHERE m.column_id = c.id
--   );
