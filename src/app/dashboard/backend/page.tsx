'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

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

export default function BackendMonitorPage() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

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
          
          // Update with new data
          data.executions.forEach((exec: Execution) => {
            merged.set(exec.execution_id, exec)
          })
          
          return Array.from(merged.values()).sort(
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

  const renderTerminalLog = (log: ExecutionLog) => {
    const statusIcon = log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⋯'
    const statusColor = getStatusColor(log.status)

    return (
      <div key={log.id} className="font-mono text-xs mb-2">
        <div className={`flex items-start gap-2 ${statusColor}`}>
          <span className="text-gray-500">[{formatTimestamp(log.timestamp)}]</span>
          <span className={statusColor}>{statusIcon}</span>
          <span className="font-bold">{log.node_name}</span>
          {log.duration_ms && (
            <span className="text-gray-400">({log.duration_ms}ms)</span>
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

        {log.error && (
          <div className="ml-8 mt-1 text-red-300">
            <span className="text-gray-400">✗ ERROR:</span>
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
        <div className="grid grid-cols-4 gap-4">
          {/* Sidebar - Lista de Execuções */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Execuções Ativas</CardTitle>
              <CardDescription className="text-xs">
                {executions.length} execução(ões)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[700px]">
                <div className="space-y-2">
                  {executions.map((exec) => (
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
                        <Badge className={getStatusBadge(exec.status)} variant="default">
                          {exec.status}
                        </Badge>
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
                        <p className="text-xs font-medium mt-1 truncate">
                          📱 {exec.metadata.from}
                        </p>
                      )}
                    </button>
                  ))}
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
      )}
    </div>
  )
}
