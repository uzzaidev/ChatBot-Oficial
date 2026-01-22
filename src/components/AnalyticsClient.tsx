'use client'

import { useState, useMemo } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { WeeklyUsageChart } from '@/components/WeeklyUsageChart'
import { DailyUsageChart } from '@/components/DailyUsageChart'
import { ModelComparisonChart } from '@/components/ModelComparisonChart'
import { ConversationUsageTable } from '@/components/ConversationUsageTable'
import { PricingConfigModal } from '@/components/PricingConfigModal'
import { DateRangeSelector, type DateRange } from '@/components/DateRangeSelector'
import { Settings, Target, DollarSign, Cpu, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    return {
      start: thirtyDaysAgo,
      end: now,
      preset: 'last30Days',
    }
  })
  const [pricingModalOpen, setPricingModalOpen] = useState(false)

  // Calculate days from date range
  const days = useMemo(() => {
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [dateRange])

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
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8 bg-pattern-dots">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-poppins tracking-tight text-white">
            Analytics de Uso
          </h1>
          <p className="text-sm md:text-base text-uzz-silver">
            Acompanhe tokens, custos e uso de APIs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPricingModalOpen(true)}
            className={cn(
              "gap-2",
              "bg-gradient-to-br from-[#1e2530] to-[#1a1f26]",
              "border-white/10 hover:border-uzz-mint/50",
              "text-white hover:text-white",
              "transition-all duration-300",
              "hover:shadow-lg hover:shadow-uzz-mint/20"
            )}
          >
            <Settings className="h-4 w-4" />
            Configurar Preços
          </Button>

          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-slide-in-up">
        <Card className="metric-card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total de Tokens</CardTitle>
            <div className="icon-bg-gradient">
              <Target className="h-5 w-5 text-uzz-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-poppins text-white">
              {Number(summary.total_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-uzz-silver mt-1">
              {Number(summary.total_requests || 0).toLocaleString('pt-BR')} requisições
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Custo Total</CardTitle>
            <div className="icon-bg-gradient">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-poppins text-white">
              ${Number(summary.total_cost || 0).toFixed(2)}
            </div>
            <p className="text-xs text-uzz-silver mt-1">
              Últimos {days} dias
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">OpenAI</CardTitle>
            <div className="icon-bg-gradient">
              <Cpu className="h-5 w-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-poppins text-white">
              {Number(summary.openai_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-uzz-silver mt-1">
              ${Number(summary.openai_cost || 0).toFixed(4)}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Groq</CardTitle>
            <div className="icon-bg-gradient">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-poppins text-white">
              {Number(summary.groq_tokens || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-uzz-silver mt-1">
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
