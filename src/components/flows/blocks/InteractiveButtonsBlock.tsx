'use client'

/**
 * Interactive Buttons Block Component
 * 
 * Up to 3 reply buttons.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Square } from 'lucide-react'
import type { ReplyButton } from '@/types/interactiveFlows'

interface InteractiveButtonsData {
  buttonsBody?: string
  buttonsFooter?: string
  buttons?: ReplyButton[]
}

const InteractiveButtonsBlock = memo(({ data, selected }: NodeProps) => {
  const blockData = data as InteractiveButtonsData
  const buttons = blockData.buttons || []

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        ${selected ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200' : 'border-indigo-300'}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-indigo-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Square className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-sm text-gray-800">Botões</span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600 space-y-1">
        {blockData.buttonsBody ? (
          <p className="truncate font-medium">{blockData.buttonsBody}</p>
        ) : (
          <p className="text-gray-400 italic">Clique para editar...</p>
        )}
        {buttons.length > 0 && (
          <p className="text-indigo-600 font-medium">
            {buttons.length} {buttons.length === 1 ? 'botão' : 'botões'}
          </p>
        )}
      </div>
    </div>
  )
})

InteractiveButtonsBlock.displayName = 'InteractiveButtonsBlock'

export default InteractiveButtonsBlock
