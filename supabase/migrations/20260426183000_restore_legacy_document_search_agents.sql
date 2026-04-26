-- Restore media/document sending for legacy agents that already used RAG + tools.
-- The prompt/context refactor gates buscar_documento behind enable_document_search;
-- older agents often had RAG/tools enabled but this field left at its default false.

UPDATE public.agents
SET enable_document_search = true,
    updated_at = NOW()
WHERE enable_tools = true
  AND enable_rag = true
  AND enable_document_search = false
  AND is_archived = false;
