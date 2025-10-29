# OpenAI Usage Tracking - Implementação Completa

## 🎯 Objetivo

Registrar TODOS os usos de APIs OpenAI no banco de dados, separando por tipo de operação para análise precisa de custos.

## ✅ O que foi implementado

### 1. Funções OpenAI Atualizadas (`src/lib/openai.ts`)

Todas as funções OpenAI agora retornam usage data:

#### **Whisper (Transcrição de Áudio)**
```typescript
transcribeAudio(audioBuffer) → {
  text: string
  usage: { prompt_tokens, completion_tokens, total_tokens }
  model: 'whisper-1'
  durationSeconds: number
}
```
- ⚠️ Whisper não retorna tokens da API
- Estimativa baseada em duração: `~1KB = 1s de áudio`
- Estimativa de tokens: `1000 tokens por minuto`

#### **GPT-4o Vision (Análise de Imagem)**
```typescript
analyzeImageFromBuffer(imageBuffer, prompt, mimeType) → {
  content: string
  usage: { prompt_tokens, completion_tokens, total_tokens }
  model: 'gpt-4o'
}
```
- ✅ Captura usage real da API

#### **GPT-4o (Resumo de PDF)**
```typescript
summarizePDFContent(pdfText, filename) → {
  content: string
  usage: { prompt_tokens, completion_tokens, total_tokens }
  model: 'gpt-4o'
}
```
- ✅ Captura usage real da API

#### **Embeddings (RAG - Vector Search)**
```typescript
generateEmbedding(text) → {
  embedding: number[]
  usage: { prompt_tokens, completion_tokens, total_tokens }
  model: 'text-embedding-3-small'
}
```
- ✅ Captura usage real da API
- ⚠️ RAG está desabilitado temporariamente (função `match_documents` não existe)

---

### 2. Nodes Atualizados

Os nodes que chamam essas funções foram atualizados para extrair usage data:

- ✅ `src/nodes/transcribeAudio.ts`
- ✅ `src/nodes/analyzeImage.ts`
- ✅ `src/nodes/analyzeDocument.ts`

---

### 3. Tracking no ChatbotFlow (`src/flows/chatbotFlow.ts`)

O fluxo principal agora registra uso de TODAS as operações OpenAI:

#### **Áudio → Whisper**
```typescript
const transcriptionResult = await transcribeAudio(audioBuffer)
processedContent = transcriptionResult.text

await logWhisperUsage(
  config.id,           // client_id
  undefined,           // conversation_id (null)
  parsedMessage.phone, // phone
  transcriptionResult.durationSeconds,
  transcriptionResult.usage.total_tokens
)
```

#### **Imagem → GPT-4o Vision**
```typescript
const visionResult = await analyzeImage(imageBuffer, mimeType)
processedContent = visionResult.content

await logOpenAIUsage(
  config.id,
  undefined,
  parsedMessage.phone,
  visionResult.model,
  visionResult.usage
)
```

#### **Documento PDF → GPT-4o**
```typescript
const documentResult = await analyzeDocument(documentBuffer, mimeType, filename)
processedContent = documentResult.content

if (documentResult.usage && documentResult.model) {
  await logOpenAIUsage(
    config.id,
    undefined,
    parsedMessage.phone,
    documentResult.model,
    documentResult.usage
  )
}
```

#### **Chat → Groq/OpenAI** (já estava implementado)
```typescript
const aiResponse = await generateAIResponse({ message, chatHistory, ragContext, config })

if (aiResponse.usage && aiResponse.provider) {
  if (aiResponse.provider === 'openai') {
    await logOpenAIUsage(config.id, undefined, phone, aiResponse.model, aiResponse.usage)
  } else if (aiResponse.provider === 'groq') {
    await logGroqUsage(config.id, undefined, phone, aiResponse.model, aiResponse.usage)
  }
}
```

---

## 📊 Estrutura de Dados no Banco

### Tabela: `usage_logs`

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY,
  client_id UUID,
  conversation_id UUID,
  phone TEXT NOT NULL,
  source TEXT NOT NULL,          -- 'openai' | 'groq' | 'whisper' | 'meta'
  model TEXT,                     -- 'gpt-4o', 'whisper-1', 'llama-3.3-70b-versatile'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC,
  metadata JSONB,                 -- ← Pode armazenar tipo de operação
  created_at TIMESTAMPTZ
)
```

### Tipos de Source

| Source | Modelo | Operação |
|--------|--------|----------|
| `whisper` | `whisper-1` | Transcrição de áudio |
| `openai` | `gpt-4o` | Análise de imagem (Vision) |
| `openai` | `gpt-4o` | Resumo de PDF |
| `openai` | `text-embedding-3-small` | Embeddings (RAG) |
| `openai` | `gpt-4o` | Chat completion |
| `groq` | `llama-3.3-70b-versatile` | Chat completion |

### Identificando Tipos de Operação

Como diferenciar uso de GPT-4o entre Vision, PDF e Chat?

**Opção 1**: Usar campo `metadata` (JSONB)
```sql
metadata: {
  "operation_type": "vision" | "pdf_summary" | "chat" | "embedding" | "transcription"
}
```

**Opção 2**: Inferir pelo contexto
- Chat: tem `conversation_id` preenchido (futuro)
- Vision/PDF/Whisper: executados no NODE 4 (antes de criar conversa)

---

## 🔧 Como Melhorar (Próximos Passos)

### 1. Adicionar `operation_type` no metadata

Atualizar `logOpenAIUsage` e `logWhisperUsage` para incluir metadata:

```typescript
// src/lib/usageTracking.ts
export const logOpenAIUsage = async (
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  model: string,
  usage: { prompt_tokens, completion_tokens, total_tokens },
  operationType?: 'chat' | 'vision' | 'pdf_summary' | 'embedding'
): Promise<void> => {
  await logUsage({
    clientId,
    conversationId,
    phone,
    source: 'openai',
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    metadata: operationType ? { operation_type: operationType } : undefined
  })
}
```

### 2. Atualizar chamadas no chatbotFlow.ts

```typescript
// Whisper
await logWhisperUsage(config.id, undefined, phone, duration, tokens)
// metadata: { operation_type: 'transcription' } (automático)

// Vision
await logOpenAIUsage(config.id, undefined, phone, model, usage, 'vision')

// PDF
await logOpenAIUsage(config.id, undefined, phone, model, usage, 'pdf_summary')

// Chat (já implementado)
await logOpenAIUsage(config.id, undefined, phone, model, usage, 'chat')
```

### 3. Query para Analytics por Tipo de Operação

```sql
-- Ver custos por tipo de operação
SELECT
  source,
  model,
  metadata->>'operation_type' as operation_type,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost
FROM usage_logs
WHERE client_id = 'your-client-id'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY source, model, metadata->>'operation_type'
ORDER BY total_cost DESC;
```

---

## 🧪 Como Testar

### 1. Testar Whisper (Áudio)
1. Envie áudio no WhatsApp
2. Verifique logs:
   ```
   [Whisper] Transcription completed: { audioSizeKB, estimatedDuration, estimatedTokens }
   [chatbotFlow] ✅ Whisper usage logged
   ```
3. Consulte banco:
   ```sql
   SELECT * FROM usage_logs WHERE source = 'whisper' ORDER BY created_at DESC LIMIT 5;
   ```

### 2. Testar GPT-4o Vision (Imagem)
1. Envie imagem no WhatsApp
2. Verifique logs:
   ```
   [GPT-4o Vision] Usage data: { prompt_tokens, completion_tokens, total_tokens }
   [chatbotFlow] ✅ GPT-4o Vision usage logged
   ```
3. Consulte banco:
   ```sql
   SELECT * FROM usage_logs WHERE source = 'openai' AND model = 'gpt-4o' ORDER BY created_at DESC LIMIT 5;
   ```

### 3. Testar GPT-4o (PDF)
1. Envie PDF no WhatsApp
2. Verifique logs:
   ```
   [GPT-4o PDF] Usage data: { prompt_tokens, completion_tokens, total_tokens }
   [chatbotFlow] ✅ GPT-4o PDF usage logged
   ```
3. Consulte banco:
   ```sql
   SELECT * FROM usage_logs WHERE source = 'openai' AND model = 'gpt-4o' ORDER BY created_at DESC LIMIT 5;
   ```

### 4. Dashboard Analytics
1. Acesse: http://localhost:3000/dashboard/analytics
2. Verifique se tokens aumentam após cada operação
3. Verifique se custos são calculados corretamente

---

## 📝 Arquivos Modificados

```
✅ src/lib/openai.ts (funções retornam usage data)
✅ src/nodes/transcribeAudio.ts (retorna usage data)
✅ src/nodes/analyzeImage.ts (retorna usage data)
✅ src/nodes/analyzeDocument.ts (retorna usage data)
✅ src/flows/chatbotFlow.ts (registra uso de todas operações)
✅ README.md (referência para docs/tables/tabelas.md)
✅ CLAUDE.md (referência para estrutura do banco)
```

---

## ✅ Status Atual

- ✅ Whisper (áudio) → Tracking implementado
- ✅ GPT-4o Vision (imagem) → Tracking implementado
- ✅ GPT-4o (PDF) → Tracking implementado
- ✅ GPT-4o (chat) → Tracking já estava implementado
- ✅ Groq (chat) → Tracking já estava implementado
- ⏸️ Embeddings (RAG) → RAG desabilitado (função `match_documents` não existe)

---

## 🎯 Próximo Passo

Testar o sistema enviando:
1. Mensagem de texto → Verificar tracking Groq
2. Áudio → Verificar tracking Whisper
3. Imagem → Verificar tracking GPT-4o Vision
4. PDF → Verificar tracking GPT-4o

Todos os dados devem aparecer no dashboard analytics com tokens e custos calculados corretamente!
