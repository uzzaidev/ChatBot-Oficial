-- Script para atualizar clientes em status 'trial' para 'active'
-- Usado para corrigir contas criadas antes da correção no endpoint de registro

-- 1. Verificar quantos clientes estão em 'trial'
SELECT COUNT(*) as total_trial_clients
FROM clients
WHERE status = 'trial';

-- 2. Ver detalhes dos clientes em 'trial'
SELECT id, name, slug, status, created_at
FROM clients
WHERE status = 'trial'
ORDER BY created_at DESC;

-- 3. Atualizar TODOS os clientes em 'trial' para 'active'
UPDATE clients
SET status = 'active'
WHERE status = 'trial'
RETURNING id, name, slug, status;

-- 4. Confirmar que não há mais clientes em 'trial'
SELECT COUNT(*) as total_trial_clients
FROM clients
WHERE status = 'trial';

-- Se quiser atualizar apenas um cliente específico:
-- UPDATE clients
-- SET status = 'active'
-- WHERE id = '8ea56079-a47d-4f9c-aab9-ce265208b31b'
-- RETURNING id, name, slug, status;
