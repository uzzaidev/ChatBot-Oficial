/**
 * DELETE /api/calendar/disconnect
 *
 * Disconnects a calendar provider (Google or Microsoft).
 * Clears enabled flag, user email, and Vault secret IDs.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  createServerClient,
} from "@/lib/supabase-server";

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

    // 4. Update client record (clear calendar fields) using service role
    const serviceSupabase = await createServerClient();

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
