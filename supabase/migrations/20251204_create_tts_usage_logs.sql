-- Migration: Create TTS usage logs table
-- Created: 2025-12-04
-- Description: Track TTS usage for analytics and cost monitoring

CREATE TABLE IF NOT EXISTS tts_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('generated', 'cached', 'failed', 'fallback')),
  text_length INTEGER NOT NULL,
  from_cache BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tts_usage_logs IS 'Logs for TTS usage analytics and cost tracking';
COMMENT ON COLUMN tts_usage_logs.event_type IS 'Type of event: generated (new audio), cached (reused), failed (TTS error), fallback (sent as text)';
COMMENT ON COLUMN tts_usage_logs.text_length IS 'Length of text that was converted to speech';
COMMENT ON COLUMN tts_usage_logs.from_cache IS 'Whether the audio was served from cache';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tts_usage_logs_client ON tts_usage_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tts_usage_logs_event ON tts_usage_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tts_usage_logs_date ON tts_usage_logs(created_at DESC);

-- RLS
ALTER TABLE tts_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert TTS usage logs"
  ON tts_usage_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own client TTS usage logs"
  ON tts_usage_logs FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RPC function to increment cache hit counter
CREATE OR REPLACE FUNCTION increment_tts_cache_hit(cache_text_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tts_cache
  SET hit_count = hit_count + 1
  WHERE text_hash = cache_text_hash;
END;
$$;

COMMENT ON FUNCTION increment_tts_cache_hit IS 'Safely increment the hit_count for a cached TTS entry';
