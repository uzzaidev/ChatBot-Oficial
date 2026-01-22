/**
 * BUDGET STATUS API
 *
 * GET /api/budget/status - Get current user's budget status
 *
 * Returns:
 * - Budget mode (tokens/brl/both)
 * - Current usage (tokens + BRL)
 * - Limits
 * - Percentages
 * - Pause status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const filterClientId = searchParams.get('clientId') // Admin can filter by client

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile (client_id + role)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Determine which client's budget to fetch
    const isAdmin = profile.role === 'admin'
    const targetClientId = isAdmin && filterClientId ? filterClientId : profile.client_id

    // Get budget status
    const { data: budget, error: budgetError } = await supabase
      .from('budget_status')
      .select('*')
      .eq('client_id', targetClientId)
      .single()

    if (budgetError) {
      // No budget configured
      return NextResponse.json({
        hasBudget: false,
        message: 'No budget configured for this client',
      })
    }

    // Return simplified response for tenant
    return NextResponse.json({
      hasBudget: true,
      budgetMode: budget.budget_mode,

      // Token info
      tokenLimit: budget.token_limit,
      currentTokens: budget.current_tokens,
      tokenUsagePercentage: budget.token_usage_percentage,

      // BRL info
      brlLimit: budget.brl_limit,
      currentBRL: budget.current_brl,
      brlUsagePercentage: budget.brl_usage_percentage,

      // Overall status
      usagePercentage: budget.usage_percentage,
      isPaused: budget.is_paused,
      pauseReason: budget.pause_reason,
      status: budget.status,

      // Period info
      budgetPeriod: budget.budget_period,
      nextResetAt: budget.next_reset_at,
      lastResetAt: budget.last_reset_at,
    })
  } catch (error: any) {
    console.error('[Budget Status] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
