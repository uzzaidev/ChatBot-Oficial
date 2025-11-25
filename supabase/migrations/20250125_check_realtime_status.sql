-- =====================================================
-- Check Realtime Configuration Status
-- =====================================================
-- Purpose: Diagnose why Realtime is not connecting
-- Run this to see current configuration

-- =====================================================
-- 1. Check REPLICA IDENTITY
-- =====================================================
SELECT
  schemaname,
  tablename,
  CASE
    WHEN relreplident = 'd' THEN 'DEFAULT'
    WHEN relreplident = 'n' THEN 'NOTHING'
    WHEN relreplident = 'f' THEN 'FULL ✓'
    WHEN relreplident = 'i' THEN 'INDEX'
    ELSE 'UNKNOWN'
  END as replica_identity_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE t.tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
ORDER BY tablename;

-- Expected: Both should show "FULL ✓"

-- =====================================================
-- 2. Check RLS Policies
-- =====================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE
    WHEN cmd = 'SELECT' THEN '✓ Good for Realtime'
    ELSE '⚠️  Not SELECT'
  END as realtime_compatible
FROM pg_policies
WHERE tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
ORDER BY tablename, policyname;

-- Expected: At least one SELECT policy for each table allowing authenticated users

-- =====================================================
-- 3. Check if RLS is enabled
-- =====================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('n8n_chat_histories', 'clientes_whatsapp');

-- Expected: rls_enabled = true

-- =====================================================
-- 4. Check Replication Publication
-- =====================================================
-- This shows if tables are added to Supabase Realtime publication
SELECT
  schemaname,
  tablename,
  CASE
    WHEN tablename IS NOT NULL THEN '✓ In publication'
    ELSE '✗ NOT in publication'
  END as publication_status
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
ORDER BY tablename;

-- Expected: Both tables should be in publication
-- If NOT showing, you need to enable in Supabase Dashboard > Replication

-- =====================================================
-- 5. Test Query (verify basic access)
-- =====================================================
-- This should work if credentials are correct
SELECT
  'n8n_chat_histories' as table_name,
  COUNT(*) as row_count
FROM n8n_chat_histories
UNION ALL
SELECT
  'clientes_whatsapp' as table_name,
  COUNT(*) as row_count
FROM clientes_whatsapp;

-- Expected: Should return counts without error

-- =====================================================
-- TROUBLESHOOTING GUIDE
-- =====================================================
/*
IF REPLICA IDENTITY IS NOT FULL:
  → Run: ALTER TABLE n8n_chat_histories REPLICA IDENTITY FULL;
  → Run: ALTER TABLE clientes_whatsapp REPLICA IDENTITY FULL;

IF NO SELECT POLICIES EXIST:
  → Run the RLS policies from 20250125_enable_realtime_replication.sql

IF NOT IN PUBLICATION (most common issue!):
  → Go to Supabase Dashboard
  → Database > Replication
  → Find tables and click "Enable" toggle
  → This is MANUAL and cannot be done via SQL

IF RLS NOT ENABLED:
  → Run: ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
  → Run: ALTER TABLE clientes_whatsapp ENABLE ROW LEVEL SECURITY;

IF REALTIME STATUS = CLOSED:
  → Check Supabase Dashboard > Project Settings > API
  → Verify "Realtime" is enabled (should be ON by default)
  → Check browser console for WebSocket errors
  → Verify NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are correct
*/
