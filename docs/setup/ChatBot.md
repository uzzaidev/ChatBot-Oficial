# 🤖 Framework Universal de Assistente Inteligente com RAG, Memória e Contexto

## 📘 Objetivo
Este documento define a arquitetura e comportamento de um **assistente inteligente de atendimento** capaz de operar em múltiplos contextos (ex: academia, imobiliária, engenharia, clínica, coworking, etc.).

A proposta é criar um **modelo modular**, com **camadas de entrada, memória, conhecimento e resposta**, que possa ser adaptado apenas trocando o **domínio** (dados, linguagem e identidade).

---

## 🎯 Status de Implementação no Projeto Atual

### ✅ O QUE JÁ TEMOS (Implementado)

**Camada de Conhecimento (RAG)**
- ✅ Node 10: `getRAGContext` - busca vetorial no Supabase com pgvector
- ✅ OpenAI embeddings para documentos
- ✅ Top 5 documentos mais relevantes
- ✅ Injeção automática no system prompt da IA

**Camada de Memória (Básica)**
- ✅ Node 9: `getChatHistory` - últimas 15 mensagens do PostgreSQL
- ✅ Armazenamento em `n8n_chat_histories` (sessionId = telefone)
- ✅ Formato: `{type: "user"|"ai", content: string}`

**Camada de Resposta**
- ✅ Node 11: `generateAIResponse` - Groq Llama 3.3 70B
- ✅ Personalidade consultiva definida (sem emojis, profissional)
- ✅ Node 12: `formatResponse` - divisão em múltiplas mensagens naturais
- ✅ Tools: `transferir_atendimento` (human handoff)

**Pipeline de Processamento**
- ✅ 13 nodes sequenciais no `chatbotFlow.ts`
- ✅ Batching via Redis (janela de 10s para agrupar mensagens)
- ✅ Media handling (áudio → Whisper, imagem → GPT-4o Vision)
- ✅ Execution logging completo

### ❌ O QUE AINDA NÃO TEMOS (Proposto neste documento)

**Camada de Entrada** (Interpretação e Contexto)
- ❌ Detecção de intenção (saudação, dúvida, orçamento, agendamento)
- ❌ Verificação de tempo desde última interação
- ❌ Lógica de nova conversa vs continuação
- ❌ Reconhecimento proativo de nome do cliente
- ❌ Classificador de intent (NLP)

**Camada de Memória** (Avançada)
- ❌ Estados conversacionais (`novo_cliente`, `em_atendimento`, `aguardando_resposta`, `encerrado`)
- ❌ Embeddings das mensagens para detecção de similaridade
- ❌ Detecção de repetição (comparar últimas 3 respostas do bot)
- ❌ Tracking de "última etapa do fluxo"

**Lógica de Continuidade**
- ❌ Análise temporal (< 24h = continuar, > 24h = nova conversa)
- ❌ Detecção de saudação nova em conversa existente
- ❌ Variação de resposta para evitar repetições

**Configuração Modular**
- ❌ Config YAML/JSON para personalidade do assistente
- ❌ Arquitetura plug-and-play para outros negócios

---

## 🧠 Estrutura Geral do Sistema

A arquitetura segue quatro camadas principais:

### 1️⃣ Camada de Entrada (Interpretação e Contexto)
Responsável por entender **quem é o usuário**, **o que ele quer** e **em que estágio da conversa está**.

**Funções principais:**
- Detectar **intenção da mensagem** (saudação, dúvida, orçamento, agendamento, etc.).
- Identificar se é **nova conversa ou continuação**.
- Verificar **tempo desde a última interação**.
- Ler **últimas mensagens (10–15)** para manter contexto.
- Reconhecer **nome, localidade e histórico** (se disponíveis via CRM/ATS/WhatsApp).

**Exemplo de Ações:**
- Se o nome estiver disponível → “Olá, [nome], posso te chamar assim?”
- Se for nova conversa → iniciar com saudação e apresentação da empresa.
- Se for continuação → retomar de onde parou, sem reiniciar o fluxo.

**Técnicas recomendadas:**
- NLP leve com embeddings (OpenAI, HuggingFace MiniLM, Cohere).
- Classificador de intenção (intent detection).
- Regras baseadas em tempo e estado da conversa.

---

### 2️⃣ Camada de Memória (Histórico e Estado)
Guarda informações contextuais e de progresso da conversa.

**Objetivos:**
- Manter a **identidade e intenção** do usuário.
- Lembrar **última etapa do fluxo**.
- Saber **se houve encaminhamento, orçamento ou agendamento**.
- Evitar **repetições** (comparar últimas 3 respostas).

**Implementação sugerida:**
- Banco vetorial (Pinecone, Weaviate, Qdrant, Convex.dev).
- Cada mensagem e resposta é armazenada com embedding.
- Consulta vetorial antes de gerar novas respostas.
- Definição de **estado**: `novo_cliente`, `em_atendimento`, `aguardando_resposta`, `encerrado`.

---

### 3️⃣ Camada de Conhecimento (RAG – Retrieval-Augmented Generation)
Responsável por fornecer **respostas assertivas e personalizadas**, baseadas em dados reais do negócio.

**Fontes de conhecimento possíveis:**
- **Base institucional:** missão, serviços, horários, localização, equipe.
- **Base operacional:** preços, planos, processos, políticas.
- **Base técnica:** manuais, FAQs, artigos, documentos internos.
- **Base conversacional:** histórico de atendimentos e exemplos de respostas.

**Fluxo RAG:**
1. O texto da mensagem é convertido em embedding.
2. A engine (LangChain, LlamaIndex, Semantic Kernel, etc.) busca documentos semelhantes.
3. O modelo (ex: GPT-4o, Claude, Mistral) recebe contexto + pergunta.
4. Gera resposta adaptada e coerente com o tom da empresa.

**Benefício:**  
Permite que o assistente responda de forma **contextual, precisa e alinhada à linguagem do negócio**, sem depender de um prompt fixo.

---

### 4️⃣ Camada de Resposta (Personalidade e Geração)
Define **como o assistente fala, reage e finaliza**.

**Componentes principais:**
- **Prompt de personalidade:** define tom, estilo e comportamento.
- **Gerador de resposta:** LLM (ex: GPT-4o-mini, GPT-5-turbo).
- **Controle de repetição e concisão:** evita blocos longos e redundâncias.
- **Mecanismo de decisão:** sabe quando transferir para humano.

**Boas práticas:**
- Respostas curtas e progressivas.
- Evitar listar opções antes de entender o contexto.
- Tom profissional e empático, sem emojis.
- Se o cliente pedir algo complexo → oferecer encaminhamento.

---

## ⚙️ Lógica de Continuidade da Conversa

**Regras:**
1. Analisar **últimas 15 mensagens**.
2. Se passou **< 24h** e a conversa estava em andamento → continuar.
3. Se passou **> 24h** ou o usuário enviou saudação nova → iniciar nova conversa.
4. Se o tema for semelhante, mas recente → manter contexto.
5. Se repetição detectada → variar saudação e reduzir texto.

**Estados possíveis:**
- `novo_cliente`
- `em_conversa`
- `aguardando_resposta`
- `agendado`
- `encerrado`

---

## 🧩 Integrações Recomendadas

| Função | Ferramenta sugerida | Descrição |
|--------|---------------------|------------|
| **Armazenamento de contexto** | Convex.dev / Supabase | Guarda sessões, histórico e embeddings |
| **Busca semântica (RAG)** | Pinecone / Weaviate / Qdrant | Recupera conhecimento contextual |
| **Pipeline RAG** | LangChain / LlamaIndex | Gera contexto dinâmico antes da resposta |
| **LLM** | GPT-4o-mini / GPT-5-turbo | Gera respostas com personalidade |
| **Canal** | WhatsApp API (Z-API, 360Dialog, Twilio) | Entrada e saída de mensagens |
| **Webhook/Backend** | Node.js / Next.js API Routes | Orquestra o fluxo e integra com banco |
| **Dashboard/Admin** | Notion / Retool / Supabase Studio | Visualiza históricos e métricas |

---

## 📡 Fluxo Simplificado (Mermaid)

```mermaid
flowchart LR
A[Mensagem do Usuário (WhatsApp)] --> B[Camada de Entrada: Análise de intenção e tempo]
B --> C{Conversa nova?}
C -->|Sim| D[Prompt de boas-vindas e apresentação]
C -->|Não| E[Consulta Memória + Estado anterior]
E --> F[RAG: busca na base de conhecimento]
F --> G[Gerador de resposta (LLM + personalidade)]
G --> H[Envio ao usuário + gravação no histórico]
H --> I{Encerramento ou Continuidade}
I -->|Continua| E
I -->|Encerrado| J[Salvar estado final]
```
🧱 Estrutura Modular de Prompt (Personalidade)

Cada área pode ter sua própria configuração de personalidade, sem alterar o núcleo da IA.
Exemplo de estrutura YAML:
```bash
personality:
  name: "Assistente da [Empresa/Profissional]"
  tone: "acolhedor, profissional e consultivo"
  objective: "entender primeiro, responder depois"
  response_style:
    - "curta e direta"
    - "sem emojis"
    - "sem repetir mensagens"
  handoff_policy: "transferir para humano quando solicitado ou quando houver dúvida técnica"
```

🧰 Regras Gerais de Interação

Nunca repetir mensagens idênticas.

Usar histórico e tempo para decidir se é nova conversa.

Manter respostas curtas e naturais.

Evitar listas de serviços antes de entender a necessidade.

Encaminhar ao humano com naturalidade.

Registrar todos os contextos e mensagens para aprendizado futuro.

🧩 Benefícios da Arquitetura

✅ Pode ser adaptado a qualquer negócio.

🧠 Entende o contexto e continua a conversa.

📚 Usa conhecimento real do negócio (via RAG).

🕒 Garante atendimento consistente e personalizado.

💬 Mantém tom humano e natural em todos os setores.

---

## 🚀 PLANO DE IMPLEMENTAÇÃO PARA O PROJETO ATUAL

Este plano detalha como implementar as melhorias propostas acima no nosso chatbot WhatsApp existente, mantendo a arquitetura de nodes e evitando breaking changes.

---

## 🎛️ PRINCÍPIO FUNDAMENTAL: TUDO É CONFIGURÁVEL

**Regra de ouro**: NENHUM prompt, regra ou parâmetro deve estar hardcoded no código. TUDO deve ser configurável pelo cliente através do dashboard.

### Arquitetura de Configuração

```
┌─────────────────────────────────────────────────────┐
│  Dashboard Admin (UI)                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ Configurações Avançadas                       │  │
│  │ - Prompts dos Agentes                         │  │
│  │ - Regras de Classificação                     │  │
│  │ - Personalidade do Bot                        │  │
│  │ - Parâmetros de Comportamento                 │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │ Salva via API
                   ▼
┌─────────────────────────────────────────────────────┐
│  Banco de Dados (Supabase)                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ Tabela: bot_configurations                    │  │
│  │ - client_id                                   │  │
│  │ - config_key (ex: 'intent_classifier_prompt') │  │
│  │ - config_value (JSONB)                        │  │
│  │ - is_default (boolean)                        │  │
│  │ - updated_at                                  │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │ Lê em runtime
                   ▼
┌─────────────────────────────────────────────────────┐
│  Nodes (Código TypeScript)                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ const config = await getClientConfig(         │  │
│  │   clientId,                                   │  │
│  │   'intent_classifier_prompt'                  │  │
│  │ )                                             │  │
│  │                                               │  │
│  │ // Se cliente não customizou, usa default     │  │
│  │ const prompt = config || DEFAULT_PROMPTS[key] │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Estrutura de Configuração no Banco

**Migração SQL**: `supabase/migrations/XXX_create_bot_configurations.sql`

```sql
CREATE TABLE IF NOT EXISTS bot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Chave de configuração (namespace:key)
  -- Ex: 'intent_classifier:prompt', 'personality:tone', 'continuity:threshold_hours'
  config_key TEXT NOT NULL,

  -- Valor da configuração (JSONB para flexibilidade)
  config_value JSONB NOT NULL,

  -- Se é configuração padrão (usada quando cliente não customiza)
  is_default BOOLEAN DEFAULT false,

  -- Metadados
  description TEXT,
  category TEXT, -- 'prompts', 'rules', 'thresholds', 'personality'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que não haja duplicatas por cliente + config_key
  UNIQUE(client_id, config_key)
);

-- Índices para performance
CREATE INDEX idx_bot_configs_client ON bot_configurations(client_id);
CREATE INDEX idx_bot_configs_key ON bot_configurations(config_key);
CREATE INDEX idx_bot_configs_category ON bot_configurations(category);

-- RLS (Row Level Security)
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own configurations"
  ON bot_configurations FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_default = true -- Todos podem ver defaults
  );

CREATE POLICY "Clients can update their own configurations"
  ON bot_configurations FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert their own configurations"
  ON bot_configurations FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bot_configurations_updated_at
  BEFORE UPDATE ON bot_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE bot_configurations IS
  'Configurações customizáveis do bot por cliente. TUDO é configurável aqui.';
COMMENT ON COLUMN bot_configurations.config_key IS
  'Chave no formato namespace:key (ex: intent_classifier:prompt)';
COMMENT ON COLUMN bot_configurations.config_value IS
  'Valor em JSONB (pode ser string, objeto, array, etc)';
COMMENT ON COLUMN bot_configurations.is_default IS
  'Se true, é configuração padrão usada quando cliente não customizou';
```

### Helper Function para Ler Configurações

**Arquivo**: `src/lib/config.ts`

```typescript
import { createServerClient } from '@/lib/supabase'

export interface BotConfig {
  config_key: string
  config_value: any
  description?: string
  category: string
}

// Cache em memória (renovado a cada 5 minutos)
const configCache = new Map<string, { value: any; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Busca configuração do cliente. Se não existir, retorna default.
 *
 * @param clientId - UUID do cliente
 * @param configKey - Chave no formato 'namespace:key'
 * @returns Valor da configuração ou null se não encontrado
 */
export const getClientConfig = async (
  clientId: string,
  configKey: string
): Promise<any> => {
  const cacheKey = `${clientId}:${configKey}`

  // Verificar cache
  const cached = configCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const supabase = createServerClient()

  // Buscar configuração do cliente OU default
  const { data, error } = await supabase
    .from('bot_configurations')
    .select('config_value')
    .or(`and(client_id.eq.${clientId},config_key.eq.${configKey}),and(is_default.eq.true,config_key.eq.${configKey})`)
    .order('is_default', { ascending: true }) // Cliente tem prioridade sobre default
    .limit(1)
    .single()

  if (error || !data) {
    console.warn(`Config não encontrada: ${configKey}`, error)
    return null
  }

  // Cachear resultado
  configCache.set(cacheKey, {
    value: data.config_value,
    expiresAt: Date.now() + CACHE_TTL
  })

  return data.config_value
}

/**
 * Busca múltiplas configurações de uma vez (mais eficiente)
 */
export const getClientConfigs = async (
  clientId: string,
  configKeys: string[]
): Promise<Map<string, any>> => {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bot_configurations')
    .select('config_key, config_value, is_default')
    .or(`client_id.eq.${clientId},is_default.eq.true`)
    .in('config_key', configKeys)

  if (error || !data) {
    console.error('Erro ao buscar configs:', error)
    return new Map()
  }

  // Priorizar configs do cliente sobre defaults
  const configMap = new Map<string, any>()

  // Primeiro adicionar defaults
  data.filter(c => c.is_default).forEach(c => {
    configMap.set(c.config_key, c.config_value)
  })

  // Depois sobrescrever com configs do cliente (se existir)
  data.filter(c => !c.is_default).forEach(c => {
    configMap.set(c.config_key, c.config_value)
  })

  return configMap
}

/**
 * Salva/atualiza configuração do cliente
 */
export const setClientConfig = async (
  clientId: string,
  configKey: string,
  configValue: any,
  metadata?: { description?: string; category?: string }
): Promise<void> => {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bot_configurations')
    .upsert({
      client_id: clientId,
      config_key: configKey,
      config_value: configValue,
      description: metadata?.description,
      category: metadata?.category,
      is_default: false,
      updated_at: new Date().toISOString()
    })

  if (error) {
    throw new Error(`Erro ao salvar config: ${error.message}`)
  }

  // Limpar cache
  configCache.delete(`${clientId}:${configKey}`)
}

/**
 * Reseta configuração para o padrão (deleta customização)
 */
export const resetClientConfig = async (
  clientId: string,
  configKey: string
): Promise<void> => {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bot_configurations')
    .delete()
    .eq('client_id', clientId)
    .eq('config_key', configKey)

  if (error) {
    throw new Error(`Erro ao resetar config: ${error.message}`)
  }

  // Limpar cache
  configCache.delete(`${clientId}:${configKey}`)
}
```

### Seed de Configurações Padrão

**Arquivo**: `supabase/seeds/default_bot_configurations.sql`

```sql
-- Inserir configurações padrão (is_default = true, client_id = null)

-- ========================================
-- CATEGORIA: Continuidade de Conversa
-- ========================================
INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'continuity:new_conversation_threshold_hours',
  '24',
  true,
  'Horas desde última interação para considerar nova conversa',
  'thresholds'
),
(
  'continuity:greeting_for_new_customer',
  '"Seja acolhedor e apresente o profissional brevemente"',
  true,
  'Instrução para saudar novos clientes',
  'prompts'
),
(
  'continuity:greeting_for_returning_customer',
  '"Continue de onde parou. NÃO se apresente novamente."',
  true,
  'Instrução para clientes recorrentes',
  'prompts'
);

-- ========================================
-- CATEGORIA: Intent Classifier
-- ========================================
INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'intent_classifier:use_llm',
  'true',
  true,
  'Se true, usa LLM para classificar. Se false, usa regex.',
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
  'Prompt do agente classificador de intenção',
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
  'Lista de intenções suportadas (customizável)',
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
  'Prompt do agente extrator de entidades',
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
  'Prompt do agente analisador de sentimento/urgência',
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
  'Configuração de personalidade do bot principal',
  'personality'
);

-- ========================================
-- CATEGORIA: Repetition Detector
-- ========================================
INSERT INTO bot_configurations (config_key, config_value, is_default, description, category)
VALUES
(
  'repetition_detector:use_embeddings',
  'false',
  true,
  'Se true, usa embeddings (mais preciso, +custo). Se false, usa comparação de palavras.',
  'rules'
),
(
  'repetition_detector:similarity_threshold',
  '0.70',
  true,
  'Threshold de similaridade para detectar repetição (0-1)',
  'thresholds'
),
(
  'repetition_detector:check_last_n_responses',
  '3',
  true,
  'Quantas respostas anteriores do bot comparar',
  'thresholds'
);
```

### API Endpoint para Configurações

**Arquivo**: `src/app/api/config/route.ts`

```typescript
export const dynamic = 'force-dynamic'

// GET /api/config?category=prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // TODO: Pegar client_id do usuário autenticado
    const clientId = 'xxx' // Placeholder

    const supabase = createServerClient()

    let query = supabase
      .from('bot_configurations')
      .select('*')
      .or(`client_id.eq.${clientId},is_default.eq.true`)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    // Agrupar por config_key, priorizando cliente sobre default
    const configs = new Map()

    data?.forEach(config => {
      const existing = configs.get(config.config_key)
      if (!existing || !config.is_default) {
        configs.set(config.config_key, config)
      }
    })

    return NextResponse.json({
      configs: Array.from(configs.values())
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch configs' },
      { status: 500 }
    )
  }
}

// PUT /api/config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { config_key, config_value, description, category } = body

    // TODO: Pegar client_id do usuário autenticado
    const clientId = 'xxx' // Placeholder

    await setClientConfig(clientId, config_key, config_value, {
      description,
      category
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}

// DELETE /api/config?key=intent_classifier:prompt
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configKey = searchParams.get('key')

    if (!configKey) {
      return NextResponse.json(
        { error: 'Missing config_key' },
        { status: 400 }
      )
    }

    // TODO: Pegar client_id do usuário autenticado
    const clientId = 'xxx' // Placeholder

    await resetClientConfig(clientId, configKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset config' },
      { status: 500 }
    )
  }
}
```

### Dashboard UI - Configurações

**Arquivo**: `src/app/dashboard/settings/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default function SettingsPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    const res = await fetch('/api/config')
    const data = await res.json()
    setConfigs(data.configs)
    setLoading(false)
  }

  const updateConfig = async (key: string, value: any) => {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config_key: key,
        config_value: value
      })
    })

    fetchConfigs() // Reload
  }

  const resetConfig = async (key: string) => {
    if (!confirm('Resetar para padrão?')) return

    await fetch(`/api/config?key=${key}`, { method: 'DELETE' })
    fetchConfigs()
  }

  if (loading) return <div>Carregando configurações...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configurações do Bot</h1>

      <Tabs defaultValue="prompts">
        <TabsList>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="personality">Personalidade</TabsTrigger>
          <TabsTrigger value="thresholds">Parâmetros</TabsTrigger>
        </TabsList>

        {/* TAB: Prompts */}
        <TabsContent value="prompts">
          {configs
            .filter(c => c.category === 'prompts')
            .map(config => (
              <ConfigEditor
                key={config.config_key}
                config={config}
                onSave={updateConfig}
                onReset={resetConfig}
              />
            ))}
        </TabsContent>

        {/* TAB: Rules */}
        <TabsContent value="rules">
          {configs
            .filter(c => c.category === 'rules')
            .map(config => (
              <ConfigEditor
                key={config.config_key}
                config={config}
                onSave={updateConfig}
                onReset={resetConfig}
              />
            ))}
        </TabsContent>

        {/* TAB: Personality */}
        <TabsContent value="personality">
          <PersonalityEditor
            config={configs.find(c => c.config_key === 'personality:config')}
            onSave={updateConfig}
          />
        </TabsContent>

        {/* TAB: Thresholds */}
        <TabsContent value="thresholds">
          {configs
            .filter(c => c.category === 'thresholds')
            .map(config => (
              <ThresholdEditor
                key={config.config_key}
                config={config}
                onSave={updateConfig}
                onReset={resetConfig}
              />
            ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente genérico para editar configs
const ConfigEditor = ({ config, onSave, onReset }) => {
  const [value, setValue] = useState(
    typeof config.config_value === 'string'
      ? config.config_value
      : JSON.stringify(config.config_value, null, 2)
  )

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{config.config_key}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSave(config.config_key, value)}>
            Salvar
          </Button>
          <Button variant="outline" onClick={() => onReset(config.config_key)}>
            Resetar para Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ... outros componentes (PersonalityEditor, ThresholdEditor)
```

---

## ✅ Benefícios desta Arquitetura

1. **Zero Hardcoding**: Prompts e regras 100% no banco
2. **Manutenção Simplificada**: Cliente edita via UI, não precisa tocar código
3. **A/B Testing Fácil**: Testar diferentes prompts sem deploy
4. **Multi-Tenant Ready**: Cada cliente tem suas configurações
5. **Versionamento**: Histórico de mudanças (updated_at)
6. **Rollback Fácil**: Botão "Resetar para Padrão"
7. **Performance**: Cache de 5min para configs frequentes

### 📋 Fase 1: Infraestrutura de Estados e Continuidade (1-2 semanas)

**Objetivo**: Implementar sistema de estados conversacionais e detecção de continuidade.

#### 1.1 - Migração de Banco de Dados

**Arquivo**: `supabase/migrations/XXX_add_conversation_state.sql`

```sql
-- Adicionar colunas de estado e timestamp à tabela clientes_whatsapp
ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS conversation_state TEXT DEFAULT 'novo_cliente',
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS conversation_started_at TIMESTAMPTZ DEFAULT NOW();

-- Índice para queries por estado e tempo
CREATE INDEX IF NOT EXISTS idx_clientes_state_time
ON clientes_whatsapp(telefone, conversation_state, last_interaction_at);

-- Comentários para documentação
COMMENT ON COLUMN clientes_whatsapp.conversation_state
IS 'Estados: novo_cliente, em_atendimento, aguardando_resposta, transferido, encerrado';

COMMENT ON COLUMN clientes_whatsapp.last_interaction_at
IS 'Timestamp da última mensagem recebida (usado para lógica de continuidade)';
```

**Estados possíveis**:
- `novo_cliente` - Primeira interação
- `em_atendimento` - Conversa ativa (< 24h)
- `aguardando_resposta` - Bot esperando resposta do cliente
- `transferido` - Transferido para humano (já existe como "human")
- `encerrado` - Conversa finalizada (> 24h sem interação)

#### 1.2 - Novo Node: `analyzeConversationContext`

**Arquivo**: `src/nodes/analyzeConversationContext.ts`

**Posição no pipeline**: Entre Node 3 (checkOrCreateCustomer) e Node 4 (downloadMedia)

**Responsabilidades**:
1. Verificar tempo desde última interação
2. Atualizar `last_interaction_at` no banco
3. Determinar se é nova conversa ou continuação
4. Retornar contexto de continuidade para a IA

**Interface**:
```typescript
export interface AnalyzeConversationContextInput {
  phone: string
  customerData: {
    nome: string | null
    status: string
    conversation_state: string
    last_interaction_at: string | null
  }
}

export interface ConversationContext {
  isNewConversation: boolean
  timeSinceLastMessage: number // em minutos
  conversationState: string
  shouldGreet: boolean
  customerName: string | null
}
```

**Lógica**:
```typescript
const timeDiff = Date.now() - new Date(last_interaction_at).getTime()
const hoursSinceLastMessage = timeDiff / (1000 * 60 * 60)

// Nova conversa se:
// 1. Nunca interagiu antes (last_interaction_at === null)
// 2. Passou mais de 24h
// 3. Estado estava como 'encerrado'
const isNewConversation =
  !last_interaction_at ||
  hoursSinceLastMessage > 24 ||
  conversation_state === 'encerrado'

// Atualizar estado baseado no tempo
let newState = conversation_state
if (isNewConversation) {
  newState = 'novo_cliente'
} else if (hoursSinceLastMessage < 1) {
  newState = 'em_atendimento'
} else {
  newState = 'aguardando_resposta'
}
```

**Update no banco**:
```typescript
await supabase
  .from('clientes_whatsapp')
  .update({
    last_interaction_at: new Date().toISOString(),
    conversation_state: newState
  })
  .eq('telefone', phone)
```

#### 1.3 - Modificar Node 11: `generateAIResponse`

**Mudança**: Injetar contexto de continuidade no system prompt

**Antes**:
```typescript
const systemPrompt = `Você é o assistente virtual de Luis Fernando Boff...`
```

**Depois**:
```typescript
const buildSystemPrompt = (conversationContext: ConversationContext, ragContext: string) => {
  let basePrompt = `Você é o assistente virtual de Luis Fernando Boff...`

  // Adicionar instruções de continuidade
  if (conversationContext.isNewConversation) {
    basePrompt += `\n\n## Contexto da Conversa
Esta é uma NOVA conversa. Apresente-se de forma acolhedora.`

    if (conversationContext.customerName) {
      basePrompt += `\nO nome do cliente é ${conversationContext.customerName}.`
    }
  } else {
    basePrompt += `\n\n## Contexto da Conversa
Esta é uma CONTINUAÇÃO de conversa existente.
Tempo desde última mensagem: ${Math.round(conversationContext.timeSinceLastMessage)} minutos.
${conversationContext.customerName ? `Nome do cliente: ${conversationContext.customerName}` : ''}

NÃO se apresente novamente. Continue de onde parou.`
  }

  return basePrompt + `\n\n## Base de Conhecimento\n${ragContext}`
}
```

**Atualização no chatbotFlow.ts**:
```typescript
// Após Node 3
const conversationContext = await analyzeConversationContext({
  phone: parsedMessage.from,
  customerData: customerCheck
})

// No Node 11
const aiResponse = await generateAIResponse({
  userMessages,
  chatHistory,
  ragContext,
  conversationContext // ⬅️ NOVO parâmetro
})
```

---

### 📋 Fase 2: Detecção de Intenção e Classificação (2-3 semanas)

**Objetivo**: Adicionar NLP leve para classificar intenções das mensagens.

#### 2.1 - Novo Node: `classifyIntent`

**Arquivo**: `src/nodes/classifyIntent.ts`

**Posição no pipeline**: Após Node 5 (normalizeMessage), antes de Node 6 (pushToRedis)

**IMPORTANTE**: Este node **NÃO tem prompts hardcoded**. Tudo vem da config do banco (`bot_configurations`).

**Implementação Configurável**:

```typescript
import { getClientConfig } from '@/lib/config'
import { createGroqClient } from '@/lib/groq'

export interface ClassifyIntentInput {
  clientId: string
  normalizedMessage: string
}

export const classifyIntent = async (
  input: ClassifyIntentInput
): Promise<string> => {
  const { clientId, normalizedMessage } = input

  // 1. Buscar configuração: usar LLM ou regex?
  const useLLM = await getClientConfig(clientId, 'intent_classifier:use_llm')

  if (useLLM === false) {
    // FALLBACK: Usar regex (se cliente desabilitou LLM)
    return classifyWithRegex(normalizedMessage)
  }

  // 2. Buscar prompt do classificador (do banco)
  const promptConfig = await getClientConfig(clientId, 'intent_classifier:prompt')

  if (!promptConfig) {
    throw new Error('Intent classifier prompt not configured')
  }

  // 3. Buscar lista de intents customizada do cliente
  const intentsConfig = await getClientConfig(clientId, 'intent_classifier:intents')

  // Montar lista de categorias dinamicamente
  const categories = intentsConfig
    ? intentsConfig.map((i: any) => i.key).join('\n- ')
    : 'saudacao\n- duvida_tecnica\n- orcamento\n- agendamento\n- reclamacao\n- agradecimento\n- despedida\n- transferencia\n- outro'

  // 4. Chamar LLM com prompt configurado
  const groq = createGroqClient()

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: promptConfig.system.replace('{categories}', categories)
      },
      {
        role: 'user',
        content: normalizedMessage
      }
    ],
    temperature: promptConfig.temperature || 0.1,
    max_tokens: promptConfig.max_tokens || 20
  })

  return response.choices[0].message.content.trim()
}

// Fallback simples com regex (se cliente desabilitar LLM)
const classifyWithRegex = (message: string): string => {
  const msg = message.toLowerCase()

  if (/\b(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e aí)\b/.test(msg)) {
    return 'saudacao'
  }
  if (/\b(falar com (atendente|humano|pessoa)|preciso de ajuda humana)\b/.test(msg)) {
    return 'transferencia'
  }
  if (/\b(quanto custa|preço|orçamento|cotação|valor)\b/.test(msg)) {
    return 'orcamento'
  }
  if (/\b(agendar|marcar (reunião|call|conversa)|disponibilidade)\b/.test(msg)) {
    return 'agendamento'
  }
  if (/\b(tchau|até logo|até mais|falou|obrigado e tchau)\b/.test(msg)) {
    return 'despedida'
  }
  if (/\b(obrigad[oa]|valeu|agradeço)\b/.test(msg)) {
    return 'agradecimento'
  }

  return 'outro'
}
```

**Como o cliente customiza**:

1. Acessa `/dashboard/settings`
2. Aba "Prompts" → Edita `intent_classifier:prompt`
3. Aba "Regras" → Liga/Desliga `intent_classifier:use_llm`
4. Aba "Regras" → Edita lista de intents em `intent_classifier:intents`
5. Salva → Mudança aplica instantaneamente (cache 5min)

**Intents padrão** (no seed SQL):
- `saudacao` - Cliente está cumprimentando
- `duvida_tecnica` - Perguntas sobre serviços
- `orcamento` - Pedido de cotação
- `agendamento` - Solicitar reunião
- `reclamacao` - Feedback negativo
- `agradecimento` - Cliente agradecendo
- `despedida` - Cliente se despedindo
- `transferencia` - Pedir atendimento humano
- `outro` - Não classificado

**Cliente pode**:
- Adicionar novos intents (ex: `cancelamento`, `suporte_tecnico`)
- Modificar descrições dos intents
- Mudar prompt do classificador
- Desabilitar LLM e usar apenas regex

#### 2.2 - Armazenar Intent no Histórico

**Modificar**: `src/nodes/saveChatMessage.ts`

```typescript
// Adicionar campo 'intent' ao JSON da mensagem
const messageJson = {
  type: 'human',
  content: normalizedMessage,
  intent: intent, // ⬅️ NOVO
  additional_kwargs: {
    original_type: messageType, // 'text', 'audio', 'image'
    timestamp: new Date().toISOString()
  }
}
```

**Benefício**: Permitir análises futuras e personalização de respostas baseadas em intent.

#### 2.3 - Usar Intent na Geração de Resposta

**Modificar**: `src/nodes/generateAIResponse.ts`

```typescript
// Adicionar ao system prompt
if (intent === 'saudacao' && conversationContext.isNewConversation) {
  systemPrompt += `\n\nO usuário está te cumprimentando pela primeira vez. Seja acolhedor.`
}

if (intent === 'transferencia') {
  systemPrompt += `\n\nO usuário solicitou transferência para humano. Use a tool 'transferir_atendimento' IMEDIATAMENTE.`
}

if (intent === 'orcamento') {
  systemPrompt += `\n\nO usuário está pedindo orçamento. Pergunte sobre detalhes do projeto antes de dar valores.`
}

if (intent === 'despedida') {
  systemPrompt += `\n\nO usuário está se despedindo. Seja breve e educado.`
}
```

---

### 📋 Fase 3: Prevenção de Repetição e Memória Avançada (1-2 semanas)

**Objetivo**: Evitar que o bot repita respostas idênticas ou similares.

#### 3.1 - Novo Node: `checkResponseRepetition`

**Arquivo**: `src/nodes/checkResponseRepetition.ts`

**Posição no pipeline**: Após Node 11 (generateAIResponse), antes de Node 12 (formatResponse)

**IMPORTANTE**: Parâmetros configuráveis pelo cliente via dashboard.

**Responsabilidades**:
1. Buscar últimas N respostas do bot (N = configurável)
2. Comparar similaridade com resposta atual
3. Se similaridade > threshold (configurável), adicionar instrução para variar
4. Usar embeddings ou comparação simples (configurável)

**Implementação Configurável**:
```typescript
import { createOpenAIClient } from '@/lib/openai'
import { getClientConfig } from '@/lib/config'
import { cosineSimilarity } from '@/lib/utils'

export interface CheckRepetitionInput {
  clientId: string
  currentResponse: string
  chatHistory: Array<{ type: string; content: string }>
}

export const checkResponseRepetition = async (
  input: CheckRepetitionInput
): Promise<{ isDuplicate: boolean; instruction: string | null }> => {
  const { clientId, currentResponse, chatHistory } = input

  // 1. Buscar configurações do cliente
  const useEmbeddings = await getClientConfig(
    clientId,
    'repetition_detector:use_embeddings'
  )
  const threshold = parseFloat(
    await getClientConfig(clientId, 'repetition_detector:similarity_threshold') || '0.70'
  )
  const checkLastN = parseInt(
    await getClientConfig(clientId, 'repetition_detector:check_last_n_responses') || '3'
  )

  // 2. Pegar últimas N respostas do bot (configurável)
  const lastBotResponses = chatHistory
    .filter(msg => msg.type === 'ai')
    .slice(-checkLastN)
    .map(msg => msg.content)

  if (lastBotResponses.length === 0) {
    return { isDuplicate: false, instruction: null }
  }

  // 3. Usar embeddings ou comparação simples (configurável)
  let maxSimilarity = 0

  if (useEmbeddings === true) {
    // MÉTODO 1: Embeddings (mais preciso, +custo)
    const openai = createOpenAIClient()
    const allTexts = [currentResponse, ...lastBotResponses]

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: allTexts
    })

    const currentEmbedding = embeddingResponse.data[0].embedding
    const pastEmbeddings = embeddingResponse.data.slice(1).map(e => e.embedding)

    const similarities = pastEmbeddings.map(pastEmb =>
      cosineSimilarity(currentEmbedding, pastEmb)
    )

    maxSimilarity = Math.max(...similarities)
  } else {
    // MÉTODO 2: Comparação de palavras (mais rápido, sem custo extra)
    maxSimilarity = checkWordSimilarity(currentResponse, lastBotResponses)
  }

  // 4. Verificar se ultrapassou threshold (configurável)
  if (maxSimilarity > threshold) {
    return {
      isDuplicate: true,
      instruction: `ATENÇÃO: Você está prestes a repetir uma resposta anterior (${Math.round(maxSimilarity * 100)}% similar). Por favor, REFORMULE completamente usando outras palavras, mas mantendo o mesmo significado.`
    }
  }

  return { isDuplicate: false, instruction: null }
}

// Helper: Comparação simples por palavras
const checkWordSimilarity = (
  currentResponse: string,
  pastResponses: string[]
): number => {
  const currentLower = currentResponse.toLowerCase()
  const currentWords = new Set(currentLower.split(/\s+/))

  let maxSimilarity = 0

  for (const pastResponse of pastResponses) {
    const pastLower = pastResponse.toLowerCase()

    // Igualdade exata = 100%
    if (pastLower === currentLower) {
      return 1.0
    }

    // Similaridade por palavras (Jaccard similarity)
    const pastWords = new Set(pastLower.split(/\s+/))
    const intersection = new Set([...currentWords].filter(w => pastWords.has(w)))
    const similarity = intersection.size / Math.max(currentWords.size, pastWords.size)

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
    }
  }

  return maxSimilarity
}
```

**Como o cliente customiza**:

1. `/dashboard/settings` → Aba "Parâmetros"
2. **`repetition_detector:use_embeddings`** (boolean)
   - `true` = Usa OpenAI embeddings (mais preciso, +$0.0001/msg)
   - `false` = Usa comparação de palavras (grátis, menos preciso)
3. **`repetition_detector:similarity_threshold`** (0-1)
   - `0.70` = Detecta se 70%+ das palavras são iguais
   - `0.90` = Só detecta se quase idêntico
4. **`repetition_detector:check_last_n_responses`** (número)
   - `3` = Compara com últimas 3 respostas do bot
   - `5` = Compara com últimas 5 respostas

**Exemplos de uso**:
- Cliente quer detecção rigorosa: `threshold=0.60, use_embeddings=true`
- Cliente quer economizar: `threshold=0.80, use_embeddings=false`
- Cliente tem conversas longas: `check_last_n_responses=10`

#### 3.2 - Integrar com Retry Logic

**Modificar**: `src/flows/chatbotFlow.ts`

```typescript
// Após Node 11
let aiResponse = await generateAIResponse(/* ... */)

// Check repetition
const repetitionCheck = await checkResponseRepetition({
  currentResponse: aiResponse,
  chatHistory
})

// Se duplicado, regenerar com instrução
if (repetitionCheck.isDuplicate) {
  logger.logNodeStart('11.1 Repetition Detected - Regenerating', { similarity: 'high' })

  aiResponse = await generateAIResponse({
    /* ... parâmetros originais ... */,
    additionalInstruction: repetitionCheck.instruction // ⬅️ NOVO
  })

  logger.logNodeSuccess('11.1 Repetition Detected - Regenerating', { regenerated: true })
}
```

**Modificar**: `src/nodes/generateAIResponse.ts`

```typescript
export interface GenerateAIResponseInput {
  // ... campos existentes ...
  additionalInstruction?: string // ⬅️ NOVO parâmetro opcional
}

export const generateAIResponse = async (input: GenerateAIResponseInput): Promise<string> => {
  const { /* ... */, additionalInstruction } = input

  let systemPrompt = buildBaseSystemPrompt(/* ... */)

  // Adicionar instrução de anti-repetição se necessário
  if (additionalInstruction) {
    systemPrompt += `\n\n⚠️ ${additionalInstruction}`
  }

  // ... resto da lógica ...
}
```

---

### 📋 Fase 4: Configuração Modular de Personalidade (1 semana)

**Objetivo**: ~~Externalizar personalidade do bot para arquivo de configuração~~ **TUDO vem do banco de dados**.

**IMPORTANTE**: Fase 4 agora é apenas implementar a **leitura da config `personality:config`** que já está no banco (seed SQL da seção anterior).

#### 4.1 - ~~Criar Arquivo de Config~~ JÁ ESTÁ NO BANCO

**Não há arquivo JSON!** A configuração de personalidade já está na tabela `bot_configurations`:

```sql
-- Seed SQL (já documentado acima)
INSERT INTO bot_configurations (config_key, config_value, is_default, ...)
VALUES ('personality:config', jsonb_build_object(...), true, ...)
```

O cliente edita via dashboard `/settings`, não arquivo.

#### 4.2 - Builder de System Prompt

**Arquivo**: `src/lib/personality.ts`

```typescript
import { getClientConfig } from '@/lib/config'

export interface PersonalityConfig {
  name: string
  role: string
  expertise: string[]
  tone: string
  style: {
    emojis: boolean
    formality: string
    sentence_length: string
    response_strategy: string
  }
  response_rules: string[]
}

/**
 * Constrói system prompt a partir da configuração do cliente no banco
 */
export const buildSystemPromptFromConfig = async (
  clientId: string,
  conversationContext: ConversationContext,
  ragContext: string
): Promise<string> => {
  // Buscar configuração de personalidade do banco
  const config: PersonalityConfig = await getClientConfig(
    clientId,
    'personality:config'
  )

  if (!config) {
    throw new Error('Personality config not found for client')
  }

  // Buscar instruções de saudação (também do banco)
  const greetingInstruction = conversationContext.isNewConversation
    ? await getClientConfig(clientId, 'continuity:greeting_for_new_customer')
    : await getClientConfig(clientId, 'continuity:greeting_for_returning_customer')

  // Construir prompt dinamicamente
  let prompt = `# Identidade
Você é ${config.name}, um ${config.role}.

## Áreas de Expertise
${config.expertise.map(exp => `- ${exp}`).join('\n')}

## Tom e Estilo
- Tom: ${config.tone}
- Formalidade: ${config.style.formality}
- Tamanho de frase: ${config.style.sentence_length}
- Estratégia de resposta: ${config.style.response_strategy}
${config.style.emojis ? '' : '- NÃO use emojis'}

## Regras de Resposta
${config.response_rules.map(rule => `- ${rule}`).join('\n')}
`

  // Adicionar contexto de conversa
  if (greetingInstruction) {
    prompt += `\n## Contexto da Conversa\n${greetingInstruction}\n`
  }

  // Adicionar base de conhecimento RAG
  prompt += `\n## Base de Conhecimento\n${ragContext}\n`

  return prompt
}
```

#### 4.3 - Modificar Node 11 para Usar Config do Banco

**Modificar**: `src/nodes/generateAIResponse.ts`

```typescript
import { buildSystemPromptFromConfig } from '@/lib/personality'
import { getClientConfig } from '@/lib/config'

export interface GenerateAIResponseInput {
  clientId: string // ⬅️ SEMPRE necessário
  userMessages: string
  chatHistory: Array<{ type: string; content: string }>
  ragContext: string
  conversationContext: ConversationContext
  additionalInstruction?: string
}

export const generateAIResponse = async (
  input: GenerateAIResponseInput
): Promise<string> => {
  const {
    clientId,
    userMessages,
    chatHistory,
    ragContext,
    conversationContext,
    additionalInstruction
  } = input

  // 1. Build system prompt a partir do banco (não arquivo!)
  let systemPrompt = await buildSystemPromptFromConfig(
    clientId,
    conversationContext,
    ragContext
  )

  // 2. Adicionar instrução de anti-repetição se houver
  if (additionalInstruction) {
    systemPrompt += `\n\n⚠️ ${additionalInstruction}`
  }

  // 3. Buscar configurações adicionais (também do banco)
  const personalityConfig = await getClientConfig(clientId, 'personality:config')

  // 4. Chamar LLM
  const groq = createGroqClient()

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessages }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'transferir_atendimento',
          description: 'Transferir conversa para atendimento humano',
          parameters: {
            type: 'object',
            properties: {
              motivo: {
                type: 'string',
                description: 'Motivo da transferência'
              }
            },
            required: ['motivo']
          }
        }
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  })

  return response.choices[0].message.content || ''
}
```

**Como o cliente customiza personalidade**:

1. Acessa `/dashboard/settings`
2. Aba "Personalidade"
3. Edita JSON da configuração `personality:config`:
   ```json
   {
     "name": "Assistente da Minha Empresa",
     "role": "Consultor de Vendas",
     "expertise": ["Produto X", "Produto Y"],
     "tone": "descontraído e amigável",
     "style": {
       "emojis": true,  ← Cliente pode habilitar emojis
       "formality": "baixo",
       "sentence_length": "muito curta",
       "response_strategy": "responder direto"
     },
     "response_rules": [
       "Sempre usar emojis 😊",
       "Ser breve e direto",
       "Focar em vendas"
     ]
   }
   ```
4. Salva → Mudança aplica em até 5min (cache)

**Benefícios**:
- ✅ Zero arquivos de configuração (tudo no banco)
- ✅ Cliente edita via UI visual
- ✅ Cada cliente tem personalidade única
- ✅ A/B testing fácil (duplicar cliente, mudar config)
- ✅ Rollback instantâneo (botão "Resetar para Padrão")

---

### 📋 Fase 5: Dashboard e Métricas de Continuidade (1 semana)

**Objetivo**: Visualizar estados conversacionais e métricas de engajamento.

#### 5.1 - Novo Endpoint: Métricas de Estado

**Arquivo**: `src/app/api/metrics/conversation-states/route.ts`

```typescript
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()

    // Contar conversas por estado
    const { data: stateCounts } = await supabase
      .from('clientes_whatsapp')
      .select('conversation_state')
      .then(result => {
        const counts = result.data?.reduce((acc, row) => {
          acc[row.conversation_state] = (acc[row.conversation_state] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        return { data: counts }
      })

    // Conversas ativas (< 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: activeCount } = await supabase
      .from('clientes_whatsapp')
      .select('*', { count: 'exact', head: true })
      .gte('last_interaction_at', oneDayAgo)

    // Média de tempo de resposta
    const { data: avgResponseTime } = await supabase
      .rpc('calculate_avg_response_time') // Criar função SQL

    return NextResponse.json({
      stateDistribution: stateCounts,
      activeConversations: activeCount,
      avgResponseTimeMinutes: avgResponseTime
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
```

#### 5.2 - Função SQL para Tempo Médio de Resposta

**Arquivo**: `supabase/migrations/XXX_add_response_time_function.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_avg_response_time()
RETURNS NUMERIC AS $$
DECLARE
  avg_time NUMERIC;
BEGIN
  SELECT AVG(
    EXTRACT(EPOCH FROM (
      LEAD(created_at) OVER (PARTITION BY session_id ORDER BY created_at) - created_at
    )) / 60
  )
  INTO avg_time
  FROM n8n_chat_histories
  WHERE message->>'type' = 'human'
  AND created_at >= NOW() - INTERVAL '7 days';

  RETURN COALESCE(avg_time, 0);
END;
$$ LANGUAGE plpgsql;
```

#### 5.3 - Componente de Dashboard

**Arquivo**: `src/components/ConversationStatesMetrics.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StateMetrics {
  stateDistribution: Record<string, number>
  activeConversations: number
  avgResponseTimeMinutes: number
}

export const ConversationStatesMetrics = () => {
  const [metrics, setMetrics] = useState<StateMetrics | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await fetch('/api/metrics/conversation-states')
      const data = await res.json()
      setMetrics(data)
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // 30s

    return () => clearInterval(interval)
  }, [])

  if (!metrics) return <div>Carregando métricas...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Conversas Ativas (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{metrics.activeConversations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {Math.round(metrics.avgResponseTimeMinutes)}min
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {Object.entries(metrics.stateDistribution).map(([state, count]) => (
              <li key={state} className="flex justify-between">
                <span className="capitalize">{state.replace('_', ' ')}</span>
                <span className="font-bold">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 📊 Resumo do Pipeline Após Implementação Completa

**Pipeline atualizado** (16 nodes):

1. ✅ Filter Status Updates (existente)
2. ✅ Parse Message (existente)
3. ✅ Check/Create Customer (existente)
4. 🆕 **Analyze Conversation Context** - Determina se é nova conversa ou continuação
5. ✅ Download Media (existente)
6. ✅ Normalize Message (existente - transcribe/analyze)
7. 🆕 **Classify Intent** - Detecta intenção da mensagem
8. ✅ Push to Redis (existente)
9. ✅ Save User Message (existente - modificado para salvar intent)
10. ✅ Batch Messages (existente)
11. ✅ Get Chat History (existente)
12. ✅ Get RAG Context (existente)
13. ✅ Generate AI Response (existente - modificado para usar conversation context e personality config)
14. 🆕 **Check Response Repetition** - Detecta e previne respostas duplicadas
15. ✅ Format Response (existente)
16. ✅ Send WhatsApp Message (existente)

**Novos arquivos criados**:
- `src/nodes/analyzeConversationContext.ts`
- `src/nodes/classifyIntent.ts`
- `src/nodes/checkResponseRepetition.ts`
- `src/lib/personality.ts`
- `config/personality.json`
- `src/app/api/metrics/conversation-states/route.ts`
- `src/components/ConversationStatesMetrics.tsx`
- `supabase/migrations/XXX_add_conversation_state.sql`
- `supabase/migrations/XXX_add_response_time_function.sql`

**Arquivos modificados**:
- `src/flows/chatbotFlow.ts` (adicionar 3 novos nodes)
- `src/nodes/generateAIResponse.ts` (usar personality config e conversation context)
- `src/nodes/saveChatMessage.ts` (salvar intent no JSON)
- `src/app/dashboard/page.tsx` (adicionar ConversationStatesMetrics)

---

### 🎯 Cronograma de Implementação

| Fase | Duração | Dependências | Risco |
|------|---------|--------------|-------|
| Fase 1: Estados e Continuidade | 1-2 semanas | Nenhuma | Baixo |
| Fase 2: Detecção de Intenção | 2-3 semanas | Fase 1 concluída | Médio |
| Fase 3: Prevenção de Repetição | 1-2 semanas | Fase 1 concluída | Médio |
| Fase 4: Config Modular | 1 semana | Nenhuma (pode ser paralelo) | Baixo |
| Fase 5: Dashboard de Métricas | 1 semana | Fase 1 concluída | Baixo |

**Total estimado**: 6-9 semanas (1.5 - 2.5 meses)

**Recomendação**: Implementar Fase 1 → Fase 4 → Fase 3 → Fase 2 → Fase 5

**Razão**:
- Fase 4 (config) é independente e traz valor imediato
- Fase 1 é base para todas as outras
- Fase 3 (repetição) é mais crítica que Fase 2 (intent)
- Fase 5 é última pois depende de dados acumulados

---

### ✅ Checklist de Validação

Após cada fase, validar:

**Fase 1**:
- [ ] Novos clientes recebem saudação completa
- [ ] Clientes recorrentes (< 24h) NÃO recebem apresentação novamente
- [ ] Clientes inativos (> 24h) recebem nova saudação
- [ ] Coluna `conversation_state` é atualizada corretamente
- [ ] Coluna `last_interaction_at` é atualizada a cada mensagem

**Fase 2**:
- [ ] Saudações são detectadas corretamente
- [ ] Pedidos de orçamento são classificados
- [ ] Solicitações de transferência são identificadas
- [ ] Intent é salvo no histórico de mensagens
- [ ] Intent influencia a resposta da IA

**Fase 3**:
- [ ] Bot NÃO repete respostas idênticas consecutivas
- [ ] Respostas muito similares são reformuladas
- [ ] Retry logic funciona (máximo 1 retry por mensagem)
- [ ] Performance não é impactada (< 500ms extra)

**Fase 4**:
- [ ] Personality.json é carregado corretamente
- [ ] Mudanças no config são refletidas nas respostas
- [ ] System prompt é gerado dinamicamente
- [ ] Tools são carregados do config

**Fase 5**:
- [ ] Dashboard mostra métricas de estado
- [ ] Conversas ativas (24h) são contadas corretamente
- [ ] Tempo médio de resposta é calculado
- [ ] Métricas atualizam a cada 30s

---

### 🔧 Considerações Técnicas

**Performance**:
- Fase 3 (embeddings): Adiciona ~200-300ms por mensagem
  - **Solução**: Usar implementação simples (sem embeddings) inicialmente
- Fase 2 (LLM classifier): Adiciona ~500ms-1s por mensagem
  - **Solução**: Usar regex rules inicialmente, migrar para LLM depois

**Custos**:
- Fase 3 com embeddings: +$0.0001 por mensagem (text-embedding-3-small)
- Fase 2 com LLM: +$0.001 por mensagem (Groq Llama 3.3 70B)
- **Total estimado**: +$0.0011 por mensagem (~$11 por 10.000 mensagens)

**Backward Compatibility**:
- Todas as mudanças são aditivas (novos nodes, novas colunas)
- Clientes existentes sem `conversation_state` serão tratados como `novo_cliente`
- Histórico antigo sem `intent` continua funcionando

**Testes**:
- Criar testes unitários para cada novo node
- Testar com dados reais em ambiente de staging
- Monitorar logs de execução por 1 semana antes de considerar estável

---

## 🎓 Próximos Passos Recomendados

1. **Criar branch de desenvolvimento**: `git checkout -b feature/conversational-intelligence`
2. **Implementar Fase 1**: Começar com migração do banco
3. **Validar em staging**: Testar com clientes reais (baixo volume)
4. **Coletar feedback**: Ajustar lógica de continuidade baseado em comportamento real
5. **Implementar Fase 4**: Config modular (alto ROI, baixo risco)
6. **Iterar**: Adicionar Fases 2, 3, 5 conforme necessidade

---

---

## 📝 RESUMO: Arquitetura 100% Configurável

### O que mudou?

**ANTES** (ruim):
```typescript
// Prompt hardcoded no código
const systemPrompt = `Você é o assistente de Luis Fernando Boff...`

// Cliente não pode mudar sem mexer no código
```

**DEPOIS** (profissional):
```typescript
// Prompt vem do banco de dados
const promptConfig = await getClientConfig(clientId, 'intent_classifier:prompt')

// Cliente edita via dashboard, zero código
```

### Estrutura da Nova Arquitetura

```
┌──────────────────────────────────────────────────┐
│  CAMADA 1: Dashboard UI                          │
│  - Cliente edita configurações via interface     │
│  - 4 abas: Prompts, Regras, Personalidade, Params│
│  - Botão "Resetar para Padrão" em cada config    │
└────────────────┬─────────────────────────────────┘
                 │ API: /api/config
                 ▼
┌──────────────────────────────────────────────────┐
│  CAMADA 2: Banco de Dados (bot_configurations)  │
│  - config_key (ex: 'intent_classifier:prompt')   │
│  - config_value (JSONB - flexível)               │
│  - is_default (true para seed, false para custom)│
│  - Cache de 5min para performance                │
└────────────────┬─────────────────────────────────┘
                 │ getClientConfig(clientId, key)
                 ▼
┌──────────────────────────────────────────────────┐
│  CAMADA 3: Nodes (Código TypeScript)            │
│  - Código GENÉRICO (não tem prompts hardcoded)   │
│  - Lê configurações em runtime                   │
│  - Funciona para qualquer cliente               │
└──────────────────────────────────────────────────┘
```

### Todas as Configurações Disponíveis

**CATEGORIA: Prompts** (textos dos agentes)
- `intent_classifier:prompt` - Prompt do classificador de intenção
- `entity_extractor:prompt` - Prompt do extrator de entidades
- `sentiment_analyzer:prompt` - Prompt do analisador de sentimento
- `continuity:greeting_for_new_customer` - Saudação para novos clientes
- `continuity:greeting_for_returning_customer` - Saudação para retornos
- `personality:config` - Personalidade completa do bot (JSON complexo)

**CATEGORIA: Regras** (comportamentos)
- `intent_classifier:use_llm` - Usar LLM ou regex para intent
- `intent_classifier:intents` - Lista de intents suportados (customizável)
- `repetition_detector:use_embeddings` - Usar embeddings ou comparação simples

**CATEGORIA: Parâmetros** (números/thresholds)
- `continuity:new_conversation_threshold_hours` - Horas para considerar nova conversa
- `repetition_detector:similarity_threshold` - Threshold de similaridade (0-1)
- `repetition_detector:check_last_n_responses` - Quantas respostas comparar

### Exemplo: Cliente Customizando Intent Classifier

1. **Cliente acessa**: `/dashboard/settings`
2. **Aba**: "Prompts"
3. **Edita**: `intent_classifier:prompt`

```json
{
  "system": "Classifique a intenção em:
- compra
- cancelamento
- suporte
- reclamacao

Responda APENAS a categoria.",
  "temperature": 0.1,
  "max_tokens": 10
}
```

4. **Clica**: "Salvar"
5. **Resultado**: Bot agora classifica em 4 intents customizados (não mais os 9 padrões)

### Vantagens ENORMES

1. **Zero Deploy para Mudar Prompts**
   - Antes: Editar código → Git commit → Deploy → 10min
   - Agora: Editar UI → Salvar → 0 segundos (cache 5min)

2. **A/B Testing Trivial**
   - Duplicar cliente
   - Mudar config de um deles
   - Comparar métricas

3. **Multi-Tenant Pronto**
   - Cliente A: Bot formal, sem emojis
   - Cliente B: Bot descontraído, com emojis
   - Mesmo código, configs diferentes

4. **Manutenção pelo Cliente**
   - Cliente ajusta próprio bot
   - Não precisa abrir ticket de suporte
   - Maior autonomia

5. **Rollback Instantâneo**
   - Botão "Resetar para Padrão"
   - Sem git revert, sem deploy

### Impacto nas Fases de Implementação

**Todas as fases agora incluem**:
- ✅ Schema SQL para armazenar configs
- ✅ Seed SQL com valores padrão
- ✅ Código que lê do banco (não hardcoded)
- ✅ UI de edição no dashboard
- ✅ API endpoints (GET/PUT/DELETE)

**Antes**: 5 fases = 6-9 semanas
**Agora**: 5 fases + infra de config = **8-11 semanas** (40% mais tempo, mas 100x mais valor)

---

**Última atualização**: 2025-11-07
**Versão do documento**: 3.0 (arquitetura 100% configurável via dashboard)