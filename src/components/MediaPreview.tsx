'use client'

import { X, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MediaAttachment {
  file: File
  type: 'image' | 'document'
  preview?: string
}

interface MediaPreviewProps {
  attachments: MediaAttachment[]
  onRemove: (index: number) => void
}

export const MediaPreview = ({ attachments, onRemove }: MediaPreviewProps) => {
  if (attachments.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-2">
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-silver-100 border border-silver-200"
        >
          {/* Preview */}
          {attachment.type === 'image' && attachment.preview ? (
            <img
              src={attachment.preview}
              alt={attachment.file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <FileText className="h-8 w-8 text-silver-400 mb-1" />
              <p className="text-xs text-silver-600 truncate w-full text-center">
                {attachment.file.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          )}

          {/* Botão remover */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="absolute top-0 right-0 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Nome do arquivo (tooltip ao hover) */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
            {attachment.file.name}
          </div>
        </div>
      ))}
    </div>
  )
}
