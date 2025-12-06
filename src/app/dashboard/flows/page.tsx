'use client'

/**
 * Flows List Page
 * 
 * /dashboard/flows
 * 
 * Displays all interactive flows for the client.
 * Allows creating, editing, and deleting flows.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase'
import type { InteractiveFlow } from '@/types/interactiveFlows'
import { Plus, Edit, Trash2, Copy, Play, Pause, Power, PowerOff } from 'lucide-react'

export default function FlowsListPage() {
  const [flows, setFlows] = useState<InteractiveFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientBrowser()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/flows')
      
      if (!response.ok) {
        throw new Error('Failed to load flows')
      }

      const data = await response.json()
      setFlows(data.flows || [])
    } catch (err: any) {
      console.error('Error loading flows:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadFlows()
  }, [loadFlows])

  const handleCreateFlow = () => {
    router.push('/dashboard/flows/new/edit')
  }

  const handleEditFlow = (flowId: string) => {
    router.push(`/dashboard/flows/${flowId}/edit`)
  }

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja deletar este flow?')) {
      return
    }

    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete flow')
      }

      // Reload flows
      await loadFlows()
    } catch (err: any) {
      console.error('Error deleting flow:', err)
      alert('Erro ao deletar flow: ' + err.message)
    }
  }

  const handleToggleActive = async (flowId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle flow status')
      }

      // Reload flows
      await loadFlows()
    } catch (err: any) {
      console.error('Error toggling flow status:', err)
      alert('Erro ao alterar status do flow: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Erro ao carregar flows</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flows Interativos</h1>
          <p className="text-gray-600 mt-1">
            Crie e gerencie fluxos de atendimento com mensagens interativas
          </p>
        </div>
        <button
          onClick={handleCreateFlow}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Criar Flow
        </button>
      </div>

      {/* Flows List */}
      {flows.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum flow criado
            </h3>
            <p className="text-gray-600 mb-4">
              Comece criando seu primeiro flow interativo para automatizar o atendimento.
            </p>
            <button
              onClick={handleCreateFlow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Primeiro Flow
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Flow Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {flow.name}
                  </h3>
                  {flow.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {flow.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleActive(flow.id, flow.isActive)}
                  className={`p-2 rounded-lg transition-colors ${
                    flow.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={flow.isActive ? 'Ativo' : 'Inativo'}
                >
                  {flow.isActive ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Flow Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Trigger:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {flow.triggerType}
                  </span>
                </div>
                {flow.triggerKeywords && flow.triggerKeywords.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Keywords:</span>
                    <span className="text-xs text-gray-700">
                      {flow.triggerKeywords.join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {flow.blocks.length} blocos • {flow.edges.length} conexões
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEditFlow(flow.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteFlow(flow.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
