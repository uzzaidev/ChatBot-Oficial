'use client'

import { useEffect } from 'react'

/**
 * Teclado do celular por cima da conversa.
 *
 * As telas de conversa usam um container `fixed` do tamanho da tela. Quando o teclado
 * abre, o iPhone (WKWebView/Safari) e o Chrome do Android encolhem só a área VISÍVEL
 * (visualViewport), não o layout: o rodapé com o campo de texto fica embaixo do teclado.
 *
 * Este hook publica a área visível em CSS, para o container ocupar só ela:
 *   --app-height      altura visível (px)
 *   --app-offset-top  quanto o navegador rolou a página para mostrar o campo (px)
 *   .keyboard-open    no <html> enquanto o teclado estiver aberto
 *
 * No app Android com Capacitor 8 a WebView já encolhe (SystemBars soma a altura do
 * teclado); aí a área visível é a própria janela e o hook não muda nada.
 */

const KEYBOARD_MIN_HEIGHT_PX = 120

export const useKeyboardAwareViewport = (): void => {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement

    const update = () => {
      const keyboardOpen = window.innerHeight - viewport.height > KEYBOARD_MIN_HEIGHT_PX
      root.style.setProperty('--app-height', `${Math.round(viewport.height)}px`)
      root.style.setProperty('--app-offset-top', `${Math.round(viewport.offsetTop)}px`)
      root.classList.toggle('keyboard-open', keyboardOpen)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)

    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty('--app-height')
      root.style.removeProperty('--app-offset-top')
      root.classList.remove('keyboard-open')
    }
  }, [])
}
