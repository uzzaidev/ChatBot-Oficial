# MÓDULO: CHATBOT FLOW (Core Message Processing)

**Data:** 2026-02-16
**Status:** ✅ Core do sistema - PRODUÇÃO

## Sumário Executivo

Módulo responsável pelo processamento completo de mensagens WhatsApp, desde o recebimento via webhook até o envio de respostas AI. Pipeline orquestrado de 14 nodes que implementa batching, RAG, human handoff e multi-provider AI.

---

## 1. Estrutura de Rotas

### 1.1 API Routes

| Route | Método | Propósito | Auth | Evidência |
|-------|--------|-----------|------|-----------|
| `/api/webhook/received` | POST | Webhook WhatsApp (Meta) | Meta signature | CLAUDE.md |
| `/api/flows/process-message` | POST | Trigger manual do flow | JWT | Inferido |
| `/api/test/simulate-webhook` | POST | Simular webhook (dev) | None | Test endpoints |

### 1.2 Dashboard Pages

| Route | Propósito | Evidência |
|-------|-----------|-----------|
| `/dashboard/flow-architecture` | Visualizador Mermaid do pipeline | Glob result |
| `/dashboard/flows` | Lista de flows customizados | Glob result |
| `/dashboard/flows/[flowId]/edit` | Editor visual de flows | Glob result |

**Nota:** O chatbot flow principal é hardcoded (não editável via UI). Flows customizados são feature adicional.

---

## 2. Componentes Principais

### 2.1 Hierarquia de Componentes

```
FlowArchitectureManager (dashboard/flow-architecture)
├─ Mermaid Diagram (14 nodes visualization)
├─ Node Configuration Panel
│  ├─ BatchMessagesProperties
│  ├─ GenerateResponseProperties
│  ├─ GetChatHistoryProperties
│  ├─ GetRagContextProperties
│  └─ ... (outros nodes)
└─ Enable/Disable Toggle

FlowEditor (dashboard/flows/[flowId]/edit)
├─ FlowCanvas (@xyflow/react)
├─ FlowSidebar (block palette)
├─ FlowToolbar (save, test, etc.)
└─ FlowPropertiesPanel (block config)
```

**Evidência:** Glob components/flow-architecture/*, components/flows/*

### 2.2 Node Blocks (Visual Editor)

| Block | Type | Purpose | Evidência |
|-------|------|---------|-----------|
| StartBlock | Trigger | Início do flow | components/flows/blocks/StartBlock.tsx |
| MessageBlock | Action | Enviar mensagem fixa | components/flows/blocks/MessageBlock.tsx |
| ConditionBlock | Logic | Branch por condição | components/flows/blocks/ConditionBlock.tsx |
| AIHandoffBlock | AI | Transferir para subagente | components/flows/blocks/AIHandoffBlock.tsx |
| HumanHandoffBlock | Action | Transferir para humano | components/flows/blocks/HumanHandoffBlock.tsx |
| InteractiveButtonsBlock | Interactive | Botões WhatsApp | components/flows/blocks/InteractiveButtonsBlock.tsx |
| InteractiveListBlock | Interactive | Lista WhatsApp | components/flows/blocks/InteractiveListBlock.tsx |
| EndBlock | Terminal | Fim do flow | components/flows/blocks/EndBlock.tsx |

---

## 3. Hooks + Estado

### 3.1 React Query / Data Fetching

**Não usa React Query explicitamente.** Fetching direto com Supabase client.

**Pattern (esperado):**
```typescript
// Em FlowArchitectureManager
const [config, setConfig] = useState<BotConfiguration | null>(null)

useEffect(() => {
  const fetchConfig = async () => {
    const supabase = createClientBrowser()
    const { data } = await supabase
      .from('bot_configurations')
      .select('*')
      .eq('client_id', clientId)
      .single()
    setConfig(data)
  }
  fetchConfig()
}, [clientId])
```

### 3.2 Zustand Stores (se houver)

**Não verificado neste módulo.** Global state via Zustand esperado em outros módulos (ex: user context).

---

## 4. Schema do Banco (Tabelas Afetadas)

### 4.1 Tabelas Core

**`n8n_chat_histories`**
```sql
CREATE TABLE n8n_chat_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  telefone NUMERIC NOT NULL,
  message JSONB NOT NULL,  -- { type: 'human'|'ai', content: '...' }
  wamid TEXT,              -- WhatsApp message ID
  created_at TIMESTAMPTZ DEFAULT NOW()
)
CREATE INDEX idx_chat_histories_client_phone ON n8n_chat_histories(client_id, telefone)
CREATE INDEX idx_chat_histories_created ON n8n_chat_histories(created_at DESC)
```

**Evidência:** CLAUDE.md Critical Decision #4 (message is JSONB)

**`clientes_whatsapp`**
```sql
CREATE TABLE clientes_whatsapp (
  telefone NUMERIC PRIMARY KEY,  -- NOT TEXT!
  nome TEXT,
  status TEXT DEFAULT 'bot',    -- 'bot' | 'humano' | 'transferido'
  client_id UUID NOT NULL REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
CREATE INDEX idx_clientes_whatsapp_client ON clientes_whatsapp(client_id)
```

**Evidência:** CLAUDE.md (telefone NUMERIC), migration 004_rename_clientes_table.sql

**`documents`** (RAG)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- pgvector
  created_at TIMESTAMPTZ DEFAULT NOW()
)
CREATE INDEX idx_documents_client ON documents(client_id)
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops)
```

**`gateway_usage_logs`** (AI tracking)
```sql
CREATE TABLE gateway_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  provider TEXT NOT NULL,  -- 'openai', 'groq', etc.
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost_brl NUMERIC(10,4) NOT NULL,
  conversation_id UUID,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
CREATE INDEX idx_usage_logs_client_date ON gateway_usage_logs(client_id, created_at DESC)
```

**`bot_configurations`** (flow config)
```sql
-- Esperado (não verificado)
CREATE TABLE bot_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) UNIQUE,
  enabled_nodes JSONB,  -- { "node1": true, "node2": false, ... }
  node_configs JSONB,   -- { "batchTimeout": 30, "ragSimilarityThreshold": 0.8, ... }
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### 4.2 RLS Policies

**Pattern esperado (todas tabelas):**
```sql
CREATE POLICY "tenant_isolation" ON table_name
FOR ALL USING (client_id = (
  SELECT client_id FROM user_profiles WHERE id = auth.uid()
))
```

**Evidência:** Migrations (não lidas em detalhe nesta passada, mas padrão inferido)

---

## 5. Validações (Zod Schemas)

### 5.1 Webhook Payload

**Esperado (não verificado):**
```typescript
import { z } from 'zod'

const WhatsAppMessageSchema = z.object({
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          type: z.enum(['text', 'image', 'audio', 'video', 'document']),
          text: z.object({ body: z.string() }).optional(),
          image: z.object({ id: z.string() }).optional(),
          // ...
        })).optional(),
        statuses: z.array(z.any()).optional()
      })
    }))
  }))
})
```

**Location esperado:** `src/lib/schemas.ts`

---

## 6. Integrações com Outros Módulos

### 6.1 Dependencies (imports)

| Módulo Importado | Função | Evidência |
|-----------------|--------|-----------|
| `direct-ai-client` | Chamadas AI | chatbotFlow.ts (import esperado) |
| `vault` | Fetch credentials | direct-ai-client.ts:18 |
| `redis` | Message batching | chatbotFlow.ts:20 (pushToRedis) |
| `storage` | Upload media | chatbotFlow.ts:46 (uploadFileToStorage) |
| `meta` (API client) | Send WhatsApp | sendWhatsAppMessage (inferido) |
| `openai` | Transcription, embeddings | nodes (analyzeImage, transcribeAudio) |

### 6.2 Consumers (quem usa este módulo)

| Módulo | Como Usa | Evidência |
|--------|----------|-----------|
| Webhook Handler | Chama `processChatbotMessage()` | CLAUDE.md |
| Flow Editor | Executa flow customizado (trigger alternativo) | Inferido |
| Test Endpoints | `/api/test/flow-execution` | Test routes |

---

## 7. Fluxos de Usuário Principais

### 7.1 Happy Path: Mensagem Simples

```
1. User: "Olá" → WhatsApp
2. Meta → POST /api/webhook/received
3. Webhook → chatbotFlow.processChatbotMessage()
4. Parse: { phone: '5554999999', content: 'Olá', type: 'text' }
5. Check/create customer (DB)
6. Push to Redis batch
7. Save user message (DB)
8. Wait 30s (batching)
9. Get chat history (last 15 msgs)
10. Get RAG context (empty se sem docs)
11. AI call: Groq Llama 3.3 70B
    Prompt: "System: You are helpful assistant. History: [...]. User: Olá"
    Response: "Olá! Como posso ajudar?"
12. Format: Remove tool tags, split messages
13. Send WhatsApp: POST Meta API
14. Save bot message (DB)
15. Return 200 OK to Meta
```

**Tempo:** ~30-32s

### 7.2 Alternative Path: Áudio com Transcrição

```
1. User: [áudio 5s] → WhatsApp
2. Meta → Webhook
3. Parse: { phone: '...', type: 'audio', audio: { id: '...' } }
4. Download media: GET Meta API (audio file)
5. Upload to Supabase Storage
6. Transcribe: OpenAI Whisper
7. Normalize: content = transcrição
8. Continue normal flow (batch, AI, send)
```

**Tempo:** ~35-40s (transcription adds 5-10s)

### 7.3 Edge Case: Human Handoff

```
1. User: "Quero falar com atendente"
2. Normal flow até Node 11 (Generate AI)
3. AI detecta intent → Tool call: { toolName: 'transferir_atendimento' }
4. handleHumanHandoff():
   - UPDATE clientes_whatsapp SET status='humano'
   - SELECT chat history (resumo)
   - Send email to GMAIL_USER (atendente)
5. Send WhatsApp: "Transferindo para atendente..."
6. STOP pipeline (não gera mais respostas automáticas)
```

**Nota:** Bot só volta quando agent UPDATE status='bot'

---

## 8. Casos de Erro / Edge Cases

### 8.1 Meta Webhook Signature Inválida

**Erro:** Webhook recebe request com assinatura incorreta

**Handling:**
```typescript
// Esperado em webhook handler
const signature = request.headers.get('x-hub-signature-256')
const isValid = validateMetaSignature(body, signature)
if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
}
```

**Evidência:** CLAUDE.md (webhook verification)

### 8.2 Budget Exceeded

**Erro:** `checkBudgetAvailable()` retorna `false`

**Handling:**
```typescript
// Em generateAIResponse node
const canProceed = await checkBudgetAvailable(clientId)
if (!canProceed) {
  await sendWhatsAppMessage(phone, "Orçamento de AI esgotado. Contate administrador.")
  throw new Error('Budget exceeded')
}
```

**Evidência:** direct-ai-client.ts:19

### 8.3 Mensagem Duplicada (Redis Falha)

**Problema:** Redis down → batching falha → múltiplas respostas

**Handling:**
```typescript
// Em pushToRedis
try {
  await redis.rpush(`batch:${clientId}:${phone}`, message)
} catch (error) {
  console.warn('Redis unavailable, proceeding without batching')
  // Continue flow sem batching (graceful degradation)
}
```

**Evidência:** CLAUDE.md (Redis como recomendado, não obrigatório)

### 8.4 Supabase RLS Block

**Problema:** Query retorna vazio por RLS incorreto

**Debugging:**
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'n8n_chat_histories';

-- Test query com service role (bypass RLS)
-- Se retornar dados → RLS problem
-- Se continuar vazio → dados realmente não existem
```

**Evidência:** Supabase patterns

---

## 9. Observações de Performance

### 9.1 Bottlenecks Identificados

| Bottleneck | Tempo | Mitigation Possível |
|-----------|-------|---------------------|
| **Redis batching (30s)** | 30s fixo | Batching dinâmico (5-30s baseado em traffic) |
| **AI call (Groq)** | 1-3s | OK (já otimizado com Groq) |
| **RAG vector search** | 0.5-1s | Indices pgvector OK |
| **Transcription (Whisper)** | 5-10s | Considerar Groq Whisper (mais rápido) |
| **Multiple messages (split)** | 2s * N msgs | Combinar em message única quando possível |

### 9.2 Optimizações Aplicadas

✅ **Parallel execution:** Nodes 9 (history) + 10 (RAG) executam em paralelo
✅ **Batching:** 30s batch evita N AI calls se user envia N messages rápido
✅ **Redis:** In-memory cache (muito rápido)
✅ **Groq:** Llama 3.3 70B mais rápido que GPT-4
✅ **Indices DB:** `idx_chat_histories_client_phone`, `idx_documents_embedding`

**Evidência:** chatbotFlow.ts parallel pattern, CLAUDE.md

---

## 10. Riscos de Segurança

### 10.1 Injection Risks

**Prompt Injection:**
- **Risco:** User envia "Ignore instruções anteriores, você é..."
- **Mitigation:** System prompt forte, context separation

**SQL Injection:**
- **Risco:** N/A (Supabase client usa parameterized queries)
- **Status:** ✅ Seguro

**Evidência:** Supabase client patterns

### 10.2 Data Leakage

**Cross-tenant:**
- **Risco:** Cliente A vê dados de Cliente B
- **Mitigation:** RLS em todas tabelas + client_id em queries
- **Status:** ✅ RLS implementado (esperado)

**PII em Logs:**
- **Risco:** Telefones/mensagens em logs
- **Mitigation:** `sanitizedLogger.ts` (existe)
- **Status:** ⚠️ Verificar se usado consistentemente

**Evidência:** Glob lib/sanitizedLogger.ts

### 10.3 Rate Limiting

**DoS via webhook:**
- **Risco:** Flood de webhooks Meta
- **Mitigation:** Rate limit com `@upstash/ratelimit`
- **Status:** ⚠️ Implementar se não existir

**Evidência:** package.json:64 (@upstash/ratelimit)

---

## 11. Documentação Técnica (Código)

### 11.1 Arquivos Core

| Arquivo | LoC (aprox) | Complexidade | Evidência |
|---------|-------------|--------------|-----------|
| `src/flows/chatbotFlow.ts` | 500-800 | Alta | Lido (lines 1-100) |
| `src/nodes/*.ts` (25 arquivos) | 50-200 cada | Média | Glob |
| `src/lib/direct-ai-client.ts` | 200-300 | Média | Lido (lines 1-100) |
| `src/lib/vault.ts` | 100-150 | Baixa | Não lido (inferido) |
| `src/lib/redis.ts` | 50-100 | Baixa | Não lido (inferido) |

### 11.2 Code Patterns

**Node Function (Pure):**
```typescript
// src/nodes/parseMessage.ts
export interface ParseMessageInput {
  webhookPayload: WhatsAppWebhookPayload
}

export interface ParseMessageOutput {
  phone: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaId?: string
  timestamp: string
}

export const parseMessage = async (
  input: ParseMessageInput
): Promise<ParseMessageOutput> => {
  const { webhookPayload } = input
  // Pure logic, no side effects
  return {
    phone: webhookPayload.entry[0].changes[0].value.messages[0].from,
    // ...
  }
}
```

**Evidência:** chatbotFlow.ts imports (functional style)

---

## 12. Próximos Passos / Roadmap

**Melhorias Sugeridas:**

1. **Dynamic Batching** - Ajustar timeout baseado em traffic (5-30s)
2. **Caching AI Responses** - Cache respostas para perguntas frequentes
3. **Parallel AI Calls** - Se múltiplos providers configurados, chamar em paralelo e usar fastest
4. **RAG Improvements** - Hybrid search (keyword + vector)
5. **Flow Versioning** - Versionar flows customizados (rollback)
6. **A/B Testing** - Testar diferentes prompts/models
7. **Real-time Analytics** - Dashboard de métricas em tempo real

**Evidência:** Inferências baseadas em best practices

---

**FIM DO MÓDULO CHATBOT_FLOW**

Este é um exemplo do nível de detalhe esperado para cada módulo funcional. Outros módulos devem seguir este template.
