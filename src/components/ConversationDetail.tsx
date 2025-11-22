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
}

export const ConversationDetail = ({
  phone,
  clientId,
  conversationName,
}: ConversationDetailProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([])
  const [stickyDate, setStickyDate] = useState<string | null>(null)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const { messages: fetchedMessages, loading, error, refetch } = useMessages({
    clientId,
    phone,
    // Sem polling - vamos depender 100% do realtime
  })

  // Clear realtime messages when phone changes
  useEffect(() => {
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


    return uniqueMessages
  }, [fetchedMessages, realtimeMessages])

  // Stable callback for handling new messages
  const handleNewMessage = useCallback((newMessage: Message) => {

    // Add message optimistically to avoid refetch
    setRealtimeMessages(prev => {
      // Check if message already exists in realtime messages
      const exists = prev.some(msg => msg.id === newMessage.id)
      if (exists) {
        return prev
      }

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

  // Handle scroll to update sticky date header
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return

    const handleScroll = () => {
      // Find which date section is currently at the top
      const scrollTop = scrollElement.scrollTop
      let currentDate: string | null = null

      // Iterate through date refs to find the visible one
      dateRefs.current.forEach((element, date) => {
        const rect = element.getBoundingClientRect()
        const containerRect = scrollElement.getBoundingClientRect()
        
        // Check if this date separator is near or above the top of the viewport
        if (rect.top <= containerRect.top + 50) {
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

  // Clear date refs when messages change
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

  // Log para debug

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Date Header - WhatsApp style */}
      {stickyDate && messages.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center pt-2 pointer-events-none">
          <div className="bg-silver-200/90 text-erie-black-700 text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
            {stickyDate}
          </div>
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
