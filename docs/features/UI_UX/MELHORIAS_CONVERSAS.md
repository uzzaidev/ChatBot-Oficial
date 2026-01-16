# 💬 Melhorias UX/UI - Página de Conversas

**Data:** 2026-01-15  
**Status:** 📋 Planejamento Completo  
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 4 horas

---

## 🎯 Objetivo

Melhorar significativamente a UX/UI da página de conversas com:
- Métricas visuais com tags
- Layout mais informativo
- Indicadores claros de status (Flow, Humano, Bot)
- Visualização melhor do que é cada coisa

---

## 📊 1. Métricas com Tags no Header

### 1.1 Cards de Métricas Interativos

**Localização:** Topo da sidebar, após o header, antes da pesquisa

**O que fazer:**
- 4 cards clicáveis mostrando contadores por status
- Cores diferentes para cada status
- Animação ao clicar (filtra automaticamente)
- Estado ativo visual

**Layout:**
```
┌─────────────────────────────────┐
│  [Todas: 26]  [Bot: 12]        │
│  [Humano: 8]  [Em Flow: 6]     │
└─────────────────────────────────┘
```

**Código Completo:**

```tsx
// src/components/ConversationMetricCard.tsx
'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ConversationMetricCardProps {
  label: string
  value: number
  icon: LucideIcon
  gradient: string // Tailwind gradient classes
  onClick: () => void
  active?: boolean
  description?: string
}

export const ConversationMetricCard = ({
  label,
  value,
  icon: Icon,
  gradient,
  onClick,
  active = false,
  description
}: ConversationMetricCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full p-3 rounded-xl border-2 transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-uzz-mint focus:ring-offset-2",
        active
          ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-lg`
          : "bg-white border-uzz-silver text-uzz-black hover:border-uzz-mint hover:bg-gradient-to-br hover:from-gray-50 hover:to-white"
      )}
      aria-label={`Filtrar por ${label}: ${value} conversas`}
      aria-pressed={active}
    >
      {/* Barra superior decorativa */}
      {active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
      )}

      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          active ? "text-white/90" : "text-uzz-silver"
        )}>
          {label}
        </span>
        <div className={cn(
          "p-1.5 rounded-lg",
          active ? "bg-white/20" : `bg-gradient-to-br ${gradient}`
        )}>
          <Icon className={cn(
            "h-4 w-4",
            active ? "text-white" : "text-white"
          )} />
        </div>
      </div>

      <div className={cn(
        "text-3xl font-bold font-poppins",
        active 
          ? "text-white" 
          : `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`
      )}>
        {value}
      </div>

      {description && active && (
        <p className="text-[10px] text-white/80 mt-1">
          {description}
        </p>
      )}
    </button>
  )
}
```

**Uso em ConversationsIndexClient:**

```tsx
// Calcular métricas
const metrics = useMemo(() => {
  return {
    total: conversations.length,
    bot: conversations.filter(c => c.status === 'bot').length,
    humano: conversations.filter(c => c.status === 'humano').length,
    emFlow: conversations.filter(c => c.status === 'fluxo_inicial').length,
    transferido: conversations.filter(c => c.status === 'transferido').length,
  }
}, [conversations])

// Adicionar após o header, antes da pesquisa
<div className="p-4 border-b border-uzz-silver bg-gradient-to-br from-white via-gray-50 to-white">
  <div className="grid grid-cols-2 gap-3">
    <ConversationMetricCard
      label="Todas"
      value={metrics.total}
      icon={List}
      gradient="from-uzz-mint to-uzz-blue"
      onClick={() => setStatusFilter('all')}
      active={statusFilter === 'all'}
      description="Total de conversas"
    />
    <ConversationMetricCard
      label="Bot"
      value={metrics.bot}
      icon={Bot}
      gradient="from-uzz-blue to-blue-600"
      onClick={() => setStatusFilter('bot')}
      active={statusFilter === 'bot'}
      description="Bot respondendo"
    />
    <ConversationMetricCard
      label="Humano"
      value={metrics.humano}
      icon={User}
      gradient="from-green-500 to-green-600"
      onClick={() => setStatusFilter('humano')}
      active={statusFilter === 'humano'}
      description="Atendimento humano"
    />
    <ConversationMetricCard
      label="Em Flow"
      value={metrics.emFlow}
      icon={Workflow}
      gradient="from-purple-500 to-purple-600"
      onClick={() => setStatusFilter('fluxo_inicial')}
      active={statusFilter === 'fluxo_inicial'}
      description="Flow interativo"
    />
  </div>
</div>
```

---

## 🎨 2. Layout Melhorado da Lista de Conversas

### 2.1 Cards de Conversa Mais Informativos

**O que melhorar:**
- Avatar maior com badge de status
- Informações mais organizadas
- Tags visuais mais claras
- Indicadores de prioridade
- Preview da última mensagem melhorado

**Código Completo:**

```tsx
// src/components/ConversationList.tsx - Versão Melhorada

<div className={cn(
  "group relative p-4 cursor-pointer transition-all duration-200",
  "border-l-4 border-b border-uzz-silver/20",
  "hover:shadow-md hover:bg-gradient-to-r hover:from-gray-50 hover:to-white",
  isActive 
    ? "bg-gradient-to-r from-uzz-mint/20 to-uzz-blue/20 border-l-uzz-mint shadow-sm" 
    : "",
  hasUnread && !isActive && "bg-uzz-blue/5 border-l-uzz-blue"
)}>
  <div className="flex items-start gap-4">
    {/* Avatar com Badge de Status */}
    <div className="relative flex-shrink-0">
      <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
        <AvatarFallback className="bg-gradient-to-br from-uzz-mint to-uzz-blue text-white text-lg font-poppins font-bold">
          {getInitials(conversation.name)}
        </AvatarFallback>
      </Avatar>
      
      {/* Badge de status no canto inferior direito do avatar */}
      <div className="absolute -bottom-1 -right-1 z-10">
        <StatusBadge 
          status={conversation.status} 
          showIcon={true} 
          size="sm"
        />
      </div>

      {/* Indicador de "novo" (últimas 5min) */}
      {isVeryRecent && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-uzz-mint rounded-full border-2 border-white shadow-lg animate-pulse" />
      )}
    </div>

    {/* Informações Principais */}
    <div className="flex-1 min-w-0">
      {/* Nome e Timestamp */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-poppins font-bold text-base truncate mb-0.5",
            hasUnread && !isActive ? "text-uzz-black" : "text-uzz-black"
          )}>
            {conversation.name || formatPhone(conversation.phone)}
          </h3>
          <p className="text-xs text-uzz-silver">
            {formatPhone(conversation.phone)}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
          <span className="text-xs text-uzz-silver whitespace-nowrap">
            {formatDateTime(conversation.last_update)}
          </span>
          {hasUnread && !isActive && (
            <div className="bg-gradient-to-r from-uzz-mint to-uzz-blue text-white text-[11px] rounded-full min-w-[22px] h-5 px-2 flex items-center justify-center font-bold shadow-lg shadow-uzz-mint/30">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </div>
          )}
        </div>
      </div>

      {/* Última Mensagem */}
      <div className="mb-2">
        <p className={cn(
          "text-sm line-clamp-2",
          hasUnread && !isActive 
            ? "font-semibold text-uzz-black" 
            : "text-gray-600"
        )}>
          {conversation.last_message
            ? truncateText(conversation.last_message, 60)
            : "Nenhuma mensagem ainda"
          }
        </p>
      </div>

      {/* Tags e Indicadores */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tag de Status Principal */}
        {conversation.status === 'humano' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-bold border border-green-200">
            <User className="h-3 w-3" />
            Atendimento Humano
          </span>
        )}
        {conversation.status === 'fluxo_inicial' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-bold border border-purple-200">
            <Workflow className="h-3 w-3" />
            Em Flow Interativo
          </span>
        )}
        {conversation.status === 'bot' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-bold border border-blue-200">
            <Bot className="h-3 w-3" />
            Bot Respondendo
          </span>
        )}
        {conversation.status === 'transferido' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full font-bold border border-orange-200">
            <ArrowRight className="h-3 w-3" />
            Aguardando Humano
          </span>
        )}

        {/* Indicador de tempo de resposta (se disponível) */}
        {conversation.avg_response_time && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            <Clock className="h-3 w-3" />
            {formatResponseTime(conversation.avg_response_time)}
          </span>
        )}

        {/* Indicador de prioridade (se implementado) */}
        {conversation.priority === 'high' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
            🔴 Alta Prioridade
          </span>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## 🏷️ 3. StatusBadge Melhorado com Tooltips

### 3.1 Badge Mais Visual e Informativo

**Arquivo:** `src/components/StatusBadge.tsx`

**Melhorias:**
- Cores mais vibrantes (gradientes)
- Tooltips explicativos
- Ícones maiores
- Variantes de tamanho

**Código:**

```tsx
// src/components/StatusBadge.tsx - Versão Melhorada
'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Bot, User, ArrowRight, Workflow, HelpCircle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

type StatusConfig = {
  label: string
  icon: LucideIcon
  gradient: string // Tailwind gradient classes
  description: string
}

const statusConfig: Record<string, StatusConfig> = {
  bot: {
    label: 'Bot',
    icon: Bot,
    gradient: 'from-uzz-blue to-blue-600',
    description: 'Bot está respondendo automaticamente'
  },
  humano: {
    label: 'Humano',
    icon: User,
    gradient: 'from-green-500 to-green-600',
    description: 'Atendimento humano ativo'
  },
  transferido: {
    label: 'Transferido',
    icon: ArrowRight,
    gradient: 'from-orange-500 to-orange-600',
    description: 'Aguardando atendimento humano'
  },
  fluxo_inicial: {
    label: 'Em Flow',
    icon: Workflow,
    gradient: 'from-purple-500 to-purple-600',
    description: 'Conversa em flow interativo'
  },
}

const defaultConfig: StatusConfig = {
  label: 'Desconhecido',
  icon: HelpCircle,
  gradient: 'from-gray-500 to-gray-600',
  description: 'Status desconhecido'
}

const sizeClasses = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4'
}

export const StatusBadge = ({ 
  status, 
  showIcon = true, 
  size = 'sm',
  showTooltip = true
}: StatusBadgeProps) => {
  const config = statusConfig[status] || defaultConfig
  const Icon = config.icon

  const badgeContent = (
    <Badge className={cn(
      `bg-gradient-to-r ${config.gradient} text-white border-0`,
      sizeClasses[size],
      "font-bold shadow-sm hover:shadow-md transition-all"
    )}>
      {showIcon && <Icon className={cn("mr-1.5", iconSizes[size])} />}
      {config.label}
    </Badge>
  )

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="text-sm font-semibold mb-1">{config.label}</p>
            <p className="text-xs text-gray-300">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}
```

---

## 📱 4. Layout Responsivo Melhorado

### 4.1 Grid Adaptativo

**Desktop (≥1024px):**
- Métricas: 4 colunas (2x2)
- Lista: Full width sidebar

**Tablet (768-1023px):**
- Métricas: 2 colunas (2x2)
- Lista: Full width sidebar

**Mobile (<768px):**
- Métricas: 2 colunas (scroll horizontal opcional)
- Lista: Full width

**Código:**

```tsx
// Grid responsivo para métricas
<div className="grid grid-cols-2 lg:grid-cols-2 gap-3 p-4">
  {/* Cards de métricas */}
</div>

// Lista responsiva
<div className="flex-1 overflow-y-auto">
  {/* Conversas */}
</div>
```

---

## 🎯 5. Indicadores Visuais Avançados

### 5.1 Pulse Animation para Conversas Novas

**O que fazer:**
- Detectar conversas das últimas 5 minutos
- Adicionar animação pulse sutil
- Indicador visual "novo"

**Código:**

```tsx
// Detectar conversas muito recentes
const isVeryRecent = useMemo(() => {
  if (!conversation.last_update) return false
  const lastUpdate = new Date(conversation.last_update).getTime()
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  return lastUpdate > fiveMinutesAgo
}, [conversation.last_update])

// Aplicar classe de animação
<div className={cn(
  "relative",
  isVeryRecent && "animate-pulse"
)}>
  {/* Indicador de "novo" */}
  {isVeryRecent && (
    <div className="absolute -top-1 -right-1 z-20">
      <div className="w-3 h-3 bg-uzz-mint rounded-full border-2 border-white shadow-lg animate-ping" />
      <div className="absolute top-0 left-0 w-3 h-3 bg-uzz-mint rounded-full border-2 border-white" />
    </div>
  )}
</div>
```

---

### 5.2 Indicador de Tempo de Resposta

**O que fazer:**
- Mostrar tempo médio de resposta (se disponível)
- Badge pequeno com ícone de relógio
- Cores semânticas (verde = rápido, laranja = médio, vermelho = lento)

**Código:**

```tsx
// Função helper
const formatResponseTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

const getResponseTimeColor = (ms: number): string => {
  if (ms < 2000) return 'bg-green-100 text-green-700 border-green-200'
  if (ms < 5000) return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

// Uso no card
{conversation.avg_response_time && (
  <span className={cn(
    "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border",
    getResponseTimeColor(conversation.avg_response_time)
  )}>
    <Clock className="h-3 w-3" />
    {formatResponseTime(conversation.avg_response_time)}
  </span>
)}
```

---

## 📊 6. Empty States Contextuais

### 6.1 Empty States por Filtro

**O que fazer:**
- Empty state diferente para cada filtro
- Mensagens específicas e úteis
- Sugestões de ação

**Código:**

```tsx
// Empty state contextual
{filteredConversations.length === 0 && !loading && (
  <EmptyStateSimple
    icon={
      statusFilter === 'all' ? MessageCircle : 
      statusFilter === 'bot' ? Bot :
      statusFilter === 'humano' ? User :
      statusFilter === 'fluxo_inicial' ? Workflow : 
      statusFilter === 'transferido' ? ArrowRight : MessageCircle
    }
    title={
      statusFilter === 'all' ? "Nenhuma conversa encontrada" :
      statusFilter === 'bot' ? "Nenhuma conversa com bot" :
      statusFilter === 'humano' ? "Nenhuma conversa com humano" :
      statusFilter === 'fluxo_inicial' ? "Nenhuma conversa em flow" :
      statusFilter === 'transferido' ? "Nenhuma conversa transferida" :
      "Nenhuma conversa encontrada"
    }
    description={
      statusFilter === 'all' 
        ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
        : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
    }
    actionLabel={statusFilter !== 'all' ? "Ver Todas as Conversas" : undefined}
    onAction={statusFilter !== 'all' ? () => setStatusFilter('all') : undefined}
  />
)}
```

---

## ✅ Checklist de Implementação

### Fase 6.1: Métricas com Tags (1.5h)
- [ ] Criar componente `ConversationMetricCard.tsx`
- [ ] Calcular métricas por status
- [ ] Adicionar grid de métricas no topo
- [ ] Implementar clique para filtrar
- [ ] Adicionar animações e estados ativos

### Fase 6.2: Layout Melhorado (1h)
- [ ] Melhorar cards de conversa
- [ ] Avatar maior com badge de status
- [ ] Organizar informações melhor
- [ ] Adicionar tags visuais
- [ ] Melhorar preview de mensagem

### Fase 6.3: StatusBadge Melhorado (30min)
- [ ] Adicionar gradientes
- [ ] Implementar tooltips
- [ ] Melhorar ícones
- [ ] Adicionar descrições

### Fase 6.4: Empty States (30min)
- [ ] Empty states contextuais
- [ ] Mensagens específicas por filtro
- [ ] Sugestões de ação

### Fase 6.5: Indicadores Avançados (1h)
- [ ] Pulse animation para novas
- [ ] Indicador de tempo de resposta
- [ ] Badge de prioridade (futuro)
- [ ] Indicador de "digitando..." (futuro)

---

## 🎨 Exemplo Visual do Layout Final

```
┌─────────────────────────────────────────────────────────┐
│  [Conversas]                    [🏠 Início]            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Todas   │ │  Bot    │ │ Humano  │ │ Em Flow │      │
│  │   26    │ │   12    │ │    8    │ │    6    │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├─────────────────────────────────────────────────────────┤
│  🔍 Pesquisar contatos ou números...                   │
├─────────────────────────────────────────────────────────┤
│  [Todas] [Bot] [Humano] [Transferido] [Em Flow]       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  [SM]  Sandro Miguel          [Humano]    51m    │  │
│  │        5511999999999                             │  │
│  │        Olá, preciso de ajuda...                   │  │
│  │        👤 Atendimento Humano                     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [PV]  Pedro Vitor PV      [Em Flow]    2d      │  │
│  │        5511888888888                             │  │
│  │        Obrigado pela informação!                 │  │
│  │        🔄 Em Flow Interativo                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Referências

- **Guia Dashboard:** `docs/features/UI_UX/Guia-Dashboard-UX-UI.html`
- **Guia Completo:** `docs/features/UI_UX/Guia-Completo-UX-UI-Explicado.html`
- **Plano Geral:** `docs/features/UI_UX/PLANO_IMPLEMENTACAO_VISUAL.md`

---

**Última atualização:** 2026-01-15

