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
  Tag,
  Plus,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCRMTags } from '@/hooks/useCRMTags'
import { useCRMColumns } from '@/hooks/useCRMColumns'
import { useFilterPreferences, type FilterPreferenceInput } from '@/hooks/useFilterPreferences'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterEditorModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string | null
}

// Cores disponíveis para tags
const TAG_COLORS = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'cyan', label: 'Ciano', class: 'bg-cyan-500' },
]

// Filtros padrão (status)
const DEFAULT_FILTERS = [
  { value: 'all', label: 'Todas', icon: MessageCircle },
  { value: 'bot', label: 'Bot', icon: Bot },
  { value: 'humano', label: 'Humano', icon: User },
  { value: 'fluxo_inicial', label: 'Em Flow', icon: Workflow },
  { value: 'transferido', label: 'Transferido', icon: ArrowRight },
]

export const FilterEditorModal = ({
  isOpen,
  onClose,
  clientId,
}: FilterEditorModalProps) => {
  const { filters: currentFilters, loading: prefsLoading, saveFilters } = useFilterPreferences()
  const { tags, loading: tagsLoading, createTag } = useCRMTags(clientId)
  const { columns, loading: columnsLoading } = useCRMColumns(clientId)

  // Estado local para edição
  const [selectedFilters, setSelectedFilters] = useState<FilterPreferenceInput[]>([])
  const [saving, setSaving] = useState(false)

  // Estado para criar nova tag
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [newTagDescription, setNewTagDescription] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

  // Carregar filtros atuais quando modal abre
  useEffect(() => {
    if (isOpen && currentFilters.length > 0) {
      // Converter FilterPreference para FilterPreferenceInput
      const inputs: FilterPreferenceInput[] = currentFilters.map(f => ({
        filter_type: f.filter_type,
        filter_id: f.filter_id || undefined,
        default_filter_value: f.default_filter_value || undefined,
        enabled: f.enabled,
        position: f.position,
      }))
      setSelectedFilters(inputs)
    } else if (isOpen) {
      // Se não há filtros, criar filtros padrão habilitados
      const defaults: FilterPreferenceInput[] = DEFAULT_FILTERS.map((df, idx) => ({
        filter_type: 'default',
        default_filter_value: df.value,
        enabled: true,
        position: idx,
      }))
      setSelectedFilters(defaults)
    }
  }, [isOpen, currentFilters])

  // Helper: verifica se um filtro está habilitado
  const isFilterEnabled = (type: 'default' | 'tag' | 'column', id?: string, value?: string) => {
    return selectedFilters.some(f =>
      f.filter_type === type &&
      (type === 'default' ? f.default_filter_value === value : f.filter_id === id) &&
      f.enabled
    )
  }

  // Toggle filtro padrão
  const toggleDefaultFilter = (value: string) => {
    setSelectedFilters(prev => {
      const existing = prev.find(f => f.filter_type === 'default' && f.default_filter_value === value)
      if (existing) {
        // Toggle enabled
        return prev.map(f =>
          f.filter_type === 'default' && f.default_filter_value === value
            ? { ...f, enabled: !f.enabled }
            : f
        )
      } else {
        // Adicionar novo
        return [...prev, {
          filter_type: 'default',
          default_filter_value: value,
          enabled: true,
          position: prev.length,
        }]
      }
    })
  }

  // Toggle tag
  const toggleTag = (tagId: string) => {
    setSelectedFilters(prev => {
      const existing = prev.find(f => f.filter_type === 'tag' && f.filter_id === tagId)
      if (existing) {
        // Se já existe, toggle enabled ou remover
        if (existing.enabled) {
          return prev.map(f =>
            f.filter_type === 'tag' && f.filter_id === tagId
              ? { ...f, enabled: false }
              : f
          )
        } else {
          // Se estava disabled, remover
          return prev.filter(f => !(f.filter_type === 'tag' && f.filter_id === tagId))
        }
      } else {
        // Adicionar novo
        return [...prev, {
          filter_type: 'tag',
          filter_id: tagId,
          enabled: true,
          position: prev.length,
        }]
      }
    })
  }

  // Toggle coluna/estágio
  const toggleColumn = (columnId: string) => {
    setSelectedFilters(prev => {
      const existing = prev.find(f => f.filter_type === 'column' && f.filter_id === columnId)
      if (existing) {
        if (existing.enabled) {
          return prev.map(f =>
            f.filter_type === 'column' && f.filter_id === columnId
              ? { ...f, enabled: false }
              : f
          )
        } else {
          return prev.filter(f => !(f.filter_type === 'column' && f.filter_id === columnId))
        }
      } else {
        return [...prev, {
          filter_type: 'column',
          filter_id: columnId,
          enabled: true,
          position: prev.length,
        }]
      }
    })
  }

  // Criar nova tag
  const handleCreateTag = async () => {
    if (!newTagName.trim() || !clientId) return

    setCreatingTag(true)
    const newTag = await createTag({
      name: newTagName.trim(),
      color: newTagColor,
      description: newTagDescription.trim() || undefined,
    })

    if (newTag) {
      // Adicionar tag aos filtros selecionados
      setSelectedFilters(prev => [...prev, {
        filter_type: 'tag',
        filter_id: newTag.id,
        enabled: true,
        position: prev.length,
      }])

      // Limpar form
      setNewTagName('')
      setNewTagColor('blue')
      setNewTagDescription('')
    }
    setCreatingTag(false)
  }

  // Salvar
  const handleSave = async () => {
    setSaving(true)

    // Filtrar apenas os habilitados e reordenar posições
    const enabledFilters = selectedFilters
      .filter(f => f.enabled)
      .map((f, idx) => ({ ...f, position: idx }))

    const success = await saveFilters(enabledFilters)

    if (success) {
      onClose()
    }
    setSaving(false)
  }

  const loading = prefsLoading || tagsLoading || columnsLoading

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Personalizar Categorias
          </DialogTitle>
          <DialogDescription>
            Escolha quais categorias deseja visualizar no header e crie filtros personalizados
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* CATEGORIAS PADRÃO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      Categorias Padrão
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DEFAULT_FILTERS.map(filter => {
                      const IconComponent = filter.icon
                      const enabled = isFilterEnabled('default', undefined, filter.value)
                      return (
                        <div
                          key={filter.value}
                          className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                        >
                          <Checkbox
                            id={`default-${filter.value}`}
                            checked={enabled}
                            onCheckedChange={() => toggleDefaultFilter(filter.value)}
                          />
                          <Label
                            htmlFor={`default-${filter.value}`}
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

                {/* TAGS CUSTOMIZADAS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      Tags Customizadas
                    </h3>
                  </div>

                  {/* Tags existentes do CRM */}
                  {tags.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {tags.map(tag => {
                        const enabled = isFilterEnabled('tag', tag.id)
                        return (
                          <div
                            key={tag.id}
                            className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                          >
                            <Checkbox
                              id={`tag-${tag.id}`}
                              checked={enabled}
                              onCheckedChange={() => toggleTag(tag.id)}
                            />
                            <Label
                              htmlFor={`tag-${tag.id}`}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <div className={cn("w-3 h-3 rounded-full", `bg-${tag.color}-500`)} />
                              <span className="text-sm font-medium">{tag.name}</span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Criar nova tag */}
                  <div className="p-4 rounded-lg border-2 border-dashed border-border bg-surface/50 space-y-3">
                    <Label className="text-sm font-medium">Criar Nova Tag</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="tag-name" className="text-xs">Nome</Label>
                        <Input
                          id="tag-name"
                          placeholder="Ex: VIP, Urgente"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tag-color" className="text-xs">Cor</Label>
                        <Select value={newTagColor} onValueChange={setNewTagColor}>
                          <SelectTrigger id="tag-color" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAG_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${color.class}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag-description" className="text-xs">Descrição (opcional)</Label>
                      <Input
                        id="tag-description"
                        placeholder="Descrição da tag..."
                        value={newTagDescription}
                        onChange={(e) => setNewTagDescription(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Button
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || creatingTag || !clientId}
                      className="w-full"
                      variant="outline"
                      size="sm"
                    >
                      {creatingTag ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Criar e Adicionar Tag
                    </Button>
                  </div>
                </div>

                {/* ESTÁGIOS DO FUNIL (CRM Columns) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      Estágios do Funil
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {columns.length > 0 ? (
                      columns.map(column => {
                        const enabled = isFilterEnabled('column', column.id)
                        return (
                          <div
                            key={column.id}
                            className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
                          >
                            <Checkbox
                              id={`column-${column.id}`}
                              checked={enabled}
                              onCheckedChange={() => toggleColumn(column.id)}
                            />
                            <Label
                              htmlFor={`column-${column.id}`}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{column.name}</span>
                            </Label>
                          </div>
                        )
                      })
                    ) : (
                      <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                        Nenhum estágio do funil criado ainda.
                        <br />
                        <span className="text-xs">Crie estágios no CRM para usá-los como filtros aqui.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
