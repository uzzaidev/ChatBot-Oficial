'use client'

/**
 * UNIFIED ANALYTICS COMPONENT
 *
 * Single analytics dashboard combining:
 * - AI Gateway metrics (new)
 * - Chatbot metrics (legacy)
 *
 * Features:
 * - Auto-detects admin vs tenant role
 * - Admin: See all clients + filters
 * - Tenant: See only their data
 * - Filters: by period, client (admin), API type, conversation
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, TrendingUp, DollarSign, Zap, Users, Activity, MessageSquare, Database } from 'lucide-react'

interface UnifiedAnalyticsData {
  isAdmin: boolean
  clientId: string
  clientName: string

  totalRequests: number
  totalMessages: number
  totalCostBRL: number
  totalCostUSD: number

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

  topConversations: Array<{
    conversationId: string
    phone: string
    name: string | null
    messageCount: number
    lastMessage: string
    lastUpdate: string
  }>

  byClient?: Array<{
    clientId: string
    clientName: string
    requests: number
    costBRL: number
    percentage: number
  }>

  clientsList?: Array<{
    clientId: string
    clientName: string
  }>
}

interface BudgetStatus {
  hasBudget: boolean
  budgetMode: 'tokens' | 'brl' | 'both'
  tokenLimit: number
  currentTokens: number
  tokenUsagePercentage: number
  brlLimit: number
  currentBRL: number
  brlUsagePercentage: number
  usagePercentage: number
  isPaused: boolean
  pauseReason: string | null
  status: string
  budgetPeriod: string
  nextResetAt: string
}

export function UnifiedAnalytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UnifiedAnalyticsData | null>(null)
  const [budget, setBudget] = useState<BudgetStatus | null>(null)

  // Filters
  const [period, setPeriod] = useState<'7d' | '30d' | '60d' | '90d'>('30d')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedApiType, setSelectedApiType] = useState<string>('all')
  const [selectedConversation, setSelectedConversation] = useState<string>('all')

  useEffect(() => {
    fetchAnalytics()
    fetchBudget()
  }, [period, selectedClient, selectedApiType, selectedConversation])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ period })
      if (selectedClient !== 'all') params.set('clientId', selectedClient)
      if (selectedApiType !== 'all') params.set('apiType', selectedApiType)
      if (selectedConversation !== 'all') params.set('conversationId', selectedConversation)

      const response = await fetch(`/api/analytics/unified?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch analytics')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBudget = async () => {
    try {
      // If admin is filtering by a specific client, fetch that client's budget
      const params = new URLSearchParams()
      if (selectedClient !== 'all') {
        params.set('clientId', selectedClient)
      }

      const url = params.toString()
        ? `/api/budget/status?${params.toString()}`
        : '/api/budget/status'

      const response = await fetch(url)
      if (response.ok) {
        const budgetData = await response.json()
        setBudget(budgetData)
      }
    } catch (err) {
      console.error('Failed to fetch budget:', err)
      // Non-critical - don't show error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Unificado</h1>
          <p className="text-muted-foreground">
            {data.isAdmin
              ? 'Visão completa de todos os clientes'
              : `Analytics de ${data.clientName}`}
          </p>
        </div>

        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="60d">60 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine sua visualização</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin-only: Client filter */}
          {data.isAdmin && data.clientsList && (
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {data.clientsList.map((client) => (
                    <SelectItem key={client.clientId} value={client.clientId}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* API Type filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de API</label>
            <Select value={selectedApiType} onValueChange={setSelectedApiType}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as APIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as APIs</SelectItem>
                <SelectItem value="chat">Chat (Texto)</SelectItem>
                <SelectItem value="whisper">Whisper (Áudio)</SelectItem>
                <SelectItem value="vision">Vision (Imagem)</SelectItem>
                <SelectItem value="embeddings">Embeddings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversation filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Conversação</label>
            <Select value={selectedConversation} onValueChange={setSelectedConversation}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as conversas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as conversas</SelectItem>
                {data.topConversations.slice(0, 20).map((conv) => (
                  <SelectItem key={conv.conversationId} value={conv.conversationId}>
                    {conv.name || conv.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budget Status Card (if exists) */}
      {budget && budget.hasBudget && (
        <Card className={`border-2 ${
          budget.isPaused
            ? 'border-red-500 bg-red-50'
            : budget.usagePercentage >= 90
            ? 'border-orange-500 bg-orange-50'
            : budget.usagePercentage >= 80
            ? 'border-yellow-500 bg-yellow-50'
            : 'border-green-500 bg-green-50'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Budget do Período</CardTitle>
              <span className={`text-sm font-semibold ${
                budget.isPaused
                  ? 'text-red-600'
                  : budget.usagePercentage >= 90
                  ? 'text-orange-600'
                  : budget.usagePercentage >= 80
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {budget.status}
              </span>
            </div>
            <CardDescription>
              Modo: {budget.budgetMode === 'tokens' && 'Tokens'}
              {budget.budgetMode === 'brl' && 'Reais (R$)'}
              {budget.budgetMode === 'both' && 'Híbrido (Tokens + R$)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token budget */}
            {(budget.budgetMode === 'tokens' || budget.budgetMode === 'both') && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tokens</span>
                  <span className="font-semibold">
                    {budget.currentTokens.toLocaleString()} / {budget.tokenLimit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      budget.tokenUsagePercentage >= 90
                        ? 'bg-red-500'
                        : budget.tokenUsagePercentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.tokenUsagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {budget.tokenUsagePercentage.toFixed(1)}% utilizado
                </p>
              </div>
            )}

            {/* BRL budget */}
            {(budget.budgetMode === 'brl' || budget.budgetMode === 'both') && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Custo (R$)</span>
                  <span className="font-semibold">
                    R$ {budget.currentBRL.toFixed(2)} / R$ {budget.brlLimit.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      budget.brlUsagePercentage >= 90
                        ? 'bg-red-500'
                        : budget.brlUsagePercentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.brlUsagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {budget.brlUsagePercentage.toFixed(1)}% utilizado
                </p>
              </div>
            )}

            {/* Pause warning */}
            {budget.isPaused && (
              <div className="text-sm text-red-600 font-semibold">
                ⚠️ APIs pausadas: {budget.pauseReason === 'token_limit' && 'Limite de tokens atingido'}
                {budget.pauseReason === 'brl_limit' && 'Limite de custo atingido'}
                {budget.pauseReason === 'both' && 'Ambos os limites atingidos'}
              </div>
            )}

            {/* Next reset */}
            <p className="text-xs text-muted-foreground">
              Próximo reset: {new Date(budget.nextResetAt).toLocaleDateString('pt-BR')} ({budget.budgetPeriod})
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Requests</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRequests.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.gatewayMetrics.totalGatewayRequests.toLocaleString('pt-BR')} via Gateway
            </p>
          </CardContent>
        </Card>

        {/* Total Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMessages.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.chatbotMetrics.totalConversations} conversas
            </p>
          </CardContent>
        </Card>

        {/* Total Cost BRL */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total (BRL)</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {data.totalCostBRL.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {(data.totalCostBRL / (data.totalRequests || 1)).toFixed(4)} por request
            </p>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.gatewayMetrics.cacheHitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Economia de ~R${' '}
              {((data.gatewayMetrics.cacheHitRate / 100) * data.totalCostBRL).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="gateway">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateway">AI Gateway</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot (Legacy)</TabsTrigger>
          <TabsTrigger value="conversations">Conversações</TabsTrigger>
        </TabsList>

        {/* AI Gateway Tab */}
        <TabsContent value="gateway" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By API Type */}
            <Card>
              <CardHeader>
                <CardTitle>Uso por Tipo de API</CardTitle>
                <CardDescription>Distribuição de requests por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.gatewayMetrics.byApiType.map((item) => (
                    <div key={item.apiType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {item.apiType.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{item.apiType}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.requests.toLocaleString('pt-BR')} requests
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R$ {item.costBRL.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Uso por Provider</CardTitle>
                <CardDescription>Distribuição por provedor de IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.gatewayMetrics.byProvider.map((item) => (
                    <div key={item.provider} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {item.provider.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{item.provider}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.requests.toLocaleString('pt-BR')} requests
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R$ {item.costBRL.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gateway Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Requests</p>
                  <p className="text-2xl font-bold">
                    {data.gatewayMetrics.totalGatewayRequests.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Latência Média</p>
                  <p className="text-2xl font-bold">{data.gatewayMetrics.averageLatencyMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">R$ {data.gatewayMetrics.totalCostBRL.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Uso por Modelo</CardTitle>
              <CardDescription>Distribuição de uso entre diferentes modelos de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.chatbotMetrics.byModel.map((item) => (
                  <div key={item.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">{item.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.messages.toLocaleString('pt-BR')} mensagens · {item.tokens.toLocaleString('pt-BR')} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">US$ {item.costUSD.toFixed(4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Conversações</CardTitle>
              <CardDescription>Conversações mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topConversations.map((conv) => (
                  <div key={conv.conversationId} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{conv.name || conv.phone}</p>
                      <p className="text-sm text-muted-foreground mt-1">{conv.lastMessage}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(conv.lastUpdate).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin-only: By Client */}
      {data.isAdmin && data.byClient && (
        <Card>
          <CardHeader>
            <CardTitle>Uso por Cliente</CardTitle>
            <CardDescription>Distribuição de uso entre todos os clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.byClient.map((client, idx) => (
                <div key={client.clientId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.requests.toLocaleString('pt-BR')} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R$ {client.costBRL.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{client.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
