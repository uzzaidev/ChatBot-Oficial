-- =====================================================
-- MIGRATION 008: CREATE FIRST USER
-- =====================================================
-- Descrição: Cria primeiro usuário admin (luisfboff@hotmail.com)
-- Data: 2025-10-28
-- Fase: 3 (Authentication)
--
-- IMPORTANTE:
-- 1. Execute migration 007_auth_setup.sql ANTES
-- 2. Configure Email Auth no Supabase Dashboard ANTES
-- 3. Esta migration cria usuário MANUALMENTE via SQL
--    (alternativa: criar via Supabase Dashboard ou signup page)
-- =====================================================

-- =====================================================
-- MÉTODO 1: VIA SUPABASE DASHBOARD + SQL (RECOMENDADO)
-- =====================================================
-- PASSO 1: Criar usuário no Supabase Dashboard
-- 1. Ir para Supabase Dashboard → Authentication → Users
-- 2. Clicar "Add user" → "Create new user"
-- 3. Preencher apenas:
--    Email: luisfboff@hotmail.com
--    Password: [sua senha segura]
--    Auto Confirm User: ✅ (marcar para não precisar confirmar email)
-- 4. Clicar "Create user"
-- 5. Copiar o UUID do usuário criado (aparece na coluna UID)

-- PASSO 2: Executar SQL abaixo (substituir USER_UUID_AQUI pelo UUID copiado)
-- IMPORTANTE: Trocar 'USER_UUID_AQUI' pelo UUID real do usuário!

-- Atualizar user metadata com client_id
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'client_id', 'b21b314f-c49a-467d-94b3-a21ed4412227',
  'full_name', 'Luis Fernando Boff'
)
WHERE email = 'luisfboff@hotmail.com';

-- Criar user_profile manualmente (trigger não roda para usuários já existentes)
INSERT INTO public.user_profiles (id, client_id, email, full_name)
SELECT
  id,
  'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID,
  email,
  'Luis Fernando Boff'
FROM auth.users
WHERE email = 'luisfboff@hotmail.com'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MÉTODO 2: VIA SQL (MANUAL - USE APENAS SE NECESSÁRIO)
-- =====================================================
-- ATENÇÃO: Este método bypassa o sistema de autenticação normal
-- Use apenas para debugging ou seed inicial

-- Primeiro, verificar se o client existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227') THEN
    RAISE EXCEPTION 'Client b21b314f-c49a-467d-94b3-a21ed4412227 não existe! Execute migration 006_setup_default_client.sql primeiro';
  END IF;
END $$;

-- Criar usuário no auth.users
-- NOTA: Esta abordagem NÃO é recomendada em produção
-- Use Supabase Dashboard ou API para criar usuários reais

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- instance_id padrão
  gen_random_uuid(), -- id será gerado
  'authenticated',
  'authenticated',
  'luisfboff@hotmail.com',
  crypt('CHANGE_THIS_PASSWORD', gen_salt('bf')), -- ⚠️ TROQUE A SENHA!
  NOW(), -- email já confirmado
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object(
    'client_id', 'b21b314f-c49a-467d-94b3-a21ed4412227',
    'full_name', 'Luis Fernando Boff'
  ),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING; -- Não duplicar se já existir

-- O trigger handle_new_user() criará automaticamente o user_profile

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Verificar se usuário foi criado corretamente:

SELECT
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  u.raw_user_meta_data->>'client_id' as metadata_client_id,
  u.raw_user_meta_data->>'full_name' as full_name,
  p.client_id as profile_client_id,
  c.name as client_name,
  c.email as client_email
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE u.email = 'luisfboff@hotmail.com';

-- Resultado esperado:
-- - user_id: UUID do usuário
-- - email: luisfboff@hotmail.com
-- - email_confirmed_at: data (não null)
-- - metadata_client_id: b21b314f-c49a-467d-94b3-a21ed4412227
-- - full_name: Luis Fernando Boff
-- - profile_client_id: b21b314f-c49a-467d-94b3-a21ed4412227
-- - client_name: Luis Fernando Boff - Solar & Tech
-- - client_email: luisfboff@hotmail.com

-- Se profile_client_id estiver NULL, o trigger não funcionou
-- Nesse caso, criar user_profile manualmente:

-- INSERT INTO public.user_profiles (id, client_id, email, full_name)
-- SELECT
--   u.id,
--   (u.raw_user_meta_data->>'client_id')::UUID,
--   u.email,
--   u.raw_user_meta_data->>'full_name'
-- FROM auth.users u
-- WHERE u.email = 'luisfboff@hotmail.com'
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RESETAR (SE NECESSÁRIO)
-- =====================================================
-- Para deletar e recriar o usuário:

-- DELETE FROM public.user_profiles WHERE email = 'luisfboff@hotmail.com';
-- DELETE FROM auth.users WHERE email = 'luisfboff@hotmail.com';

-- Então execute novamente a migration

-- =====================================================
-- FIM DA MIGRATION 008
-- =====================================================
