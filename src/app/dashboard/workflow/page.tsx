'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { XCircle, Play, RotateCcw, Loader2, FastForward, Inbox, Info, Timer, Download, Upload } from 'lucide-react'

// Definição dos nodes do fluxo em ordem
const WORKFLOW_NODES = [
  {
    id: 'filterStatusUpdates',
    name: '1. Filter Status Updates',
    description: 'Filtra status updates (delivered, read, etc)',
    endpoint: '/api/test/nodes/filter-status',
  },
  {
    id: 'parseMessage',
    name: '2. Parse Message',
    description: 'Extrai phone, name, type, content',
    endpoint: '/api/test/nodes/parse-message',
  },
  {
    id: 'checkOrCreateCustomer',
    name: '3. Check/Create Customer',
    description: 'Verifica se cliente existe no banco',
    endpoint: '/api/test/nodes/check-customer',
  },
  {
    id: 'downloadMetaMedia',
    name: '4. Download Media (se aplicável)',
    description: 'Baixa áudio/imagem se mensagem for mídia',
    endpoint: '/api/test/nodes/download-media',
    optional: true,
  },
  {
    id: 'normalizeMessage',
    name: '5. Normalize Message',
    description: 'Normaliza conteúdo da mensagem',
    endpoint: '/api/test/nodes/normalize',
  },
  {
    id: 'pushToRedis',
    name: '6. Push to Redis',
    description: 'Adiciona mensagem à fila de batching',
    endpoint: '/api/test/nodes/push-redis',
  },
  {
    id: 'batchMessages',
    name: '7. Batch Messages',
    description: 'Aguarda 10s e agrupa mensagens',
    endpoint: '/api/test/nodes/batch',
  },
  {
    id: 'getChatHistory',
    name: '8. Get Chat History',
    description: 'Busca histórico de conversas',
    endpoint: '/api/test/nodes/chat-history',
  },
  {
    id: 'getRAGContext',
    name: '9. Get RAG Context',
    description: 'Busca contexto relevante (vector search)',
    endpoint: '/api/test/nodes/rag-context',
    optional: true,
  },
  {
    id: 'generateAIResponse',
    name: '10. Generate AI Response',
    description: 'Gera resposta com LLM (Groq)',
    endpoint: '/api/test/nodes/ai-response',
  },
  {
    id: 'formatResponse',
    name: '11. Format Response',
    description: 'Divide resposta em mensagens WhatsApp',
    endpoint: '/api/test/nodes/format-response',
  },
  {
    id: 'sendWhatsAppMessage',
    name: '12. Send WhatsApp Message',
    description: 'Envia mensagens via Meta API',
    endpoint: '/api/test/nodes/send-whatsapp',
  },
]

interface NodeExecution {
  nodeId: string
  input: any
  output: any | null
  error: any | null
  status: 'idle' | 'running' | 'success' | 'error' | 'skipped'
  duration?: number
  metadata?: {
    info?: string
    highlights?: Array<{ label: string; value: any; color?: string }>
  }
}

// Função para extrair informações importantes de cada node
const extractHighlights = (
  nodeId: string,
  output: any,
  input: any
): Array<{ label: string; value: any; color?: string }> => {
  const highlights: Array<{ label: string; value: any; color?: string }> = []

  switch (nodeId) {
    case 'parseMessage':
      if (output?.type) {
        highlights.push({
          label: 'Tipo de Mensagem',
          value: output.type,
          color: output.type === 'text' ? 'blue' : output.type === 'image' ? 'green' : 'orange',
        })
      }
      if (output?.phone) {
        highlights.push({ label: 'Telefone', value: output.phone })
      }
      break

    case 'checkOrCreateCustomer':
      if (output?.status) {
        highlights.push({
          label: 'Status Cliente',
          value: output.status,
          color: output.status === 'bot' ? 'green' : 'orange',
        })
      }
      if (output?.id) {
        highlights.push({
          label: 'Cliente',
          value: output.name || output.phone,
        })
      }
      break

    case 'filterStatusUpdates':
      if (output === null) {
        highlights.push({
          label: 'Resultado',
          value: 'Mensagem filtrada (status update)',
          color: 'red',
        })
      } else {
        highlights.push({
          label: 'Resultado',
          value: 'Mensagem válida (não é status)',
          color: 'green',
        })
      }
      break

    case 'batchMessages':
      if (typeof output === 'string') {
        highlights.push({
          label: 'Conteúdo Batched',
          value: `${output.length} caracteres`,
        })
      }
      break

    case 'getChatHistory':
      if (Array.isArray(output)) {
        highlights.push({
          label: 'Histórico',
          value: `${output.length} mensagens`,
        })
      }
      break

    case 'generateAIResponse':
      if (output?.content) {
        highlights.push({
          label: 'Resposta',
          value: `${output.content.substring(0, 50)}...`,
        })
      }
      if (output?.toolCalls && output.toolCalls.length > 0) {
        highlights.push({
          label: 'Tool Calls',
          value: output.toolCalls.map((t: any) => t.function.name).join(', '),
          color: 'orange',
        })
      }
      break

    case 'formatResponse':
      if (Array.isArray(output)) {
        highlights.push({
          label: 'Mensagens',
          value: `${output.length} mensagem(ns)`,
        })
      }
      break

    case 'sendWhatsAppMessage':
      if (Array.isArray(output)) {
        highlights.push({
          label: 'Enviadas',
          value: `${output.length} mensagem(ns)`,
          color: 'green',
        })
      }
      break
  }

  return highlights
}

// Prepara o input específico para cada node - SEGUINDO A MESMA LÓGICA DO chatbotFlow.ts
const prepareInputForNode = (nodeId: string, input: any, allExecutions: Record<string, NodeExecution>) => {
  const parseMessageOutput = allExecutions['parseMessage']?.output
  
  switch (nodeId) {
    case 'filterStatusUpdates':
      // Usa webhook payload direto
      return input

    case 'parseMessage':
      // Usa output do filterStatusUpdates
      return input

    case 'checkOrCreateCustomer':
      // Usa phone e name do parseMessage
      if (parseMessageOutput) {
        return {
          phone: parseMessageOutput.phone,
          name: parseMessageOutput.name,
        }
      }
      return input

    case 'downloadMetaMedia':
      // Usa metadata.id do parseMessage (se for mídia)
      if (parseMessageOutput?.metadata?.id) {
        return {
          mediaId: parseMessageOutput.metadata.id,
        }
      }
      return input

    case 'normalizeMessage':
      // MESMA LÓGICA DO chatbotFlow.ts (linha 112-120)
      // Se for texto, usa content direto
      // Se for mídia, usaria processedContent do downloadMetaMedia/transcribeAudio/analyzeImage
      if (parseMessageOutput) {
        let processedContent: string
        
        if (parseMessageOutput.type === 'text') {
          processedContent = parseMessageOutput.content
        } else {
          // Para mídia, usaria output do node 4 (download/transcode)
          // Por enquanto, usa content original
          processedContent = parseMessageOutput.content
        }

        return {
          parsedMessage: parseMessageOutput,
          processedContent: processedContent,
        }
      }
      return input

    case 'pushToRedis':
      // Usa output do normalizeMessage (linha 122)
      return input

    case 'batchMessages':
      // Usa phone do parseMessage (linha 125)
      if (parseMessageOutput) {
        return parseMessageOutput.phone
      }
      return input?.phone || input

    case 'getChatHistory':
      // Usa phone do parseMessage (linha 132-134)
      if (parseMessageOutput) {
        return parseMessageOutput.phone
      }
      return input?.phone || input

    case 'getRAGContext':
      // Usa batchedContent (linha 132-134)
      const batchOutput = allExecutions['batchMessages']?.output
      return batchOutput || input

    case 'generateAIResponse':
      // MESMA LÓGICA linha 139-144
      const batchExecution = allExecutions['batchMessages']
      const chatHistoryExecution = allExecutions['getChatHistory']
      const ragExecution = allExecutions['getRAGContext']

      return {
        message: batchExecution?.output || '',
        chatHistory: chatHistoryExecution?.output || [],
        ragContext: ragExecution?.output || '',
        customerName: parseMessageOutput?.name || 'Cliente',
      }

    case 'formatResponse':
      // Usa aiResponse.content (linha 172)
      return input?.content || input

    case 'sendWhatsAppMessage':
      // Usa phone do parseMessage e messages do formatResponse (linha 179-182)
      const formatExecution = allExecutions['formatResponse']

      return {
        phone: parseMessageOutput?.phone || input?.phone,
        messages: formatExecution?.output || (Array.isArray(input) ? input : [input]),
      }

    default:
      return input
  }
}

export default function WorkflowDebugPage() {
  // Estado para armazenar execuções de cada node
  const [executions, setExecutions] = useState<Record<string, NodeExecution>>(
    WORKFLOW_NODES.reduce((acc, node) => {
      acc[node.id] = {
        nodeId: node.id,
        input: null,
        output: null,
        error: null,
        status: 'idle',
      }
      return acc
    }, {} as Record<string, NodeExecution>)
  )

  // JSON inicial do webhook (vindo do cache)
  const [webhookPayload] = useState({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '2018456492284219',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '555499567051',
                phone_number_id: '899639703222013',
              },
              contacts: [
                {
                  profile: {
                    name: 'Luis Fernando Boff',
                  },
                  wa_id: '555499250023',
                },
              ],
              messages: [
                {
                  from: '555499250023',
                  id: 'wamid.HBgMNTU1NDk5MjUwMDIzFQIAEhgWM0VCMDI3MkMzMUVDOTgyMkMyMTk2MAA=',
                  timestamp: '1761514713',
                  text: {
                    body: 'ola',
                  },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  })

  const executeNode = async (nodeId: string) => {
    const node = WORKFLOW_NODES.find((n) => n.id === nodeId)
    if (!node) return

    // Atualiza estado para "running"
    setExecutions((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        status: 'running',
        error: null,
      },
    }))

    const startTime = Date.now()

    try {
      // Determina o input: 
      // - Primeiro node usa webhook payload
      // - Demais nodes usam output do node anterior
      let input: any

      if (nodeId === 'filterStatusUpdates') {
        input = webhookPayload
      } else {
        // Encontra o node anterior NÃO-OPCIONAL
        const currentIndex = WORKFLOW_NODES.findIndex((n) => n.id === nodeId)
        
        // Busca o último node não-opcional que foi executado com sucesso
        let previousNode = null
        for (let i = currentIndex - 1; i >= 0; i--) {
          const candidateNode = WORKFLOW_NODES[i]
          const candidateExecution = executions[candidateNode.id]
          
          // Se é opcional e não foi executado, pula
          if (candidateNode.optional && candidateExecution.status === 'idle') {
            continue
          }
          
          // Se foi pulado (skipped), também ignora
          if (candidateExecution.status === 'skipped') {
            continue
          }
          
          // Se não é opcional ou foi executado, este é o anterior
          if (candidateExecution.status === 'success') {
            previousNode = candidateNode
            break
          }
          
          // Se não é opcional e não foi executado com sucesso, erro
          // @ts-ignore - TypeScript warning sobre tipos não sobrepostos é falso positivo aqui
          if (!candidateNode.optional && candidateExecution.status !== 'success' && candidateExecution.status !== 'skipped') {
            throw new Error(`Execute primeiro o node: ${candidateNode.name}`)
          }
        }
        
        if (previousNode) {
          const previousExecution = executions[previousNode.id]
          input = previousExecution.output
        } else {
          input = webhookPayload
        }
      }

      // Faz a chamada para o endpoint do node
      const response = await fetch(node.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: prepareInputForNode(nodeId, input, executions) 
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao executar node')
      }

      const duration = Date.now() - startTime

      // Extrai highlights dos dados para visualização
      const highlights = extractHighlights(nodeId, data.output, input)

      // Atualiza com sucesso
      setExecutions((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          input,
          output: data.output,
          status: 'success',
          duration,
          metadata: {
            info: data.info,
            highlights,
          },
        },
      }))
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Atualiza com erro
      setExecutions((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          input: prev[nodeId].input,
          error: error.message,
          status: 'error',
          duration,
        },
      }))
    }
  }

  const skipNode = (nodeId: string) => {
    setExecutions((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        status: 'skipped',
        metadata: {
          info: 'Node pulado (não aplicável para este tipo de mensagem)',
        },
      },
    }))
  }

  const resetNode = (nodeId: string) => {
    setExecutions((prev) => ({
      ...prev,
      [nodeId]: {
        nodeId,
        input: null,
        output: null,
        error: null,
        status: 'idle',
      },
    }))
  }

  const resetAllNodes = () => {
    setExecutions(
      WORKFLOW_NODES.reduce((acc, node) => {
        acc[node.id] = {
          nodeId: node.id,
          input: null,
          output: null,
          error: null,
          status: 'idle',
        }
        return acc
      }, {} as Record<string, NodeExecution>)
    )
  }

  const executeAll = async () => {
    for (const node of WORKFLOW_NODES) {
      if (node.optional) continue // Pula nodes opcionais por enquanto
      await executeNode(node.id)
      
      // Aguarda um pouco entre execuções
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'running':
        return 'bg-yellow-500'
      case 'skipped':
        return 'bg-gray-400'
      default:
        return 'bg-gray-300'
    }
  }

  const getHighlightColor = (color?: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300'
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300'
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-300'
      case 'red':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Workflow Debugger</h1>
          <p className="text-muted-foreground">
            Execute cada node individualmente para testar o fluxo completo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={executeAll} variant="default" className="gap-2">
            <Play className="w-4 h-4" />
            Executar Tudo
          </Button>
          <Button onClick={resetAllNodes} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Webhook Payload Inicial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Webhook Payload (Input Inicial)
          </CardTitle>
          <CardDescription>
            Mensagem recebida do WhatsApp via webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
            {JSON.stringify(webhookPayload, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Grid de Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {WORKFLOW_NODES.map((node) => {
          const execution = executions[node.id]

          return (
            <Card key={node.id} className="relative">
              {node.optional && (
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Opcional
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{node.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {node.description}
                    </CardDescription>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      execution.status
                    )}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Botões de ação */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => executeNode(node.id)}
                    disabled={execution.status === 'running'}
                    size="sm"
                    variant="default"
                    className="flex-1 min-w-[120px] gap-2"
                  >
                    {execution.status === 'running' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Executar
                      </>
                    )}
                  </Button>
                  {node.optional && (
                    <Button
                      onClick={() => skipNode(node.id)}
                      size="sm"
                      variant="outline"
                      title="Pular este node (não aplicável)"
                      className="gap-2"
                    >
                      <FastForward className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => resetNode(node.id)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Info/Metadata */}
                {execution.metadata?.info && (
                  <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {execution.metadata.info}
                  </div>
                )}

                {/* Highlights - Informações Importantes */}
                {execution.metadata?.highlights && execution.metadata.highlights.length > 0 && (
                  <div className="space-y-1">
                    {execution.metadata.highlights.map((highlight, idx) => (
                      <div
                        key={idx}
                        className={`px-2 py-1 rounded text-xs border ${getHighlightColor(
                          highlight.color
                        )}`}
                      >
                        <span className="font-semibold">{highlight.label}:</span>{' '}
                        {typeof highlight.value === 'string'
                          ? highlight.value
                          : JSON.stringify(highlight.value)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status e duração */}
                {execution.duration && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Duração: {execution.duration}ms
                  </div>
                )}

                {/* Input Data */}
                {execution.input && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Input:
                    </p>
                    <ScrollArea className="h-32 w-full">
                      <pre className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded">
                        {JSON.stringify(execution.input, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Output Data */}
                {execution.output && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Output:
                    </p>
                    <ScrollArea className="h-32 w-full">
                      <pre className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded">
                        {JSON.stringify(execution.output, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Error */}
                {execution.error && (
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Error:
                    </p>
                    <div className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded text-red-600 dark:text-red-400">
                      {execution.error}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
