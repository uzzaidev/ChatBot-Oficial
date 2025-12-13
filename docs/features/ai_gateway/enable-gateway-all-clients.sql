-- =====================================================
-- ENABLE AI GATEWAY FOR ALL ACTIVE CLIENTS
-- =====================================================
-- This script enables the AI Gateway feature flag for all
-- active clients in the system.
--
-- ⚠️ WARNING: This will force ALL clients to use AI Gateway
-- Make sure the gateway is properly configured before running!
--
-- Created: 2025-12-13
-- =====================================================

-- 1. Check current status BEFORE enabling
SELECT
  COUNT(*) FILTER (WHERE use_ai_gateway = true) as gateway_enabled,
  COUNT(*) FILTER (WHERE use_ai_gateway = false) as gateway_disabled,
  COUNT(*) FILTER (WHERE status = 'active') as total_active,
  COUNT(*) as total_clients
FROM clients;

-- 2. Enable AI Gateway for ALL active clients
UPDATE clients
SET 
  use_ai_gateway = true,
  updated_at = NOW()
WHERE status = 'active'
  AND use_ai_gateway = false;

-- 3. Verify the change
SELECT
  COUNT(*) FILTER (WHERE use_ai_gateway = true) as gateway_enabled,
  COUNT(*) FILTER (WHERE use_ai_gateway = false) as gateway_disabled,
  COUNT(*) FILTER (WHERE status = 'active') as total_active,
  COUNT(*) as total_clients
FROM clients;

-- 4. View affected clients (optional)
SELECT
  id,
  name,
  slug,
  plan,
  status,
  use_ai_gateway,
  updated_at
FROM clients
WHERE status = 'active'
ORDER BY name;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- To disable AI Gateway for all clients:
--
-- UPDATE clients
-- SET 
--   use_ai_gateway = false,
--   updated_at = NOW()
-- WHERE status = 'active';
--
-- =====================================================

-- =====================================================
-- SELECTIVE ROLLBACK (specific clients)
-- =====================================================
-- To disable for specific clients only:
--
-- UPDATE clients
-- SET use_ai_gateway = false
-- WHERE id IN (
--   'client-id-1',
--   'client-id-2',
--   'client-id-3'
-- );
--
-- =====================================================
