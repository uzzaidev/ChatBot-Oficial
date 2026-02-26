-- ============================================================
-- FIX: auto_create_default_filters trigger com EXCEPTION
-- ============================================================
-- Problema: trigger sem EXCEPTION derruba auth.admin.createUser
-- quando user_filter_preferences tem FK para user_profiles que
-- ainda não existe no momento do INSERT em auth.users.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_create_default_filters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_filter_preferences (user_id, filter_type, default_filter_value, enabled, "position")
  VALUES
    (NEW.id, 'default', 'all', true, 0),
    (NEW.id, 'default', 'bot', true, 1),
    (NEW.id, 'default', 'humano', true, 2),
    (NEW.id, 'default', 'fluxo_inicial', true, 3),
    (NEW.id, 'default', 'transferido', true, 4)
  ON CONFLICT (user_id, filter_type, default_filter_value) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_default_filters: erro ignorado para user % - %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
