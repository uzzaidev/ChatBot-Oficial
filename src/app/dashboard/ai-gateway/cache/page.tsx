'use client'

/**
 * AI GATEWAY CACHE PAGE
 *
 * View and manage AI Gateway cache
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, RefreshCw, Search, Zap, Clock } from 'lucide-react'

interface CacheEntry {
  cacheKey: string
  promptPreview: string
  hitCount: number
  tokensSaved: number
  savingsBRL: number
  lastAccessedAt: string
  expiresAt: string
  ttlSeconds: number
}

export default function AIGatewayCachePage() {
  const [loading, setLoading] = useState(true)
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<CacheEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchCacheEntries()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = cacheEntries.filter(entry =>
        entry.promptPreview.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredEntries(filtered)
    } else {
      setFilteredEntries(cacheEntries)
    }
  }, [searchQuery, cacheEntries])

  const fetchCacheEntries = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-gateway/cache')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch cache')
      }

      const data = await response.json()
      setCacheEntries(data.entries || [])
      setFilteredEntries(data.entries || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvalidate = async (cacheKey: string) => {
    if (!confirm('Tem certeza que deseja invalidar este cache entry?')) {
      return
    }

    try {
      const response = await fetch('/api/ai-gateway/cache', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to invalidate cache')
      }

      setSuccess('Cache invalidado com sucesso')
      fetchCacheEntries()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja limpar TODO o cache? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch('/api/ai-gateway/cache', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: 'ALL' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear cache')
      }

      setSuccess('Todo o cache foi limpo com sucesso')
      fetchCacheEntries()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatTTL = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const totalSavings = cacheEntries.reduce((sum, entry) => sum + entry.savingsBRL, 0)
  const totalHits = cacheEntries.reduce((sum, entry) => sum + entry.hitCount, 0)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cache do AI Gateway</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie o cache de respostas do AI Gateway
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCacheEntries}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Entries</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheEntries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Em cache ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Hits</CardTitle>
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHits.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-1">Respostas servidas do cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Economia estimada</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cache Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma entry em cache'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Entries em Cache ({filteredEntries.length})</CardTitle>
            <CardDescription>Top 50 prompts mais acessados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.cacheKey}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.promptPreview}</p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Hits: {entry.hitCount}</span>
                      <span>Tokens salvos: {entry.tokensSaved.toLocaleString('pt-BR')}</span>
                      <span>Economia: R$ {entry.savingsBRL.toFixed(2)}</span>
                      <span>TTL: {formatTTL(entry.ttlSeconds)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Último acesso: {new Date(entry.lastAccessedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInvalidate(entry.cacheKey)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
