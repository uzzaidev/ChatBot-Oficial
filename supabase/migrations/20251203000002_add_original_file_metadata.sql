-- ============================================================================
-- Migration: Add Original File Metadata to Documents Table
-- ============================================================================
-- Purpose: Add columns to store metadata about original uploaded files
--          (URL, path, size, MIME type) for sending via WhatsApp
--
-- Background:
-- - documents table currently stores chunks + embeddings
-- - Original files are processed and discarded
-- - Need to store original file info to send via WhatsApp API
-- ============================================================================

-- Add columns for original file metadata
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_file_url TEXT,
ADD COLUMN IF NOT EXISTS original_file_path TEXT,
ADD COLUMN IF NOT EXISTS original_file_size INTEGER,
ADD COLUMN IF NOT EXISTS original_mime_type TEXT;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for searching by filename (metadata JSONB field)
CREATE INDEX IF NOT EXISTS idx_documents_filename
ON documents ((metadata->>'filename'))
WHERE metadata->>'filename' IS NOT NULL;

-- Index for searching by documentType (metadata JSONB field)
CREATE INDEX IF NOT EXISTS idx_documents_type
ON documents ((metadata->>'documentType'))
WHERE metadata->>'documentType' IS NOT NULL;

-- Index for filtering documents with original files
CREATE INDEX IF NOT EXISTS idx_documents_with_original_files
ON documents (client_id, original_file_url)
WHERE original_file_url IS NOT NULL;

-- Composite index for fast lookups by client + filename
CREATE INDEX IF NOT EXISTS idx_documents_client_filename
ON documents (client_id, (metadata->>'filename'))
WHERE metadata->>'filename' IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN documents.original_file_url IS 'Public URL of the original file in Supabase Storage (for WhatsApp sending)';
COMMENT ON COLUMN documents.original_file_path IS 'Storage path of the original file (bucket path)';
COMMENT ON COLUMN documents.original_file_size IS 'Size of the original file in bytes';
COMMENT ON COLUMN documents.original_mime_type IS 'MIME type of the original file (application/pdf, image/jpeg, etc.)';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check columns added
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'documents'
    AND column_name IN ('original_file_url', 'original_file_path', 'original_file_size', 'original_mime_type')
  INTO column_count;

  IF column_count = 4 THEN
    RAISE NOTICE '✅ All 4 columns added successfully to documents table';
  ELSE
    RAISE EXCEPTION '❌ Expected 4 columns, found %', column_count;
  END IF;

  -- Check indexes created
  SELECT COUNT(*) FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'documents'
    AND indexname LIKE 'idx_documents_%'
    AND indexname IN (
      'idx_documents_filename',
      'idx_documents_type',
      'idx_documents_with_original_files',
      'idx_documents_client_filename'
    )
  INTO index_count;

  IF index_count >= 4 THEN
    RAISE NOTICE '✅ Indexes created successfully (% indexes)', index_count;
  ELSE
    RAISE WARNING '⚠️  Expected 4 indexes, found %', index_count;
  END IF;

  -- Show sample of existing documents (if any)
  RAISE NOTICE '';
  RAISE NOTICE '📊 Sample of existing documents:';
  PERFORM id, metadata->>'filename' as filename, client_id
  FROM documents
  LIMIT 3;

END $$;
