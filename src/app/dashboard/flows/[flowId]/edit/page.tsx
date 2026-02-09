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

import FlowCanvas from '@/components/flows/FlowCanvas'
import FlowPropertiesPanel from '@/components/flows/FlowPropertiesPanel'
import FlowSidebar from '@/components/flows/FlowSidebar'
import FlowToolbar from '@/components/flows/FlowToolbar'
import { createClientBrowser } from '@/lib/supabase'
import { useFlowStore } from '@/stores/flowStore'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FlowEditorPageProps {
  params: Promise<{ flowId: string }>
}

export default function FlowEditorPage({ params }: FlowEditorPageProps) {
  const router = useRouter()
  const { loadFlow, reset } = useFlowStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientBrowser()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Await params (Next.js 15+ requirement)
      const { flowId } = await params

      // Validate flowId
      if (!flowId || flowId === 'undefined') {
        console.error('Invalid flowId:', flowId)
        router.push('/dashboard/flows')
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
          return
        }
      } else {
        // Reset store for new flow
        reset()
      }

      setIsReady(true)
    }

    checkAuth()
  }, [params, loadFlow, reset, router])

  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

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
