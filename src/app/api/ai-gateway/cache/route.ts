/**
 * AI Gateway Cache API Route
 * 
 * GET /api/ai-gateway/cache - List cache entries
 * DELETE /api/ai-gateway/cache - Invalidate cache entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Fetch cache entries
    const { data: cacheEntries, error } = await supabase
      .from('gateway_cache_performance')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('hit_count', { ascending: false })
      .limit(50)

    if (error) throw error

    // Transform data
    const entries = (cacheEntries || []).map(entry => {
      const now = new Date()
      const expiresAt = new Date(entry.expires_at)
      const ttlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))

      // Estimate savings (rough calculation)
      const estimatedCostPerToken = 0.0002 // BRL
      const savingsBRL = (entry.tokens_saved || 0) * estimatedCostPerToken

      return {
        cacheKey: entry.cache_key,
        promptPreview: entry.prompt_preview || entry.cache_key.substring(0, 100),
        hitCount: entry.hit_count || 0,
        tokensSaved: entry.tokens_saved || 0,
        savingsBRL,
        lastAccessedAt: entry.last_accessed_at,
        expiresAt: entry.expires_at,
        ttlSeconds,
      }
    })

    return NextResponse.json({ entries })
  } catch (error: any) {
    console.error('Error fetching cache entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cache' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { cacheKey } = body

    if (!cacheKey) {
      return NextResponse.json(
        { error: 'cacheKey is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (cacheKey === 'ALL') {
      // Clear all cache
      const { error } = await supabase
        .from('gateway_cache_performance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
    } else {
      // Clear specific cache entry
      const { error } = await supabase
        .from('gateway_cache_performance')
        .delete()
        .eq('cache_key', cacheKey)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error invalidating cache:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
