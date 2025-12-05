'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { CustomizableChart } from '@/components/CustomizableChart'
import { ChartConfigModal } from '@/components/ChartConfigModal'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { ChartConfig } from '@/lib/types/dashboard-metrics'

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
  const [days, setDays] = useState(30)
  const [charts, setCharts] = useState<ChartConfig[]>([])
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [editingChart, setEditingChart] = useState<ChartConfig | undefined>()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')

  const { metrics, loading, error, refetch, getMetricData } = useDashboardMetrics({ days })

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
        console.error('[DashboardMetricsView] Failed to load config:', err)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Métricas do Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Customize seus gráficos e visualize métricas em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Layout Toggle */}
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={layout === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setLayout('grid')}
              className="h-8 w-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setLayout('list')}
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Days Selector */}
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="999">Todos os dados</SelectItem>
            </SelectContent>
          </Select>

          {/* Add Chart Button */}
          <Button onClick={handleAddChart} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Gráfico
          </Button>

          {/* Reset Button */}
          <Button onClick={handleResetToDefault} variant="outline" size="sm">
            Restaurar Padrão
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
            : 'flex flex-col gap-6'
        }
      >
        {charts.map((chart) => (
          <CustomizableChart
            key={chart.id}
            config={chart}
            data={getMetricData(chart.metricType)}
            onEdit={handleEditChart}
            onRemove={handleRemoveChart}
            loading={loading}
          />
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
