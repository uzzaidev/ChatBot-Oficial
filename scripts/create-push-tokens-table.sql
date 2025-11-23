-- Script para criar tabela de push tokens no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar tabela para armazenar tokens de push
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- RLS (Row Level Security): Permitir usuários lerem apenas seus próprios tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler seus próprios tokens
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;
CREATE POLICY "Users can read own tokens"
  ON push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir seus próprios tokens
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
CREATE POLICY "Users can insert own tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar seus próprios tokens
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
CREATE POLICY "Users can update own tokens"
  ON push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE push_tokens IS 'Armazena tokens FCM/APNs para push notifications';
COMMENT ON COLUMN push_tokens.user_id IS 'ID do usuário (auth.users.id)';
COMMENT ON COLUMN push_tokens.token IS 'Token FCM (Android) ou APNs (iOS)';
COMMENT ON COLUMN push_tokens.platform IS 'Plataforma: android ou ios';

