import { NextRequest, NextResponse } from "next/server";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/template
 * Retorna um arquivo CSV template para importação de contatos
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    // Template CSV com exemplos
    const csvContent = `telefone,nome,status
5511999999999,João Silva,bot
5511888888888,Maria Santos,humano
5521977777777,Pedro Oliveira,bot`;

    // Retornar como arquivo CSV para download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="template_contatos.csv"',
      },
    });
  } catch (error) {
    console.error("[API /contacts/template] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
