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
  // CSS variable for text color based on message direction
  const textColorVar = isIncoming
    ? 'var(--chat-incoming-text-color, #FFFFFF)'
    : 'var(--chat-outgoing-text-color, #FFFFFF)'

  // Inline style objects for text colors with proper opacity support
  // Note: Tailwind's opacity modifiers don't work with CSS variables
  const textColorStyle = { color: textColorVar }
  const textColorMutedStyle = { color: textColorVar, opacity: 0.7 }

  // Border and background still use Tailwind (they work differently)
  const borderColor = isIncoming
    ? 'border-white/20'
    : 'border-white/20'
  const buttonBg = isIncoming
    ? 'bg-white/10 hover:bg-white/20'
    : 'bg-white/15 hover:bg-white/25'

  return (
    <div className="space-y-2">
      {/* Body text */}
      <div className="text-sm" style={textColorStyle}>
        {body}
      </div>

      {/* Footer text */}
      {footer && (
        <div className="text-xs" style={textColorMutedStyle}>
          {footer}
        </div>
      )}

      {/* Buttons */}
      <div className={`space-y-1 mt-3 pt-3 border-t ${borderColor}`}>
        {buttons.map((button) => (
          <div
            key={button.id}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors ${borderColor} ${buttonBg}`}
            style={textColorStyle}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{button.title}</span>
          </div>
        ))}
      </div>

      {/* Helper text */}
      <div className="text-xs italic mt-2" style={textColorMutedStyle}>
        {buttons.length} {buttons.length === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
