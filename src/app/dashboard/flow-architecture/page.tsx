'use client'

/**
 * Flow Architecture Page
 *
 * /dashboard/flow-architecture
 *
 * Client Component (Mobile Compatible)
 * Motivo: Static Export (Capacitor) não suporta Server Components
 * 
 * Usa o componente FlowArchitectureManager implementado pelo desenvolvedor sênior
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase'
import FlowArchitectureManager from '@/components/FlowArchitectureManager'

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
        <div className="text-center py-8">
          <p className="text-destructive">Não foi possível carregar arquitetura do fluxo. Verifique se você está autenticado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <FlowArchitectureManager />
    </div>
  )
}

