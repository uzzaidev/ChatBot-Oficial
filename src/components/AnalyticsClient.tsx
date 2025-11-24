'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { WeeklyUsageChart } from '@/components/WeeklyUsageChart'
import { DailyUsageChart } from '@/components/DailyUsageChart'
import { ModelComparisonChart } from '@/components/ModelComparisonChart'
import { ConversationUsageTable } from '@/components/ConversationUsageTable'
import { PricingConfigModal } from '@/components/PricingConfigModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Target, DollarSign, Cpu, Zap } from 'lucide-react'

interface AnalyticsClientProps {
  clientId: string
}

/**
 * AnalyticsClient - Client Component
 * 
 * Componente principal do dashboard de analytics que mostra:
 * - Métricas resumidas
 * - Gráficos de uso
 * - Comparação entre providers
 * - Uso por conversa
 */
export function AnalyticsClient({ clientId }: AnalyticsClientProps) {
  const [days, setDays] = useState(30)
  const [pricingModalOpen, setPricingModalOpen] = useState(false)
  const { analytics, loading, error, refetch } = useAnalytics({
    days,
    type: 'all',
    refreshInterval: 60000, // Refresh every minute
  })

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar analytics</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const summary = analytics?.summary || {
    unique_conversations: 0,
    total_tokens: 0,
    total_cost: 0,
    total_requests: 0,
    openai_tokens: 0,
    groq_tokens: 0,
    openai_cost: 0,
    groq_cost: 0,
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Analytics de Uso
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Acompanhe tokens, custos e uso de APIs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPricingModalOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar Preços
          </Button>

          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            <Target className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(summary.total_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Number(summary.total_requests || 0).toLocaleString('pt-BR')} requisições
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(summary.total_cost || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos {days} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OpenAI</CardTitle>
            <Cpu className="h-6 w-6 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(summary.openai_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${Number(summary.openai_cost || 0).toFixed(4)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groq</CardTitle>
            <Zap className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(summary.groq_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${Number(summary.groq_cost || 0).toFixed(4)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Evolution Chart */}
      {analytics?.weekly && analytics.weekly.length > 0 && (
        <WeeklyUsageChart data={analytics.weekly} />
      )}

      {/* Daily Usage Chart */}
      {analytics?.daily && analytics.daily.length > 0 && (
        <DailyUsageChart data={analytics.daily} days={Math.min(days, 14)} />
      )}

      {/* Model Comparison */}
      {analytics?.monthly && analytics.monthly.length > 0 && (
        <ModelComparisonChart data={analytics.monthly} />
      )}

      {/* Conversation Usage Table */}
      {analytics?.byConversation && analytics.byConversation.length > 0 && (
        <ConversationUsageTable data={analytics.byConversation} />
      )}

      {/* No Data Message */}
      {(!analytics?.weekly || analytics.weekly.length === 0) &&
        (!analytics?.daily || analytics.daily.length === 0) && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  Nenhum dado de uso disponível
                </p>
                <p className="text-sm text-muted-foreground">
                  Os dados de uso aparecerão aqui quando você começar a usar as APIs
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Pricing Configuration Modal */}
      <PricingConfigModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  )
}
