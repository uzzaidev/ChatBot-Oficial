import { createServerClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/gmail'
import { generateChatCompletion } from '@/lib/groq'
import { getChatHistory } from './getChatHistory'
import { ChatMessage } from '@/lib/types'

const RECIPIENT_EMAIL = 'luisfboff@hotmail.com'

const SUMMARY_SYSTEM_PROMPT = 'Você é um assistente que resume conversas de forma concisa e profissional. Resuma a conversa abaixo destacando os pontos principais, necessidades do cliente e o contexto da transferência.'

export interface HandleHumanHandoffInput {
  phone: string
  customerName: string
}

export interface HandleHumanHandoffResult {
  success: boolean
  emailSent: boolean
}

const formatChatHistoryForSummary = (chatHistory: ChatMessage[]): string => {
  return chatHistory
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'Assistente' : 'Cliente'
      return `${role}: ${msg.content}`
    })
    .join('\n\n')
}

const generateConversationSummary = async (chatHistory: ChatMessage[]): Promise<string> => {
  const formattedHistory = formatChatHistoryForSummary(chatHistory)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: SUMMARY_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Aqui está a conversa para resumir:\n\n${formattedHistory}`,
    },
  ]

  const response = await generateChatCompletion(messages)
  return response.content
}

const createEmailHtml = (customerName: string, phone: string, summary: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .info { margin: 10px 0; }
        .label { font-weight: bold; }
        .summary { background-color: white; padding: 15px; margin-top: 15px; border-left: 4px solid #4CAF50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Transferência de Atendimento</h1>
        </div>
        <div class="content">
          <p>Um cliente solicitou atendimento humano no chatbot.</p>

          <div class="info">
            <span class="label">Nome:</span> ${customerName}
          </div>

          <div class="info">
            <span class="label">Telefone:</span> ${phone}
          </div>

          <div class="summary">
            <h3>Resumo da Conversa</h3>
            <p>${summary.replace(/\n/g, '<br>')}</p>
          </div>

          <p style="margin-top: 20px;">
            <strong>Ação necessária:</strong> Entre em contato com o cliente pelo WhatsApp o mais breve possível.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export const handleHumanHandoff = async (
  input: HandleHumanHandoffInput
): Promise<HandleHumanHandoffResult> => {
  try {
    const { phone, customerName } = input
    const supabase = createServerClient()

    const { error: updateError } = await supabase
      .from('Clientes WhatsApp')
      .update({ status: 'Transferido' })
      .eq('telefone', phone)

    if (updateError) {
      throw new Error(`Failed to update customer status: ${updateError.message}`)
    }

    const chatHistory = await getChatHistory(phone)

    if (chatHistory.length === 0) {
      const simpleEmailHtml = createEmailHtml(
        customerName,
        phone,
        'Não há histórico de conversa disponível.'
      )

      await sendEmail(
        RECIPIENT_EMAIL,
        `Transferência: ${customerName}`,
        simpleEmailHtml
      )

      return {
        success: true,
        emailSent: true,
      }
    }

    const summary = await generateConversationSummary(chatHistory)
    const emailHtml = createEmailHtml(customerName, phone, summary)

    await sendEmail(
      RECIPIENT_EMAIL,
      `Transferência: ${customerName}`,
      emailHtml
    )

    return {
      success: true,
      emailSent: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to handle human handoff: ${errorMessage}`)
  }
}
