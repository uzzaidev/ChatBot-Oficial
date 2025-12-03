-- ============================================================================
-- Migration: Create RLS Policies for Knowledge Documents Storage
-- ============================================================================
-- Purpose: Create RLS policies for knowledge-documents bucket
--
-- PREREQUISITE: Bucket 'knowledge-documents' must be created manually first!
--               See: 20251203000001_create_knowledge_storage_MANUAL_BUCKET.md
-- ============================================================================

-- Verificar se bucket existe (apenas para debug)
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'knowledge-documents'
  ) INTO bucket_exists;

  IF NOT bucket_exists THEN
    RAISE EXCEPTION '❌ Bucket "knowledge-documents" não existe! Crie o bucket manualmente no Dashboard primeiro. Veja instruções em: 20251203000001_create_knowledge_storage_MANUAL_BUCKET.md';
  ELSE
    RAISE NOTICE '✅ Bucket "knowledge-documents" encontrado';
  END IF;
END $$;

-- ============================================================================
-- RLS Policies for storage.objects
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can upload knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to knowledge documents" ON storage.objects;

-- Policy 1: Service role can upload documents
CREATE POLICY "Service role can upload knowledge documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'knowledge-documents');

-- Policy 2: Service role can update documents
CREATE POLICY "Service role can update knowledge documents"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'knowledge-documents');

-- Policy 3: Service role can delete documents
CREATE POLICY "Service role can delete knowledge documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'knowledge-documents');

-- Policy 4: Public read access (for sending via WhatsApp)
-- Note: Public URLs are needed for Meta WhatsApp API
CREATE POLICY "Public read access to knowledge documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'knowledge-documents');

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check policies created
  SELECT COUNT(*) FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%knowledge documents%'
  INTO policy_count;

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ Storage policies created successfully (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️  Expected 4 policies, found %', policy_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Bucket: knowledge-documents';
  RAISE NOTICE 'Policies: % RLS policies active', policy_count;
  RAISE NOTICE '============================================================================';
END $$;
