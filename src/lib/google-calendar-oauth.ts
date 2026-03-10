/**
 * Google Calendar OAuth Helpers
 *
 * Handles Google Calendar OAuth 2.0 flow:
 * - Generate OAuth URL with offline access (refresh token)
 * - Exchange authorization code for tokens
 * - Refresh expired access tokens
 */

interface GoogleCalendarOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  accessToken: string;
  refreshToken: string;
  userEmail: string;
  expiresIn: number;
}

interface GoogleRefreshResponse {
  accessToken: string;
  expiresIn: number;
}

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

const getGoogleOAuthConfig = (): GoogleCalendarOAuthConfig => {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CALENDAR_CLIENT_SECRET",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/auth/google-calendar/callback`,
  };
};

/**
 * Generate Google Calendar OAuth URL
 *
 * @param state - CSRF protection token (format: {random}:{clientId})
 * @returns Full OAuth URL to redirect to
 */
export const getGoogleCalendarOAuthURL = (state: string): string => {
  const config = getGoogleOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline", // Get refresh token
    prompt: "consent", // Always show consent (ensures refresh token)
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for access + refresh tokens
 *
 * @param code - Authorization code from Google callback
 * @returns Access token, refresh token, user email, and expiry
 */
export const exchangeGoogleCodeForTokens = async (
  code: string,
): Promise<GoogleTokenResponse> => {
  const config = getGoogleOAuthConfig();

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.json();
    console.error("[Google Calendar OAuth] Token exchange failed:", error);
    throw new Error(
      `Google token exchange failed: ${
        error.error_description || error.error || "Unknown error"
      }`,
    );
  }

  const tokenData = await tokenRes.json();

  if (!tokenData.refresh_token) {
    console.warn(
      "[Google Calendar OAuth] No refresh token received. User may have already granted access.",
    );
  }

  // Get user email using the access token
  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  );

  if (!userInfoRes.ok) {
    const userInfoError = await userInfoRes.text();
    console.error(
      "[Google Calendar OAuth] Userinfo failed:",
      userInfoRes.status,
      userInfoError,
    );
    throw new Error(`Failed to fetch Google user info: ${userInfoRes.status}`);
  }

  const userInfo = await userInfoRes.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || "",
    userEmail: userInfo.email,
    expiresIn: tokenData.expires_in || 3600,
  };
};

/**
 * Refresh an expired Google access token using the refresh token
 *
 * @param refreshToken - Stored refresh token from Vault
 * @returns New access token and expiry
 */
export const refreshGoogleAccessToken = async (
  refreshToken: string,
): Promise<GoogleRefreshResponse> => {
  const config = getGoogleOAuthConfig();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("[Google Calendar OAuth] Token refresh failed:", error);
    throw new Error(
      `Google token refresh failed: ${
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

/**
 * Generate cryptographically secure random state with embedded clientId
 *
 * @param clientId - UUID of the client to embed in state
 * @returns State string in format {random}:{clientId}
 */
export const generateCalendarOAuthState = (clientId: string): string => {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${random}:${clientId}`;
};

/**
 * Extract clientId from state parameter
 *
 * @param state - State string from callback
 * @returns clientId extracted from state
 */
export const extractClientIdFromState = (state: string): string | null => {
  const parts = state.split(":");
  if (parts.length < 2) return null;
  return parts.slice(1).join(":"); // Handle UUIDs that may contain colons
};
