import { MessageSquare, LayoutDashboard, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { getCurrentUser } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/LogoutButton'

/**
 * Dashboard Layout - Server Component
 *
 * FASE 3: Agora mostra informações do usuário autenticado
 *
 * Features:
 * - Busca dados do usuário autenticado
 * - Mostra nome/email do usuário
 * - Botão de logout
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
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            ChatBot
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard WhatsApp
          </p>
        </div>

        <Separator className="mb-6" />

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Conversas</span>
          </Link>
        </nav>

        <Separator className="my-6" />

        {/* User Info & Logout */}
        <div className="space-y-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Conectado como:</p>
            <p className="font-medium truncate" title={user?.email || ''}>
              {userName}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate" title={user.email}>
                {user.email}
              </p>
            )}
          </div>

          <LogoutButton />
        </div>

        <Separator className="my-6" />

        <div className="text-xs text-muted-foreground">
          <p>Versão 1.0.0 - Phase 3</p>
          <p className="mt-1">Autenticação Ativa ✅</p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
