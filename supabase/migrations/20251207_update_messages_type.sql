-- Migration: Allow interactive message type
-- Date: 2025-12-07
-- Reason: FlowExecutor saves interactive button/list sends with type 'interactive'.
-- Existing constraint only allowed ('text','audio','image','document','video'), causing inserts to fail.

-- Normalize existing values to lowercase (safety)
UPDATE messages
SET type = LOWER(type)
WHERE type <> LOWER(type);

-- Relax/extend type constraint
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages
ADD CONSTRAINT messages_type_check
CHECK (type IN ('text', 'audio', 'image', 'document', 'video', 'interactive'));

COMMENT ON CONSTRAINT messages_type_check ON messages IS
  'Allowed types: text, audio, image, document, video, interactive';
