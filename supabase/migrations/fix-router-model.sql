-- Corrigir o modelo do Fast Track Router para um modelo válido
UPDATE bot_configurations
SET config_value = '"gpt-4o-mini"'::jsonb
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND config_key = 'fast_track:router_model';

-- Verificar
SELECT
  config_key,
  config_value::text as value
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND config_key = 'fast_track:router_model';
