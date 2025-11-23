'use client'

import { useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DragDropZoneProps {
  onFileSelect: (file: File, type: 'image' | 'document') => void
  children: React.ReactNode
}

export const DragDropZone = ({ onFileSelect, children }: DragDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Só remove o dragging se estiver saindo da zona principal
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
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

    if (files.length === 0) {
      return
    }

    // Processar todos os arquivos (permite múltiplos)
    files.forEach(file => {
      // Determinar tipo de mídia baseado no MIME type
      let mediaType: 'image' | 'document' | null = null

      if (file.type.startsWith('image/')) {
        mediaType = 'image'
      } else if (
        file.type === 'application/pdf' ||
        file.type.includes('document') ||
        file.type.includes('text') ||
        file.type.includes('spreadsheet')
      ) {
        mediaType = 'document'
      }

      if (!mediaType) {
        toast({
          title: 'Tipo de arquivo não suportado',
          description: 'Arraste apenas imagens ou documentos (PDF, DOC, TXT, XLS)',
          variant: 'destructive'
        })
        return
      }

      // Validar tamanho
      const maxSize = mediaType === 'document' ? 100 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: `Tamanho máximo: ${maxSize / (1024 * 1024)} MB`,
          variant: 'destructive'
        })
        return
      }

      // Chamar callback do pai
      onFileSelect(file, mediaType)
    })
  }, [onFileSelect])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-full h-full"
    >
      {children}

      {/* Overlay de drag */}
      {isDragging && (
        <div className="absolute inset-0 bg-mint-500/20 border-2 border-dashed border-mint-600 rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <Upload className="h-12 w-12 text-mint-600 mx-auto mb-2" />
            <p className="text-lg font-semibold text-mint-900">
              Solte o arquivo aqui
            </p>
            <p className="text-sm text-mint-600">
              Imagens ou documentos
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
