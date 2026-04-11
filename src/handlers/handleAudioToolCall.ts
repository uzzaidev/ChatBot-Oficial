// src/handlers/handleAudioToolCall.ts
import { sendAudioMessageByMediaId, sendTextMessage } from "@/lib/meta";
import { query } from "@/lib/postgres";
import { createServerClient } from "@/lib/supabase-server";
import { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { convertTextToSpeech } from "@/nodes/convertTextToSpeech";
import { ErrorDetails, saveChatMessage } from "@/nodes/saveChatMessage";
import { uploadAudioToWhatsApp } from "@/nodes/uploadAudioToWhatsApp";

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

  const supabase = await createServerClient();

  // 1. Verificação de segurança: TTS habilitado globalmente?
  if (!config.settings?.tts_enabled) {
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
        status: "sent", // ✅ FIX: Marcar como enviado
      });

      return {
        success: true,
        sentAsAudio: false,
        error: "TTS disabled",
        messageId,
      };
    } catch (error) {
      // ❌ FIX: Save text send error as failed message in conversation
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send text";
      const errorDetails: ErrorDetails = {
        code: "TEXT_SEND_FAILED",
        title: "Falha ao Enviar Texto",
        message: `Não foi possível enviar a mensagem de texto: ${errorMessage}`,
      };

      await saveChatMessage({
        phone,
        message: aiResponseText,
        type: "ai",
        clientId,
        status: "failed",
        errorDetails,
      });

      return {
        success: false,
        sentAsAudio: false,
        error: errorMessage,
      };
    }
  }

  // 2. ENVIAR ÁUDIO com fallback robusto
  try {
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

    // 2.2 Upload para WhatsApp
    const { mediaId, expiresAt } = await uploadAudioToWhatsApp({
      audioBuffer,
      accessToken: config.apiKeys.metaAccessToken!,
      phoneNumberId: config.apiKeys.metaPhoneNumberId!,
    });

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
      const {
        data: { publicUrl },
      } = supabase.storage.from("message-media").getPublicUrl(fileName);
      permanentAudioUrl = publicUrl;
    } else {
      // Storage upload failed - non-critical, fallback will be used
    }

    // 2.4 Enviar mensagem de áudio
    const { messageId } = await sendAudioMessageByMediaId(
      phone,
      mediaId,
      config,
    );

    // 2.5 SALVAR NA TABELA n8n_chat_histories
    // Preparar media metadata no formato esperado

    // Use permanent URL if storage upload succeeded, otherwise save without media URL
    // NEVER use base64 fallback - it bloats the database with MB-sized strings
    const mediaMetadata: StoredMediaMetadata | undefined = permanentAudioUrl
      ? {
          type: "audio",
          url: permanentAudioUrl,
          mimeType: "audio/mpeg",
          filename: `audio_${Date.now()}.mp3`,
          size: audioBuffer.length,
        }
      : undefined;

    if (!permanentAudioUrl) {
      console.warn(
        "[handleAudioToolCall] Storage upload failed - saving message without media URL (audio was delivered via WhatsApp)",
      );
    }

    // Salvar mensagem usando a função padrão
    await saveChatMessage({
      phone,
      message: aiResponseText,
      type: "ai",
      clientId,
      mediaMetadata,
      wamid: messageId,
      status: "sent", // ✅ FIX: Marcar como enviado
    });

    // Atualizar campos extras (transcription e audio_duration_seconds)
    await query(
      `UPDATE n8n_chat_histories
       SET transcription = $1, audio_duration_seconds = $2
       WHERE session_id = $3 AND client_id = $4 AND wamid = $5`,
      [aiResponseText, durationSeconds, phone, clientId, messageId],
    );

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

    return { success: true, sentAsAudio: true, messageId };
  } catch (error) {
    // 3. FALLBACK: Se QUALQUER erro ao gerar/enviar áudio, envia texto

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
        status: "sent", // ✅ FIX: Marcar como enviado
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
      // ❌ FIX: Save fallback text error as failed message in conversation
      const textErrorMessage =
        textError instanceof Error
          ? textError.message
          : "Failed to send text fallback";

      const fallbackErrorDetails: ErrorDetails = {
        code: "FALLBACK_FAILED",
        title: "Falha no Fallback",
        message: `Não foi possível enviar o áudio nem o texto: ${textErrorMessage}`,
        error_data: {
          originalAudioError:
            error instanceof Error ? error.message : "Unknown audio error",
          textFallbackError: textErrorMessage,
        },
      };

      await saveChatMessage({
        phone,
        message: aiResponseText,
        type: "ai",
        clientId,
        status: "failed",
        errorDetails: fallbackErrorDetails,
      });

      return {
        success: false,
        sentAsAudio: false,
        error: textErrorMessage,
      };
    }
  }
};
