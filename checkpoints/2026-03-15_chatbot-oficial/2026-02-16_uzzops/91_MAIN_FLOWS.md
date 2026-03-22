# MAIN FLOWS - ChatBot-Oficial

**Gerado em:** 2026-02-16
**Fonte:** Análise de chatbotFlow.ts + código relacionado

## Sumário

Este documento detalha os principais fluxos do sistema com diagramas Mermaid para visualização.

---

## 1. Fluxo Completo: Mensagem WhatsApp → Resposta AI

```mermaid
sequenceDiagram
    autonumber
    participant WA as WhatsApp User
    participant META as Meta Cloud API
    participant WH as Webhook Handler
    participant FLOW as ChatbotFlow Pipeline
    participant REDIS as Redis Cache
    participant DB as Supabase DB
    participant VAULT as Vault (Secrets)
    participant AI as AI Provider (Groq/OpenAI)

    WA->>META: Envia mensagem WhatsApp
    META->>WH: POST /api/webhook/received
    WH->>WH: Verifica assinatura Meta
    WH->>FLOW: Inicia processChatbotMessage()

    Note over FLOW: Node 1: Filter Status Updates
    FLOW->>FLOW: Ignora status updates (delivered, read)

    Note over FLOW: Node 2: Parse Message
    FLOW->>FLOW: Extrai phone, content, type, timestamp

    Note over FLOW: Node 3: Check/Create Customer
    FLOW->>DB: SELECT clientes_whatsapp WHERE phone=X
    alt Cliente não existe
        FLOW->>DB: INSERT INTO clientes_whatsapp
    end

    Note over FLOW: Node 4: Download Media (se aplicável)
    alt Mensagem tem mídia (image/audio/document)
        FLOW->>META: GET media download URL
        FLOW->>META: Download file
        FLOW->>DB: Upload to Supabase Storage
    end

    Note over FLOW: Node 5: Normalize Message
    FLOW->>FLOW: Normaliza content (text/transcribed)

    Note over FLOW: Node 6: Push to Redis
    FLOW->>REDIS: RPUSH batch:{client}:{phone} message
    FLOW->>REDIS: EXPIRE batch:{client}:{phone} 30s

    Note over FLOW: Node 7: Save User Message
    FLOW->>DB: INSERT INTO n8n_chat_histories (user msg)

    Note over FLOW: Node 8: Batch Messages (wait 30s)
    FLOW->>REDIS: Wait 30 seconds
    FLOW->>REDIS: LRANGE batch:{client}:{phone}
    FLOW->>REDIS: DEL batch:{client}:{phone}
    FLOW->>FLOW: Concatenate messages

    par Parallel: History + RAG
        Note over FLOW: Node 9: Get Chat History
        FLOW->>DB: SELECT n8n_chat_histories (last 15 msgs)

        Note over FLOW: Node 10: Get RAG Context
        FLOW->>DB: Generate embedding (OpenAI)
        FLOW->>DB: Vector search (pgvector, similarity > 0.8)
        FLOW->>DB: Fetch top 5 chunks
    end

    Note over FLOW: Node 11: Generate AI Response
    FLOW->>VAULT: Get client API keys
    FLOW->>DB: Check budget available
    FLOW->>AI: generateText(messages + history + RAG)
    AI->>FLOW: Response + tool calls (optional)
    FLOW->>DB: Log usage (gateway_usage_logs)

    alt Tool call: transferir_atendimento
        FLOW->>DB: UPDATE clientes_whatsapp SET status='humano'
        FLOW->>FLOW: Send handoff email
        FLOW->>WA: "Transferindo para atendente..."
        Note over FLOW: STOP (don't continue)
    end

    Note over FLOW: Node 12: Format Response
    FLOW->>FLOW: Remove tool call tags
    FLOW->>FLOW: Split on \n\n (multi-message)

    Note over FLOW: Node 13: Send WhatsApp
    loop Para cada mensagem
        FLOW->>META: POST /messages (send WhatsApp)
        FLOW->>FLOW: Wait 2s (entre mensagens)

        Note over FLOW: Node 14: Save Bot Message (intercalado)
        FLOW->>DB: INSERT INTO n8n_chat_histories (bot msg)
    end

    META->>WA: Entrega mensagem(s)
    WH->>META: Return 200 OK
```

**Tempo total estimado:** 30-35 segundos (batching domina)

**Evidência:**
- chatbotFlow.ts:1-100 (imports e estrutura)
- CLAUDE.md (descrição do pipeline de 14 nodes)

---

## 2. Fluxo de Autenticação & Onboarding

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuário
    participant LP as Landing Page (/)
    participant LOGIN as Login Page
    participant SUPABASE as Supabase Auth
    participant DB as Database
    participant DASH as Dashboard

    U->>LP: Acessa site
    LP->>U: Mostra hero, planos, CTA

    alt Usuário novo
        U->>LOGIN: Clica "Criar Conta"
        LOGIN->>LOGIN: /register page
        U->>LOGIN: Preenche email, senha, nome empresa
        LOGIN->>SUPABASE: signUp(email, password)
        SUPABASE->>U: Email de confirmação
        U->>SUPABASE: Clica link de confirmação
        SUPABASE->>SUPABASE: Confirm email

        Note over DB: Trigger: create_user_profile()
        SUPABASE->>DB: INSERT INTO user_profiles
        SUPABASE->>DB: INSERT INTO clients (se primeiro user)

        U->>LOGIN: /check-email (aguardando confirmação)
        U->>LOGIN: Email confirmado, redirect /login
    end

    U->>LOGIN: Enter email/senha
    LOGIN->>SUPABASE: signInWithEmail()
    SUPABASE->>LOGIN: Return JWT session
    LOGIN->>DB: SELECT user_profiles WHERE id=user.id
    DB->>LOGIN: Return client_id, is_active, role

    alt Conta inativa
        LOGIN->>U: Erro: "Conta inativa"
        Note over LOGIN: STOP
    end

    alt Conta sem client_id
        LOGIN->>U: Erro: "Sem perfil configurado"
        Note over LOGIN: STOP
    end

    LOGIN->>DASH: Redirect /dashboard
    DASH->>DB: Fetch client config, metrics
    DASH->>U: Show dashboard

    alt Primeiro acesso (onboarding)
        DASH->>DASH: Detect empty config
        DASH->>DASH: Redirect /onboarding
        U->>DASH: Setup wizard (Meta keys, AI provider, etc.)
        DASH->>DB: Update clients config
        DASH->>DASH: Redirect /dashboard
    end
```

**Evidência:**
- login/page.tsx:81-144 (handleSubmit)
- dashboard/page.tsx:24-61 (client-side auth check)

---

## 3. Fluxo de Budget Control (Pre-flight Check)

```mermaid
flowchart TD
    START[AI Request Triggered] --> CHECK_BUDGET{Check Budget Available}

    CHECK_BUDGET --> FETCH_BUDGET[SELECT client_budgets<br/>WHERE client_id=X]
    FETCH_BUDGET --> FETCH_USAGE[SELECT SUM cost_brl<br/>FROM gateway_usage_logs<br/>WHERE client_id=X<br/>AND created_at > period_start]

    FETCH_USAGE --> CALCULATE{current_usage<br/>< budget_limit?}

    CALCULATE -->|Yes| PROCEED[Proceed with AI call]
    CALCULATE -->|No| BLOCK[Return Error:<br/>'Budget exceeded']

    PROCEED --> CALL_AI[Direct AI Client:<br/>generateText]
    CALL_AI --> LOG_USAGE[INSERT gateway_usage_logs<br/>- promptTokens<br/>- completionTokens<br/>- cost_brl]

    LOG_USAGE --> RETURN[Return AI Response]

    BLOCK --> NOTIFY_USER[Notify user:<br/>"Orçamento esgotado"]
    NOTIFY_USER --> END[End]
    RETURN --> END

    style BLOCK fill:#ff6b6b
    style PROCEED fill:#51cf66
```

**Evidência:**
- direct-ai-client.ts:19 (`checkBudgetAvailable`)
- unified-tracking.ts (budget enforcement logic)

---

## 4. Fluxo de RAG (Knowledge Base)

```mermaid
sequenceDiagram
    autonumber
    participant ADMIN as Admin User
    participant UI as Knowledge UI
    participant API as /api/documents
    participant STORAGE as Supabase Storage
    participant OPENAI as OpenAI API
    participant DB as PostgreSQL (pgvector)
    participant CHATBOT as Chatbot Flow

    Note over ADMIN,DB: UPLOAD PHASE
    ADMIN->>UI: Upload PDF/TXT file
    UI->>API: POST /api/documents
    API->>API: Parse file (pdf-parse)
    API->>API: Chunk text (500 tokens, 20% overlap)

    loop Para cada chunk
        API->>OPENAI: Generate embedding (text-embedding-3-small)
        OPENAI->>API: Return vector[1536]
        API->>DB: INSERT INTO documents<br/>(content, embedding, client_id)
    end

    API->>STORAGE: Upload original file
    API->>UI: Success

    Note over CHATBOT,DB: QUERY PHASE (durante chatbot flow)
    CHATBOT->>CHATBOT: User message received
    CHATBOT->>OPENAI: Generate query embedding
    OPENAI->>CHATBOT: Return query vector

    CHATBOT->>DB: SELECT * FROM documents<br/>WHERE client_id=X<br/>ORDER BY embedding <=> query_vector<br/>LIMIT 5

    DB->>DB: Pgvector cosine similarity search
    DB->>CHATBOT: Return top 5 chunks (similarity > 0.8)

    CHATBOT->>CHATBOT: Inject chunks into AI prompt:<br/>"Context from knowledge base:\n{chunks}"
    CHATBOT->>CHATBOT: Generate AI response with context
```

**Evidência:**
- getRAGContext.ts (node function)
- chunking.ts (text splitting)
- CLAUDE.md (RAG system description)

---

## 5. Fluxo de Stripe Connect (Client Store)

```mermaid
sequenceDiagram
    autonumber
    participant CLIENT as SaaS Client
    participant ADMIN_UI as Admin Panel
    participant STRIPE_API as Stripe API
    participant DB as Database
    participant CONSUMER as End Consumer
    participant STORE as Public Store
    participant CHECKOUT as Stripe Checkout

    Note over CLIENT,DB: ONBOARDING PHASE
    CLIENT->>ADMIN_UI: Acessa /dashboard/payments/onboarding
    ADMIN_UI->>STRIPE_API: Create Connected Account
    STRIPE_API->>ADMIN_UI: Return account_id
    ADMIN_UI->>DB: UPDATE clients SET stripe_connect_account_id
    ADMIN_UI->>STRIPE_API: Create Account Link (onboarding)
    STRIPE_API->>ADMIN_UI: Return onboarding URL
    ADMIN_UI->>CLIENT: Redirect to Stripe onboarding
    CLIENT->>STRIPE_API: Complete KYC, bank details
    STRIPE_API->>ADMIN_UI: Webhook: account.updated (charges_enabled=true)
    ADMIN_UI->>DB: UPDATE clients SET stripe_onboarding_complete=true

    Note over CLIENT,DB: PRODUCT CREATION
    CLIENT->>ADMIN_UI: /dashboard/payments/products
    CLIENT->>ADMIN_UI: Create product (name, price, image)
    ADMIN_UI->>STRIPE_API: Create Product on Connected Account
    STRIPE_API->>ADMIN_UI: Return product_id, price_id
    ADMIN_UI->>DB: INSERT INTO stripe_products<br/>(client_id, stripe_product_id, stripe_price_id)

    Note over CONSUMER,CHECKOUT: CHECKOUT PHASE
    CONSUMER->>STORE: Acessa /store/[clientSlug]
    STORE->>DB: SELECT stripe_products WHERE client_id=X
    STORE->>CONSUMER: Show product catalog
    CONSUMER->>STORE: Clica "Comprar" produto

    STORE->>STRIPE_API: Create Checkout Session<br/>- Connected Account<br/>- application_fee_percent=10%<br/>- success_url=/store/.../success<br/>- cancel_url=/store/.../cancel

    STRIPE_API->>STORE: Return checkout URL
    STORE->>CONSUMER: Redirect to Stripe Checkout

    CONSUMER->>CHECKOUT: Insere dados pagamento
    CHECKOUT->>STRIPE_API: Process payment

    alt Payment Success
        STRIPE_API->>ADMIN_UI: Webhook: checkout.session.completed
        ADMIN_UI->>DB: INSERT INTO orders (customer, product, amount, platform_fee)
        STRIPE_API->>CONSUMER: Redirect /store/.../success
        CONSUMER->>STORE: "Pagamento aprovado!"

        Note over STRIPE_API: Plataforma recebe 10% fee
        Note over STRIPE_API: Client recebe 90%
    else Payment Failed/Canceled
        STRIPE_API->>CONSUMER: Redirect /store/.../cancel
        CONSUMER->>STORE: "Pagamento cancelado"
    end
```

**Evidência:**
- .env.mobile.example:59-90 (Stripe config)
- stripe-connect.ts (lib)
- /store/[clientSlug]/* pages

---

## 6. Fluxo de Human Handoff (Tool Call)

```mermaid
sequenceDiagram
    autonumber
    participant USER as WhatsApp User
    participant BOT as Chatbot Flow
    participant AI as AI Provider
    participant DB as Database
    participant EMAIL as Gmail/Nodemailer
    participant AGENT as Human Agent

    USER->>BOT: "Quero falar com atendente"
    BOT->>BOT: Generate AI response with tools

    BOT->>AI: generateText({<br/>  messages: [...],<br/>  tools: { transferir_atendimento: {...} }<br/>})

    AI->>AI: Detect intent: human handoff needed
    AI->>BOT: Return tool call:<br/>{<br/>  type: 'tool-call',<br/>  toolName: 'transferir_atendimento',<br/>  args: { motivo: 'solicitacao' }<br/>}

    BOT->>BOT: Detect tool call
    BOT->>DB: UPDATE clientes_whatsapp<br/>SET status='humano'<br/>WHERE phone=X

    BOT->>DB: SELECT n8n_chat_histories<br/>WHERE phone=X (last 20 messages)
    BOT->>BOT: Summarize conversation

    BOT->>EMAIL: Send email to GMAIL_USER:<br/>"Cliente X solicitou atendente"<br/>+ resumo conversa<br/>+ link para dashboard

    BOT->>USER: "Transferindo para atendente humano.<br/>Aguarde um momento."

    BOT->>BOT: STOP (não envia mais mensagens automaticamente)

    Note over AGENT: Agent recebe email
    AGENT->>AGENT: Acessa /dashboard/chat
    AGENT->>USER: Continua conversa manualmente

    alt Agent finaliza atendimento
        AGENT->>DB: UPDATE clientes_whatsapp<br/>SET status='bot'
        Note over BOT: Bot volta a responder automaticamente
    end
```

**Evidência:**
- handleHumanHandoff.ts (node function)
- gmail.ts (email sending)
- CLAUDE.md (tool calls description)

---

## 7. Fluxo Mobile: Biometric Auth

```mermaid
sequenceDiagram
    autonumber
    participant USER as Mobile User
    participant APP as Capacitor App
    participant BIO as Biometric Hardware
    participant SUPABASE as Supabase Auth
    participant DB as Database

    Note over USER,DB: FIRST LOGIN (email/senha)
    USER->>APP: Open app
    APP->>APP: Check biometric availability
    APP->>BIO: BiometricAuth.checkAvailability()
    BIO->>APP: { available: true, type: 'FaceID' }

    USER->>APP: Enter email/senha
    APP->>SUPABASE: signInWithEmail()
    SUPABASE->>APP: Return session JWT
    APP->>DB: Fetch user_profiles

    APP->>USER: Prompt: "Habilitar login com biometria?"
    USER->>APP: "Sim"
    APP->>APP: localStorage.setItem('biometric_email', email)
    APP->>APP: localStorage.setItem('biometric_enabled', 'true')
    APP->>APP: Save session to SecureStorage

    Note over USER,DB: SUBSEQUENT LOGINS
    USER->>APP: Open app
    APP->>APP: Check localStorage.biometric_enabled
    APP->>APP: Get saved email from localStorage

    APP->>USER: Show biometric button
    USER->>APP: Tap "Login com Biometria"

    APP->>BIO: BiometricAuth.authenticate({<br/>  reason: 'Login no UzzApp'<br/>})

    BIO->>USER: Show FaceID/TouchID/Fingerprint
    USER->>BIO: Authenticate

    alt Biometric Success
        BIO->>APP: { success: true }
        APP->>APP: Retrieve session from SecureStorage
        APP->>SUPABASE: Validate session (getSession)

        alt Session válida
            SUPABASE->>APP: Return valid session
            APP->>DB: Fetch user_profiles
            APP->>USER: Redirect /dashboard
        else Session expirada
            SUPABASE->>APP: Session expired
            APP->>USER: "Sessão expirada. Faça login manualmente."
        end

    else Biometric Failed
        BIO->>APP: { error: 'Authentication failed' }
        APP->>USER: "Autenticação falhou. Use email/senha."
    end
```

**Evidência:**
- login/page.tsx:29-45 (biometric check)
- login/page.tsx:47-79 (handleBiometricSuccess)
- biometricAuth.ts (lib)

---

## 8. Fluxo de Realtime Updates (Supabase Realtime)

```mermaid
sequenceDiagram
    autonumber
    participant UI as Dashboard UI
    participant REALTIME as Supabase Realtime
    participant DB as PostgreSQL
    participant WEBHOOK as Webhook Handler

    Note over UI,DB: SUBSCRIPTION
    UI->>REALTIME: Subscribe to channel:<br/>'conversations:{client_id}'
    REALTIME->>UI: Subscription confirmed

    Note over WEBHOOK,DB: NEW MESSAGE ARRIVES
    WEBHOOK->>DB: INSERT INTO n8n_chat_histories<br/>(message, phone, client_id)

    DB->>DB: Trigger: broadcast_chat_update()
    DB->>REALTIME: Broadcast to channel:<br/>'conversations:{client_id}'<br/>{ event: 'new_message', payload: {...} }

    REALTIME->>UI: Push update via WebSocket
    UI->>UI: Append message to conversation list
    UI->>UI: Show notification badge
    UI->>UI: Play notification sound (if enabled)

    Note over UI: USER OPENS CONVERSATION
    UI->>DB: Mark as read:<br/>POST /api/conversations/mark-read
    DB->>REALTIME: Broadcast: { event: 'read', phone }
    REALTIME->>UI: Update read status (all clients)
```

**Evidência:**
- Migrations: 20250125_realtime_*.sql (5 files)
- CLAUDE.md (Realtime mencionado)

---

## 9. Fluxo de Visual Flow Editor (Drag-Drop)

```mermaid
sequenceDiagram
    autonumber
    participant USER as User
    participant EDITOR as Flow Editor UI
    participant CANVAS as @xyflow/react Canvas
    participant API as /api/flows
    participant DB as Database
    participant ENGINE as Flow Engine

    USER->>EDITOR: Acessa /dashboard/flows/[flowId]/edit
    EDITOR->>API: GET /api/flows/[flowId]
    API->>DB: SELECT flows WHERE id=X
    DB->>API: Return flow JSON (nodes, edges)
    API->>EDITOR: Return flow data
    EDITOR->>CANVAS: Render nodes on canvas

    USER->>CANVAS: Drag "Send Message" block from sidebar
    CANVAS->>EDITOR: onNodeAdd event
    EDITOR->>EDITOR: Generate node ID
    EDITOR->>CANVAS: Add node to state

    USER->>CANVAS: Connect "Start" to "Send Message"
    CANVAS->>EDITOR: onConnect event
    EDITOR->>EDITOR: Create edge {source, target}
    EDITOR->>CANVAS: Add edge to state

    USER->>CANVAS: Click node "Send Message"
    CANVAS->>EDITOR: onNodeClick event
    EDITOR->>EDITOR: Open Properties Panel
    USER->>EDITOR: Configure: message text = "Olá!"
    EDITOR->>EDITOR: Update node data

    USER->>EDITOR: Click "Save Flow"
    EDITOR->>API: PUT /api/flows/[flowId]<br/>{<br/>  nodes: [...],<br/>  edges: [...],<br/>  updated_at: now()<br/>}
    API->>DB: UPDATE flows SET definition=X
    DB->>API: Success
    API->>EDITOR: Flow saved

    Note over USER,ENGINE: EXECUTION
    USER->>EDITOR: Click "Test Flow"
    EDITOR->>API: POST /api/flows/process-message<br/>{<br/>  flowId: X,<br/>  phone: 'test',<br/>  message: 'test'<br/>}
    API->>ENGINE: Execute flow nodes sequentially

    ENGINE->>ENGINE: Start → Send Message → End
    ENGINE->>API: Return execution result
    API->>EDITOR: Show execution log
```

**Evidência:**
- /dashboard/flows/[flowId]/edit/page.tsx
- components/flows/* (FlowCanvas, FlowPropertiesPanel, etc.)
- @xyflow/react package (dependencies.md)

---

## 10. Fluxo de Admin: Gerenciar Budgets

```mermaid
sequenceDiagram
    autonumber
    participant ADMIN as Platform Admin
    participant UI as Admin Panel
    participant API as /api/admin/budgets
    participant DB as Database
    participant EMAIL as Email Service

    ADMIN->>UI: Acessa /dashboard/admin/budget-plans
    UI->>API: GET /api/admin/budgets
    API->>DB: SELECT clients, client_budgets
    DB->>API: Return all clients + current budgets
    API->>UI: Show table

    ADMIN->>UI: Clica "Edit Budget" para Client X
    UI->>UI: Open modal
    ADMIN->>UI: Set budget_limit_brl = 500.00
    ADMIN->>UI: Set period = 'monthly'
    ADMIN->>UI: Set alert_threshold_percent = 80

    UI->>API: PUT /api/admin/budgets<br/>{<br/>  client_id: X,<br/>  budget_limit_brl: 500,<br/>  period: 'monthly',<br/>  alert_threshold_percent: 80<br/>}

    API->>DB: INSERT INTO client_budgets<br/>ON CONFLICT (client_id)<br/>DO UPDATE
    DB->>API: Success
    API->>UI: Budget updated

    Note over DB,EMAIL: DURANTE USO DO CLIENTE
    DB->>DB: AI call logged → gateway_usage_logs
    DB->>DB: Calculate total usage this month
    DB->>DB: Check: usage >= 80% of limit?

    alt Alert threshold exceeded
        DB->>EMAIL: Send alert:<br/>"Cliente X atingiu 80% do budget"
        EMAIL->>ADMIN: Email notification
    end

    alt Budget limit exceeded
        DB->>DB: Block AI calls (checkBudgetAvailable returns false)
        DB->>EMAIL: Send alert:<br/>"Cliente X esgotou budget"
        EMAIL->>ADMIN: Email notification
    end
```

**Evidência:**
- /dashboard/admin/budget-plans/page.tsx
- /api/admin/budgets/route.ts
- unified-tracking.ts (budget check)

---

## Resumo dos Fluxos

| Fluxo | Tempo Médio | Complexidade | Crítico |
|-------|-------------|--------------|---------|
| 1. Mensagem → Resposta | 30-35s | Alta | ✅ Sim |
| 2. Autenticação | 2-5s | Média | ✅ Sim |
| 3. Budget Control | <100ms | Baixa | ✅ Sim |
| 4. RAG Upload/Query | 5-10s | Média | Não |
| 5. Stripe Connect | Variável | Alta | Não |
| 6. Human Handoff | 3-5s | Média | ✅ Sim |
| 7. Biometric Auth | 1-2s | Baixa | Não |
| 8. Realtime Updates | <1s | Baixa | Não |
| 9. Flow Editor | N/A | Alta | Não |
| 10. Admin Budget | 1-2s | Baixa | ✅ Sim |

**Fluxos críticos:** Afetam diretamente o core business (chatbot)

---

**FIM DOS FLUXOS PRINCIPAIS**

Próximos documentos a criar:
- 99_AI_CONTEXT_PACK.md (resumo para IA)
- Módulos individuais (modules/*.md)
- Database schema completo
