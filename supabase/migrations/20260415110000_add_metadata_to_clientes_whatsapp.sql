-- ============================================================================
-- MIGRATION: Add metadata JSONB to clientes_whatsapp
-- ============================================================================
-- Date: 2026-04-15
-- Goal: Store flexible lead/contact data (cpf, email, origem, objetivo, etc.)
--       in a multi-tenant-safe way without schema churn.
-- ============================================================================

DO $$
DECLARE
  has_modern_table BOOLEAN := FALSE;
  has_legacy_table BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'clientes_whatsapp'
      AND c.relkind = 'r'
  ) INTO has_modern_table;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'Clientes WhatsApp'
      AND c.relkind = 'r'
  ) INTO has_legacy_table;

  IF has_modern_table THEN
    ALTER TABLE public.clientes_whatsapp
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_metadata_gin
      ON public.clientes_whatsapp
      USING GIN (metadata);

    COMMENT ON COLUMN public.clientes_whatsapp.metadata IS
      'Dados cadastrais coletados pelo bot: cpf, email, como_conheceu, indicado_por, objetivo. Estrutura JSONB extensivel por cliente.';

    RAISE NOTICE 'Updated public.clientes_whatsapp.metadata';
  ELSIF has_legacy_table THEN
    EXECUTE 'ALTER TABLE public."Clientes WhatsApp" ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT ''{}''::jsonb';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_metadata_gin_legacy ON public."Clientes WhatsApp" USING GIN (metadata)';
    EXECUTE 'COMMENT ON COLUMN public."Clientes WhatsApp".metadata IS ''Dados cadastrais coletados pelo bot: cpf, email, como_conheceu, indicado_por, objetivo. Estrutura JSONB extensivel por cliente.''';

    RAISE NOTICE 'Updated public."Clientes WhatsApp".metadata (legacy table)';
  ELSE
    RAISE NOTICE 'No base table found: public.clientes_whatsapp or public."Clientes WhatsApp". Skipping.';
  END IF;
END $$;
