'use client'

/**
 * Interactive Buttons Properties Panel
 * 
 * Edit reply buttons (up to 3).
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ReplyButton } from '@/types/interactiveFlows'

interface InteractiveButtonsPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function InteractiveButtonsProperties({ node, onUpdate }: InteractiveButtonsPropertiesProps) {
  const [buttonsBody, setButtonsBody] = useState(node.data.buttonsBody || '')
  const [buttons, setButtons] = useState<ReplyButton[]>(node.data.buttons || [])

  useEffect(() => {
    setButtonsBody(node.data.buttonsBody || '')
    setButtons(node.data.buttons || [])
  }, [node.data])

  const handleSave = () => {
    onUpdate({
      buttonsBody,
      buttons
    })
  }

  const addButton = () => {
    if (buttons.length >= 3) {
      alert('Máximo de 3 botões permitidos')
      return
    }

    const newButton: ReplyButton = {
      id: `btn-${Date.now()}`,
      title: 'Novo Botão',
      nextBlockId: ''
    }

    setButtons([...buttons, newButton])
  }

  const removeButton = (buttonId: string) => {
    setButtons(buttons.filter(b => b.id !== buttonId))
  }

  const updateButton = (buttonId: string, updates: Partial<ReplyButton>) => {
    setButtons(buttons.map(b => 
      b.id === buttonId ? { ...b, ...updates } : b
    ))
  }

  return (
    <div className="space-y-4">
      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto Principal
        </label>
        <textarea
          value={buttonsBody}
          onChange={(e) => setButtonsBody(e.target.value)}
          onBlur={handleSave}
          placeholder="Digite o texto principal..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={3}
          maxLength={1024}
        />
      </div>

      {/* Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Botões ({buttons.length}/3)
          </label>
          <button
            onClick={addButton}
            disabled={buttons.length >= 3}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {buttons.map((button, idx) => (
            <div key={button.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  value={button.title}
                  onChange={(e) => updateButton(button.id, { title: e.target.value })}
                  onBlur={handleSave}
                  placeholder={`Botão ${idx + 1}`}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-0.5">
                  {button.title.length}/20 caracteres
                </p>
              </div>
              <button
                onClick={() => removeButton(button.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {buttons.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">
              Nenhum botão adicionado ainda
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      {buttonsBody && buttons.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-2 font-medium">Preview:</p>
          <p className="text-sm text-gray-900 mb-2">{buttonsBody}</p>
          <div className="space-y-1">
            {buttons.map((button) => (
              <div key={button.id} className="px-3 py-2 bg-white border border-indigo-300 rounded text-sm text-center">
                {button.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
