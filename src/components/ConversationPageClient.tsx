'use client'

import { useState, useEffect } from 'react'
import { ConversationDetail } from '@/components/ConversationDetail'
import { SendMessageForm } from '@/components/SendMessageForm'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { getInitials } from '@/lib/utils'
import { MessageCircle, LayoutDashboard, Menu } from 'lucide-react'
import Link from 'next/link'

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

  const { conversations, loading, lastUpdatePhone: pollingLastUpdate } = useConversations({
    clientId,
    enableRealtime: true,
  })

  // Hook global para notificações em tempo real
  const { lastUpdatePhone: realtimeLastUpdate } = useGlobalRealtimeNotifications()

  // Estado combinado - prioriza realtime, mas aceita polling como fallback
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null)

  useEffect(() => {
    if (realtimeLastUpdate) {
      console.log('[ConversationPage] Atualização via Realtime Global:', realtimeLastUpdate)
      setLastUpdatePhone(realtimeLastUpdate)
    } else if (pollingLastUpdate) {
      console.log('[ConversationPage] Atualização via Polling:', pollingLastUpdate)
      setLastUpdatePhone(pollingLastUpdate)
    }
  }, [realtimeLastUpdate, pollingLastUpdate])

  const conversation = conversations.find((c) => c.phone === phone)

  // Componente de Sidebar (reutilizado para desktop e mobile)
  const SidebarContent = () => (
    <>
      {/* Header da Sidebar */}
      <div className="bg-mint-600 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-white" />
          <h2 className="text-white font-semibold text-lg">ChatBot</h2>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-white hover:bg-mint-700">
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          conversations={conversations}
          loading={loading}
          currentPhone={phone}
          lastUpdatePhone={lastUpdatePhone}
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
            <div className="bg-silver-100 p-3 flex items-center gap-3 border-b border-silver-200">
              {/* Botão Menu (Mobile) */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-mint-500 text-white">
                  {getInitials(conversation.name || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-erie-black-900 truncate">{conversation.name}</h3>
                <p className="text-xs text-erie-black-600 truncate">{conversation.phone}</p>
              </div>

              {/* Badge de Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  conversation.status === 'bot' ? 'bg-mint-100 text-mint-800 border-mint-200' :
                  conversation.status === 'human' ? 'bg-brand-blue-100 text-brand-blue-800 border-brand-blue-200' :
                  'bg-silver-100 text-erie-black-700 border-silver-300'
                }`}>
                  {conversation.status === 'bot' ? 'Bot' : conversation.status === 'human' ? 'Humano' : conversation.status}
                </span>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-hidden bg-silver-50">
              <ConversationDetail
                phone={phone}
                clientId={clientId}
                conversationName={conversation.name || undefined}
              />
            </div>

            {/* Footer - Input de Mensagem */}
            <div className="bg-silver-100 p-3 border-t border-silver-200">
              <SendMessageForm
                phone={phone}
                clientId={clientId}
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
