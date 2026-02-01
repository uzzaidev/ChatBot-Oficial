import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface FilterPreference {
  id: string
  filter_type: 'default' | 'tag' | 'column'
  filter_id: string | null
  default_filter_value: string | null
  enabled: boolean
  position: number
  label: string
  icon: string
  color: string
  count: number
}

export interface FilterPreferenceInput {
  filter_type: 'default' | 'tag' | 'column'
  filter_id?: string
  default_filter_value?: string
  enabled?: boolean
  position?: number
  custom_label?: string
  custom_icon?: string
  custom_color?: string
}

interface UseFilterPreferencesReturn {
  filters: FilterPreference[]
  loading: boolean
  error: string | null
  saveFilters: (filters: FilterPreferenceInput[]) => Promise<boolean>
  updateFilter: (id: string, updates: { enabled?: boolean; position?: number }) => Promise<boolean>
  refetch: () => Promise<void>
}

/**
 * Hook para gerenciar preferências de filtros do usuário
 *
 * Integra com crm_tags e crm_columns para mostrar tags e estágios do funil
 * no header de conversações.
 *
 * @example
 * const { filters, loading, saveFilters } = useFilterPreferences()
 */
export const useFilterPreferences = (): UseFilterPreferencesReturn => {
  const { toast } = useToast()
  const [filters, setFilters] = useState<FilterPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Busca as preferências de filtros do usuário
   */
  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/filters/preferences', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar filtros')
      }

      const data = await response.json()
      setFilters(data.filters || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar filtros:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Salva/atualiza as preferências de filtros
   */
  const saveFilters = useCallback(async (newFilters: FilterPreferenceInput[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/filters/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: newFilters }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar filtros')
      }

      const data = await response.json()
      setFilters(data.filters || [])

      toast({
        title: 'Filtros salvos!',
        description: 'Suas preferências foram atualizadas com sucesso.',
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'destructive',
      })

      console.error('Erro ao salvar filtros:', err)
      return false
    }
  }, [toast])

  /**
   * Atualiza um filtro específico (enabled ou position)
   */
  const updateFilter = useCallback(async (
    id: string,
    updates: { enabled?: boolean; position?: number }
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/filters/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar filtro')
      }

      // Atualizar localmente
      setFilters(prev => prev.map(filter =>
        filter.id === id
          ? { ...filter, ...updates }
          : filter
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      toast({
        title: 'Erro ao atualizar',
        description: errorMessage,
        variant: 'destructive',
      })

      console.error('Erro ao atualizar filtro:', err)
      return false
    }
  }, [toast])

  /**
   * Refetch manual
   */
  const refetch = useCallback(async () => {
    await fetchFilters()
  }, [fetchFilters])

  // Fetch inicial
  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  return {
    filters,
    loading,
    error,
    saveFilters,
    updateFilter,
    refetch,
  }
}
