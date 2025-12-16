# 🤖 Dynamic AI Provider Selection - Plano de Implementação

**Objetivo**: Permitir que clientes escolham entre **OpenAI** ou **Groq** como modelo principal de conversação do agente.

**Status**: 📋 PLANEJADO  
**Prioridade**: 🟡 MÉDIA  
**Complexidade**: 🟡 MÉDIA (~6-8 horas)  
**Data Criação**: 2025-10-29

---

## 📊 Contexto Atual

### Arquitetura Existente

**OpenAI**:
- ✅ Usado para: Transcrição de áudio (Whisper), análise de imagens (Vision), análise de documentos
- ✅ Funções: `transcribeAudio()`, `analyzeImage()`, `analyzeDocument()`
- ✅ Custo: ~$5/1M tokens (GPT-4o)

**Groq**:
- ✅ Usado para: Respostas de texto do agente (conversação principal)
- ✅ Funções: `generateChatCompletion()` em `generateAIResponse()`
- ✅ Custo: ~$0.60/1M tokens (Llama 3.3 70B)

### Limitação Atual

- ⚠️ Groq é **hardcoded** como modelo principal em `generateAIResponse()`
- ⚠️ Cliente **não pode escolher** usar GPT-4o para conversação

---

## 🎯 Objetivos da Feature

### Funcional

1. **UI de Seleção**: Cliente pode escolher provider na página de settings
2. **Persistência**: Escolha salva na tabela `clients`
3. **Execução Dinâmica**: `generateAIResponse` usa provider selecionado
4. **Transparência**: Mostrar diferenças de custo e performance
5. **Fallback**: OpenAI sempre usado para mídia (independente da escolha)

### Técnico

1. Criar função `generateChatCompletionOpenAI()` equivalente ao Groq
2. Adicionar if/else em `generateAIResponse()` para escolher provider
3. Adicionar campo `primary_model_provider` na tabela `clients`
4. Atualizar UI para mostrar seletor de provider
5. Manter compatibilidade com código existente

---

## 📋 Plano de Implementação

### FASE 1: Database Schema (30 min)

#### 1.1 Migration SQL

**Arquivo**: `migrations/011_add_primary_provider.sql`

```sql
-- Adicionar coluna primary_model_provider
ALTER TABLE clients
ADD COLUMN primary_model_provider TEXT DEFAULT 'groq'
CHECK (primary_model_provider IN ('openai', 'groq'));

-- Comentário
COMMENT ON COLUMN clients.primary_model_provider IS 
  'AI provider usado para conversação principal. openai=GPT-4o (caro, inteligente), groq=Llama (rápido, econômico)';

-- Índice (opcional, para queries futuras)
CREATE INDEX idx_clients_provider ON clients(primary_model_provider);

-- Migrar dados existentes (garantir que todos tenham 'groq')
UPDATE clients 
SET primary_model_provider = 'groq'
WHERE primary_model_provider IS NULL;

-- Tornar NOT NULL após popular
ALTER TABLE clients
ALTER COLUMN primary_model_provider SET NOT NULL;
```

#### 1.2 Executar Migration

```bash
# 1. Copiar SQL acima
# 2. Abrir Supabase SQL Editor
# 3. Colar e executar
# 4. Verificar: SELECT id, name, primary_model_provider FROM clients;
```

---

### FASE 2: TypeScript Types (15 min)

#### 2.1 Atualizar `ClientConfig`

**Arquivo**: `src/lib/types.ts`

```typescript
export interface ClientConfig {
  // ... campos existentes
  
  // NOVO: Provider principal
  primaryProvider: 'openai' | 'groq'
  
  models: {
    openaiModel: string  // gpt-4o, gpt-4o-mini, etc
    groqModel: string    // llama-3.3-70b-versatile, etc
  }
  
  // ... resto dos campos
}
```

#### 2.2 Atualizar `getClientConfig()`

**Arquivo**: `src/lib/config.ts`

```typescript
const config: ClientConfig = {
  id: client.id,
  name: client.name,
  slug: client.slug,
  status: client.status,
  
  // NOVO: Provider principal
  primaryProvider: client.primary_model_provider || 'groq',
  
  apiKeys: {
    metaAccessToken: secrets.metaAccessToken,
    metaVerifyToken: secrets.metaVerifyToken,
    metaPhoneNumberId: client.meta_phone_number_id,
    openaiApiKey: finalOpenaiKey,
    groqApiKey: finalGroqKey,
  },
  prompts: {
    systemPrompt: client.system_prompt,
    formatterPrompt: client.formatter_prompt || undefined,
  },
  models: {
    openaiModel: client.openai_model || 'gpt-4o',
    groqModel: client.groq_model || 'llama-3.3-70b-versatile',
  },
  settings: {
    // ... campos existentes
  },
  notificationEmail: client.notification_email || undefined,
}
```

---

### FASE 3: OpenAI Chat Completion (2-3 horas)

#### 3.1 Criar função `generateChatCompletionOpenAI()`

**Arquivo**: `src/lib/openai.ts`

**Adicionar ao final do arquivo**:

```typescript
/**
 * 🔐 Gera resposta com OpenAI Chat Completion usando key dinâmica
 * 
 * Similar ao generateChatCompletion do Groq, mas usando OpenAI SDK
 * 
 * @param messages - Mensagens do chat
 * @param tools - Ferramentas disponíveis (function calling)
 * @param apiKey - API key opcional (do config do cliente)
 * @param settings - Configurações opcionais (temperature, max_tokens, model)
 * @returns Resposta da IA
 */
export const generateChatCompletionOpenAI = async (
  messages: ChatMessage[],
  tools?: any[],
  apiKey?: string,
  settings?: {
    temperature?: number
    max_tokens?: number
    model?: string // gpt-4o, gpt-4o-mini, etc
  }
): Promise<AIResponse> => {
  try {
    // 1. Criar cliente OpenAI (dinâmico ou cached)
    let client: OpenAI
    
    if (apiKey) {
      // Se apiKey fornecida, criar novo client (não cachear)
      client = new OpenAI({ apiKey })
    } else {
      // Fallback: usar client cacheado do env
      client = getOpenAIClient()
    }

    // 2. Converter mensagens para formato OpenAI
    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }))

    // 3. Montar parâmetros da completion
    const completionParams: any = {
      model: settings?.model || 'gpt-4o',
      messages: openaiMessages,
      temperature: settings?.temperature ?? 0.7,
      max_tokens: settings?.max_tokens ?? 2000,
    }

    // 4. Adicionar tools se fornecidas
    if (tools && tools.length > 0) {
      completionParams.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        }
      }))
      completionParams.tool_choice = 'auto'
    }

    // 5. Chamar API OpenAI
    const completion = await client.chat.completions.create(completionParams)

    const choice = completion.choices[0]
    if (!choice) {
      throw new Error('No completion choice returned from OpenAI')
    }

    // 6. Extrair content e tool calls
    const content = choice.message?.content || ''
    const toolCalls = choice.message?.tool_calls?.map((call: any) => ({
      id: call.id,
      type: call.type,
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      }
    }))
    
    const finished = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls'

    // 7. Retornar no formato AIResponse (igual ao Groq)
    return {
      content,
      toolCalls,
      finished,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate OpenAI chat completion: ${errorMessage}`)
  }
}
```

#### 3.2 Adicionar Import

**No topo de `src/lib/openai.ts`**, adicionar:

```typescript
import { AIResponse, ChatMessage } from './types'
```

---

### FASE 4: Atualizar `generateAIResponse` (1 hora)

#### 4.1 Modificar lógica de provider

**Arquivo**: `src/nodes/generateAIResponse.ts`

**Adicionar import**:

```typescript
import { generateChatCompletionOpenAI } from '@/lib/openai'
```

**Substituir o bloco final** (onde chama `generateChatCompletion`):

```typescript
    const tools = [HUMAN_HANDOFF_TOOL_DEFINITION]

    // 🔐 Escolher provider dinamicamente baseado na config do cliente
    console.log(`[generateAIResponse] Using provider: ${config.primaryProvider}`)
    
    if (config.primaryProvider === 'openai') {
      // Usar OpenAI Chat Completion
      return await generateChatCompletionOpenAI(
        messages,
        config.settings.enableTools ? tools : undefined,
        config.apiKeys.openaiApiKey,
        {
          temperature: config.settings.temperature,
          max_tokens: config.settings.maxTokens,
          model: config.models.openaiModel, // gpt-4o, gpt-4o-mini, etc
        }
      )
    } else {
      // Usar Groq Chat Completion (padrão)
      return await generateChatCompletion(
        messages,
        config.settings.enableTools ? tools : undefined,
        config.apiKeys.groqApiKey,
        {
          temperature: config.settings.temperature,
          max_tokens: config.settings.maxTokens,
          model: config.models.groqModel,
        }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate AI response: ${errorMessage}`)
  }
}
```

---

### FASE 5: API Backend (30 min)

#### 5.1 Atualizar GET `/api/client/config`

**Arquivo**: `src/app/api/client/config/route.ts`

**No bloco de retorno da função GET**, adicionar:

```typescript
return NextResponse.json({
  config: {
    system_prompt: client.system_prompt || '',
    formatter_prompt: client.formatter_prompt || '',
    openai_model: client.openai_model || 'gpt-4o',
    groq_model: client.groq_model || 'llama-3.3-70b-versatile',
    primary_model_provider: client.primary_model_provider || 'groq', // NOVO
    settings: client.settings || {
      enable_rag: false,
      max_tokens: 2000,
      temperature: 0.7,
      enable_tools: false,
      max_chat_history: 10,
      enable_human_handoff: false,
      message_split_enabled: false,
      batching_delay_seconds: 10,
    },
  },
})
```

#### 5.2 Atualizar PATCH `/api/client/config`

**No bloco de destructuring do body**, adicionar:

```typescript
const { 
  system_prompt, 
  formatter_prompt, 
  openai_model, 
  groq_model, 
  primary_model_provider, // NOVO
  settings 
} = body
```

**No bloco de update**, adicionar:

```typescript
if (primary_model_provider !== undefined) {
  updateData.primary_model_provider = primary_model_provider
}
```

---

### FASE 6: Frontend UI (2 horas)

#### 6.1 Atualizar State

**Arquivo**: `src/app/dashboard/settings/page.tsx`

**No state `agentConfig`**, adicionar:

```typescript
const [agentConfig, setAgentConfig] = useState({
  system_prompt: '',
  formatter_prompt: '',
  openai_model: 'gpt-4o',
  groq_model: 'llama-3.3-70b-versatile',
  primary_model_provider: 'groq', // NOVO
  settings: {
    // ... existente
  },
})
```

#### 6.2 Atualizar useEffect (fetch)

**No useEffect que faz fetch**, adicionar:

```typescript
setAgentConfig({
  system_prompt: data.config.system_prompt || '',
  formatter_prompt: data.config.formatter_prompt || '',
  openai_model: data.config.openai_model || 'gpt-4o',
  groq_model: data.config.groq_model || 'llama-3.3-70b-versatile',
  primary_model_provider: data.config.primary_model_provider || 'groq', // NOVO
  settings: data.config.settings || { /* defaults */ },
})
```

#### 6.3 Adicionar UI de Seleção

**Adicionar ANTES dos campos OpenAI Model e Groq Model**:

```tsx
{/* Primary Provider Selection */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <Label htmlFor="primary_model_provider" className="text-base font-semibold">
    🤖 Provedor Principal do Agente
  </Label>
  <p className="text-xs text-gray-600 mb-3">
    Escolha qual IA vai responder as mensagens de texto do seu chatbot
  </p>
  
  <Select
    value={agentConfig.primary_model_provider}
    onValueChange={(value) =>
      setAgentConfig({ ...agentConfig, primary_model_provider: value })
    }
    disabled={!editingAgent}
  >
    <SelectTrigger className="mt-2">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="groq">
        <div className="flex flex-col items-start">
          <span className="font-semibold">🚀 Groq (Llama) - Recomendado</span>
          <span className="text-xs text-gray-500">
            Rápido (~1000 tokens/s) • Econômico (~$0.60/1M tokens)
          </span>
        </div>
      </SelectItem>
      <SelectItem value="openai">
        <div className="flex flex-col items-start">
          <span className="font-semibold">🧠 OpenAI (GPT-4o)</span>
          <span className="text-xs text-gray-500">
            Mais inteligente • Mais lento • Mais caro (~$5/1M tokens)
          </span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
  
  {/* Alertas de custo */}
  {agentConfig.primary_model_provider === 'openai' && (
    <div className="mt-3 text-xs bg-yellow-50 border border-yellow-200 p-3 rounded">
      ⚠️ <strong>Custo estimado:</strong> GPT-4o é ~8x mais caro que Groq.
      Para 100k mensagens/mês, pode custar $500+ vs $60 com Groq.
    </div>
  )}
  
  {agentConfig.primary_model_provider === 'groq' && (
    <div className="mt-3 text-xs bg-green-50 border border-green-200 p-3 rounded">
      ✅ <strong>Econômico:</strong> Llama 3.3 70B oferece ótima qualidade
      com custo muito baixo (~$0.60/1M tokens).
    </div>
  )}
</div>

{/* Divisor */}
<div className="border-t my-4"></div>

<h3 className="font-semibold text-sm mb-2">
  Modelos Específicos
</h3>
<p className="text-xs text-gray-500 mb-4">
  Configure qual versão do modelo será usado para cada provedor
</p>
```

#### 6.4 Atualizar Labels dos Modelos

**Modificar labels para deixar claro quando cada um é usado**:

```tsx
{/* OpenAI Model */}
<div>
  <Label htmlFor="openai_model">
    Modelo OpenAI
    {agentConfig.primary_model_provider === 'openai' && (
      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
        EM USO
      </span>
    )}
  </Label>
  <Select
    value={agentConfig.openai_model}
    onValueChange={(value) =>
      setAgentConfig({ ...agentConfig, openai_model: value })
    }
    disabled={!editingAgent}
  >
    <SelectTrigger className="mt-2">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido)</SelectItem>
      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-gray-500 mt-1">
    {agentConfig.primary_model_provider === 'openai' 
      ? '💬 Conversação + 🎤 Mídia (transcrição, imagens, PDFs)'
      : '🎤 Apenas para: Transcrição de áudio, análise de imagens e documentos'
    }
  </p>
</div>

{/* Groq Model */}
<div>
  <Label htmlFor="groq_model">
    Modelo Groq
    {agentConfig.primary_model_provider === 'groq' && (
      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
        EM USO
      </span>
    )}
  </Label>
  <Select
    value={agentConfig.groq_model}
    onValueChange={(value) =>
      setAgentConfig({ ...agentConfig, groq_model: value })
    }
    disabled={!editingAgent}
  >
    <SelectTrigger className="mt-2">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Recomendado)</SelectItem>
      <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
      <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Mais rápido)</SelectItem>
      <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-gray-500 mt-1">
    {agentConfig.primary_model_provider === 'groq'
      ? '💬 Usado para: Respostas de texto do agente (conversação principal)'
      : '(Não está sendo usado no momento)'
    }
  </p>
</div>
```

---

### FASE 7: Testes (1 hora)

#### 7.1 Teste Manual - Groq (Baseline)

```
1. Login em https://chat.luisfboff.com/dashboard/settings
2. Verificar que "Groq" está selecionado como provider
3. Enviar mensagem via WhatsApp
4. Verificar logs: "[generateAIResponse] Using provider: groq"
5. Verificar resposta rápida (~1-2s)
```

#### 7.2 Teste Manual - OpenAI

```
1. Ir em Settings → Configurações do Agent
2. Clicar em "Editar" → Digitar senha
3. Mudar "Provedor Principal" para "OpenAI (GPT-4o)"
4. Salvar
5. Enviar mensagem via WhatsApp
6. Verificar logs: "[generateAIResponse] Using provider: openai"
7. Verificar resposta (pode ser mais lenta ~3-5s)
8. Verificar qualidade da resposta
```

#### 7.3 Teste - Function Calling

```
1. Com OpenAI selecionado:
   - Enviar: "preciso falar com um humano"
   - Verificar se transfere para atendente
   - Verificar logs de tool calls

2. Com Groq selecionado:
   - Enviar: "preciso falar com um humano"
   - Verificar se transfere para atendente
   - Verificar logs de tool calls
```

#### 7.4 Teste - Mídia (deve usar OpenAI sempre)

```
1. Com Groq selecionado como principal:
   - Enviar áudio → Verificar transcrição funciona
   - Enviar imagem → Verificar análise funciona
   - Enviar PDF → Verificar análise funciona
   
2. Verificar logs:
   - Transcrição usa OpenAI
   - Análise de imagem usa OpenAI  
   - Conversação usa Groq
```

#### 7.5 Teste - Custo

```
1. Monitorar custos no OpenAI Dashboard
2. Comparar:
   - 100 mensagens com Groq
   - 100 mensagens com OpenAI
3. Validar diferença de ~8x no custo
```

---

## 📊 Comparação de Providers

### Performance

| Métrica | Groq (Llama 3.3 70B) | OpenAI (GPT-4o) |
|---------|----------------------|-----------------|
| **Velocidade** | ~1000 tokens/s | ~50-100 tokens/s |
| **Latência** | 1-2s | 3-5s |
| **Disponibilidade** | 99.9% | 99.95% |

### Custo (por 1M tokens)

| Modelo | Input | Output | Média |
|--------|-------|--------|-------|
| **Llama 3.3 70B** | $0.60 | $0.60 | $0.60 |
| **GPT-4o** | $2.50 | $10.00 | ~$5.00 |
| **GPT-4o Mini** | $0.15 | $0.60 | ~$0.30 |

### Qualidade

| Tarefa | Groq (Llama) | OpenAI (GPT-4o) |
|--------|--------------|-----------------|
| Conversação casual | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Raciocínio complexo | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Criatividade | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Seguir instruções | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Function calling | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ⚠️ Considerações Importantes

### Custo

- **OpenAI é 8-16x mais caro** que Groq
- Para 100k mensagens/mês: Groq ~$60, OpenAI ~$500
- Recomendar Groq como padrão, OpenAI como premium

### Performance

- **Groq é 10-20x mais rápido** que OpenAI
- Usuários esperam respostas rápidas no WhatsApp
- OpenAI pode causar timeouts em conversas longas

### Qualidade

- **GPT-4o é superior** em raciocínio complexo
- **Llama 3.3 70B é excelente** para conversação casual
- Para chatbot de atendimento, diferença é marginal

### Recomendação de Uso

**Use Groq (padrão) quando**:
- ✅ Conversação casual/atendimento
- ✅ Volume alto de mensagens
- ✅ Budget limitado
- ✅ Velocidade é prioridade

**Use OpenAI quando**:
- ✅ Raciocínio complexo necessário
- ✅ Tarefas muito específicas
- ✅ Budget flexível
- ✅ Qualidade máxima é prioridade

---

## 🔄 Rollback Plan

Se houver problemas após deploy:

### Opção 1: Reverter no DB

```sql
-- Forçar todos os clientes de volta para Groq
UPDATE clients 
SET primary_model_provider = 'groq';
```

### Opção 2: Remover Feature Flag

```typescript
// Em generateAIResponse.ts, forçar Groq:
const effectiveProvider = 'groq' // Ignora config.primaryProvider
```

### Opção 3: Rollback Git

```bash
git revert HEAD
git push
# Vercel auto-deploy
```

---

## 📝 Checklist de Implementação

### Preparação
- [ ] Ler este documento completamente
- [ ] Fazer backup do banco de dados
- [ ] Testar em ambiente de dev primeiro

### FASE 1: Database
- [ ] Criar `migrations/011_add_primary_provider.sql`
- [ ] Executar migration no Supabase
- [ ] Verificar coluna criada: `SELECT * FROM clients LIMIT 1;`

### FASE 2: Types
- [ ] Adicionar `primaryProvider` ao `ClientConfig`
- [ ] Atualizar `getClientConfig()` para carregar campo
- [ ] Verificar TypeScript compila sem erros

### FASE 3: OpenAI Lib
- [ ] Criar `generateChatCompletionOpenAI()` em `openai.ts`
- [ ] Adicionar imports necessários
- [ ] Testar função isoladamente (opcional)

### FASE 4: Generate AI Response
- [ ] Importar `generateChatCompletionOpenAI`
- [ ] Adicionar if/else para provider
- [ ] Adicionar log do provider usado
- [ ] Verificar TypeScript compila

### FASE 5: API
- [ ] Adicionar `primary_model_provider` ao GET
- [ ] Adicionar `primary_model_provider` ao PATCH
- [ ] Testar API com Postman/curl

### FASE 6: Frontend
- [ ] Atualizar state `agentConfig`
- [ ] Atualizar useEffect de fetch
- [ ] Adicionar UI de seleção de provider
- [ ] Atualizar labels dos modelos
- [ ] Testar UI no navegador

### FASE 7: Testes
- [ ] Teste baseline com Groq
- [ ] Teste com OpenAI
- [ ] Teste function calling (ambos)
- [ ] Teste processamento de mídia
- [ ] Monitorar custos

### Deploy
- [ ] Commit changes: `git add . && git commit -m "feat: dynamic provider selection"`
- [ ] Push: `git push`
- [ ] Aguardar Vercel deploy
- [ ] Testar em produção
- [ ] Monitorar logs por 24h

---

## 📚 Recursos Adicionais

### Documentação Oficial

- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat-completions)
- [Groq Chat Completions API](https://console.groq.com/docs/text-chat)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Groq Pricing](https://groq.com/pricing/)

### Monitoramento

- OpenAI Dashboard: https://platform.openai.com/usage
- Groq Console: https://console.groq.com/usage
- Vercel Logs: https://vercel.com/luisfboff1/chatbot-v2/logs

---

**Autor**: Claude + Luis Fernando Boff  
**Data**: 2025-10-29  
**Versão**: 1.0  
**Estimativa**: 6-8 horas de implementação
