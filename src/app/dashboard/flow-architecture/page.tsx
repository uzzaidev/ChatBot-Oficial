'use client'

/**
 * Flow Architecture Page
 *
 * /dashboard/flow-architecture
 *
 * Client Component (Mobile Compatible)
 * Motivo: Static Export (Capacitor) não suporta Server Components
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch, Info } from 'lucide-react'
import { createClientBrowser } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function FlowArchitecturePage() {
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientBrowser()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()

        if (profile?.client_id) {
          setClientId(profile.client_id)
        } else {
          console.error('[FlowArchitecturePage] Client ID não encontrado')
        }
      } catch (error) {
        console.error('[FlowArchitecturePage] Erro ao verificar autenticação:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-silver-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500"></div>
      </div>
    )
  }

  if (!clientId) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Não foi possível carregar arquitetura do fluxo. Verifique se você está autenticado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <GitBranch className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Arquitetura do Fluxo</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize e configure a arquitetura do fluxo do chatbot
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquitetura do Fluxo</CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento. Em breve você poderá visualizar e configurar o fluxo aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Em breve você poderá visualizar a arquitetura do fluxo aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

