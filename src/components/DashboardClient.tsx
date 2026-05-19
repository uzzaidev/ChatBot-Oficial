"use client";

import { DashboardMetricsView } from "@/components/DashboardMetricsView";
import { TracesWidget } from "@/components/TracesWidget";

interface DashboardClientProps {
  clientId: string;
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
    <div className="space-y-6">
      <DashboardMetricsView clientId={clientId} />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TracesWidget />
      </section>
    </div>
  );
}
