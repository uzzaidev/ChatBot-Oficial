/**
 * Meta OAuth Helpers for Embedded Signup
 *
 * Handles WhatsApp Business Account (WABA) OAuth flow for multi-tenant platform
 * Replaces manual webhook configuration with self-service onboarding
 */

interface MetaOAuthConfig {
  appId: string
  appSecret: string
  redirectUri: string
  configId: string // Embedded Signup Configuration ID
}

interface WABADetails {
  wabaId: string
  phoneNumberId: string
  displayPhone: string
  accessToken: string
  businessId: string
}

/**
 * Generate Meta OAuth URL for Embedded Signup
 * User clicks "Conectar WhatsApp" → redirects here
 */
export const getMetaOAuthURL = (state: string): string => {
  const config = getOAuthConfig()

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state, // CSRF protection
    // Embedded Signup uses configuration_id instead of scope
    // config_id: config.configId, // Uncomment when you get the Configuration ID from Meta Dashboard
  })

  // Note: Embedded Signup URL may differ from standard OAuth
  // Check Meta docs for exact endpoint (might be /dialog/oauth or specific Embedded Signup URL)
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const config = getOAuthConfig()

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const response = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('[Meta OAuth] Token exchange failed:', error)
    throw new Error(`Token exchange failed: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Fetch WhatsApp Business Account details from Meta Graph API
 *
 * OAuth Flow:
 * 1. Get user's business accounts
 * 2. Get WhatsApp Business Accounts (WABAs) from business
 * 3. Get phone numbers from WABA
 */
export const fetchWABADetails = async (accessToken: string): Promise<WABADetails> => {
  try {
    // 1. Get user's business accounts
    const businessRes = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
    )

    if (!businessRes.ok) {
      const error = await businessRes.json()
      throw new Error(`Failed to fetch businesses: ${error.error?.message}`)
    }

    const { data: businesses } = await businessRes.json()

    if (!businesses || businesses.length === 0) {
      throw new Error('No business account found. User must have a Meta Business Manager account.')
    }

    const businessId = businesses[0].id

    // 2. Get WhatsApp Business Accounts
    const wabaRes = await fetch(
      `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
    )

    if (!wabaRes.ok) {
      const error = await wabaRes.json()
      throw new Error(`Failed to fetch WABAs: ${error.error?.message}`)
    }

    const { data: wabas } = await wabaRes.json()

    if (!wabas || wabas.length === 0) {
      throw new Error('No WhatsApp Business Account found. User must have a WABA.')
    }

    const wabaId = wabas[0].id

    // 3. Get phone numbers
    const phoneRes = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`
    )

    if (!phoneRes.ok) {
      const error = await phoneRes.json()
      throw new Error(`Failed to fetch phone numbers: ${error.error?.message}`)
    }

    const { data: phones } = await phoneRes.json()

    if (!phones || phones.length === 0) {
      throw new Error('No phone number found in WABA. User must add a phone number first.')
    }

    const phone = phones[0]

    return {
      wabaId,
      phoneNumberId: phone.id,
      displayPhone: phone.display_phone_number,
      accessToken, // Long-lived token (60 days by default)
      businessId,
    }
  } catch (error) {
    console.error('[Meta OAuth] Failed to fetch WABA details:', error)
    throw error
  }
}

/**
 * Get OAuth configuration from environment variables
 */
const getOAuthConfig = (): MetaOAuthConfig => {
  const appId = process.env.META_PLATFORM_APP_ID
  const appSecret = process.env.META_PLATFORM_APP_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://uzzap.uzzai.com.br'
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID

  if (!appId || !appSecret) {
    throw new Error('Missing META_PLATFORM_APP_ID or META_PLATFORM_APP_SECRET')
  }

  return {
    appId,
    appSecret,
    redirectUri: `${baseUrl}/api/auth/meta/callback`,
    configId: configId || '', // Optional for now
  }
}

/**
 * Validate OAuth state parameter (CSRF protection)
 */
export const generateOAuthState = (): string => {
  // Generate cryptographically secure random string
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
