-- Migration: Add TTS model selection to clients table
-- Created: 2025-12-04
-- Description: Allow clients to choose between tts-1 (fast) and tts-1-hd (quality)

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tts_model TEXT DEFAULT 'tts-1-hd' CHECK (tts_model IN ('tts-1', 'tts-1-hd'));

COMMENT ON COLUMN clients.tts_model IS 'OpenAI TTS model: tts-1 (faster, cheaper) or tts-1-hd (higher quality)';
