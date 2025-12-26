import {
  ClientConfig,
  ParsedMessage,
  StoredMediaMetadata,
  WhatsAppWebhookPayload,
} from "@/lib/types";
import { filterStatusUpdates } from "@/nodes/filterStatusUpdates";
import { parseMessage } from "@/nodes/parseMessage";
import { checkHumanHandoffStatus } from "@/nodes/checkHumanHandoffStatus";
import { checkOrCreateCustomer } from "@/nodes/checkOrCreateCustomer";
import { downloadMetaMedia } from "@/nodes/downloadMetaMedia";
import { transcribeAudio } from "@/nodes/transcribeAudio";
import { analyzeImage } from "@/nodes/analyzeImage";
import { analyzeDocument } from "@/nodes/analyzeDocument";
import { normalizeMessage } from "@/nodes/normalizeMessage";
import { pushToRedis } from "@/nodes/pushToRedis";
import { batchMessages } from "@/nodes/batchMessages";
import { getChatHistory } from "@/nodes/getChatHistory";
import { getRAGContext } from "@/nodes/getRAGContext";
import { generateAIResponse } from "@/nodes/generateAIResponse";
import { formatResponse } from "@/nodes/formatResponse";
import { sendWhatsAppMessage } from "@/nodes/sendWhatsAppMessage";
import { handleHumanHandoff } from "@/nodes/handleHumanHandoff";
import { saveChatMessage } from "@/nodes/saveChatMessage";
// 🔧 Phase 1-3: Configuration-driven nodes
import { checkContinuity } from "@/nodes/checkContinuity";
import { classifyIntent } from "@/nodes/classifyIntent";
import { detectRepetition } from "@/nodes/detectRepetition";
// 🔄 Phase 4: Interactive Flows
import { checkInteractiveFlow } from "@/nodes/checkInteractiveFlow";
import { createExecutionLogger } from "@/lib/logger";
import { setWithExpiry } from "@/lib/redis";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  logGroqUsage,
  logOpenAIUsage,
  logWhisperUsage,
} from "@/lib/usageTracking";
// 🔄 Flow synchronization - Option 4 (Hybrid)
import { getAllNodeStates, shouldExecuteNode } from "@/lib/flowHelpers";
// 📎 Media storage for displaying real files in conversations
import { uploadFileToStorage } from "@/lib/storage";

export interface ChatbotFlowResult {
  success: boolean;
  messagesSent?: number;
  handedOff?: boolean;
  sentAsAudio?: boolean;
  error?: string;
}

// 📎 MIME type to file extension mapping
const MIME_TO_EXTENSION: Record<string, string> = {
  // Audio
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  // Images
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  // Documents
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

// Valid file extensions (for validation)
const VALID_EXTENSIONS = new Set([
  "ogg",
  "opus",
  "mp3",
  "m4a",
  "wav",
  "webm",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "mp4",
  "avi",
  "mov",
]);

const getExtensionFromMimeType = (
  mimeType: string,
  defaultExt: string = "bin",
): string => {
  // First try exact match from mapping
  if (MIME_TO_EXTENSION[mimeType]) {
    return MIME_TO_EXTENSION[mimeType];
  }
  // Try to extract from MIME type (e.g., 'image/jpeg' -> 'jpeg')
  const parts = mimeType.split("/");
  if (parts.length === 2) {
    // Handle cases like 'image/svg+xml' -> 'svg'
    const subtype = parts[1].split("+")[0].split(";")[0].toLowerCase();
    // Only use extracted extension if it's a known valid extension
    if (subtype && VALID_EXTENSIONS.has(subtype)) {
      return subtype;
    }
    // Special case: 'jpeg' should be 'jpg' for better compatibility
    if (subtype === "jpeg") {
      return "jpg";
    }
  }
  return defaultExt;
};

/**
 * 🔐 Processa mensagem do chatbot com configuração dinâmica do cliente
 *
 * @param payload - Payload do webhook do WhatsApp
 * @param config - Configuração do cliente (do Vault ou fallback)
 * @returns Resultado do processamento
 */
export const processChatbotMessage = async (
  payload: WhatsAppWebhookPayload,
  config: ClientConfig,
): Promise<ChatbotFlowResult> => {
  const logger = createExecutionLogger();

  const executionId = logger.startExecution({
    source: "chatbotFlow",
    payload_from: payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
  }, config.id); // ⚡ Multi-tenant: passa client_id para isolamento de logs

  try {
    // 🔄 FLOW SYNC: Fetch all node enabled states for this client
    const nodeStates = await getAllNodeStates(config.id);

    // NODE 1: Filter Status Updates (always executes - not configurable)
    logger.logNodeStart("1. Filter Status Updates", payload);
    const filteredPayload = filterStatusUpdates(payload);
    if (!filteredPayload) {
      logger.logNodeSuccess("1. Filter Status Updates", {
        filtered: true,
        reason: "Status update",
      });
      logger.finishExecution("success");
      return { success: true };
    }
    logger.logNodeSuccess("1. Filter Status Updates", { filtered: false });

    // NODE 2: Parse Message
    logger.logNodeStart("2. Parse Message", filteredPayload);
    const parsedMessage = parseMessage(filteredPayload);
    logger.logNodeSuccess("2. Parse Message", {
      phone: parsedMessage.phone,
      type: parsedMessage.type,
    });

    // NODE 3: Check/Create Customer
    logger.logNodeStart("3. Check/Create Customer", {
      phone: parsedMessage.phone,
      name: parsedMessage.name,
    });
    const customer = await checkOrCreateCustomer({
      phone: parsedMessage.phone,
      name: parsedMessage.name,
      clientId: config.id, // 🔐 Multi-tenant: Associa customer ao cliente
    });
    logger.logNodeSuccess("3. Check/Create Customer", {
      status: customer.status,
    });

    // ✨ FASE 8: Fetch conversation ID early for unified tracking across all APIs
    const supabase = createServiceRoleClient() as any;
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", config.id)
      .eq("phone", parsedMessage.phone)
      .maybeSingle();

    // ═════════════════════════════════════════════════════════════════
    // 🚦 PHASE 4: STATUS-BASED ROUTING (CRITICAL - EXECUTES FIRST)
    // ═════════════════════════════════════════════════════════════════
    console.log(`📊 [chatbotFlow] Contact status: ${customer.status}`);

    // ROUTE 1: Flow Interativo Ativo (maximum priority)
    if (customer.status === "fluxo_inicial") {
      console.log(
        "🔄 [chatbotFlow] Contact in interactive flow - processing via FlowExecutor",
      );
      logger.logNodeStart("3.1. Route to Interactive Flow", {
        status: customer.status,
      });

      // Save initial user message BEFORE starting flow (if it's the first message)
      // Interactive replies are saved by FlowExecutor.continueFlow()
      if (parsedMessage.type !== "interactive") {
        // Save to n8n_chat_histories (for AI context)
        await saveChatMessage({
          clientId: config.id,
          phone: parsedMessage.phone,
          message: parsedMessage.content,
          type: "user",
        });

        // Also save to messages table (for frontend display)
        const supabase = createServiceRoleClient() as any;
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_id", config.id)
          .eq("phone", parsedMessage.phone)
          .maybeSingle();

        await supabase.from("messages").insert({
          client_id: config.id,
          conversation_id: conversation?.id,
          phone: parsedMessage.phone,
          content: parsedMessage.content,
          type: "text",
          direction: "incoming",
          status: "sent",
          timestamp: new Date().toISOString(),
        });
      }

      // Check interactive flow
      const flowResult = await checkInteractiveFlow({
        clientId: config.id,
        phone: parsedMessage.phone,
        content: parsedMessage.content,
        isInteractiveReply: parsedMessage.type === "interactive",
        interactiveResponseId: parsedMessage.interactiveResponseId,
      });

      if (flowResult.flowExecuted) {
        logger.logNodeSuccess("3.1. Route to Interactive Flow", {
          flowExecuted: true,
          flowName: flowResult.flowName,
        });
        logger.finishExecution("success");
        return { success: true };
      }

      // If flow wasn't executed (edge case), log warning and continue to AI
      console.warn(
        "⚠️ [chatbotFlow] Status is fluxo_inicial but flow was not executed",
      );
      logger.logNodeSuccess("3.1. Route to Interactive Flow", {
        flowExecuted: false,
        continuingToAI: true,
      });
    }

    // ROUTE 2: Atendimento Humano (human/transferred status)
    // Note: This is now handled by checkHumanHandoffStatus (NODE 6)
    // but we keep this comment for clarity about the routing logic
    // Status 'humano' or 'transferido' will be caught by NODE 6

    // ROUTE 3: Bot/IA (status === 'bot' OR new contact)
    // Continue to normal pipeline below
    console.log("🤖 [chatbotFlow] Processing via bot/IA pipeline");

    // NODE 4: Process Media (audio/image/document) - configurable
    // 🔧 IMPORTANT: Process media BEFORE checking human handoff status
    // This ensures that when a conversation is with a human, the audio/image/PDF
    // transcription is still available for the human attendant to see
    let processedContent: string | undefined;
    // 📎 Track media metadata for displaying real files in conversation
    let mediaMetadata: StoredMediaMetadata | undefined;

    const shouldProcessMedia = shouldExecuteNode("process_media", nodeStates);

    if (
      shouldProcessMedia &&
      (parsedMessage.type === "audio" || parsedMessage.type === "image" ||
        parsedMessage.type === "document") &&
      parsedMessage.metadata?.id
    ) {
      logger.logNodeStart("4. Process Media", { type: parsedMessage.type });

      if (parsedMessage.type === "audio" && parsedMessage.metadata?.id) {
        const audioBuffer = await downloadMetaMedia(
          parsedMessage.metadata.id,
          config.apiKeys.metaAccessToken,
        );
        logger.logNodeSuccess("4a. Download Audio", {
          size: audioBuffer.length,
        });

        // 📎 Upload audio to Supabase Storage
        try {
          const mimeType = parsedMessage.metadata.mimeType || "audio/ogg";
          const extension = getExtensionFromMimeType(mimeType, "ogg");
          const filename =
            `audio_${parsedMessage.phone}_${Date.now()}.${extension}`;
          const mediaUrl = await uploadFileToStorage(
            audioBuffer,
            filename,
            mimeType,
            config.id,
          );
          mediaMetadata = {
            type: "audio",
            url: mediaUrl,
            mimeType,
            filename,
            size: audioBuffer.length,
          };
          logger.logNodeSuccess("4a.1. Upload Audio to Storage", {
            url: mediaUrl,
          });
        } catch (uploadError) {
          // Failed to upload audio to storage - non-critical, continue processing
        }

        const transcriptionResult = await transcribeAudio(
          audioBuffer,
          config.apiKeys.openaiApiKey,
          config.id,
          parsedMessage.phone,
        );
        processedContent = transcriptionResult.text;
        logger.logNodeSuccess("4b. Transcribe Audio", {
          transcription: processedContent.substring(0, 100),
        });

        // 📊 Registrar uso de Whisper
        try {
          await logWhisperUsage(
            config.id,
            undefined,
            parsedMessage.phone,
            transcriptionResult.durationSeconds || 0,
            transcriptionResult.usage.total_tokens,
          );
        } catch (usageError) {
          // Failed to log Whisper usage - non-critical
        }
      } else if (parsedMessage.type === "image" && parsedMessage.metadata?.id) {
        const imageBuffer = await downloadMetaMedia(
          parsedMessage.metadata.id,
          config.apiKeys.metaAccessToken,
        );
        logger.logNodeSuccess("4a. Download Image", {
          size: imageBuffer.length,
        });

        // 📎 Upload image to Supabase Storage
        try {
          const mimeType = parsedMessage.metadata.mimeType || "image/jpeg";
          const extension = getExtensionFromMimeType(mimeType, "jpg");
          const filename =
            `image_${parsedMessage.phone}_${Date.now()}.${extension}`;
          const mediaUrl = await uploadFileToStorage(
            imageBuffer,
            filename,
            mimeType,
            config.id,
          );
          mediaMetadata = {
            type: "image",
            url: mediaUrl,
            mimeType,
            filename,
            size: imageBuffer.length,
          };
          logger.logNodeSuccess("4a.1. Upload Image to Storage", {
            url: mediaUrl,
          });
        } catch (uploadError) {
          // Failed to upload image to storage - non-critical
        }

        const visionResult = await analyzeImage(
          imageBuffer,
          parsedMessage.metadata.mimeType || "image/jpeg",
          config.apiKeys.openaiApiKey,
          config.id,
          parsedMessage.phone,
          conversation?.id, // ✨ FASE 8: Pass conversation ID
        );

        // Passar apenas a descrição da IA (a legenda será adicionada pelo normalizeMessage)
        processedContent = visionResult.text;

        logger.logNodeSuccess("4b. Analyze Image", {
          description: processedContent.substring(0, 100),
        });

        // 📊 Registrar uso de GPT-4o Vision
        try {
          await logOpenAIUsage(
            config.id,
            undefined,
            parsedMessage.phone,
            visionResult.model,
            visionResult.usage,
          );
        } catch (usageError) {
          // Failed to log Vision usage - non-critical
        }
      } else if (
        parsedMessage.type === "document" && parsedMessage.metadata?.id
      ) {
        const documentBuffer = await downloadMetaMedia(
          parsedMessage.metadata.id,
          config.apiKeys.metaAccessToken,
        );
        logger.logNodeSuccess("4a. Download Document", {
          size: documentBuffer.length,
          filename: parsedMessage.metadata.filename,
        });

        // 📎 Upload document to Supabase Storage
        try {
          const filename = parsedMessage.metadata.filename ||
            `document_${parsedMessage.phone}_${Date.now()}.pdf`;
          const mediaUrl = await uploadFileToStorage(
            documentBuffer,
            filename,
            parsedMessage.metadata.mimeType || "application/pdf",
            config.id,
          );
          mediaMetadata = {
            type: "document",
            url: mediaUrl,
            mimeType: parsedMessage.metadata.mimeType || "application/pdf",
            filename,
            size: documentBuffer.length,
          };
          logger.logNodeSuccess("4a.1. Upload Document to Storage", {
            url: mediaUrl,
          });
        } catch (uploadError) {
          // Failed to upload document to storage - non-critical
        }

        const documentResult = await analyzeDocument(
          documentBuffer,
          parsedMessage.metadata.mimeType,
          parsedMessage.metadata.filename,
          config.apiKeys.openaiApiKey,
          config.id,
          parsedMessage.phone,
          conversation?.id, // ✨ FASE 8: Pass conversation ID
        );

        processedContent = documentResult.content;

        logger.logNodeSuccess("4b. Analyze Document", {
          summary: processedContent.substring(0, 100),
        });

        // 📊 Registrar uso de GPT-4o PDF (se houver usage data)
        if (documentResult.usage && documentResult.model) {
          try {
            await logOpenAIUsage(
              config.id,
              undefined,
              parsedMessage.phone,
              documentResult.model,
              documentResult.usage,
            );
          } catch (usageError) {
            // Failed to log PDF usage - non-critical
          }
        }
      }
    } else if (!shouldProcessMedia) {
      logger.logNodeSuccess("4. Process Media", {
        skipped: true,
        reason: "node disabled",
      });
    } else {
      logger.logNodeSuccess("4. Process Media", {
        skipped: true,
        reason: "text message",
      });
    }

    // NODE 5: Normalize Message
    logger.logNodeStart("5. Normalize Message", {
      parsedMessage,
      processedContent,
    });
    const normalizedMessage = normalizeMessage({
      parsedMessage,
      processedContent,
    });
    logger.logNodeSuccess("5. Normalize Message", {
      content: normalizedMessage.content,
    });

    // NODE 6: Check Human Handoff Status
    // 🔧 Moved AFTER media processing so that human attendants can see
    // audio transcriptions, image descriptions, and PDF summaries
    logger.logNodeStart("6. Check Human Handoff Status", {
      phone: parsedMessage.phone,
    });
    const handoffCheck = await checkHumanHandoffStatus({
      phone: parsedMessage.phone,
      clientId: config.id,
    });
    logger.logNodeSuccess("6. Check Human Handoff Status", handoffCheck);

    // Se está em atendimento humano, salva mensagem (com transcrição) e para o bot
    if (handoffCheck.skipBot) {
      // NODE 6.1: Bot Processing Skipped (but message is saved WITH transcription)
      logger.logNodeSuccess("6.1. Bot Processing Skipped", {
        reason: handoffCheck.reason,
        status: handoffCheck.customerStatus,
        messageWillBeSaved: true,
        messageHasTranscription: !!processedContent,
        botWillNotRespond: true,
      });

      // Para imagens, salvar uma versão simplificada no histórico
      let messageForHistory = normalizedMessage.content;
      if (parsedMessage.type === "image") {
        messageForHistory =
          parsedMessage.content && parsedMessage.content.trim().length > 0
            ? `[Imagem recebida] ${parsedMessage.content}`
            : "[Imagem recebida]";
      }

      // Salvar mensagem do usuário no histórico (agora COM transcrição/descrição)
      // 📎 Include media metadata for displaying real files in conversation
      // 📱 Include wamid for WhatsApp message reactions
      await saveChatMessage({
        phone: parsedMessage.phone,
        message: messageForHistory,
        type: "user",
        clientId: config.id,
        mediaMetadata,
        wamid: parsedMessage.messageId, // Store WhatsApp message ID for reactions
      });

      logger.finishExecution("success");
      return {
        success: true,
      };
    }

    // NODE 7: Push to Redis (configurable)
    if (shouldExecuteNode("push_to_redis", nodeStates)) {
      logger.logNodeStart("7. Push to Redis", normalizedMessage);

      try {
        await pushToRedis(normalizedMessage);
        logger.logNodeSuccess("7. Push to Redis", { success: true });

        // Update debounce timestamp (resets the 10s timer)
        const debounceKey = `debounce:${parsedMessage.phone}`;
        await setWithExpiry(debounceKey, String(Date.now()), 15); // 15s TTL (buffer above 10s delay)
      } catch (redisError) {
        logger.logNodeError("7. Push to Redis", redisError);
        // Continua mesmo com erro Redis (graceful degradation)
      }
    } else {
      logger.logNodeSuccess("7. Push to Redis", {
        skipped: true,
        reason: "node disabled",
      });
    }

    // NODE 8: Save User Message
    logger.logNodeStart("8. Save Chat Message (User)", {
      phone: parsedMessage.phone,
      type: "user",
    });

    // Para imagens, salvar uma versão simplificada no histórico
    let messageForHistory = normalizedMessage.content;
    if (parsedMessage.type === "image") {
      messageForHistory =
        parsedMessage.content && parsedMessage.content.trim().length > 0
          ? `[Imagem recebida] ${parsedMessage.content}`
          : "[Imagem recebida]";
    }

    // 📎 Include media metadata for displaying real files in conversation
    // 📱 Include wamid for WhatsApp message reactions
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: messageForHistory,
      type: "user",
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
      mediaMetadata,
      wamid: parsedMessage.messageId, // Store WhatsApp message ID for reactions
    });
    logger.logNodeSuccess("8. Save Chat Message (User)", { saved: true });

    // NODE 9: Batch Messages (configurable - can be disabled)
    let batchedContent: string;

    if (
      shouldExecuteNode("batch_messages", nodeStates) &&
      config.settings.messageSplitEnabled
    ) {
      logger.logNodeStart("9. Batch Messages", { phone: parsedMessage.phone });
      batchedContent = await batchMessages(parsedMessage.phone, config.id);
      logger.logNodeSuccess("9. Batch Messages", {
        contentLength: batchedContent?.length || 0,
      });
    } else {
      const reason = !shouldExecuteNode("batch_messages", nodeStates)
        ? "node disabled"
        : "config disabled";
      logger.logNodeSuccess("9. Batch Messages", { skipped: true, reason });
      batchedContent = normalizedMessage.content;
    }

    if (!batchedContent || batchedContent.trim().length === 0) {
      logger.finishExecution("success");
      return { success: true };
    }

    // ═════════════════════════════════════════════════════════════════
    // 🚀 NODE 9.5: FAST TRACK ROUTER (Optional - Cache-Friendly FAQ Detection)
    // ═════════════════════════════════════════════════════════════════
    let fastTrackResult: any = null;
    let isFastTrack = false;

    if (shouldExecuteNode("fast_track_router", nodeStates)) {
      logger.logNodeStart("9.5. Fast Track Router", {
        messageLength: batchedContent.length,
      });

      const { fastTrackRouter } = await import("@/nodes/fastTrackRouter");
      fastTrackResult = await fastTrackRouter({
        clientId: config.id,
        phone: parsedMessage.phone,
        message: batchedContent,
      });

      isFastTrack = fastTrackResult.shouldFastTrack;

      logger.logNodeSuccess("9.5. Fast Track Router", {
        shouldFastTrack: fastTrackResult.shouldFastTrack,
        reason: fastTrackResult.reason,
        topic: fastTrackResult.topic,
        similarity: fastTrackResult.similarity,
        matchedCanonical: fastTrackResult.matchedCanonical,
        matchedExample: fastTrackResult.matchedExample,
        matchedKeyword: fastTrackResult.matchedKeyword,
        catalogSize: fastTrackResult.catalogSize,
        routerModel: fastTrackResult.routerModel,
      });
    } else {
      logger.logNodeSuccess("9.5. Fast Track Router", {
        skipped: true,
        reason: "node disabled",
      });
    }

    // ═════════════════════════════════════════════════════════════════
    // 🚀 NODE 15: CHECK INTERACTIVE FLOW (Phase 4)
    // ═════════════════════════════════════════════════════════════════
    // REMOVED: Triggers are no longer checked here
    // Flows are ONLY executed when status is already 'fluxo_inicial'
    // Status must be manually set to 'fluxo_inicial' to enter a flow

    // NODE 10 & 11: Get Chat History + RAG Context (configurable)
    // 🚀 Fast Track: Skip if in fast track mode
    let chatHistory2: any[] = [];
    let ragContext: string = "";

    // Check if we should fetch chat history
    const shouldGetHistory = shouldExecuteNode("get_chat_history", nodeStates) &&
      !isFastTrack; // Skip if fast track

    if (shouldGetHistory) {
      logger.logNodeStart("10. Get Chat History", {
        phone: parsedMessage.phone,
      });
    } else if (isFastTrack) {
      logger.logNodeSuccess("10. Get Chat History", {
        skipped: true,
        reason: "fast_track",
      });
    }

    // Check if we should fetch RAG context
    const shouldGetRAG = shouldExecuteNode("get_rag_context", nodeStates) &&
      config.settings.enableRAG &&
      !isFastTrack; // Skip if fast track

    if (shouldGetRAG && isFastTrack) {
      logger.logNodeSuccess("11. Get RAG Context", {
        skipped: true,
        reason: "fast_track",
      });
    }

    if (shouldGetHistory || shouldGetRAG) {
      if (shouldGetHistory && shouldGetRAG) {
        // Both enabled - fetch in parallel
        logger.logNodeStart("11. Get RAG Context", {
          queryLength: batchedContent.length,
        });

        const [historyResult, rag] = await Promise.all([
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
        ]);

        chatHistory2 = historyResult.messages;
        ragContext = rag;

        // 📊 Log com estatísticas detalhadas para monitoramento do histórico
        logger.logNodeSuccess("10. Get Chat History", {
          messageCount: historyResult.stats.messageCount,
          totalPromptSize: historyResult.stats.totalPromptSize,
          maxHistoryRequested: historyResult.stats.maxHistoryRequested,
          durationMs: historyResult.stats.durationMs,
        });
        logger.logNodeSuccess("11. Get RAG Context", {
          contextLength: ragContext.length,
        });
      } else if (shouldGetHistory) {
        // Only history enabled
        const historyResult = await getChatHistory({
          phone: parsedMessage.phone,
          clientId: config.id,
          maxHistory: config.settings.maxChatHistory,
        });
        chatHistory2 = historyResult.messages;

        // 📊 Log com estatísticas detalhadas para monitoramento do histórico
        logger.logNodeSuccess("10. Get Chat History", {
          messageCount: historyResult.stats.messageCount,
          totalPromptSize: historyResult.stats.totalPromptSize,
          maxHistoryRequested: historyResult.stats.maxHistoryRequested,
          durationMs: historyResult.stats.durationMs,
        });
        logger.logNodeSuccess("11. Get RAG Context", {
          skipped: true,
          reason: "node disabled or config disabled",
        });
      } else if (shouldGetRAG) {
        // Only RAG enabled (rare case)
        logger.logNodeStart("11. Get RAG Context", {
          queryLength: batchedContent.length,
        });
        ragContext = await getRAGContext({
          query: batchedContent,
          clientId: config.id,
          openaiApiKey: config.apiKeys.openaiApiKey,
        });
        logger.logNodeSuccess("10. Get Chat History", {
          skipped: true,
          reason: "node disabled",
        });
        logger.logNodeSuccess("11. Get RAG Context", {
          contextLength: ragContext.length,
        });
      }
    } else {
      // Both disabled
      logger.logNodeSuccess("10. Get Chat History", {
        skipped: true,
        reason: "node disabled",
      });
      logger.logNodeSuccess("11. Get RAG Context", {
        skipped: true,
        reason: "node disabled or config disabled",
      });
    }

    // 🔧 Phase 1: Check Conversation Continuity (configurable)
    // 🚀 Fast Track: Skip if in fast track mode
    let continuityInfo: any;

    if (shouldExecuteNode("check_continuity", nodeStates) && !isFastTrack) {
      logger.logNodeStart("10.5. Check Continuity", {
        phone: parsedMessage.phone,
      });
      continuityInfo = await checkContinuity({
        phone: parsedMessage.phone,
        clientId: config.id,
      });
      logger.logNodeSuccess("10.5. Check Continuity", {
        isNew: continuityInfo.isNewConversation,
        hoursSince: continuityInfo.hoursSinceLastMessage,
      });
    } else {
      const skipReason = isFastTrack ? "fast_track" : "node disabled";
      logger.logNodeSuccess("10.5. Check Continuity", {
        skipped: true,
        reason: skipReason,
      });
      continuityInfo = {
        isNewConversation: false,
        hoursSinceLastMessage: 0,
        greetingInstruction: "", // No special greeting instruction
      };
    }

    // 🔧 Phase 2: Classify User Intent (configurable)
    // 🚀 Fast Track: Skip if in fast track mode
    let intentInfo: any;

    if (shouldExecuteNode("classify_intent", nodeStates) && !isFastTrack) {
      logger.logNodeStart("10.6. Classify Intent", {
        messageLength: batchedContent.length,
      });
      intentInfo = await classifyIntent({
        message: batchedContent,
        clientId: config.id,
        // groqApiKey removed - Gateway uses shared config
      });
      logger.logNodeSuccess("10.6. Classify Intent", {
        intent: intentInfo.intent,
        confidence: intentInfo.confidence,
        usedLLM: intentInfo.usedLLM,
      });
    } else {
      const skipReason = isFastTrack ? "fast_track" : "node disabled";
      logger.logNodeSuccess("10.6. Classify Intent", {
        skipped: true,
        reason: skipReason,
      });
      intentInfo = {
        intent: "outro",
        confidence: "medium",
        usedLLM: false,
      };
    }

    // NODE 12: Generate AI Response (com config do cliente + greeting instruction)
    // 🚀 Fast Track: Disable datetime and tools if in fast track mode
    // 🚀 Fast Track: Use canonical question for cache-friendly prompts
    const messageForAI = isFastTrack && fastTrackResult?.matchedCanonical
      ? fastTrackResult.matchedCanonical
      : batchedContent;

    logger.logNodeStart("12. Generate AI Response", {
      messageLength: messageForAI.length,
      historyCount: chatHistory2.length,
      fastTrack: isFastTrack,
      usedCanonical: isFastTrack && fastTrackResult?.matchedCanonical ? true : false,
      promptPreview: messageForAI.substring(0, 100) + (messageForAI.length > 100 ? "..." : ""),
      includeDateTimeInfo: !isFastTrack,
      enableTools: !isFastTrack || !fastTrackResult?.catalogSize,
      conversationId: conversation?.id || null, // ✨ FASE 8: Track conversation
    });
    const aiResponse = await generateAIResponse({
      message: messageForAI, // 🚀 Use canonical for cache hits
      chatHistory: chatHistory2,
      ragContext,
      customerName: parsedMessage.name,
      config, // 🔐 Passa config com systemPrompt e groqApiKey
      greetingInstruction: continuityInfo.greetingInstruction, // 🔧 Phase 1: Inject greeting
      includeDateTimeInfo: !isFastTrack, // 🚀 Fast Track: Disable datetime for cache
      enableTools: !isFastTrack || !fastTrackResult?.catalogSize, // 🚀 Fast Track: Disable tools for cache
      conversationId: conversation?.id, // ✨ FASE 8: Conversation ID for unified tracking
      phone: parsedMessage.phone, // ✨ FASE 8: Phone number for analytics
    });
    logger.logNodeSuccess("12. Generate AI Response", {
      contentLength: aiResponse.content?.length || 0,
      hasToolCalls: !!aiResponse.toolCalls,
      toolCount: aiResponse.toolCalls?.length || 0,
      provider: aiResponse.provider || null,
      model: aiResponse.model || null,
      requestId: aiResponse.requestId || null,
      wasCached: aiResponse.wasCached || false,
      wasFallback: aiResponse.wasFallback || false,
      fallbackReason: aiResponse.fallbackReason || null,
      primaryAttemptedProvider: aiResponse.primaryAttemptedProvider || null,
      primaryAttemptedModel: aiResponse.primaryAttemptedModel || null,
      fallbackUsedProvider: aiResponse.fallbackUsedProvider || null,
      fallbackUsedModel: aiResponse.fallbackUsedModel || null,
    });

    // If the user repeats the same message, a cached identical response is expected.
    // In those cases, we should not force variation (which breaks cache and UX).
    const normalizedCurrentMessage = batchedContent.trim();
    const lastUserMessage = [...chatHistory2]
      .reverse()
      .find(
        (msg) =>
          msg?.role === "user" &&
          typeof msg?.content === "string" &&
          msg.content.trim().length > 0,
      )?.content
      ?.trim();
    const isSameUserMessageAsLast = typeof lastUserMessage === "string" &&
      lastUserMessage.length > 0 &&
      lastUserMessage === normalizedCurrentMessage;
    const skipRepetitionDetectionReason = aiResponse.wasCached === true
      ? "cache_hit"
      : isSameUserMessageAsLast
      ? "same_user_message"
      : null;

    // 🔧 Phase 3: Detect Repetition and regenerate if needed (configurable)
    if (
      shouldExecuteNode("detect_repetition", nodeStates) &&
      aiResponse.content && aiResponse.content.trim().length > 0
    ) {
      if (skipRepetitionDetectionReason) {
        logger.logNodeSuccess("12.5. Detect Repetition", {
          skipped: true,
          reason: skipRepetitionDetectionReason,
        });
      } else {
        logger.logNodeStart("12.5. Detect Repetition", {
          responseLength: aiResponse.content.length,
        });

        const repetitionCheck = await detectRepetition({
          phone: parsedMessage.phone,
          clientId: config.id,
          proposedResponse: aiResponse.content,
        });

        logger.logNodeSuccess("12.5. Detect Repetition", {
          isRepetition: repetitionCheck.isRepetition,
          similarity: repetitionCheck.similarityScore,
        });

        if (repetitionCheck.isRepetition) {
          const originalResponse = aiResponse.content;

          // Regenerate with anti-repetition instruction
          logger.logNodeStart("12.6. Regenerate with Variation", {
            originalResponsePreview: originalResponse.substring(0, 150) + "...",
          });

          // Create a stronger variation instruction
          const variationInstruction =
            (continuityInfo.greetingInstruction || "") +
            "\n\n🔴 ALERTA CRÍTICO DE REPETIÇÃO: Você DEVE criar uma resposta COMPLETAMENTE DIFERENTE da anterior. " +
            "Sua resposta anterior foi muito similar às respostas passadas. " +
            "REQUISITOS OBRIGATÓRIOS:\n" +
            "1. Use palavras e frases DIFERENTES\n" +
            "2. Mude a ESTRUTURA da resposta (ordem das ideias, número de parágrafos)\n" +
            "3. Varie o ESTILO (mais formal/informal, mais direta/explicativa)\n" +
            "4. Se possível, aborde o assunto por um ÂNGULO DIFERENTE\n" +
            "5. NÃO copie frases ou expressões que você já usou recentemente";

          const variedResponse = await generateAIResponse({
            message: batchedContent,
            chatHistory: chatHistory2,
            ragContext,
            customerName: parsedMessage.name,
            config: {
              ...config,
              settings: {
                ...config.settings,
                temperature: Math.min(
                  1.0,
                  (config.settings.temperature || 0.7) + 0.3,
                ), // Increase temperature for more variation
              },
            },
            greetingInstruction: variationInstruction,
          });

          // Check if the regenerated response is still too similar
          const newSimilarity = await detectRepetition({
            phone: parsedMessage.phone,
            clientId: config.id,
            proposedResponse: variedResponse.content || "",
          });

          // Use the varied response
          aiResponse.content = variedResponse.content;
          aiResponse.toolCalls = variedResponse.toolCalls;

          logger.logNodeSuccess("12.6. Regenerate with Variation", {
            originalLength: originalResponse.length,
            newLength: variedResponse.content?.length || 0,
            originalPreview: originalResponse.substring(0, 100),
            newPreview: (variedResponse.content || "").substring(0, 100),
            newSimilarity: newSimilarity.similarityScore,
            stillRepetitive: newSimilarity.isRepetition,
          });

          if (newSimilarity.isRepetition) {
          } else {
          }
        } else {
        }
      }
    } else if (!shouldExecuteNode("detect_repetition", nodeStates)) {
      logger.logNodeSuccess("12.5. Detect Repetition", {
        skipped: true,
        reason: "node disabled",
      });
    }

    // 📊 Log usage to database for analytics
    if (aiResponse.usage && aiResponse.provider) {
      try {
        if (aiResponse.provider === "openai") {
          await logOpenAIUsage(
            config.id, // client_id
            undefined, // conversation_id (não temos ainda)
            parsedMessage.phone,
            aiResponse.model || "gpt-4o",
            aiResponse.usage,
          );
        } else if (aiResponse.provider === "groq") {
          await logGroqUsage(
            config.id, // client_id
            undefined, // conversation_id (não temos ainda)
            parsedMessage.phone,
            aiResponse.model || "llama-3.3-70b-versatile",
            aiResponse.usage,
          );
        }
      } catch (usageError) {
        // Failed to log usage - non-critical
      }
    } else {
    }

    // 🔧 Tool Calls Processing
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      for (const toolCall of aiResponse.toolCalls) {
        // Tool 1: transferir_atendimento
        if (
          toolCall.function.name === "transferir_atendimento" &&
          config.settings.enableHumanHandoff
        ) {
          // NODE 15: Handle Human Handoff
          logger.logNodeStart("15. Handle Human Handoff", {
            phone: parsedMessage.phone,
            customerName: parsedMessage.name,
          });
          await handleHumanHandoff({
            phone: parsedMessage.phone,
            customerName: parsedMessage.name,
            config, // 🔐 Passa config com notificationEmail
          });
          logger.logNodeSuccess("15. Handle Human Handoff", {
            transferred: true,
            emailSent: true,
            notificationEmail: config.notificationEmail,
          });
          logger.finishExecution("success");
          return { success: true, handedOff: true };
        }

        // Tool 2: buscar_documento (NEW)
        if (toolCall.function.name === "buscar_documento") {
          // NODE 15.5: Handle Document Search
          logger.logNodeStart("15.5. Handle Document Search", {
            phone: parsedMessage.phone,
            toolCallId: toolCall.id,
          });

          const { handleDocumentSearchToolCall } = await import(
            "@/nodes/handleDocumentSearchToolCall"
          );

          const documentSearchResult = await handleDocumentSearchToolCall({
            toolCall,
            phone: parsedMessage.phone,
            clientId: config.id,
            config,
          });

          logger.logNodeSuccess("15.5. Handle Document Search", {
            success: documentSearchResult.success,
            documentsFound: documentSearchResult.documentsFound,
            documentsSent: documentSearchResult.documentsSent,
            filesSent: documentSearchResult.filesSent,
          });

          // Se enviou documentos, salvar mensagem de confirmação no histórico
          if (
            documentSearchResult.documentsSent &&
            documentSearchResult.documentsSent > 0
          ) {
            const confirmationMessage = documentSearchResult.message ||
              `Documentos enviados: ${
                documentSearchResult.filesSent?.join(", ")
              }`;

            // Preparar media metadata para o primeiro arquivo enviado (para exibir no frontend)
            let mediaMetadata = undefined;
            if (
              documentSearchResult.filesMetadata &&
              documentSearchResult.filesMetadata.length > 0
            ) {
              const firstFile = documentSearchResult.filesMetadata[0];
              // Determinar tipo baseado no MIME type
              let mediaType: "image" | "audio" | "document" | "video" =
                "document";
              if (firstFile.mimeType.startsWith("image/")) {
                mediaType = "image";
              } else if (firstFile.mimeType.startsWith("audio/")) {
                mediaType = "audio";
              } else if (firstFile.mimeType.startsWith("video/")) {
                mediaType = "video";
              }

              mediaMetadata = {
                type: mediaType,
                url: firstFile.url,
                mimeType: firstFile.mimeType,
                filename: firstFile.filename,
                size: firstFile.size,
              };
            }

            // Salvar mensagem de confirmação no histórico
            await saveChatMessage({
              phone: parsedMessage.phone,
              message: confirmationMessage,
              type: "ai",
              clientId: config.id,
              mediaMetadata,
            });

            logger.finishExecution("success");
            return {
              success: true,
              messagesSent: documentSearchResult.documentsSent,
            };
          }

          // Se não encontrou ou falhou, AI response content terá a mensagem
          // Continue o fluxo normal
        }

        // Tool 3: enviar_resposta_em_audio (NEW - TTS)
        if (toolCall.function.name === "enviar_resposta_em_audio") {
          // NODE 15.7: Handle Audio Tool Call
          logger.logNodeStart("15.7. Handle Audio Tool Call (TTS)", {
            phone: parsedMessage.phone,
            toolCallId: toolCall.id,
          });

          const { handleAudioToolCall } = await import(
            "@/handlers/handleAudioToolCall"
          );

          // Parse argumentos da tool
          const args = JSON.parse(toolCall.function.arguments || "{}");
          const textoParaAudio = args.texto_para_audio || "";

          if (!textoParaAudio || textoParaAudio.trim().length === 0) {
            logger.logNodeWarning("15.7. Handle Audio Tool Call (TTS)", {
              warning:
                "No text provided in texto_para_audio argument, skipping",
              args,
            });
            continue;
          }

          const audioResult = await handleAudioToolCall({
            aiResponseText: textoParaAudio,
            phone: parsedMessage.phone,
            clientId: config.id,
            config,
          });

          logger.logNodeSuccess("15.7. Handle Audio Tool Call (TTS)", {
            success: audioResult.success,
            sentAsAudio: audioResult.sentAsAudio,
            messageId: audioResult.messageId,
          });

          // Se enviou áudio com sucesso, terminar fluxo
          if (audioResult.sentAsAudio) {
            logger.finishExecution("success");
            return {
              success: true,
              sentAsAudio: true,
              messagesSent: 1,
            };
          }

          // Se falhou mas enviou texto (fallback), terminar fluxo
          if (audioResult.success && !audioResult.sentAsAudio) {
            logger.finishExecution("success");
            return {
              success: true,
              sentAsAudio: false,
              messagesSent: 1,
            };
          }

          // Se falhou completamente, continua fluxo normal
          logger.logNodeWarning("15.7. Handle Audio Tool Call (TTS)", {
            warning: "Audio failed, continuing with normal text flow",
          });
        }
      }
    }

    if (!aiResponse.content || aiResponse.content.trim().length === 0) {
      logger.finishExecution("success");
      return { success: true, messagesSent: 0 };
    }

    // NODE 12.7: Save AI Message
    logger.logNodeStart("12.7. Save AI Message", {
      phone: parsedMessage.phone,
      contentLength: aiResponse.content.length,
    });
    await saveChatMessage({
      phone: parsedMessage.phone,
      message: aiResponse.content,
      type: "ai",
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    });
    logger.logNodeSuccess("12.7. Save AI Message", { saved: true });

    // NODE 13: Format Response (configurável)
    logger.logNodeStart("13. Format Response", {
      contentLength: aiResponse.content.length,
    });
    let formattedMessages: string[];

    if (config.settings.messageSplitEnabled) {
      formattedMessages = formatResponse(aiResponse.content);
      logger.logNodeSuccess("13. Format Response", {
        messageCount: formattedMessages.length,
        messages: formattedMessages.map((msg, idx) =>
          `[${idx + 1}]: ${msg.substring(0, 100)}...`
        ),
      });
    } else {
      formattedMessages = [aiResponse.content];
      logger.logNodeSuccess("13. Format Response", {
        messageCount: 1,
        messages: [`[1]: ${aiResponse.content.substring(0, 100)}...`],
      });
    }

    if (formattedMessages.length === 0) {
      logger.finishExecution("success");
      return { success: true, messagesSent: 0 };
    }

    // NODE 14: Send WhatsApp Message (com config do cliente)
    logger.logNodeStart("14. Send WhatsApp Message", {
      phone: parsedMessage.phone,
      messageCount: formattedMessages.length,
    });
    const messageIds = await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
      config, // 🔐 Passa config com metaAccessToken e metaPhoneNumberId
    });
    logger.logNodeSuccess("14. Send WhatsApp Message", {
      sentCount: messageIds.length,
    });

    logger.finishExecution("success");
    return { success: true, messagesSent: messageIds.length };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";

    logger.finishExecution("error");

    return {
      success: false,
      error: errorMessage,
    };
  }
};
