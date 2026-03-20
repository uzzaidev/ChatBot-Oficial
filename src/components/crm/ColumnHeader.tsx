"use client";

import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface ColumnHeaderProps {
  name: string;
  count: number;
  icon?: string;
  color?: string;
  className?: string;
}

const COLOR_TONES: Record<string, string> = {
  mint: "from-emerald-400/25 to-emerald-500/5 text-emerald-200",
  green: "from-green-400/25 to-green-500/5 text-green-200",
  blue: "from-blue-400/25 to-blue-500/5 text-blue-200",
  gold: "from-amber-400/25 to-amber-500/5 text-amber-200",
  yellow: "from-yellow-400/25 to-yellow-500/5 text-yellow-200",
  orange: "from-orange-400/25 to-orange-500/5 text-orange-200",
  red: "from-red-400/25 to-red-500/5 text-red-200",
  purple: "from-purple-400/25 to-purple-500/5 text-purple-200",
  gray: "from-slate-400/20 to-slate-500/5 text-slate-200",
};

export const ColumnHeader = ({
  name,
  count,
  icon = "Users",
  color = "blue",
  className,
}: ColumnHeaderProps) => {
  const iconMap = LucideIcons as unknown as Record<
    string,
    LucideIcons.LucideIcon
  >;
  const IconComponent = iconMap[icon] || LucideIcons.Users;
  const tone = COLOR_TONES[color] || COLOR_TONES.blue;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-2xl border border-white/6 bg-gradient-to-br shadow-inner",
          tone,
        )}
      >
        <IconComponent className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
        <p className="text-[11px] text-muted-foreground">
          {count} {count === 1 ? "lead" : "leads"}
        </p>
      </div>
    </div>
  );
};
