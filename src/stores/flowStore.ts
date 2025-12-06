/**
 * Flow Editor Store - Zustand with Immer
 * 
 * Manages state for the interactive flow editor:
 * - Nodes (blocks)
 * - Edges (connections)
 * - Selected node
 * - Flow metadata
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { InteractiveFlow, FlowBlock, FlowEdge } from '@/types/interactiveFlows'

// ReactFlow Node type (compatible with @xyflow/react)
export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: any
}

// ReactFlow Edge type
export interface FlowNodeEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type?: string
  animated?: boolean
  style?: Record<string, any>
  markerEnd?: any
}

interface FlowState {
  // Flow metadata
  flowId: string | null
  flowName: string
  flowDescription: string
  isActive: boolean
  triggerType: 'keyword' | 'qr_code' | 'link' | 'manual' | 'always'
  triggerKeywords: string[]
  
  // Flow structure
  nodes: FlowNode[]
  edges: FlowNodeEdge[]
  startBlockId: string | null
  
  // UI state
  selectedNodeId: string | null
  isSaving: boolean
  lastSavedAt: Date | null
  hasUnsavedChanges: boolean
  
  // Actions
  loadFlow: (flowId: string) => Promise<void>
  saveFlow: () => Promise<void>
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowNodeEdge[]) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  updateNode: (nodeId: string, data: any) => void
  deleteNode: (nodeId: string) => void
  setSelectedNode: (nodeId: string | null) => void
  updateFlowMetadata: (metadata: Partial<Pick<FlowState, 'flowName' | 'flowDescription' | 'isActive' | 'triggerType' | 'triggerKeywords'>>) => void
  reset: () => void
}

const initialState = {
  flowId: null,
  flowName: 'Novo Flow',
  flowDescription: '',
  isActive: true,
  triggerType: 'keyword' as const,
  triggerKeywords: [],
  nodes: [],
  edges: [],
  startBlockId: null,
  selectedNodeId: null,
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false
}

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    ...initialState,

    loadFlow: async (flowId: string) => {
      try {
        const response = await fetch(`/api/flows/${flowId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load flow')
        }

        const { flow }: { flow: InteractiveFlow } = await response.json()

        set((state) => {
          state.flowId = flow.id
          state.flowName = flow.name
          state.flowDescription = flow.description || ''
          state.isActive = flow.isActive
          state.triggerType = flow.triggerType
          state.triggerKeywords = flow.triggerKeywords || []
          state.startBlockId = flow.startBlockId
          
          // Transform FlowBlock[] to FlowNode[]
          state.nodes = flow.blocks.map((block) => ({
            id: block.id,
            type: block.type,
            position: block.position,
            data: block.data
          }))
          
          // Transform FlowEdge[] to FlowNodeEdge[]
          state.edges = flow.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3B82F6', strokeWidth: 2 },
            markerEnd: {
              type: 'arrowclosed' as any,
              width: 20,
              height: 20,
              color: '#3B82F6'
            }
          }))
          
          state.hasUnsavedChanges = false
          state.lastSavedAt = new Date()
        })
      } catch (error: any) {
        console.error('Error loading flow:', error)
        throw error
      }
    },

    saveFlow: async () => {
      const state = get()
      
      if (!state.flowId || state.flowId === 'new') {
        // TODO: Create new flow
        console.warn('Create new flow not implemented yet')
        return
      }

      set({ isSaving: true })

      try {
        // Transform FlowNode[] back to FlowBlock[]
        const blocks: FlowBlock[] = state.nodes.map((node) => ({
          id: node.id,
          type: node.type as any,
          position: node.position,
          data: node.data
        }))

        // Transform FlowNodeEdge[] back to FlowEdge[]
        const edges: FlowEdge[] = state.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
          type: edge.type === 'smoothstep' ? 'default' : (edge.type as any)
        }))

        const response = await fetch(`/api/flows/${state.flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.flowName,
            description: state.flowDescription,
            isActive: state.isActive,
            triggerType: state.triggerType,
            triggerKeywords: state.triggerKeywords,
            blocks,
            edges,
            startBlockId: state.startBlockId || blocks.find(b => b.type === 'start')?.id
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save flow')
        }

        set((state) => {
          state.hasUnsavedChanges = false
          state.lastSavedAt = new Date()
        })

        console.log('✅ Flow saved successfully')
      } catch (error: any) {
        console.error('Error saving flow:', error)
        throw error
      } finally {
        set({ isSaving: false })
      }
    },

    setNodes: (nodes) => {
      set((state) => {
        state.nodes = nodes
        state.hasUnsavedChanges = true
      })
    },

    setEdges: (edges) => {
      set((state) => {
        state.edges = edges
        state.hasUnsavedChanges = true
      })
    },

    addNode: (type, position) => {
      const newNode: FlowNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        data: {
          label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
      }

      set((state) => {
        state.nodes.push(newNode)
        state.hasUnsavedChanges = true
        
        // If this is the first node and it's a start node, set as start block
        if (type === 'start' && !state.startBlockId) {
          state.startBlockId = newNode.id
        }
      })
    },

    updateNode: (nodeId, data) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId)
        if (node) {
          node.data = { ...node.data, ...data }
          state.hasUnsavedChanges = true
        }
      })
    },

    deleteNode: (nodeId) => {
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== nodeId)
        state.edges = state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
        
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
        }
        
        if (state.startBlockId === nodeId) {
          // Find another start block or reset
          const startNode = state.nodes.find(n => n.type === 'start')
          state.startBlockId = startNode?.id || null
        }
        
        state.hasUnsavedChanges = true
      })
    },

    setSelectedNode: (nodeId) => {
      set({ selectedNodeId: nodeId })
    },

    updateFlowMetadata: (metadata) => {
      set((state) => {
        Object.assign(state, metadata)
        state.hasUnsavedChanges = true
      })
    },

    reset: () => {
      set(initialState)
    }
  }))
)
