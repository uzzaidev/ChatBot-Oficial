-- ============================================================================
-- TESTE COMPLETO: Simulação de Execução de Flow para Novo Contato
-- ============================================================================
-- Este script testa se um flow seria executado para um novo contato
-- com status 'fluxo_inicial'
--
-- Execução: Cole no SQL Editor do Supabase e execute
-- ============================================================================

-- Variáveis do teste (AJUSTE AQUI)
DO $$
DECLARE
  v_client_id UUID := 'SEU_CLIENT_ID_AQUI'; -- ⚠️ SUBSTITUA pelo seu client_id real
  v_phone TEXT := '555499250023'; -- Número de teste usado
  v_message TEXT := 'ola'; -- Mensagem enviada
  
  -- Resultados da simulação
  v_active_execution_count INT;
  v_always_trigger_count INT;
  v_keyword_trigger_count INT;
  v_any_active_flow_count INT;
  
  -- Detalhes dos flows
  rec_flow RECORD;
  v_should_execute BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  TESTE: Lógica de Execução de Flow para Novo Contato          ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Parâmetros do Teste:';
  RAISE NOTICE '   Client ID: %', v_client_id;
  RAISE NOTICE '   Phone: %', v_phone;
  RAISE NOTICE '   Message: %', v_message;
  RAISE NOTICE '';
  
  -- ========================================================================
  -- ETAPA 1: Verificar se existe execution ativa
  -- ========================================================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 ETAPA 1: Verificando executions ativas...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  SELECT COUNT(*) INTO v_active_execution_count
  FROM flow_executions
  WHERE client_id = v_client_id
    AND phone = v_phone
    AND status IN ('running', 'waiting_for_input');
  
  RAISE NOTICE '   Executions ativas encontradas: %', v_active_execution_count;
  
  IF v_active_execution_count > 0 THEN
    v_should_execute := TRUE;
    v_reason := 'Execution ativa já existe';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Detalhes das executions ativas:';
    FOR rec_flow IN 
      SELECT fe.id, fe.flow_id, fe.status, fe.current_node_id, 
             iff.name as flow_name
      FROM flow_executions fe
      JOIN interactive_flows iff ON iff.id = fe.flow_id
      WHERE fe.client_id = v_client_id
        AND fe.phone = v_phone
        AND fe.status IN ('running', 'waiting_for_input')
    LOOP
      RAISE NOTICE '   • Flow: % (ID: %)', rec_flow.flow_name, rec_flow.flow_id;
      RAISE NOTICE '     Status: % | Node Atual: %', rec_flow.status, rec_flow.current_node_id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULTADO: Flow será CONTINUADO (execution ativa)';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE '   ❌ Nenhuma execution ativa (esperado para novo contato)';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- ETAPA 2: Verificar flows com trigger 'always'
  -- ========================================================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 ETAPA 2: Verificando flows com trigger "always"...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  SELECT COUNT(*) INTO v_always_trigger_count
  FROM interactive_flows
  WHERE client_id = v_client_id
    AND trigger_type = 'always'
    AND is_active = true;
  
  RAISE NOTICE '   Flows com trigger "always": %', v_always_trigger_count;
  
  IF v_always_trigger_count > 0 THEN
    v_should_execute := TRUE;
    v_reason := 'Flow com trigger "always" encontrado';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Detalhes dos flows "always":';
    FOR rec_flow IN 
      SELECT id, name, created_at
      FROM interactive_flows
      WHERE client_id = v_client_id
        AND trigger_type = 'always'
        AND is_active = true
    LOOP
      RAISE NOTICE '   • Nome: %', rec_flow.name;
      RAISE NOTICE '     ID: %', rec_flow.id;
      RAISE NOTICE '     Criado em: %', rec_flow.created_at;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESULTADO: Flow será INICIADO (trigger always)';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE '   ❌ Nenhum flow com trigger "always"';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- ETAPA 3: Verificar flows com trigger 'keyword'
  -- ========================================================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 ETAPA 3: Verificando flows com trigger "keyword"...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  v_keyword_trigger_count := 0;
  
  FOR rec_flow IN 
    SELECT id, name, trigger_keywords
    FROM interactive_flows
    WHERE client_id = v_client_id
      AND trigger_type = 'keyword'
      AND is_active = true
  LOOP
    RAISE NOTICE '   Verificando flow: %', rec_flow.name;
    RAISE NOTICE '   Keywords: %', rec_flow.trigger_keywords;
    
    -- Verificar se alguma keyword bate
    IF EXISTS (
      SELECT 1 
      FROM jsonb_array_elements_text(rec_flow.trigger_keywords) AS keyword
      WHERE LOWER(v_message) LIKE '%' || LOWER(keyword) || '%'
    ) THEN
      v_keyword_trigger_count := v_keyword_trigger_count + 1;
      v_should_execute := TRUE;
      v_reason := 'Flow com keyword match encontrado';
      
      RAISE NOTICE '   ✅ MATCH! Keyword encontrada na mensagem';
      RAISE NOTICE '';
      RAISE NOTICE '🎯 RESULTADO: Flow será INICIADO (keyword match)';
      RAISE NOTICE '';
      RETURN;
    ELSE
      RAISE NOTICE '   ❌ Nenhuma keyword bateu com a mensagem';
    END IF;
  END LOOP;
  
  IF v_keyword_trigger_count = 0 THEN
    RAISE NOTICE '   ❌ Nenhum flow com keyword match';
  END IF;
  RAISE NOTICE '';
  
  -- ========================================================================
  -- ETAPA 4: Verificar QUALQUER flow ativo (NOVO COMPORTAMENTO)
  -- ========================================================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 ETAPA 4: Verificando QUALQUER flow ativo (fallback)...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  SELECT COUNT(*) INTO v_any_active_flow_count
  FROM interactive_flows
  WHERE client_id = v_client_id
    AND is_active = true;
  
  RAISE NOTICE '   Flows ativos (qualquer trigger): %', v_any_active_flow_count;
  
  IF v_any_active_flow_count > 0 THEN
    v_should_execute := TRUE;
    v_reason := 'Flow ativo encontrado (fallback para status fluxo_inicial)';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Detalhes dos flows ativos:';
    FOR rec_flow IN 
      SELECT id, name, trigger_type, trigger_keywords, created_at, updated_at
      FROM interactive_flows
      WHERE client_id = v_client_id
        AND is_active = true
      ORDER BY updated_at DESC
    LOOP
      RAISE NOTICE '   • Nome: %', rec_flow.name;
      RAISE NOTICE '     ID: %', rec_flow.id;
      RAISE NOTICE '     Trigger Type: %', COALESCE(rec_flow.trigger_type, 'null');
      RAISE NOTICE '     Keywords: %', COALESCE(rec_flow.trigger_keywords::text, 'null');
      RAISE NOTICE '     Última atualização: %', rec_flow.updated_at;
      RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '🎯 RESULTADO: Flow será INICIADO (qualquer flow ativo - fallback)';
    RAISE NOTICE '💡 Este é o comportamento NOVO para status "fluxo_inicial"';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE '   ❌ Nenhum flow ativo encontrado';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- ETAPA 5: Nenhum flow disponível
  -- ========================================================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '❌ RESULTADO FINAL: Nenhum flow será executado';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  AÇÃO NECESSÁRIA:';
  RAISE NOTICE '   1. Verifique se existe algum flow criado para este cliente';
  RAISE NOTICE '   2. Verifique se o flow está com is_active = true';
  RAISE NOTICE '   3. Verifique se o client_id está correto';
  RAISE NOTICE '';
  
  -- ========================================================================
  -- DIAGNÓSTICO ADICIONAL
  -- ========================================================================
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  DIAGNÓSTICO ADICIONAL                                         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Listar TODOS os flows do cliente (mesmo inativos)
  RAISE NOTICE '📊 Todos os flows deste cliente:';
  FOR rec_flow IN 
    SELECT id, name, trigger_type, is_active, created_at
    FROM interactive_flows
    WHERE client_id = v_client_id
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE '   • % (ID: %)', rec_flow.name, rec_flow.id;
    RAISE NOTICE '     Trigger: % | Ativo: % | Criado: %', 
      COALESCE(rec_flow.trigger_type, 'null'), 
      rec_flow.is_active, 
      rec_flow.created_at;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status do contato no banco:';
  
  IF EXISTS (SELECT 1 FROM clientes_whatsapp WHERE phone = v_phone) THEN
    FOR rec_flow IN 
      SELECT phone, name, status, created_at
      FROM clientes_whatsapp
      WHERE phone = v_phone
    LOOP
      RAISE NOTICE '   Nome: %', rec_flow.name;
      RAISE NOTICE '   Status: %', rec_flow.status;
      RAISE NOTICE '   Criado: %', rec_flow.created_at;
    END LOOP;
  ELSE
    RAISE NOTICE '   ❌ Contato não encontrado no banco';
  END IF;
  
  RAISE NOTICE '';
  
END $$;

-- ============================================================================
-- CONSULTAS RÁPIDAS PARA VALIDAÇÃO
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
RAISE NOTICE '║  CONSULTAS RÁPIDAS                                             ║';
RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
RAISE NOTICE '';
RAISE NOTICE 'Execute as consultas abaixo separadamente para verificar:';
RAISE NOTICE '';
RAISE NOTICE '-- Ver todos os flows do cliente:';
RAISE NOTICE 'SELECT id, name, trigger_type, trigger_keywords, is_active, updated_at';
RAISE NOTICE 'FROM interactive_flows';
RAISE NOTICE 'WHERE client_id = ''SEU_CLIENT_ID_AQUI''';
RAISE NOTICE 'ORDER BY updated_at DESC;';
RAISE NOTICE '';
RAISE NOTICE '-- Ver contato específico:';
RAISE NOTICE 'SELECT phone, name, status, created_at';
RAISE NOTICE 'FROM clientes_whatsapp';
RAISE NOTICE 'WHERE phone = ''555499250023'';';
RAISE NOTICE '';
RAISE NOTICE '-- Ver executions do contato:';
RAISE NOTICE 'SELECT fe.id, iff.name, fe.status, fe.current_node_id, fe.created_at';
RAISE NOTICE 'FROM flow_executions fe';
RAISE NOTICE 'JOIN interactive_flows iff ON iff.id = fe.flow_id';
RAISE NOTICE 'WHERE fe.phone = ''555499250023''';
RAISE NOTICE 'ORDER BY fe.created_at DESC;';
