'use client'

import type { Message, StoredMediaMetadata } from '@/lib/types'
import { FileText, Download, Play, File } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { MessageActionMenu } from '@/components/MessageActionMenu'
import { AudioMessage } from '@/components/AudioMessage'

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

    // Check if message has transcription and audio_duration_seconds (TTS message)
    const transcription = (message as any).transcription || message.content
    const audioDuration = (message as any).audio_duration_seconds || 0

    // If has transcription and duration, use fancy AudioMessage component
    if (transcription && audioDuration > 0) {
      return (
        <div className="-m-3">
          <AudioMessage
            audioUrl={mediaMetadata.url}
            transcription={transcription}
            durationSeconds={audioDuration}
            direction={message.direction === 'incoming' ? 'inbound' : 'outbound'}
            timestamp={message.timestamp}
          />
        </div>
      )
    }

    // Fallback to simple HTML5 audio player (for received audios without transcription)
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
          <Play className="h-4 w-4" />
          <span className="font-medium">Áudio</span>
        </div>
        <audio
          controls
          className="w-full max-w-[280px] h-10"
          preload="metadata"
        >
          <source src={mediaMetadata.url} type={mediaMetadata.mimeType || 'audio/ogg'} />
          Seu navegador não suporta áudio.
        </audio>
        <a
          href={mediaMetadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
        >
          <Download className="h-3 w-3" />
          Baixar áudio
        </a>
      </div>
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
    if (hasRealMedia && mediaMetadata.type === 'image') {
      // For images with real media, show description/caption
      return message.content.replace(/\[Imagem recebida\]\s*/i, '').trim()
    }
    if (hasRealMedia && mediaMetadata.type === 'document') {
      // For documents with real media, show content after the document tag
      return message.content.replace(/\[Documento:[^\]]*\]\s*/i, '').trim()
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
