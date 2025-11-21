-- ================================================================
-- FIX: Remover bypass de isolamento multi-tenant em execution_logs
-- Data: 2025-11-21
-- ================================================================

-- Descrição:
-- A RLS policy atual permite que usuários vejam logs com client_id IS NULL
-- Isso vaza dados entre tenants quando há logs antigos ou logs de testes
-- Esta migration REMOVE essa condição para isolamento estrito

-- ================================================================
-- OPÇÃO A: MIGRAR LOGS ANTIGOS ANTES DE APLICAR ISOLAMENTO ESTRITO
-- ================================================================

-- Descomente e ajuste se você quiser migrar logs antigos para um tenant específico:
-- SELECT migrate_execution_logs_to_client('UUID-DO-TENANT-PRINCIPAL');

-- Ou deletar logs antigos sem client_id (mais seguro para multi-tenant):
-- DELETE FROM public.execution_logs WHERE client_id IS NULL;

-- ================================================================
-- OPÇÃO B: APLICAR ISOLAMENTO ESTRITO IMEDIATAMENTE
-- ================================================================

-- Remove policy antiga (com bypass de client_id IS NULL)
DROP POLICY IF EXISTS "Users can view own client execution logs" ON public.execution_logs;

-- Recria policy SEM bypass (isolamento estrito)
CREATE POLICY "Users can view own client execution logs"
  ON public.execution_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Verifica se o client_id do log corresponde ao client_id do usuário
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
    -- ⚠️ REMOVIDO: client_id IS NULL (logs antigos)
    -- Agora apenas logs do próprio tenant são visíveis
  );

-- ================================================================
-- VALIDAÇÃO
-- ================================================================

DO $$
DECLARE
  logs_without_client_id INTEGER;
  policy_exists BOOLEAN;
BEGIN
  -- Contar logs sem client_id (que agora ficarão invisíveis)
  SELECT count(*) INTO logs_without_client_id
  FROM public.execution_logs
  WHERE client_id IS NULL;

  -- Verificar se a policy foi recriada
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'execution_logs'
      AND policyname = 'Users can view own client execution logs'
  ) INTO policy_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION '❌ ERRO: RLS policy não foi recriada!';
  END IF;

  RAISE NOTICE '✅ Isolamento multi-tenant ESTRITO ativado em execution_logs';
  RAISE NOTICE '✅ Apenas logs com client_id correto são visíveis para cada tenant';

  IF logs_without_client_id > 0 THEN
    RAISE NOTICE '⚠️  % logs sem client_id agora estão INVISÍVEIS para usuários', logs_without_client_id;
    RAISE NOTICE '⚠️  Se necessário, migre com: SELECT migrate_execution_logs_to_client(''tenant-uuid'')';
    RAISE NOTICE '⚠️  Ou delete com: DELETE FROM execution_logs WHERE client_id IS NULL';
  ELSE
    RAISE NOTICE '✅ Nenhum log órfão - todos os logs têm client_id';
  END IF;
END;
$$;

-- ================================================================
-- EXEMPLO DE USO (se houver logs antigos)
-- ================================================================

-- Para migrar logs antigos SEM client_id para um tenant específico:
-- SELECT migrate_execution_logs_to_client('UUID-DO-TENANT');

-- Para deletar logs antigos SEM client_id (recomendado se forem logs de testes):
-- DELETE FROM public.execution_logs WHERE client_id IS NULL;

-- Para verificar quantos logs órfãos existem:
-- SELECT count(*) FROM public.execution_logs WHERE client_id IS NULL;
