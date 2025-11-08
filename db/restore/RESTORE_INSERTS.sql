-- ============================================================================
-- RESTORE DOS DADOS - COPIE E COLE NO SUPABASE SQL EDITOR
-- ============================================================================
-- Este arquivo contém apenas os INSERTs necessários para restaurar seus dados
-- Arquivo gerado a partir do backup de 30/10/2025 17:53
-- ============================================================================

-- ============================================================================
-- 0. CRIAR TABELA clientes_whatsapp (se não existir)
-- ============================================================================
-- Esta tabela foi criada originalmente pelo n8n mas foi deletada
-- Estrutura original do backup de 30/10/2025

CREATE TABLE IF NOT EXISTS public.clientes_whatsapp (
    telefone NUMERIC NOT NULL PRIMARY KEY,
    nome TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE
);

-- Criar a VIEW que o n8n usa
CREATE OR REPLACE VIEW public."Clientes WhatsApp" AS
SELECT telefone, nome, status, created_at
FROM public.clientes_whatsapp;

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_id ON public.clientes_whatsapp(client_id);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_status ON public.clientes_whatsapp(status);

-- ============================================================================
-- 1. CLIENTS (3 registros)
-- ============================================================================
-- NOTA: Colunas slug, status, plan, notification_email não existem mais
-- Schema atual: id, name, verify_token, meta_access_token, phone_number_id, openai_api_key, created_at, updated_at
-- Usando valores padrão para campos obrigatórios

INSERT INTO clients (id, name, verify_token, meta_access_token, phone_number_id, created_at, updated_at)
VALUES 
(
  '6feacdc8-1046-49c5-b975-c557512be16a',
  'Client de Teste',
  'test-verify-token',
  'test-meta-token',
  '0000000000',
  '2025-10-29 00:29:12.28664+00',
  '2025-10-29 00:29:12.28664+00'
),
(
  'd6ab03a7-0578-4302-bb81-6fb6c6ae7b21',
  'UFRGS',
  'ufrgs-verify-token',
  'ufrgs-meta-token',
  '0000000001',
  '2025-10-29 13:06:23.215334+00',
  '2025-10-30 17:52:29.290977+00'
),
(
  'b21b314f-c49a-467d-94b3-a21ed4412227',
  'Luis Fernando Boff',
  'default-verify-token',
  'default-meta-token',
  '0000000002',
  '2025-10-28 21:28:56.553695+00',
  '2025-10-30 00:33:42.34586+00'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  verify_token = EXCLUDED.verify_token,
  meta_access_token = EXCLUDED.meta_access_token,
  phone_number_id = EXCLUDED.phone_number_id,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 2. CLIENTES_WHATSAPP (17 contatos)
-- ============================================================================

INSERT INTO clientes_whatsapp (telefone, nome, status, created_at, client_id)
VALUES 
('555496880016', 'Isadora F. Pomnitz', 'bot', '2025-10-25 18:45:42.119256+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555499258022', 'Fernando Boff', 'bot', '2025-10-27 15:19:23.302172+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555491966917', 'Nicole Dutra', 'bot', '2025-10-28 18:09:16.548631+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555491590379', 'Pedro Vitor PV', NULL, '2025-10-26 19:03:41.877181+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555491237070', 'Vitor Pirolli', 'bot', '2025-10-27 14:40:42.583466+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('5554999250023', 'Test User', 'bot', '2025-10-26 21:19:06.193704+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('5511999999999', 'Test User', 'bot', '2025-10-26 21:42:31.282338+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('5511000000000', 'Teste Tabela Direto', 'bot', '2025-10-27 13:17:42.046238+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('5511000000001', 'Teste VIEW', 'bot', '2025-10-27 13:18:24.16947+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555496678378', 'Amanda', 'bot', '2025-10-27 13:56:20.999872+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555198032261', 'Agência do Vale', 'Transferido', '2025-10-28 12:35:46.644023+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555499157230', 'Eduardo Boff', 'bot', '2025-10-27 14:35:47.912055+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('554421011366', 'Rafael Lisboa - Odex Solar', 'Transferido', '2025-10-28 13:59:17.671026+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555499707475', 'Telli', 'bot', '2025-10-28 14:39:14.674937+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555496163875', 'Katia Bello | Comercial Fotus', 'Transferido', '2025-10-28 17:58:55.770137+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555198056488', 'Patricia', 'bot', '2025-10-29 22:04:28.339131+00', 'b21b314f-c49a-467d-94b3-a21ed4412227'),
('555499250023', 'Luis Fernando Boff', 'bot', '2025-10-25 14:02:33.186096+00', 'b21b314f-c49a-467d-94b3-a21ed4412227')
ON CONFLICT (telefone) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  client_id = EXCLUDED.client_id;

-- ============================================================================
-- VERIFICACAO
-- ============================================================================

-- Verificar se os dados foram inseridos
SELECT 'clients' as tabela, COUNT(*) as total FROM clients
UNION ALL
SELECT 'clientes_whatsapp', COUNT(*) FROM clientes_whatsapp
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;

-- ============================================================================
-- FIM DO RESTORE
-- ============================================================================
-- IMPORTANTE:
-- - conversations e messages estavam VAZIAS no backup de 30/10/2025
-- - execution_logs tinha muitos registros mas não são críticos
-- - Os dados principais (clients e contatos) foram restaurados
-- ============================================================================
