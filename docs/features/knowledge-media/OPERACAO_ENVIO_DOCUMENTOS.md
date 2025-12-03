# 🚀 Operação: Sistema de Envio de Documentos RAG

**Guia prático para validação, testes e debug em produção**

---

## 📋 Índice

1. [Como Funciona](#como-funciona)
2. [Pré-requisitos](#pré-requisitos)
3. [Teste Completo Passo a Passo](#teste-completo-passo-a-passo)
4. [Onde os Erros Aparecem](#onde-os-erros-aparecem)
5. [Como Debugar](#como-debugar)
6. [Validação de Componentes](#validação-de-componentes)
7. [Troubleshooting](#troubleshooting)

---

## 🔄 Como Funciona

### Fluxo Completo

```
📱 WhatsApp                    🤖 Sistema                     💾 Storage
    │                              │                              │
    ├─➤ "me envia o catálogo"     │                              │
    │                              │                              │
    │                         NODE 1-8                            │
    │                      (Parse, Customer, etc)                 │
    │                              │                              │
    │                         NODE 12                             │
    │                    (Generate AI Response)                   │
    │                              │                              │
    │                    ⚡ AI DETECTA NECESSIDADE                │
    │                    Aciona tool: buscar_documento            │
    │                              │                              │
    │                         NODE 15.5 (NOVO!)                   │
    │                    handleDocumentSearchToolCall             │
    │                              ├─➤ 1. Generate Embedding      │
    │                              ├─➤ 2. Search pgvector         │
    │                              │   (similarity > 0.7)         │
    │                              ├─➤ 3. Group by filename       │
    │                              ├─➤ 4. Get Storage URLs ──────➤│
    │                              │                              │
    │   ⬅─── Imagem/PDF enviado ──┤─➤ 5. Send via WhatsApp API   │
    │   ⬅─── Legenda/Caption ──────┤   (Rate limit: 1s delay)    │
    │                              │                              │
    │                         NODE 13-14                          │
    │                      (Format + Send texto)                  │
    │   ⬅─── Resposta texto ───────┤                              │
```

### Pontos Críticos

1. **AI deve decidir** chamar a tool (não é automático para todas as mensagens)
2. **OpenAI API Key** obrigatória (para embeddings + GPT-4o Vision)
3. **Storage público** precisa estar acessível (URLs devem funcionar)
4. **WhatsApp Business API** deve aceitar anexos (limite de 16MB)

---

## ✅ Pré-requisitos

### 1. Configurações Obrigatórias

**Verificar em `/dashboard/settings`:**

- ✅ **OpenAI API Key** configurada (necessária para embeddings)
- ✅ **RAG habilitado** (toggle "Enable RAG")
- ✅ **Function Calling habilitado** (toggle "Enable Tools")
- ✅ **Envio de Documentos RAG** (seção deve mostrar status "Ativo")

**Valores recomendados:**
- Threshold: `0.7` (padrão)
- Max Results: `3` (padrão)
- Max File Size: `10 MB` (padrão)

### 2. Documentos Carregados

**Verificar em `/dashboard/knowledge`:**

- ✅ Pelo menos 1 documento carregado (PDF, TXT ou imagem)
- ✅ Link "Ver arquivo" aparece ao lado do nome
- ✅ Clicar no link abre o arquivo (URL pública funciona)

### 3. Storage Configurado

**Verificar no Supabase Dashboard:**

- ✅ Bucket `knowledge-documents` existe
- ✅ Bucket é **público** (public access habilitado)
- ✅ Políticas RLS criadas (SELECT public, INSERT/UPDATE/DELETE service_role)

---

## 🧪 Teste Completo Passo a Passo

### Teste 1: Upload e Verificação (5 minutos)

**1.1. Fazer Upload**

1. Acesse `/dashboard/knowledge`
2. Clique em "Upload Document"
3. Selecione um PDF de catálogo ou imagem de produto
4. Aguarde "Upload successful!"
5. **VALIDAR:**
   - Documento aparece na lista
   - Mostra "X chunks" (ex: "24 chunks")
   - Link "Ver arquivo" está presente

**1.2. Verificar Storage**

1. Clique em "Ver arquivo"
2. Nova aba abre com o documento
3. URL deve ser algo como: `https://[projeto].supabase.co/storage/v1/object/public/knowledge-documents/[client_id]/[tipo]/[timestamp]-[nome].pdf`
4. **VALIDAR:**
   - Arquivo carrega corretamente
   - Não dá erro 403 (forbidden) ou 404 (not found)

**1.3. Verificar Database**

```sql
-- Execute no Supabase SQL Editor
SELECT
  id,
  metadata->>'filename' as filename,
  original_file_url,
  original_mime_type,
  created_at
FROM documents
WHERE client_id = '[SEU_CLIENT_ID]'
  AND original_file_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**VALIDAR:**
- `original_file_url` está preenchido
- `original_mime_type` correto (ex: `application/pdf` ou `image/jpeg`)
- Múltiplas linhas com mesmo filename (chunks do mesmo documento)

---

### Teste 2: Tool Call via WhatsApp (10 minutos)

**2.1. Enviar Mensagem Acionadora**

Envie uma das seguintes mensagens via WhatsApp:

- ✅ "me envia o catálogo de produtos"
- ✅ "pode mandar o manual do usuário?"
- ✅ "quero ver a imagem do produto X"
- ✅ "manda o PDF com os preços"

**IMPORTANTE:** Use palavras-chave que correspondam aos seus documentos!

**2.2. Verificar Execução no Backend Monitor**

1. Acesse `/dashboard/backend`
2. Localiza a execução mais recente (seu telefone)
3. **PROCURAR na lista de nodes:**

```
✅ NODE 1-8: Parse, Customer, etc
✅ NODE 12: Generate AI Response
   → OUTPUT: Deve conter toolCalls: [{ function: { name: "buscar_documento" } }]

✅ NODE 15.5: handleDocumentSearchToolCall (NOVO!)
   → INPUT: { toolCall: {...}, phone: "5554999...", clientId: "..." }
   → OUTPUT: { success: true, documentsSent: 3, message: "Enviou 3 documentos" }

✅ NODE 13-14: Format + Send (mensagem de texto final)
```

**2.3. Verificar WhatsApp**

Você deve receber:

1. **Documentos primeiro** (1 a 3, dependendo de max_results)
   - Se imagem: enviada como imagem (pode dar zoom)
   - Se PDF: enviado como documento (pode baixar)
   - Caption: "📄 [Nome do arquivo]"

2. **Mensagem de texto depois**
   - Confirmação da AI: "Enviei os documentos solicitados"
   - Ou resposta natural da conversa

---

### Teste 3: Configuração no Flow Architecture (5 minutos)

**3.1. Acessar Flow Manager**

1. Acesse `/dashboard/flow-architecture`
2. Localize o node **"Search & Send Documents"** (roxo, categoria Auxiliary)
3. **VALIDAR:**
   - Node aparece no diagrama Mermaid
   - Está conectado após "Generate AI Response"
   - Cor roxa indica categoria "auxiliary"

**3.2. Configurar Node**

1. Clique no node "Search & Send Documents"
2. Modal abre com configurações
3. **VALIDAR campos visíveis:**
   - ✅ Switch "Status do Node" (Ativo/Desativado)
   - ✅ Switch "Habilitado"
   - ✅ Input "Threshold de Similaridade" (0.0 - 1.0)
   - ✅ Input "Máximo de Resultados" (número)
   - ✅ Input "Tamanho Máximo do Arquivo (MB)" (número)

**3.3. Testar Desabilitar**

1. Desabilite o switch "Status do Node"
2. Clique "Salvar"
3. Envie outra mensagem pedindo documento
4. **VALIDAR:**
   - AI não envia documentos
   - Backend Monitor NÃO mostra NODE 15.5
   - AI responde com texto apenas

5. **IMPORTANTE:** Reative o node depois do teste!

---

## ❌ Onde os Erros Aparecem

### 1. **Frontend (Dashboard)**

| Local | Erro | O que significa |
|-------|------|----------------|
| `/dashboard/knowledge` | "Erro ao fazer upload" | OpenAI API key inválida ou ausente |
| `/dashboard/knowledge` | "O PDF não contém texto" | PDF de imagens (precisa OCR) |
| `/dashboard/knowledge` | "Não foi possível extrair texto da imagem" | Imagem sem texto ou erro no GPT-4o Vision |
| `/dashboard/settings` | Seção mostra "⚠️ Inativo" | RAG ou Tools desabilitados |

### 2. **Backend Monitor** (`/dashboard/backend`)

| Node | Status | Onde olhar | O que significa |
|------|--------|-----------|----------------|
| **Generate AI Response** | ❌ ERROR | OUTPUT: `{ error: "..." }` | LLM falhou (quota, API key, timeout) |
| **handleDocumentSearchToolCall** | ❌ ERROR | ERROR: `"No documents found"` | Busca não retornou resultados (threshold alto, sem docs) |
| **handleDocumentSearchToolCall** | ❌ ERROR | ERROR: `"OpenAI API key not found"` | Cliente não configurou API key no Vault |
| **handleDocumentSearchToolCall** | ⚠️ SUCCESS | OUTPUT: `{ documentsSent: 0 }` | Nenhum documento tem `original_file_url` |
| **Send WhatsApp** | ❌ ERROR | ERROR: `{ code: 131047 }` | Arquivo muito grande (>16MB) |
| **Send WhatsApp** | ❌ ERROR | ERROR: `{ code: 131051 }` | URL inválida ou inacessível |

### 3. **Console do Navegador** (F12)

```
❌ [Upload] ❌ OpenAI Vision OCR error: insufficient_quota
→ Quota da OpenAI esgotada, adicionar créditos

❌ [Upload] ❌ Storage upload error: new row violates row-level security
→ Política RLS incorreta, revisar policies

❌ [DocumentList] Failed to fetch documents
→ Erro de autenticação, verificar user_profiles.client_id
```

### 4. **Logs do Supabase** (Production Logs)

```
❌ ERROR: permission denied for table documents
→ RLS bloqueando, usar service_role client

❌ ERROR: relation "documents" does not exist
→ Migration não aplicada, rodar db push

❌ ERROR: column "original_file_url" does not exist
→ Migration add_original_file_metadata não aplicada
```

---

## 🐛 Como Debugar

### Checklist de Debug (ordem de prioridade)

#### ✅ Nível 1: Configuração

**1. OpenAI API Key está configurada?**

```typescript
// Dashboard → Settings → API Keys
// Verificar se "OpenAI API Key" tem valor ************
// Testar com botão "Test Model"
```

**2. RAG e Tools estão habilitados?**

```typescript
// Dashboard → Settings → Agent Configuration
// Toggle "Enable RAG" deve estar ON
// Toggle "Enable Tools" deve estar ON
```

**3. Storage bucket existe?**

```sql
-- Supabase SQL Editor
SELECT * FROM storage.buckets WHERE name = 'knowledge-documents';
-- Deve retornar 1 linha, public = true
```

#### ✅ Nível 2: Dados

**4. Documentos têm URL original?**

```sql
SELECT
  COUNT(*) as total,
  COUNT(original_file_url) as com_url,
  COUNT(*) - COUNT(original_file_url) as sem_url
FROM documents
WHERE client_id = '[SEU_CLIENT_ID]';

-- Esperado: com_url > 0
-- Se sem_url > 0: documentos antigos, fazer re-upload
```

**5. Embeddings estão sendo gerados?**

```sql
SELECT
  id,
  metadata->>'filename',
  ARRAY_LENGTH(embedding, 1) as embedding_dim
FROM documents
WHERE client_id = '[SEU_CLIENT_ID]'
LIMIT 5;

-- Esperado: embedding_dim = 1536 (text-embedding-3-small)
-- Se NULL: erro na geração, verificar OpenAI API
```

#### ✅ Nível 3: Execução

**6. Tool está sendo acionada?**

```typescript
// Backend Monitor → Procurar na execução
// NODE 12 (Generate AI Response)
// OUTPUT deve conter: toolCalls: [{ function: { name: "buscar_documento" } }]

// Se NÃO contém:
// - AI não achou necessário chamar a tool
// - Prompt do usuário não foi claro o suficiente
// - System prompt da AI pode estar impedindo uso de tools
```

**7. Busca retorna resultados?**

```sql
-- Testar busca manual
SELECT
  metadata->>'filename',
  1 - (embedding <=> '[EMBEDDING_AQUI]'::vector) as similarity
FROM documents
WHERE client_id = '[SEU_CLIENT_ID]'
  AND (1 - (embedding <=> '[EMBEDDING_AQUI]'::vector)) > 0.7
ORDER BY similarity DESC
LIMIT 3;

-- Substituir [EMBEDDING_AQUI] pelo embedding da query
-- Se retorna 0 linhas: threshold muito alto ou sem docs relevantes
```

**8. WhatsApp aceita a URL?**

```bash
# Testar URL diretamente
curl -I "https://[seu-projeto].supabase.co/storage/v1/object/public/knowledge-documents/..."

# Esperado: HTTP/2 200
# Se 403: bucket não é público
# Se 404: arquivo não existe no storage
```

#### ✅ Nível 4: Endpoint de Teste

**9. Testar node isoladamente**

```bash
# Endpoint de teste direto
curl "http://localhost:3000/api/test/nodes/search-document?query=catálogo&clientId=[SEU_CLIENT_ID]"

# Resposta esperada:
{
  "success": true,
  "resultsCount": 3,
  "results": [
    {
      "filename": "catalogo-produtos.pdf",
      "similarity": "85.2%",
      "originalFileUrl": "https://...",
      "originalMimeType": "application/pdf"
    }
  ]
}
```

---

## ✅ Validação de Componentes

### Checklist Completo

| Componente | Como Validar | Status Esperado |
|-----------|--------------|----------------|
| **Storage Bucket** | Supabase Dashboard → Storage → `knowledge-documents` existe | ✅ Público, com arquivos |
| **Database Columns** | SQL: `\d documents` | ✅ Colunas `original_file_*` existem |
| **Policies RLS** | SQL: `SELECT * FROM pg_policies WHERE tablename = 'objects'` | ✅ 4 policies (select public, insert/update/delete service) |
| **Node Metadata** | Flow Architecture → Node "Search & Send Documents" visível | ✅ Roxo, após Generate Response |
| **API Endpoint** | `/api/flow/nodes/search_document` retorna config | ✅ Status 200, config com defaults |
| **Backend Logging** | Backend Monitor mostra NODE 15.5 | ✅ Aparece após execução real |
| **Tool Definition** | `generateAIResponse.ts` linha ~350 | ✅ `SEARCH_DOCUMENT_TOOL_DEFINITION` existe |
| **Tool Handler** | `chatbotFlow.ts` linha ~450 | ✅ `if (toolCall.function.name === 'buscar_documento')` existe |

---

## 🚨 Troubleshooting

### Problema: "AI não está acionando a tool"

**Sintomas:**
- Usuário pede documento
- Backend Monitor NÃO mostra NODE 15.5
- AI responde com texto apenas

**Causas possíveis:**

1. **Tools desabilitadas**
   - Solução: Settings → Enable Tools = ON

2. **Prompt não foi claro**
   - Solução: Use palavras exatas: "me envia", "manda", "quero ver", "preciso do"

3. **AI não tem contexto sobre documentos**
   - Solução: Adicionar ao System Prompt:
     ```
     Você tem acesso a documentos e imagens via tool buscar_documento.
     Sempre que o usuário pedir arquivos, catálogos ou documentos, use essa tool.
     ```

4. **Model não suporta tools**
   - Solução: Usar `llama-3.3-70b-versatile` (Groq) ou `gpt-4o` (OpenAI)

---

### Problema: "Tool é acionada mas não envia documentos"

**Sintomas:**
- Backend Monitor MOSTRA NODE 15.5
- OUTPUT: `{ documentsSent: 0 }`
- WhatsApp não recebe anexos

**Causas possíveis:**

1. **Documentos sem URL original**
   ```sql
   -- Verificar
   SELECT COUNT(*) FROM documents
   WHERE client_id = '...' AND original_file_url IS NULL;

   -- Se > 0: Fazer re-upload dos documentos em /dashboard/knowledge
   ```

2. **Threshold muito alto**
   - Solução: Flow Architecture → Node "Search & Send Documents" → Similarity Threshold = 0.6

3. **Busca não encontrou match**
   - Solução: Query do usuário não bate com conteúdo dos docs
   - Testar com keywords exatas do documento

---

### Problema: "WhatsApp dá erro ao enviar"

**Sintomas:**
- Backend Monitor mostra NODE 15.5 SUCCESS
- NODE 14 (Send WhatsApp) dá ERROR

**Erros comuns:**

| Código | Mensagem | Solução |
|--------|----------|---------|
| 131047 | Media download error | Arquivo > 16MB, reduzir ou dividir |
| 131051 | Invalid media URL | URL não acessível, verificar bucket público |
| 131009 | Parameter value is not valid | MIME type inválido, só PDF/JPG/PNG/WEBP |
| 130472 | User's number is part of an experiment | Número de teste do WhatsApp, usar número real |

**Debug:**

```bash
# Testar URL manualmente
curl -I "[URL_DO_ARQUIVO]"

# Deve retornar:
# HTTP/2 200
# content-type: application/pdf  (ou image/jpeg)
# content-length: [tamanho em bytes]
```

---

### Problema: "Imagens não têm texto extraído"

**Sintomas:**
- Upload de imagem funciona
- Busca não retorna a imagem

**Causas:**

1. **GPT-4o Vision falhou no OCR**
   - Verificar Console: `[Upload] ❌ OpenAI Vision OCR error`
   - Solução: Verificar OpenAI API key, quota, modelo `gpt-4o` disponível

2. **Imagem sem texto**
   - Imagens puramente gráficas (logos, fotos) não têm texto para extrair
   - Solução: Adicionar descrição manual ou usar outro tipo de busca

---

## 📊 Métricas de Sucesso

### KPIs para Monitorar

1. **Taxa de Uso da Tool**
   ```sql
   -- Quantas vezes a tool foi acionada nos últimos 7 dias
   SELECT COUNT(*)
   FROM execution_logs
   WHERE node_name = 'handleDocumentSearchToolCall'
     AND timestamp > NOW() - INTERVAL '7 days';
   ```

2. **Taxa de Sucesso**
   ```sql
   -- % de tool calls que enviaram pelo menos 1 documento
   SELECT
     COUNT(*) FILTER (WHERE output_data->>'documentsSent' > '0') * 100.0 / COUNT(*) as success_rate
   FROM execution_logs
   WHERE node_name = 'handleDocumentSearchToolCall'
     AND timestamp > NOW() - INTERVAL '7 days';
   ```

3. **Documentos Mais Enviados**
   ```sql
   -- Top 5 documentos mais populares
   SELECT
     metadata->>'filename' as filename,
     COUNT(*) as envios
   FROM execution_logs
   WHERE node_name = 'handleDocumentSearchToolCall'
     AND status = 'success'
     AND timestamp > NOW() - INTERVAL '30 days'
   GROUP BY filename
   ORDER BY envios DESC
   LIMIT 5;
   ```

---

## 🎯 Resumo Executivo

### ✅ Sistema Funcionando Corretamente

- ✅ Settings mostra "Ativo" na seção "Envio de Documentos RAG"
- ✅ Knowledge list mostra documentos com link "Ver arquivo"
- ✅ Flow Architecture mostra node roxo "Search & Send Documents"
- ✅ Backend Monitor mostra NODE 15.5 quando tool é acionada
- ✅ WhatsApp recebe documentos/imagens como anexos
- ✅ Logs não mostram erros em vermelho

### ❌ Sistema com Problemas

- ❌ Settings mostra "⚠️ Inativo"
- ❌ Documentos sem link "Ver arquivo"
- ❌ Flow Architecture não mostra o node ou está desabilitado (cinza tracejado)
- ❌ Backend Monitor mostra NODE 15.5 com ERROR em vermelho
- ❌ WhatsApp não recebe anexos ou dá erro
- ❌ Console mostra erros da OpenAI ou Storage

---

## 📞 Suporte

**Em caso de problemas persistentes:**

1. Exportar logs do Backend Monitor (screenshot da execução com erro)
2. Copiar query SQL mostrando estado dos documentos
3. Verificar Supabase Production Logs (últimos 100 erros)
4. Abrir issue no GitHub com evidências

**Contato:**
- GitHub Issues: `https://github.com/[seu-repo]/issues`
- Email: `suporte@seudominio.com`

---

**Última atualização:** 2025-12-03
**Versão:** 1.0.0
**Status:** ✅ Produção
