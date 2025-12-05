'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/MessageBubble'
import { DateSeparator } from '@/components/DateSeparator'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { Message } from '@/lib/types'
import { isSameDay, formatMessageDate, throttle } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

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
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set())
  const [stickyDate, setStickyDate] = useState<string | null>(null)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const shouldScrollRef = useRef(true)
  const lastFetchedIdsRef = useRef<Set<string>>(new Set())
  const { toast } = useToast()

  const { messages: fetchedMessages, loading, error } = useMessages({
    clientId,
    phone,
    // Sem polling - vamos depender 100% do realtime
  })

  // Memoize fetched message IDs for efficient lookup
  const fetchedMessageIds = useMemo(() => {
    return new Set<string>(fetchedMessages.map(m => m.id))
  }, [fetchedMessages])

  // Track fetched message IDs to prevent memory accumulation
  useEffect(() => {
    // Clean up realtime messages that are now in fetched messages
    if (fetchedMessageIds.size > 0 && realtimeMessages.length > 0) {
      setRealtimeMessages(prev => {
        const filtered = prev.filter(msg => !fetchedMessageIds.has(msg.id))
        // Only update if something changed
        return filtered.length === prev.length ? prev : filtered
      })
    }
    
    lastFetchedIdsRef.current = fetchedMessageIds
  }, [fetchedMessageIds, realtimeMessages.length])

  // Clear realtime messages when phone changes
  useEffect(() => {
    setRealtimeMessages([])
    setOptimisticMessages([])
    setDeletedMessageIds(new Set())
    setNewMessagesCount(0)
    shouldScrollRef.current = true
    lastFetchedIdsRef.current.clear()
  }, [phone])

  // Combine fetched + realtime + optimistic messages, removing duplicates and deleted messages
  const messages = useMemo(() => {
    const allMessages = [...fetchedMessages, ...realtimeMessages, ...optimisticMessages]

    // Remove duplicates based on message ID and filter out deleted messages
    const uniqueMessages = allMessages.reduce((acc, message) => {
      const exists = acc.some(m => m.id === message.id)
      const isDeleted = deletedMessageIds.has(message.id)
      if (!exists && !isDeleted) {
        acc.push(message)
      }
      return acc
    }, [] as Message[])

    // Sort by timestamp
    uniqueMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return uniqueMessages
  }, [fetchedMessages, realtimeMessages, optimisticMessages, deletedMessageIds])

  // Check if user is at bottom - uses the state that's updated by scroll handler
  const checkIfUserAtBottom = useCallback(() => {
    // Also do a fresh check in case state is stale
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return isUserAtBottom

    const threshold = 100 // 100px do fim
    const freshIsAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < threshold
    return freshIsAtBottom
  }, [isUserAtBottom])

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
    setOptimisticMessages(prev => [...prev, message])
    shouldScrollRef.current = true // Always scroll for user's own messages
  }, [])

  // Handle message error (remove optimistic message)
  const handleMessageError = useCallback((tempId: string) => {
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
  }, [])

  // Stable callback for handling new messages from realtime
  const handleNewMessage = useCallback((newMessage: Message) => {
    // Remove optimistic message if exists (replace with real one)
    setOptimisticMessages(prev => prev.filter(msg => msg.content !== newMessage.content))

    // Add realtime message
    setRealtimeMessages(prev => {
      // Check if message already exists in realtime messages
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) {
        return prev
      }

      return [...prev, newMessage]
    })

    // Marcar conversa como lida (já que está visualizando)
    if (onMarkAsRead) {
      onMarkAsRead(phone)
    }

    // Se usuário está no fim, scroll automático
    const isAtBottom = checkIfUserAtBottom()
    if (isAtBottom) {
      shouldScrollRef.current = true
    } else {
      // Se não está no fim, incrementa contador (badge UI handles notification)
      setNewMessagesCount(prev => prev + 1)
    }
  }, [checkIfUserAtBottom, onMarkAsRead, phone])

  // Handle message reaction via WhatsApp API
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await fetch('/api/commands/react-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          messageId,
          emoji,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reaction')
      }

      toast({
        title: emoji ? 'Reação enviada' : 'Reação removida',
        description: emoji ? `Você reagiu com ${emoji}` : 'Reação removida com sucesso',
      })
    } catch (error) {
      console.error('[ConversationDetail] Reaction error:', error)
      toast({
        title: 'Erro ao reagir',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }, [phone, toast])

  // Handle message deletion
  const handleDelete = useCallback(async (messageId: string, mediaUrl?: string) => {
    try {
      const response = await fetch('/api/commands/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          mediaUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete message')
      }

      // Optimistically remove from UI
      setDeletedMessageIds(prev => {
        const newSet = new Set(prev)
        newSet.add(messageId)
        return newSet
      })

      toast({
        title: 'Mensagem apagada',
        description: 'A mensagem foi removida com sucesso',
      })
    } catch (error) {
      console.error('[ConversationDetail] Delete error:', error)
      toast({
        title: 'Erro ao apagar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }, [toast])

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

  // Helper function to calculate current sticky date from refs
  const calculateStickyDate = useCallback((scrollElement: Element): string | null => {
    const STICKY_HEADER_OFFSET = 50
    let currentDate: string | null = null
    const containerRect = scrollElement.getBoundingClientRect()
    
    dateRefs.current.forEach((element, date) => {
      const rect = element.getBoundingClientRect()
      if (rect.top <= containerRect.top + STICKY_HEADER_OFFSET) {
        currentDate = date
      }
    })

    return currentDate
  }, [])

  // Combined scroll handler - throttled to prevent mobile freezing
  // Single useEffect with both scroll position and sticky date tracking
  // Setup once and relies on refs for current data
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return

    // Combined handler for both scroll position and sticky date
    const handleScrollUpdate = () => {
      // Check if user is at bottom (within 100px)
      const threshold = 100
      const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < threshold
      setIsUserAtBottom(isAtBottom)

      // Update sticky date header using refs (always current)
      setStickyDate(calculateStickyDate(scrollElement))
    }

    // Throttle scroll handler to 100ms - prevents excessive updates on mobile
    const throttledScrollHandler = throttle(handleScrollUpdate, 100)

    scrollElement.addEventListener('scroll', throttledScrollHandler, { passive: true })
    // Initial call to set the date
    handleScrollUpdate()

    return () => {
      scrollElement.removeEventListener('scroll', throttledScrollHandler)
    }
  }, [calculateStickyDate]) // calculateStickyDate is stable (uses useCallback)

  // Trigger sticky date update when messages change (for initial render and new messages)
  useEffect(() => {
    // Delay to allow DOM to update with new messages
    const timeout = setTimeout(() => {
      const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
      if (!scrollElement) return

      setStickyDate(calculateStickyDate(scrollElement))
    }, 100)

    return () => clearTimeout(timeout)
  }, [messages.length, calculateStickyDate])

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
                  return (
                    <MessageBubble
                      key={item.message.id}
                      message={item.message}
                      onReaction={handleReaction}
                      onDelete={handleDelete}
                    />
                  )
                }
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
