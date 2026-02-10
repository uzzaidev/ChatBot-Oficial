"use client";

import { Badge } from "@/components/ui/badge";
import type { AutoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, CircleDashed, Clock } from "lucide-react";

interface CardStatusBadgeProps {
  status: AutoStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  AutoStatus,
  {
    label: string;
    icon: typeof AlertCircle;
    className: string;
  }
> = {
  awaiting_attendant: {
    label: "Aguardando resposta",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  awaiting_client: {
    label: "Aguardando cliente",
    icon: Clock,
    className:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30",
  },
  in_progress: {
    label: "Em andamento",
    icon: CircleDashed,
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/30",
  },
  resolved: {
    label: "Resolvido",
    icon: CheckCircle,
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/30",
  },
  neutral: {
    label: "Neutro",
    icon: CheckCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const CardStatusBadge = ({
  status,
  size = "sm",
}: CardStatusBadgeProps) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        config.className,
        size === "sm" && "h-5 text-xs px-1.5",
        size === "md" && "h-6 text-sm px-2",
      )}
    >
      <Icon className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  );
};
