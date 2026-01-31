-- =============================================================================
-- CRM DEFAULT COLUMNS - Colunas Padrão para Todos os Clientes
-- Description: Cria colunas padrão do Kanban e cards para contatos existentes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNÇÃO: Criar colunas padrão para um cliente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_default_crm_columns(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o cliente já tem colunas
  IF EXISTS (SELECT 1 FROM crm_columns WHERE client_id = p_client_id) THEN
    RETURN;
  END IF;

  -- Insere colunas padrão
  INSERT INTO crm_columns (client_id, name, slug, color, icon, position, is_default)
  VALUES
    -- Coluna 0: Inbox - Todos os novos contatos caem aqui
    (p_client_id, 'Inbox', 'inbox', 'zinc', 'inbox', 0, true),
    -- Coluna 1: Em Qualificação
    (p_client_id, 'Qualificando', 'qualificando', 'blue', 'search', 1, false),
    -- Coluna 2: Em Negociação  
    (p_client_id, 'Negociação', 'negociacao', 'amber', 'handshake', 2, false),
    -- Coluna 3: Proposta Enviada
    (p_client_id, 'Proposta', 'proposta', 'purple', 'file-text', 3, false),
    -- Coluna 4: Fechado/Ganho
    (p_client_id, 'Ganho', 'ganho', 'green', 'trophy', 4, false),
    -- Coluna 5: Perdido
    (p_client_id, 'Perdido', 'perdido', 'red', 'x-circle', 5, false);
END;
$$;

COMMENT ON FUNCTION create_default_crm_columns IS 'Cria colunas padrão do CRM Kanban para um cliente';

-- -----------------------------------------------------------------------------
-- 2. CRIAR COLUNAS PADRÃO PARA TODOS OS CLIENTES EXISTENTES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM clients LOOP
    PERFORM create_default_crm_columns(r.id);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO: Criar cards para contatos sem card
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_crm_cards_for_client(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_column_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Pega a coluna padrão (inbox)
  SELECT id INTO v_default_column_id
  FROM crm_columns
  WHERE client_id = p_client_id AND is_default = true
  LIMIT 1;

  -- Se não tem coluna padrão, cria as colunas primeiro
  IF v_default_column_id IS NULL THEN
    PERFORM create_default_crm_columns(p_client_id);
    
    SELECT id INTO v_default_column_id
    FROM crm_columns
    WHERE client_id = p_client_id AND is_default = true
    LIMIT 1;
  END IF;

  -- Cria cards para todos os contatos que não têm card
  WITH inserted AS (
    INSERT INTO crm_cards (client_id, column_id, phone, position, last_message_at)
    SELECT 
      cw.client_id,
      v_default_column_id,
      cw.telefone,
      ROW_NUMBER() OVER (ORDER BY cw.updated_at DESC) - 1,
      cw.updated_at
    FROM clientes_whatsapp cw
    WHERE cw.client_id = p_client_id
      AND NOT EXISTS (
        SELECT 1 FROM crm_cards cc 
        WHERE cc.client_id = cw.client_id 
          AND cc.phone = cw.telefone
      )
    ON CONFLICT (client_id, phone) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION sync_crm_cards_for_client IS 'Sincroniza cards CRM para contatos sem card de um cliente';

-- -----------------------------------------------------------------------------
-- 4. SINCRONIZAR CARDS PARA TODOS OS CLIENTES EXISTENTES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  cards_created INTEGER;
BEGIN
  FOR r IN SELECT id, name FROM clients LOOP
    cards_created := sync_crm_cards_for_client(r.id);
    IF cards_created > 0 THEN
      RAISE NOTICE 'Cliente %: % cards criados', r.name, cards_created;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: Auto-criar colunas padrão quando novo cliente é criado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_create_default_columns_for_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_default_crm_columns(NEW.id);
  RETURN NEW;
END;
$$;

-- Remove trigger se existir
DROP TRIGGER IF EXISTS trg_auto_create_crm_columns ON clients;

-- Cria trigger
CREATE TRIGGER trg_auto_create_crm_columns
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION auto_create_default_columns_for_new_client();

COMMENT ON FUNCTION auto_create_default_columns_for_new_client IS 'Cria colunas padrão do CRM automaticamente para novos clientes';

-- -----------------------------------------------------------------------------
-- 6. TAGS PADRÃO PARA TODOS OS CLIENTES
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_default_crm_tags(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o cliente já tem tags
  IF EXISTS (SELECT 1 FROM crm_tags WHERE client_id = p_client_id AND is_system = true) THEN
    RETURN;
  END IF;

  -- Insere tags padrão (sistema)
  INSERT INTO crm_tags (client_id, name, color, description, is_system)
  VALUES
    (p_client_id, 'Urgente', 'red', 'Precisa de atenção imediata', true),
    (p_client_id, 'VIP', 'amber', 'Cliente de alto valor', true),
    (p_client_id, 'Interessado', 'green', 'Demonstrou interesse', true),
    (p_client_id, 'Aguardando', 'blue', 'Aguardando resposta', true),
    (p_client_id, 'Retornar', 'purple', 'Precisa retornar contato', true);
END;
$$;

-- Criar tags padrão para clientes existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM clients LOOP
    PERFORM create_default_crm_tags(r.id);
  END LOOP;
END $$;

-- Adicionar criação de tags no trigger de novo cliente
CREATE OR REPLACE FUNCTION auto_create_default_columns_for_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_default_crm_columns(NEW.id);
  PERFORM create_default_crm_tags(NEW.id);
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 7. VIEW: Contatos sem card no CRM (para debug/admin)
-- =============================================================================
CREATE OR REPLACE VIEW v_contacts_without_crm_card AS
SELECT 
  cw.client_id,
  c.name as client_name,
  cw.telefone,
  cw.nome as contact_name,
  cw.created_at,
  cw.updated_at
FROM clientes_whatsapp cw
JOIN clients c ON cw.client_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM crm_cards cc 
  WHERE cc.client_id = cw.client_id 
    AND cc.phone = cw.telefone
)
ORDER BY cw.updated_at DESC;

COMMENT ON VIEW v_contacts_without_crm_card IS 'Lista contatos que ainda não têm card no CRM';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
