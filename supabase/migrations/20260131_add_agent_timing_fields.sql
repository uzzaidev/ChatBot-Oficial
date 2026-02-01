-- Migration: Add timing and behavior fields to agents table
-- Date: 2026-01-31
-- Description: Migrates fields from client settings to agents table
--              to centralize all AI/behavior configuration in one place

-- =====================================================
-- ADD NEW COLUMNS TO agents TABLE
-- =====================================================

-- Enable function calling (tools)
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS enable_tools BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.agents.enable_tools IS 
'Habilita function calling (transferência, agendamento, busca documento)';

-- Chat history memory
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS max_chat_history INTEGER DEFAULT 15;

COMMENT ON COLUMN public.agents.max_chat_history IS 
'Quantas mensagens manter no contexto de conversa (1-50)';

-- Batching delay (debounce for multiple messages)
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS batching_delay_seconds INTEGER DEFAULT 10;

COMMENT ON COLUMN public.agents.batching_delay_seconds IS 
'Tempo em segundos para agrupar mensagens antes de processar (debounce)';

-- Message delay between split messages
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS message_delay_ms INTEGER DEFAULT 2000;

COMMENT ON COLUMN public.agents.message_delay_ms IS 
'Delay em milissegundos entre mensagens divididas';

-- Enable message splitting
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS message_split_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.agents.message_split_enabled IS 
'Quebra respostas longas em várias mensagens WhatsApp';

-- =====================================================
-- ADD CONSTRAINTS
-- =====================================================

-- Ensure max_chat_history is within valid range
ALTER TABLE public.agents 
ADD CONSTRAINT agents_max_chat_history_check 
CHECK (max_chat_history >= 1 AND max_chat_history <= 50);

-- Ensure batching_delay_seconds is within valid range
ALTER TABLE public.agents 
ADD CONSTRAINT agents_batching_delay_check 
CHECK (batching_delay_seconds >= 0 AND batching_delay_seconds <= 120);

-- Ensure message_delay_ms is within valid range
ALTER TABLE public.agents 
ADD CONSTRAINT agents_message_delay_check 
CHECK (message_delay_ms >= 0 AND message_delay_ms <= 30000);

-- =====================================================
-- UPDATE EXISTING AGENTS WITH CLIENT CONFIG VALUES
-- =====================================================

-- Update existing agents to inherit values from their client's config
-- This migrates the current settings to the agent level
UPDATE public.agents a
SET 
    enable_tools = COALESCE(
        (c.settings->>'enable_tools')::boolean, 
        false
    ),
    max_chat_history = COALESCE(
        (c.settings->>'max_chat_history')::integer, 
        15
    ),
    batching_delay_seconds = COALESCE(
        (c.settings->>'batching_delay_seconds')::integer, 
        10
    ),
    message_delay_ms = COALESCE(
        (c.settings->>'message_delay_ms')::integer, 
        2000
    ),
    message_split_enabled = COALESCE(
        (c.settings->>'message_split_enabled')::boolean, 
        false
    )
FROM public.clients c
WHERE a.client_id = c.id;

-- =====================================================
-- LOG MIGRATION
-- =====================================================

DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count FROM public.agents;
    RAISE NOTICE 'Migration complete: Added timing/behavior fields to % agents', affected_count;
END $$;
