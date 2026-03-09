/**
 * 🔐 WEBHOOK MULTI-TENANT DINÂMICO POR CLIENTE
 *
 * Rota: /api/webhook/[clientId]
 *
 * Cada cliente tem sua própria URL de webhook configurada no Meta Dashboard:
 * - Cliente A: https://chat.luisfboff.com/api/webhook/550e8400-e29b-41d4-a716-446655440000
 * - Cliente B: https://chat.luisfboff.com/api/webhook/660e8400-e29b-41d4-a716-446655440001
 *
 * Fluxo:
 * 1. Meta chama webhook com clientId na URL
 * 2. Busca config do cliente no Vault
 * 3. Valida que cliente está ativo
 * 4. Processa mensagem com config do cliente
 */

import { processChatbotMessage } from "@/flows/chatbotFlow";
import { getClientConfig } from "@/lib/config";
import { checkDuplicateMessage, markMessageAsProcessed } from "@/lib/dedup";
import { createExecutionLogger } from "@/lib/logger";
import { sendIncomingMessagePushWithTimeout } from "@/lib/push-dispatch";
import { addWebhookMessage } from "@/lib/webhookCache";
import { parseInteractiveMessage } from "@/lib/whatsapp/interactiveMessages";
import { updateMessageReaction } from "@/nodes/updateMessageReaction";
import { processStatusUpdate } from "@/nodes/updateMessageStatus";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const extractIncomingPreview = (message: any): string => {
  if (!message) return "Você recebeu uma nova mensagem";

  if (typeof message.text?.body === "string" && message.text.body.trim()) {
    return message.text.body;
  }
  if (typeof message.image?.caption === "string" && message.image.caption.trim()) {
    return message.image.caption;
  }
  if (typeof message.document?.caption === "string" && message.document.caption.trim()) {
    return message.document.caption;
  }

  const byType: Record<string, string> = {
    audio: "🎤 Áudio recebido",
    image: "🖼️ Imagem recebida",
    document: "📎 Documento recebido",
    video: "🎥 Vídeo recebido",
    sticker: "🙂 Sticker recebido",
    interactive: "🧩 Resposta interativa recebida",
  };

  return byType[message.type] || "Você recebeu uma nova mensagem";
};

/**
 * GET - Webhook verification (Meta)
 * SECURITY FIX (VULN-002): Rate limited to prevent brute force
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const timestamp = new Date().toISOString();
  const { clientId } = await params;

  try {
    // SECURITY FIX (VULN-002): Rate limit webhook verification
    // Prevent brute force attacks on verify_token
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";
    const identifier = `webhook-verify:${ip}`;
    const searchParams = request.nextUrl.searchParams;

    // Log 1: Informações da requisição
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔔 [WEBHOOK VERIFY] Requisição recebida");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📅 Timestamp:", timestamp);
    console.log("🆔 Client ID:", clientId);
    console.log("🌐 IP:", ip);
    console.log("🔗 URL completa:", request.url);

    // Log 2: Headers recebidos
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("\n📋 Headers recebidos:");
    console.log(JSON.stringify(headers, null, 2));

    // Log 3: Query parameters
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("\n🔍 Query Parameters:");
    console.log("  hub.mode:", mode);
    console.log(
      "  hub.verify_token:",
      token ? `${token.substring(0, 20)}... (${token.length} chars)` : "NULL",
    );
    console.log("  hub.challenge:", challenge);

    // Mostrar TODOS os query params
    console.log("\n📝 Todos os query params:");
    searchParams.forEach((value, key) => {
      console.log(`  ${key}:`, value);
    });

    // Log 4: Buscar config do cliente
    console.log("\n🔎 Buscando config do cliente no banco...");
    const config = await getClientConfig(clientId);

    if (!config) {
      console.log("❌ [WEBHOOK VERIFY] Cliente não encontrado!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return new NextResponse("Client not found", { status: 404 });
    }

    console.log("✅ Cliente encontrado:", {
      name: config.name,
      status: config.status,
      phoneNumberId: config.apiKeys.metaPhoneNumberId,
    });

    if (config.status !== "active") {
      console.log("❌ [WEBHOOK VERIFY] Cliente não está ativo!");
      console.log("   Status atual:", config.status);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return new NextResponse("Client not active", { status: 403 });
    }

    // Log 5: Validar verify token
    const expectedToken = config.apiKeys.metaVerifyToken;

    console.log("\n🔐 Validação do Verify Token:");
    console.log(
      "  Token recebido:",
      token ? `${token.substring(0, 20)}... (${token.length} chars)` : "NULL",
    );
    console.log(
      "  Token esperado:",
      expectedToken
        ? `${expectedToken.substring(0, 20)}... (${expectedToken.length} chars)`
        : "NULL",
    );
    console.log("  Tokens iguais?", token === expectedToken);

    // Comparação character-by-character se tokens não batem
    if (token !== expectedToken) {
      if (token && expectedToken) {
        const minLen = Math.min(token.length, expectedToken.length);
        console.log("\n⚠️  Tokens diferentes! Comparando char-by-char:");
        console.log("  Tamanho recebido:", token.length);
        console.log("  Tamanho esperado:", expectedToken.length);
        for (let i = 0; i < minLen; i++) {
          if (token[i] !== expectedToken[i]) {
            console.log(`  ❌ Diferença na posição ${i}:`);
            console.log(
              `     Recebido: '${token[i]}' (code ${token.charCodeAt(i)})`,
            );
            console.log(
              `     Esperado: '${
                expectedToken[i]
              }' (code ${expectedToken.charCodeAt(i)})`,
            );
            break;
          }
        }
        if (token.length !== expectedToken.length) {
          console.log("  ⚠️  Tamanhos diferentes!");
        }
      }
    }

    console.log("\n🎯 Validações:");
    console.log(
      '  hub.mode === "subscribe"?',
      mode === "subscribe",
      `(recebido: "${mode}")`,
    );
    console.log("  tokens iguais?", token === expectedToken);

    // Log 6: Decisão final
    if (mode === "subscribe" && token === expectedToken) {
      console.log("\n✅ [WEBHOOK VERIFY] Verificação bem-sucedida!");
      console.log("📤 Enviando resposta:");
      console.log("   Status: 200 OK");
      console.log("   Body:", challenge);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log("\n❌ [WEBHOOK VERIFY] Verificação falhou!");
      console.log("📤 Enviando resposta:");
      console.log("   Status: 403 Forbidden");
      console.log(
        "   Motivo:",
        mode !== "subscribe" ? "mode incorreto" : "token incorreto",
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return new NextResponse("Invalid verification token", { status: 403 });
    }
  } catch (error) {
    console.log("\n❌ [WEBHOOK VERIFY] Erro interno!");
    console.log("Erro:", error);
    console.log("Stack:", error instanceof Error ? error.stack : "N/A");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * POST - Webhook message handler (Meta)
 *
 * SECURITY FIX (VULN-012): Valida assinatura HMAC da Meta
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;

  try {
    // SECURITY FIX (VULN-012): Validar assinatura ANTES de processar
    const signature = request.headers.get("X-Hub-Signature-256");

    if (!signature) {
      return new NextResponse("Missing signature", { status: 403 });
    }

    // 1. Parse body (precisamos do texto RAW para validar assinatura)
    const rawBody = await request.text();

    // 2. Buscar config do cliente do Vault
    const config = await getClientConfig(clientId);

    if (!config) {
      return new NextResponse("Client not found", { status: 404 });
    }

    if (config.status !== "active") {
      return new NextResponse("Client not active", { status: 403 });
    }

    // SECURITY FIX (VULN-012): Validar assinatura HMAC
    // IMPORTANTE: App Secret é DIFERENTE do Verify Token!
    // - metaVerifyToken: usado para verificação GET (hub.verify_token)
    // - metaAppSecret: usado para validação HMAC (X-Hub-Signature-256)
    const appSecret = config.apiKeys.metaAppSecret;

    if (!appSecret) {
      return new NextResponse("App secret not configured", { status: 500 });
    }

    const expectedSignature =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    // Usar comparação timing-safe
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    // Parse body como JSON agora que validamos
    const body = JSON.parse(rawBody);

    // 3. Check if this is a status update (not a message)
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const statuses = value?.statuses;

      if (statuses && statuses.length > 0) {
        const logger = createExecutionLogger();
        const executionId = logger.startExecution(
          {
            message_type: "status_update",
            client_id: clientId,
            wamid: statuses[0]?.id,
            status: statuses[0]?.status,
            recipient_id: statuses[0]?.recipient_id,
          },
          clientId,
        );

        const nodeStartTime = Date.now();
        logger.logNodeStart("Webhook Status Update", body);

        // This is a status update, not a message
        console.log("📊 Processing status update:", {
          status: statuses[0].status,
          wamid: statuses[0].id,
          recipient: statuses[0].recipient_id,
          timestamp: statuses[0].timestamp,
        });

        const results: Array<{
          wamid: string;
          status: string;
          ok: boolean;
          error?: string;
        }> = [];
        let hasError = false;
        for (const status of statuses) {
          try {
            await processStatusUpdate({
              statusUpdate: status,
              clientId,
            });
            console.log("✅ Status update processed successfully");
            results.push({ wamid: status.id, status: status.status, ok: true });
          } catch (statusError) {
            console.error("❌ Failed to process status update:", statusError);
            hasError = true;
            results.push({
              wamid: status.id,
              status: status.status,
              ok: false,
              error:
                statusError instanceof Error
                  ? statusError.message
                  : String(statusError),
            });
          }
        }

        if (hasError) {
          logger.logNodeError(
            "Webhook Status Update",
            new Error("One or more status updates failed"),
          );
          logger.finishExecution("error");
        } else {
          logger.logNodeSuccess(
            "Webhook Status Update",
            {
              results,
              executionId,
            },
            nodeStartTime,
          );
          logger.finishExecution("success");
        }

        return new NextResponse("STATUS_UPDATE_PROCESSED", { status: 200 });
      }
    } catch (statusError) {
      console.error("❌ Error checking for status updates:", statusError);
    }

    // 3.5 Check if this is a reaction (not a regular message)
    // 😊 Reactions should update existing messages, not create new ones
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "reaction" && message.reaction) {
        const reaction = message.reaction;
        const reactorPhone = message.from;

        console.log("😊 Processing reaction:", {
          emoji: reaction.emoji || "(removed)",
          targetMessage: reaction.message_id,
          from: reactorPhone,
        });

        // Update the existing message with the reaction
        const result = await updateMessageReaction({
          targetWamid: reaction.message_id,
          emoji: reaction.emoji || "",
          reactorPhone,
          clientId,
        });

        if (result.success) {
          console.log("✅ Reaction processed successfully");
        } else {
          console.log("⚠️ Reaction not applied:", result.error);
        }

        // Always return 200 for reactions - don't process further
        return new NextResponse("REACTION_PROCESSED", { status: 200 });
      }
    } catch (reactionError) {
      console.error("❌ Error processing reaction:", reactionError);
    }

    // 4. Extrair mensagem e adicionar ao cache
    let messageId: string | null = null;

    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        const contact = value?.contacts?.[0];
        messageId = message.id || `msg-${Date.now()}`;

        // � Log referral data if present (Meta Ads / Click-to-WhatsApp)
        if (message.referral) {
          console.log("🎯 [REFERRAL] Lead came from Meta Ad:", {
            source_type: message.referral.source_type,
            source_url: message.referral.source_url,
            headline: message.referral.headline,
            body: message.referral.body,
            ctwa_clid: message.referral.ctwa_clid,
            source_id: message.referral.source_id,
            ad_id: message.referral.ad_id,
            campaign_id: message.referral.campaign_id,
          });
        }

        // �🆕 Parse interactive message response
        const interactiveResponse = parseInteractiveMessage(message);

        if (interactiveResponse) {
          console.log("📱 Interactive message response received:", {
            type: interactiveResponse.type,
            id: interactiveResponse.id,
            title: interactiveResponse.title,
            from: interactiveResponse.from,
          });
        }

        const webhookMessage = {
          id: messageId,
          timestamp: new Date().toISOString(),
          from: message.from,
          name: contact?.profile?.name || "Unknown",
          type: message.type,
          content: interactiveResponse
            ? `[${interactiveResponse.type}] ${interactiveResponse.title}`
            : message.text?.body ||
              message.image?.caption ||
              message.audio?.id ||
              message.type,
          raw: body,
        };

        addWebhookMessage(webhookMessage);
      }
    } catch (parseError) {
      // Error extracting message - continue processing
    }

    // 4. Deduplication check - prevent processing duplicate messages
    // VULN-006 FIX: Redis with PostgreSQL fallback
    if (messageId) {
      try {
        const dedupResult = await checkDuplicateMessage(clientId, messageId);

        if (dedupResult.alreadyProcessed) {
          return new NextResponse("DUPLICATE_MESSAGE_IGNORED", { status: 200 });
        }

        // Mark message as being processed (in both Redis and PostgreSQL)
        const markResult = await markMessageAsProcessed(clientId, messageId, {
          timestamp: new Date().toISOString(),
          from: body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id,
        });

        if (markResult.success) {
          if (markResult.error) {
          }
        } else {
          // Failed to mark message as processed - non-critical
        }
      } catch (dedupError) {
        // Graceful degradation - if both Redis and PostgreSQL fail, continue
      }
    }

    // 5. Preparar payload de push (independente do sucesso do flow)
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const incomingMessage = value?.messages?.[0];
    const incomingPhone = incomingMessage?.from;
    const incomingName =
      value?.contacts?.[0]?.profile?.name || value?.contacts?.[0]?.wa_id || null;
    const pushPayload =
      incomingMessage && incomingPhone
        ? {
            clientId,
            phone: incomingPhone,
            customerName: incomingName,
            messagePreview: extractIncomingPreview(incomingMessage),
          }
        : null;

    // 6. Processar mensagem com config do cliente
    try {
      await processChatbotMessage(body, config);
    } catch (flowError) {
      // Flow error - continue and return 200 (Meta requires this)
    }

    // 7. Disparar push sem comprometer o webhook principal
    if (pushPayload) {
      try {
        await sendIncomingMessagePushWithTimeout(pushPayload, 1800);
      } catch (pushError) {
        console.warn("[webhook] push dispatch failed", pushError);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
}
