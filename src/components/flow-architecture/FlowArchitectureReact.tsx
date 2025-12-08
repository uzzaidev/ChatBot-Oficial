'use client'

/**
 * Flow Architecture React Component
 * 
 * Main container for the ReactFlow-based flow architecture visualization.
 * Replaces the Mermaid-based FlowArchitectureManager.
 * 
 * Features:
 * - ReactFlow canvas for interactive visualization
 * - Click nodes to edit properties
 * - Toggle nodes on/off (if configurable)
 * - Edit prompts, variables, and settings
 * - Automatic bypass routes when nodes are disabled
 * - Read-only structure (no adding/deleting nodes)
 * 
 * @created 2025-12-07
 */

import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import FlowArchitectureToolbar from './FlowArchitectureToolbar'
import FlowArchitectureCanvas from './FlowArchitectureCanvas'
import FlowArchitecturePropertiesPanel from './FlowArchitecturePropertiesPanel'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw } from 'lucide-react'

interface FlowArchitectureReactProps {
  className?: string
}

export default function FlowArchitectureReact({ className = '' }: FlowArchitectureReactProps) {
  const {
    loadNodesFromMetadata,
    loadNodeConfigurations,
    recalculateEdges,
    loading,
    nodes
  } = useFlowArchitectureStore()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setInitializing(true)
        
        // Step 1: Load nodes from metadata (with positions from localStorage if available)
        loadNodesFromMetadata()
        
        // Step 2: Load configurations from backend
        await loadNodeConfigurations()
        
      } catch (error) {
        console.error('Failed to initialize flow architecture:', error)
      } finally {
        setInitializing(false)
      }
    }

    initialize()
  }, [loadNodesFromMetadata, loadNodeConfigurations])

  const handleRefresh = async () => {
    // Reload configurations from backend
    await loadNodeConfigurations()
    // Recalculate edges based on new enabled states
    recalculateEdges()
  }

  const containerClassName = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'w-full h-full'

  if (initializing) {
    return (
      <div className={containerClassName}>
        <div className="p-6">
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Carregando arquitetura do fluxo...
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className={containerClassName}>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Nenhum node encontrado. Verifique se FLOW_METADATA está definido corretamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className={`flex flex-col ${containerClassName}`}>
        {/* Toolbar */}
        <FlowArchitectureToolbar
          onRefresh={handleRefresh}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isFullscreen={isFullscreen}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 relative bg-gray-50">
            <FlowArchitectureCanvas />
          </div>

          {/* Properties Panel */}
          <FlowArchitecturePropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
