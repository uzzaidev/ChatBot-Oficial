/**
 * DELETE /api/calendar/disconnect
 *
 * Disconnects a calendar provider (Google or Microsoft).
 * Clears enabled flag, user email, and Vault secret IDs.
 */

import {
  createRouteHandlerClient,
  createServerClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createRouteHandlerClient(request as any);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Get client_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // 3. Parse body
    const body = await request.json();
    const provider = body?.provider as string;

    if (provider !== "google" && provider !== "microsoft") {
      return NextResponse.json(
        { error: 'Provider inválido. Use "google" ou "microsoft".' },
        { status: 400 },
      );
    }

    // 4. Fetch existing secret IDs so we can delete them from Vault
    const serviceSupabase = await createServerClient();

    const tokenField =
      provider === "google"
        ? "google_calendar_token_secret_id"
        : "microsoft_calendar_token_secret_id";
    const refreshField =
      provider === "google"
        ? "google_calendar_refresh_token_secret_id"
        : "microsoft_calendar_refresh_token_secret_id";

    const { data: clientData } = await serviceSupabase
      .from("clients")
      .select(`${tokenField}, ${refreshField}`)
      .eq("id", profile.client_id)
      .single();

    // Delete vault secrets if they exist
    if (clientData) {
      const { deleteSecret } = await import("@/lib/vault");
      const tokenId = (clientData as any)[tokenField];
      const refreshId = (clientData as any)[refreshField];
      if (tokenId) await deleteSecret(tokenId);
      if (refreshId) await deleteSecret(refreshId);
    }

    // 5. Update client record (clear calendar fields)
    const updateData =
      provider === "google"
        ? {
            google_calendar_enabled: false,
            google_calendar_user_email: null,
            google_calendar_token_secret_id: null,
            google_calendar_refresh_token_secret_id: null,
          }
        : {
            microsoft_calendar_enabled: false,
            microsoft_calendar_user_email: null,
            microsoft_calendar_token_secret_id: null,
            microsoft_calendar_refresh_token_secret_id: null,
          };

    const { error: updateError } = await serviceSupabase
      .from("clients")
      .update(updateData)
      .eq("id", profile.client_id);

    if (updateError) {
      console.error("[Calendar Disconnect] Update error:", updateError);
      throw new Error(updateError.message);
    }

    console.log(
      `[Calendar Disconnect] ${provider} calendar disconnected for client:`,
      profile.client_id,
    );

    return NextResponse.json({ success: true, provider });
  } catch (error) {
    console.error("[Calendar Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Erro ao desconectar calendário" },
      { status: 500 },
    );
  }
}
