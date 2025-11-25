-- =====================================================
-- Realtime via Broadcast + Triggers (FREE Tier Compatible)
-- =====================================================
-- Purpose: Enable realtime WITHOUT postgres_changes
-- Works on FREE tier by using database triggers + broadcast
--
-- How it works:
-- 1. Trigger fires on INSERT/UPDATE/DELETE
-- 2. Trigger sends notification via pg_notify
-- 3. Client listens to broadcast channel
-- 4. 100% compatible with FREE tier
-- =====================================================

-- =====================================================
-- STEP 1: Create function to notify clients
-- =====================================================

-- Function to notify about new messages
CREATE OR REPLACE FUNCTION notify_message_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification with message data
  PERFORM pg_notify(
    'message_changes',
    json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW),
      'old_data', row_to_json(OLD),
      'session_id', NEW.session_id,
      'client_id', NEW.client_id,
      'timestamp', EXTRACT(EPOCH FROM NOW())
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify about conversation changes
CREATE OR REPLACE FUNCTION notify_conversation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification with conversation data
  PERFORM pg_notify(
    'conversation_changes',
    json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW),
      'old_data', row_to_json(OLD),
      'telefone', NEW.telefone,
      'client_id', NEW.client_id,
      'timestamp', EXTRACT(EPOCH FROM NOW())
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: Create triggers
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS message_change_trigger ON n8n_chat_histories;
DROP TRIGGER IF EXISTS conversation_change_trigger ON clientes_whatsapp;

-- Trigger for new messages
CREATE TRIGGER message_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON n8n_chat_histories
FOR EACH ROW
EXECUTE FUNCTION notify_message_change();

-- Trigger for conversation changes
CREATE TRIGGER conversation_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION notify_conversation_change();

-- =====================================================
-- STEP 3: Verification
-- =====================================================

-- Check triggers are created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('n8n_chat_histories', 'clientes_whatsapp')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: Should show 2 triggers (one for each table)

-- =====================================================
-- TEST THE TRIGGERS (optional)
-- =====================================================
/*
-- Insert a test message and check if trigger fires
INSERT INTO n8n_chat_histories (session_id, message, client_id)
VALUES ('test123', '{"type": "human", "content": "test"}', 'your-client-id-here');

-- Check recent notifications (may not work on all setups)
-- LISTEN message_changes; -- Run in separate psql session
*/

-- =====================================================
-- NEXT STEPS:
-- =====================================================
/*
1. Run this migration
2. Update client code to use broadcast instead of postgres_changes
3. Test with the new broadcast-based hooks
4. 100% FREE tier compatible!

The broadcast approach:
- Works on ALL Supabase tiers (including FREE)
- No replication page needed
- Real-time updates via pg_notify
- Lightweight and efficient
*/

SELECT '✅ Broadcast triggers created successfully!' as status;
