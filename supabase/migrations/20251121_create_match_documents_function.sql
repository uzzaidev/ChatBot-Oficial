-- Migration: Create match_documents function for RAG vector similarity search
-- Date: 2025-11-21
-- Description: Cria função para buscar documentos similares usando pgvector

-- 1. Verificar se pgvector extension está habilitada
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verificar se a coluna embedding existe e é do tipo vector
-- (Assumindo que já existe da migração anterior, mas vamos garantir o tipo)

-- 3. Criar índice para acelerar similarity search se não existir
CREATE INDEX IF NOT EXISTS idx_documents_embedding
ON public.documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Remover função antiga se existir (para evitar conflito de assinatura)
DROP FUNCTION IF EXISTS public.match_documents(vector, float, int);
DROP FUNCTION IF EXISTS public.match_documents(vector, float);
DROP FUNCTION IF EXISTS public.match_documents(vector);

-- 5. Criar função match_documents para RAG
-- Retorna documentos mais similares ao query_embedding baseado em cosine similarity
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),  -- OpenAI text-embedding-3-small usa 1536 dimensões
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5,
  filter_client_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity  -- Cosine similarity (1 - cosine distance)
  FROM public.documents
  WHERE
    (filter_client_id IS NULL OR documents.client_id = filter_client_id)  -- Multi-tenant filter
    AND (1 - (documents.embedding <=> query_embedding)) >= match_threshold  -- Similarity threshold
  ORDER BY documents.embedding <=> query_embedding  -- Order by distance (ASC = mais similar)
  LIMIT match_count;
END;
$$;

-- 6. Adicionar comentário explicativo
COMMENT ON FUNCTION public.match_documents IS
'Busca documentos similares usando cosine similarity com pgvector.
Usado para RAG (Retrieval-Augmented Generation) no chatbot.
Parâmetros:
- query_embedding: vetor de embedding da query (1536 dimensões)
- match_threshold: threshold mínimo de similaridade (0-1, padrão 0.8)
- match_count: número máximo de documentos a retornar (padrão 5)
- filter_client_id: filtrar por client_id (multi-tenant)';

-- 7. Garantir permissões (service_role já tem acesso, mas vamos explicitar)
-- A função será executada com permissões do usuário que a chama (SECURITY INVOKER é padrão)

-- 8. Criar função auxiliar para verificar dimensão do embedding
CREATE OR REPLACE FUNCTION public.get_embedding_dimensions(client_id_filter uuid DEFAULT NULL)
RETURNS TABLE (
  document_id bigint,
  dimensions int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    vector_dims(documents.embedding) AS dimensions
  FROM public.documents
  WHERE (client_id_filter IS NULL OR documents.client_id = client_id_filter)
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION public.get_embedding_dimensions IS
'Função de debug para verificar dimensões dos embeddings armazenados.
Útil para diagnosticar problemas de dimensionalidade.';
