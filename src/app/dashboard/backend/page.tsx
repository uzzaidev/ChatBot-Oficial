'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2, Phone, CheckCheck, Eye, AlertTriangle } from 'lucide-react'

interface ExecutionLog {
  id: number
  execution_id: string
  node_name: string
  input_data?: any
  output_data?: any
  error?: any
  status: 'running' | 'success' | 'error'
  duration_ms?: number
  timestamp: string
  metadata?: any
}

interface Execution {
  execution_id: string
  logs: ExecutionLog[]
  started_at: string
  last_update: string
  status: 'running' | 'success' | 'error'
  metadata?: any
  node_count: number
}

type StatusFilterType = 'all' | 'message' | 'sent' | 'delivered' | 'read' | 'failed'

export default function BackendMonitorPage() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all')

  // Função para buscar logs
  const fetchLogs = useCallback(async () => {
    try {
      const url = lastUpdate 
        ? `/api/backend/stream?limit=50&since=${lastUpdate}`
        : '/api/backend/stream?limit=50'
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.success && data.executions) {
        setExecutions(prev => {
          // Merge new executions with existing ones
          const merged = new Map<string, Execution>()
          
          // Add existing executions
          prev.forEach(exec => merged.set(exec.execution_id, exec))
          
          // Update with new data - merge logs properly
          data.executions.forEach((newExec: Execution) => {
            const existing = merged.get(newExec.execution_id)
            
            if (existing) {
              // Merge logs - create a map of logs by ID to avoid duplicates
              const logMap = new Map<number, any>()
              
              // Add existing logs
              existing.logs.forEach(log => logMap.set(log.id, log))
              
              // Add/update with new logs
              newExec.logs.forEach(log => logMap.set(log.id, log))
              
              // Sort logs by timestamp
              const mergedLogs = Array.from(logMap.values()).sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              )
              
              // Update execution with merged logs and latest metadata
              merged.set(newExec.execution_id, {
                ...newExec,
                logs: mergedLogs,
                node_count: mergedLogs.length,
              })
            } else {
              // New execution, just add it
              merged.set(newExec.execution_id, newExec)
            }
          })
          
          return Array.from(merged.values())
            .filter(exec => {
              // Filter out incomplete executions (those with only _END or only _START)
              const hasStart = exec.logs.some(log => log.node_name === '_START')
              const hasOtherNodes = exec.logs.some(log => log.node_name !== '_START' && log.node_name !== '_END')
              // Keep execution if it has _START and at least one other node, or if it has multiple nodes
              return (hasStart && hasOtherNodes) || exec.logs.length > 2
            })
            .sort(
              (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            )
        })
        
        setLastUpdate(data.timestamp)
        
        // Auto-select first execution if none selected
        if (!selectedExecution && data.executions.length > 0) {
          setSelectedExecution(data.executions[0].execution_id)
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }, [lastUpdate, selectedExecution])

  // Auto-refresh
  useEffect(() => {
    fetchLogs()
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000) // Poll every 2 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchLogs])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [executions, selectedExecution, autoScroll])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'running': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'running': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const formatJSON = (data: any) => {
    if (!data) return 'null'
    if (typeof data === 'string') return data
    return JSON.stringify(data, null, 2)
  }

  // Extrai informação de status do WhatsApp se disponível
  const extractWhatsAppStatus = (log: ExecutionLog): string | null => {
    // Verifica se tem status no input_data
    const statuses = log.input_data?.entry?.[0]?.changes?.[0]?.value?.statuses
    if (statuses && statuses.length > 0) {
      const status = statuses[0].status // sent, delivered, read, failed
      return status
    }
    return null
  }

  // Extrai status do WhatsApp de uma execução inteira
  const getExecutionWhatsAppStatus = (execution: Execution): StatusFilterType => {
    // Procura por status do WhatsApp nos logs
    for (const log of execution.logs) {
      const status = extractWhatsAppStatus(log)
      if (status) {
        return status as StatusFilterType
      }
    }
    // Se não tem status, é uma mensagem recebida
    return 'message'
  }

  // Filtra execuções baseado no status selecionado
  const filteredExecutions = executions.filter(exec => {
    if (statusFilter === 'all') return true
    return getExecutionWhatsAppStatus(exec) === statusFilter
  })

  // Conta execuções por tipo
  const getStatusCount = (status: StatusFilterType): number => {
    if (status === 'all') return executions.length
    return executions.filter(exec => getExecutionWhatsAppStatus(exec) === status).length
  }

  const renderTerminalLog = (log: ExecutionLog) => {
    const statusIcon = log.status === 'success' 
      ? <Check className="h-3 w-3" /> 
      : log.status === 'error' 
      ? <X className="h-3 w-3" /> 
      : <Loader2 className="h-3 w-3 animate-spin" />
    const statusColor = getStatusColor(log.status)
    
    // Detecta status update do WhatsApp
    const whatsappStatus = extractWhatsAppStatus(log)

    return (
      <div key={log.id} className="font-mono text-xs mb-2">
        <div className={`flex items-start gap-2 ${statusColor}`}>
          <span className="text-gray-500">[{formatTimestamp(log.timestamp)}]</span>
          <span className={statusColor}>{statusIcon}</span>
          <span className="font-bold">{log.node_name}</span>
          {log.duration_ms && (
            <span className="text-gray-400">({log.duration_ms}ms)</span>
          )}
          {whatsappStatus && (
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-purple-600 text-white flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {whatsappStatus.toUpperCase()}
            </span>
          )}
        </div>

        {log.input_data && (
          <div className="ml-8 mt-1 text-blue-300">
            <span className="text-gray-400">→ INPUT:</span>
            <pre className="ml-4 text-gray-300 whitespace-pre-wrap break-all">
              {formatJSON(log.input_data)}
            </pre>
          </div>
        )}

        {log.output_data && (
          <div className="ml-8 mt-1 text-green-300">
            <span className="text-gray-400">← OUTPUT:</span>
            <pre className="ml-4 text-gray-300 whitespace-pre-wrap break-all">
              {formatJSON(log.output_data)}
            </pre>
          </div>
        )}

        {/* Aviso quando output está faltando mas node teve sucesso */}
        {!log.output_data && !log.error && log.status === 'success' && log.node_name !== '_START' && log.node_name !== '_END' && (
          <div className="ml-8 mt-1 text-yellow-300 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">OUTPUT: </span>
            <span className="text-yellow-400 italic">(dados não registrados pelo node)</span>
          </div>
        )}

        {log.error && (
          <div className="ml-8 mt-1 text-red-300">
            <span className="text-gray-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              ERROR:
            </span>
            <pre className="ml-4 text-red-400 whitespace-pre-wrap break-all">
              {formatJSON(log.error)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const selectedExecutionData = executions.find(e => e.execution_id === selectedExecution)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backend Monitor</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do fluxo de mensagens - Estilo terminal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoScroll(!autoScroll)}
            variant={autoScroll ? 'default' : 'outline'}
            size="sm"
          >
            {autoScroll ? '📜 Auto-scroll ON' : '📜 Auto-scroll OFF'}
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            {autoRefresh ? '🔄 Live' : '⏸️ Pausado'}
          </Button>
          <Button onClick={() => fetchLogs()} variant="outline" size="sm">
            🔃 Atualizar
          </Button>
        </div>
      </div>

      {executions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma execução encontrada. Aguardando mensagens...
              </p>
              <p className="text-sm text-muted-foreground">
                Envie uma mensagem pelo WhatsApp para ver o fluxo em tempo real
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Filter Tabs */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => setStatusFilter('all')}
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  🌐 Todas
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('all')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('message')}
                  variant={statusFilter === 'message' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  📨 Mensagens Recebidas
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('message')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('sent')}
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  📤 Enviadas
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('sent')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('delivered')}
                  variant={statusFilter === 'delivered' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Entregues
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('delivered')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('read')}
                  variant={statusFilter === 'read' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Lidas
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('read')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('failed')}
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Falhas
                  <Badge variant="secondary" className="ml-1">
                    {getStatusCount('failed')}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

        <div className="grid grid-cols-4 gap-4">
          {/* Sidebar - Lista de Execuções */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Execuções Ativas</CardTitle>
              <CardDescription className="text-xs">
                {filteredExecutions.length} de {executions.length} execução(ões)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[700px]">
                <div className="space-y-2">
                  {filteredExecutions.map((exec) => {
                    const isStatusUpdate = exec.metadata?.is_status_update
                    const whatsappStatus = getExecutionWhatsAppStatus(exec)
                    
                    return (
                      <button
                        key={exec.execution_id}
                        onClick={() => setSelectedExecution(exec.execution_id)}
                        className={`w-full text-left p-2 rounded-lg border transition-colors ${
                          selectedExecution === exec.execution_id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Badge className={getStatusBadge(exec.status)} variant="default">
                              {exec.status}
                            </Badge>
                            {whatsappStatus === 'message' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                MSG
                              </span>
                            )}
                            {whatsappStatus === 'sent' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                SENT
                              </span>
                            )}
                            {whatsappStatus === 'delivered' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                DELIVERED
                              </span>
                            )}
                            {whatsappStatus === 'read' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                READ
                              </span>
                            )}
                            {whatsappStatus === 'failed' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                FAILED
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {exec.node_count} nodes
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {exec.execution_id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(exec.started_at)}
                        </p>
                        {exec.metadata?.from && (
                          <p className="text-xs font-medium mt-1 truncate flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {exec.metadata.from}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Terminal Area */}
          <Card className="col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-mono">
                    Terminal Output
                  </CardTitle>
                  {selectedExecutionData && (
                    <CardDescription className="text-xs mt-1">
                      Execution ID: {selectedExecutionData.execution_id}
                    </CardDescription>
                  )}
                </div>
                {selectedExecutionData && (
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(selectedExecutionData.status)}>
                      {selectedExecutionData.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedExecutionData.node_count} nodes executados
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedExecutionData ? (
                <div className="text-center py-12 text-muted-foreground">
                  ← Selecione uma execução
                </div>
              ) : (
                <div
                  ref={scrollRef}
                  className="bg-black text-green-400 p-4 rounded-lg overflow-auto"
                  style={{ height: '700px' }}
                >
                  {/* Header */}
                  <div className="mb-4 pb-2 border-b border-gray-700">
                    <div className="text-xs text-gray-400">
                      ╔════════════════════════════════════════════════════════════════╗
                    </div>
                    <div className="text-xs text-gray-400">
                      ║ CHATBOT BACKEND MONITOR - MESSAGE FLOW TRACE
                    </div>
                    <div className="text-xs text-gray-400">
                      ║ Execution: {selectedExecutionData.execution_id}
                    </div>
                    <div className="text-xs text-gray-400">
                      ║ Started: {new Date(selectedExecutionData.started_at).toLocaleString('pt-BR')}
                    </div>
                    {selectedExecutionData.metadata?.from && (
                      <div className="text-xs text-gray-400">
                        ║ Phone: {selectedExecutionData.metadata.from}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      ╚════════════════════════════════════════════════════════════════╝
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="space-y-1">
                    {selectedExecutionData.logs.map(renderTerminalLog)}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400">
                      ─────────────────────────────────────────────────────────────────
                    </div>
                    <div className="text-xs text-gray-400">
                      End of execution log - Status: {selectedExecutionData.status}
                    </div>
                    {autoRefresh && (
                      <div className="text-xs text-yellow-400 animate-pulse">
                        ● Monitoring live...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </>
      )}
    </div>
  )
}
