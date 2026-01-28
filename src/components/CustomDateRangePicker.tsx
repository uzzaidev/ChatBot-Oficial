'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CustomDateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onRangeChange: (start: Date, end: Date) => void
  maxRangeDays?: number // default: 730 (2 anos)
  savedRanges?: SavedDateRange[]
  onSaveRange?: (name: string, start: Date, end: Date) => void
  className?: string
}

export interface SavedDateRange {
  id: string
  name: string
  start: Date
  end: Date
}

/**
 * CustomDateRangePicker Component
 * 
 * Date picker customizado para selecionar range de datas específico
 * Suporta salvamento de ranges favoritos
 */
export function CustomDateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  maxRangeDays = 730,
  savedRanges = [],
  onSaveRange,
  className,
}: CustomDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate)
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate)
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const now = new Date()
  const minDate = new Date(now.getFullYear() - 2, 0, 1) // 2 anos atrás
  const maxDate = now

  // Validar range
  const isValidRange = tempStartDate && tempEndDate && tempEndDate >= tempStartDate
  const rangeDays = tempStartDate && tempEndDate
    ? Math.ceil((tempEndDate.getTime() - tempStartDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const exceedsMaxRange = rangeDays > maxRangeDays

  const handleApply = () => {
    if (isValidRange && tempStartDate && tempEndDate && !exceedsMaxRange) {
      // Ajustar para início do dia (start) e fim do dia (end)
      const start = new Date(tempStartDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(tempEndDate)
      end.setHours(23, 59, 59, 999)
      
      onRangeChange(start, end)
      setOpen(false)
    }
  }

  const handleSavedRangeClick = (saved: SavedDateRange) => {
    setTempStartDate(saved.start)
    setTempEndDate(saved.end)
    onRangeChange(saved.start, saved.end)
    setOpen(false)
  }

  const handleSaveRange = () => {
    if (saveName.trim() && tempStartDate && tempEndDate && onSaveRange) {
      onSaveRange(saveName.trim(), tempStartDate, tempEndDate)
      setSaveName('')
      setShowSaveDialog(false)
    }
  }

  const handleClear = () => {
    setTempStartDate(undefined)
    setTempEndDate(undefined)
  }

  // Formatar data para input type="date" (YYYY-MM-DD)
  const formatForInput = (date: Date | undefined): string => {
    if (!date) return ''
    return format(date, 'yyyy-MM-dd')
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    setTempStartDate(date)
    // Se end date não existe ou é anterior, ajustar
    if (date && tempEndDate && date > tempEndDate) {
      setTempEndDate(date)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    setTempEndDate(date)
    // Se start date não existe ou é posterior, ajustar
    if (date && tempStartDate && date < tempStartDate) {
      setTempStartDate(date)
    }
  }

  const displayText = startDate && endDate
    ? `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
    : 'Selecionar datas'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-between",
            "bg-card border-border text-foreground hover:border-primary/50",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">{displayText}</span>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "w-[420px] p-4",
          "bg-card border-border",
          "shadow-xl shadow-black/50"
        )}
        align="start"
      >
        <div className="space-y-4">
          {/* Ranges Salvos */}
          {savedRanges.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Ranges Salvos
              </h4>
              <div className="space-y-1">
                {savedRanges.map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => handleSavedRangeClick(saved)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                      "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-primary/10"
                    )}
                  >
                    <div className="font-medium">{saved.name}</div>
                    <div className="text-xs text-muted-foreground/70">
                      {format(saved.start, 'dd/MM/yyyy', { locale: ptBR })} - {format(saved.end, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seletores de Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Data Início
              </label>
              <input
                type="date"
                value={formatForInput(tempStartDate)}
                onChange={handleStartDateChange}
                min={format(minDate, 'yyyy-MM-dd')}
                max={format(maxDate, 'yyyy-MM-dd')}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm",
                  "bg-muted/30 border border-border text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                  "hover:border-primary/50 transition-colors"
                )}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Data Fim
              </label>
              <input
                type="date"
                value={formatForInput(tempEndDate)}
                onChange={handleEndDateChange}
                min={format(tempStartDate || minDate, 'yyyy-MM-dd')}
                max={format(maxDate, 'yyyy-MM-dd')}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm",
                  "bg-muted/30 border border-border text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                  "hover:border-primary/50 transition-colors"
                )}
              />
            </div>
          </div>

          {/* Informações do Range */}
          {tempStartDate && tempEndDate && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <span className="font-medium">Período:</span> {rangeDays} {rangeDays === 1 ? 'dia' : 'dias'}
              </div>
              {exceedsMaxRange && (
                <div className="text-destructive">
                  ⚠️ Range excede o limite máximo de {maxRangeDays} dias
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex gap-2">
              {(tempStartDate || tempEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}

              {onSaveRange && isValidRange && !exceedsMaxRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleApply}
              disabled={!isValidRange || exceedsMaxRange}
              className={cn(
                "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent",
                "hover:shadow-lg hover:shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Aplicar
            </Button>
          </div>

          {/* Dialog de Salvar */}
          {showSaveDialog && (
            <div className="pt-4 border-t border-border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Nome do Range
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ex: Janeiro 2026"
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm",
                    "bg-muted/30 border border-border text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "placeholder:text-muted-foreground/50"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveRange()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveRange}
                  disabled={!saveName.trim()}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

