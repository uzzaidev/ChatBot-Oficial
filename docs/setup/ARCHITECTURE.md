# 🏗️ WhatsApp AI Chatbot - Arquitetura Técnica

Documentação técnica completa da arquitetura do sistema de chatbot WhatsApp com IA.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Diagrama de Blocos](#diagrama-de-blocos)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Fluxo de Processamento (12 Nodes)](#fluxo-de-processamento-12-nodes)
5. [Decisões Arquiteturais Críticas](#decisões-arquiteturais-críticas)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Integrações Externas](#integrações-externas)
8. [Performance e Escalabilidade](#performance-e-escalabilidade)
9. [Segurança](#segurança)
10. [Monitoramento e Debug](#monitoramento-e-debug)

---

## Visão Geral

Sistema de chatbot de WhatsApp baseado em IA, implementado com arquitetura serverless no Vercel. Processa mensagens de texto, áudio e imagem através de um pipeline de 12 nodes sequenciais, com suporte a RAG (Retrieval-Augmented Generation), batching de mensagens e transferência para atendimento humano.

**Status Atual**: ✅ Produção ativa em https://uzzap.uzzai.com

**Principais Características**:

- Processamento serverless (Vercel Edge Functions)
- Pipeline modular de 12 nodes atômicos
- Suporte multi-modal (texto, áudio, imagem)
- Sistema de batching Redis (evita respostas duplicadas)
- RAG com Supabase Vector Store
- Tool calling para sub-agentes e transferência humana
- Histórico persistente em PostgreSQL

---

## Diagrama de Blocos

### Fluxo Principal (chatbotFlow.ts)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         META WHATSAPP CLOUD API                          │
│                  POST https://uzzap.uzzai.com/api/webhook             │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  WEBHOOK HANDLER       │
                    │  /api/webhook/route.ts │
                    └────────────┬───────────┘
                                 │ await processChatbotMessage(payload)
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        CHATBOT FLOW ORCHESTRATOR                           │
│                         src/flows/chatbotFlow.ts                           │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        ▼                                                  │
┌───────────────────┐                                     │
│  NODE 1           │                                     │
│  filterStatus     │  ❌ Status Update? → STOP           │
│  Updates          │  ✅ Message? → Continue             │
└────────┬──────────┘                                     │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 2           │                                     │
│  parseMessage     │  Extract: phone, name, type, content│
└────────┬──────────┘                                     │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 3           │                                     │
│  checkOrCreate    │  Upsert → clientes_whatsapp         │
│  Customer         │  Status = "human"? → STOP           │
└────────┬──────────┘  Status = "bot"? → Continue         │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 4 (COND)    │  IF type === "text"                │
│  downloadMeta     │    → SKIP (use content directly)    │
│  Media            │  ELSE (audio/image)                 │
└────────┬──────────┘    → Download from Meta API         │
         │                                                 │
         ├──── audio ────▶ transcribeAudio (Whisper)      │
         └──── image ────▶ analyzeImage (GPT-4o Vision)   │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 5           │                                     │
│  normalizeMessage │  Merge: parsedMsg + processedContent│
└────────┬──────────┘                                     │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 6           │                                     │
│  pushToRedis      │  LPUSH chat:{phone} {message}       │
└────────┬──────────┘                                     │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  saveChatMessage  │  INSERT n8n_chat_histories (user)  │
│  (user)           │                                     │
└────────┬──────────┘                                     │
         │                                                 │
         ▼                                                 │
┌───────────────────┐                                     │
│  NODE 7           │  Wait 10s → LRANGE → DELETE         │
│  batchMessages    │  Empty batch? → STOP                │
└────────┬──────────┘  Has messages? → Concatenate        │
         │                                                 │
         ▼                                                 │
    ┌────────────────────────┐                            │
    │   PARALLEL EXECUTION   │                            │
    ├────────────┬───────────┤                            │
    │            │           │                            │
    ▼            ▼           │                            │
┌─────────┐  ┌──────────┐   │                            │
│ NODE 8  │  │ NODE 9   │   │                            │
│ getChat │  │ getRAG   │   │                            │
│ History │  │ Context  │   │                            │
└────┬────┘  └────┬─────┘   │                            │
     │            │          │                            │
     └────────┬───┘          │                            │
              ▼              │                            │
     ┌─────────────────┐     │                            │
     │  NODE 10        │     │                            │
     │  generateAI     │     │                            │
     │  Response       │     │                            │
     └────────┬────────┘     │                            │
              │              │                            │
              ├─── Tool Calls? ──▶ handleHumanHandoff → STOP
              │              │                            │
              ▼              │                            │
     ┌─────────────────┐     │                            │
     │ saveChatMessage │     │                            │
     │ (ai)            │     │                            │
     └────────┬────────┘     │                            │
              │              │                            │
              ▼              │                            │
     ┌─────────────────┐     │                            │
     │  NODE 11        │     │                            │
     │  formatResponse │     │                            │
     │                 │  Remove tool calls               │
     └────────┬────────┘  Split on \n\n                   │
              │                                           │
              ▼                                           │
     ┌─────────────────┐                                 │
     │  NODE 12        │                                 │
     │  sendWhatsApp   │  Loop: delay 2s between msgs    │
     │  Message        │                                 │
     └────────┬────────┘                                 │
              │                                           │
              ▼                                           │
       ┌─────────────┐                                   │
       │   SUCCESS   │                                   │
       └─────────────┘                                   │
                                                          │
┌─────────────────────────────────────────────────────────┘
│  Return: { success: true, messagesSent: N }
└──────────────────────────────────────────────
```

### Diagrama de Arquitetura de Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Meta         │  │ OpenAI       │  │ Groq         │              │
│  │ WhatsApp API │  │ - Whisper    │  │ Llama 3.3    │              │
│  │              │  │ - GPT-4o     │  │ 70B          │              │
│  └──────┬───────┘  │ - Embeddings │  └──────┬───────┘              │
│         │          └──────┬───────┘         │                       │
│         │                 │                 │                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     VERCEL SERVERLESS (Next.js 14)                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  API ROUTES                                                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│  │  │ /api/       │  │ /api/       │  │ /api/       │            │ │
│  │  │ webhook     │  │ conversations│ │ messages    │            │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │ │
│  └─────────┼────────────────┼────────────────┼────────────────────┘ │
│            │                │                │                      │
│  ┌─────────▼────────────────▼────────────────▼────────────────────┐ │
│  │  FLOWS                                                          │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  chatbotFlow.ts (Main Orchestrator)                      │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  NODES (12 Atomic Functions)                                    │ │
│  │  [1] filterStatusUpdates   [7] batchMessages                   │ │
│  │  [2] parseMessage          [8] getChatHistory                  │ │
│  │  [3] checkOrCreateCustomer [9] getRAGContext                   │ │
│  │  [4] downloadMetaMedia     [10] generateAIResponse             │ │
│  │  [5] normalizeMessage      [11] formatResponse                 │ │
│  │  [6] pushToRedis           [12] sendWhatsAppMessage            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  LIB (Shared Utilities)                                         │ │
│  │  - supabase.ts    - redis.ts      - openai.ts                  │ │
│  │  - postgres.ts    - groq.ts       - meta.ts                    │ │
│  │  - config.ts      - types.ts      - logger.ts                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
│ SUPABASE         │  │ REDIS        │  │ GMAIL          │
│ - PostgreSQL     │  │ (Upstash)    │  │ (SMTP)         │
│ - Vector Store   │  │              │  │                │
│ - Connection Pool│  │ Message      │  │ Human Handoff  │
│                  │  │ Batching     │  │ Notifications  │
└──────────────────┘  └──────────────┘  └────────────────┘
```

---

## Stack Tecnológico

### Frontend & Backend

| Componente     | Tecnologia   | Versão  | Uso                         |
| -------------- | ------------ | ------- | --------------------------- |
| **Framework**  | Next.js      | 14.2.33 | App Router, API Routes, SSR |
| **Runtime**    | Node.js      | 18+     | Serverless functions        |
| **Linguagem**  | TypeScript   | 5.x     | Type safety                 |
| **Deploy**     | Vercel       | -       | Serverless hosting          |
| **UI**         | React        | 18.x    | Dashboard components        |
| **Styling**    | Tailwind CSS | 3.x     | Utility-first CSS           |
| **Components** | shadcn/ui    | -       | Radix UI + Tailwind         |

### Banco de Dados & Cache

| Componente          | Tecnologia              | Uso                                |
| ------------------- | ----------------------- | ---------------------------------- |
| **Database**        | Supabase PostgreSQL     | Clientes, histórico, RAG           |
| **ORM/Client**      | `@supabase/supabase-js` | Queries otimizadas para serverless |
| **Vector Store**    | pgvector                | Embeddings para RAG                |
| **Cache/Queue**     | Redis (Upstash)         | Message batching, TTL              |
| **Connection Pool** | Supavisor               | Pooling para serverless            |

### IA & Machine Learning

| Componente      | Modelo                        | Uso                  |
| --------------- | ----------------------------- | -------------------- |
| **Chat**        | Groq Llama 3.3 70B Versatile  | Geração de respostas |
| **Transcrição** | OpenAI Whisper                | Áudio → Texto        |
| **Visão**       | OpenAI GPT-4o Vision          | Imagem → Descrição   |
| **Embeddings**  | OpenAI text-embedding-3-small | RAG vector search    |

### Integrações Externas

| Serviço      | API                              | Uso                            |
| ------------ | -------------------------------- | ------------------------------ |
| **WhatsApp** | Meta WhatsApp Business Cloud API | Envio/recebimento de mensagens |
| **Email**    | Gmail SMTP                       | Notificações de handoff        |

---

## Fluxo de Processamento (12 Nodes)

### NODE 1: filterStatusUpdates

**Arquivo**: `src/nodes/filterStatusUpdates.ts`

**Função**: Remove status updates (delivered, read, sent) do payload da Meta.

**Input**: `WhatsAppWebhookPayload`

**Output**: `WhatsAppWebhookPayload | null`

**Lógica**:

```typescript
if (payload.entry[0].changes[0].value.statuses) {
  return null; // Status update, não processar
}
return payload; // Mensagem válida, continuar
```

**Condição de Parada**: Se retornar `null`, o flow termina imediatamente.

---

### NODE 2: parseMessage

**Arquivo**: `src/nodes/parseMessage.ts`

**Função**: Extrai dados estruturados do payload da Meta.

**Input**: `WhatsAppWebhookPayload`

**Output**: `ParsedMessage`

```typescript
{
  phone: string       // Ex: "5511999999999"
  name: string        // Ex: "João Silva"
  type: 'text' | 'audio' | 'image'
  content: string     // Texto, ou mediaId (se áudio/imagem)
  timestamp: string   // ISO 8601
  metadata: {
    messageId: string
    ...
  }
}
```

---

### NODE 3: checkOrCreateCustomer

**Arquivo**: `src/nodes/checkOrCreateCustomer.ts`

**Função**: Upsert de cliente na tabela `clientes_whatsapp`.

**Input**: `{ phone, name }`

**Output**: `CustomerRecord`

```typescript
{
  id: string;
  phone: string;
  name: string;
  status: "bot" | "waiting" | "human";
  created_at: string;
}
```

**Lógica**:

1. `UPSERT` via Supabase client (não `pg`!)
2. `ON CONFLICT (telefone)` → atualiza `nome` se mudou
3. Retorna registro atualizado

**Condição de Parada**: Se `status === 'human'`, o flow termina (bot não responde).

**⚠️ CRÍTICO**: Usa `@supabase/supabase-js`, **NÃO** `pg` library (serverless incompatível).

---

### NODE 4: downloadMetaMedia (Condicional)

**Arquivo**: `src/nodes/downloadMetaMedia.ts`

**Função**: Download de mídia da Meta Cloud API.

**Quando Executa**: Apenas se `type !== 'text'`

**Se `type === 'text'`**: Node é **PULADO**, usa `content` diretamente.

**Se `type === 'audio'` ou `type === 'image'`**:

1. Chama `downloadMetaMedia(mediaId)` → retorna `Buffer`
2. **Se áudio**: Chama `transcribeAudio(buffer)` → retorna `string` (transcrição)
3. **Se imagem**: Chama `analyzeImage(buffer, mimeType)` → retorna `string` (descrição)

**Output**: `string` (texto processado)

---

### NODE 5: normalizeMessage

**Arquivo**: `src/nodes/normalizeMessage.ts`

**Função**: Normaliza mensagem para formato unificado (sempre texto).

**Input**: `{ parsedMessage, processedContent }`

**Output**: `NormalizedMessage`

```typescript
{
  phone: string;
  name: string;
  content: string; // SEMPRE texto (original ou processado)
  timestamp: string;
}
```

**Lógica**:

- Se `type === 'text'`: `content = parsedMessage.content`
- Se `type === 'audio'`: `content = processedContent` (transcrição)
- Se `type === 'image'`: `content = processedContent` (descrição)

---

### NODE 6: pushToRedis

**Arquivo**: `src/nodes/pushToRedis.ts`

**Função**: Adiciona mensagem à fila Redis para batching.

**Input**: `NormalizedMessage`

**Output**: `void`

**Lógica**:

```typescript
const key = `chat:${phone}`;
await redis.lpush(key, JSON.stringify(message));
await redis.expire(key, 300); // TTL 5 minutos
```

**Próximo Step**: `saveChatMessage` (user) - salva mensagem do usuário no histórico.

---

### NODE 7: batchMessages

**Arquivo**: `src/nodes/batchMessages.ts`

**Função**: Aguarda 10s, recupera e concatena mensagens da fila Redis.

**Input**: `phone`

**Output**: `string` (mensagens concatenadas)

**Lógica**:

1. `await delay(10000)` - Aguarda 10 segundos
2. `messages = await redis.lrange(key, 0, -1)` - Lê todas as mensagens
3. `await redis.del(key)` - Remove fila
4. Concatena mensagens: `messages.join('\n\n')`

**Condição de Parada**: Se resultado vazio, flow termina.

**Por quê?**: Evita múltiplas respostas da IA quando usuário envia mensagens rápidas (ex: 3 msgs em 5s).

---

### NODE 8: getChatHistory

**Arquivo**: `src/nodes/getChatHistory.ts`

**Função**: Busca últimas 15 mensagens do histórico.

**Input**: `phone`

**Output**: `ChatMessage[]`

```typescript
{
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
[];
```

**Lógica**:

```sql
SELECT session_id, message, created_at
FROM n8n_chat_histories
WHERE session_id = $1
ORDER BY created_at DESC
LIMIT 15
```

**Parse**: Extrai `type` e `content` do JSON da coluna `message`.

**⚠️ NOTA**: Coluna `type` **NÃO EXISTE** - está dentro do JSON `message`!

---

### NODE 9: getRAGContext

**Arquivo**: `src/nodes/getRAGContext.ts`

**Função**: Vector search para recuperar conhecimento relevante.

**Input**: `string` (mensagem batched)

**Output**: `string` (documentos concatenados)

**Lógica**:

1. Gera embedding da mensagem (OpenAI `text-embedding-3-small`)
2. Chama RPC Supabase: `match_documents(embedding, 5)`
3. Concatena top 5 documentos mais similares

**Execução**: **PARALELO** com NODE 8 (`Promise.all`)

---

### NODE 10: generateAIResponse

**Arquivo**: `src/nodes/generateAIResponse.ts`

**Função**: Gera resposta da IA usando Groq Llama 3.3 70B.

**Input**:

```typescript
{
  message: string         // Batched content
  chatHistory: ChatMessage[]
  ragContext: string
  customerName: string
}
```

**Output**: `AIResponse`

```typescript
{
  content: string
  toolCalls?: ToolCall[]
  finishReason: string
}
```

**Lógica**:

1. Constrói system prompt + RAG context
2. Formata histórico de chat
3. Chama Groq API com tools definidas:
   - `transferir_atendimento` - Transfere para humano
   - `subagente_diagnostico` - Diagnostica necessidade do cliente
4. Retorna resposta + tool calls (se houver)

**Tool Calls**:

- Se `transferir_atendimento` → Chama `handleHumanHandoff()` → **PARA FLOW**
- Se `subagente_diagnostico` → (não implementado ainda, apenas log)

**Condição de Parada**: Se content vazio OU transferência humana, flow termina.

**Próximo Step**: `saveChatMessage` (ai) - salva resposta da IA no histórico.

---

### NODE 11: formatResponse

**Arquivo**: `src/nodes/formatResponse.ts`

**Função**: Remove tool calls e divide resposta em mensagens WhatsApp naturais.

**Input**: `string` (AI response content)

**Output**: `string[]` (array de mensagens)

**Lógica**:

1. **Remove tool calls**: Regex `/<function=[^>]+>[\s\S]*?<\/function>/g`
2. **Split**: Divide em `\n\n` (parágrafos)
3. **Max length**: Garante cada mensagem ≤ 4096 chars (limite WhatsApp)

**Exemplo**:

```
Input: "Olá! Como posso ajudar?\n\nVocê precisa de algo específico?"
Output: ["Olá! Como posso ajudar?", "Você precisa de algo específico?"]
```

**Condição de Parada**: Se array vazio, flow termina.

---

### NODE 12: sendWhatsAppMessage

**Arquivo**: `src/nodes/sendWhatsAppMessage.ts`

**Função**: Envia mensagens via Meta WhatsApp Business API.

**Input**: `{ phone, messages: string[] }`

**Output**: `string[]` (array de messageIds)

**Lógica**:

```typescript
for (const message of messages) {
  await sendMessage(phone, message);
  await delay(2000); // Delay 2s entre mensagens
}
```

**API Call**:

```http
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {META_ACCESS_TOKEN}
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "..." }
}
```

---

## Decisões Arquiteturais Críticas

### 1. Serverless-First Architecture

**Decisão**: Migrar de n8n para Next.js com deploy em Vercel.

**Razões**:

- **Escalabilidade**: Auto-scaling sem configuração
- **Custo**: Pay-per-use (não paga quando idle)
- **Performance**: Edge functions próximas ao usuário
- **Developer Experience**: TypeScript, hot reload, type safety

**Trade-offs**:

- ❌ Cold start latency (~500ms)
- ❌ Timeout máximo 10s (Vercel free) / 60s (pro)
- ✅ Sem gerenciamento de infra
- ✅ Deploy automático via Git push

---

### 2. Supabase Client vs `pg` Library

**Decisão**: Usar `@supabase/supabase-js` para operações de database em serverless.

**Problema com `pg`**: Conexões TCP diretas não funcionam bem em serverless (ephemeral execution context).

**Solução**: Supabase client

- Uses Supavisor (connection pooler)
- HTTP-based protocol (serverless-friendly)
- Automatic retry and reconnection
- Built-in connection pooling

**Exceção**: `pg` library ainda é usada para queries complexas no `getChatHistory` (via `POSTGRES_URL_NON_POOLING`).

**Arquivo**: `src/nodes/checkOrCreateCustomer.ts:78`

---

### 3. Message Batching Strategy (Redis)

**Problema**: Usuários enviam múltiplas mensagens em sequência (ex: 3 msgs em 5s).

**Sem batching**: Cada mensagem gera uma resposta da IA separada → UX ruim, custo alto.

**Solução**: Redis message batching

1. Push mensagem para lista Redis: `chat:{phone}`
2. Aguarda 10 segundos
3. Recupera todas as mensagens da lista
4. Concatena e processa como contexto único
5. Gera uma resposta da IA para todo o contexto

**Trade-off**:

- ✅ UX melhor (resposta única e coerente)
- ✅ Custo menor (1 chamada IA vs N chamadas)
- ❌ Latência +10s (aceitável para chatbot)

**Arquivos**: `pushToRedis.ts`, `batchMessages.ts`

---

### 4. Webhook Must Await Processing

**Decisão**: `await processChatbotMessage(body)` no webhook ANTES de retornar 200.

**Problema**: Serverless functions terminam IMEDIATAMENTE após retornar HTTP response.

**Consequência**: Queries assíncronas eram mortas antes de completar (NODE 3 travava).

**Solução**: Aguardar processamento completo:

```typescript
// BEFORE (wrong)
processChatbotMessage(body); // Fire-and-forget ❌
return new NextResponse("EVENT_RECEIVED", { status: 200 });

// AFTER (correct)
await processChatbotMessage(body); // Wait ✅
return new NextResponse("EVENT_RECEIVED", { status: 200 });
```

**Arquivo**: `src/app/api/webhook/route.ts:107`

---

### 5. Tool Calls Removal

**Decisão**: Remover `<function=...>...</function>` antes de enviar para usuário.

**Problema**: AI responses incluíam metadados de tool calls nas mensagens.

**Exemplo**:

```
Antes: "Olá! <function=subagente_diagnostico>{...}</function>"
Depois: "Olá!"
```

**Solução**: Regex em `formatResponse()`:

```typescript
text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "").trim();
```

**Arquivo**: `src/nodes/formatResponse.ts:7-10`

---

### 6. Column `type` is JSON Field

**Decisão**: Salvar `type` DENTRO do JSON da coluna `message`, não como coluna separada.

**Schema Real**:

```sql
CREATE TABLE n8n_chat_histories (
  session_id TEXT,
  message JSONB,  -- { "type": "human", "content": "...", ... }
  created_at TIMESTAMPTZ
)
```

**Formato JSON**:

```json
{
  "type": "human",
  "content": "Mensagem do usuário",
  "additional_kwargs": {}
}
```

**Arquivos**:

- `saveChatMessage.ts:23-27` - Salva JSON completo
- `getChatHistory.ts:12-18` - Parse JSON para extrair type e content

---

## Estrutura de Dados

### Tabelas PostgreSQL (Supabase)

#### `clientes_whatsapp`

```sql
CREATE TABLE clientes_whatsapp (
  telefone NUMERIC PRIMARY KEY,
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'bot',  -- 'bot' | 'waiting' | 'human'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_telefone ON clientes_whatsapp(telefone);
```

**VIEW para Compatibilidade**:

```sql
CREATE VIEW "Clientes WhatsApp" AS SELECT * FROM clientes_whatsapp;
```

---

#### `n8n_chat_histories`

```sql
CREATE TABLE n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,     -- phone number
  message JSONB NOT NULL,        -- { type, content, additional_kwargs }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_histories_session_created
  ON n8n_chat_histories(session_id, created_at DESC);
```

**Formato `message` JSON**:

```json
{
  "type": "human",
  "content": "Texto da mensagem",
  "additional_kwargs": {}
}
```

---

#### `documents` (Vector Store)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536)  -- OpenAI text-embedding-3-small
);

CREATE INDEX idx_documents_embedding
  ON documents USING ivfflat (embedding vector_cosine_ops);
```

**RPC Function**:

```sql
CREATE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_count INT
) RETURNS SETOF documents;
```

---

### Redis Keys

```
chat:{phone}        LIST    Message batching queue
  TTL: 300s (5 minutes)

Example:
  chat:5511999999999
  → ["msg1", "msg2", "msg3"]
```

---

## Integrações Externas

### Meta WhatsApp Business Cloud API

**Base URL**: `https://graph.facebook.com/v18.0`

**Endpoints Usados**:

1. **Send Message**

```http
POST /{PHONE_NUMBER_ID}/messages
Authorization: Bearer {META_ACCESS_TOKEN}
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "Hello!" }
}
```

2. **Download Media**

```http
GET /{MEDIA_ID}
Authorization: Bearer {META_ACCESS_TOKEN}
```

3. **Get Media URL**

```http
GET /{MEDIA_ID}
Authorization: Bearer {META_ACCESS_TOKEN}
Response: { "url": "https://...", "mime_type": "audio/ogg" }
```

**Rate Limits**: 80 mensagens/segundo (Cloud API)

**Webhook Events**:

- `messages` - Nova mensagem recebida
- `statuses` - Delivery receipts (filtrados por NODE 1)

---

### OpenAI API

**Modelos Usados**:

1. **Whisper** (`whisper-1`)

```typescript
await openai.audio.transcriptions.create({
  file: audioBuffer,
  model: "whisper-1",
  language: "pt",
});
```

2. **GPT-4o Vision** (`gpt-4o`)

```typescript
await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: base64Image } },
      ],
    },
  ],
});
```

3. **Embeddings** (`text-embedding-3-small`)

```typescript
await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text,
});
```

**Rate Limits**: Tier-based (veja dashboard OpenAI)

---

### Groq API

**Modelo**: `llama-3.3-70b-versatile`

```typescript
await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [...],
  tools: [
    { type: 'function', function: { name: 'transferir_atendimento', ... } },
    { type: 'function', function: { name: 'subagente_diagnostico', ... } }
  ],
  temperature: 0.7,
  max_tokens: 2000
})
```

**Rate Limits**: 30 req/min (free tier)

---

## Performance e Escalabilidade

### Métricas Atuais (Produção)

| Métrica              | Valor      | Observação               |
| -------------------- | ---------- | ------------------------ |
| **Latência Webhook** | ~2-4s      | Incluindo AI response    |
| **Cold Start**       | ~500ms     | Primeira requisição      |
| **Warm Request**     | ~1.5s      | Requisições subsequentes |
| **NODE 3 (Upsert)**  | ~200-400ms | Via Supabase client      |
| **NODE 10 (AI)**     | ~1-2s      | Groq Llama 3.3 70B       |
| **NODE 12 (Send)**   | ~300ms/msg | Meta API                 |

### Gargalos Identificados

1. **Redis Batching Delay**: 10s fixo

   - **Solução Futura**: Delay adaptativo baseado em rate de mensagens

2. **AI Generation**: 1-2s por resposta

   - **Solução Futura**: Streaming (via Server-Sent Events)

3. **Cold Start**: ~500ms
   - **Mitigação**: Vercel Edge Functions (em análise)

### Escalabilidade

**Horizontal Scaling**: Automático via Vercel

- Sem limite de instâncias concorrentes
- Auto-scaling baseado em carga

**Database**: Supabase (Postgres)

- Connection pooling via Supavisor
- Read replicas disponíveis (não configurado)

**Redis**: Upstash

- Serverless Redis (auto-scaling)
- Global replication opcional

---

## Segurança

### Autenticação Meta Webhook

**Webhook Verification** (GET request):

```typescript
const token = searchParams.get("hub.verify_token");
const challenge = searchParams.get("hub.challenge");

if (token === META_VERIFY_TOKEN) {
  return new NextResponse(challenge, { status: 200 });
}
```

**Signature Validation** (futuro):

```typescript
// TODO: Validar X-Hub-Signature-256 header
const signature = request.headers.get("x-hub-signature-256");
```

### Secrets Management

**Environment Variables**:

- `SUPABASE_SERVICE_ROLE_KEY` - Service role (bypassa RLS)
- `META_ACCESS_TOKEN` - WhatsApp send messages
- `OPENAI_API_KEY` - OpenAI API
- `GROQ_API_KEY` - Groq API
- `REDIS_URL` - Redis connection (includes password)

**Storage**: Vercel Environment Variables (encrypted at rest)

**Access**: Apenas server-side (API routes, nodes)

### Row Level Security (RLS)

**Status**: Não habilitado (usa `service_role` key)

**Futuro** (Phase 3 - Multi-tenant):

```sql
CREATE POLICY "Users can only see own data"
  ON clientes_whatsapp
  FOR SELECT
  USING (auth.uid() = client_id);
```

---

## Monitoramento e Debug

### Logging

**Structured Logging**: Console.log com prefixos

```typescript
console.log("[NODE_NAME] ✅ Success message");
console.error("[NODE_NAME] ❌ Error message");
console.warn("[NODE_NAME] ⚠️ Warning message");
```

**Log Levels**:

- `🚀` - Flow start
- `✅` - Success
- `❌` - Error
- `⚠️` - Warning
- `ℹ️` - Info

### Debug Endpoints

**Produção**: https://uzzap.uzzai.com/api/debug/

1. **GET /api/debug/config** - Ver configuração (sem secrets)

```json
{
  "environment": { "nodeEnv": "production", "isVercel": true },
  "webhook": { "baseUrl": "...", "fullUrl": "..." },
  "database": { "supabaseUrl": "...", "..." },
  "services": { "openai": "✅ CONFIGURED", "..." }
}
```

2. **GET /api/debug/logs** - In-memory execution logs

```json
{
  "logs": [{ "timestamp": "...", "node": "parseMessage", "status": "success" }]
}
```

3. **GET /api/debug/env** - Variáveis de ambiente (masked)

### Vercel Logs

**Acesso**: Dashboard Vercel → Functions → Logs

**Real-time**: `vercel logs --follow`

**Filtragem**:

```bash
vercel logs --filter "ERROR"
vercel logs --filter "NODE 3"
```

---

## Arquivos Candidatos para Limpeza

### Logs e Temporários

```
(Nenhum encontrado - projeto limpo)
```

### Documentação Antiga

Os seguintes arquivos podem ser **consolidados** (não deletados):

1. **TROUBLESHOOTING.md** - Merge para ARCHITECTURE.md → "Decisões Críticas"
2. **MIGRACAO_URGENTE.md** - Mover para `/docs/historical/`
3. **plano*de_arquitetura*\*.md** - Arquivar em `/docs/planning/`

### Arquivos de Teste

**Manter**: Todos os endpoints `/api/test/nodes/*` são úteis para debug.

**Sugestão**: Adicionar flag de ambiente para desabilitar em produção:

```typescript
if (process.env.NODE_ENV === "production") {
  return new NextResponse("Not available in production", { status: 404 });
}
```

---

## Próximos Passos (Roadmap)

### Curto Prazo (1-2 semanas)

- [ ] Implementar streaming de respostas (SSE)
- [ ] Adicionar retry logic em nodes críticos
- [ ] Configurar alertas (Sentry ou similar)
- [ ] Dashboard UI funcional (visualização de conversas)

### Médio Prazo (1-2 meses)

- [ ] Multi-tenant support (múltiplos clientes)
- [ ] Autenticação (NextAuth.js)
- [ ] Dashboard de custos (tracking tokens)
- [ ] Configuração de webhooks via UI

### Longo Prazo (3+ meses)

- [ ] Sistema de filas para long-running tasks
- [ ] A/B testing de prompts
- [ ] Analytics avançado
- [ ] Migração completa de n8n → Next.js (100%)

---

**Última Atualização**: 2025-01-27

**Mantenedores**: Luis Fernando Boff (luisfboff@hotmail.com)
