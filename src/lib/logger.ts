import { createClient } from '@supabase/supabase-js'

// Logger estruturado para debug de execução de nodes
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ExecutionContext {
  execution_id: string // UUID único para cada execução completa
  node_name: string
  input_data?: any
  output_data?: any
  error?: any
  duration_ms?: number
  status: 'running' | 'success' | 'error'
  timestamp: string
  metadata?: Record<string, any>
  client_id?: string // UUID do cliente (tenant) para isolamento multi-tenant
}

class ExecutionLogger {
  private supabase: ReturnType<typeof createClient> | null = null
  private executionId: string | null = null
  private clientId: string | null = null // ⚡ Tenant ID for multi-tenant isolation

  constructor() {
    // Initialize Supabase client only in server context
    if (typeof window === 'undefined') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey)
      }
    }
  }

  // Inicia uma nova execução e retorna o ID
  // ⚡ MULTI-TENANT: clientId é obrigatório para isolamento por tenant
  startExecution(metadata?: Record<string, any>, clientId?: string): string {
    this.executionId = crypto.randomUUID()
    this.clientId = clientId || null

    if (this.supabase) {
      // @ts-ignore - execution_logs table might not exist until migration is run
      this.supabase.from('execution_logs').insert({
        execution_id: this.executionId,
        node_name: '_START',
        status: 'running',
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
        client_id: this.clientId, // ⚡ Tenant isolation
      }).then()
    }

    return this.executionId
  }

  // Log de entrada em um node (fire-and-forget - não bloqueia)
  logNodeStart(nodeName: string, input?: any): void {
    if (!this.executionId || !this.supabase) return

    const startTime = Date.now()

    // Fire-and-forget - não bloqueia execução
    // @ts-ignore - execution_logs table optional
    this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: nodeName,
      input_data: input,
      status: 'running',
      timestamp: new Date().toISOString(),
      metadata: { start_time: startTime },
      client_id: this.clientId, // ⚡ Tenant isolation
    // @ts-ignore
    }).then(result => {
      if (result.error) {
      }
    // @ts-ignore
    }).catch((err: any) => {
    })
  }

  // Log de saída de um node com sucesso (fire-and-forget)
  logNodeSuccess(nodeName: string, output?: any, startTime?: number): void {
    if (!this.executionId || !this.supabase) return

    const duration = startTime ? Date.now() - startTime : undefined

    // Fire-and-forget - não bloqueia execução
    // @ts-ignore - execution_logs table optional
    this.supabase
      .from('execution_logs')
      // @ts-ignore
      .update({
        output_data: output,
        status: 'success',
        duration_ms: duration,
      })
      .eq('execution_id', this.executionId)
      .eq('node_name', nodeName)
      .eq('status', 'running')
      // @ts-ignore
      .then(result => {
        if (result.error) {
        }
      // @ts-ignore
      }).catch((err: any) => {
      })
  }

  // Log de erro em um node (fire-and-forget)
  logNodeError(nodeName: string, error: any): void {
    if (!this.executionId || !this.supabase) return

    // Fire-and-forget - não bloqueia execução
    // @ts-ignore - execution_logs table optional
    this.supabase
      .from('execution_logs')
      // @ts-ignore
      .update({
        error: {
          message: error.message || String(error),
          stack: error.stack,
          name: error.name,
        },
        status: 'error',
      })
      .eq('execution_id', this.executionId)
      .eq('node_name', nodeName)
      .eq('status', 'running')
      // @ts-ignore
      .then(result => {
        if (result.error) {
        }
      // @ts-ignore
      }).catch((err: any) => {
      })
  }

  // Wrapper para executar um node com logging automático
  async executeNode<T>(
    nodeName: string,
    fn: () => Promise<T>,
    input?: any
  ): Promise<T> {
    const startTime = Date.now()
    
    this.logNodeStart(nodeName, input) // Sem await - fire-and-forget

    try {
      const result = await fn()
      this.logNodeSuccess(nodeName, result, startTime) // Sem await - fire-and-forget
      return result
    } catch (error) {
      this.logNodeError(nodeName, error) // Sem await - fire-and-forget
      throw error
    }
  }

  // Finaliza a execução (fire-and-forget)
  finishExecution(status: 'success' | 'error'): void {
    if (!this.executionId || !this.supabase) return

    // Fire-and-forget - não bloqueia execução
    // @ts-ignore - execution_logs table optional
    this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: '_END',
      status,
      timestamp: new Date().toISOString(),
      client_id: this.clientId, // ⚡ Tenant isolation
    // @ts-ignore
    }).then(result => {
      if (result.error) {
      }
    // @ts-ignore
    }).catch((err: any) => {
    })
  }

  // Retorna o execution_id atual
  getExecutionId(): string | null {
    return this.executionId
  }
}

// Singleton para uso global
let loggerInstance: ExecutionLogger | null = null

export const getLogger = (): ExecutionLogger => {
  if (!loggerInstance) {
    loggerInstance = new ExecutionLogger()
  }
  return loggerInstance
}

// Helper para criar um novo logger para cada execução
export const createExecutionLogger = (): ExecutionLogger => {
  return new ExecutionLogger()
}
