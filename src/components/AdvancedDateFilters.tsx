'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangeSelector, type DateRange, type DatePreset } from '@/components/DateRangeSelector'
import { MonthYearSelector, getMonthYearDateRange, getPreviousMonthYear } from '@/components/MonthYearSelector'
import { CustomDateRangePicker, type SavedDateRange } from '@/components/CustomDateRangePicker'
import { Calendar, BarChart3, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedDateFiltersProps {
  value: DateFilterValue
  onChange: (filter: DateFilterValue) => void
  savedRanges?: SavedDateRange[]
  onSaveRange?: (name: string, start: Date, end: Date) => void
  className?: string
}

export type DateFilterMode = 'preset' | 'monthYear' | 'custom'

export interface DateFilterValue {
  mode: DateFilterMode
  // Para preset
  dateRange?: {
    start: Date
    end: Date
    preset?: string
  }
  // Para month/year
  month?: number
  year?: number
  compareWithPrevious?: boolean
  // Para custom
  startDate?: Date
  endDate?: Date
}

/**
 * AdvancedDateFilters Component
 * 
 * Componente unificado que combina todos os tipos de filtros temporais:
 * - Presets (Hoje, Esta Semana, etc)
 * - Mês/Ano específico
 * - Range customizado
 */
export function AdvancedDateFilters({
  value,
  onChange,
  savedRanges = [],
  onSaveRange,
  className,
}: AdvancedDateFiltersProps) {
  const [activeTab, setActiveTab] = useState<DateFilterMode>(value.mode || 'preset')

  const handlePresetChange = (range: DateRange) => {
    onChange({
      mode: 'preset',
      dateRange: {
        start: range.start,
        end: range.end,
        preset: range.preset,
      },
    })
  }

  const handleMonthYearChange = (month: number, year: number, compare?: boolean) => {
    onChange({
      mode: 'monthYear',
      month,
      year,
      compareWithPrevious: compare,
    })
  }

  const handleCustomRangeChange = (start: Date, end: Date) => {
    onChange({
      mode: 'custom',
      startDate: start,
      endDate: end,
    })
  }

  // Sincronizar activeTab com value.mode
  useEffect(() => {
    setActiveTab(value.mode || 'preset')
  }, [value.mode])

  // Inicializar valores padrão se não existirem
  const defaultDateRange: DateRange = value.dateRange ? {
    start: value.dateRange.start,
    end: value.dateRange.end,
    preset: value.dateRange.preset as DatePreset | undefined,
  } : (() => {
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    return {
      start: thirtyDaysAgo,
      end: now,
      preset: 'last30Days' as DatePreset,
    }
  })()

  const currentMonth = value.month || new Date().getMonth() + 1
  const currentYear = value.year || new Date().getFullYear()

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DateFilterMode)}>
        <TabsList className={cn(
          "grid w-full grid-cols-3 bg-white/5 border border-white/10",
          "p-1 rounded-lg"
        )}>
          <TabsTrigger
            value="preset"
            className={cn(
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-uzz-mint data-[state=active]:to-uzz-blue",
              "data-[state=active]:text-white",
              "text-muted-foreground data-[state=inactive]:hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Presets
          </TabsTrigger>
          <TabsTrigger
            value="monthYear"
            className={cn(
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-uzz-mint data-[state=active]:to-uzz-blue",
              "data-[state=active]:text-white",
              "text-muted-foreground data-[state=inactive]:hover:text-foreground"
            )}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Mês/Ano
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className={cn(
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-uzz-mint data-[state=active]:to-uzz-blue",
              "data-[state=active]:text-white",
              "text-muted-foreground data-[state=inactive]:hover:text-foreground"
            )}
          >
            <CalendarRange className="h-4 w-4 mr-2" />
            Personalizado
          </TabsTrigger>
        </TabsList>

        {/* Tab: Presets */}
        <TabsContent value="preset" className="mt-4">
          <div className="flex items-center justify-between">
            <DateRangeSelector
              value={defaultDateRange}
              onChange={(range) => {
                handlePresetChange(range)
              }}
            />
            <div className="text-sm text-muted-foreground ml-4">
              {defaultDateRange.preset && (
                <span>
                  {formatDateRange(defaultDateRange.start, defaultDateRange.end)}
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Mês/Ano */}
        <TabsContent value="monthYear" className="mt-4">
          <MonthYearSelector
            selectedMonth={currentMonth}
            selectedYear={currentYear}
            onMonthChange={(month) => handleMonthYearChange(month, currentYear, value.compareWithPrevious)}
            onYearChange={(year) => handleMonthYearChange(currentMonth, year, value.compareWithPrevious)}
            compareWithPrevious={value.compareWithPrevious || false}
            onCompareToggle={(compare) => {
              handleMonthYearChange(currentMonth, currentYear, compare)
            }}
          />
        </TabsContent>

        {/* Tab: Custom */}
        <TabsContent value="custom" className="mt-4">
          <CustomDateRangePicker
            startDate={value.startDate}
            endDate={value.endDate}
            onRangeChange={handleCustomRangeChange}
            savedRanges={savedRanges}
            onSaveRange={onSaveRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Helper function to format date range for display
 */
function formatDateRange(start: Date, end: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  return `${formatDate(start)} - ${formatDate(end)}`
}

/**
 * Helper function to get effective date range from filter value
 */
export function getEffectiveDateRange(filter: DateFilterValue): { start: Date; end: Date } {
  switch (filter.mode) {
    case 'preset':
      if (filter.dateRange) {
        return {
          start: filter.dateRange.start,
          end: filter.dateRange.end,
        }
      }
      break
    
    case 'monthYear':
      if (filter.month && filter.year) {
        return getMonthYearDateRange(filter.month, filter.year)
      }
      break
    
    case 'custom':
      if (filter.startDate && filter.endDate) {
        return {
          start: filter.startDate,
          end: filter.endDate,
        }
      }
      break
  }

  // Fallback
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(now.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  return {
    start: thirtyDaysAgo,
    end: now,
  }
}

