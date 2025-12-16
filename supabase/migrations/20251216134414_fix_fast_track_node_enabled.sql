-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Fix Fast Track Node Enabled
-- Created: 2025-12-16
--
-- Problem: Clientes que configuraram o Fast Track via UI têm todas as
-- configs fast_track:*, MAS não têm flow:node_enabled:fast_track_router,
-- causando o node não executar no chatbotFlow.
--
-- Solution: Para cada cliente que tem fast_track:enabled = true,
-- criar automaticamente flow:node_enabled:fast_track_router = true.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- Inserir flow:node_enabled:fast_track_router para clientes que têm
-- fast_track:enabled = true mas não têm a config de node enabled
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description,
  created_at,
  updated_at
)
SELECT
  bc.client_id,
  'flow:node_enabled:fast_track_router' as config_key,
  '{"enabled": true}'::jsonb as config_value,
  false as is_default,
  'rules' as category,
  'Node enabled state for fast_track_router (auto-created by migration)' as description,
  NOW() as created_at,
  NOW() as updated_at
FROM bot_configurations bc
WHERE bc.config_key = 'fast_track:enabled'
  AND bc.config_value = 'true'::jsonb
  -- Somente para clientes que NÃO têm a config de node enabled ainda
  AND NOT EXISTS (
    SELECT 1
    FROM bot_configurations bc2
    WHERE bc2.client_id = bc.client_id
      AND bc2.config_key = 'flow:node_enabled:fast_track_router'
  );

-- ───────────────────────────────────────────────────────────────────────
-- Log de quantos clientes foram atualizados
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO affected_count
  FROM bot_configurations
  WHERE config_key = 'flow:node_enabled:fast_track_router'
    AND description LIKE '%auto-created by migration%';

  RAISE NOTICE '✅ Migration completed: % clients had fast_track node enabled automatically', affected_count;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Verificação: Listar clientes com Fast Track ativo
-- ───────────────────────────────────────────────────────────────────────
-- Descomente para debug durante o migration:
-- SELECT
--   c.name as client_name,
--   c.slug as client_slug,
--   EXISTS(
--     SELECT 1 FROM bot_configurations
--     WHERE client_id = c.id
--       AND config_key = 'fast_track:enabled'
--       AND config_value = 'true'::jsonb
--   ) as has_fast_track_enabled,
--   EXISTS(
--     SELECT 1 FROM bot_configurations
--     WHERE client_id = c.id
--       AND config_key = 'flow:node_enabled:fast_track_router'
--       AND config_value->>'enabled' = 'true'
--   ) as has_node_enabled
-- FROM clients c
-- ORDER BY c.created_at DESC;
