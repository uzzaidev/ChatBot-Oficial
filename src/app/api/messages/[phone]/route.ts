import { NextRequest, NextResponse } from "next/server";
import { cleanMessageContent } from "@/lib/utils";
import { query } from "@/lib/postgres";
import type { Message, MessageType } from "@/lib/types";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Valid message types
const VALID_MESSAGE_TYPES = new Set<MessageType>([
  "text",
  "audio",
  "image",
  "document",
  "video",
  "interactive",
]);

interface RouteParams {
  params: {
    phone: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = params;

    // 🔐 SECURITY: Get client_id from authenticated session, not query params
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "phone é obrigatório" },
        { status: 400 },
      );
    }

    // Debug: Query direta via PostgreSQL para comparar
    try {
      const pgResult = await query<any>(
        `SELECT COUNT(*) as count FROM n8n_chat_histories 
         WHERE session_id = $1 
         AND client_id = $2`,
        [phone, clientId],
      );
    } catch (pgError) {
    }

    // 🔐 SECURITY: Filter messages by authenticated user's client_id
    // Buscar TODAS as mensagens via PostgreSQL direto (sem limite)
    // Motivo: Supabase pode ter limites de paginação que não queremos

    const [pgMessages, pgInteractiveMessages] = await Promise.all([
      query<any>(
        `SELECT id, session_id, message, media_metadata, wamid, created_at, transcription, audio_duration_seconds
         FROM n8n_chat_histories
         WHERE session_id = $1
         AND client_id = $2
         ORDER BY created_at DESC`, // DESC: mais recentes primeiro
        [phone, clientId],
      ),
      query<any>(
        `SELECT id, conversation_id, client_id, phone, content, type, direction, status, metadata, created_at
         FROM messages
         WHERE phone = $1
         AND client_id = $2
         ORDER BY created_at DESC`,
        [phone, clientId],
      ),
    ]);

    const data = pgMessages.rows;
    const interactiveData = pgInteractiveMessages.rows;

    // Reverter ordem para exibir antigas primeiro (como esperado pela UI)
    const dataReversed = (data || []).reverse();

    // Transformar dados do n8n_chat_histories para formato Message
    const n8nMessages: Message[] = dataReversed.map(
      (item: any, index: number) => {
        // O n8n_chat_histories salva message como JSON:
        // { "type": "human" | "ai", "content": "...", "additional_kwargs": {}, "response_metadata": {} }

        let messageData: any;

        // Parse o JSON da coluna message
        if (typeof item.message === "string") {
          try {
            messageData = JSON.parse(item.message);
          } catch {
            // Fallback se não for JSON válido (mensagens antigas)
            messageData = { type: "ai", content: item.message };
          }
        } else {
          messageData = item.message || {};
        }

        // 📎 Parse media_metadata if present
        let mediaMetadata: any = null;
        if (item.media_metadata) {
          if (typeof item.media_metadata === "string") {
            try {
              mediaMetadata = JSON.parse(item.media_metadata);
            } catch {
              mediaMetadata = null;
            }
          } else {
            mediaMetadata = item.media_metadata;
          }
        }

        // Extrair type e content do JSON
        const messageType = messageData.type || "ai"; // 'human' ou 'ai'
        const messageContent = messageData.content || "";

        // Limpar tags de function calls
        const cleanedContent = cleanMessageContent(messageContent);

        // 📎 Determine message type based on media metadata with validation
        const rawMsgType = mediaMetadata?.type || "text";
        const msgType: MessageType =
          VALID_MESSAGE_TYPES.has(rawMsgType as MessageType)
            ? (rawMsgType as MessageType)
            : "text";

        // 📱 Include wamid in metadata for reactions
        const metadata: Record<string, unknown> = {};
        if (mediaMetadata) {
          metadata.media = mediaMetadata;
        }
        if (item.wamid) {
          metadata.wamid = item.wamid;
        }

        return {
          id: item.id?.toString() || `msg-${index}`,
          client_id: clientId,
          conversation_id: String(phone),
          phone: String(phone),
          name: messageType === "human" ? "Cliente" : "Bot",
          content: cleanedContent,
          type: msgType,
          direction: messageType === "human"
            ? ("incoming" as const)
            : ("outgoing" as const),
          status: "sent" as const,
          timestamp: item.created_at || new Date().toISOString(),
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          transcription: item.transcription || null,
          audio_duration_seconds: item.audio_duration_seconds || null,
        };
      },
    );

    // Mensagens persistidas diretamente na tabela messages (ex: interativos)
    const savedMessages: Message[] = (interactiveData || []).map(
      (item: any, index: number) => {
        const parsedMetadata = (() => {
          if (!item.metadata) return null;
          if (typeof item.metadata === "string") {
            try {
              return JSON.parse(item.metadata);
            } catch {
              return null;
            }
          }
          return item.metadata;
        })();

        const msgType: MessageType =
          VALID_MESSAGE_TYPES.has(item.type as MessageType)
            ? (item.type as MessageType)
            : "text";

        const metadata = parsedMetadata && typeof parsedMetadata === "object"
          ? parsedMetadata as Record<string, unknown>
          : null;

        return {
          id: item.id?.toString() || `saved-${index}`,
          client_id: item.client_id || clientId,
          conversation_id: String(item.conversation_id || phone),
          phone: String(item.phone || phone),
          name: item.direction === "incoming" ? "Cliente" : "Bot",
          content: cleanMessageContent(item.content || ""),
          type: msgType,
          direction: item.direction === "incoming"
            ? ("incoming" as const)
            : ("outgoing" as const),
          status: (item.status || "sent") as Message["status"],
          timestamp: item.timestamp || item.created_at ||
            new Date().toISOString(),
          metadata,
          transcription: item.transcription || null,
          audio_duration_seconds: item.audio_duration_seconds || null,
        };
      },
    );

    // Combinar e ordenar por timestamp
    const messages = [...n8nMessages, ...savedMessages].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return NextResponse.json({
      messages,
      total: messages.length,
      phone,
    }, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
