# Arquitetura do Chatbot — Fluxo Visual Completo

> Mapa fim-a-fim do que acontece desde o WhatsApp manda uma mensagem até o cliente receber a resposta.
> Gerado a partir do código real em `src/flows/chatbotFlow.ts`, `src/nodes/*`, `src/lib/agent-tools.ts` e `src/flows/flowMetadata.ts`.

---

## TL;DR — quantos agentes existem?

**4 agentes LLM principais** + 1 worker assíncrono:

| # | Agente | Onde mora | Modelo | Função |
|---|--------|-----------|--------|--------|
| 1 | **Agente Principal** (conversacional) | `src/nodes/generateAIResponse.ts` | OpenAI ou Groq (config do tenant) | Conversa com o cliente, decide tools |
| 2 | **Classify Intent** | `src/nodes/classifyIntent.ts` | LLM ou regex (config) | Classifica intenção da mensagem |
| 3 | **Fast Track Router** | `src/nodes/fastTrackRouter.ts` | LLM pequeno (default `gpt-4o-mini`) | Detecta FAQ p/ habilitar cache de prompt |
| 4 | **CRM Intent Classifier** | `src/lib/crm-intent-classifier.ts` | LLM | Classifica eventos de CRM pós-resposta |
| — | Evaluation Worker (async) | `src/lib/evaluation-worker.ts` | LLM | Avalia qualidade da resposta após envio |

Mais 3 “sub-agentes” de mídia que chamam só APIs especializadas (sem decisão):
- **transcribeAudio** → OpenAI Whisper
- **analyzeImage** → OpenAI GPT-4o Vision
- **analyzeDocument** → OpenAI (extração + sumário de PDF)

---

## 1. Visão geral — entrada da mensagem ao envio

```mermaid
flowchart TB
    META[WhatsApp / Meta Cloud API]
    WEBHOOK[/api/webhook/clientId/<br/>POST]
    DEDUP{Mensagem<br/>duplicada?}
    CONFIG[getClientConfig<br/>Vault + DB]
    PUSH[Push Notification<br/>app mobile]
    FLOW[processChatbotMessage<br/>chatbotFlow.ts]
    OUT[Meta Send Message API]
    DB[(Supabase<br/>n8n_chat_histories)]

    META -->|webhook POST| WEBHOOK
    WEBHOOK --> DEDUP
    DEDUP -->|sim| DROP[200 OK<br/>silencia]
    DEDUP -->|não| CONFIG
    CONFIG --> PUSH
    CONFIG --> FLOW
    FLOW -->|sendTextMessage| OUT
    FLOW -->|saveChatMessage| DB
    OUT -->|wamid| META

    style META fill:#25D366,color:#fff
    style FLOW fill:#4F46E5,color:#fff
    style DB fill:#10B981,color:#fff
```

**Pontos chave:**
- Webhook é multi-tenant: `/api/webhook/[clientId]` ([src/app/api/webhook/[clientId]/route.ts](src/app/api/webhook/%5BclientId%5D/route.ts))
- Dedup via `checkDuplicateMessage` (Redis) antes de processar
- Config do tenant (prompt, modelos, API keys, tools habilitadas) sai do Supabase **Vault**
- Push para app mobile dispara em paralelo ao `processChatbotMessage`

---

## 2. Pipeline completo — os 14 nodes (+ subnodes)

```mermaid
flowchart TD
    START([Webhook recebe]) --> N1

    subgraph PRE[PREPROCESSING]
        N1[1. Filter Status Updates]
        N2[2. Parse Message]
        N3[3. Check/Create Customer<br/>+ captureLeadSource<br/>+ updateCRMCardStatus]
        N4{4. Process Media}
        N4A[downloadMetaMedia]
        N4B[transcribeAudio<br/>Whisper]
        N4C[analyzeImage<br/>GPT-4o Vision]
        N4D[analyzeDocument<br/>OpenAI PDF]
        N5[5. Normalize Message]
        N6{6. Check Human<br/>Handoff Status}
        N7[7. Push to Redis]
        N8[8. Save User Message]
        N9[9. Batch Messages<br/>30s default]
    end

    subgraph FAST[FAST TRACK]
        N95{9.5. Fast Track Router<br/>FAQ semantic match}
    end

    subgraph ANA[ANALYSIS]
        N10[10. Get Chat History<br/>últimas 15 msgs]
        N11[11. Get RAG Context<br/>pgvector cosine]
        N105[10.5. Check Continuity]
        N106[10.6. Classify Intent]
    end

    subgraph GEN[GENERATION]
        N12[12. Generate AI Response<br/>callDirectAI Vault]
    end

    subgraph TOOLS[TOOL HANDLING — se houver tool_calls]
        T1[transferir_atendimento]
        T2[buscar_documento]
        T3[buscar_conhecimento]
        T4[enviar_resposta_em_audio]
        T5[registrar_dado_cadastral]
        T6[verificar_agenda]
        T7[criar_evento_agenda]
        T8[cancelar_evento_agenda]
    end

    subgraph POST[POST-PROCESSING]
        N125[12.5. Detect Repetition]
        N126[12.6. Save AI Message]
    end

    subgraph OUT[OUTPUT]
        N13[13. Format Response<br/>strip tools + split]
        N14[14. Send + Save WhatsApp<br/>intercalado]
    end

    subgraph SIDE[SIDE-EFFECTS pós-envio]
        S1[classifyCRMIntent]
        S2[upsertSupportCase]
        S3[enqueueEvaluation<br/>worker async]
        S4[trace_logger flush]
    end

    N1 --> N2 --> N3 --> N4
    N4 --> N4A
    N4A -->|audio| N4B
    N4A -->|imagem| N4C
    N4A -->|documento| N4D
    N4B & N4C & N4D --> N5
    N5 --> N6
    N6 -->|status humano| STOP([para o bot<br/>salva msg apenas])
    N6 -->|bot ativo| N7 --> N8 --> N9 --> N95

    N95 -->|FAQ match| N12
    N95 -->|conversa normal| N10 & N11
    N10 --> N105 --> N12
    N11 --> N12
    N10 --> N106 --> N12

    N12 --> HASTOOLS{tem<br/>tool_calls?}
    HASTOOLS -->|sim| TOOLS
    HASTOOLS -->|não| N125

    T1 --> END_HANDOFF([fim - transferido])
    T2 --> N12
    T3 --> N12
    T4 --> END_AUDIO([fim - áudio enviado])
    T5 --> N12
    T6 --> N125
    T7 --> N125
    T8 --> N125

    N125 --> N126 --> N13 --> N14
    N14 --> SIDE
    SIDE --> END([fim])

    style N12 fill:#4F46E5,color:#fff
    style N95 fill:#F59E0B,color:#fff
    style N6 fill:#EF4444,color:#fff
    style TOOLS fill:#7C3AED,color:#fff
    style FAST fill:#FBBF24
```

---

## 3. Os 4 agentes LLM em detalhe

```mermaid
flowchart LR
    USER[Mensagem do<br/>usuário]

    subgraph AG1[AGENTE 1 — Principal/Conversacional]
        direction TB
        G1_IN[generateAIResponse]
        G1_PROMPT[System Prompt do tenant<br/>+ DateTime<br/>+ Greeting Continuity<br/>+ Regras de tools<br/>+ Regras calendário<br/>+ Metadata do contato<br/>+ RAG context<br/>+ Histórico]
        G1_LLM[(callDirectAI<br/>OpenAI ou Groq)]
        G1_OUT[content + toolCalls]
        G1_IN --> G1_PROMPT --> G1_LLM --> G1_OUT
    end

    subgraph AG2[AGENTE 2 — Classify Intent]
        direction TB
        G2_IN[classifyIntent]
        G2_MODE{modo}
        G2_LLM[(callDirectAI<br/>modelo configurável)]
        G2_RGX[regex matcher]
        G2_OUT[intent + confidence]
        G2_IN --> G2_MODE
        G2_MODE -->|use_llm true| G2_LLM
        G2_MODE -->|use_llm false| G2_RGX
        G2_LLM & G2_RGX --> G2_OUT
    end

    subgraph AG3[AGENTE 3 — Fast Track Router]
        direction TB
        G3_IN[fastTrackRouter]
        G3_PRE{keyword<br/>prefilter?}
        G3_LLM[(callDirectAI<br/>gpt-4o-mini default)]
        G3_OUT[shouldFastTrack<br/>topic + similarity]
        G3_IN --> G3_PRE -->|passa| G3_LLM --> G3_OUT
    end

    subgraph AG4[AGENTE 4 — CRM Intent Classifier]
        direction TB
        G4_IN[classifyCRMIntent]
        G4_LLM[(callDirectAI)]
        G4_OUT[crm_event<br/>conversion / interest / churn]
        G4_IN --> G4_LLM --> G4_OUT
    end

    subgraph AGW[WORKER ASYNC — Evaluation]
        direction TB
        W_IN[enqueueEvaluation]
        W_LLM[(LLM judge)]
        W_OUT[quality_score<br/>persiste em DB]
        W_IN --> W_LLM --> W_OUT
    end

    USER --> AG3
    AG3 --> AG1
    USER --> AG2
    AG2 --> AG1
    AG1 -->|response| AG4
    AG1 -->|response| AGW

    style AG1 fill:#4F46E5,color:#fff
    style AG2 fill:#0891B2,color:#fff
    style AG3 fill:#F59E0B,color:#fff
    style AG4 fill:#DC2626,color:#fff
    style AGW fill:#6B7280,color:#fff
```

**Quem usa qual provider:**
- **Agente 1**: provider configurado por tenant (`primaryModelProvider`: `openai` ou `groq`) — modelos `gpt-4o`, `gpt-5.4-nano`, `llama-3.3-70b`, etc.
- **Agentes 2, 3, 4**: também usam `callDirectAI` (mesma infra), provider conforme config.
- Sub-agentes de mídia (Whisper, GPT-4o Vision) usam `OpenAI` direto via `src/lib/openai.ts` com a key do tenant no Vault.

---

## 4. Sistema de tools — quem faz o quê

```mermaid
flowchart TD
    AI[Agente Principal<br/>generateAIResponse]
    DECIDE{LLM emite<br/>tool_calls?}

    AI --> DECIDE

    subgraph T_HANDOFF[transferir_atendimento]
        T1A[handleHumanHandoff]
        T1B[UPDATE clientes_whatsapp<br/>status = transferido]
        T1C[sendEmail Gmail<br/>notificationEmail]
        T1D[sendHumanHandoffNotification<br/>push mobile]
        T1E[sendTextMessage<br/>aviso ao cliente]
        T1A --> T1B & T1C & T1D & T1E
    end

    subgraph T_DOC[buscar_documento]
        T2A[handleDocumentSearchToolCall]
        T2B[searchDocumentInKnowledge]
        T2C{tipo}
        T2D[sendWhatsAppImage]
        T2E[sendWhatsAppDocument]
        T2F[2nd LLM call<br/>incorpora .txt]
        T2A --> T2B --> T2C
        T2C -->|imagem| T2D
        T2C -->|pdf/doc| T2E
        T2C -->|txt/md| T2F
    end

    subgraph T_KNOW[buscar_conhecimento]
        T3A[getRAGContextWithTrace]
        T3B[pgvector cosine]
        T3C[2nd LLM call<br/>com RAG injetado]
        T3A --> T3B --> T3C
    end

    subgraph T_AUDIO[enviar_resposta_em_audio]
        T4A[handleAudioToolCall]
        T4B[OpenAI TTS]
        T4C[uploadAudioToWhatsApp]
        T4D[sendWhatsAppAudio]
        T4A --> T4B --> T4C --> T4D
    end

    subgraph T_META[registrar_dado_cadastral]
        T5A[updateContactMetadata]
        T5B[(clientes_whatsapp.metadata)]
        T5A --> T5B
    end

    subgraph T_CAL[Calendar tools]
        T6A[handleCalendarToolCall]
        T6B{Google ou<br/>Microsoft?}
        T6C[Google Calendar API]
        T6D[Microsoft Graph API]
        T6A --> T6B --> T6C & T6D
    end

    DECIDE -->|transferir_atendimento| T_HANDOFF
    DECIDE -->|buscar_documento| T_DOC
    DECIDE -->|buscar_conhecimento| T_KNOW
    DECIDE -->|enviar_resposta_em_audio| T_AUDIO
    DECIDE -->|registrar_dado_cadastral| T_META
    DECIDE -->|verificar_agenda<br/>criar_evento_agenda<br/>alterar_evento_agenda<br/>cancelar_evento_agenda| T_CAL
    DECIDE -->|sem tool| FORMAT[Format Response]

    T_HANDOFF --> END_H([FIM — bot para])
    T_DOC --> AI2[2nd Generate]
    T_KNOW --> AI2
    T_AUDIO --> END_A([FIM — áudio])
    T_META --> CONTINUE[continua normal]
    T_CAL --> SUBST[content =<br/>resultado da tool]

    AI2 --> FORMAT
    CONTINUE --> FORMAT
    SUBST --> FORMAT

    style AI fill:#4F46E5,color:#fff
    style T_HANDOFF fill:#DC2626,color:#fff
    style T_AUDIO fill:#10B981,color:#fff
```

**Catálogo das 9 tools** (definidas em [src/lib/agent-tools.ts](src/lib/agent-tools.ts)):

| Tool | Habilitada por | Comportamento pós-execução |
|------|----------------|----------------------------|
| `transferir_atendimento` | `enableHumanHandoff` | **encerra fluxo**, status = transferido |
| `buscar_conhecimento` | `enableRAG` | re-chama LLM com RAG injetado |
| `buscar_documento` | `enableDocumentSearch` | envia mídia + (opcional) re-chama LLM |
| `enviar_resposta_em_audio` | `enableAudioResponse` | **encerra fluxo**, manda TTS |
| `registrar_dado_cadastral` | sempre | continua fluxo, salva metadata |
| `verificar_agenda` | calendar conectado + slots ok | substitui `content` pelo resultado |
| `criar_evento_agenda` | idem | substitui `content` |
| `alterar_evento_agenda` | idem | substitui `content` |
| `cancelar_evento_agenda` | idem | substitui `content` |

---

## 5. Conexões externas — o que está plugado

```mermaid
flowchart LR
    BOT[ChatBot<br/>Next.js + Vercel]

    subgraph META_API[Meta WhatsApp Cloud]
        META_WH[Webhook IN]
        META_OUT[Send Message API]
        META_MEDIA[Media Download]
    end

    subgraph SUPA[Supabase]
        SUPA_DB[(PostgreSQL<br/>+ pgvector)]
        SUPA_VAULT[Vault<br/>API keys por tenant]
        SUPA_STOR[Storage<br/>arquivos]
        SUPA_RT[Realtime]
    end

    subgraph AI_PROV[AI Providers]
        OAI[OpenAI<br/>GPT, Whisper, TTS, Vision, Embeddings]
        GROQ[Groq<br/>Llama 3.3 70B]
    end

    REDIS[(Redis<br/>batching + dedup)]
    GMAIL[Gmail SMTP<br/>handoff notify]
    GCAL[Google Calendar]
    OUTLOOK[Microsoft Graph<br/>Outlook]
    PUSH[Push Service<br/>app mobile]

    META_WH -->|POST| BOT
    BOT -->|sendTextMessage<br/>sendImage<br/>sendAudio<br/>sendDocument| META_OUT
    BOT -->|download| META_MEDIA

    BOT <-->|RLS, multi-tenant| SUPA_DB
    BOT -->|getClientVaultCredentials| SUPA_VAULT
    BOT -->|uploadFileToStorage| SUPA_STOR
    SUPA_RT -.->|broadcasts UI| BOT

    BOT -->|callDirectAI| OAI
    BOT -->|callDirectAI| GROQ

    BOT <-->|setWithExpiry<br/>checkDuplicate<br/>BLPOP batching| REDIS
    BOT -->|sendEmail| GMAIL
    BOT -->|verificar/criar/cancelar| GCAL
    BOT -->|verificar/criar/cancelar| OUTLOOK
    BOT -->|incomingPush<br/>handoffPush| PUSH

    style BOT fill:#4F46E5,color:#fff
    style SUPA fill:#10B981,color:#fff
    style META_API fill:#25D366,color:#fff
    style AI_PROV fill:#F59E0B,color:#fff
```

---

## 6. Tabelas Supabase tocadas no fluxo

| Tabela | Quando é tocada | Por qual node |
|--------|-----------------|---------------|
| `clientes_whatsapp` | ler/criar contato, atualizar status, salvar metadata | `checkOrCreateCustomer`, `handleHumanHandoff`, `updateContactMetadata` |
| `n8n_chat_histories` | salvar mensagem user/ai, ler histórico | `saveChatMessage`, `getChatHistory` |
| `documents` | RAG vector search | `getRAGContext`, `handleDocumentSearchToolCall` |
| `clients` | config do tenant (multi-tenant) | `getClientConfig` |
| `bot_configurations` | flags por node (fast track, intent, RAG, etc.) | múltiplos |
| `gateway_usage_logs` | tracking de cada chamada de LLM | `direct-ai-tracking` |
| `client_budgets` | gate antes de chamar LLM | `checkBudgetAvailable` |
| `traces` / `trace_events` | observabilidade da execução | `MessageTraceLogger` |
| `crm_cards` | CRM kanban automation | `updateCRMCardStatus`, `ensureCRMCard` |
| `support_cases` | classificação de bug/suporte | `upsertSupportCase` |
| `evaluations` | qualidade da resposta | `enqueueEvaluation` worker |

---

## 7. Caminhos de saída — como uma resposta chega no celular

```mermaid
sequenceDiagram
    participant U as Usuário<br/>WhatsApp
    participant M as Meta Cloud
    participant W as Webhook<br/>route.ts
    participant F as chatbotFlow.ts
    participant R as Redis
    participant DB as Supabase
    participant AI as Agente Principal
    participant T as Tool Handler

    U->>M: "quero falar com humano"
    M->>W: POST webhook
    W->>W: dedup + push notify
    W->>F: processChatbotMessage
    F->>F: parse + check customer
    F->>DB: save user message
    F->>R: push to redis batching
    Note over F,R: aguarda 30s ou flush
    F->>DB: get chat history (15 msgs)
    F->>DB: get RAG context (pgvector)
    F->>AI: generateAIResponse
    AI->>AI: callDirectAI OpenAI/Groq
    AI-->>F: toolCall transferir_atendimento
    F->>F: sendTextMessage "vou te conectar..."
    F->>DB: save AI message
    F->>T: handleHumanHandoff
    T->>DB: UPDATE status = transferido
    T->>Gmail: sendEmail
    T->>Push: notify mobile app
    F-->>W: success handedOff=true
    W-->>M: 200 OK
    M-->>U: "vou te conectar agora..."
```

---

## 8. Mapa rápido de arquivos

```
src/
├── app/api/webhook/[clientId]/route.ts    ← entrada, GET verify + POST process
├── flows/
│   ├── chatbotFlow.ts                     ← orquestrador (2884 linhas)
│   └── flowMetadata.ts                    ← single source of truth dos nodes
├── nodes/                                 ← funções puras, atomicas
│   ├── filterStatusUpdates.ts             ← 1
│   ├── parseMessage.ts                    ← 2
│   ├── checkOrCreateCustomer.ts           ← 3
│   ├── downloadMetaMedia.ts               ← 4a
│   ├── transcribeAudio.ts                 ← 4b (Whisper)
│   ├── analyzeImage.ts                    ← 4c (Vision)
│   ├── analyzeDocument.ts                 ← 4d (PDF)
│   ├── normalizeMessage.ts                ← 5
│   ├── checkHumanHandoffStatus.ts         ← 6
│   ├── pushToRedis.ts                     ← 7
│   ├── saveChatMessage.ts                 ← 8 + 12.6
│   ├── batchMessages.ts                   ← 9
│   ├── fastTrackRouter.ts                 ← 9.5  [LLM agent]
│   ├── getChatHistory.ts                  ← 10
│   ├── getRAGContext.ts                   ← 11
│   ├── checkContinuity.ts                 ← 10.5
│   ├── classifyIntent.ts                  ← 10.6 [LLM agent]
│   ├── generateAIResponse.ts              ← 12   [LLM agent — PRINCIPAL]
│   ├── handleHumanHandoff.ts              ← tool transferir_atendimento
│   ├── handleDocumentSearchToolCall.ts    ← tool buscar_documento
│   ├── handleCalendarToolCall.ts          ← tools de calendário
│   ├── updateContactMetadata.ts           ← tool registrar_dado_cadastral
│   ├── detectRepetition.ts                ← 12.5
│   ├── formatResponse.ts                  ← 13 (sanitiza tool leaks)
│   ├── sendWhatsAppMessage.ts             ← 14 (texto)
│   ├── sendWhatsAppAudio.ts               ← 14 (áudio)
│   ├── sendWhatsAppDocument.ts            ← 14 (doc)
│   ├── sendWhatsAppImage.ts               ← 14 (img)
│   ├── captureLeadSource.ts               ← side-effect 3
│   ├── updateCRMCardStatus.ts             ← side-effect múltiplos pontos
│   └── checkInteractiveFlow.ts            ← fluxos interativos (botões)
├── lib/
│   ├── direct-ai-client.ts                ← callDirectAI (Vault + provider routing)
│   ├── agent-tools.ts                     ← buildAllowedTools (catálogo)
│   ├── crm-intent-classifier.ts           ← [LLM agent — CRM]
│   ├── evaluation-worker.ts               ← worker async
│   ├── vault.ts                           ← credenciais por tenant
│   ├── config.ts                          ← getClientConfig
│   ├── redis.ts                           ← batching + dedup
│   ├── meta.ts                            ← sendTextMessage, sendMedia
│   ├── postgres.ts                        ← query() pool
│   ├── supabase.ts                        ← createServiceRoleClient
│   ├── trace-logger.ts                    ← observability
│   └── unified-tracking.ts                ← budget enforcement + usage log
└── handlers/
    └── handleAudioToolCall.ts             ← tool enviar_resposta_em_audio
```

---

## 9. Observações importantes

- **Multi-tenant total**: cada cliente tem sua URL de webhook (`/api/webhook/{clientId}`), suas próprias API keys (Vault), seu próprio prompt, modelo, tools habilitadas.
- **Redis batching** (node 9): se chegam 3 mensagens em sequência, o bot junta antes de chamar a IA — evita resposta tripla.
- **Race condition resolvida** (node 14): mensagens são salvas no DB **imediatamente após enviar**, antes do delay para a próxima — assim a próxima janela de batching já tem o histórico.
- **Tool calls vazadas** (problema atual com gpt-5.4-nano): `formatResponse` agora remove blocos JSON com chaves de tools conhecidas + frases narrativas inventadas. Detalhes em `memory/project_gpt54_nano_tool_leak.md`.
- **Encerradores de fluxo**: só 3 caminhos param o pipeline antes do `Send WhatsApp` normal:
  1. `checkHumanHandoffStatus` retorna humano ativo → para no node 6
  2. `transferir_atendimento` → para após o handoff
  3. `enviar_resposta_em_audio` → para após enviar TTS

- **Configuração visual**: tudo o que é `configurable: true` em `flowMetadata.ts` aparece em `/dashboard/flow-architecture` para o tenant ligar/desligar.

---

## 10. Anatomia do `generateAIResponse.ts` — todas as constantes

Esse arquivo é o **coração do Agente Principal**. Tem 14 constantes/blocos, divididos em 3 grupos: **helper**, **prompt padrão**, e **definições legadas de tools** (mantidas só para compatibilidade — as tools "vivas" estão em `src/lib/agent-tools.ts`).

### 10.1 Helper de validação de slots

#### `checkSlotsAreFilled` — [linha 18](src/nodes/generateAIResponse.ts#L18)
```ts
const checkSlotsAreFilled = (metadata, requiredSlots) => boolean
```
- **O que faz**: verifica se todos os campos obrigatórios (slots) já estão preenchidos no `metadata` do contato.
- **Quando é chamado**: dentro de `generateAIResponse`, antes de decidir se libera tools de calendário (V2: `agentV2.requireSlotsForCalendar`).
- **Por quê existe**: gating do Agent V2 — só deixa o LLM agendar evento depois que o cliente já forneceu nome, email, etc.
- **Note**: existe um **gêmeo** desse helper em `src/lib/agent-tools.ts:41`. Os dois fazem a mesma coisa — duplicação que vale unificar um dia.

### 10.2 Prompt padrão

#### `DEFAULT_SYSTEM_PROMPT` — [linha 31](src/nodes/generateAIResponse.ts#L31)
- **O que é**: prompt **fallback neutro** em XML tags (`<identity>`, `<rules>`).
- **Quando é usado**: só quando o tenant **não tem** `systemPrompt` configurado no Vault (raro). O código loga warning `[AI] Missing tenant system prompt; using neutral fallback`.
- **Por quê existe**: evitar bias de domínio (ex: agente "yoga" respondendo cliente que ainda não configurou nada).

### 10.3 Definições legadas de tools (formato OpenAI v1)

> ⚠️ **Importante**: estas constantes são definidas em formato `{ type: "function", function: {...} }` (formato Chat Completions clássico). Elas **não são mais usadas** no fluxo principal — apenas o array `tools` montado nas linhas ~582-588 chega de fato à API. As tools "vivas" são montadas em `buildAllowedTools()` em [src/lib/agent-tools.ts](src/lib/agent-tools.ts) e passadas pelo parâmetro `tools` do `callDirectAI`.
>
> O array antigo `legacyToolDefinitions` está com `false &&` (linha 665) — desabilitado. Ou seja, **estas constantes só servem hoje como fonte de `description`** (alguns lugares fazem `XYZ_TOOL_DEFINITION.function.description`).

#### `HUMAN_HANDOFF_TOOL_DEFINITION` — [linha 62](src/nodes/generateAIResponse.ts#L62)
- **Tool**: `transferir_atendimento`
- **Args**: `motivo: string`
- **Quando é chamado**: ainda referenciado em `legacyToolDefinitions.transferir_atendimento.description` (linha 668). Hoje **inerte** porque o flag está `false &&`.

#### `SEARCH_DOCUMENT_TOOL_DEFINITION` — [linha 81](src/nodes/generateAIResponse.ts#L81)
- **Tool**: `buscar_documento`
- **Args**: `query: string`, `document_type: any|catalog|manual|faq|image`
- **Quando**: idem — só `description` é referenciada.

#### `TTS_AUDIO_TOOL_DEFINITION` — [linha 108](src/nodes/generateAIResponse.ts#L108)
- **Tool**: `enviar_resposta_em_audio`
- **Args**: `texto_para_audio: string`
- **Quando**: idem.

#### `CHECK_CALENDAR_TOOL_DEFINITION` — [linha 131](src/nodes/generateAIResponse.ts#L131)
- **Tool**: `verificar_agenda`
- **Args**: `tipo` (`horarios_livres`|`eventos_existentes`), `data_inicio`, `data_fim`.
- **Quando**: idem.

#### `CREATE_CALENDAR_EVENT_TOOL_DEFINITION` — [linha 162](src/nodes/generateAIResponse.ts#L162)
- **Tool**: `criar_evento_agenda`
- **Args**: `titulo`, `data_hora_inicio`, `data_hora_fim`, `descricao?`, `email_participante?`
- **Quando**: idem.

#### `RESCHEDULE_CALENDAR_EVENT_TOOL_DEFINITION` — [linha 256](src/nodes/generateAIResponse.ts#L256)
- **Tool**: `alterar_evento_agenda`
- **Args**: `event_id`, `novo_titulo?`, `nova_data_hora_inicio?`, `nova_data_hora_fim?`
- **Quando**: idem.

#### `CANCEL_CALENDAR_EVENT_TOOL_DEFINITION` — [linha 288](src/nodes/generateAIResponse.ts#L288)
- **Tool**: `cancelar_evento_agenda`
- **Args**: `event_id?`, `event_ids?[]`, `titulo?`, `data_inicio?`, `data_fim?`
- **Quando**: idem.

#### `REGISTER_CONTACT_DATA_TOOL_DEFINITION` — [linha 224](src/nodes/generateAIResponse.ts#L224)
- **Tool**: `registrar_dado_cadastral`
- **Args**: `campo` (enum), `valor`, ou `campos: Record<string,string>`
- **Quando**: idem.

### 10.4 Catálogo de campos cadastrais

#### `CONTACT_METADATA_FIELDS` — [linha 200](src/nodes/generateAIResponse.ts#L200)
- **O que é**: tupla `as const` com os 20 campos válidos para `registrar_dado_cadastral` — `nome`, `cpf`, `email`, `como_conheceu`, `indicado_por`, `objetivo`, `experiencia`, `experiencia_yoga`, `periodo_preferido`, `dia_preferido`, `nome_completo`, `data_nascimento`, `rg`, `cep`, `endereco`, `bairro`, `cidade`, `estado`, `telefone_alternativo`, `profissao`.
- **Quando é usado**:
  - Como `enum` no Zod schema da tool `registrar_dado_cadastral`.
  - Listado dentro da regra de sistema "REGRA OBRIGATORIA DE CADASTRO" (linha 432) injetada no prompt — diz à LLM quais campos pode salvar.
- **Note**: existe **outra cópia** em `src/lib/agent-tools.ts:4` (mesma duplicação do helper).

#### `CONTACT_METADATA_FIELD_SET` — [linha 222](src/nodes/generateAIResponse.ts#L222)
- **O que é**: `Set<string>` derivado de `CONTACT_METADATA_FIELDS`.
- **Quando**: usado no `.refine()` do Zod schema legado para validar que pelo menos um campo válido foi enviado quando o LLM passa `campos: {...}`.

### 10.5 Constantes locais dentro de `generateAIResponse()` (a função em si)

A função na linha 354 monta o pacote final que vai pra LLM. Variáveis criadas dentro dela na ordem de execução:

| Var | Linha | O que carrega | Quando é usada |
|-----|-------|---------------|----------------|
| `configuredSystemPrompt` | 374 | `config.prompts.systemPrompt` trimmed | Detecta se tenant configurou prompt |
| `isUsingDefaultSystemPrompt` | 375 | bool | Só para logar warning |
| `systemPrompt` | 376 | prompt do tenant **OU** `DEFAULT_SYSTEM_PROMPT` | Vai como primeira mensagem `system` |
| `messages` | 385 | array que vira o payload | Acumula mensagens system + history + user |
| `dateTimeInfo` | 396 | string com data/hora Brasília | Injetado se `includeDateTimeInfo=true` (default sim) |
| `metaLines` | 452 | bullets dos dados já coletados do contato | Vira system message "DADOS JÁ COLETADOS DESTE CONTATO — NÃO pergunte novamente" |
| `calendarToolsAllowed` | 515 | bool — tools de calendar liberadas? | Gate para regras de calendário no prompt |
| `validHistory` | 545 | filtra histórico inválido | Append no `messages` |
| `tools` | 581 | array de definições legadas | Hoje **não vai pra API** — só montado para compatibilidade futura |
| `budgetAvailable` | 591 | bool — tem orçamento? | Aborta se acabou o crédito do tenant |
| `currentUserMessage` | 599 | a mensagem atual do user | Separada do resto p/ enforce de budget |
| `priorMessages` | 600 | tudo antes da mensagem atual | Idem |
| `budgetedContext` | 601 | output de `enforceInputBudget` | Versão truncada respeitando token limits |
| `finalMessages` | 618 | array final que vai pra LLM | Construído na ordem: system → knowledge_context → history → user |
| `allowedTools` | 634 | tools "vivas" via `buildAllowedTools()` | Esse SIM vai pra API (parâmetro `tools` do `callDirectAI`) |
| `coreMessages` | 647 | `finalMessages` convertido pra `CoreMessage` (AI SDK) | Param `messages` do `callDirectAI` |
| `result` | 653 | resposta do LLM (text + toolCalls + usage) | Convertida em `AIResponse` no `return` |
| `toolCallNames` | 879 | só pra log | Console |

### 10.6 Mensagens de sistema injetadas dinamicamente

A função NÃO usa apenas `DEFAULT_SYSTEM_PROMPT`. Ela monta um **stack** de system messages na ordem:

```mermaid
flowchart TD
    M0[1. systemPrompt do tenant<br/>OU DEFAULT_SYSTEM_PROMPT]
    M1[2. dateTimeInfo<br/>se includeDateTimeInfo]
    M2[3. greetingInstruction<br/>se Phase 1 continuity]
    M3[4. REGRA CRITICA DE TOOLS<br/>se enableTools — sanidade contra leak]
    M4[5. REGRA OBRIGATORIA DE CADASTRO<br/>se enableTools — força registrar_dado_cadastral]
    M5[6. MODO SUPORTE ATIVO<br/>se supportModeEnabled]
    M6[7. DADOS JA COLETADOS<br/>se contactMetadata existir]
    M7[8. REGRAS OBRIGATORIAS DE CALENDARIO<br/>se calendar conectado + slots ok]
    M8[9. CONTEXTO RAG<br/>se ragContext > 0 — injetado APOS budget]
    M9[10. histórico validado<br/>últimas N mensagens]
    M10[11. mensagem atual do usuário<br/>customerName: message]

    M0 --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7 --> M8 --> M9 --> M10
    M10 --> LLM[(callDirectAI)]

    style M0 fill:#4F46E5,color:#fff
    style M3 fill:#DC2626,color:#fff
    style M8 fill:#10B981,color:#fff
    style LLM fill:#F59E0B,color:#fff
```

Cada bloco "se X" é configurável: tenant pode desligar tools, RAG, suporte, calendário, etc.

### 10.7 Resumo: por que existem tantas constantes "mortas"?

- O arquivo carrega **dívida histórica** da migração `AI Gateway → Direct AI`. As `*_TOOL_DEFINITION` no formato OpenAI v1 eram passadas direto antes; hoje o `buildAllowedTools()` em `agent-tools.ts` (formato AI SDK v5 com Zod) é a fonte real.
- A estrutura `legacyToolDefinitions` em `callDirectAI` ainda existe como caminho condicional (`false && enableTools && config.settings.enableTools`) — fica como **interruptor desligado** caso precise voltar ao formato antigo.
- Limpeza pendente: remover as 7 `*_TOOL_DEFINITION` constantes (e o bloco `legacyToolDefinitions`) deixaria o arquivo ~250 linhas menor sem mudar comportamento, já que `buildAllowedTools` cobre tudo.
