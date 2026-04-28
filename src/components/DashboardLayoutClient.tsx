"use client";

import { BillingStatusBanner } from "@/components/BillingStatusBanner";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { PaymentWall } from "@/components/PaymentWall";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useResizableSidebar } from "@/hooks/useResizableSidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface DashboardLayoutClientProps {
  userName?: string;
  userEmail?: string;
  userRole?: string | null;
  children: React.ReactNode;
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
  userRole,
  children,
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  const { width: sidebarWidth, handleMouseDown: handleSidebarResize } =
    useResizableSidebar({
      storageKey: "dashboard_sidebar_width",
      defaultWidth: 190,
      minWidth: 160,
      maxWidth: 320,
    });

  // Se estiver em qualquer rota de conversas, chat ou contatos, renderiza apenas children
  // (essas páginas têm seu próprio layout/sidebar full-screen)
  const isFullScreenRoute =
    pathname.startsWith("/dashboard/conversations") ||
    pathname.startsWith("/dashboard/chat") ||
    pathname.startsWith("/dashboard/contacts");

  // Rotas que usam layout fluid (sem padding/max-width) mas mantêm a sidebar
  const isFluidRoute =
    pathname.startsWith("/dashboard/traces") ||
    pathname.startsWith("/dashboard/crm");

  // Detecta se estamos em desktop (md+) para aplicar marginLeft corretamente
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Detecta scroll para esconder/mostrar header (apenas desktop)
  useEffect(() => {
    if (isFullScreenRoute) return;

    const handleScroll = () => {
      // Detecta scroll tanto do window quanto do elemento de conteúdo interno
      const scrollElement = mainContentRef.current?.querySelector(
        '[class*="overflow"]',
      ) as HTMLElement;
      const currentScrollY = scrollElement
        ? scrollElement.scrollTop
        : window.scrollY;

      // Se rolar para baixo mais de 70px (altura do header), esconde o header
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        setIsHeaderVisible(false);
      }
      // Se rolar para cima, mostra o header
      else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Escuta scroll no window e no elemento de conteúdo (se existir)
    const scrollElement = mainContentRef.current?.querySelector(
      '[class*="overflow"]',
    ) as HTMLElement;

    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY, isFullScreenRoute]);

  if (isFullScreenRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Fixed position, always visible - DARK THEME */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-primary/10 bg-sidebar-dark overflow-y-auto z-50"
        style={{ width: isCollapsed ? 80 : sidebarWidth }}
      >
        <DashboardNavigation
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
        {/* Drag handle */}
        {!isCollapsed && (
          <div
            onMouseDown={handleSidebarResize}
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize group z-10 hover:bg-primary/30 transition-colors"
            title="Arrastar para redimensionar"
          />
        )}
      </aside>

      {/* Main Content - Add left margin to account for fixed sidebar */}
      <main
        ref={mainContentRef}
        className={cn("flex-1 flex flex-col min-w-0 bg-background")}
        style={{
          marginLeft: isDesktop ? (isCollapsed ? 80 : sidebarWidth) : 0,
        }}
      >
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 border-b border-border/50 px-3 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-muted"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[260px] p-4 bg-sidebar-dark border-r border-primary/10"
              >
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <DashboardNavigation
                  userName={userName}
                  userEmail={userEmail}
                  userRole={userRole}
                  onLinkClick={() => setIsMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-white">
              <span className="text-uzz-mint font-poppins">Uzz</span>
              <span className="text-uzz-blue font-exo2">.Ai</span>
            </h1>
          </div>
        </div>

        {/* Page Content */}
        {isFluidRoute ? (
          <div className="flex-1 overflow-hidden bg-background flex flex-col">
            <PaymentWall>{children}</PaymentWall>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-background px-2 py-2 sm:px-3 sm:py-2 md:px-4 md:py-3 xl:px-6 xl:py-4">
            <div className="max-w-[1600px] mx-auto w-full">
              <BillingStatusBanner />
              <PaymentWall>{children}</PaymentWall>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
