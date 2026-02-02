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
  // Dynamic colors based on message direction
  // Uses CSS variables for customizable theme colors
  const textColor = isIncoming
    ? 'text-[var(--chat-incoming-text-color,#FFFFFF)]'
    : 'text-[var(--chat-outgoing-text-color,#FFFFFF)]'
  const textColorMuted = isIncoming
    ? 'text-[var(--chat-incoming-text-color,#FFFFFF)]/70'
    : 'text-[var(--chat-outgoing-text-color,#FFFFFF)]/70'
  const borderColor = isIncoming
    ? 'border-[var(--chat-incoming-text-color,#FFFFFF)]/20'
    : 'border-[var(--chat-outgoing-text-color,#FFFFFF)]/20'
  const buttonBg = isIncoming
    ? 'bg-[var(--chat-incoming-text-color,#FFFFFF)]/10 hover:bg-[var(--chat-incoming-text-color,#FFFFFF)]/20'
    : 'bg-[var(--chat-outgoing-text-color,#FFFFFF)]/15 hover:bg-[var(--chat-outgoing-text-color,#FFFFFF)]/25'

  return (
    <div className="space-y-2">
      {/* Body text */}
      <div className={`text-sm ${textColor}`}>
        {body}
      </div>

      {/* Footer text */}
      {footer && (
        <div className={`text-xs ${textColorMuted}`}>
          {footer}
        </div>
      )}

      {/* Buttons */}
      <div className={`space-y-1 mt-3 pt-3 border-t ${borderColor}`}>
        {buttons.map((button) => (
          <div
            key={button.id}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors ${borderColor} ${buttonBg} ${textColor}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{button.title}</span>
          </div>
        ))}
      </div>

      {/* Helper text */}
      <div className={`text-xs italic mt-2 ${textColorMuted}`}>
        {buttons.length} {buttons.length === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
