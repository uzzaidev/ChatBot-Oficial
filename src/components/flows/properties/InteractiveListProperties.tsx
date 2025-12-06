'use client'

/**
 * Interactive List Properties Panel
 * 
 * Edit list sections and rows.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ListSection } from '@/types/interactiveFlows'

interface InteractiveListPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function InteractiveListProperties({ node, onUpdate }: InteractiveListPropertiesProps) {
  const [listBody, setListBody] = useState(node.data.listBody || '')
  const [listButtonText, setListButtonText] = useState(node.data.listButtonText || 'Ver opções')
  const [sections, setSections] = useState<ListSection[]>(node.data.listSections || [])

  useEffect(() => {
    setListBody(node.data.listBody || '')
    setListButtonText(node.data.listButtonText || 'Ver opções')
    setSections(node.data.listSections || [])
  }, [node.data])

  const handleSave = () => {
    onUpdate({
      listBody,
      listButtonText,
      listSections: sections
    })
  }

  const addSection = () => {
    if (sections.length >= 10) {
      alert('Máximo de 10 seções permitidas')
      return
    }

    const newSection: ListSection = {
      id: `section-${Date.now()}`,
      title: 'Nova Seção',
      rows: []
    }

    setSections([...sections, newSection])
  }

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId))
  }

  const updateSection = (sectionId: string, updates: Partial<ListSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ))
  }

  const addRow = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    if (section.rows.length >= 10) {
      alert('Máximo de 10 opções por seção')
      return
    }

    const newRow = {
      id: `row-${Date.now()}`,
      title: 'Nova Opção',
      description: '',
      nextBlockId: ''
    }

    updateSection(sectionId, {
      rows: [...section.rows, newRow]
    })
  }

  const removeRow = (sectionId: string, rowId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    updateSection(sectionId, {
      rows: section.rows.filter(r => r.id !== rowId)
    })
  }

  const updateRow = (sectionId: string, rowId: string, updates: any) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    updateSection(sectionId, {
      rows: section.rows.map(r => 
        r.id === rowId ? { ...r, ...updates } : r
      )
    })
  }

  return (
    <div className="space-y-4">
      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto Principal
        </label>
        <textarea
          value={listBody}
          onChange={(e) => setListBody(e.target.value)}
          onBlur={handleSave}
          placeholder="Digite o texto principal..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          rows={3}
          maxLength={1024}
        />
      </div>

      {/* Button Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto do Botão
        </label>
        <input
          type="text"
          value={listButtonText}
          onChange={(e) => setListButtonText(e.target.value)}
          onBlur={handleSave}
          placeholder="Ver opções"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          maxLength={20}
        />
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Seções ({sections.length}/10)
          </label>
          <button
            onClick={addSection}
            disabled={sections.length >= 10}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sections.map((section, sectionIdx) => (
            <div key={section.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  onBlur={handleSave}
                  placeholder="Nome da seção"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  maxLength={24}
                />
                <button
                  onClick={() => removeSection(section.id)}
                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Rows */}
              <div className="space-y-2 ml-2">
                {section.rows.map((row) => (
                  <div key={row.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateRow(section.id, row.id, { title: e.target.value })}
                        onBlur={handleSave}
                        placeholder="Título da opção"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        maxLength={24}
                      />
                      <input
                        type="text"
                        value={row.description || ''}
                        onChange={(e) => updateRow(section.id, row.id, { description: e.target.value })}
                        onBlur={handleSave}
                        placeholder="Descrição (opcional)"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        maxLength={72}
                      />
                    </div>
                    <button
                      onClick={() => removeRow(section.id, row.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addRow(section.id)}
                  disabled={section.rows.length >= 10}
                  className="w-full py-1 text-xs text-purple-600 border border-purple-300 border-dashed rounded hover:bg-purple-50 disabled:opacity-50"
                >
                  + Adicionar Opção
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
