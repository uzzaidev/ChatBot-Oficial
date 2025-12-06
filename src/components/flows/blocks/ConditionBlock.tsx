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
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { GitBranch, Trash2 } from 'lucide-react'
import type { Condition } from '@/types/interactiveFlows'

interface ConditionBlockData {
  conditions?: Condition[]
}

const ConditionBlock = memo(({ id, data, selected }: NodeProps) => {
  const blockData = data as ConditionBlockData
  const conditions = blockData.conditions || []
  const { deleteElements } = useReactFlow()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200 relative
        ${selected ? 'border-yellow-500 shadow-lg ring-2 ring-yellow-200' : 'border-yellow-300'}
      `}
    >
      {/* Handles - Maiores e com hover */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-yellow-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
        style={{ top: -8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-yellow-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
        style={{ bottom: -8 }}
      />

      {/* Delete Button */}
      {selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md z-10"
          title="Deletar bloco"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

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
