'use client'

/**
 * Flow Toolbar Component
 * 
 * Top toolbar with save, test, and flow status controls.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react'
import { useFlowStore } from '@/stores/flowStore'
import { useState } from 'react'
import FlowPreview from './FlowPreview'
import type { InteractiveFlow } from '@/types/interactiveFlows'
import { useToast } from '@/hooks/use-toast'

export default function FlowToolbar() {
  const router = useRouter()
  const { flowId, flowName, flowDescription, isActive, triggerType, triggerKeywords, nodes, edges, startBlockId, isSaving, hasUnsavedChanges, lastSavedAt, saveFlow } = useFlowStore()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveFlow()
      toast({
        title: "Flow salvo com sucesso",
        description: "Todas as alterações foram salvas.",
      })
    } catch (error: any) {
      console.error('Save failed:', error)
      toast({
        title: "Erro ao salvar flow",
        description: error.message || "Ocorreu um erro ao salvar o flow. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
        return
      }
    }
    router.push('/dashboard/flows')
  }

  const handlePreview = () => {
    // Validate flow has blocks
    if (nodes.length === 0) {
      alert('Adicione blocos ao flow antes de testar')
      return
    }

    // Validate has start block
    if (!startBlockId) {
      const startNode = nodes.find(n => n.type === 'start')
      if (!startNode) {
        alert('Adicione um bloco "Início" ao flow')
        return
      }
    }

    setShowPreview(true)
  }

  // Convert store state to InteractiveFlow format for preview
  const currentFlow: InteractiveFlow = {
    id: flowId || 'preview',
    clientId: 'preview',
    name: flowName,
    description: flowDescription,
    isActive,
    triggerType,
    triggerKeywords,
    blocks: nodes.map(node => ({
      id: node.id,
      type: node.type as any,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label
    })),
    startBlockId: startBlockId || nodes.find(n => n.type === 'start')?.id || nodes[0]?.id || '',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return (
    <>
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-sm text-gray-500">Editor de Flows</div>
            <div className="font-semibold text-gray-900">{flowName}</div>
          </div>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-2 text-sm">
          {isSaving || saving ? (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </div>
          ) : hasUnsavedChanges ? (
            <div className="text-amber-600">Alterações não salvas</div>
          ) : lastSavedAt ? (
            <div className="text-green-600">
              Salvo {new Date(lastSavedAt).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          ) : null}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving || saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Testar flow"
          >
            <Play className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <FlowPreview
        flow={currentFlow}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </>
  )
}
