# 🚀 LangChain Integration Plan - Classificação de Leads CRM

## 🎯 Objetivo

Integrar **LangChain** para classificação inteligente de leads no CRM, substituindo chamadas diretas à API por **chains estruturadas** com prompts otimizados, validação de saída e retry automático.

---

## 📊 Por Que LangChain?

### Vantagens sobre Chamada Direta

| Aspecto | Chamada Direta (`callDirectAI`) | LangChain |
|---------|----------------------------------|-----------|
| **Estrutura** | Prompt manual, parsing manual | Chains estruturadas, output parsers |
| **Validação** | Manual (try/catch) | Automática (Pydantic models) |
| **Retry** | Manual | Automático com backoff |
| **Templates** | String concatenation | Prompt templates reutilizáveis |
| **Extensibilidade** | Difícil adicionar steps | Fácil adicionar nodes na chain |
| **Debugging** | Logs manuais | LangSmith integration |
| **Custo** | Mesmo | Mesmo (usa mesmo provider) |

### Casos de Uso Ideais para LangChain

1. **Classificação Estruturada** (temperatura, intenção, sinais)
2. **Multi-step Reasoning** (análise → classificação → ação)
3. **Extração de Dados** (entidades, sentimentos, keywords)
4. **RAG (Retrieval Augmented Generation)** (buscar contexto antes de classificar)

---

## 🏗️ Arquitetura Proposta

### Fluxo Atual (Sem LangChain)

```
ChatbotFlow
  ↓
classifyLeadWithAI()
  ↓
callDirectAI() → OpenAI API
  ↓
JSON.parse() → Resultado
```

### Fluxo Novo (Com LangChain)

```
ChatbotFlow
  ↓
classifyLeadWithAI()
  ↓
LangChain Chain
  ├─→ Prompt Template (estruturado)
  ├─→ Output Parser (Pydantic model)
  ├─→ Retry Logic (automático)
  └─→ LLM (OpenAI/Groq)
  ↓
Resultado Validado (TypeScript types)
```

---

## 📦 FASE 1: Instalação e Setup (Semana 1)

### 1.1 Instalar Dependências

```bash
# LangChain Core
npm install langchain @langchain/core

# LangChain OpenAI (provider)
npm install @langchain/openai

# LangChain Groq (provider alternativo)
npm install @langchain/groq

# Output Parsers (validação)
npm install zod  # Já deve estar instalado

# Types
npm install --save-dev @types/node
```

### 1.2 Estrutura de Pastas

```
src/
├── lib/
│   ├── langchain/
│   │   ├── index.ts              # Setup e configuração
│   │   ├── chains/
│   │   │   ├── lead-classification.ts  # Chain principal
│   │   │   └── lead-source-detection.ts # Chain secundária
│   │   ├── prompts/
│   │   │   ├── classification.ts      # Templates
│   │   │   └── source-detection.ts
│   │   ├── parsers/
│   │   │   └── classification-output.ts # Output parsers
│   │   └── utils/
│   │       └── retry-config.ts         # Configuração de retry
│   └── direct-ai-client.ts      # Manter (outros usos)
```

---

## 🔧 FASE 2: Implementação Core (Semana 1-2)

### 2.1 Setup Base do LangChain

**Arquivo:** `src/lib/langchain/index.ts`

```typescript
/**
 * LangChain Setup - Configuração base para chains
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { getClientVaultCredentials } from "@/lib/vault";
import { checkBudgetAvailable } from "@/lib/unified-tracking";

export interface LangChainConfig {
  clientId: string;
  provider?: "openai" | "groq";
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Cria instância do LLM baseado na configuração do cliente
 */
export const createLLMForClient = async (
  config: LangChainConfig
): Promise<ChatOpenAI | ChatGroq> => {
  // 1. Verificar budget
  const budgetAvailable = await checkBudgetAvailable(config.clientId);
  if (!budgetAvailable) {
    throw new Error("❌ Limite de budget atingido");
  }

  // 2. Buscar credenciais do Vault
  const credentials = await getClientVaultCredentials(config.clientId);

  // 3. Selecionar provider
  const provider = config.provider || "openai";
  const apiKey = provider === "groq" 
    ? credentials.groqApiKey 
    : credentials.openaiApiKey;

  if (!apiKey) {
    throw new Error(
      `❌ No ${provider.toUpperCase()} API key configured for client ${config.clientId}`
    );
  }

  // 4. Selecionar modelo
  const model = config.model || (
    provider === "groq" 
      ? "llama-3.3-70b-versatile" 
      : "gpt-4o-mini"
  );

  // 5. Criar instância do LLM
  if (provider === "groq") {
    return new ChatGroq({
      apiKey,
      model,
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 500,
    });
  } else {
    return new ChatOpenAI({
      apiKey,
      model,
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 500,
    });
  }
};

/**
 * Wrapper para tracking de uso (compatível com sistema atual)
 */
export const trackLangChainUsage = async (
  clientId: string,
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    provider: string;
  }
) => {
  // Usar mesmo sistema de tracking existente
  await logDirectAIUsage({
    clientId,
    conversationId: undefined,
    phone: undefined,
    provider: usage.provider,
    model: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    cost: 0, // Calcular baseado no provider
    latency: 0,
  });
};
```

### 2.2 Output Parser (Validação de Saída)

**Arquivo:** `src/lib/langchain/parsers/classification-output.ts`

```typescript
/**
 * Output Parser para classificação de leads
 * Garante que a resposta da IA está no formato correto
 */

import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

// Schema de validação (TypeScript + Zod)
export const LeadClassificationSchema = z.object({
  temperature: z.enum(["quente", "morno", "frio"]).describe(
    "Temperatura do lead: quente (pronto para comprar), morno (interessado mas não urgente), frio (pouco interesse)"
  ),
  intent: z.string().describe(
    "Intenção principal do lead: o que ele quer?"
  ),
  buyingSignals: z.array(z.string()).describe(
    "Lista de sinais de compra detectados na conversa"
  ),
  confidence: z.number().min(0).max(100).describe(
    "Confiança da classificação (0-100%)"
  ),
  reasoning: z.string().describe(
    "Explicação breve do motivo da classificação"
  ),
});

export type LeadClassification = z.infer<typeof LeadClassificationSchema>;

/**
 * Parser estruturado para garantir formato correto
 */
export const classificationOutputParser = StructuredOutputParser.fromZodSchema(
  LeadClassificationSchema
);

/**
 * Formato de instruções para o LLM
 */
export const getClassificationFormatInstructions = () => {
  return classificationOutputParser.getFormatInstructions();
};
```

### 2.3 Prompt Template

**Arquivo:** `src/lib/langchain/prompts/classification.ts`

```typescript
/**
 * Prompt Template para classificação de leads
 * Estruturado e reutilizável
 */

import { PromptTemplate } from "@langchain/core/prompts";
import { getClassificationFormatInstructions } from "../parsers/classification-output";

/**
 * Template principal de classificação
 */
export const classificationPromptTemplate = PromptTemplate.fromTemplate(`
Você é um especialista em qualificação de leads para vendas B2B e B2C.

Analise esta conversa de WhatsApp e classifique o lead de forma precisa e objetiva.

HISTÓRICO DA CONVERSA:
{conversationHistory}

{heuristicResult}

INSTRUÇÕES:
1. Analise o histórico completo da conversa
2. Identifique sinais de interesse, urgência e intenção de compra
3. Classifique a temperatura do lead:
   - QUENTE: Pronto para comprar, demonstrou interesse claro, mencionou preço/orçamento
   - MORNO: Interessado mas sem urgência, fez perguntas sobre produto/serviço
   - FRIO: Pouco interesse, apenas cumprimentos, sem follow-up
4. Liste os sinais de compra detectados (palavras-chave, frases, comportamentos)
5. Calcule sua confiança (0-100%) baseado na clareza dos sinais
6. Explique brevemente o motivo da classificação

{formatInstructions}

Responda APENAS no formato JSON especificado acima.
`);

/**
 * Helper para formatar histórico de conversa
 */
export const formatConversationHistory = (
  messages: Array<{ role: string; content: string }>
): string => {
  return messages
    .map((msg, idx) => {
      const role = msg.role === "user" ? "Cliente" : "Bot";
      return `${idx + 1}. ${role}: ${msg.content}`;
    })
    .join("\n");
};

/**
 * Helper para formatar resultado heurístico (se existir)
 */
export const formatHeuristicResult = (
  heuristic?: { temperature: string; confidence: number }
): string => {
  if (!heuristic) {
    return "";
  }

  return `
ANÁLISE PRÉVIA (Regras Heurísticas):
- Temperatura: ${heuristic.temperature}
- Confiança: ${heuristic.confidence}%

Use esta análise como referência, mas faça sua própria avaliação baseada no contexto completo da conversa.
`;
};
```

### 2.4 Chain Principal

**Arquivo:** `src/lib/langchain/chains/lead-classification.ts`

```typescript
/**
 * LangChain Chain para classificação de leads
 * Substitui classifyLeadWithAI() do plano original
 */

import { RunnableSequence } from "@langchain/core/runnables";
import { createLLMForClient, trackLangChainUsage } from "../index";
import { classificationPromptTemplate, formatConversationHistory, formatHeuristicResult } from "../prompts/classification";
import { classificationOutputParser, type LeadClassification } from "../parsers/classification-output";
import type { LangChainConfig } from "../index";

export interface ClassifyLeadInput {
  clientId: string;
  phone: string;
  conversationHistory: Array<{ role: string; content: string }>;
  heuristicResult?: { temperature: string; confidence: number };
  config?: Partial<LangChainConfig>;
}

export interface ClassifyLeadOutput extends LeadClassification {
  method: "langchain";
  provider: string;
  model: string;
  tokensUsed: number;
}

/**
 * Classifica lead usando LangChain
 */
export const classifyLeadWithLangChain = async (
  input: ClassifyLeadInput
): Promise<ClassifyLeadOutput> => {
  const startTime = Date.now();

  try {
    // 1. Criar LLM
    const llm = await createLLMForClient({
      clientId: input.clientId,
      provider: input.config?.provider,
      model: input.config?.model || "gpt-4o-mini",
      temperature: input.config?.temperature ?? 0.3,
      maxTokens: input.config?.maxTokens ?? 500,
    });

    // 2. Formatar inputs
    const conversationHistory = formatConversationHistory(input.conversationHistory);
    const heuristicResult = formatHeuristicResult(input.heuristicResult);
    const formatInstructions = classificationOutputParser.getFormatInstructions();

    // 3. Criar chain
    const chain = RunnableSequence.from([
      classificationPromptTemplate,
      llm,
      classificationOutputParser,
    ]);

    // 4. Executar chain
    const result = await chain.invoke({
      conversationHistory,
      heuristicResult,
      formatInstructions,
    }) as LeadClassification;

    // 5. Extrair usage (se disponível)
    // Nota: LangChain não expõe usage diretamente, precisamos estimar ou usar callback
    const estimatedTokens = estimateTokens(conversationHistory, result);
    
    // 6. Track usage (async, não bloqueia)
    trackLangChainUsage(input.clientId, {
      promptTokens: estimatedTokens.prompt,
      completionTokens: estimatedTokens.completion,
      totalTokens: estimatedTokens.total,
      model: input.config?.model || "gpt-4o-mini",
      provider: input.config?.provider || "openai",
    }).catch(console.error);

    // 7. Retornar resultado
    return {
      ...result,
      method: "langchain",
      provider: input.config?.provider || "openai",
      model: input.config?.model || "gpt-4o-mini",
      tokensUsed: estimatedTokens.total,
    };

  } catch (error) {
    console.error("[LangChain] Classification error:", error);
    throw new Error(
      `Failed to classify lead with LangChain: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

/**
 * Estima tokens (aproximado)
 * Em produção, usar biblioteca como tiktoken
 */
function estimateTokens(text: string, result: LeadClassification): {
  prompt: number;
  completion: number;
  total: number;
} {
  // Aproximação: 1 token ≈ 4 caracteres
  const promptTokens = Math.ceil(text.length / 4);
  const completionTokens = Math.ceil(JSON.stringify(result).length / 4);
  
  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}
```

---

## 🔄 FASE 3: Integração com Sistema Existente (Semana 2)

### 3.1 Modificar Node de Classificação

**Arquivo:** `src/nodes/classifyLeadWithAI.ts` (MODIFICAR)

```typescript
/**
 * Classificação de Lead com IA
 * Agora usando LangChain ao invés de chamada direta
 */

import { classifyLeadWithLangChain } from "@/lib/langchain/chains/lead-classification";
import { getConversationHistory } from "@/lib/conversations";

export const classifyLeadWithAI = async (
  input: {
    clientId: string;
    phone: string;
    conversationHistory?: Array<{role: string, content: string}>;
    heuristicResult?: { temperature: string; confidence: number };
    isManual?: boolean;
    userId?: string;
  }
): Promise<{
  temperature: 'quente' | 'morno' | 'frio';
  intent: string;
  buyingSignals: string[];
  confidence: number;
  reasoning: string;
  method: string;
}> => {
  // 1. Buscar histórico se não fornecido
  let conversationHistory = input.conversationHistory;
  if (!conversationHistory) {
    conversationHistory = await getConversationHistory(input.clientId, input.phone);
  }

  // 2. Classificar com LangChain
  const result = await classifyLeadWithLangChain({
    clientId: input.clientId,
    phone: input.phone,
    conversationHistory,
    heuristicResult: input.heuristicResult,
    config: {
      // Usar modelo mais barato para classificação
      model: "gpt-4o-mini",
      temperature: 0.3, // Baixa temperatura = mais determinístico
      maxTokens: 500,
    },
  });

  // 3. Log de classificação (se necessário)
  if (input.isManual) {
    await logAIClassification(input.clientId, input.phone, {
      ...result,
      triggered_by: input.userId,
    });
  }

  // 4. Retornar resultado (compatível com formato antigo)
  return {
    temperature: result.temperature,
    intent: result.intent,
    buyingSignals: result.buyingSignals,
    confidence: result.confidence,
    reasoning: result.reasoning,
    method: result.method,
  };
};
```

### 3.2 Manter Compatibilidade

**Opção A: Feature Flag (Recomendado)**

```typescript
// src/lib/langchain/config.ts
export const USE_LANGCHAIN = process.env.USE_LANGCHAIN_CLASSIFICATION === "true";

// src/nodes/classifyLeadWithAI.ts
export const classifyLeadWithAI = async (input) => {
  if (USE_LANGCHAIN) {
    return await classifyLeadWithLangChain(input);
  } else {
    // Fallback para método antigo
    return await classifyLeadWithDirectAI(input);
  }
};
```

**Opção B: Migração Gradual**

- Semana 1-2: LangChain em paralelo (A/B test)
- Semana 3: 50% tráfego para LangChain
- Semana 4: 100% LangChain

---

## 🎨 FASE 4: Melhorias Avançadas (Semana 3-4)

### 4.1 Retry Automático com Backoff

**Arquivo:** `src/lib/langchain/utils/retry-config.ts`

```typescript
import { RunnableRetry } from "@langchain/core/runnables";

/**
 * Configuração de retry para chains
 */
export const createRetryChain = <T extends RunnableSequence>(
  chain: T,
  options?: {
    maxAttempts?: number;
    initialDelay?: number;
  }
) => {
  return RunnableRetry.from(chain, {
    maxAttempts: options?.maxAttempts ?? 3,
    initialDelay: options?.initialDelay ?? 1000,
    backoff: "exponential",
  });
};
```

### 4.2 Chain com Múltiplos Steps

**Exemplo:** Análise → Classificação → Sugestão de Ação

```typescript
// src/lib/langchain/chains/multi-step-classification.ts

const analysisChain = RunnableSequence.from([
  analysisPrompt,
  llm,
  analysisParser,
]);

const classificationChain = RunnableSequence.from([
  classificationPrompt,
  llm,
  classificationParser,
]);

const actionChain = RunnableSequence.from([
  actionPrompt,
  llm,
  actionParser,
]);

// Chain completa
const fullChain = RunnableSequence.from([
  analysisChain,
  classificationChain,
  actionChain,
]);
```

### 4.3 RAG (Retrieval Augmented Generation)

**Buscar contexto antes de classificar:**

```typescript
// src/lib/langchain/chains/rag-classification.ts

import { VectorStoreRetriever } from "@langchain/core/vectorstores";

const ragChain = RunnableSequence.from([
  // 1. Buscar contexto relevante
  async (input) => {
    const retriever = await getVectorStoreRetriever(input.clientId);
    const docs = await retriever.getRelevantDocuments(input.conversationHistory);
    return { ...input, context: docs.map(d => d.pageContent).join("\n") };
  },
  // 2. Classificar com contexto
  classificationPrompt,
  llm,
  classificationOutputParser,
]);
```

---

## 📊 FASE 5: Monitoramento e Debugging (Semana 4)

### 5.1 LangSmith Integration (Opcional)

```typescript
// src/lib/langchain/index.ts

import { Client } from "langsmith";

// Configurar LangSmith (se API key disponível)
if (process.env.LANGSMITH_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com";
  process.env.LANGCHAIN_API_KEY = process.env.LANGSMITH_API_KEY;
  process.env.LANGCHAIN_PROJECT = "crm-lead-classification";
}
```

### 5.2 Logging Estruturado

```typescript
// src/lib/langchain/utils/logging.ts

export const logChainExecution = async (
  chainName: string,
  input: any,
  output: any,
  metadata: {
    clientId: string;
    latency: number;
    tokens: number;
  }
) => {
  await supabase.from("langchain_executions").insert({
    chain_name: chainName,
    input: input,
    output: output,
    metadata: metadata,
    created_at: new Date().toISOString(),
  });
};
```

---

## ✅ Checklist de Implementação

### Semana 1
- [ ] Instalar dependências LangChain
- [ ] Criar estrutura de pastas
- [ ] Implementar `createLLMForClient()`
- [ ] Criar output parser (Zod schema)
- [ ] Criar prompt template

### Semana 2
- [ ] Implementar chain principal
- [ ] Integrar com `classifyLeadWithAI()`
- [ ] Adicionar feature flag
- [ ] Testar com dados reais
- [ ] Comparar resultados (LangChain vs Direto)

### Semana 3
- [ ] Adicionar retry automático
- [ ] Implementar multi-step chain (opcional)
- [ ] Adicionar RAG (opcional)
- [ ] Otimizar prompts baseado em resultados

### Semana 4
- [ ] Configurar LangSmith (opcional)
- [ ] Adicionar logging estruturado
- [ ] Documentar uso
- [ ] Migrar 100% para LangChain

---

## 💰 Custo Estimado

| Item | Custo |
|------|-------|
| **Desenvolvimento** | 40-60 horas (R$ 4.000-6.000) |
| **Dependências** | R$ 0 (npm packages gratuitos) |
| **Operacional** | Mesmo custo (usa mesmo provider) |
| **LangSmith** | R$ 0-50/mês (opcional, free tier disponível) |

**Total:** R$ 4.000-6.000 (desenvolvimento único)

---

## 🎓 Conclusão

**LangChain oferece:**
- ✅ Estrutura melhor (chains, parsers)
- ✅ Validação automática (Zod)
- ✅ Retry automático
- ✅ Extensibilidade (fácil adicionar steps)
- ✅ Debugging melhor (LangSmith)

**Sem mudar:**
- ✅ Custo (mesmo provider)
- ✅ Performance (mesma latência)
- ✅ Budget tracking (compatível)

**Recomendação:** Implementar em FASE 1-2 do plano de automação CRM, substituindo `classifyLeadWithAI()` por versão LangChain.

---

**Última atualização:** 2026-02-20
**Referência:** `checkpoints/2026-02-19_chatbot-oficial/CRM_AUTOMATION_PLAN.md`

