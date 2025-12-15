-- =====================================================
-- MIGRATION: Fix gateway_usage_logs.api_type constraint (add tts)
-- =====================================================
--
-- Problem:
-- - Existing constraint (20251213_unified_api_tracking.sql) allows:
--   chat, whisper, vision, embeddings, image-gen
-- - Code tracks TTS with api_type = 'tts'
-- - Inserts fail with:
--   "violates check constraint gateway_usage_logs_api_type_check" (SQLSTATE 23514)
--
-- Solution:
-- - Recreate constraint including 'tts'
--
-- Notes:
-- - Safe/idempotent: uses IF EXISTS
--

ALTER TABLE gateway_usage_logs
  DROP CONSTRAINT IF EXISTS gateway_usage_logs_api_type_check;

ALTER TABLE gateway_usage_logs
  ADD CONSTRAINT gateway_usage_logs_api_type_check
  CHECK (api_type IN ('chat', 'tts', 'whisper', 'vision', 'embeddings', 'image-gen'));

COMMENT ON COLUMN gateway_usage_logs.api_type
  IS 'Type of API call: chat, tts, whisper, vision, embeddings, image-gen';
