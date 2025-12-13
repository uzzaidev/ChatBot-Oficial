-- =====================================================
-- MIGRATION: Unified API Tracking
-- =====================================================
-- Adds support for tracking ALL API types in gateway_usage_logs
-- - Chat completions (existing)
-- - Whisper (audio transcription)
-- - Vision (image analysis)
-- - Embeddings (vector generation)
-- - Image generation (future)
--
-- This enables complete cost tracking and analytics across all APIs
-- =====================================================

-- Add columns for multi-API tracking
ALTER TABLE gateway_usage_logs
ADD COLUMN IF NOT EXISTS api_type TEXT DEFAULT 'chat' CHECK (api_type IN ('chat', 'whisper', 'vision', 'embeddings', 'image-gen')),
ADD COLUMN IF NOT EXISTS input_units INTEGER DEFAULT 0,  -- Whisper: seconds of audio
ADD COLUMN IF NOT EXISTS output_units INTEGER DEFAULT 0; -- Vision/Image-gen: number of images

-- Add index for analytics queries by API type
CREATE INDEX IF NOT EXISTS idx_gateway_usage_logs_api_type
ON gateway_usage_logs(api_type, created_at DESC);

-- Add index for client + API type queries (budget tracking)
CREATE INDEX IF NOT EXISTS idx_gateway_usage_logs_client_api
ON gateway_usage_logs(client_id, api_type, created_at DESC);

-- Add comment explaining the new columns
COMMENT ON COLUMN gateway_usage_logs.api_type IS 'Type of API call: chat, whisper, vision, embeddings, image-gen';
COMMENT ON COLUMN gateway_usage_logs.input_units IS 'For Whisper: seconds of audio processed. For Embeddings: number of documents.';
COMMENT ON COLUMN gateway_usage_logs.output_units IS 'For Vision/Image-gen: number of images analyzed or generated.';

-- Update existing rows to have api_type = 'chat' (idempotent)
UPDATE gateway_usage_logs
SET api_type = 'chat'
WHERE api_type IS NULL;
