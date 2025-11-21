'use client'

/**
 * DocumentUpload Component
 *
 * Drag-and-drop file upload for PDF and TXT documents.
 * Sends files to /api/documents/upload endpoint.
 *
 * Features:
 * - Drag-and-drop interface
 * - File type validation (PDF, TXT)
 * - Size validation (max 10MB)
 * - Upload progress indicator
 * - Success/error notifications
 */

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface DocumentUploadProps {
  onUploadSuccess?: () => void
}

interface UploadResult {
  success: boolean
  filename: string
  chunks: number
  embeddings: number
  usage: {
    embeddingTokens: number
    totalCost: number
  }
}

export const DocumentUpload = ({ onUploadSuccess }: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const { toast } = useToast()

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas arquivos PDF, TXT e imagens (JPG, PNG, WEBP) são permitidos.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', 'general')

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      setUploadResult(data)
      toast({
        title: 'Upload concluído!',
        description: `${data.chunks} chunks criados. Custo: $${data.usage.totalCost.toFixed(4)}`,
      })

      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({
        title: 'Erro no upload',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }, [toast, onUploadSuccess])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  return (
    <div className="space-y-4">
      {/* Drag-and-drop area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-colors duration-200 ease-in-out
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processando documento...
              </p>
            </>
          ) : uploadResult ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {uploadResult.filename}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadResult.chunks} chunks • {uploadResult.embeddings} embeddings • ${uploadResult.usage.totalCost.toFixed(4)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadResult(null)}
              >
                Fazer novo upload
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF, TXT ou Imagem (JPG, PNG, WEBP) - máximo 10MB
                </p>
              </div>
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Selecionar arquivo
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• <strong>PDFs e TXT:</strong> Extração direta de texto</p>
        <p>• <strong>Imagens:</strong> OCR automático com Tesseract (português)</p>
        <p>• <strong>Processamento:</strong> Chunking semântico + embeddings (OpenAI)</p>
        <p>• <strong>Disponibilidade:</strong> Conhecimento disponível imediatamente após upload</p>
      </div>
    </div>
  )
}
