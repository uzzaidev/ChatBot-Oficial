/**
 * GET /api/calendar/events
 *
 * Returns calendar events for the next 7 days.
 * Authenticated: requires user session → client_id from user_profiles.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { getCalendarClient } from "@/lib/calendar-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    // 3. Get calendar client
    const calendarClient = await getCalendarClient(profile.client_id);

    if (!calendarClient) {
      return NextResponse.json({ events: [], connected: false });
    }

    // 4. Fetch events for next 7 days
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = await calendarClient.listEvents(now, weekLater);

    return NextResponse.json({ events, connected: true });
  } catch (error) {
    console.error("[Calendar Events API] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar eventos do calendário" },
      { status: 500 },
    );
  }
}
