'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  started_at: string
  first_node: string
  status: string
  metadata?: any
}

interface ReceivedMessage {
  id: string
  from: string
  name: string
  type: string
  content: string
  timestamp: string
  raw?: any
}

export default function DebugDashboardPage({
  searchParams,
}: {
  searchParams: { execution?: string }
}) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [selectedExecution, setSelectedExecution] = useState<string | null>(
    searchParams.execution || null
  )
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('5511999999999')
  const [testMessage, setTestMessage] = useState('Olá, preciso de ajuda!')
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingDirect, setSendingDirect] = useState(false)
  const [simulatingWebhook, setSimulatingWebhook] = useState(false)
  const [directResult, setDirectResult] = useState<string | null>(null)

  // Carrega lista de execuções
  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        const response = await fetch('/api/debug/executions')
        const data = await response.json()
        setExecutions(data.executions || [])
      } catch (error) {
        console.error('Error fetching executions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExecutions()
  }, [])

  // Carrega mensagens recebidas
  useEffect(() => {
    const fetchReceivedMessages = async () => {
      try {
        const response = await fetch('/api/webhook/received?limit=10')
        const data = await response.json()
        console.log('📥 Mensagens recebidas da API:', data)
        setReceivedMessages(data.messages || [])
      } catch (error) {
        console.error('Error fetching received messages:', error)
      }
    }

    fetchReceivedMessages()
    
    // Atualiza a cada 3 segundos (mais frequente para debug)
    const interval = setInterval(fetchReceivedMessages, 3000)
    return () => clearInterval(interval)
  }, [])

  const forceRefreshMessages = async () => {
    try {
      const response = await fetch('/api/webhook/received')
      const data = await response.json()
      console.log('🔄 Force refresh - Mensagens:', data)
      setReceivedMessages(data.messages || [])
      
      // Também verifica o cache diretamente
      const cacheResponse = await fetch('/api/test/webhook-cache')
      const cacheData = await cacheResponse.json()
      console.log('🗄️ Cache direto:', cacheData)
    } catch (error) {
      console.error('Error force refreshing:', error)
    }
  }

  // Carrega logs da execução selecionada
  useEffect(() => {
    if (!selectedExecution) {
      setLogs([])
      return
    }

    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/debug/executions?execution_id=${selectedExecution}`)
        const data = await response.json()
        setLogs(data.logs || [])
      } catch (error) {
        console.error('Error fetching logs:', error)
      }
    }

    fetchLogs()
  }, [selectedExecution])

  const sendTestMessage = async () => {
    setSendingTest(true)
    setDirectResult(null)
    try {
      const response = await fetch('/api/test/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: testPhone,
          text: testMessage,
          name: 'Test User',
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Recarrega execuções após 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Error sending test message:', error)
      alert('Erro ao enviar mensagem de teste')
    } finally {
      setSendingTest(false)
    }
  }

  const sendDirectWhatsApp = async () => {
    setSendingDirect(true)
    setDirectResult(null)
    try {
      const response = await fetch('/api/test/send-whatsapp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setDirectResult(`✅ Mensagem enviada com sucesso!\nID: ${data.message_id}`)
      } else {
        setDirectResult(`❌ Erro: ${data.error}\n${data.details}`)
      }
    } catch (error: any) {
      console.error('Error sending direct WhatsApp:', error)
      setDirectResult(`❌ Erro de rede: ${error.message}`)
    } finally {
      setSendingDirect(false)
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
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor mensagens em tempo real - estilo n8n
          </p>
        </div>
        <a href="/dashboard/workflow">
          <Button variant="outline">
            🔀 Workflow Debugger (Passo a Passo)
          </Button>
        </a>
      </div>

      {/* Painel de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Testar Envio de Mensagem</CardTitle>
          <CardDescription>
            Teste o envio direto pro WhatsApp (sem processar nodes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Telefone (com DDI)</label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Olá, preciso de ajuda!"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={sendDirectWhatsApp} 
              disabled={sendingDirect}
              variant="default"
            >
              {sendingDirect ? 'Enviando...' : '📱 Enviar Direto (WhatsApp apenas)'}
            </Button>
            
            <Button 
              onClick={sendTestMessage} 
              disabled={sendingTest}
              variant="outline"
            >
              {sendingTest ? 'Processando...' : '⚙️ Processar Fluxo Completo'}
            </Button>
          </div>

          {directResult && (
            <div className={`p-3 rounded-lg text-sm font-mono whitespace-pre-wrap ${
              directResult.startsWith('✅') 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {directResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Mensagens Recebidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📥 Mensagens Recebidas (Webhook)</CardTitle>
              <CardDescription>
                Últimas 20 mensagens recebidas - Atualiza a cada 3s
              </CardDescription>
            </div>
            <Button onClick={forceRefreshMessages} variant="outline" size="sm">
              🔄 Atualizar Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {receivedMessages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhuma mensagem recebida ainda
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie uma mensagem do WhatsApp para o bot
                </p>
                <Button onClick={forceRefreshMessages} variant="outline" size="sm" className="mt-4">
                  🔍 Verificar Novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {receivedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {msg.name || 'Unknown'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {msg.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      📱 {msg.from}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                    {msg.raw && (
                      <details className="text-xs mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver payload completo
                        </summary>
                        <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(msg.raw, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Lista de Execuções */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Execuções Recentes</CardTitle>
            <CardDescription>{executions.length} execuções</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : executions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma execução encontrada</p>
              ) : (
                <div className="space-y-2">
                  {executions.map((exec) => (
                    <button
                      key={exec.execution_id}
                      onClick={() => setSelectedExecution(exec.execution_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExecution === exec.execution_id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {exec.execution_id.slice(0, 8)}...
                        </span>
                        <Badge className={getStatusColor(exec.status)}>
                          {exec.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(exec.started_at)}
                      </p>
                      {exec.metadata?.from && (
                        <p className="text-xs font-medium mt-1">
                          📱 {exec.metadata.from}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Timeline de Nodes */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Timeline de Execução</CardTitle>
            <CardDescription>
              {selectedExecution
                ? `Visualização detalhada - ${selectedExecution.slice(0, 8)}...`
                : 'Selecione uma execução'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedExecution ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                ← Selecione uma execução para ver os detalhes
              </p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Carregando logs...
              </p>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {logs.map((log, index) => (
                    <div key={log.id}>
                      <div className="flex gap-4">
                        {/* Timeline Visual */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(
                              log.status
                            )}`}
                          />
                          {index < logs.length - 1 && (
                            <div className="w-0.5 h-full bg-border" />
                          )}
                        </div>

                        {/* Conteúdo do Log */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{log.node_name}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDuration(log.duration_ms)}</span>
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </div>

                          {/* Input Data */}
                          {log.input_data && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                📥 Input:
                              </p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.input_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Output Data */}
                          {log.output_data && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                📤 Output:
                              </p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.output_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Error */}
                          {log.error && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-red-500 mb-1">
                                ❌ Error:
                              </p>
                              <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto text-red-600 dark:text-red-400">
                                {JSON.stringify(log.error, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Metadata */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Ver metadata
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      {index < logs.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
