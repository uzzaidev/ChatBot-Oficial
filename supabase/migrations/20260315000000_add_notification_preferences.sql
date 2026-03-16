-- =============================================================================
-- Notification Preferences and Push Logs
-- Date: 2026-03-15
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Notification preferences per user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  preferences JSONB NOT NULL DEFAULT '{
    "critical": {"enabled": true, "sound": true, "vibration": true},
    "important": {"enabled": true, "sound": true, "vibration": true},
    "normal": {"enabled": true, "sound": true, "vibration": true},
    "low": {"enabled": false, "sound": false, "vibration": false},
    "marketing": {"enabled": false, "sound": false, "vibration": false}
  }'::jsonb,

  dnd_enabled BOOLEAN NOT NULL DEFAULT false,
  dnd_start_time TIME,
  dnd_end_time TIME,
  dnd_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notification_preferences_user_unique UNIQUE (user_id),
  CONSTRAINT notification_preferences_dnd_window_check CHECK (
    dnd_enabled = false OR (dnd_start_time IS NOT NULL AND dnd_end_time IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_client_id
  ON public.notification_preferences(client_id);

COMMENT ON TABLE public.notification_preferences IS
  'User-level push notification preferences with per-category toggles and DND settings';

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access notification_preferences" ON public.notification_preferences;
CREATE POLICY "Service role full access notification_preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users select own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users select own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users delete own notification preferences"
  ON public.notification_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill for existing users
INSERT INTO public.notification_preferences (user_id, client_id)
SELECT up.id, up.client_id
FROM public.user_profiles up
JOIN public.clients c ON c.id = up.client_id
WHERE up.client_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  v_profiles_without_client_id BIGINT := 0;
  v_profiles_with_invalid_client_id BIGINT := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_profiles_without_client_id
  FROM public.user_profiles up
  WHERE up.client_id IS NULL;

  SELECT COUNT(*)
    INTO v_profiles_with_invalid_client_id
  FROM public.user_profiles up
  LEFT JOIN public.clients c ON c.id = up.client_id
  WHERE up.client_id IS NOT NULL
    AND c.id IS NULL;

  IF v_profiles_without_client_id > 0 OR v_profiles_with_invalid_client_id > 0 THEN
    RAISE WARNING
      'notification_preferences backfill skipped % profile(s) sem client_id e % profile(s) com client_id invalido',
      v_profiles_without_client_id,
      v_profiles_with_invalid_client_id;
  END IF;
END
$$;

-- Auto-create default preferences whenever a profile is created
CREATE OR REPLACE FUNCTION public.ensure_notification_preferences_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = NEW.client_id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_preferences (user_id, client_id)
  VALUES (NEW.id, NEW.client_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_create_notification_preferences ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_create_notification_preferences
AFTER INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_notification_preferences_for_new_profile();

-- -----------------------------------------------------------------------------
-- 2) Notification logs (analytics and debugging)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  category TEXT NOT NULL CHECK (category IN ('critical', 'important', 'normal', 'low', 'marketing')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed', 'skipped')),
  failure_reason TEXT,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent_at
  ON public.notification_logs(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_client_sent_at
  ON public.notification_logs(client_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_category
  ON public.notification_logs(category);

COMMENT ON TABLE public.notification_logs IS
  'Push dispatch logs for observability, delivery tracking and analytics';

-- RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access notification_logs" ON public.notification_logs;
CREATE POLICY "Service role full access notification_logs"
  ON public.notification_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users select own notification logs" ON public.notification_logs;
CREATE POLICY "Users select own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (user_id = auth.uid());
