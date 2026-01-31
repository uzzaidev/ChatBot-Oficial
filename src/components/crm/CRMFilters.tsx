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
import { CalendarIcon, Search, X } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-2 p-4 border-b border-border">
      {/* Row 1: Search and main filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Auto Status Filter */}
        <Select
          value={filters.autoStatus || "all"}
          onValueChange={handleAutoStatusChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="awaiting_attendant">
              Aguardando resposta
            </SelectItem>
            <SelectItem value="awaiting_client">Aguardando cliente</SelectItem>
            <SelectItem value="neutral">Em andamento</SelectItem>
          </SelectContent>
        </Select>

        {/* Tag Filter */}
        <Select
          value={filters.tagIds?.[0] || "all"}
          onValueChange={handleTagChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tag" />
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
      </div>

      {/* Row 2: Advanced filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Assigned To Filter */}
        {users.length > 0 && (
          <Select
            value={filters.assignedTo || "all"}
            onValueChange={handleAssignedToChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Responsável" />
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
        )}

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
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
          <PopoverContent className="w-auto p-0" align="start">
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

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
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
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={handleDateToChange}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearFilters}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
