"use client";

import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  BanIcon,
  HelpCircle 
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import type { TemplateStatus } from "@/lib/types";

interface TemplateStatusBadgeProps {
  status: TemplateStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
}

type StatusConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
};

const statusConfig: Record<TemplateStatus, StatusConfig> = {
  DRAFT: {
    label: "Rascunho",
    icon: FileText,
    color: "bg-gray-500/10 text-gray-700 border-gray-200",
  },
  PENDING: {
    label: "Aguardando Aprovação",
    icon: Clock,
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  },
  APPROVED: {
    label: "Aprovado",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-700 border-green-200",
  },
  REJECTED: {
    label: "Rejeitado",
    icon: XCircle,
    color: "bg-red-500/10 text-red-700 border-red-200",
  },
  PAUSED: {
    label: "Pausado",
    icon: PauseCircle,
    color: "bg-orange-500/10 text-orange-700 border-orange-200",
  },
  DISABLED: {
    label: "Desabilitado",
    icon: BanIcon,
    color: "bg-red-500/10 text-red-700 border-red-200",
  },
};

const defaultConfig: StatusConfig = {
  label: "Desconhecido",
  icon: HelpCircle,
  color: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export const TemplateStatusBadge = ({
  status,
  showIcon = true,
  size = "sm",
}: TemplateStatusBadgeProps) => {
  const config = statusConfig[status] || defaultConfig;
  const Icon = config.icon;

  const sizeClasses =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <Badge className={`${config.color} ${sizeClasses}`}>
      {showIcon && (
        <Icon className={`mr-1 ${size === "sm" ? "h-3 w-3" : "h-4 w-4"}`} />
      )}
      {config.label}
    </Badge>
  );
};
