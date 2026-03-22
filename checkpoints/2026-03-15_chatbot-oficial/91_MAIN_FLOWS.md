# Main User Flows

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Análise:** Baseada em código-fonte + arquitetura

---

## 📊 Overview

Este documento mapeia os **fluxos principais** do sistema do ponto de vista do usuário final (WhatsApp) e admin (Dashboard).

**Flows Cobertos:**
1. WhatsApp User: First Contact → Bot Response
2. WhatsApp User: Media Message (Audio/Image/PDF)
3. WhatsApp User: Human Handoff
4. WhatsApp User: Interactive Flow Execution
5. Admin: Upload Knowledge (RAG)
6. Admin: Configure Bot Settings
7. Admin: Create Message Template
8. Admin: View Analytics
9. Webhook: Meta WhatsApp → Backend
10. Webhook: Stripe Payment → Backend

---

## 🔄 Flow 1: WhatsApp User - First Contact

**Scenario:** Usuário novo manda primeira mensagem para número WhatsApp da empresa.

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant M as Meta WhatsApp API
    participant W as Webhook /api/webhook/received
    participant CF as chatbotFlow (14 nodes)
    participant S as Supabase
    participant AI as Groq/OpenAI
    participant R as Redis (optional)

    U->>M: Send message "Olá"
    M->>W: POST webhook (message event)
    W->>W: Verify signature (META_APP_SECRET)
    W->>CF: Call processChatbotMessage()

    Note over CF: NODE 1: Filter Status Updates
    CF->>CF: Check message.type === 'text'

    Note over CF: NODE 2: Parse Message
    CF->>CF: Extract phone, content, wamid

    Note over CF: NODE 3: Check/Create Customer
    CF->>S: Query clientes_whatsapp
    alt Customer exists
        S-->>CF: Return customer (status='bot')
    else Customer doesn't exist
        S-->>CF: Create new customer
        CF->>CF: Trigger CRM webhook (opcional)
    end

    Note over CF: NODE 5: Normalize Message
    CF->>CF: Trim, lowercase, remove accents

    Note over CF: NODE 6: Check Human Handoff Status
    alt status === 'humano' or 'transferido'
        CF->>S: Save user message only
        CF-->>U: (No bot response)
    end

    Note over CF: NODE 7: Push to Redis
    CF->>R: Add message to batch queue
    R-->>CF: OK (or skip if Redis down)

    Note over CF: NODE 8: Check Duplicate
    CF->>S: Check last 30s for identical message
    alt Duplicate found
        CF-->>W: Skip processing
    end

    Note over CF: NODE 8.5: Save User Message
    CF->>S: INSERT into n8n_chat_histories
    S-->>CF: Message saved (available in 2-4s)

    Note over CF: NODE 9: Batch Messages (10s default)
    CF->>R: Check if other messages pending
    alt Batch window active
        CF-->>W: Skip AI response (wait for batch)
    end

    Note over CF: NODE 9.5: Fast Track Router
    CF->>S: Check FAQ cache for this exact question
    alt Cache hit
        CF-->>CF: Return cached answer (skip AI)
    end

    Note over CF: NODEs 10 & 11 (parallel)
    par Get Chat History
        CF->>S: SELECT last 15 messages
        S-->>CF: Return history
    and Get RAG Context
        CF->>S: Vector search in documents
        S-->>CF: Return top 5 chunks (if similarity > 0.8)
    end

    Note over CF: NODE 12: Generate AI Response
    CF->>AI: Call Groq (Llama 3.3 70B)
    Note over AI: System prompt + RAG context + Chat history
    AI-->>CF: Response: "Olá! Como posso ajudar?"

    alt AI calls tool (transferir_atendimento)
        AI-->>CF: Tool call detected
        CF->>CF: Execute tool (update status to 'humano')
        CF->>S: Update customer status
        CF->>CF: Send email to admin (Gmail SMTP)
        CF-->>U: "Transferindo você para um atendente..."
        Note over CF: STOP - no more bot messages
    end

    Note over CF: NODE 13: Format Response
    CF->>CF: Split on \n\n (multi-message)
    CF->>CF: Strip tool calls from text

    Note over CF: NODE 14: Send & Save Messages (intercalado)
    loop For each message chunk
        CF->>M: Send text message via API
        M-->>U: Deliver message
        M-->>CF: Return wamid
        CF->>S: INSERT message to n8n_chat_histories
        Note over S: Message available in 2-4s
        CF->>CF: Delay 2s (avoid rate limit)
    end

    CF-->>W: Success
    W-->>M: 200 OK
```

**Duration:** ~3-8 seconds (batching can add 10s)

**Key Points:**
- Customer auto-created on first contact
- Messages saved **immediately after sending** (prevents race condition)
- Batching prevents duplicate AI responses for rapid messages
- Fast Track Router uses FAQ cache to skip AI entirely

---

## 🎙️ Flow 2: WhatsApp User - Audio Message

**Scenario:** Usuário envia mensagem de áudio (voz).

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant M as Meta WhatsApp API
    participant W as Webhook
    participant CF as chatbotFlow
    participant DM as downloadMedia()
    participant OAI as OpenAI Whisper
    participant FFmpeg as FFmpeg
    participant S as Supabase Storage

    U->>M: Send audio message (OGG format)
    M->>W: POST webhook (message.type='audio')
    W->>CF: processChatbotMessage()

    Note over CF: NODE 4: Download Media
    CF->>DM: downloadMedia(mediaId)
    DM->>M: GET /v18.0/{mediaId} (fetch URL)
    M-->>DM: Return media URL
    DM->>M: Download audio file (buffer)
    M-->>DM: Audio binary (OGG)

    Note over DM: Convert OGG → MP3 (Whisper requires MP3/WAV)
    DM->>FFmpeg: Convert with fluent-ffmpeg
    FFmpeg-->>DM: MP3 buffer

    DM->>S: Upload to Supabase Storage (bucket: media)
    S-->>DM: Return public URL

    DM->>OAI: POST /v1/audio/transcriptions
    Note over OAI: Model: whisper-1, Language: pt
    OAI-->>DM: Transcription: "Quero agendar uma consulta"

    DM-->>CF: Return transcription text

    Note over CF: Continue normal flow (NODE 5 onwards)
    CF->>CF: Replace message content with transcription
    CF->>CF: Save user message: "🎤 Quero agendar uma consulta"
    CF->>CF: Generate AI response...
    CF->>U: "Claro! Para qual dia você gostaria?"

    alt Transcription fails
        OAI-->>DM: Error (audio too noisy, etc.)
        DM-->>CF: Throw error
        CF->>S: Save FAILED message
        Note over S: message: "🎤 [Áudio não pôde ser transcrito]"<br/>status: "failed"
        CF-->>U: (No bot response - error logged)
    end
```

**Duration:** ~5-15 seconds (audio processing)

**Key Points:**
- Audio automatically converted OGG → MP3
- Whisper transcription in Portuguese
- If transcription fails, message saved as FAILED (no silent failure)
- Transcribed text treated as normal message

**Supported Formats:** OGG (WhatsApp default), MP3, WAV, M4A

---

## 📸 Flow 3: WhatsApp User - Image with Question

**Scenario:** Usuário envia imagem com legenda "O que é isso?"

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant M as Meta WhatsApp API
    participant CF as chatbotFlow
    participant DM as downloadMedia()
    participant OAI as OpenAI Vision (GPT-4o)
    participant S as Supabase Storage

    U->>M: Send image + caption "O que é isso?"
    M->>CF: POST webhook (message.type='image')

    Note over CF: NODE 4: Process Media
    CF->>DM: downloadMedia(mediaId, caption)
    DM->>M: Fetch image URL + download
    M-->>DM: Image binary (JPEG/PNG)
    DM->>S: Upload to Supabase Storage
    S-->>DM: Return public URL

    DM->>OAI: Call GPT-4o Vision API
    Note over OAI: Prompt: "Descreva esta imagem. Pergunta do usuário: O que é isso?"<br/>Image URL: https://...
    OAI-->>DM: "Esta é uma foto de um cachorro da raça Golden Retriever..."

    DM-->>CF: Return vision response
    CF->>CF: Append to message: "O que é isso? [Imagem: Golden Retriever...]"

    CF->>CF: Continue normal flow (AI response)
    CF->>U: "Esta é uma foto de um cachorro..."
```

**Duration:** ~3-8 seconds (vision API)

**Key Points:**
- Image uploaded to Supabase Storage (permanent)
- GPT-4o Vision describes image in Portuguese
- Caption + image description merged for AI context

**Supported Formats:** JPEG, PNG, WEBP

---

## 👤 Flow 4: Human Handoff

**Scenario:** Usuário pede para falar com humano.

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant CF as chatbotFlow
    participant AI as Groq/OpenAI
    participant S as Supabase
    participant G as Gmail SMTP
    participant A as Admin Email

    U->>CF: "Quero falar com atendente humano"

    Note over CF: NODEs 1-11 (normal processing)
    CF->>AI: Generate AI response (with tools)

    Note over AI: Tool: transferir_atendimento available
    AI->>AI: Detect intent → call tool
    AI-->>CF: Tool call: transferir_atendimento(motivo="Solicitação direta")

    Note over CF: Execute tool
    CF->>S: UPDATE clientes_whatsapp SET status='humano'
    CF->>S: SELECT last 10 messages (conversation summary)

    CF->>G: Send email to admin
    Note over G: Subject: "🔔 Transferência de Atendimento"<br/>Body: Summary of conversation<br/>Customer: +5554999...<br/>Reason: Solicitação direta
    G->>A: Email delivered

    CF->>U: "Você está sendo transferido para um de nossos atendentes. Em breve alguém irá te responder."

    Note over CF: STOP - Bot stops responding
    Note over S: Customer status = 'humano'

    loop Admin responds manually
        A->>U: Manual WhatsApp messages (via WhatsApp Web or API)
        Note over CF: Bot does NOT auto-respond (status='humano')
    end

    alt Admin finishes conversation
        A->>S: UPDATE status='bot' (via dashboard or manual)
        Note over CF: Bot resumes auto-responses
    end
```

**Duration:** ~2-5 seconds

**Key Points:**
- AI autonomously decides when to transfer (via tool call)
- Email sent to admin with conversation summary
- Bot immediately stops responding (status='humano')
- Admin must manually reactivate bot (status='bot')

**Tool Detection:** AI detects keywords like "atendente", "humano", "pessoa real", "gerente"

---

## 📋 Flow 5: Interactive Flow Execution

**Scenario:** Cliente configurou fluxo interativo (ex: formulário de agendamento).

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant M as Meta WhatsApp API
    participant CF as chatbotFlow
    participant IFE as Interactive Flow Executor
    participant S as Supabase
    participant CRM as CRM Module (optional)

    U->>M: Send message "quero agendar"
    M->>CF: POST webhook

    Note over CF: NODE 3: Check Customer Status
    CF->>S: SELECT status FROM clientes_whatsapp
    S-->>CF: status = 'bot' (normal)

    CF->>CF: Trigger keyword detected: "agendar"
    CF->>S: UPDATE status='fluxo_inicial'

    CF->>IFE: checkInteractiveFlow()
    IFE->>S: SELECT active flow for client + keyword
    S-->>IFE: Flow: "Agendamento de Consulta"

    IFE->>M: Send interactive message (buttons)
    M->>U: Display buttons: ["Manhã", "Tarde", "Noite"]

    U->>M: Click button "Manhã"
    M->>CF: POST webhook (message.type='interactive')

    CF->>IFE: Handle response (step 1 completed)
    IFE->>S: INSERT flow_executions (current_step=2)

    IFE->>M: Send next question: "Qual dia?"
    M->>U: Display calendar picker

    U->>M: Select date: 2026-03-20
    M->>CF: POST webhook

    IFE->>IFE: All steps completed
    IFE->>S: UPDATE flow_executions (status='completed')
    IFE->>S: UPDATE clientes_whatsapp (status='bot')

    IFE->>CRM: Create CRM card (if configured)
    CRM->>S: INSERT crm_cards (type='agendamento', data={...})

    IFE->>M: Send confirmation message
    M->>U: "Agendamento confirmado para 20/03 pela manhã!"

    Note over CF: Resume normal bot flow
```

**Duration:** Variable (depends on user interaction speed)

**Key Points:**
- Customer status changes to 'fluxo_inicial' during execution
- Bot does NOT respond while flow is active
- Flow execution tracked in `flow_executions` table
- Can integrate with CRM (create cards, tasks, etc.)

**Flow Types:** Buttons, Lists, Calendar, Forms (via WhatsApp Interactive Messages)

---

## 📚 Flow 6: Admin - Upload Knowledge (RAG)

**Scenario:** Admin sobe PDF para knowledge base.

```mermaid
sequenceDiagram
    participant A as Admin (Dashboard)
    participant D as /dashboard/knowledge
    participant API as /api/knowledge/upload
    participant S as Supabase Storage
    participant PDF as PDF.js Parser
    participant Chunk as Semantic Chunker
    participant OAI as OpenAI Embeddings
    participant DB as Supabase (documents table)

    A->>D: Upload PDF file (500 KB)
    D->>API: POST /api/knowledge/upload (FormData)

    API->>API: Validate file (max 10MB, PDF/TXT only)
    API->>S: Upload to Supabase Storage (bucket: knowledge)
    S-->>API: Return file URL

    API->>PDF: Parse PDF (extract text)
    PDF-->>API: Full text (10,000 words)

    API->>Chunk: Semantic chunking
    Note over Chunk: Chunk size: 500 tokens<br/>Overlap: 20%
    Chunk-->>API: 25 chunks

    loop For each chunk
        API->>OAI: Generate embedding (text-embedding-3-small)
        OAI-->>API: Vector (1536 dimensions)
        API->>DB: INSERT into documents (content, embedding, client_id, metadata)
    end

    DB-->>API: All chunks saved
    API-->>D: Success (25 chunks created)
    D->>A: Show success message + chunk count
```

**Duration:** ~10-60 seconds (depends on file size)

**Key Points:**
- Maximum 10MB per file
- Automatic chunking with overlap (prevents context loss)
- Embeddings generated via OpenAI (text-embedding-3-small)
- Chunks searchable via vector similarity (pgvector)

**Supported Formats:** PDF, TXT

**Chunk Metadata:** Includes page number, file name, upload date

---

## ⚙️ Flow 7: Admin - Configure Bot Settings

**Scenario:** Admin altera system prompt do chatbot.

```mermaid
sequenceDiagram
    participant A as Admin (Dashboard)
    participant D as /dashboard/settings
    participant API as /api/clients/{id}
    participant S as Supabase (clients table)
    participant Cache as Config Cache (5min TTL)
    participant Bot as chatbotFlow

    A->>D: Edit system_prompt textarea
    A->>D: Click "Save"
    D->>API: PATCH /api/clients/{clientId}
    Note over API: Body: { system_prompt: "Você é um assistente..." }

    API->>API: Validate permissions (client_admin or admin)
    API->>S: UPDATE clients SET system_prompt=... WHERE id=...
    S-->>API: Updated

    API->>Cache: Invalidate cache for this client
    Cache-->>API: Cache cleared

    API-->>D: Success
    D->>A: Show toast: "Configurações salvas!"

    Note over Bot: Next message from user
    Bot->>Cache: getBotConfig(clientId)
    Cache->>S: Cache miss → fetch from DB
    S-->>Cache: New system_prompt
    Cache-->>Bot: Return fresh config

    Bot->>Bot: Use new system_prompt in AI call
```

**Duration:** ~1-2 seconds + 5min cache TTL

**Configurable Settings:**
- `system_prompt` (AI personality)
- `primaryModelProvider` (groq | openai)
- `temperature` (0.0-2.0)
- `messageDelayMs` (delay between messages)
- `batchWindowMs` (message batching window)
- Vault credentials (OpenAI/Groq API keys)

**Cache:** 5-minute TTL to reduce DB queries. Invalidated on update.

---

## 📊 Flow 8: Admin - View Analytics

**Scenario:** Admin visualiza analytics de uso.

```mermaid
sequenceDiagram
    participant A as Admin (Dashboard)
    participant D as /dashboard/analytics
    participant API as /api/analytics
    participant S as Supabase (gateway_usage_logs)

    A->>D: Access /dashboard/analytics
    D->>API: GET /api/analytics?clientId=... &period=7d

    API->>API: Validate client_id (RLS or manual filter)
    API->>S: Query gateway_usage_logs
    Note over S: SELECT model_used, SUM(total_tokens), SUM(cost_brl)<br/>WHERE client_id=... AND created_at > NOW() - 7 days<br/>GROUP BY model_used

    S-->>API: Results: [<br/> {model: 'llama-3.3-70b', tokens: 150000, cost: 2.50},<br/> {model: 'gpt-4o-mini', tokens: 50000, cost: 1.20}<br/>]

    API->>API: Calculate aggregates
    Note over API: Total tokens: 200,000<br/>Total cost: R$ 3.70<br/>Avg cost/request: R$ 0.05

    API-->>D: Return JSON
    D->>D: Render charts (Recharts)
    D->>A: Display:
    Note over D: - Line chart (tokens over time)<br/>- Pie chart (cost by model)<br/>- Table (requests by endpoint)
```

**Duration:** ~500ms-2s

**Analytics Available:**
- **Tokens:** Input, output, total (per model)
- **Cost:** BRL, USD (per model)
- **Requests:** Count, success rate
- **Latency:** Avg response time (ms)
- **Errors:** Count, error types

**Filters:** Date range, model, endpoint

**Tables Used:** `gateway_usage_logs`, `client_budgets`, `client_usage_stats`

---

## 🌐 Flow 9: Webhook - Meta WhatsApp

**Scenario:** Meta envia webhook para verificação ou entrega de mensagem.

```mermaid
sequenceDiagram
    participant M as Meta WhatsApp API
    participant W as /api/webhook/received
    participant V as verifyWebhookSignature()
    participant F as filterStatusUpdates()
    participant CF as chatbotFlow

    Note over M,W: VERIFICATION (one-time setup)
    M->>W: GET /api/webhook/received?hub.mode=subscribe &hub.challenge=... &hub.verify_token=...
    W->>W: Check hub.verify_token === META_VERIFY_TOKEN
    alt Token matches
        W-->>M: Return hub.challenge (plain text)
        Note over M: Webhook verified ✅
    else Token mismatch
        W-->>M: 403 Forbidden
    end

    Note over M,W: MESSAGE EVENT (ongoing)
    M->>W: POST /api/webhook/received
    Note over M: Body: {entry: [{changes: [{value: {messages: [...]}}]}]}

    W->>V: Verify X-Hub-Signature-256
    V->>V: Compute HMAC-SHA256(body, META_APP_SECRET)
    alt Signature valid
        V-->>W: OK
    else Signature invalid
        V-->>W: 400 Bad Request
        W-->>M: 400 (Meta will retry)
    end

    W->>F: filterStatusUpdates(payload)
    F->>F: Check if status update (message.status)
    alt Status update (sent, delivered, read)
        F-->>W: null (skip processing)
        W-->>M: 200 OK
    else New message
        F-->>W: Return parsed message
    end

    W->>CF: await processChatbotMessage(...)
    Note over CF: Full 14-node pipeline
    CF-->>W: Success/failure

    W-->>M: 200 OK (always!)
    Note over W: Even if processing fails,<br/>return 200 to prevent retries
```

**Duration:** ~3-15 seconds (depends on chatbot pipeline)

**Key Points:**
- Signature verification REQUIRED (prevent tampering)
- Status updates (delivered, read) are IGNORED
- Processing errors return 200 OK (to prevent Meta retries)
- Webhook MUST respond within 30s (Vercel timeout)

**Webhook URL Format:** `https://chat.luisfboff.com/api/webhook/received`

---

## 💳 Flow 10: Webhook - Stripe Payment

**Scenario:** Cliente compra produto na loja, Stripe envia webhook.

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant Store as /store/{clientSlug}
    participant Stripe as Stripe Checkout
    participant W as /api/stripe/webhooks
    participant V as Webhook Signature Verify
    participant S as Supabase
    participant Email as Email Service (optional)

    U->>Store: Click "Comprar" button
    Store->>Stripe: Create Checkout Session
    Stripe-->>Store: Return session URL
    Store->>U: Redirect to Stripe Checkout

    U->>Stripe: Enter payment details + submit
    Stripe->>Stripe: Process payment
    Stripe->>W: POST webhook (event: checkout.session.completed)

    W->>V: Verify Stripe-Signature header
    V->>V: Verify with STRIPE_WEBHOOK_SECRET
    alt Signature valid
        V-->>W: OK
    else Invalid
        W-->>Stripe: 400 Bad Request
    end

    W->>W: Parse event data
    Note over W: {<br/> customer_email: "user@example.com",<br/> amount_total: 9900 (R$ 99.00),<br/> metadata: {client_id: "...", product_id: "..."}<br/>}

    W->>S: INSERT into purchases table
    S-->>W: Purchase created

    W->>S: UPDATE stripe_products SET units_sold += 1
    W->>S: UPDATE clients SET balance += 99.00 (if applicable)

    W->>Email: Send purchase confirmation
    Email->>U: Email: "Obrigado pela compra!"

    W-->>Stripe: 200 OK

    Note over U: Access granted to purchased product
```

**Duration:** ~1-3 seconds

**Webhook Types:**
- `checkout.session.completed` → Purchase confirmed
- `customer.subscription.created` → Subscription started
- `invoice.payment_succeeded` → Recurring payment
- `account.updated` → Stripe Connect account status change

**Webhooks:**
- **V1 (Thin):** `/api/stripe/webhooks` (client purchases)
- **V2 (Connect):** `/api/stripe/webhooks/connect` (seller account events)
- **Platform:** `/api/stripe/platform/webhooks` (platform-level billing)

**Security:** Signature verification with `STRIPE_WEBHOOK_SECRET`

---

## 📈 Flow Metrics

| Flow | Avg Duration | Bottleneck | Optimization |
|------|-------------|------------|--------------|
| First Contact | 3-8s | AI response (2-5s) | Fast Track Router |
| Audio Message | 5-15s | Whisper API (3-10s) | Pre-download audio |
| Image Message | 3-8s | Vision API (2-5s) | Cache common images |
| Human Handoff | 2-5s | Email send (1-2s) | Async email queue |
| Interactive Flow | Variable | User interaction | N/A |
| RAG Upload | 10-60s | Embedding generation | Batch embeddings |
| Config Update | 1-2s + 5min cache | Cache TTL | Manual invalidation endpoint |
| Analytics | 500ms-2s | DB query | Materialized views |
| Meta Webhook | 3-15s | Full chatbot pipeline | N/A |
| Stripe Webhook | 1-3s | DB writes | Batch updates |

---

## 🎯 Key Takeaways

1. **All flows are asynchronous** - Webhooks return 200 OK before processing completes
2. **Intercalado pattern** - Messages sent and saved immediately (prevents race conditions)
3. **Batching prevents duplicates** - 10s window for grouping rapid messages
4. **Fast Track Router** - FAQ cache skips AI entirely for known questions
5. **Graceful degradation** - Redis optional, media processing errors saved (not silent)
6. **Multi-tenant isolation** - ALL queries filtered by client_id (RLS + code)
7. **Service role bypasses RLS** - Backend must manually filter by client_id

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Baseado em análise de código-fonte + arquitetura*
