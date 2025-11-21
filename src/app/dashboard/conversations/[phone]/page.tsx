import { getClientIdFromSession, requireAuth } from '@/lib/supabase-server'
import { ConversationPageClient } from '@/components/ConversationPageClient'

interface ConversationPageProps {
  params: {
    phone: string
  }
}

/**
 * Conversation Page - Server Component
 *
 * FASE 3: Agora usa autenticação!
 *
 * Features:
 * - Requer autenticação (middleware + requireAuth)
 * - Obtém client_id do usuário logado (não mais de query params)
 * - Passa phone e client_id para componente client
 */
export default async function ConversationPage({ params }: ConversationPageProps) {
  const { phone } = params

  // Garantir que usuário está autenticado
  await requireAuth()

  // Obter client_id do usuário autenticado
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    throw new Error('Client ID não encontrado. Faça login novamente.')
  }


  return <ConversationPageClient phone={phone} clientId={clientId} />
}
