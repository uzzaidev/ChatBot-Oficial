-- ========================================
-- Migration: Create bot_configurations table
-- Description: Tabela para armazenar TODAS as configurações do bot
--              (prompts, regras, thresholds, personalidade)
-- Author: Sistema de Configuração Modular
-- Date: 2025-11-07
-- ========================================

-- Criar tabela principal
CREATE TABLE IF NOT EXISTS bot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência ao cliente (multi-tenant)
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Chave de configuração (formato: namespace:key)
  -- Exemplos:
  --   'intent_classifier:prompt'
  --   'personality:config'
  --   'continuity:threshold_hours'
  config_key TEXT NOT NULL,

  -- Valor da configuração (JSONB para flexibilidade máxima)
  -- Pode ser: string, number, boolean, object, array
  config_value JSONB NOT NULL,

  -- Se é configuração padrão (seed)
  -- true = configuração padrão do sistema
  -- false = customização do cliente
  is_default BOOLEAN DEFAULT false,

  -- Metadados para documentação
  description TEXT,
  category TEXT, -- 'prompts', 'rules', 'thresholds', 'personality'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que não haja duplicatas por cliente + config_key
  UNIQUE(client_id, config_key)
);

-- ========================================
-- Índices para performance
-- ========================================

-- Buscar configs por cliente (query mais comum)
CREATE INDEX idx_bot_configs_client
ON bot_configurations(client_id);

-- Buscar configs por chave (para defaults)
CREATE INDEX idx_bot_configs_key
ON bot_configurations(config_key);

-- Filtrar por categoria (para dashboard UI)
CREATE INDEX idx_bot_configs_category
ON bot_configurations(category);

-- Buscar defaults rapidamente
CREATE INDEX idx_bot_configs_default
ON bot_configurations(is_default)
WHERE is_default = true;

-- Índice composto para query principal (cliente + key)
CREATE INDEX idx_bot_configs_client_key
ON bot_configurations(client_id, config_key);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;

-- Política: Clientes podem ver suas próprias configurações + defaults
CREATE POLICY "Clients can view their own configurations and defaults"
  ON bot_configurations FOR SELECT
  USING (
    -- Ver configurações do próprio cliente
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Ver configurações padrão (todos podem ver)
    is_default = true
  );

-- Política: Clientes podem atualizar apenas suas próprias configurações
CREATE POLICY "Clients can update their own configurations"
  ON bot_configurations FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND is_default = false -- Não pode editar defaults
  );

-- Política: Clientes podem inserir suas próprias configurações
CREATE POLICY "Clients can insert their own configurations"
  ON bot_configurations FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND is_default = false -- Não pode criar defaults
  );

-- Política: Clientes podem deletar suas próprias configurações
CREATE POLICY "Clients can delete their own configurations"
  ON bot_configurations FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND is_default = false -- Não pode deletar defaults
  );

-- ========================================
-- Triggers
-- ========================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_bot_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bot_configurations_updated_at
  BEFORE UPDATE ON bot_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_configurations_updated_at();

-- ========================================
-- Comentários para documentação
-- ========================================

COMMENT ON TABLE bot_configurations IS
  'Configurações customizáveis do bot por cliente. TUDO é configurável aqui: prompts, regras, thresholds, personalidade. Zero hardcoding no código.';

COMMENT ON COLUMN bot_configurations.config_key IS
  'Chave no formato namespace:key (ex: intent_classifier:prompt). Use namespaces para organizar: intent_classifier, entity_extractor, personality, continuity, etc.';

COMMENT ON COLUMN bot_configurations.config_value IS
  'Valor em JSONB (flexível). Pode ser string, number, boolean, object complexo, array, etc. Permite qualquer estrutura.';

COMMENT ON COLUMN bot_configurations.is_default IS
  'Se true, é configuração padrão do sistema (seed SQL). Se false, é customização do cliente. Defaults não podem ser editados/deletados.';

COMMENT ON COLUMN bot_configurations.category IS
  'Categoria para agrupar no dashboard: prompts (textos), rules (comportamentos), thresholds (números), personality (config complexa)';

-- ========================================
-- Verificação da migração
-- ========================================

-- Verificar se tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_configurations') THEN
    RAISE NOTICE '✅ Tabela bot_configurations criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela bot_configurations não foi criada';
  END IF;
END $$;
