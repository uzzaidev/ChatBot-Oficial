import { getClientIdFromSession, requireAuth } from '@/lib/supabase-server'
import { DashboardClient } from '@/components/DashboardClient'

/**
 * Dashboard Page - Server Component
 *
 * FASE 3: Agora usa autenticação!
 *
 * Features:
 * - Requer autenticação (middleware + requireAuth)
 * - Obtém client_id do usuário logado (não mais hardcoded)
 * - Passa client_id para componente client
 *
 * Middleware já validou autenticação, mas fazemos double-check
 */
export default async function DashboardPage() {
  // Garantir que usuário está autenticado (double-check após middleware)
  await requireAuth()

  // Obter client_id do usuário autenticado
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    // Teoricamente impossível chegar aqui (middleware já validou)
    // mas mantemos por segurança
    throw new Error('Client ID não encontrado. Faça login novamente.')
  }


  return <DashboardClient clientId={clientId} />
}
