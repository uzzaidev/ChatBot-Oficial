-- =============================================================================
-- USER FILTER PREFERENCES - Integração Conversações <> CRM
-- Description: Preferências de filtros do usuário no header de conversações
-- Integra com crm_tags e crm_columns existentes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USER_FILTER_PREFERENCES - Preferências de Filtros
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_filter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Filter type
  filter_type TEXT NOT NULL CHECK (filter_type IN ('default', 'tag', 'column')),

  -- Reference to filter (NULL for default filters like 'all', 'bot', 'humano')
  filter_id UUID,  -- References crm_tags.id or crm_columns.id depending on filter_type

  -- Default filter value (for filter_type = 'default')
  default_filter_value TEXT,  -- 'all', 'bot', 'humano', 'transferido', 'fluxo_inicial'

  -- Display properties
  enabled BOOLEAN DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,

  -- Custom display (optional override)
  custom_label TEXT,
  custom_icon TEXT,
  custom_color TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_filter UNIQUE (user_id, filter_type, filter_id, default_filter_value),
  CONSTRAINT check_filter_reference CHECK (
    (filter_type = 'default' AND filter_id IS NULL AND default_filter_value IS NOT NULL) OR
    (filter_type = 'tag' AND filter_id IS NOT NULL AND default_filter_value IS NULL) OR
    (filter_type = 'column' AND filter_id IS NOT NULL AND default_filter_value IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_filter_prefs_user ON user_filter_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_filter_prefs_position ON user_filter_preferences(user_id, "position");
CREATE INDEX IF NOT EXISTS idx_user_filter_prefs_enabled ON user_filter_preferences(user_id, enabled) WHERE enabled = true;

COMMENT ON TABLE user_filter_preferences IS 'Preferências de filtros do usuário no header de conversações';
COMMENT ON COLUMN user_filter_preferences.filter_type IS 'Tipo de filtro: default (status), tag (crm_tags), column (crm_columns/estágios)';
COMMENT ON COLUMN user_filter_preferences.filter_id IS 'ID da tag (crm_tags) ou coluna (crm_columns) - NULL para filtros default';
COMMENT ON COLUMN user_filter_preferences.default_filter_value IS 'Valor do filtro padrão (all, bot, humano, etc) - apenas para filter_type=default';

-- -----------------------------------------------------------------------------
-- 2. RLS POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE user_filter_preferences ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access filter_prefs" ON user_filter_preferences;
CREATE POLICY "Service role full access filter_prefs" ON user_filter_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can only see/manage their own preferences
DROP POLICY IF EXISTS "Users view own filter preferences" ON user_filter_preferences;
CREATE POLICY "Users view own filter preferences" ON user_filter_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own filter preferences" ON user_filter_preferences;
CREATE POLICY "Users insert own filter preferences" ON user_filter_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own filter preferences" ON user_filter_preferences;
CREATE POLICY "Users update own filter preferences" ON user_filter_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own filter preferences" ON user_filter_preferences;
CREATE POLICY "Users delete own filter preferences" ON user_filter_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTION - Get User Filters with Details
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_filters_with_details(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  filter_type TEXT,
  filter_id UUID,
  default_filter_value TEXT,
  enabled BOOLEAN,
  "position" INTEGER,
  label TEXT,
  icon TEXT,
  color TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Get user's client_id
  SELECT user_profiles.client_id INTO v_client_id
  FROM user_profiles
  WHERE user_profiles.id = p_user_id;

  RETURN QUERY
  WITH prefs AS (
    SELECT
      ufp.id,
      ufp.filter_type,
      ufp.filter_id,
      ufp.default_filter_value,
      ufp.enabled,
      ufp."position",
      ufp.custom_label,
      ufp.custom_icon,
      ufp.custom_color
    FROM user_filter_preferences ufp
    WHERE ufp.user_id = p_user_id
      AND ufp.enabled = true
    ORDER BY ufp."position" ASC
  )
  SELECT
    prefs.id,
    prefs.filter_type,
    prefs.filter_id,
    prefs.default_filter_value,
    prefs.enabled,
    prefs."position",
    -- Label priority: custom_label > tag.name/column.name > default label
    COALESCE(
      prefs.custom_label,
      CASE
        WHEN prefs.filter_type = 'tag' THEN (SELECT crm_tags.name FROM crm_tags WHERE crm_tags.id = prefs.filter_id)
        WHEN prefs.filter_type = 'column' THEN (SELECT crm_columns.name FROM crm_columns WHERE crm_columns.id = prefs.filter_id)
        WHEN prefs.default_filter_value = 'all' THEN 'Todas'
        WHEN prefs.default_filter_value = 'bot' THEN 'Bot'
        WHEN prefs.default_filter_value = 'humano' THEN 'Humano'
        WHEN prefs.default_filter_value = 'transferido' THEN 'Transferido'
        WHEN prefs.default_filter_value = 'fluxo_inicial' THEN 'Em Flow'
        ELSE prefs.default_filter_value
      END
    ) AS label,
    -- Icon priority: custom_icon > tag icon/column icon > default icon
    COALESCE(
      prefs.custom_icon,
      CASE
        WHEN prefs.filter_type = 'column' THEN (SELECT crm_columns.icon FROM crm_columns WHERE crm_columns.id = prefs.filter_id)
        WHEN prefs.default_filter_value = 'all' THEN 'MessageCircle'
        WHEN prefs.default_filter_value = 'bot' THEN 'Bot'
        WHEN prefs.default_filter_value = 'humano' THEN 'User'
        WHEN prefs.default_filter_value = 'transferido' THEN 'ArrowRight'
        WHEN prefs.default_filter_value = 'fluxo_inicial' THEN 'Workflow'
        ELSE 'Tag'
      END
    ) AS icon,
    -- Color priority: custom_color > tag.color/column.color > default color
    COALESCE(
      prefs.custom_color,
      CASE
        WHEN prefs.filter_type = 'tag' THEN (SELECT crm_tags.color FROM crm_tags WHERE crm_tags.id = prefs.filter_id)
        WHEN prefs.filter_type = 'column' THEN (SELECT crm_columns.color FROM crm_columns WHERE crm_columns.id = prefs.filter_id)
        ELSE 'primary'
      END
    ) AS color,
    -- Count conversations matching this filter
    CASE
      WHEN prefs.filter_type = 'default' AND prefs.default_filter_value = 'all' THEN
        (SELECT COUNT(*) FROM clientes_whatsapp WHERE clientes_whatsapp.client_id = v_client_id)
      WHEN prefs.filter_type = 'default' AND prefs.default_filter_value IN ('bot', 'humano', 'transferido', 'fluxo_inicial') THEN
        (SELECT COUNT(*) FROM clientes_whatsapp WHERE clientes_whatsapp.client_id = v_client_id AND clientes_whatsapp.status = prefs.default_filter_value)
      WHEN prefs.filter_type = 'tag' THEN
        (SELECT COUNT(*) FROM crm_card_tags cct
         JOIN crm_cards cc ON cct.card_id = cc.id
         WHERE cct.tag_id = prefs.filter_id AND cc.client_id = v_client_id)
      WHEN prefs.filter_type = 'column' THEN
        (SELECT COUNT(*) FROM crm_cards WHERE crm_cards.column_id = prefs.filter_id AND crm_cards.client_id = v_client_id)
      ELSE 0
    END AS count
  FROM prefs;
END;
$$;

COMMENT ON FUNCTION get_user_filters_with_details IS 'Retorna filtros do usuário com detalhes (label, icon, color) e contagem de conversas';

-- -----------------------------------------------------------------------------
-- 4. TRIGGER - Updated At
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_user_filter_prefs_updated_at ON user_filter_preferences;
CREATE TRIGGER trg_user_filter_prefs_updated_at
BEFORE UPDATE ON user_filter_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. SEED DEFAULT FILTERS - Insert default filter preferences for existing users
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user RECORD;
  v_next_pos INTEGER;
BEGIN
  -- For each existing user, create default filter preferences if they don't have any
  FOR v_user IN SELECT id FROM auth.users LOOP
    -- Check if user already has preferences
    IF NOT EXISTS (SELECT 1 FROM user_filter_preferences WHERE user_id = v_user.id) THEN
      -- Create default filters: All, Bot, Humano, Em Flow, Transferido
      v_next_pos := 0;

      -- All
      INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
      VALUES (v_user.id, 'default', 'all', true, v_next_pos);
      v_next_pos := v_next_pos + 1;

      -- Bot
      INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
      VALUES (v_user.id, 'default', 'bot', true, v_next_pos);
      v_next_pos := v_next_pos + 1;

      -- Humano
      INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
      VALUES (v_user.id, 'default', 'humano', true, v_next_pos);
      v_next_pos := v_next_pos + 1;

      -- Em Flow
      INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
      VALUES (v_user.id, 'default', 'fluxo_inicial', true, v_next_pos);
      v_next_pos := v_next_pos + 1;

      -- Transferido
      INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
      VALUES (v_user.id, 'default', 'transferido', true, v_next_pos);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER - Auto-create default filters for new users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_create_default_filters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create 5 default filters for new user
  INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
  VALUES
    (NEW.id, 'default', 'all', true, 0),
    (NEW.id, 'default', 'bot', true, 1),
    (NEW.id, 'default', 'humano', true, 2),
    (NEW.id, 'default', 'fluxo_inicial', true, 3),
    (NEW.id, 'default', 'transferido', true, 4);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_default_filters ON auth.users;
CREATE TRIGGER trg_auto_create_default_filters
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auto_create_default_filters();

COMMENT ON FUNCTION auto_create_default_filters IS 'Automatically create default filter preferences for new users';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
