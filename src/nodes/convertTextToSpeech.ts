// src/nodes/convertTextToSpeech.ts
import OpenAI from "openai";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase-server";
import { checkBudgetAvailable } from "@/lib/unified-tracking";
import { elevenLabsTTS } from "@/lib/elevenlabs";

export interface ConvertTextToSpeechInput {
  text: string;
  clientId: string;
  conversationId?: string; // ✨ FASE 7: Added for unified tracking
  phone?: string; // ✨ FASE 7: Added for tracking (optional, defaults to 'system')
  voice?: string;
  speed?: number;
  model?: string; // 'tts-1' | 'tts-1-hd' | 'eleven_monolingual_v1' | 'eleven_multilingual_v1' | 'eleven_turbo_v2' | etc
  language?: string; // ISO code, ex: 'pt', 'en', 'es', etc
  useCache?: boolean;
  provider?: string; // 'openai' (default) ou 'elevenlabs'
}

export interface ConvertTextToSpeechOutput {
  audioBuffer: Buffer;
  format: "mp3";
  fromCache: boolean;
  durationSeconds: number;
}

export const convertTextToSpeech = async (
  input: ConvertTextToSpeechInput,
): Promise<ConvertTextToSpeechOutput> => {
  const {
    text,
    clientId,
    conversationId, // ✨ FASE 7: For unified tracking
    phone = "system", // ✨ FASE 7: Default to 'system' for non-conversation TTS
    voice = "alloy",
    speed = 1.0,
    model = "tts-1-hd",
    useCache = true,
    provider = "openai",
  } = input;

  // Validação: máximo 5000 caracteres
  if (text.length > 5000) {
    throw new Error("Text too long for TTS (max 5000 chars)");
  }

  if (text.length === 0) {
    throw new Error("Text is empty, cannot generate audio");
  }

  // Criar cliente Supabase uma única vez
  const supabase = await createServerClient();

  // 1. Verificar cache
  if (useCache) {
    const textHash = crypto
      .createHash("md5")
      .update(`${text}_${voice}_${speed}`)
      .digest("hex");

    const { data: cached } = await supabase
      .from("tts_cache")
      .select("audio_url, duration_seconds")
      .eq("client_id", clientId)
      .eq("text_hash", textHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      // Cache hit! Atualizar contador (fire-and-forget)
      supabase.rpc("increment_tts_cache_hit", { cache_text_hash: textHash })
        .then();

      // Download áudio do cache
      const response = await fetch(cached.audio_url);
      if (!response.ok) {
        // Failed to fetch from cache, generating new audio
      } else {
        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // 🚀 FASE 7: Log cache hit to unified tracking
        const { logGatewayUsage } = await import(
          "@/lib/ai-gateway/usage-tracking"
        );
        await logGatewayUsage({
          clientId,
          conversationId: conversationId || undefined,
          phone,
          provider: provider as "openai" | "elevenlabs",
          modelName: model,
          inputTokens: 0,
          outputTokens: Math.ceil(text.length / 4), // Estimate tokens for TTS
          cachedTokens: 0, // TTS doesn't have token caching, but this is cache hit
          latencyMs: 0, // Retrieved from cache
          wasCached: true, // TTS cache hit
          wasFallback: false,
          metadata: {
            apiType: "tts",
            textLength: text.length,
            audioSizeBytes: audioBuffer.length,
            durationSeconds: cached.duration_seconds || 0,
            voice,
            speed,
            fromCache: true,
          },
        }).catch((err) => {
          console.error("[TTS] Failed to log cache hit:", err);
        });

        return {
          audioBuffer,
          format: "mp3",
          fromCache: true,
          durationSeconds: cached.duration_seconds || 0,
        };
      }
    }
  }

  // 💰 FASE 1: Budget Enforcement - Check before API call
  const budgetAvailable = await checkBudgetAvailable(clientId);
  if (!budgetAvailable) {
    throw new Error(
      "❌ Limite de budget atingido. Geração de áudio bloqueada.",
    );
  }

  let audioBuffer: Buffer;
  let durationSeconds = 0;
  let usedProvider: import("@/lib/unified-tracking").Provider =
    provider as import("@/lib/unified-tracking").Provider;

  if (provider === "elevenlabs") {
    // ElevenLabs API Key do .env
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY in environment");
    const selectedModel = model || "eleven_multilingual_v1";
    const selectedLanguage = input.language || "pt";
    console.log(
      `[TTS] Usando ElevenLabs | voice: ${voice} | model: ${selectedModel} | language: ${selectedLanguage}`,
    );
    audioBuffer = await elevenLabsTTS({
      text,
      voice,
      speed,
      model: selectedModel,
      language: selectedLanguage,
      apiKey,
    });
    // Estimar duração (aprox. 150 palavras/minuto)
    const wordCount = text.split(/\s+/).length;
    durationSeconds = Math.ceil((wordCount / 2.5) / speed);
    usedProvider = "elevenlabs" as import("@/lib/unified-tracking").Provider;
  } else {
    // 🔐 FIX: ALWAYS use client-specific Vault credentials
    // This ensures multi-tenant isolation - each client uses their OWN API key
    const { getClientOpenAIKey } = await import("@/lib/vault");
    const clientKey = await getClientOpenAIKey(clientId);

    if (!clientKey) {
      throw new Error(
        `[TTS] No OpenAI API key configured in Vault for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      );
    }

    console.log("[TTS] Using client-specific OpenAI key from Vault", {
      clientId,
      keyPrefix: clientKey.substring(0, 10) + "...",
    });

    const finalOpenaiKey = clientKey;

    // 3. Gerar novo áudio via OpenAI TTS
    const openai = new OpenAI({
      apiKey: finalOpenaiKey,
    });

    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

    const validModels = ["tts-1", "tts-1-hd"];
    const selectedModel = validModels.includes(model) ? model : "tts-1-hd";

    const mp3Response = await openai.audio.speech.create({
      model: selectedModel,
      voice: selectedVoice as
        | "alloy"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
        | "shimmer",
      input: text,
      speed: speed,
      response_format: "mp3",
    });

    audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
    // Estimar duração (aproximado: 150 palavras/minuto = 2.5 palavras/segundo)
    const wordCount = text.split(/\s+/).length;
    durationSeconds = Math.ceil((wordCount / 2.5) / speed);
    usedProvider = "openai" as import("@/lib/unified-tracking").Provider;
  }

  // 4. Salvar no cache
  if (useCache) {
    const textHash = crypto
      .createHash("md5")
      .update(`${text}_${voice}_${speed}_${provider}`)
      .digest("hex");

    const fileName = `tts/${clientId}/${textHash}.mp3`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("tts-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
        cacheControl: "31536000", // 1 ano
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("tts-audio")
        .getPublicUrl(fileName);

      await supabase.from("tts_cache").upsert({
        client_id: clientId,
        text_hash: textHash,
        audio_url: publicUrl,
        provider: usedProvider,
        voice,
        duration_seconds: durationSeconds,
        file_size_bytes: audioBuffer.length,
        hit_count: 0,
      });
    } else {
      // Failed to cache audio - non-critical error
    }
  }

  // 🚀 FASE 7: Unified tracking in gateway_usage_logs
  let costUSD = 0;
  let modelName = model;

  if (usedProvider === "openai") {
    modelName = model;
    // OpenAI TTS pricing:
    // - tts-1-hd: $15.00 / 1M characters
    // - tts-1: $7.50 / 1M characters
    costUSD = model === "tts-1-hd"
      ? (text.length / 1_000_000) * 15.0
      : (text.length / 1_000_000) * 7.5;
  } else if (usedProvider === "elevenlabs") {
    // ElevenLabs pricing: $0.30 / 1000 chars (Starter tier)
    // More accurate than previous $0.30/1000k (was a typo)
    costUSD = (text.length / 1000) * 0.30;
    modelName = model || "eleven_monolingual_v1";
  }

  const { logGatewayUsage } = await import("@/lib/ai-gateway/usage-tracking");
  await logGatewayUsage({
    clientId,
    conversationId: conversationId || undefined,
    phone,
    provider: usedProvider as "openai" | "elevenlabs",
    modelName,
    inputTokens: 0, // TTS doesn't consume input tokens
    outputTokens: Math.ceil(text.length / 4), // Estimate tokens for display
    cachedTokens: 0,
    latencyMs: 0, // TTS latency not tracked yet
    wasCached: false, // New generation
    wasFallback: false,
    metadata: {
      apiType: "tts",
      textLength: text.length,
      audioSizeBytes: audioBuffer.length,
      durationSeconds,
      voice,
      speed,
      provider: usedProvider,
      fromCache: false,
      costUSD, // Store calculated cost for validation
    },
  }).catch((err) => {
    console.error("[TTS] Failed to log usage:", err);
  });

  return {
    audioBuffer,
    format: "mp3",
    fromCache: false,
    durationSeconds,
  };
};
