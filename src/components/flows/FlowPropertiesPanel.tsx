'use client'

/**
 * Flow Properties Panel Component
 * 
 * Right panel for editing properties of the selected node.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useFlowStore } from '@/stores/flowStore'
import MessageBlockProperties from './properties/MessageBlockProperties'
import InteractiveListProperties from './properties/InteractiveListProperties'
import InteractiveButtonsProperties from './properties/InteractiveButtonsProperties'

export default function FlowPropertiesPanel() {
  const { nodes, selectedNodeId, updateNode } = useFlowStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const handleUpdate = (data: any) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, data)
    }
  }

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✏️</span>
          </div>
          <p className="text-gray-600 text-sm">
            Selecione um bloco para editar suas propriedades
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-bold text-lg mb-1 text-gray-900">Propriedades</h3>
      <p className="text-sm text-gray-600 mb-4">
        {selectedNode.data?.label || selectedNode.type}
      </p>

      {/* Render type-specific properties */}
      {selectedNode.type === 'message' && (
        <MessageBlockProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {selectedNode.type === 'interactive_list' && (
        <InteractiveListProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {selectedNode.type === 'interactive_buttons' && (
        <InteractiveButtonsProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {/* Add more property panels as needed */}
      {!['message', 'interactive_list', 'interactive_buttons'].includes(selectedNode.type) && (
        <div className="text-sm text-gray-500">
          Propriedades para este tipo de bloco ainda não implementadas.
        </div>
      )}
    </aside>
  )
}
