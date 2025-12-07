'use client'

/**
 * Flow Architecture Canvas Component
 * 
 * Main ReactFlow canvas for architecture visualization.
 * Read-only nodes (no adding/deleting), but can reposition.
 * 
 * @created 2025-12-07
 */

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  Node,
  Edge,
  Panel
} from '@xyflow/react'
import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import FlowNodeBlock from './blocks/FlowNodeBlock'

// Map node types to components
const nodeTypes = {
  flowNode: FlowNodeBlock
}

export default function FlowArchitectureCanvas() {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNode,
    updateNodePosition,
    recalculateEdges
  } = useFlowArchitectureStore()

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState([])
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState([])

  // Sync store with local state
  useEffect(() => {
    setLocalNodes(nodes as Node[])
  }, [nodes, setLocalNodes])

  useEffect(() => {
    setLocalEdges(edges as Edge[])
  }, [edges, setLocalEdges])

  // Handle node changes (mainly position updates)
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)

    // Update positions in store when dragging ends
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        updateNodePosition(change.id, change.position)
      }

      // Update selected state
      if (change.type === 'select' && change.selected) {
        setSelectedNode(change.id)
      }
    })
  }, [onNodesChange, updateNodePosition, setSelectedNode])

  // Handle edge changes (read-only, but needed for reactflow)
  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
  }, [onEdgesChange])

  // Handle node click (select)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation()
    setSelectedNode(node.id)
  }, [setSelectedNode])

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Prevent connections (read-only)
  const onConnect = useCallback(() => {
    // Do nothing - connections are automatic
  }, [])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        snapToGrid
        snapGrid={[15, 15]}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        nodesDraggable={true}
        nodesConnectable={false} // Prevent manual connections
        edgesFocusable={false}
        edgesReconnectable={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3B82F6', strokeWidth: 2 }
        }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(node) => {
            if (node.id === selectedNodeId) return '#3B82F6'
            return '#ccc'
          }}
          nodeColor={(node) => {
            const nodeData = node.data as any
            if (!nodeData.enabled) return '#9CA3AF'
            
            switch (nodeData.category) {
              case 'preprocessing': return '#3B82F6'
              case 'analysis': return '#F59E0B'
              case 'auxiliary': return '#A855F7'
              case 'generation': return '#10B981'
              case 'output': return '#EF4444'
              default: return '#6B7280'
            }
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
        
        <Panel position="top-right" className="bg-white border border-gray-200 rounded-lg p-2 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-gray-700">💡 Dicas:</div>
            <div className="text-gray-600">• Clique em um node para editar</div>
            <div className="text-gray-600">• Arraste nodes para reposicionar</div>
            <div className="text-gray-600">• Use Ctrl+Scroll para zoom</div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
