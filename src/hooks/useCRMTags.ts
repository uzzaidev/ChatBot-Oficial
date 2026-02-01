'use client'

import { useCallback, useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import type { CRMTag } from '@/lib/types'

interface UseCRMTagsResult {
  tags: CRMTag[]
  loading: boolean
  error: string | null
  createTag: (data: { name: string; color?: string; description?: string }) => Promise<CRMTag | null>
  updateTag: (id: string, data: { name?: string; color?: string; description?: string }) => Promise<CRMTag | null>
  deleteTag: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export const useCRMTags = (clientId: string | null): UseCRMTagsResult => {
  const [tags, setTags] = useState<CRMTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await apiFetch('/api/crm/tags')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch tags')
      }

      const data = await response.json()
      setTags(data.tags || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching CRM tags:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Auto-fetch on mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const createTag = useCallback(
    async (data: { name: string; color?: string; description?: string }) => {
      try {
        const response = await apiFetch('/api/crm/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create tag')
        }

        const result = await response.json()
        await fetchTags() // Refresh list
        return result.tag
      } catch (err: any) {
        setError(err.message)
        console.error('Error creating tag:', err)
        return null
      }
    },
    [fetchTags]
  )

  const updateTag = useCallback(
    async (id: string, data: { name?: string; color?: string; description?: string }) => {
      try {
        const response = await apiFetch(`/api/crm/tags/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update tag')
        }

        const result = await response.json()
        await fetchTags() // Refresh list
        return result.tag
      } catch (err: any) {
        setError(err.message)
        console.error('Error updating tag:', err)
        return null
      }
    },
    [fetchTags]
  )

  const deleteTag = useCallback(
    async (id: string) => {
      try {
        const response = await apiFetch(`/api/crm/tags/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete tag')
        }

        await fetchTags() // Refresh list
        return true
      } catch (err: any) {
        setError(err.message)
        console.error('Error deleting tag:', err)
        return false
      }
    },
    [fetchTags]
  )

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    refetch: fetchTags,
  }
}
