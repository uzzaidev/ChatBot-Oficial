/**
 * TEMPORARY - Meta OAuth Test (without config_id)
 *
 * Tests if basic Facebook Login works without Embedded Signup config.
 * If this works but /api/auth/meta/init doesn't, the issue is the config_id.
 * DELETE THIS FILE after debugging.
 */

import { generateOAuthState } from "@/lib/meta-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const state = generateOAuthState();

    const cookieStore = await cookies();
    cookieStore.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const appId = process.env.META_PLATFORM_APP_ID;
    const baseUrl =
      process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";
    const redirectUri = `${baseUrl}/api/auth/meta/callback`;

    // Standard OAuth (NO config_id, NO embedded signup)
    const params = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri,
      state,
      scope:
        "whatsapp_business_messaging,whatsapp_business_management,business_management",
      response_type: "code",
    });

    const oauthURL = `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;

    console.log("[Meta OAuth TEST] Standard OAuth URL:", oauthURL);

    return NextResponse.redirect(oauthURL);
  } catch (error) {
    console.error("[Meta OAuth TEST] Error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
