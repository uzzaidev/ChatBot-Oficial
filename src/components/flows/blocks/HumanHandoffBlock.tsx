'use client'

/**
 * Human Handoff Block Component
 * 
 * Transfer conversation to human agent.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { User } from 'lucide-react'

const HumanHandoffBlock = memo(({ id, data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-pink-500 shadow-lg ring-2 ring-pink-200' : 'border-pink-300'}
      `}
    >
      {/* Input handle only */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-pink-500"
      />

      {/* Content */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-pink-100 rounded-lg">
          <User className="w-5 h-5 text-pink-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">Transferir Humano</div>
          <div className="text-xs text-gray-500">Enviar para atendente</div>
        </div>
        <span className="text-xs text-gray-500">ID: {id.slice(0, 8)}</span>
      </div>
    </div>
  )
})

HumanHandoffBlock.displayName = 'HumanHandoffBlock'

export default HumanHandoffBlock
