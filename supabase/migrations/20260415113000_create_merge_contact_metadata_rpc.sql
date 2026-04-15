-- ============================================================================
-- MIGRATION: RPC merge_contact_metadata
-- ============================================================================
-- Date: 2026-04-15
-- Goal: Merge contact metadata safely using JSONB || in clientes_whatsapp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merge_contact_metadata(
  p_telefone NUMERIC,
  p_client_id UUID,
  p_metadata JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_table TEXT;
  has_client_id BOOLEAN := FALSE;
  has_metadata BOOLEAN := FALSE;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'clientes_whatsapp'
      AND c.relkind = 'r'
  ) THEN
    target_table := 'public.clientes_whatsapp';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'Clientes WhatsApp'
      AND c.relkind = 'r'
  ) THEN
    target_table := 'public."Clientes WhatsApp"';
  ELSE
    RAISE NOTICE 'merge_contact_metadata: no target table found';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = CASE
        WHEN target_table = 'public.clientes_whatsapp' THEN 'clientes_whatsapp'
        ELSE 'Clientes WhatsApp'
      END
      AND column_name = 'metadata'
  ) INTO has_metadata;

  IF NOT has_metadata THEN
    RAISE NOTICE 'merge_contact_metadata: metadata column missing in %', target_table;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = CASE
        WHEN target_table = 'public.clientes_whatsapp' THEN 'clientes_whatsapp'
        ELSE 'Clientes WhatsApp'
      END
      AND column_name = 'client_id'
  ) INTO has_client_id;

  IF has_client_id THEN
    EXECUTE format(
      'UPDATE %s
       SET metadata = COALESCE(metadata, ''{}''::jsonb) || COALESCE($3, ''{}''::jsonb)
       WHERE telefone = $1
         AND client_id = $2',
      target_table
    )
    USING p_telefone, p_client_id, p_metadata;
  ELSE
    EXECUTE format(
      'UPDATE %s
       SET metadata = COALESCE(metadata, ''{}''::jsonb) || COALESCE($2, ''{}''::jsonb)
       WHERE telefone = $1',
      target_table
    )
    USING p_telefone, p_metadata;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_contact_metadata(NUMERIC, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_contact_metadata(NUMERIC, UUID, JSONB) TO service_role;

COMMENT ON FUNCTION public.merge_contact_metadata(NUMERIC, UUID, JSONB) IS
'Merge non-destructive contact metadata into clientes_whatsapp.metadata for a specific tenant/contact.';
