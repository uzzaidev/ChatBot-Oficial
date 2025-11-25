'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ConversationDetail } from '@/components/ConversationDetail'
import { SendMessageForm } from '@/components/SendMessageForm'
import { StatusToggle } from '@/components/StatusToggle'
import { DragDropZone } from '@/components/DragDropZone'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/utils'
import { markConversationAsRead } from '@/lib/api'
import { MessageCircle, LayoutDashboard, Menu, Bot, User, ArrowRight, List } from 'lucide-react'
import Link from 'next/link'
import type { MediaAttachment } from '@/components/MediaPreview'
import type { Message } from '@/lib/types'

interface ConversationPageClientProps {
  phone: string
  clientId: string
}

/**
 * ConversationPageClient - Client Component
 *
 * FASE 3: Agora recebe client_id do servidor (autenticado)
 *
 * Componente que renderiza a página de detalhes de conversa
 */
export function ConversationPageClient({ phone, clientId }: ConversationPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido'>('all')
  const [attachments, setAttachments] = useState<MediaAttachment[]>([])

  // Refs para callbacks de optimistic updates
  const optimisticCallbacksRef = useRef<{
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  } | null>(null)

  // Callback para capturar os callbacks do ConversationDetail
  const handleGetOptimisticCallbacks = useCallback((callbacks: {
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  }) => {
    optimisticCallbacksRef.current = callbacks
  }, [])

  const { conversations, loading } = useConversations({
    clientId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    enableRealtime: true,
  })

  // Calcular total de mensagens não lidas
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count ?? 0), 0)

  // Marcar conversa como lida quando abrir
  useEffect(() => {
    if (phone) {
      markConversationAsRead(phone).then((result) => {
        if (!result.success) {
          console.error('❌ [ConversationPageClient] Failed to mark as read:', result.error)
        }
      })
    }
  }, [phone])

  // Gerenciar anexos de mídia
  const handleAddAttachment = useCallback((file: File, type: 'image' | 'document') => {
    const attachment: MediaAttachment = {
      file,
      type,
    }

    // Gerar preview para imagens
    if (type === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachments(prev => [...prev, {
          ...attachment,
          preview: e.target?.result as string
        }])
      }
      reader.readAsDataURL(file)
    } else {
      setAttachments(prev => [...prev, attachment])
    }
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  // Hook global para notificações em tempo real
  const { lastUpdatePhone } = useGlobalRealtimeNotifications()

  // Callback para marcar como lida (usado pelo ConversationDetail)
  const handleMarkAsRead = useCallback(async (conversationPhone: string) => {
    const result = await markConversationAsRead(conversationPhone)
    if (!result.success) {
      console.error('❌ [ConversationPageClient] Failed to mark as read:', result.error)
    }
  }, [])

  const conversation = conversations.find((c) => c.phone === phone)

  // Componente de Sidebar (reutilizado para desktop e mobile)
  const SidebarContent = () => (
    <>
      {/* Header da Sidebar */}
      <div className="bg-mint-600 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-white" />
          <h2 className="text-white font-semibold text-lg">Conversas</h2>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-white hover:bg-mint-700">
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Filtros por Status */}
      <div className="border-b border-silver-200 bg-white">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'bot' | 'humano' | 'transferido')}>
          <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent flex-wrap">
            <TabsTrigger
              value="all"
              className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-mint-600 rounded-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Todas</span>
              <span className="sm:hidden">Todas</span>
            </TabsTrigger>
            <TabsTrigger
              value="bot"
              className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bot</span>
              <span className="sm:hidden">Bot</span>
            </TabsTrigger>
            <TabsTrigger
              value="humano"
              className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Humano</span>
              <span className="sm:hidden">Humano</span>
            </TabsTrigger>
            <TabsTrigger
              value="transferido"
              className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Transferido</span>
              <span className="sm:hidden">Transf.</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          conversations={conversations}
          loading={loading}
          currentPhone={phone}
          lastUpdatePhone={lastUpdatePhone}
          onConversationClick={() => setSidebarOpen(false)}
        />
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar Desktop - Oculta em mobile (< lg) */}
      <div className="hidden lg:flex w-96 border-r border-silver-200 flex-col bg-white">
        <SidebarContent />
      </div>

      {/* Sidebar Mobile - Sheet drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] sm:w-96">
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Área de Chat Principal */}
      <div className="flex-1 flex flex-col">
        {conversation ? (
          <>
            {/* Header do Chat */}
            <div className="bg-silver-100 p-3 border-b border-silver-200">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Botão Menu (Mobile) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden flex-shrink-0 relative"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </Button>

                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-mint-500 text-white">
                    {getInitials(conversation.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-erie-black-900 truncate">{conversation.name}</h3>
                  <p className="text-xs text-erie-black-600 truncate">{conversation.phone}</p>
                </div>

                {/* Status Toggle */}
                <div className="w-full sm:w-auto">
                  <StatusToggle
                    phone={phone}
                    currentStatus={conversation.status}
                  />
                </div>
              </div>
            </div>

            {/* Área de Mensagens com Drag & Drop */}
            <div className="flex-1 overflow-hidden bg-silver-50 relative">
              <DragDropZone onFileSelect={handleAddAttachment}>
                <ConversationDetail
                  phone={phone}
                  clientId={clientId}
                  conversationName={conversation.name || undefined}
                  onGetOptimisticCallbacks={handleGetOptimisticCallbacks}
                  onMarkAsRead={handleMarkAsRead}
                />
              </DragDropZone>
            </div>

            {/* Footer - Input de Mensagem */}
            <div className="bg-silver-100 p-3 border-t border-silver-200">
              <SendMessageForm
                phone={phone}
                clientId={clientId}
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                onClearAttachments={handleClearAttachments}
                onOptimisticMessage={optimisticCallbacksRef.current?.onOptimisticMessage}
                onMessageError={optimisticCallbacksRef.current?.onMessageError}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-silver-50">
            <div className="text-center">
              <MessageCircle className="h-20 w-20 text-silver-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-erie-black-700 mb-2">
                Nenhuma conversa selecionada
              </h3>
              <p className="text-erie-black-500">
                Selecione uma conversa na lateral para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
