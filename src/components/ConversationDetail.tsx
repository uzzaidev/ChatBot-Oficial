'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/MessageBubble'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { Message } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

interface ConversationDetailProps {
  phone: string
  clientId: string
  conversationName?: string
}

export const ConversationDetail = ({
  phone,
  clientId,
  conversationName,
}: ConversationDetailProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([])

  const { messages: fetchedMessages, loading, error, refetch } = useMessages({
    clientId,
    phone,
    // Sem polling - vamos depender 100% do realtime
  })

  // Clear realtime messages when phone changes
  useEffect(() => {
    console.log('[ConversationDetail] Phone changed, clearing realtime messages')
    setRealtimeMessages([])
  }, [phone])

  // Combine fetched messages with realtime messages, removing duplicates
  const messages = useMemo(() => {
    const allMessages = [...fetchedMessages, ...realtimeMessages]

    // Remove duplicates based on message ID
    const uniqueMessages = allMessages.reduce((acc, message) => {
      const exists = acc.some(m => m.id === message.id)
      if (!exists) {
        acc.push(message)
      }
      return acc
    }, [] as Message[])

    console.log('[ConversationDetail] Combined messages:', {
      fetchedCount: fetchedMessages.length,
      realtimeCount: realtimeMessages.length,
      totalUnique: uniqueMessages.length
    })

    return uniqueMessages
  }, [fetchedMessages, realtimeMessages])

  // Stable callback for handling new messages
  const handleNewMessage = useCallback((newMessage: Message) => {
    console.log('[ConversationDetail] New realtime message received:', newMessage.id)

    // Add message optimistically to avoid refetch
    setRealtimeMessages(prev => {
      // Check if message already exists in realtime messages
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) {
        console.log('[ConversationDetail] Message already exists in realtime, skipping')
        return prev
      }

      console.log('[ConversationDetail] Adding new message to realtime array')
      return [...prev, newMessage]
    })

    toast({
      title: 'Nova mensagem',
      description: 'Uma nova mensagem foi recebida',
    })
  }, [])

  useRealtimeMessages({
    clientId,
    phone,
    onNewMessage: handleNewMessage,
  })

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

  // Log para debug
  console.log('[ConversationDetail] Rendering with:', {
    phone,
    loading,
    messageCount: messages.length,
    fetchedCount: fetchedMessages.length,
    realtimeCount: realtimeMessages.length
  })

  return (
    <div className="flex flex-col h-full">
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
            <div className="py-3 md:py-4 space-y-2">
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
