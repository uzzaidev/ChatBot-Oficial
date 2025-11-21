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
// 🔧 Phase 1-3: Configuration-driven nodes
import { checkContinuity } from '@/nodes/checkContinuity'
import { classifyIntent } from '@/nodes/classifyIntent'
import { detectRepetition } from '@/nodes/detectRepetition'
import { createExecutionLogger } from '@/lib/logger'
import { setWithExpiry } from '@/lib/redis'
import { logOpenAIUsage, logGroqUsage, logWhisperUsage } from '@/lib/usageTracking'
// 🔄 Flow synchronization - Option 4 (Hybrid)
import { getAllNodeStates, shouldExecuteNode } from '@/lib/flowHelpers'

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
  
  const logger = createExecutionLogger()

  const executionId = logger.startExecution({
    source: 'chatbotFlow',
    payload_from: payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
  }, config.id) // ⚡ Multi-tenant: passa client_id para isolamento de logs

  try {

    // 🔄 FLOW SYNC: Fetch all node enabled states for this client
    const nodeStates = await getAllNodeStates(config.id)

    // NODE 1: Filter Status Updates (always executes - not configurable)
    logger.logNodeStart('1. Filter Status Updates', payload)
    const filteredPayload = filterStatusUpdates(payload)
    if (!filteredPayload) {
      logger.logNodeSuccess('1. Filter Status Updates', { filtered: true, reason: 'Status update' })
      logger.finishExecution('success')
      return { success: true }
    }
    logger.logNodeSuccess('1. Filter Status Updates', { filtered: false })

    // NODE 2: Parse Message
    logger.logNodeStart('2. Parse Message', filteredPayload)
    const parsedMessage = parseMessage(filteredPayload)
    logger.logNodeSuccess('2. Parse Message', { phone: parsedMessage.phone, type: parsedMessage.type })

    // NODE 3: Check/Create Customer
    logger.logNodeStart('3. Check/Create Customer', { phone: parsedMessage.phone, name: parsedMessage.name })
    const customer = await checkOrCreateCustomer({
      phone: parsedMessage.phone,
      name: parsedMessage.name,
      clientId: config.id, // 🔐 Multi-tenant: Associa customer ao cliente
    })
    logger.logNodeSuccess('3. Check/Create Customer', { status: customer.status })

    if (customer.status === 'human') {
      logger.finishExecution('success')
      return { success: true, handedOff: true }
    }


    // NODE 4: Process Media (audio/image/document) - configurable
    let processedContent: string | undefined
    
    const shouldProcessMedia = shouldExecuteNode('process_media', nodeStates)
    
    if (shouldProcessMedia && (parsedMessage.type === 'audio' || parsedMessage.type === 'image' || parsedMessage.type === 'document') && parsedMessage.metadata?.id) {
      logger.logNodeStart('4. Process Media', { type: parsedMessage.type })

      if (parsedMessage.type === 'audio' && parsedMessage.metadata?.id) {
        const audioBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
        logger.logNodeSuccess('4a. Download Audio', { size: audioBuffer.length })

        const transcriptionResult = await transcribeAudio(audioBuffer, config.apiKeys.openaiApiKey)
        processedContent = transcriptionResult.text
        logger.logNodeSuccess('4b. Transcribe Audio', { transcription: processedContent.substring(0, 100) })

        // 📊 Registrar uso de Whisper
        try {
          await logWhisperUsage(
            config.id,
            undefined,
            parsedMessage.phone,
            transcriptionResult.durationSeconds || 0,
            transcriptionResult.usage.total_tokens
          )
        } catch (usageError) {
          console.error('[chatbotFlow] ❌ Failed to log Whisper usage:', usageError)
        }

      } else if (parsedMessage.type === 'image' && parsedMessage.metadata?.id) {
        const imageBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
        logger.logNodeSuccess('4a. Download Image', { size: imageBuffer.length })

        const visionResult = await analyzeImage(imageBuffer, parsedMessage.metadata.mimeType || 'image/jpeg', config.apiKeys.openaiApiKey)

        // Passar apenas a descrição da IA (a legenda será adicionada pelo normalizeMessage)
        processedContent = visionResult.text

        logger.logNodeSuccess('4b. Analyze Image', { description: processedContent.substring(0, 100) })

        // 📊 Registrar uso de GPT-4o Vision
        try {
          await logOpenAIUsage(
            config.id,
            undefined,
            parsedMessage.phone,
            visionResult.model,
          visionResult.usage
        )
      } catch (usageError) {
        console.error('[chatbotFlow] ❌ Failed to log Vision usage:', usageError)
      }

      } else if (parsedMessage.type === 'document' && parsedMessage.metadata?.id) {
        const documentBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
        logger.logNodeSuccess('4a. Download Document', { size: documentBuffer.length, filename: parsedMessage.metadata.filename })

        const documentResult = await analyzeDocument(
          documentBuffer,
          parsedMessage.metadata.mimeType,
          parsedMessage.metadata.filename,
          config.apiKeys.openaiApiKey
        )

        processedContent = documentResult.content

        logger.logNodeSuccess('4b. Analyze Document', { summary: processedContent.substring(0, 100) })

        // 📊 Registrar uso de GPT-4o PDF (se houver usage data)
        if (documentResult.usage && documentResult.model) {
          try {
            await logOpenAIUsage(
              config.id,
              undefined,
              parsedMessage.phone,
              documentResult.model,
              documentResult.usage
            )
          } catch (usageError) {
            console.error('[chatbotFlow] ❌ Failed to log PDF usage:', usageError)
          }
        }
      }
    } else if (!shouldProcessMedia) {
      logger.logNodeSuccess('4. Process Media', { skipped: true, reason: 'node disabled' })
    } else {
      logger.logNodeSuccess('4. Process Media', { skipped: true, reason: 'text message' })
    }

    // NODE 5: Normalize Message
    logger.logNodeStart('5. Normalize Message', { parsedMessage, processedContent })
    const normalizedMessage = normalizeMessage({
      parsedMessage,
      processedContent,
    })
    logger.logNodeSuccess('5. Normalize Message', { content: normalizedMessage.content })

    // NODE 6: Push to Redis (configurable)
    if (shouldExecuteNode('push_to_redis', nodeStates)) {
      logger.logNodeStart('6. Push to Redis', normalizedMessage)
      
      try {
        await pushToRedis(normalizedMessage)
        logger.logNodeSuccess('6. Push to Redis', { success: true })
        
        // Update debounce timestamp (resets the 10s timer)
        const debounceKey = `debounce:${parsedMessage.phone}`
        await setWithExpiry(debounceKey, String(Date.now()), 15) // 15s TTL (buffer above 10s delay)
        
      } catch (redisError) {
        console.error('[chatbotFlow] NODE 6: ❌ ERRO NO REDIS!', redisError)
        logger.logNodeError('6. Push to Redis', redisError)
        // Continua mesmo com erro Redis (graceful degradation)
      }
    } else {
      logger.logNodeSuccess('6. Push to Redis', { skipped: true, reason: 'node disabled' })
    }

    // NODE 7: Save User Message
    logger.logNodeStart('7. Save Chat Message (User)', { phone: parsedMessage.phone, type: 'user' })
    
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
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    })
    logger.logNodeSuccess('7. Save Chat Message (User)', { saved: true })

    // NODE 8: Batch Messages (configurable - can be disabled)
    let batchedContent: string
    
    if (shouldExecuteNode('batch_messages', nodeStates) && config.settings.messageSplitEnabled) {
      logger.logNodeStart('8. Batch Messages', { phone: parsedMessage.phone })
      batchedContent = await batchMessages(parsedMessage.phone)
      logger.logNodeSuccess('8. Batch Messages', { contentLength: batchedContent?.length || 0 })
    } else {
      const reason = !shouldExecuteNode('batch_messages', nodeStates) ? 'node disabled' : 'config disabled'
      logger.logNodeSuccess('8. Batch Messages', { skipped: true, reason })
      batchedContent = normalizedMessage.content
    }

    if (!batchedContent || batchedContent.trim().length === 0) {
      logger.finishExecution('success')
      return { success: true }
    }

    
    // NODE 9 & 10: Get Chat History + RAG Context (configurable)
    let chatHistory2: any[] = []
    let ragContext: string = ''
    
    // Check if we should fetch chat history
    const shouldGetHistory = shouldExecuteNode('get_chat_history', nodeStates)
    
    if (shouldGetHistory) {
      logger.logNodeStart('9. Get Chat History', { phone: parsedMessage.phone })
    }
    
    // Check if we should fetch RAG context
    const shouldGetRAG = shouldExecuteNode('get_rag_context', nodeStates) && config.settings.enableRAG
    
    if (shouldGetHistory || shouldGetRAG) {
      if (shouldGetHistory && shouldGetRAG) {
        // Both enabled - fetch in parallel
        logger.logNodeStart('10. Get RAG Context', { queryLength: batchedContent.length })
        
        const [history, rag] = await Promise.all([
          getChatHistory({
            phone: parsedMessage.phone,
            clientId: config.id,
            maxHistory: config.settings.maxChatHistory,
          }),
          getRAGContext({
            query: batchedContent,
            clientId: config.id,
            openaiApiKey: config.apiKeys.openaiApiKey,
          }),
        ])
        
        chatHistory2 = history
        ragContext = rag
        
        logger.logNodeSuccess('9. Get Chat History', { messageCount: chatHistory2.length })
        logger.logNodeSuccess('10. Get RAG Context', { contextLength: ragContext.length })
      } else if (shouldGetHistory) {
        // Only history enabled
        chatHistory2 = await getChatHistory({
          phone: parsedMessage.phone,
          clientId: config.id,
          maxHistory: config.settings.maxChatHistory,
        })
        logger.logNodeSuccess('9. Get Chat History', { messageCount: chatHistory2.length })
        logger.logNodeSuccess('10. Get RAG Context', { skipped: true, reason: 'node disabled or config disabled' })
      } else if (shouldGetRAG) {
        // Only RAG enabled (rare case)
        logger.logNodeStart('10. Get RAG Context', { queryLength: batchedContent.length })
        ragContext = await getRAGContext({
          query: batchedContent,
          clientId: config.id,
          openaiApiKey: config.apiKeys.openaiApiKey,
        })
        logger.logNodeSuccess('9. Get Chat History', { skipped: true, reason: 'node disabled' })
        logger.logNodeSuccess('10. Get RAG Context', { contextLength: ragContext.length })
      }
    } else {
      // Both disabled
      logger.logNodeSuccess('9. Get Chat History', { skipped: true, reason: 'node disabled' })
      logger.logNodeSuccess('10. Get RAG Context', { skipped: true, reason: 'node disabled or config disabled' })
    }

    // 🔧 Phase 1: Check Conversation Continuity (configurable)
    let continuityInfo: any
    
    if (shouldExecuteNode('check_continuity', nodeStates)) {
      logger.logNodeStart('9.5. Check Continuity', { phone: parsedMessage.phone })
      continuityInfo = await checkContinuity({
        phone: parsedMessage.phone,
        clientId: config.id,
      })
      logger.logNodeSuccess('9.5. Check Continuity', {
        isNew: continuityInfo.isNewConversation,
        hoursSince: continuityInfo.hoursSinceLastMessage,
      })
    } else {
      logger.logNodeSuccess('9.5. Check Continuity', { skipped: true, reason: 'node disabled' })
      continuityInfo = {
        isNewConversation: false,
        hoursSinceLastMessage: 0,
        greetingInstruction: '', // No special greeting instruction
      }
    }

    // 🔧 Phase 2: Classify User Intent (configurable)
    let intentInfo: any
    
    if (shouldExecuteNode('classify_intent', nodeStates)) {
      logger.logNodeStart('9.6. Classify Intent', { messageLength: batchedContent.length })
      intentInfo = await classifyIntent({
        message: batchedContent,
        clientId: config.id,
        groqApiKey: config.apiKeys.groqApiKey,
      })
      logger.logNodeSuccess('9.6. Classify Intent', {
        intent: intentInfo.intent,
        confidence: intentInfo.confidence,
        usedLLM: intentInfo.usedLLM,
      })
    } else {
      logger.logNodeSuccess('9.6. Classify Intent', { skipped: true, reason: 'node disabled' })
      intentInfo = {
        intent: 'outro',
        confidence: 'medium',
        usedLLM: false,
      }
    }

    // NODE 11: Generate AI Response (com config do cliente + greeting instruction)
    logger.logNodeStart('11. Generate AI Response', { messageLength: batchedContent.length, historyCount: chatHistory2.length })
    const aiResponse = await generateAIResponse({
      message: batchedContent,
      chatHistory: chatHistory2,
      ragContext,
      customerName: parsedMessage.name,
      config, // 🔐 Passa config com systemPrompt e groqApiKey
      greetingInstruction: continuityInfo.greetingInstruction, // 🔧 Phase 1: Inject greeting
    })
    logger.logNodeSuccess('11. Generate AI Response', {
      contentLength: aiResponse.content?.length || 0,
      hasToolCalls: !!aiResponse.toolCalls,
      toolCount: aiResponse.toolCalls?.length || 0
    })

    // 🔧 Phase 3: Detect Repetition and regenerate if needed (configurable)
    if (shouldExecuteNode('detect_repetition', nodeStates) && aiResponse.content && aiResponse.content.trim().length > 0) {
      logger.logNodeStart('11.5. Detect Repetition', { responseLength: aiResponse.content.length })
      
      const repetitionCheck = await detectRepetition({
        phone: parsedMessage.phone,
        clientId: config.id,
        proposedResponse: aiResponse.content,
      })
      
      logger.logNodeSuccess('11.5. Detect Repetition', {
        isRepetition: repetitionCheck.isRepetition,
        similarity: repetitionCheck.similarityScore,
      })
      
      if (repetitionCheck.isRepetition) {
        const originalResponse = aiResponse.content
        
        // Regenerate with anti-repetition instruction
        logger.logNodeStart('11.6. Regenerate with Variation', {
          originalResponsePreview: originalResponse.substring(0, 150) + '...'
        })
        
        // Create a stronger variation instruction
        const variationInstruction = (continuityInfo.greetingInstruction || '') + 
          '\n\n🔴 ALERTA CRÍTICO DE REPETIÇÃO: Você DEVE criar uma resposta COMPLETAMENTE DIFERENTE da anterior. ' +
          'Sua resposta anterior foi muito similar às respostas passadas. ' +
          'REQUISITOS OBRIGATÓRIOS:\n' +
          '1. Use palavras e frases DIFERENTES\n' +
          '2. Mude a ESTRUTURA da resposta (ordem das ideias, número de parágrafos)\n' +
          '3. Varie o ESTILO (mais formal/informal, mais direta/explicativa)\n' +
          '4. Se possível, aborde o assunto por um ÂNGULO DIFERENTE\n' +
          '5. NÃO copie frases ou expressões que você já usou recentemente'
        
        const variedResponse = await generateAIResponse({
          message: batchedContent,
          chatHistory: chatHistory2,
          ragContext,
          customerName: parsedMessage.name,
          config: {
            ...config,
            settings: {
              ...config.settings,
              temperature: Math.min(1.0, (config.settings.temperature || 0.7) + 0.3) // Increase temperature for more variation
            }
          },
          greetingInstruction: variationInstruction,
        })
        
        // Check if the regenerated response is still too similar
        const newSimilarity = await detectRepetition({
          phone: parsedMessage.phone,
          clientId: config.id,
          proposedResponse: variedResponse.content || '',
        })
        
        // Use the varied response
        aiResponse.content = variedResponse.content
        aiResponse.toolCalls = variedResponse.toolCalls
        
        logger.logNodeSuccess('11.6. Regenerate with Variation', {
          originalLength: originalResponse.length,
          newLength: variedResponse.content?.length || 0,
          originalPreview: originalResponse.substring(0, 100),
          newPreview: (variedResponse.content || '').substring(0, 100),
          newSimilarity: newSimilarity.similarityScore,
          stillRepetitive: newSimilarity.isRepetition
        })
        
        if (newSimilarity.isRepetition) {
        } else {
        }
      } else {
      }
    } else if (!shouldExecuteNode('detect_repetition', nodeStates)) {
      logger.logNodeSuccess('11.5. Detect Repetition', { skipped: true, reason: 'node disabled' })
    }

    // 📊 Log usage to database for analytics
    if (aiResponse.usage && aiResponse.provider) {

      try {
        if (aiResponse.provider === 'openai') {
          await logOpenAIUsage(
            config.id, // client_id
            undefined, // conversation_id (não temos ainda)
            parsedMessage.phone,
            aiResponse.model || 'gpt-4o',
            aiResponse.usage
          )
        } else if (aiResponse.provider === 'groq') {
          await logGroqUsage(
            config.id, // client_id
            undefined, // conversation_id (não temos ainda)
            parsedMessage.phone,
            aiResponse.model || 'llama-3.3-70b-versatile',
            aiResponse.usage
          )
        }
      } catch (usageError) {
        console.error('[chatbotFlow] ❌ Failed to log usage:', usageError)
        // Não quebrar o fluxo por erro de logging
      }
    } else {
    }

    // 🔧 Human Handoff configurável: Se desabilitado, ignora tool calls de transferência
    if (config.settings.enableHumanHandoff && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const hasHumanHandoff = aiResponse.toolCalls.some(
        (tool) => tool.function.name === 'transferir_atendimento'
      )

      if (hasHumanHandoff) {
        await handleHumanHandoff({
          phone: parsedMessage.phone,
          customerName: parsedMessage.name,
          config, // 🔐 Passa config com notificationEmail
        })
        logger.finishExecution('success')
        return { success: true, handedOff: true }
      }
    } else if (!config.settings.enableHumanHandoff && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
    }

    if (!aiResponse.content || aiResponse.content.trim().length === 0) {
      logger.finishExecution('success')
      return { success: true, messagesSent: 0 }
    }

    // Save AI Response (internal step)
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: aiResponse.content,
      type: 'ai',
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    })

    // NODE 12: Format Response (configurável)
    logger.logNodeStart('12. Format Response', { contentLength: aiResponse.content.length })
    let formattedMessages: string[]
    
    if (config.settings.messageSplitEnabled) {
      formattedMessages = formatResponse(aiResponse.content)
      logger.logNodeSuccess('12. Format Response', { 
        messageCount: formattedMessages.length,
        messages: formattedMessages.map((msg, idx) => `[${idx + 1}]: ${msg.substring(0, 100)}...`)
      })
    } else {
      formattedMessages = [aiResponse.content]
      logger.logNodeSuccess('12. Format Response', { 
        messageCount: 1,
        messages: [`[1]: ${aiResponse.content.substring(0, 100)}...`]
      })
    }

    if (formattedMessages.length === 0) {
      logger.finishExecution('success')
      return { success: true, messagesSent: 0 }
    }

    // NODE 13: Send WhatsApp Message (com config do cliente)
    logger.logNodeStart('13. Send WhatsApp Message', { phone: parsedMessage.phone, messageCount: formattedMessages.length })
    const messageIds = await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
      config, // 🔐 Passa config com metaAccessToken e metaPhoneNumberId
    })
    logger.logNodeSuccess('13. Send WhatsApp Message', { sentCount: messageIds.length })

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
