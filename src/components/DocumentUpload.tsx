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

import { useState, useCallback, useEffect } from 'react'
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

interface FileUploadProgress {
  filename: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
  result?: UploadResult
}

export const DocumentUpload = ({ onUploadSuccess }: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [multipleUploads, setMultipleUploads] = useState<FileUploadProgress[]>([])
  const [maxUploadSize, setMaxUploadSize] = useState(10) // MB - será carregado do backend
  const { toast } = useToast()

  // Carregar tamanho máximo do backend
  useEffect(() => {
    const fetchMaxUploadSize = async () => {
      try {
        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/config')
        const data = await response.json()
        
        if (response.ok && data.configs) {
          const maxUploadConfig = data.configs.find((c: any) => c.config_key === 'knowledge_media:max_upload_size_mb')
          if (maxUploadConfig?.config_value !== undefined) {
            setMaxUploadSize(Number(maxUploadConfig.config_value))
          }
        }
      } catch (error) {
        // Usa valor padrão se der erro
        console.error('Erro ao carregar tamanho máximo de upload:', error)
      }
    }
    fetchMaxUploadSize()
  }, [])

  const handleMultipleFilesUpload = useCallback(async (files: File[]) => {
    // Validar quantidade máxima (10 arquivos)
    if (files.length > 10) {
      toast({
        title: 'Muitos arquivos',
        description: 'Você pode fazer upload de até 10 arquivos por vez.',
        variant: 'destructive',
      })
      return
    }

    // Validar cada arquivo
    const validFiles: File[] = []
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    ]

    for (const file of files) {
      const fileName = file.name.toLowerCase()
      const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown')
      const isValidType = allowedTypes.includes(file.type) || isMarkdown
      
      if (!isValidType) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `${file.name}: Apenas arquivos PDF, TXT, MD e imagens são permitidos.`,
          variant: 'destructive',
        })
        continue
      }

      const maxSizeBytes = maxUploadSize * 1024 * 1024
      if (file.size > maxSizeBytes) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name}: O tamanho máximo é ${maxUploadSize}MB.`,
          variant: 'destructive',
        })
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return
    }

    // Se for apenas 1 arquivo, usa o fluxo antigo
    if (validFiles.length === 1) {
      await handleFileUpload(validFiles[0])
      return
    }

    // Múltiplos arquivos - processar em lote
    setIsUploading(true)
    setUploadResult(null)
    
    const uploads: FileUploadProgress[] = validFiles.map(file => ({
      filename: file.name,
      status: 'pending' as const,
    }))
    setMultipleUploads(uploads)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      
      // Atualizar status para uploading
      setMultipleUploads(prev => prev.map((upload, idx) => 
        idx === i ? { ...upload, status: 'uploading' as const } : upload
      ))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'general')

        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = `Erro ${response.status}: ${response.statusText}`
          try {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } catch {
            // Response is not JSON
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Atualizar status para success
        setMultipleUploads(prev => prev.map((upload, idx) => 
          idx === i ? { 
            ...upload, 
            status: 'success' as const,
            result: data
          } : upload
        ))

        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        
        // Atualizar status para error
        setMultipleUploads(prev => prev.map((upload, idx) => 
          idx === i ? { 
            ...upload, 
            status: 'error' as const,
            error: errorMessage
          } : upload
        ))

        errorCount++
      }
    }

    setIsUploading(false)

    // Mostrar resumo
    if (successCount > 0) {
      toast({
        title: 'Upload concluído!',
        description: `${successCount} arquivo(s) processado(s) com sucesso${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
      })
    }

    if (onUploadSuccess && successCount > 0) {
      onUploadSuccess()
    }
  }, [toast, onUploadSuccess, maxUploadSize])

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    ]
    // Also check file extension for .md files (some browsers don't set text/markdown MIME type)
    const fileName = file.name.toLowerCase()
    const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown')
    const isValidType = allowedTypes.includes(file.type) || isMarkdown
    
    if (!isValidType) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas arquivos PDF, TXT, MD e imagens (JPG, PNG, WEBP) são permitidos.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (usar valor do backend)
    const maxSizeBytes = maxUploadSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: `O tamanho máximo é ${maxUploadSize}MB.`,
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

      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      // Handle non-JSON error responses (e.g., 413 Request Entity Too Large)
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Arquivo muito grande para o servidor. Por favor, tente um arquivo menor.')
        }
        // Try to parse JSON error, but handle non-JSON responses gracefully
        let errorMessage = `Erro ${response.status}: ${response.statusText}`
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          // Response is not JSON, use the status text
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

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
  }, [toast, onUploadSuccess, maxUploadSize])

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
      if (files.length === 1) {
        handleFileUpload(files[0])
      } else {
        handleMultipleFilesUpload(files)
      }
    }
  }, [handleFileUpload, handleMultipleFilesUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      if (fileArray.length === 1) {
        handleFileUpload(fileArray[0])
      } else {
        handleMultipleFilesUpload(fileArray)
      }
    }
  }, [handleFileUpload, handleMultipleFilesUpload])

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
          ) : multipleUploads.length > 0 ? (
            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Processando {multipleUploads.length} arquivo(s)...
              </p>
              {multipleUploads.map((upload, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {upload.status === 'uploading' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />}
                    {upload.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    {upload.status === 'error' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    {upload.status === 'pending' && <div className="h-4 w-4 border-2 border-gray-300 rounded-full flex-shrink-0" />}
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{upload.filename}</span>
                  </div>
                  {upload.status === 'success' && upload.result && (
                    <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                      {upload.result.chunks} chunks
                    </span>
                  )}
                  {upload.status === 'error' && (
                    <span className="text-xs text-red-600 dark:text-red-400 ml-2 truncate max-w-[150px]">
                      {upload.error}
                    </span>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMultipleUploads([])
                  setUploadResult(null)
                }}
                className="mt-4"
              >
                Fazer novo upload
              </Button>
            </div>
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
                  Arraste arquivo(s) ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF, TXT, MD ou Imagem (JPG, PNG, WEBP) - máximo {maxUploadSize}MB por arquivo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Você pode selecionar até 10 arquivos por vez
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
                accept=".pdf,.txt,.md,.markdown,.jpg,.jpeg,.png,.webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• <strong>PDFs, TXT e MD:</strong> Extração direta de texto</p>
        <p>• <strong>Imagens:</strong> OCR automático com Tesseract (português)</p>
        <p>• <strong>Processamento:</strong> Chunking semântico + embeddings (OpenAI)</p>
        <p>• <strong>Disponibilidade:</strong> Conhecimento disponível imediatamente após upload</p>
        <p>• <strong>Nota:</strong> Arquivos TXT e MD são usados apenas para RAG (não são enviados como anexo)</p>
      </div>
    </div>
  )
}
