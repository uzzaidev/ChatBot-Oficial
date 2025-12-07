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

  return (
    <div className="space-y-2">
      {/* Header */}
      {header && (
        <div className={`text-sm font-semibold ${isIncoming ? 'text-erie-black-900' : 'text-white'}`}>
          {header}
        </div>
      )}

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

      {/* List Button */}
      <div className="mt-3 pt-3 border-t border-current/20">
        <div
          className={`
            flex items-center justify-between py-2 px-3 rounded-md
            border transition-colors
            ${
              isIncoming
                ? 'border-purple-300 bg-purple-50 text-purple-700'
                : 'border-white/30 bg-white/10 text-white'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="text-sm font-medium">{buttonText}</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Sections Preview - Collapsed */}
      <div className={`text-xs mt-2 ${isIncoming ? 'text-erie-black-600' : 'text-white/80'}`}>
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
      <div className={`text-xs italic mt-2 ${isIncoming ? 'text-erie-black-400' : 'text-white/60'}`}>
        {totalRows} {totalRows === 1 ? 'opção' : 'opções'} de resposta
      </div>
    </div>
  )
}
