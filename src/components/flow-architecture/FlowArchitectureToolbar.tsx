'use client'

/**
 * Flow Architecture Toolbar Component
 * 
 * Top toolbar with controls and information.
 * 
 * @created 2025-12-07
 */

import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react'
import { useState } from 'react'

interface FlowArchitectureToolbarProps {
  onRefresh?: () => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
}

export default function FlowArchitectureToolbar({
  onRefresh,
  onToggleFullscreen,
  isFullscreen = false
}: FlowArchitectureToolbarProps) {
  const { nodes, notification, loading } = useFlowArchitectureStore()
  const [showLegend, setShowLegend] = useState(false)

  // Calculate active bypass routes
  const activeBypassRoutes = nodes.filter((node) => {
    const nodeData = node.data
    if (!nodeData.dependencies || !nodeData.optionalDependencies) return false
    
    // Check if any primary dependency is disabled
    return nodeData.dependencies.some((depId) => {
      const depNode = nodes.find((n) => n.id === depId)
      return depNode && !depNode.data.enabled
    })
  }).map((node) => {
    const nodeData = node.data
    const disabledDeps = nodeData.dependencies!.filter((depId) => {
      const depNode = nodes.find((n) => n.id === depId)
      return depNode && !depNode.data.enabled
    })
    const activeBypasses = nodeData.optionalDependencies!.filter((optDepId) => {
      const optDepNode = nodes.find((n) => n.id === optDepId)
      return optDepNode && optDepNode.data.enabled
    })

    return {
      node: nodeData.name,
      disabledDeps: disabledDeps.map((id) => nodes.find((n) => n.id === id)?.data.name || id),
      activeBypasses: activeBypasses.map((id) => nodes.find((n) => n.id === id)?.data.name || id),
    }
  })

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      {/* Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Arquitetura do Fluxo de Processamento
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Visualize e configure todos os nós do seu chatbot multiagente
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
            className="gap-2"
          >
            <Info className="w-4 h-4" />
            Legenda
          </Button>

          {onToggleFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className="gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Minimizar
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Tela Cheia
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-3">
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Legend (collapsible) */}
      {showLegend && (
        <div className="space-y-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Categorias de Nodes:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                Preprocessing
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                Analysis
              </Badge>
              <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                Auxiliary Agents
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Generation
              </Badge>
              <Badge className="bg-red-100 text-red-800 border-red-300">
                Output
              </Badge>
              <Badge className="bg-gray-100 text-gray-600 border-gray-300 border-dashed">
                Desabilitado
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Tipos de Conexão:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span className="text-gray-600">Conexão normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-300 border-t border-dashed" />
                <span className="text-gray-600">Conexão desabilitada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-orange-500 border-t-2 border-dashed border-orange-500" />
                <span className="text-orange-600 font-medium">Rota de Bypass Ativa</span>
              </div>
            </div>
          </div>

          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs">
              <strong>Rotas de Bypass:</strong> Quando um node é desabilitado, o fluxo automaticamente usa uma rota alternativa (bypass) para o próximo node ativo.
              As linhas pontilhadas laranjas mostram quais caminhos alternativos serão seguidos.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Active Bypass Routes Indicator */}
      {activeBypassRoutes.length > 0 && (
        <Alert className="bg-orange-100 border-orange-300">
          <AlertCircle className="h-4 w-4 text-orange-700" />
          <AlertDescription>
            <strong className="text-orange-900">Rotas de Bypass Ativas:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              {activeBypassRoutes.map((route, idx) => (
                <li key={idx} className="text-orange-800">
                  <strong>{route.node}</strong> está usando bypass de{' '}
                  <span className="line-through text-gray-500">{route.disabledDeps.join(', ')}</span>
                  {' → '}
                  <span className="font-semibold text-orange-600">{route.activeBypasses.join(', ')}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
