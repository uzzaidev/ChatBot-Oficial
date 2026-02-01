'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  MessageCircle,
  Bot,
  User,
  Workflow,
  ArrowRight,
  Instagram,
  Facebook,
  Globe,
  Smartphone,
  Star,
  Flag,
  Calendar,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Tag,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterConfig {
  id: string
  label: string
  icon: string
  color: string
  enabled: boolean
  isCustom: boolean
  filterType: 'status' | 'source' | 'tag' | 'stage'
  filterValue: string
  count?: number
}

interface FilterEditorModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: FilterConfig[]
  onSave: (filters: FilterConfig[]) => void
}

// Ícones disponíveis para seleção
const AVAILABLE_ICONS = {
  MessageCircle,
  Bot,
  User,
  Workflow,
  ArrowRight,
  Instagram,
  Facebook,
  Globe,
  Smartphone,
  Star,
  Flag,
  Calendar,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Tag,
}

// Cores disponíveis para seleção
const AVAILABLE_COLORS = [
  { name: 'Mint', value: 'primary', hex: '#1ABC9C' },
  { name: 'Azul', value: 'secondary', hex: '#2E86AB' },
  { name: 'Roxo', value: '#9b59b6', hex: '#9b59b6' },
  { name: 'Laranja', value: 'orange-400', hex: '#fb923c' },
  { name: 'Rosa', value: 'pink-500', hex: '#ec4899' },
  { name: 'Verde', value: 'green-500', hex: '#22c55e' },
  { name: 'Vermelho', value: 'red-500', hex: '#ef4444' },
  { name: 'Amarelo', value: 'yellow-500', hex: '#eab308' },
]

export const FilterEditorModal = ({
  isOpen,
  onClose,
  currentFilters,
  onSave,
}: FilterEditorModalProps) => {
  const [filters, setFilters] = useState<FilterConfig[]>(currentFilters)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState('primary')
  const [selectedIcon, setSelectedIcon] = useState('Tag')

  useEffect(() => {
    setFilters(currentFilters)
  }, [currentFilters, isOpen])

  // Separar filtros por tipo
  const defaultFilters = filters.filter(f => !f.isCustom && f.filterType === 'status')
  const sourceFilters = filters.filter(f => f.filterType === 'source')
  const tagFilters = filters.filter(f => f.filterType === 'tag')
  const stageFilters = filters.filter(f => f.filterType === 'stage')

  const toggleFilter = (filterId: string) => {
    setFilters(prev =>
      prev.map(f =>
        f.id === filterId ? { ...f, enabled: !f.enabled } : f
      )
    )
  }

  const addCustomTag = () => {
    if (!newTagName.trim()) return

    const newTag: FilterConfig = {
      id: `custom-tag-${Date.now()}`,
      label: newTagName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      enabled: true,
      isCustom: true,
      filterType: 'tag',
      filterValue: newTagName.trim().toLowerCase().replace(/\s+/g, '-'),
    }

    setFilters(prev => [...prev, newTag])
    setNewTagName('')
    setSelectedColor('primary')
    setSelectedIcon('Tag')
  }

  const removeCustomTag = (tagId: string) => {
    setFilters(prev => prev.filter(f => f.id !== tagId))
  }

  const handleSave = () => {
    // Salvar no localStorage
    localStorage.setItem('conversationFilters', JSON.stringify(filters))
    onSave(filters)
    onClose()
  }

  const handleCancel = () => {
    setFilters(currentFilters)
    onClose()
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS]
    return IconComponent || Tag
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Personalizar Categorias
          </DialogTitle>
          <DialogDescription>
            Escolha quais categorias deseja visualizar no header e crie filtros personalizados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CATEGORIAS PADRÃO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Categorias Padrão
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {defaultFilters.map(filter => {
                const IconComponent = getIconComponent(filter.icon)
                return (
                  <div
                    key={filter.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                  >
                    <Checkbox
                      id={filter.id}
                      checked={filter.enabled}
                      onCheckedChange={() => toggleFilter(filter.id)}
                    />
                    <Label
                      htmlFor={filter.id}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{filter.label}</span>
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* FILTROS POR ORIGEM */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Filtros por Origem
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sourceFilters.length > 0 ? (
                sourceFilters.map(filter => {
                  const IconComponent = getIconComponent(filter.icon)
                  return (
                    <div
                      key={filter.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                    >
                      <Checkbox
                        id={filter.id}
                        checked={filter.enabled}
                        onCheckedChange={() => toggleFilter(filter.id)}
                      />
                      <Label
                        htmlFor={filter.id}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{filter.label}</span>
                      </Label>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                  Nenhum filtro de origem disponível ainda
                </div>
              )}
            </div>
          </div>

          {/* TAGS CUSTOMIZADAS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Tags Customizadas
              </h3>
            </div>

            {/* Lista de tags customizadas */}
            {tagFilters.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {tagFilters.map(filter => {
                  const IconComponent = getIconComponent(filter.icon)
                  return (
                    <div
                      key={filter.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors group"
                    >
                      <Checkbox
                        id={filter.id}
                        checked={filter.enabled}
                        onCheckedChange={() => toggleFilter(filter.id)}
                      />
                      <Label
                        htmlFor={filter.id}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{filter.label}</span>
                      </Label>
                      {filter.isCustom && (
                        <button
                          onClick={() => removeCustomTag(filter.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Criar nova tag */}
            <div className="p-4 rounded-lg border-2 border-dashed border-border bg-surface/50 space-y-3">
              <Label className="text-sm font-medium">Criar Nova Tag</Label>
              <Input
                placeholder="Nome da tag (ex: VIP, Urgente, Follow-up)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
              />

              {/* Seletor de cor */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        selectedColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Seletor de ícone */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ícone</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(AVAILABLE_ICONS).map(iconName => {
                    const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS]
                    return (
                      <button
                        key={iconName}
                        onClick={() => setSelectedIcon(iconName)}
                        className={cn(
                          "p-2 rounded-lg border transition-all",
                          selectedIcon === iconName
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                onClick={addCustomTag}
                disabled={!newTagName.trim()}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tag
              </Button>
            </div>
          </div>

          {/* ESTÁGIOS DO FUNIL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Estágios do Funil
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stageFilters.length > 0 ? (
                stageFilters.map(filter => {
                  const IconComponent = getIconComponent(filter.icon)
                  return (
                    <div
                      key={filter.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                    >
                      <Checkbox
                        id={filter.id}
                        checked={filter.enabled}
                        onCheckedChange={() => toggleFilter(filter.id)}
                      />
                      <Label
                        htmlFor={filter.id}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{filter.label}</span>
                      </Label>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                  Nenhum estágio do funil disponível ainda
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
