'use client'

/**
 * Message Block Properties Panel
 * 
 * Edit simple text message properties.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react'

interface MessageBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function MessageBlockProperties({ node, onUpdate }: MessageBlockPropertiesProps) {
  const [messageText, setMessageText] = useState(node.data.messageText || '')

  useEffect(() => {
    setMessageText(node.data.messageText || '')
  }, [node.data.messageText])

  const handleSave = () => {
    onUpdate({ messageText })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto da Mensagem
        </label>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Digite a mensagem..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
          maxLength={1024}
        />
        <p className="text-xs text-gray-500 mt-1">
          {messageText.length}/1024 caracteres
        </p>
      </div>

      {/* Preview */}
      {messageText && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-1 font-medium">Preview:</p>
          <p className="text-sm text-gray-900">{messageText}</p>
        </div>
      )}
    </div>
  )
}
