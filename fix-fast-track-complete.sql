-- ═══════════════════════════════════════════════════════════════════════
-- 🔧 SOLUÇÃO COMPLETA: Recriar TODAS as configs do Fast Track do ZERO
-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ Execute este script COMPLETO de uma vez
-- ⚠️ SUBSTITUA 'SEU_CLIENT_ID' pelo seu client_id real

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 1: Obter seu client_id (copie o resultado)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔍 Seu Client ID:' as info,
  id,
  name,
  slug
FROM clients
ORDER BY created_at DESC
LIMIT 1;

-- ⚠️ COPIE O 'id' ACIMA E COLE ABAIXO EM TODAS AS LINHAS 'SEU_CLIENT_ID'

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 2: LIMPAR configs antigas (se existirem)
-- ───────────────────────────────────────────────────────────────────────
DELETE FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID'
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  );

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 3: CRIAR Nível 1 - Node Enabled (CRÍTICO!)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'flow:node_enabled:fast_track_router',
  '{"enabled": true}'::jsonb,
  false,
  'rules',
  'Node enabled state for fast_track_router'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 4: CRIAR Nível 2 - Fast Track Enabled
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:enabled',
  'true'::jsonb,
  false,
  'rules',
  'Enable fast track router functionality'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 5: CRIAR Router Model
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:router_model',
  '"gpt-4o-mini"'::jsonb,
  false,
  'rules',
  'Model used for FAQ classification'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 6: CRIAR Similarity Threshold
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:similarity_threshold',
  '0.8'::jsonb,
  false,
  'thresholds',
  'Similarity threshold for FAQ matching'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 7: CRIAR Catálogo de FAQs (EXEMPLO)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:catalog',
  '[
    {
      "topic": "faq_servicos",
      "canonical": "Quais são os serviços disponíveis?",
      "examples": [
        "que serviços vocês oferecem?",
        "me fala sobre os serviços",
        "o que vocês fazem?",
        "quais são suas especialidades?"
      ]
    },
    {
      "topic": "faq_horario",
      "canonical": "Qual é o horário de funcionamento?",
      "examples": [
        "que horas vocês abrem?",
        "horário de atendimento",
        "quando vocês funcionam?",
        "até que horas atendem?"
      ]
    },
    {
      "topic": "faq_planos",
      "canonical": "Quais são os planos disponíveis?",
      "examples": [
        "pode me mandar o plano?",
        "quero ver os planos",
        "tem plano disponível?",
        "quanto custa o plano?",
        "preço do plano"
      ]
    }
  ]'::jsonb,
  false,
  'rules',
  'FAQ catalog for fast track routing'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 8: CRIAR Keywords (opcional)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:keywords',
  '[]'::jsonb,
  false,
  'rules',
  'Optional keywords for prefiltering'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 9: CRIAR Match Mode
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:match_mode',
  '"contains"'::jsonb,
  false,
  'rules',
  'Keyword match mode: contains or starts_with'
);

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 10: CRIAR Disable Tools
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'SEU_CLIENT_ID',
  'fast_track:disable_tools',
  'true'::jsonb,
  false,
  'rules',
  'Disable tools in fast track mode for stable prompts'
);

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════
SELECT
  '✅ CONFIGS CRIADAS COM SUCESSO' as resultado,
  COUNT(*) as total_configs,
  string_agg(config_key, E'\n') as configs_criadas
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID'
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  );

-- ───────────────────────────────────────────────────────────────────────
-- Ver detalhes de cada config
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📋 DETALHES DAS CONFIGS' as titulo,
  config_key,
  CASE
    WHEN config_key = 'flow:node_enabled:fast_track_router' THEN
      CASE
        WHEN config_value->>'enabled' = 'true' THEN '✅ ATIVO'
        ELSE '❌ INATIVO'
      END
    WHEN config_key = 'fast_track:enabled' THEN
      CASE
        WHEN config_value = 'true'::jsonb THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
      END
    WHEN config_key = 'fast_track:catalog' THEN
      '✅ ' || jsonb_array_length(config_value)::text || ' FAQs'
    WHEN config_key = 'fast_track:router_model' THEN
      '✅ Modelo: ' || (config_value#>>'{}')
    ELSE '✅ Configurado'
  END as status,
  config_value::text as valor,
  created_at
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID'
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  )
ORDER BY
  CASE
    WHEN config_key = 'flow:node_enabled:fast_track_router' THEN 1
    WHEN config_key = 'fast_track:enabled' THEN 2
    WHEN config_key = 'fast_track:router_model' THEN 3
    WHEN config_key = 'fast_track:catalog' THEN 4
    ELSE 5
  END,
  config_key;
