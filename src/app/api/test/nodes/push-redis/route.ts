import { pushToRedis } from "@/nodes/pushToRedis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/test/nodes/push-redis
 * Testa o node pushToRedis isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || !input.phone || !input.content || !input.clientId) {
      return NextResponse.json(
        {
          error:
            "Input must contain phone, clientId, and content (normalized message)",
        },
        { status: 400 },
      );
    }

    // Executa o node
    await pushToRedis(input);

    return NextResponse.json({
      success: true,
      output: input, // Passa o mesmo objeto adiante
      info: `Mensagem adicionada ao Redis para ${input.clientId}:${input.phone}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 },
    );
  }
}
