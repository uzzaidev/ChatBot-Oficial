'use client'

/**
 * Action Block Properties Panel
 * 
 * Edit action block configuration (set variables, tags, etc).
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect } from 'react'

interface ActionBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function ActionBlockProperties({ node, onUpdate }: ActionBlockPropertiesProps) {
  const [actionType, setActionType] = useState<string>(node.data.actionType || 'set_variable')
  const [actionParams, setActionParams] = useState<Record<string, any>>(node.data.actionParams || {})

  useEffect(() => {
    setActionType(node.data.actionType || 'set_variable')
    setActionParams(node.data.actionParams || {})
  }, [node.data])

  const handleSave = () => {
    onUpdate({
      actionType,
      actionParams
    })
  }

  const handleActionTypeChange = (newType: string) => {
    setActionType(newType)
    // Reset params when changing type
    const defaultParams: Record<string, any> = {}
    
    switch (newType) {
      case 'set_variable':
      case 'increment':
        defaultParams.name = actionParams.name || 'my_variable'
        if (newType === 'set_variable') {
          defaultParams.value = actionParams.value || ''
        }
        break
      case 'add_tag':
      case 'remove_tag':
        defaultParams.tag = actionParams.tag || ''
        break
    }
    
    setActionParams(defaultParams)
    onUpdate({ actionType: newType, actionParams: defaultParams })
  }

  const updateParam = (key: string, value: any) => {
    const newParams = { ...actionParams, [key]: value }
    setActionParams(newParams)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-3">
          Configure ações para executar durante o fluxo.
        </p>
      </div>

      {/* Action Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Ação
        </label>
        <select
          value={actionType}
          onChange={(e) => handleActionTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="set_variable">Definir Variável</option>
          <option value="increment">Incrementar Variável</option>
          <option value="add_tag">Adicionar Tag</option>
          <option value="remove_tag">Remover Tag</option>
        </select>
      </div>

      {/* Parameters based on action type */}
      {actionType === 'set_variable' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Variável
            </label>
            <input
              type="text"
              value={actionParams.name || ''}
              onChange={(e) => updateParam('name', e.target.value)}
              onBlur={handleSave}
              placeholder="my_variable"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor
            </label>
            <input
              type="text"
              value={actionParams.value || ''}
              onChange={(e) => updateParam('value', e.target.value)}
              onBlur={handleSave}
              placeholder="valor da variável"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Exemplo:</strong> Nome: &quot;user_name&quot;, Valor: &quot;João Silva&quot;
            </p>
          </div>
        </>
      )}

      {actionType === 'increment' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Variável
            </label>
            <input
              type="text"
              value={actionParams.name || ''}
              onChange={(e) => updateParam('name', e.target.value)}
              onBlur={handleSave}
              placeholder="counter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Como funciona:</strong> Aumenta o valor da variável em 1. 
              Se a variável não existir, será criada com valor 1.
            </p>
          </div>
        </>
      )}

      {(actionType === 'add_tag' || actionType === 'remove_tag') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Tag
            </label>
            <input
              type="text"
              value={actionParams.tag || ''}
              onChange={(e) => updateParam('tag', e.target.value)}
              onBlur={handleSave}
              placeholder="vip"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Como funciona:</strong> {actionType === 'add_tag' ? 'Adiciona' : 'Remove'} 
              {' '}uma tag ao contato para segmentação e organização.
            </p>
          </div>
        </>
      )}

      {/* Preview */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600 mb-1 font-medium">Preview da Ação:</p>
        <p className="text-sm text-gray-900">
          {actionType === 'set_variable' && actionParams.name && (
            <>Definir <code className="px-1 bg-gray-200 rounded">{actionParams.name}</code> = &quot;{actionParams.value}&quot;</>
          )}
          {actionType === 'increment' && actionParams.name && (
            <>Incrementar <code className="px-1 bg-gray-200 rounded">{actionParams.name}</code> (+1)</>
          )}
          {actionType === 'add_tag' && actionParams.tag && (
            <>Adicionar tag <code className="px-1 bg-gray-200 rounded">{actionParams.tag}</code></>
          )}
          {actionType === 'remove_tag' && actionParams.tag && (
            <>Remover tag <code className="px-1 bg-gray-200 rounded">{actionParams.tag}</code></>
          )}
          {!actionParams.name && !actionParams.tag && (
            <span className="text-gray-400 italic">Configure os parâmetros acima</span>
          )}
        </p>
      </div>
    </div>
  )
}
