import { generateChatCompletion } from '@/lib/groq'
import { ChatMessage } from '@/lib/types'

const DIAGNOSTIC_SYSTEM_PROMPT = `Você é um agente de diagnóstico especializado em identificar a área de interesse do cliente.

**Áreas disponíveis:**
1. **Energia Solar** - Projetos de geração fotovoltaica, dimensionamento, instalação, manutenção
2. **Ciência de Dados** - Automações, análises, dashboards, machine learning, IA
3. **Desenvolvimento** - Sistemas web, integrações, SaaS, APIs, automações personalizadas

**Sua tarefa:**
Analisar a mensagem do usuário e retornar APENAS uma das seguintes opções:
- "ENERGIA_SOLAR"
- "CIENCIA_DADOS"
- "DESENVOLVIMENTO"
- "INDEFINIDO" (se não for possível identificar)

**Exemplos:**
- "Quero instalar painéis solares" → ENERGIA_SOLAR
- "Preciso de um dashboard para visualizar dados" → CIENCIA_DADOS  
- "Quero criar um sistema web" → DESENVOLVIMENTO
- "Olá, tudo bem?" → INDEFINIDO

Responda APENAS com a categoria, sem explicações adicionais.`

export interface DiagnosticResult {
  area: 'ENERGIA_SOLAR' | 'CIENCIA_DADOS' | 'DESENVOLVIMENTO' | 'INDEFINIDO'
  confidence: 'high' | 'medium' | 'low'
}

export const executeDiagnosticSubagent = async (userMessage: string): Promise<DiagnosticResult> => {
  try {

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: DIAGNOSTIC_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ]

    const response = await generateChatCompletion(messages)

    const area = response.content.trim().toUpperCase()
    
    let normalizedArea: DiagnosticResult['area']
    if (area.includes('ENERGIA') || area.includes('SOLAR')) {
      normalizedArea = 'ENERGIA_SOLAR'
    } else if (area.includes('DADOS') || area.includes('CIENCIA')) {
      normalizedArea = 'CIENCIA_DADOS'
    } else if (area.includes('DESENVOLVIMENTO') || area.includes('WEB')) {
      normalizedArea = 'DESENVOLVIMENTO'
    } else {
      normalizedArea = 'INDEFINIDO'
    }


    return {
      area: normalizedArea,
      confidence: 'high'
    }
  } catch (error) {
    console.error('[executeDiagnosticSubagent] Erro:', error)
    return {
      area: 'INDEFINIDO',
      confidence: 'low'
    }
  }
}
