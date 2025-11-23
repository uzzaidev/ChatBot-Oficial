-- =====================================================
-- Script para verificar usuários no Supabase
-- Execute no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Listar todos os usuários com informações básicas
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'client_id' as client_id,
  p.role,
  p.is_active,
  c.name as client_name
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.clients c ON c.id = p.client_id
ORDER BY u.created_at DESC;

-- 2. Verificar usuário específico (luisfboff@hotmail.com)
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'client_id' as client_id,
  p.role,
  p.is_active,
  c.name as client_name
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE u.email = 'luisfboff@hotmail.com';

-- 3. Verificar se há usuários ativos
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN u.email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_users
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id;

-- =====================================================
-- NOTA: Senhas não podem ser visualizadas diretamente
-- Elas são armazenadas como hash (encrypted_password)
-- =====================================================
-- Para resetar senha de um usuário:
-- 1. Supabase Dashboard → Authentication → Users
-- 2. Clique no usuário
-- 3. Clique "Send password reset email"
-- OU
-- 4. Clique "Reset password" e defina nova senha manualmente

