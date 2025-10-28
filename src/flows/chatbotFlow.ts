import { WhatsAppWebhookPayload, ParsedMessage, ClientConfig } from '@/lib/types'
import { filterStatusUpdates } from '@/nodes/filterStatusUpdates'
import { parseMessage } from '@/nodes/parseMessage'
import { checkOrCreateCustomer } from '@/nodes/checkOrCreateCustomer'
import { downloadMetaMedia } from '@/nodes/downloadMetaMedia'
import { transcribeAudio } from '@/nodes/transcribeAudio'
import { analyzeImage } from '@/nodes/analyzeImage'
import { analyzeDocument } from '@/nodes/analyzeDocument'
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
import { createExecutionLogger } from '@/lib/logger'
import { setWithExpiry } from '@/lib/redis'

export interface ChatbotFlowResult {
  success: boolean
  messagesSent?: number
  handedOff?: boolean
  error?: string
}

/**
 * 🔐 Processa mensagem do chatbot com configuração dinâmica do cliente
 *
 * @param payload - Payload do webhook do WhatsApp
 * @param config - Configuração do cliente (do Vault ou fallback)
 * @returns Resultado do processamento
 */
export const processChatbotMessage = async (
  payload: WhatsAppWebhookPayload,
  config: ClientConfig
): Promise<ChatbotFlowResult> => {
  console.log('🚀 [chatbotFlow] Starting message processing')
  
  const logger = createExecutionLogger()
  
  const executionId = logger.startExecution({
    source: 'chatbotFlow',
    payload_from: payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
  })

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
      clientId: config.id, // 🔐 Multi-tenant: Associa customer ao cliente
    })
    logger.logNodeSuccess('3. Check/Create Customer', { status: customer.status })

    if (customer.status === 'human') {
      console.log(`[chatbotFlow] Customer ${parsedMessage.phone} already transferred to human, skipping bot response`)
      logger.finishExecution('success')
      return { success: true, handedOff: true }
    }

    console.log('[chatbotFlow] Processing message content based on type')

    // NODE 4: Process Media (audio/image/document)
    console.log('[chatbotFlow] NODE 4: Verificando tipo de mensagem...')
    logger.logNodeStart('4. Process Media', { type: parsedMessage.type })

    let processedContent: string | undefined

    if (parsedMessage.type === 'audio' && parsedMessage.metadata?.id) {
      console.log('[chatbotFlow] NODE 4a: Baixando áudio...')
      const audioBuffer = await downloadMetaMedia(parsedMessage.metadata.id)
      logger.logNodeSuccess('4a. Download Audio', { size: audioBuffer.length })

      console.log('[chatbotFlow] NODE 4b: Transcrevendo áudio...')
      processedContent = await transcribeAudio(audioBuffer)
      logger.logNodeSuccess('4b. Transcribe Audio', { transcription: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 🎤 Áudio transcrito: ${processedContent}`)

    } else if (parsedMessage.type === 'image' && parsedMessage.metadata?.id) {
      console.log('[chatbotFlow] NODE 4a: Baixando imagem...')
      const imageBuffer = await downloadMetaMedia(parsedMessage.metadata.id)
      logger.logNodeSuccess('4a. Download Image', { size: imageBuffer.length })

      console.log('[chatbotFlow] NODE 4b: Analisando imagem com GPT-4o Vision...')
      const imageDescription = await analyzeImage(imageBuffer, parsedMessage.metadata.mimeType || 'image/jpeg')

      // Passar apenas a descrição da IA (a legenda será adicionada pelo normalizeMessage)
      processedContent = imageDescription

      logger.logNodeSuccess('4b. Analyze Image', { description: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 🖼️ Imagem analisada: ${processedContent}`)

    } else if (parsedMessage.type === 'document' && parsedMessage.metadata?.id) {
      console.log('[chatbotFlow] NODE 4a: Baixando documento...')
      const documentBuffer = await downloadMetaMedia(parsedMessage.metadata.id)
      logger.logNodeSuccess('4a. Download Document', { size: documentBuffer.length, filename: parsedMessage.metadata.filename })

      console.log('[chatbotFlow] NODE 4b: Analisando documento...')
      const documentSummary = await analyzeDocument(
        documentBuffer,
        parsedMessage.metadata.mimeType,
        parsedMessage.metadata.filename
      )

      processedContent = documentSummary

      logger.logNodeSuccess('4b. Analyze Document', { summary: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 📄 Documento analisado: ${processedContent.substring(0, 200)}...`)

    } else {
      console.log('[chatbotFlow] NODE 4: Mensagem de texto, pulando processamento de mídia')
      logger.logNodeSuccess('4. Process Media', { skipped: true, reason: 'text message' })
    }

    // NODE 5: Normalize Message
    console.log('[chatbotFlow] NODE 5: Iniciando normalização...')
    logger.logNodeStart('5. Normalize Message', { parsedMessage, processedContent })
    const normalizedMessage = normalizeMessage({
      parsedMessage,
      processedContent,
    })
    logger.logNodeSuccess('5. Normalize Message', { content: normalizedMessage.content })
    console.log(`[chatbotFlow] NODE 5: ✅ Normalização concluída`)

    // NODE 6: Push to Redis
    console.log('[chatbotFlow] NODE 6: Tentando push to Redis...')
    logger.logNodeStart('6. Push to Redis', normalizedMessage)
    
    try {
      await pushToRedis(normalizedMessage)
      console.log('[chatbotFlow] NODE 6: ✅ Push to Redis concluído com sucesso!')
      logger.logNodeSuccess('6. Push to Redis', { success: true })
      
      // Update debounce timestamp (resets the 10s timer)
      const debounceKey = `debounce:${parsedMessage.phone}`
      await setWithExpiry(debounceKey, String(Date.now()), 15) // 15s TTL (buffer above 10s delay)
      console.log(`[chatbotFlow] 🕐 Debounce timer reset for ${parsedMessage.phone}`)
      
    } catch (redisError) {
      console.error('[chatbotFlow] NODE 6: ❌ ERRO NO REDIS!', redisError)
      logger.logNodeError('6. Push to Redis', redisError)
      // Continua mesmo com erro Redis (graceful degradation)
    }

    // NODE 7: Save User Message
    logger.logNodeStart('7. Save Chat Message (User)', { phone: parsedMessage.phone, type: 'user' })
    console.log('[chatbotFlow] Saving user message to chat history')
    
    // Para imagens, salvar uma versão simplificada no histórico
    let messageForHistory = normalizedMessage.content
    if (parsedMessage.type === 'image') {
      messageForHistory = parsedMessage.content && parsedMessage.content.trim().length > 0
        ? `[Imagem recebida] ${parsedMessage.content}`
        : '[Imagem recebida]'
    }
    
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: messageForHistory,
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

    // NODE 11: Generate AI Response (com config do cliente)
    logger.logNodeStart('11. Generate AI Response', { messageLength: batchedContent.length, historyCount: chatHistory2.length })
    console.log('[chatbotFlow] Generating AI response')
    const aiResponse = await generateAIResponse({
      message: batchedContent,
      chatHistory: chatHistory2,
      ragContext,
      customerName: parsedMessage.name,
      config, // 🔐 Passa config com systemPrompt e groqApiKey
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
          config, // 🔐 Passa config com notificationEmail
        })
        logger.finishExecution('success')
        return { success: true, handedOff: true }
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

    // NODE 13: Send WhatsApp Message (com config do cliente)
    logger.logNodeStart('13. Send WhatsApp Message', { phone: parsedMessage.phone, messageCount: formattedMessages.length })
    console.log(`[chatbotFlow] Sending ${formattedMessages.length} messages to customer`)
    const messageIds = await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
      config, // 🔐 Passa config com metaAccessToken e metaPhoneNumberId
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
