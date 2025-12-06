'use client'

/**
 * Condition Block Properties Panel
 * 
 * Edit conditional branching rules.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Condition } from '@/types/interactiveFlows'

interface ConditionBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function ConditionBlockProperties({ node, onUpdate }: ConditionBlockPropertiesProps) {
  const [conditions, setConditions] = useState<Condition[]>(node.data.conditions || [])
  const [defaultNextBlockId, setDefaultNextBlockId] = useState(node.data.defaultNextBlockId || '')

  useEffect(() => {
    setConditions(node.data.conditions || [])
    setDefaultNextBlockId(node.data.defaultNextBlockId || '')
  }, [node.data])

  const handleSave = () => {
    onUpdate({
      conditions,
      defaultNextBlockId
    })
  }

  const addCondition = () => {
    const newCondition: Condition = {
      variable: 'last_choice',
      operator: '==',
      value: '',
      nextBlockId: ''
    }
    setConditions([...conditions, newCondition])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    ))
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-3">
          Configure condições para direcionar o fluxo baseado em variáveis.
        </p>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Condições ({conditions.length})
          </label>
          <button
            onClick={addCondition}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </button>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto">
          {conditions.map((condition, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Condição {index + 1}</span>
                <button
                  onClick={() => removeCondition(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Variable */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Variável</label>
                  <input
                    type="text"
                    value={condition.variable}
                    onChange={(e) => updateCondition(index, { variable: e.target.value })}
                    onBlur={handleSave}
                    placeholder="last_choice"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Operador</label>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                    onBlur={handleSave}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="==">Igual a (==)</option>
                    <option value="!=">Diferente de (!=)</option>
                    <option value=">">Maior que (&gt;)</option>
                    <option value="<">Menor que (&lt;)</option>
                    <option value="contains">Contém</option>
                    <option value="not_contains">Não contém</option>
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor</label>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    onBlur={handleSave}
                    placeholder="Valor para comparar"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Next Block ID (placeholder - ideally would be a select of available blocks) */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ID do próximo bloco</label>
                  <input
                    type="text"
                    value={condition.nextBlockId}
                    onChange={(e) => updateCondition(index, { nextBlockId: e.target.value })}
                    onBlur={handleSave}
                    placeholder="ID do bloco (ou conecte visualmente)"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Dica: Conecte este bloco visualmente no canvas
                  </p>
                </div>
              </div>
            </div>
          ))}

          {conditions.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">
              Nenhuma condição configurada
            </p>
          )}
        </div>
      </div>

      {/* Default Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Caminho Padrão (se nenhuma condição for verdadeira)
        </label>
        <input
          type="text"
          value={defaultNextBlockId}
          onChange={(e) => setDefaultNextBlockId(e.target.value)}
          onBlur={handleSave}
          placeholder="ID do bloco padrão (ou conecte visualmente)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Dica: Conecte este bloco visualmente no canvas
        </p>
      </div>

      {/* Info */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Como funciona:</strong> As condições são avaliadas em ordem. 
          A primeira que for verdadeira será executada. Se nenhuma for verdadeira, 
          o caminho padrão será usado.
        </p>
      </div>
    </div>
  )
}
