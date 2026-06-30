-- =====================================================================
-- Corrige 2 erros recorrentes que poluíam os logos do Postgres
-- =====================================================================
--
-- 1) usage_logs.phone NOT NULL: chamadas de embeddings/sistema (RAG) não têm
--    telefone associado -> o insert (legacy log) falhava com "null value in
--    column phone violates not-null constraint" a cada embedding. phone passa
--    a ser nullable (system/embedding usage legitimamente não tem phone).
--
-- 2) message_traces_status_check rejeitava 'success': o trace-logger grava
--    status='success' quando a mensagem é enviada (trace-logger.ts:176), mas o
--    CHECK só permitia pending/evaluated/human_reviewed/needs_review/failed ->
--    todo trace falhava e caía no fallback (regrava como 'pending'), gerando
--    spam de erro. Adiciona 'success' ao conjunto permitido (a reconciliação já
--    trata 'success', então não quebra a avaliação).
-- =====================================================================

BEGIN;

-- 1) usage_logs.phone nullable
ALTER TABLE public.usage_logs ALTER COLUMN phone DROP NOT NULL;

-- 2) message_traces: permitir 'success'
ALTER TABLE public.message_traces DROP CONSTRAINT IF EXISTS message_traces_status_check;
ALTER TABLE public.message_traces ADD CONSTRAINT message_traces_status_check
  CHECK (status = ANY (ARRAY[
    'pending','evaluated','human_reviewed','needs_review','failed','success'
  ]::text[]));

COMMIT;
