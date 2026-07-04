'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Image as ImageIcon, FileText, Loader2, MessageSquare } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { toast } from '@/hooks/use-toast'
import { pickImageNative } from '@/lib/nativeCamera'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MediaUploadButtonProps {
  onFileSelect: (file: File, type: 'image' | 'document') => void
  onTemplateSelect?: () => void
}

export const MediaUploadButton = ({ onFileSelect, onTemplateSelect }: MediaUploadButtonProps) => {
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

  const handlePickImage = async () => {
    // No app nativo, usa @capacitor/camera em vez do <input accept="image/*">
    // puro: evita o action sheet nativo da WKWebView, que crasha com fotos
    // de alta resolução (ver src/lib/nativeCamera.ts).
    if (Capacitor.isNativePlatform()) {
      try {
        const file = await pickImageNative()
        if (file) {
          handleFileUpload(file, 'image')
        }
      } catch {
        // Usuário cancelou a captura/seleção — nada a fazer
      }
      return
    }
    imageInputRef.current?.click()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            title="Anexar arquivo ou enviar template"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handlePickImage}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Imagem
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </DropdownMenuItem>
          {onTemplateSelect && (
            <DropdownMenuItem onClick={onTemplateSelect}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Template
            </DropdownMenuItem>
          )}
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
