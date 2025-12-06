'use client'

/**
 * Condition Block Component
 * 
 * Conditional branching based on variables.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'

const ConditionBlock = memo(({ data, selected }: NodeProps) => {
  const conditions = data.conditions || []

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        ${selected ? 'border-yellow-500 shadow-lg ring-2 ring-yellow-200' : 'border-yellow-300'}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-yellow-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-5 h-5 text-yellow-600" />
        <span className="font-semibold text-sm text-gray-800">Condição</span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600">
        {conditions.length > 0 ? (
          <p className="text-yellow-600 font-medium">
            {conditions.length} {conditions.length === 1 ? 'condição' : 'condições'}
          </p>
        ) : (
          <p className="text-gray-400 italic">Clique para editar...</p>
        )}
      </div>
    </div>
  )
})

ConditionBlock.displayName = 'ConditionBlock'

export default ConditionBlock
