"use client";

import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Kanban,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface DashboardNavigationProps {
  userName?: string;
  userEmail?: string;
  userRole?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLinkClick?: () => void;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed?: boolean;
  onClick?: () => void;
  tooltip?: string;
  isSubItem?: boolean;
}

const NavItem = ({
  href,
  icon,
  label,
  isCollapsed,
  onClick,
  tooltip,
  isSubItem,
}: NavItemProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname.startsWith(href) && href !== "/dashboard");

  const linkContent = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm font-medium",
        isSubItem ? "px-3 py-1.5" : "px-3 py-2",
        isActive
          ? "bg-uzz-mint/15 text-uzz-mint border-l-[3px] border-uzz-mint font-semibold"
          : "text-muted-foreground hover:bg-primary/10 hover:text-uzz-mint hover:translate-x-1",
        isCollapsed && "justify-center",
      )}
      title={isCollapsed ? label : undefined}
    >
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center",
          isSubItem ? "w-4 h-4" : "w-5 h-5",
        )}
      >
        {icon}
      </div>
      {!isCollapsed && <span className="flex-1">{label}</span>}
    </Link>
  );

  if (tooltip && !isCollapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px]">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
};

interface NavSectionProps {
  title: string;
  isCollapsed?: boolean;
}

const NavSection = ({ title, isCollapsed }: NavSectionProps) => {
  if (isCollapsed) return null;
  return (
    <div className="nav-section-header">
      <span>{title}</span>
    </div>
  );
};

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed?: boolean;
  matchPaths: string[];
  children: React.ReactNode;
}

const NavGroup = ({
  icon,
  label,
  isCollapsed,
  matchPaths,
  children,
}: NavGroupProps) => {
  const pathname = usePathname();
  const isAnyActive = matchPaths.some((p) => pathname.startsWith(p));
  const [open, setOpen] = useState(isAnyActive);

  if (isCollapsed) {
    return null; // Hide grouped sub-items in collapsed mode — only top-level icons shown
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
          isAnyActive
            ? "text-uzz-mint"
            : "text-muted-foreground hover:bg-primary/10 hover:text-uzz-mint",
        )}
      >
        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l border-border/40 space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

export function DashboardNavigation({
  userName,
  userEmail,
  userRole,
  isCollapsed = false,
  onToggleCollapse,
  onLinkClick,
}: DashboardNavigationProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className="px-4 py-4 border-b border-border/50">
        {isCollapsed ? (
          <div className="flex justify-center">
            <MessageSquare className="h-7 w-7 text-uzz-mint" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold leading-none">
                <span className="font-poppins text-primary">Uzz</span>
                <span className="font-exo2 text-secondary">Ai</span>
              </h1>
              <ThemeToggle />
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
          href="/dashboard/crm"
          icon={<Kanban className="h-5 w-5 flex-shrink-0" />}
          label="CRM"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Kanban CRM para gerenciar leads e pipeline de vendas"
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
          label="Documentos"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Upload de documentos (PDF, TXT) para RAG com busca semântica"
        />

        <NavItem
          href="/dashboard/agents"
          icon={<Bot className="h-5 w-5 flex-shrink-0" />}
          label="Agentes IA"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Configure múltiplos agentes com diferentes personalidades"
        />

        <NavItem
          href="/dashboard/flows"
          icon={<Workflow className="h-5 w-5 flex-shrink-0" />}
          label="Flows Interativos"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Criar fluxos de conversa personalizados"
        />

        <NavItem
          href="/dashboard/calendar"
          icon={<Calendar className="h-5 w-5 flex-shrink-0" />}
          label="Calendário"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Conecte Google Calendar ou Microsoft Outlook para o agente gerenciar sua agenda"
        />

        {/* SEÇÃO: ANÁLISE */}
        <NavGroup
          icon={<LineChart className="h-5 w-5 flex-shrink-0" />}
          label="Análise"
          isCollapsed={isCollapsed}
          matchPaths={[
            "/dashboard/traces",
            "/dashboard/support-bugs",
            "/dashboard/quality",
            "/dashboard/analytics-comparison",
            "/dashboard/meta-ads",
          ]}
        >
          <NavItem
            href="/dashboard/traces"
            icon={<Activity className="h-4 w-4 flex-shrink-0" />}
            label="Traces"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Rastreio completo de cada mensagem — pipeline, tool calls e RAG"
          />
          <NavItem
            href="/dashboard/support-bugs"
            icon={<AlertTriangle className="h-4 w-4 flex-shrink-0" />}
            label="Suporte/Bugs"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Fila de casos detectados de suporte com causa provável e ação recomendada"
          />
          <NavItem
            href="/dashboard/quality"
            icon={<CheckCircle className="h-4 w-4 flex-shrink-0" />}
            label="Qualidade"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Dashboard com score médio, distribuição PASS/REVIEW/FAIL e custo do juiz automático"
          />
          <NavItem
            href="/dashboard/quality/traces"
            icon={<Activity className="h-4 w-4 flex-shrink-0" />}
            label="Traces Qualidade"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Lista e detalhe de traces dentro do módulo de qualidade"
          />
          <NavItem
            href="/dashboard/quality/ground-truth"
            icon={<CheckCircle className="h-4 w-4 flex-shrink-0" />}
            label="Ground Truth"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Gerencie o gabarito por cliente para avaliar e melhorar respostas"
          />
          <NavItem
            href="/dashboard/quality/evaluations"
            icon={<CheckCircle className="h-4 w-4 flex-shrink-0" />}
            label="Revisões"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Triagem operacional (lista, conversa e detalhe) para feedback humano"
          />
          <NavItem
            href="/dashboard/analytics-comparison"
            icon={<BarChart3 className="h-4 w-4 flex-shrink-0" />}
            label="Analytics"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Comparação de dados OpenAI oficial vs nosso tracking"
          />
          <NavItem
            href="/dashboard/meta-ads"
            icon={<TrendingUp className="h-4 w-4 flex-shrink-0" />}
            label="Meta Ads"
            isCollapsed={false}
            isSubItem
            onClick={onLinkClick}
            tooltip="Performance de campanhas, ROI e conversões CAPI"
          />
        </NavGroup>
        {/* SEÇÃO: ADMINISTRAÇÃO (admin only) */}
        {userRole === "admin" && (
          <>
            <NavSection title="Administração" isCollapsed={isCollapsed} />
            <NavItem
              href="/dashboard/payments"
              icon={<CreditCard className="h-5 w-5 flex-shrink-0" />}
              label="Pagamentos"
              isCollapsed={isCollapsed}
              onClick={onLinkClick}
              tooltip="Stripe Connect - produtos, checkout e assinaturas"
            />
            <NavItem
              href="/dashboard/admin/billing"
              icon={<Shield className="h-5 w-5 flex-shrink-0" />}
              label="Gestão de Clientes"
              isCollapsed={isCollapsed}
              onClick={onLinkClick}
              tooltip="Todos os clientes, assinaturas, planos e cupons"
            />
          </>
        )}

        {/* SEÇÃO: CONFIGURAÇÃO */}
        <NavSection title="Configuração" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard/billing"
          icon={<Receipt className="h-5 w-5 flex-shrink-0" />}
          label="Faturamento"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Assinatura, pagamentos e faturas"
        />
        <NavItem
          href="/dashboard/settings"
          icon={<Settings className="h-5 w-5 flex-shrink-0" />}
          label="Configurações"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Configurações do sistema, perfil e preferências"
        />
      </nav>

      <div className="px-3 py-4 border-t border-border/50 space-y-4">
        {/* User Info & Logout */}
        {!isCollapsed && userName && (
          <div className="px-3 py-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">
              Conectado como:
            </p>
            <p
              className="text-sm font-semibold text-foreground truncate"
              title={userEmail || ""}
            >
              {userName}
            </p>
          </div>
        )}

        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-start",
          )}
        >
          <LogoutButton isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Toggle button for desktop */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "mx-3 mb-4 hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted",
            isCollapsed && "justify-center",
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
  );
}
