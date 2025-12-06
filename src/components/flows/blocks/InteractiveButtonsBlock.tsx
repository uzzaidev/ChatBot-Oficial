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
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { Square, Trash2 } from 'lucide-react'
import type { ReplyButton } from '@/types/interactiveFlows'

interface InteractiveButtonsData {
  buttonsBody?: string
  buttonsFooter?: string
  buttons?: ReplyButton[]
}

const InteractiveButtonsBlock = memo(({ id, data, selected }: NodeProps) => {
  const blockData = data as InteractiveButtonsData
  const buttons = blockData.buttons || []
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
        ${selected ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200' : 'border-indigo-300'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-indigo-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
        style={{ top: -8 }}
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
        <Square className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-sm text-gray-800">Botões</span>
        <span className="text-xs text-gray-500 ml-auto">ID: {id.slice(0, 8)}</span>
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

      {/* Multiple Output Handles - One per Button */}
      {buttons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-indigo-200 space-y-2">
          {buttons.map((button, index) => (
            <div key={button.id} className="flex items-center justify-between text-xs relative">
              <span className="text-gray-700 truncate flex-1 pr-2" title={button.title}>
                {index + 1}. {button.title}
              </span>
              <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              <Handle
                type="source"
                position={Position.Right}
                id={button.id}
                className="!w-3 !h-3 !bg-indigo-500 hover:!w-4 hover:!h-4 transition-all cursor-crosshair"
                style={{ 
                  right: -6,
                  top: 'auto',
                  bottom: 'auto'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

InteractiveButtonsBlock.displayName = 'InteractiveButtonsBlock'

export default InteractiveButtonsBlock
