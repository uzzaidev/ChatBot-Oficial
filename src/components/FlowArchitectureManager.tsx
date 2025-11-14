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
import { Save, RefreshCw, AlertCircle, CheckCircle, Maximize2 } from 'lucide-react'
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
    id: 'batch_messages',
    name: 'Batch Messages',
    description: 'Agrupa mensagens sequenciais',
    category: 'preprocessing',
    enabled: true,
    hasConfig: true,
    configKey: 'batching:delay_seconds',
    dependencies: ['normalize_message'],
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
    optionalDependencies: ['normalize_message'], // Bypass if batch is disabled
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
    optionalDependencies: ['normalize_message'], // Bypass if batch is disabled
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
  
  // Output Nodes (12-14)
  {
    id: 'format_response',
    name: 'Format Response',
    description: 'Formata resposta para WhatsApp',
    category: 'output',
    enabled: true,
    hasConfig: false,
    dependencies: ['detect_repetition'],
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
        ? `${node.name}<br/>⚙️ Configurável`
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
          // If primary dependency is disabled, use optional/bypass route
          if (depNode && !depNode.enabled) {
            node.optionalDependencies.forEach((optDepId) => {
              const optDepNode = nodes.find((n) => n.id === optDepId)
              if (optDepNode) {
                diagram += `  ${optDepId} -.-> ${node.id}\n` // Dotted line for bypass
                // Style bypass route
                diagram += `  linkStyle ${linkIndex} stroke:#fbbf24,stroke-width:2px,stroke-dasharray:3\n`
                linkIndex++
              }
            })
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
      // Clear previous content
      mermaidRef.current.innerHTML = ''
      
      // Create a unique ID for this render
      const id = `mermaid-${Date.now()}`
      
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🎛️ Arquitetura do Fluxo de Processamento
            </CardTitle>
            <CardDescription>
              Visualize e configure todos os nós (nodes) do seu chatbot multiagente.
              Clique em um nó para editar suas configurações.
            </CardDescription>
          </div>
          <div className="flex gap-2">
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
          <AlertDescription>
            <strong>Como usar:</strong> Clique em qualquer nó do fluxograma para ver/editar suas configurações.
            Nós com ⚙️ possuem configurações editáveis (prompts, temperatura, thresholds, etc).
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
                  
                  {/* Show config key for reference */}
                  {selectedNode.configKey && (
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded font-mono">
                      Config Key: {selectedNode.configKey}
                    </div>
                  )}
                  
                  {/* Dynamic fields - render all config properties */}
                  {Object.keys(nodeConfig).filter(key => key !== 'enabled').map((key) => {
                    const value = nodeConfig[key]
                    
                    // Handle different types of values
                    if (typeof value === 'string' && value.length > 100) {
                      // Large text - use textarea (like prompts)
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="capitalize">
                            {key.replace(/_/g, ' ')}
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
                            <Label htmlFor={key} className="text-base capitalize">
                              {key.replace(/_/g, ' ')}
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
                          <Label htmlFor={key} className="capitalize">
                            {key.replace(/_/g, ' ')}
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
                              onValueChange={(newValue) =>
                                setNodeConfig({ ...nodeConfig, [key]: newValue })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="groq">Groq (Fast)</SelectItem>
                                <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                              </SelectContent>
                            </Select>
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
                          <Label htmlFor={key} className="capitalize">
                            {key.replace(/_/g, ' ')}
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
                          <Label htmlFor={key} className="capitalize">
                            {key.replace(/_/g, ' ')} (JSON Array)
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
                          <Label htmlFor={key} className="capitalize">
                            {key.replace(/_/g, ' ')} (JSON Object)
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
                  })}

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
