'use client'

/**
 * AI Handoff Block Component
 * 
 * Transfer conversation to AI agent.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Bot } from 'lucide-react'

const AIHandoffBlock = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px]
        transition-all duration-200
        ${selected ? 'border-cyan-500 shadow-lg ring-2 ring-cyan-200' : 'border-cyan-300'}
      `}
    >
      {/* Input handle only */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-cyan-500"
      />

      {/* Content */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-cyan-100 rounded-lg">
          <Bot className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-900">Transferir IA</div>
          <div className="text-xs text-gray-500">Enviar para bot</div>
        </div>
      </div>
    </div>
  )
})

AIHandoffBlock.displayName = 'AIHandoffBlock'

export default AIHandoffBlock
