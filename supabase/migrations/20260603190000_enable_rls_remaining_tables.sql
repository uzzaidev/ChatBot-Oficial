-- =====================================================================
-- ENABLE RLS nas tabelas que ainda estavam "Unrestricted" (RLS off)
-- =====================================================================
--
-- Contexto: após o lockdown de 2026-06-01 (revogou anon), estas 8 tabelas
-- continuavam com RLS DESLIGADA -> qualquer usuário `authenticated` podia
-- ler/escrever cross-tenant (ex.: tenant A lia os secret_ids do tenant B em
-- `clients`). Esta migration liga RLS e adiciona policies por-tenant + admin.
--
-- Verificado antes (auditoria 2026-06-03):
--   * Backend (webhook/cron/RPC) usa service_role (BYPASSRLS) -> NÃO afetado.
--   * `clients`: 13 rotas authenticated leem só o PRÓPRIO client -> coberto por
--      (id = user_client_id() OR user_is_admin()). Writes vão por service_role.
--   * `user_profiles`: já tem 7 policies (próprio perfil + admin do tenant);
--      todos os helpers (user_is_admin, get_current_user_client_id,
--      user_client_id) são SECURITY DEFINER -> sem recursão.
--   * crm_* (dlq/backup/staging/file_map/scheduled): nenhum acesso via client
--      JS (SECURITY DEFINER / triggers) -> ligar RLS não quebra.
--   * feature_flags: global, sem acesso no código -> mantém leitura, bloqueia
--      escrita por não-service_role.
--
-- service_role IGNORA RLS automaticamente (BYPASSRLS) — não precisa policy.
-- ROLLBACK: ALTER TABLE ... DISABLE ROW LEVEL SECURITY; (ver fim do arquivo).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) clients  (PK = id; sem coluna client_id)
-- ---------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own_or_admin" ON public.clients;
CREATE POLICY "clients_select_own_or_admin"
  ON public.clients FOR SELECT TO authenticated
  USING (id = public.user_client_id() OR public.user_is_admin());

DROP POLICY IF EXISTS "clients_update_own_or_admin" ON public.clients;
CREATE POLICY "clients_update_own_or_admin"
  ON public.clients FOR UPDATE TO authenticated
  USING (id = public.user_client_id() OR public.user_is_admin())
  WITH CHECK (id = public.user_client_id() OR public.user_is_admin());
-- INSERT/DELETE de clients ocorrem só via service_role (onboarding/register).

-- ---------------------------------------------------------------------
-- 2) user_profiles  (7 policies já existem; só faltava ligar a RLS)
-- ---------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3) crm_* internas (sem acesso via client JS) + feature_flags
--    Liga RLS; authenticated ganha SELECT por-tenant (rede de segurança).
--    service_role / SECURITY DEFINER seguem funcionando.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  crm_tables text[] := ARRAY[
    'crm_action_dlq',
    'crm_automation_rules_backup',
    'crm_import_file_map',
    'crm_import_staging',
    'crm_scheduled_actions'
  ];
BEGIN
  FOREACH t IN ARRAY crm_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (client_id = public.user_client_id() OR public.user_is_admin())',
        t || '_select_own', t
      );
    END IF;
  END LOOP;
END $$;

-- feature_flags: global, não-sensível. Leitura liberada (anon+auth),
-- mas escrita agora só por service_role (antes era "unrestricted").
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_read" ON public.feature_flags;
CREATE POLICY "feature_flags_read"
  ON public.feature_flags FOR SELECT TO anon, authenticated
  USING (true);

COMMIT;

-- =====================================================================
-- VERIFICAÇÃO pós-deploy (logado como usuário normal, no dashboard):
--   * login funciona, dashboard carrega config do PRÓPRIO cliente;
--   * NÃO consegue ver dados de outro tenant;
--   * admin (se houver) continua vendo todos os clientes;
--   * bot/webhook seguem normais (service_role bypassa RLS).
-- Como anon (deve dar 0/erro): select * from clients;  select * from user_profiles;
-- =====================================================================

-- =====================================================================
-- ROLLBACK (se algo no painel quebrar):
--   ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.crm_action_dlq DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.crm_automation_rules_backup DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.crm_import_file_map DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.crm_import_staging DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.crm_scheduled_actions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.feature_flags DISABLE ROW LEVEL SECURITY;
-- =====================================================================
