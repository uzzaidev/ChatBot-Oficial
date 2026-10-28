/**
 * Push Notifications Provider
 * 
 * Componente client que inicializa push notifications no app mobile.
 * Deve ser usado no layout.tsx (Server Component).
 * 
 * Features:
 * - Solicita permissão automaticamente
 * - Registra token com Firebase
 * - Salva token no backend (Supabase)
 * - Processa notificações recebidas
 */

'use client'

import { useEffect } from 'react'
import { initPushNotifications, removePushNotificationListeners, syncPushToken } from '@/lib/pushNotifications'
import { createBrowserClient } from '@/lib/supabase-browser'

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializar push notifications apenas uma vez no mount
    initPushNotifications()

    // Re-save the token on sign-in (login navigates client-side, no remount)
    const {
      data: { subscription },
    } = createBrowserClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void syncPushToken()
    })

    // Cleanup: remover listeners quando componente desmonta
    return () => {
      subscription.unsubscribe()
      removePushNotificationListeners()
    }
  }, [])

  // Renderizar children sem wrapper adicional
  return <>{children}</>
}

