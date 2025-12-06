# Chatbot Flow Integration - Phases 1-3

## Overview

This document describes how Phases 1-3 (Continuity, Intent Classification, and Repetition Detection) have been **integrated into the main chatbot workflow** (`src/flows/chatbotFlow.ts`).

## ✅ Integration Status

All three phases are **NOW INTEGRATED** into the production chatbot flow and will run automatically for every message processed.

## Integration Points in Chatbot Flow

### Flow Sequence

```
1. Filter Status Updates
2. Parse Message
3. Check/Create Customer
4. Process Media (audio/image/document)
5. Normalize Message
6. Push to Redis
7. Save User Message
8. Batch Messages (if enabled)
9. Get Chat History
10. Get RAG Context (if enabled)

🆕 9.5. Check Continuity (Phase 1)      ← NEW
🆕 9.6. Classify Intent (Phase 2)        ← NEW

11. Generate AI Response (with greeting) ← ENHANCED
   
🆕 11.5. Detect Repetition (Phase 3)    ← NEW
🆕 11.6. Regenerate if needed           ← NEW

12. Format Response
13. Send WhatsApp Message
```

### Phase 1: Continuity Detection (Node 9.5)

**Location**: After getting chat history, before generating AI response

**What it does**:
- Checks time since last message
- Determines if new or continuing conversation
- Selects appropriate greeting instruction from config

**Configuration used**:
- `continuity:new_conversation_threshold_hours` (default: 24)
- `continuity:greeting_for_new_customer`
- `continuity:greeting_for_returning_customer`

**Code**:
```typescript
const continuityInfo = await checkContinuity({
  phone: parsedMessage.phone,
  clientId: config.id,
})

console.log(`Continuity: ${continuityInfo.isNewConversation ? 'NEW' : 'CONTINUING'} conversation`)
```

**Output logged**:
- Whether conversation is new or continuation
- Hours since last message
- Selected greeting instruction

### Phase 2: Intent Classification (Node 9.6)

**Location**: After continuity check, before generating AI response

**What it does**:
- Classifies user message intent
- Uses LLM (Groq) or regex based on config
- Detects: greeting, budget request, scheduling, complaint, etc.

**Configuration used**:
- `intent_classifier:use_llm` (default: true)
- `intent_classifier:prompt` (LLM configuration)
- `intent_classifier:intents` (supported intents list)

**Code**:
```typescript
const intentInfo = await classifyIntent({
  message: batchedContent,
  clientId: config.id,
  groqApiKey: config.apiKeys.groqApiKey,
})

console.log(`Intent: ${intentInfo.intent} (${intentInfo.confidence}, LLM: ${intentInfo.usedLLM})`)
```

**Output logged**:
- Detected intent (e.g., 'saudacao', 'orcamento', 'agendamento')
- Confidence level (high/medium/low)
- Whether LLM or regex was used

**Supported Intents** (configurable per client):
- `saudacao` - Greeting
- `duvida_tecnica` - Technical question
- `orcamento` - Budget request
- `agendamento` - Scheduling
- `reclamacao` - Complaint
- `agradecimento` - Thank you
- `despedida` - Goodbye
- `transferencia` - Human handoff request
- `outro` - Other

### Phase 1 Integration: Greeting Injection (Node 11)

**Location**: During AI response generation

**What it does**:
- Injects continuity greeting instruction into system prompt
- AI knows if it should introduce itself or continue conversation

**Code**:
```typescript
const aiResponse = await generateAIResponse({
  message: batchedContent,
  chatHistory: chatHistory2,
  ragContext,
  customerName: parsedMessage.name,
  config,
  greetingInstruction: continuityInfo.greetingInstruction, // 🔧 NEW
})
```

**Effect**:
- **New customer**: Bot introduces itself properly
- **Returning customer**: Bot continues naturally without re-introduction

### Phase 3: Repetition Detection (Node 11.5 & 11.6)

**Location**: After generating AI response, before sending

**What it does**:
- Compares proposed response with last N bot responses
- If too similar (above threshold), regenerates with variation
- Prevents boring, repetitive conversations

**Configuration used**:
- `repetition_detector:similarity_threshold` (default: 0.70 = 70%)
- `repetition_detector:check_last_n_responses` (default: 3)
- `repetition_detector:use_embeddings` (default: false, future feature)

**Code**:
```typescript
const repetitionCheck = await detectRepetition({
  phone: parsedMessage.phone,
  clientId: config.id,
  proposedResponse: aiResponse.content,
})

if (repetitionCheck.isRepetition) {
  console.log(`Repetition detected (${(repetitionCheck.similarityScore! * 100).toFixed(1)}% similar)`)
  
  // Regenerate with anti-repetition instruction
  const variationInstruction = continuityInfo.greetingInstruction + 
    '\n\nIMPORTANTE: Varie sua resposta. Não repita exatamente o que você já disse.'
  
  const variedResponse = await generateAIResponse({
    // ... same params
    greetingInstruction: variationInstruction,
  })
  
  aiResponse.content = variedResponse.content // Use varied response
}
```

**Output logged**:
- Whether repetition was detected
- Similarity score (0-1)
- Whether response was regenerated

## Configuration Management

All configurations are managed via:
- **Database**: `bot_configurations` table
- **Dashboard**: `/dashboard/settings` → "Bot Configurations" tab
- **Seed**: `supabase/seeds/default_bot_configurations.sql` (defaults)

### Customization Per Client

Clients can customize any configuration via the dashboard:

**Example: Strict anti-repetition**
```json
{
  "repetition_detector:similarity_threshold": 0.60,
  "repetition_detector:check_last_n_responses": 5
}
```

**Example: Lightweight mode (no LLM for intent)**
```json
{
  "intent_classifier:use_llm": false
}
```

**Example: Short conversation memory**
```json
{
  "continuity:new_conversation_threshold_hours": 12,
  "chat_history:max_messages": 10
}
```

## Performance Impact

### Additional Processing Time

Per message, the new nodes add approximately:

- **Continuity Check**: ~50ms (1 database query, cached config)
- **Intent Classification**: 
  - LLM mode: ~500-1000ms (Groq API call)
  - Regex mode: ~5ms (pattern matching)
- **Repetition Detection**: ~100ms (database query + similarity calculation)
- **Regeneration (if needed)**: ~500-1000ms (only when repetition detected)

**Total overhead**: ~150ms to ~2.1s depending on configuration

### Optimization Strategies

1. **Configuration caching**: All configs cached 5 minutes in memory
2. **Batch database queries**: Multiple configs fetched in single query
3. **Conditional execution**: Intent LLM only if enabled, regeneration only if needed
4. **Parallel execution**: Continuity and intent run in sequence but independently

## Execution Logs

All nodes are logged in the execution logger with timing and results:

```
[chatbotFlow] Starting message processing
[chatbotFlow] NODE 1: Filter Status Updates... ✅
[chatbotFlow] NODE 2: Parse Message... ✅
[chatbotFlow] NODE 3: Check/Create Customer... ✅
[chatbotFlow] NODE 9: Get Chat History... ✅
🆕 [chatbotFlow] 🔧 Phase 1: Checking conversation continuity
🆕 [chatbotFlow] Continuity: NEW conversation
🆕 [chatbotFlow] 🔧 Phase 2: Classifying user intent
🆕 [chatbotFlow] Intent detected: saudacao (high confidence, LLM: true)
[chatbotFlow] NODE 11: Generate AI Response... ✅
🆕 [chatbotFlow] 🔧 Phase 3: Checking for response repetition
🆕 [chatbotFlow] ✅ No repetition detected
[chatbotFlow] NODE 13: Send WhatsApp Message... ✅
```

## Testing the Integration

### Manual Testing

1. **Test Continuity**:
   - Send a message to a new customer → Should introduce bot
   - Wait 1 hour, send another message → Should continue naturally
   - Wait 25+ hours, send message → Should introduce again (new conversation)

2. **Test Intent Classification**:
   - Send "Olá" → Should detect `saudacao`
   - Send "Quanto custa?" → Should detect `orcamento`
   - Send "Quero falar com alguém" → Should detect `transferencia`

3. **Test Repetition Detection**:
   - Ask same question 3 times in a row
   - Bot should vary its responses instead of repeating exactly

### Checking Logs

```bash
# Watch execution logs in real-time
tail -f /var/log/chatbot.log | grep -E "Phase|Continuity|Intent|Repetition"

# Check Supabase logs
# Go to Supabase Dashboard → Logs → Filter by "chatbotFlow"
```

### Configuration Testing

```bash
# Test with different configs via dashboard
# 1. Go to /dashboard/settings
# 2. Navigate to "Bot Configurations"
# 3. Change values:
#    - Set intent_classifier:use_llm to false (test regex mode)
#    - Set repetition_detector:similarity_threshold to 0.50 (stricter)
#    - Set continuity:new_conversation_threshold_hours to 1 (faster reset)
# 4. Send test messages
# 5. Check logs for changes
```

## Troubleshooting

### Continuity not working

**Symptom**: Bot always introduces itself or never introduces itself

**Check**:
1. Verify `continuity:new_conversation_threshold_hours` in database
2. Check if chat history is being saved correctly
3. Look for logs: `[chatbotFlow] Continuity: NEW/CONTINUING`

**Fix**: Adjust threshold in dashboard settings

### Intent always returns "outro"

**Symptom**: Intent classification not detecting specific intents

**Check**:
1. Verify `intent_classifier:use_llm` is true (if you want LLM)
2. Check Groq API key is valid
3. Look for logs: `[chatbotFlow] Intent detected: ...`

**Fix**: 
- If using LLM: Check API key and quota
- If using regex: Add more patterns to `classifyIntent.ts`

### Repetition detection too sensitive/not sensitive enough

**Symptom**: Bot regenerates too often or never regenerates

**Check**:
1. Verify `repetition_detector:similarity_threshold` value (0-1)
2. Check `repetition_detector:check_last_n_responses`
3. Look for logs: `Repetition detected (XX% similar)`

**Fix**: Adjust threshold in dashboard:
- Too sensitive: Increase threshold (0.80 = stricter)
- Not sensitive enough: Decrease threshold (0.60 = more strict)

## Next Steps

### Phase 4: Personality from Database (Optional)

Could further enhance by using `personality:config` to:
- Dynamically adjust bot name and role
- Control emoji usage
- Adjust formality level
- Customize response rules

This is partially implemented (systemPrompt already comes from config).

### Future Enhancements

1. **Entity Extraction**: Extract names, dates, locations from messages
2. **Sentiment Analysis**: Detect frustrated/happy customers
3. **Intent-Based Routing**: Different flows for different intents
4. **A/B Testing**: Test different greetings and measure engagement

## Summary

✅ **All 3 phases are now integrated into the main chatbot workflow**
✅ **Running in production for every message**
✅ **Fully configurable per client via dashboard**
✅ **Comprehensive logging for debugging**
✅ **Performance optimized with caching**

The chatbot is now significantly more intelligent and adaptive!
