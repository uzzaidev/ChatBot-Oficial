'use client'

import type { Message, StoredMediaMetadata } from '@/lib/types'
import { FileText, Download, Play, File, Check, CheckCheck, Clock, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { MessageActionMenu } from '@/components/MessageActionMenu'
import { AudioMessage } from '@/components/AudioMessage'
import { InteractiveButtonsMessage } from '@/components/InteractiveButtonsMessage'
import { InteractiveListMessage } from '@/components/InteractiveListMessage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  message: Message
  onReaction?: (messageId: string, emoji: string) => Promise<void>
  onDelete?: (messageId: string, mediaUrl?: string) => Promise<void>
}

// Type guard for stored media metadata
const isStoredMediaMetadata = (obj: unknown): obj is StoredMediaMetadata => {
  if (!obj || typeof obj !== 'object') return false
  const meta = obj as Record<string, unknown>
  return (
    typeof meta.type === 'string' &&
    ['image', 'audio', 'document', 'video'].includes(meta.type) &&
    typeof meta.url === 'string' &&
    typeof meta.mimeType === 'string'
  )
}

// Type guards for interactive message metadata
interface InteractiveButtonsMetadata {
  type: 'button'
  body: string
  footer?: string
  buttons: Array<{ id: string; title: string }>
}

interface InteractiveListMetadata {
  type: 'list'
  header?: string
  body: string
  footer?: string
  buttonText: string
  sections: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
}

// Type guard for template message metadata
interface TemplateMessageMetadata {
  template_id: string
  template_name: string
  template_components?: Array<{
    type: string
    text?: string
    format?: string
    buttons?: Array<{ type: string; text: string }>
  }>
  parameters?: string[]
  whatsapp_message_id?: string
}

type InteractiveMetadata = InteractiveButtonsMetadata | InteractiveListMetadata

const isInteractiveMetadata = (obj: unknown): obj is InteractiveMetadata => {
  if (!obj || typeof obj !== 'object') return false
  const meta = obj as Record<string, unknown>
  return (
    typeof meta.type === 'string' &&
    (meta.type === 'button' || meta.type === 'list')
  )
}

const isTemplateMetadata = (obj: unknown): obj is TemplateMessageMetadata => {
  if (!obj || typeof obj !== 'object') return false
  const meta = obj as Record<string, unknown>
  return (
    typeof meta.template_id === 'string' &&
    typeof meta.template_name === 'string'
  )
}

export const MessageBubble = ({ message, onReaction, onDelete }: MessageBubbleProps) => {
  const isIncoming = message.direction === 'incoming'
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 📎 Extract media metadata from message with type guard
  const rawMediaMetadata = message.metadata && typeof message.metadata === 'object' 
    ? (message.metadata as Record<string, unknown>).media 
    : null
  const mediaMetadata: StoredMediaMetadata | null = isStoredMediaMetadata(rawMediaMetadata) ? rawMediaMetadata : null
  const hasRealMedia = mediaMetadata !== null

  // 🔘 Extract interactive message metadata
  const rawInteractiveMetadata = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>).interactive
    : null
  const interactiveMetadata: InteractiveMetadata | null = isInteractiveMetadata(rawInteractiveMetadata) 
    ? rawInteractiveMetadata 
    : null

  // 📝 Extract template message metadata
  const templateMetadata: TemplateMessageMetadata | null = 
    message.metadata && typeof message.metadata === 'object' && isTemplateMetadata(message.metadata)
      ? message.metadata as TemplateMessageMetadata
      : null

  // 📱 Extract wamid for WhatsApp reactions
  const wamid = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>).wamid as string | undefined
    : undefined

  // ❌ Extract error details for failed status
  const errorDetails = (() => {
    if (!message.metadata || typeof message.metadata !== 'object') return null
    const raw = (message.metadata as Record<string, unknown>).error_details
    if (!raw) return null

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as Record<string, unknown>
      } catch {
        return { message: raw }
      }
    }

    if (typeof raw === 'object') {
      return raw as Record<string, unknown>
    }

    return null
  })()

  const errorHint = (() => {
    const code = typeof (errorDetails as any)?.code === 'number' ? (errorDetails as any).code : null
    if (code === 131047) {
      return 'Janela de 24h fechada (re-engagement). Envie um template e aguarde o usuário responder para reabrir a janela.'
    }
    return null
  })()
  
  // Fallback for legacy messages without real media
  const hasLegacyMediaTag = message.content.match(/\[(image|imagem|audio|áudio|document|documento|documento:[^\]]*)\]/i)
  const legacyFilename = message.content.match(/\[(?:documento:\s*)?([^\]]+)\]/i)?.[1]?.trim() || 'Arquivo'

  // Render real image
  const renderImage = () => {
    if (!mediaMetadata || imageError) return null
    
    return (
      <div className="relative mb-2 rounded-lg overflow-hidden max-w-[280px]">
        <Image
          src={mediaMetadata.url}
          alt={mediaMetadata.filename || 'Imagem'}
          width={280}
          height={200}
          className="object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(mediaMetadata.url, '_blank')}
          onError={() => setImageError(true)}
          unoptimized
        />
        <a
          href={mediaMetadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
          title="Abrir imagem"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    )
  }

  // Render real audio
  const renderAudio = () => {
    if (!mediaMetadata) return null

    // Check if message has transcription and duration (TTS message)
    const transcription = (message as any).transcription || ''
    const audioDuration = (message as any).audio_duration_seconds || 0

    // Use AudioMessage component with waveform and transcription
    return (
      <AudioMessage
        audioUrl={mediaMetadata.url}
        transcription={transcription}
        durationSeconds={audioDuration}
        direction={isIncoming ? 'inbound' : 'outbound'}
        timestamp={message.timestamp}
      />
    )
  }

  // Render real document (PDF, etc)
  const renderDocument = () => {
    if (!mediaMetadata) return null
    
    const isPDF = mediaMetadata.mimeType?.includes('pdf')
    const filename = mediaMetadata.filename || 'Documento'
    const fileSize = mediaMetadata.size ? formatFileSize(mediaMetadata.size) : ''
    
    return (
      <div className="mb-2">
        <a
          href={mediaMetadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            isIncoming 
              ? 'bg-silver-50 hover:bg-silver-100 border-silver-200' 
              : 'bg-white/10 hover:bg-white/20 border-white/20'
          }`}
        >
          <div className={`p-2 rounded-lg ${isPDF ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isPDF ? (
              <FileText className="h-6 w-6 text-red-600" />
            ) : (
              <File className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isIncoming ? 'text-erie-black-800' : 'text-white'}`}>
              {filename}
            </p>
            {fileSize && (
              <p className={`text-xs ${isIncoming ? 'text-erie-black-500' : 'text-white/70'}`}>
                {fileSize}
              </p>
            )}
          </div>
          <Download className={`h-5 w-5 flex-shrink-0 ${isIncoming ? 'text-erie-black-400' : 'text-white/70'}`} />
        </a>
      </div>
    )
  }

  // Render legacy media tag (fallback for old messages)
  const renderLegacyMedia = () => {
    // Check if it's a document with filename in the tag
    const docMatch = message.content.match(/\[documento:\s*([^\]]+)\]/i)
    const displayName = docMatch ? docMatch[1].trim() : legacyFilename
    
    return (
      <div className={`flex items-center gap-2 mb-1 p-2 rounded-lg ${isIncoming ? 'bg-silver-50' : 'bg-white/10'}`}>
        <FileText className="h-5 w-5" />
        <span className="font-medium text-sm">{displayName || 'Arquivo enviado'}</span>
      </div>
    )
  }

  // Render template message content
  const renderTemplateMessage = () => {
    if (!templateMetadata) return null

    // Get the body component from template
    const bodyComponent = templateMetadata.template_components?.find(c => c.type === 'BODY')
    let bodyText = bodyComponent?.text || ''

    // Replace variables with parameters
    if (templateMetadata.parameters && bodyComponent?.text) {
      templateMetadata.parameters.forEach((param, index) => {
        const placeholder = `{{${index + 1}}}`
        bodyText = bodyText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), param)
      })
    }

    return (
      <div className="space-y-2">
        {/* Template header with badge */}
        <div className={`flex items-center gap-2 pb-2 border-b ${isIncoming ? 'border-silver-200' : 'border-white/20'}`}>
          <div className={`px-2 py-0.5 rounded text-xs font-medium ${
            isIncoming ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
          }`}>
            Template
          </div>
          <span className={`text-xs font-medium ${isIncoming ? 'text-erie-black-600' : 'text-white/80'}`}>
            {templateMetadata.template_name}
          </span>
        </div>

        {/* Template body content */}
        {bodyText && (
          <div className="text-sm md:text-base whitespace-pre-wrap">
            {bodyText}
          </div>
        )}

        {/* Footer if exists */}
        {templateMetadata.template_components?.find(c => c.type === 'FOOTER') && (
          <div className={`text-xs pt-2 border-t ${
            isIncoming ? 'border-silver-200 text-erie-black-500' : 'border-white/20 text-white/70'
          }`}>
            {templateMetadata.template_components.find(c => c.type === 'FOOTER')?.text}
          </div>
        )}

        {/* Buttons if exist */}
        {templateMetadata.template_components?.find(c => c.type === 'BUTTONS')?.buttons && (
          <div className="flex flex-col gap-1 pt-2">
            {templateMetadata.template_components
              .find(c => c.type === 'BUTTONS')
              ?.buttons?.map((button, index) => (
                <div
                  key={index}
                  className={`text-center py-2 px-3 rounded text-sm font-medium ${
                    isIncoming 
                      ? 'bg-silver-100 text-erie-black-700' 
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {button.text}
                </div>
              ))}
          </div>
        )}
      </div>
    )
  }

  // Render media content based on type
  const renderMediaContent = () => {
    // Handle template messages first
    if (templateMetadata) {
      return renderTemplateMessage()
    }

    // Handle interactive messages
    if (message.type === 'interactive' && interactiveMetadata) {
      if (interactiveMetadata.type === 'button') {
        return (
          <InteractiveButtonsMessage
            body={interactiveMetadata.body}
            footer={interactiveMetadata.footer}
            buttons={interactiveMetadata.buttons}
            isIncoming={isIncoming}
          />
        )
      } else if (interactiveMetadata.type === 'list') {
        return (
          <InteractiveListMessage
            header={interactiveMetadata.header}
            body={interactiveMetadata.body}
            footer={interactiveMetadata.footer}
            buttonText={interactiveMetadata.buttonText}
            sections={interactiveMetadata.sections}
            isIncoming={isIncoming}
          />
        )
      }
    }

    // Handle regular media content
    if (!hasRealMedia) {
      if (hasLegacyMediaTag) {
        return renderLegacyMedia()
      }
      return null
    }

    switch (mediaMetadata.type) {
      case 'image':
        return renderImage()
      case 'audio':
        return renderAudio()
      case 'document':
        return renderDocument()
      default:
        return null
    }
  }

  // Get text content to display
  const getTextContent = () => {
    // For template messages, don't show text content (it's in the template component)
    if (templateMetadata) {
      return ''
    }
    
    // For interactive messages, don't show text content (it's in the interactive component)
    if (message.type === 'interactive' && interactiveMetadata) {
      return ''
    }
    
    if (hasRealMedia && mediaMetadata.type === 'image') {
      // For images with real media, show description/caption
      return message.content.replace(/\[Imagem recebida\]\s*/i, '').trim()
    }
    if (hasRealMedia && mediaMetadata.type === 'document') {
      // For documents with real media, show content after the document tag
      return message.content.replace(/\[Documento:[^\]]*\]\s*/i, '').trim()
    }
    if (hasRealMedia && mediaMetadata.type === 'audio') {
      // For TTS audio messages, don't show text content (transcription is inside AudioMessage component)
      return ''
    }
    if (hasLegacyMediaTag) {
      // For legacy media tags, extract content after the tag
      const contentAfterTag = message.content.replace(/\[[^\]]+\]\s*/, '').trim()
      // If there's meaningful content after the tag, return it; otherwise return empty
      // The renderLegacyMedia will show the filename
      return contentAfterTag.length > 0 ? contentAfterTag : ''
    }
    return message.content
  }

  const textContent = getTextContent()

  // Render WhatsApp-style status icon
  const renderStatusIcon = () => {
    // Only show status for outgoing messages
    if (isIncoming) return null

    const statusIconClass = 'h-4 w-4 inline-block ml-1'

    switch (message.status) {
      case 'pending':
      case 'queued':
      case 'sending':
        // Clock icon for pending/sending
        return <Clock className={`${statusIconClass} text-white/50`} />

      case 'sent':
        // Single check for sent
        return <Check className={`${statusIconClass} text-white/70`} />

      case 'delivered':
        // Double check for delivered
        return <CheckCheck className={`${statusIconClass} text-white/70`} />

      case 'read':
        // Double check in blue for read
        return <CheckCheck className={`${statusIconClass} text-blue-400`} />

      case 'failed':
        // Red X for failed (click to view error details)
        if (!errorDetails) {
          return <XCircle className={`${statusIconClass} text-red-400`} />
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center"
                aria-label="Ver detalhes do erro"
              >
                <XCircle className={`${statusIconClass} text-red-400`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[320px]">
              <DropdownMenuLabel>Falha no envio</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs space-y-1">
                {typeof (errorDetails as any)?.code === 'number' && (
                  <div><span className="font-medium">Código:</span> {(errorDetails as any).code}</div>
                )}
                {typeof (errorDetails as any)?.title === 'string' && (
                  <div><span className="font-medium">Título:</span> {(errorDetails as any).title}</div>
                )}
                {typeof (errorDetails as any)?.message === 'string' && (
                  <div><span className="font-medium">Mensagem:</span> {(errorDetails as any).message}</div>
                )}
                {errorHint && (
                  <div className="pt-1 text-erie-black-600">{errorHint}</div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )

      default:
        return null
    }
  }

  // Handle reaction - uses wamid if available for WhatsApp API
  const handleReaction = async (emoji: string) => {
    if (onReaction) {
      // Pass wamid for reactions (required by WhatsApp API) or fallback to message.id
      const reactionId = wamid || message.id
      await onReaction(reactionId, emoji)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true)
      try {
        await onDelete(message.id, mediaMetadata?.url)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className={'flex ' + (isIncoming ? 'justify-start' : 'justify-end') + ' mb-2 px-2'}>
      <div
        className={'relative group max-w-[70%] rounded-lg p-3 break-words ' + (
          isIncoming
            ? 'bg-gradient-to-br from-[#1ABC9C] to-[#2E86AB] text-white shadow-lg'
            : 'bg-white text-gray-900 shadow-sm border border-gray-200'
        )}
      >
        {/* Action menu - WhatsApp style dropdown */}
        {(onReaction || onDelete) && (
          <MessageActionMenu
            message={message}
            onReaction={handleReaction}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}

        {renderMediaContent()}
        {textContent && (
          <p className={'whitespace-pre-wrap text-sm md:text-base ' + (isIncoming ? 'text-white' : 'text-gray-900')}>
            {textContent}
          </p>
        )}
        <p className={'text-xs mt-1 flex items-center gap-1 ' + (isIncoming ? 'text-white/80' : 'text-gray-600')}>
          <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
          {renderStatusIcon()}
        </p>
      </div>
    </div>
  )
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
