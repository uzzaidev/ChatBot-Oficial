import { getCurrentUser } from '@/lib/supabase-server'
import { AuthMonitor } from '@/components/AuthMonitor'
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient'

/**
 * Dashboard Layout - Server Component
 *
 * FASE 3: Agora mostra informações do usuário autenticado
 *
 * Features:
 * - Busca dados do usuário autenticado
 * - Mostra nome/email do usuário
 * - Botão de logout
 * - Responsivo com sidebar colapsável (desktop) e menu mobile
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Buscar usuário autenticado (middleware já validou)
  const user = await getCurrentUser()

  // Extrair nome do user_metadata ou usar email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <>
      {/* Monitor de autenticação - redireciona para login se token expirar */}
      <AuthMonitor />
      
      <DashboardLayoutClient userName={userName} userEmail={user?.email}>
        {children}
      </DashboardLayoutClient>
    </>
  )
}

