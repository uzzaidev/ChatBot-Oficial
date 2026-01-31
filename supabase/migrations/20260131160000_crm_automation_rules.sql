-- =============================================================================
-- CRM AUTOMATION RULES & LEAD SOURCES
-- =============================================================================
-- Fase 3: Sistema de regras de automação customizáveis
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LEAD_SOURCES - Rastreio de origem dos leads (Meta Ads, etc)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  
  -- Source identification
  source_type TEXT NOT NULL DEFAULT 'organic', -- 'meta_ads', 'organic', 'direct', 'referral'
  
  -- Meta Ads specific fields (from webhook referral)
  ad_id TEXT,
  ad_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  source_url TEXT,
  headline TEXT,
  body TEXT,
  media_type TEXT,
  ctwa_clid TEXT, -- Click-to-WhatsApp click ID
  
  -- Raw data
  raw_referral JSONB,
  
  -- Timestamps
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_card_source UNIQUE (card_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_sources_client ON lead_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_card ON lead_sources(card_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON lead_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_lead_sources_campaign ON lead_sources(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_ad ON lead_sources(ad_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_captured ON lead_sources(captured_at);

-- RLS
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_sources_select" ON lead_sources
  FOR SELECT USING (client_id = get_current_user_client_id());

CREATE POLICY "lead_sources_insert" ON lead_sources
  FOR INSERT WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "lead_sources_service" ON lead_sources
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. CRM_AUTOMATION_RULES - Regras de automação customizáveis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule type (what triggers the rule)
  trigger_type TEXT NOT NULL,
  -- Triggers disponíveis:
  -- 'message_received'     - Quando recebe mensagem do cliente
  -- 'message_sent'         - Quando envia mensagem para cliente
  -- 'inactivity'           - Após X dias sem resposta
  -- 'status_change'        - Quando status muda para X
  -- 'tag_added'            - Quando tag é adicionada
  -- 'lead_source'          - Quando lead vem de anúncio
  -- 'transfer_human'       - Quando pede transferência para humano
  -- 'card_created'         - Quando card é criado
  
  -- Trigger conditions (JSONB for flexibility)
  trigger_conditions JSONB DEFAULT '{}',
  -- Exemplos:
  -- { "inactivity_days": 3 }
  -- { "source_type": "meta_ads" }
  -- { "from_status": "bot", "to_status": "humano" }
  -- { "tag_id": "uuid" }
  
  -- Action type (what happens when triggered)
  action_type TEXT NOT NULL,
  -- Actions disponíveis:
  -- 'move_to_column'       - Mover card para coluna
  -- 'add_tag'              - Adicionar tag
  -- 'remove_tag'           - Remover tag
  -- 'assign_to'            - Atribuir a responsável
  -- 'update_auto_status'   - Atualizar auto_status
  -- 'send_template'        - Enviar template (scheduled)
  -- 'add_note'             - Adicionar nota automática
  -- 'log_activity'         - Registrar atividade
  
  -- Action parameters (JSONB for flexibility)
  action_params JSONB DEFAULT '{}',
  -- Exemplos:
  -- { "column_id": "uuid" }
  -- { "tag_id": "uuid" }
  -- { "auto_status": "awaiting_attendant" }
  -- { "template_id": "uuid", "delay_minutes": 30 }
  -- { "note_content": "Lead veio de anúncio: {{campaign_name}}" }
  
  -- Rule status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = runs first
  
  -- System rules (can't be deleted by user)
  is_system BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_client_rule_name UNIQUE (client_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_client ON crm_automation_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON crm_automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON crm_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON crm_automation_rules(priority DESC);

-- RLS
ALTER TABLE crm_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_rules_select" ON crm_automation_rules
  FOR SELECT USING (client_id = get_current_user_client_id());

CREATE POLICY "automation_rules_insert" ON crm_automation_rules
  FOR INSERT WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "automation_rules_update" ON crm_automation_rules
  FOR UPDATE USING (client_id = get_current_user_client_id() AND is_system = false);

CREATE POLICY "automation_rules_delete" ON crm_automation_rules
  FOR DELETE USING (client_id = get_current_user_client_id() AND is_system = false);

CREATE POLICY "automation_rules_service" ON crm_automation_rules
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. CRM_RULE_EXECUTIONS - Log de execuções de regras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES crm_automation_rules(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  
  -- Execution details
  trigger_data JSONB, -- Data that triggered the rule
  action_result JSONB, -- Result of the action
  status TEXT DEFAULT 'success', -- 'success', 'failed', 'skipped'
  error_message TEXT,
  
  -- Timestamps
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rule_executions_client ON crm_rule_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON crm_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_card ON crm_rule_executions(card_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_date ON crm_rule_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_rule_executions_status ON crm_rule_executions(status);

-- RLS
ALTER TABLE crm_rule_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_executions_select" ON crm_rule_executions
  FOR SELECT USING (client_id = get_current_user_client_id());

CREATE POLICY "rule_executions_service" ON crm_rule_executions
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. CRM_SETTINGS - Configurações gerais do CRM por cliente
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Auto-status settings
  auto_status_enabled BOOLEAN DEFAULT true,
  
  -- Lead source tracking
  lead_tracking_enabled BOOLEAN DEFAULT true,
  auto_tag_ads BOOLEAN DEFAULT true, -- Auto criar tag quando vem de anúncio
  
  -- Default behaviors
  default_column_id UUID REFERENCES crm_columns(id) ON DELETE SET NULL,
  auto_create_cards BOOLEAN DEFAULT true, -- Auto criar card para novos contatos
  
  -- Inactivity settings
  inactivity_warning_days INTEGER DEFAULT 3,
  inactivity_critical_days INTEGER DEFAULT 7,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_client_settings UNIQUE (client_id)
);

-- RLS
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_settings_select" ON crm_settings
  FOR SELECT USING (client_id = get_current_user_client_id());

CREATE POLICY "crm_settings_insert" ON crm_settings
  FOR INSERT WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "crm_settings_update" ON crm_settings
  FOR UPDATE USING (client_id = get_current_user_client_id());

CREATE POLICY "crm_settings_service" ON crm_settings
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO: Processar regras de automação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_crm_automation_rules(
  p_client_id UUID,
  p_card_id UUID,
  p_trigger_type TEXT,
  p_trigger_data JSONB DEFAULT '{}'
)
RETURNS TABLE (
  rule_id UUID,
  action_type TEXT,
  action_params JSONB,
  executed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_should_execute BOOLEAN;
  v_result JSONB;
BEGIN
  -- Buscar regras ativas para este trigger, ordenadas por prioridade
  FOR v_rule IN
    SELECT r.*
    FROM crm_automation_rules r
    WHERE r.client_id = p_client_id
      AND r.trigger_type = p_trigger_type
      AND r.is_active = true
    ORDER BY r.priority DESC, r.created_at ASC
  LOOP
    v_should_execute := true;
    
    -- Verificar condições específicas do trigger
    IF v_rule.trigger_conditions IS NOT NULL AND v_rule.trigger_conditions != '{}' THEN
      -- Verificar inatividade
      IF p_trigger_type = 'inactivity' THEN
        v_should_execute := (p_trigger_data->>'inactive_days')::int >= 
                           COALESCE((v_rule.trigger_conditions->>'inactivity_days')::int, 1);
      
      -- Verificar source type
      ELSIF p_trigger_type = 'lead_source' THEN
        v_should_execute := p_trigger_data->>'source_type' = 
                           COALESCE(v_rule.trigger_conditions->>'source_type', p_trigger_data->>'source_type');
      
      -- Verificar mudança de status
      ELSIF p_trigger_type = 'status_change' THEN
        v_should_execute := (
          (v_rule.trigger_conditions->>'from_status' IS NULL OR 
           p_trigger_data->>'from_status' = v_rule.trigger_conditions->>'from_status')
          AND
          (v_rule.trigger_conditions->>'to_status' IS NULL OR 
           p_trigger_data->>'to_status' = v_rule.trigger_conditions->>'to_status')
        );
      END IF;
    END IF;
    
    -- Retornar regra para execução
    IF v_should_execute THEN
      -- Registrar execução
      INSERT INTO crm_rule_executions (client_id, rule_id, card_id, trigger_data, status)
      VALUES (p_client_id, v_rule.id, p_card_id, p_trigger_data, 'pending');
      
      RETURN QUERY SELECT v_rule.id, v_rule.action_type, v_rule.action_params, true;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER: Auto-atualizar updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_crm_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crm_automation_rules_updated_at
  BEFORE UPDATE ON crm_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_automation_updated_at();

CREATE TRIGGER trigger_crm_settings_updated_at
  BEFORE UPDATE ON crm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_automation_updated_at();

-- -----------------------------------------------------------------------------
-- 7. SEED: Regras padrão do sistema (por cliente existente)
-- -----------------------------------------------------------------------------
-- Nota: As regras padrão serão criadas via API quando o cliente acessar o CRM
-- pela primeira vez, para permitir customização

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
