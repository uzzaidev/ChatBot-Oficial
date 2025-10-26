import { WhatsAppWebhookPayload, ParsedMessage } from '@/lib/types'
import { filterStatusUpdates } from '@/nodes/filterStatusUpdates'
import { parseMessage } from '@/nodes/parseMessage'
import { checkOrCreateCustomer } from '@/nodes/checkOrCreateCustomer'
import { downloadMetaMedia } from '@/nodes/downloadMetaMedia'
import { transcribeAudio } from '@/nodes/transcribeAudio'
import { analyzeImage } from '@/nodes/analyzeImage'
import { normalizeMessage } from '@/nodes/normalizeMessage'
import { pushToRedis } from '@/nodes/pushToRedis'
import { batchMessages } from '@/nodes/batchMessages'
import { getChatHistory } from '@/nodes/getChatHistory'
import { getRAGContext } from '@/nodes/getRAGContext'
import { generateAIResponse } from '@/nodes/generateAIResponse'
import { formatResponse } from '@/nodes/formatResponse'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'
import { handleHumanHandoff } from '@/nodes/handleHumanHandoff'
import { saveChatMessage } from '@/nodes/saveChatMessage'
import { downloadMedia } from '@/lib/meta'

export interface ChatbotFlowResult {
  success: boolean
  messagesSent?: number
  handedOff?: boolean
  error?: string
}

const getMediaUrl = async (mediaId: string): Promise<string> => {
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
  if (!META_ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN not configured')
  }

  const META_API_VERSION = 'v18.0'
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get media URL: ${response.statusText}`)
  }

  const data = await response.json()
  return data.url
}

const processMediaMessage = async (
  parsedMessage: ParsedMessage
): Promise<string> => {
  const { type, content, metadata } = parsedMessage

  if (!metadata?.id) {
    throw new Error(`No media ID found for ${type} message`)
  }

  if (type === 'audio') {
    const audioBuffer = await downloadMetaMedia(metadata.id)
    const transcription = await transcribeAudio(audioBuffer)
    return transcription
  }

  if (type === 'image') {
    const imageUrl = await getMediaUrl(metadata.id)
    const description = await analyzeImage(imageUrl)

    if (content && content.trim().length > 0) {
      return `${description}\n\nLegenda: ${content}`
    }

    return description
  }

  return content
}

const checkForToolCall = (aiResponseContent: string, toolName: string): boolean => {
  const toolPattern = new RegExp(`"name":\\s*"${toolName}"`, 'i')
  return toolPattern.test(aiResponseContent)
}

export const processChatbotMessage = async (
  payload: WhatsAppWebhookPayload
): Promise<ChatbotFlowResult> => {
  try {
    console.log('[chatbotFlow] Starting message processing')

    const filteredPayload = filterStatusUpdates(payload)
    if (!filteredPayload) {
      console.log('[chatbotFlow] Status update filtered out, skipping')
      return { success: true }
    }

    const parsedMessage = parseMessage(filteredPayload)
    console.log(`[chatbotFlow] Parsed message from ${parsedMessage.phone}, type: ${parsedMessage.type}`)

    const customer = await checkOrCreateCustomer({
      phone: parsedMessage.phone,
      name: parsedMessage.name,
    })

    if (customer.status === 'human') {
      console.log(`[chatbotFlow] Customer ${parsedMessage.phone} already transferred to human, skipping bot response`)
      return { success: true, handedOff: true }
    }

    console.log('[chatbotFlow] Processing message content based on type')
    let normalizedContent: string

    if (parsedMessage.type === 'text') {
      normalizedContent = parsedMessage.content
    } else {
      normalizedContent = await processMediaMessage(parsedMessage)
    }

    const normalizedMessage = normalizeMessage({
      parsedMessage,
      processedContent: normalizedContent,
    })
    console.log('[chatbotFlow] Message normalized, pushing to Redis for batching')

    await pushToRedis(normalizedMessage)

    console.log('[chatbotFlow] Saving user message to chat history')
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: normalizedMessage.content,
      type: 'user',
    })

    console.log('[chatbotFlow] Waiting for message batching (10s delay)')
    const batchedContent = await batchMessages(parsedMessage.phone)

    if (!batchedContent || batchedContent.trim().length === 0) {
      console.log('[chatbotFlow] No batched content available, skipping AI processing')
      return { success: true }
    }

    console.log('[chatbotFlow] Fetching chat history and RAG context in parallel')
    const [chatHistory, ragContext] = await Promise.all([
      getChatHistory(parsedMessage.phone),
      getRAGContext(batchedContent),
    ])

    console.log(`[chatbotFlow] Context retrieved - History: ${chatHistory.length} messages, RAG: ${ragContext.length} chars`)

    console.log('[chatbotFlow] Generating AI response')
    const aiResponse = await generateAIResponse({
      message: batchedContent,
      chatHistory,
      ragContext,
      customerName: parsedMessage.name,
    })

    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const hasHumanHandoff = aiResponse.toolCalls.some(
        (tool) => tool.function.name === 'transferir_atendimento'
      )

      if (hasHumanHandoff) {
        console.log('[chatbotFlow] Human handoff tool called, initiating transfer')
        await handleHumanHandoff({
          phone: parsedMessage.phone,
          customerName: parsedMessage.name,
        })

        return { success: true, handedOff: true }
      }

      const hasDiagnosticAgent = aiResponse.toolCalls.some(
        (tool) => tool.function.name === 'subagente_diagnostico'
      )

      if (hasDiagnosticAgent) {
        console.log('[chatbotFlow] Diagnostic subagent tool called - tool result handling not yet implemented')
      }
    }

    if (!aiResponse.content || aiResponse.content.trim().length === 0) {
      console.log('[chatbotFlow] AI response is empty, skipping message sending')
      return { success: true, messagesSent: 0 }
    }

    console.log('[chatbotFlow] Saving AI response to chat history')
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: aiResponse.content,
      type: 'ai',
    })

    console.log('[chatbotFlow] Formatting AI response into WhatsApp messages')
    const formattedMessages = formatResponse(aiResponse.content)

    if (formattedMessages.length === 0) {
      console.log('[chatbotFlow] No formatted messages to send')
      return { success: true, messagesSent: 0 }
    }

    console.log(`[chatbotFlow] Sending ${formattedMessages.length} messages to customer`)
    const messageIds = await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
    })

    console.log(`[chatbotFlow] Successfully sent ${messageIds.length} messages`)
    return { success: true, messagesSent: messageIds.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`[chatbotFlow] Error processing message: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
