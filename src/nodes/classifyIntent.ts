import { getBotConfig, getBotConfigs } from '@/lib/config'
import { generateChatCompletion } from '@/lib/groq'
import { ChatMessage } from '@/lib/types'

export interface ClassifyIntentInput {
  message: string
  clientId: string
  groqApiKey: string
}

export interface ClassifyIntentOutput {
  intent: string
  confidence: 'high' | 'medium' | 'low'
  usedLLM: boolean
}

/**
 * 🔧 Phase 2: Intent Classification
 * 
 * Classifies user message intent using either:
 * - LLM-based classification (Groq) if 'intent_classifier:use_llm' is true
 * - Regex-based classification if false
 * 
 * Uses configurable prompt from 'intent_classifier:prompt' and
 * supported intents from 'intent_classifier:intents'
 */
export const classifyIntent = async (input: ClassifyIntentInput): Promise<ClassifyIntentOutput> => {
  const startTime = Date.now()

  try {
    const { message, clientId, groqApiKey } = input


    // 1. Fetch configurations
    const configs = await getBotConfigs(clientId, [
      'intent_classifier:use_llm',
      'intent_classifier:prompt',
      'intent_classifier:intents',
    ])

    const useLLM = configs.get('intent_classifier:use_llm') !== false // Default true
    const promptConfig = configs.get('intent_classifier:prompt')
    const intentsConfig = configs.get('intent_classifier:intents')


    // 2. If LLM is disabled, use regex-based classification
    if (!useLLM) {
      const intent = classifyWithRegex(message, intentsConfig)
      const duration = Date.now() - startTime
      
      return {
        intent,
        confidence: 'medium',
        usedLLM: false,
      }
    }

    // 3. LLM-based classification
    if (!promptConfig || typeof promptConfig !== 'object') {
      throw new Error('Invalid prompt configuration')
    }

    // Build system prompt with available intents
    let systemPrompt = promptConfig.system || 'Classifique a intenção da mensagem.'
    
    if (intentsConfig && Array.isArray(intentsConfig)) {
      const intentsList = intentsConfig.map((i: any) => `- ${i.key}: ${i.description || i.label}`).join('\n')
      systemPrompt += `\n\nIntenções disponíveis:\n${intentsList}\n\nResponda APENAS com a chave da intenção.`
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: message,
      },
    ]

    // Call LLM
    const response = await generateChatCompletion(
      messages,
      undefined, // No tools needed
      groqApiKey,
      {
        temperature: promptConfig.temperature || 0.1,
        max_tokens: promptConfig.max_tokens || 10,
        model: 'llama-3.3-70b-versatile',
      }
    )

    const intent = response.content.trim().toLowerCase()
    const duration = Date.now() - startTime


    return {
      intent,
      confidence: 'high',
      usedLLM: true,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[classifyIntent] ❌ Error after ${duration}ms:`, error)

    // Fallback to 'outro' (other)
    return {
      intent: 'outro',
      confidence: 'low',
      usedLLM: false,
    }
  }
}

/**
 * Regex-based intent classification (fallback when LLM is disabled)
 */
const classifyWithRegex = (message: string, intentsConfig: any): string => {
  const lowerMessage = message.toLowerCase().trim()

  // Common patterns (can be enhanced with config)
  const patterns: Record<string, RegExp[]> = {
    saudacao: [/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)/i],
    duvida_tecnica: [/(como|qual|quando|onde|por que|duvida|pergunta)/i],
    orcamento: [/(quanto custa|preço|orçamento|valor|cotação)/i],
    agendamento: [/(agendar|marcar|reunião|horário|disponibilidade)/i],
    reclamacao: [/(problema|reclamação|insatisfeito|ruim|péssimo)/i],
    agradecimento: [/(obrigad|valeu|agradeço)/i],
    despedida: [/(tchau|até logo|até mais|falou|bye)/i],
    transferencia: [/(falar com|atendente|humano|pessoa|alguém)/i],
  }

  // Check each pattern
  for (const [intent, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(lowerMessage)) {
        return intent
      }
    }
  }

  // If no match, check if any intent from config matches
  if (intentsConfig && Array.isArray(intentsConfig)) {
    for (const intentDef of intentsConfig) {
      if (lowerMessage.includes(intentDef.key.toLowerCase())) {
        return intentDef.key
      }
    }
  }

  return 'outro'
}
