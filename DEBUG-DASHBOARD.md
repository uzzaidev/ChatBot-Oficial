# 🐛 Debug Dashboard - Guia de Uso

## 📊 O que é?

Um dashboard visual que mostra **em tempo real** como as mensagens estão sendo processadas, similar ao n8n. Você consegue ver:

- 📥 Mensagens recebidas do WhatsApp
- ⚙️ Cada node executado (parseMessage, generateAIResponse, etc.)
- 📊 Input e output de cada node
- ⏱️ Tempo de execução
- ❌ Erros detalhados (se houver)

---

## 🚀 Setup Inicial

### 1. Rodar Migration no Supabase

Acesse: https://app.supabase.com/project/_/sql

Cole e execute o conteúdo de: `migrations/002_execution_logs.sql`

Isso cria a tabela `execution_logs` que armazena todos os dados de debug.

### 2. Habilitar Realtime (Opcional)

No Supabase:
1. Database → Replication
2. Encontre a tabela `execution_logs`
3. Toggle ON para habilitar realtime updates

---

## 🧪 Como Testar

### Opção 1: Enviar Mensagem de Teste (SEM WhatsApp)

1. Acesse: http://localhost:3000/dashboard/debug
2. No painel "🧪 Enviar Mensagem de Teste":
   - Digite um telefone (ex: `5511999999999`)
   - Digite uma mensagem (ex: `Olá, preciso de ajuda!`)
   - Clique em "Enviar Mensagem de Teste"
3. **Aguarde 2 segundos** → a página recarrega automaticamente
4. Veja a execução aparecer na lista da esquerda

### Opção 2: Enviar Mensagem Real do WhatsApp

1. Envie uma mensagem real para o número do chatbot
2. Acesse: http://localhost:3000/dashboard/debug
3. Veja a execução aparecer na lista

### Opção 3: Usar API diretamente

```bash
curl -X POST http://localhost:3000/api/test/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "text": "Teste de mensagem",
    "name": "Test User"
  }'
```

---

## 📖 Como Usar o Dashboard

### Interface

```
┌──────────────────────────────────────────────────────────┐
│  🧪 Painel de Teste (enviar mensagens sem WhatsApp)       │
├─────────────┬────────────────────────────────────────────┤
│  Execuções  │  Timeline de Nodes                          │
│   Recentes  │  ┌────┐                                     │
│             │  │ ⚫ │ filterStatusUpdates (5ms)           │
│ ● abc123... │  ├────┤                                     │
│   success   │  │ ⚫ │ parseMessage (12ms)                 │
│   10:30     │  ├────┤                                     │
│             │  │ ⚫ │ checkOrCreateCustomer (45ms)        │
│ ● def456... │  └────┘                                     │
│   error     │    📥 Input: { phone: "55..." }             │
│   10:25     │    📤 Output: { customer_id: "..." }        │
└─────────────┴────────────────────────────────────────────┘
```

### Painel Esquerdo: Lista de Execuções

- **ID curto**: Primeiros 8 caracteres do execution_id
- **Badge de status**:
  - 🟢 Verde = sucesso
  - 🔴 Vermelho = erro
  - 🟡 Amarelo = em execução
- **Timestamp**: Quando a execução começou
- **Telefone**: Se disponível no metadata

### Painel Direito: Timeline de Nodes

Quando você clica em uma execução, vê:

1. **Nome do node** (ex: `generateAIResponse`)
2. **Duração** (ex: `234ms` ou `2.5s`)
3. **Timestamp** de quando executou
4. **📥 Input**: Dados que o node recebeu
5. **📤 Output**: Dados que o node retornou
6. **❌ Error**: Se o node falhou, mostra stack trace completo
7. **Metadata**: Informações extras (clique em "Ver metadata")

---

## 🔍 Exemplos de Debug

### Exemplo 1: Mensagem Processada com Sucesso

```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚫ filterStatusUpdates (3ms)
  📥 Input: { object: "whatsapp_business_account", ... }
  📤 Output: { object: "whatsapp_business_account", ... }

⚫ parseMessage (8ms)
  📥 Input: { entry: [...], ... }
  📤 Output: { phone: "5511999999999", content: "Olá", type: "text" }

⚫ checkOrCreateCustomer (42ms)
  📥 Input: { phone: "5511999999999", name: "Test User" }
  📤 Output: { customer_id: "abc-123", status: "bot" }

⚫ normalizeMessage (2ms)
  📥 Input: { parsedMessage: {...}, processedContent: "Olá" }
  📤 Output: { phone: "5511999999999", content: "Olá", timestamp: "..." }

⚫ pushToRedis (15ms)
  📥 Input: { phone: "5511999999999", content: "Olá" }
  📤 Output: { success: true }

⚫ batchMessages (10050ms) ← Note: 10 segundos de delay
  📥 Input: "5511999999999"
  📤 Output: "Olá"

⚫ getChatHistory (28ms)
  📥 Input: "5511999999999"
  📤 Output: [{ role: "user", content: "Oi" }, ...]

⚫ getRAGContext (120ms)
  📥 Input: "Olá"
  📤 Output: "Contexto relevante da base de conhecimento..."

⚫ generateAIResponse (1850ms)
  📥 Input: { message: "Olá", chatHistory: [...], ragContext: "..." }
  📤 Output: { content: "Olá! Como posso ajudar?", toolCalls: null }

⚫ formatResponse (5ms)
  📥 Input: "Olá! Como posso ajudar?"
  📤 Output: ["Olá! Como posso ajudar?"]

⚫ sendWhatsAppMessage (180ms)
  📥 Input: { phone: "5511999999999", messages: ["Olá! Como posso ajudar?"] }
  📤 Output: ["wamid.xxx"]
```

**Total**: ~12.3 segundos

### Exemplo 2: Erro no Node

```
⚫ generateAIResponse (50ms)
  📥 Input: { message: "teste", chatHistory: [], ragContext: "" }
  ❌ Error:
  {
    "message": "Failed to generate AI response",
    "name": "Error",
    "stack": "Error: Failed to generate AI response\n    at generateAIResponse..."
  }
```

Você vê **exatamente** onde o erro aconteceu e por quê!

---

## 💡 Dicas de Uso

### 1. Identificar Gargalos

Olhe para `duration_ms` de cada node:
- **< 100ms**: Rápido ✅
- **100-500ms**: Normal ⚠️
- **> 500ms**: Lento 🐌 (investigar)

**Exemplo**: Se `generateAIResponse` demora 5 segundos, talvez o prompt esteja muito grande.

### 2. Debugar Erros

Quando algo falha:
1. Abra a execução que deu erro (badge vermelho)
2. Procure o node com ❌
3. Leia o `Error` para saber o que aconteceu
4. Veja o `Input` para entender o contexto

### 3. Validar Dados entre Nodes

Compare:
- **Output do node A** = **Input do node B**?

Se não, tem problema na passagem de dados!

### 4. Rastrear Mensagem Específica

Use `metadata.from` para filtrar:
```typescript
// No código do node:
await logger.executeNode(
  'meuNode',
  async () => { ... },
  inputData,
  { from: parsedMessage.phone } // Aparece no metadata
)
```

---

## 🔧 Integrando Logging em Novos Nodes

### Opção 1: Usar no Webhook (Já Implementado)

O webhook já usa o logger automaticamente:
```typescript
// src/app/api/webhook/route.ts
const logger = createExecutionLogger()
logger.startExecution({ source: 'whatsapp-webhook' })
// ... processa mensagem ...
logger.finishExecution('success')
```

### Opção 2: Adicionar em Nodes Individuais

Para adicionar logging em um node específico:

```typescript
// Exemplo: src/nodes/generateAIResponse.ts
import { getLogger } from '@/lib/logger'

export const generateAIResponse = async (input: any) => {
  const logger = getLogger()
  
  return await logger.executeNode(
    'generateAIResponse',
    async () => {
      // Sua lógica aqui
      const response = await openai.chat.completions.create({ ... })
      return response
    },
    input // Input será salvo automaticamente
  )
}
```

**O que o `executeNode` faz automaticamente**:
1. ✅ Salva input no banco
2. ✅ Mede tempo de execução
3. ✅ Salva output no banco
4. ✅ Captura e salva erros
5. ✅ Atualiza status (running → success/error)

### Opção 3: Logging Manual

Se precisar de mais controle:

```typescript
import { createExecutionLogger } from '@/lib/logger'

const logger = createExecutionLogger()
const execId = logger.startExecution({ custom_metadata: 'valor' })

await logger.logNodeStart('meuNode', { input: 'dados' })

try {
  const result = await processarAlgo()
  await logger.logNodeSuccess('meuNode', result, Date.now())
} catch (error) {
  await logger.logNodeError('meuNode', error)
}

await logger.finishExecution('success')
```

---

## 🎯 Próximos Passos

### Melhorias Futuras (Opcional)

1. **Filtros avançados**: Filtrar por status, telefone, data
2. **Estatísticas**: Tempo médio por node, taxa de erro
3. **Exportar logs**: Download em JSON/CSV
4. **Alertas**: Notificar quando execuções falham
5. **Comparar execuções**: Ver diferenças entre duas execuções

### Integrações

- **Slack**: Enviar notificação quando há erro
- **Sentry**: Enviar erros automaticamente
- **DataDog/Grafana**: Métricas e dashboards profissionais

---

## ❓ Troubleshooting

### "Nenhuma execução encontrada"

1. Certifique-se que rodou a migration `002_execution_logs.sql`
2. Verifique se `.env.local` tem as credenciais do Supabase
3. Tente enviar uma mensagem de teste

### "Logs não aparecem em tempo real"

1. Verifique se Realtime está habilitado no Supabase
2. Recarregue a página manualmente (F5)
3. Aguarde 1-2 minutos para replicação ativar

### "Erros de TypeScript no logger"

É esperado que hajam alguns erros relacionados a `process.env` durante desenvolvimento.
Eles não afetam a execução, apenas ignore ou adicione `// @ts-ignore` se necessário.

### "Tabela execution_logs não existe"

Rode a migration no Supabase SQL Editor:
```sql
-- Cole o conteúdo de migrations/002_execution_logs.sql
```

---

## 📚 Recursos

- **Dashboard**: http://localhost:3000/dashboard/debug
- **API de Teste**: `POST /api/test/send-message`
- **API de Logs**: `GET /api/debug/executions?execution_id=<id>`
- **Migration**: `migrations/002_execution_logs.sql`
- **Logger**: `src/lib/logger.ts`

---

**Feito com ❤️ para facilitar o debug do chatbot!**
