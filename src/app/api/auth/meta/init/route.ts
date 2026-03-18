/**
 * Meta OAuth - Initialization Endpoint
 *
 * Entry point for Embedded Signup flow
 * User clicks "Conectar WhatsApp" → generates CSRF token → redirects to Meta
 */

import { generateOAuthState, getMetaOAuthURL } from "@/lib/meta-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 0. Get client_id and mode if passed
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const mode = searchParams.get("mode"); // "migrate" for legacy client migration

    // 1. Generate CSRF token
    const state = generateOAuthState();

    // 2. Store state in secure HTTP-only cookie (expires in 10 minutes)
    const cookieStore = await cookies();
    cookieStore.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // 2b. Store client_id in cookie if provided (for callback to update existing client)
    if (clientId) {
      cookieStore.set("meta_oauth_client_id", clientId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    }

    // 2c. Store migration flag (so callback redirects to dashboard instead of onboarding)
    if (mode === "migrate") {
      cookieStore.set("meta_oauth_migration", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    }

    // 3. Build Meta OAuth URL
    const oauthURL = getMetaOAuthURL(state);

    console.log("[Meta OAuth Init] Redirecting to:", oauthURL);
    console.log("[Meta OAuth Init] State:", state.substring(0, 20) + "...");

    // 4. Redirect to Meta OAuth
    return NextResponse.redirect(oauthURL);
  } catch (error) {
    console.error("[Meta OAuth Init] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to initialize OAuth",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
