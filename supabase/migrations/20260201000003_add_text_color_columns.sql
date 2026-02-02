-- =====================================================
-- MIGRATION: ADD TEXT COLOR COLUMNS
-- Adiciona cor do texto das mensagens
-- Data: 2026-02-01
-- =====================================================

BEGIN;

-- Adicionar colunas de cor do texto
ALTER TABLE user_chat_themes
  ADD COLUMN IF NOT EXISTS incoming_text_color VARCHAR(7) DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS outgoing_text_color VARCHAR(7) DEFAULT '#FFFFFF';

-- Adicionar constraints de validação (somente se as colunas foram criadas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incoming_text_color_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT incoming_text_color_format 
        CHECK (incoming_text_color ~* '^#[0-9A-F]{6}$');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_text_color_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT outgoing_text_color_format 
        CHECK (outgoing_text_color ~* '^#[0-9A-F]{6}$');
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN user_chat_themes.incoming_text_color IS 'Cor do texto das mensagens recebidas (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.outgoing_text_color IS 'Cor do texto das mensagens enviadas (#RRGGBB)';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute para verificar:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_chat_themes';
