-- ============================================================================
-- Script SEGURO para criar tabela push_tokens no Supabase
-- 
-- CARACTERÍSTICAS DE SEGURANÇA:
-- ✅ Idempotente: Pode executar múltiplas vezes sem erro
-- ✅ Não destrutivo: Não deleta dados existentes
-- ✅ Verificações: Usa IF NOT EXISTS e DROP IF EXISTS
-- ✅ Transacional: Rollback automático em caso de erro
-- 
-- INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Revise o código antes de executar
-- 4. Execute (Run ou Ctrl+Enter)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Criar tabela (SE NÃO EXISTIR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PASSO 2: Criar índices (SE NÃO EXISTIREM)
-- ============================================================================
-- Índice para buscar tokens por usuário (performance)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Índice para buscar por token (performance)
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- ============================================================================
-- PASSO 3: Habilitar RLS (Row Level Security)
-- ============================================================================
-- RLS garante que usuários só vejam seus próprios tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 4: Remover policies antigas (SE EXISTIREM) e criar novas
-- ============================================================================
-- Isso garante que não haverá conflito se executar múltiplas vezes

-- Remover policy de SELECT (se existir)
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;

-- Criar policy de SELECT
CREATE POLICY "Users can read own tokens"
  ON push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Remover policy de INSERT (se existir)
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;

-- Criar policy de INSERT
CREATE POLICY "Users can insert own tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Remover policy de UPDATE (se existir)
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;

-- Criar policy de UPDATE
CREATE POLICY "Users can update own tokens"
  ON push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PASSO 5: Adicionar comentários (documentação)
-- ============================================================================
COMMENT ON TABLE push_tokens IS 'Armazena tokens FCM/APNs para push notifications';
COMMENT ON COLUMN push_tokens.user_id IS 'ID do usuário (auth.users.id)';
COMMENT ON COLUMN push_tokens.token IS 'Token FCM (Android) ou APNs (iOS)';
COMMENT ON COLUMN push_tokens.platform IS 'Plataforma: android ou ios';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO (OPCIONAL - Execute separadamente se quiser verificar)
-- ============================================================================
-- Descomente as linhas abaixo para verificar se tudo foi criado corretamente:
-- 
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'push_tokens';
-- 
-- SELECT 
--   policyname, 
--   cmd 
-- FROM pg_policies 
-- WHERE tablename = 'push_tokens';

