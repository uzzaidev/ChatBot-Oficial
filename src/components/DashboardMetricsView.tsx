'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid, List, MessageSquare, Send, TrendingUp, DollarSign } from 'lucide-react'
import { CustomizableChart } from '@/components/CustomizableChart'
import { ChartConfigModal } from '@/components/ChartConfigModal'
import { MetricCard, MetricCardSkeleton } from '@/components/MetricCard'
import { DateRangeSelector, type DateRange } from '@/components/DateRangeSelector'
import { ExportDialog } from '@/components/ExportDialog'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'
import { cn } from '@/lib/utils'
import { TracesWidget } from '@/components/TracesWidget'

interface DashboardMetricsViewProps {
  clientId: string
}

const DEFAULT_CHARTS: ChartConfig[] = [
  {
    id: 'chart_conversations',
    type: 'composed',
    metricType: 'conversations_per_day',
    title: 'Conversas por Dia',
    description: 'Total de conversas iniciadas diariamente',
    colors: { primary: '#2563eb', secondary: '#14b8a6' },
    showGrid: true,
    showLegend: true,
    height: 320,
    position: { x: 0, y: 0, w: 7, h: 2 },
  },
  {
    id: 'chart_messages',
    type: 'composed',
    metricType: 'messages_per_day',
    title: 'Mensagens por Dia',
    description: 'Mensagens enviadas e recebidas',
    colors: { primary: '#2563eb', secondary: '#10b981' },
    showGrid: true,
    showLegend: true,
    height: 320,
    position: { x: 7, y: 0, w: 5, h: 2 },
  },
  {
    id: 'chart_clients',
    type: 'composed',
    metricType: 'new_clients_per_day',
    title: 'Novos Clientes',
    description: 'Clientes cadastrados por dia',
    colors: { primary: '#2563eb', secondary: '#a855f7' },
    showGrid: true,
    showLegend: true,
    height: 320,
    position: { x: 0, y: 2, w: 5, h: 2 },
  },
  {
    id: 'chart_tokens',
    type: 'composed',
    metricType: 'tokens_per_day',
    title: 'Consumo de Tokens',
    description: 'Tokens utilizados por provider',
    colors: { primary: '#2563eb', secondary: '#10b981' },
    showGrid: true,
    showLegend: true,
    height: 320,
    position: { x: 5, y: 2, w: 7, h: 2 },
  },
]

export function DashboardMetricsView({ clientId }: DashboardMetricsViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: (() => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      d.setHours(0, 0, 0, 0)
      return d
    })(),
    end: (() => {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      return d
    })(),
    preset: 'last30Days',
  })

  const [charts, setCharts] = useState<ChartConfig[]>([])
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [editingChart, setEditingChart] = useState<ChartConfig | undefined>()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')

  const hookParams = {
    startDate: dateRange.start,
    endDate: dateRange.end,
  }

  const { metrics, loading, error, refetch, getMetricData } = useDashboardMetrics(hookParams)

  const isHeroChart = (chart: ChartConfig) => (chart.position?.w || 6) >= 7

  const getChartSpanClass = (chart: ChartConfig) => {
    return isHeroChart(chart) ? 'md:col-span-2 lg:col-span-2' : 'md:col-span-1 lg:col-span-1'
  }

  useEffect(() => {
    const CONFIG_VERSION = '1.4'
    const savedConfig = localStorage.getItem(`dashboard_config_${clientId}`)

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)

        if (config.version !== CONFIG_VERSION) {
          setCharts(DEFAULT_CHARTS)
          setLayout('grid')
        } else {
          setCharts(config.charts || DEFAULT_CHARTS)
          setLayout(config.layout || 'grid')
        }
      } catch {
        setCharts(DEFAULT_CHARTS)
      }
    } else {
      setCharts(DEFAULT_CHARTS)
    }
  }, [clientId])

  useEffect(() => {
    if (charts.length > 0) {
      const CONFIG_VERSION = '1.4'
      const config = {
        version: CONFIG_VERSION,
        charts,
        layout,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem(`dashboard_config_${clientId}`, JSON.stringify(config))
    }
  }, [charts, layout, clientId])

  const handleAddChart = () => {
    setEditingChart(undefined)
    setConfigModalOpen(true)
  }

  const handleEditChart = (id: string) => {
    const chart = charts.find((item) => item.id === id)
    if (!chart) return

    setEditingChart(chart)
    setConfigModalOpen(true)
  }

  const handleRemoveChart = (id: string) => {
    setCharts(charts.filter((chart) => chart.id !== id))
  }

  const handleSaveChart = (config: ChartConfig) => {
    if (editingChart) {
      setCharts(charts.map((chart) => (chart.id === config.id ? config : chart)))
    } else {
      setCharts([...charts, config])
    }

    setConfigModalOpen(false)
    setEditingChart(undefined)
  }

  const handleResetToDefault = () => {
    if (confirm('Deseja restaurar o dashboard para a configuração padrão?')) {
      setCharts(DEFAULT_CHARTS)
      setLayout('grid')
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-destructive">Erro ao carregar métricas</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={refetch}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  const totalConversations = metrics?.conversations.reduce((sum, day) => sum + day.total, 0) || 0
  const totalMessages = metrics?.messages.reduce((sum, day) => sum + day.total, 0) || 0
  const totalCost = metrics?.cost.reduce((sum, day) => sum + day.total, 0) || 0
  const avgResolutionRate = metrics?.conversations.length
    ? (metrics.conversations.reduce((sum, day) => sum + (day.active / (day.total || 1)), 0) / metrics.conversations.length) * 100
    : 0

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total de Conversas"
              value={totalConversations.toLocaleString('pt-BR')}
              icon={MessageSquare}
              trend={{ value: 12, label: 'esta semana', direction: 'up' }}
            />
            <MetricCard
              title="Mensagens Enviadas"
              value={totalMessages.toLocaleString('pt-BR')}
              icon={Send}
              trend={{ value: 18, label: 'esta semana', direction: 'up' }}
            />
            <MetricCard
              title="Taxa de Resolução"
              value={`${avgResolutionRate.toFixed(0)}%`}
              icon={TrendingUp}
              trend={{ value: 3, label: 'esta semana', direction: 'up' }}
            />
            <MetricCard
              title="Custo Total (USD)"
              value={`$${totalCost.toFixed(2)}`}
              icon={DollarSign}
              trend={{ value: 8, label: 'esta semana', direction: 'up' }}
            />
          </>
        )}
      </div>

      {/* Observability traces widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <TracesWidget />
        </div>
      </div>

      <div className="analytics-shell px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="relative z-[1] space-y-4">
          <div className="space-y-2">
            <div className="analytics-shell-kicker">overview metrics</div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[2rem]">
              Métricas do Dashboard
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-[15px]">
              Visualização com mais área útil no gráfico, menos ruído estrutural e uma composição
              mais editorial para mobile e desktop.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="analytics-inline-chip">mobile-first</span>
              <span className="analytics-inline-chip">{charts.length} gráficos ativos</span>
              <span className="analytics-inline-chip">
                {layout === 'grid' ? 'layout editorial' : 'layout empilhado'}
              </span>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <ExportDialog
                  charts={charts}
                  chartData={charts.reduce((acc, chart) => {
                    acc[chart.id] = getMetricData(chart.metricType)
                    return acc
                  }, {} as Record<string, MetricDataPoint[]>)}
                  dashboardTitle="Dashboard UZZ.AI"
                />

                <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/30 p-1">
                  <Button
                    variant={layout === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setLayout('grid')}
                    className={cn(
                      'h-8 w-8 rounded-full',
                      layout === 'grid'
                        ? 'bg-gradient-to-r from-primary to-secondary text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setLayout('list')}
                    className={cn(
                      'h-8 w-8 rounded-full',
                      layout === 'list'
                        ? 'bg-gradient-to-r from-primary to-secondary text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <div className="w-full sm:w-auto">
                  <DateRangeSelector value={dateRange} onChange={setDateRange} />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleAddChart}
                  size="sm"
                  className="gap-2 border-transparent bg-gradient-to-r from-uzz-mint to-uzz-blue text-white hover:shadow-lg hover:shadow-uzz-mint/30"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Gráfico
                </Button>
                <Button
                  onClick={handleResetToDefault}
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={charts.length === 0}
                >
                  Restaurar Padrão
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="dashboard-metrics-view"
        className={layout === 'grid' ? 'analytics-grid-hero md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-6'}
      >
        {charts.map((chart) => (
          <div
            key={chart.id}
            id={`chart-${chart.id}`}
            className={layout === 'grid' ? cn('min-w-0', getChartSpanClass(chart)) : 'min-w-0'}
          >
            <CustomizableChart
              config={chart}
              data={getMetricData(chart.metricType)}
              onEdit={handleEditChart}
              onRemove={handleRemoveChart}
              loading={loading}
              mobileHeight={272}
              desktopHeight={isHeroChart(chart) ? 340 : 300}
              hideLegendOnMobile
            />
          </div>
        ))}
      </div>

      {charts.length === 0 && (
        <div className="analytics-shell px-4 py-10 text-center sm:px-6">
          <p className="text-lg font-medium">Nenhum gráfico adicionado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Clique em &quot;Adicionar Gráfico&quot; para começar
          </p>
          <Button onClick={handleAddChart} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Primeiro Gráfico
          </Button>
        </div>
      )}

      <ChartConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={editingChart}
        onSave={handleSaveChart}
      />
    </div>
  )
}
