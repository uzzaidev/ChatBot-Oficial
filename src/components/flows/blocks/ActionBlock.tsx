'use client'

/**
 * Action Block Component
 * 
 * Perform actions like setting variables or tags.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'

const ActionBlock = memo(({ id, data, selected }: NodeProps) => {
  const actionType = data.actionType

  const getActionLabel = () => {
    switch (actionType) {
      case 'set_variable': return 'Definir variável'
      case 'increment': return 'Incrementar'
      case 'add_tag': return 'Adicionar tag'
      case 'remove_tag': return 'Remover tag'
      default: return 'Ação'
    }
  }

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-200' : 'border-orange-300'}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-orange-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-orange-600" />
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">Ação</div>
          <div className="text-xs text-gray-600">{getActionLabel()}</div>
        </div>
        <span className="text-xs text-gray-500">{id.replace('node-', '').slice(0, 8)}</span>
      </div>
    </div>
  )
})

ActionBlock.displayName = 'ActionBlock'

export default ActionBlock
