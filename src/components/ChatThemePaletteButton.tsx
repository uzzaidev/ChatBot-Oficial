'use client'

import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'

// Lazy load do modal (só carrega quando abrir)
const ChatThemeCustomizerModal = lazy(() => 
  import('@/components/ChatThemeCustomizerModal').then(mod => ({ 
    default: mod.ChatThemeCustomizerModal 
  }))
)

/**
 * Botão de Paleta de Cores
 *
 * Botão que abre o modal de personalização de tema das conversas.
 * Deve ser posicionado ao lado do botão de tema claro/escuro.
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <ChatThemePaletteButton />
 *   <ThemeToggle />
 * </div>
 * ```
 */
export const ChatThemePaletteButton = () => {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    try {
      setShowModal(true)
      setError(null)
    } catch (err) {
      console.error('Erro ao abrir modal:', err)
      setError('Erro ao abrir modal de tema')
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="relative"
        title="Personalizar tema das conversas"
      >
        <Palette className="h-5 w-5" />
        <span className="sr-only">Personalizar tema</span>
      </Button>

      {error && (
        <div className="absolute top-12 right-0 bg-red-500 text-white text-xs p-2 rounded">
          {error}
        </div>
      )}

      {showModal && (
        <Suspense fallback={<div>Carregando...</div>}>
          <ChatThemeCustomizerModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
        </Suspense>
      )}
    </>
  )
}
