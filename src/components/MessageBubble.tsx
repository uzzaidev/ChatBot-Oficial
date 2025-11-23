'use client'

import type { Message } from '@/lib/types'
import { FileText } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isIncoming = message.direction === 'incoming'
  const hasMedia = message.content.match(/\[(IMAGE|IMAGEM|AUDIO|ÁUDIO|DOCUMENT|DOCUMENTO)\]/)
  const filename = message.content.match(/\](.*?)$/)?.[1]?.trim() || 'Arquivo'

  return (
    <div className={'flex ' + (isIncoming ? 'justify-start' : 'justify-end') + ' mb-2 px-2'}>
      <div className={'max-w-[70%] rounded-lg p-3 break-words ' + (isIncoming ? 'bg-white shadow-sm' : 'bg-mint-500 text-white')}>
        {hasMedia && (
          <div className="flex items-center gap-2 mb-1 text-sm opacity-80">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Arquivo enviado</span>
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm md:text-base">{hasMedia ? filename : message.content}</p>
        <p className={'text-xs mt-1 ' + (isIncoming ? 'text-erie-black-500' : 'text-white/70')}>
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
        </p>
      </div>
    </div>
  )
}
