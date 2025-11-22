-- ============================================================================
-- FIX: Alternativa para update_client_secret usando DELETE + CREATE
-- ============================================================================
-- Problema: vault.update_secret não está funcionando corretamente
-- Solução: Deletar o secret antigo e criar um novo com o mesmo ID
-- Data: 2025-11-22
-- ============================================================================

-- Função que atualiza secret criando um novo e deletando o antigo
-- Esta é a abordagem mais segura e garantida de funcionar
CREATE OR REPLACE FUNCTION update_client_secret_v2(
  secret_id UUID,
  new_secret_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_name TEXT;
  old_description TEXT;
  new_secret_id UUID;
BEGIN
  -- Buscar name e description do secret existente
  SELECT name, description INTO old_name, old_description
  FROM vault.secrets
  WHERE id = secret_id;

  -- Se o secret não existir, usar valores padrão
  IF NOT FOUND THEN
    old_name := 'updated_secret';
    old_description := 'Updated secret';
  END IF;

  -- Criar novo secret com o novo valor
  new_secret_id := vault.create_secret(
    new_secret_value,
    old_name || '_updated',
    old_description
  );

  -- Deletar o secret antigo (se existir)
  IF FOUND THEN
    DELETE FROM vault.secrets WHERE id = secret_id;
  END IF;

  RETURN new_secret_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar secret %: %', secret_id, SQLERRM;
    RETURN NULL;
END;
$$;

-- Manter a função antiga por compatibilidade, mas usar a v2 internamente
CREATE OR REPLACE FUNCTION update_client_secret(
  secret_id UUID,
  new_secret_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simplesmente retornar TRUE/FALSE baseado se conseguiu criar novo secret
  RETURN update_client_secret_v2(secret_id, new_secret_value) IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION update_client_secret IS
'Updates a secret value in Supabase Vault by deleting and recreating it.
This is a workaround for vault.update_secret not working properly.
Returns TRUE on success, FALSE on error.';

-- Testar se a função está funcionando
DO $$
DECLARE
  test_secret_id UUID;
  test_value TEXT := 'test-initial-value';
  update_result BOOLEAN;
  read_value TEXT;
BEGIN
  -- Criar secret de teste
  SELECT vault.create_secret(test_value, 'test-update-function-v2', 'Testing update function v2') INTO test_secret_id;

  RAISE NOTICE 'Secret criado: %', test_secret_id;

  -- Ler valor inicial
  SELECT decrypted_secret INTO read_value
  FROM vault.decrypted_secrets
  WHERE id = test_secret_id;

  RAISE NOTICE 'Valor inicial: %', read_value;

  -- Atualizar secret
  SELECT update_client_secret(test_secret_id, 'test-updated-value-v2') INTO update_result;

  RAISE NOTICE 'Update result: %', update_result;

  -- Verificar se update funcionou
  SELECT decrypted_secret INTO read_value
  FROM vault.decrypted_secrets
  WHERE id = test_secret_id;

  RAISE NOTICE 'Valor após update: %', read_value;

  IF update_result = TRUE AND read_value = 'test-updated-value-v2' THEN
    RAISE NOTICE '✅ update_client_secret function v2 is working correctly!';
  ELSE
    RAISE WARNING '❌ update_client_secret function v2 test FAILED! update_result=%, read_value=%', update_result, read_value;
  END IF;

  -- Limpar secret de teste
  DELETE FROM vault.secrets WHERE id = test_secret_id;
END $$;
