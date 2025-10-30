import { getClientIdFromSession, requireAuth } from '@/lib/supabase-server'
import { ConversationsIndexClient } from '@/components/ConversationsIndexClient'

/**
 * Conversations Index Page - Server Component
 *
 * Página que mostra a lista de conversas sem nenhuma conversa específica aberta.
 * Quando o usuário clica em "Conversas" no dashboard, vem para cá.
 */
export default async function ConversationsIndexPage() {
  // Garantir que usuário está autenticado
  await requireAuth()

  // Obter client_id do usuário autenticado
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    throw new Error('Client ID não encontrado. Faça login novamente.')
  }

  console.log('[ConversationsIndexPage] Renderizando lista de conversas para client:', clientId)

  return <ConversationsIndexClient clientId={clientId} />
}
