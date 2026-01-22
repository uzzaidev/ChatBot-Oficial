/**
 * Dashboard Metrics Types
 *
 * Tipos para o sistema de dashboard customizável com gráficos
 */

export type ChartType = 'line' | 'bar' | 'area' | 'composed' | 'radar' | 'treemap' | 'gauge' | 'funnel' | 'heatmap'

export type MetricType =
  | 'conversations_per_day'
  | 'conversations_per_week'
  | 'conversations_per_month'
  | 'conversations_per_year'
  | 'new_clients_per_day'
  | 'new_clients_per_week'
  | 'new_clients_per_month'
  | 'new_clients_per_year'
  | 'messages_per_day'
  | 'messages_per_week'
  | 'messages_per_month'
  | 'messages_per_year'
  | 'tokens_per_day'
  | 'tokens_per_week'
  | 'tokens_per_month'
  | 'tokens_per_year'
  | 'cost_per_day'
  | 'cost_per_week'
  | 'cost_per_month'
  | 'cost_per_year'
  | 'active_conversations'
  | 'status_distribution'
  // Métricas avançadas - Performance
  | 'latency_per_day'
  | 'latency_per_week'
  | 'latency_per_month'
  | 'latency_per_year'
  | 'latency_p50'
  | 'latency_p95'
  | 'latency_p99'
  | 'cache_hit_rate'
  | 'error_rate'
  | 'error_rate_by_type'
  // Métricas avançadas - Financeiras
  | 'cost_per_conversation'
  | 'cost_per_message'
  | 'cost_by_provider'
  | 'cost_by_model'
  | 'cost_by_api_type'
  // Métricas avançadas - Engajamento
  | 'resolution_rate'
  | 'first_response_time'
  | 'transfer_rate'
  | 'avg_messages_per_conversation'
  | 'peak_hours'
  | 'messages_by_hour'

export type PeriodPreset = 'day' | 'week' | 'month' | 'custom'

export interface ChartConfig {
  id: string
  type: ChartType
  metricType: MetricType
  title: string
  description?: string
  period?: PeriodPreset // Período específico do gráfico
  colors: {
    primary: string
    secondary?: string
  }
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  position: {
    x: number
    y: number
    w: number
    h: number
  }
}

export interface DashboardConfig {
  userId: string
  clientId: string
  charts: ChartConfig[]
  layout: 'grid' | 'list'
  updatedAt: string
}

export interface MetricDataPoint {
  date: string
  value?: number
  label?: string
  [key: string]: any
}

export interface ConversationsMetric {
  date: string
  total: number
  active: number
  transferred: number
  human: number
}

export interface ClientsMetric {
  date: string
  total: number
  new: number
}

export interface MessagesMetric {
  date: string
  total: number
  incoming: number
  outgoing: number
}

export interface TokensMetric {
  date: string
  total: number
  openai: number
  groq: number
}

export interface CostMetric {
  date: string
  total: number
  openai: number
  groq: number
}

export interface StatusDistribution {
  status: string
  count: number
  percentage: number
}

// Métricas Avançadas - Performance
export interface LatencyMetric {
  date: string
  average: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
}

export interface CacheHitRateMetric {
  date: string
  hitRate: number
  hits: number
  misses: number
  total: number
  savingsUSD?: number
}

export interface ErrorRateMetric {
  date: string
  errorRate: number
  errors: number
  total: number
  byType?: Record<string, number>
}

// Métricas Avançadas - Financeiras
export interface CostBreakdownMetric {
  date: string
  byProvider: Record<string, number>
  byModel: Record<string, number>
  byApiType: Record<string, number>
  total: number
}

export interface CostPerConversationMetric {
  date: string
  average: number
  totalCost: number
  totalConversations: number
}

export interface CostPerMessageMetric {
  date: string
  average: number
  totalCost: number
  totalMessages: number
}

// Métricas Avançadas - Engajamento
export interface MessagesByHourMetric {
  hour: string // "00", "01", ..., "23"
  total: number
  incoming: number
  outgoing: number
}

export interface DashboardMetricsData {
  conversations: ConversationsMetric[]
  clients: ClientsMetric[]
  messages: MessagesMetric[]
  tokens: TokensMetric[]
  cost: CostMetric[]
  statusDistribution: StatusDistribution[]
  // Métricas avançadas
  latency?: LatencyMetric[]
  cacheHitRate?: CacheHitRateMetric[]
  errorRate?: ErrorRateMetric[]
  costBreakdown?: CostBreakdownMetric[]
  costPerConversation?: CostPerConversationMetric[]
  costPerMessage?: CostPerMessageMetric[]
  messagesByHour?: MessagesByHourMetric[]
}
