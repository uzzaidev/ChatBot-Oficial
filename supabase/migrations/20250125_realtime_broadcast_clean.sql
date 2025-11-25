-- =====================================================
-- Clean + Recreate Realtime Broadcast Triggers
-- =====================================================
-- Purpose: Clean old triggers and recreate correctly
-- Run this if you get deadlock errors
-- =====================================================

-- =====================================================
-- STEP 1: DROP OLD TRIGGERS (if exist)
-- =====================================================
-- This prevents deadlocks from old triggers

DROP TRIGGER IF EXISTS broadcast_message_trigger ON n8n_chat_histories CASCADE;
DROP TRIGGER IF EXISTS broadcast_conversation_trigger ON clientes_whatsapp CASCADE;
DROP TRIGGER IF EXISTS message_change_trigger ON n8n_chat_histories CASCADE;
DROP TRIGGER IF EXISTS conversation_change_trigger ON clientes_whatsapp CASCADE;

-- =====================================================
-- STEP 2: DROP OLD FUNCTIONS (if exist)
-- =====================================================
DROP FUNCTION IF EXISTS broadcast_message_change() CASCADE;
DROP FUNCTION IF EXISTS broadcast_conversation_change() CASCADE;
DROP FUNCTION IF EXISTS notify_message_change() CASCADE;
DROP FUNCTION IF EXISTS notify_conversation_change() CASCADE;

-- Wait a moment to ensure all locks are released
SELECT pg_sleep(1);

-- =====================================================
-- STEP 3: CREATE NEW TRIGGER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION broadcast_message_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  channel_name TEXT;
BEGIN
  -- Build channel name: 'messages:{client_id}:{phone}'
  channel_name := 'messages:' || COALESCE(NEW.client_id::TEXT, OLD.client_id::TEXT) ||
                  ':' || COALESCE(NEW.session_id::TEXT, OLD.session_id::TEXT);

  -- Broadcast to Realtime channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION broadcast_conversation_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  channel_name TEXT;
BEGIN
  -- Build channel name: 'conversations:{client_id}'
  channel_name := 'conversations:' || COALESCE(NEW.client_id::TEXT, OLD.client_id::TEXT);

  -- Broadcast to Realtime channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- STEP 4: CREATE NEW TRIGGERS
-- =====================================================

CREATE TRIGGER broadcast_message_trigger
AFTER INSERT OR UPDATE OR DELETE ON n8n_chat_histories
FOR EACH ROW
EXECUTE FUNCTION broadcast_message_change();

CREATE TRIGGER broadcast_conversation_trigger
AFTER INSERT OR UPDATE OR DELETE ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION broadcast_conversation_change();

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE event_object_table IN ('n8n_chat_histories', 'clientes_whatsapp')
  AND trigger_schema = 'public'
  AND trigger_name LIKE 'broadcast%'
ORDER BY event_object_table, trigger_name;

-- Check functions
SELECT
  routine_name,
  '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'broadcast%'
ORDER BY routine_name;

SELECT '✅ Broadcast triggers recreated successfully!' as final_status;
