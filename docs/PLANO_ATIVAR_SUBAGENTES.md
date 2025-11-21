# 🎯 Plano: Ativar e Configurar Subagentes via Flow Architecture

## 📋 Status Atual

### ✅ O que JÁ está funcionando:

1. **Subagentes ATIVOS no chatflow** (`src/flows/chatbotFlow.ts`):
   - `checkContinuity` (linha 301) - Detecta nova conversa vs continuação
   - `classifyIntent` (linha 314) - Classifica intenção do usuário
   - `detectRepetition` (linha 348) - Detecta respostas repetitivas

2. **Todos leem de `bot_configurations`**:
   - ✅ `checkContinuity.ts` (linha 34) → `getBotConfig(clientId, 'continuity:*')`
   - ✅ `classifyIntent.ts` (linha 37) → `getBotConfigs(clientId, ['intent_classifier:*'])`
   - ✅ `detectRepetition.ts` (linha 39) → `getBotConfigs(clientId, ['repetition_detector:*'])`

3. **API e UI prontas**:
   - ✅ `/api/flow/nodes/[nodeId]` busca e salva configs
   - ✅ `FlowArchitectureManager.tsx` renderiza campos dinamicamente
   - ✅ Mudanças afetam o bot em tempo real

### ⚠️ Problema:

**As configurações podem NÃO EXISTIR no banco `bot_configurations` ainda!**

Isso causa:
- Bot funciona (usa defaults hardcoded)
- UI não mostra campos para editar (sem dados no banco)
- Impossível configurar via Flow Architecture

---

## 🔧 Solução: 3 Etapas

### Etapa 1: Verificar se Configurações Existem

Execute no Supabase SQL Editor:

```sql
-- Verificar configurações existentes para seu cliente
SELECT config_key, config_value, category, description
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key LIKE ANY(ARRAY[
    'continuity:%',
    'intent_classifier:%',
    'repetition_detector:%'
  ])
ORDER BY config_key;
```

**Se retornar 0 linhas** → Prossiga para Etapa 2
**Se retornar linhas** → Pule para Etapa 3 (apenas ajustar via UI)

---

### Etapa 2: Popular Configurações Iniciais

Crie migration para inserir configurações padrão:

```bash
# No terminal do projeto
supabase migration new seed_subagentes_configs
```

**Arquivo gerado**: `supabase/migrations/TIMESTAMP_seed_subagentes_configs.sql`

**Conteúdo do migration**:

```sql
-- Migration: Seed default configurations for subagentes
-- Popula configurações padrão para checkContinuity, classifyIntent e detectRepetition

-- ============================================
-- 1. CHECK CONTINUITY (Detecção de Continuidade)
-- ============================================

-- 1.1. Threshold para nova conversa (24 horas default)
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'continuity:new_conversation_threshold_hours' AS config_key,
  '24'::jsonb AS config_value,
  'thresholds' AS category,
  'Horas sem mensagens para considerar nova conversa' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 1.2. Greeting para novo cliente
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'continuity:greeting_for_new_customer' AS config_key,
  '"Seja acolhedor e apresente o profissional brevemente. Esta é a PRIMEIRA interação com este cliente."'::jsonb AS config_value,
  'prompts' AS category,
  'Instrução de saudação para novos clientes' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 1.3. Greeting para cliente que retorna
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'continuity:greeting_for_returning_customer' AS config_key,
  '"Continue de onde parou. NÃO se apresente novamente. O cliente já te conhece e vocês têm histórico de conversa."'::jsonb AS config_value,
  'prompts' AS category,
  'Instrução de saudação para clientes que retornam' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- ============================================
-- 2. CLASSIFY INTENT (Classificação de Intenção)
-- ============================================

-- 2.1. Usar LLM para classificação (true = mais preciso, false = regex rápido)
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'intent_classifier:use_llm' AS config_key,
  'true'::jsonb AS config_value,
  'rules' AS category,
  'Se true, usa LLM (Groq) para classificar. Se false, usa regex.' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 2.2. Prompt do LLM classificador
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'intent_classifier:prompt' AS config_key,
  jsonb_build_object(
    'system', 'Você é um classificador de intenções. Analise a mensagem do usuário e identifique a intenção principal.',
    'temperature', 0.1,
    'max_tokens', 10
  ) AS config_value,
  'prompts' AS category,
  'Configuração do prompt do classificador LLM' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 2.3. Lista de intenções suportadas
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'intent_classifier:intents' AS config_key,
  jsonb_build_array(
    jsonb_build_object('key', 'saudacao', 'label', 'Saudação', 'description', 'Cliente cumprimentando ou iniciando conversa'),
    jsonb_build_object('key', 'duvida_tecnica', 'label', 'Dúvida Técnica', 'description', 'Perguntas sobre como algo funciona'),
    jsonb_build_object('key', 'orcamento', 'label', 'Orçamento', 'description', 'Solicitação de preço ou cotação'),
    jsonb_build_object('key', 'agendamento', 'label', 'Agendamento', 'description', 'Marcar reunião ou horário'),
    jsonb_build_object('key', 'reclamacao', 'label', 'Reclamação', 'description', 'Insatisfação ou problema'),
    jsonb_build_object('key', 'agradecimento', 'label', 'Agradecimento', 'description', 'Gratidão pelo atendimento'),
    jsonb_build_object('key', 'despedida', 'label', 'Despedida', 'description', 'Finalização de conversa'),
    jsonb_build_object('key', 'transferencia', 'label', 'Transferência', 'description', 'Quer falar com humano'),
    jsonb_build_object('key', 'outro', 'label', 'Outro', 'description', 'Intenção não identificada')
  ) AS config_value,
  'rules' AS category,
  'Intenções que o classificador pode identificar' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- ============================================
-- 3. DETECT REPETITION (Detecção de Repetição)
-- ============================================

-- 3.1. Usar embeddings (false por enquanto - só implementado word-based)
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'repetition_detector:use_embeddings' AS config_key,
  'false'::jsonb AS config_value,
  'rules' AS category,
  'Se true, usa embeddings OpenAI (não implementado ainda). Se false, usa Jaccard similarity.' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 3.2. Threshold de similaridade (0.70 = 70% de palavras iguais)
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'repetition_detector:similarity_threshold' AS config_key,
  '0.70'::jsonb AS config_value,
  'thresholds' AS category,
  'Threshold para considerar repetição (0.0 a 1.0). 0.70 = 70% de similaridade.' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 3.3. Quantas respostas verificar
INSERT INTO bot_configurations (client_id, config_key, config_value, category, description, is_default)
SELECT
  id AS client_id,
  'repetition_detector:check_last_n_responses' AS config_key,
  '3'::jsonb AS config_value,
  'thresholds' AS category,
  'Quantas mensagens do bot verificar para detectar repetição' AS description,
  true AS is_default
FROM clients
ON CONFLICT (client_id, config_key) DO NOTHING;

-- ============================================
-- Comentários finais
-- ============================================

COMMENT ON TABLE bot_configurations IS 'Configurações do chatbot multi-agente. Cada config_key pode ser editada via Flow Architecture Manager.';
```

**Aplicar migration**:

```bash
supabase db push
```

**Verificar**:

```sql
-- Deve mostrar ~10 linhas agora
SELECT config_key, config_value::text, category
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key LIKE ANY(ARRAY[
    'continuity:%',
    'intent_classifier:%',
    'repetition_detector:%'
  ])
ORDER BY config_key;
```

---

### Etapa 3: Configurar via Flow Architecture UI

Agora que as configurações existem no banco, você pode editá-las visualmente!

#### 3.1. Check Continuity

1. Acesse: `/dashboard/flow-architecture`
2. Clique no node **"Check Continuity"** (roxo)
3. Você verá:
   - ✅ Status: Habilitado/Desabilitado
   - 🔢 `new_conversation_threshold_hours`: 24 (padrão)
   - 💬 `greeting_for_new_customer`: Prompt de saudação
   - 💬 `greeting_for_returning_customer`: Prompt de continuação
4. **Personalize**:
   - Ajuste threshold (ex: 12 horas para clientes mais frequentes)
   - Edite prompts de saudação com personalidade do profissional
5. Clique **"Salvar Configurações"**
6. ✅ Próxima mensagem usará as novas configurações!

#### 3.2. Classify Intent

1. Clique no node **"Classify Intent"** (roxo)
2. Você verá:
   - ✅ `use_llm`: true (usa Groq) ou false (usa regex)
   - 💬 `prompt`: System prompt do classificador
   - 📋 `intents`: Lista JSON de intenções suportadas
3. **Personalize**:
   - Se `use_llm = false`: Mais rápido, mas menos preciso
   - Se `use_llm = true`: Mais preciso, consome tokens Groq
   - Edite lista de intenções (adicione novas como "suporte_tecnico", "cancelamento")
4. Salve
5. ✅ Bot classifica intenções conforme configuração

#### 3.3. Detect Repetition

1. Clique no node **"Detect Repetition"** (roxo)
2. Você verá:
   - ✅ `use_embeddings`: false (ainda não implementado)
   - 🔢 `similarity_threshold`: 0.70 (70%)
   - 🔢 `check_last_n_responses`: 3
3. **Personalize**:
   - **Threshold mais baixo** (ex: 0.50) → Detecta mais repetições
   - **Threshold mais alto** (ex: 0.85) → Só detecta repetições quase idênticas
   - **Mais mensagens** (ex: 5) → Verifica histórico maior
4. Salve
5. ✅ Bot evita repetições conforme threshold

---

## 🧪 Teste Prático

### Teste 1: Check Continuity

**Cenário**: Cliente novo vs cliente que retorna

1. Configure threshold para **1 hora**
2. Envie mensagem no WhatsApp como cliente novo
3. **Esperado**: Bot se apresenta ("Olá, sou o assistente...")
4. Espere **2 horas** sem enviar mensagens
5. Envie nova mensagem
6. **Esperado**: Bot se apresenta novamente (>1h = nova conversa)
7. Envie mensagem **imediatamente**
8. **Esperado**: Bot continua sem se apresentar (<1h = continuação)

### Teste 2: Classify Intent

**Cenário**: Classificação com LLM vs Regex

1. Configure `use_llm = true`
2. Envie: "Quanto custa um projeto de energia solar?"
3. Verifique logs: `[classifyIntent] Classified with LLM: orcamento`
4. Configure `use_llm = false`
5. Envie mesma mensagem
6. Verifique logs: `[classifyIntent] Classified with regex: orcamento`

### Teste 3: Detect Repetition

**Cenário**: Bot repete resposta idêntica

1. Configure threshold para **0.70**
2. Faça pergunta: "Como funciona energia solar?"
3. Anote a resposta do bot
4. **Apague o histórico** (ou use número diferente)
5. Faça **mesma pergunta**
6. **Esperado**: Se bot gerar resposta >70% similar, detecta repetição e regenera com variação
7. Verifique logs: `[detectRepetition] Repetition detected (XX% similar)`

---

## 📊 Monitoramento

### Logs para Acompanhar

No console do servidor (`npm run dev` ou Vercel logs):

```
[checkContinuity] 🔍 Checking conversation continuity for: 555123...
[checkContinuity] ⏱️  Threshold: 24 hours
[checkContinuity] 📊 Hours since last message: 48.32
[checkContinuity] 🆕 Is new conversation: true
[checkContinuity] 👋 Greeting instruction: Seja acolhedor...

[classifyIntent] 🎯 Classifying intent for message: Quanto custa...
[classifyIntent] 🤖 Using LLM: true
[classifyIntent] ✅ Classified with LLM: orcamento (125ms)

[detectRepetition] 🔍 Checking for repetition
[detectRepetition] 📊 Similarity threshold: 0.70
[detectRepetition] 📚 Found 3 recent AI responses
[detectRepetition] 📊 Max similarity: 75.3%
[detectRepetition] ⚠️  REPETITION DETECTED (347ms)
[chatbotFlow] ⚠️ Repetition detected (75.3% similar) - regenerating with variation
```

### Dashboard de Execuções

Acesse: `/dashboard/workflow`

Veja todos os nodes executados e seus resultados.

---

## 🎯 Configurações Recomendadas

### Para Atendimento Consultivo (Luis Fernando Boff)

```javascript
// Check Continuity
{
  "new_conversation_threshold_hours": 24,  // 1 dia sem falar = nova conversa
  "greeting_for_new_customer": "Seja cordial e se apresente como assistente virtual do Luis Fernando Boff, especialista em Energia Solar, Data Science e Desenvolvimento Full Stack. Seja breve e pergunte como pode ajudar.",
  "greeting_for_returning_customer": "Continue a conversa naturalmente. Não se apresente novamente. Retome o assunto anterior se relevante."
}

// Classify Intent
{
  "use_llm": true,  // Mais preciso para consultas técnicas
  "intents": [
    { "key": "energia_solar", "label": "Energia Solar", "description": "Dúvidas sobre painéis, instalação, economia" },
    { "key": "data_science", "label": "Data Science", "description": "Análise de dados, ML, IA" },
    { "key": "desenvolvimento", "label": "Desenvolvimento", "description": "Programação, websites, apps" },
    { "key": "orcamento", "label": "Orçamento", "description": "Solicitação de proposta ou cotação" },
    { "key": "agendamento", "label": "Agendamento", "description": "Marcar reunião ou consultoria" },
    { "key": "outro", "label": "Outro", "description": "Outras intenções" }
  ]
}

// Detect Repetition
{
  "use_embeddings": false,  // Ainda não implementado
  "similarity_threshold": 0.75,  // 75% de similaridade
  "check_last_n_responses": 5  // Verifica últimas 5 respostas
}
```

---

## 📝 Próximos Passos (Opcional - Melhorias Futuras)

### 1. Implementar Embeddings no Detect Repetition

Atualmente usa Jaccard similarity (palavras iguais). Para melhorar:

- Usar OpenAI Embeddings API
- Calcular similaridade semântica (não só palavras)
- Detectar paráfrases

### 2. Adicionar Actions Baseadas em Intent

Exemplo: Se intent = "agendamento" → Trigger ação específica (enviar link de calendário)

### 3. Dashboards de Analytics

- Quantas conversas novas vs continuações por dia
- Distribuição de intenções detectadas
- Taxa de repetição detectada

---

## ✅ Checklist Final

- [ ] Executar migration para popular configurações
- [ ] Verificar no Supabase que configs existem
- [ ] Acessar `/dashboard/flow-architecture`
- [ ] Clicar em "Check Continuity" e ver campos
- [ ] Clicar em "Classify Intent" e ver campos
- [ ] Clicar em "Detect Repetition" e ver campos
- [ ] Personalizar prompts e thresholds
- [ ] Testar com mensagens reais no WhatsApp
- [ ] Monitorar logs para verificar execução
- [ ] 🎉 Subagentes 100% configuráveis via UI!

---

**Status**: ⏳ Aguardando Etapa 2 (Executar migration)

**Após Etapa 2**: ✅ Tudo configurável via Flow Architecture Manager!
