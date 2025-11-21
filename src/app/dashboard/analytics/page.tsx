import { getClientIdFromSession, requireAuth } from '@/lib/supabase-server'
import { AnalyticsClient } from '@/components/AnalyticsClient'

/**
 * Analytics Page - Server Component
 * 
 * Dashboard de uso mostrando:
 * - Gráfico de uso diário
 * - Total de tokens por modelo
 * - Custo total do mês
 * - Comparação OpenAI vs Groq
 * - Evolução semanal
 * - Uso por conversa
 */
export default async function AnalyticsPage() {
  // Garantir que usuário está autenticado
  await requireAuth()

  // Obter client_id do usuário autenticado
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    throw new Error('Client ID não encontrado. Faça login novamente.')
  }


  return <AnalyticsClient clientId={clientId} />
}
