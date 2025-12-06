'use client'

/**
 * Message Block Component
 * 
 * Simple text message block.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { MessageSquare } from 'lucide-react'

const MessageBlock = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-blue-300'}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-sm text-gray-800">Mensagem</span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600">
        {data.messageText ? (
          <p className="line-clamp-2">{data.messageText}</p>
        ) : (
          <p className="text-gray-400 italic">Clique para editar...</p>
        )}
      </div>
    </div>
  )
})

MessageBlock.displayName = 'MessageBlock'

export default MessageBlock
