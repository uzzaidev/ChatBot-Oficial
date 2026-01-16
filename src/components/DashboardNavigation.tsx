'use client'

import { MessageSquare, LayoutDashboard, Settings, BarChart3, ChevronLeft, ChevronRight, GitBranch, Terminal, CheckCircle, BookOpen, Users, Workflow, FileText, Zap, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { LogoutButton } from '@/components/LogoutButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DashboardNavigationProps {
  userName?: string
  userEmail?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onLinkClick?: () => void
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isCollapsed?: boolean
  onClick?: () => void
  badge?: 'new' | 'beta' | 'admin' | 'dev'
  tooltip?: string
}

const NavItem = ({ href, icon, label, isCollapsed, onClick, badge, tooltip }: NavItemProps) => {
  const pathname = usePathname()
  // Check if current route matches this nav item
  const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard')

  const linkContent = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        isActive
          ? "bg-blue-100 text-blue-700 font-semibold"
          : "hover:bg-gray-100",
        isCollapsed && "justify-center"
      )}
      title={isCollapsed ? label : undefined}
    >
      {icon}
      {!isCollapsed && (
        <>
          <span className="font-medium flex-1">{label}</span>
          {badge && (
            <Badge variant={badge} className="text-[9px] px-2 py-0.5">
              {badge === 'new' ? 'Novo' : badge === 'beta' ? 'Beta' : badge === 'admin' ? 'Admin' : 'Dev'}
            </Badge>
          )}
        </>
      )}
    </Link>
  )

  if (tooltip && !isCollapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px]">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return linkContent
}

interface NavSectionProps {
  title: string
  isCollapsed?: boolean
}

const NavSection = ({ title, isCollapsed }: NavSectionProps) => {
  if (isCollapsed) return null

  return (
    <div className="flex items-center gap-2 px-3 mt-4 mb-2">
      <div className="w-1 h-3 bg-mint-500 rounded-full" />
      <span className="text-[10px] font-bold text-silver-600 uppercase tracking-wider">
        {title}
      </span>
    </div>
  )
}

export function DashboardNavigation({ 
  userName, 
  userEmail, 
  isCollapsed = false,
  onToggleCollapse,
  onLinkClick
}: DashboardNavigationProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        {isCollapsed ? (
          <div className="flex justify-center">
            <MessageSquare className="h-7 w-7 text-uzz-mint" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-normal leading-none">
              <span className="font-poppins text-uzz-mint">Uzz</span>
              <span className="font-exo2 font-semibold text-uzz-blue">.Ai</span>
            </h1>
            <p className="text-xs text-uzz-silver mt-2 tracking-wide">
              Automação Criativa, Realizada
            </p>
          </>
        )}
      </div>

      <Separator className="mb-6" />

      <nav className="space-y-1 flex-1">
        {/* SEÇÃO: PRINCIPAL */}
        <NavSection title="Principal" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="h-5 w-5 flex-shrink-0" />}
          label="Dashboard"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Visão geral com métricas principais e gráficos customizáveis"
        />

        <NavItem
          href="/dashboard/conversations"
          icon={<MessageSquare className="h-5 w-5 flex-shrink-0" />}
          label="Conversas"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Gerenciar conversas do WhatsApp em tempo real"
        />

        {/* SEÇÃO: GESTÃO */}
        <NavSection title="Gestão" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/contacts"
          icon={<Users className="h-5 w-5 flex-shrink-0" />}
          label="Contatos"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Lista completa de clientes e contatos do WhatsApp"
        />

        <NavItem
          href="/dashboard/templates"
          icon={<FileText className="h-5 w-5 flex-shrink-0" />}
          label="Templates"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Templates de mensagens do WhatsApp Business"
        />

        <NavItem
          href="/dashboard/knowledge"
          icon={<BookOpen className="h-5 w-5 flex-shrink-0" />}
          label="Base de Conhecimento"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="new"
          tooltip="Upload de documentos (PDF, TXT) para RAG com busca semântica"
        />

        <NavItem
          href="/dashboard/flows"
          icon={<Workflow className="h-5 w-5 flex-shrink-0" />}
          label="Flows Interativos"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="beta"
          tooltip="Criar fluxos de conversa personalizados (Beta)"
        />

        {/* SEÇÃO: ANÁLISE */}
        <NavSection title="Análise" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/analytics"
          icon={<BarChart3 className="h-5 w-5 flex-shrink-0" />}
          label="Analytics"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Relatórios e análises de conversas, mensagens e custos"
        />

        {/* SEÇÃO: ADMINISTRAÇÃO */}
        <NavSection title="Administração" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/admin/budget-plans"
          icon={<DollarSign className="h-5 w-5 flex-shrink-0" />}
          label="Budget Plans"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="admin"
          tooltip="Gerenciar planos de orçamento e limites de uso (Admin)"
        />

        <NavItem
          href="/dashboard/ai-gateway"
          icon={<Zap className="h-5 w-5 flex-shrink-0" />}
          label="AI Gateway"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="admin"
          tooltip="Configure provedores de IA e monitore custos (Admin)"
        />

        {/* SEÇÃO: DESENVOLVIMENTO */}
        <NavSection title="Desenvolvimento" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/flow-architecture"
          icon={<GitBranch className="h-5 w-5 flex-shrink-0" />}
          label="Arquitetura do Fluxo"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="dev"
          tooltip="Visualizar e editar a arquitetura do chatbot (14 nodes)"
        />

        <NavItem
          href="/dashboard/backend"
          icon={<Terminal className="h-5 w-5 flex-shrink-0" />}
          label="Backend Monitor"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="dev"
          tooltip="Monitorar logs e performance do backend"
        />

        {/* SEÇÃO: CONFIGURAÇÃO */}
        <NavSection title="Configuração" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/settings"
          icon={<Settings className="h-5 w-5 flex-shrink-0" />}
          label="Configurações"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Configurações do sistema, perfil e preferências"
        />
      </nav>

      <Separator className="my-6" />

      {/* User Info & Logout */}
      <div className="space-y-4">
        {!isCollapsed && userName && (
          <div className="text-sm">
            <p className="text-muted-foreground">Conectado como:</p>
            <p className="font-medium truncate" title={userEmail || ''}>
              {userName}
            </p>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate" title={userEmail}>
                {userEmail}
              </p>
            )}
          </div>
        )}

        <LogoutButton isCollapsed={isCollapsed} />
      </div>

      <Separator className="my-6" />

      <div className={cn(
        "text-xs text-muted-foreground",
        isCollapsed && "text-center"
      )}>
        {!isCollapsed && (
          <>
            <p>Versão 2.0.0</p>
            <p className="mt-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Autenticação Ativa
            </p>
          </>
        )}
      </div>

      {/* Toggle button for desktop */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "mt-4 hidden md:flex items-center gap-2",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      )}
    </div>
  )
}
