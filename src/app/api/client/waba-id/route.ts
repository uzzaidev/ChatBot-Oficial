import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/client/waba-id
 * Update WhatsApp Business Account ID for the client
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsapp_business_account_id } = body;

    if (!whatsapp_business_account_id || typeof whatsapp_business_account_id !== 'string') {
      return NextResponse.json(
        { error: "whatsapp_business_account_id é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request as any);

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar client_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    const clientId = profile.client_id;

    // Atualizar WABA ID no cliente
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        whatsapp_business_account_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating WABA ID:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar WABA ID" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "WABA ID atualizado com sucesso",
    });
  } catch (error) {
    console.error("Error in PATCH /api/client/waba-id:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar WABA ID" },
      { status: 500 }
    );
  }
}
