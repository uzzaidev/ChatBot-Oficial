'use client'
import { useEffect, useState } from 'react'
import { DashboardClient } from '@/components/DashboardClient'
import { createClientBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Dashboard Page - Client Component (Mobile Compatible)
 *
 * FASE 3 (Mobile): Convertido para Client Component
 * Motivo: Static Export (Capacitor) não suporta Server Components com async/await
 *
 * Features:
 * - Autenticação via Client Side (createClientBrowser)
 * - Redirecionamento se não autenticado
 * - Loading state enquanto verifica sessão
 */
export default function DashboardPage() {
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientBrowser()

        // 1. Verificar usuário
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // 2. Buscar client_id do profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()

        if (profile?.client_id) {
          setClientId(profile.client_id)
        } else {
          // Fallback: tentar pegar do metadata ou erro
          const metadataClientId = user.user_metadata?.client_id
          if (metadataClientId) {
            setClientId(metadataClientId)
          } else {
            console.error('Client ID não encontrado')
            // Opcional: mostrar erro ou redirect
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
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
    return null // Ou componente de erro
  }

  return <DashboardClient clientId={clientId} />
}
