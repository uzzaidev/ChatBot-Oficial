'use client'

/**
 * End Block Component
 * 
 * Final block of the flow.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { StopCircle } from 'lucide-react'

const EndBlock = memo(({ id, data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-red-500 shadow-lg ring-2 ring-red-200' : 'border-red-300'}
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />

      {/* Content */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-red-100 rounded-lg">
          <StopCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">Fim</div>
          <div className="text-xs text-gray-500">Finalizar flow</div>
        </div>
        <span className="text-xs text-gray-500">{id.replace('node-', '').slice(0, 8)}</span>
      </div>
    </div>
  )
})

EndBlock.displayName = 'EndBlock'

export default EndBlock
