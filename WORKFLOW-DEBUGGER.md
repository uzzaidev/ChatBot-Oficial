# 🔀 Workflow Debugger - Sistema de Debug Passo a Passo

## 📋 O Que Foi Criado

Sistema de debug estilo **n8n** onde você pode testar cada node do fluxo individualmente, visualizando entrada/saída de dados em tempo real.

## 🌐 Como Acessar

**Local:** http://localhost:3000/dashboard/workflow
**Produção:** https://chat.luisfboff.com/dashboard/workflow

## 🎯 Funcionalidades

### 1. **Cards Interativos para Cada Node**
Cada node do fluxo tem um card com:
- ▶️ **Botão "Executar"** - Testa o node isoladamente
- 🔄 **Botão "Reset"** - Limpa os dados do node
- 📥 **Input Data** - Mostra dados de entrada (JSON)
- 📤 **Output Data** - Mostra dados de saída (JSON)
- ⏱️ **Duração** - Tempo de execução em ms
- 🔴/🟢/🟡 **Status Indicator** - Idle/Success/Error/Running

### 2. **Fluxo Sequencial Automático**
- Primeiro node usa payload do webhook
- Nodes seguintes usam output do node anterior
- Sistema valida se node anterior foi executado antes

### 3. **Execução em Lote**
- Botão "▶️ Executar Tudo" - Roda todo o fluxo sequencialmente
- Botão "🔄 Reset All" - Limpa todos os nodes

### 4. **Webhook Payload Inicial**
Card mostrando o JSON real recebido do WhatsApp (sua mensagem "ola"):
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "555499250023",
          "text": { "body": "ola" },
          "type": "text"
        }]
      }
    }]
  }]
}
```

## 🔧 Nodes Disponíveis para Teste

| # | Node | Descrição | Endpoint |
|---|------|-----------|----------|
| 1 | Filter Status Updates | Filtra status updates (delivered, read) | `/api/test/nodes/filter-status` |
| 2 | Parse Message | Extrai phone, name, type, content | `/api/test/nodes/parse-message` |
| 3 | Check/Create Customer | Verifica se cliente existe no banco | `/api/test/nodes/check-customer` |
| 4 | Download Media | Baixa áudio/imagem (opcional) | `/api/test/nodes/download-media` |
| 5 | Normalize Message | Normaliza conteúdo da mensagem | `/api/test/nodes/normalize` |
| 6 | Push to Redis | Adiciona à fila de batching | `/api/test/nodes/push-redis` |
| 7 | Batch Messages | Aguarda 10s e agrupa mensagens | `/api/test/nodes/batch` |
| 8 | Get Chat History | Busca histórico de conversas | `/api/test/nodes/chat-history` |
| 9 | Get RAG Context | Busca contexto (vector search) | `/api/test/nodes/rag-context` |
| 10 | Generate AI Response | Gera resposta com LLM (Groq) | `/api/test/nodes/ai-response` |
| 11 | Format Response | Divide resposta em mensagens | `/api/test/nodes/format-response` |
| 12 | Send WhatsApp Message | Envia via Meta API | `/api/test/nodes/send-whatsapp` |

## 🎬 Como Usar (Exemplo Prático)

### Cenário 1: Testar Só os Primeiros 3 Steps

1. Acesse http://localhost:3000/dashboard/workflow
2. Clique em "▶️ Executar" no card **1. Filter Status Updates**
   - ✅ Veja o output: payload filtrado (não é status update)
3. Clique em "▶️ Executar" no card **2. Parse Message**
   - ✅ Veja o output: `{ phone: "555499250023", name: "Luis Fernando Boff", type: "text", content: "ola" }`
4. Clique em "▶️ Executar" no card **3. Check/Create Customer**
   - ✅ Veja o output: dados do cliente no banco

### Cenário 2: Testar Fluxo Completo Automático

1. Clique em **"▶️ Executar Tudo"** (canto superior direito)
2. Aguarde enquanto cada node é executado em sequência
3. Veja os cards mudarem de cor:
   - 🟡 Amarelo = Executando
   - 🟢 Verde = Sucesso
   - 🔴 Vermelho = Erro
4. Inspecione input/output de cada step

### Cenário 3: Debug de Erro Específico

Se um node falhar:
1. Veja a mensagem de erro no card (fundo vermelho)
2. Inspecione o **Input Data** - está correto?
3. Clique em "🔄" para resetar o node
4. Modifique algo no código do node
5. Clique em "▶️ Executar" novamente

## 🏗️ Arquitetura Técnica

### Frontend (`src/app/dashboard/workflow/page.tsx`)
- Estado global com `useState` para cada node
- Função `executeNode(nodeId)` que:
  1. Determina input (webhook ou output anterior)
  2. Faz POST para endpoint do node
  3. Atualiza estado com resultado
- UI com cards do shadcn/ui

### Backend (12 endpoints em `/api/test/nodes/*/route.ts`)
Cada endpoint:
```typescript
POST /api/test/nodes/[node-name]/route.ts
Input: { input: any }
Output: { success: true, output: any, info: string }
```

Padrão de código:
```typescript
export async function POST(request: NextRequest) {
  const { input } = await request.json()
  const output = await nodeFunction(input) // Chama função real do node
  return NextResponse.json({ success: true, output })
}
```

## 🐛 Debugging Tips

### Node retorna erro
- Veja o **details** no JSON de erro
- Verifique variáveis de ambiente (.env.local)
- Confira logs no terminal (console.log)

### Input está vazio
- Execute o node anterior primeiro
- Verifique se node anterior teve sucesso (🟢)

### Output não parece correto
- Compare com execução real no `/dashboard/debug`
- Veja execução completa em "Timeline de Execução"

## 🔄 Próximos Passos

### Para Desenvolvimento
1. ✅ Teste cada node individualmente
2. ✅ Valide transformações de dados
3. ✅ Identifique gargalos (veja duração)
4. ⚙️ Ajuste lógica dos nodes conforme necessário
5. 🚀 Quando tudo funcionar, desabilite debug

### Para Produção
Quando fluxo estiver validado:
- Remova logs `console.log` dos nodes
- Desabilite endpoints `/api/test/nodes/*` (ou proteja com auth)
- Use apenas o sistema automático (`chatbotFlow.ts`)

## 📊 Visualização vs Monitoramento

| Sistema | Propósito | Quando Usar |
|---------|-----------|-------------|
| **Workflow Debugger** | Debug passo a passo | Desenvolvimento, validação de lógica |
| **Debug Dashboard** | Monitoramento em tempo real | Produção, ver execuções completas |
| **Timeline de Execução** | Histórico de runs | Análise pós-erro, auditoria |

## 🎨 UI/UX

- **Cores de Status:**
  - 🔵 Cinza = Idle (não executado)
  - 🟡 Amarelo = Running (executando)
  - 🟢 Verde = Success
  - 🔴 Vermelho = Error

- **Scroll Areas:**
  - Input/Output com scroll para JSONs grandes
  - Máximo 32rem de altura por seção

- **Responsividade:**
  - Desktop: 2 colunas (6 cards por linha)
  - Mobile: 1 coluna (stack vertical)

## ✅ Validação

Para validar que sistema está funcionando:

```bash
# 1. Acesse a página
curl http://localhost:3000/dashboard/workflow

# 2. Teste endpoint individual
curl -X POST http://localhost:3000/api/test/nodes/parse-message \
  -H "Content-Type: application/json" \
  -d '{"input": {...webhook payload...}}'

# 3. Veja resposta JSON com output
```

## 🚨 Troubleshooting

**Problema:** Botão "Executar" não faz nada
- **Solução:** Verifique console do browser (F12) por erros

**Problema:** Erro "Execute primeiro o node: X"
- **Solução:** Clique nos nodes em ordem sequencial (1 → 2 → 3...)

**Problema:** Output está null mesmo com sucesso
- **Solução:** Verifique se função do node retorna valor

**Problema:** Duração muito alta (>5s)
- **Solução:** Identifique gargalo (DB query, API externa, etc)

## 📖 Documentação Relacionada

- **README.md** - Documentação geral do projeto
- **QUICK_START.md** - Setup inicial
- **CLAUDE.md** - Arquitetura e padrões
- **DATABASE-INFO.md** - Schema do banco
- **IMPLEMENTATION_SUMMARY.md** - Detalhes técnicos
