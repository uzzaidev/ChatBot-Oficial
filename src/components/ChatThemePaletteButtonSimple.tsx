'use client'

import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'

/**
 * Versão SUPER SIMPLIFICADA para debug
 * Se este componente aparecer, o problema é no ChatThemeCustomizerModal
 */
export const ChatThemePaletteButtonSimple = () => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => alert('Botão clicado! Se você vê isso, o componente está renderizando.')}
      className="relative bg-red-500"
      title="TESTE - Botão de debug"
    >
      <Palette className="h-5 w-5" />
      <span className="sr-only">TESTE</span>
    </Button>
  )
}
