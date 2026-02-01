import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fields that can be updated via this endpoint
const ALLOWED_FIELDS = [
  "whatsapp_business_account_id",
  "meta_waba_id", // Alias for the same field
  "meta_dataset_id",
  "meta_ad_account_id",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

/**
 * PATCH /api/client/meta-config
 * Update Meta configuration fields for the client (stored in clients table)
 *
 * Body can contain any of:
 * - whatsapp_business_account_id: WABA ID
 * - meta_waba_id: Same as above (alias)
 * - meta_dataset_id: Dataset ID for Conversions API
 * - meta_ad_account_id: Ad Account ID for Marketing API
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Filter to only allowed fields
    const updates: Partial<Record<AllowedField, string>> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined && typeof body[field] === "string") {
        updates[field] = body[field];
      }
    }

    // Handle alias: meta_waba_id → whatsapp_business_account_id
    if (updates.meta_waba_id && !updates.whatsapp_business_account_id) {
      updates.whatsapp_business_account_id = updates.meta_waba_id;
      delete updates.meta_waba_id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum campo válido fornecido",
          allowedFields: ALLOWED_FIELDS,
        },
        { status: 400 },
      );
    }

    const supabase = await createRouteHandlerClient(
      request as unknown as Request,
    );

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
        { status: 404 },
      );
    }

    const clientId = profile.client_id;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Map field names to database columns
    if (updates.whatsapp_business_account_id !== undefined) {
      updateData.whatsapp_business_account_id =
        updates.whatsapp_business_account_id || null;
    }
    if (updates.meta_dataset_id !== undefined) {
      updateData.meta_dataset_id = updates.meta_dataset_id || null;
    }
    if (updates.meta_ad_account_id !== undefined) {
      updateData.meta_ad_account_id = updates.meta_ad_account_id || null;
    }

    // Update client record
    const { error: updateError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating Meta config:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar configuração Meta" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Configuração Meta atualizada com sucesso",
      updated: Object.keys(updates),
    });
  } catch (error) {
    console.error("Error in PATCH /api/client/meta-config:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configuração Meta" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/client/meta-config
 * Get current Meta configuration for the client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(
      request as unknown as Request,
    );

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
        { status: 404 },
      );
    }

    const clientId = profile.client_id;

    // Get client Meta config
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(
        "whatsapp_business_account_id, meta_waba_id, meta_dataset_id, meta_ad_account_id",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      whatsapp_business_account_id:
        client.whatsapp_business_account_id || client.meta_waba_id || "",
      meta_dataset_id: client.meta_dataset_id || "",
      meta_ad_account_id: client.meta_ad_account_id || "",
    });
  } catch (error) {
    console.error("Error in GET /api/client/meta-config:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configuração Meta" },
      { status: 500 },
    );
  }
}
