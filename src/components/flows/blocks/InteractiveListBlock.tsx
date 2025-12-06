'use client'

/**
 * Interactive List Block Component
 * 
 * List with multiple sections and rows (up to 10 sections).
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { memo } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { List, Trash2 } from 'lucide-react'
import type { ListSection } from '@/types/interactiveFlows'

interface InteractiveListData {
  listHeader?: string
  listBody?: string
  listFooter?: string
  listButtonText?: string
  listSections?: ListSection[]
}

const InteractiveListBlock = memo(({ id, data, selected }: NodeProps) => {
  const blockData = data as InteractiveListData
  const sections = blockData.listSections || []
  const totalRows = sections.reduce((acc: number, section: ListSection) => acc + (section.rows?.length || 0), 0)
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
        ${selected ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' : 'border-purple-300'}
      `}
    >
      {/* Handles - Maiores e com hover */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-purple-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
        style={{ top: -8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-purple-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
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
        <List className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-sm text-gray-800">Lista Interativa</span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600 space-y-1">
        {blockData.listBody ? (
          <p className="truncate font-medium">{blockData.listBody}</p>
        ) : (
          <p className="text-gray-400 italic">Clique para editar...</p>
        )}
        {sections.length > 0 && (
          <p className="text-purple-600 font-medium">
            {sections.length} seções • {totalRows} opções
          </p>
        )}
      </div>
    </div>
  )
})

InteractiveListBlock.displayName = 'InteractiveListBlock'

export default InteractiveListBlock
