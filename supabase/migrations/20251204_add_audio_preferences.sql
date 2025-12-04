-- Migration: Add audio preferences to clientes_whatsapp table
-- Created: 2025-12-04
-- Description: Per-customer audio preferences

ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS audio_preference TEXT DEFAULT 'ask' CHECK (audio_preference IN ('always', 'never', 'ask')),
ADD COLUMN IF NOT EXISTS last_audio_response_at TIMESTAMPTZ;

COMMENT ON COLUMN clientes_whatsapp.audio_preference IS 'Audio preference: always (always send audio), never (never send audio), ask (AI asks before sending)';
COMMENT ON COLUMN clientes_whatsapp.last_audio_response_at IS 'Timestamp of last audio message sent to this customer';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_audio_preference ON clientes_whatsapp(audio_preference);
