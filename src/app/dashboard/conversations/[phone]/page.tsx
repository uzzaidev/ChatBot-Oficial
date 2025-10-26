'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { ConversationDetail } from '@/components/ConversationDetail'
import { SendMessageForm } from '@/components/SendMessageForm'
import { useConversations } from '@/hooks/useConversations'
import { ConversationList } from '@/components/ConversationList'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import { MessageCircle, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

interface ConversationPageProps {
  params: {
    phone: string
  }
}

const DEFAULT_CLIENT_ID = 'demo-client-id'

export default function ConversationPage({ params }: ConversationPageProps) {
  const { phone } = params
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client_id') || DEFAULT_CLIENT_ID

  const { conversations, loading } = useConversations({
    clientId,
    enableRealtime: true,
  })

  const conversation = conversations.find((c) => c.phone === phone)

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar - Lista de Conversas (estilo WhatsApp Web) */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Header da Sidebar */}
        <div className="bg-secondary p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-white" />
            <h2 className="text-white font-semibold text-lg">ChatBot</h2>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white hover:bg-secondary-foreground/10">
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
          />
        </div>
      </div>

      {/* Área de Chat Principal */}
      <div className="flex-1 flex flex-col">
        {conversation ? (
          <>
            {/* Header do Chat */}
            <div className="bg-muted p-3 flex items-center gap-3 border-b border-gray-200">
              <Avatar>
                <AvatarFallback className="bg-primary text-white">
                  {getInitials(conversation.name || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{conversation.name}</h3>
                <p className="text-xs text-muted-foreground">{conversation.phone}</p>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-hidden whatsapp-bg">
              <ConversationDetail
                phone={phone}
                clientId={clientId}
                conversationName={conversation.name || undefined}
                conversationStatus={conversation.status}
              />
            </div>

            {/* Footer - Input de Mensagem */}
            <div className="bg-muted p-3 border-t border-gray-200">
              <SendMessageForm
                phone={phone}
                clientId={clientId}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center whatsapp-bg">
            <div className="text-center">
              <MessageCircle className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhuma conversa selecionada
              </h3>
              <p className="text-gray-500">
                Selecione uma conversa na lateral para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
