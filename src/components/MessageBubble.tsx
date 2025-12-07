'use client'

import type { Message, StoredMediaMetadata } from '@/lib/types'
import { FileText, Download, Play, File } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { MessageActionMenu } from '@/components/MessageActionMenu'
import { AudioMessage } from '@/components/AudioMessage'
import { InteractiveButtonsMessage } from '@/components/InteractiveButtonsMessage'
import { InteractiveListMessage } from '@/components/InteractiveListMessage'

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

type InteractiveMetadata = InteractiveButtonsMetadata | InteractiveListMetadata

const isInteractiveMetadata = (obj: unknown): obj is InteractiveMetadata => {
  if (!obj || typeof obj !== 'object') return false
  const meta = obj as Record<string, unknown>
  return (
    typeof meta.type === 'string' &&
    (meta.type === 'button' || meta.type === 'list')
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

  // 📱 Extract wamid for WhatsApp reactions
  const wamid = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>).wamid as string | undefined
    : undefined
  
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

  // Render media content based on type
  const renderMediaContent = () => {
    // Handle interactive messages first
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
      <div className={'relative group max-w-[70%] rounded-lg p-3 break-words ' + (isIncoming ? 'bg-white shadow-sm' : 'bg-mint-500 text-white')}>
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
          <p className="whitespace-pre-wrap text-sm md:text-base">{textContent}</p>
        )}
        <p className={'text-xs mt-1 ' + (isIncoming ? 'text-erie-black-500' : 'text-white/70')}>
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
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
