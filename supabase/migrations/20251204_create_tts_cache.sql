-- Migration: Create TTS cache table
-- Created: 2025-12-04
-- Description: Cache generated audio to save costs

CREATE TABLE IF NOT EXISTS tts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text_hash TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  media_id TEXT,
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  hit_count INTEGER DEFAULT 0,
  UNIQUE(client_id, text_hash)
);

COMMENT ON TABLE tts_cache IS 'Cache for generated TTS audio to reduce API costs';
COMMENT ON COLUMN tts_cache.text_hash IS 'MD5 hash of text + voice + speed for cache lookup';
COMMENT ON COLUMN tts_cache.audio_url IS 'URL of cached audio in Supabase Storage';
COMMENT ON COLUMN tts_cache.media_id IS 'WhatsApp media ID (expires in 30 days)';
COMMENT ON COLUMN tts_cache.hit_count IS 'Number of times this cached audio was reused';
COMMENT ON COLUMN tts_cache.expires_at IS 'Cache expiration date (auto-cleanup after 7 days)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tts_cache_expires ON tts_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tts_cache_hits ON tts_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_tts_cache_client_hash ON tts_cache(client_id, text_hash);

-- RLS
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all TTS cache"
  ON tts_cache FOR ALL
  USING (auth.role() = 'service_role');
