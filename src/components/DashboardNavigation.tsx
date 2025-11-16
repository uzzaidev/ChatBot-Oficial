'use client'

import { MessageSquare, LayoutDashboard, Settings, BarChart3, ChevronLeft, ChevronRight, GitBranch, Terminal, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { LogoutButton } from '@/components/LogoutButton'
import { Button } from '@/components/ui/button'
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
}

const NavItem = ({ href, icon, label, isCollapsed, onClick }: NavItemProps) => {
  const pathname = usePathname()
  // Check if current route matches this nav item
  const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard')

  return (
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
      {!isCollapsed && <span className="font-medium">{label}</span>}
    </Link>
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
        <h1 className={cn(
          "text-2xl font-bold text-blue-600 flex items-center gap-2",
          isCollapsed && "justify-center"
        )}>
          <MessageSquare className="h-6 w-6 flex-shrink-0" />
          {!isCollapsed && "ChatBot"}
        </h1>
        {!isCollapsed && (
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard WhatsApp
          </p>
        )}
      </div>

      <Separator className="mb-6" />

      <nav className="space-y-2 flex-1">
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="h-5 w-5 flex-shrink-0" />}
          label="Dashboard"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
        />

        <NavItem
          href="/dashboard/conversations"
          icon={<MessageSquare className="h-5 w-5 flex-shrink-0" />}
          label="Conversas"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
        />

        <NavItem
          href="/dashboard/analytics"
          icon={<BarChart3 className="h-5 w-5 flex-shrink-0" />}
          label="Analytics"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
        />

        <NavItem
          href="/dashboard/flow-architecture"
          icon={<GitBranch className="h-5 w-5 flex-shrink-0" />}
          label="Arquitetura do Fluxo"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
        />

        <NavItem
          href="/dashboard/backend"
          icon={<Terminal className="h-5 w-5 flex-shrink-0" />}
          label="Backend Monitor"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
        />

        <NavItem
          href="/dashboard/settings"
          icon={<Settings className="h-5 w-5 flex-shrink-0" />}
          label="Configurações"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
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
            <p>Versão 1.0.0 - Phase 3</p>
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
