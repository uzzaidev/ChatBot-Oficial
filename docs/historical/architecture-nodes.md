# Arquitetura de Comunicação - Chatbot Flow

Documentação visual do fluxo de dados entre os 15 nodes implementados na Fase 3.

## 📊 Fluxo Completo - Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK RECEBIDO (Meta)                      │
│                   WhatsAppWebhookPayload                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 1: filterStatusUpdates                                    │
│  Input:  WhatsAppWebhookPayload                                 │
│  Output: WhatsAppWebhookPayload | null                          │
│  Ação:   Filtra status updates (delivery receipts, etc.)        │
└────────────────────────────┬────────────────────────────────────┘
                             │ (se não for status)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 2: parseMessage                                           │
│  Input:  WhatsAppWebhookPayload                                 │
│  Output: ParsedMessage                                          │
│  Ação:   Extrai phone, name, type, content, mediaId            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 3: checkOrCreateCustomer                                  │
│  Input:  { phone, name }                                        │
│  Output: CustomerRecord                                         │
│  Ação:   Verifica/cria cliente no Supabase                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │  Check Status   │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │ status === 'human'?     │
                └────────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ SIM                    NÃO  │
              ▼                             ▼
      ┌───────────────┐         ┌─────────────────────┐
      │ RETORNA       │         │ CONTINUA FLUXO      │
      │ (não responde)│         │                     │
      └───────────────┘         └──────────┬──────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────┐
                    │  SWITCH: Tipo de Mensagem        │
                    └──────────────┬───────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
    ┌────────┐              ┌──────────┐              ┌──────────┐
    │  TEXT  │              │  AUDIO   │              │  IMAGE   │
    └───┬────┘              └────┬─────┘              └────┬─────┘
        │                        │                         │
        │                        ▼                         ▼
        │              ┌──────────────────┐      ┌──────────────────┐
        │              │ NODE 4:          │      │ NODE 4:          │
        │              │ downloadMetaMedia│      │ downloadMetaMedia│
        │              │ Input:  mediaId  │      │ Input:  mediaId  │
        │              │ Output: Buffer   │      │ Output: Buffer   │
        │              └────────┬─────────┘      └────────┬─────────┘
        │                       │                         │
        │                       ▼                         ▼
        │              ┌──────────────────┐      ┌──────────────────┐
        │              │ NODE 5:          │      │ getMediaUrl      │
        │              │ transcribeAudio  │      │ (helper)         │
        │              │ Input:  Buffer   │      └────────┬─────────┘
        │              │ Output: string   │               │
        │              └────────┬─────────┘               ▼
        │                       │                ┌──────────────────┐
        │                       │                │ NODE 6:          │
        │                       │                │ analyzeImage     │
        │                       │                │ Input:  imageUrl │
        │                       │                │ Output: string   │
        │                       │                └────────┬─────────┘
        │                       │                         │
        └───────────────────────┴─────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 7: normalizeMessage                                       │
│  Input:  ParsedMessage + processedContent (opcional)            │
│  Output: { phone, name, content, timestamp }                    │
│  Ação:   Unifica todas as mensagens em formato comum           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 8: pushToRedis                                            │
│  Input:  { phone, content, timestamp }                          │
│  Output: number (tamanho da lista)                              │
│  Ação:   Adiciona à lista Redis: messages:{phone}               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 9: batchMessages                                          │
│  Input:  phone                                                  │
│  Output: string (mensagens consolidadas)                        │
│  Ação:   Aguarda 10s, recupera e consolida com \n\n            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   BUSCAR CONTEXTO (Paralelo) │
              └──────────────┬───────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
            ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ NODE 10: getChatHistory  │    │ NODE 11: getRAGContext   │
│ Input:  phone            │    │ Input:  query            │
│ Output: ChatMessage[]    │    │ Output: string           │
│ Ação:   Últimas 15 msgs  │    │ Ação:   Vector search    │
└───────────┬──────────────┘    └───────────┬──────────────┘
            │                                │
            └────────────────┬───────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  NODE 12: generateAIResponse                                    │
│  Input:  { message, chatHistory, ragContext, customerName }    │
│  Output: AIResponse                                             │
│  Ação:   Processa com Groq Llama 3.3 70B + tools               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Verificar Tool Calls        │
              └──────────────┬───────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
            ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ Tool: transferir_        │      │ Nenhum tool OU           │
│       atendimento        │      │ subagente_diagnostico    │
└───────────┬──────────────┘      └───────────┬──────────────┘
            │                                  │
            ▼                                  ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ NODE 15: handleHuman     │      │ NODE 13: formatResponse  │
│          Handoff         │      │ Input:  aiContent        │
│ Input:  { phone, name }  │      │ Output: string[]         │
│ Output: { success }      │      │ Ação:   Split em msgs    │
└───────────┬──────────────┘      └───────────┬──────────────┘
            │                                  │
            ▼                                  ▼
    ┌───────────────┐             ┌──────────────────────────┐
    │ RETORNA       │             │ NODE 14: sendWhatsApp    │
    │ handedOff:true│             │          Message         │
    └───────────────┘             │ Input:  {phone, msgs[]}  │
                                  │ Output: messageIds[]     │
                                  └───────────┬──────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────────┐
                                  │ RETORNA                  │
                                  │ success: true            │
                                  │ messagesSent: N          │
                                  └──────────────────────────┘
```

## 🔗 Tabela de Conexões

| Node | Input | Output | Próximo Node |
|------|-------|--------|--------------|
| **1. filterStatusUpdates** | `WhatsAppWebhookPayload` | `WhatsAppWebhookPayload \| null` | → parseMessage (se não null) |
| **2. parseMessage** | `WhatsAppWebhookPayload` | `ParsedMessage` | → checkOrCreateCustomer |
| **3. checkOrCreateCustomer** | `{ phone, name }` | `CustomerRecord` | → Switch (check status) |
| **4. downloadMetaMedia** | `mediaId: string` | `Buffer` | → transcribeAudio OU getMediaUrl |
| **5. transcribeAudio** | `Buffer` | `string` | → normalizeMessage |
| **6. analyzeImage** | `imageUrl: string` | `string` | → normalizeMessage |
| **7. normalizeMessage** | `ParsedMessage + processedContent?` | `{ phone, name, content, timestamp }` | → pushToRedis |
| **8. pushToRedis** | `{ phone, content, timestamp }` | `number` | → batchMessages |
| **9. batchMessages** | `phone: string` | `string` | → getChatHistory + getRAGContext |
| **10. getChatHistory** | `phone: string` | `ChatMessage[]` | → generateAIResponse |
| **11. getRAGContext** | `query: string` | `string` | → generateAIResponse |
| **12. generateAIResponse** | `{ message, chatHistory, ragContext, customerName }` | `AIResponse` | → Check toolCalls |
| **13. formatResponse** | `aiContent: string` | `string[]` | → sendWhatsAppMessage |
| **14. sendWhatsAppMessage** | `{ phone, messages: string[] }` | `string[]` | → Return success |
| **15. handleHumanHandoff** | `{ phone, customerName }` | `{ success, emailSent }` | → Return handedOff |

## 📦 Estrutura de Dados (Tipos)

### WhatsAppWebhookPayload
```typescript
{
  entry: [{
    changes: [{
      value: {
        messages?: [{
          id: string
          from: string
          timestamp: string
          type: 'text' | 'audio' | 'image'
          text?: { body: string }
          audio?: { id: string, mime_type: string }
          image?: { id: string, mime_type: string, caption?: string }
        }]
        contacts?: [{
          profile: { name: string }
          wa_id: string
        }]
      }
    }]
  }]
}
```

### ParsedMessage
```typescript
{
  phone: string
  name: string
  type: 'text' | 'audio' | 'image'
  content: string
  timestamp: string
  messageId: string
  mediaId?: string
  caption?: string
  metadata?: MediaMetadata
}
```

### CustomerRecord
```typescript
{
  id: string
  telefone: string  // phone
  nome: string      // name
  status: 'bot' | 'waiting' | 'human'
  created_at: string
}
```

### AIResponse
```typescript
{
  content: string
  toolCalls?: [{
    id: string
    type: 'function'
    function: {
      name: string  // 'transferir_atendimento' | 'subagente_diagnostico'
      arguments: string
    }
  }]
  finished: boolean
}
```

## 🔄 Fluxos Alternativos

### Fluxo 1: Mensagem de Status (Ignorada)
```
Webhook → filterStatusUpdates → null
                               ↓
                        RETORNA (sem processar)
```

### Fluxo 2: Cliente em Atendimento Humano
```
Webhook → filterStatusUpdates → parseMessage → checkOrCreateCustomer
                                                         ↓
                                              customer.status = 'human'
                                                         ↓
                                                  RETORNA (sem responder)
```

### Fluxo 3: Mensagem de Texto (Caminho Rápido)
```
Webhook → filter → parse → checkCustomer → normalizeMessage (direto)
                                             ↓
                                         pushToRedis → ...
```

### Fluxo 4: Mensagem de Áudio
```
Webhook → filter → parse → checkCustomer → downloadMetaMedia
                                             ↓
                                         transcribeAudio
                                             ↓
                                         normalizeMessage → pushToRedis → ...
```

### Fluxo 5: Mensagem de Imagem
```
Webhook → filter → parse → checkCustomer → downloadMetaMedia
                                             ↓
                                         getMediaUrl (helper)
                                             ↓
                                         analyzeImage (GPT-4o Vision)
                                             ↓
                                         normalizeMessage → pushToRedis → ...
```

### Fluxo 6: Transferência para Humano (Tool Call)
```
... → generateAIResponse → toolCalls: 'transferir_atendimento'
                            ↓
                        handleHumanHandoff
                            ↓
                        - UPDATE status = 'Transferido'
                        - Buscar chat history
                        - Resumir com Groq
                        - Enviar email
                            ↓
                        RETORNA { handedOff: true }
```

## 🎯 Pontos de Decisão

### Decision Point 1: Status Update?
```
filterStatusUpdates
  ├─ messages[] existe? → Continua
  └─ messages[] vazio?  → null (PARA)
```

### Decision Point 2: Status do Cliente
```
checkOrCreateCustomer
  ├─ status = 'bot'     → Continua (bot responde)
  ├─ status = 'waiting' → Continua (bot responde)
  └─ status = 'human'   → PARA (humano já atendendo)
```

### Decision Point 3: Tipo de Mensagem
```
parseMessage.type
  ├─ 'text'  → normalizeMessage (direto)
  ├─ 'audio' → download → transcribe → normalize
  └─ 'image' → download → analyze → normalize
```

### Decision Point 4: Tool Calls
```
generateAIResponse.toolCalls
  ├─ 'transferir_atendimento'   → handleHumanHandoff → PARA
  ├─ 'subagente_diagnostico'    → Log (TODO: recursão)
  └─ nenhum                     → formatResponse → send
```

## 💾 Dependências Externas

### Redis (Message Batching)
```
pushToRedis    → LPUSH messages:{phone}
batchMessages  → LRANGE messages:{phone} 0 -1
               → DEL messages:{phone}
```

### Supabase (Database)
```
checkOrCreateCustomer  → SELECT/INSERT "Clientes WhatsApp"
getChatHistory        → SELECT n8n_chat_histories
getRAGContext         → RPC match_documents
handleHumanHandoff    → UPDATE "Clientes WhatsApp"
```

### Meta API (WhatsApp)
```
downloadMetaMedia     → GET /{mediaId}
sendWhatsAppMessage   → POST /messages
```

### OpenAI API
```
transcribeAudio  → POST /audio/transcriptions (Whisper)
analyzeImage     → POST /chat/completions (GPT-4o Vision)
getRAGContext    → POST /embeddings (text-embedding-3-small)
```

### Groq API (LLM)
```
generateAIResponse    → POST /chat/completions (Llama 3.3 70B)
handleHumanHandoff    → POST /chat/completions (resumo)
```

### Gmail (SMTP)
```
handleHumanHandoff → nodemailer.sendMail()
```

## ⏱️ Delays e Timing

| Node | Delay | Motivo |
|------|-------|--------|
| **batchMessages** | 10 segundos | Aguardar mensagens rápidas do usuário |
| **sendWhatsAppMessage** | 2 segundos entre msgs | Evitar rate limit Meta API |

## 🔐 Variáveis de Ambiente Necessárias

Cada node depende de:

```env
# Redis
pushToRedis, batchMessages
  → REDIS_URL

# OpenAI
transcribeAudio, analyzeImage, getRAGContext
  → OPENAI_API_KEY

# Groq
generateAIResponse, handleHumanHandoff
  → GROQ_API_KEY

# Meta WhatsApp
downloadMetaMedia, sendWhatsAppMessage
  → META_ACCESS_TOKEN
  → META_PHONE_NUMBER_ID

# Gmail
handleHumanHandoff
  → GMAIL_USER
  → GMAIL_PASSWORD

# Supabase
checkOrCreateCustomer, getChatHistory, getRAGContext, handleHumanHandoff
  → NEXT_PUBLIC_SUPABASE_URL
  → NEXT_PUBLIC_SUPABASE_ANON_KEY
  → SUPABASE_SERVICE_ROLE_KEY
```

## 📝 Notas de Implementação

### Node Composition (Orquestração)
O arquivo `src/flows/chatbotFlow.ts` orquestra todos os nodes na ordem correta. É a única função que o webhook precisa chamar:

```typescript
import { processChatbotMessage } from '@/flows/chatbotFlow'

// No webhook endpoint:
const result = await processChatbotMessage(payload)
// result: { success: boolean, messagesSent?: number, handedOff?: boolean }
```

### Error Propagation
Todos os nodes fazem `throw` em caso de erro. O flow principal captura com try/catch global e retorna `{ success: false }`.

### Parallel Execution
Apenas um ponto de paralelização implementado:
```typescript
const [chatHistory, ragContext] = await Promise.all([
  getChatHistory(phone),
  getRAGContext(batchedContent)
])
```

### Pure Functions
Todos os nodes são funções puras (exceto side effects de IO). Facilitam testes unitários:
```typescript
// Exemplo de teste
const parsed = parseMessage(mockPayload)
expect(parsed.phone).toBe('5554999999999')
```

---

# 🔄 Diferenças: n8n (IA.json) vs Next.js (Nossa Implementação)

## 1. 💾 **Chat Memory (Histórico de Conversas)**

### ❌ n8n (IA.json) - AUTOMÁTICO
```json
{
  "name": "Postgres Chat Memory",
  "type": "@n8n/n8n-nodes-langchain.memoryPostgresChat"
}
```

**O que o n8n faz:**
- Node especial conectado ao "AI Agent" (linha 811)
- **Salva AUTOMATICAMENTE** cada interação:
  - Mensagem do usuário (type: 'user')
  - Resposta da IA (type: 'ai')
- Salva na tabela `n8n_chat_histories` com:
  - `session_id` = telefone
  - `type` = 'user' ou 'ai'
  - `message` = conteúdo
  - `created_at` = timestamp

**Conexão visual:**
```
AI Agent ←→ Postgres Chat Memory (ai_memory connection)
          ↓
   Salva automaticamente em n8n_chat_histories
```

### ✅ Nossa Implementação - MANUAL

**Precisamos fazer explicitamente:**

```typescript
// Node criado: saveChatMessage.ts
await saveChatMessage({
  phone: parsedMessage.phone,
  message: normalizedMessage.content,
  type: 'user'  // Salva mensagem do usuário
})

// Depois da IA responder:
await saveChatMessage({
  phone: parsedMessage.phone,
  message: aiResponse.content,
  type: 'ai'  // Salva resposta da IA
})
```

**Momentos que salvamos:**
1. **Após normalizeMessage** → Salva mensagem do USUÁRIO
2. **Após generateAIResponse** → Salva resposta da IA

---

## 2. 🧠 **AI Agent Tools (Ferramentas da IA)**

### ❌ n8n (IA.json) - Nodes Especiais

**3 Tools conectadas ao AI Agent principal:**

#### Tool 1: Subagente de Diagnóstico
```json
{
  "name": "AI Agent Tool",
  "type": "@n8n/n8n-nodes-langchain.agentTool",
  "toolDescription": "Utilize esse agente para buscar a area que mais se adequa a necessidade do cliente"
}
```
- **Linha 820-834** do IA.json
- Outro AI Agent completo (com seu próprio Groq Model)
- System prompt: Diagnostica se cliente quer Energia Solar, Ciência de Dados ou Desenvolvimento
- Conectado ao AI Agent principal via `ai_tool` connection

#### Tool 2: Vector Store RAG (Supabase)
```json
{
  "name": "Supabase Vector Store",
  "type": "@n8n/n8n-nodes-langchain.vectorStoreSupabase"
}
```
- **Linha 857-886** do IA.json
- Busca automática em documentos usando embeddings
- Conectado ao OpenAI Embeddings (linha 1661-1670)
- Retorna contexto relevante AUTOMATICAMENTE quando IA precisa

#### Tool 3: Transferir Atendimento (Human Handoff)
```json
{
  "name": "Call 'IA'",
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "description": "Utilize essa tool para transferir o atendimento para um humano"
}
```
- **Linha 924-965** do IA.json
- Chama outro workflow (recursivo!)
- Passa `telefone` como parâmetro
- Executa workflow que:
  - Update status = 'Transferido'
  - Busca histórico
  - Resume conversa
  - Envia email

**Conexões no n8n:**
```
AI Agent (Principal)
   ├─ ai_tool → AI Agent Tool (Subagente)
   ├─ ai_tool → Supabase Vector Store (RAG)
   ├─ ai_tool → Call 'IA' (Human Handoff)
   ├─ ai_memory → Postgres Chat Memory
   └─ ai_languageModel → Groq Chat Model
```

### ✅ Nossa Implementação - Function Calling Manual

**Definimos tools no código:**

```typescript
// src/nodes/generateAIResponse.ts (linha ~60-120)
const tools = [
  {
    type: 'function',
    function: {
      name: 'subagente_diagnostico',
      description: 'Utilize esse agente para buscar a area que mais se adequa...',
      parameters: {
        type: 'object',
        properties: {
          pergunta_cliente: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transferir_atendimento',
      description: 'Utilize essa tool para transferir o atendimento para um humano...',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string' }
        }
      }
    }
  }
]
```

**Processamento dos tool calls:**

```typescript
// src/flows/chatbotFlow.ts (linha 150-172)
if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  const hasHumanHandoff = aiResponse.toolCalls.some(
    (tool) => tool.function.name === 'transferir_atendimento'
  )

  if (hasHumanHandoff) {
    await handleHumanHandoff({ phone, customerName })
    return { success: true, handedOff: true }
  }

  // Subagente detectado mas não implementado recursivamente (TODO)
  const hasDiagnosticAgent = aiResponse.toolCalls.some(
    (tool) => tool.function.name === 'subagente_diagnostico'
  )
}
```

**Diferença:** RAG é chamado manualmente via `getRAGContext()`, não automaticamente.

---

## 3. ✂️ **Message Formatter (Divisão em \\n\\n)**

### ❌ n8n (IA.json) - Segundo AI Agent

```json
{
  "name": "AI Agent1",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "systemMessage": "Você é um agente formatador de mensagens para WhatsApp..."
}
```

**O que o n8n faz:**
- **Linha 664-700** do IA.json
- OUTRO AI Agent completo (com Groq Chat Model separado)
- Recebe a resposta do AI Agent principal
- System prompt específico:
  - "Divida em 2 ou mais mensagens"
  - "Sempre aplique exatamente duas quebras de linha (\\n\\n) no final do bloco"
  - "Nunca divida frases no meio"
  - "Não quebre listas"
  - "NUNCA altere o conteúdo"

**Exemplo do prompt:**
```
Q: Oi! Tudo bem, e com você? Como posso ajudar?
A:
Oi!

Tudo bem, e com você?

Como posso ajudar?
```

**Custo:** Cada formatação = 1 chamada Groq adicional

### ✅ Nossa Implementação - Algoritmo Determinístico

```typescript
// src/nodes/formatResponse.ts
export function formatResponse(aiResponseContent: string): string[] {
  let messages = aiResponseContent
    .split('\n\n')
    .map(msg => msg.trim())
    .filter(msg => msg.length > 0)

  if (messages.length < 2) {
    // Fallback: split inteligente em parágrafos
    const paragraphs = aiResponseContent.split('\n')
    // ... lógica de agrupamento
  }

  // Garantir limite WhatsApp (4096 chars)
  messages = messages.map(msg =>
    msg.length > MAX_MESSAGE_LENGTH
      ? msg.substring(0, MAX_MESSAGE_LENGTH)
      : msg
  )

  return messages
}
```

**Diferença:**
- ✅ **Economia:** Não gasta tokens adicionais
- ✅ **Previsível:** Algoritmo determinístico
- ❌ **Menos inteligente:** Pode dividir de forma menos natural que IA

---

## 4. 🎯 **System Prompts**

### ❌ n8n (IA.json)

**3 System Prompts diferentes:**

#### Prompt 1: AI Agent Principal (linha 632)
```
## Papel
Você é o **assistente principal de IA do engenheiro Luis Fernando Boff**...

## Instruções de Atendimento
1. Cumprimente e peça o nome
2. Descubra o motivo do contato
3. Entenda o contexto com empatia
4. Após identificar a área...
5. Esclareça dúvidas com segurança
6. Finalize com um próximo passo claro

## Regras Gerais
- Sem emojis
- Use o subagente de diagnóstico quando houver dúvida
- Encaminhe para atendimento humano se necessário
```

#### Prompt 2: Subagente de Diagnóstico (linha 824)
```
## Papel
Você é o **Subagente de Diagnóstico**...

## Objetivo
1. Entender o motivo do contato
2. Fazer até 3 perguntas contextuais
3. Analisar o contexto e classificar (Energia Solar, Ciência de Dados ou Desenvolvimento)
4. Confirmar de forma natural
5. Encaminhar

## Regras
- Nunca mencione as três áreas logo de início
- Conduza com naturalidade
```

#### Prompt 3: Message Formatter (linha 669)
```
Você é um agente formatador de mensagens para WhatsApp.
Sua única função é dividir a mensagem recebida em múltiplas mensagens...

1. Sempre divida em 2 ou mais mensagens
2. Exatamente duas quebras de linha (\n\n)
3. Nunca divida frases no meio
4. Não quebre listas
5. NUNCA altere o conteúdo
```

### ✅ Nossa Implementação

**2 System Prompts (em código TypeScript):**

```typescript
// src/nodes/generateAIResponse.ts
const MAIN_AGENT_SYSTEM_PROMPT = `
## Papel
Você é o **assistente principal de IA do engenheiro Luis Fernando Boff**...
[COPIADO EXATAMENTE do IA.json linha 632]
`

const DIAGNOSTIC_SUBAGENT_PROMPT = `
## Papel
Você é o **Subagente de Diagnóstico**...
[COPIADO EXATAMENTE do IA.json linha 824]
`
```

**Não temos:** Message Formatter prompt (usamos algoritmo)

---

## 5. 🔗 **Conexões e Dependências**

### ❌ n8n (IA.json) - Visual Node Connections

```
AI Agent (Principal)
   ├─ ai_memory → Postgres Chat Memory (AUTOMÁTICO)
   ├─ ai_languageModel → Groq Chat Model
   ├─ ai_tool → AI Agent Tool (Subagente)
   │    └─ ai_languageModel → Groq Chat Model2
   ├─ ai_tool → Supabase Vector Store (RAG)
   │    └─ ai_embedding → Embeddings OpenAI
   └─ ai_tool → Call 'IA' (Human Handoff Workflow)

AI Agent → output → AI Agent1 (Formatter)
                    └─ ai_languageModel → Groq Chat Model3

Formatter → output → Split Out → Loop Over Items → Send WhatsApp Messages
```

**Total de chamadas Groq no n8n:**
1. Main Agent (Llama 3.3 70B)
2. Subagent Tool (se chamado) (Llama 3.3 70B)
3. Message Formatter (Llama 3.3 70B)
4. Human Handoff - Resume conversa (Llama 3.3 70B)

### ✅ Nossa Implementação - Function Calls

```
chatbotFlow (orquestração)
   ├─ getChatHistory (lê PostgreSQL)
   ├─ getRAGContext (gera embedding + busca Supabase)
   │    └─ generateEmbedding (OpenAI)
   │    └─ match_documents (Supabase RPC)
   ├─ generateAIResponse (Groq)
   │    └─ Retorna toolCalls se necessário
   ├─ IF toolCalls = 'transferir_atendimento'
   │    └─ handleHumanHandoff
   │         ├─ UPDATE Supabase
   │         ├─ getChatHistory
   │         ├─ Resume com Groq
   │         └─ sendEmail (Gmail)
   ├─ formatResponse (algoritmo JS)
   └─ sendWhatsAppMessage (Meta API)
```

**Total de chamadas Groq na nossa implementação:**
1. Main Agent (sempre)
2. Human Handoff Resume (se ferramenta for chamada)

**Economia:** Não gastamos token no formatter!

---

## 6. 📊 Comparação Resumida

| Feature | n8n (IA.json) | Next.js (Nossa) |
|---------|---------------|-----------------|
| **Chat Memory** | Automático (node especial) | Manual (`saveChatMessage`) |
| **RAG Vector Store** | Tool automática | Manual (`getRAGContext`) |
| **Subagent Tool** | AI Agent completo (node) | Function calling (Groq SDK) |
| **Human Handoff** | Workflow recursivo | Node + função |
| **Message Formatter** | AI Agent (Groq) | Algoritmo JS |
| **Chamadas Groq/msg** | 2-3 (main + formatter + tools) | 1-2 (main + tools) |
| **System Prompts** | 3 separados | 2 em código |
| **Orquestração** | Visual (arrastar nodes) | Código TypeScript |
| **Debugging** | Logs visuais n8n | console.log + TypeScript errors |
| **Teste** | Botão "Test" no n8n | Scripts Node.js locais |

---

## 7. ⚠️ O que ainda falta implementar

### 🚧 TODO: Recursive Tool Calling

**No n8n:** Quando subagente é chamado, ele executa e retorna resultado pro AI Agent, que continua a conversa.

**Na nossa implementação:** Detectamos o tool call mas não fazemos recursão:

```typescript
// src/flows/chatbotFlow.ts (linha 165-171)
const hasDiagnosticAgent = aiResponse.toolCalls.some(
  (tool) => tool.function.name === 'subagente_diagnostico'
)

if (hasDiagnosticAgent) {
  console.log('[chatbotFlow] Diagnostic subagent tool called - tool result handling not yet implemented')
  // TODO: Implementar loop recursivo
}
```

**Como deveria ser:**
```typescript
if (hasDiagnosticAgent) {
  // 1. Extrair arguments do tool call
  const args = JSON.parse(aiResponse.toolCalls[0].function.arguments)

  // 2. Executar subagente com diagnostic prompt
  const diagnosticResult = await generateAIResponse({
    message: args.pergunta_cliente,
    systemPrompt: DIAGNOSTIC_SUBAGENT_PROMPT,
    ...
  })

  // 3. Chamar novamente o main agent com tool result
  const finalResponse = await generateAIResponse({
    message: batchedContent,
    toolResults: [{
      tool_call_id: aiResponse.toolCalls[0].id,
      output: diagnosticResult.content
    }],
    ...
  })

  // 4. Continuar com finalResponse
}
```

---

## 8. 💡 Vantagens da Nossa Implementação

✅ **Controle total:** Código TypeScript tipado
✅ **Testável:** Funções puras, fácil de testar
✅ **Versionável:** Git, CI/CD, review de código
✅ **Economia:** Menos chamadas de IA (sem formatter AI)
✅ **Performance:** Paralelização manual (Promise.all)
✅ **Debugging:** Stack traces claros
✅ **Deploy:** Vercel, serverless, escalável

## 9. 💡 Vantagens do n8n

✅ **Visual:** Fluxo fácil de entender
✅ **No-code:** Não precisa programar
✅ **Rápido:** Prototipar em minutos
✅ **Integrações:** 400+ nodes prontos
✅ **Self-hosted:** Controle total de dados

---

# 🎯 Conclusão

**n8n é excelente para prototipagem**, mas para produção escalável, **código TypeScript oferece mais controle, testabilidade e economia**.

Nossa migração mantém **toda a lógica** do n8n, mas com **menos custos de IA** (sem formatter agent) e **mais flexibilidade** para customizações futuras.
