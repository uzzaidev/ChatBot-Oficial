# 🎛️ Infraestrutura de Configuração Modular do Bot

## 📘 Visão Geral

Sistema que permite **ZERO hardcoding** de prompts, regras e parâmetros no código. Tudo é configurável pelo cliente via dashboard.

**Princípio**: Código genérico + Configurações no banco = Bot customizável sem deploy

---

## 🏗️ Arquitetura

```
┌────────────────────────────────────────────────┐
│  Dashboard UI (/dashboard/settings)           │
│  Cliente edita configs via interface visual   │
└───────────────────┬────────────────────────────┘
                    │ API: PUT /api/config
                    ▼
┌────────────────────────────────────────────────┐
│  Banco: bot_configurations                     │
│  - config_key: 'intent_classifier:prompt'      │
│  - config_value: {...} (JSONB)                 │
│  - is_default: true/false                      │
│  - Cache: 5 minutos                            │
└───────────────────┬────────────────────────────┘
                    │ getBotConfig(clientId, key)
                    ▼
┌────────────────────────────────────────────────┐
│  Nodes (TypeScript)                            │
│  Código genérico que lê configs em runtime     │
└────────────────────────────────────────────────┘
```

---

## 📦 Componentes

### 1. Migração SQL

**Arquivo**: `supabase/migrations/20251107_create_bot_configurations.sql`

Cria tabela `bot_configurations` com:
- `config_key` - Chave no formato `namespace:key`
- `config_value` - Valor em JSONB (flexível)
- `is_default` - `true` para padrões, `false` para customs
- RLS policies para isolamento multi-tenant
- Índices para performance

### 2. Seed SQL

**Arquivo**: `supabase/seeds/default_bot_configurations.sql`

Insere configurações padrão:
- **Prompts**: 6 prompts de agentes (intent, entity, sentiment, etc)
- **Rules**: 6 regras de comportamento
- **Thresholds**: 7 parâmetros numéricos
- **Personality**: 1 config complexa (JSON)

**Total**: 20+ configurações padrão

### 3. Helper Functions

**Arquivo**: `src/lib/config.ts`

```typescript
// Buscar UMA config
const prompt = await getBotConfig(clientId, 'intent_classifier:prompt')

// Buscar MÚLTIPLAS configs (mais eficiente)
const configs = await getBotConfigs(clientId, [
  'intent_classifier:prompt',
  'intent_classifier:use_llm'
])

// Salvar config
await setBotConfig(clientId, 'intent_classifier:use_llm', false)

// Resetar para padrão
await resetBotConfig(clientId, 'intent_classifier:prompt')

// Listar todas as configs de uma categoria
const prompts = await listBotConfigs(clientId, 'prompts')

// Limpar cache (forçar reload)
clearBotConfigCache()
```

### 4. API Endpoints

**Arquivo**: `src/app/api/config/route.ts`

```bash
# Listar todas as configs
GET /api/config

# Listar configs de uma categoria
GET /api/config?category=prompts

# Atualizar uma config
PUT /api/config
Body: {
  "config_key": "intent_classifier:use_llm",
  "config_value": true,
  "description": "Usar LLM para classificar",
  "category": "rules"
}

# Resetar para padrão
DELETE /api/config?key=intent_classifier:prompt
```

---

## 🚀 Como Usar

### Passo 1: Rodar Migração

```bash
# Aplicar migração no Supabase
supabase db push

# Verificar que tabela foi criada
psql "YOUR_CONNECTION_STRING" -c "SELECT * FROM bot_configurations LIMIT 1;"
```

### Passo 2: Rodar Seed

```bash
# Inserir configurações padrão
psql "YOUR_CONNECTION_STRING" -f supabase/seeds/default_bot_configurations.sql

# Verificar que configs foram inseridas
psql "YOUR_CONNECTION_STRING" -c "SELECT COUNT(*) FROM bot_configurations WHERE is_default = true;"
# Deve retornar: 20+
```

### Passo 3: Usar nos Nodes

**Exemplo**: Node de classificação de intenção

```typescript
// src/nodes/classifyIntent.ts
import { getBotConfig } from '@/lib/config'
import { createGroqClient } from '@/lib/groq'

export const classifyIntent = async (
  clientId: string,
  message: string
): Promise<string> => {
  // 1. Buscar configuração do banco
  const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')

  if (!useLLM) {
    // Fallback: usar regex
    return classifyWithRegex(message)
  }

  // 2. Buscar prompt do banco
  const promptConfig = await getBotConfig(clientId, 'intent_classifier:prompt')

  // 3. Chamar LLM com prompt configurado
  const groq = createGroqClient()
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: promptConfig.system },
      { role: 'user', content: message }
    ],
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.max_tokens
  })

  return response.choices[0].message.content.trim()
}
```

### Passo 4: Cliente Customiza via Dashboard

1. Cliente acessa `/dashboard/settings`
2. Aba "Prompts"
3. Edita `intent_classifier:prompt`
4. Salva → Mudança aplica em até 5min (cache)

---

## 📋 Todas as Configurações Disponíveis

### Categoria: Prompts

| Config Key | Tipo | Descrição |
|------------|------|-----------|
| `continuity:greeting_for_new_customer` | string | Instrução para saudar novos clientes |
| `continuity:greeting_for_returning_customer` | string | Instrução para clientes recorrentes |
| `intent_classifier:prompt` | object | Prompt do classificador de intenção |
| `entity_extractor:prompt` | object | Prompt do extrator de entidades |
| `sentiment_analyzer:prompt` | object | Prompt do analisador de sentimento |
| `personality:config` | object | Personalidade completa do bot |

### Categoria: Rules

| Config Key | Tipo | Descrição |
|------------|------|-----------|
| `intent_classifier:use_llm` | boolean | Usar LLM ou regex para classificar |
| `intent_classifier:intents` | array | Lista de intents suportados |
| `repetition_detector:use_embeddings` | boolean | Usar embeddings ou comparação simples |
| `rag:enabled` | boolean | Habilitar busca vetorial |
| `batching:enabled` | boolean | Habilitar agrupamento de mensagens |

### Categoria: Thresholds

| Config Key | Tipo | Descrição |
|------------|------|-----------|
| `continuity:new_conversation_threshold_hours` | number | Horas para considerar nova conversa |
| `repetition_detector:similarity_threshold` | number | Threshold de similaridade (0-1) |
| `repetition_detector:check_last_n_responses` | number | Quantas respostas comparar |
| `rag:top_k_documents` | number | Quantos docs retornar na busca |
| `rag:similarity_threshold` | number | Threshold mínimo para incluir doc |
| `batching:delay_seconds` | number | Segundos de espera para agrupar |
| `chat_history:max_messages` | number | Máximo de mensagens no contexto |

### Categoria: Personality

| Config Key | Tipo | Descrição |
|------------|------|-----------|
| `personality:config` | object | Config complexa (nome, role, expertise, tone, style, rules) |

---

## 🎨 Exemplos de Uso

### Exemplo 1: Cliente Quer Bot Mais Informal

```json
// PUT /api/config
{
  "config_key": "personality:config",
  "config_value": {
    "name": "Assistente da Academia FitLife",
    "role": "Personal Virtual",
    "expertise": ["Treinos", "Nutrição", "Vendas"],
    "tone": "descontraído e motivador",
    "style": {
      "emojis": true,  // ⬅️ Cliente habilitou emojis
      "formality": "baixo",
      "sentence_length": "curta",
      "response_strategy": "responder direto"
    },
    "response_rules": [
      "Sempre usar emojis 💪",
      "Ser motivador",
      "Focar em vendas"
    ]
  }
}
```

### Exemplo 2: Cliente Quer Detecção de Repetição Rigorosa

```json
// PUT /api/config
{
  "config_key": "repetition_detector:similarity_threshold",
  "config_value": 0.60,  // 60% (antes era 70%)
  "category": "thresholds"
}

// PUT /api/config
{
  "config_key": "repetition_detector:use_embeddings",
  "config_value": true,  // Usar OpenAI embeddings (mais preciso)
  "category": "rules"
}
```

### Exemplo 3: Cliente Quer Adicionar Novo Intent

```json
// GET /api/config?key=intent_classifier:intents
// Resposta atual (padrão)
{
  "config_value": [
    {"key": "saudacao", "label": "Saudação"},
    {"key": "duvida_tecnica", "label": "Dúvida"},
    // ...
  ]
}

// PUT /api/config
{
  "config_key": "intent_classifier:intents",
  "config_value": [
    {"key": "saudacao", "label": "Saudação"},
    {"key": "duvida_tecnica", "label": "Dúvida"},
    {"key": "cancelamento", "label": "Cancelamento"}, // ⬅️ NOVO
    {"key": "renovacao", "label": "Renovação"}  // ⬅️ NOVO
  ]
}
```

---

## 🔐 Segurança (RLS)

As políticas RLS garantem:
- ✅ Cliente só vê suas configs + defaults
- ✅ Cliente só edita suas próprias configs
- ❌ Cliente NÃO pode editar defaults (is_default=true)
- ❌ Cliente NÃO pode ver configs de outros clientes

```sql
-- Política: Ver apenas suas configs + defaults
CREATE POLICY "Clients can view their own configurations and defaults"
  ON bot_configurations FOR SELECT
  USING (
    client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid())
    OR is_default = true
  );
```

---

## ⚡ Performance

### Cache

- **Tipo**: In-memory Map
- **TTL**: 5 minutos
- **Invalidação**: Automática ao salvar/deletar config

```typescript
// Cache hit: 0ms (leitura da memória)
// Cache miss: ~50ms (query no Supabase)
```

### Otimizações

1. **Busca em lote**: Use `getBotConfigs([...])` para buscar múltiplas configs em 1 query
2. **Índices**: Queries por `client_id + config_key` são instantâneas
3. **JSONB**: Flexível e performático para configs complexas

---

## 🧪 Testes

### Testar API Endpoints

```bash
# 1. Listar todas as configs
curl http://localhost:3000/api/config

# 2. Filtrar por categoria
curl http://localhost:3000/api/config?category=prompts

# 3. Atualizar config
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "config_key": "intent_classifier:use_llm",
    "config_value": false
  }'

# 4. Resetar config
curl -X DELETE "http://localhost:3000/api/config?key=intent_classifier:use_llm"
```

### Testar Helper Functions

```typescript
// test-config.ts
import { getBotConfig, setBotConfig, resetBotConfig } from '@/lib/config'

const clientId = 'test-client-uuid'

// 1. Buscar config padrão
const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
console.log('Default:', useLLM) // true

// 2. Customizar
await setBotConfig(clientId, 'intent_classifier:use_llm', false)

// 3. Buscar novamente (deve retornar customização)
const useLLMCustom = await getBotConfig(clientId, 'intent_classifier:use_llm')
console.log('Custom:', useLLMCustom) // false

// 4. Resetar
await resetBotConfig(clientId, 'intent_classifier:use_llm')

// 5. Buscar novamente (deve retornar padrão)
const useLLMReset = await getBotConfig(clientId, 'intent_classifier:use_llm')
console.log('Reset:', useLLMReset) // true
```

---

## 🎯 Próximos Passos

1. ✅ Infraestrutura criada
2. ⏳ Criar dashboard UI (`/dashboard/settings`)
3. ⏳ Implementar Fase 1 (Estados e Continuidade)
4. ⏳ Implementar Fase 2 (Intent Classifier)
5. ⏳ Implementar Fase 3 (Repetition Detector)
6. ⏳ Implementar Fase 4 (Personality do Banco)

---

## 📚 Referências

- [Documento de Planejamento](../setup/ChatBot.md)
- [Migração SQL](../supabase/migrations/20251107_create_bot_configurations.sql)
- [Seed SQL](../supabase/seeds/default_bot_configurations.sql)
- [Helper Functions](../src/lib/config.ts)
- [API Endpoint](../src/app/api/config/route.ts)

---

**Última atualização**: 2025-11-07
**Versão**: 1.0.0
