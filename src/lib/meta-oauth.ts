/**
 * Meta OAuth Helpers for Embedded Signup
 *
 * Handles WhatsApp Business Account (WABA) OAuth flow for multi-tenant platform
 * Replaces manual webhook configuration with self-service onboarding
 */

interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  configId: string | null;
}

interface WABADetails {
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string;
  accessToken: string;
  businessId: string;
}

/**
 * Generate Meta OAuth URL for Embedded Signup
 * User clicks "Conectar WhatsApp" → redirects here
 */
export const getMetaOAuthURL = (state: string): string => {
  const config = getOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state, // CSRF protection
    response_type: "code",
  });

  if (config.configId) {
    // Embedded Signup: config_id defines permissions, do NOT set scope or auth_type
    params.set("config_id", config.configId);
  } else {
    // Fallback: manual OAuth without Embedded Signup
    params.set(
      "scope",
      "whatsapp_business_messaging,whatsapp_business_management,business_management",
    );
    params.set("auth_type", "rerequest");
  }

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const config = getOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("[Meta OAuth] Token exchange failed:", error);
    throw new Error(
      `Token exchange failed: ${error.error?.message || "Unknown error"}`,
    );
  }

  const data = await response.json();
  return data.access_token;
};

/**
 * Check which permissions were actually granted for a token
 */
export const checkTokenPermissions = async (
  accessToken: string,
): Promise<string[]> => {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`,
  );

  if (!res.ok) {
    console.error("[Meta OAuth] Failed to check permissions");
    return [];
  }

  const { data } = await res.json();
  const granted = (data || [])
    .filter((p: { status: string }) => p.status === "granted")
    .map((p: { permission: string }) => p.permission);
  const declined = (data || [])
    .filter((p: { status: string }) => p.status === "declined")
    .map((p: { permission: string }) => p.permission);

  console.log("[Meta OAuth] Granted permissions:", granted);
  if (declined.length > 0) {
    console.warn("[Meta OAuth] Declined permissions:", declined);
  }

  return granted;
};

/**
 * Fetch WhatsApp Business Account details from Meta Graph API
 *
 * Strategy:
 * 1. Check permissions granted
 * 2. If business_management: /me/businesses → /{biz}/owned_whatsapp_business_accounts
 * 3. Fallback: /me/whatsapp_business_accounts (whatsapp_business_management only)
 * 4. Get phone numbers from WABA
 */
export const fetchWABADetails = async (
  accessToken: string,
): Promise<WABADetails> => {
  try {
    // 0. Check actual permissions
    const permissions = await checkTokenPermissions(accessToken);
    const hasBusinessManagement = permissions.includes("business_management");

    let businessId = "";
    let wabaId = "";

    if (hasBusinessManagement) {
      // Strategy A: via /me/businesses (requires business_management)
      console.log("[Meta OAuth] Using business_management strategy");

      const businessRes = await fetch(
        `https://graph.facebook.com/v22.0/me/businesses?access_token=${accessToken}`,
      );

      if (!businessRes.ok) {
        const error = await businessRes.json();
        console.error("[Meta OAuth] /me/businesses failed:", error);
        throw new Error(`Failed to fetch businesses: ${error.error?.message}`);
      }

      const { data: businesses } = await businessRes.json();

      if (!businesses || businesses.length === 0) {
        throw new Error("No business account found.");
      }

      businessId = businesses[0].id;
      console.log("[Meta OAuth] Business ID:", businessId);

      const wabaRes = await fetch(
        `https://graph.facebook.com/v22.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`,
      );

      if (!wabaRes.ok) {
        const error = await wabaRes.json();
        console.error(
          "[Meta OAuth] owned_whatsapp_business_accounts failed:",
          error,
        );
        throw new Error(`Failed to fetch WABAs: ${error.error?.message}`);
      }

      const { data: wabas } = await wabaRes.json();

      if (!wabas || wabas.length === 0) {
        throw new Error("No WhatsApp Business Account found.");
      }

      wabaId = wabas[0].id;
    } else {
      // Strategy B: Embedded Signup flow (whatsapp_business_management only)
      // Use debug_token to extract WABA IDs from granular_scopes
      console.log(
        "[Meta OAuth] business_management NOT granted, trying debug_token strategy",
      );

      const config = getOAuthConfig();
      const appToken = `${config.appId}|${config.appSecret}`;
      const debugRes = await fetch(
        `https://graph.facebook.com/v22.0/debug_token?input_token=${encodeURIComponent(
          accessToken,
        )}&access_token=${encodeURIComponent(appToken)}`,
      );

      if (debugRes.ok) {
        const debugData = await debugRes.json();
        const granularScopes = debugData?.data?.granular_scopes ?? [];
        console.log(
          "[Meta OAuth] debug_token granular_scopes:",
          JSON.stringify(granularScopes),
        );

        const wabaScope = granularScopes.find(
          (s: { scope: string; target_ids?: string[] }) =>
            s.scope === "whatsapp_business_management" &&
            s.target_ids &&
            s.target_ids.length > 0,
        );

        if (wabaScope) {
          wabaId = wabaScope.target_ids[0];
          console.log("[Meta OAuth] Got WABA ID from debug_token:", wabaId);
        }
      } else {
        console.error(
          "[Meta OAuth] debug_token request failed:",
          await debugRes.text(),
        );
      }

      // Fallback: try /me/businesses if debug_token didn't work
      if (!wabaId) {
        const businessRes = await fetch(
          `https://graph.facebook.com/v22.0/me/businesses?access_token=${accessToken}`,
        );

        if (businessRes.ok) {
          const { data: businesses } = await businessRes.json();
          if (businesses && businesses.length > 0) {
            businessId = businesses[0].id;
            console.log("[Meta OAuth] Fallback: Got business ID:", businessId);

            const ownedRes = await fetch(
              `https://graph.facebook.com/v22.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`,
            );
            if (ownedRes.ok) {
              const { data: wabas } = await ownedRes.json();
              if (wabas && wabas.length > 0) {
                wabaId = wabas[0].id;
                console.log(
                  "[Meta OAuth] Fallback: Got WABA from owned_whatsapp_business_accounts:",
                  wabaId,
                );
              }
            }
          }
        }
      }

      if (!wabaId) {
        throw new Error(
          `Could not find WABA ID. Granted permissions: ${permissions.join(
            ", ",
          )}. ` +
            "Please revoke app access at https://www.facebook.com/settings?tab=business_tools and retry.",
        );
      }
    }

    console.log("[Meta OAuth] WABA ID:", wabaId);

    // 3. Get phone numbers from WABA
    const phoneRes = await fetch(
      `https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?access_token=${accessToken}`,
    );

    if (!phoneRes.ok) {
      const error = await phoneRes.json();
      throw new Error(`Failed to fetch phone numbers: ${error.error?.message}`);
    }

    const { data: phones } = await phoneRes.json();

    if (!phones || phones.length === 0) {
      throw new Error(
        "No phone number found in WABA. User must add a phone number first.",
      );
    }

    const phone = phones[0];

    return {
      wabaId,
      phoneNumberId: phone.id,
      displayPhone: phone.display_phone_number,
      accessToken,
      businessId,
    };
  } catch (error) {
    console.error("[Meta OAuth] Failed to fetch WABA details:", error);
    throw error;
  }
};

/**
 * Get OAuth configuration from environment variables
 */
const getOAuthConfig = (): MetaOAuthConfig => {
  const appId = process.env.META_PLATFORM_APP_ID;
  const appSecret = process.env.META_PLATFORM_APP_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || null;

  if (!appId || !appSecret) {
    throw new Error("Missing META_PLATFORM_APP_ID or META_PLATFORM_APP_SECRET");
  }

  return {
    appId,
    appSecret,
    redirectUri: `${baseUrl}/api/auth/meta/callback`,
    configId,
  };
};

/**
 * Subscribe UzzApp to a client's WABA so we receive webhook events
 * Must be called after Embedded Signup to route messages to /api/webhook
 *
 * API: POST /{waba_id}/subscribed_apps
 * Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup/manage-accounts#subscribe-to-webhooks
 */
export const subscribeAppToWABA = async (
  wabaId: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("[Meta OAuth] subscribeAppToWABA:", {
      wabaId,
      tokenPrefix: accessToken.substring(0, 12) + "...",
    });

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[Meta OAuth] subscribeAppToWABA failed:", error);
      return {
        success: false,
        error: error.error?.message || "Failed to subscribe app to WABA",
      };
    }

    const data = await response.json();
    console.log("[Meta OAuth] ✅ App subscribed to WABA:", wabaId, data);
    return { success: true };
  } catch (error) {
    console.error("[Meta OAuth] subscribeAppToWABA exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Register a phone number with WhatsApp Cloud API
 * Required to send/receive messages via the Cloud API
 *
 * API: POST /{phone_number_id}/register
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/registration
 */
export const registerPhoneNumber = async (
  phoneNumberId: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("[Meta OAuth] registerPhoneNumber:", {
      phoneNumberId,
      tokenPrefix: accessToken.substring(0, 12) + "...",
    });

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin: String(Math.floor(100000 + Math.random() * 900000)),
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      // Error 100 "already registered" is fine — means number was already on Cloud API
      if (error.error?.code === 100) {
        console.log(
          "[Meta OAuth] Phone already registered (OK):",
          phoneNumberId,
        );
        return { success: true };
      }
      // Error 2388001 = 2FA enabled — user must disable it first
      if (error.error?.code === 2388001) {
        console.warn(
          "[Meta OAuth] 2FA is enabled, cannot register phone:",
          phoneNumberId,
        );
        return {
          success: false,
          error: "2FA_ENABLED",
        };
      }
      console.error("[Meta OAuth] registerPhoneNumber failed:", error);
      return {
        success: false,
        error: error.error?.message || "Failed to register phone number",
      };
    }

    const data = await response.json();
    console.log(
      "[Meta OAuth] ✅ Phone number registered:",
      phoneNumberId,
      data,
    );
    return { success: true };
  } catch (error) {
    console.error("[Meta OAuth] registerPhoneNumber exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Fetch Meta user ID from access token (for deauth handler)
 */
export const fetchMetaUserId = async (
  accessToken: string,
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id&access_token=${accessToken}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.id || null;
  } catch {
    return null;
  }
};

/**
 * Validate OAuth state parameter (CSRF protection)
 */
export const generateOAuthState = (): string => {
  // Generate cryptographically secure random string
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
