'use client'

/**
 * Flow Editor Page
 * 
 * /dashboard/flows/[flowId]/edit
 * 
 * Main editor for creating and editing interactive flows.
 * Uses @xyflow/react for drag-and-drop canvas.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { createClientBrowser } from '@/lib/supabase'
import { useFlowStore } from '@/stores/flowStore'
import FlowCanvas from '@/components/flows/FlowCanvas'
import FlowToolbar from '@/components/flows/FlowToolbar'
import FlowSidebar from '@/components/flows/FlowSidebar'
import FlowPropertiesPanel from '@/components/flows/FlowPropertiesPanel'

interface FlowEditorPageProps {
  params: Promise<{ flowId: string }>
}

export default function FlowEditorPage(props: FlowEditorPageProps) {
  const params = use(props.params)
  const { flowId } = params
  const router = useRouter()
  const { loadFlow, reset } = useFlowStore()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientBrowser()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Load flow if not new
      if (flowId !== 'new') {
        try {
          await loadFlow(flowId)
        } catch (error) {
          console.error('Failed to load flow:', error)
          alert('Erro ao carregar flow. Redirecionando...')
          router.push('/dashboard/flows')
        }
      } else {
        // Reset store for new flow
        reset()
      }
    }

    checkAuth()
  }, [flowId, loadFlow, reset, router])

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Toolbar */}
        <FlowToolbar />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Block Palette */}
          <FlowSidebar />

          {/* Canvas - Main Editor */}
          <div className="flex-1 relative">
            <FlowCanvas />
          </div>

          {/* Properties Panel */}
          <FlowPropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
