-- SQL simplificado para testar busca de documentos
-- Execute este SQL no Supabase SQL Editor ou via psql

\echo '=== 1. ESTRUTURA DOS DOCUMENTOS ==='
SELECT
  id,
  substring(content::text, 1, 100) AS content_preview,
  metadata->>'filename' AS filename,
  metadata->>'documentType' AS documentType,
  original_file_url IS NOT NULL AS has_url,
  embedding IS NOT NULL AS has_embedding,
  client_id
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af'
LIMIT 5;

\echo ''
\echo '=== 2. CONTAGEM DE CAMPOS ==='
SELECT
  COUNT(*) AS total_docs,
  COUNT(original_file_url) AS docs_with_url,
  COUNT(metadata->>'filename') AS docs_with_filename,
  COUNT(metadata->>'documentType') AS docs_with_type,
  COUNT(embedding) AS docs_with_embedding
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af';

\echo ''
\echo '=== 3. PROBLEMAS NOS DOCUMENTOS ==='
SELECT
  id,
  CASE
    WHEN original_file_url IS NULL THEN 'Missing original_file_url'
    WHEN metadata->>'filename' IS NULL THEN 'Missing filename in metadata'
    WHEN embedding IS NULL THEN 'Missing embedding'
    ELSE 'OK'
  END AS issue,
  metadata->>'filename' AS filename
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af'
  AND (original_file_url IS NULL OR metadata->>'filename' IS NULL OR embedding IS NULL);

\echo ''
\echo '=== 4. TESTE DA FUNCAO match_documents ==='
\echo 'Usando embedding fake (zeros) com threshold 0.1 para pegar qualquer coisa...'
SELECT
  id,
  substring(content::text, 1, 100) AS content_preview,
  metadata->>'filename' AS filename,
  similarity,
  original_file_url IS NOT NULL AS has_url
FROM match_documents(
  array_fill(0.0, ARRAY[1536])::vector,
  0.1,
  10,
  '59ed984e-85f4-4784-ae76-2569371296af'::uuid
)
LIMIT 5;

\echo ''
\echo '=== 5. METADATA COMPLETO (JSON) ==='
SELECT
  id,
  metadata->>'filename' AS filename,
  jsonb_pretty(metadata) AS metadata_json
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af'
LIMIT 2;
