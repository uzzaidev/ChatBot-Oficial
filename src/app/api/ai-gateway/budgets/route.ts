/**
 * AI Gateway Budgets API Route
 * 
 * GET /api/ai-gateway/budgets - List all client budgets with usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Fetch all client budgets with client information
    const { data: budgets, error } = await supabase
      .from('client_budgets')
      .select(`
        *,
        clients:client_id (
          id,
          name
        )
      `)
      .order('usage_percentage', { ascending: false })

    if (error) throw error

    // Transform data to match frontend interface
    const transformedBudgets = (budgets || []).map((budget: any) => ({
      id: budget.id,
      clientId: budget.client_id,
      clientName: budget.clients?.name || 'Unknown Client',
      budgetType: budget.budget_type,
      budgetLimit: parseFloat(budget.budget_limit),
      currentUsage: parseFloat(budget.current_usage || 0),
      usagePercentage: parseFloat(budget.usage_percentage || 0),
      budgetPeriod: budget.budget_period,
      isPaused: budget.is_paused,
      nextResetAt: budget.next_reset_at,
      lastResetAt: budget.last_reset_at,
    }))

    return NextResponse.json({ budgets: transformedBudgets })
  } catch (error: any) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}
