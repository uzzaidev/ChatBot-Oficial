import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { Message, MessageType } from "@/lib/types";
import { cleanMessageContent } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEBUG_PREFIX = "[Messages API Debug]";

const VALID_MESSAGE_TYPES = new Set<MessageType>([
  "text",
  "audio",
  "image",
  "document",
  "video",
  "interactive",
  "sticker",
  "reaction",
]);

interface RouteParams {
  params: Promise<{
    phone: string;
  }>;
}

const asMetadataRecord = (
  metadata: Message["metadata"],
): Record<string, unknown> => {
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : {};
};

const parseJsonColumn = (value: unknown): any => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const hasMediaMetadata = (msg: Message): boolean => {
  const metadata = asMetadataRecord(msg.metadata);
  return Boolean(metadata.media);
};

const isBusinessAppContextHeavy = (msg: Message): boolean => {
  const metadata = asMetadataRecord(msg.metadata);
  if (
    metadata.source !== "business_app" &&
    metadata.source !== "history_sync"
  ) {
    return false;
  }

  return (
    msg.content.includes("[Imagem] Descricao:") ||
    (msg.content.includes("[Documento:") && msg.content.includes("Conteudo:"))
  );
};

const getMessageScore = (msg: Message): number => {
  const metadata = asMetadataRecord(msg.metadata);
  let score = 0;

  if (msg.type === "interactive") score += 100;
  if (hasMediaMetadata(msg)) score += 40;
  if (msg.transcription) score += 20;
  if (msg.audio_duration_seconds) score += 5;
  if (metadata.error_details) score += 4;
  if (metadata.reactions) score += 4;
  if (metadata.wamid) score += 3;
  if (metadata.source) score += 2;
  if (msg.content.trim().length > 0) score += 1;
  score += Object.keys(metadata).length;

  if (isBusinessAppContextHeavy(msg)) {
    score -= 10;
  }

  return score;
};

const summarizeMessage = (msg: Message) => {
  const metadata = asMetadataRecord(msg.metadata);
  return {
    id: msg.id,
    type: msg.type,
    direction: msg.direction,
    status: msg.status,
    source: metadata.source,
    hasMedia: Boolean(metadata.media),
    hasTranscription: Boolean(msg.transcription),
    contentPreview: msg.content.substring(0, 80),
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = await params;
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "phone e obrigatorio" },
        { status: 400 },
      );
    }

    const [historiesResult, messagesResult] = await Promise.all([
      query<any>(
        `SELECT id, session_id, message, media_metadata, wamid, status, error_details, updated_at, created_at, transcription, audio_duration_seconds
         FROM n8n_chat_histories
         WHERE session_id = $1
         AND client_id = $2
         ORDER BY created_at DESC`,
        [phone, clientId],
      ),
      query<any>(
        `SELECT id, client_id, conversation_id, phone, content, type, direction, status, metadata, "timestamp", transcription, audio_duration_seconds
         FROM messages
         WHERE phone = $1
         AND client_id = $2
         ORDER BY "timestamp" DESC NULLS LAST`,
        [phone, clientId],
      ),
    ]);

    const historyRows = (historiesResult.rows || []).reverse();
    const messageRows = messagesResult.rows || [];

    const n8nMessages: Message[] = historyRows
      .map((row: any, index: number) => {
        const messageData = parseJsonColumn(row.message) || {
          type: "ai",
          content: row.message,
        };

        if (messageData.type === "system") {
          return null;
        }

        const mediaMetadata = parseJsonColumn(row.media_metadata);
        const source =
          typeof messageData.additional_kwargs?.source === "string"
            ? messageData.additional_kwargs.source
            : null;
        const rawContent =
          typeof messageData.additional_kwargs?.dashboard_content === "string"
            ? messageData.additional_kwargs.dashboard_content
            : messageData.content || "";
        const cleanedContent = cleanMessageContent(rawContent);
        const metadata: Record<string, unknown> = {};

        if (mediaMetadata) {
          metadata.media = mediaMetadata;
          console.log(DEBUG_PREFIX, "n8n media row", {
            rowId: row.id,
            wamid: row.wamid,
            media: mediaMetadata,
          });
        }
        if (row.wamid) {
          metadata.wamid = row.wamid;
        }
        if (source) {
          metadata.source = source;
        }
        if (row.error_details) {
          metadata.error_details = row.error_details;
        }
        if (row.updated_at) {
          metadata.status_updated_at = row.updated_at;
        }
        if (messageData.metadata?.reactions) {
          metadata.reactions = messageData.metadata.reactions;
        }

        const rawMsgType = mediaMetadata?.type || "text";
        const msgType: MessageType = VALID_MESSAGE_TYPES.has(
          rawMsgType as MessageType,
        )
          ? (rawMsgType as MessageType)
          : "text";

        return {
          id: row.id?.toString() || `msg-${index}`,
          client_id: clientId,
          conversation_id: String(phone),
          phone: String(phone),
          name: messageData.type === "human" ? "Cliente" : "Bot",
          content: cleanedContent,
          type: msgType,
          direction:
            messageData.type === "human"
              ? ("incoming" as const)
              : ("outgoing" as const),
          status: (row.status || "sent") as Message["status"],
          timestamp: row.created_at || new Date().toISOString(),
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          transcription: row.transcription || null,
          audio_duration_seconds: row.audio_duration_seconds || null,
        };
      })
      .filter(Boolean) as Message[];

    const savedMessages: Message[] = messageRows
      .map((row: any, index: number) => {
        const metadata = parseJsonColumn(row.metadata);
        const metadataRecord =
          metadata && typeof metadata === "object"
            ? (metadata as Record<string, unknown>)
            : null;

        const msgType: MessageType = (() => {
          if (metadataRecord?.interactive) {
            return "interactive";
          }
          if (row.type && VALID_MESSAGE_TYPES.has(row.type as MessageType)) {
            return row.type as MessageType;
          }
          return "text";
        })();

        const direction: Message["direction"] =
          row.direction === "incoming" ? "incoming" : "outgoing";
        const isDuplicableIncomingText =
          direction === "incoming" &&
          msgType === "text" &&
          !(
            metadataRecord?.interactive_response_id || metadataRecord?.interactive
          );

        if (isDuplicableIncomingText) {
          return null;
        }

        return {
          id: row.id?.toString() || `saved-${index}`,
          client_id: row.client_id || clientId,
          conversation_id: String(row.conversation_id || phone),
          phone: String(row.phone || phone),
          name: direction === "incoming" ? "Cliente" : "Bot",
          content: cleanMessageContent(row.content || ""),
          type: msgType,
          direction,
          status: (row.status || "sent") as Message["status"],
          timestamp: row.timestamp || new Date().toISOString(),
          metadata: metadataRecord,
          transcription: row.transcription || null,
          audio_duration_seconds: row.audio_duration_seconds || null,
        };
      })
      .filter(Boolean) as Message[];

    const combined = [...n8nMessages, ...savedMessages];
    const getWamid = (msg: Message): string | null => {
      const raw = asMetadataRecord(msg.metadata).wamid;
      return typeof raw === "string" && raw.length > 0 ? raw : null;
    };

    const preferMessage = (current: Message, incoming: Message): Message => {
      if (current.type !== "interactive" && incoming.type === "interactive") {
        return incoming;
      }
      if (current.type === "interactive" && incoming.type !== "interactive") {
        return current;
      }

      const currentScore = getMessageScore(current);
      const incomingScore = getMessageScore(incoming);
      if (incomingScore > currentScore) return incoming;
      if (currentScore > incomingScore) return current;

      return current;
    };

    const byKey = new Map<string, Message>();
    for (const msg of combined) {
      const wamid = getWamid(msg);
      const key = wamid ? `wamid:${wamid}` : `id:${msg.id}`;
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, msg);
        continue;
      }

      const preferred = preferMessage(existing, msg);
      console.log(DEBUG_PREFIX, "Dedup decision", {
        key,
        winner: preferred === existing ? "existing" : "incoming",
        existing: summarizeMessage(existing),
        incoming: summarizeMessage(msg),
      });
      byKey.set(key, preferred);
    }

    const messages = Array.from(byKey.values()).sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    console.log(
      DEBUG_PREFIX,
      "Final response media rows",
      messages
        .filter((msg) => hasMediaMetadata(msg))
        .map((msg) => ({
          id: msg.id,
          wamid: getWamid(msg),
          type: msg.type,
          media: asMetadataRecord(msg.metadata).media,
          transcription: msg.transcription,
        })),
    );

    return NextResponse.json(
      {
        messages,
        total: messages.length,
        phone,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("/api/messages error", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
