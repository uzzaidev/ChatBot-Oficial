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

  // Flatten all rows from all sections for handle creation
  const allRows = sections.flatMap(section => section.rows)

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200 relative
        ${selected ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' : 'border-purple-300'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-purple-500 hover:w-5 hover:h-5 transition-all cursor-crosshair"
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
        <List className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-sm text-gray-800">Lista Interativa</span>
        <span className="text-xs text-gray-500 ml-auto">ID: {id.slice(0, 8)}</span>
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

      {/* Multiple Output Handles - One per List Row */}
      {allRows.length > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-200 space-y-1.5 max-h-[200px] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="text-xs font-medium text-purple-700 mb-1">{section.title}</div>
              {section.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-xs relative pl-2 py-1">
                  <span className="text-gray-700 truncate flex-1 pr-2" title={row.title}>
                    • {row.title}
                  </span>
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={row.id}
                    className="!w-3 !h-3 !bg-purple-500 hover:!w-4 hover:!h-4 transition-all cursor-crosshair"
                    style={{ 
                      right: -6,
                      top: 'auto',
                      bottom: 'auto'
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

InteractiveListBlock.displayName = 'InteractiveListBlock'

export default InteractiveListBlock
