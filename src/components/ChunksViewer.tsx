'use client'

/**
 * ChunksViewer Component
 *
 * Modal to view and add chunks for a document.
 *
 * Features:
 * - View all extracted chunks
 * - See chunk content and metadata
 * - Add manual chunks with tags
 */

import { useState, useEffect } from 'react'
import { X, Plus, FileText, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

interface Chunk {
  id: string
  content: string
  chunkIndex: number
  tokenCount: number
  metadata: {
    isManual?: boolean
    tags?: string[]
    addedBy?: string
    addedAt?: string
  }
}

interface ChunksViewerProps {
  filename: string
  isOpen: boolean
  onClose: () => void
}

export const ChunksViewer = ({ filename, isOpen, onClose }: ChunksViewerProps) => {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingChunk, setIsAddingChunk] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newChunkContent, setNewChunkContent] = useState('')
  const [newChunkTags, setNewChunkTags] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchChunks()
    }
  }, [isOpen, filename])

  const fetchChunks = async () => {
    setIsLoading(true)
    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch(
        `/api/documents/chunks?filename=${encodeURIComponent(filename)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch chunks')
      }

      const data = await response.json()
      setChunks(data.chunks)
    } catch (error) {
      toast({
        title: 'Erro ao carregar chunks',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddChunk = async () => {
    if (!newChunkContent.trim()) {
      toast({
        title: 'Conteúdo vazio',
        description: 'Por favor, adicione o conteúdo do chunk',
        variant: 'destructive',
      })
      return
    }

    setIsAddingChunk(true)
    try {
      const tags = newChunkTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/documents/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          content: newChunkContent,
          tags,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add chunk')
      }

      toast({
        title: 'Chunk adicionado!',
        description: 'O chunk manual foi adicionado com sucesso.',
      })

      // Reset form and refresh chunks
      setNewChunkContent('')
      setNewChunkTags('')
      setShowAddForm(false)
      fetchChunks()
    } catch (error) {
      toast({
        title: 'Erro ao adicionar chunk',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsAddingChunk(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chunks do Documento
          </DialogTitle>
          <DialogDescription>
            {filename}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add chunk button */}
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Chunk Manual
              </Button>
            )}

            {/* Add chunk form */}
            {showAddForm && (
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Novo Chunk Manual</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Conteúdo do Chunk</label>
                  <Textarea
                    value={newChunkContent}
                    onChange={(e) => setNewChunkContent(e.target.value)}
                    placeholder="Digite o conteúdo adicional que você quer que a IA use para responder perguntas..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Tags (separadas por vírgula)
                  </label>
                  <Input
                    value={newChunkTags}
                    onChange={(e) => setNewChunkTags(e.target.value)}
                    placeholder="Ex: preço, valor, tabela, 2025"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tags ajudam a IA encontrar este chunk quando relevante
                  </p>
                </div>

                <Button
                  onClick={handleAddChunk}
                  disabled={isAddingChunk}
                  className="w-full"
                >
                  {isAddingChunk ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Chunk
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Chunks list */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">
                Chunks Existentes ({chunks.length})
              </h4>
              {chunks.map((chunk, index) => (
                <div
                  key={chunk.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        Chunk {index + 1}
                      </span>
                      {chunk.metadata?.isManual && (
                        <Badge variant="secondary" className="text-xs">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {chunk.tokenCount} tokens
                    </span>
                  </div>

                  {chunk.metadata?.tags && chunk.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chunk.metadata.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {chunk.content}
                  </p>

                  {chunk.metadata?.isManual && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Adicionado por {chunk.metadata.addedBy} em{' '}
                      {new Date(chunk.metadata.addedAt || '').toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
