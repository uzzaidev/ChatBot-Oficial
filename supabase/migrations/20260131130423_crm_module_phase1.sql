-- =============================================================================
-- CRM MODULE - Phase 1 Migration
-- Description: Kanban-style CRM for WhatsApp leads with drag-drop, tags, notes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRM_COLUMNS - Colunas do Kanban
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

CREATE INDEX idx_crm_columns_client ON crm_columns(client_id);
CREATE INDEX idx_crm_columns_position ON crm_columns(client_id, position);

COMMENT ON TABLE crm_columns IS 'Colunas do Kanban CRM por cliente';
COMMENT ON COLUMN crm_columns.slug IS 'Identificador único da coluna (ex: novo, qualificando)';
COMMENT ON COLUMN crm_columns.auto_rules IS 'Regras de automação de movimentação de cards';
COMMENT ON COLUMN crm_columns.is_default IS 'Coluna padrão para novos contatos';

-- -----------------------------------------------------------------------------
-- 2. CRM_CARDS - Cards de Leads
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

CREATE INDEX idx_crm_cards_client ON crm_cards(client_id);
CREATE INDEX idx_crm_cards_column ON crm_cards(column_id);
CREATE INDEX idx_crm_cards_assigned ON crm_cards(assigned_to);
CREATE INDEX idx_crm_cards_auto_status ON crm_cards(client_id, auto_status);
CREATE INDEX idx_crm_cards_position ON crm_cards(column_id, position);
CREATE INDEX idx_crm_cards_last_message ON crm_cards(last_message_at DESC);

COMMENT ON TABLE crm_cards IS 'Cards de leads/contatos no CRM Kanban';
COMMENT ON COLUMN crm_cards.auto_status IS 'Status automático baseado na última mensagem';
COMMENT ON COLUMN crm_cards.position IS 'Posição do card na coluna (para ordenação)';
COMMENT ON COLUMN crm_cards.probability IS 'Probabilidade de fechamento (0-100%)';

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

CREATE INDEX idx_crm_tags_client ON crm_tags(client_id);

COMMENT ON TABLE crm_tags IS 'Tags para categorização de cards CRM';
COMMENT ON COLUMN crm_tags.is_system IS 'Tag do sistema (não pode ser deletada)';

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

CREATE INDEX idx_card_tags_card ON crm_card_tags(card_id);
CREATE INDEX idx_card_tags_tag ON crm_card_tags(tag_id);

COMMENT ON TABLE crm_card_tags IS 'Relacionamento N:N entre cards e tags';

-- -----------------------------------------------------------------------------
-- 5. CRM_NOTES - Anotações
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

CREATE INDEX idx_crm_notes_card ON crm_notes(card_id);
CREATE INDEX idx_crm_notes_pinned ON crm_notes(card_id, is_pinned) WHERE is_pinned = true;

COMMENT ON TABLE crm_notes IS 'Notas e anotações em cards do CRM';
COMMENT ON COLUMN crm_notes.is_pinned IS 'Nota fixada no topo';

-- -----------------------------------------------------------------------------
-- 6. CRM_ACTIVITY_LOG - Histórico de Atividades
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

CREATE INDEX idx_activity_log_card ON crm_activity_log(card_id);
CREATE INDEX idx_activity_log_client ON crm_activity_log(client_id);
CREATE INDEX idx_activity_log_date ON crm_activity_log(created_at DESC);

COMMENT ON TABLE crm_activity_log IS 'Histórico de atividades em cards do CRM';
COMMENT ON COLUMN crm_activity_log.is_automated IS 'Ação executada automaticamente pelo sistema';

-- -----------------------------------------------------------------------------
-- 7. RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role access for all tables (used by webhook/API)
CREATE POLICY "Service role full access columns" ON crm_columns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access cards" ON crm_cards FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access tags" ON crm_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access card_tags" ON crm_card_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access notes" ON crm_notes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access activity_log" ON crm_activity_log FOR ALL USING (auth.role() = 'service_role');

-- User access policies (same client only)
CREATE POLICY "Users view own client columns" ON crm_columns
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users view own client cards" ON crm_cards
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users view own client tags" ON crm_tags
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 8. HELPER FUNCTION - Move Card Atomically
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

COMMENT ON FUNCTION crm_move_card IS 'Move card atomically with position reordering and activity logging';

-- -----------------------------------------------------------------------------
-- 9. TRIGGER - Auto-create card when contact is created
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

CREATE TRIGGER trg_auto_create_crm_card
AFTER INSERT ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION auto_create_crm_card();

COMMENT ON FUNCTION auto_create_crm_card IS 'Automatically create CRM card when new contact is added';

-- -----------------------------------------------------------------------------
-- 10. UPDATED_AT TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_columns_updated_at
BEFORE UPDATE ON crm_columns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_cards_updated_at
BEFORE UPDATE ON crm_cards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_tags_updated_at
BEFORE UPDATE ON crm_tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_notes_updated_at
BEFORE UPDATE ON crm_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
