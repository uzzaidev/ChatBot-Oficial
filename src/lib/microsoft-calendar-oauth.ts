/**
 * Microsoft Calendar OAuth Helpers
 *
 * Handles Microsoft OAuth 2.0 flow for Calendar access via Graph API:
 * - Generate OAuth URL with offline_access (refresh token)
 * - Exchange authorization code for tokens
 * - Refresh expired access tokens
 */

interface MicrosoftCalendarOAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

interface MicrosoftTokenResponse {
  accessToken: string;
  refreshToken: string;
  userEmail: string;
  expiresIn: number;
}

interface MicrosoftRefreshResponse {
  accessToken: string;
  expiresIn: number;
}

const MICROSOFT_SCOPES = ["Calendars.ReadWrite", "offline_access", "User.Read"];

const getMicrosoftOAuthConfig = (): MicrosoftCalendarOAuthConfig => {
  const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_CALENDAR_TENANT_ID || "common";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing MICROSOFT_CALENDAR_CLIENT_ID or MICROSOFT_CALENDAR_CLIENT_SECRET",
    );
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri: `${baseUrl}/api/auth/microsoft-calendar/callback`,
  };
};

/**
 * Generate Microsoft Calendar OAuth URL
 *
 * @param state - CSRF protection token (format: {random}:{clientId})
 * @returns Full OAuth URL to redirect to
 */
export const getMicrosoftCalendarOAuthURL = (state: string): string => {
  const config = getMicrosoftOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: MICROSOFT_SCOPES.join(" "),
    response_mode: "query",
    state,
    prompt: "consent",
  });

  return `https://login.microsoftonline.com/${
    config.tenantId
  }/oauth2/v2.0/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access + refresh tokens
 *
 * @param code - Authorization code from Microsoft callback
 * @returns Access token, refresh token, user email, and expiry
 */
export const exchangeMicrosoftCodeForTokens = async (
  code: string,
): Promise<MicrosoftTokenResponse> => {
  const config = getMicrosoftOAuthConfig();

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
        grant_type: "authorization_code",
        scope: MICROSOFT_SCOPES.join(" "),
      }),
    },
  );

  if (!tokenRes.ok) {
    const error = await tokenRes.json();
    console.error("[Microsoft Calendar OAuth] Token exchange failed:", error);
    throw new Error(
      `Microsoft token exchange failed: ${
        error.error_description || error.error || "Unknown error"
      }`,
    );
  }

  const tokenData = await tokenRes.json();

  // Get user email using Graph API
  const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    throw new Error("Failed to fetch Microsoft user info");
  }

  const userInfo = await userInfoRes.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || "",
    userEmail: userInfo.mail || userInfo.userPrincipalName || "",
    expiresIn: tokenData.expires_in || 3600,
  };
};

/**
 * Refresh an expired Microsoft access token using the refresh token
 *
 * @param refreshToken - Stored refresh token from Vault
 * @returns New access token and expiry
 */
export const refreshMicrosoftAccessToken = async (
  refreshToken: string,
): Promise<MicrosoftRefreshResponse> => {
  const config = getMicrosoftOAuthConfig();

  const res = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: MICROSOFT_SCOPES.join(" "),
      }),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    console.error("[Microsoft Calendar OAuth] Token refresh failed:", error);
    throw new Error(
      `Microsoft token refresh failed: ${
        error.error_description || error.error || "Unknown error"
      }`,
    );
  }

  const data = await res.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
};
