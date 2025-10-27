'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/MessageBubble'
import { formatPhone, getStatusColor, getStatusLabel } from '@/lib/utils'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { UserCircle, UserCog } from 'lucide-react'
import type { Message } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

interface ConversationDetailProps {
  phone: string
  clientId: string
  conversationName?: string
  conversationStatus?: string
}

export const ConversationDetail = ({
  phone,
  clientId,
  conversationName,
  conversationStatus = 'bot',
}: ConversationDetailProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([])

  const { messages: fetchedMessages, loading, error, refetch } = useMessages({
    clientId,
    phone,
    // Sem polling - vamos depender 100% do realtime
  })

  // Combine fetched messages with realtime messages using useMemo
  const messages = useMemo(() => {
    return [...fetchedMessages, ...realtimeMessages]
  }, [fetchedMessages, realtimeMessages])

  // Stable callback for handling new messages
  const handleNewMessage = useCallback((newMessage: Message) => {
    // Add message optimistically to avoid refetch
    setRealtimeMessages(prev => {
      // Check if message already exists to avoid duplicates
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) return prev
      return [...prev, newMessage]
    })

    toast({
      title: 'Nova mensagem',
      description: 'Uma nova mensagem foi recebida',
    })
  }, [])

  // Clear realtime messages when phone changes or when refetching
  useEffect(() => {
    setRealtimeMessages([])
  }, [phone])

  useRealtimeMessages({
    clientId,
    phone,
    onNewMessage: handleNewMessage,
  })

  const handleTransferToHuman = async () => {
    try {
      const response = await fetch('/api/commands/transfer-human', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          client_id: clientId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao transferir conversa')
      }

      toast({
        title: 'Sucesso',
        description: 'Conversa transferida para atendimento humano',
      })

      refetch()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center text-red-500 p-8">
          Erro ao carregar mensagens: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-white p-3 md:p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <UserCircle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm md:text-lg font-semibold truncate">
                {conversationName || formatPhone(phone)}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`${getStatusColor(conversationStatus)} text-xs`}
              variant="secondary"
            >
              {getStatusLabel(conversationStatus)}
            </Badge>

            {conversationStatus !== 'human' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransferToHuman}
                className="text-xs md:text-sm"
              >
                <UserCog className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline">Transferir para Humano</span>
                <span className="md:hidden ml-1">Humano</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Carregando mensagens...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Nenhuma mensagem ainda</span>
          </div>
        ) : (
          <ScrollArea ref={scrollAreaRef} className="h-full px-2 md:px-4">
            <div className="py-3 md:py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
