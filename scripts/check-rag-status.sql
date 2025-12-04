-- Script: Verificar Status do RAG e Tools
-- Uso: Execute no SQL Editor do Supabase

-- 1. Verificar configurações dos clientes
SELECT
  id,
  name,
  slug,
  primary_model_provider,
  settings->>'enable_rag' as rag_enabled,
  settings->>'enable_tools' as tools_enabled,
  settings->>'max_chat_history' as max_history,
  CASE
    WHEN system_prompt IS NULL THEN '❌ NULL'
    WHEN LENGTH(system_prompt) < 100 THEN '⚠️  Muito curto (' || LENGTH(system_prompt) || ' chars)'
    ELSE '✅ OK (' || LENGTH(system_prompt) || ' chars)'
  END as system_prompt_status
FROM clients
ORDER BY name;

-- 2. Verificar nodes ativos
SELECT
  client_id,
  node_slug,
  enabled,
  CASE
    WHEN enabled = true THEN '✅'
    ELSE '❌'
  END as status
FROM bot_configurations
WHERE node_slug IN ('get_rag_context', 'process_media')
ORDER BY client_id, node_slug;

-- 3. Verificar documentos na base de conhecimento
SELECT
  c.name as client_name,
  COUNT(d.id) as total_chunks,
  COUNT(DISTINCT d.metadata->>'filename') as total_documents,
  MAX(d.metadata->>'uploadedAt') as last_upload
FROM clients c
LEFT JOIN documents d ON d.client_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 4. Detalhes dos documentos por cliente (AJUSTAR client_id)
-- Substitua 'SEU-CLIENT-ID-AQUI' pelo ID do seu cliente
SELECT
  metadata->>'filename' as filename,
  metadata->>'documentType' as type,
  COUNT(*) as chunks,
  metadata->>'uploadedAt' as uploaded_at,
  original_file_url
FROM documents
WHERE client_id = 'SEU-CLIENT-ID-AQUI'
GROUP BY
  metadata->>'filename',
  metadata->>'documentType',
  metadata->>'uploadedAt',
  original_file_url
ORDER BY metadata->>'uploadedAt' DESC;

-- 5. Habilitar RAG e Tools (AJUSTAR client_id)
-- Descomente e execute para habilitar:
/*
UPDATE clients
SET settings = jsonb_set(
  jsonb_set(
    settings,
    '{enable_rag}',
    'true'
  ),
  '{enable_tools}',
  'true'
)
WHERE id = 'SEU-CLIENT-ID-AQUI';
*/

-- 6. Habilitar node get_rag_context (AJUSTAR client_id)
-- Descomente e execute para habilitar:
/*
INSERT INTO bot_configurations (client_id, node_slug, enabled)
VALUES ('SEU-CLIENT-ID-AQUI', 'get_rag_context', true)
ON CONFLICT (client_id, node_slug)
DO UPDATE SET enabled = true;
*/
