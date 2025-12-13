/**
 * Budget Config API Route
 * 
 * GET /api/budget/config - Get budget configuration
 * POST /api/budget/config - Create/update budget configuration
 * DELETE /api/budget/config - Reset to plan default
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
    const { data: budget, error } = await supabase
      .from('client_budgets')
      .select('*, clients(name, plan)')
      .eq('client_id', clientId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No budget found, return defaults
        return NextResponse.json({
          exists: false,
          budgetType: 'tokens',
          budgetLimit: 100000,
          budgetPeriod: 'monthly',
          alertThreshold80: true,
          alertThreshold90: true,
          alertThreshold100: true,
          pauseAtLimit: false,
        })
      }
      throw error
    }

    return NextResponse.json({
      exists: true,
      budgetType: budget.budget_type,
      budgetLimit: budget.budget_limit,
      budgetPeriod: budget.budget_period,
      currentUsage: budget.current_usage,
      alertThreshold80: budget.alert_80_enabled ?? true,
      alertThreshold90: budget.alert_90_enabled ?? true,
      alertThreshold100: budget.alert_100_enabled ?? true,
      pauseAtLimit: budget.pause_at_limit ?? false,
      isPaused: budget.is_paused ?? false,
      nextResetAt: budget.next_reset_at,
    })
  } catch (error: any) {
    console.error('Error fetching budget config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch budget config' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      budgetType,
      budgetLimit,
      budgetPeriod,
      alertThreshold80,
      alertThreshold90,
      alertThreshold100,
      pauseAtLimit,
    } = body

    // Validate
    if (!clientId || !budgetType || !budgetLimit || !budgetPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (budgetLimit <= 0) {
      return NextResponse.json(
        { error: 'budgetLimit must be greater than 0' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Calculate next reset date
    const nextResetAt = new Date()
    switch (budgetPeriod) {
      case 'daily':
        nextResetAt.setDate(nextResetAt.getDate() + 1)
        break
      case 'weekly':
        nextResetAt.setDate(nextResetAt.getDate() + 7)
        break
      case 'monthly':
        nextResetAt.setMonth(nextResetAt.getMonth() + 1)
        break
    }

    // Upsert budget config
    const { error } = await supabase
      .from('client_budgets')
      .upsert({
        client_id: clientId,
        budget_type: budgetType,
        budget_limit: budgetLimit,
        budget_period: budgetPeriod,
        alert_80_enabled: alertThreshold80 ?? true,
        alert_90_enabled: alertThreshold90 ?? true,
        alert_100_enabled: alertThreshold100 ?? true,
        pause_at_limit: pauseAtLimit ?? false,
        next_reset_at: nextResetAt.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'client_id',
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving budget config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save budget config' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Delete custom budget (will fallback to plan default)
    const { error } = await supabase
      .from('client_budgets')
      .delete()
      .eq('client_id', clientId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting budget config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete budget config' },
      { status: 500 }
    )
  }
}
