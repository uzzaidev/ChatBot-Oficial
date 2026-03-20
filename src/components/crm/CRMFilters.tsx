"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AutoStatus, CRMFilters, CRMTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Filter,
  Search,
  SlidersHorizontal,
  Tag,
  UserRound,
  X,
} from "lucide-react";

interface User {
  id: string;
  name: string;
}

interface CRMFiltersProps {
  filters: CRMFilters;
  tags: CRMTag[];
  users?: User[];
  onFiltersChange: (filters: CRMFilters) => void;
}

export const CRMFiltersComponent = ({
  filters,
  tags,
  users = [],
  onFiltersChange,
}: CRMFiltersProps) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleAutoStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      autoStatus: value === "all" ? undefined : (value as AutoStatus),
    });
  };

  const handleTagChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({ ...filters, tagIds: undefined });
    } else {
      onFiltersChange({ ...filters, tagIds: [value] });
    }
  };

  const handleAssignedToChange = (value: string) => {
    onFiltersChange({
      ...filters,
      assignedTo: value === "all" ? undefined : value,
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: date ? format(date, "yyyy-MM-dd") : undefined,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateTo: date ? format(date, "yyyy-MM-dd") : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.search ||
    filters.autoStatus ||
    filters.tagIds?.length ||
    filters.assignedTo ||
    filters.dateFrom ||
    filters.dateTo;

  const activeCount = [
    filters.search,
    filters.autoStatus,
    filters.tagIds?.length ? "tag" : undefined,
    filters.assignedTo,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou contexto do lead..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-11 rounded-2xl border-border/80 bg-background/35 pl-10 pr-4 text-sm shadow-none placeholder:text-muted-foreground/80"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="crm-stat-chip">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {hasActiveFilters ? `${activeCount} filtros ativos` : "Sem filtros"}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="rounded-full border border-border/80 bg-background/20 px-3 text-xs text-muted-foreground hover:bg-background/40 hover:text-foreground"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <Select
          value={filters.autoStatus || "all"}
          onValueChange={handleAutoStatusChange}
        >
          <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/30">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="awaiting_attendant">
              Aguardando resposta
            </SelectItem>
            <SelectItem value="awaiting_client">Aguardando cliente</SelectItem>
            <SelectItem value="neutral">Neutro</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.tagIds?.[0] || "all"}
          onValueChange={handleTagChange}
        >
          <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/30">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {users.length > 0 ? (
          <Select
            value={filters.assignedTo || "all"}
            onValueChange={handleAssignedToChange}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/30">
              <div className="flex items-center gap-2 text-sm">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Responsável" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="hidden xl:block" />
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 justify-start rounded-2xl border-border/80 bg-background/30 px-3 text-left font-normal hover:bg-background/45",
                !filters.dateFrom && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? (
                format(new Date(filters.dateFrom), "dd/MM/yyyy", {
                  locale: ptBR,
                })
              ) : (
                <span>Data inicial</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl border-border/80 p-0" align="start">
            <Calendar
              mode="single"
              selected={
                filters.dateFrom ? new Date(filters.dateFrom) : undefined
              }
              onSelect={handleDateFromChange}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 justify-start rounded-2xl border-border/80 bg-background/30 px-3 text-left font-normal hover:bg-background/45",
                !filters.dateTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? (
                format(new Date(filters.dateTo), "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <span>Data final</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl border-border/80 p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={handleDateToChange}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
