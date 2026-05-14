import OpenAI from "openai";
import { AIResponse, ChatMessage } from "./types";
import { checkBudgetAvailable } from "./unified-tracking";

// =====================================================
// MULTI-TENANT CREDENTIAL ISOLATION
// =====================================================
//
// ⚠️ CRITICAL: All OpenAI API calls in this file MUST use client-specific
// credentials from the Vault. NEVER use shared keys for production workloads.
//
// Use getClientOpenAIKey(clientId) from ./vault to get client's own key.
// This ensures multi-tenant isolation where each client uses THEIR OWN API key.
//
// DO NOT use process.env.OPENAI_API_KEY or shared gateway keys!
// =====================================================

/**
 * @deprecated Use getClientOpenAIKey(clientId) instead for multi-tenant isolation
 */
export const getOpenAIClient = (): OpenAI => {
  console.warn(
    "[DEPRECATED] getOpenAIClient() should not be used. " +
    "Use getClientOpenAIKey(clientId) from ./vault for multi-tenant isolation."
  );

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  return new OpenAI({ apiKey });
};

export const transcribeAudio = async (
  audioBuffer: Buffer,
  apiKey?: string,
  clientId?: string,
  phone?: string,
  conversationId?: string, // ✨ FASE 7: Added for unified tracking
): Promise<{
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  durationSeconds?: number;
}> => {
  const startTime = Date.now();

  try {
    // 🔐 FIX: ALWAYS use client-specific Vault credentials when clientId is provided
    // This ensures multi-tenant isolation - each client uses their OWN API key
    let resolvedApiKey: string;

    if (clientId) {
      // Get client's OpenAI key directly from Vault (NOT from getClientConfig which may return shared keys!)
      const { getClientOpenAIKey } = await import("./vault");
      const clientKey = await getClientOpenAIKey(clientId);

      if (!clientKey) {
        throw new Error(
          `[Whisper] No OpenAI API key configured in Vault for client ${clientId}. ` +
          `Please configure in Settings: /dashboard/settings`
        );
      }

      resolvedApiKey = clientKey;
      console.log("[Whisper] Using client-specific OpenAI key from Vault", {
        clientId,
        keyPrefix: resolvedApiKey.substring(0, 10) + "...",
      });
    } else if (apiKey) {
      // Legacy: Use provided apiKey (should be deprecated)
      resolvedApiKey = apiKey;
      console.warn("[Whisper] Using legacy apiKey parameter - consider passing clientId instead");
    } else {
      throw new Error(
        "[Whisper] clientId is required for multi-tenant API key isolation"
      );
    }

    // 💰 FASE 1: Budget Enforcement - Check before API call
    if (clientId) {
      const budgetAvailable = await checkBudgetAvailable(clientId);
      if (!budgetAvailable) {
        throw new Error(
          "❌ Limite de budget atingido. Transcrição de áudio bloqueada."
        );
      }
    }

    const client = new OpenAI({ apiKey: resolvedApiKey });

    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: "audio/ogg" });
    const transcriptionFile = new File([blob], "audio.ogg", {
      type: "audio/ogg",
    });

    const transcription = await client.audio.transcriptions.create({
      file: transcriptionFile,
      model: "whisper-1",
      language: "pt",
    });

    // Whisper cobra por minuto, não por token
    // Estimativa: áudio OGG tem ~1KB por segundo
    const estimatedDurationSeconds = Math.ceil(audioBuffer.length / 1024);

    // Whisper API não retorna tokens, mas estimamos baseado na duração
    // 1000 tokens por minuto de áudio (estimativa rough)
    const estimatedTokens = Math.ceil((estimatedDurationSeconds / 60) * 1000);

    const latencyMs = Date.now() - startTime;

    // 🚀 FASE 7: Unified tracking in gateway_usage_logs
    // Whisper pricing: $0.006 per minute
    if (clientId) {
      const { trackUnifiedUsage } = await import("@/lib/unified-tracking");
      const costUSD = (estimatedDurationSeconds / 60) * 0.006;

      await trackUnifiedUsage({
        apiType: "chat",
        clientId,
        conversationId: conversationId || undefined, // Optional - may not exist at NODE 4
        phone,
        provider: "openai",
        modelName: "whisper-1",
        inputTokens: estimatedTokens, // Estimated tokens for display
        outputTokens: 0, // Whisper is input-only
        cachedTokens: 0, // Whisper doesn't support caching
        latencyMs,
        wasCached: false,
        wasFallback: false,
        metadata: {
          apiType: "whisper",
          audioSeconds: estimatedDurationSeconds,
          audioSizeBytes: audioBuffer.length,
          costUSD, // Store actual cost for validation
        },
      }).catch((err) => {
        console.error("[Whisper] Failed to log usage:", err);
        // Continue execution even if logging fails
      });
    }

    return {
      text: transcription.text,
      usage: {
        prompt_tokens: estimatedTokens,
        completion_tokens: 0,
        total_tokens: estimatedTokens,
      },
      model: "whisper-1",
      durationSeconds: estimatedDurationSeconds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(`Failed to transcribe audio with Whisper: ${errorMessage}`);
  }
};

export const analyzeImage = async (
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  apiKey?: string,
  clientId?: string,
  phone?: string,
  conversationId?: string,
): Promise<{
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}> => {
  // Delegate to analyzeImageFromBuffer which has proper multi-tenant isolation
  return analyzeImageFromBuffer(
    imageBuffer,
    "Descreva esta imagem em detalhes. Identifique elementos importantes, texto visível, e qualquer informação relevante para uma conversa de atendimento.",
    mimeType,
    apiKey,
    clientId,
    phone,
    conversationId,
  );
};

export const analyzeImageFromBuffer = async (
  imageBuffer: Buffer,
  prompt: string,
  mimeType: string = "image/jpeg",
  apiKey?: string,
  clientId?: string,
  phone?: string,
  conversationId?: string, // ✨ FASE 8: Conversation ID for tracking
): Promise<{
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}> => {
  const startTime = Date.now();

  try {
    // 🔐 FIX: ALWAYS use client-specific Vault credentials when clientId is provided
    // This ensures multi-tenant isolation - each client uses their OWN API key
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { trackUnifiedUsage } = await import("./unified-tracking");

    // Get client's OpenAI key directly from Vault
    if (!clientId) {
      throw new Error(
        "[Vision] clientId is required for multi-tenant API key isolation"
      );
    }

    const { getClientOpenAIKey } = await import("./vault");
    const clientKey = await getClientOpenAIKey(clientId);

    if (!clientKey) {
      throw new Error(
        `[Vision] No OpenAI API key configured in Vault for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      );
    }

    console.log("[Vision] Using client-specific OpenAI key from Vault", {
      clientId,
      keyPrefix: clientKey.substring(0, 10) + "...",
    });

    // Create OpenAI provider with client's own key
    const openai = createOpenAI({
      apiKey: clientKey,
    });

    // 💰 FASE 1: Budget Enforcement - Check before API call
    const budgetAvailable = await checkBudgetAvailable(clientId);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Análise de imagem bloqueada."
      );
    }

    // Converter buffer para base64
    const base64Image = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Call OpenAI directly with client's credentials
    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              image: dataUrl,
            },
          ],
        },
      ],
      experimental_telemetry: { isEnabled: true }, // CRITICAL for usage tracking
    });

    const content = result.text;
    if (!content) {
      throw new Error("No content returned from GPT-4o Vision via Gateway");
    }

    // Capturar usage data from Gateway (includes cachedInputTokens!)
    const usage = {
      prompt_tokens: result.usage?.inputTokens || 0,
      completion_tokens: result.usage?.outputTokens || 0,
      total_tokens: result.usage?.totalTokens || 0,
    };

    const cachedInputTokens = result.usage?.cachedInputTokens || 0; // 🎯 PROMPT CACHE!
    const latencyMs = Date.now() - startTime;

    // 📊 Log to unified gateway_usage_logs with cache metrics
    if (clientId) {
      await trackUnifiedUsage({
        apiType: "chat",
        clientId,
        conversationId, // ✨ FASE 8: Track by conversation
        phone,
        provider: "openai",
        modelName: "gpt-4o",
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cachedTokens: cachedInputTokens, // 🎯 Prompt cache economizado!
        latencyMs,
        wasCached: cachedInputTokens > 0,
        wasFallback: false,
        metadata: {
          apiType: "vision",
          imageAnalysis: true,
          mimeType,
        },
      }).catch((err) => {
        console.error("[Vision] Failed to log usage:", err);
        // Continue execution even if logging fails
      });
    }

    return {
      text: content,
      usage,
      model: "gpt-4o",
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(
      `Failed to analyze image with GPT-4o Vision: ${errorMessage}`,
    );
  }
};

export const generateEmbedding = async (
  text: string,
  apiKey?: string,
  clientId?: string,
): Promise<{
  embedding: number[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}> => {
  const startTime = Date.now();

  try {
    // 🔐 FIX: ALWAYS use client-specific Vault credentials when clientId is provided
    // This ensures multi-tenant isolation - each client uses their OWN API key
    const { embed } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { trackUnifiedUsage } = await import("./unified-tracking");

    // Get client's OpenAI key directly from Vault
    if (!clientId) {
      throw new Error(
        "[Embeddings] clientId is required for multi-tenant API key isolation"
      );
    }

    const { getClientOpenAIKey } = await import("./vault");
    const clientKey = await getClientOpenAIKey(clientId);

    if (!clientKey) {
      throw new Error(
        `[Embeddings] No OpenAI API key configured in Vault for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      );
    }

    // Embeddings: using client Vault key

    // Create OpenAI provider instance with client's own key
    const openai = createOpenAI({
      apiKey: clientKey,
    });

    // 💰 FASE 1: Budget Enforcement - Check before API call
    const budgetAvailable = await checkBudgetAvailable(clientId);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Geração de embeddings bloqueada."
      );
    }

    // Call embedding model directly (Gateway doesn't support embedding wrapper yet)
    const result = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });

    const embedding = result.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error("No embedding returned from Gateway");
    }

    // Capturar usage data from Gateway
    const usage = {
      prompt_tokens: result.usage?.tokens || 0,
      completion_tokens: 0, // Embeddings não têm completion tokens
      total_tokens: result.usage?.tokens || 0,
    };

    const latencyMs = Date.now() - startTime;

    // 📊 Log to unified gateway_usage_logs
    if (clientId) {
      await trackUnifiedUsage({
        apiType: "chat",
        clientId,
        conversationId: null, // Embeddings geralmente não têm conversa
        phone: null,
        provider: "openai",
        modelName: "text-embedding-3-small",
        inputTokens: usage.prompt_tokens,
        outputTokens: 0,
        cachedTokens: 0, // Embeddings não têm cache
        latencyMs,
        wasCached: false,
        wasFallback: false,
        metadata: { apiType: "embeddings" },
      }).catch((err) => {
        console.error("[Embeddings] Failed to log usage:", err);
        // Continue execution even if logging fails
      });
    }

    return {
      embedding,
      usage,
      model: "text-embedding-3-small",
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(`Failed to generate embedding: ${errorMessage}`);
  }
};

export const extractTextFromPDF = async (
  pdfBuffer: Buffer,
): Promise<string> => {
  try {
    // 🔧 Import dinâmico: só carrega pdf-parse quando função é chamada
    // pdf-parse v1.1.0 uses function-based API with bundled pdf.js v1.9.426
    // Works in serverless environments without browser APIs like DOMMatrix
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const pdfData = await pdfParse(pdfBuffer);
    return pdfData.text;
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
};

export const summarizePDFContent = async (
  pdfText: string,
  filename?: string,
  apiKey?: string,
  clientId?: string,
  phone?: string,
  conversationId?: string, // ✨ FASE 8: Conversation ID for tracking
): Promise<{
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}> => {
  try {
    const startTime = Date.now();

    // 🔐 FIX: ALWAYS use client-specific Vault credentials when clientId is provided
    // This ensures multi-tenant isolation - each client uses their OWN API key
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { trackUnifiedUsage } = await import("./unified-tracking");

    // Get client's OpenAI key directly from Vault
    if (!clientId) {
      throw new Error(
        "[PDF Summary] clientId is required for multi-tenant API key isolation"
      );
    }

    const { getClientOpenAIKey } = await import("./vault");
    const clientKey = await getClientOpenAIKey(clientId);

    if (!clientKey) {
      throw new Error(
        `[PDF Summary] No OpenAI API key configured in Vault for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      );
    }

    console.log("[PDF Summary] Using client-specific OpenAI key from Vault", {
      clientId,
      keyPrefix: clientKey.substring(0, 10) + "...",
    });

    // Create OpenAI provider with client's own key
    const openai = createOpenAI({
      apiKey: clientKey,
    });

    // 💰 FASE 1: Budget Enforcement - Check before API call
    const budgetAvailable = await checkBudgetAvailable(clientId);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Análise de PDF bloqueada."
      );
    }

    const prompt = `Você recebeu um documento PDF${
      filename ? ` chamado "${filename}"` : ""
    }.
Analise o conteúdo e forneça um resumo detalhado em português, incluindo:
1. Tipo de documento (catálogo, contrato, relatório, etc.)
2. Principais informações e tópicos
3. Detalhes relevantes que podem ser importantes para a conversa

Conteúdo do PDF:
${pdfText.substring(0, 12000)}`; // 12k chars = ~3k tokens

    // Call OpenAI directly with client's credentials
    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      experimental_telemetry: { isEnabled: true }, // CRITICAL for usage tracking
    });

    const content = result.text;
    if (!content) {
      throw new Error("No content returned from GPT-4o via Gateway");
    }

    // Capturar usage data from Gateway (includes cachedInputTokens!)
    const usage = {
      prompt_tokens: result.usage?.inputTokens || 0,
      completion_tokens: result.usage?.outputTokens || 0,
      total_tokens: result.usage?.totalTokens || 0,
    };

    const cachedInputTokens = result.usage?.cachedInputTokens || 0; // 🎯 PROMPT CACHE!
    const latencyMs = Date.now() - startTime;

    // 📊 Log to unified gateway_usage_logs with cache metrics
    if (clientId) {
      await trackUnifiedUsage({
        apiType: "chat",
        clientId,
        conversationId, // ✨ FASE 8: Track by conversation
        phone,
        provider: "openai",
        modelName: "gpt-4o",
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cachedTokens: cachedInputTokens, // 🎯 Prompt cache economizado!
        latencyMs,
        wasCached: cachedInputTokens > 0,
        wasFallback: false,
        metadata: {
          apiType: "pdf_summary",
          filename,
          pdfLengthChars: pdfText.length,
        },
      }).catch((err) => {
        console.error("[PDF Summary] Failed to log usage:", err);
        // Continue execution even if logging fails
      });
    }

    return {
      content,
      usage,
      model: "gpt-4o",
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(`Failed to summarize PDF content: ${errorMessage}`);
  }
};

/**
 * 🔐 Gera resposta com OpenAI Chat Completion usando key dinâmica
 *
 * Similar ao generateChatCompletion do Groq, mas usando OpenAI SDK.
 * Suporta function calling e configurações personalizadas.
 *
 * @param messages - Mensagens do chat
 * @param tools - Ferramentas disponíveis (function calling)
 * @param apiKey - API key opcional (do config do cliente)
 * @param settings - Configurações opcionais (temperature, max_tokens, model)
 * @returns Resposta da IA com content, toolCalls e finished
 */