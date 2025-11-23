import { requireAuth } from '@/lib/supabase-server'
import { ReactNode } from 'react'

/**
 * Conversations Layout
 * 
 * Layout específico para páginas de conversas que não usa o sidebar do dashboard.
 * Permite que ConversationPageClient renderize sua própria navegação lateral.
 */
export default function ConversationsLayout({
  children,
}: {
  children: ReactNode
}) {
  // Renderiza apenas o children sem wrapper adicional
  // Autenticação é feita nas páginas (Client Components)
  return <>{children}</>
}
