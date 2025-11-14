import { AIResponse, ChatMessage, ClientConfig } from '@/lib/types'
import { generateChatCompletion } from '@/lib/groq'
import { generateChatCompletionOpenAI } from '@/lib/openai'

// 📝 PROMPT PADRÃO (usado apenas como fallback se config não tiver systemPrompt)
const DEFAULT_SYSTEM_PROMPT = `## Papel
Você é o **assistente principal de IA do engenheiro Luis Fernando Boff**, profissional especializado em **engenharia elétrica, energia solar, ciência de dados e desenvolvimento full stack**.
Você atua como uma **secretária inteligente e consultora técnica**, capaz de **ouvir, entender o contexto e direcionar o cliente** para a solução mais adequada — seja um projeto, consultoria, parceria ou serviço técnico.

Seu tom é **acolhedor, profissional e seguro**, transmitindo a credibilidade do Luis e mostrando que ele é um especialista completo, mas com foco em **entender primeiro o cliente** antes de apresentar qualquer serviço.

---

## Instruções de Atendimento

### 1. Cumprimente e peça o nome
> "Olá, tudo bem? Seja bem-vindo! Qual é o seu nome?"

### 2. Descubra o motivo do contato
> "Prazer em te conhecer, [nome]! Me conta um pouco — o que te trouxe até aqui hoje? Você está buscando ajuda com algum projeto, consultoria ou ideia específica?"

---

### 3. Entenda o contexto com empatia
- Faça **perguntas abertas**, sem sugerir serviços ainda.
- Mostre interesse genuíno e tente **entender a dor ou objetivo** do cliente.

> "Entendi. Você poderia me explicar um pouco melhor o que gostaria de resolver ou criar?"
> "É algo mais voltado à parte técnica, estratégica ou de implementação?"

Se o contexto **ainda não estiver claro**, faça perguntas direcionadas para identificar a **área ideal (Energia Solar, Ciência de Dados ou Desenvolvimento)** para prosseguir o atendimento corretamente.

---

### 4. Após identificar a área
Confirme de forma natural, sem listar opções:
> "Perfeito, isso se encaixa exatamente na linha de projetos que o Luis desenvolve nessa área. Ele costuma trabalhar desde o diagnóstico até a implementação completa."

Então, apresente o tipo de serviço correspondente:
- **Energia Solar:** projetos de geração fotovoltaica, dimensionamento, instalação, manutenção e consultoria.
- **Ciência de Dados:** automações, análises, dashboards, machine learning e soluções com IA.
- **Desenvolvimento:** sistemas web, integrações, SaaS, APIs e automações personalizadas.

---

### 5. Esclareça dúvidas com segurança
- **Prazo:** "O tempo depende da complexidade, mas o diagnóstico inicial é rápido."
- **Custo:** "Os valores são definidos após entender o escopo. O Luis envia uma proposta personalizada."
- **Atendimento:** "Pode ser online ou presencial, dependendo da localidade."
- **Equipe:** "Os projetos integram engenharia elétrica, dados e desenvolvimento, garantindo soluções completas e sob medida."

---

### 6. Finalize com um próximo passo claro
> "Quer que eu agende uma conversa inicial gratuita com o Luis pra entender melhor o seu caso?"
>
> "Posso te enviar o link direto para solicitar um orçamento pelo site?"

Encaminhe o cliente com naturalidade, sem pressão.

---

## Regras Gerais
- Linguagem **consultiva, empática e técnica na medida certa**.
- **Sem emojis.**
- Priorize **entender antes de oferecer**.
- Evite listar áreas ou serviços até compreender a necessidade.
- Faça perguntas direcionadas sempre que houver dúvida sobre a área correta.
- Encaminhe para o **atendimento humano** se o cliente quiser detalhes técnicos, proposta formal ou reunião direta com o Luis.

---

## Objetivo Final
Transformar cada interação em uma **conversa de confiança**.
O cliente deve sentir que falou com **um especialista de verdade**, representado por um assistente inteligente, capaz de unir **engenharia, tecnologia e inteligência de dados** para encontrar a melhor solução para o seu caso.`

// SUBAGENTE DESATIVADO - Não está implementado
// const SUB_AGENT_TOOL_DEFINITION = {
//   type: 'function',
//   function: {
//     name: 'subagente_diagnostico',
//     description: 'Utilize esse agente para buscar a area que mais se adequa a necessidade do cliente',
//     parameters: {
//       type: 'object',
//       properties: {
//         mensagem_usuario: {
//           type: 'string',
//           description: 'Mensagem do usuário para diagnóstico',
//         },
//       },
//       required: ['mensagem_usuario'],
//     },
//   },
// }

const HUMAN_HANDOFF_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'transferir_atendimento',
    description: 'SOMENTE utilize essa tool quando o usuário EXPLICITAMENTE solicitar falar com um humano, atendente ou pessoa. Exemplos: "quero falar com alguém", "preciso de um atendente", "pode me transferir para um humano". NÃO use esta tool para perguntas normais que você pode responder.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Motivo da transferência solicitada pelo usuário',
        },
      },
      required: ['motivo'],
    },
  },
}

export interface GenerateAIResponseInput {
  message: string
  chatHistory: ChatMessage[]
  ragContext: string
  customerName: string
  config: ClientConfig // 🔐 Config dinâmica do cliente
  greetingInstruction?: string // 🔧 Phase 1: Continuity greeting instruction
}

/**
 * 🔐 Gera resposta da IA usando config dinâmica do cliente
 *
 * Usa systemPrompt e groqApiKey do config do cliente do Vault
 * 
 * 🔧 Phase 1: Injects continuity greeting instruction if provided
 */
export const generateAIResponse = async (input: GenerateAIResponseInput): Promise<AIResponse> => {
  try {
    const { message, chatHistory, ragContext, customerName, config, greetingInstruction } = input

    // Usar systemPrompt do config do cliente (ou fallback)
    const systemPrompt = config.prompts.systemPrompt || DEFAULT_SYSTEM_PROMPT

    // Data e hora atual (para contexto da IA)
    const now = new Date()
    const dateTimeInfo = `Data e hora atual: ${now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })} (horário de Brasília)`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt, // 🔐 Usa prompt do config do cliente
      },
      {
        role: 'system',
        content: dateTimeInfo,
      },
    ]

    // 🔧 Phase 1: Add continuity greeting instruction if provided
    if (greetingInstruction && greetingInstruction.trim().length > 0) {
      messages.push({
        role: 'system',
        content: `IMPORTANTE - Contexto da conversa: ${greetingInstruction}`,
      })
      console.log('[generateAIResponse] 👋 Added continuity greeting instruction')
    }

    if (ragContext && ragContext.trim().length > 0) {
      messages.push({
        role: 'user',
        content: `Contexto relevante da base de conhecimento:\n\n${ragContext}`,
      })
    }

    // Valida e adiciona chatHistory - VALIDAÇÃO EXTRA
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const validHistory = chatHistory.filter((msg) => {
        const isValid = msg && 
          typeof msg === 'object' &&
          (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0
        
        if (!isValid) {
          console.warn('[generateAIResponse] Invalid message in chatHistory:', msg)
        }
        
        return isValid
      })
      
      messages.push(...validHistory)
    }

    // Adiciona mensagem atual - VALIDAÇÃO
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message must be a non-empty string')
    }

    messages.push({
      role: 'user',
      content: `${customerName}: ${message}`,
    })

    // Log para debug
    console.log('[generateAIResponse] Final messages array:', {
      totalMessages: messages.length,
      messageRoles: messages.map((m, i) => `${i}: ${m.role}`),
      allContentsAreStrings: messages.every((m) => typeof m.content === 'string'),
    })

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
