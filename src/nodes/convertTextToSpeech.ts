// src/nodes/convertTextToSpeech.ts
import OpenAI from "openai";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase-server";
import { getSecret } from "@/lib/vault";
import { trackUnifiedUsage } from "@/lib/unified-tracking";
import { getSharedGatewayConfig } from "@/lib/ai-gateway/config";

export interface ConvertTextToSpeechInput {
  text: string;
  clientId: string;
  voice?: string;
  speed?: number;
  model?: string; // 'tts-1' or 'tts-1-hd'
  useCache?: boolean;
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
    voice = "alloy",
    speed = 1.0,
    model = "tts-1-hd",
    useCache = true,
  } = input;

  // Validação: máximo 5000 caracteres
  if (text.length > 5000) {
    throw new Error("Text too long for TTS (max 5000 chars)");
  }

  if (text.length === 0) {
    throw new Error("Text is empty, cannot generate audio");
  }

  // Criar cliente Supabase uma única vez
  const supabase = createServerClient();

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

        // Log cache hit
        await supabase.from("tts_usage_logs").insert({
          client_id: clientId,
          phone: "system",
          event_type: "cached",
          text_length: text.length,
          from_cache: true,
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

  // 2. Buscar credenciais do cliente do Vault
  const { data: client } = await supabase
    .from("clients")
    .select(
      "openai_api_key_secret_id, ai_keys_mode",
    )
    .eq("id", clientId)
    .single();

  const aiKeysMode = (client?.ai_keys_mode === "byok_allowed"
    ? "byok_allowed"
    : "platform_only") as "platform_only" | "byok_allowed";

  const sharedGatewayConfig = await getSharedGatewayConfig();
  const sharedOpenaiKey = sharedGatewayConfig?.providerKeys?.openai || null;

  const byokOpenaiKey = aiKeysMode === "byok_allowed" && client?.openai_api_key_secret_id
    ? await getSecret(client.openai_api_key_secret_id)
    : null;

  const finalOpenaiKey = aiKeysMode === "byok_allowed"
    ? (byokOpenaiKey || sharedOpenaiKey)
    : sharedOpenaiKey;

  if (!finalOpenaiKey) {
    throw new Error(
      `No OpenAI API key available for TTS (client ${clientId}). ` +
        `Configure shared OpenAI key in shared_gateway_config (Vault).`,
    );
  }

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

  const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

  // Estimar duração (aproximado: 150 palavras/minuto = 2.5 palavras/segundo)
  const wordCount = text.split(/\s+/).length;
  const durationSeconds = Math.ceil((wordCount / 2.5) / speed);

  // 4. Salvar no cache
  if (useCache) {
    const textHash = crypto
      .createHash("md5")
      .update(`${text}_${voice}_${speed}`)
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
        provider: "openai",
        voice: selectedVoice,
        duration_seconds: durationSeconds,
        file_size_bytes: audioBuffer.length,
        hit_count: 0,
      });
    } else {
      // Failed to cache audio - non-critical error
    }
  }

  // 5. Log generation (legacy)
  await supabase.from("tts_usage_logs").insert({
    client_id: clientId,
    phone: "system",
    event_type: "generated",
    text_length: text.length,
    from_cache: false,
  });

  // 6. Track unified usage (new - increments budget)
  const costUSD = selectedModel === 'tts-1-hd'
    ? (text.length / 1_000_000) * 15.0  // $15/1M characters
    : (text.length / 1_000_000) * 7.5   // $7.5/1M characters

  await trackUnifiedUsage({
    clientId,
    phone: 'system',
    apiType: 'tts',
    provider: 'openai',
    modelName: selectedModel,
    characters: text.length,
    costUSD,
    latencyMs: 0,
  });

  return {
    audioBuffer,
    format: "mp3",
    fromCache: false,
    durationSeconds,
  };
};
