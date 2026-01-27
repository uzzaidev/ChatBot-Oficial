'use client'

import { DashboardMetricsView } from '@/components/DashboardMetricsView'

interface DashboardClientProps {
  clientId: string
}

/**
 * DashboardClient - Client Component
 *
 * Componente de interface do dashboard customizável com gráficos de métricas:
 * - Dashboard totalmente customizável pelo usuário
 * - Gráficos de conversas, clientes, mensagens, tokens e custos
 * - Sistema de configuração visual (tipo, cores, layout)
 * - Persistência de preferências
 *
 * @param clientId - ID do cliente autenticado (vem do servidor)
 */
export function DashboardClient({ clientId }: DashboardClientProps) {
  return (
    <div>
      <DashboardMetricsView clientId={clientId} />
    </div>
  )
}
