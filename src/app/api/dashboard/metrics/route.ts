import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { DashboardMetricsData } from '@/lib/types/dashboard-metrics'

export const dynamic = 'force-dynamic'

/**
 * Dashboard Metrics API
 *
 * GET /api/dashboard/metrics?days=30
 *
 * Retorna métricas agregadas para o dashboard customizável:
 * - Conversas por dia
 * - Novos clientes por dia
 * - Mensagens por dia
 * - Tokens por dia
 * - Custo por dia
 * - Distribuição por status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')

    // Get user and client_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) {
      return NextResponse.json({ error: 'Client ID not found' }, { status: 404 })
    }

    const clientId = profile.client_id
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // TEMPORARIAMENTE: Buscar TODOS os dados sem filtro de data
    // para mostrar que os dados existem
    const useDateFilter = days < 365 // Só aplicar filtro se for menos de 1 ano

    // 1. Conversas por dia (usando clientes_whatsapp)
    // Cada cliente representa uma conversa no sistema
    let conversationsQuery = supabase
      .from('clientes_whatsapp')
      .select('created_at, status')
      .eq('client_id', clientId)

    if (useDateFilter) {
      conversationsQuery = conversationsQuery.gte('created_at', startDate.toISOString())
    }

    const { data: conversationsData, error: convError } = await conversationsQuery
      .order('created_at', { ascending: true })

    // 2. Novos clientes por dia
    let clientsQuery = supabase
      .from('clientes_whatsapp')
      .select('created_at')
      .eq('client_id', clientId)

    if (useDateFilter) {
      clientsQuery = clientsQuery.gte('created_at', startDate.toISOString())
    }

    const { data: clientsData, error: clientsError } = await clientsQuery
      .order('created_at', { ascending: true })

    // 3. Mensagens por dia (usando n8n_chat_histories)
    // message é JSONB: { type: "human" | "ai", content: "..." }
    let messagesQuery = supabase
      .from('n8n_chat_histories')
      .select('created_at, message')
      .eq('client_id', clientId)

    if (useDateFilter) {
      messagesQuery = messagesQuery.gte('created_at', startDate.toISOString())
    }

    const { data: messagesData, error: msgError } = await messagesQuery
      .order('created_at', { ascending: true })

    // 4. Tokens e custos por dia
    // IMPORTANTE: usage_logs tem RLS que só permite service_role
    // Precisa usar createServiceRoleClient() ao invés de createServerClient()
    const supabaseServiceRole = createServiceRoleClient()

    let usageQuery = supabaseServiceRole
      .from('usage_logs')
      .select('created_at, total_tokens, cost_usd, source')
      .eq('client_id', clientId)

    if (useDateFilter) {
      usageQuery = usageQuery.gte('created_at', startDate.toISOString())
    }

    const { data: usageData, error: usageError } = await usageQuery
      .order('created_at', { ascending: true })

    // 5. Distribuição por status (atual) - usando clientes_whatsapp
    const { data: statusData } = await supabase
      .from('clientes_whatsapp')
      .select('status')
      .eq('client_id', clientId)

    const metrics: DashboardMetricsData = {
      conversations: processConversationsData(conversationsData || []),
      clients: processClientsData(clientsData || []),
      messages: processMessagesData(messagesData || []),
      tokens: processTokensData(usageData || []),
      cost: processCostData(usageData || []),
      statusDistribution: processStatusDistribution(statusData || []),
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

// Helper functions to process data
function processConversationsData(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { total: 0, active: 0, transferred: 0, human: 0 }
    }
    acc[date].total++
    if (item.status === 'bot') acc[date].active++
    if (item.status === 'transferido') acc[date].transferred++
    if (item.status === 'humano') acc[date].human++
    return acc
  }, {} as Record<string, { total: number; active: number; transferred: number; human: number }>)

  return Object.entries(grouped).map(([date, values]) => {
    const v = values as { total: number; active: number; transferred: number; human: number }
    return {
      date,
      total: v.total,
      active: v.active,
      transferred: v.transferred,
      human: v.human,
    }
  })
}

function processClientsData(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { new: 0 }
    }
    acc[date].new++
    return acc
  }, {} as Record<string, { new: number }>)

  let total = 0
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const v = values as { new: number }
      total += v.new
      return { date, total, new: v.new }
    })
}

function processMessagesData(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { total: 0, incoming: 0, outgoing: 0 }
    }
    acc[date].total++

    // message é JSONB: { type: "human" | "ai", content: "..." }
    const messageType = item.message?.type
    if (messageType === 'human') acc[date].incoming++
    if (messageType === 'ai') acc[date].outgoing++

    return acc
  }, {} as Record<string, { total: number; incoming: number; outgoing: number }>)

  return Object.entries(grouped).map(([date, values]) => {
    const v = values as { total: number; incoming: number; outgoing: number }
    return {
      date,
      total: v.total,
      incoming: v.incoming,
      outgoing: v.outgoing,
    }
  })
}

function processTokensData(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { total: 0, openai: 0, groq: 0 }
    }
    const tokens = item.total_tokens || 0
    acc[date].total += tokens
    if (item.source === 'openai') acc[date].openai += tokens
    if (item.source === 'groq') acc[date].groq += tokens
    return acc
  }, {} as Record<string, { total: number; openai: number; groq: number }>)

  return Object.entries(grouped).map(([date, values]) => {
    const v = values as { total: number; openai: number; groq: number }
    return {
      date,
      total: v.total,
      openai: v.openai,
      groq: v.groq,
    }
  })
}

function processCostData(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { total: 0, openai: 0, groq: 0 }
    }
    const cost = Number(item.cost_usd) || 0
    acc[date].total += cost
    if (item.source === 'openai') acc[date].openai += cost
    if (item.source === 'groq') acc[date].groq += cost
    return acc
  }, {} as Record<string, { total: number; openai: number; groq: number }>)

  return Object.entries(grouped).map(([date, values]) => {
    const v = values as { total: number; openai: number; groq: number }
    return {
      date,
      total: v.total,
      openai: v.openai,
      groq: v.groq,
    }
  })
}

function processStatusDistribution(data: any[]) {
  const total = data.length
  const grouped = data.reduce((acc, item) => {
    const status = item.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(grouped).map(([status, count]) => ({
    status,
    count: Number(count),
    percentage: total > 0 ? (Number(count) / total) * 100 : 0,
  }))
}
