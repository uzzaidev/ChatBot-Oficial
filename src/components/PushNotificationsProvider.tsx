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
import { initPushNotifications, removePushNotificationListeners } from '@/lib/pushNotifications'

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializar push notifications apenas uma vez no mount
    initPushNotifications()

    // Cleanup: remover listeners quando componente desmonta
    return () => {
      removePushNotificationListeners()
    }
  }, [])

  // Renderizar children sem wrapper adicional
  return <>{children}</>
}

