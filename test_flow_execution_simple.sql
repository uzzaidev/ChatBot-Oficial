-- ============================================================================
-- TESTE SIMPLIFICADO: Diagnóstico de Flow Execution
-- ============================================================================
-- Este script retorna TABELAS com os resultados (não usa RAISE NOTICE)
-- Execução: Cole no SQL Editor do Supabase e execute
-- ============================================================================

-- ⚠️ SUBSTITUA AQUI:
-- v_client_id: seu client_id real
-- v_phone: número de teste (555499250023)

WITH test_params AS (
  SELECT 
    'SEU_CLIENT_ID_AQUI'::uuid AS client_id,
    '555499250023' AS phone,
    'ola' AS message
),

-- ETAPA 1: Verificar executions ativas
active_executions AS (
  SELECT 
    'ETAPA 1: Executions Ativas' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'id', fe.id,
        'flow_name', iff.name,
        'status', fe.status,
        'started_at', fe.started_at
      )
    ) FILTER (WHERE fe.id IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN flow_executions fe ON fe.client_id = tp.client_id 
    AND fe.phone = tp.phone 
    AND fe.status IN ('running', 'waiting_for_input')
  LEFT JOIN interactive_flows iff ON iff.id = fe.flow_id
),

-- ETAPA 2: Verificar flows com trigger 'always'
always_triggers AS (
  SELECT 
    'ETAPA 2: Flows com Trigger ALWAYS' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'id', iff.id,
        'name', iff.name,
        'created_at', iff.created_at
      )
    ) FILTER (WHERE iff.id IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN interactive_flows iff ON iff.client_id = tp.client_id
    AND iff.trigger_type = 'always'
    AND iff.is_active = true
),

-- ETAPA 3: Verificar flows com trigger 'keyword'
keyword_triggers AS (
  SELECT 
    'ETAPA 3: Flows com Trigger KEYWORD' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'id', iff.id,
        'name', iff.name,
        'keywords', iff.trigger_keywords,
        'match', EXISTS (
          SELECT 1 
          FROM unnest(iff.trigger_keywords) AS kw
          WHERE LOWER(tp.message) LIKE '%' || LOWER(kw) || '%'
        )
      )
    ) FILTER (WHERE iff.id IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN interactive_flows iff ON iff.client_id = tp.client_id
    AND iff.trigger_type = 'keyword'
    AND iff.is_active = true
),

-- ETAPA 4: Verificar QUALQUER flow ativo (FALLBACK NOVO)
any_active_flows AS (
  SELECT 
    'ETAPA 4: Qualquer Flow Ativo (FALLBACK)' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'id', iff.id,
        'name', iff.name,
        'trigger_type', COALESCE(iff.trigger_type, 'null'),
        'trigger_keywords', COALESCE(iff.trigger_keywords::text, 'null'),
        'updated_at', iff.updated_at
      )
      ORDER BY iff.updated_at DESC
    ) FILTER (WHERE iff.id IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN interactive_flows iff ON iff.client_id = tp.client_id
    AND iff.is_active = true
),

-- DIAGNÓSTICO: Todos os flows (mesmo inativos)
all_flows AS (
  SELECT 
    'DIAGNÓSTICO: Todos os Flows do Cliente' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'id', iff.id,
        'name', iff.name,
        'trigger_type', COALESCE(iff.trigger_type, 'null'),
        'is_active', iff.is_active,
        'created_at', iff.created_at
      )
      ORDER BY iff.created_at DESC
    ) FILTER (WHERE iff.id IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN interactive_flows iff ON iff.client_id = tp.client_id
),

-- DIAGNÓSTICO: Status do contato
contact_status AS (
  SELECT 
    'DIAGNÓSTICO: Status do Contato' AS etapa,
    COUNT(*) AS total,
    json_agg(
      json_build_object(
        'telefone', cw.telefone,
        'nome', cw.nome,
        'status', cw.status,
        'created_at', cw.created_at
      )
    ) FILTER (WHERE cw.telefone IS NOT NULL) AS detalhes
  FROM test_params tp
  LEFT JOIN clientes_whatsapp cw ON cw.telefone::text = tp.phone
)

-- RESULTADO FINAL: União de todas as etapas
SELECT * FROM active_executions
UNION ALL
SELECT * FROM always_triggers
UNION ALL
SELECT * FROM keyword_triggers
UNION ALL
SELECT * FROM any_active_flows
UNION ALL
SELECT * FROM all_flows
UNION ALL
SELECT * FROM contact_status;
