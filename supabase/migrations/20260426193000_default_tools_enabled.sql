-- Default ON for tools, RAG and document_search.
--
-- Context:
-- Original schema set enable_document_search/enable_rag/enable_tools to DEFAULT false.
-- After the prompt/context refactor (20260425), buscar_documento is gated on
-- enable_document_search. Legacy clients that were sending docs before the refactor
-- stopped sending because their existing agent rows kept the old defaults.
--
-- This migration aligns the SaaS expectation: a freshly created agent should be
-- able to use the knowledge base, send documents and call tools without manual setup.
-- Existing non-archived agents are flipped ON; users can still disable per-agent
-- in the dashboard.

ALTER TABLE public.agents
  ALTER COLUMN enable_tools SET DEFAULT true,
  ALTER COLUMN enable_rag SET DEFAULT true,
  ALTER COLUMN enable_document_search SET DEFAULT true;

UPDATE public.agents
SET
  enable_tools = COALESCE(enable_tools, true) OR true,
  enable_rag = COALESCE(enable_rag, true) OR true,
  enable_document_search = COALESCE(enable_document_search, true) OR true,
  updated_at = NOW()
WHERE is_archived = false
  AND (
    enable_tools = false
    OR enable_rag = false
    OR enable_document_search = false
  );

-- Mirror the same defaults on the per-client settings JSON used as fallback in config.ts,
-- so clients without an active agent still get the tools available.
UPDATE public.clients
SET settings = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{enable_tools}', 'true'::jsonb, true
        ),
        '{enable_rag}', 'true'::jsonb, true
      ),
      '{enable_document_search}', 'true'::jsonb, true
    ),
    updated_at = NOW()
WHERE COALESCE((settings->>'enable_tools')::boolean, false) = false
   OR COALESCE((settings->>'enable_rag')::boolean, false) = false
   OR COALESCE((settings->>'enable_document_search')::boolean, false) = false;
