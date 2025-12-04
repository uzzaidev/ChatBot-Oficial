// src/handlers/handleAudioToolCall.ts
import { convertTextToSpeech } from "@/nodes/convertTextToSpeech";
import { uploadAudioToWhatsApp } from "@/nodes/uploadAudioToWhatsApp";
import { sendAudioMessageByMediaId, sendTextMessage } from "@/lib/meta";
import { createServerClient } from "@/lib/supabase-server";
import { saveChatMessage } from "@/nodes/saveChatMessage";
import { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { query } from "@/lib/postgres";

export interface HandleAudioToolCallInput {
  texto_para_audio: string;
  perguntar_antes?: boolean;
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
  const { texto_para_audio, perguntar_antes, phone, clientId, config } = input;

  const supabase = createServerClient();

  // 1. Verificação de segurança: TTS habilitado globalmente?
  if (!config.settings?.tts_enabled) {
    console.log("[TTS] Disabled globally, sending as text instead");

    // Envia como texto
    try {
      const { messageId } = await sendTextMessage(
        phone,
        texto_para_audio,
        config,
      );
      return {
        success: true,
        sentAsAudio: false,
        error: "TTS disabled",
        messageId,
      };
    } catch (error) {
      return {
        success: false,
        sentAsAudio: false,
        error: error instanceof Error ? error.message : "Failed to send text",
      };
    }
  }

  // 2. Verificar preferência do cliente WhatsApp
  const { data: customer } = await supabase
    .from("clientes_whatsapp")
    .select("audio_preference")
    .eq("telefone", phone)
    .eq("client_id", clientId)
    .single();

  // Se cliente não quer áudio, envia texto
  if (customer?.audio_preference === "never") {
    console.log('[TTS] Customer preference is "never", sending as text');

    try {
      const { messageId } = await sendTextMessage(
        phone,
        texto_para_audio,
        config,
      );
      return { success: true, sentAsAudio: false, messageId };
    } catch (error) {
      return {
        success: false,
        sentAsAudio: false,
        error: error instanceof Error ? error.message : "Failed to send text",
      };
    }
  }

  // 3. Se deve perguntar antes, envia pergunta primeiro
  // TODO: Implementar state machine para aguardar resposta
  // Por enquanto, se perguntar_antes=true, envia texto
  if (perguntar_antes && customer?.audio_preference === "ask") {
    console.log("[TTS] perguntar_antes=true, asking customer first");

    try {
      await sendTextMessage(
        phone,
        'Quer que eu explique isso por áudio? Responda "sim" ou "não".',
        config,
      );
      // Por enquanto, envia texto após perguntar
      const { messageId } = await sendTextMessage(
        phone,
        texto_para_audio,
        config,
      );
      return { success: true, sentAsAudio: false, messageId };
    } catch (error) {
      return {
        success: false,
        sentAsAudio: false,
        error: error instanceof Error ? error.message : "Failed to send text",
      };
    }
  }

  // 4. ENVIAR ÁUDIO com fallback robusto
  try {
    console.log("[TTS] Attempting to generate and send audio");

    // 4.1 Converter para áudio
    const { audioBuffer, format, fromCache, durationSeconds } =
      await convertTextToSpeech({
        text: texto_para_audio,
        clientId,
        voice: config.settings?.tts_voice || "alloy",
        speed: config.settings?.tts_speed || 1.0,
        useCache: true,
      });

    console.log(
      `[TTS] Audio generated (${audioBuffer.length} bytes, from cache: ${fromCache})`,
    );

    // 4.2 Upload para WhatsApp
    const { mediaId, expiresAt } = await uploadAudioToWhatsApp({
      audioBuffer,
      accessToken: config.apiKeys.metaAccessToken!,
      phoneNumberId: config.apiKeys.metaPhoneNumberId!,
    });

    console.log(`[TTS] Audio uploaded to WhatsApp: ${mediaId}`);

    // 4.2.1 Upload permanente para Supabase Storage (backup)
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

    // 4.3 Enviar mensagem de áudio
    const { messageId } = await sendAudioMessageByMediaId(
      phone,
      mediaId,
      config,
    );

    console.log(
      `[TTS] Audio message sent successfully! Message ID: ${messageId}`,
    );

    // 4.4 SALVAR NA TABELA n8n_chat_histories
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
      message: texto_para_audio,
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
      [texto_para_audio, durationSeconds, phone, clientId, messageId],
    );

    // 4.5 Atualizar última mensagem da conversa
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

    // 4.6 Atualizar timestamp de último áudio
    await supabase
      .from("clientes_whatsapp")
      .update({ last_audio_response_at: new Date().toISOString() })
      .eq("telefone", phone)
      .eq("client_id", clientId);

    return { success: true, sentAsAudio: true, messageId };
  } catch (error) {
    // FALLBACK: Se QUALQUER erro, envia texto
    console.error(
      "[TTS] Error generating/sending audio, falling back to text:",
      error,
    );

    // Log failure
    await supabase.from("tts_usage_logs").insert({
      client_id: clientId,
      phone,
      event_type: "fallback",
      text_length: texto_para_audio.length,
      from_cache: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    try {
      const { messageId } = await sendTextMessage(
        phone,
        texto_para_audio,
        config,
      );

      // Salvar como mensagem de texto em n8n_chat_histories
      await saveChatMessage({
        phone,
        message: texto_para_audio,
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
            last_message: texto_para_audio.substring(0, 50),
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
