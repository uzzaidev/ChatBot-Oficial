'use client'

/**
 * Interactive Buttons Message Component
 * 
 * Displays an interactive buttons message as it appears to the user in WhatsApp.
 * Shows the body text and up to 3 reply buttons.
 * 
 * This is a read-only display component for showing what was sent to the user.
 */

import { MessageCircle } from 'lucide-react'

interface InteractiveButton {
  id: string
  title: string
}

interface InteractiveButtonsMessageProps {
  body: string
  footer?: string
  buttons: InteractiveButton[]
  isIncoming?: boolean
}

export const InteractiveButtonsMessage = ({
  body,
  footer,
  buttons,
  isIncoming = false,
}: InteractiveButtonsMessageProps) => {
  return (
    <div className="space-y-2">
      {/* Body text */}
      <div className={`text-sm ${isIncoming ? 'text-erie-black-800' : 'text-white'}`}>
        {body}
      </div>

      {/* Footer text */}
      {footer && (
        <div className={`text-xs ${isIncoming ? 'text-erie-black-500' : 'text-white/70'}`}>
          {footer}
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-1 mt-3 pt-3 border-t border-current/20">
        {buttons.map((button) => (
          <div
            key={button.id}
            className={`
              flex items-center justify-center gap-2 py-2 px-3 rounded-md
              border transition-colors
              ${
                isIncoming
                  ? 'border-mint-300 bg-mint-50 text-mint-700'
                  : 'border-white/30 bg-white/10 text-white'
              }
            `}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{button.title}</span>
          </div>
        ))}
      </div>

      {/* Helper text */}
      <div className={`text-xs italic mt-2 ${isIncoming ? 'text-erie-black-400' : 'text-white/60'}`}>
        {buttons.length} {buttons.length === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
