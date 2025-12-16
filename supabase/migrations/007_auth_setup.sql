-- =====================================================
-- MIGRATION 007: SUPABASE AUTH SETUP
-- =====================================================
-- Descrição: Configura autenticação Supabase para multi-tenant
-- Data: 2025-10-28
-- Fase: 3 (Authentication)
--
-- O que faz:
-- 1. Cria tabela user_profiles (link entre auth.users e clients)
-- 2. Cria trigger para auto-criar profile quando usuário se registra
-- 3. Configura RLS para isolamento de dados
-- 4. Cria primeiro usuário admin (luisfboff@hotmail.com)
--
-- IMPORTANTE: Execute essa migration APÓS configurar Email Auth no Supabase Dashboard
-- =====================================================

-- =====================================================
-- 1. TABELA USER_PROFILES
-- =====================================================
-- Link entre usuários autenticados (auth.users) e clientes (clients)
-- Cada usuário pertence a exatamente 1 cliente

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_client_id ON public.user_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Comentários
COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários - link entre auth.users e clients';
COMMENT ON COLUMN public.user_profiles.id IS 'UUID do usuário (auth.users.id)';
COMMENT ON COLUMN public.user_profiles.client_id IS 'Cliente ao qual o usuário pertence';
COMMENT ON COLUMN public.user_profiles.email IS 'Email do usuário (duplicado de auth.users para conveniência)';

-- =====================================================
-- 2. TRIGGER: AUTO-CREATE PROFILE
-- =====================================================
-- Quando um novo usuário é criado no auth.users (via signup),
-- automaticamente cria um registro correspondente em user_profiles
-- O client_id vem de user_metadata.client_id

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, client_id, email, full_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'client_id')::UUID,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger se existir (para re-executar migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Cria automaticamente user_profile quando novo usuário se registra';

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Garante que cada usuário só pode ver/editar seu próprio perfil

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes (para re-executar migration)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Política: Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 4. FUNÇÃO HELPER: GET CLIENT ID FROM SESSION
-- =====================================================
-- Função SQL para obter client_id do usuário autenticado
-- Usada em queries e RLS policies

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_client_id IS 'Retorna client_id do usuário autenticado (usado em RLS)';

-- =====================================================
-- 5. ATUALIZAR RLS DAS TABELAS EXISTENTES (OPCIONAL)
-- =====================================================
-- Após implementar autenticação, adicionar RLS em:
-- - clientes_whatsapp (WHERE client_id = get_user_client_id())
-- - n8n_chat_histories (WHERE client_id = get_user_client_id())
-- - conversations (WHERE client_id = get_user_client_id())
-- - messages (WHERE client_id = get_user_client_id())
--
-- NOTA: Não ativamos RLS agora para não quebrar o sistema atual
-- Será feito em migration futura após login estar funcionando

-- =====================================================
-- 6. VERIFICAÇÃO
-- =====================================================
-- Após executar migration, rodar:
-- SELECT * FROM user_profiles; (deve estar vazia)
-- SELECT * FROM auth.users; (deve estar vazia)
--
-- Após criar primeiro usuário:
-- SELECT u.email, p.client_id, c.name
-- FROM auth.users u
-- JOIN user_profiles p ON p.id = u.id
-- JOIN clients c ON c.id = p.client_id;

-- =====================================================
-- FIM DA MIGRATION 007
-- =====================================================
