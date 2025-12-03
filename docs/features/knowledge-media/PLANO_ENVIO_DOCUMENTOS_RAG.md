# Plano de Implementação: Envio de Documentos/Imagens da Base de Conhecimento

## 📋 Visão Geral

Implementar sistema que permite ao agente principal buscar e enviar documentos/imagens da base de conhecimento RAG via WhatsApp quando solicitado pelo usuário.

**Status:** 📝 Planejamento
**Prioridade:** Alta
**Complexidade:** Média-Alta
**Estimativa:** 15-20 tarefas

---

## 🎯 Objetivos

1. Criar nova tool `buscar_documento` no agente principal
2. Implementar node especializado em buscar documentos na base de conhecimento
3. Armazenar arquivos originais no Supabase Storage
4. Modificar processo de upload para salvar arquivo original
5. Integrar envio de mídia (documentos/imagens) via WhatsApp
6. Criar interfaces de configuração no front-end (Flow Architecture, Settings)

---

## 📊 Análise da Situação Atual

### ✅ O que já existe:

1. **Base de Conhecimento RAG funcionando**
   - Tabela `documents` com chunks + embeddings (pgvector)
   - Função `match_documents` para busca semântica
   - Upload de PDF/TXT com OCR (Tesseract.js)
   - Metadata: `filename`, `documentType`, `source`, `uploadedBy`

2. **Sistema de Tools**
   - Tool `transferir_atendimento` já implementada
   - Infraestrutura para function calling (Groq/OpenAI)

3. **Envio de Mídia WhatsApp**
   - `sendImageMessage()` - linha 129-163 em `src/lib/meta.ts`
   - `sendDocumentMessage()` - linha 217-253 em `src/lib/meta.ts`
   - `sendAudioMessage()` - linha 173-205 em `src/lib/meta.ts`

4. **Flow Architecture**
   - Dashboard `/dashboard/flow-architecture` com Mermaid
   - Configurações em `bot_configurations` table

### ❌ O que está faltando:

1. **Storage de arquivos originais**
   - Atualmente: Documentos processados → chunks + embeddings
   - Problema: Arquivo original não é salvo (apenas metadados)
   - Solução: Supabase Storage bucket para arquivos

2. **Tool para buscar documentos**
   - Não existe tool `buscar_documento` no agente principal
   - Precisa de node especializado

3. **Integração RAG → WhatsApp Media**
   - RAG retorna apenas texto (context chunks)
   - Precisa retornar URL do arquivo original

4. **Configurações no Front-end**
   - Não há configuração para habilitar/desabilitar envio de documentos
   - Falta parâmetros customizáveis (tipos permitidos, tamanho máximo)

---

## 🏗️ Arquitetura Proposta

### 1. Fluxo de Upload (Modificado)

```
Upload PDF/Imagem
    ↓
1. Salvar arquivo original no Supabase Storage
    ↓
2. Gerar URL pública permanente
    ↓
3. Processar documento (chunks + embeddings)
    ↓
4. Salvar chunks na tabela documents
    ↓
5. Adicionar metadata com original_file_url
```

### 2. Fluxo de Busca e Envio (Novo)

```
Usuário solicita documento
    ↓
AI detecta intent e aciona tool buscar_documento
    ↓
Node searchDocumentInKnowledge:
    - Busca documento por nome/tipo na base
    - Retorna metadata com original_file_url
    ↓
AI decide:
    A) Retornar URL para agente principal incluir na resposta
    B) Acionar envio direto via WhatsApp
    ↓
Node sendWhatsAppMedia:
    - Detecta tipo de mídia (image, document, audio)
    - Chama sendImageMessage ou sendDocumentMessage
    - Envia via WhatsApp
```

### 3. Nova Tool Definition

```typescript
const SEARCH_DOCUMENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "buscar_documento",
    description: `Busca documentos ou imagens na base de conhecimento por nome, tipo ou assunto.
    Use quando o usuário solicitar explicitamente um documento, manual, catálogo, imagem ou arquivo.
    Exemplos: "me envia o catálogo", "preciso do manual", "tem alguma imagem sobre isso"`,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo de busca (nome do arquivo, tipo de documento ou assunto)",
        },
        document_type: {
          type: "string",
          description: "Tipo de documento (opcional): catalog, manual, faq, image",
          enum: ["catalog", "manual", "faq", "image", "any"]
        },
        send_directly: {
          type: "boolean",
          description: "Se true, envia documento diretamente ao usuário. Se false, retorna apenas informações sobre o documento.",
          default: false
        }
      },
      required: ["query"],
    },
  },
};
```

---

## 📦 Estrutura de Dados

### 1. Supabase Storage

**Bucket:** `knowledge-documents`

**Estrutura de pastas:**
```
knowledge-documents/
  ├── {client_id}/
  │   ├── catalogs/
  │   │   └── catalogo-produto-2024.pdf
  │   ├── manuals/
  │   │   └── manual-instalacao.pdf
  │   ├── images/
  │   │   └── diagrama-sistema.png
  │   └── other/
  │       └── documento-geral.txt
```

**Políticas RLS:**
```sql
-- Permitir upload para service role
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'knowledge-documents');

-- Permitir leitura pública (URLs públicas)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'knowledge-documents');
```

### 2. Tabela `documents` (Modificada)

**Migration:** `supabase/migrations/TIMESTAMP_add_original_file_metadata.sql`

```sql
-- Adicionar colunas para arquivo original
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_file_url TEXT,
ADD COLUMN IF NOT EXISTS original_file_path TEXT,
ADD COLUMN IF NOT EXISTS original_file_size INTEGER,
ADD COLUMN IF NOT EXISTS original_mime_type TEXT;

-- Index para busca por filename
CREATE INDEX IF NOT EXISTS idx_documents_filename
ON documents ((metadata->>'filename'));

-- Index para busca por documentType
CREATE INDEX IF NOT EXISTS idx_documents_type
ON documents ((metadata->>'documentType'));

-- Comment
COMMENT ON COLUMN documents.original_file_url IS 'URL pública do arquivo original no Supabase Storage';
COMMENT ON COLUMN documents.original_file_path IS 'Path do arquivo no storage bucket';
COMMENT ON COLUMN documents.original_file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN documents.original_mime_type IS 'MIME type do arquivo (application/pdf, image/jpeg, etc)';
```

### 3. Tabela `bot_configurations` (Novas configs)

```sql
-- Configurações para envio de documentos
INSERT INTO bot_configurations (client_id, config_key, config_value) VALUES
('{client_id}', 'knowledge_media:enabled', 'true'),
('{client_id}', 'knowledge_media:max_file_size_mb', '10'),
('{client_id}', 'knowledge_media:allowed_types', 'image/jpeg,image/png,application/pdf'),
('{client_id}', 'knowledge_media:auto_send', 'false'), -- Se true, envia automaticamente. Se false, pergunta antes
('{client_id}', 'knowledge_media:search_threshold', '0.7'); -- Threshold para busca semântica
```

---

## 🔧 Implementação Técnica

### FASE 1: Storage e Upload (Backend)

#### 1.1. Setup Supabase Storage

**Arquivo:** `supabase/migrations/TIMESTAMP_create_knowledge_storage.sql`

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'knowledge-documents');

CREATE POLICY "Service role can update documents"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'knowledge-documents');

CREATE POLICY "Service role can delete documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'knowledge-documents');

CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'knowledge-documents');
```

#### 1.2. Modificar Upload API

**Arquivo:** `src/app/api/documents/upload/route.ts`

**Mudanças:**

```typescript
// ANTES do processamento de chunks, salvar arquivo original

// 1. Upload para Storage
const fileName = `${Date.now()}-${file.name}`
const filePath = `${clientId}/${documentType || 'other'}/${fileName}`

const { data: uploadData, error: uploadError } = await supabase
  .storage
  .from('knowledge-documents')
  .upload(filePath, fileBuffer, {
    contentType: file.type,
    upsert: false
  })

if (uploadError) {
  throw new Error(`Failed to upload file to storage: ${uploadError.message}`)
}

// 2. Gerar URL pública
const { data: publicUrlData } = supabase
  .storage
  .from('knowledge-documents')
  .getPublicUrl(filePath)

const originalFileUrl = publicUrlData.publicUrl

// 3. Passar metadata expandida para processDocumentWithChunking
const extendedMetadata = {
  ...metadata,
  original_file_url: originalFileUrl,
  original_file_path: filePath,
  original_file_size: fileBuffer.length,
  original_mime_type: file.type
}
```

#### 1.3. Modificar processDocumentWithChunking

**Arquivo:** `src/nodes/processDocumentWithChunking.ts`

**Mudanças:**

```typescript
// Ao salvar chunk no vector store, adicionar metadata do arquivo original
const { data, error } = await supabaseAny
  .from('documents')
  .insert({
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddingResult.embedding,
    client_id: clientId,
    // NOVO: Adicionar colunas de arquivo original
    original_file_url: metadata.original_file_url,
    original_file_path: metadata.original_file_path,
    original_file_size: metadata.original_file_size,
    original_mime_type: metadata.original_mime_type
  })
  .select('id')
  .single()
```

### FASE 2: Node de Busca de Documentos

#### 2.1. Criar Node `searchDocumentInKnowledge`

**Arquivo:** `src/nodes/searchDocumentInKnowledge.ts`

```typescript
import { createServerClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'

export interface SearchDocumentInput {
  query: string
  clientId: string
  documentType?: string
  openaiApiKey?: string
  searchThreshold?: number
  maxResults?: number
}

export interface DocumentSearchResult {
  id: string
  filename: string
  documentType: string
  originalFileUrl: string
  originalFilePath: string
  originalMimeType: string
  originalFileSize: number
  similarity: number
  preview: string // Primeiros 200 chars do conteúdo
}

/**
 * Busca documentos na base de conhecimento
 *
 * Usa busca semântica (embedding) ou busca por metadata (filename, type)
 */
export const searchDocumentInKnowledge = async (
  input: SearchDocumentInput
): Promise<DocumentSearchResult[]> => {
  const { query, clientId, documentType, openaiApiKey, searchThreshold = 0.7, maxResults = 5 } = input

  try {
    const supabase = createServerClient()

    // OPÇÃO 1: Busca semântica (usa embedding)
    const embeddingResult = await generateEmbedding(query, openaiApiKey)

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embeddingResult.embedding,
      match_threshold: searchThreshold,
      match_count: maxResults,
      filter_client_id: clientId
    })

    if (error) {
      throw new Error(`Failed to search documents: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    // Agrupar por arquivo original (pois pode haver múltiplos chunks do mesmo arquivo)
    const groupedByFile = new Map<string, DocumentSearchResult>()

    for (const doc of data) {
      const filename = doc.metadata?.filename
      if (!filename) continue

      // Se já existe, pega o de maior similarity
      const existing = groupedByFile.get(filename)
      if (!existing || doc.similarity > existing.similarity) {
        groupedByFile.set(filename, {
          id: doc.id,
          filename: doc.metadata.filename,
          documentType: doc.metadata.documentType || 'unknown',
          originalFileUrl: doc.original_file_url,
          originalFilePath: doc.original_file_path,
          originalMimeType: doc.original_mime_type,
          originalFileSize: doc.original_file_size,
          similarity: doc.similarity,
          preview: doc.content.substring(0, 200)
        })
      }
    }

    return Array.from(groupedByFile.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[searchDocumentInKnowledge] Error:', errorMessage)
    throw new Error(`Failed to search documents: ${errorMessage}`)
  }
}
```

**Exportar:** `src/nodes/index.ts`

```typescript
export { searchDocumentInKnowledge } from './searchDocumentInKnowledge'
export type { SearchDocumentInput, DocumentSearchResult } from './searchDocumentInKnowledge'
```

#### 2.2. Criar API Endpoint de Teste

**Arquivo:** `src/app/api/test/nodes/search-document/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { searchDocumentInKnowledge } from '@/nodes/searchDocumentInKnowledge'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await searchDocumentInKnowledge({
      query: 'catálogo de produtos',
      clientId: process.env.TEST_CLIENT_ID!,
      documentType: 'catalog',
      maxResults: 3
    })

    return NextResponse.json({
      success: true,
      results: result
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
```

### FASE 3: Integração com Agente Principal

#### 3.1. Adicionar Tool Definition

**Arquivo:** `src/nodes/generateAIResponse.ts`

```typescript
const SEARCH_DOCUMENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "buscar_documento",
    description: `Busca documentos ou imagens na base de conhecimento por nome, tipo ou assunto.
    Use quando o usuário solicitar explicitamente um documento, manual, catálogo, imagem ou arquivo.
    Exemplos: "me envia o catálogo", "preciso do manual", "tem alguma imagem sobre isso", "pode me enviar o documento X"`,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo de busca (nome do arquivo, tipo de documento ou assunto relacionado)",
        },
        document_type: {
          type: "string",
          description: "Tipo de documento (opcional): catalog, manual, faq, image, any",
          enum: ["catalog", "manual", "faq", "image", "any"]
        }
      },
      required: ["query"],
    },
  },
}

// Adicionar ao array de tools
const tools = [
  HUMAN_HANDOFF_TOOL_DEFINITION,
  SEARCH_DOCUMENT_TOOL_DEFINITION // NOVO
]
```

#### 3.2. Criar Handler de Tool Call

**Arquivo:** `src/nodes/handleDocumentSearchToolCall.ts`

```typescript
import { searchDocumentInKnowledge } from './searchDocumentInKnowledge'
import { sendImageMessage, sendDocumentMessage } from '@/lib/meta'
import type { ClientConfig } from '@/lib/types'

export interface HandleDocumentSearchInput {
  toolCall: {
    id: string
    function: {
      name: string
      arguments: string // JSON string
    }
  }
  phone: string
  clientId: string
  config: ClientConfig
}

export interface HandleDocumentSearchOutput {
  success: boolean
  message: string
  documentsSent?: number
  documentsFound?: number
}

/**
 * Processa tool call buscar_documento
 *
 * Fluxo:
 * 1. Parse arguments da tool
 * 2. Busca documentos na base de conhecimento
 * 3. Se encontrou documentos:
 *    - Envia via WhatsApp (imagem ou documento)
 *    - Retorna mensagem de confirmação
 * 4. Se não encontrou:
 *    - Retorna mensagem informando
 */
export const handleDocumentSearchToolCall = async (
  input: HandleDocumentSearchInput
): Promise<HandleDocumentSearchOutput> => {
  const { toolCall, phone, clientId, config } = input

  try {
    // 1. Parse arguments
    const args = JSON.parse(toolCall.function.arguments)
    const { query, document_type } = args

    console.log(`[handleDocumentSearchToolCall] Buscando: query="${query}", type="${document_type}"`)

    // 2. Buscar documentos
    const results = await searchDocumentInKnowledge({
      query,
      clientId,
      documentType: document_type === 'any' ? undefined : document_type,
      openaiApiKey: config.apiKeys.openaiApiKey,
      searchThreshold: 0.7,
      maxResults: 3 // Limitar a 3 documentos
    })

    // 3. Se não encontrou
    if (results.length === 0) {
      return {
        success: true,
        message: `Não encontrei documentos relacionados a "${query}" na base de conhecimento.`,
        documentsFound: 0,
        documentsSent: 0
      }
    }

    // 4. Enviar documentos via WhatsApp
    let sentCount = 0
    const fileNames: string[] = []

    for (const doc of results) {
      try {
        // Determinar tipo de mídia
        const isImage = doc.originalMimeType.startsWith('image/')

        if (isImage) {
          // Enviar como imagem
          await sendImageMessage(
            phone,
            doc.originalFileUrl,
            `📄 ${doc.filename}`,
            config
          )
        } else {
          // Enviar como documento
          await sendDocumentMessage(
            phone,
            doc.originalFileUrl,
            doc.filename,
            `📄 Documento da base de conhecimento`,
            config
          )
        }

        sentCount++
        fileNames.push(doc.filename)

        // Delay entre envios (evitar rate limit)
        if (sentCount < results.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (sendError) {
        console.error(`[handleDocumentSearchToolCall] Erro ao enviar ${doc.filename}:`, sendError)
      }
    }

    // 5. Retornar resultado
    const message = sentCount > 0
      ? `Encontrei ${results.length} documento(s) e enviei ${sentCount}: ${fileNames.join(', ')}`
      : `Encontrei ${results.length} documento(s) mas houve erro ao enviar.`

    return {
      success: true,
      message,
      documentsFound: results.length,
      documentsSent: sentCount
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[handleDocumentSearchToolCall] Error:', errorMessage)

    return {
      success: false,
      message: `Erro ao buscar documentos: ${errorMessage}`,
      documentsFound: 0,
      documentsSent: 0
    }
  }
}
```

#### 3.3. Integrar no Chatbot Flow

**Arquivo:** `src/flows/chatbotFlow.ts`

**Modificar Node 11 (generateAIResponse):**

```typescript
// NODE 11: Generate AI Response (com tools)
const aiResponse = await generateAIResponse({
  message: normalizedContent,
  chatHistory,
  ragContext,
  customerName: customerData.customerName,
  config,
  greetingInstruction
})

// NOVO: Verificar se há tool calls
if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  for (const toolCall of aiResponse.toolCalls) {

    // Tool: transferir_atendimento
    if (toolCall.function.name === 'transferir_atendimento') {
      // ... (código existente)
    }

    // NOVO: Tool: buscar_documento
    if (toolCall.function.name === 'buscar_documento') {
      const { handleDocumentSearchToolCall } = await import('@/nodes/handleDocumentSearchToolCall')

      const result = await handleDocumentSearchToolCall({
        toolCall,
        phone,
        clientId,
        config
      })

      console.log(`[chatbotFlow] Tool buscar_documento executada:`, result)

      // Se encontrou e enviou documentos, retornar mensagem de confirmação
      if (result.documentsSent && result.documentsSent > 0) {
        return {
          success: true,
          message: result.message,
          toolUsed: 'buscar_documento'
        }
      }
    }
  }
}
```

### FASE 4: Front-end (Dashboard)

#### 4.1. Configurações em Settings

**Arquivo:** `src/app/dashboard/settings/page.tsx`

**Adicionar seção:**

```tsx
{/* Envio de Documentos da Base de Conhecimento */}
<Card>
  <CardHeader>
    <CardTitle>Envio de Documentos RAG</CardTitle>
    <CardDescription>
      Configure como o agente envia documentos e imagens da base de conhecimento
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Habilitar/Desabilitar */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Habilitar envio de documentos</Label>
        <p className="text-sm text-gray-500">
          Permite que o agente busque e envie documentos da base de conhecimento
        </p>
      </div>
      <Switch
        checked={config['knowledge_media:enabled'] === 'true'}
        onCheckedChange={(checked) => updateConfig('knowledge_media:enabled', String(checked))}
      />
    </div>

    {/* Threshold de busca */}
    <div>
      <Label>Threshold de similaridade</Label>
      <p className="text-sm text-gray-500 mb-2">
        Quão similar deve ser o documento para ser considerado relevante (0.0 - 1.0)
      </p>
      <Input
        type="number"
        min="0"
        max="1"
        step="0.1"
        value={config['knowledge_media:search_threshold'] || '0.7'}
        onChange={(e) => updateConfig('knowledge_media:search_threshold', e.target.value)}
      />
    </div>

    {/* Auto-envio */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Envio automático</Label>
        <p className="text-sm text-gray-500">
          Envia documento automaticamente ou pergunta antes
        </p>
      </div>
      <Switch
        checked={config['knowledge_media:auto_send'] === 'true'}
        onCheckedChange={(checked) => updateConfig('knowledge_media:auto_send', String(checked))}
      />
    </div>

    {/* Tamanho máximo */}
    <div>
      <Label>Tamanho máximo (MB)</Label>
      <p className="text-sm text-gray-500 mb-2">
        Tamanho máximo de arquivo para envio via WhatsApp
      </p>
      <Input
        type="number"
        min="1"
        max="16"
        value={config['knowledge_media:max_file_size_mb'] || '10'}
        onChange={(e) => updateConfig('knowledge_media:max_file_size_mb', e.target.value)}
      />
    </div>
  </CardContent>
</Card>
```

#### 4.2. Flow Architecture (Visualização)

**Arquivo:** `src/app/dashboard/flow-architecture/page.tsx`

**Adicionar node no diagrama Mermaid:**

```typescript
const mermaidDiagram = `
  graph TD
    ...

    NODE11[NODE 11: Generate AI Response]
    NODE11A{Tool Call?}
    NODE11B[Tool: transferir_atendimento]
    NODE11C[Tool: buscar_documento] <!-- NOVO -->

    NODE11 --> NODE11A
    NODE11A -->|transferir_atendimento| NODE11B
    NODE11A -->|buscar_documento| NODE11C
    NODE11A -->|none| NODE12

    NODE11B --> NODE12
    NODE11C --> NODE13A[Search Document in Knowledge]
    NODE13A --> NODE13B[Send WhatsApp Media]
    NODE13B --> END

    ...
`
```

**Adicionar configuração do node:**

```tsx
const nodeConfigs = {
  ...existingConfigs,

  'buscar_documento': {
    name: 'Buscar Documento',
    description: 'Busca e envia documentos da base de conhecimento',
    configurable: true,
    settings: [
      {
        key: 'knowledge_media:enabled',
        label: 'Habilitado',
        type: 'boolean',
        default: true
      },
      {
        key: 'knowledge_media:search_threshold',
        label: 'Threshold de Similaridade',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.7
      },
      {
        key: 'knowledge_media:auto_send',
        label: 'Envio Automático',
        type: 'boolean',
        default: false
      }
    ]
  }
}
```

### FASE 5: Testes

#### 5.1. Testes de Unidade

**Arquivo:** `src/__tests__/nodes/searchDocumentInKnowledge.test.ts`

```typescript
import { searchDocumentInKnowledge } from '@/nodes/searchDocumentInKnowledge'

describe('searchDocumentInKnowledge', () => {
  it('should find documents by semantic search', async () => {
    const result = await searchDocumentInKnowledge({
      query: 'manual de instalação',
      clientId: 'test-client-id',
      searchThreshold: 0.7,
      maxResults: 5
    })

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should group chunks by filename', async () => {
    // Test que verifica se múltiplos chunks do mesmo arquivo
    // são agrupados e retorna apenas um resultado por arquivo
  })

  it('should filter by document type', async () => {
    const result = await searchDocumentInKnowledge({
      query: 'produto',
      clientId: 'test-client-id',
      documentType: 'catalog'
    })

    result.forEach(doc => {
      expect(doc.documentType).toBe('catalog')
    })
  })
})
```

#### 5.2. Testes de Integração

**Cenários de teste:**

1. **Upload e recuperação**
   - Upload PDF com imagens
   - Verificar Storage salvou arquivo original
   - Buscar por nome
   - Verificar retornou URL correta

2. **Tool call completo**
   - Simular mensagem "me envia o catálogo"
   - Verificar AI acionou tool buscar_documento
   - Verificar documento foi enviado via WhatsApp
   - Verificar mensagem de confirmação

3. **Não encontrado**
   - Buscar documento inexistente
   - Verificar retorna mensagem adequada

4. **Rate limit**
   - Buscar múltiplos documentos
   - Verificar delay entre envios

---

## 🎨 Interface de Usuário

### 1. DocumentList (Modificado)

Adicionar coluna "Arquivo Original":

```tsx
<div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
  <span>{doc.chunkCount} chunks</span>
  <span>•</span>
  <span>{doc.documentType}</span>
  <span>•</span>
  {doc.originalFileUrl && (
    <>
      <a
        href={doc.originalFileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        Ver arquivo original
      </a>
      <span>•</span>
    </>
  )}
  <span>{formatDate(doc.uploadedAt)}</span>
</div>
```

### 2. Settings - Nova Seção

Já descrito na FASE 4.1

### 3. Flow Architecture - Node Visual

Já descrito na FASE 4.2

---

## 📝 Checklist de Implementação

### Backend

- [ ] 1. Criar migration para Storage bucket
- [ ] 2. Criar migration para colunas original_file_* na tabela documents
- [ ] 3. Modificar upload API para salvar arquivo no Storage
- [ ] 4. Modificar processDocumentWithChunking para incluir metadata do arquivo
- [ ] 5. Criar node searchDocumentInKnowledge
- [ ] 6. Criar node handleDocumentSearchToolCall
- [ ] 7. Adicionar tool definition buscar_documento em generateAIResponse
- [ ] 8. Integrar tool handler no chatbotFlow
- [ ] 9. Criar API endpoint de teste /api/test/nodes/search-document
- [ ] 10. Testar upload e recuperação

### Frontend

- [ ] 11. Adicionar seção "Envio de Documentos RAG" em Settings
- [ ] 12. Modificar DocumentList para mostrar link "Ver arquivo original"
- [ ] 13. Adicionar node buscar_documento no Flow Architecture
- [ ] 14. Criar configurações editáveis do node no Flow Architecture
- [ ] 15. Adicionar documentação na página /dashboard/knowledge

### Testes

- [ ] 16. Criar testes de unidade para searchDocumentInKnowledge
- [ ] 17. Criar testes de integração para tool call completo
- [ ] 18. Testar com diversos tipos de arquivo (PDF, PNG, JPEG)
- [ ] 19. Testar rate limiting
- [ ] 20. Testar multi-tenant (isolamento de documentos)

### Documentação

- [ ] 21. Atualizar CLAUDE.md com nova funcionalidade
- [ ] 22. Atualizar docs/tables/tabelas.md com novas colunas
- [ ] 23. Criar docs/features/knowledge-media/README.md com guia de uso
- [ ] 24. Adicionar exemplos de uso no dashboard

---

## 🚨 Considerações Importantes

### 1. Segurança

- **RLS**: Garantir que cada cliente só acessa seus próprios documentos
- **Public URLs**: Considerar se URLs devem ser públicas ou assinadas (signed URLs)
- **Rate Limiting**: Implementar limite de envios por minuto

### 2. Performance

- **Storage**: Considerar CDN para servir arquivos (Supabase já tem)
- **Caching**: Cache de buscas frequentes
- **Batch Processing**: Agrupar múltiplos documentos em um ZIP se necessário

### 3. Custos

- **Storage**: Supabase Storage cobra por GB armazenado
- **Embeddings**: Cada busca gera novo embedding (OpenAI)
- **WhatsApp Media**: Meta cobra por mensagem com mídia

### 4. Limitações WhatsApp

- **Tamanho máximo**: 16MB para documentos, 5MB para imagens
- **Formatos suportados**: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, etc.
- **Rate limit**: Meta limita envios por segundo

### 5. UX

- **Feedback**: Sempre informar ao usuário o que está acontecendo
- **Timeout**: Se busca demorar, avisar usuário
- **Preview**: Considerar enviar preview do documento antes de enviar completo

---

## 🔄 Fluxo de Trabalho Recomendado

1. **FASE 1** (Backend Storage): 1-2 dias
2. **FASE 2** (Node Busca): 1 dia
3. **FASE 3** (Integração AI): 1-2 dias
4. **FASE 4** (Front-end): 2-3 dias
5. **FASE 5** (Testes): 1-2 dias

**Total estimado:** 6-10 dias de desenvolvimento

---

## 📚 Referências

### Documentação Externa

- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Meta WhatsApp Business API - Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)

### Arquivos do Projeto

- `src/nodes/getRAGContext.ts` - Sistema RAG atual
- `src/nodes/processDocumentWithChunking.ts` - Processamento de documentos
- `src/lib/meta.ts` - Funções WhatsApp API
- `src/nodes/generateAIResponse.ts` - Agente principal com tools
- `src/flows/chatbotFlow.ts` - Orquestrador principal
- `docs/tables/tabelas.md` - Esquema do banco

---

## ✅ Critérios de Sucesso

A implementação será considerada completa quando:

1. ✅ Usuário pode fazer upload de PDF/imagem e arquivo original é salvo no Storage
2. ✅ Usuário pode solicitar documento via WhatsApp ("me envia o catálogo")
3. ✅ AI detecta solicitação e aciona tool buscar_documento
4. ✅ Sistema busca documento na base de conhecimento
5. ✅ Sistema envia documento via WhatsApp (imagem ou PDF)
6. ✅ Usuário recebe arquivo original no chat
7. ✅ Configurações customizáveis no Dashboard (Settings + Flow Architecture)
8. ✅ Multi-tenant funcionando (isolamento de documentos)
9. ✅ Testes passando
10. ✅ Documentação atualizada

---

**Última atualização:** 2025-12-03
**Autor:** Claude Code
**Status:** 📝 Aguardando aprovação
