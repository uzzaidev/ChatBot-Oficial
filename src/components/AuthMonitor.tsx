'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Capacitor } from '@capacitor/core'

/**
 * AuthMonitor - Monitora sessão do usuário
 *
 * Features:
 * - Detecta quando token expira
 * - Redireciona para /login só em SIGNED_OUT ou erro de auth definitivo
 * - Erros de rede/transitórios mantêm o usuário logado
 * - Retoma auto-refresh ao voltar do background (Capacitor/web)
 *
 * IMPORTANTE: Este componente deve ser incluído no layout do dashboard
 */
export const AuthMonitor = () => {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()

    // Redireciona apenas quando a sessão é definitivamente inválida
    const redirectToLogin = (reason?: string) => {
      router.push(reason ? `/login?reason=${reason}` : '/login')
      router.refresh()
    }

    // Erros de rede/transitórios (AuthRetryableFetchError, status 0/5xx) NÃO deslogam
    const isDefinitiveAuthError = (error: any): boolean => {
      if (!error) return false
      if (error.name === 'AuthRetryableFetchError') return false
      if (typeof error.status === 'number' && (error.status === 0 || error.status >= 500)) return false
      const text = `${error.code ?? ''} ${error.message ?? ''}`
      return /invalid_grant|refresh_token_not_found|invalid refresh token|session_not_found/i.test(text)
    }

    // Retorna true se a sessão é definitivamente inválida (após 1 retry)
    const isSessionDead = async (): Promise<boolean> => {
      const attempt = async (): Promise<boolean> => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) return isDefinitiveAuthError(error)
          return !session
        } catch {
          return false // falha de rede: permanece logado
        }
      }
      if (!(await attempt())) return false
      return attempt()
    }

    // Single in-flight: evita refreshes concorrentes
    const inFlight = { current: null as Promise<void> | null }
    const verifySession = (reason?: string) => {
      if (!inFlight.current) {
        inFlight.current = (async () => {
          if (await isSessionDead()) redirectToLogin(reason)
        })().finally(() => {
          inFlight.current = null
        })
      }
      return inFlight.current
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') redirectToLogin()
    })

    verifySession()

    // Check session every 5 minutes when tab is active
    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      verifySession('session_expired')
    }, 5 * 60 * 1000)

    // Web: retomar ao voltar para a aba
    const onVisibility = () => {
      if (document.visibilityState === 'visible') verifySession()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Mobile: pausa/retoma auto-refresh conforme o estado do app
    const appStateListener = Capacitor.isNativePlatform()
      ? require('@capacitor/app').App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            supabase.auth.startAutoRefresh()
            verifySession()
          } else {
            supabase.auth.stopAutoRefresh()
          }
        })
      : null

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      appStateListener?.then((listener: any) => listener.remove())
    }
  }, [router])

  // Componente não renderiza nada (apenas monitora)
  return null
}
