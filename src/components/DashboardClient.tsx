'use client'

import { useState, useEffect } from 'react'
import { MetricsDashboard } from '@/components/MetricsDashboard'
import { ConversationList } from '@/components/ConversationList'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import type { DashboardMetrics } from '@/lib/types'
import { Separator } from '@/components/ui/separator'

interface DashboardClientProps {
  clientId: string
}

/**
 * DashboardClient - Client Component
 *
 * Componente de interface do dashboard que usa hooks para:
 * - Buscar conversas
 * - Receber notificações em tempo real
 * - Calcular métricas
 *
 * @param clientId - ID do cliente autenticado (vem do servidor)
 */
export function DashboardClient({ clientId }: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_conversations: 0,
    active_conversations: 0,
    waiting_human: 0,
    messages_today: 0,
    total_cost_month: 0,
  })
  const [metricsLoading, setMetricsLoading] = useState(true)

  const { conversations, loading, lastUpdatePhone: pollingLastUpdate } = useConversations({
    clientId,
    limit: 50,
    refreshInterval: 10000,
    enableRealtime: true,
  })

  // Hook global para notificações em tempo real
  const { lastUpdatePhone: realtimeLastUpdate } = useGlobalRealtimeNotifications()

  // Estado combinado - prioriza realtime, mas aceita polling como fallback
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null)

  useEffect(() => {
    if (realtimeLastUpdate) {
      console.log('[Dashboard] Atualização via Realtime Global:', realtimeLastUpdate)
      setLastUpdatePhone(realtimeLastUpdate)
    } else if (pollingLastUpdate) {
      console.log('[Dashboard] Atualização via Polling:', pollingLastUpdate)
      setLastUpdatePhone(pollingLastUpdate)
    }
  }, [realtimeLastUpdate, pollingLastUpdate])

  useEffect(() => {
    const calculateMetrics = () => {
      const totalConversations = conversations.length
      const activeConversations = conversations.filter(
        (c) => c.status === 'bot'
      ).length
      const waitingHuman = conversations.filter(
        (c) => c.status === 'waiting' || c.status === 'human'
      ).length

      const totalMessages = conversations.reduce(
        (sum, c) => sum + c.message_count,
        0
      )

      const estimatedCost = totalMessages * 0.001

      setMetrics({
        total_conversations: totalConversations,
        active_conversations: activeConversations,
        waiting_human: waitingHuman,
        messages_today: totalMessages,
        total_cost_month: estimatedCost,
      })

      setMetricsLoading(false)
    }

    if (!loading) {
      calculateMetrics()
    }
  }, [conversations, loading])

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Visão geral das conversas WhatsApp
        </p>
      </div>

      <Separator />

      <MetricsDashboard metrics={metrics} loading={metricsLoading} />

      <div className="pb-4">
        <ConversationList
          conversations={conversations}
          loading={loading}
          clientId={clientId}
          lastUpdatePhone={lastUpdatePhone}
        />
      </div>
    </div>
  )
}
