-- =====================================================
-- Realtime via Broadcast (Supabase Official Method)
-- =====================================================
-- Purpose: Enable Realtime using realtime.broadcast_changes
-- Works with Supabase Realtime service (FREE tier compatible)
--
-- Prerequisites:
-- 1. Enable Realtime in Dashboard (Project Settings > Realtime)
-- 2. Allow public channels (for testing) or configure private channels
--
-- How it works:
-- 1. Trigger fires on INSERT/UPDATE/DELETE
-- 2. Calls realtime.broadcast_changes()
-- 3. Supabase Realtime server broadcasts to channel subscribers
-- 4. Client receives event via channel.on('broadcast', ...)
-- =====================================================

-- =====================================================
-- STEP 1: Create trigger function for messages
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

-- =====================================================
-- STEP 2: Create trigger function for conversations
-- =====================================================
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
-- STEP 3: Drop old triggers if exist
-- =====================================================
DROP TRIGGER IF EXISTS broadcast_message_trigger ON n8n_chat_histories;
DROP TRIGGER IF EXISTS broadcast_conversation_trigger ON clientes_whatsapp;

-- =====================================================
-- STEP 4: Create new triggers
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
-- STEP 5: Verification
-- =====================================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('n8n_chat_histories', 'clientes_whatsapp')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- TESTING:
-- =====================================================
-- After running this migration and enabling Realtime in Dashboard:
--
-- 1. In client code, subscribe to channel:
--    const channel = supabase.channel('messages:{clientId}:{phone}')
--    channel.on('broadcast', { event: '*' }, (payload) => {
--      console.log('Received:', payload)
--    }).subscribe()
--
-- 2. Insert a test message:
--    INSERT INTO n8n_chat_histories (session_id, message, client_id)
--    VALUES ('test123', '{"type":"human","content":"test"}', 'your-client-id');
--
-- 3. Check if client received the broadcast event
--
-- =====================================================

SELECT '✅ Realtime broadcast triggers created!' as status;
