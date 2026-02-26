'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'

/**
 * AuthMonitor - Monitora sessão do usuário
 *
 * Features:
 * - Detecta quando token expira
 * - Redireciona automaticamente para /login
 * - Limpa sessão ao detectar expiração
 *
 * IMPORTANTE: Este componente deve ser incluído no layout do dashboard
 */
export const AuthMonitor = () => {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()

    // Subscrever a mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {

      // Eventos que indicam que usuário deve fazer login novamente
      if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }

      // Se token foi renovado mas não há sessão, redirecionar
      if (event === 'TOKEN_REFRESHED' && !session) {
        router.push('/login')
        router.refresh()
      }

      // Se token expirou e não conseguiu renovar
      if (event === 'TOKEN_REFRESHED' && session) {
      }
    })

    // Verificar sessão inicial
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push('/login')
        router.refresh()
      }
    }

    checkSession()

    // Check session every 5 minutes when tab is active
    const intervalId = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?reason=session_expired')
        router.refresh()
      }
    }, 5 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
    }
  }, [router])

  // Componente não renderiza nada (apenas monitora)
  return null
}
