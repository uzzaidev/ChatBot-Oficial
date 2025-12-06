# 🔧 Plano: Corrigir Configuração de Nodes no Flow Architecture

## 🎯 Problema Identificado

**Sintoma**: Outros nodes (check_continuity, classify_intent, detect_repetition, etc.) mostram apenas "Config Key: chat_history:max_messages" mas **não mostram campos editáveis**.

**Causa Raiz**: Estrutura de dados inconsistente entre:
1. Como os dados estão salvos no banco (`bot_configurations.config_value`)
2. Como a API retorna os dados
3. Como o frontend espera receber os dados

---

## 🔍 Diagnóstico

### Passo 1: Verificar Estrutura no Banco

Execute no Supabase SQL Editor:

```sql
-- Ver como os dados estão estruturados
SELECT
  config_key,
  config_value,
  jsonb_typeof(config_value) as value_type,
  pg_typeof(config_value) as pg_type
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND config_key IN (
    'chat_history:max_messages',
    'continuity:new_conversation_threshold_hours',
    'intent_classifier:use_llm',
    'repetition_detector:similarity_threshold'
  )
ORDER BY config_key;
```

**Resultado Esperado**:
```
config_key                                 | config_value | value_type | pg_type
-------------------------------------------|--------------|------------|--------
chat_history:max_messages                  | 15           | number     | jsonb
continuity:new_conversation_threshold_hours| 24           | number     | jsonb
intent_classifier:use_llm                  | true         | boolean    | jsonb
```

**Problema**: Valores são **primitivos** (number, boolean), não objetos!

---

## 🛠️ Solução: 3 Abordagens

### Abordagem 1: Normalizar Dados no Banco (Recomendado)

Transformar valores primitivos em objetos com chave padrão.

**Exemplo**:
```sql
-- ANTES
config_value: 24

-- DEPOIS
config_value: { "value": 24 }
```

**Migration**:

```sql
-- Migration: Normalizar config_value primitivos para objetos
UPDATE bot_configurations
SET config_value = jsonb_build_object('value', config_value)
WHERE jsonb_typeof(config_value) != 'object';
```

**Problema**: Quebra nodes que esperam valores primitivos (checkContinuity, etc.)

---

### Abordagem 2: Melhorar Backend API (Escolhida)

Fazer API detectar valores primitivos e transformá-los em estrutura esperada pelo frontend.

**Vantagens**:
- ✅ Não precisa migrar dados
- ✅ Compatível com código existente
- ✅ Frontend recebe estrutura consistente

**Implementação**: Ver código abaixo.

---

### Abordagem 3: Melhorar Frontend (Complementar)

Fazer frontend detectar quando config está vazio e buscar dados de forma mais robusta.

---

## 💻 Implementação - Abordagem 2

### Parte 1: Melhorar Backend API

**Arquivo**: `src/app/api/flow/nodes/[nodeId]/route.ts`

**Modificar função GET** (linhas 96-140):

```typescript
} else {
  // For other nodes, fetch from bot_configurations

  // 1. Fetch primary config key
  if (configKey) {
    const { data: configData } = await supabase
      .from('bot_configurations')
      .select('config_value')
      .eq('client_id', clientId)
      .eq('config_key', configKey)
      .single()

    if (configData && configData.config_value !== null) {
      // Handle primitive values (number, boolean, string)
      if (typeof configData.config_value === 'object' && !Array.isArray(configData.config_value)) {
        // Already an object - merge
        config = { ...config, ...configData.config_value }
      } else {
        // Primitive value - extract field name from config_key
        // e.g., 'chat_history:max_messages' -> 'max_messages'
        const keyParts = configKey.split(':')
        const fieldName = keyParts[keyParts.length - 1]
        config[fieldName] = configData.config_value
      }
    }
  }

  // 2. Fetch ALL related configs
  const relatedConfigKeys = getRelatedConfigKeys(nodeId)
  if (relatedConfigKeys.length > 0) {
    const { data: relatedConfigs } = await supabase
      .from('bot_configurations')
      .select('config_key, config_value')
      .eq('client_id', clientId)
      .in('config_key', relatedConfigKeys)

    if (relatedConfigs && relatedConfigs.length > 0) {
      relatedConfigs.forEach((item) => {
        if (item.config_value !== null) {
          if (typeof item.config_value === 'object' && !Array.isArray(item.config_value)) {
            // Object - merge all keys
            config = { ...config, ...item.config_value }
          } else {
            // Primitive - extract field name
            const keyParts = item.config_key.split(':')
            const fieldName = keyParts[keyParts.length - 1]
            config[fieldName] = item.config_value
          }
        }
      })
    }
  }
}
```

**Explicação**:
- Se `config_value` é objeto → merge direto
- Se `config_value` é primitivo → extrai nome do campo e atribui
  - `'chat_history:max_messages'` → `config.max_messages = 15`
  - `'continuity:new_conversation_threshold_hours'` → `config.new_conversation_threshold_hours = 24`

---

### Parte 2: Melhorar Função `getRelatedConfigKeys`

**Problema**: Algumas configs estão faltando.

**Solução**: Adicionar TODAS as configs relacionadas.

```typescript
function getRelatedConfigKeys(nodeId: string): string[] {
  const relatedKeysMap: Record<string, string[]> = {
    generate_response: [
      'personality:config',
      'personality:system_prompt',
      'personality:formatter_prompt',
      'model:primary_model_provider',
      'model:groq_model',
      'model:openai_model',
      'model:temperature',
      'model:max_tokens',
    ],
    classify_intent: [
      'intent_classifier:use_llm',
      'intent_classifier:prompt',
      'intent_classifier:intents',
      'intent_classifier:temperature',
    ],
    detect_repetition: [
      'repetition_detector:similarity_threshold',
      'repetition_detector:use_embeddings',
      'repetition_detector:check_last_n_responses',
    ],
    check_continuity: [
      'continuity:new_conversation_threshold_hours',
      'continuity:greeting_for_new_customer',
      'continuity:greeting_for_returning_customer',
    ],
    get_chat_history: [
      'chat_history:max_messages',
    ],
    get_rag_context: [
      'rag:enabled',
      'rag:similarity_threshold',
      'rag:max_results',
    ],
    process_media: [
      'media_processing:enabled',
      'media_processing:config',
    ],
    batch_messages: [
      'batching:delay_seconds',
    ],
  }

  return relatedKeysMap[nodeId] || []
}
```

---

### Parte 3: Melhorar Frontend Rendering

**Arquivo**: `src/components/FlowArchitectureManager.tsx`

**Criar função helper para ordenar campos por node**:

```typescript
const getFieldOrder = (nodeId: string, keys: string[]): string[] => {
  const orderMap: Record<string, string[]> = {
    generate_response: [
      'primary_model_provider',
      'model',
      'temperature',
      'max_tokens',
      'system_prompt',
      'formatter_prompt',
    ],
    check_continuity: [
      'new_conversation_threshold_hours',
      'greeting_for_new_customer',
      'greeting_for_returning_customer',
    ],
    classify_intent: [
      'use_llm',
      'temperature',
      'prompt',
      'intents',
    ],
    detect_repetition: [
      'similarity_threshold',
      'check_last_n_responses',
      'use_embeddings',
    ],
    get_chat_history: [
      'max_messages',
    ],
    batch_messages: [
      'delay_seconds',
    ],
  }

  const order = orderMap[nodeId]
  if (!order) return keys

  // Filter order to only include existing keys, then add remaining
  const existing = order.filter(k => keys.includes(k))
  const remaining = keys.filter(k => !order.includes(k))
  return [...existing, ...remaining]
}
```

**Adicionar labels amigáveis**:

```typescript
const getFieldLabel = (key: string, nodeId: string): string => {
  const labelMap: Record<string, string> = {
    // Check Continuity
    'new_conversation_threshold_hours': 'Threshold (Horas)',
    'greeting_for_new_customer': 'Saudação - Novo Cliente',
    'greeting_for_returning_customer': 'Saudação - Cliente Retornando',

    // Classify Intent
    'use_llm': 'Usar LLM (Groq)',
    'intents': 'Intenções Suportadas',

    // Detect Repetition
    'similarity_threshold': 'Threshold de Similaridade',
    'check_last_n_responses': 'Verificar Últimas N Respostas',
    'use_embeddings': 'Usar Embeddings',

    // Chat History
    'max_messages': 'Máximo de Mensagens',

    // Batch Messages
    'delay_seconds': 'Delay (Segundos)',
  }

  return labelMap[key] || key.replace(/_/g, ' ')
}
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Modificar `GET /api/flow/nodes/[nodeId]` para detectar valores primitivos
- [ ] Atualizar `getRelatedConfigKeys()` com todas as configs
- [ ] Testar API retornando dados corretos

### Frontend
- [ ] Criar `getFieldOrder()` para ordenar campos por node
- [ ] Criar `getFieldLabel()` para labels amigáveis
- [ ] Aplicar ordenação customizada para cada node
- [ ] Testar renderização de campos

### Testes
- [ ] Abrir `/dashboard/flow-architecture`
- [ ] Clicar em **Check Continuity** → Deve mostrar 3 campos editáveis
- [ ] Clicar em **Classify Intent** → Deve mostrar 4 campos editáveis
- [ ] Clicar em **Detect Repetition** → Deve mostrar 3 campos editáveis
- [ ] Clicar em **Get Chat History** → Deve mostrar 1 campo editável
- [ ] Editar valores e salvar → Deve persistir no banco

---

## 📊 Exemplo de Como Deve Ficar

### Check Continuity (após correção)

**Modal deve mostrar**:
```
✅ Status do Node: [Toggle] Ativo

Configurações

Config Key: continuity:new_conversation_threshold_hours

1. Threshold (Horas)
   [Input: 24]
   0.0 = mínimo, 1.0 = máximo

2. Saudação - Novo Cliente
   [Textarea: "Seja acolhedor e apresente..."]

3. Saudação - Cliente Retornando
   [Textarea: "Continue de onde parou..."]

[Salvar Configurações]
```

---

## 🚀 Começar Implementação?

Quer que eu:
1. **Modifique o backend primeiro** (API route)?
2. **Depois melhore o frontend** (FlowArchitectureManager)?
3. **Teste em seguida**?

Aguardo sua confirmação para começar! 🎯
