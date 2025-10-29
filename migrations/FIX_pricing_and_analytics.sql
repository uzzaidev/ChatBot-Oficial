-- =====================================================
-- FIX: Pricing Config RLS + Analytics Customer Names
-- =====================================================
-- Este script corrige 2 problemas:
-- 1. Políticas RLS da pricing_config apontavam para auth.users (não existe)
-- 2. Função get_usage_by_conversation buscava nomes de conversations (vazia)
--
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: Corrigir Políticas RLS da pricing_config
-- =====================================================

-- Dropar políticas antigas (que apontavam para auth.users)
DROP POLICY IF EXISTS "Users can view own client pricing config" ON pricing_config;
DROP POLICY IF EXISTS "Users can insert own client pricing config" ON pricing_config;
DROP POLICY IF EXISTS "Users can update own client pricing config" ON pricing_config;
DROP POLICY IF EXISTS "Users can delete own client pricing config" ON pricing_config;

-- Criar políticas corretas (apontando para user_profiles)
CREATE POLICY "Users can view own client pricing config"
  ON pricing_config
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own client pricing config"
  ON pricing_config
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own client pricing config"
  ON pricing_config
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own client pricing config"
  ON pricing_config
  FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PARTE 2: Corrigir Função get_usage_by_conversation
-- =====================================================

-- Recriar função para buscar nomes de clientes_whatsapp
CREATE OR REPLACE FUNCTION get_usage_by_conversation(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  phone TEXT,
  conversation_name TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT,
  openai_tokens BIGINT,
  groq_tokens BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.phone,
    COALESCE(cw.nome, 'Sem nome') as conversation_name,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count,
    SUM(CASE WHEN ul.source = 'openai' THEN ul.total_tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN ul.source = 'groq' THEN ul.total_tokens ELSE 0 END)::BIGINT as groq_tokens
  FROM usage_logs ul
  LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone::TEXT AND cw.client_id = p_client_id
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.phone, cw.nome
  ORDER BY total_tokens DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'pricing_config'
ORDER BY policyname;

-- Testar função de analytics
SELECT * FROM get_usage_by_conversation(
  (SELECT id FROM clients LIMIT 1), -- Seu client_id
  30,
  10
);

-- =====================================================
-- SUCESSO
-- =====================================================
-- Se chegou até aqui sem erros:
-- ✅ Políticas RLS da pricing_config corrigidas
-- ✅ Função get_usage_by_conversation corrigida
-- ✅ Nomes dos clientes agora aparecem corretamente
-- ✅ Configuração de preços agora funciona
