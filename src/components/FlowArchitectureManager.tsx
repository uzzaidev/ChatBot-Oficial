'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, RefreshCw, AlertCircle, CheckCircle, Maximize2, Settings, Sliders } from 'lucide-react'
import mermaid from 'mermaid'

// Define node types based on CHATBOT_FLOW_ARCHITECTURE.md
interface FlowNode {
  id: string
  name: string
  description: string
  category: 'preprocessing' | 'analysis' | 'generation' | 'output' | 'auxiliary'
  configKey?: string // Key in bot_configurations table
  enabled: boolean
  hasConfig: boolean // Whether this node has editable configuration
  dependencies?: string[] // Node IDs that this node depends on
  optionalDependencies?: string[] // Alternative paths if primary dependency is disabled
}

interface NodeConfig {
  enabled: boolean
  prompt?: string
  temperature?: number
  threshold?: number
  use_llm?: boolean
  intents?: string[]
  [key: string]: any
}

// Flow nodes representing the complete chatbot architecture
const FLOW_NODES: FlowNode[] = [
  // Preprocessing Nodes (1-8)
  {
    id: 'filter_status',
    name: 'Filter Status Updates',
    description: 'Filtra status updates do WhatsApp',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
  },
  {
    id: 'parse_message',
    name: 'Parse Message',
    description: 'Extrai informações da mensagem',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    dependencies: ['filter_status'],
  },
  {
    id: 'check_customer',
    name: 'Check/Create Customer',
    description: 'Verifica ou cria cliente no banco',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    dependencies: ['parse_message'],
  },
  {
    id: 'process_media',
    name: 'Process Media',
    description: 'Processa áudio/imagem/documento',
    category: 'preprocessing',
    enabled: true,
    hasConfig: true,
    configKey: 'media_processing:config',
    dependencies: ['check_customer'],
  },
  {
    id: 'normalize_message',
    name: 'Normalize Message',
    description: 'Normaliza conteúdo da mensagem',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    dependencies: ['process_media'],
  },
  {
    id: 'push_to_redis',
    name: 'Push to Redis',
    description: 'Envia mensagem para fila Redis',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    dependencies: ['normalize_message'],
  },
  {
    id: 'save_user_message',
    name: 'Save User Message',
    description: 'Salva mensagem do usuário no histórico',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    dependencies: ['push_to_redis'],
  },
  {
    id: 'batch_messages',
    name: 'Batch Messages',
    description: 'Agrupa mensagens sequenciais',
    category: 'preprocessing',
    enabled: true,
    hasConfig: true,
    configKey: 'batching:delay_seconds',
    dependencies: ['save_user_message'],
  },
  
  // Analysis Nodes (9-10)
  {
    id: 'get_chat_history',
    name: 'Get Chat History',
    description: 'Busca histórico de conversas',
    category: 'analysis',
    enabled: true,
    hasConfig: true,
    configKey: 'chat_history:max_messages',
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },
  {
    id: 'get_rag_context',
    name: 'Get RAG Context',
    description: 'Busca contexto relevante (vector search)',
    category: 'analysis',
    enabled: true,
    hasConfig: true,
    configKey: 'rag:enabled',
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },

  // Auxiliary Agents (9.5, 9.6)
  {
    id: 'check_continuity',
    name: 'Check Continuity',
    description: 'Detecta nova conversa vs continuação',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configKey: 'continuity:new_conversation_threshold_hours',
    dependencies: ['get_chat_history'],
    optionalDependencies: ['batch_messages', 'save_user_message'], // Bypass if history is disabled
  },
  {
    id: 'classify_intent',
    name: 'Classify Intent',
    description: 'Classifica intenção do usuário',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configKey: 'intent_classifier:use_llm',
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },
  
  // Generation Node (11)
  {
    id: 'generate_response',
    name: 'Generate AI Response',
    description: 'Gera resposta com LLM (Groq/OpenAI)',
    category: 'generation',
    enabled: true,
    hasConfig: true,
    configKey: 'personality:config',
    dependencies: ['check_continuity', 'classify_intent', 'get_rag_context'],
    optionalDependencies: ['batch_messages', 'save_user_message'], // Ultimate bypass if all analysis disabled
  },

  // Post-Processing Nodes (11.5, 11.6)
  {
    id: 'detect_repetition',
    name: 'Detect Repetition',
    description: 'Detecta respostas repetitivas',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configKey: 'repetition_detector:similarity_threshold',
    dependencies: ['generate_response'],
  },
  {
    id: 'save_ai_message',
    name: 'Save AI Message',
    description: 'Salva resposta da IA no histórico',
    category: 'auxiliary',
    enabled: true,
    hasConfig: false,
    dependencies: ['detect_repetition'],
    optionalDependencies: ['generate_response'], // Bypass if repetition disabled
  },

  // Output Nodes (12-14)
  {
    id: 'format_response',
    name: 'Format Response',
    description: 'Formata resposta para WhatsApp',
    category: 'output',
    enabled: true,
    hasConfig: false,
    dependencies: ['save_ai_message'],
    optionalDependencies: ['generate_response'], // Bypass if save disabled
  },
  {
    id: 'send_whatsapp',
    name: 'Send WhatsApp Message',
    description: 'Envia mensagem via Meta API',
    category: 'output',
    enabled: true,
    hasConfig: false,
    dependencies: ['format_response'],
  },
]

export default function FlowArchitectureManager() {
  const [nodes, setNodes] = useState<FlowNode[]>(FLOW_NODES)
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [nodeConfig, setNodeConfig] = useState<NodeConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const mermaidRef = useRef<HTMLDivElement>(null)

  // Calculate active bypass routes
  const activeBypassRoutes = nodes.filter((node) => {
    if (!node.dependencies || !node.optionalDependencies) return false
    // Check if any primary dependency is disabled
    return node.dependencies.some((depId) => {
      const depNode = nodes.find((n) => n.id === depId)
      return depNode && !depNode.enabled
    })
  }).map((node) => {
    const disabledDeps = node.dependencies!.filter((depId) => {
      const depNode = nodes.find((n) => n.id === depId)
      return depNode && !depNode.enabled
    })
    const activeBypasses = node.optionalDependencies!.filter((optDepId) => {
      const optDepNode = nodes.find((n) => n.id === optDepId)
      return optDepNode && optDepNode.enabled
    })

    return {
      node: node.name,
      disabledDeps: disabledDeps.map((id) => nodes.find((n) => n.id === id)?.name || id),
      activeBypasses: activeBypasses.map((id) => nodes.find((n) => n.id === id)?.name || id),
    }
  })

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    })
  }, [])

  // Load node enabled states from database on mount
  useEffect(() => {
    const loadNodeStates = async () => {
      try {
        // Fetch enabled state for all nodes
        const promises = FLOW_NODES.map(async (node) => {
          try {
            const response = await fetch(`/api/flow/nodes/${node.id}`)
            if (response.ok) {
              const data = await response.json()
              return {
                nodeId: node.id,
                enabled: data.config?.enabled !== false,
              }
            }
          } catch (error) {
            console.error(`Error fetching state for ${node.id}:`, error)
          }
          return { nodeId: node.id, enabled: true }
        })

        const results = await Promise.all(promises)
        
        // Update nodes with fetched states
        setNodes((prev) =>
          prev.map((node) => {
            const result = results.find((r) => r.nodeId === node.id)
            return result ? { ...node, enabled: result.enabled } : node
          })
        )
      } catch (error) {
        console.error('Error loading node states:', error)
      }
    }

    loadNodeStates()
  }, [])

  // Fetch node configurations from backend
  const fetchNodeConfig = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || !node.hasConfig || !node.configKey) return

    setLoading(true)
    try {
      const response = await fetch(`/api/flow/nodes/${nodeId}`)
      if (response.ok) {
        const data = await response.json()
        setNodeConfig(data.config || { enabled: node.enabled })
      } else {
        setNodeConfig({ enabled: node.enabled })
      }
    } catch (error) {
      console.error('Error fetching node config:', error)
      setNodeConfig({ enabled: node.enabled })
    } finally {
      setLoading(false)
    }
  }, [nodes])

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      setSelectedNode(node)
      if (node.hasConfig) {
        fetchNodeConfig(nodeId)
      } else {
        setNodeConfig({ enabled: node.enabled })
      }
    }
  }, [nodes, fetchNodeConfig])

  // Generate Mermaid diagram
  const generateMermaidDiagram = useCallback(() => {
    // Show ALL nodes, not just enabled ones
    let diagram = 'graph TD\n'
    diagram += '  classDef preprocessing fill:#dbeafe,stroke:#3b82f6,stroke-width:2px\n'
    diagram += '  classDef analysis fill:#fef3c7,stroke:#f59e0b,stroke-width:2px\n'
    diagram += '  classDef generation fill:#d1fae5,stroke:#10b981,stroke-width:2px\n'
    diagram += '  classDef output fill:#fecaca,stroke:#ef4444,stroke-width:2px\n'
    diagram += '  classDef auxiliary fill:#e9d5ff,stroke:#a855f7,stroke-width:2px\n'
    diagram += '  classDef disabled fill:#f3f4f6,stroke:#9ca3af,stroke-width:2px,stroke-dasharray: 5 5\n'
    diagram += '  linkStyle default stroke:#cbd5e1,stroke-width:2px\n\n'

    // Add ALL nodes (enabled and disabled)
    nodes.forEach((node) => {
      const nodeLabel = node.hasConfig
        ? `${node.name}<br/>[Config]`
        : node.name
      diagram += `  ${node.id}["${nodeLabel}"]\n`
      // Apply disabled class if node is disabled, otherwise use category class
      diagram += `  class ${node.id} ${node.enabled ? node.category : 'disabled'}\n`
    })

    diagram += '\n'

    // Add ALL edges (connections), including bypass routes
    let linkIndex = 0
    nodes.forEach((node) => {
      if (node.dependencies) {
        node.dependencies.forEach((depId) => {
          const depNode = nodes.find((n) => n.id === depId)
          if (depNode) {
            // Check if we should use the bypass route instead
            const useBypass = !depNode.enabled && node.optionalDependencies

            if (useBypass) {
              // Don't draw this connection, will draw bypass instead
              return
            }

            diagram += `  ${depId} --> ${node.id}\n`
            // If either node in the connection is disabled, style the link as dashed/gray
            if (!node.enabled || !depNode.enabled) {
              diagram += `  linkStyle ${linkIndex} stroke:#d1d5db,stroke-width:2px,stroke-dasharray:5\n`
            }
            linkIndex++
          }
        })
      }

      // Add bypass/optional dependencies if primary dependency is disabled
      if (node.optionalDependencies && node.dependencies) {
        node.dependencies.forEach((depId) => {
          const depNode = nodes.find((n) => n.id === depId)
          // If primary dependency is disabled, show bypass routes
          if (depNode && !depNode.enabled) {
            // CASCADE LOGIC: Find first active bypass (waterfall)
            let foundActiveBypass = false

            for (const optDepId of node.optionalDependencies) {
              const optDepNode = nodes.find((n) => n.id === optDepId)

              if (!optDepNode) continue

              // If we haven't found an active bypass yet
              if (!foundActiveBypass) {
                diagram += `  ${optDepId} -.-> ${node.id}\n` // Dotted line for bypass

                if (optDepNode.enabled) {
                  // ACTIVE bypass route: thick orange
                  diagram += `  linkStyle ${linkIndex} stroke:#f97316,stroke-width:3px,stroke-dasharray:3\n`
                  foundActiveBypass = true // Stop here - only show first active bypass
                } else {
                  // INACTIVE bypass route (target disabled): gray dashed
                  diagram += `  linkStyle ${linkIndex} stroke:#d1d5db,stroke-width:2px,stroke-dasharray:5\n`
                  // Continue to next optionalDependency (cascade to next)
                }
                linkIndex++
              }

              // If active bypass found, stop (don't draw additional bypasses)
              if (foundActiveBypass) break
            }
          }
        })
      }
    })

    return diagram
  }, [nodes])

  // Render Mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!mermaidRef.current) return

    const diagram = generateMermaidDiagram()

    try {
      // Clear previous content completely (remove all child nodes)
      while (mermaidRef.current.firstChild) {
        mermaidRef.current.removeChild(mermaidRef.current.firstChild)
      }

      // Force a small delay to ensure DOM is cleared
      await new Promise(resolve => setTimeout(resolve, 10))

      // Create a unique ID for this render
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Render the diagram
      const { svg } = await mermaid.render(id, diagram)
      mermaidRef.current.innerHTML = svg
      
      // Add click handlers after render
      const svgElement = mermaidRef.current.querySelector('svg')
      if (svgElement) {
        // Find all node elements - Mermaid uses different classes for nodes
        const nodeElements = svgElement.querySelectorAll('.node, [class*="flowchart-"]')
        
        nodeElements.forEach((nodeEl) => {
          const htmlElement = nodeEl as HTMLElement
          
          // Try to extract node ID from various possible formats
          let nodeId = ''
          
          // Method 1: Check if the element has a data attribute or ID
          if (htmlElement.id) {
            // Mermaid might use format like "flowchart-filter_status-123"
            const match = htmlElement.id.match(/flowchart-([a-z_]+)-\d+/)
            if (match) {
              nodeId = match[1]
            }
          }
          
          // Method 2: Check parent g element
          if (!nodeId && htmlElement.closest('.nodes')) {
            const parentG = htmlElement.closest('g')
            if (parentG?.id) {
              const match = parentG.id.match(/flowchart-([a-z_]+)-\d+/)
              if (match) {
                nodeId = match[1]
              }
            }
          }
          
          // Method 3: Try to find from the label text
          if (!nodeId) {
            const labelEl = htmlElement.querySelector('.label, text')
            if (labelEl) {
              const labelText = labelEl.textContent || ''
              // Try to match with our known nodes
              const matchingNode = nodes.find((n) => 
                labelText.includes(n.name)
              )
              if (matchingNode) {
                nodeId = matchingNode.id
              }
            }
          }
          
          if (nodeId && nodes.find((n) => n.id === nodeId)) {
            htmlElement.style.cursor = 'pointer'
            htmlElement.addEventListener('click', (e) => {
              e.stopPropagation()
              handleNodeClick(nodeId)
            })
            
            // Add hover effect
            htmlElement.addEventListener('mouseenter', () => {
              htmlElement.style.opacity = '0.8'
            })
            htmlElement.addEventListener('mouseleave', () => {
              htmlElement.style.opacity = '1'
            })
          }
        })
      }
    } catch (error) {
      console.error('Error rendering Mermaid diagram:', error)
    }
  }, [generateMermaidDiagram, handleNodeClick, nodes])

  // Render diagram on mount and when nodes change
  useEffect(() => {
    renderDiagram()
  }, [renderDiagram])

  // Toggle node enabled/disabled
  const toggleNodeEnabled = async (nodeId: string, enabled: boolean) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/flow/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      
      if (response.ok) {
        // Update nodes list
        setNodes((prev) =>
          prev.map((node) =>
            node.id === nodeId ? { ...node, enabled } : node
          )
        )
        
        // Update selected node immediately for UI feedback
        setSelectedNode((prev) =>
          prev && prev.id === nodeId ? { ...prev, enabled } : prev
        )
        
        setNotification({
          type: 'success',
          message: `Node ${enabled ? 'ativado' : 'desativado'} com sucesso!`,
        })
        setTimeout(() => setNotification(null), 3000)
      } else {
        throw new Error('Failed to update node')
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Erro ao atualizar node',
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Save node configuration
  const saveNodeConfig = async () => {
    if (!selectedNode || !nodeConfig) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/flow/nodes/${selectedNode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nodeConfig }),
      })
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Configuração salva com sucesso!',
        })
        setTimeout(() => {
          setNotification(null)
          setSelectedNode(null)
          setNodeConfig(null)
        }, 2000)
      } else {
        throw new Error('Failed to save config')
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Erro ao salvar configuração',
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5" />
              Arquitetura do Fluxo de Processamento
            </CardTitle>
            <CardDescription>
              Visualize e configure todos os nós (nodes) do seu chatbot multiagente.
              Clique em um nó para editar suas configurações.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => renderDiagram()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              {isFullscreen ? 'Minimizar' : 'Tela Cheia'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification */}
        {notification && (
          <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Legend */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Categorias de Nodes:</p>
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
            <p className="text-xs font-semibold text-muted-foreground mb-2">Tipos de Conexão:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-400" />
                <span className="text-muted-foreground">Conexão normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-300 border-t border-dashed" />
                <span className="text-muted-foreground">Conexão desabilitada</span>
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

        {/* Mermaid Diagram */}
        <ScrollArea className={isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[600px]'}>
          <div
            ref={mermaidRef}
            className="mermaid flex items-center justify-center p-4 bg-white rounded-lg border"
          />
        </ScrollArea>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-start gap-2">
            <div>
              <strong>Como usar:</strong> Clique em qualquer nó do fluxograma para ver/editar suas configurações.
              Nós com <Settings className="h-3 w-3 inline" /> [Config] possuem configurações editáveis (prompts, temperatura, thresholds, etc).
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* Node Configuration Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNode?.name}</DialogTitle>
            <DialogDescription>{selectedNode?.description}</DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-4 py-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enabled" className="text-base font-semibold">
                    Status do Node
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedNode.enabled
                      ? 'Node ativo no fluxo de processamento'
                      : 'Node desativado (não será executado)'}
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={selectedNode.enabled}
                  onCheckedChange={(checked) =>
                    toggleNodeEnabled(selectedNode.id, checked)
                  }
                  disabled={saving}
                />
              </div>

              {/* Configuration Fields (if node has config) */}
              {selectedNode.hasConfig && nodeConfig && selectedNode.enabled && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Configurações</h3>

                  {/* Dynamic fields - render all config properties */}
                  {(() => {
                    // Get field order (custom for each node type)
                    const getFieldOrder = (nodeId: string, keys: string[]): string[] => {
                      const orderMap: Record<string, string[]> = {
                        generate_response: [
                          'primary_model_provider',
                          'model', // Synthetic field (not in original config)
                          'temperature',
                          'max_tokens',
                          'system_prompt',
                          'formatter_prompt',
                        ],
                        check_continuity: [
                          'new_conversation_threshold_hours',
                          'greeting_for_new_customer',
                          'greeting_for_returning_customer',
                        ],
                        classify_intent: [
                          'use_llm',
                          'temperature',
                          'prompt',
                          'intents',
                        ],
                        detect_repetition: [
                          'similarity_threshold',
                          'check_last_n_responses',
                          'use_embeddings',
                        ],
                        get_chat_history: [
                          'max_messages',
                        ],
                        batch_messages: [
                          'delay_seconds',
                        ],
                        get_rag_context: [
                          'enabled',
                          'similarity_threshold',
                          'max_results',
                        ],
                      }

                      const order = orderMap[nodeId]
                      if (!order) return keys

                      // For generate_response, filter out groq_model and openai_model
                      if (nodeId === 'generate_response') {
                        const remaining = keys.filter(k => !order.includes(k) && k !== 'groq_model' && k !== 'openai_model')
                        return [...order.filter(k => k === 'model' || keys.includes(k)), ...remaining]
                      }

                      // For other nodes, filter order to only include existing keys, then add remaining
                      const existing = order.filter(k => keys.includes(k))
                      const remaining = keys.filter(k => !order.includes(k))
                      return [...existing, ...remaining]
                    }

                    // Get friendly field label in Portuguese
                    const getFieldLabel = (key: string, nodeId: string): string => {
                      const labelMap: Record<string, string> = {
                        // Check Continuity
                        'new_conversation_threshold_hours': 'Threshold de Nova Conversa (Horas)',
                        'greeting_for_new_customer': 'Saudação - Novo Cliente',
                        'greeting_for_returning_customer': 'Saudação - Cliente Retornando',

                        // Classify Intent
                        'use_llm': 'Usar LLM para Classificação',
                        'intents': 'Intenções Suportadas (JSON)',

                        // Detect Repetition
                        'similarity_threshold': 'Threshold de Similaridade',
                        'check_last_n_responses': 'Verificar Últimas N Respostas',
                        'use_embeddings': 'Usar Embeddings (OpenAI)',

                        // Chat History
                        'max_messages': 'Máximo de Mensagens no Histórico',

                        // Batch Messages
                        'delay_seconds': 'Delay de Batching (Segundos)',

                        // RAG Context
                        'enabled': 'Habilitado',
                        'max_results': 'Máximo de Resultados',

                        // Common fields
                        'temperature': 'Temperature (Criatividade)',
                        'max_tokens': 'Máximo de Tokens',
                        'system_prompt': 'System Prompt',
                        'formatter_prompt': 'Formatter Prompt',
                        'prompt': 'Prompt do Classificador',
                      }

                      return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    }

                    const allKeys = Object.keys(nodeConfig).filter(key => key !== 'enabled')
                    const orderedKeys = getFieldOrder(selectedNode?.id || '', allKeys)

                    return orderedKeys.map((key) => {
                      // Handle synthetic "model" field for generate_response
                      if (key === 'model' && selectedNode?.id === 'generate_response') {
                        const provider = nodeConfig.primary_model_provider || 'groq'
                        const currentModel = provider === 'openai'
                          ? nodeConfig.openai_model || 'gpt-4o'
                          : nodeConfig.groq_model || 'llama-3.3-70b-versatile'

                        const groqModels = [
                          'llama-3.3-70b-versatile',
                          'llama-3.1-70b-versatile',
                          'llama-3.1-8b-instant',
                          'mixtral-8x7b-32768',
                        ]
                        const openaiModels = [
                          'gpt-4o',
                          'gpt-4o-mini',
                          'gpt-4-turbo',
                          'gpt-3.5-turbo',
                        ]
                        const models = provider === 'openai' ? openaiModels : groqModels

                        return (
                          <div key="model" className="space-y-2">
                            <Label htmlFor="model" className="capitalize">
                              Model ({provider === 'openai' ? 'OpenAI' : 'Groq'})
                            </Label>
                            <Select
                              value={currentModel}
                              onValueChange={(newValue) => {
                                // Update the correct model field based on provider
                                if (provider === 'openai') {
                                  setNodeConfig({ ...nodeConfig, openai_model: newValue })
                                } else {
                                  setNodeConfig({ ...nodeConfig, groq_model: newValue })
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {models.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Modelos disponíveis para {provider === 'openai' ? 'OpenAI' : 'Groq'}
                            </p>
                          </div>
                        )
                      }

                      // Skip groq_model and openai_model (handled by synthetic "model" field)
                      if (key === 'groq_model' || key === 'openai_model') {
                        return null
                      }

                      const value = nodeConfig[key]

                    // Handle different types of values
                    if (typeof value === 'string' && value.length > 100) {
                      // Large text - use textarea (like prompts)
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {getFieldLabel(key, selectedNode?.id || '')}
                          </Label>
                          <Textarea
                            id={key}
                            value={value}
                            onChange={(e) =>
                              setNodeConfig({ ...nodeConfig, [key]: e.target.value })
                            }
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </div>
                      )
                    } else if (typeof value === 'boolean') {
                      // Boolean - use switch
                      return (
                        <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label htmlFor={key} className="text-base">
                              {getFieldLabel(key, selectedNode?.id || '')}
                            </Label>
                          </div>
                          <Switch
                            id={key}
                            checked={value}
                            onCheckedChange={(checked) =>
                              setNodeConfig({ ...nodeConfig, [key]: checked })
                            }
                          />
                        </div>
                      )
                    } else if (typeof value === 'number') {
                      // Number - use input with appropriate ranges
                      const isTemperature = key.toLowerCase().includes('temperature')
                      const isThreshold = key.toLowerCase().includes('threshold') || 
                                         key.toLowerCase().includes('similarity')

                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {getFieldLabel(key, selectedNode?.id || '')}
                          </Label>
                          <Input
                            id={key}
                            type="number"
                            min={isTemperature ? 0 : isThreshold ? 0 : undefined}
                            max={isTemperature ? 2 : isThreshold ? 1 : undefined}
                            step={isTemperature || isThreshold ? 0.1 : 1}
                            value={value}
                            onChange={(e) =>
                              setNodeConfig({
                                ...nodeConfig,
                                [key]: parseFloat(e.target.value),
                              })
                            }
                          />
                          {isTemperature && (
                            <p className="text-xs text-muted-foreground">
                              0.0 = determinístico, 2.0 = muito criativo
                            </p>
                          )}
                          {isThreshold && (
                            <p className="text-xs text-muted-foreground">
                              0.0 = mínimo, 1.0 = máximo
                            </p>
                          )}
                        </div>
                      )
                    } else if (typeof value === 'string') {
                      // Check if this should be a select dropdown
                      const isModelProvider = key.toLowerCase().includes('provider')
                      const isModel = key.toLowerCase().includes('model') && !key.toLowerCase().includes('provider')
                      
                      if (isModelProvider) {
                        // Model provider selection (groq, openai)
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key} className="capitalize">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <Select
                              value={value}
                              onValueChange={(newValue) => {
                                const newConfig = { ...nodeConfig, [key]: newValue }

                                // Smart model switching: if changing provider, set default model for that provider
                                if (selectedNode?.id === 'generate_response') {
                                  if (newValue === 'openai' && !nodeConfig.openai_model) {
                                    newConfig.openai_model = 'gpt-4o'
                                  } else if (newValue === 'groq' && !nodeConfig.groq_model) {
                                    newConfig.groq_model = 'llama-3.3-70b-versatile'
                                  }
                                }

                                setNodeConfig(newConfig)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="groq">Groq (Fast & Free)</SelectItem>
                                <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {value === 'groq'
                                ? 'Modelos rápidos e gratuitos da Groq'
                                : 'Modelos premium da OpenAI (GPT-4, GPT-4o)'}
                            </p>
                          </div>
                        )
                      } else if (isModel) {
                        // Model selection - show appropriate models based on provider
                        const provider = nodeConfig.primary_model_provider || nodeConfig.provider || 'groq'
                        const groqModels = [
                          'llama-3.3-70b-versatile',
                          'llama-3.1-70b-versatile',
                          'llama-3.1-8b-instant',
                          'mixtral-8x7b-32768',
                        ]
                        const openaiModels = [
                          'gpt-4o',
                          'gpt-4o-mini',
                          'gpt-4-turbo',
                          'gpt-3.5-turbo',
                        ]
                        const models = provider === 'openai' ? openaiModels : groqModels
                        
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key} className="capitalize">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <Select
                              value={value}
                              onValueChange={(newValue) =>
                                setNodeConfig({ ...nodeConfig, [key]: newValue })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {models.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      }
                      
                      // Short string - use regular input
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {getFieldLabel(key, selectedNode?.id || '')}
                          </Label>
                          <Input
                            id={key}
                            value={value}
                            onChange={(e) =>
                              setNodeConfig({ ...nodeConfig, [key]: e.target.value })
                            }
                          />
                        </div>
                      )
                    } else if (Array.isArray(value)) {
                      // Array - show as JSON textarea
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {getFieldLabel(key, selectedNode?.id || '')}
                          </Label>
                          <Textarea
                            id={key}
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                setNodeConfig({ ...nodeConfig, [key]: parsed })
                              } catch (err) {
                                // Invalid JSON, don't update
                              }
                            }}
                            rows={4}
                            className="font-mono text-sm"
                          />
                        </div>
                      )
                    } else if (typeof value === 'object' && value !== null) {
                      // Object - show as JSON textarea
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {getFieldLabel(key, selectedNode?.id || '')}
                          </Label>
                          <Textarea
                            id={key}
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                setNodeConfig({ ...nodeConfig, [key]: parsed })
                              } catch (err) {
                                // Invalid JSON, don't update
                              }
                            }}
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </div>
                      )
                    }

                    return null
                  })
                  })()}

                  {/* Save Button */}
                  <Button
                    onClick={saveNodeConfig}
                    disabled={saving}
                    className="w-full gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>
              )}

              {/* Info when node is disabled */}
              {!selectedNode.enabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este node está desativado. Ative-o para poder editar suas configurações.
                  </AlertDescription>
                </Alert>
              )}

              {/* Info when node has no config */}
              {!selectedNode.hasConfig && selectedNode.enabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este node não possui configurações editáveis. Ele faz parte do pipeline
                    padrão do chatbot.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
