'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MetricSelector } from '@/components/MetricSelector'
import type { ChartConfig, ChartType, MetricType } from '@/lib/types/dashboard-metrics'

interface ChartConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: ChartConfig
  onSave: (config: ChartConfig) => void
}

const METRIC_OPTIONS: { value: MetricType; label: string; description: string; category?: string }[] = [
  // Métricas Básicas
  {
    value: 'conversations_per_day',
    label: 'Conversas por Dia',
    description: 'Total de conversas iniciadas por dia',
    category: 'Básicas',
  },
  {
    value: 'new_clients_per_day',
    label: 'Novos Clientes por Dia',
    description: 'Novos clientes cadastrados por dia',
    category: 'Básicas',
  },
  {
    value: 'messages_per_day',
    label: 'Mensagens por Dia',
    description: 'Total de mensagens enviadas/recebidas por dia',
    category: 'Básicas',
  },
  {
    value: 'tokens_per_day',
    label: 'Tokens por Dia',
    description: 'Consumo de tokens de IA por dia',
    category: 'Básicas',
  },
  {
    value: 'cost_per_day',
    label: 'Custo por Dia',
    description: 'Custo de APIs por dia',
    category: 'Básicas',
  },
  {
    value: 'status_distribution',
    label: 'Distribuição por Status',
    description: 'Distribuição atual de conversas por status',
    category: 'Básicas',
  },
  // Métricas de Performance
  {
    value: 'latency_per_day',
    label: 'Latência por Dia',
    description: 'Latência média, p50, p95 e p99 das requisições',
    category: 'Performance',
  },
  {
    value: 'latency_p50',
    label: 'Latência P50',
    description: 'Percentil 50 da latência (mediana)',
    category: 'Performance',
  },
  {
    value: 'latency_p95',
    label: 'Latência P95',
    description: 'Percentil 95 da latência',
    category: 'Performance',
  },
  {
    value: 'latency_p99',
    label: 'Latência P99',
    description: 'Percentil 99 da latência',
    category: 'Performance',
  },
  {
    value: 'cache_hit_rate',
    label: 'Taxa de Cache Hit',
    description: 'Percentual de requisições servidas do cache',
    category: 'Performance',
  },
  {
    value: 'error_rate',
    label: 'Taxa de Erro',
    description: 'Percentual de requisições com erro',
    category: 'Performance',
  },
  {
    value: 'error_rate_by_type',
    label: 'Erros por Tipo',
    description: 'Breakdown de erros por tipo',
    category: 'Performance',
  },
  // Métricas Financeiras
  {
    value: 'cost_per_conversation',
    label: 'Custo por Conversa',
    description: 'Custo médio por conversa',
    category: 'Financeiras',
  },
  {
    value: 'cost_per_message',
    label: 'Custo por Mensagem',
    description: 'Custo médio por mensagem',
    category: 'Financeiras',
  },
  {
    value: 'cost_by_provider',
    label: 'Custo por Provider',
    description: 'Custo agrupado por provider (OpenAI, Groq, etc)',
    category: 'Financeiras',
  },
  {
    value: 'cost_by_model',
    label: 'Custo por Modelo',
    description: 'Custo agrupado por modelo de IA',
    category: 'Financeiras',
  },
  {
    value: 'cost_by_api_type',
    label: 'Custo por Tipo de API',
    description: 'Custo agrupado por tipo (chat, embeddings, etc)',
    category: 'Financeiras',
  },
  // Métricas de Engajamento
  {
    value: 'messages_by_hour',
    label: 'Mensagens por Hora',
    description: 'Distribuição de mensagens ao longo do dia',
    category: 'Engajamento',
  },
  {
    value: 'peak_hours',
    label: 'Horários de Pico',
    description: 'Top 5 horas com mais mensagens',
    category: 'Engajamento',
  },
]

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Linha' },
  { value: 'bar', label: 'Barra' },
  { value: 'area', label: 'Área' },
  { value: 'composed', label: 'Composto' },
  { value: 'radar', label: 'Radar' },
  { value: 'treemap', label: 'Mapa de Árvore' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'funnel', label: 'Funil' },
  { value: 'heatmap', label: 'Heatmap' },
]

const COLOR_PRESETS = [
  { name: 'Azul', primary: '#3b82f6', secondary: '#60a5fa' },
  { name: 'Verde', primary: '#10b981', secondary: '#34d399' },
  { name: 'Roxo', primary: '#8b5cf6', secondary: '#a78bfa' },
  { name: 'Rosa', primary: '#ec4899', secondary: '#f472b6' },
  { name: 'Laranja', primary: '#f59e0b', secondary: '#fbbf24' },
  { name: 'Vermelho', primary: '#ef4444', secondary: '#f87171' },
]

/**
 * ChartConfigModal Component
 *
 * Modal para configurar/customizar gráficos do dashboard:
 * - Tipo de métrica
 * - Tipo de gráfico
 * - Título e descrição
 * - Cores primária e secundária
 * - Opções de grid e legenda
 * - Altura do gráfico
 */
export function ChartConfigModal({
  open,
  onOpenChange,
  config,
  onSave,
}: ChartConfigModalProps) {
  const [formData, setFormData] = useState<Partial<ChartConfig>>({
    type: 'line',
    metricType: 'conversations_per_day',
    title: 'Novo Gráfico',
    description: '',
    period: 'month', // Default: mês
    colors: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
    },
    showGrid: true,
    showLegend: true,
    height: 300,
  })

  useEffect(() => {
    if (config) {
      setFormData(config)
    } else {
      // Reset to defaults when creating new chart
      setFormData({
        type: 'line',
        metricType: 'conversations_per_day',
        title: 'Novo Gráfico',
        description: '',
        period: 'month',
        colors: {
          primary: '#3b82f6',
          secondary: '#60a5fa',
        },
        showGrid: true,
        showLegend: true,
        height: 300,
      })
    }
  }, [config, open])

  const handleSave = () => {
    const finalConfig: ChartConfig = {
      id: config?.id || `chart_${Date.now()}`,
      type: formData.type!,
      metricType: formData.metricType!,
      title: formData.title!,
      description: formData.description,
      period: formData.period || 'month',
      colors: formData.colors!,
      showGrid: formData.showGrid,
      showLegend: formData.showLegend,
      height: formData.height,
      position: config?.position || { x: 0, y: 0, w: 6, h: 2 },
    }

    onSave(finalConfig)
    onOpenChange(false)
  }

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setFormData({
      ...formData,
      colors: {
        primary: preset.primary,
        secondary: preset.secondary,
      },
    })
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {config ? 'Editar Gráfico' : 'Adicionar Gráfico'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metric Type - Novo componente melhorado */}
          <MetricSelector
            value={formData.metricType}
            onValueChange={(value) =>
              setFormData({ ...formData, metricType: value as MetricType })
            }
            label="Métrica"
          />

          {/* Chart Type */}
          <div className="space-y-2">
            <Label htmlFor="chartType">Tipo de Gráfico</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as ChartType })
              }
            >
              <SelectTrigger id="chartType">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground z-50">
                {CHART_TYPE_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="focus:bg-white/10 focus:text-white"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selector */}
          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <Select
              value={formData.period || 'month'}
              onValueChange={(value) =>
                setFormData({ ...formData, period: value as 'day' | 'week' | 'month' | 'custom' })
              }
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="Selecione um período" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground z-50">
                <SelectItem 
                  value="day"
                  className="focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  Dia (Hoje)
                </SelectItem>
                <SelectItem 
                  value="week"
                  className="focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  Semana (Últimos 7 dias)
                </SelectItem>
                <SelectItem 
                  value="month"
                  className="focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  Mês (Últimos 30 dias)
                </SelectItem>
                <SelectItem 
                  value="custom"
                  className="focus:bg-muted focus:text-foreground cursor-pointer"
                >
                  Personalizado (usar filtro do dashboard)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formData.period === 'day' && 'Mostra dados do dia atual'}
              {formData.period === 'week' && 'Mostra dados dos últimos 7 dias'}
              {formData.period === 'month' && 'Mostra dados dos últimos 30 dias'}
              {formData.period === 'custom' && 'Usa o filtro de data do dashboard'}
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Conversas por Dia"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Total de conversas iniciadas por dia"
            />
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <Label>Cores (Presets)</Label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyColorPreset(preset)}
                  className="justify-start gap-2"
                >
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.colors?.primary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      colors: { ...formData.colors!, primary: e.target.value },
                    })
                  }
                  className="w-20 h-10"
                />
                <Input
                  value={formData.colors?.primary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      colors: { ...formData.colors!, primary: e.target.value },
                    })
                  }
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.colors?.secondary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      colors: { ...formData.colors!, secondary: e.target.value },
                    })
                  }
                  className="w-20 h-10"
                />
                <Input
                  value={formData.colors?.secondary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      colors: { ...formData.colors!, secondary: e.target.value },
                    })
                  }
                  placeholder="#60a5fa"
                />
              </div>
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="height">Altura (px)</Label>
            <Input
              id="height"
              type="number"
              min={200}
              max={600}
              step={50}
              value={formData.height}
              onChange={(e) =>
                setFormData({ ...formData, height: parseInt(e.target.value) })
              }
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showGrid">Mostrar Grade</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir linhas de grade no gráfico
                </p>
              </div>
              <Switch
                id="showGrid"
                checked={formData.showGrid}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showGrid: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showLegend">Mostrar Legenda</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir legenda dos dados
                </p>
              </div>
              <Switch
                id="showLegend"
                checked={formData.showLegend}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showLegend: checked })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {config ? 'Salvar Alterações' : 'Adicionar Gráfico'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
