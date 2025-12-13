/**
 * AI GATEWAY SETUP API
 *
 * Admin-only endpoint to configure shared AI Gateway keys
 * Saves keys to Supabase Vault and updates shared_gateway_config
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// =====================================================
// TYPES
// =====================================================

interface SetupRequest {
  gatewayApiKey: string // vck_...
  openaiApiKey?: string // sk-proj-...
  groqApiKey?: string // gsk_...
  anthropicApiKey?: string // sk-ant-...
  googleApiKey?: string // AIza...
  cacheEnabled?: boolean
  cacheTTLSeconds?: number
  defaultFallbackChain?: string[]
}

// =====================================================
// GET - Fetch Current Configuration
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch shared config
    const { data: config, error } = await supabase
      .from('shared_gateway_config')
      .select('*')
      .single()

    if (error) {
      console.error('[AI Gateway Setup] Error fetching config:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    // Return config metadata (without decrypted keys)
    return NextResponse.json({
      id: config.id,
      hasGatewayKey: !!config.gateway_api_key_secret_id,
      hasOpenAIKey: !!config.openai_api_key_secret_id,
      hasGroqKey: !!config.groq_api_key_secret_id,
      hasAnthropicKey: !!config.anthropic_api_key_secret_id,
      hasGoogleKey: !!config.google_api_key_secret_id,
      cacheEnabled: config.cache_enabled,
      cacheTTLSeconds: config.cache_ttl_seconds,
      defaultFallbackChain: config.default_fallback_chain,
      maxRequestsPerMinute: config.max_requests_per_minute,
      maxTokensPerMinute: config.max_tokens_per_minute,
      updatedAt: config.updated_at,
    })
  } catch (error: any) {
    console.error('[AI Gateway Setup] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =====================================================
// POST - Save Keys to Vault and Update Config
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body: SetupRequest = await request.json()

    // Validate gateway key (required)
    if (!body.gatewayApiKey || !body.gatewayApiKey.startsWith('vck_')) {
      return NextResponse.json(
        { error: 'Invalid gateway key. Must start with vck_' },
        { status: 400 }
      )
    }

    // Fetch current config
    const { data: currentConfig } = await supabase
      .from('shared_gateway_config')
      .select('*')
      .single()

    if (!currentConfig) {
      return NextResponse.json(
        { error: 'Shared gateway config not found. Run migrations first.' },
        { status: 500 }
      )
    }

    // =====================================================
    // SAVE KEYS TO VAULT
    // =====================================================

    const secretIds: Record<string, string> = {}

    // Helper function to create or update vault secret
    const createOrUpdateSecret = async (
      secretValue: string,
      secretName: string
    ): Promise<string> => {
      try {
        // Call the PostgreSQL wrapper function via RPC
        const { data: secretId, error } = await supabase.rpc('create_vault_secret', {
          p_secret: secretValue,
          p_name: secretName,
          p_description: `Shared ${secretName} for AI Gateway`,
        })

        if (error) {
          console.error(`[AI Gateway Setup] Error creating secret ${secretName}:`, error)
          throw new Error(`Failed to create secret: ${error.message}`)
        }

        if (!secretId) {
          throw new Error(`No secret ID returned for ${secretName}`)
        }

        console.log(`[AI Gateway Setup] Created/retrieved secret ${secretName}: ${secretId}`)
        return secretId
      } catch (error: any) {
        console.error(`[AI Gateway Setup] Exception creating secret ${secretName}:`, error)
        throw error
      }
    }

    // 1. Gateway API Key (required)
    try {
      secretIds.gateway = await createOrUpdateSecret(body.gatewayApiKey, 'shared_gateway_api_key')
    } catch (error: any) {
      console.error('[AI Gateway Setup] Error with gateway secret:', error)
      return NextResponse.json({ error: 'Failed to save gateway key to Vault' }, { status: 500 })
    }

    // 2. OpenAI API Key (optional)
    if (body.openaiApiKey) {
      try {
        secretIds.openai = await createOrUpdateSecret(body.openaiApiKey, 'shared_openai_api_key')
      } catch (error) {
        console.warn('[AI Gateway Setup] Failed to save OpenAI key, continuing...')
      }
    }

    // 3. Groq API Key (optional)
    if (body.groqApiKey) {
      try {
        secretIds.groq = await createOrUpdateSecret(body.groqApiKey, 'shared_groq_api_key')
      } catch (error) {
        console.warn('[AI Gateway Setup] Failed to save Groq key, continuing...')
      }
    }

    // 4. Anthropic API Key (optional)
    if (body.anthropicApiKey) {
      try {
        secretIds.anthropic = await createOrUpdateSecret(
          body.anthropicApiKey,
          'shared_anthropic_api_key'
        )
      } catch (error) {
        console.warn('[AI Gateway Setup] Failed to save Anthropic key, continuing...')
      }
    }

    // 5. Google API Key (optional)
    if (body.googleApiKey) {
      try {
        secretIds.google = await createOrUpdateSecret(body.googleApiKey, 'shared_google_api_key')
      } catch (error) {
        console.warn('[AI Gateway Setup] Failed to save Google key, continuing...')
      }
    }

    // =====================================================
    // UPDATE shared_gateway_config
    // =====================================================

    const updateData: Record<string, any> = {
      gateway_api_key_secret_id: secretIds.gateway,
    }

    if (secretIds.openai) updateData.openai_api_key_secret_id = secretIds.openai
    if (secretIds.groq) updateData.groq_api_key_secret_id = secretIds.groq
    if (secretIds.anthropic) updateData.anthropic_api_key_secret_id = secretIds.anthropic
    if (secretIds.google) updateData.google_api_key_secret_id = secretIds.google

    // Update cache settings if provided
    if (typeof body.cacheEnabled === 'boolean') {
      updateData.cache_enabled = body.cacheEnabled
    }
    if (body.cacheTTLSeconds) {
      updateData.cache_ttl_seconds = body.cacheTTLSeconds
    }
    if (body.defaultFallbackChain) {
      updateData.default_fallback_chain = body.defaultFallbackChain
    }

    const { error: updateError } = await supabase
      .from('shared_gateway_config')
      .update(updateData)
      .eq('id', currentConfig.id)

    if (updateError) {
      console.error('[AI Gateway Setup] Error updating config:', updateError)
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
    }

    // =====================================================
    // CLEAR CACHE (server-side config cache)
    // =====================================================

    // TODO: Add cache invalidation if needed
    // For now, the 5-minute cache in config.ts will refresh automatically

    return NextResponse.json({
      success: true,
      message: 'AI Gateway configured successfully',
      keysAdded: {
        gateway: true,
        openai: !!secretIds.openai,
        groq: !!secretIds.groq,
        anthropic: !!secretIds.anthropic,
        google: !!secretIds.google,
      },
    })
  } catch (error: any) {
    console.error('[AI Gateway Setup] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =====================================================
// DELETE - Clear Configuration (Admin only)
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch current config
    const { data: config } = await supabase.from('shared_gateway_config').select('*').single()

    if (!config) {
      return NextResponse.json({ error: 'No configuration to delete' }, { status: 404 })
    }

    // Clear secret IDs (keeps the record, just removes key references)
    const { error } = await supabase
      .from('shared_gateway_config')
      .update({
        gateway_api_key_secret_id: null,
        openai_api_key_secret_id: null,
        groq_api_key_secret_id: null,
        anthropic_api_key_secret_id: null,
        google_api_key_secret_id: null,
      })
      .eq('id', config.id)

    if (error) {
      console.error('[AI Gateway Setup] Error clearing config:', error)
      return NextResponse.json({ error: 'Failed to clear configuration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'AI Gateway configuration cleared',
    })
  } catch (error: any) {
    console.error('[AI Gateway Setup] DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
