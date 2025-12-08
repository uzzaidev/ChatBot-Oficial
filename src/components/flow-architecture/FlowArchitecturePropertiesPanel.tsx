'use client'

/**
 * Flow Architecture Properties Panel Component
 * 
 * Right panel for editing properties of the selected node.
 * Dynamically loads the appropriate property editor based on node type.
 * 
 * @created 2025-12-07
 */

import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AlertCircle, Settings, Lock } from 'lucide-react'

// Import property panels (we'll create these next)
import GenerateResponseProperties from './properties/GenerateResponseProperties'
import CheckContinuityProperties from './properties/CheckContinuityProperties'
import ClassifyIntentProperties from './properties/ClassifyIntentProperties'
import DetectRepetitionProperties from './properties/DetectRepetitionProperties'
import GetChatHistoryProperties from './properties/GetChatHistoryProperties'
import BatchMessagesProperties from './properties/BatchMessagesProperties'
import GetRagContextProperties from './properties/GetRagContextProperties'
import SearchDocumentProperties from './properties/SearchDocumentProperties'

export default function FlowArchitecturePropertiesPanel() {
  const {
    nodes,
    selectedNodeId,
    nodeConfigs,
    toggleNodeEnabled,
    saving
  } = useFlowArchitectureStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const nodeConfig = selectedNodeId ? nodeConfigs[selectedNodeId] : null

  if (!selectedNode) {
    return (
      <aside className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✏️</span>
          </div>
          <p className="text-gray-600 text-sm">
            Selecione um node para editar suas propriedades
          </p>
        </div>
      </aside>
    )
  }

  const nodeData = selectedNode.data

  return (
    <aside
      className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto"
      onKeyDown={(e) => {
        // Prevent ReactFlow from capturing keyboard events when editing
        e.stopPropagation()
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1">
          {nodeData.name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {nodeData.description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">
            {nodeData.category === 'preprocessing' && '🔧 Pré-processamento'}
            {nodeData.category === 'analysis' && '🔍 Análise'}
            {nodeData.category === 'generation' && '🤖 Geração'}
            {nodeData.category === 'output' && '📤 Saída'}
            {nodeData.category === 'auxiliary' && '⚙️ Auxiliar'}
          </Badge>
          {nodeData.configurable ? (
            <Badge variant="default">✅ Configurável</Badge>
          ) : (
            <Badge variant="secondary">🔒 Sempre Ativo</Badge>
          )}
          {nodeData.bypassable && (
            <Badge variant="outline">🔀 Pode ser Ignorado</Badge>
          )}
        </div>
      </div>

      {/* Warning for non-configurable nodes */}
      {!nodeData.configurable && (
        <Alert className="mb-4">
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Este node é essencial e não pode ser desabilitado. Ele sempre será executado no fluxo.
          </AlertDescription>
        </Alert>
      )}

      {/* Enable/Disable Toggle (only for configurable nodes) */}
      {nodeData.configurable && (
        <div className="mb-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled" className="text-base font-semibold">
                Status do Node
              </Label>
              <p className="text-sm text-gray-600">
                {nodeData.enabled
                  ? 'Node ativo no fluxo'
                  : 'Node desativado (não executa)'}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={nodeData.enabled}
              onCheckedChange={(checked) =>
                toggleNodeEnabled(selectedNode.id, checked)
              }
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Configuration Fields (if node has config and is enabled) */}
      {nodeData.hasConfig && nodeData.enabled && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Configurações</h4>
          </div>

          {/* Dynamically render the appropriate property panel */}
          {selectedNode.id === 'generate_response' && (
            <GenerateResponseProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'check_continuity' && (
            <CheckContinuityProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'classify_intent' && (
            <ClassifyIntentProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'detect_repetition' && (
            <DetectRepetitionProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'get_chat_history' && (
            <GetChatHistoryProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'batch_messages' && (
            <BatchMessagesProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'get_rag_context' && (
            <GetRagContextProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {selectedNode.id === 'search_document' && (
            <SearchDocumentProperties
              nodeId={selectedNode.id}
              config={nodeConfig || { enabled: true }}
            />
          )}

          {/* Fallback for nodes with config but no specific panel yet */}
          {!['generate_response', 'check_continuity', 'classify_intent', 'detect_repetition',
               'get_chat_history', 'batch_messages', 'get_rag_context', 'search_document'].includes(selectedNode.id) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Painel de configuração específico para este node será implementado em breve.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Info when node is disabled */}
      {nodeData.configurable && !nodeData.enabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Este node está desativado. Ative-o para poder editar suas configurações.
          </AlertDescription>
        </Alert>
      )}

      {/* Info when node has no config */}
      {!nodeData.hasConfig && nodeData.enabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Este node não possui configurações editáveis. Ele faz parte do pipeline
            padrão do chatbot.
          </AlertDescription>
        </Alert>
      )}
    </aside>
  )
}
