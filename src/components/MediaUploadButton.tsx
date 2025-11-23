'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Image as ImageIcon, FileText, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MediaUploadButtonProps {
  onFileSelect: (file: File, type: 'image' | 'document') => void
}

export const MediaUploadButton = ({ onFileSelect }: MediaUploadButtonProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File, type: 'image' | 'document') => {
    // Validar tamanho
    const maxSize = type === 'document' ? 100 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: `Tamanho máximo: ${maxSize / (1024 * 1024)} MB`,
        variant: 'destructive'
      })
      return
    }

    // Chamar callback do pai
    onFileSelect(file, type)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            title="Anexar arquivo"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Imagem
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(file, 'image')
            e.target.value = '' // Reset input
          }
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(file, 'document')
            e.target.value = '' // Reset input
          }
        }}
      />
    </>
  )
}
