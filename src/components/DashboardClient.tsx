'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { DashboardMetricsView } from '@/components/DashboardMetricsView'
import { NotificationToggle } from '@/components/NotificationManager'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { createClientBrowser } from '@/lib/supabase'

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Verificar se usuário é admin
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const supabase = createClientBrowser()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

          const hasAdminAccess = profile &&
            ['admin', 'client_admin'].includes(profile.role) &&
            profile.is_active

          setIsAdmin(!!hasAdminAccess)
        }
      } catch (error) {
        // Error checking admin role - fallback to non-admin
      } finally {
        setCheckingAdmin(false)
      }
    }

    checkAdminRole()
  }, [])

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8 bg-silver-50 min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-erie-black-900">Dashboard</h1>
          <p className="text-sm md:text-base text-erie-black-600">
            Dashboard customizável com métricas e gráficos
          </p>
        </div>

        <div className="flex gap-2">
          <NotificationToggle />

          {!checkingAdmin && isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-2 border-mint-400 text-mint-700 hover:bg-mint-50">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Separator className="bg-silver-200" />

      <DashboardMetricsView clientId={clientId} />
    </div>
  )
}
