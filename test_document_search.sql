-- SQL para testar busca de documentos e verificar estrutura dos dados
-- Execute este SQL no Supabase SQL Editor ou via psql

-- 1. Ver todos os documentos do cliente (para verificar estrutura)
SELECT
  id,
  content::text AS content_preview,
  substring(content::text, 1, 100) AS content_first_100,
  metadata,
  embedding IS NOT NULL AS has_embedding,
  client_id,
  created_at,
  -- Campos adicionados para knowledge-media
  original_file_url,
  original_file_path,
  original_mime_type,
  original_file_size
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af' -- SPORTS TRAINING
LIMIT 5;

-- 2. Ver estrutura do metadata (para verificar campos)
SELECT
  id,
  metadata->>'filename' AS filename,
  metadata->>'documentType' AS documentType,
  metadata->>'chunkIndex' AS chunkIndex,
  metadata->>'totalChunks' AS totalChunks,
  jsonb_pretty(metadata) AS metadata_full
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af'
LIMIT 3;

-- 3. Verificar se a função match_documents existe e sua definição
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'match_documents'
  AND routine_schema = 'public';

-- 4. Testar busca com embedding dummy (para ver estrutura de retorno)
-- NOTA: Este é um embedding fake de 1536 dimensões (zeros)
-- Em produção, o embedding seria gerado pela OpenAI
SELECT
  id,
  content::text AS content_sample,
  substring(content::text, 1, 200) AS preview,
  metadata,
  similarity,
  original_file_url,
  original_file_path,
  original_mime_type,
  original_file_size
FROM match_documents(
  query_embedding := array_fill(0.0, ARRAY[1536])::vector, -- Embedding fake
  match_threshold := 0.1, -- Threshold muito baixo para pegar qualquer coisa
  match_count := 10,
  filter_client_id := '59ed984e-85f4-4784-ae76-2569371296af'::uuid
)
LIMIT 5;

-- 5. Verificar se há documentos SEM os campos necessários
SELECT
  COUNT(*) AS total_docs,
  COUNT(original_file_url) AS docs_with_url,
  COUNT(metadata->>'filename') AS docs_with_filename,
  COUNT(metadata->>'documentType') AS docs_with_type
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af';

-- 6. Listar problemas potenciais
SELECT
  id,
  CASE
    WHEN original_file_url IS NULL THEN 'Missing original_file_url'
    WHEN metadata->>'filename' IS NULL THEN 'Missing filename in metadata'
    WHEN metadata->>'documentType' IS NULL THEN 'Missing documentType in metadata'
    WHEN embedding IS NULL THEN 'Missing embedding'
    ELSE 'OK'
  END AS issue,
  metadata->>'filename' AS filename,
  original_file_url IS NOT NULL AS has_url
FROM documents
WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af';

-- 7. Verificar tipos de dados das colunas
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND table_schema = 'public'
ORDER BY ordinal_position;
