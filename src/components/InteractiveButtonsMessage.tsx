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
}: InteractiveButtonsMessageProps) => {
  return (
    <div className="space-y-2">
      {/* Body text */}
      <div className="text-sm text-foreground">
        {body}
      </div>

      {/* Footer text */}
      {footer && (
        <div className="text-xs text-muted-foreground">
          {footer}
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-1 mt-3 pt-3 border-t border-border/50">
        {buttons.map((button) => (
          <div
            key={button.id}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors border-border bg-muted/50 text-foreground hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{button.title}</span>
          </div>
        ))}
      </div>

      {/* Helper text */}
      <div className="text-xs italic mt-2 text-muted-foreground">
        {buttons.length} {buttons.length === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
