/**
 * POST /api/calendar/toggle
 *
 * Ativa ou pausa o uso do calendário pelo bot, sem desconectar o OAuth.
 * O campo `calendar_bot_enabled` fica dentro do JSONB `settings` do client.
 */

import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request as any);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

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

    const clientId = profile.client_id;

    const body = await request.json().catch(() => ({}));
    const enabled: boolean = body.enabled === true;

    // Merge calendar_bot_enabled into the existing settings JSONB
    const { error } = await supabase.rpc("update_client_setting", {
      p_client_id: clientId,
      p_key: "calendar_bot_enabled",
      p_value: enabled,
    });

    if (error) {
      // Fallback: fetch current settings and merge manually
      const { data: clientRow } = await supabase
        .from("clients")
        .select("settings")
        .eq("id", clientId)
        .single();

      const currentSettings = (clientRow?.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, calendar_bot_enabled: enabled };

      const { error: updateError } = await supabase
        .from("clients")
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq("id", clientId);

      if (updateError) {
        return NextResponse.json(
          { error: "Erro ao salvar configuração" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, calendar_bot_enabled: enabled });
  } catch (err) {
    console.error("[calendar/toggle]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
