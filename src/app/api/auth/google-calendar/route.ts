/**
 * Google Calendar OAuth - Initialization Endpoint
 *
 * Authenticated user clicks "Conectar Google Calendar" →
 * generates CSRF token → redirects to Google consent screen
 */

import {
  generateCalendarOAuthState,
  getGoogleCalendarOAuthURL,
} from "@/lib/google-calendar-oauth";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createRouteHandlerClient(request as any);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Get client_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil ou client não encontrado" },
        { status: 404 },
      );
    }

    // 3. Generate CSRF state with embedded clientId
    const state = generateCalendarOAuthState(profile.client_id);

    // 4. Store state in secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("google_calendar_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // 5. Redirect to Google OAuth
    const oauthURL = getGoogleCalendarOAuthURL(state);
    console.log("[Google Calendar OAuth Init] Redirecting user:", user.email);

    return NextResponse.redirect(oauthURL);
  } catch (error) {
    console.error("[Google Calendar OAuth Init] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize Google Calendar OAuth",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
