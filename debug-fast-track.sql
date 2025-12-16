-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DIAGNÓSTICO: Fast Track Router - Por que não está executando?
-- ═══════════════════════════════════════════════════════════════════════

-- IMPORTANTE: Substitua 'SEU_CLIENT_ID_AQUI' pelo seu client_id real

-- ───────────────────────────────────────────────────────────────────────
-- 1️⃣ VERIFICAR NÍVEL 1: Node habilitado no Flow Architecture?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'NÍVEL 1: Node Enabled no Flow' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = 'SEU_CLIENT_ID_AQUI'
      AND config_key = 'flow:node_enabled:fast_track_router'
      AND config_value->>'enabled' = 'true'
    ) THEN '✅ HABILITADO'
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = 'SEU_CLIENT_ID_AQUI'
      AND config_key = 'flow:node_enabled:fast_track_router'
      AND config_value->>'enabled' = 'false'
    ) THEN '❌ DESABILITADO (problema aqui!)'
    ELSE '⚠️ NÃO CONFIGURADO (usa default: false)'
  END as status,
  config_value
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key = 'flow:node_enabled:fast_track_router';

-- ───────────────────────────────────────────────────────────────────────
-- 2️⃣ VERIFICAR NÍVEL 2: Fast Track habilitado na config?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'NÍVEL 2: Fast Track Enabled' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = 'SEU_CLIENT_ID_AQUI'
      AND config_key = 'fast_track:enabled'
      AND config_value = 'true'::jsonb
    ) THEN '✅ HABILITADO'
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = 'SEU_CLIENT_ID_AQUI'
      AND config_key = 'fast_track:enabled'
      AND config_value = 'false'::jsonb
    ) THEN '❌ DESABILITADO (problema aqui!)'
    ELSE '⚠️ NÃO CONFIGURADO (usa default: false)'
  END as status,
  config_value
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key = 'fast_track:enabled';

-- ───────────────────────────────────────────────────────────────────────
-- 3️⃣ VERIFICAR CATÁLOGO: Tem FAQs cadastradas?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'NÍVEL 3: Catálogo de FAQs' as check_type,
  CASE
    WHEN config_value IS NULL THEN '❌ SEM CATÁLOGO (problema aqui!)'
    WHEN jsonb_array_length(config_value) = 0 THEN '❌ CATÁLOGO VAZIO (problema aqui!)'
    ELSE '✅ ' || jsonb_array_length(config_value)::text || ' FAQs cadastradas'
  END as status,
  config_value
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key = 'fast_track:catalog';

-- ───────────────────────────────────────────────────────────────────────
-- 4️⃣ VER TODAS AS CONFIGS DO FAST TRACK
-- ───────────────────────────────────────────────────────────────────────
SELECT
  config_key,
  config_value,
  created_at,
  updated_at
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  )
ORDER BY config_key;

-- ═══════════════════════════════════════════════════════════════════════
-- 🔧 SOLUÇÃO: Habilitar Fast Track (execute SE necessário)
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 1: Habilitar NÍVEL 1 (Node no Flow)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'flow:node_enabled:fast_track_router',
  '{"enabled": true}'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '{"enabled": true}'::jsonb,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 2: Habilitar NÍVEL 2 (Fast Track Config)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:enabled',
  'true'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = 'true'::jsonb,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 3: Configurar Router Model (OBRIGATÓRIO)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:router_model',
  '"gpt-4o-mini"'::jsonb  -- Modelo para classificação
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '"gpt-4o-mini"'::jsonb,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 4: Configurar Threshold (Opcional - usa default 0.80)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:similarity_threshold',
  '0.80'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '0.80'::jsonb,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 5: Adicionar Catálogo de FAQs (EXEMPLO)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:catalog',
  '[
    {
      "topic": "faq_planos",
      "canonical": "Quais são os planos disponíveis?",
      "examples": [
        "pode me mandar o plano?",
        "quero ver os planos",
        "tem plano disponível?",
        "quanto custa o plano?"
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
    }
  ]'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '[
    {
      "topic": "faq_planos",
      "canonical": "Quais são os planos disponíveis?",
      "examples": [
        "pode me mandar o plano?",
        "quero ver os planos",
        "tem plano disponível?",
        "quanto custa o plano?"
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
    }
  ]'::jsonb,
  updated_at = NOW();

-- ───────────────────────────────────────────────────────────────────────
-- SOLUÇÃO 6: Limpar Cache do Flow (Force Refresh)
-- ───────────────────────────────────────────────────────────────────────
-- Não há comando SQL para isso - o cache é em memória no servidor
-- Reinicie o servidor Next.js ou aguarde 1 minuto (TTL do cache)

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════
SELECT
  'RESUMO FINAL' as tipo,
  COUNT(*) FILTER (WHERE config_key LIKE 'fast_track:%') as configs_fast_track,
  COUNT(*) FILTER (WHERE config_key = 'flow:node_enabled:fast_track_router') as node_enabled_config,
  string_agg(config_key, ', ' ORDER BY config_key) as chaves_configuradas
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND (config_key LIKE 'fast_track:%' OR config_key = 'flow:node_enabled:fast_track_router');
