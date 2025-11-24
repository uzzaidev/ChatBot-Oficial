/**
 * Deep Linking Provider
 * 
 * Componente client que inicializa deep linking no app mobile.
 * Deve ser usado no layout.tsx (Server Component).
 */

'use client'

import { useEffect } from 'react'
import { initDeepLinking } from '@/lib/deepLinking'

export function DeepLinkingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializar deep linking apenas uma vez no mount
    initDeepLinking()
  }, [])

  // Renderizar children sem wrapper adicional
  return <>{children}</>
}

