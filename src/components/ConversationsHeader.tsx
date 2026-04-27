"use client";

import { FilterEditorModal } from "@/components/FilterEditorModal";
import { useFilterPreferences } from "@/hooks/useFilterPreferences";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  MessageCircle,
  Settings,
  Tag,
  User,
  Workflow,
} from "lucide-react";
import { useState } from "react";

interface ConversationsHeaderProps {
  metrics: {
    total: number;
    bot: number;
    humano: number;
    emFlow: number;
    transferido: number;
  };
  statusFilter: "all" | "bot" | "humano" | "transferido" | "fluxo_inicial";
  onStatusChange: (
    status: "all" | "bot" | "humano" | "transferido" | "fluxo_inicial",
  ) => void;
  clientId: string | null;
}

// Mapeamento de ícones
const ICON_MAP: Record<string, any> = {
  MessageCircle,
  Bot,
  User,
  Workflow,
  ArrowRight,
  Tag,
};

// Mapeamento de cores Tailwind para classes
const COLOR_MAP: Record<string, string> = {
  primary: "text-primary border-primary",
  secondary: "text-secondary border-secondary",
  blue: "text-blue-500 border-blue-500",
  green: "text-green-500 border-green-500",
  red: "text-red-500 border-red-500",
  yellow: "text-yellow-500 border-yellow-500",
  purple: "text-purple-500 border-purple-500",
  pink: "text-pink-500 border-pink-500",
  orange: "text-orange-500 border-orange-500",
  "orange-400": "text-orange-400 border-orange-400",
  cyan: "text-cyan-500 border-cyan-500",
  "#9b59b6": "text-[#9b59b6] border-[#9b59b6]",
};

// Helper para determinar se o filtro está ativo
const getFilterValue = (filter: any): string | null => {
  if (filter.filter_type === "default") {
    return filter.default_filter_value;
  }
  // Para tags e columns, por enquanto não suportamos filtro diretamente
  // (precisaria expandir a lógica de statusFilter)
  return null;
};

export const ConversationsHeader = ({
  metrics,
  statusFilter,
  onStatusChange,
  clientId,
}: ConversationsHeaderProps) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const { filters, loading } = useFilterPreferences();

  // Pegar apenas filtros habilitados e ordenados por position
  const enabledFilters = filters
    .filter((f) => f.enabled)
    .sort((a, b) => a.position - b.position);

  // Se ainda carregando, mostrar skeleton
  if (loading) {
    return (
      <div className="w-full border-b border-border/50 px-4 md:px-6 py-2 relative bg-card/[0.98]">
        <div className="flex items-center gap-3 pl-8 lg:pl-0">
          <h1 className="font-poppins font-bold text-sm md:text-base text-foreground whitespace-nowrap">
            Caixa de Entrada
          </h1>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[30px] w-[80px] rounded-lg border border-border bg-surface animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border/50 px-4 md:px-6 py-2 relative bg-card/[0.98]">
      {/* Single row: title + filter chips + editar */}
      <div className="flex items-center gap-2 md:gap-3 pl-8 lg:pl-0 overflow-x-auto">
        {/* Title */}
        <h1 className="font-poppins font-bold text-sm md:text-base text-foreground whitespace-nowrap flex-shrink-0">
          Caixa de Entrada
        </h1>

        <span className="text-border/80 flex-shrink-0 hidden md:inline">|</span>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-0.5 min-w-0 flex-1">
          {/* Renderizar filtros do banco */}
          {enabledFilters.map((filter) => {
            const IconComponent = ICON_MAP[filter.icon] || Tag;
            const colorClass = COLOR_MAP[filter.color] || COLOR_MAP["primary"];
            const filterValue = getFilterValue(filter);
            const isActive = filterValue && statusFilter === filterValue;

            return (
              <button
                key={filter.id}
                onClick={() => {
                  if (filterValue) {
                    onStatusChange(filterValue as any);
                  }
                }}
                disabled={!filterValue}
                className={cn(
                  "relative px-2 py-1 rounded-md border transition-all duration-200 group",
                  "flex items-center gap-1 min-w-fit flex-shrink-0",
                  isActive
                    ? `bg-gradient-to-br from-surface to-surface-alt ${colorClass} border-t-2`
                    : "bg-surface border-border/50 hover:border-primary/50",
                  !filterValue && "opacity-50 cursor-not-allowed",
                )}
              >
                <IconComponent
                  className={cn(
                    "h-3 w-3 opacity-60 flex-shrink-0",
                    colorClass.split(" ")[0],
                  )}
                />
                <span className="font-exo2 text-xs font-semibold text-foreground">
                  {filter.count}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-medium tracking-wide uppercase whitespace-nowrap",
                    isActive
                      ? colorClass.split(" ")[0]
                      : "text-muted-foreground",
                  )}
                >
                  {filter.label}
                </span>
              </button>
            );
          })}

          {/* Editar */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={cn(
              "relative px-2 py-1 rounded-md border border-dashed transition-all duration-200 group flex-shrink-0",
              "bg-surface border-border/50 hover:border-primary/50 hover:bg-primary/5",
              "flex items-center gap-1",
            )}
          >
            <Settings className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[9px] font-medium text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
              Editar
            </span>
          </button>
        </div>
      </div>

      {/* Modal de Edição de Filtros */}
      <FilterEditorModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        clientId={clientId}
      />
    </div>
  );
};
