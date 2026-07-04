-- =====================================================================
-- HARDEN VIEWS: fechar views que driblavam a RLS (security_invoker off)
-- =====================================================================
--
-- Views no Postgres, por padrão (security_invoker=off), rodam com os
-- privilégios do DONO e IGNORAM a RLS das tabelas de baixo. Várias views aqui
-- tinham grant pra anon/authenticated -> vazavam dados driblando a RLS.
--
-- ACHADO CRÍTICO (2026-06-03): a view `client_secrets_decrypted` chama
-- get_client_secret() e expõe meta_access_token, openai_api_key, groq_api_key
-- DESCRIPTOGRAFADOS de TODOS os clientes. Teste provou: qualquer usuário
-- `authenticated` lia as chaves sk-... de outros tenants. View NÃO é usada
-- pelo app (0 referências no código).
--
-- Correções:
--   1) client_secrets_decrypted: REVOKE total (anon/authenticated/public).
--      Só service_role/owner (backend) — e o app nem usa.
--   2) Demais views: security_invoker=true (passam a respeitar a RLS do
--      usuário -> per-tenant) + REVOKE anon.
--
-- service_role IGNORA RLS (BYPASSRLS) -> backend (dedup.ts etc.) não afetado.
-- =====================================================================

BEGIN;

-- 1) View de SECRETS DESCRIPTOGRAFADOS — fechar para todos exceto backend.
REVOKE ALL ON public.client_secrets_decrypted FROM anon;
REVOKE ALL ON public.client_secrets_decrypted FROM authenticated;
REVOKE ALL ON public.client_secrets_decrypted FROM PUBLIC;

-- 2) Demais views: respeitar RLS + tirar anon.
DO $$
DECLARE
  v text;
  views text[] := ARRAY[
    'budget_status',
    'webhook_dedup_stats',
    'openai_tracking_discrepancies',
    'v_contacts_without_crm_card',
    'message_status_summary'
  ];
BEGIN
  FOREACH v IN ARRAY views LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = v AND relkind = 'v' AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- ROLLBACK:ddddd
--   GRANT SELECT ON public.client_secrets_decrypted TO authenticated, anon;
--   ALTER VIEW public.budget_status SET (security_invoker = false); GRANT SELECT ... TO anon;
--   (idem para as outras)
-- =====================================================================
