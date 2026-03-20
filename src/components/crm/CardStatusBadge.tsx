"use client";

import { Badge } from "@/components/ui/badge";
import type { AutoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Dot,
} from "lucide-react";

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
    className:
      "border-red-500/25 bg-red-500/12 text-red-200 dark:text-red-300",
  },
  awaiting_client: {
    label: "Aguardando cliente",
    icon: Clock3,
    className:
      "border-yellow-500/25 bg-yellow-500/12 text-yellow-100 dark:text-yellow-300",
  },
  in_progress: {
    label: "Em andamento",
    icon: CircleDashed,
    className:
      "border-blue-500/25 bg-blue-500/12 text-blue-100 dark:text-blue-300",
  },
  resolved: {
    label: "Resolvido",
    icon: CheckCircle2,
    className:
      "border-emerald-500/25 bg-emerald-500/12 text-emerald-100 dark:text-emerald-300",
  },
  neutral: {
    label: "Neutro",
    icon: Dot,
    className:
      "border-border/80 bg-background/35 text-muted-foreground dark:text-muted-foreground",
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
        "rounded-full font-medium backdrop-blur-sm",
        config.className,
        size === "sm" && "h-6 gap-1 px-2.5 text-[11px]",
        size === "md" && "h-8 gap-1.5 px-3 text-xs",
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{config.label}</span>
    </Badge>
  );
};
