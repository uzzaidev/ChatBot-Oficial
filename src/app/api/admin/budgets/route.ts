/**
 * ADMIN BUDGET MANAGEMENT API
 *
 * GET    /api/admin/budgets          - List all client budgets
 * POST   /api/admin/budgets          - Create/update budget for client
 * DELETE /api/admin/budgets/:id      - Delete budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// =====================================================
// GET - List all budgets
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all budgets with client info
    const { data: budgets, error } = await supabase
      .from('budget_status')
      .select('*')
      .order('usage_percentage', { ascending: false })

    if (error) throw error

    return NextResponse.json({ budgets })
  } catch (error: any) {
    console.error('[Admin Budgets] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =====================================================
// POST - Create/Update budget
// =====================================================

interface BudgetConfigRequest {
  clientId: string
  budgetMode: 'tokens' | 'brl' | 'both'
  tokenLimit?: number
  brlLimit?: number
  budgetPeriod: 'daily' | 'weekly' | 'monthly'
  pauseAtLimit: boolean
  alert80?: boolean
  alert90?: boolean
  alert100?: boolean
  notificationEmail?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request
    const body: BudgetConfigRequest = await request.json()

    // Validate
    if (!body.clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    if (!['tokens', 'brl', 'both'].includes(body.budgetMode)) {
      return NextResponse.json({ error: 'Invalid budgetMode' }, { status: 400 })
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', body.clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Prepare data
    const budgetData = {
      client_id: body.clientId,
      budget_mode: body.budgetMode,
      token_limit: body.tokenLimit || 0,
      brl_limit: body.brlLimit || 0,
      budget_period: body.budgetPeriod,
      pause_at_limit: body.pauseAtLimit,
      alert_threshold_80: body.alert80 ?? true,
      alert_threshold_90: body.alert90 ?? true,
      alert_threshold_100: body.alert100 ?? true,
      notification_email: body.notificationEmail || null,
    }

    // Upsert budget
    const { data, error } = await supabase
      .from('client_budgets')
      .upsert(budgetData, {
        onConflict: 'client_id',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      budget: data,
      message: `Budget configured for ${client.name}`,
    })
  } catch (error: any) {
    console.error('[Admin Budgets] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =====================================================
// DELETE - Delete budget
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const { error } = await supabase.from('client_budgets').delete().eq('client_id', clientId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Budget deleted',
    })
  } catch (error: any) {
    console.error('[Admin Budgets] DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
