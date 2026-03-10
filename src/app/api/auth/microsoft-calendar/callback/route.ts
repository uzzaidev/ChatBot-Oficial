/**
 * Microsoft Calendar OAuth - Callback Endpoint
 *
 * Receives authorization code from Microsoft →
 * validates CSRF → exchanges for tokens →
 * stores in Vault → updates client record →
 * redirects to dashboard
 */

import { extractClientIdFromState } from "@/lib/google-calendar-oauth";
import { exchangeMicrosoftCodeForTokens } from "@/lib/microsoft-calendar-oauth";
import { createServerClient } from "@/lib/supabase-server";
import { createOrUpdateSecret } from "@/lib/vault";
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
    const errorDescription = searchParams.get("error_description");

    // 1. Handle OAuth errors
    if (error) {
      console.error(
        "[Microsoft Calendar Callback] OAuth error:",
        error,
        errorDescription,
      );
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=microsoft_oauth_failed&reason=${encodeURIComponent(
          error,
        )}`,
      );
    }

    // 2. Validate required parameters
    if (!code || !state) {
      console.error("[Microsoft Calendar Callback] Missing code or state");
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=invalid_callback`,
      );
    }

    // 3. Validate CSRF token
    const cookieStore = await cookies();
    const storedState = cookieStore.get(
      "microsoft_calendar_oauth_state",
    )?.value;

    if (!storedState || storedState !== state) {
      console.error(
        "[Microsoft Calendar Callback] Invalid state (CSRF protection)",
      );
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=csrf_failed`,
      );
    }

    // 4. Clear state cookie
    cookieStore.delete("microsoft_calendar_oauth_state");

    // 5. Extract clientId from state
    const clientId = extractClientIdFromState(state);
    if (!clientId) {
      console.error(
        "[Microsoft Calendar Callback] Could not extract clientId from state",
      );
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/calendar?error=invalid_state`,
      );
    }

    console.log(
      "[Microsoft Calendar Callback] Exchanging code for tokens, clientId:",
      clientId,
    );

    // 6. Exchange code for tokens
    const { accessToken, refreshToken, userEmail } =
      await exchangeMicrosoftCodeForTokens(code);

    console.log(
      "[Microsoft Calendar Callback] Tokens received for:",
      userEmail,
    );

    // 7. Store tokens in Vault (upsert to handle reconnection)
    const tokenSecretId = await createOrUpdateSecret(
      accessToken,
      `microsoft_calendar_token_${clientId}`,
      `Microsoft Calendar access token for client ${clientId} (${userEmail})`,
    );

    const refreshTokenSecretId = await createOrUpdateSecret(
      refreshToken,
      `microsoft_calendar_refresh_${clientId}`,
      `Microsoft Calendar refresh token for client ${clientId} (${userEmail})`,
    );

    // 8. Update client record
    const supabase = await createServerClient();

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        microsoft_calendar_enabled: true,
        microsoft_calendar_user_email: userEmail,
        microsoft_calendar_token_secret_id: tokenSecretId,
        microsoft_calendar_refresh_token_secret_id: refreshTokenSecretId,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "[Microsoft Calendar Callback] Failed to update client:",
        updateError,
      );
      throw new Error(`Failed to update client: ${updateError.message}`);
    }

    console.log(
      "[Microsoft Calendar Callback] ✅ Microsoft Calendar connected for client:",
      clientId,
    );

    // 9. Redirect to dashboard
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/calendar?success=microsoft`,
    );
  } catch (error) {
    console.error("[Microsoft Calendar Callback] Error:", error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/calendar?error=microsoft_processing_failed&message=${
        error instanceof Error ? encodeURIComponent(error.message) : "unknown"
      }`,
    );
  }
}
