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
      const audioBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
      logger.logNodeSuccess('4a. Download Audio', { size: audioBuffer.length })

      console.log('[chatbotFlow] NODE 4b: Transcrevendo áudio...')
      const transcriptionResult = await transcribeAudio(audioBuffer, config.apiKeys.openaiApiKey)
      processedContent = transcriptionResult.text
      logger.logNodeSuccess('4b. Transcribe Audio', { transcription: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 🎤 Áudio transcrito: ${processedContent}`)

      // 📊 Registrar uso de Whisper
      try {
        await logWhisperUsage(
          config.id,
          undefined,
          parsedMessage.phone,
          transcriptionResult.durationSeconds || 0,
          transcriptionResult.usage.total_tokens
        )
        console.log('[chatbotFlow] ✅ Whisper usage logged')
      } catch (usageError) {
        console.error('[chatbotFlow] ❌ Failed to log Whisper usage:', usageError)
      }

    } else if (parsedMessage.type === 'image' && parsedMessage.metadata?.id) {
      console.log('[chatbotFlow] NODE 4a: Baixando imagem...')
      const imageBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
      logger.logNodeSuccess('4a. Download Image', { size: imageBuffer.length })

      console.log('[chatbotFlow] NODE 4b: Analisando imagem com GPT-4o Vision...')
      const visionResult = await analyzeImage(imageBuffer, parsedMessage.metadata.mimeType || 'image/jpeg', config.apiKeys.openaiApiKey)

      // Passar apenas a descrição da IA (a legenda será adicionada pelo normalizeMessage)
      processedContent = visionResult.text

      logger.logNodeSuccess('4b. Analyze Image', { description: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 🖼️ Imagem analisada: ${processedContent}`)

      // 📊 Registrar uso de GPT-4o Vision
      try {
        await logOpenAIUsage(
          config.id,
          undefined,
          parsedMessage.phone,
          visionResult.model,
          visionResult.usage
        )
        console.log('[chatbotFlow] ✅ GPT-4o Vision usage logged')
      } catch (usageError) {
        console.error('[chatbotFlow] ❌ Failed to log Vision usage:', usageError)
      }

    } else if (parsedMessage.type === 'document' && parsedMessage.metadata?.id) {
      console.log('[chatbotFlow] NODE 4a: Baixando documento...')
      const documentBuffer = await downloadMetaMedia(parsedMessage.metadata.id, config.apiKeys.metaAccessToken)
      logger.logNodeSuccess('4a. Download Document', { size: documentBuffer.length, filename: parsedMessage.metadata.filename })

      console.log('[chatbotFlow] NODE 4b: Analisando documento...')
      const documentResult = await analyzeDocument(
        documentBuffer,
        parsedMessage.metadata.mimeType,
        parsedMessage.metadata.filename,
        config.apiKeys.openaiApiKey
      )

      processedContent = documentResult.content

      logger.logNodeSuccess('4b. Analyze Document', { summary: processedContent.substring(0, 100) })
      console.log(`[chatbotFlow] 📄 Documento analisado: ${processedContent.substring(0, 200)}...`)

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
          console.log('[chatbotFlow] ✅ GPT-4o PDF usage logged')
        } catch (usageError) {
          console.error('[chatbotFlow] ❌ Failed to log PDF usage:', usageError)
        }
      }

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
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    })
    logger.logNodeSuccess('7. Save Chat Message (User)', { saved: true })

    // NODE 8: Batch Messages (configurável)
    let batchedContent: string
    
    if (config.settings.messageSplitEnabled) {
      logger.logNodeStart('8. Batch Messages', { phone: parsedMessage.phone })
      console.log(`[chatbotFlow] ✅ Message batching enabled - waiting ${config.settings.batchingDelaySeconds}s`)
      batchedContent = await batchMessages(parsedMessage.phone)
      logger.logNodeSuccess('8. Batch Messages', { contentLength: batchedContent?.length || 0 })
    } else {
      console.log('[chatbotFlow] ⚠️ Message batching disabled - processing immediately')
      batchedContent = processedContent
    }

    if (!batchedContent || batchedContent.trim().length === 0) {
      console.log('[chatbotFlow] No batched content available, skipping AI processing')
      logger.finishExecution('success')
      return { success: true }
    }

    console.log('[chatbotFlow] Fetching chat history and RAG context in parallel')
    
    // NODE 9 & 10: Get Chat History + RAG Context (parallel)
    logger.logNodeStart('9. Get Chat History', { phone: parsedMessage.phone })
    
    // 🔧 RAG configurável: Se desabilitado, pula busca de contexto
    let chatHistory2: any[]
    let ragContext: string = ''
    
    if (config.settings.enableRAG) {
      logger.logNodeStart('10. Get RAG Context', { queryLength: batchedContent.length })
      console.log('[chatbotFlow] 🔍 RAG enabled - fetching context')
      
      const [history, rag] = await Promise.all([
        getChatHistory({
          phone: parsedMessage.phone,
          clientId: config.id, // 🔐 Multi-tenant: Filtra mensagens do cliente
          maxHistory: config.settings.maxChatHistory, // 🔧 Usa config do cliente
        }),
        getRAGContext(batchedContent),
      ])
      
      chatHistory2 = history
      ragContext = rag
      
      logger.logNodeSuccess('10. Get RAG Context', { contextLength: ragContext.length })
      console.log(`[chatbotFlow] Context retrieved - History: ${chatHistory2.length} messages, RAG: ${ragContext.length} chars`)
    } else {
      console.log('[chatbotFlow] ⚠️ RAG disabled by client config - skipping context retrieval')
      chatHistory2 = await getChatHistory({
        phone: parsedMessage.phone,
        clientId: config.id,
        maxHistory: config.settings.maxChatHistory,
      })
      console.log(`[chatbotFlow] Context retrieved - History: ${chatHistory2.length} messages, RAG: disabled`)
    }
    
    logger.logNodeSuccess('9. Get Chat History', { messageCount: chatHistory2.length })

    // 🔧 Phase 1: Check Conversation Continuity
    logger.logNodeStart('9.5. Check Continuity', { phone: parsedMessage.phone })
    console.log('[chatbotFlow] 🔧 Phase 1: Checking conversation continuity')
    const continuityInfo = await checkContinuity({
      phone: parsedMessage.phone,
      clientId: config.id,
    })
    logger.logNodeSuccess('9.5. Check Continuity', {
      isNew: continuityInfo.isNewConversation,
      hoursSince: continuityInfo.hoursSinceLastMessage,
    })
    console.log(`[chatbotFlow] Continuity: ${continuityInfo.isNewConversation ? 'NEW' : 'CONTINUING'} conversation`)

    // 🔧 Phase 2: Classify User Intent
    logger.logNodeStart('9.6. Classify Intent', { messageLength: batchedContent.length })
    console.log('[chatbotFlow] 🔧 Phase 2: Classifying user intent')
    const intentInfo = await classifyIntent({
      message: batchedContent,
      clientId: config.id,
      groqApiKey: config.apiKeys.groqApiKey,
    })
    logger.logNodeSuccess('9.6. Classify Intent', {
      intent: intentInfo.intent,
      confidence: intentInfo.confidence,
      usedLLM: intentInfo.usedLLM,
    })
    console.log(`[chatbotFlow] Intent detected: ${intentInfo.intent} (${intentInfo.confidence} confidence, LLM: ${intentInfo.usedLLM})`)

    // NODE 11: Generate AI Response (com config do cliente + greeting instruction)
    logger.logNodeStart('11. Generate AI Response', { messageLength: batchedContent.length, historyCount: chatHistory2.length })
    console.log('[chatbotFlow] Generating AI response with continuity context')
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

    // 🔧 Phase 3: Detect Repetition and regenerate if needed
    if (aiResponse.content && aiResponse.content.trim().length > 0) {
      logger.logNodeStart('11.5. Detect Repetition', { responseLength: aiResponse.content.length })
      console.log('[chatbotFlow] 🔧 Phase 3: Checking for response repetition')
      
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
        console.log(`[chatbotFlow] ⚠️ Repetition detected (${(repetitionCheck.similarityScore! * 100).toFixed(1)}% similar) - regenerating with variation`)
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
          console.log(`[chatbotFlow] ⚠️ WARNING: Regenerated response is still repetitive (${(newSimilarity.similarityScore! * 100).toFixed(1)}% similar)`)
        } else {
          console.log(`[chatbotFlow] ✅ Response successfully varied (${(newSimilarity.similarityScore! * 100).toFixed(1)}% similar)`)
        }
      } else {
        console.log('[chatbotFlow] ✅ No repetition detected, using original response')
      }
    }

    // 📊 Log usage to database for analytics
    if (aiResponse.usage && aiResponse.provider) {
      console.log('[chatbotFlow] Logging API usage:', {
        provider: aiResponse.provider,
        model: aiResponse.model,
        tokens: aiResponse.usage.total_tokens,
      })

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
        console.log('[chatbotFlow] ✅ Usage logged successfully')
      } catch (usageError) {
        console.error('[chatbotFlow] ❌ Failed to log usage:', usageError)
        // Não quebrar o fluxo por erro de logging
      }
    } else {
      console.warn('[chatbotFlow] ⚠️ No usage data to log')
    }

    // 🔧 Human Handoff configurável: Se desabilitado, ignora tool calls de transferência
    if (config.settings.enableHumanHandoff && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const hasHumanHandoff = aiResponse.toolCalls.some(
        (tool) => tool.function.name === 'transferir_atendimento'
      )

      if (hasHumanHandoff) {
        console.log('[chatbotFlow] ✅ Human handoff tool called - initiating transfer')
        await handleHumanHandoff({
          phone: parsedMessage.phone,
          customerName: parsedMessage.name,
          config, // 🔐 Passa config com notificationEmail
        })
        logger.finishExecution('success')
        return { success: true, handedOff: true }
      }
    } else if (!config.settings.enableHumanHandoff && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      console.log('[chatbotFlow] ⚠️ Human handoff disabled by client config - ignoring tool call')
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
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    })

    // NODE 12: Format Response (configurável)
    logger.logNodeStart('12. Format Response', { contentLength: aiResponse.content.length })
    let formattedMessages: string[]
    
    if (config.settings.messageSplitEnabled) {
      console.log('[chatbotFlow] ✅ Message split enabled - formatting into multiple messages')
      formattedMessages = formatResponse(aiResponse.content)
      logger.logNodeSuccess('12. Format Response', { 
        messageCount: formattedMessages.length,
        messages: formattedMessages.map((msg, idx) => `[${idx + 1}]: ${msg.substring(0, 100)}...`)
      })
    } else {
      console.log('[chatbotFlow] ⚠️ Message split disabled - sending as single message')
      formattedMessages = [aiResponse.content]
      logger.logNodeSuccess('12. Format Response', { 
        messageCount: 1,
        messages: [`[1]: ${aiResponse.content.substring(0, 100)}...`]
      })
    }

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
