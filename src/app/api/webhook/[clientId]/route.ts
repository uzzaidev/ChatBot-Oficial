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

import { NextRequest, NextResponse } from "next/server";
import { processChatbotMessage } from "@/flows/chatbotFlow";
import { addWebhookMessage } from "@/lib/webhookCache";
import { getClientConfig } from "@/lib/config";
import { checkDuplicateMessage, markMessageAsProcessed } from "@/lib/dedup";
import crypto from "crypto";
import { checkRateLimit, webhookVerifyLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET - Webhook verification (Meta)
 * SECURITY FIX (VULN-002): Rate limited to prevent brute force
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } },
) {
  const timestamp = new Date().toISOString();

  try {
    // SECURITY FIX (VULN-002): Rate limit webhook verification
    // Prevent brute force attacks on verify_token
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";
    const identifier = `webhook-verify:${ip}`;

    const rateLimitResponse = await checkRateLimit(
      request,
      webhookVerifyLimiter,
      identifier,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { clientId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Log 1: Informações da requisição

    // Log 2: Headers recebidos
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Log 3: Query parameters
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Mostrar TODOS os query params
    searchParams.forEach((value, key) => {
    });

    // Log 4: Buscar config do cliente

    const config = await getClientConfig(clientId);

    if (!config) {
      return new NextResponse("Client not found", { status: 404 });
    }

    if (config.status !== "active") {
      return new NextResponse("Client not active", { status: 403 });
    }

    // Log 5: Validar verify token
    const expectedToken = config.apiKeys.metaVerifyToken;

    // Comparação character-by-character se tokens não batem
    if (token !== expectedToken) {
      if (token && expectedToken) {
        const minLen = Math.min(token.length, expectedToken.length);
        for (let i = 0; i < minLen; i++) {
          if (token[i] !== expectedToken[i]) {
            break;
          }
        }
      }
    }

    // Log 6: Decisão final
    if (mode === "subscribe" && token === expectedToken) {
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Invalid verification token", { status: 403 });
    }
  } catch (error) {
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
  { params }: { params: { clientId: string } },
) {
  const { clientId } = params;

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

    const expectedSignature = "sha256=" + crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

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

    // 3. Extrair mensagem e adicionar ao cache
    let messageId: string | null = null;

    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        const contact = value?.contacts?.[0];
        messageId = message.id || `msg-${Date.now()}`;

        const webhookMessage = {
          id: messageId,
          timestamp: new Date().toISOString(),
          from: message.from,
          name: contact?.profile?.name || "Unknown",
          type: message.type,
          content: message.text?.body ||
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

    // 5. Processar mensagem com config do cliente

    try {
      const result = await processChatbotMessage(body, config);
    } catch (flowError) {
      // Flow error - continue and return 200 (Meta requires this)
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
}
