# 07_NODES_CATALOG - Catálogo Completo de Nodes

**Data:** 2026-02-19
**Fonte:** Análise de código real em `src/nodes/`
**Total de Nodes:** 39 arquivos encontrados

---

## Resumo Executivo

**Nodes do Flow Principal (chamados por chatbotFlow.ts):**
- Receive & Validate: 3 nodes
- Media Processing: 4 nodes
- Message Handling: 6 nodes
- AI Generation: 3 nodes
- Utilities: 10+ nodes

**Nodes Auxiliares (utilities, helpers):**
- WhatsApp API: 4 nodes
- CRM: 2 nodes
- Interactive Flows: 1 node
- Meta Ads: 1 node

---

## RECEIVE & VALIDATE (Nodes 1-3)

### NODE 1: filterStatusUpdates

**Arquivo:** `src/nodes/filterStatusUpdates.ts`
**Função:** Filtrar status updates do WhatsApp (delivered, read, sent)

**Input:**
```typescript
WhatsAppWebhookPayload
```

**Output:**
```typescript
WhatsAppWebhookPayload | null  // null se for status update
```

**Lógica:**
- Check se entry[0].changes[0].value.statuses existe
- Se existe, return null (é status update)
- Se não, return payload original

**Riscos:** Nenhum
**Dependencies:** Nenhuma
**Multi-tenant:** N/A

**Evidência:** Mencionado em `chatbotFlow.ts:160`

---

### NODE 2: parseMessage

**Arquivo:** `src/nodes/parseMessage.ts`
**Função:** Extrair dados estruturados do payload WhatsApp

**Input:**
```typescript
WhatsAppWebhookPayload
```

**Output:**
```typescript
interface ParsedMessage {
  phone: string
  name: string
  content: string
  type: 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'interactive'
  messageId: string  // wamid
  metadata?: {
    id: string        // Media ID
    mimeType: string
    filename?: string
  }
  referral?: {        // Meta Ads referral
    source_url: string
    source_type: string
    source_id: string
  }
  interactiveResponseId?: string
}
```

**Lógica:**
- Extract phone from value.contacts[0].wa_id
- Extract name from value.contacts[0].profile.name
- Identify message type (text/audio/image/etc)
- Extract content based on type
- Extract metadata for media messages
- Extract referral data if present (Meta Ads)

**Riscos:** Nenhum
**Dependencies:** WhatsApp API payload structure
**Multi-tenant:** N/A

**Evidência:** Mencionado em `chatbotFlow.ts:173`

---

### NODE 3: checkOrCreateCustomer

**Arquivo:** `src/nodes/checkOrCreateCustomer.ts`
**Função:** Verificar se customer existe, criar se não existir

**Input:**
```typescript
interface CheckOrCreateCustomerInput {
  phone: string
  name: string
  clientId: string  // 🔐 Multi-tenant
}
```

**Output:**
```typescript
interface Customer {
  telefone: string  // NUMERIC type
  nome: string
  status: 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'
  client_id: string
}
```

**Lógica:**
- Query `clientes_whatsapp` com telefone + client_id
- Se não existe, INSERT
- Se existe, return existente
- Default status: 'bot'

**⚠️ CRITICAL:**
- Campo `telefone` é NUMERIC, não TEXT
- DEVE usar `.eq('client_id', clientId)` para multi-tenant

**🔴 RISK (Histórico):**
CLAUDE.md menciona que linha 78 usava `pg` library (serverless freeze)
**Status Atual:** VERIFICAR se foi corrigido para Supabase client

**Dependencies:** Supabase (tabela `clientes_whatsapp`)
**Multi-tenant:** ✅ CRITICAL - Filtro por client_id

**Evidência:** Mencionado em `chatbotFlow.ts:181-189`

---

## MEDIA PROCESSING (Nodes 4a-4b)

### NODE 4a: downloadMetaMedia

**Arquivo:** `src/nodes/downloadMetaMedia.ts`
**Função:** Download de media do WhatsApp (audio, image, document, sticker)

**Input:**
```typescript
(mediaId: string, accessToken: string) => Promise<Buffer>
```

**Output:**
```typescript
Buffer  // Binary data
```

**Lógica:**
1. GET `https://graph.facebook.com/{mediaId}`
2. Extract `url` from response
3. GET `url` com Authorization header
4. Return binary data as Buffer

**Riscos:**
- Network failures
- Meta API rate limits
- Large files (timeout risk)

**Dependencies:**
- Meta WhatsApp API
- axios library

**Multi-tenant:** N/A (usa access token específico do client)

**Evidência:** Mencionado em `chatbotFlow.ts:355-645`

---

### NODE 4b: transcribeAudio

**Arquivo:** `src/nodes/transcribeAudio.ts`
**Função:** Transcrever audio para texto (Whisper)

**Input:**
```typescript
(
  audioBuffer: Buffer,
  openaiApiKey: string,
  clientId: string,
  phone: string
) => Promise<TranscriptionResult>
```

**Output:**
```typescript
interface TranscriptionResult {
  text: string
  durationSeconds: number
  usage: {
    total_tokens: number
  }
}
```

**Lógica:**
1. Convert Buffer to FormData
2. Call OpenAI Whisper API
3. Log usage to `gateway_usage_logs`
4. Return transcription

**Riscos:**
- API failures (network, auth, quota)
- Audio format not supported
- Large audio files (timeout)

**Dependencies:**
- OpenAI Whisper API
- FormData library
- Usage tracking

**Multi-tenant:** ✅ Uses client-specific OpenAI key from Vault

**⚠️ ERROR HANDLING:**
chatbotFlow.ts wraps em try-catch e salva como failed message se falhar

**Evidência:** Código em `chatbotFlow.ts:392-442`

---

### NODE 4b: analyzeImage

**Arquivo:** `src/nodes/analyzeImage.ts`
**Função:** Analisar imagem com GPT-4o Vision

**Input:**
```typescript
(
  imageBuffer: Buffer,
  mimeType: string,
  openaiApiKey: string,
  clientId: string,
  phone: string,
  conversationId?: string
) => Promise<VisionResult>
```

**Output:**
```typescript
interface VisionResult {
  text: string  // Description
  model: string  // 'gpt-4o' or 'gpt-4o-mini'
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
```

**Lógica:**
1. Convert Buffer to base64
2. Call OpenAI Vision API com image_url
3. Prompt: "Descreva em português o que você vê nesta imagem"
4. Log usage
5. Return description

**Riscos:**
- API failures
- Image format not supported
- Large images (timeout, cost)

**Dependencies:**
- OpenAI GPT-4o Vision API
- Usage tracking

**Multi-tenant:** ✅ Uses client-specific OpenAI key

**⚠️ ERROR HANDLING:**
chatbotFlow.ts wraps em try-catch e salva como failed message

**Evidência:** Código em `chatbotFlow.ts:443-536`

---

### NODE 4b: analyzeDocument

**Arquivo:** `src/nodes/analyzeDocument.ts`
**Função:** Analisar documento PDF/TXT com GPT-4o

**Input:**
```typescript
(
  documentBuffer: Buffer,
  mimeType: string | undefined,
  filename: string | undefined,
  openaiApiKey: string,
  clientId: string,
  phone: string,
  conversationId?: string
) => Promise<DocumentResult>
```

**Output:**
```typescript
interface DocumentResult {
  content: string  // Summary
  model?: string
  usage?: TokenUsage
}
```

**Lógica:**
1. Parse PDF usando `pdf-parse` library
2. Se TXT, convert buffer to string
3. Call OpenAI API para summarizar
4. Log usage (se disponível)
5. Return summary

**Riscos:**
- PDF parse failures
- Large documents (timeout, cost)
- Unsupported formats

**Dependencies:**
- pdf-parse library
- OpenAI API
- Usage tracking

**Multi-tenant:** ✅ Uses client-specific OpenAI key

**⚠️ ERROR HANDLING:**
chatbotFlow.ts wraps em try-catch e salva como failed message

**Evidência:** Código em `chatbotFlow.ts:537-636`

---

## MESSAGE HANDLING (Nodes 5-8.5)

### NODE 5: normalizeMessage

**Arquivo:** `src/nodes/normalizeMessage.ts`
**Função:** Normalizar mensagem (combinar texto original + processedContent)

**Input:**
```typescript
interface NormalizeInput {
  parsedMessage: ParsedMessage
  processedContent?: string  // From media analysis
}
```

**Output:**
```typescript
interface NormalizedMessage {
  phone: string
  content: string  // Combined text + processed
  type: string
  messageId: string
}
```

**Lógica:**
- Se processedContent existe, usar ele
- Se não, usar parsedMessage.content
- Para imagens, combinar caption + description

**Riscos:** Nenhum
**Dependencies:** Nenhuma
**Multi-tenant:** N/A

**Evidência:** Código em `chatbotFlow.ts:695-705`

---

### NODE 6: checkHumanHandoffStatus

**Arquivo:** `src/nodes/checkHumanHandoffStatus.ts`
**Função:** Verificar se conversa está em atendimento humano

**Input:**
```typescript
interface CheckHandoffInput {
  phone: string
  clientId: string
}
```

**Output:**
```typescript
interface HandoffCheckResult {
  skipBot: boolean
  reason?: string
  customerStatus?: string
}
```

**Lógica:**
1. Query `clientes_whatsapp` por telefone + client_id
2. Check status
3. Se status = 'humano' ou 'transferido', skipBot = true
4. Return result

**Riscos:** Nenhum
**Dependencies:** Supabase
**Multi-tenant:** ✅ CRITICAL - Filter por client_id

**Evidência:** Código em `chatbotFlow.ts:710-717`

---

### NODE 7: pushToRedis

**Arquivo:** `src/nodes/pushToRedis.ts`
**Função:** Push mensagem para Redis (batching)

**Input:**
```typescript
interface NormalizedMessage {
  phone: string
  content: string
  ...
}
```

**Output:**
```typescript
void
```

**Lógica:**
1. Create key: `messages:{phone}`
2. RPUSH content to list
3. Set TTL (expire)

**Riscos:**
- Redis connection failures
- Graceful degradation se Redis down

**Dependencies:** Redis client
**Multi-tenant:** N/A (isolated by phone number)
**Configurável:** Pode ser desabilitado via bot_configurations

**Evidência:** Código em `chatbotFlow.ts:758-771`

---

### NODE 8: checkDuplicateMessage

**Arquivo:** `src/nodes/checkDuplicateMessage.ts`
**Função:** Detectar mensagens duplicadas (prevent duplicate AI responses)

**Input:**
```typescript
interface CheckDuplicateInput {
  phone: string
  messageContent: string
  clientId: string
}
```

**Output:**
```typescript
interface DuplicateCheckResult {
  isDuplicate: boolean
  reason?: string
  recentMessage?: {
    content: string
    createdAt: Date
    timeSinceMs: number
  }
}
```

**Lógica:**
1. Query last 3 messages from `n8n_chat_histories`
2. Check if any message matches (exact content)
3. Check if within time window (e.g., 60s)
4. Return isDuplicate = true if match found

**Riscos:** False positives (user repeats intentionally)
**Dependencies:** Supabase
**Multi-tenant:** ✅ Filter por client_id

**⚠️ CRITICAL:**
DEVE rodar ANTES de salvar mensagem (NODE 8.5)
Senão vai encontrar a mensagem que acabou de salvar!

**Evidência:** Código em `chatbotFlow.ts:796-828`

---

### NODE 8.5: saveChatMessage

**Arquivo:** `src/nodes/saveChatMessage.ts`
**Função:** Salvar mensagem no histórico (n8n_chat_histories)

**Input:**
```typescript
interface SaveMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
  clientId: string
  mediaMetadata?: {
    type: 'audio' | 'image' | 'document' | 'sticker'
    url: string
    mimeType: string
    filename: string
    size: number
  }
  wamid?: string  // WhatsApp message ID
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  errorDetails?: {
    code: string
    title: string
    message: string
  }
}
```

**Output:**
```typescript
void
```

**Lógica:**
1. INSERT into `n8n_chat_histories`
2. Campos:
   - telefone (NUMERIC)
   - message (JSONB): `{ "type": "user"|"ai", "content": "..." }`
   - client_id
   - created_at
   - wamid (opcional - para reactions)
   - media_metadata (JSONB - opcional)
   - status (opcional)
   - error_details (JSONB - opcional)

**⚠️ CRITICAL:**
- `type` vai DENTRO do JSON message, NÃO é coluna separada!
- `telefone` é NUMERIC, não TEXT

**Riscos:** Database failures
**Dependencies:** Supabase
**Multi-tenant:** ✅ CRITICAL - client_id obrigatório

**Evidência:** Código em `chatbotFlow.ts:838-846`

---

### NODE 9: batchMessages

**Arquivo:** `src/nodes/batchMessages.ts`
**Função:** Aguardar e agregar mensagens (debouncing)

**Input:**
```typescript
(
  phone: string,
  clientId: string,
  delaySeconds: number = 10  // DEFAULT 10s (not 30s!)
) => Promise<string>
```

**Output:**
```typescript
string  // Aggregated messages or single message
```

**Lógica:**
1. Check debounce key in Redis
2. Se existe (dentro da janela), wait delaySeconds
3. Fetch all messages from Redis list
4. Join com "\n\n"
5. Clear Redis list
6. Return aggregated

**Riscos:**
- Redis failures (graceful: return single message)
- User waits delaySeconds even for single message

**Dependencies:** Redis
**Multi-tenant:** N/A (isolated by phone)
**Configurável:** delaySeconds pode ser configurado por client

**⚠️ DIVERGÊNCIA:**
CLAUDE.md diz 30s default, código mostra 10s!

**Evidência:** Código em `chatbotFlow.ts:856-870`

---

## CONTEXT GATHERING (Nodes 10-11)

### NODE 10: getChatHistory

**Arquivo:** `src/nodes/getChatHistory.ts`
**Função:** Buscar histórico de conversa (últimas N mensagens)

**Input:**
```typescript
interface GetHistoryInput {
  phone: string
  clientId: string
  maxHistory: number  // Default from config
}
```

**Output:**
```typescript
interface HistoryResult {
  messages: ChatMessage[]  // Array of { role: 'user'|'assistant', content: string }
  stats: {
    messageCount: number
    totalPromptSize: number
    maxHistoryRequested: number
    durationMs: number
  }
}
```

**Lógica:**
1. Query `n8n_chat_histories` ORDER BY created_at DESC LIMIT maxHistory
2. Filter por telefone + client_id
3. Convert JSONB message to ChatMessage format
4. Reverse array (oldest first)
5. Calculate stats
6. Return

**Riscos:**
- Large history (token/cost overhead)
- Slow query for high-volume contacts

**Dependencies:** Supabase
**Multi-tenant:** ✅ CRITICAL - Filter por client_id

**⚠️ IMPORTANT:**
`type` is extracted from JSONB: `message->>'type'`

**Evidência:** Código em `chatbotFlow.ts:932-1003`

---

### NODE 11: getRAGContext

**Arquivo:** `src/nodes/getRAGContext.ts:1-86` ✅ LIDO

**Função:** Buscar documentos relevantes via pgvector

**Input:**
```typescript
interface GetRAGContextInput {
  query: string
  clientId: string
  openaiApiKey?: string
  similarityThreshold?: number  // Default: 0.7
  maxResults?: number           // Default: 5
}
```

**Output:**
```typescript
string  // Concatenated documents
```

**Lógica:**
1. Get config from bot_configurations:
   - `rag:similarity_threshold` (default 0.7)
   - `rag:max_results` (default 5)
2. Generate embedding da query (OpenAI)
3. Call RPC `match_documents` com:
   - query_embedding
   - match_threshold
   - match_count
   - filter_client_id (🔐 multi-tenant)
4. Format results:
   ```
   [Documento 1 - Relevância: 85.3%]
   Content here...

   ---

   [Documento 2 - Relevância: 78.1%]
   Content here...
   ```
5. Return concatenated

**Riscos:**
- OpenAI embedding failures
- No documents found (returns empty string)
- Cost per embedding call

**Dependencies:**
- OpenAI Embeddings API
- Supabase RPC `match_documents`
- bot_configurations table

**Multi-tenant:** ✅ CRITICAL - filter_client_id parameter

**Evidência:** Arquivo completo lido `src/nodes/getRAGContext.ts:1-86`

---

## AI GENERATION (Nodes 12)

### NODE 12: generateAIResponse

**Arquivo:** `src/nodes/generateAIResponse.ts:1-200+` ✅ PARCIALMENTE LIDO

**Função:** Gerar resposta AI (main AI call)

**Input:**
```typescript
interface GenerateAIResponseInput {
  message: string
  chatHistory: ChatMessage[]
  ragContext: string
  customerName: string
  config: ClientConfig
  greetingInstruction?: string
  includeDateTimeInfo?: boolean  // Fast Track
  enableTools?: boolean          // Fast Track
  conversationId?: string
  phone?: string
}
```

**Output:**
```typescript
interface AIResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  provider: 'openai' | 'groq'
  model: string
  wasCached?: boolean
  wasFallback?: boolean
  ...
}
```

**Lógica:**
1. Build system prompt:
   - Use config.systemPrompt ou DEFAULT_SYSTEM_PROMPT (linhas 8-77)
   - Inject RAG context se disponível
   - Inject greeting instruction se fornecido
   - Add date/time se includeDateTimeInfo = true
2. Build messages array:
   - System message
   - Chat history
   - User message atual
3. Build tools array se enableTools = true:
   - `transferir_atendimento` (human handoff)
   - `buscar_documento` (document search)
   - `enviar_resposta_em_audio` (TTS)
4. Call Direct AI Client:
   ```typescript
   const result = await callDirectAI({
     clientId: config.id,
     clientConfig: config,
     messages,
     tools,
     settings: { temperature, maxTokens, ... }
   })
   ```
5. Return standardized AIResponse

**Tools Definidos:**

**1. transferir_atendimento** (linhas 98-115)
```typescript
{
  name: "transferir_atendimento",
  description: "SOMENTE use quando usuário EXPLICITAMENTE solicitar humano",
  parameters: {
    motivo: string  // Motivo da transferência
  }
}
```

**2. buscar_documento** (linhas 117-142)
```typescript
{
  name: "buscar_documento",
  description: "Busca documentos na base de conhecimento",
  parameters: {
    query: string,
    document_type: 'any' | 'catalog' | 'manual' | 'faq' | 'image'
  }
}
```

**3. enviar_resposta_em_audio** (linhas 144-166)
```typescript
{
  name: "enviar_resposta_em_audio",
  description: "Converte resposta em áudio (TTS)",
  parameters: {
    texto_para_audio: string
  }
}
```

**⚠️ SUBAGENTE DESATIVADO:**
Linhas 79-96 comentam tool `subagente_diagnostico` (não implementado)

**DEFAULT_SYSTEM_PROMPT:**
Linhas 8-77: Prompt padrão do Luis Fernando Boff (engenheiro, energia solar, dados, dev)

**Riscos:**
- AI API failures
- Budget exceeded (checked before call)
- Tool call hallucinations
- High costs para modelos grandes

**Dependencies:**
- Direct AI Client
- Vault credentials
- Budget tracking

**Multi-tenant:** ✅ Via Direct AI Client

**Evidência:** Arquivo parcial lido `src/nodes/generateAIResponse.ts:1-200`

---

## FORMAT & SEND (Nodes 13-14)

### NODE 13: formatResponse

**Arquivo:** `src/nodes/formatResponse.ts`
**Função:** Split resposta em múltiplas mensagens + strip tool calls

**Input:**
```typescript
string  // AI response
```

**Output:**
```typescript
string[]  // Array of messages
```

**Lógica:**
1. Strip tool calls (regex):
   ```typescript
   text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
   ```
2. Split por `\n\n` (double newline)
3. Filter empty messages
4. Return array

**Riscos:**
- False positives em regex (texto legítimo com < >)
- User-visible tool calls se regex falhar

**Dependencies:** Nenhuma
**Multi-tenant:** N/A

**⚠️ CRITICAL:**
Tool calls DEVEM ser removidos antes de enviar ao WhatsApp!

**Evidência:** CLAUDE.md menciona regex em `formatResponse.ts:7-10`

---

### NODE 14: Send and Save Messages (Interleaved)

**Função:** Enviar mensagens para WhatsApp E salvar no banco (intercalado)

**Lógica (em chatbotFlow.ts):**
```typescript
for (let i = 0; i < formattedMessages.length; i++) {
  // 1. Send to WhatsApp API
  const { messageId } = await sendTextMessage(phone, content, config)

  // 2. Save to DB IMMEDIATELY
  await saveChatMessage({
    phone,
    message: content,
    type: 'ai',
    clientId: config.id,
    wamid: messageId,
    status: 'sent'
  })

  // 3. Delay before next (if not last)
  if (i < formattedMessages.length - 1) {
    await new Promise(resolve => setTimeout(resolve, messageDelayMs))  // 2s default
  }
}
```

**⚠️ CRITICAL PATTERN:**
- Send → Save → Delay
- **NÃO** Send all → Save all (causa race condition)
- Garante mensagens disponíveis no histórico em 2-4s

**Delay Default:** 2000ms (2s)
**Configurável:** config.settings.messageDelayMs

**Riscos:**
- WhatsApp API failures
- Database save failures
- Message order inconsistency se algum falhar

**Dependencies:**
- WhatsApp Business API (sendTextMessage)
- Supabase (saveChatMessage)

**Multi-tenant:** ✅ Via config

**Evidência:** Código em `chatbotFlow.ts:1534-1630`

---

## TOOL HANDLERS (Nodes 15)

### NODE 15: handleHumanHandoff

**Arquivo:** `src/nodes/handleHumanHandoff.ts`
**Função:** Transferir para atendimento humano

**Lógica:**
1. Update status in `clientes_whatsapp`:
   ```sql
   UPDATE clientes_whatsapp
   SET status = 'transferido'
   WHERE telefone = ? AND client_id = ?
   ```
2. Generate conversation summary (last messages)
3. Send email notification via Gmail SMTP:
   - To: config.notificationEmail
   - Subject: "Nova transferência - WhatsApp"
   - Body: Phone, name, summary
4. Log action

**Riscos:**
- Email delivery failures
- SMTP auth failures
- Customer continues messaging (bot paused)

**Dependencies:**
- Supabase
- Nodemailer (Gmail SMTP)
- config.notificationEmail

**Multi-tenant:** ✅ Update filtered by client_id

**Evidência:** Código em `chatbotFlow.ts:1303-1334`

---

### NODE 15.5: handleDocumentSearchToolCall

**Arquivo:** `src/nodes/handleDocumentSearchToolCall.ts`
**Função:** Buscar e enviar documentos da base de conhecimento

**Lógica:**
1. Parse tool call arguments:
   - query (search term)
   - document_type (any/catalog/manual/faq/image)
2. Search in `documents` table:
   - Semantic search via embeddings
   - Filter by document_type if specified
   - Filter by client_id
3. For each document:
   - If text file (.txt, .md): aggregate content (return as text)
   - If media file (PDF, image): send via WhatsApp API
4. Save messages to history
5. Return result:
   ```typescript
   {
     success: boolean
     documentsFound: number
     documentsSent: number  // Media attachments
     filesSent: string[]
     textFilesFound?: number  // Text files for follow-up AI
     message?: string         // Aggregated text content
   }
   ```

**Follow-up AI (NODE 15.6):**
Se encontrou text files, chatbotFlow faz segunda chamada AI com document content:
```typescript
const followUpResponse = await generateAIResponse({
  message: batchedContent,
  chatHistory: chatHistory2,
  ragContext: documentSearchResult.message,  // ← Document content
  customerName: parsedMessage.name,
  config,
  enableTools: false  // No tools in follow-up
});
```

**Riscos:**
- No documents found
- WhatsApp API failures (media send)
- Large text files (token overflow)

**Dependencies:**
- Supabase (documents table)
- WhatsApp API (send document/image)
- OpenAI (embeddings for search)

**Multi-tenant:** ✅ Filter by client_id

**Evidência:** Código em `chatbotFlow.ts:1340-1430`

---

### NODE 15.7: handleAudioToolCall (TTS)

**Arquivo:** Provavelmente `src/handlers/handleAudioToolCall.ts`
**Função:** Converter texto em áudio e enviar

**Lógica:**
1. Parse tool arguments:
   - texto_para_audio
2. Call OpenAI TTS API:
   - Model: tts-1 ou tts-1-hd
   - Voice: config voice (alloy/echo/fable/onyx/nova/shimmer)
3. Upload audio to Supabase Storage
4. Send audio via WhatsApp API
5. Save message to history com media_metadata
6. Log TTS usage
7. Return result:
   ```typescript
   {
     success: boolean
     sentAsAudio: boolean
     messageId?: string
   }
   ```

**Fallback:**
Se TTS falhar, envia como texto normal

**Riscos:**
- OpenAI TTS failures
- Large texts (TTS limits)
- WhatsApp audio format compatibility
- Upload failures

**Dependencies:**
- OpenAI TTS API
- Supabase Storage
- WhatsApp API
- TTS usage tracking

**Multi-tenant:** ✅ Client-specific voice config

**Evidência:** Código em `chatbotFlow.ts:1436-1495`

---

## AUXILIARY NODES

### checkContinuity

**Arquivo:** `src/nodes/checkContinuity.ts`
**Função:** Detectar se é nova conversa (continuity check)

**Output:**
```typescript
{
  isNewConversation: boolean
  hoursSinceLastMessage: number
  greetingInstruction: string  // "" or "Greeting needed"
}
```

**Lógica:**
- Check last message timestamp
- If > X hours, consider new conversation
- Return greeting instruction se nova

**Evidência:** Código em `chatbotFlow.ts:1042-1065`

---

### classifyIntent

**Arquivo:** `src/nodes/classifyIntent.ts`
**Função:** Classificar intenção do usuário (FAQ, support, sales, etc.)

**Output:**
```typescript
{
  intent: string
  confidence: 'high' | 'medium' | 'low'
  usedLLM: boolean
}
```

**Evidência:** Código em `chatbotFlow.ts:1071-1096`

---

### detectRepetition

**Arquivo:** `src/nodes/detectRepetition.ts`
**Função:** Detectar se resposta AI é muito similar às anteriores

**Output:**
```typescript
{
  isRepetition: boolean
  similarityScore: number
}
```

**Trigger Regeneration:**
Se isRepetition = true, chatbotFlow regenera com temperature aumentada

**Evidência:** Código em `chatbotFlow.ts:1171-1260`

---

### fastTrackRouter

**Arquivo:** `src/nodes/fastTrackRouter.ts`
**Função:** Detectar FAQs e usar canonical queries (cache-friendly)

**Output:**
```typescript
{
  shouldFastTrack: boolean
  reason: string
  topic?: string
  similarity?: number
  matchedCanonical?: string
  matchedExample?: string
  matchedKeyword?: string
  catalogSize: number
  routerModel: string
}
```

**Lógica:**
- Match user query contra FAQ catalog
- Return canonical query se match
- chatbotFlow usa canonical para cache hits

**Evidência:** Código em `chatbotFlow.ts:883-913`

---

### checkInteractiveFlow

**Arquivo:** `src/nodes/checkInteractiveFlow.ts`
**Função:** Check e executar interactive flows (visual builder)

**Input:**
```typescript
{
  clientId: string
  phone: string
  content: string
  isInteractiveReply: boolean
  interactiveResponseId?: string
}
```

**Output:**
```typescript
{
  flowExecuted: boolean
  flowName?: string
}
```

**Trigger:** status = 'fluxo_inicial'

**Evidência:** Código em `chatbotFlow.ts:277-292`

---

### captureLeadSource

**Arquivo:** `src/nodes/captureLeadSource.ts`
**Função:** Capturar lead source (Meta Ads referral)

**Output:**
```typescript
{
  captured: boolean
  sourceType: string
  automationsTriggered: number
}
```

**Integração:** CRM module

**Evidência:** Código em `chatbotFlow.ts:222-240`

---

### updateCRMCardStatus

**Arquivo:** `src/nodes/updateCRMCardStatus.ts`
**Função:** Atualizar status do card CRM

**Events:**
- message_received
- transfer_human
- ...

**Evidência:** Código em `chatbotFlow.ts:243-252` e `1314-1326`

---

## SUMMARY

**Total de Nodes Identificados:** 39 arquivos
**Nodes Ativos no Flow:** 29+ (incluindo sub-nodes)
**Nodes Auxiliares:** 10+

**Padrões Observados:**
- ✅ Pure functions (input → output)
- ✅ Multi-tenant aware (client_id em queries)
- ✅ Error handling (try-catch em pontos críticos)
- ✅ Configurável (bot_configurations)
- ✅ Graceful degradation (Redis optional)

**Riscos Principais:**
- 🔴 pg library em checkOrCreateCustomer (verificar se corrigido)
- ⚠️ Tool call regex em formatResponse (false positives?)
- ⚠️ Media processing timeouts (large files)
- ⚠️ AI costs (sem optimistic caching em alguns casos)

---

**FIM DO CATÁLOGO DE NODES**
