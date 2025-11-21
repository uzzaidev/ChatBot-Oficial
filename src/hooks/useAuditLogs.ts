/**
 * Hook: useAuditLogs
 *
 * Hook customizado para buscar audit logs com isolamento multi-tenant
 * RLS (Row Level Security) garante que cada tenant vê apenas seus próprios logs
 *
 * Features:
 * - Auto-refresh configurável
 * - Filtros (action, resource_type, status, user_id)
 * - Paginação
 * - Loading states
 */

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface AuditLog {
  id: string
  created_at: string
  user_id?: string
  user_email?: string
  user_role?: string
  client_id?: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  resource_type: string
  resource_id?: string
  endpoint?: string
  method?: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
  status: 'success' | 'failure'
  error_message?: string
  duration_ms?: number
}

export interface AuditLogsFilters {
  action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  resource_type?: string
  status?: 'success' | 'failure'
  user_id?: string
  since?: string // ISO timestamp
}

export interface UseAuditLogsOptions {
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
  limit?: number
  filters?: AuditLogsFilters
}

export interface UseAuditLogsResult {
  logs: AuditLog[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  applyFilters: (filters: AuditLogsFilters) => void
  clearFilters: () => void
}

/**
 * Hook para buscar audit logs com isolamento multi-tenant
 *
 * @param options - Configurações do hook
 * @returns Audit logs, loading state, e funções auxiliares
 *
 * @example
 * const { logs, loading, error, applyFilters } = useAuditLogs({
 *   autoRefresh: true,
 *   refreshInterval: 5000,
 *   limit: 100
 * })
 */
export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsResult {
  const {
    autoRefresh = false,
    refreshInterval = 10000, // 10 seconds default
    limit = 100,
    filters: initialFilters = {}
  } = options

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogsFilters>(initialFilters)

  const supabase = createClientComponentClient()

  /**
   * Busca audit logs do backend
   */
  const fetchLogs = useCallback(async () => {
    try {
      setError(null)

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Você precisa estar autenticado')
        setLoading(false)
        return
      }

      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0'
      })

      if (filters.action) params.append('action', filters.action)
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.since) params.append('since', filters.since)

      const url = `/api/backend/audit-logs?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar audit logs')
      }

      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setTotal(data.total)
      } else {
        throw new Error('Resposta inválida do servidor')
      }

    } catch (err) {
      console.error('[useAuditLogs] Erro ao buscar logs:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [supabase, limit, filters])

  /**
   * Aplica filtros e recarrega logs
   */
  const applyFilters = useCallback((newFilters: AuditLogsFilters) => {
    setFilters(newFilters)
    setLoading(true)
  }, [])

  /**
   * Limpa todos os filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({})
    setLoading(true)
  }, [])

  /**
   * Recarrega logs manualmente
   */
  const refetch = useCallback(async () => {
    setLoading(true)
    await fetchLogs()
  }, [fetchLogs])

  // Fetch inicial
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLogs()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchLogs])

  return {
    logs,
    total,
    loading,
    error,
    refetch,
    applyFilters,
    clearFilters
  }
}

/**
 * Hook simplificado para buscar audit logs recentes (últimas 24h)
 *
 * @example
 * const { logs, loading } = useRecentAuditLogs()
 */
export function useRecentAuditLogs() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  return useAuditLogs({
    autoRefresh: true,
    refreshInterval: 10000,
    limit: 100,
    filters: { since }
  })
}

/**
 * Hook para buscar audit logs suspeitos (falhas, deleções, operações sensíveis)
 *
 * @example
 * const { logs, loading } = useSuspiciousAuditLogs()
 */
export function useSuspiciousAuditLogs() {
  return useAuditLogs({
    autoRefresh: true,
    refreshInterval: 15000,
    limit: 50,
    filters: { status: 'failure' }
  })
}
