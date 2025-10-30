# 🔀 Lógica do Workflow - Mapeamento chatbotFlow.ts

Este documento mapeia EXATAMENTE como cada node se conecta no `chatbotFlow.ts` real.

## 📊 Fluxo Completo (chatbotFlow.ts)

```typescript
// 1. FILTER STATUS UPDATES (linha 94-98)
const filteredPayload = filterStatusUpdates(payload)
if (!filteredPayload) return { success: true }

// 2. PARSE MESSAGE (linha 100-101)
const parsedMessage = parseMessage(filteredPayload)

// 3. CHECK/CREATE CUSTOMER (linha 103-106)
const customer = await checkOrCreateCustomer({
  phone: parsedMessage.phone,
  name: parsedMessage.name,
})

// 3.1. VERIFICA STATUS (linha 108-111)
if (customer.status === 'human') {
  return { success: true, handedOff: true }
}

// 4. PROCESS MEDIA (linha 113-120) - OPCIONAL
let normalizedContent: string
if (parsedMessage.type === 'text') {
  normalizedContent = parsedMessage.content  // ✅ Pula node 4
} else {
  normalizedContent = await processMediaMessage(parsedMessage)  // ⚡ Executa node 4
}

// 5. NORMALIZE MESSAGE (linha 122-124)
const normalizedMessage = normalizeMessage({
  parsedMessage,
  processedContent: normalizedContent,
})

// 6. PUSH TO REDIS (linha 127)
await pushToRedis(normalizedMessage)

// 6.1. SAVE USER MESSAGE (linha 129-133)
await saveChatMessage({
  phone: parsedMessage.phone,
  message: normalizedMessage.content,
  type: 'user',
})

// 7. BATCH MESSAGES (linha 135-136)
const batchedContent = await batchMessages(parsedMessage.phone)

// 7.1. VERIFICA SE TEM CONTEÚDO (linha 138-141)
if (!batchedContent || batchedContent.trim().length === 0) {
  return { success: true }
}

// 8 e 9. GET CHAT HISTORY + RAG CONTEXT (linha 143-147) - PARALELO
const [chatHistory, ragContext] = await Promise.all([
  getChatHistory(parsedMessage.phone),
  getRAGContext(batchedContent),
])

// 10. GENERATE AI RESPONSE (linha 151-156)
const aiResponse = await generateAIResponse({
  message: batchedContent,
  chatHistory,
  ragContext,
  customerName: parsedMessage.name,
})

// 10.1. VERIFICA TOOL CALLS (linha 158-178)
if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  // Transferência humana
  // Subagente diagnóstico
}

// 10.2. VERIFICA SE RESPOSTA ESTÁ VAZIA (linha 180-183)
if (!aiResponse.content || aiResponse.content.trim().length === 0) {
  return { success: true, messagesSent: 0 }
}

// 10.3. SAVE AI MESSAGE (linha 185-189)
await saveChatMessage({
  phone: parsedMessage.phone,
  message: aiResponse.content,
  type: 'ai',
})

// 11. FORMAT RESPONSE (linha 191-192)
const formattedMessages = formatResponse(aiResponse.content)

// 11.1. VERIFICA SE TEM MENSAGENS (linha 194-197)
if (formattedMessages.length === 0) {
  return { success: true, messagesSent: 0 }
}

// 12. SEND WHATSAPP MESSAGE (linha 199-202)
const messageIds = await sendWhatsAppMessage({
  phone: parsedMessage.phone,
  messages: formattedMessages,
})
```

## 🔗 Conexões Entre Nodes

| Node | Input Vem De | Formato do Input | Linha no chatbotFlow.ts |
|------|-------------|------------------|-------------------------|
| **1. filterStatusUpdates** | Webhook payload | `WhatsAppWebhookPayload` | 94 |
| **2. parseMessage** | Output do node 1 | `WhatsAppWebhookPayload` (filtered) | 100 |
| **3. checkOrCreateCustomer** | Dados do node 2 | `{ phone, name }` | 103-106 |
| **4. downloadMetaMedia** | Dados do node 2 | `metadata.id` (SE type !== 'text') | 56-79 |
| **5. normalizeMessage** | Node 2 + Node 4 | `{ parsedMessage, processedContent }` | 122-124 |
| **6. pushToRedis** | Output do node 5 | `NormalizedMessage` | 127 |
| **7. batchMessages** | Phone do node 2 | `string` (phone) | 136 |
| **8. getChatHistory** | Phone do node 2 | `string` (phone) | 143-147 |
| **9. getRAGContext** | Output do node 7 | `string` (batchedContent) | 143-147 |
| **10. generateAIResponse** | Nodes 7, 8, 9, 2 | `{ message, chatHistory, ragContext, customerName }` | 151-156 |
| **11. formatResponse** | Content do node 10 | `string` (aiResponse.content) | 192 |
| **12. sendWhatsAppMessage** | Node 2 + Node 11 | `{ phone, messages }` | 199-202 |

## 🎯 Condições Lógicas Importantes

### ✅ Node 1: Filter Status Updates
```typescript
if (!filteredPayload) {
  // Mensagem é status update (delivered, read, etc)
  return { success: true }  // ❌ PARA AQUI
}
// Caso contrário, continua ✅
```

### 👤 Node 3: Check Customer Status
```typescript
if (customer.status === 'human') {
  // Cliente já foi transferido para atendimento humano
  return { success: true, handedOff: true }  // ❌ PARA AQUI
}
// Caso contrário, continua com bot ✅
```

### 🎬 Node 4: Process Media (OPCIONAL)
```typescript
if (parsedMessage.type === 'text') {
  normalizedContent = parsedMessage.content  // ⏭️ PULA NODE 4
} else {
  normalizedContent = await processMediaMessage(parsedMessage)  // ▶️ EXECUTA NODE 4
}
```

**Tipos que EXECUTAM node 4:**
- `audio` → downloadMetaMedia + transcribeAudio
- `image` → downloadMetaMedia + analyzeImage

**Tipos que PULAM node 4:**
- `text` → usa content direto

### 📦 Node 7: Batch Messages
```typescript
if (!batchedContent || batchedContent.trim().length === 0) {
  // Nenhuma mensagem no batch (delay de 10s não atingido)
  return { success: true }  // ❌ PARA AQUI
}
// Caso contrário, continua ✅
```

### 🤖 Node 10: AI Response
```typescript
// Verifica tool calls
if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  if (hasHumanHandoff) {
    await handleHumanHandoff(...)
    return { success: true, handedOff: true }  // ❌ PARA AQUI
  }
}

// Verifica se resposta está vazia
if (!aiResponse.content || aiResponse.content.trim().length === 0) {
  return { success: true, messagesSent: 0 }  // ❌ PARA AQUI
}
// Caso contrário, continua ✅
```

### 📝 Node 11: Format Response
```typescript
if (formattedMessages.length === 0) {
  // Resposta não gerou mensagens válidas
  return { success: true, messagesSent: 0 }  // ❌ PARA AQUI
}
// Caso contrário, continua ✅
```

## 🔄 Nodes que Executam em Paralelo

**Linha 143-147:**
```typescript
const [chatHistory, ragContext] = await Promise.all([
  getChatHistory(parsedMessage.phone),      // Node 8
  getRAGContext(batchedContent),             // Node 9
])
```

✅ **Nodes 8 e 9 podem ser executados AO MESMO TEMPO**

## 📝 Nodes de Side Effect (não bloqueiam fluxo)

Estes nodes salvam dados mas NÃO afetam o output:

1. **saveChatMessage (user)** - Linha 129-133
   - Salva mensagem do usuário no histórico
   - Acontece DEPOIS do node 6 (pushToRedis)

2. **saveChatMessage (ai)** - Linha 185-189
   - Salva resposta da AI no histórico
   - Acontece DEPOIS do node 10 (generateAIResponse)

## 🎨 Highlights para Dashboard

### Node 2: Parse Message
```typescript
🔵 Tipo de Mensagem: parsedMessage.type
📱 Telefone: parsedMessage.phone
👤 Nome: parsedMessage.name
```

### Node 3: Check Customer
```typescript
🟢 Status Cliente: customer.status  // "bot" ou "human"
✅ Continua com bot? customer.status === 'bot'
❌ Transferido? customer.status === 'human'
```

### Node 4: Download Media
```typescript
⏭️ Pulado? parsedMessage.type === 'text'
🎵 Áudio? parsedMessage.type === 'audio'
🖼️ Imagem? parsedMessage.type === 'image'
```

### Node 7: Batch Messages
```typescript
📦 Conteúdo: batchedContent.length caracteres
⚠️ Vazio? batchedContent.trim().length === 0
```

### Node 10: Generate AI Response
```typescript
💬 Resposta: aiResponse.content (primeiros 50 chars)
🔧 Tool Calls? aiResponse.toolCalls?.length > 0
🤝 Transferir? toolCalls includes "transferir_atendimento"
🔍 Diagnóstico? toolCalls includes "subagente_diagnostico"
```

## 🧪 Como Testar no Workflow Debugger

### Cenário 1: Mensagem de Texto Simples (Fluxo Completo)
1. Node 1 → ✅ Mensagem válida
2. Node 2 → 🔵 Tipo: text
3. Node 3 → 🟢 Status: bot
4. Node 4 → ⏭️ **SKIP** (texto não precisa download)
5. Node 5 → ✅ Normalizado
6. Node 6 → ✅ Enviado ao Redis
7. Node 7 → 📦 Batched
8. Node 8 → 💬 Histórico recuperado
9. Node 9 → 📚 RAG context
10. Node 10 → 🤖 AI respondeu
11. Node 11 → 📝 Formatado
12. Node 12 → ✅ Enviado pro WhatsApp

### Cenário 2: Cliente já Transferido
1. Node 1 → ✅
2. Node 2 → ✅
3. Node 3 → 🔴 Status: human → **PARA AQUI**

### Cenário 3: Status Update (delivered/read)
1. Node 1 → 🔴 Filtrado → **PARA AQUI**

### Cenário 4: Mensagem de Áudio
1. Node 1 → ✅
2. Node 2 → 🎵 Tipo: audio
3. Node 3 → ✅
4. Node 4 → ▶️ **EXECUTA** (download + transcreve)
5. Node 5 → ✅ (usa transcrição)
... continua normal

## 📊 Resumo Visual

```
Webhook → [1] Filter → [2] Parse → [3] Customer → [4] Media* → [5] Normalize
                         ↓                                         ↓
                         phone, name                           normalized msg
                         
→ [6] Redis → [7] Batch → [8] History ⟍
                ↓                       → [10] AI Response
              phone      [9] RAG ⟋          ↓
                                        aiResponse.content
                                            ↓
                                        [11] Format
                                            ↓
                                        [12] Send WhatsApp

* Node 4 é OPCIONAL (só se type !== 'text')
```

## ✅ Validação

Use este documento para validar que o Workflow Debugger está replicando EXATAMENTE o comportamento do `chatbotFlow.ts` real.
