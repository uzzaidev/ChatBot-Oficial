'use client'

import { useState, useMemo } from 'react'
import { Search, MessageSquare, TrendingUp, DollarSign, Users, Zap, BarChart3, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { MetricType } from '@/lib/types/dashboard-metrics'

interface MetricOption {
  value: MetricType
  label: string
  description: string
  category: string
  icon?: React.ReactNode
  tags?: string[]
}

interface MetricSelectorProps {
  value?: MetricType
  onValueChange: (value: MetricType) => void
  label?: string
  className?: string
}

// Ícones por categoria
const categoryIcons = {
  'Básicas': <BarChart3 className="w-4 h-4" />,
  'Performance': <Zap className="w-4 h-4" />,
  'Financeiras': <DollarSign className="w-4 h-4" />,
  'Engajamento': <TrendingUp className="w-4 h-4" />,
}

// Ícones por tipo de métrica
const getMetricIcon = (value: MetricType) => {
  if (value.includes('conversation')) return <MessageSquare className="w-4 h-4" />
  if (value.includes('message')) return <MessageSquare className="w-4 h-4" />
  if (value.includes('latency') || value.includes('cache') || value.includes('error')) return <Zap className="w-4 h-4" />
  if (value.includes('cost')) return <DollarSign className="w-4 h-4" />
  if (value.includes('client') || value.includes('user')) return <Users className="w-4 h-4" />
  if (value.includes('hour') || value.includes('peak')) return <Clock className="w-4 h-4" />
  return <BarChart3 className="w-4 h-4" />
}

const METRIC_OPTIONS: MetricOption[] = [
  // Métricas Básicas - Por Dia
  {
    value: 'conversations_per_day',
    label: 'Conversas por Dia',
    description: 'Total de conversas iniciadas por dia',
    category: 'Básicas',
    tags: ['dia', 'conversa'],
  },
  {
    value: 'new_clients_per_day',
    label: 'Novos Clientes por Dia',
    description: 'Novos clientes cadastrados por dia',
    category: 'Básicas',
    tags: ['dia', 'cliente'],
  },
  {
    value: 'messages_per_day',
    label: 'Mensagens por Dia',
    description: 'Total de mensagens enviadas/recebidas por dia',
    category: 'Básicas',
    tags: ['dia', 'mensagem'],
  },
  {
    value: 'tokens_per_day',
    label: 'Tokens por Dia',
    description: 'Consumo de tokens de IA por dia',
    category: 'Básicas',
    tags: ['dia', 'token'],
  },
  {
    value: 'cost_per_day',
    label: 'Custo por Dia',
    description: 'Custo de APIs por dia',
    category: 'Básicas',
    tags: ['dia', 'custo'],
  },
  // Métricas Básicas - Por Semana
  {
    value: 'conversations_per_week',
    label: 'Conversas por Semana',
    description: 'Total de conversas iniciadas por semana',
    category: 'Básicas',
    tags: ['semana', 'conversa'],
  },
  {
    value: 'new_clients_per_week',
    label: 'Novos Clientes por Semana',
    description: 'Novos clientes cadastrados por semana',
    category: 'Básicas',
    tags: ['semana', 'cliente'],
  },
  {
    value: 'messages_per_week',
    label: 'Mensagens por Semana',
    description: 'Total de mensagens enviadas/recebidas por semana',
    category: 'Básicas',
    tags: ['semana', 'mensagem'],
  },
  {
    value: 'tokens_per_week',
    label: 'Tokens por Semana',
    description: 'Consumo de tokens de IA por semana',
    category: 'Básicas',
    tags: ['semana', 'token'],
  },
  {
    value: 'cost_per_week',
    label: 'Custo por Semana',
    description: 'Custo de APIs por semana',
    category: 'Básicas',
    tags: ['semana', 'custo'],
  },
  // Métricas Básicas - Por Mês
  {
    value: 'conversations_per_month',
    label: 'Conversas por Mês',
    description: 'Total de conversas iniciadas por mês',
    category: 'Básicas',
    tags: ['mês', 'conversa'],
  },
  {
    value: 'new_clients_per_month',
    label: 'Novos Clientes por Mês',
    description: 'Novos clientes cadastrados por mês',
    category: 'Básicas',
    tags: ['mês', 'cliente'],
  },
  {
    value: 'messages_per_month',
    label: 'Mensagens por Mês',
    description: 'Total de mensagens enviadas/recebidas por mês',
    category: 'Básicas',
    tags: ['mês', 'mensagem'],
  },
  {
    value: 'tokens_per_month',
    label: 'Tokens por Mês',
    description: 'Consumo de tokens de IA por mês',
    category: 'Básicas',
    tags: ['mês', 'token'],
  },
  {
    value: 'cost_per_month',
    label: 'Custo por Mês',
    description: 'Custo de APIs por mês',
    category: 'Básicas',
    tags: ['mês', 'custo'],
  },
  // Métricas Básicas - Por Ano
  {
    value: 'conversations_per_year',
    label: 'Conversas por Ano',
    description: 'Total de conversas iniciadas por ano',
    category: 'Básicas',
    tags: ['ano', 'conversa'],
  },
  {
    value: 'new_clients_per_year',
    label: 'Novos Clientes por Ano',
    description: 'Novos clientes cadastrados por ano',
    category: 'Básicas',
    tags: ['ano', 'cliente'],
  },
  {
    value: 'messages_per_year',
    label: 'Mensagens por Ano',
    description: 'Total de mensagens enviadas/recebidas por ano',
    category: 'Básicas',
    tags: ['ano', 'mensagem'],
  },
  {
    value: 'tokens_per_year',
    label: 'Tokens por Ano',
    description: 'Consumo de tokens de IA por ano',
    category: 'Básicas',
    tags: ['ano', 'token'],
  },
  {
    value: 'cost_per_year',
    label: 'Custo por Ano',
    description: 'Custo de APIs por ano',
    category: 'Básicas',
    tags: ['ano', 'custo'],
  },
  {
    value: 'status_distribution',
    label: 'Distribuição por Status',
    description: 'Distribuição atual de conversas por status',
    category: 'Básicas',
    tags: ['status'],
  },
  // Métricas de Performance
  {
    value: 'latency_per_day',
    label: 'Latência por Dia',
    description: 'Latência média, p50, p95 e p99 das requisições',
    category: 'Performance',
    tags: ['dia', 'latência'],
  },
  {
    value: 'latency_per_week',
    label: 'Latência por Semana',
    description: 'Latência média, p50, p95 e p99 das requisições por semana',
    category: 'Performance',
    tags: ['semana', 'latência'],
  },
  {
    value: 'latency_per_month',
    label: 'Latência por Mês',
    description: 'Latência média, p50, p95 e p99 das requisições por mês',
    category: 'Performance',
    tags: ['mês', 'latência'],
  },
  {
    value: 'latency_per_year',
    label: 'Latência por Ano',
    description: 'Latência média, p50, p95 e p99 das requisições por ano',
    category: 'Performance',
    tags: ['ano', 'latência'],
  },
  {
    value: 'latency_p50',
    label: 'Latência P50',
    description: 'Percentil 50 da latência (mediana)',
    category: 'Performance',
    tags: ['latência', 'p50'],
  },
  {
    value: 'latency_p95',
    label: 'Latência P95',
    description: 'Percentil 95 da latência',
    category: 'Performance',
    tags: ['latência', 'p95'],
  },
  {
    value: 'latency_p99',
    label: 'Latência P99',
    description: 'Percentil 99 da latência',
    category: 'Performance',
    tags: ['latência', 'p99'],
  },
  {
    value: 'cache_hit_rate',
    label: 'Taxa de Cache Hit',
    description: 'Percentual de requisições servidas do cache',
    category: 'Performance',
    tags: ['cache'],
  },
  {
    value: 'error_rate',
    label: 'Taxa de Erro',
    description: 'Percentual de requisições com erro',
    category: 'Performance',
    tags: ['erro'],
  },
  {
    value: 'error_rate_by_type',
    label: 'Erros por Tipo',
    description: 'Breakdown de erros por tipo',
    category: 'Performance',
    tags: ['erro'],
  },
  // Métricas Financeiras
  {
    value: 'cost_per_conversation',
    label: 'Custo por Conversa',
    description: 'Custo médio por conversa',
    category: 'Financeiras',
    tags: ['custo', 'conversa'],
  },
  {
    value: 'cost_per_message',
    label: 'Custo por Mensagem',
    description: 'Custo médio por mensagem',
    category: 'Financeiras',
    tags: ['custo', 'mensagem'],
  },
  {
    value: 'cost_by_provider',
    label: 'Custo por Provider',
    description: 'Custo agrupado por provider (OpenAI, Groq, etc)',
    category: 'Financeiras',
    tags: ['custo', 'provider'],
  },
  {
    value: 'cost_by_model',
    label: 'Custo por Modelo',
    description: 'Custo agrupado por modelo de IA',
    category: 'Financeiras',
    tags: ['custo', 'modelo'],
  },
  {
    value: 'cost_by_api_type',
    label: 'Custo por Tipo de API',
    description: 'Custo agrupado por tipo (chat, embeddings, etc)',
    category: 'Financeiras',
    tags: ['custo', 'api'],
  },
  // Métricas de Engajamento
  {
    value: 'messages_by_hour',
    label: 'Mensagens por Hora',
    description: 'Distribuição de mensagens ao longo do dia',
    category: 'Engajamento',
    tags: ['hora', 'dia', 'mês', 'mensagem'],
  },
  {
    value: 'peak_hours',
    label: 'Horários de Pico',
    description: 'Top 5 horas com mais mensagens',
    category: 'Engajamento',
    tags: ['hora', 'pico'],
  },
]

/**
 * MetricSelector Component
 *
 * Componente melhorado para seleção de métricas com:
 * - Busca/filtro
 * - Agrupamento visual por categoria
 * - Ícones para cada métrica
 * - Cards clicáveis
 * - Tags para melhor organização
 */
export function MetricSelector({
  value,
  onValueChange,
  label = 'Métrica',
  className,
}: MetricSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filtrar métricas por busca e categoria
  const filteredMetrics = useMemo(() => {
    let filtered = METRIC_OPTIONS

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (metric) =>
          metric.label.toLowerCase().includes(query) ||
          metric.description.toLowerCase().includes(query) ||
          metric.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter((metric) => metric.category === selectedCategory)
    }

    return filtered
  }, [searchQuery, selectedCategory])

  // Agrupar por categoria
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, MetricOption[]> = {}
    filteredMetrics.forEach((metric) => {
      if (!groups[metric.category]) {
        groups[metric.category] = []
      }
      groups[metric.category].push(metric)
    })
    return groups
  }, [filteredMetrics])

  // Obter métrica selecionada
  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === value)

  // Categorias disponíveis
  const categories = Array.from(new Set(METRIC_OPTIONS.map((m) => m.category)))

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-white text-sm font-semibold">{label}</Label>

      {/* Input de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uzz-silver" />
        <Input
          type="text"
          placeholder="Buscar métrica (ex: conversa, mensagem, dia, custo...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-uzz-silver/50"
        />
      </div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            selectedCategory === null
              ? 'bg-uzz-mint text-[#1C1C1C]'
              : 'bg-white/5 text-uzz-silver hover:bg-white/10 hover:text-white'
          )}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
              selectedCategory === category
                ? 'bg-uzz-mint text-[#1C1C1C]'
                : 'bg-white/5 text-uzz-silver hover:bg-white/10 hover:text-white'
            )}
          >
            {categoryIcons[category as keyof typeof categoryIcons]}
            {category}
          </button>
        ))}
      </div>

      {/* Métrica selecionada (preview) */}
      {selectedMetric && (
        <div className="p-3 bg-uzz-mint/10 border border-uzz-mint/30 rounded-lg">
          <div className="flex items-center gap-2">
            {getMetricIcon(selectedMetric.value)}
            <span className="text-sm font-semibold text-white">{selectedMetric.label}</span>
          </div>
          <p className="text-xs text-uzz-silver mt-1 ml-6">{selectedMetric.description}</p>
        </div>
      )}

      {/* Lista de métricas */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <ScrollArea className="h-[400px] w-full">
          <div className="p-3 space-y-4">
          {Object.entries(groupedMetrics).map(([category, metrics]) => (
            <div key={category} className="space-y-2">
              {/* Header da categoria */}
              <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-[#1e2530] z-10">
                <div className="text-uzz-silver">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                </div>
                <h4 className="text-xs font-bold text-uzz-silver uppercase tracking-wider">
                  {category}
                </h4>
                <div className="flex-1 h-px bg-white/10 ml-2" />
                <span className="text-xs text-uzz-silver/70">{metrics.length}</span>
              </div>

              {/* Métricas da categoria - Grid de 3 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.map((metric) => {
                  const isSelected = value === metric.value
                  return (
                    <button
                      key={metric.value}
                      onClick={() => onValueChange(metric.value)}
                      className={cn(
                        'p-3.5 rounded-lg text-left transition-all h-full',
                        'hover:bg-white/10 border',
                        isSelected
                          ? 'bg-uzz-mint/20 border-uzz-mint/50 shadow-lg shadow-uzz-mint/20'
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'mt-0.5 flex-shrink-0',
                            isSelected ? 'text-uzz-mint' : 'text-uzz-silver'
                          )}
                        >
                          {getMetricIcon(metric.value)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={cn(
                                'text-xs font-semibold leading-tight',
                                isSelected ? 'text-white' : 'text-white/90'
                              )}
                            >
                              {metric.label}
                            </span>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-uzz-mint flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-uzz-silver line-clamp-2 leading-relaxed mb-2">
                            {metric.description}
                          </p>
                          {metric.tags && metric.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {metric.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    'px-1.5 py-0.5 text-[9px] font-medium rounded',
                                    (tag === 'mês' || tag === 'ano')
                                      ? 'bg-uzz-blue/20 text-uzz-blue border border-uzz-blue/30'
                                      : 'bg-white/5 text-uzz-silver/70'
                                  )}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredMetrics.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-uzz-silver/50 mx-auto mb-2" />
              <p className="text-sm text-uzz-silver">
                Nenhuma métrica encontrada para &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

