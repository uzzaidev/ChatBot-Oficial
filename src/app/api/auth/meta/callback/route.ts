/**
 * Meta OAuth - Callback Endpoint
 *
 * Receives authorization code from Meta → exchanges for token →
 * fetches WABA details → creates client → redirects to onboarding
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, fetchWABADetails } from '@/lib/meta-oauth'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'
import { createSecret } from '@/lib/vault'

export const dynamic = 'force-dynamic'

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual inteligente integrado ao WhatsApp Business.

Seu objetivo é ajudar os clientes de forma eficiente, amigável e profissional.

Diretrizes:
- Seja sempre cortês e prestativo
- Responda de forma clara e objetiva
- Se não souber algo, seja honesto
- Use emojis moderadamente para tornar a conversa mais amigável
- Mantenha o tom profissional mas acolhedor

Lembre-se: você está representando uma empresa, então mantenha sempre a qualidade do atendimento.`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')
    const errorDescription = searchParams.get('error_description')

    // 1. Handle OAuth errors
    if (error) {
      console.error('[Meta OAuth Callback] OAuth error:', {
        error,
        reason: errorReason,
        description: errorDescription,
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=oauth_failed&reason=${error}`
      )
    }

    // 2. Validate required parameters
    if (!code || !state) {
      console.error('[Meta OAuth Callback] Missing code or state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=invalid_callback`
      )
    }

    // 3. Validate CSRF token
    const cookieStore = await cookies()
    const storedState = cookieStore.get('meta_oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('[Meta OAuth Callback] Invalid state (CSRF protection)')
      console.error('  Stored:', storedState?.substring(0, 20))
      console.error('  Received:', state.substring(0, 20))
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=csrf_failed`
      )
    }

    // 4. Clear state cookie
    cookieStore.delete('meta_oauth_state')

    console.log('[Meta OAuth Callback] ✅ State validated, exchanging code for token')

    // 5. Exchange code for access token
    const accessToken = await exchangeCodeForToken(code)

    console.log('[Meta OAuth Callback] ✅ Token received, fetching WABA details')

    // 6. Fetch WABA details
    const { wabaId, phoneNumberId, displayPhone, businessId } = await fetchWABADetails(accessToken)

    console.log('[Meta OAuth Callback] ✅ WABA details:', {
      wabaId,
      phoneNumberId,
      displayPhone,
      businessId,
    })

    // 7. Check if WABA already exists
    const supabase = await createServerClient()

    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name')
      .eq('meta_waba_id', wabaId)
      .single()

    if (existingClient) {
      console.warn('[Meta OAuth Callback] WABA already connected:', wabaId)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=waba_already_connected&client=${existingClient.name}`
      )
    }

    console.log('[Meta OAuth Callback] ✅ WABA is new, creating client')

    // 8. Store Meta access token in Vault
    const metaTokenSecretId = await createSecret(
      accessToken,
      `meta_token_${wabaId}`,
      `Meta access token from OAuth (WABA: ${wabaId})`
    )

    // 9. Create placeholder secrets for AI providers (user configures later)
    const openaiKeySecretId = await createSecret(
      'CONFIGURE_IN_SETTINGS',
      `openai_${wabaId}`,
      'Placeholder - configure in dashboard'
    )

    const groqKeySecretId = await createSecret(
      'CONFIGURE_IN_SETTINGS',
      `groq_${wabaId}`,
      'Placeholder - configure in dashboard'
    )

    // 10. Create client record
    const { data: client, error: createError } = await supabase
      .from('clients')
      .insert({
        name: `WhatsApp (${displayPhone})`,
        slug: `wa-${wabaId.slice(-6)}-${Date.now()}`,
        status: 'pending_setup', // Not active until AI keys configured
        plan: 'trial',

        // Meta WhatsApp configuration
        meta_waba_id: wabaId,
        meta_phone_number_id: phoneNumberId,
        meta_display_phone: displayPhone,
        meta_access_token_secret_id: metaTokenSecretId,

        // AI provider secrets (placeholders)
        openai_api_key_secret_id: openaiKeySecretId,
        groq_api_key_secret_id: groqKeySecretId,

        // Default AI configuration
        primary_model_provider: 'openai',
        openai_model: 'gpt-4o-mini',
        groq_model: 'llama-3.3-70b-versatile',
        system_prompt: DEFAULT_SYSTEM_PROMPT,

        // Webhook routing
        webhook_routing_mode: 'waba', // Use new single webhook

        // Auto-provisioning metadata
        auto_provisioned: true,
        provisioned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('[Meta OAuth Callback] Failed to create client:', createError)
      throw createError
    }

    console.log('[Meta OAuth Callback] ✅ Client created:', client.id)

    // 11. TODO: Send admin notification email
    // await sendAdminEmail({
    //   subject: `🚀 New WABA Connected: ${displayPhone}`,
    //   body: `Client ${client.id} auto-provisioned via OAuth`,
    // })

    // 12. TODO: Create user account and link to client
    // For now, redirect to onboarding where user can configure AI keys
    // In future: create auth account here

    // 13. Redirect to onboarding (AI configuration step)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/onboarding?step=ai-config&client_id=${client.id}&success=true`
    )
  } catch (error) {
    console.error('[Meta OAuth Callback] Error:', error)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/onboarding?error=oauth_processing_failed&message=${
        error instanceof Error ? encodeURIComponent(error.message) : 'unknown'
      }`
    )
  }
}
