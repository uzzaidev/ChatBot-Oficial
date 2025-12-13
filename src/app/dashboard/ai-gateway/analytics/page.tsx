'use client'

/**
 * AI GATEWAY ANALYTICS PAGE (Admin Only)
 *
 * Aggregated metrics for all clients using the AI Gateway
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, DollarSign, Zap, Users, Activity } from 'lucide-react'
import { GatewayMetricsDashboard } from '@/components/GatewayMetricsDashboard'
import { ProviderBreakdownChart } from '@/components/ProviderBreakdownChart'
import { LatencyChart } from '@/components/LatencyChart'
import { AIGatewayNav } from '@/components/AIGatewayNav'

interface AggregatedMetrics {
  totalRequests: number
  totalCostBRL: number
  cacheHitRate: number
  averageLatencyMs: number
  activeClients: number
  errorRate: number
  topClients: Array<{
    clientId: string
    clientName: string
    requests: number
    costBRL: number
  }>
  providerUsage: Array<{
    provider: string
    requests: number
    percentage: number
  }>
}

export default function AIGatewayAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '60d' | '90d'>('30d')

  useEffect(() => {
    fetchMetrics()
  }, [period])

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai-gateway/metrics?period=${period}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch metrics')
      }

      const data = await response.json()
      setMetrics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Gateway Analytics</h1>
            <p className="text-muted-foreground">
              Métricas agregadas de todos os clientes usando o AI Gateway
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Requests</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeClients} clientes ativos
            </p>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {metrics.totalCostBRL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {(metrics.totalCostBRL / metrics.totalRequests).toFixed(4)} por request
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
            <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Economia de ~R$ {((metrics.cacheHitRate / 100) * metrics.totalCostBRL).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Average Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageLatencyMs}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              P95 tempo de resposta
            </p>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.errorRate < 0.5 ? '✅ Saudável' : '⚠️ Atenção necessária'}
            </p>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Usando AI Gateway
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Uso por Provider</CardTitle>
            <CardDescription>Distribuição de requests por provedor de IA</CardDescription>
          </CardHeader>
          <CardContent>
            <ProviderBreakdownChart data={metrics.providerUsage} />
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
            <CardDescription>Clientes com maior uso do AI Gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topClients.slice(0, 10).map((client, idx) => (
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latency Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Latência ao Longo do Tempo</CardTitle>
          <CardDescription>P50, P95 e P99 de latência (ms)</CardDescription>
        </CardHeader>
        <CardContent>
          <LatencyChart period={period} />
        </CardContent>
      </Card>

      {/* Metrics Dashboard */}
      <GatewayMetricsDashboard period={period} aggregated={true} />
      </div>
    </>
  )
}
