'use client'

/**
 * Flow Canvas Component
 * 
 * Main ReactFlow canvas for the flow editor.
 * Handles node/edge rendering, connections, and interactions.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  OnConnect,
  OnNodesChange,
  OnEdgesChange
} from '@xyflow/react'
import { useFlowStore } from '@/stores/flowStore'
import type { FlowNode, FlowNodeEdge } from '@/stores/flowStore'

// Import custom node components (we'll create these next)
import StartBlock from './blocks/StartBlock'
import MessageBlock from './blocks/MessageBlock'
import InteractiveListBlock from './blocks/InteractiveListBlock'
import InteractiveButtonsBlock from './blocks/InteractiveButtonsBlock'
import ConditionBlock from './blocks/ConditionBlock'
import ActionBlock from './blocks/ActionBlock'
import AIHandoffBlock from './blocks/AIHandoffBlock'
import HumanHandoffBlock from './blocks/HumanHandoffBlock'
import EndBlock from './blocks/EndBlock'

// Map node types to components
const nodeTypes = {
  start: StartBlock,
  message: MessageBlock,
  interactive_list: InteractiveListBlock,
  interactive_buttons: InteractiveButtonsBlock,
  condition: ConditionBlock,
  action: ActionBlock,
  ai_handoff: AIHandoffBlock,
  human_handoff: HumanHandoffBlock,
  end: EndBlock
}

export default function FlowCanvas() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNodeId,
    setSelectedNode,
    addNode
  } = useFlowStore()

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState([])
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState([])

  // Sync store with local state
  useEffect(() => {
    setLocalNodes(nodes as Node[])
  }, [nodes, setLocalNodes])

  useEffect(() => {
    setLocalEdges(edges as Edge[])
  }, [edges, setLocalEdges])

  // Handle node changes (drag, delete, etc)
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    
    // Check if there are actual changes that should be saved
    const shouldUpdateStore = changes.some(change => 
      change.type === 'position' || 
      change.type === 'remove' || 
      change.type === 'add'
    )
    
    // Update store only for meaningful changes
    if (shouldUpdateStore) {
      setTimeout(() => {
        setNodes(localNodes as FlowNode[])
      }, 0)
    }
  }, [onNodesChange, setNodes, localNodes])

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    
    // Check if there are actual changes that should be saved
    const shouldUpdateStore = changes.some(change => 
      change.type === 'remove' || 
      change.type === 'add'
    )
    
    // Update store only for meaningful changes
    if (shouldUpdateStore) {
      setTimeout(() => {
        setEdges(localEdges as FlowNodeEdge[])
      }, 0)
    }
  }, [onEdgesChange, setEdges, localEdges])

  // Handle new connections
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    // Constants for ID truncation to keep edge IDs manageable
    const NODE_ID_LENGTH = 8
    const HANDLE_ID_LENGTH = 12
    
    // Generate shorter edge ID to avoid extremely long IDs
    const handleSuffix = connection.sourceHandle 
      ? `-${connection.sourceHandle.slice(0, HANDLE_ID_LENGTH)}` 
      : ''
    const edge: Edge = {
      ...connection,
      id: `e-${connection.source?.slice(-NODE_ID_LENGTH)}${handleSuffix}-${connection.target?.slice(-NODE_ID_LENGTH)}`,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#3B82F6'
      },
      style: { stroke: '#3B82F6', strokeWidth: 2 }
    }

    const newEdges = addEdge(edge, localEdges)
    setLocalEdges(newEdges)
    setEdges(newEdges as FlowNodeEdge[])
  }, [localEdges, setLocalEdges, setEdges])

  // Handle node click (select)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation()
    setSelectedNode(node.id)
  }, [setSelectedNode])

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Handle drop from sidebar
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return

    const position = {
      x: event.clientX - 250, // Adjust for sidebar width
      y: event.clientY - 64   // Adjust for toolbar height
    }

    addNode(type, position)
  }, [addNode])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="w-full h-full" onDrop={onDrop} onDragOver={onDragOver}>
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
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3B82F6', strokeWidth: 2 }
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(node) => {
            if (node.id === selectedNodeId) return '#3B82F6'
            return '#ccc'
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#10B981'
              case 'end': return '#EF4444'
              case 'interactive_list': return '#8B5CF6'
              case 'interactive_buttons': return '#6366F1'
              case 'condition': return '#F59E0B'
              case 'ai_handoff': return '#06B6D4'
              case 'human_handoff': return '#EC4899'
              default: return '#6B7280'
            }
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  )
}
