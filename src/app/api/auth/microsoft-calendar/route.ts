/**
 * Microsoft Calendar OAuth - Initialization Endpoint
 *
 * Authenticated user clicks "Conectar Microsoft Calendar" →
 * generates CSRF token → redirects to Microsoft consent screen
 */

import { generateCalendarOAuthState } from "@/lib/google-calendar-oauth";
import { getMicrosoftCalendarOAuthURL } from "@/lib/microsoft-calendar-oauth";
import { createRouteHandlerClient } from "@/lib/supabase-server";
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

    // 4. Store state in secure HTTP-only cookie on the redirect response
    const oauthURL = getMicrosoftCalendarOAuthURL(state);
    console.log(
      "[Microsoft Calendar OAuth Init] Redirecting user:",
      user.email,
    );

    const response = NextResponse.redirect(oauthURL);
    response.cookies.set("microsoft_calendar_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Microsoft Calendar OAuth Init] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize Microsoft Calendar OAuth",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
