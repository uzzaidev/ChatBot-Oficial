-- =============================================================================
-- CRM Last Message Trigger
-- Description: Auto-update crm_cards.last_message_* when new message arrives
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNCTION - Update CRM card last message
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_crm_card_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone NUMERIC;
  v_content TEXT;
  v_direction TEXT;
  v_msg_data JSONB;
BEGIN
  -- Parse session_id to phone number
  BEGIN
    v_phone := NEW.session_id::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    -- session_id is not a valid phone number, skip
    RETURN NEW;
  END;

  -- Parse message JSON to get type and content
  IF NEW.message IS NOT NULL THEN
    IF pg_typeof(NEW.message) = 'jsonb'::regtype THEN
      v_msg_data := NEW.message;
    ELSE
      BEGIN
        v_msg_data := NEW.message::JSONB;
      EXCEPTION WHEN OTHERS THEN
        v_msg_data := jsonb_build_object('type', 'ai', 'content', NEW.message::TEXT);
      END;
    END IF;
    
    -- Determine direction from message type
    v_direction := CASE 
      WHEN v_msg_data->>'type' = 'human' THEN 'incoming'
      ELSE 'outgoing'
    END;
    
    -- Get content (truncate to 200 chars for preview)
    v_content := LEFT(COALESCE(v_msg_data->>'content', ''), 200);
  ELSE
    RETURN NEW;
  END IF;

  -- Update the CRM card if it exists
  UPDATE crm_cards
  SET 
    last_message_preview = v_content,
    last_message_at = NEW.created_at,
    last_message_direction = v_direction,
    -- Auto-update status based on direction
    auto_status = CASE 
      WHEN v_direction = 'incoming' THEN 'awaiting_attendant'
      ELSE 'awaiting_client'
    END,
    auto_status_updated_at = NOW(),
    updated_at = NOW()
  WHERE phone = v_phone
    AND client_id = NEW.client_id;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. TRIGGER - On new message in n8n_chat_histories
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_update_crm_last_message ON n8n_chat_histories;

CREATE TRIGGER trg_update_crm_last_message
AFTER INSERT ON n8n_chat_histories
FOR EACH ROW
EXECUTE FUNCTION update_crm_card_last_message();

COMMENT ON FUNCTION update_crm_card_last_message IS 'Auto-update CRM card with last message info when new message arrives';
COMMENT ON TRIGGER trg_update_crm_last_message ON n8n_chat_histories IS 'Trigger to sync last message to CRM cards';

-- -----------------------------------------------------------------------------
-- 3. FUNCTION - Sync existing messages to CRM cards
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_crm_cards_last_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all CRM cards with their last message from n8n_chat_histories
  UPDATE crm_cards cc
  SET 
    last_message_preview = sq.content,
    last_message_at = sq.created_at,
    last_message_direction = sq.direction,
    updated_at = NOW()
  FROM (
    SELECT DISTINCT ON (h.session_id::NUMERIC, h.client_id)
      h.session_id::NUMERIC as phone,
      h.client_id,
      h.created_at,
      LEFT(COALESCE(
        CASE 
          WHEN pg_typeof(h.message) = 'jsonb'::regtype THEN h.message->>'content'
          ELSE (h.message::JSONB)->>'content'
        END,
        ''
      ), 200) as content,
      CASE 
        WHEN COALESCE(
          CASE 
            WHEN pg_typeof(h.message) = 'jsonb'::regtype THEN h.message->>'type'
            ELSE (h.message::JSONB)->>'type'
          END,
          'ai'
        ) = 'human' THEN 'incoming'
        ELSE 'outgoing'
      END as direction
    FROM n8n_chat_histories h
    WHERE h.session_id ~ '^[0-9]+$'  -- Only valid phone numbers
      AND h.client_id IS NOT NULL
    ORDER BY h.session_id::NUMERIC, h.client_id, h.created_at DESC
  ) sq
  WHERE cc.phone = sq.phone
    AND cc.client_id = sq.client_id;
  
  RAISE NOTICE 'CRM cards last messages synchronized';
END;
$$;

-- Run the sync function to populate existing cards
SELECT sync_crm_cards_last_messages();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
