-- =====================================================================
-- SECURITY LOCKDOWN: remove exposição pública (role anon) e endurece Vault
-- =====================================================================
--
-- Contexto: incidente 29/05/2026 (dreno externo de chaves OpenAI) + auditoria
-- revelou que a chave ANÔNIMA pública (NEXT_PUBLIC_SUPABASE_ANON_KEY) conseguia
-- LER (e em alguns casos escrever) tabelas com dados sensíveis:
--   user_profiles, clients, clientes_whatsapp, n8n_chat_histories,
--   crm_rule_executions, crm_automation_rules, crm_settings, lead_sources, etc.
--
-- Estratégia (segura / não quebra app):
--   * Esta migration é PURAMENTE SUBTRATIVA para o papel `anon`.
--   * `service_role` (backend/webhook/crons/lojas) IGNORA RLS -> não afetado.
--   * `authenticated` (dashboard/Realtime) MANTÉM seus grants e policies -> não afetado.
--   * Corrige 2 policies `USING(true)` que vazavam para anon E cross-tenant.
--
-- Verificado antes de escrever:
--   - store/[slug], register, onboarding usam service_role (não anon).
--   - Nenhum componente client-side lê estas tabelas com anon.
--   - clientes_whatsapp já tem policy própria por tenant (mantida).
--   - user_client_id() existe e é usado por policies existentes.
--
-- ROLLBACK: re-conceder com GRANT ... TO anon (ver bloco no final, comentado).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) REVOGAR todo acesso do papel anon às tabelas sensíveis
--    (anon = visitante não autenticado = internet pública)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  sensitive_tables text[] := ARRAY[
    'clients',
    'user_profiles',
    'clientes_whatsapp',
    'n8n_chat_histories',
    'crm_automation_rules',
    'crm_automation_rules_backup',
    'crm_rule_executions',
    'crm_settings',
    'crm_import_file_map',
    'crm_import_staging',
    'crm_action_dlq',
    'crm_scheduled_actions',
    'lead_sources',
    'Clientes WhatsApp_backup',
    'audit_logs_backup_poker_system'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2) Corrigir policies permissivas `USING(true)` que incluíam anon
--    e ainda vazavam cross-tenant para authenticated.
-- ---------------------------------------------------------------------

-- 2.1 clientes_whatsapp: remover a policy realtime aberta.
--     (a policy "Users can view own client whatsapp contacts" por tenant PERMANECE,
--      então authenticated + Realtime continuam funcionando, só que escopados.)
DROP POLICY IF EXISTS "realtime_select_clientes_whatsapp" ON public.clientes_whatsapp;

-- 2.2 n8n_chat_histories: era a ÚNICA policy (anon+authenticated, true).
--     Trocar por uma policy por tenant para authenticated (dashboard + Realtime).
--     service_role ignora RLS, então inserts do bot seguem funcionando.
DROP POLICY IF EXISTS "realtime_select_n8n_chat_histories" ON public.n8n_chat_histories;

CREATE POLICY "chat_histories_select_own_client"
  ON public.n8n_chat_histories
  FOR SELECT
  TO authenticated
  USING (client_id = public.user_client_id());

-- ---------------------------------------------------------------------
-- 3) Endurecer funções do Vault (SECURITY DEFINER) — tirar anon/public.
--    Apenas authenticated (settings/onboarding via sessão) e service_role
--    devem poder chamar. Fecha a possibilidade de anon criar/sobrescrever secrets.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  vault_fns text[] := ARRAY[
    'get_client_secret',
    'create_client_secret',
    'update_client_secret',
    'create_vault_secret',
    'delete_vault_secret'
  ];
BEGIN
  FOREACH fn IN ARRAY vault_fns LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC', fn);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- VERIFICAÇÃO (rode manualmente depois do push, como anon, deve dar 0/erro):
--   select count(*) from clients;            -- esperado: 0 rows / permission denied
--   select count(*) from n8n_chat_histories; -- esperado: 0
--   select count(*) from clientes_whatsapp;  -- esperado: 0
--   select count(*) from user_profiles;      -- esperado: 0
-- E como usuário logado (authenticated), o dashboard deve continuar normal.
-- =====================================================================

-- =====================================================================
-- ROLLBACK (se algo quebrar) — re-conceder ao anon:
--   GRANT SELECT ON public.<tabela> TO anon;
--   E recriar as policies dropadas se necessário.
-- =====================================================================

-- =====================================================================
-- TODO (hardening posterior, NÃO incluído aqui por exigir teste com fluxo
-- de admin/onboarding — pode quebrar painel se feito sem validar):
--   * ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;  (+ policies:
--       authenticated vê/edita só o próprio (id = user_client_id()),
--       admin vê todos, service_role ALL).
--   * ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY; (idem).
--   * Escopar as policies `*_service` (USING true / roles public) das tabelas
--       crm_* para `auth.role() = 'service_role'` em vez de público.
--   * Adicionar checagem de dono DENTRO de get/update_client_secret
--       (validar que o secret_id pertence ao client do auth.uid(),
--        permitindo bypass quando auth.role() = 'service_role').
-- =====================================================================
