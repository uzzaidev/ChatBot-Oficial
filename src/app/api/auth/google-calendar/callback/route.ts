/**
 * Google Calendar OAuth - Callback Endpoint
 *
 * Receives authorization code from Google →
 * validates CSRF → exchanges for tokens →
 * stores in Vault → updates client record →
 * redirects to dashboard
 */

import {
  exchangeGoogleCodeForTokens,
  extractClientIdFromState,
} from "@/lib/google-calendar-oauth";
import { createServerClient } from "@/lib/supabase-server";
import { createSecret } from "@/lib/vault";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // 1. Handle OAuth errors
    if (error) {
      console.error("[Google Calendar Callback] OAuth error:", error);
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=google_oauth_failed&reason=${encodeURIComponent(
          error,
        )}`,
      );
    }

    // 2. Validate required parameters
    if (!code || !state) {
      console.error("[Google Calendar Callback] Missing code or state");
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=invalid_callback`,
      );
    }

    // 3. Validate CSRF token
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_calendar_oauth_state")?.value;

    console.log(
      "[Google Calendar Callback] Cookie present:",
      !!storedState,
      "| State param (first 20):",
      state.substring(0, 20) + "...",
    );
    if (storedState) {
      console.log(
        "[Google Calendar Callback] Cookie (first 20):",
        storedState.substring(0, 20) + "...",
        "| Match:",
        storedState === state,
      );
    }

    if (!storedState || storedState !== state) {
      console.error(
        "[Google Calendar Callback] CSRF failed — cookie missing or mismatch",
      );
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=csrf_failed`,
      );
    }

    // 4. Clear state cookie
    cookieStore.delete("google_calendar_oauth_state");

    // 5. Extract clientId from state
    const clientId = extractClientIdFromState(state);
    if (!clientId) {
      console.error(
        "[Google Calendar Callback] Could not extract clientId from state",
      );
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=invalid_state`,
      );
    }

    console.log(
      "[Google Calendar Callback] Exchanging code for tokens, clientId:",
      clientId,
    );

    // 6. Exchange code for tokens
    const { accessToken, refreshToken, userEmail } =
      await exchangeGoogleCodeForTokens(code);

    console.log("[Google Calendar Callback] Tokens received for:", userEmail);

    // 7. Store tokens in Vault
    const tokenSecretId = await createSecret(
      accessToken,
      `google_calendar_token_${clientId}`,
      `Google Calendar access token for client ${clientId} (${userEmail})`,
    );

    const refreshTokenSecretId = await createSecret(
      refreshToken,
      `google_calendar_refresh_${clientId}`,
      `Google Calendar refresh token for client ${clientId} (${userEmail})`,
    );

    // 8. Update client record
    const supabase = await createServerClient();

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        google_calendar_enabled: true,
        google_calendar_user_email: userEmail,
        google_calendar_token_secret_id: tokenSecretId,
        google_calendar_refresh_token_secret_id: refreshTokenSecretId,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "[Google Calendar Callback] Failed to update client:",
        updateError,
      );
      throw new Error(`Failed to update client: ${updateError.message}`);
    }

    console.log(
      "[Google Calendar Callback] ✅ Google Calendar connected for client:",
      clientId,
    );

    // 9. Redirect to dashboard
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/calendar?success=google`,
    );
  } catch (error) {
    console.error("[Google Calendar Callback] Error:", error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/calendar?error=google_processing_failed&message=${
        error instanceof Error ? encodeURIComponent(error.message) : "unknown"
      }`,
    );
  }
}
