/**
 * AI Gateway Config API Route
 * 
 * GET /api/ai-gateway/config - Get cache configuration
 * PUT /api/ai-gateway/config - Update cache configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { clearConfigCache } from '@/lib/ai-gateway/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Fetch shared gateway config
    const { data: config, error } = await supabase
      .from('shared_gateway_config')
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      cacheEnabled: config.cache_enabled ?? true,
      cacheTTLSeconds: config.cache_ttl_seconds ?? 3600,
      defaultFallbackChain: config.default_fallback_chain || [],
    })
  } catch (error: any) {
    console.error('Error fetching gateway config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cacheEnabled, cacheTTLSeconds, defaultFallbackChain } = body

    // Validate input
    if (cacheTTLSeconds && (cacheTTLSeconds < 0 || cacheTTLSeconds > 86400)) {
      return NextResponse.json(
        { error: 'cacheTTLSeconds must be between 0 and 86400' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get existing config ID
    const { data: existingConfig, error: fetchError } = await supabase
      .from('shared_gateway_config')
      .select('id')
      .single()

    if (fetchError) throw fetchError

    // Update config
    const { error: updateError } = await supabase
      .from('shared_gateway_config')
      .update({
        cache_enabled: cacheEnabled,
        cache_ttl_seconds: cacheTTLSeconds,
        default_fallback_chain: defaultFallbackChain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingConfig.id)

    if (updateError) throw updateError

    // Clear config cache
    clearConfigCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating gateway config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update config' },
      { status: 500 }
    )
  }
}
