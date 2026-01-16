/**
 * Dashboard Metrics Types
 *
 * Tipos para o sistema de dashboard customizável com gráficos
 */

export type ChartType = 'line' | 'bar' | 'area' | 'composed' | 'radar' | 'treemap' | 'gauge' | 'funnel' | 'heatmap'

export type MetricType =
  | 'conversations_per_day'
  | 'new_clients_per_day'
  | 'messages_per_day'
  | 'tokens_per_day'
  | 'cost_per_day'
  | 'active_conversations'
  | 'status_distribution'
  // Novas métricas
  | 'resolution_rate'
  | 'first_response_time'
  | 'transfer_rate'
  | 'avg_messages_per_conversation'
  | 'peak_hours'
  | 'cost_per_conversation'
  | 'cost_per_message'

export interface ChartConfig {
  id: string
  type: ChartType
  metricType: MetricType
  title: string
  description?: string
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

export interface DashboardMetricsData {
  conversations: ConversationsMetric[]
  clients: ClientsMetric[]
  messages: MessagesMetric[]
  tokens: TokensMetric[]
  cost: CostMetric[]
  statusDistribution: StatusDistribution[]
}
