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
      console.log('[AuthMonitor] Auth state changed:', event)

      // Eventos que indicam que usuário deve fazer login novamente
      if (event === 'SIGNED_OUT') {
        console.log('[AuthMonitor] Usuário deslogado, redirecionando para /login')
        router.push('/login')
        router.refresh()
      }

      // Se token foi renovado mas não há sessão, redirecionar
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('[AuthMonitor] Token renovado mas sem sessão, redirecionando para /login')
        router.push('/login')
        router.refresh()
      }

      // Se token expirou e não conseguiu renovar
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[AuthMonitor] Token renovado com sucesso')
      }
    })

    // Verificar sessão inicial
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        console.log('[AuthMonitor] Sessão inválida na verificação inicial')
        router.push('/login')
        router.refresh()
      }
    }

    checkSession()

    // Cleanup: Cancelar subscription quando componente desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Componente não renderiza nada (apenas monitora)
  return null
}
