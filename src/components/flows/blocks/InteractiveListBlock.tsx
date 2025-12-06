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
import { Handle, Position, NodeProps } from '@xyflow/react'
import { List } from 'lucide-react'

const InteractiveListBlock = memo(({ data, selected }: NodeProps) => {
  const sections = data.listSections || []
  const totalRows = sections.reduce((acc: number, section: any) => acc + (section.rows?.length || 0), 0)

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        ${selected ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' : 'border-purple-300'}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <List className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-sm text-gray-800">Lista Interativa</span>
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-600 space-y-1">
        {data.listBody ? (
          <p className="truncate font-medium">{data.listBody}</p>
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
