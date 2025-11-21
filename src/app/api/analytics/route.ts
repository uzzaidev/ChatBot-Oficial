import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import { getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics
 * 
 * Fetches comprehensive analytics data for the authenticated client
 * 
 * Query Parameters:
 * - days: number of days to look back (default: 30)
 * - type: 'daily' | 'weekly' | 'monthly' | 'conversation' (default: 'all')
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get authenticated client_id
    const clientId = await getClientIdFromSession()

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const type = searchParams.get('type') || 'all'


    const analytics: Record<string, unknown> = {}

    // Fetch different types of analytics based on query
    if (type === 'all' || type === 'daily') {
      const dailyResult = await query(
        'SELECT * FROM get_daily_usage($1, $2)',
        [clientId, days]
      )
      analytics.daily = dailyResult.rows
    }

    if (type === 'all' || type === 'weekly') {
      const weeklyResult = await query(
        'SELECT * FROM get_weekly_evolution($1, 12)',
        [clientId]
      )
      analytics.weekly = weeklyResult.rows
    }

    if (type === 'all' || type === 'monthly') {
      const now = new Date()
      const monthlyResult = await query(
        'SELECT * FROM get_monthly_summary($1, $2, $3)',
        [clientId, now.getFullYear(), now.getMonth() + 1]
      )
      analytics.monthly = monthlyResult.rows
    }

    if (type === 'all' || type === 'conversation') {
      const conversationResult = await query(
        'SELECT * FROM get_usage_by_conversation($1, $2, 20)',
        [clientId, days]
      )
      analytics.byConversation = conversationResult.rows
    }

    // Calculate summary statistics
    if (type === 'all') {
      const summaryResult = await query(
        `
        SELECT 
          COUNT(DISTINCT phone) as unique_conversations,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost,
          COUNT(*) as total_requests,
          SUM(CASE WHEN source = 'openai' THEN total_tokens ELSE 0 END) as openai_tokens,
          SUM(CASE WHEN source = 'groq' THEN total_tokens ELSE 0 END) as groq_tokens,
          SUM(CASE WHEN source = 'openai' THEN cost_usd ELSE 0 END) as openai_cost,
          SUM(CASE WHEN source = 'groq' THEN cost_usd ELSE 0 END) as groq_cost
        FROM usage_logs
        WHERE client_id = $1
          AND created_at >= NOW() - ($2 || ' days')::INTERVAL
        `,
        [clientId, days]
      )
      analytics.summary = summaryResult.rows[0]
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      analytics,
      period: {
        days,
        type,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API /analytics] ❌ Error after ${duration}ms:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
