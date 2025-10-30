import { requireAuth } from '@/lib/supabase-server'
import { ReactNode } from 'react'

/**
 * Conversations Layout
 * 
 * Layout específico para páginas de conversas que não usa o sidebar do dashboard.
 * Permite que ConversationPageClient renderize sua própria navegação lateral.
 */
export default async function ConversationsLayout({
  children,
}: {
  children: ReactNode
}) {
  // Garantir autenticação
  await requireAuth()

  // Renderiza apenas o children sem wrapper adicional
  return <>{children}</>
}
