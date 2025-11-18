# Flow Architecture Synchronization - Implementation Guide

**Status**: ✅ **IMPLEMENTADO** (Opção 4 - Híbrida)  
**Data**: 2025-11-17  
**Versão**: 1.0

---

## 📋 Visão Geral

Este documento explica como funciona a sincronização completa entre o **chatbotFlow.ts** (código que executa) e o **FlowArchitectureManager.tsx** (diagrama visual). 

A implementação segue a **Opção 4 (Híbrida)** do documento `FLOW_ARCHITECTURE_SYNC_PROBLEM.md`, combinando:
- ✅ Metadata compartilhado (source of truth único)
- ✅ Enable/disable real no chatflow
- ✅ Diagrama 100% automático
- ✅ Sincronização garantida

---

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                   src/flows/flowMetadata.ts                  │
│                    SINGLE SOURCE OF TRUTH                    │
│  - Define TODOS os 18 nodes do fluxo                        │
│  - Metadados: id, name, configurable, bypassable, etc       │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐   ┌─────────────────────────┐
│ chatbotFlow   │   │ FlowArchitectureManager │
│ (execução)    │   │ (diagrama UI)           │
└───────┬───────┘   └───────────┬─────────────┘
        │                       │
        │   ┌───────────────────┘
        │   │
        ▼   ▼
┌─────────────────────────┐
│ bot_configurations DB   │
│ flow:node_enabled:[id]  │
└─────────────────────────┘
```

### 1. **flowMetadata.ts** - Source of Truth

**Localização**: `src/flows/flowMetadata.ts`

Define TODOS os nodes em um único lugar:

```typescript
export const FLOW_METADATA: FlowNodeMetadata[] = [
  {
    id: 'batch_messages',
    name: 'Batch Messages',
    description: 'Agrupa mensagens sequenciais',
    category: 'preprocessing',
    enabled: true,              // Default state
    hasConfig: true,
    configurable: true,         // Pode ser desabilitado pelo usuário
    bypassable: true,           // Pode ser ignorado se desabilitado
    configKey: 'batching:delay_seconds',
    dependencies: ['save_user_message'],
  },
  // ... 17 outros nodes
]
```

**Campos Importantes**:
- `configurable: boolean` - Se `true`, usuário pode habilitar/desabilitar. Se `false`, sempre executa.
- `bypassable: boolean` - Se `true`, pode ser pulado quando desabilitado. Se `false`, sempre executa.
- `dependencies: string[]` - IDs de nodes que devem executar antes deste.
- `optionalDependencies: string[]` - Rotas alternativas se dependências principais estiverem desabilitadas.

---

### 2. **flowHelpers.ts** - Database Helpers

**Localização**: `src/lib/flowHelpers.ts`

Funções para verificar estado dos nodes no banco de dados:

#### **`getAllNodeStates(clientId)`**
```typescript
const nodeStates = await getAllNodeStates(clientId)
// Retorna: Map<nodeId, enabled>
// Exemplo: { 'batch_messages' => true, 'detect_repetition' => false }
```

- **Busca em batch** todos os estados de uma vez (eficiente)
- **Cache de 1 minuto** para minimizar queries ao DB
- **Merge com defaults** do metadata se não houver config no DB

#### **`shouldExecuteNode(nodeId, nodeStates)`**
```typescript
if (shouldExecuteNode('batch_messages', nodeStates)) {
  // Execute o node
} else {
  // Pular o node
}
```

- Verifica se node está habilitado
- Verifica se dependências estão habilitadas
- Usa `bypassable` para determinar se pode pular
- Retorna `true` se deve executar, `false` se deve pular

#### **`clearNodeStateCache(clientId?)`**
```typescript
clearNodeStateCache(clientId) // Limpa cache de um cliente específico
clearNodeStateCache()          // Limpa todo o cache
```

- Chamar após atualizar configurações de nodes
- API route já chama automaticamente após updates

---

### 3. **chatbotFlow.ts** - Execução com Verificação

**Localização**: `src/flows/chatbotFlow.ts`

No início do flow, busca estados:

```typescript
export const processChatbotMessage = async (
  payload: WhatsAppWebhookPayload,
  config: ClientConfig
): Promise<ChatbotFlowResult> => {
  // 🔄 Fetch all node states (1 query)
  const nodeStates = await getAllNodeStates(config.id)
  
  // ... nodes executam com verificação
}
```

**Padrão de Verificação**:

```typescript
// NODE 8: Batch Messages (configurable)
let batchedContent: string

if (shouldExecuteNode('batch_messages', nodeStates) && config.settings.messageSplitEnabled) {
  console.log('✅ Message batching enabled - waiting 10s')
  batchedContent = await batchMessages(parsedMessage.phone)
} else {
  console.log('⚠️ Message batching disabled - processing immediately')
  batchedContent = normalizedMessage.content // Bypass
}
```

**Nodes Configuráveis** (verificam estado):
- ✅ NODE 4: `process_media`
- ✅ NODE 6: `push_to_redis`
- ✅ NODE 8: `batch_messages`
- ✅ NODE 9: `get_chat_history`
- ✅ NODE 10: `get_rag_context`
- ✅ NODE 9.5: `check_continuity`
- ✅ NODE 9.6: `classify_intent`
- ✅ NODE 11.5: `detect_repetition`

**Nodes Não-Configuráveis** (sempre executam):
- NODE 1: `filter_status`
- NODE 2: `parse_message`
- NODE 3: `check_customer`
- NODE 5: `normalize_message`
- NODE 7: `save_user_message`
- NODE 11: `generate_response`
- NODE 11.6: `save_ai_message`
- NODE 12: `format_response`
- NODE 13: `send_whatsapp`

---

### 4. **FlowArchitectureManager.tsx** - Diagrama UI

**Localização**: `src/components/FlowArchitectureManager.tsx`

Agora importa de `FLOW_METADATA`:

```typescript
import { FLOW_METADATA, FlowNodeMetadata } from '@/flows/flowMetadata'

export default function FlowArchitectureManager() {
  const [nodes, setNodes] = useState<FlowNodeMetadata[]>(FLOW_METADATA)
  // ... resto do componente
}
```

**Interface de Node**:
- Mostra badges:
  - `✅ Configurável` ou `🔒 Sempre Ativo`
  - `🔀 Pode ser Ignorado` (se `bypassable`)
- Toggle só aparece se `configurable: true`
- Aviso exibido para nodes não-configuráveis

---

### 5. **API Route** - Persistência

**Localização**: `src/app/api/flow/nodes/[nodeId]/route.ts`

#### **GET `/api/flow/nodes/[nodeId]`**
```typescript
// Busca estado atual de um node específico
const response = await fetch('/api/flow/nodes/batch_messages')
// Retorna: { nodeId, configKey, config: { enabled: true, ... } }
```

#### **PATCH `/api/flow/nodes/[nodeId]`**
```typescript
// Atualiza estado de um node
await fetch('/api/flow/nodes/batch_messages', {
  method: 'PATCH',
  body: JSON.stringify({ enabled: false })
})
// Salva em: bot_configurations.flow:node_enabled:batch_messages = { enabled: false }
```

**Após Update**:
- Chama `clearNodeStateCache(clientId)` automaticamente
- Próxima execução do flow já usa novo estado

---

## 🔄 Fluxo de Sincronização

### Cenário 1: Usuário Desabilita Node no Diagrama

```
1. Usuário clica no toggle de "Batch Messages" no diagrama
   └─> FlowArchitectureManager.tsx

2. Componente chama API PATCH
   └─> POST /api/flow/nodes/batch_messages
       body: { enabled: false }

3. API salva no banco
   └─> bot_configurations
       INSERT (client_id, flow:node_enabled:batch_messages, { enabled: false })

4. Cache é limpo
   └─> clearNodeStateCache(clientId)

5. Próximo webhook chega
   └─> chatbotFlow.ts executa

6. Flow busca estados
   └─> getAllNodeStates(clientId)
       Retorna: { batch_messages: false, ... }

7. Flow verifica node
   └─> shouldExecuteNode('batch_messages', nodeStates)
       Retorna: false

8. Flow pula o node
   └─> console.log('⚠️ Message batching disabled - processing immediately')
       batchedContent = normalizedMessage.content  // Bypass

✅ RESULTADO: Node realmente desabilitado na execução
```

---

### Cenário 2: Adicionar Novo Node

```
1. Adicionar entry em flowMetadata.ts
   └─> export const FLOW_METADATA = [
         ...
         {
           id: 'new_node',
           name: 'New Feature',
           configurable: true,
           bypassable: true,
           dependencies: ['generate_response']
         }
       ]

2. Implementar node em src/nodes/newNode.ts
   └─> export async function newNode(...) { ... }

3. Importar e usar no chatbotFlow.ts
   └─> import { newNode } from '@/nodes/newNode'
       
       if (shouldExecuteNode('new_node', nodeStates)) {
         await newNode(...)
       }

4. Diagrama atualiza AUTOMATICAMENTE
   └─> FlowArchitectureManager já lê de FLOW_METADATA
       Node aparece sem código adicional

✅ RESULTADO: Node visível no diagrama e funcional no flow
```

---

## 🧪 Como Testar

### Teste 1: Desabilitar Batch Messages

1. Abrir dashboard → Flow Architecture
2. Clicar em "Batch Messages"
3. Desabilitar toggle
4. Enviar mensagem via WhatsApp
5. Verificar logs:
   ```
   [chatbotFlow] ⚠️ Message batching disabled - processing immediately
   ```
6. ✅ Mensagem processa instantaneamente (sem esperar 10s)

---

### Teste 2: Desabilitar RAG Context

1. Abrir dashboard → Flow Architecture
2. Clicar em "Get RAG Context"
3. Desabilitar toggle
4. Enviar mensagem via WhatsApp
5. Verificar logs:
   ```
   [chatbotFlow] ⚠️ RAG disabled - proceeding without context
   ```
6. ✅ Resposta gerada sem busca vetorial

---

### Teste 3: Desabilitar Detect Repetition

1. Abrir dashboard → Flow Architecture
2. Clicar em "Detect Repetition"
3. Desabilitar toggle
4. Enviar várias mensagens iguais
5. Verificar logs:
   ```
   [chatbotFlow] ⚠️ Detect Repetition disabled - skipping repetition check
   ```
6. ✅ Não há verificação de repetição (pode repetir respostas)

---

### Teste 4: Node Não-Configurável

1. Abrir dashboard → Flow Architecture
2. Clicar em "Generate AI Response"
3. ✅ Verificar que toggle NÃO aparece
4. ✅ Mostra badge "🔒 Sempre Ativo"
5. ✅ Mostra aviso: "Este node é essencial e não pode ser desabilitado"

---

## 📊 Logs e Debugging

### Ver Execution Plan

Para debugar quais nodes vão executar:

```typescript
import { getExecutionPlan } from '@/lib/flowHelpers'

const plan = await getExecutionPlan(clientId)
console.log('Nodes que vão executar:', plan)
// Output: ['filter_status', 'parse_message', ..., 'send_whatsapp']
```

### Logs Durante Execução

Nodes desabilitados logam claramente:

```
[chatbotFlow] NODE 6: ⏭️ Push to Redis DESABILITADO - pulando...
[chatbotFlow] NODE 8: ⚠️ Message batching disabled (node disabled) - processing immediately
[chatbotFlow] ⚠️ RAG disabled by node state - proceeding without context
[chatbotFlow] ⚠️ Check Continuity disabled - using default behavior
```

Busque por:
- `DESABILITADO` - Node foi pulado
- `disabled` - Motivo do bypass
- `skipped: true` - Registrado no execution logger

---

## 🔧 Manutenção

### Adicionar Novo Node

1. **Adicionar metadata** em `flowMetadata.ts`
2. **Implementar função** em `src/nodes/newNode.ts`
3. **Usar no flow** em `chatbotFlow.ts`:
   ```typescript
   if (shouldExecuteNode('new_node', nodeStates)) {
     await newNode(...)
   }
   ```
4. **Adicionar mapeamento** (se tiver config) em `src/app/api/flow/nodes/[nodeId]/route.ts`

### Mudar Node de Configurável para Não-Configurável

1. Editar em `flowMetadata.ts`:
   ```typescript
   {
     id: 'node_id',
     configurable: false,  // Mudou de true para false
     bypassable: false     // Mudou de true para false
   }
   ```
2. Remover verificação em `chatbotFlow.ts`:
   ```typescript
   // Antes
   if (shouldExecuteNode('node_id', nodeStates)) {
     await nodeFunction()
   }
   
   // Depois (sempre executa)
   await nodeFunction()
   ```

---

## ⚠️ Considerações Importantes

### Performance

- **Cache**: Node states têm cache de 1 minuto
  - Reduz queries ao DB
  - Atualiza automaticamente após 60s
  - Limpa automaticamente após updates via API

- **Batch Fetch**: Todos os estados buscados em 1 query
  - Evita N+1 queries (18 nodes = 1 query, não 18)

### Segurança

- **Service Role Key**: flowHelpers usa Supabase service role
  - Acesso direto ao banco (sem RLS)
  - Apenas server-side (não exposto ao client)

### Fallbacks

Nodes desabilitados usam valores padrão seguros:

| Node Desabilitado    | Fallback                                |
|----------------------|-----------------------------------------|
| `batch_messages`     | Usa `normalizedMessage.content` direto  |
| `get_chat_history`   | Array vazio `[]`                        |
| `get_rag_context`    | String vazia `''`                       |
| `check_continuity`   | `{ isNewConversation: false, ... }`     |
| `classify_intent`    | `{ intent: 'outro', confidence: 'medium' }` |
| `detect_repetition`  | Pula verificação (aceita qualquer resposta) |

---

## 📝 Resumo

### Antes da Implementação

❌ Diagrama e código desincronizados  
❌ Toggle no diagrama não fazia nada  
❌ Adicionar node = atualizar 2 lugares  
❌ Risco de esquecer sincronização  

### Depois da Implementação

✅ Metadata único (`flowMetadata.ts`)  
✅ Toggle funciona de verdade  
✅ Adicionar node = automático no diagrama  
✅ Sincronização garantida  
✅ Logs claros quando nodes pulados  
✅ Performance otimizada (cache + batch)  

---

## 🔗 Referências

- **Documento Original**: `docs/FLOW_ARCHITECTURE_SYNC_PROBLEM.md`
- **Opção Implementada**: Opção 4 (Híbrida)
- **Commit Principal**: "Implement node enable/disable checking in chatbotFlow execution"

---

**Última atualização**: 2025-11-17  
**Autor**: GitHub Copilot (via Issue #[número])  
**Status**: ✅ **PRODUCTION READY**
