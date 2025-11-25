'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { MediaUploadButton } from '@/components/MediaUploadButton'
import { AudioRecorder } from '@/components/AudioRecorder'
import { MediaPreview, type MediaAttachment } from '@/components/MediaPreview'
import type { Message } from '@/lib/types'

const MAX_TEXTAREA_HEIGHT = 120 // Maximum height for textarea expansion (about 5 lines)
const MIN_TEXTAREA_HEIGHT = 40 // Minimum height for textarea

interface SendMessageFormProps {
  phone: string
  clientId: string
  onMessageSent?: () => void
  attachments: MediaAttachment[]
  onAddAttachment: (file: File, type: 'image' | 'document') => void
  onRemoveAttachment: (index: number) => void
  onClearAttachments: () => void
  onOptimisticMessage?: (message: Message) => void
  onMessageError?: (tempId: string) => void
}

export const SendMessageForm = ({
  phone,
  clientId,
  onMessageSent,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onClearAttachments,
  onOptimisticMessage,
  onMessageError,
}: SendMessageFormProps) => {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea like WhatsApp
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
      textarea.style.height = `${newHeight}px`
    }
  }, [content])

  const handleSendMessage = async () => {
    // Validação: precisa ter texto OU anexos
    if (!content.trim() && attachments.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Digite uma mensagem ou anexe um arquivo',
        variant: 'destructive',
      })
      return
    }

    // Gerar ID temporário para mensagem otimista
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Criar mensagem otimista (só para texto, não para anexos)
    let optimisticMessage: Message | null = null
    if (content.trim() && attachments.length === 0) {
      optimisticMessage = {
        id: tempId,
        client_id: clientId,
        conversation_id: phone,
        phone: phone,
        name: 'Você',
        content: content.trim(),
        type: 'text',
        direction: 'outgoing',
        status: 'sending',
        timestamp: new Date().toISOString(),
        metadata: null,
      }

      // Adicionar mensagem otimisticamente à UI
      if (onOptimisticMessage) {
        onOptimisticMessage(optimisticMessage)
      }
    }

    try {
      setSending(true)

      // Enviar anexos primeiro (se houver)
      if (attachments.length > 0) {
        const { apiFetch } = await import('@/lib/api')
        for (const attachment of attachments) {
          const formData = new FormData()
          formData.append('phone', phone)
          formData.append('file', attachment.file)
          formData.append('type', attachment.type)

          // Se for o último anexo e tiver texto, adiciona como caption
          const isLast = attachments.indexOf(attachment) === attachments.length - 1
          if (isLast && content.trim()) {
            formData.append('caption', content.trim())
          }

          const response = await apiFetch('/api/commands/send-media', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao enviar anexo')
          }
        }

        // Se tinha texto e foi usado como caption, não envia mensagem separada
        if (content.trim() && attachments.length > 0) {
          // Texto já foi enviado como caption do último anexo
        }
      } else {
        // Sem anexos, envia só mensagem de texto
        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/commands/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            content: content.trim(),
            client_id: clientId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao enviar mensagem')
        }
      }

      // Sucesso - mensagem já está na UI (otimista)
      // Realtime vai receber a mensagem confirmada do servidor e substituir

      // Mostrar toast apenas para anexos (texto já apareceu otimisticamente)
      if (attachments.length > 0) {
        toast({
          title: 'Sucesso',
          description: `${attachments.length} arquivo(s) enviado(s)`,
        })
      }

      // Limpar tudo
      setContent('')
      onClearAttachments()

      if (onMessageSent) {
        onMessageSent()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      // Reverter mensagem otimista em caso de erro
      if (optimisticMessage && onMessageError) {
        onMessageError(tempId)
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const hasContentOrAttachments = content.trim() || attachments.length > 0

  return (
    <div className="flex flex-col gap-2">
      {/* Preview de anexos */}
      <MediaPreview
        attachments={attachments}
        onRemove={onRemoveAttachment}
      />

      <div className="flex items-end gap-2 bg-white rounded-lg p-2 w-full overflow-hidden">
        {/* Botão de anexar mídia (+) - esconde quando gravando OU tem áudio gravado */}
        {!isRecording && !hasRecordedAudio && (
          <div className="flex-shrink-0">
            <MediaUploadButton
              onFileSelect={onAddAttachment}
            />
          </div>
        )}

        {/* Textarea de mensagem - esconde quando gravando OU tem áudio gravado */}
        {!isRecording && !hasRecordedAudio && (
          <textarea
            ref={textareaRef}
            placeholder="Digite sua mensagem..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1 min-w-0 resize-none border-0 bg-white px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-0 rounded-lg max-h-[120px] min-h-[40px]"
            rows={1}
          />
        )}

        {/* Botão de gravar áudio OU enviar mensagem */}
        {hasContentOrAttachments ? (
          <Button
            onClick={handleSendMessage}
            disabled={sending}
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 rounded-full flex-shrink-0 bg-mint-600 hover:bg-mint-700"
            title="Enviar mensagem (Enter)"
          >
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        ) : (
          <AudioRecorder
            phone={phone}
            clientId={clientId}
            onAudioSent={onMessageSent}
            onRecordingChange={setIsRecording}
            onAudioRecorded={setHasRecordedAudio}
          />
        )}
      </div>
    </div>
  )
}
