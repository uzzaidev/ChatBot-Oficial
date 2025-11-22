-- ============================================================================
-- FIX: Corrigir função update_client_secret
-- ============================================================================
-- Problema: A função estava passando 4 parâmetros para vault.update_secret,
--           mas a função do Supabase Vault aceita apenas 2 parâmetros
-- Data: 2025-11-22
-- ============================================================================

-- Recriar função com assinatura correta
CREATE OR REPLACE FUNCTION update_client_secret(
  secret_id UUID,
  new_secret_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- CORREÇÃO: vault.update_secret aceita apenas 2 parâmetros (secret_id, secret)
  -- Não aceita name e description como parâmetros
  PERFORM vault.update_secret(secret_id, new_secret_value);

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar secret %: %', secret_id, SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION update_client_secret IS
'Updates a secret value in Supabase Vault. Returns TRUE on success, FALSE on error.
Fixed: Using correct vault.update_secret signature (2 params, not 4).';

-- Testar se a função está funcionando
DO $$
DECLARE
  test_secret_id UUID;
  test_value TEXT := 'test-initial-value';
  update_result BOOLEAN;
  read_value TEXT;
BEGIN
  -- Criar secret de teste
  SELECT vault.create_secret(test_value, 'test-update-function', 'Testing update function') INTO test_secret_id;

  -- Atualizar secret
  SELECT update_client_secret(test_secret_id, 'test-updated-value') INTO update_result;

  -- Verificar se update funcionou
  SELECT decrypted_secret INTO read_value
  FROM vault.decrypted_secrets
  WHERE id = test_secret_id;

  IF update_result = TRUE AND read_value = 'test-updated-value' THEN
    RAISE NOTICE '✅ update_client_secret function is working correctly!';
  ELSE
    RAISE WARNING '❌ update_client_secret function test FAILED! update_result=%, read_value=%', update_result, read_value;
  END IF;

  -- Limpar secret de teste
  DELETE FROM vault.secrets WHERE id = test_secret_id;
END $$;
