-- Migration: Add TTS configuration to clients table
-- Created: 2025-12-04
-- Description: Global TTS configuration per tenant

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'openai' CHECK (tts_provider IN ('openai', 'elevenlabs', 'google')),
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'alloy',
ADD COLUMN IF NOT EXISTS tts_speed NUMERIC DEFAULT 1.0 CHECK (tts_speed BETWEEN 0.25 AND 4.0),
ADD COLUMN IF NOT EXISTS tts_auto_offer BOOLEAN DEFAULT true;

COMMENT ON COLUMN clients.tts_enabled IS 'Master switch: if false, TTS will NEVER be used (ignores tool calls)';
COMMENT ON COLUMN clients.tts_provider IS 'TTS provider: openai, elevenlabs, or google';
COMMENT ON COLUMN clients.tts_voice IS 'Voice ID for TTS (e.g., alloy, echo, fable for OpenAI)';
COMMENT ON COLUMN clients.tts_speed IS 'Speech speed multiplier (0.25 to 4.0)';
COMMENT ON COLUMN clients.tts_auto_offer IS 'If true, AI can offer audio automatically. If false, only when client explicitly asks';
