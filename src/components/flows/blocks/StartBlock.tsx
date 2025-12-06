'use client'

/**
 * Start Block Component
 * 
 * Initial block of the flow.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'

const StartBlock = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-green-500 shadow-lg ring-2 ring-green-200' : 'border-green-300'}
      `}
    >
      {/* Output handle - Maior para melhor UX */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-green-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
        style={{ bottom: -8 }}
      />

      {/* Content */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-green-100 rounded-lg">
          <Play className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-900">Início</div>
          <div className="text-xs text-gray-500">Bloco inicial</div>
        </div>
      </div>
    </div>
  )
})

StartBlock.displayName = 'StartBlock'

export default StartBlock
