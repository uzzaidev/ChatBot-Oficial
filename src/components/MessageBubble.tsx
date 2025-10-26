'use client'

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
        return <CheckCheck className={cn(iconClass, 'text-gray-400')} />
      case 'read':
        return <CheckCheck className={cn(iconClass, 'text-blue-500')} />
      case 'failed':
        return <XCircle className={cn(iconClass, 'text-red-500')} />
      case 'queued':
        return <Clock className={cn(iconClass, 'text-gray-400')} />
      default:
        return null
    }
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Audio</span>
            <span className="text-xs text-muted-foreground">
              {message.content}
            </span>
          </div>
        )
      case 'image':
        return (
          <div className="flex flex-col gap-2">
            <span className="text-sm">Imagem</span>
            {message.metadata?.url ? (
              <img
                src={message.metadata.url as string}
                alt="Imagem enviada"
                className="max-w-xs rounded-lg"
              />
            ) : null}
            {message.content && (
              <span className="text-sm">{message.content}</span>
            )}
          </div>
        )
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Documento</span>
            <span className="text-xs text-muted-foreground">
              {message.content}
            </span>
          </div>
        )
      default:
        return <span className="text-sm whitespace-pre-wrap">{message.content}</span>
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
            ? 'message-outgoing text-gray-900 rounded-br-none'
            : 'message-incoming text-gray-900 rounded-bl-none'
        )}
      >
        {!isOutgoing && message.name && (
          <span className="text-xs font-semibold mb-1 text-primary">
            {message.name}
          </span>
        )}

        <div className="mb-1">{renderMessageContent()}</div>

        <div
          className={cn(
            'flex items-center justify-end gap-1 text-xs mt-1',
            'text-gray-500'
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  )
}
