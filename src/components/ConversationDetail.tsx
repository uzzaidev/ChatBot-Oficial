'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/MessageBubble'
import { DateSeparator } from '@/components/DateSeparator'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { Message } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { isSameDay, formatMessageDate } from '@/lib/utils'

interface ConversationDetailProps {
  phone: string
  clientId: string
  conversationName?: string
  onGetOptimisticCallbacks?: (callbacks: {
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  }) => void
  onMarkAsRead?: (phone: string) => void
}

export const ConversationDetail = ({
  phone,
  clientId,
  conversationName,
  onGetOptimisticCallbacks,
  onMarkAsRead,
}: ConversationDetailProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([])
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [stickyDate, setStickyDate] = useState<string | null>(null)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const shouldScrollRef = useRef(true)

  const { messages: fetchedMessages, loading, error, refetch } = useMessages({
    clientId,
    phone,
    // Sem polling - vamos depender 100% do realtime
  })

  // Clear realtime messages when phone changes
  useEffect(() => {
    setRealtimeMessages([])
    setOptimisticMessages([])
    setNewMessagesCount(0)
    shouldScrollRef.current = true
  }, [phone])

  // Combine fetched + realtime + optimistic messages, removing duplicates
  const messages = useMemo(() => {
    const allMessages = [...fetchedMessages, ...realtimeMessages, ...optimisticMessages]

    // Remove duplicates based on message ID
    const uniqueMessages = allMessages.reduce((acc, message) => {
      const exists = acc.some(m => m.id === message.id)
      if (!exists) {
        acc.push(message)
      }
      return acc
    }, [] as Message[])

    // Sort by timestamp
    uniqueMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return uniqueMessages
  }, [fetchedMessages, realtimeMessages, optimisticMessages])

  // Check if user is at bottom (within 100px)
  const checkIfUserAtBottom = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return false

    const threshold = 100 // 100px do fim
    const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < threshold
    setIsUserAtBottom(isAtBottom)
    return isAtBottom
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight
      setIsUserAtBottom(true)
      setNewMessagesCount(0)
    }
  }, [])

  // Handle optimistic message (from SendMessageForm)
  const handleOptimisticMessage = useCallback((message: Message) => {
    console.log('➕ [ConversationDetail] Adding optimistic message:', message.id)
    setOptimisticMessages(prev => [...prev, message])
    shouldScrollRef.current = true // Always scroll for user's own messages
  }, [])

  // Handle message error (remove optimistic message)
  const handleMessageError = useCallback((tempId: string) => {
    console.log('❌ [ConversationDetail] Removing failed optimistic message:', tempId)
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
  }, [])

  // Stable callback for handling new messages from realtime
  const handleNewMessage = useCallback((newMessage: Message) => {
    console.log('📨 [ConversationDetail] New realtime message:', newMessage.id)

    // Remove optimistic message if exists (replace with real one)
    setOptimisticMessages(prev => prev.filter(msg => msg.content !== newMessage.content))

    // Add realtime message
    setRealtimeMessages(prev => {
      // Check if message already exists in realtime messages
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) {
        console.log('⚠️ [ConversationDetail] Message already exists, skipping')
        return prev
      }

      return [...prev, newMessage]
    })

    // Marcar conversa como lida (já que está visualizando)
    if (onMarkAsRead) {
      console.log('👁️ [ConversationDetail] Marking as read (message received while open)')
      onMarkAsRead(phone)
    }

    // Se usuário está no fim, scroll automático
    const isAtBottom = checkIfUserAtBottom()
    if (isAtBottom) {
      shouldScrollRef.current = true
    } else {
      // Se não está no fim, incrementa contador de novas mensagens
      setNewMessagesCount(prev => prev + 1)
      // Não mostra toast se usuário não está no fim (badge é suficiente)
    }
  }, [checkIfUserAtBottom, onMarkAsRead, phone])

  // Realtime subscription para novas mensagens (depois do handleNewMessage)
  const { isConnected: realtimeConnected } = useRealtimeMessages({
    clientId,
    phone,
    onNewMessage: handleNewMessage,
  })

  // Expose optimistic callbacks to parent (after declarations)
  useEffect(() => {
    if (onGetOptimisticCallbacks) {
      onGetOptimisticCallbacks({
        onOptimisticMessage: handleOptimisticMessage,
        onMessageError: handleMessageError,
      })
    }
  }, [onGetOptimisticCallbacks, handleOptimisticMessage, handleMessageError])

  // Smart scroll - só faz scroll se usuário estava no fim ou se é mensagem própria
  useEffect(() => {
    if (shouldScrollRef.current) {
      const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        // Pequeno delay para garantir que DOM foi atualizado
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight
          setIsUserAtBottom(true)
          setNewMessagesCount(0)
          shouldScrollRef.current = false
        }, 50)
      }
    }
  }, [messages])

  // Monitor scroll position
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return

    const handleScroll = () => {
      checkIfUserAtBottom()
    }

    scrollElement.addEventListener('scroll', handleScroll)
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [checkIfUserAtBottom])

  // Handle scroll to update sticky date header
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return

    // Offset to determine when a date separator is "at the top"
    const STICKY_HEADER_OFFSET = 50

    const handleScroll = () => {
      // Find which date section is currently at the top
      const scrollTop = scrollElement.scrollTop
      let currentDate: string | null = null

      // Iterate through date refs to find the visible one
      dateRefs.current.forEach((element, date) => {
        const rect = element.getBoundingClientRect()
        const containerRect = scrollElement.getBoundingClientRect()
        
        // Check if this date separator is near or above the top of the viewport
        if (rect.top <= containerRect.top + STICKY_HEADER_OFFSET) {
          currentDate = date
        }
      })

      setStickyDate(currentDate)
    }

    scrollElement.addEventListener('scroll', handleScroll)
    // Initial call to set the date
    handleScroll()

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [messages])

  // Clear date refs when conversation changes
  useEffect(() => {
    dateRefs.current.clear()
  }, [phone])

  // Group messages with date separators
  const messagesWithDates = useMemo(() => {
    const result: Array<
      | { type: 'message'; message: Message }
      | { type: 'date'; date: string }
    > = []
    
    messages.forEach((message, index) => {
      // Add date separator if this is the first message or day changed
      if (index === 0) {
        result.push({
          type: 'date',
          date: formatMessageDate(message.timestamp),
        })
      } else {
        const prevMessage = messages[index - 1]
        if (!isSameDay(prevMessage.timestamp, message.timestamp)) {
          result.push({
            type: 'date',
            date: formatMessageDate(message.timestamp),
          })
        }
      }
      
      // Add message
      result.push({
        type: 'message',
        message: message,
      })
    })
    
    return result
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
    <div className="flex flex-col h-full relative">
      {/* Sticky Date Header - WhatsApp style */}
      {stickyDate && messages.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center pt-2 pointer-events-none">
          <div className="bg-silver-200/90 text-erie-black-700 text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
            {stickyDate}
          </div>
        </div>
      )}

      {/* Badge de novas mensagens - WhatsApp style */}
      {!isUserAtBottom && newMessagesCount > 0 && (
        <div className="absolute bottom-20 right-4 z-20">
          <button
            onClick={scrollToBottom}
            className="bg-mint-600 hover:bg-mint-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all animate-in slide-in-from-bottom-5"
          >
            <span className="text-sm font-medium">
              {newMessagesCount} nova{newMessagesCount > 1 ? 's' : ''} mensagem{newMessagesCount > 1 ? 's' : ''}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
      
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
              {messagesWithDates.map((item, index) => {
                if (item.type === 'date') {
                  return (
                    <div 
                      key={`date-${index}`}
                      ref={(el) => {
                        if (el) {
                          dateRefs.current.set(item.date, el)
                        }
                      }}
                    >
                      <DateSeparator date={item.date} />
                    </div>
                  )
                } else {
                  return <MessageBubble key={item.message.id} message={item.message} />
                }
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
