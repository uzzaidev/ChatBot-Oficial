// src/nodes/convertTextToSpeech.ts
import OpenAI from "openai";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase-server";

export interface ConvertTextToSpeechInput {
  text: string;
  clientId: string;
  voice?: string;
  speed?: number;
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
  const { text, clientId, voice = "alloy", speed = 1.0, useCache = true } =
    input;

  // Validação: máximo 5000 caracteres
  if (text.length > 5000) {
    throw new Error("Text too long for TTS (max 5000 chars)");
  }

  if (text.length === 0) {
    throw new Error("Text is empty, cannot generate audio");
  }

  // 1. Verificar cache
  if (useCache) {
    const textHash = crypto
      .createHash("md5")
      .update(`${text}_${voice}_${speed}`)
      .digest("hex");

    const supabase = createServerClient();

    const { data: cached } = await supabase
      .from("tts_cache")
      .select("audio_url, duration_seconds")
      .eq("client_id", clientId)
      .eq("text_hash", textHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      console.log(`[TTS] Cache hit for hash: ${textHash}`);

      // Cache hit! Atualizar contador (fire-and-forget)
      supabase.rpc("increment_tts_cache_hit", { cache_text_hash: textHash })
        .then();

      // Download áudio do cache
      const response = await fetch(cached.audio_url);
      if (!response.ok) {
        console.warn("[TTS] Failed to fetch from cache, generating new audio");
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

  // 2. Gerar novo áudio via OpenAI TTS
  console.log(`[TTS] Generating new audio for ${text.length} characters`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

  const mp3Response = await openai.audio.speech.create({
    model: "tts-1-hd",
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

  // 3. Salvar no cache
  if (useCache) {
    const supabase = createServerClient();
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

      console.log(`[TTS] Audio cached at: ${publicUrl}`);
    } else {
      console.warn("[TTS] Failed to cache audio:", uploadError.message);
    }
  }

  // Log generation
  const supabase = createServerClient();
  await supabase.from("tts_usage_logs").insert({
    client_id: clientId,
    phone: "system",
    event_type: "generated",
    text_length: text.length,
    from_cache: false,
  });

  return {
    audioBuffer,
    format: "mp3",
    fromCache: false,
    durationSeconds,
  };
};
