// src/handlers/handleAudioToolCall.ts
import { convertTextToSpeech } from "@/nodes/convertTextToSpeech";
import { uploadAudioToWhatsApp } from "@/nodes/uploadAudioToWhatsApp";
import { sendAudioMessageByMediaId, sendTextMessage } from "@/lib/meta";
import { createServerClient } from "@/lib/supabase-server";
import { saveChatMessage } from "@/nodes/saveChatMessage";
import { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { query } from "@/lib/postgres";

export interface HandleAudioToolCallInput {
  aiResponseText: string; // Texto gerado pelo AI (aiResponse.content)
  phone: string;
  clientId: string;
  config: ClientConfig;
}

export interface HandleAudioToolCallOutput {
  success: boolean;
  sentAsAudio: boolean;
  error?: string;
  messageId?: string;
}

export const handleAudioToolCall = async (
  input: HandleAudioToolCallInput,
): Promise<HandleAudioToolCallOutput> => {
  const { aiResponseText, phone, clientId, config } = input;

  const supabase = createServerClient();

  console.log(`[TTS] Processing audio request for ${phone}`);
  console.log(`[TTS] Text length: ${aiResponseText.length} chars`);

  // 1. Verificação de segurança: TTS habilitado globalmente?
  if (!config.settings?.tts_enabled) {
    console.log("[TTS] TTS disabled globally, sending as text fallback");

    // Envia como texto e SALVA NO BANCO
    try {
      const { messageId } = await sendTextMessage(
        phone,
        aiResponseText,
        config,
      );

      // ✅ SALVAR no banco
      await saveChatMessage({
        phone,
        message: aiResponseText,
        type: "ai",
        clientId,
        wamid: messageId,
      });

      console.log(`[TTS] Text sent and saved (TTS disabled): ${messageId}`);

      return {
        success: true,
        sentAsAudio: false,
        error: "TTS disabled",
        messageId,
      };
    } catch (error) {
      console.error("[TTS] Error sending text:", error);
      return {
        success: false,
        sentAsAudio: false,
        error: error instanceof Error ? error.message : "Failed to send text",
      };
    }
  }

  // 2. ENVIAR ÁUDIO com fallback robusto
  try {
    console.log("[TTS] Attempting to generate and send audio");

    // 2.1 Converter para áudio
    const { audioBuffer, format, fromCache, durationSeconds } =
      await convertTextToSpeech({
        text: aiResponseText,
        clientId,
        voice: config.settings?.tts_voice || "alloy",
        speed: config.settings?.tts_speed || 1.0,
        model: config.settings?.tts_model || "tts-1-hd",
        useCache: true,
      });

    console.log(
      `[TTS] Audio generated (${audioBuffer.length} bytes, from cache: ${fromCache})`,
    );

    // 2.2 Upload para WhatsApp
    const { mediaId, expiresAt } = await uploadAudioToWhatsApp({
      audioBuffer,
      accessToken: config.apiKeys.metaAccessToken!,
      phoneNumberId: config.apiKeys.metaPhoneNumberId!,
    });

    console.log(`[TTS] Audio uploaded to WhatsApp: ${mediaId}`);

    // 2.3 Upload permanente para Supabase Storage (backup)
    const fileName = `audio/${clientId}/${Date.now()}.mp3`;

    const { error: storageError } = await supabase.storage
      .from("message-media")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "31536000", // 1 ano
      });

    let permanentAudioUrl: string | null = null;
    if (!storageError) {
      const { data: { publicUrl } } = supabase.storage
        .from("message-media")
        .getPublicUrl(fileName);
      permanentAudioUrl = publicUrl;
      console.log(
        `[TTS] Audio backed up to Supabase Storage: ${permanentAudioUrl}`,
      );
    } else {
      console.warn(
        "[TTS] Failed to backup audio to Supabase Storage:",
        storageError.message,
      );
    }

    // 2.4 Enviar mensagem de áudio
    const { messageId } = await sendAudioMessageByMediaId(
      phone,
      mediaId,
      config,
    );

    console.log(
      `[TTS] Audio message sent successfully! Message ID: ${messageId}`,
    );

    // 2.5 SALVAR NA TABELA n8n_chat_histories
    // Preparar media metadata no formato esperado
    const mediaMetadata: StoredMediaMetadata = {
      type: "audio",
      url: permanentAudioUrl || `whatsapp://media/${mediaId}`,
      mimeType: "audio/mpeg",
      filename: `audio_${Date.now()}.mp3`,
      size: audioBuffer.length,
    };

    // Salvar mensagem usando a função padrão
    await saveChatMessage({
      phone,
      message: aiResponseText,
      type: "ai",
      clientId,
      mediaMetadata,
      wamid: messageId,
    });

    // Atualizar campos extras (transcription e audio_duration_seconds)
    await query(
      `UPDATE n8n_chat_histories
       SET transcription = $1, audio_duration_seconds = $2
       WHERE session_id = $3 AND client_id = $4 AND wamid = $5`,
      [aiResponseText, durationSeconds, phone, clientId, messageId],
    );

    console.log(`[TTS] Audio message saved to database`);

    // 2.6 Atualizar última mensagem da conversa
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("phone", phone)
      .eq("client_id", clientId)
      .single();

    if (conversation) {
      await supabase
        .from("conversations")
        .update({
          last_message: `🎙️ Áudio (${durationSeconds}s)`,
          last_update: new Date().toISOString(),
        })
        .eq("id", conversation.id);
    }

    console.log(`[TTS] Conversation updated`);

    return { success: true, sentAsAudio: true, messageId };
  } catch (error) {
    // 3. FALLBACK: Se QUALQUER erro ao gerar/enviar áudio, envia texto
    console.error(
      "[TTS] Error generating/sending audio, falling back to text:",
      error,
    );

    // Log failure
    await supabase.from("tts_usage_logs").insert({
      client_id: clientId,
      phone,
      event_type: "fallback",
      text_length: aiResponseText.length,
      from_cache: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    try {
      const { messageId } = await sendTextMessage(
        phone,
        aiResponseText,
        config,
      );

      // Salvar como mensagem de texto em n8n_chat_histories
      await saveChatMessage({
        phone,
        message: aiResponseText,
        type: "ai",
        clientId,
        wamid: messageId,
      });

      // Atualizar última mensagem da conversa
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("phone", phone)
        .eq("client_id", clientId)
        .single();

      if (conversation) {
        await supabase
          .from("conversations")
          .update({
            last_message: aiResponseText.substring(0, 50),
            last_update: new Date().toISOString(),
          })
          .eq("id", conversation.id);
      }

      return {
        success: true,
        sentAsAudio: false,
        error: error instanceof Error ? error.message : "Unknown error",
        messageId,
      };
    } catch (textError) {
      return {
        success: false,
        sentAsAudio: false,
        error: textError instanceof Error
          ? textError.message
          : "Failed to send text fallback",
      };
    }
  }
};
