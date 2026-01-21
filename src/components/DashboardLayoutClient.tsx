'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DashboardNavigation } from '@/components/DashboardNavigation'
import { NotificationBell } from '@/components/NotificationBell'
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
 * - Header que esconde ao rolar para baixo e aparece ao rolar para cima
 */
export function DashboardLayoutClient({ 
  userName, 
  userEmail, 
  children 
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const mainContentRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  // Se estiver em qualquer rota de conversas, chat ou contatos, renderiza apenas children
  // (essas páginas têm seu próprio layout/sidebar full-screen)
  const isFullScreenRoute = pathname.startsWith('/dashboard/conversations') ||
                           pathname.startsWith('/dashboard/chat') ||
                           pathname.startsWith('/dashboard/contacts')

  // Detecta scroll para esconder/mostrar header (apenas desktop)
  useEffect(() => {
    if (isFullScreenRoute) return

    const handleScroll = () => {
      // Detecta scroll tanto do window quanto do elemento de conteúdo interno
      const scrollElement = mainContentRef.current?.querySelector('[class*="overflow"]') as HTMLElement
      const currentScrollY = scrollElement ? scrollElement.scrollTop : window.scrollY
      
      // Se rolar para baixo mais de 70px (altura do header), esconde o header
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        setIsHeaderVisible(false)
      } 
      // Se rolar para cima, mostra o header
      else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    // Escuta scroll no window e no elemento de conteúdo (se existir)
    const scrollElement = mainContentRef.current?.querySelector('[class*="overflow"]') as HTMLElement
    
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollY, isFullScreenRoute])

  if (isFullScreenRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#0f1419]">
      {/* Desktop Sidebar - Fixed position, always visible - DARK THEME */}
      <aside 
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-uzz-mint/10 bg-sidebar-dark transition-all duration-300 overflow-y-auto z-50",
          isCollapsed ? "w-20" : "w-[260px]"
        )}
        style={{
          background: 'linear-gradient(180deg, #1a1f26 0%, #0f1419 100%)',
          borderRight: '1px solid rgba(26, 188, 156, 0.1)'
        }}
      >
        <DashboardNavigation
          userName={userName}
          userEmail={userEmail}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>

      {/* Main Content - Add left margin to account for fixed sidebar */}
      <main 
        ref={mainContentRef}
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 bg-[#0f1419]",
          "md:ml-[260px]",
          isCollapsed && "md:ml-20"
        )}
      >
        {/* Desktop Header - DARK THEME - Esconde ao rolar para baixo */}
        <header 
          className={cn(
            "hidden md:flex h-[70px] border-b border-white/5 px-8 items-center justify-between transition-transform duration-300",
            "bg-[#1a1f26]",
            // Transforma header para esconder/mostrar baseado no scroll
            isHeaderVisible ? "translate-y-0" : "-translate-y-full"
          )}
          style={{
            background: '#1a1f26',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-poppins font-bold text-white">
              <span className="text-uzz-mint">Uzz</span>
              <span className="text-uzz-blue font-exo2">.Ai</span>
            </h1>
            <p className="text-sm text-uzz-silver/80 mt-1 hidden lg:block">
              Dashboard
            </p>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Header - DARK THEME */}
        <div 
          className="md:hidden sticky top-0 z-10 border-b border-white/5 p-4 flex items-center justify-between"
          style={{
            background: '#1a1f26',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[280px] p-6 bg-sidebar-dark border-r border-uzz-mint/10"
                style={{
                  background: 'linear-gradient(180deg, #1a1f26 0%, #0f1419 100%)',
                  borderRight: '1px solid rgba(26, 188, 156, 0.1)'
                }}
              >
                <DashboardNavigation
                  userName={userName}
                  userEmail={userEmail}
                  onLinkClick={() => setIsMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-white">
              <span className="text-uzz-mint font-poppins">Uzz</span>
              <span className="text-uzz-blue font-exo2">.Ai</span>
            </h1>
          </div>
          <NotificationBell />
        </div>

        {/* Page Content - DARK THEME */}
        <div className="flex-1 overflow-auto bg-[#0f1419] p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
