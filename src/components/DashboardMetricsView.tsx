'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, LayoutGrid, List, MessageSquare, Send, TrendingUp, DollarSign } from 'lucide-react'
import { CustomizableChart } from '@/components/CustomizableChart'
import { ChartConfigModal } from '@/components/ChartConfigModal'
import { MetricCard, MetricCardSkeleton } from '@/components/MetricCard'
import { DateRangeSelector, type DateRange, type DatePreset } from '@/components/DateRangeSelector'
import { ExportDialog } from '@/components/ExportDialog'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'
import { cn } from '@/lib/utils'

interface DashboardMetricsViewProps {
  clientId: string
}

const DEFAULT_CHARTS: ChartConfig[] = [
  {
    id: 'chart_conversations',
    type: 'area',
    metricType: 'conversations_per_day',
    title: 'Conversas por Dia',
    description: 'Total de conversas iniciadas diariamente',
    colors: { primary: '#3b82f6', secondary: '#93c5fd' }, // Tons de azul
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 0, y: 0, w: 6, h: 2 },
  },
  {
    id: 'chart_messages',
    type: 'bar',
    metricType: 'messages_per_day',
    title: 'Mensagens por Dia',
    description: 'Mensagens enviadas e recebidas',
    colors: { primary: '#10b981', secondary: '#6ee7b7' }, // Tons de verde
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 6, y: 0, w: 6, h: 2 },
  },
  {
    id: 'chart_clients',
    type: 'line',
    metricType: 'new_clients_per_day',
    title: 'Novos Clientes',
    description: 'Clientes cadastrados por dia',
    colors: { primary: '#8b5cf6', secondary: '#c4b5fd' }, // Tons de roxo
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 0, y: 2, w: 6, h: 2 },
  },
  {
    id: 'chart_tokens',
    type: 'composed',
    metricType: 'tokens_per_day',
    title: 'Consumo de Tokens',
    description: 'Tokens utilizados por provider',
    colors: { primary: '#f59e0b', secondary: '#fcd34d' }, // Tons de laranja/âmbar
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 6, y: 2, w: 6, h: 2 },
  },
]

/**
 * DashboardMetricsView Component
 *
 * Dashboard customizável com gráficos de métricas:
 * - Gráficos configuráveis (tipo, cor, título)
 * - Layout grid responsivo
 * - Adicionar/editar/remover gráficos
 * - Seletor de período (7, 30, 60, 90 dias)
 * - Persistência de configuração (localStorage)
 */
export function DashboardMetricsView({ clientId }: DashboardMetricsViewProps) {
  // Estado para seleção de período de data (simplificado)
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

  // Preparar parâmetros para o hook com range de datas
  const hookParams = {
    startDate: dateRange.start,
    endDate: dateRange.end,
  }

  const { metrics, loading, error, refetch, getMetricData } = useDashboardMetrics(hookParams)

  // Load saved configuration from localStorage
  useEffect(() => {
    const CONFIG_VERSION = '1.2' // Incrementar para forçar reset
    const savedConfig = localStorage.getItem(`dashboard_config_${clientId}`)

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)

        // Se a versão não bater, usar as cores padrão novas
        if (config.version !== CONFIG_VERSION) {
          setCharts(DEFAULT_CHARTS)
          setLayout('grid')
        } else {
          setCharts(config.charts || DEFAULT_CHARTS)
          setLayout(config.layout || 'grid')
        }
      } catch (err) {
        setCharts(DEFAULT_CHARTS)
      }
    } else {
      setCharts(DEFAULT_CHARTS)
    }
  }, [clientId])

  // Save configuration to localStorage
  useEffect(() => {
    if (charts.length > 0) {
      const CONFIG_VERSION = '1.2'
      const config = {
        version: CONFIG_VERSION,
        charts,
        layout,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(`dashboard_config_${clientId}`, JSON.stringify(config))
    }
  }, [charts, layout, clientId])

  const handleAddChart = () => {
    setEditingChart(undefined)
    setConfigModalOpen(true)
  }

  const handleEditChart = (id: string) => {
    const chart = charts.find((c) => c.id === id)
    if (chart) {
      setEditingChart(chart)
      setConfigModalOpen(true)
    }
  }

  const handleRemoveChart = (id: string) => {
    setCharts(charts.filter((c) => c.id !== id))
  }

  const handleSaveChart = (config: ChartConfig) => {
    if (editingChart) {
      // Edit existing
      setCharts(charts.map((c) => (c.id === config.id ? config : c)))
    } else {
      // Add new
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar métricas</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  // Calcular KPIs principais dos dados
  const totalConversations = metrics?.conversations.reduce((sum, day) => sum + day.total, 0) || 0
  const totalMessages = metrics?.messages.reduce((sum, day) => sum + day.total, 0) || 0
  const totalCost = metrics?.cost.reduce((sum, day) => sum + day.total, 0) || 0
  const avgResolutionRate = metrics?.conversations.length
    ? (metrics.conversations.reduce((sum, day) => sum + (day.active / (day.total || 1)), 0) / metrics.conversations.length) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              trend={{
                value: 12,
                label: 'esta semana',
                direction: 'up',
              }}
            />
            <MetricCard
              title="Mensagens Enviadas"
              value={totalMessages.toLocaleString('pt-BR')}
              icon={Send}
              trend={{
                value: 18,
                label: 'esta semana',
                direction: 'up',
              }}
            />
            <MetricCard
              title="Taxa de Resolução"
              value={`${avgResolutionRate.toFixed(0)}%`}
              icon={TrendingUp}
              trend={{
                value: 3,
                label: 'esta semana',
                direction: 'up',
              }}
            />
            <MetricCard
              title="Custo Total (USD)"
              value={`$${totalCost.toFixed(2)}`}
              icon={DollarSign}
              trend={{
                value: 8,
                label: 'esta semana',
                direction: 'up',
              }}
            />
          </>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-white">Métricas do Dashboard</h2>
          <p className="text-sm text-uzz-silver mt-1">
            Customize seus gráficos e visualize métricas em tempo real
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Export Button */}
          <ExportDialog
            charts={charts}
            chartData={charts.reduce((acc, chart) => {
              acc[chart.id] = getMetricData(chart.metricType)
              return acc
            }, {} as Record<string, MetricDataPoint[]>)}
            dashboardTitle="Dashboard UZZ.AI"
          />

          {/* Layout Toggle */}
          <div className="flex items-center gap-1 border border-white/10 rounded-md p-1 bg-white/5">
            <Button
              variant={layout === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setLayout('grid')}
              className={cn(
                "h-8 w-8",
                layout === 'grid' 
                  ? "bg-gradient-to-r from-uzz-mint to-uzz-blue text-white" 
                  : "text-uzz-silver hover:text-white hover:bg-white/10"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setLayout('list')}
              className={cn(
                "h-8 w-8",
                layout === 'list' 
                  ? "bg-gradient-to-r from-uzz-mint to-uzz-blue text-white" 
                  : "text-uzz-silver hover:text-white hover:bg-white/10"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Range Selector - Simple period selection */}
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />

          {/* Add Chart Button */}
          <Button 
            onClick={handleAddChart} 
            size="sm" 
            className="gap-2 bg-gradient-to-r from-uzz-mint to-uzz-blue text-white border-transparent hover:shadow-lg hover:shadow-uzz-mint/30"
          >
            <Plus className="h-4 w-4" />
            Adicionar Gráfico
          </Button>

          {/* Reset Button */}
          <Button 
            onClick={handleResetToDefault} 
            variant="outline" 
            size="sm"
            className="border-white/10 text-uzz-silver hover:bg-white/10 hover:text-white"
            disabled={charts.length === 0}
          >
            Restaurar Padrão
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        id="dashboard-metrics-view"
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
            : 'flex flex-col gap-6'
        }
      >
        {charts.map((chart) => (
          <div key={chart.id} id={`chart-${chart.id}`}>
            <CustomizableChart
              config={chart}
              data={getMetricData(chart.metricType)}
              onEdit={handleEditChart}
              onRemove={handleRemoveChart}
              loading={loading}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {charts.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Nenhum gráfico adicionado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em &quot;Adicionar Gráfico&quot; para começar
            </p>
            <Button onClick={handleAddChart} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Gráfico
            </Button>
          </div>
        </div>
      )}

      {/* Config Modal */}
      <ChartConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={editingChart}
        onSave={handleSaveChart}
      />
    </div>
  )
}
