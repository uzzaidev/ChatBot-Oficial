import { processChatbotMessage } from "@/flows/chatbotFlow";
import { handleUnknownWABA } from "@/lib/auto-provision";
import { updateClientProvisioningStatus } from "@/lib/coexistence-sync";
import { checkDuplicateMessage, markMessageAsProcessed } from "@/lib/dedup";
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
const SKIPPED_HISTORY_MESSAGE_TYPES = new Set(["errors"]);

async function archiveMetaWebhook(input: {
  clientId?: string | null;
  wabaId?: string | null;
  field?: string | null;
  signature?: string | null;
  rawBody: string;
  payload: any;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO meta_webhook_events (
         client_id,
         waba_id,
         webhook_field,
         signature,
         raw_body,
         payload,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
       RETURNING id`,
      [
        input.clientId || null,
        input.wabaId || null,
        input.field || null,
        input.signature || null,
        input.rawBody,
        JSON.stringify(input.payload),
        JSON.stringify(input.metadata || {}),
      ],
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error("[Webhook Archive] Failed to persist raw Meta webhook", error);
    return null;
  }
}

async function updateArchivedMetaWebhook(
  archiveId: string | null,
  input: {
    clientId?: string | null;
    processingStatus: "processed" | "failed";
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!archiveId) {
    return;
  }

  try {
    await query(
      `UPDATE meta_webhook_events
       SET client_id = COALESCE($2, client_id),
           processing_status = $3,
           error_message = $4,
           metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
           processed_at = NOW()
       WHERE id = $1`,
      [
        archiveId,
        input.clientId || null,
        input.processingStatus,
        input.errorMessage || null,
        JSON.stringify(input.metadata || {}),
      ],
    );
  } catch (error) {
    console.error("[Webhook Archive] Failed to update archived Meta webhook", {
      archiveId,
      error,
    });
  }
}

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
    let archiveId: string | null = null;

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

    archiveId = await archiveMetaWebhook({
      wabaId,
      field,
      signature,
      rawBody,
      payload: body,
      metadata: {
        received_at: timestamp,
      },
    });

    const config = await getClientByWABAId(wabaId);
    if (!config) {
      console.warn("[Webhook POST] Unknown WABA, delegating to auto-provision", {
        wabaId,
      });
      try {
        await handleUnknownWABA(wabaId, body);
        await updateArchivedMetaWebhook(archiveId, {
          processingStatus: "processed",
          metadata: {
            unknown_waba: true,
          },
        });
      } catch (unknownWabaError) {
        await updateArchivedMetaWebhook(archiveId, {
          processingStatus: "failed",
          errorMessage:
            unknownWabaError instanceof Error
              ? unknownWabaError.message
              : "Unknown WABA handling failed",
          metadata: {
            unknown_waba: true,
          },
        });
        throw unknownWabaError;
      }
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    console.log("[Webhook POST] Client resolved", {
      clientId: config.id,
      name: config.name,
      field,
    });

    if (field === "history") {
      try {
        await processHistoryWebhook(body, config);
        console.log("[Webhook POST] History sync payload processed");
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "processed",
          metadata: {
            field,
          },
        });
      } catch (historyError) {
        console.error("[Webhook POST] History sync error", historyError);
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "failed",
          errorMessage:
            historyError instanceof Error
              ? historyError.message
              : "History sync processing failed",
          metadata: {
            field,
          },
        });
      }
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    if (field === "smb_app_state_sync") {
      try {
        await processStateSyncWebhook(body, config);
        console.log("[Webhook POST] Contact sync payload processed");
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "processed",
          metadata: {
            field,
          },
        });
      } catch (stateSyncError) {
        console.error("[Webhook POST] Contact sync error", stateSyncError);
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "failed",
          errorMessage:
            stateSyncError instanceof Error
              ? stateSyncError.message
              : "Contact sync processing failed",
          metadata: {
            field,
          },
        });
      }
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    if (field === "smb_message_echoes") {
      try {
        await processSMBEcho(body, config);
        console.log("[Webhook POST] SMB echoes processed");
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "processed",
          metadata: {
            field,
          },
        });
      } catch (echoError) {
        console.error("[Webhook POST] SMB echo error", echoError);
        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "failed",
          errorMessage:
            echoError instanceof Error
              ? echoError.message
              : "SMB echo processing failed",
          metadata: {
            field,
          },
        });
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

        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "processed",
          metadata: {
            field: "statuses",
            count: statuses.length,
          },
        });
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

        await updateArchivedMetaWebhook(archiveId, {
          clientId: config.id,
          processingStatus: "processed",
          metadata: {
            field: "reaction",
          },
        });
        return NextResponse.json(
          { status: "REACTION_PROCESSED" },
          { status: 200 },
        );
      }
    } catch (reactionError) {
      console.error("[Webhook POST] Error processing reaction", reactionError);
    }

    const incomingMessageId = extractIncomingMessageId(body);
    if (incomingMessageId) {
      try {
        const dedupResult = await checkDuplicateMessage(
          config.id,
          incomingMessageId,
        );

        if (dedupResult.alreadyProcessed) {
          console.log("[Webhook POST] Duplicate message ignored", {
            clientId: config.id,
            messageId: incomingMessageId,
            source: dedupResult.source,
          });
          await updateArchivedMetaWebhook(archiveId, {
            clientId: config.id,
            processingStatus: "processed",
            metadata: {
              field: field || "messages",
              duplicate: true,
              duplicate_source: dedupResult.source,
            },
          });
          return NextResponse.json(
            { status: "DUPLICATE_MESSAGE_IGNORED" },
            { status: 200 },
          );
        }

        await markMessageAsProcessed(config.id, incomingMessageId, {
          timestamp,
          from: value?.messages?.[0]?.from,
          route: "global_waba_webhook",
        });
      } catch (dedupError) {
        console.warn("[Webhook POST] Dedup failed, continuing", {
          clientId: config.id,
          messageId: incomingMessageId,
          error:
            dedupError instanceof Error ? dedupError.message : String(dedupError),
        });
      }
    }

    try {
      await processChatbotMessage(body, config);
      console.log("[Webhook POST] Message processed successfully");
      await updateArchivedMetaWebhook(archiveId, {
        clientId: config.id,
        processingStatus: "processed",
        metadata: {
          field: field || "messages",
        },
      });
    } catch (flowError) {
      console.error("[Webhook POST] Flow error", flowError);
      await updateArchivedMetaWebhook(archiveId, {
        clientId: config.id,
        processingStatus: "failed",
        errorMessage:
          flowError instanceof Error ? flowError.message : "Flow processing failed",
        metadata: {
          field: field || "messages",
        },
      });
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

function extractIncomingMessageId(payload: any): string | null {
  try {
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    return typeof message?.id === "string" && message.id.trim()
      ? message.id
      : null;
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

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).replace(/\D/g, "");
  return normalized.length > 0 ? normalized : null;
}

function mapHistoryChatStatus(
  rawStatus?: string | null,
): "pending" | "sent" | "delivered" | "read" | "failed" {
  switch ((rawStatus || "").toUpperCase()) {
    case "PENDING":
      return "pending";
    case "DELIVERED":
      return "delivered";
    case "READ":
    case "PLAYED":
      return "read";
    case "ERROR":
      return "failed";
    case "SENT":
    default:
      return "sent";
  }
}

function mapHistoryMessageTableStatus(
  rawStatus?: string | null,
): "queued" | "sent" | "delivered" | "read" | "failed" {
  switch ((rawStatus || "").toUpperCase()) {
    case "PENDING":
      return "queued";
    case "DELIVERED":
      return "delivered";
    case "READ":
    case "PLAYED":
      return "read";
    case "ERROR":
      return "failed";
    case "SENT":
    default:
      return "sent";
  }
}

function getHistoryFallbackContent(
  message: any,
  direction: "incoming" | "outgoing",
): string {
  const suffix = direction === "outgoing" ? "enviada" : "recebida";
  const filename = message.document?.filename || "Documento";

  return (
    message.text?.body ||
    message.image?.caption ||
    message.document?.caption ||
    message.video?.caption ||
    (message.type === "image"
      ? `[Imagem ${suffix}]`
      : message.type === "audio"
        ? `[Audio ${suffix}]`
        : message.type === "document"
          ? `[Documento: ${filename}]`
          : message.type === "video"
            ? `[Video ${suffix}]`
            : message.type === "sticker"
              ? `[Sticker ${suffix}]`
              : message.type === "media_placeholder"
                ? `[Midia ${suffix}]`
                : `[${message.type || "mensagem"} ${suffix}]`)
  );
}

function shouldSkipHistoryMessage(message: any): boolean {
  const rawType =
    typeof message?.type === "string" ? message.type.toLowerCase() : "";

  if (!rawType) {
    return true;
  }

  if (SKIPPED_HISTORY_MESSAGE_TYPES.has(rawType)) {
    return true;
  }

  return false;
}

async function upsertSyncedContact(input: {
  clientId: string;
  phone: string;
  name?: string | null;
  timestamp?: string | null;
  remove?: boolean;
  lastReadAt?: string | null;
}): Promise<void> {
  const { clientId, phone, name, timestamp, remove, lastReadAt } = input;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return;
  }

  if (remove) {
    await query(
      `UPDATE clientes_whatsapp
       SET nome = NULL,
           updated_at = $3
       WHERE client_id = $1
         AND telefone = $2`,
      [clientId, normalizedPhone, timestamp || new Date().toISOString()],
    );
    return;
  }

  const effectiveTimestamp = timestamp || new Date().toISOString();

  await query(
    `INSERT INTO clientes_whatsapp (
       client_id,
       telefone,
       nome,
       status,
       last_read_at,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'bot', $4, $5, $5)
     ON CONFLICT (telefone, client_id)
     DO UPDATE SET
       nome = COALESCE(EXCLUDED.nome, clientes_whatsapp.nome),
       last_read_at = CASE
         WHEN EXCLUDED.last_read_at IS NULL THEN clientes_whatsapp.last_read_at
         WHEN clientes_whatsapp.last_read_at IS NULL THEN EXCLUDED.last_read_at
         ELSE GREATEST(clientes_whatsapp.last_read_at, EXCLUDED.last_read_at)
       END,
       updated_at = GREATEST(
         COALESCE(clientes_whatsapp.updated_at, clientes_whatsapp.created_at, EXCLUDED.updated_at),
         EXCLUDED.updated_at
       )`,
    [clientId, normalizedPhone, name || null, lastReadAt || null, effectiveTimestamp],
  );
}

async function buildHistoryMediaPayload(input: {
  config: ClientConfig;
  message: any;
  phone: string;
  direction: "incoming" | "outgoing";
}): Promise<{
  dashboardContent: string;
  historyContent: string;
  mediaMetadata?: StoredMediaMetadata;
  transcription: string | null;
  audioDurationSeconds: number | null;
}> {
  const { config, message, phone, direction } = input;
  const fallbackContent = getHistoryFallbackContent(message, direction);
  const mediaDescriptor =
    message?.type && typeof message.type === "string"
      ? message[message.type]
      : null;

  if (!mediaDescriptor?.id) {
    const textContent = message.text?.body || fallbackContent;
    return {
      dashboardContent: textContent,
      historyContent: textContent,
      transcription: null,
      audioDurationSeconds: null,
    };
  }

  let dashboardContent =
    message.text?.body ||
    message.image?.caption ||
    message.document?.caption ||
    message.video?.caption ||
    "";
  let historyContent = dashboardContent || fallbackContent;
  let mediaMetadata: StoredMediaMetadata | undefined;
  let transcription: string | null = null;
  let audioDurationSeconds: number | null = null;

  try {
    const mimeType =
      mediaDescriptor.mime_type ||
      mediaDescriptor.mimeType ||
      getDefaultMimeType(message.type);
    const extension = getExtensionFromMimeType(
      mimeType,
      message.type === "sticker" ? "webp" : "bin",
    );
    const filename =
      mediaDescriptor.filename ||
      `${message.type || "media"}_${phone}_${Date.now()}.${extension}`;

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
      type: getStoredMediaType(message.type),
      url: publicUrl,
      mimeType,
      filename,
      size: buffer.length,
    };

    if (message.type === "audio") {
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
    } else if (message.type === "image") {
      const imageAnalysis = await analyzeImage(
        buffer,
        mimeType,
        config.apiKeys.openaiApiKey,
        config.id,
        phone,
      );
      const caption = message.image?.caption?.trim() || "";
      dashboardContent = caption;
      historyContent = caption
        ? `[Imagem] Descricao: ${imageAnalysis.text}\nLegenda do usuario: ${caption}`
        : `[Imagem] Descricao: ${imageAnalysis.text}`;
    } else if (message.type === "document") {
      const documentSummary = await analyzeDocument(
        buffer,
        mimeType,
        filename,
        config.apiKeys.openaiApiKey,
        config.id,
        phone,
      );
      const caption = message.document?.caption?.trim() || "";
      dashboardContent = caption
        ? `[Documento: ${filename}] ${caption}`
        : `[Documento: ${filename}]`;
      historyContent = caption
        ? `[Documento: ${filename}] Conteudo: ${documentSummary.content}\nLegenda do usuario: ${caption}`
        : `[Documento: ${filename}] Conteudo: ${documentSummary.content}`;
    } else if (message.type === "video") {
      dashboardContent = message.video?.caption?.trim() || "";
      historyContent = dashboardContent || fallbackContent;
    } else if (message.type === "sticker") {
      dashboardContent = "";
      historyContent = direction === "outgoing" ? "[Sticker enviado]" : "[Sticker recebido]";
    }
  } catch (mediaError) {
    console.error("[History Sync] Media processing failed, using fallback", {
      phone,
      type: message.type,
      wamid: message.id,
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

async function persistHistoryMessage(input: {
  config: ClientConfig;
  phone: string;
  message: any;
  direction: "incoming" | "outgoing";
  status?: string | null;
  source: "history_sync";
  phase?: number | null;
  chunkOrder?: number | null;
  progress?: number | null;
}): Promise<void> {
  const { config, phone, message, direction, status, source, phase, chunkOrder, progress } =
    input;
  const timestamp = parseWebhookTimestamp(message.timestamp);
  const wamid = typeof message.id === "string" ? message.id : null;
  const importedAsRead = source === "history_sync";
  const chatStatus = importedAsRead ? "read" : mapHistoryChatStatus(status);
  const messageTableStatus = importedAsRead
    ? "read"
    : mapHistoryMessageTableStatus(status);

  const {
    dashboardContent,
    historyContent,
    mediaMetadata,
    transcription,
    audioDurationSeconds,
  } = await buildHistoryMediaPayload({
    config,
    message,
    phone,
    direction,
  });

  const messageMetadata = {
    source,
    wamid,
    ...(mediaMetadata ? { media: mediaMetadata } : {}),
  };

  if (wamid) {
    const updated = await query(
      `UPDATE messages
       SET content = $4,
           type = $5,
           direction = $6,
           status = $7,
           "timestamp" = $8,
           metadata = $9::jsonb,
           transcription = $10,
           audio_duration_seconds = $11
       WHERE client_id = $1
         AND phone = $2
         AND metadata->>'wamid' = $3
       RETURNING id`,
        [
          config.id,
          phone,
          wamid,
          dashboardContent,
          getMessageTableType(message.type),
          direction,
          messageTableStatus,
          timestamp,
          JSON.stringify(messageMetadata),
          transcription,
        audioDurationSeconds,
      ],
    );

    if (updated.rows.length === 0) {
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
          null,
          phone,
          dashboardContent,
          getMessageTableType(message.type),
          direction,
          messageTableStatus,
          timestamp,
          JSON.stringify(messageMetadata),
          transcription,
          audioDurationSeconds,
        ],
      );
    }

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
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (client_id, wamid)
       DO UPDATE SET
         session_id = EXCLUDED.session_id,
         message = EXCLUDED.message,
         media_metadata = COALESCE(EXCLUDED.media_metadata, n8n_chat_histories.media_metadata),
         transcription = COALESCE(EXCLUDED.transcription, n8n_chat_histories.transcription),
         audio_duration_seconds = COALESCE(EXCLUDED.audio_duration_seconds, n8n_chat_histories.audio_duration_seconds),
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        phone,
        JSON.stringify({
          type: direction === "incoming" ? "human" : "ai",
          content: historyContent,
          additional_kwargs: {
            source,
            dashboard_content: dashboardContent,
            history_phase: phase ?? null,
            history_chunk_order: chunkOrder ?? null,
            history_progress: progress ?? null,
          },
        }),
        config.id,
        mediaMetadata ? JSON.stringify(mediaMetadata) : null,
        wamid,
        transcription,
        audioDurationSeconds,
        chatStatus,
        timestamp,
      ],
    );

    return;
  }

  await query(
    `INSERT INTO n8n_chat_histories (
       session_id,
       message,
       client_id,
       media_metadata,
       transcription,
       audio_duration_seconds,
       status,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $8)`,
    [
      phone,
      JSON.stringify({
        type: direction === "incoming" ? "human" : "ai",
        content: historyContent,
        additional_kwargs: {
          source,
          dashboard_content: dashboardContent,
          history_phase: phase ?? null,
          history_chunk_order: chunkOrder ?? null,
          history_progress: progress ?? null,
        },
      }),
      config.id,
      mediaMetadata ? JSON.stringify(mediaMetadata) : null,
      transcription,
      audioDurationSeconds,
      chatStatus,
      timestamp,
    ],
  );
}

async function processStateSyncWebhook(
  body: any,
  config: ClientConfig,
): Promise<void> {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const stateSync = Array.isArray(value?.state_sync) ? value.state_sync : [];

  if (stateSync.length === 0) {
    console.log("[State Sync] No contacts found in payload");
    return;
  }

  let processedContacts = 0;

  for (const item of stateSync) {
    if (item?.type !== "contact") {
      continue;
    }

    const phone = normalizePhone(item.contact?.phone_number);
    if (!phone) {
      continue;
    }

    await upsertSyncedContact({
      clientId: config.id,
      phone,
      name: item.contact?.full_name || item.contact?.first_name || null,
      timestamp: parseWebhookTimestamp(item.metadata?.timestamp),
      remove: item.action === "remove",
    });
    processedContacts += 1;
  }

  await updateClientProvisioningStatus(config.id, (current) => ({
    ...current,
    contacts_sync: {
      ...(current.contacts_sync || {}),
      status: "completed",
      completed_at:
        current.contacts_sync?.completed_at || new Date().toISOString(),
      last_webhook_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
      error_details: null,
      processed_contacts: processedContacts,
    },
  }));
}

async function processHistoryWebhook(
  body: any,
  config: ClientConfig,
): Promise<void> {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const businessPhone = normalizePhone(value?.metadata?.display_phone_number);
  const historyChunks = Array.isArray(value?.history) ? value.history : [];
  const historyMediaMessages = Array.isArray(value?.messages)
    ? value.messages
    : [];

  if (historyChunks.length === 0 && historyMediaMessages.length === 0) {
    console.log("[History Sync] Empty payload");
    return;
  }

  let lastProgress: number | null = null;
  let lastPhase: number | null = null;
  let lastChunkOrder: number | null = null;
  let processedMessages = 0;

  for (const chunk of historyChunks) {
    if (Array.isArray(chunk?.errors) && chunk.errors.length > 0) {
      const firstError = chunk.errors[0];
      const declined = firstError?.code === 2593109;

      await updateClientProvisioningStatus(config.id, (current) => ({
        ...current,
        history_sync: {
          ...(current.history_sync || {}),
          status: declined ? "declined" : "failed",
          last_webhook_at: new Date().toISOString(),
          error_code: firstError?.code ?? null,
          error_message: firstError?.message || firstError?.title || null,
          error_details: firstError?.error_data?.details || null,
        },
      }));

      console.warn("[History Sync] Meta returned error chunk", {
        clientId: config.id,
        error: firstError,
      });
      continue;
    }

    const phase = Number.isFinite(chunk?.metadata?.phase)
      ? Number(chunk.metadata.phase)
      : null;
    const chunkOrder = Number.isFinite(chunk?.metadata?.chunk_order)
      ? Number(chunk.metadata.chunk_order)
      : null;
    const progress = Number.isFinite(chunk?.metadata?.progress)
      ? Number(chunk.metadata.progress)
      : null;
    const threads = Array.isArray(chunk?.threads) ? chunk.threads : [];

    lastPhase = phase;
    lastChunkOrder = chunkOrder;
    lastProgress = progress;

    for (const thread of threads) {
      const phone = normalizePhone(thread?.id);
      const threadMessages = Array.isArray(thread?.messages) ? thread.messages : [];

      if (!phone) {
        continue;
      }

      const lastThreadTimestamp = threadMessages.length
        ? parseWebhookTimestamp(threadMessages[threadMessages.length - 1]?.timestamp)
        : new Date().toISOString();
      await upsertSyncedContact({
        clientId: config.id,
        phone,
        timestamp: lastThreadTimestamp,
        lastReadAt: lastThreadTimestamp,
      });

      for (const message of threadMessages) {
        if (shouldSkipHistoryMessage(message)) {
          console.warn("[History Sync] Skipping unsupported history message", {
            clientId: config.id,
            phone,
            wamid: message?.id,
            type: message?.type,
          });
          continue;
        }

        const fromPhone = normalizePhone(message?.from);
        const direction: "incoming" | "outgoing" =
          businessPhone && fromPhone === businessPhone ? "outgoing" : "incoming";

        try {
          await persistHistoryMessage({
            config,
            phone,
            message,
            direction,
            status: message?.history_context?.status,
            source: "history_sync",
            phase,
            chunkOrder,
            progress,
          });
          processedMessages += 1;
        } catch (messageError) {
          console.error("[History Sync] Failed to persist thread message", {
            clientId: config.id,
            phone,
            wamid: message?.id,
            type: message?.type,
            status: message?.history_context?.status,
            error: messageError,
          });
        }
      }
    }
  }

  for (const message of historyMediaMessages) {
    if (shouldSkipHistoryMessage(message)) {
      console.warn("[History Sync] Skipping unsupported media payload", {
        clientId: config.id,
        wamid: message?.id,
        type: message?.type,
      });
      continue;
    }

    const fromPhone = normalizePhone(message?.from);
    const toPhone = normalizePhone(message?.to);
    let phone =
      businessPhone && fromPhone !== businessPhone ? fromPhone : toPhone;

    if (!phone && message?.id) {
      const existing = await query<{ session_id: string }>(
        `SELECT session_id
         FROM n8n_chat_histories
         WHERE client_id = $1
           AND wamid = $2
         LIMIT 1`,
        [config.id, message.id],
      );
      phone = existing.rows[0]?.session_id || null;
    }

    if (!phone) {
      console.warn("[History Sync] Could not resolve phone for media payload", {
        clientId: config.id,
        wamid: message?.id,
      });
      continue;
    }

    await upsertSyncedContact({
      clientId: config.id,
      phone,
      timestamp: parseWebhookTimestamp(message?.timestamp),
      lastReadAt: parseWebhookTimestamp(message?.timestamp),
    });

    try {
      await persistHistoryMessage({
        config,
        phone,
        message,
        direction:
          businessPhone && fromPhone === businessPhone ? "outgoing" : "incoming",
        status: message?.history_context?.status,
        source: "history_sync",
        phase: lastPhase,
        chunkOrder: lastChunkOrder,
        progress: lastProgress,
      });
      processedMessages += 1;
    } catch (messageError) {
      console.error("[History Sync] Failed to persist media payload", {
        clientId: config.id,
        phone,
        wamid: message?.id,
        type: message?.type,
        error: messageError,
      });
    }
  }

  await updateClientProvisioningStatus(config.id, (current) => ({
    ...current,
    history_sync: {
      ...(current.history_sync || {}),
      status: lastProgress === 100 ? "completed" : "requested",
      completed_at:
        lastProgress === 100
          ? current.history_sync?.completed_at || new Date().toISOString()
          : current.history_sync?.completed_at || null,
      last_webhook_at: new Date().toISOString(),
      progress: lastProgress,
      phase: lastPhase,
      chunk_order: lastChunkOrder,
      error_code: null,
      error_message: null,
      error_details: null,
      processed_messages: processedMessages,
    },
  }));
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
