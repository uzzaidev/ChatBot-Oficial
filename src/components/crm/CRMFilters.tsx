'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import type { CRMFilters, CRMTag, AutoStatus } from '@/lib/types'

interface CRMFiltersProps {
  filters: CRMFilters
  tags: CRMTag[]
  onFiltersChange: (filters: CRMFilters) => void
}

export const CRMFiltersComponent = ({ filters, tags, onFiltersChange }: CRMFiltersProps) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined })
  }

  const handleAutoStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      autoStatus: value === 'all' ? undefined : (value as AutoStatus),
    })
  }

  const handleTagChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, tagIds: undefined })
    } else {
      onFiltersChange({ ...filters, tagIds: [value] })
    }
  }

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.search || filters.autoStatus || filters.tagIds?.length || filters.assignedTo

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-border">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Auto Status Filter */}
      <Select
        value={filters.autoStatus || 'all'}
        onValueChange={handleAutoStatusChange}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="awaiting_attendant">Aguardando resposta</SelectItem>
          <SelectItem value="awaiting_client">Aguardando cliente</SelectItem>
          <SelectItem value="neutral">Em andamento</SelectItem>
        </SelectContent>
      </Select>

      {/* Tag Filter */}
      <Select
        value={filters.tagIds?.[0] || 'all'}
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

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={handleClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
