'use client'

/**
 * Interactive List Message Component
 *
 * Displays an interactive list message as it appears to the user in WhatsApp.
 * Shows header, body, footer, and list sections with rows.
 *
 * This is a read-only display component for showing what was sent to the user.
 */

import { List, ChevronRight } from 'lucide-react'

interface ListRow {
  id: string
  title: string
  description?: string
}

interface ListSection {
  title: string
  rows: ListRow[]
}

interface InteractiveListMessageProps {
  header?: string
  body: string
  footer?: string
  buttonText: string
  sections: ListSection[]
  isIncoming?: boolean
}

export const InteractiveListMessage = ({
  header,
  body,
  footer,
  buttonText,
  sections,
  isIncoming = false,
}: InteractiveListMessageProps) => {
  const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0)

  // CSS variable for text color based on message direction
  const textColorVar = isIncoming
    ? 'var(--chat-incoming-text-color, #FFFFFF)'
    : 'var(--chat-outgoing-text-color, #FFFFFF)'

  // Inline style objects for text colors with proper opacity support
  // Note: Tailwind's opacity modifiers don't work with CSS variables
  const textColorStyle = { color: textColorVar }
  const textColorMutedStyle = { color: textColorVar, opacity: 0.7 }
  const textColorSubtleStyle = { color: textColorVar, opacity: 0.8 }

  // Border and background still use Tailwind (they work differently)
  const borderColor = isIncoming
    ? 'border-white/20'
    : 'border-white/20'
  const buttonBg = isIncoming
    ? 'bg-white/10 hover:bg-white/20'
    : 'bg-white/15 hover:bg-white/25'

  return (
    <div className="space-y-2">
      {/* Header */}
      {header && (
        <div className="text-sm font-semibold" style={textColorStyle}>
          {header}
        </div>
      )}

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

      {/* List Button */}
      <div className={`mt-3 pt-3 border-t ${borderColor}`}>
        <div
          className={`flex items-center justify-between py-2 px-3 rounded-md border transition-colors ${borderColor} ${buttonBg}`}
          style={textColorStyle}
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="text-sm font-medium">{buttonText}</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Sections Preview - Collapsed */}
      <div className="text-xs mt-2" style={textColorSubtleStyle}>
        <div className="space-y-1">
          {sections.map((section, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-semibold">{section.title}:</span>
              <span className="flex-1">
                {section.rows.length} {section.rows.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Helper text */}
      <div className="text-xs italic mt-2" style={textColorMutedStyle}>
        {totalRows} {totalRows === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
