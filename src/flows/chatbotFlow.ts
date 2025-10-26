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
import { createExecutionLogger } from '@/lib/logger'

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
  console.log('🚀🚀🚀 [chatbotFlow] FUNÇÃO INICIADA! 🚀🚀🚀')
  console.log('[chatbotFlow] Payload recebido:', JSON.stringify(payload, null, 2))
  
  // Cria logger para rastreamento completo
  console.log('[chatbotFlow] Criando logger...')
  const logger = createExecutionLogger()
  
  console.log('[chatbotFlow] Iniciando execução...')
  const executionId = logger.startExecution({
    source: 'chatbotFlow',
    payload_from: payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
  })
  
  console.log(`[chatbotFlow] ✅ Execution ID: ${executionId}`)

  try {
    console.log(`[chatbotFlow][${executionId}] Starting message processing`)

    // NODE 1: Filter Status Updates
    console.log('[chatbotFlow] NODE 1: Iniciando Filter Status Updates...')
    logger.logNodeStart('1. Filter Status Updates', payload)
    const filteredPayload = filterStatusUpdates(payload)
    if (!filteredPayload) {
      logger.logNodeSuccess('1. Filter Status Updates', { filtered: true, reason: 'Status update' })
      console.log('[chatbotFlow] Status update filtered out, skipping')
      logger.finishExecution('success')
      return { success: true }
    }
    logger.logNodeSuccess('1. Filter Status Updates', { filtered: false })

    // NODE 2: Parse Message
    logger.logNodeStart('2. Parse Message', filteredPayload)
    const parsedMessage = parseMessage(filteredPayload)
    logger.logNodeSuccess('2. Parse Message', { phone: parsedMessage.phone, type: parsedMessage.type })
    console.log(`[chatbotFlow] Parsed message from ${parsedMessage.phone}, type: ${parsedMessage.type}`)

    // NODE 3: Check/Create Customer
    logger.logNodeStart('3. Check/Create Customer', { phone: parsedMessage.phone, name: parsedMessage.name })
    const customer = await checkOrCreateCustomer({
      phone: parsedMessage.phone,
      name: parsedMessage.name,
    })
    logger.logNodeSuccess('3. Check/Create Customer', { status: customer.status })

    if (customer.status === 'human') {
      console.log(`[chatbotFlow] Customer ${parsedMessage.phone} already transferred to human, skipping bot response`)
      logger.finishExecution('success')
      return { success: true, handedOff: true }
    }

    console.log('[chatbotFlow] Processing message content based on type')
    let normalizedContent: string

        // NODE 4: Process Media (optional)
    const startNode4 = Date.now()
    if (parsedMessage.type === 'text') {
      normalizedContent = parsedMessage.content
      console.log('[chatbotFlow] NODE 4: Texto - pulando download de mídia')
      logger.logNodeStart('4. Download Media', null)
      logger.logNodeSuccess('4. Download Media', { skipped: true, reason: 'Text message' })
    } else {
      console.log('[chatbotFlow] NODE 4: Iniciando download de mídia...')
      logger.logNodeStart('4. Download Media', { mediaId: parsedMessage.mediaId, type: parsedMessage.type })
      const mediaUrl = await downloadMetaMedia(parsedMessage.mediaId!)
      logger.logNodeSuccess('4. Download Media', { url: mediaUrl })
      console.log(`[chatbotFlow] NODE 4: ✅ Mídia baixada`)

      // NODE 5: Transcribe/Analyze Media
      const startNode5 = Date.now()
      logger.logNodeStart('5. Process Media Content', { type: parsedMessage.type, url: mediaUrl })
      normalizedContent = await normalizeMessage({
        type: parsedMessage.type,
        content: parsedMessage.content,
        mediaUrl,
      })
      const durationNode5 = Date.now() - startNode5
      logger.logNodeSuccess('5. Process Media Content', { content: normalizedContent.substring(0, 100) })
      console.log(`[chatbotFlow] NODE 5: ✅ Normalização concluída em ${durationNode5}ms`)
    }
    const durationNode4 = Date.now() - startNode4
    console.log(`[chatbotFlow] NODE 4: Duração ${durationNode4}ms`)

    console.log(`[chatbotFlow] Message normalized, pushing to Redis for batching`)

    // NODE 6: Push to Redis
    try {
      logger.logNodeStart('6. Push to Redis', { phone: parsedMessage.phone })
      await pushToRedis(parsedMessage.phone, normalizedContent)
      logger.logNodeSuccess('6. Push to Redis', { success: true })
      console.log('[chatbotFlow] NODE 6: ✅ Pushed to Redis')
    } catch (error: any) {
      console.error('[chatbotFlow] NODE 6: ❌ Redis error:', error.message)
      logger.logNodeError('6. Push to Redis', error)
      // Continue mesmo se Redis falhar (degradação graceful)
    }

    // NODE 7: Batch Messages
    logger.logNodeStart('7. Batch Messages', { phone: parsedMessage.phone })
    const batchedMessage = await batchMessages(parsedMessage.phone)
    logger.logNodeSuccess('7. Batch Messages', { batched: batchedMessage })

    // NODE 8: Get Chat History
    logger.logNodeStart('8. Get Chat History', { phone: parsedMessage.phone })
    const chatHistory = await getChatHistory(parsedMessage.phone)
    logger.logNodeSuccess('8. Get Chat History', { historyLength: chatHistory.length })

    // NODE 5: Normalize Message
    const startNode5 = Date.now()
    console.log('[chatbotFlow] NODE 5: Iniciando normalização...')
    logger.logNodeStart('5. Normalize Message', { parsedMessage, processedContent: normalizedContent })
    const normalizedMessage = normalizeMessage({
      parsedMessage,
      processedContent: normalizedContent,
    })
    const durationNode5 = Date.now() - startNode5
    console.log(`[chatbotFlow] NODE 5: ✅ Normalização concluída em ${durationNode5}ms`)
    logger.logNodeSuccess('5. Normalize Message', { content: normalizedMessage.content })
    console.log('[chatbotFlow] Message normalized, pushing to Redis for batching')

    // NODE 6: Push to Redis
    console.log('[chatbotFlow] NODE 6: Tentando push to Redis...')
    logger.logNodeStart('6. Push to Redis', normalizedMessage)
    
    try {
      await pushToRedis(normalizedMessage)
      console.log('[chatbotFlow] NODE 6: ✅ Push to Redis concluído com sucesso!')
      logger.logNodeSuccess('6. Push to Redis', { success: true })
    } catch (redisError) {
      console.error('[chatbotFlow] NODE 6: ❌ ERRO NO REDIS!', redisError)
      logger.logNodeError('6. Push to Redis', redisError)
      throw new Error(`Redis push failed: ${redisError instanceof Error ? redisError.message : 'Unknown error'}`)
    }

    // NODE 7: Save User Message
    logger.logNodeStart('7. Save Chat Message (User)', { phone: parsedMessage.phone, type: 'user' })
    console.log('[chatbotFlow] Saving user message to chat history')
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: normalizedMessage.content,
      type: 'user',
    })
    logger.logNodeSuccess('7. Save Chat Message (User)', { saved: true })

    // NODE 8: Batch Messages
    logger.logNodeStart('8. Batch Messages', { phone: parsedMessage.phone })
    console.log('[chatbotFlow] Waiting for message batching (10s delay)')
    const batchedContent = await batchMessages(parsedMessage.phone)
    logger.logNodeSuccess('8. Batch Messages', { contentLength: batchedContent?.length || 0 })

    if (!batchedContent || batchedContent.trim().length === 0) {
      console.log('[chatbotFlow] No batched content available, skipping AI processing')
      logger.finishExecution('success')
      return { success: true }
    }

    console.log('[chatbotFlow] Fetching chat history and RAG context in parallel')
    
    // NODE 9 & 10: Get Chat History + RAG Context (parallel)
    logger.logNodeStart('9. Get Chat History', { phone: parsedMessage.phone })
    logger.logNodeStart('10. Get RAG Context', { queryLength: batchedContent.length })
    
    const [chatHistory2, ragContext] = await Promise.all([
      getChatHistory(parsedMessage.phone),
      getRAGContext(batchedContent),
    ])
    
    logger.logNodeSuccess('9. Get Chat History', { messageCount: chatHistory2.length })
    logger.logNodeSuccess('10. Get RAG Context', { contextLength: ragContext.length })

    console.log(`[chatbotFlow] Context retrieved - History: ${chatHistory2.length} messages, RAG: ${ragContext.length} chars`)

    // NODE 11: Generate AI Response
    logger.logNodeStart('11. Generate AI Response', { messageLength: batchedContent.length, historyCount: chatHistory2.length })
    console.log('[chatbotFlow] Generating AI response')
    const aiResponse = await generateAIResponse({
      message: batchedContent,
      chatHistory: chatHistory2,
      ragContext,
      customerName: parsedMessage.name,
    })
    logger.logNodeSuccess('11. Generate AI Response', { 
      contentLength: aiResponse.content?.length || 0, 
      hasToolCalls: !!aiResponse.toolCalls,
      toolCount: aiResponse.toolCalls?.length || 0
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
        logger.finishExecution('success')
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
      logger.finishExecution('success')
      return { success: true, messagesSent: 0 }
    }

    // Save AI Response (internal step)
    console.log('[chatbotFlow] Saving AI response to chat history')
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: aiResponse.content,
      type: 'ai',
    })

    // NODE 12: Format Response
    logger.logNodeStart('12. Format Response', { contentLength: aiResponse.content.length })
    console.log('[chatbotFlow] Formatting AI response into WhatsApp messages')
    const formattedMessages = formatResponse(aiResponse.content)
    logger.logNodeSuccess('12. Format Response', { messageCount: formattedMessages.length })

    if (formattedMessages.length === 0) {
      console.log('[chatbotFlow] No formatted messages to send')
      logger.finishExecution('success')
      return { success: true, messagesSent: 0 }
    }

    // NODE 13: Send WhatsApp Message
    logger.logNodeStart('13. Send WhatsApp Message', { phone: parsedMessage.phone, messageCount: formattedMessages.length })
    console.log(`[chatbotFlow] Sending ${formattedMessages.length} messages to customer`)
    const messageIds = await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
    })
    logger.logNodeSuccess('13. Send WhatsApp Message', { sentCount: messageIds.length })

    console.log(`[chatbotFlow] Successfully sent ${messageIds.length} messages`)
    logger.finishExecution('success')
    return { success: true, messagesSent: messageIds.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`[chatbotFlow] Error processing message: ${errorMessage}`)
    
    logger.finishExecution('error')

    return {
      success: false,
      error: errorMessage,
    }
  }
}
