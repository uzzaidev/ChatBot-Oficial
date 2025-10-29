-- =====================================================
-- MIGRATION 010: FIX ORPHANED USERS
-- =====================================================
-- Descrição: Conserta usuários órfãos (auth.users sem user_profiles)
-- Data: 2025-10-29
-- Fase: 3 (Hotfix)
--
-- O que faz:
-- 1. Identifica usuários em auth.users que não têm user_profiles
-- 2. Cria user_profiles automaticamente usando client_id do user_metadata
-- 3. Report de usuários consertados
--
-- QUANDO USAR:
-- - Após registrar usuário e trigger handle_new_user() não executar
-- - Usuários existentes criados manualmente
-- - Problemas de sincronização entre auth.users e user_profiles
-- =====================================================

-- =====================================================
-- PARTE 1: IDENTIFICAR USUÁRIOS ÓRFÃOS
-- =====================================================

DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Contar usuários órfãos
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 MIGRATION 010: FIX ORPHANED USERS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Usuários órfãos encontrados: %', orphaned_count;
  RAISE NOTICE '';

  IF orphaned_count = 0 THEN
    RAISE NOTICE '✅ Nenhum usuário órfão encontrado!';
    RAISE NOTICE '';
    RETURN;
  END IF;

  -- Listar usuários órfãos
  RAISE NOTICE '👥 Usuários sem profile:';
  FOR u IN (
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data->>'client_id' as metadata_client_id,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ORDER BY u.created_at DESC
  ) LOOP
    RAISE NOTICE '  - % (%) | client_id in metadata: %',
      u.email,
      u.id,
      CASE WHEN u.metadata_client_id IS NOT NULL THEN 'YES' ELSE 'NO ⚠️' END;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 2: CRIAR PROFILES PARA USUÁRIOS ÓRFÃOS
-- =====================================================

DO $$
DECLARE
  u RECORD;
  created_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Criando profiles para usuários órfãos...';
  RAISE NOTICE '';

  -- Iterar sobre usuários órfãos
  FOR u IN (
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data->>'client_id' as metadata_client_id,
      u.raw_user_meta_data->>'full_name' as full_name
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    WHERE p.id IS NULL
  ) LOOP
    -- Verificar se user_metadata tem client_id
    IF u.metadata_client_id IS NULL THEN
      RAISE WARNING '  ⚠️  SKIPPED: % - user_metadata sem client_id', u.email;
      RAISE WARNING '      Solução: Deletar usuário e registrar novamente via /register';
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Verificar se client_id existe na tabela clients
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = u.metadata_client_id::UUID) THEN
      RAISE WARNING '  ⚠️  SKIPPED: % - client_id % não existe na tabela clients',
        u.email, u.metadata_client_id;
      RAISE WARNING '      Solução: Criar client manualmente ou deletar usuário';
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Criar user_profile
    BEGIN
      INSERT INTO public.user_profiles (id, client_id, email, full_name, created_at, updated_at)
      VALUES (
        u.id,
        u.metadata_client_id::UUID,
        u.email,
        u.full_name,
        NOW(),
        NOW()
      );

      RAISE NOTICE '  ✅ CREATED: % → client_id: %', u.email, u.metadata_client_id;
      created_count := created_count + 1;

    EXCEPTION
      WHEN unique_violation THEN
        RAISE WARNING '  ⚠️  SKIPPED: % - profile já existe (unique violation)', u.email;
        skipped_count := skipped_count + 1;
      WHEN foreign_key_violation THEN
        RAISE WARNING '  ⚠️  SKIPPED: % - client_id inválido (foreign key violation)', u.email;
        skipped_count := skipped_count + 1;
      WHEN OTHERS THEN
        RAISE WARNING '  ❌ ERROR: % - %', u.email, SQLERRM;
        skipped_count := skipped_count + 1;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ Profiles criados: %', created_count;
  RAISE NOTICE '  ⚠️  Usuários ignorados: %', skipped_count;
  RAISE NOTICE '';

  IF created_count > 0 THEN
    RAISE NOTICE '🎉 Migration concluída com sucesso!';
  ELSIF skipped_count > 0 THEN
    RAISE NOTICE '⚠️  Alguns usuários precisam de correção manual';
  END IF;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  total_users INTEGER;
  users_with_profiles INTEGER;
  orphaned_users INTEGER;
BEGIN
  -- Contar usuários
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO users_with_profiles
  FROM auth.users u
  INNER JOIN public.user_profiles p ON p.id = u.id;

  orphaned_users := total_users - users_with_profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Total de usuários: %', total_users;
  RAISE NOTICE '  Com profiles: %', users_with_profiles;
  RAISE NOTICE '  Órfãos: %', orphaned_users;
  RAISE NOTICE '';

  IF orphaned_users = 0 THEN
    RAISE NOTICE '✅ Todos os usuários têm profiles válidos!';
  ELSE
    RAISE NOTICE '⚠️  Ainda existem % usuários órfãos', orphaned_users;
    RAISE NOTICE '   Execute novamente ou conserte manualmente';
  END IF;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 4: QUERY ÚTIL PARA DEBUG
-- =====================================================

-- Descomentar para ver detalhes completos:

/*
SELECT
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  u.raw_user_meta_data->>'client_id' as metadata_client_id,
  u.raw_user_meta_data->>'full_name' as metadata_full_name,
  p.id as profile_id,
  p.client_id as profile_client_id,
  p.full_name as profile_full_name,
  c.name as client_name,
  c.status as client_status,
  CASE
    WHEN p.id IS NULL THEN '❌ SEM PROFILE'
    WHEN p.client_id IS NULL THEN '⚠️  PROFILE SEM CLIENT_ID'
    WHEN c.id IS NULL THEN '⚠️  CLIENT NÃO EXISTE'
    WHEN c.status != 'active' THEN '⚠️  CLIENT INATIVO'
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.clients c ON c.id = p.client_id
ORDER BY u.created_at DESC;
*/

-- =====================================================
-- FIM DA MIGRATION 010
-- =====================================================

RAISE NOTICE '========================================';
RAISE NOTICE '✅ MIGRATION 010 COMPLETED';
RAISE NOTICE '========================================';
