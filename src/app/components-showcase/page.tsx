'use client'

/**
 * UzzApp Frontend Showcase
 * 
 * Simulações completas do frontend do UzzApp
 * Acesse em: http://localhost:3000/components-showcase
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MetricCard } from '@/components/MetricCard'
import { ConversationMetricCard } from '@/components/ConversationMetricCard'
import { StatusBadge } from '@/components/StatusBadge'
import { 
  Layout, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Workflow, 
  FileText, 
  Settings,
  Home,
  Search,
  Bot,
  User,
  ArrowRight,
  List,
  TrendingUp,
  Send,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  Filter,
  Download,
  Plus,
  MoreVertical,
  X
} from 'lucide-react'
import { CustomizableChart } from '@/components/CustomizableChart'
import { EmptyState } from '@/components/EmptyState'

// Dados mockados para simulação
const mockConversations = [
  {
    id: '1',
    name: 'Pedro Vitor PV',
    phone: '555491590379',
    lastMessage: 'Se precisar de sugestões mais específicas baseadas no seu ca...',
    time: '19h atrás',
    status: 'fluxo_inicial',
    avatar: 'PV',
    unread: 0
  },
  {
    id: '2',
    name: 'Rudi',
    phone: '555191222749',
    lastMessage: 'Se precisar de mais detalhes, é só avisar!',
    time: '1d atrás',
    status: 'fluxo_inicial',
    avatar: 'RU',
    unread: 0
  },
  {
    id: '3',
    name: 'Rafael Telles',
    phone: '555191222749',
    lastMessage: 'Se você quiser, podemos agendar uma demonstração para ver co...',
    time: '1d atrás',
    status: 'fluxo_inicial',
    avatar: 'RT',
    unread: 0
  },
  {
    id: '4',
    name: 'Sandro Miguel',
    phone: '+55 (27) 99660-2588',
    lastMessage: 'Obrigado Sandro, em breve lhe dou um retorno',
    time: '4d atrás',
    status: 'humano',
    avatar: 'SM',
    unread: 0
  },
  {
    id: '5',
    name: 'Vitor Pirolli',
    phone: '555491237070',
    lastMessage: 'Qual desses você gostaria de explorar mais a fundo?',
    time: '08/01/2026, 22:23',
    status: 'bot',
    avatar: 'VP',
    unread: 0
  },
]

const mockMetrics = {
  totalConversations: 7,
  messagesSent: 333,
  resolutionRate: 0,
  totalCost: 0.00,
  botConversations: 0,
  humanConversations: 1,
  flowConversations: 6
}

const mockChartData = [
  { date: '2026-01-15', value: 2 },
  { date: '2026-01-16', value: 1 },
  { date: '2026-01-17', value: 1 },
  { date: '2026-01-18', value: 2 },
  { date: '2026-01-19', value: 1 },
]

const mockMessagesData = [
  { date: '2026-01-15', value: 45 },
  { date: '2026-01-16', value: 52 },
  { date: '2026-01-17', value: 38 },
  { date: '2026-01-18', value: 61 },
  { date: '2026-01-19', value: 42 },
]

// Simulação: Dashboard Principal
function DashboardSimulation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-uzz-silver">
          Visão geral das métricas e performance do seu chatbot
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Conversas"
          value={mockMetrics.totalConversations.toString()}
          icon={MessageSquare}
          trend={{ value: 12, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Mensagens Enviadas"
          value={mockMetrics.messagesSent.toString()}
          icon={Send}
          trend={{ value: 18, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Taxa de Resolução"
          value="0%"
          icon={TrendingUp}
          trend={{ value: 3, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Custo Total (USD)"
          value={`$${mockMetrics.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend={{ value: 8, label: 'esta semana', direction: 'up' }}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card-dark border-white/10">
          <CardHeader>
            <CardTitle>Conversas por Dia</CardTitle>
            <CardDescription>Total de conversas iniciadas diariamente</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomizableChart
              config={{
                id: 'showcase_conversations',
                type: 'area',
                metricType: 'conversations_per_day',
                title: 'Conversas por Dia',
                description: 'Total de conversas iniciadas diariamente',
                colors: { primary: '#3b82f6', secondary: '#93c5fd' },
                showGrid: true,
                showLegend: true,
                height: 300,
                position: { x: 0, y: 0, w: 6, h: 2 },
              }}
              data={mockChartData.map(d => ({ date: d.date, conversations: d.value }))}
            />
          </CardContent>
        </Card>

        <Card className="bg-card-dark border-white/10">
          <CardHeader>
            <CardTitle>Mensagens por Dia</CardTitle>
            <CardDescription>Mensagens enviadas e recebidas</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomizableChart
              config={{
                id: 'showcase_messages',
                type: 'bar',
                metricType: 'messages_per_day',
                title: 'Mensagens por Dia',
                description: 'Mensagens enviadas e recebidas',
                colors: { primary: '#10b981', secondary: '#6ee7b7' },
                showGrid: true,
                showLegend: true,
                height: 300,
                position: { x: 6, y: 0, w: 6, h: 2 },
              }}
              data={mockMessagesData.map(d => ({ date: d.date, messages: d.value }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Simulação: Página de Conversas - Baseada no HTML de Referência
function ConversationsSimulation() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'>('all')

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #242f36 0%, #1C1C1C 60%)' }}>
      {/* Sidebar com Lista de Conversas - Estilo UZZ.AI */}
      <div className="w-full lg:w-80 flex flex-col" style={{ background: 'rgba(28, 28, 28, 0.95)', borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {/* Header da Sidebar */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: '#1ABC9C' }} />
              <h2 className="font-poppins font-semibold text-lg" style={{ color: '#1ABC9C' }}>Conversas</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>

          {/* Cards de Métricas KPI - Estilo Elegante */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card TODAS - Highlight */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#2E86AB]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'all' ? '#1ABC9C' : '#B0B0B0' }}>
                TODAS
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {mockMetrics.totalConversations}
              </div>
              <div className="text-xs text-white/50">Total de conversas</div>
              <List className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#2E86AB' }} />
            </button>

            {/* Card BOT */}
            <button
              onClick={() => setStatusFilter('bot')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'bot'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#2E86AB] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#2E86AB]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'bot' ? '#2E86AB' : '#B0B0B0' }}>
                BOT RESPONDENDO
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {mockMetrics.botConversations}
              </div>
              <div className="text-xs text-white/50">Bot respondendo</div>
              <Bot className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#2E86AB' }} />
            </button>

            {/* Card HUMANO */}
            <button
              onClick={() => setStatusFilter('humano')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'humano'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#1ABC9C]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'humano' ? '#1ABC9C' : '#B0B0B0' }}>
                HUMANO
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {mockMetrics.humanConversations}
              </div>
              <div className="text-xs text-white/50">Atendimento humano</div>
              <User className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#1ABC9C' }} />
            </button>

            {/* Card EM FLOW */}
            <button
              onClick={() => setStatusFilter('fluxo_inicial')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'fluxo_inicial'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#9b59b6] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#9b59b6]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'fluxo_inicial' ? '#9b59b6' : '#B0B0B0' }}>
                EM FLOW
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {mockMetrics.flowConversations}
              </div>
              <div className="text-xs text-white/50">Flow interativo</div>
              <Workflow className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#9b59b6' }} />
            </button>
          </div>
        </div>

        {/* Campo de Pesquisa */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B0B0B0' }} />
            <input
              type="text"
              placeholder="Pesquisar contatos..."
              className="w-full bg-[#151515] border border-white/10 rounded-lg px-10 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#1ABC9C] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {/* Filtros - Estilo Elegante */}
        <div className="px-4 py-3 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-xs px-3 py-1.5 rounded transition-all ${
              statusFilter === 'all'
                ? 'text-[#1ABC9C] border-b-2 border-[#1ABC9C] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('bot')}
            className={`text-xs px-3 py-1.5 rounded transition-all ${
              statusFilter === 'bot'
                ? 'text-[#2E86AB] border-b-2 border-[#2E86AB] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Bot
          </button>
          <button
            onClick={() => setStatusFilter('humano')}
            className={`text-xs px-3 py-1.5 rounded transition-all ${
              statusFilter === 'humano'
                ? 'text-[#1ABC9C] border-b-2 border-[#1ABC9C] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Humano
          </button>
          <button
            onClick={() => setStatusFilter('transferido')}
            className={`text-xs px-3 py-1.5 rounded transition-all ${
              statusFilter === 'transferido'
                ? 'text-orange-400 border-b-2 border-orange-400 pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Transferido
          </button>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {mockConversations.length > 0 ? (
            mockConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all ${
                  selectedConversation === conv.id
                    ? 'bg-gradient-to-r from-[#1ABC9C]/10 to-transparent border-l-2 border-l-[#1ABC9C]'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #2E86AB, #1ABC9C)' }}
                    >
                      {conv.avatar}
                    </div>
                    {conv.status === 'fluxo_inicial' && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#9b59b6] rounded-full border-2 border-[#252525] flex items-center justify-center">
                        <Workflow className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm text-white truncate">{conv.name}</h3>
                      <span className="text-xs text-white/50 whitespace-nowrap ml-2">{conv.time}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          conv.status === 'fluxo_inicial'
                            ? 'border-[#9b59b6]/30 text-[#9b59b6] bg-[#9b59b6]/10'
                            : conv.status === 'humano'
                            ? 'border-[#1ABC9C]/30 text-[#1ABC9C] bg-[#1ABC9C]/10'
                            : 'border-[#2E86AB]/30 text-[#2E86AB] bg-[#2E86AB]/10'
                        }`}
                      >
                        {conv.status === 'fluxo_inicial' ? 'Em Flow' : conv.status === 'humano' ? 'Humano' : 'Bot'}
                      </Badge>
                      <span className="text-xs text-white/40 truncate">{conv.phone}</span>
                    </div>
                    <p className="text-sm text-white/60 truncate leading-relaxed">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-white/50">
              <Search className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhum contato encontrado no momento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Área Principal - Chat Window */}
      <div className="flex-1 flex flex-col" style={{ background: '#1a1a1a' }}>
        {selectedConversation ? (
          <>
            {/* Header da Conversa */}
            <div className="bg-[#252525] border-b border-white/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2E86AB, #1ABC9C)' }}
                >
                  PV
                </div>
                <div>
                  <h3 className="font-semibold text-white">Pedro Vitor PV</h3>
                  <p className="text-sm text-white/50">555491590379</p>
                </div>
                <Badge variant="outline" className="border-[#9b59b6]/30 text-[#9b59b6] bg-[#9b59b6]/10">
                  Em Flow
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(46, 134, 171, 0.08) 0%, transparent 70%)' }}>
              {/* Mensagem recebida */}
              <div className="flex gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style={{ background: '#2E86AB' }}
                >
                  PV
                </div>
                <div className="flex-1">
                  <div className="bg-[#252525] rounded-lg p-3 max-w-md border border-white/5">
                    <p className="text-sm text-white">Olá, preciso de ajuda com o chatbot</p>
                  </div>
                  <span className="text-xs text-white/40 mt-1 block">19:01</span>
                </div>
              </div>

              {/* Mensagens enviadas */}
              <div className="flex gap-3 justify-end">
                <div className="flex-1 flex flex-col items-end max-w-md">
                  <div className="rounded-lg p-3 text-white text-sm" style={{ background: 'linear-gradient(135deg, #1ABC9C, #2E86AB)' }}>
                    <p>Olá! Como posso ajudar você hoje?</p>
                  </div>
                  <span className="text-xs text-white/40 mt-1">19:02</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <div className="flex-1 flex flex-col items-end max-w-md">
                  <div className="rounded-lg p-3 text-white text-sm" style={{ background: 'linear-gradient(135deg, #1ABC9C, #2E86AB)' }}>
                    <p>Posso ajudar com configurações, dúvidas sobre funcionalidades ou suporte técnico.</p>
                  </div>
                  <span className="text-xs text-white/40 mt-1 flex items-center gap-1">
                    19:03 <CheckCircle2 className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Input de Mensagem */}
            <div className="bg-[#252525] border-t border-white/5 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#1ABC9C] transition-colors"
                />
                <Button
                  className="rounded-lg"
                  style={{ background: '#1ABC9C', color: '#1C1C1C' }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(46, 134, 171, 0.08) 0%, transparent 70%)' }}>
            <div className="text-center max-w-md px-6">
              <div className="mb-6 flex justify-center">
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center border-2"
                  style={{
                    background: 'linear-gradient(135deg, #252525, #1C1C1C)',
                    borderColor: '#1ABC9C',
                    boxShadow: '0 0 20px rgba(26, 188, 156, 0.2)'
                  }}
                >
                  <Bot className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                </div>
              </div>
              <h2 className="font-poppins font-semibold text-xl text-white mb-3">
                Nenhuma conversa selecionada
              </h2>
              <p className="text-white/60 mb-6 max-w-xs mx-auto leading-relaxed">
                O robô da UzzAi está aguardando novas interações. Selecione um contato ou inicie um teste.
              </p>
              <Button
                className="rounded-lg font-exo2 font-semibold flex items-center gap-2"
                style={{ background: '#1ABC9C', color: '#1C1C1C' }}
              >
                <Plus className="h-4 w-4" />
                Novo Atendimento
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simulação: Página de Contatos
function ContactsSimulation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent mb-2">
            Contatos
          </h1>
          <p className="text-uzz-silver">
            Gerencie seus contatos e clientes
          </p>
        </div>
        <Button className="bg-gradient-to-r from-uzz-mint to-uzz-blue">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Contato
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card className="bg-card-dark border-white/10">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-uzz-silver" />
              <Input
                placeholder="Buscar contatos..."
                className="pl-10 bg-[#1a1f26] border-white/10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockConversations.map((contact) => (
          <Card key={contact.id} className="bg-card-dark border-white/10 hover:border-uzz-mint/30 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-uzz-mint to-uzz-blue text-white">
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 truncate">{contact.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-uzz-silver mb-2">
                    <Phone className="h-3 w-3" />
                    <span className="truncate">{contact.phone}</span>
                  </div>
                  <StatusBadge status={contact.status} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Simulação: Página de Analytics
function AnalyticsSimulation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent mb-2">
          Analytics
        </h1>
        <p className="text-uzz-silver">
          Análise detalhada de performance e métricas
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Conversas"
          value={mockMetrics.totalConversations.toString()}
          icon={MessageSquare}
          trend={{ value: 12, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Mensagens"
          value={mockMetrics.messagesSent.toString()}
          icon={Send}
          trend={{ value: 18, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Taxa de Resolução"
          value="0%"
          icon={TrendingUp}
          trend={{ value: 3, label: 'esta semana', direction: 'up' }}
        />
        <MetricCard
          title="Custo Total"
          value={`$${mockMetrics.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend={{ value: 8, label: 'esta semana', direction: 'up' }}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card-dark border-white/10">
          <CardHeader>
            <CardTitle>Conversas por Dia</CardTitle>
            <CardDescription>Evolução diária de conversas</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomizableChart
              config={{
                id: 'analytics_conversations',
                type: 'area',
                metricType: 'conversations_per_day',
                title: 'Conversas por Dia',
                description: 'Evolução diária de conversas',
                colors: { primary: '#1ABC9C', secondary: '#2E86AB' },
                showGrid: true,
                showLegend: true,
                height: 300,
                position: { x: 0, y: 0, w: 6, h: 2 },
              }}
              data={mockChartData.map(d => ({ date: d.date, conversations: d.value }))}
            />
          </CardContent>
        </Card>

        <Card className="bg-card-dark border-white/10">
          <CardHeader>
            <CardTitle>Mensagens por Dia</CardTitle>
            <CardDescription>Volume de mensagens diárias</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomizableChart
              config={{
                id: 'analytics_messages',
                type: 'bar',
                metricType: 'messages_per_day',
                title: 'Mensagens por Dia',
                description: 'Volume de mensagens diárias',
                colors: { primary: '#2E86AB', secondary: '#1ABC9C' },
                showGrid: true,
                showLegend: true,
                height: 300,
                position: { x: 6, y: 0, w: 6, h: 2 },
              }}
              data={mockMessagesData.map(d => ({ date: d.date, messages: d.value }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Simulação: Página de Flows
function FlowsSimulation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent mb-2">
            Flows Interativos
          </h1>
          <p className="text-uzz-silver">
            Crie e gerencie flows de conversação automatizados
          </p>
        </div>
        <Button className="bg-gradient-to-r from-uzz-mint to-uzz-blue">
          <Plus className="h-4 w-4 mr-2" />
          Novo Flow
        </Button>
      </div>

      {/* Empty State */}
      <EmptyState
        icon={Workflow}
        title="Nenhum flow criado"
        description="Crie seu primeiro flow interativo para automatizar conversas"
        actionLabel="Criar Flow"
        onAction={() => {}}
      />
    </div>
  )
}

export default function ComponentsShowcasePage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-[#0f1419] border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent">
                UzzApp Frontend Showcase
              </h1>
              <p className="text-uzz-silver text-sm mt-1">
                Simulações completas do frontend do UzzApp
              </p>
            </div>
            <Badge variant="outline" className="text-uzz-mint border-uzz-mint/30">
              Preview Mode
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="border-b border-white/10 bg-[#1a1f26]">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-none h-auto p-0">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none"
              >
                <Layout className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="conversations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversas
              </TabsTrigger>
              <TabsTrigger 
                value="contacts"
                className="data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none"
              >
                <Users className="h-4 w-4 mr-2" />
                Contatos
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="flows"
                className="data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none"
              >
                <Workflow className="h-4 w-4 mr-2" />
                Flows
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Conteúdo das Simulações */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="dashboard" className="mt-0">
            <DashboardSimulation />
          </TabsContent>
          
          <TabsContent value="conversations" className="mt-0">
            <div className="relative" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
              <ConversationsSimulation />
            </div>
          </TabsContent>
          
          <TabsContent value="contacts" className="mt-0">
            <ContactsSimulation />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-0">
            <AnalyticsSimulation />
          </TabsContent>
          
          <TabsContent value="flows" className="mt-0">
            <FlowsSimulation />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-uzz-silver text-sm">
          <p>
            Estas são simulações do frontend do UzzApp para visualização de componentes integrados.
          </p>
          <p className="mt-2 text-xs opacity-70">
            Use React Grab (<code className="text-uzz-mint">Ctrl+C</code> + clique) para copiar qualquer componente
          </p>
        </div>
      </div>
    </div>
  )
}
