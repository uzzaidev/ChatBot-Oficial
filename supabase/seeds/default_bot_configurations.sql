-- ========================================
-- Seed: Default Bot Configurations
-- Description: Configurações padrão do bot (prompts, regras, thresholds, personalidade)
--              Clientes podem customizar qualquer uma dessas configs via dashboard
-- Author: Sistema de Configuração Modular
-- Date: 2025-11-07
-- ========================================

-- IMPORTANTE: Todas as configs aqui têm is_default=true e client_id=NULL
-- Quando cliente customiza, cria uma nova row com is_default=false e seu client_id

BEGIN;

-- Limpar configs padrão antigas (se houver)
DELETE FROM bot_configurations WHERE is_default = true;

-- ========================================
-- CATEGORIA: Continuidade de Conversa
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'continuity:new_conversation_threshold_hours',
  '24'::jsonb,
  true,
  'Horas desde última interação para considerar nova conversa (padrão: 24h)',
  'thresholds'
),
(
  'continuity:greeting_for_new_customer',
  '"Seja acolhedor e apresente o profissional brevemente. Esta é a PRIMEIRA interação."'::jsonb,
  true,
  'Instrução para saudar novos clientes',
  'prompts'
),
(
  'continuity:greeting_for_returning_customer',
  '"Continue de onde parou. NÃO se apresente novamente. O cliente já te conhece."'::jsonb,
  true,
  'Instrução para clientes recorrentes (< 24h desde última msg)',
  'prompts'
);

-- ========================================
-- CATEGORIA: Intent Classifier
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'intent_classifier:use_llm',
  'true'::jsonb,
  true,
  'Se true, usa LLM (Groq) para classificar. Se false, usa regex simples.',
  'rules'
),
(
  'intent_classifier:prompt',
  jsonb_build_object(
    'system', 'Classifique a intenção da mensagem em UMA das categorias:
- saudacao
- duvida_tecnica
- orcamento
- agendamento
- reclamacao
- agradecimento
- despedida
- transferencia
- outro

Responda APENAS com a categoria, sem explicação.',
    'temperature', 0.1,
    'max_tokens', 10
  ),
  true,
  'Prompt do agente classificador de intenção (LLM-based)',
  'prompts'
),
(
  'intent_classifier:intents',
  jsonb_build_array(
    jsonb_build_object('key', 'saudacao', 'label', 'Saudação', 'description', 'Cliente está cumprimentando'),
    jsonb_build_object('key', 'duvida_tecnica', 'label', 'Dúvida Técnica', 'description', 'Perguntas sobre serviços'),
    jsonb_build_object('key', 'orcamento', 'label', 'Orçamento', 'description', 'Pedido de cotação'),
    jsonb_build_object('key', 'agendamento', 'label', 'Agendamento', 'description', 'Solicitar reunião'),
    jsonb_build_object('key', 'reclamacao', 'label', 'Reclamação', 'description', 'Feedback negativo'),
    jsonb_build_object('key', 'agradecimento', 'label', 'Agradecimento', 'description', 'Cliente agradecendo'),
    jsonb_build_object('key', 'despedida', 'label', 'Despedida', 'description', 'Cliente se despedindo'),
    jsonb_build_object('key', 'transferencia', 'label', 'Transferência', 'description', 'Pedir atendimento humano'),
    jsonb_build_object('key', 'outro', 'label', 'Outro', 'description', 'Não classificado')
  ),
  true,
  'Lista de intenções suportadas (customizável - cliente pode adicionar/remover)',
  'rules'
);

-- ========================================
-- CATEGORIA: Entity Extractor
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'entity_extractor:prompt',
  jsonb_build_object(
    'system', 'Extraia entidades da mensagem em JSON:
{
  "name": "nome da pessoa (se mencionado)",
  "location": {"city": "cidade", "state": "UF"},
  "dates": ["datas mencionadas"],
  "numbers": ["números relevantes"],
  "topics": ["energia solar", "data science", "full stack"]
}

Se não encontrar, use null. Responda APENAS JSON válido.',
    'temperature', 0.1,
    'max_tokens', 200,
    'response_format', jsonb_build_object('type', 'json_object')
  ),
  true,
  'Prompt do agente extrator de entidades (nome, localização, datas, etc)',
  'prompts'
);

-- ========================================
-- CATEGORIA: Sentiment & Urgency Analyzer
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'sentiment_analyzer:prompt',
  jsonb_build_object(
    'system', 'Analise urgência e sentimento em JSON:
{
  "urgency": "baixa | média | alta",
  "sentiment": "positivo | neutro | negativo",
  "reason": "breve explicação"
}

Urgência alta: palavras como "urgente", "rápido", "hoje"
Sentimento negativo: reclamação, insatisfação

Responda APENAS JSON válido.',
    'temperature', 0.2,
    'max_tokens', 100,
    'response_format', jsonb_build_object('type', 'json_object')
  ),
  true,
  'Prompt do agente analisador de sentimento e urgência',
  'prompts'
);

-- ========================================
-- CATEGORIA: Personality (Main LLM)
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'personality:config',
  jsonb_build_object(
    'name', 'Assistente do Luis Fernando Boff',
    'role', 'Assistente Virtual Consultivo',
    'expertise', jsonb_build_array(
      'Energia Solar e Sustentabilidade',
      'Data Science e Machine Learning',
      'Desenvolvimento Full Stack (React, Node.js, Python)'
    ),
    'tone', 'profissional, consultivo e empático',
    'style', jsonb_build_object(
      'emojis', false,
      'formality', 'médio-alto',
      'sentence_length', 'curta a média',
      'response_strategy', 'perguntar antes de explicar'
    ),
    'response_rules', jsonb_build_array(
      'Nunca repetir mensagens anteriores',
      'Sempre usar histórico de conversa para contexto',
      'Perguntar primeiro, explicar depois',
      'Manter respostas curtas (máximo 3 frases por mensagem)',
      'Usar português brasileiro formal, mas acessível'
    )
  ),
  true,
  'Configuração de personalidade do bot principal (nome, tom, estilo, regras)',
  'personality'
);

-- ========================================
-- CATEGORIA: Repetition Detector
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'repetition_detector:use_embeddings',
  'false'::jsonb,
  true,
  'Se true, usa OpenAI embeddings (mais preciso, +custo). Se false, usa comparação de palavras (grátis).',
  'rules'
),
(
  'repetition_detector:similarity_threshold',
  '0.70'::jsonb,
  true,
  'Threshold de similaridade para detectar repetição (0-1). Padrão: 0.70 = 70% similar',
  'thresholds'
),
(
  'repetition_detector:check_last_n_responses',
  '3'::jsonb,
  true,
  'Quantas respostas anteriores do bot comparar. Padrão: 3 últimas respostas',
  'thresholds'
);

-- ========================================
-- CATEGORIA: RAG (Retrieval-Augmented Generation)
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'rag:enabled',
  'true'::jsonb,
  true,
  'Se true, usa busca vetorial para enriquecer contexto. Se false, desabilita RAG.',
  'rules'
),
(
  'rag:top_k_documents',
  '5'::jsonb,
  true,
  'Quantos documentos mais relevantes retornar na busca vetorial. Padrão: 5',
  'thresholds'
),
(
  'rag:similarity_threshold',
  '0.50'::jsonb,
  true,
  'Threshold mínimo de similaridade para incluir documento (0-1). Padrão: 0.50',
  'thresholds'
);

-- ========================================
-- CATEGORIA: Batching (Redis)
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'batching:delay_seconds',
  '10'::jsonb,
  true,
  'Segundos de espera para agrupar mensagens rápidas do mesmo usuário. Padrão: 10s',
  'thresholds'
),
(
  'batching:enabled',
  'true'::jsonb,
  true,
  'Se true, agrupa mensagens rápidas antes de processar. Se false, processa imediatamente.',
  'rules'
);

-- ========================================
-- CATEGORIA: Chat History
-- ========================================

INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'chat_history:max_messages',
  '15'::jsonb,
  true,
  'Quantas mensagens anteriores incluir no contexto do LLM. Padrão: 15',
  'thresholds'
),
(
  'chat_history:summarize_if_exceeds',
  '20'::jsonb,
  true,
  'Se histórico ultrapassar N mensagens, usar sumarização. Padrão: 20 (desabilitado se > max_messages)',
  'thresholds'
);

COMMIT;

-- ========================================
-- Verificação
-- ========================================

-- Contar quantas configs padrão foram inseridas
DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM bot_configurations WHERE is_default = true;

  IF config_count > 0 THEN
    RAISE NOTICE '✅ Seed completo: % configurações padrão inseridas', config_count;
  ELSE
    RAISE EXCEPTION '❌ Erro: Nenhuma configuração foi inserida';
  END IF;
END $$;

-- Listar todas as configs por categoria
SELECT
  category,
  COUNT(*) as total_configs
FROM bot_configurations
WHERE is_default = true
GROUP BY category
ORDER BY category;
