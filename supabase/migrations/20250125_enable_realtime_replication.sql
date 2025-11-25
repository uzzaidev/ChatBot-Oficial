-- =====================================================
-- Enable Realtime Replication for Chat Tables
-- =====================================================
-- Created: 2025-01-25
-- Purpose: Enable Supabase Realtime for instant message updates
--
-- What this does:
-- 1. Enables REPLICA IDENTITY FULL on tables (required for Realtime)
-- 2. Ensures RLS policies allow SELECT for realtime subscriptions
-- 3. Prepares tables for postgres_changes events
--
-- After running this:
-- - Go to Supabase Dashboard > Database > Replication
-- - Enable replication for: n8n_chat_histories, clientes_whatsapp
-- =====================================================

-- =====================================================
-- STEP 1: Enable REPLICA IDENTITY FULL
-- =====================================================
-- This allows Supabase Realtime to track ALL column changes
-- Required for postgres_changes to work properly

ALTER TABLE n8n_chat_histories REPLICA IDENTITY FULL;
ALTER TABLE clientes_whatsapp REPLICA IDENTITY FULL;

-- If you're using messages table (currently using n8n_chat_histories)
-- ALTER TABLE messages REPLICA IDENTITY FULL;

-- =====================================================
-- STEP 2: Verify/Create RLS Policies for Realtime
-- =====================================================
-- Realtime subscriptions need SELECT permission through RLS

-- Check if policy already exists for n8n_chat_histories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'n8n_chat_histories'
    AND policyname = 'realtime_select_n8n_chat_histories'
  ) THEN
    -- Create policy to allow authenticated users to SELECT their client's messages
    CREATE POLICY "realtime_select_n8n_chat_histories"
    ON n8n_chat_histories
    FOR SELECT
    TO authenticated
    USING (
      -- User can only see messages from their own client
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.client_id = n8n_chat_histories.client_id
      )
    );

    RAISE NOTICE '✅ Created RLS policy: realtime_select_n8n_chat_histories';
  ELSE
    RAISE NOTICE '✓ Policy realtime_select_n8n_chat_histories already exists';
  END IF;
END $$;

-- Check if policy already exists for clientes_whatsapp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clientes_whatsapp'
    AND policyname = 'realtime_select_clientes_whatsapp'
  ) THEN
    -- Create policy to allow authenticated users to SELECT their client's conversations
    CREATE POLICY "realtime_select_clientes_whatsapp"
    ON clientes_whatsapp
    FOR SELECT
    TO authenticated
    USING (
      -- User can only see conversations from their own client
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.client_id = clientes_whatsapp.client_id
      )
    );

    RAISE NOTICE '✅ Created RLS policy: realtime_select_clientes_whatsapp';
  ELSE
    RAISE NOTICE '✓ Policy realtime_select_clientes_whatsapp already exists';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Verify Table Structure (for debugging)
-- =====================================================
-- This helps verify that session_id exists and has correct type

DO $$
DECLARE
  session_id_type TEXT;
BEGIN
  -- Check session_id column in n8n_chat_histories
  SELECT data_type INTO session_id_type
  FROM information_schema.columns
  WHERE table_name = 'n8n_chat_histories'
  AND column_name = 'session_id';

  IF session_id_type IS NOT NULL THEN
    RAISE NOTICE '✓ Column n8n_chat_histories.session_id exists (type: %)', session_id_type;
  ELSE
    RAISE WARNING '⚠️  Column n8n_chat_histories.session_id NOT FOUND!';
  END IF;
END $$;

-- =====================================================
-- VALIDATION QUERIES (Optional - for testing)
-- =====================================================
-- Run these manually to verify setup:

-- 1. Check replica identity:
-- SELECT
--   schemaname,
--   tablename,
--   CASE WHEN relreplident = 'd' THEN 'DEFAULT'
--        WHEN relreplident = 'n' THEN 'NOTHING'
--        WHEN relreplident = 'f' THEN 'FULL'
--        WHEN relreplident = 'i' THEN 'INDEX'
--   END as replica_identity
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
-- WHERE t.tablename IN ('n8n_chat_histories', 'clientes_whatsapp');

-- 2. Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
-- ORDER BY tablename, policyname;

-- 3. Check replication publication (Supabase internal):
-- SELECT * FROM pg_publication_tables
-- WHERE tablename IN ('n8n_chat_histories', 'clientes_whatsapp');

-- =====================================================
-- NEXT STEPS (Manual - Supabase Dashboard):
-- =====================================================
-- 1. Go to: https://app.supabase.com/project/YOUR_PROJECT/database/replication
-- 2. Find tables: n8n_chat_histories, clientes_whatsapp
-- 3. Toggle "Enable replication" for both tables
-- 4. Test realtime: http://localhost:3000/api/test/realtime
-- =====================================================

-- Migration completed
SELECT '✅ Realtime replication setup completed!' as status;
