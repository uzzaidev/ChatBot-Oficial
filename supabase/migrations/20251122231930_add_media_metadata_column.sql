-- Migration: Add media_metadata column to n8n_chat_histories
-- Purpose: Store metadata for media messages (images, audio, documents)
--
-- Structure:
-- {
--   "type": "image" | "audio" | "document",
--   "url": "https://...",
--   "mimeType": "image/jpeg",
--   "filename": "foto.jpg",
--   "size": 1024000
-- }

-- Add column
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS media_metadata JSONB;

-- Index for querying messages with media
CREATE INDEX IF NOT EXISTS idx_media_messages
ON n8n_chat_histories (session_id)
WHERE media_metadata IS NOT NULL;

-- Comment
COMMENT ON COLUMN n8n_chat_histories.media_metadata IS 'Metadados de mídia (URL, tipo MIME, filename, tamanho)';
