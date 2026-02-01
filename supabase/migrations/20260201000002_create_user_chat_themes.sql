-- =====================================================
-- MIGRATION: CREATE USER_CHAT_THEMES TABLE
-- Descrição: Personalização de tema das conversas por usuário
-- Data: 2026-02-01
-- =====================================================
--
-- PRÉ-REQUISITO: Bucket 'chat-backgrounds' deve ser criado manualmente!
--                Ver: 20260201000001_create_chat_backgrounds_bucket_MANUAL.md
--
-- INSTRUÇÕES DE USO:
-- 1. Crie o bucket manualmente (ver arquivo .md acima)
-- 2. Copie todo este arquivo
-- 3. Abra o Supabase Dashboard
-- 4. Vá em "SQL Editor" (menu lateral)
-- 5. Clique em "New Query"
-- 6. Cole este código completo
-- 7. Clique em "Run" (ou pressione Ctrl+Enter)
-- 8. Aguarde a confirmação "Success"
--
-- =====================================================

BEGIN;

-- =====================================================
-- VERIFICAÇÃO: Bucket deve existir
-- =====================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-backgrounds'
  ) INTO bucket_exists;

  IF NOT bucket_exists THEN
    RAISE EXCEPTION '❌ Bucket "chat-backgrounds" não existe! Crie o bucket manualmente no Dashboard primeiro. Veja instruções em: 20260201000001_create_chat_backgrounds_bucket_MANUAL.md';
  ELSE
    RAISE NOTICE '✅ Bucket "chat-backgrounds" encontrado';
  END IF;
END $$;

-- =====================================================
-- PARTE 1: CRIAR TABELA user_chat_themes
-- =====================================================

CREATE TABLE IF NOT EXISTS user_chat_themes (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cores das mensagens (formato hex: #RRGGBB)
  incoming_message_color VARCHAR(7) NOT NULL DEFAULT '#2d3338', -- Mensagens recebidas (cinza escuro)
  outgoing_message_color VARCHAR(7) NOT NULL DEFAULT '#005c4b',  -- Mensagens enviadas (verde WhatsApp)

  -- Background da área de conversas
  background_type VARCHAR(20) NOT NULL DEFAULT 'default',
  -- Valores possíveis: 'default' | 'preset' | 'custom'

  background_preset VARCHAR(50),
  -- Nome do preset (ex: 'whatsapp-1', 'whatsapp-dark', etc.)

  background_custom_url TEXT,
  -- URL da imagem no Supabase Storage (apenas se background_type = 'custom')

  -- Metadados de controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: Um usuário só pode ter uma configuração de tema
  CONSTRAINT user_chat_themes_unique_user UNIQUE(user_id),

  -- Constraint: Validar formato de cor hex (#RRGGBB)
  CONSTRAINT incoming_color_format CHECK (incoming_message_color ~* '^#[0-9A-F]{6}$'),
  CONSTRAINT outgoing_color_format CHECK (outgoing_message_color ~* '^#[0-9A-F]{6}$'),

  -- Constraint: Validar background_type
  CONSTRAINT background_type_valid CHECK (background_type IN ('default', 'preset', 'custom'))
);

-- Comentários na tabela (documentação)
COMMENT ON TABLE user_chat_themes IS 'Armazena configurações personalizadas de tema das conversas por usuário';
COMMENT ON COLUMN user_chat_themes.incoming_message_color IS 'Cor das mensagens recebidas em formato hex (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.outgoing_message_color IS 'Cor das mensagens enviadas em formato hex (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.background_type IS 'Tipo de background: default, preset ou custom';
COMMENT ON COLUMN user_chat_themes.background_preset IS 'ID do preset de background (ex: whatsapp-dark)';
COMMENT ON COLUMN user_chat_themes.background_custom_url IS 'URL da imagem customizada no Supabase Storage';

-- =====================================================
-- PARTE 2: CRIAR ÍNDICES
-- =====================================================

-- Índice para busca rápida por user_id (usado em todas as queries)
CREATE INDEX IF NOT EXISTS idx_user_chat_themes_user_id
  ON user_chat_themes(user_id);

-- Índice para busca por background_type (usado em analytics/admin)
CREATE INDEX IF NOT EXISTS idx_user_chat_themes_background_type
  ON user_chat_themes(background_type);

-- =====================================================
-- PARTE 3: CRIAR TRIGGER DE UPDATED_AT
-- =====================================================

-- Função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_user_chat_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa a função acima antes de cada UPDATE
CREATE TRIGGER trigger_update_user_chat_themes_updated_at
  BEFORE UPDATE ON user_chat_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_chat_themes_updated_at();

COMMENT ON FUNCTION update_user_chat_themes_updated_at() IS 'Atualiza automaticamente o campo updated_at';

-- =====================================================
-- PARTE 4: HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS na tabela (segurança multi-tenant)
ALTER TABLE user_chat_themes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 5: CRIAR POLÍTICAS RLS
-- =====================================================

-- Política 1: Usuário pode visualizar APENAS seu próprio tema
CREATE POLICY "Users can view own chat theme"
  ON user_chat_themes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política 2: Usuário pode inserir APENAS seu próprio tema
CREATE POLICY "Users can insert own chat theme"
  ON user_chat_themes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política 3: Usuário pode atualizar APENAS seu próprio tema
CREATE POLICY "Users can update own chat theme"
  ON user_chat_themes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política 4: Usuário pode deletar APENAS seu próprio tema
CREATE POLICY "Users can delete own chat theme"
  ON user_chat_themes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política 5: Service role (backend) pode acessar TODOS os temas
-- (necessário para migrações, admin panel, analytics)
CREATE POLICY "Service role can access all chat themes"
  ON user_chat_themes
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- PARTE 6: POLÍTICAS DE STORAGE
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all backgrounds" ON storage.objects;

-- Política 1: Usuário pode fazer UPLOAD na própria pasta
CREATE POLICY "Users can upload to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política 2: Usuário pode VISUALIZAR arquivos da própria pasta
CREATE POLICY "Users can view own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política 3: Usuário pode DELETAR arquivos da própria pasta
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política 4: TODOS podem LER backgrounds (necessário para exibir imagens)
CREATE POLICY "Public can read all backgrounds"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-backgrounds');

-- =====================================================
-- PARTE 7: FUNÇÃO HELPER (OPCIONAL)
-- =====================================================

-- Função para obter tema do usuário atual (facilita queries)
CREATE OR REPLACE FUNCTION get_current_user_chat_theme()
RETURNS user_chat_themes AS $$
  SELECT * FROM user_chat_themes WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_chat_theme() IS 'Retorna o tema do usuário autenticado atual';

-- =====================================================
-- PARTE 8: VALIDAÇÕES FINAIS
-- =====================================================

-- Verificar se a tabela foi criada
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_chat_themes'
  ) THEN
    RAISE NOTICE '✅ Tabela user_chat_themes criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela user_chat_themes não foi criada';
  END IF;
END $$;

-- Verificar se o bucket existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM storage.buckets
    WHERE id = 'chat-backgrounds'
  ) THEN
    RAISE NOTICE '✅ Bucket chat-backgrounds encontrado!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Bucket chat-backgrounds não foi criado';
  END IF;
END $$;

-- Verificar se RLS está habilitado
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_chat_themes'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS habilitado com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: RLS não está habilitado';
  END IF;
END $$;

-- Contar políticas RLS criadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_chat_themes';

  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ % políticas RLS criadas com sucesso!', policy_count;
  ELSE
    RAISE WARNING '⚠️ Apenas % políticas RLS encontradas (esperado: 5)', policy_count;
  END IF;
END $$;

-- Contar políticas de Storage criadas
DO $$
DECLARE
  storage_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO storage_policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%chat-backgrounds%' OR policyname LIKE '%own folder%' OR policyname LIKE '%own files%');

  IF storage_policy_count >= 4 THEN
    RAISE NOTICE '✅ % políticas de Storage criadas com sucesso!', storage_policy_count;
  ELSE
    RAISE WARNING '⚠️ Apenas % políticas de Storage encontradas (esperado: 4)', storage_policy_count;
  END IF;
END $$;

-- =====================================================
-- COMMIT DA TRANSAÇÃO
-- =====================================================

COMMIT;

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Verifique a tabela user_chat_themes no Table Editor';
  RAISE NOTICE '2. Verifique o bucket chat-backgrounds no Storage';
  RAISE NOTICE '3. Teste criar um tema via API ou interface';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabela criada: user_chat_themes';
  RAISE NOTICE 'Bucket existente: chat-backgrounds';
  RAISE NOTICE 'Políticas RLS: 5 (user_chat_themes)';
  RAISE NOTICE 'Políticas Storage: 4 (chat-backgrounds)';
  RAISE NOTICE '';
END $$;
