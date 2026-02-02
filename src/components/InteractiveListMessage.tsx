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

  // Dynamic colors based on message direction
  // Uses CSS variables for customizable theme colors
  const textColor = isIncoming
    ? 'text-[var(--chat-incoming-text-color,#FFFFFF)]'
    : 'text-[var(--chat-outgoing-text-color,#FFFFFF)]'
  const textColorMuted = isIncoming
    ? 'text-[var(--chat-incoming-text-color,#FFFFFF)]/70'
    : 'text-[var(--chat-outgoing-text-color,#FFFFFF)]/70'
  const textColorSubtle = isIncoming
    ? 'text-[var(--chat-incoming-text-color,#FFFFFF)]/80'
    : 'text-[var(--chat-outgoing-text-color,#FFFFFF)]/80'
  const borderColor = isIncoming
    ? 'border-[var(--chat-incoming-text-color,#FFFFFF)]/20'
    : 'border-[var(--chat-outgoing-text-color,#FFFFFF)]/20'
  const buttonBg = isIncoming
    ? 'bg-[var(--chat-incoming-text-color,#FFFFFF)]/10 hover:bg-[var(--chat-incoming-text-color,#FFFFFF)]/20'
    : 'bg-[var(--chat-outgoing-text-color,#FFFFFF)]/15 hover:bg-[var(--chat-outgoing-text-color,#FFFFFF)]/25'

  return (
    <div className="space-y-2">
      {/* Header */}
      {header && (
        <div className={`text-sm font-semibold ${textColor}`}>
          {header}
        </div>
      )}

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

      {/* List Button */}
      <div className={`mt-3 pt-3 border-t ${borderColor}`}>
        <div className={`flex items-center justify-between py-2 px-3 rounded-md border transition-colors ${borderColor} ${buttonBg} ${textColor}`}>
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="text-sm font-medium">{buttonText}</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Sections Preview - Collapsed */}
      <div className={`text-xs mt-2 ${textColorSubtle}`}>
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
      <div className={`text-xs italic mt-2 ${textColorMuted}`}>
        {totalRows} {totalRows === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
