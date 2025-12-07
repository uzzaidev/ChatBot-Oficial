# 🤖 Plano: Transfer to Bot com Auto-Resposta

## 📋 Problema Atual

Quando um flow interativo transfere para o bot (bloco `ai_handoff`) ou para humano (bloco `human_handoff`), ocorre:

1. ✅ Status do cliente é atualizado (`bot` ou `humano`)
2. ✅ Flow execution é marcado como completo
3. ❌ **Cliente não recebe nenhuma resposta**
4. ❌ **Bot não processa a última interação**
5. ❌ **Bot não tem contexto do que aconteceu no flow**

**Resultado:** Cliente fica sem resposta, experiência ruim.

---

## 🎯 Solução: Opção 3 - Híbrido

### Características

1. **Mensagem de Transição Configurável** (opcional)
   - Campo de texto no bloco
   - Ex: "Perfeito! Agora vou te conectar com nosso assistente..."

2. **Bot Responde Automaticamente**
   - Ao transferir, bot processa última mensagem do usuário
   - Bot recebe contexto do flow execution
   - Resposta imediata, transição suave

3. **Contexto do Flow**
   - Histórico de interações do flow
   - Variáveis coletadas
   - Formatado como system prompt para o bot

---

## 🏗️ Arquitetura da Solução

### 1. Modificações no Schema

#### **FlowBlock Data para `ai_handoff`**

```typescript
// ANTES
type: 'ai_handoff'
data: {} // Vazio!

// DEPOIS
type: 'ai_handoff'
data: {
  transitionMessage?: string      // Mensagem opcional antes de transferir
  autoRespond: boolean            // Bot responde automaticamente? (default: true)
  includeFlowContext: boolean     // Incluir contexto do flow? (default: true)
  contextFormat: 'summary' | 'full'  // Formato do contexto
}
```

#### **FlowBlock Data para `human_handoff`**

```typescript
// ANTES
type: 'human_handoff'
data: {} // Vazio!

// DEPOIS
type: 'human_handoff'
data: {
  transitionMessage?: string      // Ex: "Um atendente humano vai te responder em breve"
  notifyAgent: boolean            // Enviar notificação? (default: true)
}
```

### 2. Modificações no FlowExecutor

#### **Método `transferToBot()` - ANTES**

```typescript
private async transferToBot(executionId, phone, clientId) {
  // 1. Update contact status
  await supabase.update('clientes_whatsapp')
    .set({ status: 'bot' })

  // 2. Mark flow as completed
  await supabase.update('flow_executions')
    .set({ status: 'transferred_ai' })

  // FIM - Cliente não recebe nada!
}
```

#### **Método `transferToBot()` - DEPOIS**

```typescript
private async transferToBot(
  executionId: string,
  phone: string,
  clientId: string,
  block: FlowBlock  // NOVO: Recebe o bloco com config
) {
  const { transitionMessage, autoRespond, includeFlowContext, contextFormat } = block.data;

  // 1. Pegar execution com histórico
  const execution = await getExecutionById(executionId);

  // 2. Enviar mensagem de transição (se configurada)
  if (transitionMessage) {
    await sendWhatsAppMessage(phone, transitionMessage);
    await saveOutgoingMessage(phone, clientId, transitionMessage);
  }

  // 3. Update contact status
  await supabase.update('clientes_whatsapp')
    .set({ status: 'bot' })

  // 4. Mark flow as completed
  await supabase.update('flow_executions')
    .set({
      status: 'transferred_ai',
      completed_at: new Date().toISOString()
    })

  // 5. AUTO-RESPOSTA DO BOT
  if (autoRespond) {
    // 5.1. Formatar contexto do flow
    const flowContext = includeFlowContext
      ? formatFlowContext(execution, contextFormat)
      : null;

    // 5.2. Pegar última mensagem do usuário
    const lastUserMessage = getLastUserMessage(execution);

    // 5.3. Chamar chatbotFlow com contexto
    await triggerBotResponse(phone, clientId, lastUserMessage, flowContext);
  }
}
```

### 3. Novas Funções Auxiliares

#### **`formatFlowContext()`**

Formata o histórico do flow para o bot entender.

```typescript
function formatFlowContext(
  execution: FlowExecution,
  format: 'summary' | 'full'
): string {
  if (format === 'summary') {
    // Resumo: apenas variáveis coletadas e última interação
    const vars = execution.variables;
    const lastStep = execution.history[execution.history.length - 1];

    return `
[CONTEXTO DO FLUXO]
O cliente acabou de passar por um fluxo interativo.
Dados coletados:
${Object.entries(vars).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Última interação: ${lastStep.userResponse || lastStep.interactiveResponseId}
`;
  } else {
    // Full: histórico completo de interações
    const steps = execution.history.map((step, i) => {
      return `${i + 1}. [${step.blockType}] ${step.userResponse || step.interactiveResponseId}`;
    }).join('\n');

    return `
[HISTÓRICO COMPLETO DO FLUXO]
${steps}

Variáveis coletadas:
${Object.entries(execution.variables).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
`;
  }
}
```

#### **`getLastUserMessage()`**

Pega a última resposta do usuário no flow.

```typescript
function getLastUserMessage(execution: FlowExecution): string {
  const history = execution.history;

  // Procurar de trás para frente a última resposta do usuário
  for (let i = history.length - 1; i >= 0; i--) {
    const step = history[i];
    if (step.userResponse || step.interactiveResponseId) {
      return step.userResponse || `[Selecionou: ${step.interactiveResponseId}]`;
    }
  }

  return "Olá"; // Fallback
}
```

#### **`triggerBotResponse()`**

Chama o chatbotFlow para gerar resposta automática.

```typescript
async function triggerBotResponse(
  phone: string,
  clientId: string,
  userMessage: string,
  flowContext: string | null
) {
  // Construir payload como se fosse um webhook do WhatsApp
  const mockPayload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: phone,
            type: 'text',
            text: { body: userMessage },
            timestamp: Date.now().toString()
          }],
          contacts: [{
            profile: { name: phone },
            wa_id: phone
          }]
        }
      }]
    }]
  };

  // Injetar contexto do flow no sistema (via variável global ou session)
  if (flowContext) {
    // Opção 1: Salvar em tabela temporária
    await supabase.from('flow_context_temp').insert({
      phone,
      client_id: clientId,
      context: flowContext,
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 min TTL
    });

    // Opção 2: Adicionar direto ao histórico do chat
    await supabase.from('n8n_chat_histories').insert({
      session_id: phone,
      client_id: clientId,
      message: {
        type: 'system',
        content: flowContext
      }
    });
  }

  // Chamar o chatbotFlow
  const { processChatbotMessage } = await import('./chatbotFlow');
  await processChatbotMessage(mockPayload, clientId);
}
```

### 4. Modificações no `chatbotFlow.ts`

```typescript
// ANTES
export async function processChatbotMessage(
  body: WhatsAppWebhookPayload,
  clientIdParam?: string
)

// DEPOIS
export async function processChatbotMessage(
  body: WhatsAppWebhookPayload,
  clientIdParam?: string,
  flowContext?: string  // NOVO: Contexto opcional do flow
)

// No nó de AI Response (NODE 11):
// Se flowContext existe, adicionar ao system prompt
const systemPromptWithContext = flowContext
  ? `${systemPrompt}\n\n${flowContext}`
  : systemPrompt;
```

### 5. Modificações na UI do Flow Builder

#### **Componente `AIHandoffNode.tsx` (novo)**

```tsx
export function AIHandoffNode({ data, onChange }) {
  const [transitionMessage, setTransitionMessage] = useState(data.transitionMessage || '');
  const [autoRespond, setAutoRespond] = useState(data.autoRespond ?? true);
  const [includeContext, setIncludeContext] = useState(data.includeFlowContext ?? true);
  const [contextFormat, setContextFormat] = useState(data.contextFormat || 'summary');

  return (
    <div className="node-config">
      <h3>🤖 Transferir para Bot (IA)</h3>

      {/* Mensagem de Transição */}
      <label>
        Mensagem de Transição (Opcional)
        <Textarea
          placeholder="Ex: Perfeito! Agora vou te conectar com nosso assistente virtual..."
          value={transitionMessage}
          onChange={(e) => {
            setTransitionMessage(e.target.value);
            onChange({ transitionMessage: e.target.value });
          }}
        />
      </label>

      {/* Auto-Resposta */}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={autoRespond}
          onChange={(e) => {
            setAutoRespond(e.target.checked);
            onChange({ autoRespond: e.target.checked });
          }}
        />
        Bot responde automaticamente após transferência
      </label>

      {/* Contexto do Flow */}
      {autoRespond && (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => {
                setIncludeContext(e.target.checked);
                onChange({ includeFlowContext: e.target.checked });
              }}
            />
            Incluir contexto do fluxo na resposta do bot
          </label>

          {includeContext && (
            <label>
              Formato do Contexto
              <select
                value={contextFormat}
                onChange={(e) => {
                  setContextFormat(e.target.value);
                  onChange({ contextFormat: e.target.value });
                }}
              >
                <option value="summary">Resumo (apenas variáveis)</option>
                <option value="full">Completo (histórico inteiro)</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
  );
}
```

#### **Componente `HumanHandoffNode.tsx` (novo)**

```tsx
export function HumanHandoffNode({ data, onChange }) {
  const [transitionMessage, setTransitionMessage] = useState(
    data.transitionMessage || 'Um atendente humano vai te responder em breve.'
  );
  const [notifyAgent, setNotifyAgent] = useState(data.notifyAgent ?? true);

  return (
    <div className="node-config">
      <h3>👤 Transferir para Humano</h3>

      {/* Mensagem de Transição */}
      <label>
        Mensagem para o Cliente
        <Textarea
          value={transitionMessage}
          onChange={(e) => {
            setTransitionMessage(e.target.value);
            onChange({ transitionMessage: e.target.value });
          }}
        />
      </label>

      {/* Notificar Agente */}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={notifyAgent}
          onChange={(e) => {
            setNotifyAgent(e.target.checked);
            onChange({ notifyAgent: e.target.checked });
          }}
        />
        Enviar notificação para agente humano
      </label>
    </div>
  );
}
```

---

## 🔄 Fluxo de Execução Completo

### Cenário: Cliente em Flow → Transfer to Bot

```
1. Cliente está no flow interativo
   └─ Escolhe opção em lista/botões
   └─ Flow executa bloco "ai_handoff"

2. FlowExecutor.executeBlock('ai_handoff')
   ├─ Chama transferToBot(executionId, phone, clientId, block)
   │
   ├─ 2.1. Enviar mensagem de transição (se configurada)
   │   └─ WhatsApp: "Perfeito! Agora vou te conectar..."
   │
   ├─ 2.2. Atualizar status do cliente
   │   └─ clientes_whatsapp.status = 'bot'
   │
   ├─ 2.3. Marcar flow como completo
   │   └─ flow_executions.status = 'transferred_ai'
   │
   └─ 2.4. Auto-Resposta do Bot (se autoRespond = true)
       ├─ Pegar execution com histórico
       ├─ Formatar contexto do flow
       │   └─ "Cliente escolheu Produto X, nome: João, email: joao@..."
       ├─ Pegar última mensagem do usuário
       │   └─ "Produto X" ou "[Selecionou: produto_x]"
       ├─ Criar mock payload do WhatsApp
       ├─ Salvar contexto (n8n_chat_histories ou temp table)
       └─ Chamar processChatbotMessage()

3. chatbotFlow processa
   ├─ Detecta que cliente acabou de vir do flow (status recém mudou)
   ├─ Carrega contexto do flow
   ├─ Adiciona contexto ao system prompt
   ├─ Processa última mensagem do usuário
   └─ Gera resposta do bot com contexto completo

4. Cliente recebe resposta
   └─ WhatsApp: "Vi que você escolheu Produto X! Posso te explicar mais sobre ele..."

5. Flow → Bot ✅ Transição suave!
```

---

## 🧪 Casos de Teste

### Teste 1: Transfer to Bot COM mensagem de transição

**Setup:**
- Bloco `ai_handoff` com:
  - `transitionMessage: "Conectando você ao assistente..."`
  - `autoRespond: true`
  - `includeFlowContext: true`

**Expected:**
1. Cliente recebe: "Conectando você ao assistente..."
2. Status muda para 'bot'
3. Bot responde: "Vi que você escolheu [opção]. Como posso ajudar?"

---

### Teste 2: Transfer to Bot SEM mensagem de transição

**Setup:**
- Bloco `ai_handoff` com:
  - `transitionMessage: null`
  - `autoRespond: true`

**Expected:**
1. Status muda para 'bot'
2. Bot responde imediatamente (sem mensagem intermediária)

---

### Teste 3: Transfer to Bot SEM auto-resposta

**Setup:**
- Bloco `ai_handoff` com:
  - `autoRespond: false`

**Expected:**
1. Status muda para 'bot'
2. Cliente NÃO recebe resposta automática
3. Próxima mensagem do cliente é processada pelo bot

---

### Teste 4: Transfer to Human

**Setup:**
- Bloco `human_handoff` com:
  - `transitionMessage: "Um atendente vai te responder logo."`
  - `notifyAgent: true`

**Expected:**
1. Cliente recebe: "Um atendente vai te responder logo."
2. Status muda para 'humano'
3. Email enviado para agente

---

## 🔒 Considerações de Segurança

### 1. Prevenir Loops Infinitos

**Problema:** Bot pode re-triggerar flow que re-triggera bot.

**Solução:**
- Adicionar flag `transferred_from_flow: true` no contexto
- Bot verifica flag antes de triggerar flows
- Flow verifica flag antes de aceitar entrada

### 2. Limitar Tamanho do Contexto

**Problema:** Histórico muito longo pode estourar limite de tokens.

**Solução:**
```typescript
function formatFlowContext(execution, format) {
  let context = // ... formatar

  // Limitar a 1000 caracteres
  if (context.length > 1000) {
    context = context.substring(0, 1000) + '... [contexto truncado]';
  }

  return context;
}
```

### 3. TTL para Contexto Temporário

Se usar tabela temporária para contexto:
```sql
-- Limpar contextos expirados (cronjob a cada 5 min)
DELETE FROM flow_context_temp WHERE expires_at < NOW();
```

### 4. Validar Permissões

Garantir que apenas flows do mesmo `client_id` podem transferir para bot.

---

## 📊 Métricas de Sucesso

### KPIs para Monitorar

1. **Taxa de Transferência Bem-Sucedida**
   - % de transferências que resultaram em resposta do bot

2. **Tempo de Primeira Resposta Após Transferência**
   - Média de tempo entre transfer e primeira resposta do bot

3. **Satisfação do Usuário**
   - Menos mensagens "Olá?", "Tem alguém aí?" após transfer

4. **Taxa de Abandono Pós-Transfer**
   - % de usuários que param de responder após transfer

---

## 🚀 Plano de Implementação

### Fase 1: Backend (FlowExecutor)
1. ✅ Modificar tipos `FlowBlock` para `ai_handoff` e `human_handoff`
2. ✅ Implementar `formatFlowContext()`
3. ✅ Implementar `getLastUserMessage()`
4. ✅ Implementar `triggerBotResponse()`
5. ✅ Modificar `transferToBot()` e `transferToHuman()`
6. ✅ Modificar `chatbotFlow` para aceitar contexto

### Fase 2: Frontend (Flow Builder UI)
1. ✅ Criar `AIHandoffNode.tsx`
2. ✅ Criar `HumanHandoffNode.tsx`
3. ✅ Integrar com ReactFlow
4. ✅ Validação de campos

### Fase 3: Testes
1. ✅ Testes unitários para funções auxiliares
2. ✅ Testes de integração para fluxo completo
3. ✅ Testes manuais com flows reais

### Fase 4: Deploy
1. ✅ Migration para adicionar campos aos flows existentes
2. ✅ Deploy gradual (feature flag?)
3. ✅ Monitoramento de métricas

---

## 📝 Notas Adicionais

### Alternativas Consideradas

1. **Não incluir contexto** - Mais simples, mas bot não entende o que aconteceu
2. **Sempre responder automaticamente** - Menos flexível
3. **Usar webhook externo** - Mais complexo, desnecessário

### Decisões de Design

- **Por que formato 'summary' vs 'full'?**
  - 'summary' economiza tokens, suficiente para maioria dos casos
  - 'full' para casos complexos onde histórico completo é importante

- **Por que salvar contexto em `n8n_chat_histories`?**
  - Bot já lê dessa tabela para histórico
  - Não precisa criar nova infraestrutura
  - Contexto fica persistente para debug

### Melhorias Futuras

1. **Contexto Rico** - Incluir timestamps, IPs, metadata
2. **Template de Mensagens** - Biblioteca de mensagens pré-prontas
3. **A/B Testing** - Testar diferentes mensagens de transição
4. **Analytics Dashboard** - Visualizar taxa de sucesso de transfers

---

**Autor:** Claude Code
**Data:** 2025-12-07
**Versão:** 1.0
