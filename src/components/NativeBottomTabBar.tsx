"use client";

/**
 * Bottom tab bar nativa — só renderiza em Capacitor.isNativePlatform().
 *
 * Argumento central contra a rejeição Apple Guideline 4.2 ("não é
 * suficientemente diferente de navegar no site"): esta navegação não existe
 * na versão web, é uma UI exclusiva do app nativo, sempre visível, e também
 * resolve o problema de "sem botão de voltar ao menu principal" relatado
 * pela Apple em Conversas/Contatos.
 */

import { Capacitor } from "@capacitor/core";
import { ImpactStyle } from "@capacitor/haptics";
import { Home, MessageCircle, Settings, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { hapticImpact } from "@/lib/haptics";

const TABS = [
  {
    href: "/dashboard",
    label: "Início",
    icon: Home,
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/conversations",
    label: "Conversas",
    icon: MessageCircle,
    isActive: (pathname: string) =>
      pathname.startsWith("/dashboard/conversations") ||
      pathname.startsWith("/dashboard/chat"),
  },
  {
    href: "/dashboard/contacts",
    label: "Contatos",
    icon: Users,
    isActive: (pathname: string) => pathname.startsWith("/dashboard/contacts"),
  },
  {
    href: "/dashboard/settings",
    label: "Perfil",
    icon: Settings,
    isActive: (pathname: string) => pathname.startsWith("/dashboard/settings"),
  },
];

export function NativeBottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {TABS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <button
            key={href}
            onClick={() => {
              void hapticImpact(ImpactStyle.Light);
              router.push(href);
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
