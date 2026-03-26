import { processChatbotMessage } from "@/flows/chatbotFlow";
import { handleUnknownWABA } from "@/lib/auto-provision";
import { query } from "@/lib/postgres";
import { uploadFileToStorage } from "@/lib/storage";
import type { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientByWABAId } from "@/lib/waba-lookup";
import { analyzeDocument } from "@/nodes/analyzeDocument";
import { analyzeImage } from "@/nodes/analyzeImage";
import { downloadMetaMedia } from "@/nodes/downloadMetaMedia";
import { transcribeAudio } from "@/nodes/transcribeAudio";
import { updateMessageReaction } from "@/nodes/updateMessageReaction";
import { processStatusUpdate } from "@/nodes/updateMessageStatus";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "image/heic": "heic",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const MESSAGE_TABLE_TYPES = new Set([
  "audio",
  "document",
  "image",
  "interactive",
  "text",
  "video",
]);

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    const verifyToken = process.env.META_PLATFORM_VERIFY_TOKEN;

    console.log("[Webhook GET] Verification request received", {
      timestamp,
      mode,
      hasToken: Boolean(token),
      hasChallenge: Boolean(challenge),
    });

    if (!verifyToken) {
      console.error(
        "[Webhook GET] META_PLATFORM_VERIFY_TOKEN is not configured",
      );
      return new NextResponse("Server configuration error", { status: 500 });
    }

    if (mode === "subscribe" && token === verifyToken) {
      return new NextResponse(challenge, { status: 200 });
    }

    console.warn("[Webhook GET] Verification failed", {
      mode,
      tokenMatches: token === verifyToken,
    });
    return new NextResponse("Forbidden", { status: 403 });
  } catch (error) {
    console.error("[Webhook GET] Error", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log("[Webhook POST] Request received", { timestamp });

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!signature) {
      console.warn("[Webhook POST] Missing signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 403 });
    }

    if (!validateHMAC(rawBody, signature)) {
      console.warn("[Webhook POST] Invalid HMAC signature", {
        hasAppSecret: Boolean(process.env.META_PLATFORM_APP_SECRET),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const field = change?.field;

    console.log("[Webhook POST] Payload summary", {
      entryId: entry?.id,
      field,
      messages: value?.messages?.length ?? 0,
      statuses: value?.statuses?.length ?? 0,
      echoes: value?.message_echoes?.length ?? 0,
    });

    const wabaId = extractWABAId(body);
    if (!wabaId) {
      console.warn("[Webhook POST] Missing WABA ID in payload");
      return NextResponse.json({ error: "Missing WABA ID" }, { status: 400 });
    }

    const config = await getClientByWABAId(wabaId);
    if (!config) {
      console.warn("[Webhook POST] Unknown WABA, delegating to auto-provision", {
        wabaId,
      });
      await handleUnknownWABA(wabaId, body);
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    console.log("[Webhook POST] Client resolved", {
      clientId: config.id,
      name: config.name,
      field,
    });

    if (field === "smb_message_echoes") {
      try {
        await processSMBEcho(body, config);
        console.log("[Webhook POST] SMB echoes processed");
      } catch (echoError) {
        console.error("[Webhook POST] SMB echo error", echoError);
      }
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    try {
      const statuses = value?.statuses;
      if (statuses && statuses.length > 0) {
        console.log("[Webhook POST] Processing status updates", {
          clientId: config.id,
          count: statuses.length,
        });

        for (const statusUpdate of statuses) {
          try {
            await processStatusUpdate({
              statusUpdate,
              clientId: config.id,
            });
          } catch (statusError) {
            console.error("[Webhook POST] Status update failed", {
              clientId: config.id,
              wamid: statusUpdate?.id,
              status: statusUpdate?.status,
              error: statusError,
            });
          }
        }

        return NextResponse.json(
          { status: "STATUS_UPDATE_PROCESSED" },
          { status: 200 },
        );
      }
    } catch (statusError) {
      console.error("[Webhook POST] Error checking status updates", statusError);
    }

    try {
      const reactionMessage = value?.messages?.[0];
      if (
        reactionMessage?.type === "reaction" &&
        reactionMessage?.reaction?.message_id
      ) {
        const reaction = reactionMessage.reaction;
        const result = await updateMessageReaction({
          targetWamid: reaction.message_id,
          emoji: reaction.emoji || "",
          reactorPhone: reactionMessage.from,
          clientId: config.id,
        });

        if (!result.success) {
          console.warn("[Webhook POST] Reaction not applied", {
            clientId: config.id,
            targetWamid: reaction.message_id,
            error: result.error,
          });
        }

        return NextResponse.json(
          { status: "REACTION_PROCESSED" },
          { status: 200 },
        );
      }
    } catch (reactionError) {
      console.error("[Webhook POST] Error processing reaction", reactionError);
    }

    try {
      await processChatbotMessage(body, config);
      console.log("[Webhook POST] Message processed successfully");
    } catch (flowError) {
      console.error("[Webhook POST] Flow error", flowError);
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[Webhook POST] Unhandled error", error);
    return NextResponse.json(
      {
        error: "Internal error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function validateHMAC(rawBody: string, signature: string): boolean {
  try {
    const appSecret = process.env.META_PLATFORM_APP_SECRET;
    if (!appSecret) {
      console.error("[HMAC] META_PLATFORM_APP_SECRET not configured");
      return false;
    }

    const signatureHash = signature.split("sha256=")[1];
    if (!signatureHash) {
      console.warn("[HMAC] Invalid signature format", { signature });
      return false;
    }

    const expectedHash = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signatureHash);
    const expectedBuffer = Buffer.from(expectedHash);
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error("[HMAC] Validation error", error);
    return false;
  }
}

function extractWABAId(payload: any): string | null {
  try {
    return payload?.entry?.[0]?.id || null;
  } catch {
    return null;
  }
}

function getExtensionFromMimeType(
  mimeType: string | undefined,
  defaultExt: string,
): string {
  if (!mimeType) {
    return defaultExt;
  }

  const normalizedMimeType = mimeType.toLowerCase().split(";")[0].trim();
  if (MIME_TO_EXTENSION[normalizedMimeType]) {
    return MIME_TO_EXTENSION[normalizedMimeType];
  }

  const subtype = normalizedMimeType.split("/")[1]?.split("+")[0];
  if (!subtype) {
    return defaultExt;
  }

  return subtype === "jpeg" ? "jpg" : subtype;
}

function getMessageTableType(rawType?: string): string {
  if (rawType && MESSAGE_TABLE_TYPES.has(rawType)) {
    return rawType;
  }

  return "text";
}

function getStoredMediaType(rawType?: string): StoredMediaMetadata["type"] {
  switch (rawType) {
    case "audio":
      return "audio";
    case "document":
      return "document";
    case "sticker":
      return "sticker";
    case "video":
      return "video";
    default:
      return "image";
  }
}

function getDefaultMimeType(type?: string): string {
  switch (type) {
    case "audio":
      return "audio/ogg";
    case "document":
      return "application/pdf";
    case "image":
      return "image/jpeg";
    case "sticker":
      return "image/webp";
    case "video":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function getSMBEchoFallbackContent(echo: any): string {
  return (
    echo.text?.body ||
    echo.image?.caption ||
    echo.document?.caption ||
    echo.video?.caption ||
    (echo.type === "image"
      ? "[Imagem enviada pelo Business App]"
      : echo.type === "audio"
        ? "[Audio enviado pelo Business App]"
        : echo.type === "document"
          ? "[Documento enviado pelo Business App]"
          : echo.type === "video"
            ? "[Video enviado pelo Business App]"
            : echo.type === "sticker"
              ? "[Sticker enviado pelo Business App]"
              : `[${echo.type || "mensagem"} enviada pelo Business App]`)
  );
}

function parseWebhookTimestamp(rawTimestamp?: string): string {
  if (!rawTimestamp) {
    return new Date().toISOString();
  }

  const parsedTimestamp = Number.parseInt(rawTimestamp, 10);
  if (Number.isNaN(parsedTimestamp)) {
    return new Date().toISOString();
  }

  const timestampMs =
    parsedTimestamp > 9_999_999_999 ? parsedTimestamp : parsedTimestamp * 1000;
  return new Date(timestampMs).toISOString();
}

async function buildSMBEchoPayload(input: {
  config: ClientConfig;
  echo: any;
  phone: string;
  conversationId: string | null;
}): Promise<{
  dashboardContent: string;
  historyContent: string;
  mediaMetadata?: StoredMediaMetadata;
  transcription: string | null;
  audioDurationSeconds: number | null;
}> {
  const { config, echo, phone, conversationId } = input;
  const fallbackContent = getSMBEchoFallbackContent(echo);
  const mediaDescriptor =
    echo?.type && typeof echo.type === "string" ? echo[echo.type] : null;

  if (!mediaDescriptor?.id) {
    const textContent = echo.text?.body || fallbackContent;
    return {
      dashboardContent: textContent,
      historyContent: textContent,
      transcription: null,
      audioDurationSeconds: null,
    };
  }

  let dashboardContent =
    echo.text?.body ||
    echo.image?.caption ||
    echo.document?.caption ||
    echo.video?.caption ||
    "";
  let historyContent = dashboardContent || fallbackContent;
  let mediaMetadata: StoredMediaMetadata | undefined;
  let transcription: string | null = null;
  let audioDurationSeconds: number | null = null;

  try {
    const mimeType =
      mediaDescriptor.mime_type ||
      mediaDescriptor.mimeType ||
      getDefaultMimeType(echo.type);
    const extension = getExtensionFromMimeType(
      mimeType,
      echo.type === "sticker" ? "webp" : "bin",
    );
    const filename =
      mediaDescriptor.filename ||
      `${echo.type || "media"}_${phone}_${Date.now()}.${extension}`;

    const buffer = await downloadMetaMedia(
      mediaDescriptor.id,
      config.apiKeys.metaAccessToken,
    );
    const publicUrl = await uploadFileToStorage(
      buffer,
      filename,
      mimeType,
      config.id,
    );

    mediaMetadata = {
      type: getStoredMediaType(echo.type),
      url: publicUrl,
      mimeType,
      filename,
      size: buffer.length,
    };

    if (echo.type === "audio") {
      const transcriptionResult = await transcribeAudio(
        buffer,
        config.apiKeys.openaiApiKey,
        config.id,
        phone,
      );
      transcription = transcriptionResult.text;
      audioDurationSeconds = transcriptionResult.durationSeconds || null;
      dashboardContent = transcriptionResult.text || fallbackContent;
      historyContent = transcriptionResult.text || fallbackContent;
    } else if (echo.type === "image") {
      const imageAnalysis = await analyzeImage(
        buffer,
        mimeType,
        config.apiKeys.openaiApiKey,
        config.id,
        phone,
        conversationId || undefined,
      );
      const caption = echo.image?.caption?.trim() || "";
      dashboardContent = caption;
      historyContent = caption
        ? `[Imagem] Descricao: ${imageAnalysis.text}\nLegenda do usuario: ${caption}`
        : `[Imagem] Descricao: ${imageAnalysis.text}`;
    } else if (echo.type === "document") {
      const documentSummary = await analyzeDocument(
        buffer,
        mimeType,
        filename,
        config.apiKeys.openaiApiKey,
        config.id,
        phone,
        conversationId || undefined,
      );
      const caption = echo.document?.caption?.trim() || "";
      const dashboardDocumentContent = caption
        ? `[Documento: ${filename}] ${caption}`
        : `[Documento: ${filename}]`;
      dashboardContent = dashboardDocumentContent;
      historyContent = caption
        ? `[Documento: ${filename}] Conteudo: ${documentSummary.content}\nLegenda do usuario: ${caption}`
        : `[Documento: ${filename}] Conteudo: ${documentSummary.content}`;
    } else if (echo.type === "video") {
      dashboardContent = echo.video?.caption?.trim() || "";
      historyContent = dashboardContent || fallbackContent;
    } else if (echo.type === "sticker") {
      dashboardContent = "";
      historyContent = "[Sticker enviado]";
    }
  } catch (mediaError) {
    console.error("[SMB Echo] Media processing failed, using fallback", {
      phone,
      type: echo.type,
      wamid: echo.id,
      error: mediaError,
    });
    dashboardContent = fallbackContent;
    historyContent = fallbackContent;
  }

  return {
    dashboardContent,
    historyContent,
    mediaMetadata,
    transcription,
    audioDurationSeconds,
  };
}

async function processSMBEcho(
  body: any,
  config: ClientConfig,
): Promise<void> {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const echoes = value?.message_echoes;

  if (!echoes || echoes.length === 0) {
    console.log("[SMB Echo] No message_echoes found");
    return;
  }

  const supabase = createServiceRoleClient() as any;

  for (const echo of echoes) {
    const customerPhone = echo.to || value?.contacts?.[0]?.wa_id || null;
    if (!customerPhone) {
      console.warn("[SMB Echo] Could not determine recipient phone");
      continue;
    }

    const wamid = echo.id || null;
    const timestamp = parseWebhookTimestamp(echo.timestamp);

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", config.id)
      .eq("phone", customerPhone)
      .maybeSingle();

    const {
      dashboardContent,
      historyContent,
      mediaMetadata,
      transcription,
      audioDurationSeconds,
    } = await buildSMBEchoPayload({
      config,
      echo,
      phone: customerPhone,
      conversationId: conversation?.id || null,
    });

    const messageMetadata = {
      source: "business_app",
      wamid,
      ...(mediaMetadata ? { media: mediaMetadata } : {}),
    };

    console.log("[SMB Echo] Persisting echo", {
      clientId: config.id,
      phone: customerPhone,
      type: echo.type,
      wamid,
      hasMedia: Boolean(mediaMetadata),
      hasTranscription: Boolean(transcription),
    });

    try {
      await query(
        `INSERT INTO messages (
          client_id,
          conversation_id,
          phone,
          content,
          type,
          direction,
          status,
          "timestamp",
          metadata,
          transcription,
          audio_duration_seconds
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
        [
          config.id,
          conversation?.id || null,
          customerPhone,
          dashboardContent,
          getMessageTableType(echo.type),
          "outgoing",
          "sent",
          timestamp,
          JSON.stringify(messageMetadata),
          transcription,
          audioDurationSeconds,
        ],
      );
    } catch (messageError) {
      console.error("[SMB Echo] Failed to insert into messages", messageError);
    }

    try {
      await query(
        `INSERT INTO n8n_chat_histories (
          session_id,
          message,
          client_id,
          media_metadata,
          wamid,
          transcription,
          audio_duration_seconds,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, NOW(), NOW())`,
        [
          customerPhone,
          JSON.stringify({
            type: "ai",
            content: historyContent,
            additional_kwargs: {
              source: "business_app",
              dashboard_content: dashboardContent,
            },
          }),
          config.id,
          mediaMetadata ? JSON.stringify(mediaMetadata) : null,
          wamid,
          transcription,
          audioDurationSeconds,
          "sent",
        ],
      );
    } catch (historyError) {
      console.error(
        "[SMB Echo] Failed to insert into n8n_chat_histories",
        historyError,
      );
    }
  }
}
