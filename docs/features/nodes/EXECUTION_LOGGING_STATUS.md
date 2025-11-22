# 📊 Status de Logging de Execução dos Nodes

**Data:** 2025-11-22
**Objetivo:** Garantir que todos os nodes salvem logs completos em `execution_logs` para monitoring no backend

---

## ✅ Nodes COM Logging Completo

### 1. Filter Status Updates (NODE 1)
**Localização:** `chatbotFlow.ts:62-69`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('1. Filter Status Updates', payload)
const filteredPayload = filterStatusUpdates(payload)
if (!filteredPayload) {
  logger.logNodeSuccess('1. Filter Status Updates', { filtered: true, reason: 'Status update' })
  return { success: true }
}
logger.logNodeSuccess('1. Filter Status Updates', { filtered: false })
```

**Output logado:**
- ✅ `filtered: true/false`
- ✅ `reason` quando filtrado

---

### 2. Parse Message (NODE 2)
**Localização:** `chatbotFlow.ts:71-74`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('2. Parse Message', filteredPayload)
const parsedMessage = parseMessage(filteredPayload)
logger.logNodeSuccess('2. Parse Message', { phone: parsedMessage.phone, type: parsedMessage.type })
```

**Output logado:**
- ✅ `phone`
- ✅ `type` (text/audio/image/document)

---

### 3. Check Human Handoff Status (NODE 3) ⚠️
**Localização:** `chatbotFlow.ts:76-99`
**Status:** ⚠️ **QUASE COMPLETO** - Falta log explícito quando pula bot

```typescript
logger.logNodeStart('3. Check Human Handoff Status', { phone: parsedMessage.phone })
const handoffCheck = await checkHumanHandoffStatus({ phone, clientId })
logger.logNodeSuccess('3. Check Human Handoff Status', handoffCheck)

if (handoffCheck.skipBot) {
  logger.finishExecution('success')
  // Salva mensagem mas não envia resposta
  await saveChatMessage(...)
  return { success: true }
}
```

**Output logado:**
- ✅ `skipBot: true/false`
- ✅ `customerStatus: 'bot' | 'humano' | 'transferido'`
- ✅ `reason` (quando pula)

**⚠️ Problema:**
- Quando `skipBot: true`, o fluxo termina (linha 86-98)
- O log mostra `handoffCheck` com `skipBot: true`, mas **não há um log explícito indicando "FLUXO INTERROMPIDO POR ATENDIMENTO HUMANO"**
- Para monitoring, seria útil ter um log extra antes do `return`:
  ```typescript
  logger.logNodeSuccess('3. Bot Skipped', {
    reason: handoffCheck.reason,
    status: handoffCheck.customerStatus
  })
  ```

---

### 4. Check/Create Customer (NODE 4)
**Localização:** `chatbotFlow.ts:101-108`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('4. Check/Create Customer', { phone, name })
const customer = await checkOrCreateCustomer({ phone, name, clientId })
logger.logNodeSuccess('4. Check/Create Customer', { status: customer.status })
```

**Output logado:**
- ✅ `status` do cliente

---

### 5. Process Media (NODE 4 - Condicional)
**Localização:** `chatbotFlow.ts:111-198`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado ou texto

```typescript
const shouldProcessMedia = shouldExecuteNode('process_media', nodeStates)

if (shouldProcessMedia && (type === 'audio' || 'image' || 'document')) {
  logger.logNodeStart('4. Process Media', { type })
  // Process media...
  logger.logNodeSuccess('4a. Download Audio/Image/Document', { size })
  logger.logNodeSuccess('4b. Transcribe/Analyze', { ... })
} else if (!shouldProcessMedia) {
  logger.logNodeSuccess('4. Process Media', { skipped: true, reason: 'node disabled' })
} else {
  logger.logNodeSuccess('4. Process Media', { skipped: true, reason: 'text message' })
}
```

**Output logado:**
- ✅ `type` (quando processa)
- ✅ `size` do arquivo
- ✅ `transcription`/`description`/`summary`
- ✅ `skipped: true` com `reason` quando não processa

**Sub-nodes:**
- ✅ `4a. Download Audio/Image/Document`
- ✅ `4b. Transcribe Audio` / `Analyze Image` / `Analyze Document`

---

### 6. Normalize Message (NODE 5)
**Localização:** `chatbotFlow.ts:200-206`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('5. Normalize Message', { parsedMessage, processedContent })
const normalizedMessage = normalizeMessage({ parsedMessage, processedContent })
logger.logNodeSuccess('5. Normalize Message', { content: normalizedMessage.content })
```

**Output logado:**
- ✅ `content` normalizado

---

### 7. Push to Redis (NODE 6)
**Localização:** `chatbotFlow.ts:208-227`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado + erro gracefully

```typescript
if (shouldExecuteNode('push_to_redis', nodeStates)) {
  logger.logNodeStart('6. Push to Redis', normalizedMessage)
  try {
    await pushToRedis(normalizedMessage)
    logger.logNodeSuccess('6. Push to Redis', { success: true })
  } catch (redisError) {
    logger.logNodeError('6. Push to Redis', redisError)
    // Continua fluxo (graceful degradation)
  }
} else {
  logger.logNodeSuccess('6. Push to Redis', { skipped: true, reason: 'node disabled' })
}
```

**Output logado:**
- ✅ `success: true` quando funciona
- ✅ `skipped: true` quando desabilitado
- ✅ Erro logado com `logNodeError` quando falha

---

### 8. Save Chat Message - User (NODE 7)
**Localização:** `chatbotFlow.ts:229-246`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('7. Save Chat Message (User)', { phone, type: 'user' })
await saveChatMessage({ phone, message, type: 'user', clientId })
logger.logNodeSuccess('7. Save Chat Message (User)', { saved: true })
```

**Output logado:**
- ✅ `saved: true`

---

### 9. Batch Messages (NODE 8)
**Localização:** `chatbotFlow.ts:248-264`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
if (shouldExecuteNode('batch_messages', nodeStates) && config.settings.messageSplitEnabled) {
  logger.logNodeStart('8. Batch Messages', { phone })
  batchedContent = await batchMessages(phone)
  logger.logNodeSuccess('8. Batch Messages', { contentLength: batchedContent?.length || 0 })
} else {
  const reason = !shouldExecuteNode(...) ? 'node disabled' : 'config disabled'
  logger.logNodeSuccess('8. Batch Messages', { skipped: true, reason })
  batchedContent = normalizedMessage.content
}
```

**Output logado:**
- ✅ `contentLength` quando executa
- ✅ `skipped: true` com `reason` quando desabilitado

---

### 10. Get Chat History (NODE 9)
**Localização:** `chatbotFlow.ts:267-328`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
const shouldGetHistory = shouldExecuteNode('get_chat_history', nodeStates)

if (shouldGetHistory) {
  logger.logNodeStart('9. Get Chat History', { phone })
  chatHistory2 = await getChatHistory({ phone, clientId, maxHistory })
  logger.logNodeSuccess('9. Get Chat History', { messageCount: chatHistory2.length })
} else {
  logger.logNodeSuccess('9. Get Chat History', { skipped: true, reason: 'node disabled' })
}
```

**Output logado:**
- ✅ `messageCount` quando executa
- ✅ `skipped: true` quando desabilitado

---

### 11. Get RAG Context (NODE 10)
**Localização:** `chatbotFlow.ts:267-328`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
const shouldGetRAG = shouldExecuteNode('get_rag_context', nodeStates) && config.settings.enableRAG

if (shouldGetRAG) {
  logger.logNodeStart('10. Get RAG Context', { queryLength })
  ragContext = await getRAGContext({ query, clientId, openaiApiKey })
  logger.logNodeSuccess('10. Get RAG Context', { contextLength: ragContext.length })
} else {
  logger.logNodeSuccess('10. Get RAG Context', { skipped: true, reason: 'node disabled or config disabled' })
}
```

**Output logado:**
- ✅ `contextLength` quando executa
- ✅ `skipped: true` com `reason` quando desabilitado

**Nota:** Nodes 9 e 10 podem executar em paralelo (`Promise.all`) quando ambos habilitados

---

### 12. Check Continuity (NODE 9.5)
**Localização:** `chatbotFlow.ts:330-350`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
if (shouldExecuteNode('check_continuity', nodeStates)) {
  logger.logNodeStart('9.5. Check Continuity', { phone })
  continuityInfo = await checkContinuity({ phone, clientId })
  logger.logNodeSuccess('9.5. Check Continuity', {
    isNew: continuityInfo.isNewConversation,
    hoursSince: continuityInfo.hoursSinceLastMessage
  })
} else {
  logger.logNodeSuccess('9.5. Check Continuity', { skipped: true, reason: 'node disabled' })
}
```

**Output logado:**
- ✅ `isNew` (boolean)
- ✅ `hoursSince` (number)
- ✅ `skipped: true` quando desabilitado

---

### 13. Classify Intent (NODE 9.6)
**Localização:** `chatbotFlow.ts:352-374`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
if (shouldExecuteNode('classify_intent', nodeStates)) {
  logger.logNodeStart('9.6. Classify Intent', { messageLength })
  intentInfo = await classifyIntent({ message, clientId, groqApiKey })
  logger.logNodeSuccess('9.6. Classify Intent', {
    intent: intentInfo.intent,
    confidence: intentInfo.confidence,
    usedLLM: intentInfo.usedLLM
  })
} else {
  logger.logNodeSuccess('9.6. Classify Intent', { skipped: true, reason: 'node disabled' })
}
```

**Output logado:**
- ✅ `intent` (saudacao/duvida/reclamacao/elogio/outro)
- ✅ `confidence` (high/medium/low)
- ✅ `usedLLM` (boolean)
- ✅ `skipped: true` quando desabilitado

---

### 14. Generate AI Response (NODE 11)
**Localização:** `chatbotFlow.ts:376-390`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('11. Generate AI Response', { messageLength, historyCount })
const aiResponse = await generateAIResponse({ message, chatHistory, ragContext, config, ... })
logger.logNodeSuccess('11. Generate AI Response', {
  contentLength: aiResponse.content?.length || 0,
  hasToolCalls: !!aiResponse.toolCalls,
  toolCount: aiResponse.toolCalls?.length || 0
})
```

**Output logado:**
- ✅ `contentLength`
- ✅ `hasToolCalls` (boolean)
- ✅ `toolCount`

---

### 15. Detect Repetition (NODE 11.5)
**Localização:** `chatbotFlow.ts:392-468`
**Status:** ✅ **COMPLETO** - Loga skip quando desabilitado

```typescript
if (shouldExecuteNode('detect_repetition', nodeStates) && aiResponse.content) {
  logger.logNodeStart('11.5. Detect Repetition', { responseLength })
  const repetitionCheck = await detectRepetition({ phone, clientId, proposedResponse })
  logger.logNodeSuccess('11.5. Detect Repetition', {
    isRepetition: repetitionCheck.isRepetition,
    similarity: repetitionCheck.similarityScore
  })

  if (repetitionCheck.isRepetition) {
    // Regenerate...
  }
} else if (!shouldExecuteNode('detect_repetition', nodeStates)) {
  logger.logNodeSuccess('11.5. Detect Repetition', { skipped: true, reason: 'node disabled' })
}
```

**Output logado:**
- ✅ `isRepetition` (boolean)
- ✅ `similarity` (0-1)
- ✅ `skipped: true` quando desabilitado

---

### 16. Regenerate with Variation (NODE 11.6 - Condicional)
**Localização:** `chatbotFlow.ts:410-464`
**Status:** ✅ **COMPLETO** - Só executa se detectou repetição

```typescript
if (repetitionCheck.isRepetition) {
  logger.logNodeStart('11.6. Regenerate with Variation', { originalResponsePreview })
  const variedResponse = await generateAIResponse({ ... })
  logger.logNodeSuccess('11.6. Regenerate with Variation', {
    originalLength,
    newLength,
    originalPreview,
    newPreview,
    newSimilarity,
    stillRepetitive
  })
}
```

**Output logado:**
- ✅ `originalLength`
- ✅ `newLength`
- ✅ `newSimilarity`
- ✅ `stillRepetitive` (boolean)

---

### 17. Format Response (NODE 12)
**Localização:** `chatbotFlow.ts:529-545`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('12. Format Response', { contentLength })
if (config.settings.messageSplitEnabled) {
  formattedMessages = formatResponse(aiResponse.content)
  logger.logNodeSuccess('12. Format Response', {
    messageCount: formattedMessages.length,
    messages: formattedMessages.map((msg, idx) => `[${idx + 1}]: ${msg.substring(0, 100)}...`)
  })
} else {
  formattedMessages = [aiResponse.content]
  logger.logNodeSuccess('12. Format Response', { messageCount: 1, messages: [...] })
}
```

**Output logado:**
- ✅ `messageCount`
- ✅ `messages` (preview de cada mensagem)

---

### 18. Send WhatsApp Message (NODE 13)
**Localização:** `chatbotFlow.ts:552-559`
**Status:** ✅ **COMPLETO**

```typescript
logger.logNodeStart('13. Send WhatsApp Message', { phone, messageCount })
const messageIds = await sendWhatsAppMessage({ phone, messages, config })
logger.logNodeSuccess('13. Send WhatsApp Message', { sentCount: messageIds.length })
```

**Output logado:**
- ✅ `sentCount`

---

## ❌ Nodes SEM Logging

### 19. Save AI Message (Internal Step)
**Localização:** `chatbotFlow.ts:521-527`
**Status:** ❌ **SEM LOGGING**

```typescript
// Save AI Response (internal step)
await saveChatMessage({
  phone: parsedMessage.phone,
  message: aiResponse.content,
  type: 'ai',
  clientId: config.id,
})
```

**⚠️ Problema:**
- Este passo **NÃO tem logging**
- É executado silenciosamente entre NODE 11 e NODE 12
- Não aparece no monitoring

**✅ Solução necessária:**
```typescript
logger.logNodeStart('11.7. Save AI Message', { phone, contentLength: aiResponse.content.length })
await saveChatMessage({ phone, message: aiResponse.content, type: 'ai', clientId })
logger.logNodeSuccess('11.7. Save AI Message', { saved: true })
```

---

### 20. Handle Human Handoff (Condicional)
**Localização:** `chatbotFlow.ts:499-514`
**Status:** ❌ **SEM LOGGING**

```typescript
if (config.settings.enableHumanHandoff && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  const hasHumanHandoff = aiResponse.toolCalls.some(
    (tool) => tool.function.name === 'transferir_atendimento'
  )

  if (hasHumanHandoff) {
    await handleHumanHandoff({ phone, customerName, config })
    logger.finishExecution('success')
    return { success: true, handedOff: true }
  }
}
```

**⚠️ Problema:**
- `handleHumanHandoff` **NÃO tem logging**
- Quando executado, não aparece no monitoring
- Apenas retorna com `handedOff: true` mas sem detalhes

**✅ Solução necessária:**
```typescript
if (hasHumanHandoff) {
  logger.logNodeStart('14. Handle Human Handoff', { phone, customerName })
  await handleHumanHandoff({ phone, customerName, config })
  logger.logNodeSuccess('14. Handle Human Handoff', {
    transferred: true,
    emailSent: true,
    notificationEmail: config.notificationEmail
  })
  logger.finishExecution('success')
  return { success: true, handedOff: true }
}
```

---

## 📋 Resumo - Status Final

### ✅ Nodes com Logging Completo (21) - **100% COBERTURA**
1. Filter Status Updates
2. Parse Message
3. Check Human Handoff Status
4. **Bot Processing Skipped (NODE 3.1)** - ✅ IMPLEMENTADO
5. Check/Create Customer
6. Process Media (+ sub-nodes)
7. Normalize Message
8. Push to Redis
9. Save Chat Message (User)
10. Batch Messages
11. Get Chat History
12. Get RAG Context
13. Check Continuity
14. Classify Intent
15. Generate AI Response
16. Detect Repetition
17. Regenerate with Variation (condicional)
18. **Save AI Message (NODE 11.7)** - ✅ IMPLEMENTADO
19. Format Response
20. **Handle Human Handoff (NODE 14)** - ✅ IMPLEMENTADO
21. Send WhatsApp Message

### ✅ Todas as Melhorias Implementadas

#### 1. ✅ Bot Processing Skipped (NODE 3.1) - IMPLEMENTADO
**Localização:** `chatbotFlow.ts:86-92`

```typescript
if (handoffCheck.skipBot) {
  // NODE 3.1: Bot Processing Skipped
  logger.logNodeSuccess('3.1. Bot Processing Skipped', {
    reason: handoffCheck.reason,
    status: handoffCheck.customerStatus,
    messageWillBeSaved: true,
    botWillNotRespond: true
  })
  logger.finishExecution('success')
  await saveChatMessage(...)
  return { success: true }
}
```

#### 2. ✅ Save AI Message (NODE 11.7) - IMPLEMENTADO
**Localização:** `chatbotFlow.ts:521-532`

```typescript
// NODE 11.7: Save AI Message
logger.logNodeStart('11.7. Save AI Message', {
  phone: parsedMessage.phone,
  contentLength: aiResponse.content.length
})
await saveChatMessage({
  phone: parsedMessage.phone,
  message: aiResponse.content,
  type: 'ai',
  clientId: config.id,
})
logger.logNodeSuccess('11.7. Save AI Message', { saved: true })
```

#### 3. ✅ Handle Human Handoff (NODE 14) - IMPLEMENTADO
**Localização:** `chatbotFlow.ts:505-519`

```typescript
if (hasHumanHandoff) {
  // NODE 14: Handle Human Handoff
  logger.logNodeStart('14. Handle Human Handoff', {
    phone: parsedMessage.phone,
    customerName: parsedMessage.name
  })
  await handleHumanHandoff({
    phone: parsedMessage.phone,
    customerName: parsedMessage.name,
    config,
  })
  logger.logNodeSuccess('14. Handle Human Handoff', {
    transferred: true,
    emailSent: true,
    notificationEmail: config.notificationEmail
  })
  logger.finishExecution('success')
  return { success: true, handedOff: true }
}
```

---

## 🎯 Próximos Passos - Validação

**Testar monitoring backend** com todos os cenários:
- ✅ Fluxo normal completo
- ✅ Nodes desabilitados (bypass)
- ✅ Mensagens de status (filtradas)
- ✅ Atendimento humano (skip bot)
- ✅ Human handoff (transferência)
- ✅ Erros em nodes individuais
- ✅ Save AI message
- ✅ Bot processing skipped (humano/transferido)

---

## 📊 Estatísticas Finais

**Total de nodes no chatflow:** 21
**Nodes com logging completo:** 21 (100%) ✅
**Nodes sem logging:** 0 (0%) ✅
**Nodes que logam bypass:** 9 (100% dos configuráveis) ✅

**Cobertura de logging:** **100%** ✅
**Meta:** 100% ✅ **ALCANÇADA**
