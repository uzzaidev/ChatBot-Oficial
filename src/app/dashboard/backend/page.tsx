'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, Loader2, Phone, CheckCheck, Eye, AlertTriangle, Search, Globe, Mail, Send, ScrollText, RefreshCw, Pause, RotateCw } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all')
  const [phoneFilter, setPhoneFilter] = useState<string>('')
  const supabase = createClientComponentClient() // ⚡ Para autenticação multi-tenant

  // Função para buscar logs - sempre busca os últimos 500 logs do Supabase
  const fetchLogs = useCallback(async () => {
    try {
      // ⚡ MULTI-TENANT: Obter token de autenticação para RLS
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.error('[BackendMonitor] User not authenticated')
        return
      }

      // Sempre busca os últimos 500 logs, sem filtro 'since'
      // Isso garante que após refresh da página, todos os logs apareçam
      const url = '/api/backend/stream?limit=500'

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`, // ⚡ RLS ativo
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (data.success && data.executions) {
        // Substitui completamente as execuções ao invés de fazer merge
        // Isso garante que sempre mostramos o estado atual do banco
        const sortedExecutions = data.executions.sort(
          (a: Execution, b: Execution) => 
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
        
        setExecutions(sortedExecutions)
        
        // Auto-select first execution if none selected
        if (!selectedExecution && sortedExecutions.length > 0) {
          setSelectedExecution(sortedExecutions[0].execution_id)
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }, [selectedExecution, supabase])

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

  // Filtra execuções baseado no status e telefone selecionados
  const filteredExecutions = executions.filter(exec => {
    // Filtro de status
    if (statusFilter !== 'all' && getExecutionWhatsAppStatus(exec) !== statusFilter) {
      return false
    }
    
    // Filtro de telefone/cliente
    if (phoneFilter.trim()) {
      const searchTerm = phoneFilter.trim()
      
      // Busca o telefone em vários lugares possíveis
      // 1. metadata.from (se existir)
      const metadataPhone = exec.metadata?.from || ''
      if (metadataPhone.includes(searchTerm)) {
        return true
      }
      
      // 2. Busca nos logs (input_data de qualquer node pode conter o telefone)
      const hasPhoneInLogs = exec.logs.some(log => {
        // Verifica input_data
        const inputData = log.input_data
        if (inputData) {
          // WhatsApp webhook structure: entry[].changes[].value.messages[].from ou contacts[].wa_id
          const messages = inputData.entry?.[0]?.changes?.[0]?.value?.messages
          const contacts = inputData.entry?.[0]?.changes?.[0]?.value?.contacts
          
          if (messages && messages.length > 0) {
            const from = messages[0].from || ''
            if (from.includes(searchTerm)) return true
          }
          
          if (contacts && contacts.length > 0) {
            const waId = contacts[0].wa_id || ''
            if (waId.includes(searchTerm)) return true
          }
          
          // Verifica status updates
          const statuses = inputData.entry?.[0]?.changes?.[0]?.value?.statuses
          if (statuses && statuses.length > 0) {
            const recipientId = statuses[0].recipient_id || ''
            if (recipientId.includes(searchTerm)) return true
          }
        }
        return false
      })
      
      return hasPhoneInLogs
    }
    
    return true
  })

  // Conta execuções por tipo
  const getStatusCount = (status: StatusFilterType): number => {
    if (status === 'all') return executions.length
    return executions.filter(exec => getExecutionWhatsAppStatus(exec) === status).length
  }

  // Extrai números de telefone únicos de todas as execuções
  const getUniquePhoneNumbers = (): string[] => {
    const phones = new Set<string>()
    
    executions.forEach(exec => {
      // Busca em metadata
      if (exec.metadata?.from) {
        phones.add(exec.metadata.from)
      }
      
      // Busca nos logs
      exec.logs.forEach(log => {
        const inputData = log.input_data
        if (inputData) {
          // Messages
          const messages = inputData.entry?.[0]?.changes?.[0]?.value?.messages
          if (messages && messages.length > 0 && messages[0].from) {
            phones.add(messages[0].from)
          }
          
          // Contacts
          const contacts = inputData.entry?.[0]?.changes?.[0]?.value?.contacts
          if (contacts && contacts.length > 0 && contacts[0].wa_id) {
            phones.add(contacts[0].wa_id)
          }
          
          // Status updates
          const statuses = inputData.entry?.[0]?.changes?.[0]?.value?.statuses
          if (statuses && statuses.length > 0 && statuses[0].recipient_id) {
            phones.add(statuses[0].recipient_id)
          }
        }
      })
    })
    
    return Array.from(phones).filter(p => p.length > 0).sort()
  }

  const uniquePhones = getUniquePhoneNumbers()

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
        <div className={`flex items-start gap-1 sm:gap-2 ${statusColor} flex-wrap`}>
          <span className="text-gray-500 text-[10px] sm:text-xs">[{formatTimestamp(log.timestamp)}]</span>
          <span className={statusColor}>{statusIcon}</span>
          <span className="font-bold break-all">{log.node_name}</span>
          {log.duration_ms && (
            <span className="text-gray-400 text-[10px] sm:text-xs">({log.duration_ms}ms)</span>
          )}
          {whatsappStatus && (
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs bg-purple-600 text-white flex items-center gap-1">
              <Phone className="h-2 w-2 sm:h-3 sm:w-3" />
              {whatsappStatus.toUpperCase()}
            </span>
          )}
        </div>

        {log.input_data && (
          <div className="ml-4 sm:ml-8 mt-1 text-blue-300">
            <span className="text-gray-400">→ INPUT:</span>
            <pre className="ml-2 sm:ml-4 text-gray-300 whitespace-pre-wrap break-all text-[10px] sm:text-xs">
              {formatJSON(log.input_data)}
            </pre>
          </div>
        )}

        {log.output_data && (
          <div className="ml-4 sm:ml-8 mt-1 text-green-300">
            <span className="text-gray-400">← OUTPUT:</span>
            <pre className="ml-2 sm:ml-4 text-gray-300 whitespace-pre-wrap break-all text-[10px] sm:text-xs">
              {formatJSON(log.output_data)}
            </pre>
          </div>
        )}

        {/* Aviso quando output está faltando mas node teve sucesso */}
        {!log.output_data && !log.error && log.status === 'success' && log.node_name !== '_START' && log.node_name !== '_END' && (
          <div className="ml-4 sm:ml-8 mt-1 text-yellow-300 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400 text-[10px] sm:text-xs">OUTPUT: </span>
            <span className="text-yellow-400 italic text-[10px] sm:text-xs">(dados não registrados pelo node)</span>
          </div>
        )}

        {log.error && (
          <div className="ml-4 sm:ml-8 mt-1 text-red-300">
            <span className="text-gray-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              ERROR:
            </span>
            <pre className="ml-2 sm:ml-4 text-red-400 whitespace-pre-wrap break-all text-[10px] sm:text-xs">
              {formatJSON(log.error)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const selectedExecutionData = executions.find(e => e.execution_id === selectedExecution)

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Backend Monitor</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitoramento em tempo real do fluxo de mensagens - Estilo terminal
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setAutoScroll(!autoScroll)}
            variant={autoScroll ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">{autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}</span>
            <span className="sm:hidden">{autoScroll ? 'Scroll' : 'Scroll'}</span>
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            {autoRefresh ? <RefreshCw className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Pausado'}</span>
          </Button>
          <Button onClick={() => fetchLogs()} variant="outline" size="sm" className="gap-2">
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
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
          {/* Phone Filter */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 w-full sm:max-w-md">
                  <Input
                    type="text"
                    placeholder="Filtrar por telefone/cliente"
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    list="phone-numbers"
                    className="w-full"
                  />
                  <datalist id="phone-numbers">
                    {uniquePhones.map(phone => (
                      <option key={phone} value={phone} />
                    ))}
                  </datalist>
                  {phoneFilter && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mostrando apenas: {phoneFilter} ({filteredExecutions.length} execuções)
                    </p>
                  )}
                  {uniquePhones.length > 0 && !phoneFilter && (
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {uniquePhones.length} telefone(s) disponível(is) - comece a digitar ou clique na seta
                    </p>
                  )}
                </div>
                {phoneFilter && (
                  <Button
                    onClick={() => setPhoneFilter('')}
                    variant="ghost"
                    size="sm"
                    className="self-end sm:self-auto"
                  >
                    <X className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Filter Tabs */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => setStatusFilter('all')}
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Todas</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('all')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('message')}
                  variant={statusFilter === 'message' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Mensagens</span>
                  <span className="sm:hidden">MSG</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('message')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('sent')}
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Enviadas</span>
                  <span className="sm:hidden">ENV</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('sent')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('delivered')}
                  variant={statusFilter === 'delivered' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Entregues</span>
                  <span className="sm:hidden">ENT</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('delivered')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('read')}
                  variant={statusFilter === 'read' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Lidas</span>
                  <span className="sm:hidden">LID</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('read')}
                  </Badge>
                </Button>
                <Button
                  onClick={() => setStatusFilter('failed')}
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Falhas</span>
                  <span className="sm:hidden">ERR</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">
                    {getStatusCount('failed')}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar - Lista de Execuções */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Execuções Ativas</CardTitle>
              <CardDescription className="text-xs">
                {filteredExecutions.length} de {executions.length} execução(ões)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[300px] lg:h-[600px] xl:h-[700px]">
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
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-mono">
                    Terminal Output
                  </CardTitle>
                  {selectedExecutionData && (
                    <CardDescription className="text-xs mt-1 truncate">
                      Execution ID: {selectedExecutionData.execution_id}
                    </CardDescription>
                  )}
                </div>
                {selectedExecutionData && (
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(selectedExecutionData.status)}>
                      {selectedExecutionData.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
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
                  className="bg-black text-green-400 p-2 sm:p-4 rounded-lg overflow-auto text-xs sm:text-sm"
                  style={{ height: 'calc(100vh - 500px)', minHeight: '400px', maxHeight: '700px' }}
                >
                  {/* Header */}
                  <div className="mb-4 pb-2 border-b border-gray-700">
                    <div className="text-xs text-gray-400 hidden sm:block">
                      ╔════════════════════════════════════════════════════════════════╗
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="hidden sm:inline">║ </span>CHATBOT BACKEND MONITOR - MESSAGE FLOW TRACE
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="hidden sm:inline">║ </span>Execution: {selectedExecutionData.execution_id.slice(0, 16)}...
                    </div>
                    <div className="text-xs text-gray-400 hidden sm:block">
                      ║ Started: {new Date(selectedExecutionData.started_at).toLocaleString('pt-BR')}
                    </div>
                    {selectedExecutionData.metadata?.from && (
                      <div className="text-xs text-gray-400">
                        <span className="hidden sm:inline">║ </span>Phone: {selectedExecutionData.metadata.from}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 hidden sm:block">
                      ╚════════════════════════════════════════════════════════════════╝
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="space-y-1">
                    {selectedExecutionData.logs.map(renderTerminalLog)}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 hidden sm:block">
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
