/**
 * Budget Current Usage API Route
 * 
 * GET /api/budget/current-usage - Get current period usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch budget config
    const { data: budget, error: budgetError } = await supabase
      .from('client_budgets')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (budgetError) {
      if (budgetError.code === 'PGRST116') {
        // No budget configured
        return NextResponse.json({
          exists: false,
          usage: 0,
          limit: 0,
          percentage: 0,
          remaining: 0,
        })
      }
      throw budgetError
    }

    // Calculate period start date
    const now = new Date()
    const periodStart = new Date(budget.period_start_at || now)

    // Fetch usage logs for current period
    const { data: usageLogs, error: usageError } = await supabase
      .from('gateway_usage_logs')
      .select('cost_brl, input_tokens, output_tokens')
      .eq('client_id', clientId)
      .gte('created_at', periodStart.toISOString())

    if (usageError) throw usageError

    // Calculate current usage based on budget type
    let currentUsage = 0

    switch (budget.budget_type) {
      case 'tokens':
        currentUsage = (usageLogs || []).reduce(
          (sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0),
          0
        )
        break
      case 'brl':
      case 'usd':
        currentUsage = (usageLogs || []).reduce(
          (sum, log) => sum + (log.cost_brl || 0),
          0
        )
        break
    }

    const limit = budget.budget_limit || 0
    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0
    const remaining = Math.max(0, limit - currentUsage)

    // Calculate days remaining in period
    const nextReset = new Date(budget.next_reset_at)
    const daysRemaining = Math.max(0, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Projection: estimate usage at end of period
    const daysSincePeriodStart = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
    const dailyAverage = currentUsage / daysSincePeriodStart
    const periodDuration = Math.ceil((nextReset.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const projectedUsage = dailyAverage * periodDuration

    return NextResponse.json({
      exists: true,
      usage: currentUsage,
      limit,
      percentage,
      remaining,
      budgetType: budget.budget_type,
      isPaused: budget.is_paused || false,
      daysRemaining,
      projectedUsage,
      nextResetAt: budget.next_reset_at,
    })
  } catch (error: any) {
    console.error('Error fetching current usage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch current usage' },
      { status: 500 }
    )
  }
}
