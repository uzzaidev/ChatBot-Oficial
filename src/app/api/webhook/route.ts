import { NextRequest, NextResponse } from "next/server";

/**
 * GET - usado pela Meta para verificar e ativar o webhook (hub.challenge)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN; // definido no .env

    // Verifica se o token e o modo estão corretos
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso pela Meta!");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.warn("❌ Falha na verificação do webhook");
      return new NextResponse("Erro de verificação", { status: 403 });
    }
  } catch (err) {
    console.error("Erro ao processar GET do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

/**
 * POST - usado pela Meta para enviar mensagens e atualizações
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Webhook recebido:", JSON.stringify(body, null, 2));

    // Confirma o recebimento (importante: SEM resposta adicional)
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Erro ao processar POST do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}
