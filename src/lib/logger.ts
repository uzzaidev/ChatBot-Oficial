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
}

class ExecutionLogger {
  private supabase: ReturnType<typeof createClient> | null = null
  private executionId: string | null = null

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
  startExecution(metadata?: Record<string, any>): string {
    this.executionId = crypto.randomUUID()
    
    if (this.supabase) {
      // @ts-ignore - execution_logs table might not exist until migration is run
      this.supabase.from('execution_logs').insert({
        execution_id: this.executionId,
        node_name: '_START',
        status: 'running',
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      }).then()
    }

    return this.executionId
  }

  // Log de entrada em um node
  async logNodeStart(nodeName: string, input?: any): Promise<void> {
    if (!this.executionId || !this.supabase) return

    const startTime = Date.now()

    // @ts-ignore - execution_logs table might not exist until migration is run
    await this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: nodeName,
      input_data: input,
      status: 'running',
      timestamp: new Date().toISOString(),
      metadata: { start_time: startTime },
    })
  }

  // Log de saída de um node com sucesso
  async logNodeSuccess(nodeName: string, output?: any, startTime?: number): Promise<void> {
    if (!this.executionId || !this.supabase) return

    const duration = startTime ? Date.now() - startTime : undefined

    // @ts-ignore - execution_logs table schema
    await this.supabase
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
  }

  // Log de erro em um node
  async logNodeError(nodeName: string, error: any): Promise<void> {
    if (!this.executionId || !this.supabase) return

    // @ts-ignore - execution_logs table schema
    await this.supabase
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
  }

  // Wrapper para executar um node com logging automático
  async executeNode<T>(
    nodeName: string,
    fn: () => Promise<T>,
    input?: any
  ): Promise<T> {
    const startTime = Date.now()
    
    await this.logNodeStart(nodeName, input)

    try {
      const result = await fn()
      await this.logNodeSuccess(nodeName, result, startTime)
      return result
    } catch (error) {
      await this.logNodeError(nodeName, error)
      throw error
    }
  }

  // Finaliza a execução
  async finishExecution(status: 'success' | 'error'): Promise<void> {
    if (!this.executionId || !this.supabase) return

    // @ts-ignore - execution_logs table schema
    await this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: '_END',
      status,
      timestamp: new Date().toISOString(),
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
