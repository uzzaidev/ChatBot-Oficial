-- =====================================================
-- DESABILITAR TRIGGER que está causando erro no registro
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

-- 1. Desabilitar trigger on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Verificar se foi removido
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created'
      AND c.relname = 'users'
      AND n.nspname = 'auth'
  ) THEN
    RAISE WARNING '❌ Trigger ainda existe!';
  ELSE
    RAISE NOTICE '✅ Trigger on_auth_user_created removido com sucesso';
  END IF;
END $$;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- NOTICE: ✅ Trigger on_auth_user_created removido com sucesso
-- 
-- Agora o /api/auth/register vai criar o user_profile manualmente
-- sem depender da trigger que estava falhando.
-- =====================================================
