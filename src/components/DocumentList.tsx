'use client'

/**
 * DocumentList Component
 *
 * Displays list of uploaded documents with actions (view, delete).
 * Fetches data from /api/documents endpoint.
 *
 * Features:
 * - Real-time document list
 * - File type icons
 * - Chunk count display
 * - Delete confirmation dialog
 * - Empty state
 */

import { useState, useEffect, useCallback } from 'react'
import { FileText, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Document {
  id: string
  filename: string
  documentType: string
  chunkCount: number
  uploadedAt: string
  uploadedBy: string
}

interface DocumentListProps {
  refreshTrigger?: number
}

export const DocumentList = ({ refreshTrigger }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/documents')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar documentos')
      }

      setDocuments(data.documents || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast({
        title: 'Erro ao carregar documentos',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDocuments()
  }, [refreshTrigger, fetchDocuments])

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)

    try {
      const { apiFetch } = await import('@/lib/api')
      const encodedFilename = encodeURIComponent(documentToDelete.filename)
      const response = await apiFetch(`/api/documents/${encodedFilename}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar documento')
      }

      toast({
        title: 'Documento deletado',
        description: `${data.deletedChunks} chunks removidos.`,
      })

      // Refresh list
      await fetchDocuments()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({
        title: 'Erro ao deletar',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum documento carregado ainda.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Faça upload de PDFs ou TXTs para adicionar conhecimento ao chatbot.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {documents.length} documento{documents.length !== 1 ? 's' : ''} carregado{documents.length !== 1 ? 's' : ''}
        </div>

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start space-x-3 flex-1">
              <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {doc.filename}
                </p>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{doc.chunkCount} chunks</span>
                  <span>•</span>
                  <span>{doc.documentType}</span>
                  <span>•</span>
                  <span>{formatDate(doc.uploadedAt)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(doc)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o documento <strong>{documentToDelete?.filename}</strong>?
              <br />
              <br />
              Isso removerá <strong>{documentToDelete?.chunkCount} chunks</strong> do banco de dados
              e o conhecimento não estará mais disponível para o chatbot.
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
