-- =====================================================
-- MIGRATION: ADD LIGHT MODE COLORS TO USER_CHAT_THEMES
-- Descrição: Suporte a cores separadas para dark e light mode
-- Data: 2026-02-06
-- =====================================================
-- As colunas existentes (incoming_message_color, etc.) servem como dark mode.
-- Novas colunas _light armazenam as cores do light mode.
-- =====================================================

BEGIN;

-- Adicionar colunas de cores para light mode
ALTER TABLE user_chat_themes
  ADD COLUMN IF NOT EXISTS incoming_message_color_light VARCHAR(7) DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS outgoing_message_color_light VARCHAR(7) DEFAULT '#128c7e',
  ADD COLUMN IF NOT EXISTS incoming_text_color_light VARCHAR(7) DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS outgoing_text_color_light VARCHAR(7) DEFAULT '#FFFFFF';

-- Adicionar constraints de validação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incoming_color_light_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT incoming_color_light_format
        CHECK (incoming_message_color_light IS NULL OR incoming_message_color_light ~* '^#[0-9A-F]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_color_light_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT outgoing_color_light_format
        CHECK (outgoing_message_color_light IS NULL OR outgoing_message_color_light ~* '^#[0-9A-F]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incoming_text_light_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT incoming_text_light_format
        CHECK (incoming_text_color_light IS NULL OR incoming_text_color_light ~* '^#[0-9A-F]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_text_light_format'
  ) THEN
    ALTER TABLE user_chat_themes
      ADD CONSTRAINT outgoing_text_light_format
        CHECK (outgoing_text_color_light IS NULL OR outgoing_text_color_light ~* '^#[0-9A-F]{6}$');
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN user_chat_themes.incoming_message_color_light IS 'Cor de fundo das mensagens recebidas no modo claro (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.outgoing_message_color_light IS 'Cor de fundo das mensagens enviadas no modo claro (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.incoming_text_color_light IS 'Cor do texto das mensagens recebidas no modo claro (#RRGGBB)';
COMMENT ON COLUMN user_chat_themes.outgoing_text_color_light IS 'Cor do texto das mensagens enviadas no modo claro (#RRGGBB)';

COMMIT;
