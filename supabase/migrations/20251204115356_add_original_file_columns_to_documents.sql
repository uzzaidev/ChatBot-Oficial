-- Migration: Add original file metadata columns to documents table
-- Purpose: Store references to original uploaded files in Supabase Storage for WhatsApp sending
-- Created: 2025-12-04

-- Add columns for original file metadata
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS original_file_url TEXT,
  ADD COLUMN IF NOT EXISTS original_file_path TEXT,
  ADD COLUMN IF NOT EXISTS original_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS original_mime_type TEXT;

-- Create index on original_file_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_original_file_path
  ON documents(original_file_path);

-- Add comment for documentation
COMMENT ON COLUMN documents.original_file_url IS 'Public URL of the original file in Supabase Storage (knowledge-documents bucket)';
COMMENT ON COLUMN documents.original_file_path IS 'Storage path: {client_id}/{documentType}/{timestamp}-{filename}';
COMMENT ON COLUMN documents.original_file_size IS 'Original file size in bytes';
COMMENT ON COLUMN documents.original_mime_type IS 'MIME type of the original file (application/pdf, text/plain, image/jpeg, etc.)';
