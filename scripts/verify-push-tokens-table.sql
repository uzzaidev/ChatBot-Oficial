-- Script para verificar se a tabela push_tokens foi criada corretamente
-- Execute este script no SQL Editor do Supabase para verificar

-- Verificar estrutura da tabela
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;

-- Verificar policies (RLS)
SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'push_tokens';

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'push_tokens';

