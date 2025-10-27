-- =====================================================
-- Migration: Renomear tabela "Clientes WhatsApp" para clientes_whatsapp
-- =====================================================
-- Razão: Nome com espaço causa problemas de tipos no TypeScript
-- Data: 2025-01-XX

-- IMPORTANTE: Execute esta migration apenas DEPOIS de garantir que:
-- 1. n8n não está mais usando a tabela antiga
-- 2. Você fez backup dos dados

-- =====================================================
-- STEP 1: Renomear a tabela
-- =====================================================

ALTER TABLE IF EXISTS "Clientes WhatsApp"
RENAME TO clientes_whatsapp;

-- =====================================================
-- STEP 2: Renomear constraints (ficam com nome antigo após ALTER TABLE)
-- =====================================================

-- Renomear primary key
ALTER TABLE clientes_whatsapp
RENAME CONSTRAINT "Clientes WhatsApp_pkey" TO clientes_whatsapp_pkey;

-- Constraint unique já tem nome correto (clientes_whatsapp_telefone_key)

-- =====================================================
-- STEP 3: Recriar indexes com novos nomes
-- =====================================================

-- Drop indexes antigos
DROP INDEX IF EXISTS idx_clientes_telefone;
DROP INDEX IF EXISTS idx_clientes_status;

-- Criar novos indexes
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_telefone
ON clientes_whatsapp USING btree (telefone);

CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_status
ON clientes_whatsapp USING btree (status);

CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_created_at
ON clientes_whatsapp USING btree (created_at DESC);

-- =====================================================
-- STEP 4: Criar VIEW para compatibilidade retroativa
-- =====================================================
-- Isso permite que código antigo (n8n) continue funcionando
-- com o nome antigo "Clientes WhatsApp"

CREATE OR REPLACE VIEW "Clientes WhatsApp" AS
SELECT
  telefone,
  nome,
  status,
  created_at
FROM clientes_whatsapp;

-- =====================================================
-- STEP 5: Criar trigger para manter VIEW atualizável
-- =====================================================
-- Permite INSERT/UPDATE/DELETE na VIEW que reflete na tabela

-- Function para INSERT
CREATE OR REPLACE FUNCTION clientes_whatsapp_view_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clientes_whatsapp (telefone, nome, status, created_at)
  VALUES (NEW.telefone, NEW.nome, NEW.status, COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (telefone)
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, clientes_whatsapp.nome),
    status = COALESCE(EXCLUDED.status, clientes_whatsapp.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function para UPDATE
CREATE OR REPLACE FUNCTION clientes_whatsapp_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET
    telefone = NEW.telefone,
    nome = NEW.nome,
    status = NEW.status,
    created_at = NEW.created_at
  WHERE telefone = OLD.telefone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function para DELETE
CREATE OR REPLACE FUNCTION clientes_whatsapp_view_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM clientes_whatsapp WHERE telefone = OLD.telefone;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers na VIEW
CREATE TRIGGER clientes_whatsapp_view_insert_trigger
  INSTEAD OF INSERT ON "Clientes WhatsApp"
  FOR EACH ROW
  EXECUTE FUNCTION clientes_whatsapp_view_insert();

CREATE TRIGGER clientes_whatsapp_view_update_trigger
  INSTEAD OF UPDATE ON "Clientes WhatsApp"
  FOR EACH ROW
  EXECUTE FUNCTION clientes_whatsapp_view_update();

CREATE TRIGGER clientes_whatsapp_view_delete_trigger
  INSTEAD OF DELETE ON "Clientes WhatsApp"
  FOR EACH ROW
  EXECUTE FUNCTION clientes_whatsapp_view_delete();

-- =====================================================
-- STEP 6: Verificação
-- =====================================================

-- Verificar que a tabela foi renomeada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clientes_whatsapp') THEN
    RAISE EXCEPTION 'Tabela clientes_whatsapp não foi criada corretamente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'Clientes WhatsApp') THEN
    RAISE EXCEPTION 'VIEW "Clientes WhatsApp" não foi criada';
  END IF;

  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '✅ Tabela: clientes_whatsapp (nova, sem espaço)';
  RAISE NOTICE '✅ VIEW: "Clientes WhatsApp" (compatibilidade com código antigo)';
END $$;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE clientes_whatsapp IS
'Tabela de clientes do WhatsApp (renomeada de "Clientes WhatsApp" para remover espaço)';

COMMENT ON VIEW "Clientes WhatsApp" IS
'VIEW de compatibilidade - aponta para clientes_whatsapp. Use a tabela diretamente em código novo.';

COMMENT ON COLUMN clientes_whatsapp.telefone IS
'Número de telefone (formato: 5511999999999)';

COMMENT ON COLUMN clientes_whatsapp.status IS
'Status do atendimento: bot, waiting, human';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. A VIEW "Clientes WhatsApp" é ATUALIZÁVEL via triggers
-- 2. Código antigo (n8n) continua funcionando normalmente
-- 3. Código novo deve usar 'clientes_whatsapp' (sem espaço)
-- 4. TypeScript agora conseguirá inferir tipos corretamente
-- 5. Para gerar tipos: npx supabase gen types typescript --local
