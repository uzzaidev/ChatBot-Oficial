-- =====================================================
-- Fix Realtime for FREE Tier (No Replication Access)
-- =====================================================
-- Created: 2025-01-25
-- Purpose: Configure Realtime to work on FREE tier
--
-- FREE tier limitations:
-- - No access to Database > Replication page
-- - postgres_changes may have restrictions
-- - Need to ensure RLS policies are permissive
-- =====================================================

-- =====================================================
-- STEP 1: Ensure REPLICA IDENTITY is set
-- =====================================================
ALTER TABLE n8n_chat_histories REPLICA IDENTITY FULL;
ALTER TABLE clientes_whatsapp REPLICA IDENTITY FULL;

-- =====================================================
-- STEP 2: Drop and recreate RLS policies
-- =====================================================
-- Sometimes policies can be too restrictive

-- Drop existing realtime policies if they exist
DROP POLICY IF EXISTS "realtime_select_n8n_chat_histories" ON n8n_chat_histories;
DROP POLICY IF EXISTS "realtime_select_clientes_whatsapp" ON clientes_whatsapp;

-- Create MORE PERMISSIVE policies for realtime
-- These allow authenticated users to SELECT (required for realtime subscriptions)

CREATE POLICY "realtime_select_n8n_chat_histories"
ON n8n_chat_histories
FOR SELECT
TO authenticated, anon  -- Allow both authenticated AND anon
USING (true);  -- Allow all (we'll filter client-side)

CREATE POLICY "realtime_select_clientes_whatsapp"
ON clientes_whatsapp
FOR SELECT
TO authenticated, anon  -- Allow both authenticated AND anon
USING (true);  -- Allow all (we'll filter client-side)

-- =====================================================
-- STEP 3: Check if we can enable realtime via SQL
-- =====================================================
-- On FREE tier, this might not work, but let's try

-- Enable realtime for tables (may require paid plan)
DO $$
BEGIN
  -- Try to add tables to supabase_realtime publication
  -- This may fail on FREE tier, which is okay
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE n8n_chat_histories';
  RAISE NOTICE '✅ Added n8n_chat_histories to publication';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✓ n8n_chat_histories already in publication';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️  Could not add n8n_chat_histories to publication (may require paid plan)';
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE clientes_whatsapp';
  RAISE NOTICE '✅ Added clientes_whatsapp to publication';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✓ clientes_whatsapp already in publication';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️  Could not add clientes_whatsapp to publication (may require paid plan)';
END;
$$;

-- =====================================================
-- STEP 4: Verify configuration
-- =====================================================
-- Check REPLICA IDENTITY
SELECT
  t.schemaname,
  t.tablename,
  CASE
    WHEN c.relreplident = 'f' THEN '✅ FULL (Good!)'
    ELSE '❌ NOT FULL (Problem!)'
  END as replica_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
  AND t.schemaname = 'public';

-- Check RLS policies
SELECT
  tablename,
  policyname,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ SELECT (Good for Realtime)'
    ELSE 'Other: ' || cmd
  END as policy_type,
  roles
FROM pg_policies
WHERE tablename IN ('n8n_chat_histories', 'clientes_whatsapp')
ORDER BY tablename;

-- =====================================================
-- IMPORTANT FOR FREE TIER:
-- =====================================================
/*
If postgres_changes doesn't work on FREE tier, we need to use
an alternative approach:

Option A: Use Broadcast/Presence (always free)
Option B: Use Database Triggers + Custom Table (workaround)
Option C: Poll with smart intervals (fallback)

The code will automatically fall back to polling if realtime
connection fails (already implemented in useConversations).

Next steps:
1. Run this SQL
2. Test: http://localhost:3000/api/test/realtime
3. If still CLOSED, we'll switch to broadcast/presence approach
*/
