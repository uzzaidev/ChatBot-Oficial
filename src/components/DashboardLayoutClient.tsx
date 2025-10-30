'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DashboardNavigation } from '@/components/DashboardNavigation'
import { cn } from '@/lib/utils'

interface DashboardLayoutClientProps {
  userName?: string
  userEmail?: string
  children: React.ReactNode
}

/**
 * DashboardLayoutClient - Client Component
 *
 * Componente client que gerencia:
 * - Estado do sidebar (collapsed/expanded no desktop)
 * - Sheet mobile (hamburger menu)
 * - Responsividade
 * - Oculta-se automaticamente em rotas de conversas
 */
export function DashboardLayoutClient({ 
  userName, 
  userEmail, 
  children 
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Se estiver em qualquer rota de conversas, renderiza apenas children
  // (as páginas de conversas têm seu próprio layout/sidebar)
  const isConversationsRoute = pathname.startsWith('/dashboard/conversations')

  if (isConversationsRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside 
        className={cn(
          "hidden md:block border-r bg-gray-50 p-6 transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <DashboardNavigation
          userName={userName}
          userEmail={userEmail}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-white border-b p-4 flex items-center gap-3">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-6">
              <DashboardNavigation
                userName={userName}
                userEmail={userEmail}
                onLinkClick={() => setIsMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-blue-600">ChatBot Dashboard</h1>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
