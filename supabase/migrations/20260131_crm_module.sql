-- =============================================================================
-- CRM MODULE - Migration
-- Created: 2026-01-31
-- Description: Creates tables for CRM Kanban functionality including columns,
-- cards, tags, notes, scheduled messages, lead sources, automation rules,
-- and activity logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRM_COLUMNS - Kanban Columns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Column properties
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'default',              -- Tailwind color name: 'mint', 'blue', 'gold', etc.
  icon TEXT DEFAULT 'users',                 -- Lucide icon name

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-move rules
  auto_rules JSONB DEFAULT '{}',

  -- System flags
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_column_slug UNIQUE (client_id, slug),
  CONSTRAINT unique_client_column_position UNIQUE (client_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_crm_columns_client ON crm_columns(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_columns_position ON crm_columns(client_id, position);

-- -----------------------------------------------------------------------------
-- 2. CRM_CARDS - Lead Cards
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES crm_columns(id) ON DELETE RESTRICT,

  -- Contact reference
  phone NUMERIC NOT NULL,

  -- Card properties
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-status tracking
  auto_status TEXT DEFAULT 'neutral' CHECK (auto_status IN ('awaiting_attendant', 'awaiting_client', 'neutral')),
  auto_status_updated_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Lead value
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,

  -- Last interaction tracking
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT CHECK (last_message_direction IN ('incoming', 'outgoing')),
  last_message_preview TEXT,

  -- Timestamps
  moved_to_column_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_card_contact FOREIGN KEY (phone, client_id)
    REFERENCES clientes_whatsapp(telefone, client_id),
  CONSTRAINT unique_client_phone_card UNIQUE (client_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_crm_cards_client ON crm_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_column ON crm_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_assigned ON crm_cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_cards_auto_status ON crm_cards(client_id, auto_status);
CREATE INDEX IF NOT EXISTS idx_crm_cards_position ON crm_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_crm_cards_last_message ON crm_cards(last_message_at DESC);

-- -----------------------------------------------------------------------------
-- 3. CRM_TAGS - Tags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',                  -- Tailwind color name
  description TEXT,

  -- System flags
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_tag_name UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crm_tags_client ON crm_tags(client_id);

-- -----------------------------------------------------------------------------
-- 4. CRM_CARD_TAGS - Junction Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_card_tags (
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),

  PRIMARY KEY (card_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_card_tags_card ON crm_card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag ON crm_card_tags(tag_id);

-- -----------------------------------------------------------------------------
-- 5. CRM_NOTES - Notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),

  is_pinned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_card ON crm_notes(card_id);

-- -----------------------------------------------------------------------------
-- 6. SCHEDULED_MESSAGES - Scheduled Messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Target
  phone NUMERIC NOT NULL,
  card_id UUID REFERENCES crm_cards(id) ON DELETE SET NULL,

  -- Message content
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template')),
  content TEXT,
  template_id UUID REFERENCES message_templates(id),
  template_params JSONB,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  wamid TEXT,

  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_client ON scheduled_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON scheduled_messages(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_card ON scheduled_messages(card_id);

-- -----------------------------------------------------------------------------
-- 7. LEAD_SOURCES - Lead Source Tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_ads', 'organic', 'referral', 'manual')),
  source_name TEXT,

  -- Meta Ads specific fields
  meta_campaign_id TEXT,
  meta_campaign_name TEXT,
  meta_adset_id TEXT,
  meta_adset_name TEXT,
  meta_ad_id TEXT,
  meta_ad_name TEXT,

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Raw data
  raw_referral_data JSONB,

  -- First touch attribution
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_client ON lead_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_phone ON lead_sources(phone, client_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_campaign ON lead_sources(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON lead_sources(client_id, source_type);

-- -----------------------------------------------------------------------------
-- 8. CRM_AUTOMATION_RULES - Automation Rules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Rule definition
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_in_column', 'no_response', 'message_received', 'tag_added')),
  trigger_config JSONB NOT NULL,

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('move_column', 'add_tag', 'send_message', 'assign_user', 'notify')),
  action_config JSONB NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_client ON crm_automation_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON crm_automation_rules(client_id, is_enabled);

-- -----------------------------------------------------------------------------
-- 9. CRM_ACTIVITY_LOG - Activity History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN ('column_move', 'tag_add', 'tag_remove', 'note_add', 'assigned', 'status_change', 'value_change', 'created')),
  description TEXT,

  -- Change tracking
  old_value JSONB,
  new_value JSONB,

  -- Actor
  performed_by UUID REFERENCES user_profiles(id),
  is_automated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_card ON crm_activity_log(card_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client ON crm_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON crm_activity_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role access for all tables (used by webhook/API)
DO $$
BEGIN
  -- crm_columns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_columns' AND policyname = 'Service role full access crm_columns') THEN
    CREATE POLICY "Service role full access crm_columns" ON crm_columns FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_cards
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_cards' AND policyname = 'Service role full access crm_cards') THEN
    CREATE POLICY "Service role full access crm_cards" ON crm_cards FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_tags' AND policyname = 'Service role full access crm_tags') THEN
    CREATE POLICY "Service role full access crm_tags" ON crm_tags FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_card_tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_card_tags' AND policyname = 'Service role full access crm_card_tags') THEN
    CREATE POLICY "Service role full access crm_card_tags" ON crm_card_tags FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_notes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Service role full access crm_notes') THEN
    CREATE POLICY "Service role full access crm_notes" ON crm_notes FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- scheduled_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_messages' AND policyname = 'Service role full access scheduled_messages') THEN
    CREATE POLICY "Service role full access scheduled_messages" ON scheduled_messages FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- lead_sources
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_sources' AND policyname = 'Service role full access lead_sources') THEN
    CREATE POLICY "Service role full access lead_sources" ON lead_sources FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_automation_rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_automation_rules' AND policyname = 'Service role full access crm_automation_rules') THEN
    CREATE POLICY "Service role full access crm_automation_rules" ON crm_automation_rules FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- crm_activity_log
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_activity_log' AND policyname = 'Service role full access crm_activity_log') THEN
    CREATE POLICY "Service role full access crm_activity_log" ON crm_activity_log FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. HELPER FUNCTION - Move Card Atomically
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_move_card(
  p_card_id UUID,
  p_target_column_id UUID,
  p_target_position INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_column_id UUID;
  v_old_position INTEGER;
  v_max_position INTEGER;
  v_client_id UUID;
BEGIN
  -- Get current card info
  SELECT column_id, position, client_id
  INTO v_old_column_id, v_old_position, v_client_id
  FROM crm_cards WHERE id = p_card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  -- Get max position in target column if not specified
  IF p_target_position IS NULL THEN
    SELECT COALESCE(MAX(position) + 1, 0) INTO p_target_position
    FROM crm_cards WHERE column_id = p_target_column_id;
  END IF;

  -- If same column, just reorder
  IF v_old_column_id = p_target_column_id THEN
    -- Shift cards in same column
    IF v_old_position < p_target_position THEN
      UPDATE crm_cards SET position = position - 1
      WHERE column_id = v_old_column_id
        AND position > v_old_position
        AND position <= p_target_position;
    ELSE
      UPDATE crm_cards SET position = position + 1
      WHERE column_id = v_old_column_id
        AND position >= p_target_position
        AND position < v_old_position;
    END IF;
  ELSE
    -- Moving to different column
    -- Shift cards in old column
    UPDATE crm_cards SET position = position - 1
    WHERE column_id = v_old_column_id
      AND position > v_old_position;

    -- Shift cards in target column
    UPDATE crm_cards SET position = position + 1
    WHERE column_id = p_target_column_id
      AND position >= p_target_position;
  END IF;

  -- Update the card
  UPDATE crm_cards SET
    column_id = p_target_column_id,
    position = p_target_position,
    moved_to_column_at = CASE
      WHEN v_old_column_id != p_target_column_id THEN NOW()
      ELSE moved_to_column_at
    END,
    updated_at = NOW()
  WHERE id = p_card_id;

  -- Log activity if column changed
  IF v_old_column_id != p_target_column_id THEN
    INSERT INTO crm_activity_log (client_id, card_id, activity_type, old_value, new_value, is_automated)
    VALUES (
      v_client_id,
      p_card_id,
      'column_move',
      jsonb_build_object('column_id', v_old_column_id),
      jsonb_build_object('column_id', p_target_column_id),
      false
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. TRIGGER - Auto-create card when contact is created
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_create_crm_card()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_column_id UUID;
  v_next_position INTEGER;
BEGIN
  -- Get default column for this client
  SELECT id INTO v_default_column_id
  FROM crm_columns
  WHERE client_id = NEW.client_id AND is_default = true
  LIMIT 1;

  -- If no default column exists, skip
  IF v_default_column_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get next position
  SELECT COALESCE(MAX(position) + 1, 0) INTO v_next_position
  FROM crm_cards WHERE column_id = v_default_column_id;

  -- Create card
  INSERT INTO crm_cards (client_id, column_id, phone, position)
  VALUES (NEW.client_id, v_default_column_id, NEW.telefone, v_next_position)
  ON CONFLICT (client_id, phone) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_create_crm_card ON clientes_whatsapp;
CREATE TRIGGER trg_auto_create_crm_card
AFTER INSERT ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION auto_create_crm_card();

-- -----------------------------------------------------------------------------
-- 13. FUNCTION - Seed default columns for a client
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_seed_default_columns(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if columns already exist for this client
  IF EXISTS (SELECT 1 FROM crm_columns WHERE client_id = p_client_id) THEN
    RETURN;
  END IF;

  -- Insert default columns
  INSERT INTO crm_columns (client_id, name, slug, color, icon, position, is_default)
  VALUES
    (p_client_id, 'Novo Lead', 'novo-lead', 'blue', 'user-plus', 0, true),
    (p_client_id, 'Qualificando', 'qualificando', 'gold', 'user-check', 1, false),
    (p_client_id, 'Proposta', 'proposta', 'mint', 'file-text', 2, false),
    (p_client_id, 'Fechado', 'fechado', 'mint', 'check-circle', 3, false);
END;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
