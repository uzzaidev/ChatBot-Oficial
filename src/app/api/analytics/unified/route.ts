/**
 * UNIFIED ANALYTICS API
 *
 * Single endpoint for all analytics data with proper permission control:
 * - Tenants: See only their own data
 * - Admins: See all data with filters
 *
 * Combines:
 * - AI Gateway usage (gateway_usage_logs)
 * - Chatbot usage (usage_logs, messages)
 * - Conversations
 *
 * GET /api/analytics/unified?period=30d&clientId=xxx&apiType=chat&conversationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase-server'
import { getExchangeRate } from '@/lib/currency'

export const dynamic = 'force-dynamic'

interface UnifiedAnalytics {
  // User context
  isAdmin: boolean
  clientId: string | null  // null when admin views all clients
  clientName: string

  // Summary metrics
  totalRequests: number
  totalMessages: number
  totalCostBRL: number
  totalCostUSD: number

  // AI Gateway metrics
  gatewayMetrics: {
    totalGatewayRequests: number
    cacheHitRate: number
    averageLatencyMs: number
    totalCostBRL: number
    byApiType: Array<{
      apiType: string
      requests: number
      costBRL: number
      percentage: number
    }>
    byProvider: Array<{
      provider: string
      requests: number
      costBRL: number
      percentage: number
    }>
  }

  // Chatbot metrics (legacy usage_logs)
  chatbotMetrics: {
    totalMessages: number
    totalConversations: number
    totalCostUSD: number
    byModel: Array<{
      model: string
      messages: number
      tokens: number
      costUSD: number
    }>
  }

  // Top conversations
  topConversations: Array<{
    conversationId: string
    phone: string
    name: string | null
    messageCount: number
    lastMessage: string
    lastUpdate: string
  }>

  // Admin-only: Per-client breakdown
  byClient?: Array<{
    clientId: string
    clientName: string
    requests: number
    costBRL: number
    percentage: number
  }>

  // Admin-only: List of all clients (for dropdown)
  clientsList?: Array<{
    clientId: string
    clientName: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const filterClientId = searchParams.get('clientId') // Admin filter
    const filterApiType = searchParams.get('apiType') // chat, whisper, vision, embeddings
    const filterConversationId = searchParams.get('conversationId')

    const supabase = createServerClient()

    // =====================================================
    // 1. AUTHENTICATE & CHECK ROLE
    // =====================================================

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isAdmin = profile.role === 'admin'
    const userClientId = profile.client_id

    console.log('[Unified Analytics] User:', user.id, 'Role:', profile.role, 'Client ID:', userClientId)
    console.log('[Unified Analytics] Filters - Period:', period, 'Client:', filterClientId, 'API Type:', filterApiType)

    // Use service client (bypass RLS) for admin queries
    const queryClient = isAdmin ? createServiceClient() : supabase
    console.log('[Unified Analytics] Using', isAdmin ? 'SERVICE CLIENT (bypass RLS)' : 'REGULAR CLIENT (with RLS)')

    // =====================================================
    // 2. DETERMINE TARGET CLIENT(S)
    // =====================================================

    // Determine target client for response metadata
    // - Admin without filter: null (viewing all clients)
    // - Admin with filter: filtered client
    // - Tenant: their own client
    const targetClientId = isAdmin && !filterClientId ? null : (filterClientId || userClientId)

    console.log('[Unified Analytics] Target Client ID:', targetClientId || 'ALL CLIENTS', 'Is Admin:', isAdmin)

    // Non-admin cannot filter by other clients
    if (!isAdmin && filterClientId && filterClientId !== userClientId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot view other clients data' },
        { status: 403 }
      )
    }

    // =====================================================
    // 3. CALCULATE DATE RANGE
    // =====================================================

    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '60d': 60,
      '90d': 90,
    }

    const days = daysMap[period] || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // =====================================================
    // 4. FETCH GATEWAY USAGE LOGS
    // =====================================================

    let gatewayQuery = queryClient
      .from('gateway_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())

    // Apply filters
    if (!isAdmin) {
      // Tenant: Force filter by their client_id
      console.log('[Unified Analytics] Filtering gateway by client_id (tenant):', userClientId)
      gatewayQuery = gatewayQuery.eq('client_id', userClientId)
    } else if (filterClientId) {
      // Admin: Optional filter by specific client
      console.log('[Unified Analytics] Filtering gateway by client_id (admin filter):', filterClientId)
      gatewayQuery = gatewayQuery.eq('client_id', filterClientId)
    } else {
      // Admin: No filter = see ALL clients
      console.log('[Unified Analytics] Fetching gateway logs for ALL clients (admin, no filter)')
    }

    if (filterApiType) {
      gatewayQuery = gatewayQuery.eq('api_type', filterApiType)
    }

    if (filterConversationId) {
      gatewayQuery = gatewayQuery.eq('conversation_id', filterConversationId)
    }

    const { data: gatewayLogs, error: gatewayError } = await gatewayQuery.order('created_at', { ascending: false })

    console.log('[Unified Analytics] Gateway logs fetched:', gatewayLogs?.length || 0, 'Error:', gatewayError?.message)

    if (gatewayError) {
      console.error('[Unified Analytics] Gateway logs error:', gatewayError)
      throw gatewayError
    }

    // =====================================================
    // 5. FETCH LEGACY USAGE LOGS (chatbot)
    // =====================================================

    let usageQuery = queryClient
      .from('usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (!isAdmin) {
      console.log('[Unified Analytics] Filtering usage_logs by client_id:', userClientId)
      usageQuery = usageQuery.eq('client_id', userClientId)
    } else if (filterClientId) {
      console.log('[Unified Analytics] Filtering usage_logs by admin filter client_id:', filterClientId)
      usageQuery = usageQuery.eq('client_id', filterClientId)
    } else {
      console.log('[Unified Analytics] Fetching ALL usage_logs (admin mode, no filter)')
    }

    if (filterConversationId) {
      usageQuery = usageQuery.eq('conversation_id', filterConversationId)
    }

    const { data: usageLogs, error: usageError } = await usageQuery.order('created_at', { ascending: false })

    console.log('[Unified Analytics] Legacy usage_logs fetched:', usageLogs?.length || 0, 'Error:', usageError?.message)

    if (usageError) {
      console.error('[Unified Analytics] Usage logs error:', usageError)
    }

    // =====================================================
    // 6. FETCH TOP CONVERSATIONS
    // =====================================================

    let conversationsQuery = queryClient
      .from('conversations')
      .select('id, phone, name, status, last_message, last_update, client_id')
      .gte('last_update', startDate.toISOString())
      .order('last_update', { ascending: false })
      .limit(10)

    if (!isAdmin) {
      conversationsQuery = conversationsQuery.eq('client_id', userClientId)
    } else if (filterClientId) {
      conversationsQuery = conversationsQuery.eq('client_id', filterClientId)
    }

    const { data: conversations, error: convError } = await conversationsQuery

    console.log('[Unified Analytics] Top conversations fetched:', conversations?.length || 0, 'Error:', convError?.message)

    if (convError) {
      console.error('[Unified Analytics] Conversations error:', convError)
    }

    // =====================================================
    // 7. CALCULATE METRICS
    // =====================================================

    // Gateway metrics
    const gatewayRequestsCount = gatewayLogs?.length || 0
    const gatewayCostBRL = gatewayLogs?.reduce((sum, log) => sum + (log.cost_brl || 0), 0) || 0
    const gatewayCostUSD = gatewayLogs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0

    const cachedRequests = gatewayLogs?.filter(log => log.was_cached).length || 0
    const cacheHitRate = gatewayRequestsCount > 0 ? (cachedRequests / gatewayRequestsCount) * 100 : 0

    const totalLatency = gatewayLogs?.reduce((sum, log) => sum + (log.latency_ms || 0), 0) || 0
    const averageLatencyMs = gatewayRequestsCount > 0 ? Math.round(totalLatency / gatewayRequestsCount) : 0

    // By API Type
    const apiTypeUsage: Record<string, { requests: number; costBRL: number }> = {}

    for (const log of gatewayLogs || []) {
      const apiType = log.api_type || 'chat'
      if (!apiTypeUsage[apiType]) {
        apiTypeUsage[apiType] = { requests: 0, costBRL: 0 }
      }
      apiTypeUsage[apiType].requests++
      apiTypeUsage[apiType].costBRL += log.cost_brl || 0
    }

    const byApiType = Object.entries(apiTypeUsage).map(([apiType, usage]) => ({
      apiType,
      requests: usage.requests,
      costBRL: usage.costBRL,
      percentage: gatewayRequestsCount > 0 ? (usage.requests / gatewayRequestsCount) * 100 : 0,
    }))

    // By Provider
    const providerUsage: Record<string, { requests: number; costBRL: number }> = {}

    for (const log of gatewayLogs || []) {
      const provider = log.provider || 'unknown'
      if (!providerUsage[provider]) {
        providerUsage[provider] = { requests: 0, costBRL: 0 }
      }
      providerUsage[provider].requests++
      providerUsage[provider].costBRL += log.cost_brl || 0
    }

    const byProvider = Object.entries(providerUsage).map(([provider, usage]) => ({
      provider,
      requests: usage.requests,
      costBRL: usage.costBRL,
      percentage: gatewayRequestsCount > 0 ? (usage.requests / gatewayRequestsCount) * 100 : 0,
    }))

    // Chatbot metrics (legacy)
    const chatbotMessagesCount = usageLogs?.reduce((sum, log) => sum + (log.messages_sent || 0), 0) || 0
    const chatbotCostUSD = usageLogs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0
    const uniqueConversations = new Set(usageLogs?.map(log => log.conversation_id)).size

    const modelUsage: Record<string, { messages: number; tokens: number; costUSD: number }> = {}

    for (const log of usageLogs || []) {
      const model = log.model || 'unknown'
      if (!modelUsage[model]) {
        modelUsage[model] = { messages: 0, tokens: 0, costUSD: 0 }
      }
      modelUsage[model].messages += log.messages_sent || 0
      modelUsage[model].tokens += log.total_tokens || 0
      modelUsage[model].costUSD += log.cost_usd || 0
    }

    const byModel = Object.entries(modelUsage).map(([model, usage]) => ({
      model,
      messages: usage.messages,
      tokens: usage.tokens,
      costUSD: usage.costUSD,
    }))

    // Top conversations
    const topConversations = (conversations || []).map(conv => ({
      conversationId: conv.id,
      phone: conv.phone,
      name: conv.name,
      messageCount: 0, // TODO: Count messages per conversation if needed
      lastMessage: conv.last_message || '',
      lastUpdate: conv.last_update,
    }))

    // =====================================================
    // 8. ADMIN-ONLY: BY CLIENT BREAKDOWN
    // =====================================================

    let byClient: Array<{
      clientId: string
      clientName: string
      requests: number
      costBRL: number
      percentage: number
    }> | undefined

    // List of all clients (for admin dropdown) - always fetch for admin
    let clientsList: Array<{ clientId: string; clientName: string }> | undefined

    if (isAdmin) {
      // Fetch all clients for dropdown
      const { data: allClients } = await queryClient
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      clientsList = (allClients || []).map(c => ({
        clientId: c.id,
        clientName: c.name,
      }))

      console.log('[Unified Analytics] Clients list for dropdown:', clientsList.length, 'clients')
    }

    if (isAdmin && !filterClientId) {
      // Aggregate by client (Gateway + Legacy)
      const clientUsage: Record<string, { requests: number; costBRL: number; costUSD: number }> = {}

      // Get USD to BRL exchange rate once (more efficient)
      const usdToBrlRate = await getExchangeRate('USD', 'BRL')

      // Aggregate Gateway logs
      for (const log of gatewayLogs || []) {
        const clientId = log.client_id
        if (!clientUsage[clientId]) {
          clientUsage[clientId] = { requests: 0, costBRL: 0, costUSD: 0 }
        }
        clientUsage[clientId].requests++
        clientUsage[clientId].costBRL += log.cost_brl || 0
        clientUsage[clientId].costUSD += log.cost_usd || 0
      }

      // Aggregate Legacy logs (usage_logs)
      for (const log of usageLogs || []) {
        const clientId = log.client_id
        if (!clientUsage[clientId]) {
          clientUsage[clientId] = { requests: 0, costBRL: 0, costUSD: 0 }
        }
        clientUsage[clientId].requests++
        clientUsage[clientId].costUSD += log.cost_usd || 0
        // Legacy logs don't have cost_brl, convert using exchange rate
        clientUsage[clientId].costBRL += (log.cost_usd || 0) * usdToBrlRate
      }

      console.log('[Unified Analytics] Client aggregation:', Object.keys(clientUsage).length, 'clients found')

      // Fetch client names
      const clientIds = Object.keys(clientUsage)
      const { data: clients } = await queryClient
        .from('clients')
        .select('id, name')
        .in('id', clientIds)

      const clientMap = Object.fromEntries(
        (clients || []).map(c => [c.id, c.name])
      )

      const totalRequests = gatewayRequestsCount + (usageLogs?.length || 0)

      byClient = Object.entries(clientUsage)
        .map(([clientId, usage]) => ({
          clientId,
          clientName: clientMap[clientId] || 'Unknown',
          requests: usage.requests,
          costBRL: usage.costBRL,
          percentage: totalRequests > 0 ? (usage.requests / totalRequests) * 100 : 0,
        }))
        .sort((a, b) => b.requests - a.requests)

      console.log('[Unified Analytics] By Client:', byClient.map(c => `${c.clientName}: ${c.requests} requests (${c.percentage.toFixed(1)}%)`))
    }

    // =====================================================
    // 9. GET CLIENT NAME
    // =====================================================

    let clientName = 'All Clients'

    if (targetClientId) {
      const { data: clientData } = await queryClient
        .from('clients')
        .select('name')
        .eq('id', targetClientId)
        .single()

      clientName = clientData?.name || 'Unknown'
    }

    // =====================================================
    // 10. BUILD RESPONSE
    // =====================================================

    const response: UnifiedAnalytics = {
      isAdmin,
      clientId: targetClientId,
      clientName,

      totalRequests: gatewayRequestsCount + (usageLogs?.length || 0),
      totalMessages: chatbotMessagesCount,
      totalCostBRL: gatewayCostBRL,
      totalCostUSD: gatewayCostUSD + chatbotCostUSD,

      gatewayMetrics: {
        totalGatewayRequests: gatewayRequestsCount,
        cacheHitRate,
        averageLatencyMs,
        totalCostBRL: gatewayCostBRL,
        byApiType,
        byProvider,
      },

      chatbotMetrics: {
        totalMessages: chatbotMessagesCount,
        totalConversations: uniqueConversations,
        totalCostUSD: chatbotCostUSD,
        byModel,
      },

      topConversations,

      ...(byClient && { byClient }),
      ...(clientsList && { clientsList }),
    }

    console.log('[Unified Analytics] Summary:')
    console.log('  - Gateway logs:', gatewayRequestsCount, 'requests, R$', gatewayCostBRL.toFixed(2))
    console.log('  - Legacy logs:', usageLogs?.length || 0, 'entries, messages:', chatbotMessagesCount, 'USD:', chatbotCostUSD.toFixed(2))
    console.log('  - Total requests:', response.totalRequests, 'Total cost BRL:', response.totalCostBRL.toFixed(2))
    console.log('  - ByClient array:', response.byClient ? `${response.byClient.length} clients` : 'undefined (tenant mode)')

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Unified Analytics] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
