"use client";

import { LogoutButton } from "@/components/LogoutButton";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Kanban,
  LayoutDashboard,
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

interface DashboardNavigationProps {
  userName?: string;
  userEmail?: string;
  userRole?: string | null;
  pendingQualityCount?: number;
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
  badge?: "new" | "beta" | "admin" | "dev";
  badgeCount?: number;
  tooltip?: string;
}

const NavItem = ({
  href,
  icon,
  label,
  isCollapsed,
  onClick,
  badge,
  badgeCount,
  tooltip,
}: NavItemProps) => {
  const pathname = usePathname();
  // Check if current route matches this nav item
  const isActive =
    pathname === href || (pathname.startsWith(href) && href !== "/dashboard");

  const linkContent = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
        isActive
          ? "bg-uzz-mint/15 text-uzz-mint border-l-[3px] border-uzz-mint font-semibold"
          : "text-muted-foreground hover:bg-primary/10 hover:text-uzz-mint hover:translate-x-1",
        isCollapsed && "justify-center",
      )}
      title={isCollapsed ? label : undefined}
    >
      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {typeof badgeCount === "number" && badgeCount > 0 && (
            <Badge
              className="text-[10px] px-2 py-0.5 font-bold bg-red-500/15 text-red-600 border-red-500/30"
            >
              {badgeCount}
            </Badge>
          )}
          {badge && (
            <Badge
              variant={badge}
              className={cn(
                "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider",
                badge === "new" &&
                  "bg-gradient-to-r from-uzz-mint to-uzz-gold text-uzz-black",
                badge === "beta" &&
                  "bg-uzz-blue/20 text-uzz-blue border-uzz-blue/30",
                badge === "admin" &&
                  "bg-uzz-gold/15 text-uzz-gold border-uzz-gold/30",
                badge === "dev" &&
                  "bg-uzz-silver/15 text-uzz-silver border-uzz-silver/30",
              )}
            >
              {badge === "new"
                ? "Novo"
                : badge === "beta"
                ? "Beta"
                : badge === "admin"
                ? "Admin"
                : "Dev"}
            </Badge>
          )}
        </>
      )}
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

export function DashboardNavigation({
  userName,
  userEmail,
  userRole,
  pendingQualityCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onLinkClick,
}: DashboardNavigationProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className="px-5 py-6 border-b border-border/50">
        {isCollapsed ? (
          <div className="flex justify-center">
            <MessageSquare className="h-7 w-7 text-uzz-mint" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-none">
                <span className="font-poppins text-primary">Uzz</span>
                <span className="font-exo2 text-secondary">Ai</span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-2 ml-0.5">
              AutomaÃ§Ã£o Criativa, Realizada
            </p>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* SEÃ‡ÃƒO: PRINCIPAL */}
        <NavSection title="Principal" isCollapsed={isCollapsed} />
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="h-5 w-5 flex-shrink-0" />}
          label="Dashboard"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="VisÃ£o geral com mÃ©tricas principais e grÃ¡ficos customizÃ¡veis"
        />

        <NavItem
          href="/dashboard/conversations"
          icon={<MessageSquare className="h-5 w-5 flex-shrink-0" />}
          label="Conversas"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Gerenciar conversas do WhatsApp em tempo real"
        />

        {/* SEÃ‡ÃƒO: GESTÃƒO */}
        <NavSection title="GestÃ£o" isCollapsed={isCollapsed} />
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
          label="Base de Conhecimento"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Upload de documentos (PDF, TXT) para RAG com busca semÃ¢ntica"
        />

        <NavItem
          href="/dashboard/agents"
          icon={<Bot className="h-5 w-5 flex-shrink-0" />}
          label="Agentes IA"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Configure mÃºltiplos agentes com diferentes personalidades"
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
          label="CalendÃ¡rio"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Conecte Google Calendar ou Microsoft Outlook para o agente gerenciar sua agenda"
        />

        {/* SEÃ‡ÃƒO: ANÃLISE */}
        <NavSection title="AnÃ¡lise" isCollapsed={isCollapsed} />
        
                <NavItem
          href="/dashboard/traces"
          icon={<Activity className="h-5 w-5 flex-shrink-0" />}
          label="Traces"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Rastreio completo de cada mensagem — pipeline, tool calls e RAG"
        />
<NavItem
          href="/dashboard/quality"
          icon={<CheckCircle className="h-5 w-5 flex-shrink-0" />}
          label="Qualidade"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="new"
          tooltip="Dashboard com score médio, distribuição PASS/REVIEW/FAIL e custo do juiz automático"
        />
        <NavItem
          href="/dashboard/quality/traces"
          icon={<Activity className="h-5 w-5 flex-shrink-0" />}
          label="Traces Qualidade"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="new"
          tooltip="Lista e detalhe de traces dentro do módulo de qualidade"
        />
        <NavItem
          href="/dashboard/quality/ground-truth"
          icon={<CheckCircle className="h-5 w-5 flex-shrink-0" />}
          label="Ground Truth"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="new"
          tooltip="Gerencie o gabarito por cliente para avaliar e melhorar respostas"
        />
        <NavItem
          href="/dashboard/quality/evaluations"
          icon={<CheckCircle className="h-5 w-5 flex-shrink-0" />}
          label="Revisões"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          badge="new"
          badgeCount={pendingQualityCount}
          tooltip="Triagem operacional (lista, conversa e detalhe) para feedback humano"
        />
        <NavItem
          href="/dashboard/analytics-comparison"
          icon={<BarChart3 className="h-5 w-5 flex-shrink-0" />}
          label="Analytics"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="ComparaÃ§Ã£o de dados OpenAI oficial vs nosso tracking"
        />

        <NavItem
          href="/dashboard/meta-ads"
          icon={<TrendingUp className="h-5 w-5 flex-shrink-0" />}
          label="Meta Ads"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="Performance de campanhas, ROI e conversÃµes CAPI"
        />
        {/* SEÃ‡ÃƒO: ADMINISTRAÃ‡ÃƒO (admin only) */}
        {userRole === "admin" && (
          <>
            <NavSection title="AdministraÃ§Ã£o" isCollapsed={isCollapsed} />
            <NavItem
              href="/dashboard/payments"
              icon={<CreditCard className="h-5 w-5 flex-shrink-0" />}
              label="Pagamentos"
              isCollapsed={isCollapsed}
              onClick={onLinkClick}
              badge="admin"
              tooltip="Stripe Connect - produtos, checkout e assinaturas"
            />
            <NavItem
              href="/dashboard/admin/billing"
              icon={<Shield className="h-5 w-5 flex-shrink-0" />}
              label="GestÃ£o de Clientes"
              isCollapsed={isCollapsed}
              onClick={onLinkClick}
              badge="admin"
              tooltip="Todos os clientes, assinaturas, planos e cupons"
            />
          </>
        )}

        {/* SEÃ‡ÃƒO: CONFIGURAÃ‡ÃƒO */}
        <NavSection title="ConfiguraÃ§Ã£o" isCollapsed={isCollapsed} />
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
          label="ConfiguraÃ§Ãµes"
          isCollapsed={isCollapsed}
          onClick={onLinkClick}
          tooltip="ConfiguraÃ§Ãµes do sistema, perfil e preferÃªncias"
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
            {userEmail && (
              <p
                className="text-xs text-muted-foreground/70 truncate mt-1"
                title={userEmail}
              >
                {userEmail}
              </p>
            )}
          </div>
        )}

        <LogoutButton isCollapsed={isCollapsed} />

        {/* Version Info */}
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground/60 px-3">
            <p>VersÃ£o 2.0.0</p>
            <p className="mt-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-status-success" />
              <span>AutenticaÃ§Ã£o Ativa</span>
            </p>
          </div>
        )}
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


