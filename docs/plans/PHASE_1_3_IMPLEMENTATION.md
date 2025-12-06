# Phase 1-3 Implementation: Configuration-Driven Nodes

## Overview

This document describes the implementation of Phases 1-3 from the BOT_CONFIGURATION_INFRASTRUCTURE, which add intelligent behavior to the bot using the configuration system.

## What Was Implemented

### Phase 1: Continuity and States ✅

**New Node**: `checkContinuity.ts`

Automatically detects if a conversation is new or a continuation based on time since last interaction.

**Configurations Used**:
- `continuity:new_conversation_threshold_hours` - Hours to consider a new conversation (default: 24)
- `continuity:greeting_for_new_customer` - Instruction for greeting new customers
- `continuity:greeting_for_returning_customer` - Instruction for returning customers

**Integration**:
- Updated `getChatHistory.ts` to use `chat_history:max_messages` configuration
- Updated `generateAIResponse.ts` to inject continuity greeting instruction

**Usage Example**:
```typescript
import { checkContinuity } from '@/nodes'

const continuityInfo = await checkContinuity({
  phone: '+5551999999999',
  clientId: 'client-uuid'
})

console.log('Is new conversation:', continuityInfo.isNewConversation)
console.log('Greeting:', continuityInfo.greetingInstruction)

// Use greeting in AI response
const response = await generateAIResponse({
  message,
  chatHistory,
  ragContext,
  customerName,
  config,
  greetingInstruction: continuityInfo.greetingInstruction // NEW
})
```

---

### Phase 2: Intent Classification ✅

**New Node**: `classifyIntent.ts`

Classifies user message intent using either LLM or regex, configurable per client.

**Configurations Used**:
- `intent_classifier:use_llm` - Use LLM (true) or regex (false) for classification
- `intent_classifier:prompt` - LLM prompt configuration (system, temperature, max_tokens)
- `intent_classifier:intents` - List of supported intents

**Supported Intents** (configurable):
- `saudacao` - Greeting
- `duvida_tecnica` - Technical question
- `orcamento` - Budget request
- `agendamento` - Scheduling
- `reclamacao` - Complaint
- `agradecimento` - Thank you
- `despedida` - Goodbye
- `transferencia` - Human handoff request
- `outro` - Other (fallback)

**Usage Example**:
```typescript
import { classifyIntent } from '@/nodes'

const classification = await classifyIntent({
  message: 'Olá, gostaria de um orçamento',
  clientId: 'client-uuid',
  groqApiKey: config.apiKeys.groqApiKey
})

console.log('Intent:', classification.intent) // 'orcamento'
console.log('Confidence:', classification.confidence) // 'high'
console.log('Used LLM:', classification.usedLLM) // true
```

**Intent-Based Logic**:
```typescript
const intent = await classifyIntent({ message, clientId, groqApiKey })

switch (intent.intent) {
  case 'orcamento':
    // Send pricing information
    break
  case 'agendamento':
    // Offer scheduling options
    break
  case 'transferencia':
    // Transfer to human agent
    break
  default:
    // Continue with normal flow
}
```

---

### Phase 3: Repetition Detection ✅

**New Node**: `detectRepetition.ts`

Detects if the bot is about to send a repetitive response, avoiding boring conversations.

**Configurations Used**:
- `repetition_detector:use_embeddings` - Use embeddings (true) or word similarity (false)
- `repetition_detector:similarity_threshold` - Threshold for repetition (0-1, default: 0.70)
- `repetition_detector:check_last_n_responses` - How many responses to check (default: 3)

**How It Works**:
1. Fetches last N bot responses from chat history
2. Compares proposed response with each
3. Calculates similarity (Jaccard similarity for words, embeddings when enabled)
4. Returns if response is too similar (above threshold)

**Usage Example**:
```typescript
import { detectRepetition } from '@/nodes'

const aiResponse = await generateAIResponse({ ... })

// Check if response is repetitive
const repetitionCheck = await detectRepetition({
  phone: '+5551999999999',
  clientId: 'client-uuid',
  proposedResponse: aiResponse.content
})

if (repetitionCheck.isRepetition) {
  console.log('⚠️ Repetitive response detected!')
  console.log('Similarity:', (repetitionCheck.similarityScore * 100).toFixed(1) + '%')
  
  // Option 1: Regenerate with different temperature
  // Option 2: Add instruction to vary the response
  // Option 3: Use a template variation
}
```

**Anti-Repetition Strategy**:
```typescript
// Check repetition before sending
const repetitionCheck = await detectRepetition({
  phone,
  clientId,
  proposedResponse: aiResponse.content
})

if (repetitionCheck.isRepetition) {
  // Regenerate with instruction to vary
  const variedResponse = await generateAIResponse({
    ...originalInput,
    greetingInstruction: 'IMPORTANTE: Varie sua resposta. Não repita exatamente o que você já disse antes.'
  })
  
  // Use varied response
  aiResponse = variedResponse
}
```

---

## Integration Examples

### Complete Flow with All Phases

```typescript
import { 
  checkContinuity, 
  classifyIntent, 
  getChatHistory, 
  getRAGContext, 
  generateAIResponse,
  detectRepetition,
  formatResponse,
  sendWhatsAppMessage
} from '@/nodes'

async function processMessage(message: string, phone: string, config: ClientConfig) {
  // Phase 1: Check continuity
  const continuity = await checkContinuity({
    phone,
    clientId: config.id
  })
  
  console.log(`Conversation type: ${continuity.isNewConversation ? 'NEW' : 'CONTINUATION'}`)
  
  // Phase 2: Classify intent
  const intent = await classifyIntent({
    message,
    clientId: config.id,
    groqApiKey: config.apiKeys.groqApiKey
  })
  
  console.log(`User intent: ${intent.intent} (${intent.confidence})`)
  
  // Fetch context (uses config internally)
  const chatHistory = await getChatHistory({
    phone,
    clientId: config.id
    // maxHistory is fetched from config automatically
  })
  
  const ragContext = await getRAGContext({
    query: message,
    clientId: config.id,
    // topK and similarityThreshold can come from config
  })
  
  // Generate response with continuity context
  let aiResponse = await generateAIResponse({
    message,
    chatHistory,
    ragContext,
    customerName: 'Cliente',
    config,
    greetingInstruction: continuity.greetingInstruction
  })
  
  // Phase 3: Check for repetition
  const repetition = await detectRepetition({
    phone,
    clientId: config.id,
    proposedResponse: aiResponse.content
  })
  
  if (repetition.isRepetition) {
    console.log('⚠️ Repetition detected, regenerating...')
    
    // Regenerate with anti-repetition instruction
    aiResponse = await generateAIResponse({
      message,
      chatHistory,
      ragContext,
      customerName: 'Cliente',
      config,
      greetingInstruction: continuity.greetingInstruction + ' IMPORTANTE: Varie sua resposta, não repita.'
    })
  }
  
  // Format and send
  const formattedMessages = formatResponse(aiResponse.content)
  
  for (const msg of formattedMessages) {
    await sendWhatsAppMessage({
      to: phone,
      message: msg,
      config
    })
  }
}
```

---

## Configuration Examples

### Enable/Disable Features Per Client

**Client 1: Full LLM Mode**
```json
{
  "intent_classifier:use_llm": true,
  "repetition_detector:use_embeddings": true,
  "continuity:new_conversation_threshold_hours": 48
}
```

**Client 2: Lightweight Mode (Regex + Simple Similarity)**
```json
{
  "intent_classifier:use_llm": false,
  "repetition_detector:use_embeddings": false,
  "continuity:new_conversation_threshold_hours": 12
}
```

**Client 3: Strict Anti-Repetition**
```json
{
  "repetition_detector:similarity_threshold": 0.60,
  "repetition_detector:check_last_n_responses": 5
}
```

---

## Performance Considerations

### Caching

All configuration reads are cached for 5 minutes in memory, so there's minimal database overhead:

```typescript
// First call: ~50ms (database query)
const config1 = await getBotConfig(clientId, 'intent_classifier:use_llm')

// Subsequent calls (within 5 min): ~0ms (cache hit)
const config2 = await getBotConfig(clientId, 'intent_classifier:use_llm')
```

### Batch Fetching

When multiple configs are needed, use batch fetching:

```typescript
// ❌ BAD: 3 separate queries
const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
const prompt = await getBotConfig(clientId, 'intent_classifier:prompt')
const intents = await getBotConfig(clientId, 'intent_classifier:intents')

// ✅ GOOD: 1 batch query
const configs = await getBotConfigs(clientId, [
  'intent_classifier:use_llm',
  'intent_classifier:prompt',
  'intent_classifier:intents'
])
const useLLM = configs.get('intent_classifier:use_llm')
const prompt = configs.get('intent_classifier:prompt')
const intents = configs.get('intent_classifier:intents')
```

---

## Testing

### Test Continuity Detection

```bash
# Create test script
cat > test-continuity.ts << 'EOF'
import { checkContinuity } from '@/nodes'

async function test() {
  const result = await checkContinuity({
    phone: '+5551999999999',
    clientId: 'test-client-id'
  })
  
  console.log('Result:', result)
}

test()
EOF

# Run
npx tsx test-continuity.ts
```

### Test Intent Classification

```bash
const tests = [
  { message: 'Olá, tudo bem?', expected: 'saudacao' },
  { message: 'Quanto custa?', expected: 'orcamento' },
  { message: 'Quero falar com alguém', expected: 'transferencia' }
]

for (const test of tests) {
  const result = await classifyIntent({
    message: test.message,
    clientId: 'test-client',
    groqApiKey: 'key'
  })
  
  console.log(`${test.message} → ${result.intent} (expected: ${test.expected})`)
}
```

---

## Next Steps

### Phase 4: Personality from Database (Remaining)

The final phase will use the `personality:config` configuration to dynamically adjust:
- Bot name and role
- Response tone and style
- Emoji usage
- Formality level
- Response rules

This is already partially implemented in `generateAIResponse.ts` via the `systemPrompt` from config.

---

## Summary

✅ **Phase 1 Complete**: Continuity detection with configurable thresholds and greetings
✅ **Phase 2 Complete**: Intent classification with LLM/regex toggle and configurable intents
✅ **Phase 3 Complete**: Repetition detection with configurable thresholds and similarity methods

All three phases are fully integrated with the bot configuration system and can be customized per client via the dashboard UI at `/dashboard/settings`.
