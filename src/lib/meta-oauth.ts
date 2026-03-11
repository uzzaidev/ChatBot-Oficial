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
    scope:
      "whatsapp_business_messaging,whatsapp_business_management,business_management",
    response_type: "code",
    auth_type: "rerequest", // Force re-granting all permissions
  });

  // NOTE: config_id for Embedded Signup disabled — config 1247304987342255 is
  // broken on Meta's side. Re-enable when a new config is created in the
  // Facebook Developer Console → WhatsApp → Embedded Signup.

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
      // Strategy B: Fallback without business_management
      // Try getting WABA via shared_whatsapp_business_accounts or direct endpoints
      console.log(
        "[Meta OAuth] business_management NOT granted, trying fallback strategy",
      );

      // Try /me/businesses with limited scope (sometimes works with whatsapp_business_management)
      const businessRes = await fetch(
        `https://graph.facebook.com/v22.0/me/businesses?access_token=${accessToken}`,
      );

      if (businessRes.ok) {
        const { data: businesses } = await businessRes.json();
        if (businesses && businesses.length > 0) {
          businessId = businesses[0].id;
          console.log("[Meta OAuth] Fallback: Got business ID:", businessId);

          // Try client_whatsapp_business_accounts (shared access)
          const sharedWabaRes = await fetch(
            `https://graph.facebook.com/v22.0/${businessId}/client_whatsapp_business_accounts?access_token=${accessToken}`,
          );

          if (sharedWabaRes.ok) {
            const { data: wabas } = await sharedWabaRes.json();
            if (wabas && wabas.length > 0) {
              wabaId = wabas[0].id;
              console.log(
                "[Meta OAuth] Fallback: Got WABA from client_whatsapp_business_accounts:",
                wabaId,
              );
            }
          }

          // If not found, try owned_whatsapp_business_accounts anyway
          if (!wabaId) {
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
          `Missing business_management permission. Granted permissions: ${permissions.join(
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
 * Validate OAuth state parameter (CSRF protection)
 */
export const generateOAuthState = (): string => {
  // Generate cryptographically secure random string
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
