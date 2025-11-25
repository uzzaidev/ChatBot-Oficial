'use client'

import { useState, useEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { MessageCircle, LayoutDashboard, Bot, User, ArrowRight, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'

interface ConversationsIndexClientProps {
  clientId: string
}

/**
 * ConversationsIndexClient - Client Component
 *
 * Página de índice de conversas que mostra:
 * - Sidebar com lista de conversas (sempre visível)
 * - Filtros por status (todas, bot, humano, transferido)
 * - Área central vazia com mensagem para selecionar uma conversa
 */
export function ConversationsIndexClient({ clientId }: ConversationsIndexClientProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido'>('all')

  const { conversations, loading } = useConversations({
    clientId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    enableRealtime: true,
  })

  // Hook global para notificações em tempo real
  const { lastUpdatePhone } = useGlobalRealtimeNotifications()

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar com Lista de Conversas - Sempre visível em desktop */}
      <div className="w-full lg:w-96 border-r border-silver-200 flex flex-col bg-white">
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
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-mint-600 rounded-none"
              >
                <List className="h-4 w-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="bot"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                <Bot className="h-4 w-4" />
                Bot
              </TabsTrigger>
              <TabsTrigger
                value="humano"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none"
              >
                <User className="h-4 w-4" />
                Humano
              </TabsTrigger>
              <TabsTrigger
                value="transferido"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none"
              >
                <ArrowRight className="h-4 w-4" />
                Transferido
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            loading={loading}
            clientId={clientId}
            lastUpdatePhone={lastUpdatePhone}
          />
        </div>
      </div>

      {/* Área Central - Mensagem para selecionar conversa (visível apenas em lg+) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-silver-50">
        <div className="text-center">
          <MessageCircle className="h-20 w-20 text-silver-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-erie-black-700 mb-2">
            Nenhuma conversa selecionada
          </h3>
          <p className="text-erie-black-500">
            Selecione uma conversa à esquerda para começar
          </p>
        </div>
      </div>
    </div>
  )
}
