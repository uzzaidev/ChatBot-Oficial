-- Migration: Add audio/transcription fields to n8n_chat_histories table
-- Created: 2025-12-04
-- Description: Support audio messages with transcription for TTS feature

-- Add transcription and audio duration columns
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

COMMENT ON COLUMN n8n_chat_histories.transcription IS 'Text transcription of audio message (for TTS audio and search)';
COMMENT ON COLUMN n8n_chat_histories.audio_duration_seconds IS 'Duration of audio message in seconds';

-- Full-text search index on transcription (Portuguese)
-- This allows searching through audio message transcriptions
CREATE INDEX IF NOT EXISTS idx_chat_histories_transcription
  ON n8n_chat_histories USING GIN (to_tsvector('portuguese', COALESCE(transcription, '')));

-- Note: media_metadata column already exists as JSONB and will store:
-- {
--   "type": "audio",
--   "url": "https://supabase.storage...",
--   "mimeType": "audio/ogg",
--   "filename": "audio.ogg",
--   "size": 12345
-- }
