/**
 * SECURITY FIX (VULN-007): Fix RLS Policies on Legacy Tables
 * 
 * Problem: Tables from n8n migration have permissive policies (USING (true))
 * that allow any authenticated user to access data from all tenants.
 * 
 * Tables affected:
 * - clientes_whatsapp
 * - documents  
 * - clients (partial - has some RLS but not complete)
 * 
 * Solution: Implement proper tenant isolation using client_id
 */

-- ============================================================================
-- PART 1: Helper Function for User Client ID
-- ============================================================================

-- Drop if exists to allow re-running migration
DROP FUNCTION IF EXISTS public.user_client_id() CASCADE;

-- Create function to get authenticated user's client_id
CREATE OR REPLACE FUNCTION public.user_client_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT client_id 
  FROM public.user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.user_client_id() IS 
'Returns the client_id of the currently authenticated user. Used for RLS policies.';

-- ============================================================================
-- PART 2: Fix clientes_whatsapp Table
-- ============================================================================

-- Drop permissive policy
DROP POLICY IF EXISTS "n8n" ON public.clientes_whatsapp;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clientes_whatsapp;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clientes_whatsapp;
DROP POLICY IF EXISTS "Enable update for users based on client_id" ON public.clientes_whatsapp;

-- Create secure policies with tenant isolation
CREATE POLICY "Users can view own client whatsapp contacts"
  ON public.clientes_whatsapp
  FOR SELECT
  USING (client_id = user_client_id());

CREATE POLICY "Users can insert own client whatsapp contacts"
  ON public.clientes_whatsapp
  FOR INSERT
  WITH CHECK (client_id = user_client_id());

CREATE POLICY "Users can update own client whatsapp contacts"
  ON public.clientes_whatsapp
  FOR UPDATE
  USING (client_id = user_client_id())
  WITH CHECK (client_id = user_client_id());

CREATE POLICY "Users can delete own client whatsapp contacts"
  ON public.clientes_whatsapp
  FOR DELETE
  USING (client_id = user_client_id());

-- Service role can access all (for admin operations and n8n)
CREATE POLICY "Service role can access all whatsapp contacts"
  ON public.clientes_whatsapp
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_id 
  ON public.clientes_whatsapp(client_id);

-- ============================================================================
-- PART 3: Fix documents Table (RAG Vector Store)
-- ============================================================================

-- Drop permissive policy
DROP POLICY IF EXISTS "n8n" ON public.documents;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;

-- Create secure policies with tenant isolation
CREATE POLICY "Users can view own client documents"
  ON public.documents
  FOR SELECT
  USING (
    metadata->>'client_id' = user_client_id()::text
    OR client_id = user_client_id()
  );

CREATE POLICY "Users can insert own client documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    metadata->>'client_id' = user_client_id()::text
    OR client_id = user_client_id()
  );

CREATE POLICY "Users can update own client documents"
  ON public.documents
  FOR UPDATE
  USING (
    metadata->>'client_id' = user_client_id()::text
    OR client_id = user_client_id()
  )
  WITH CHECK (
    metadata->>'client_id' = user_client_id()::text
    OR client_id = user_client_id()
  );

CREATE POLICY "Users can delete own client documents"
  ON public.documents
  FOR DELETE
  USING (
    metadata->>'client_id' = user_client_id()::text
    OR client_id = user_client_id()
  );

-- Service role can access all
CREATE POLICY "Service role can access all documents"
  ON public.documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id 
  ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_metadata_client_id 
  ON public.documents((metadata->>'client_id'));

-- ============================================================================
-- PART 4: Fix clients Table
-- ============================================================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clients;

-- Create secure policies with tenant isolation
CREATE POLICY "Users can view own client"
  ON public.clients
  FOR SELECT
  USING (id = user_client_id());

-- Only admins can insert/update/delete clients (via service role)
CREATE POLICY "Service role can manage all clients"
  ON public.clients
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for performance (probably already exists)
CREATE INDEX IF NOT EXISTS idx_clients_id ON public.clients(id);

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- These queries can be run manually to verify isolation after migration:

-- 1. Check clientes_whatsapp isolation:
-- SELECT * FROM clientes_whatsapp;
-- Should only return records where client_id = current user's client_id

-- 2. Check documents isolation:
-- SELECT * FROM documents;
-- Should only return records where client_id matches current user

-- 3. Check clients isolation:
-- SELECT * FROM clients;
-- Should only return the current user's client record

-- ============================================================================
-- PART 6: Grant Permissions
-- ============================================================================

-- Ensure authenticated users can execute the helper function
GRANT EXECUTE ON FUNCTION public.user_client_id() TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'VULN-007 RLS policies migration completed successfully';
  RAISE NOTICE 'Tenant isolation now enforced on: clientes_whatsapp, documents, clients';
  RAISE NOTICE 'To verify: Test queries as different users and confirm they only see their own data';
END $$;
