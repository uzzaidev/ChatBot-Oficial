-- ============================================================================
-- Script ULTRA SEGURO para criar tabela push_tokens no Supabase
-- 
-- VERSÃO SEM DROP POLICY - Não gera aviso de "destructive operation"
-- 
-- CARACTERÍSTICAS DE SEGURANÇA:
-- ✅ Idempotente: Pode executar múltiplas vezes sem erro
-- ✅ Não destrutivo: Não deleta dados existentes
-- ✅ Sem DROP: Não remove nada, apenas cria se não existir
-- ✅ Transacional: Rollback automático em caso de erro
-- 
-- INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Revise o código antes de executar
-- 4. Execute (Run ou Ctrl+Enter) - NÃO VAI GERAR AVISO!
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
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- ============================================================================
-- PASSO 3: Habilitar RLS (Row Level Security)
-- ============================================================================
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 4: Criar policies (SE NÃO EXISTIREM)
-- ============================================================================
-- Usa CREATE OR REPLACE para evitar DROP POLICY
-- Se policy já existe, substitui. Se não existe, cria.

-- Policy: Usuários podem ler seus próprios tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_tokens' 
    AND policyname = 'Users can read own tokens'
  ) THEN
    CREATE POLICY "Users can read own tokens"
      ON push_tokens
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Usuários podem inserir seus próprios tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_tokens' 
    AND policyname = 'Users can insert own tokens'
  ) THEN
    CREATE POLICY "Users can insert own tokens"
      ON push_tokens
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Usuários podem atualizar seus próprios tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_tokens' 
    AND policyname = 'Users can update own tokens'
  ) THEN
    CREATE POLICY "Users can update own tokens"
      ON push_tokens
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- PASSO 5: Adicionar comentários (documentação)
-- ============================================================================
COMMENT ON TABLE push_tokens IS 'Armazena tokens FCM/APNs para push notifications';
COMMENT ON COLUMN push_tokens.user_id IS 'ID do usuário (auth.users.id)';
COMMENT ON COLUMN push_tokens.token IS 'Token FCM (Android) ou APNs (iOS)';
COMMENT ON COLUMN push_tokens.platform IS 'Plataforma: android ou ios';

-- ============================================================================
-- FIM DO SCRIPT - COMMIT da transação
-- ============================================================================

COMMIT;

