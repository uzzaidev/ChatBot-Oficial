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
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#1a1f26] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-normal">
              <span className="font-poppins text-uzz-mint">Uzz</span>
              <span className="font-exo2 font-semibold text-uzz-blue">.Ai</span>
            </h1>
            <span className="text-sm text-uzz-silver">Dashboard</span>
          </div>

          <div className="flex gap-2">
            <NotificationToggle />

            {!checkingAdmin && isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2 border-white/10 text-uzz-silver hover:bg-white/10">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Painel Admin</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <DashboardMetricsView clientId={clientId} />
      </div>
    </div>
  )
}
