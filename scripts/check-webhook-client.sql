-- Script para verificar configuração do webhook para um cliente
-- Usage: Substitua 'SEU_CLIENT_ID' pelo ID do cliente

-- 1. Verificar se o cliente existe
SELECT
  id,
  name,
  status,
  created_at,
  phone_number_id
FROM clients
WHERE id = '8ea56079-a47d-4f9c-aab9-ce265208b31b';

-- 2. Verificar secrets do cliente no Vault
SELECT
  name,
  created_at,
  updated_at,
  description
FROM vault.secrets
WHERE name LIKE '%8ea56079-a47d-4f9c-aab9-ce265208b31b%'
ORDER BY name;

-- 3. IMPORTANTE: Para ver o valor do verify token (execute apenas se necessário)
-- SELECT vault.decrypted_secret('meta_verify_token_8ea56079-a47d-4f9c-aab9-ce265208b31b');

-- 4. Listar todos os clientes ativos
SELECT
  id,
  name,
  status,
  phone_number_id
FROM clients
WHERE status = 'active'
ORDER BY created_at DESC;
