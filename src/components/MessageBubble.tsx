'use client'

import Image from 'next/image'
import { cn, formatTime } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { CheckCheck, Clock, XCircle } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isOutgoing = message.direction === 'outgoing'

  const renderStatusIcon = () => {
    if (message.direction === 'incoming') return null

    const iconClass = 'h-4 w-4'

    switch (message.status) {
      case 'sent':
      case 'delivered':
        return <CheckCheck className={cn(iconClass, 'text-silver-400')} />
      case 'read':
        return <CheckCheck className={cn(iconClass, 'text-brand-blue-600')} />
      case 'failed':
        return <XCircle className={cn(iconClass, 'text-red-500')} />
      case 'queued':
        return <Clock className={cn(iconClass, 'text-silver-400')} />
      default:
        return null
    }
  }

  const renderMessageContent = () => {
    // Trim trailing whitespace from content to avoid displaying \n\n added by n8n AI formatter
    const trimmedContent = message.content.trimEnd()
    
    switch (message.type) {
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Audio</span>
            <span className="text-xs text-muted-foreground">
              {trimmedContent}
            </span>
          </div>
        )
      case 'image':
        return (
          <div className="flex flex-col gap-2">
            <span className="text-sm">Imagem</span>
            {message.metadata?.url ? (
              <Image
                src={message.metadata.url as string}
                alt="Imagem enviada"
                width={300}
                height={300}
                className="max-w-xs rounded-lg object-cover"
                unoptimized
              />
            ) : null}
            {trimmedContent && (
              <span className="text-sm">{trimmedContent}</span>
            )}
          </div>
        )
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Documento</span>
            <span className="text-xs text-muted-foreground">
              {trimmedContent}
            </span>
          </div>
        )
      default:
        return <span className="text-sm whitespace-pre-wrap">{trimmedContent}</span>
    }
  }

  return (
    <div
      className={cn(
        'flex w-full mb-2 px-4',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex flex-col max-w-[65%] rounded-lg px-3 py-2 shadow-sm',
          isOutgoing
            ? 'bg-mint-100 text-erie-black-900 rounded-br-none border border-mint-200'
            : 'bg-white text-erie-black-900 rounded-bl-none border border-silver-200'
        )}
      >
        <div className="mb-1">{renderMessageContent()}</div>

        <div
          className={cn(
            'flex items-center justify-end gap-1 text-xs mt-1',
            'text-erie-black-500'
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  )
}
