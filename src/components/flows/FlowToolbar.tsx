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

export default function FlowToolbar() {
  const router = useRouter()
  const { flowName, isSaving, hasUnsavedChanges, lastSavedAt, saveFlow } = useFlowStore()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveFlow()
    } catch (error) {
      console.error('Save failed:', error)
      alert('Erro ao salvar flow')
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

  return (
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
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Preview (em breve)"
        >
          <Play className="w-4 h-4" />
          Preview
        </button>
      </div>
    </div>
  )
}
