'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Configura viewport mobile nativo para evitar sobreposição com status/navigation bars.
 * - Desativa overlay da status bar no WebView nativo.
 * - Define insets mínimos para Android como fallback profissional.
 */
export function MobileViewportProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()
    const root = document.documentElement

    root.classList.add('native-app')

    // Fallback para Android quando env(safe-area-inset-*) retorna 0 no WebView.
    if (platform === 'android') {
      root.style.setProperty('--native-safe-area-inset-top', '16px')
      root.style.setProperty('--native-safe-area-inset-bottom', '8px')
    }

    const applyStatusBarStyle = () => {
      const isDark = root.classList.contains('dark')
      StatusBar.setStyle({
        style: isDark ? Style.Light : Style.Dark,
      }).catch(() => undefined)
    }

    // Evita conteúdo sob a status bar em devices edge-to-edge.
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined)
    applyStatusBarStyle()

    const observer = new MutationObserver(() => {
      applyStatusBarStyle()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
      root.classList.remove('native-app')
    }
  }, [])

  return <>{children}</>
}
