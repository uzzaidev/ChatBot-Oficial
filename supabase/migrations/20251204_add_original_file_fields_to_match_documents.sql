-- 1. Dropar as 3 versões
  DROP FUNCTION IF EXISTS
  public.match_documents(vector, integer,        
  uuid);
  DROP FUNCTION IF EXISTS
  public.match_documents(vector, integer,        
  jsonb);
  DROP FUNCTION IF EXISTS
  public.match_documents(vector, double 
  precision, integer, uuid);

  -- 2. Recriar com tipos CORRETOS
  CREATE OR REPLACE FUNCTION
  public.match_documents(
    query_embedding vector(1536),
    match_threshold double precision DEFAULT     
  0.8,
    match_count integer DEFAULT 5,
    filter_client_id uuid DEFAULT NULL
  )
  RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity double precision,
    original_file_url text,
    original_file_path text,
    original_mime_type text,
    original_file_size integer 
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      documents.id,
      documents.content,
      documents.metadata,
      (1 - (documents.embedding <=>
  query_embedding))::double precision AS
  similarity,
      documents.original_file_url,
      documents.original_file_path,
      documents.original_mime_type,
      documents.original_file_size
    FROM public.documents
    WHERE
      (filter_client_id IS NULL OR
  documents.client_id = filter_client_id)        
      AND (1 - (documents.embedding <=>
  query_embedding)) >= match_threshold
    ORDER BY documents.embedding <=>
  query_embedding
    LIMIT match_count;
  END;
  $$;