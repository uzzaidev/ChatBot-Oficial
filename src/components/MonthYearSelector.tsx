'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthYearSelectorProps {
  selectedMonth?: number // 1-12
  selectedYear?: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  compareWithPrevious?: boolean
  onCompareToggle?: (compare: boolean) => void
  className?: string
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

/**
 * MonthYearSelector Component
 * 
 * Seletor de mês e ano específico para filtros de analytics
 * Permite comparar com o período anterior
 */
export function MonthYearSelector({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  compareWithPrevious = false,
  onCompareToggle,
  className,
}: MonthYearSelectorProps) {
  const now = new Date()
  const currentMonth = selectedMonth || now.getMonth() + 1
  const currentYear = selectedYear || now.getFullYear()

  // Gerar anos (últimos 5 anos + anos futuros até 2 anos)
  const years: number[] = []
  const startYear = now.getFullYear() - 5
  const endYear = now.getFullYear() + 2
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12)
      onYearChange(currentYear - 1)
    } else {
      onMonthChange(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1)
      onYearChange(currentYear + 1)
    } else {
      onMonthChange(currentMonth + 1)
    }
  }

  const handlePreviousYear = () => {
    if (currentYear > startYear) {
      onYearChange(currentYear - 1)
    }
  }

  const handleNextYear = () => {
    if (currentYear < endYear) {
      onYearChange(currentYear + 1)
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Mês */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          disabled={currentMonth === 1 && currentYear === startYear}
          className={cn(
            "h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted",
            "border border-border"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={currentMonth.toString()}
          onValueChange={(value) => onMonthChange(parseInt(value))}
        >
          <SelectTrigger className={cn(
            "w-[140px] bg-card border-border text-foreground",
            "hover:border-primary/50"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {MONTHS.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value.toString()}
                className="text-foreground hover:bg-muted focus:bg-primary/20"
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          disabled={currentMonth === 12 && currentYear === endYear}
          className={cn(
            "h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted",
            "border border-border"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Ano */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousYear}
          disabled={currentYear <= startYear}
          className={cn(
            "h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted",
            "border border-border"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={currentYear.toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className={cn(
            "w-[100px] bg-card border-border text-foreground",
            "hover:border-primary/50"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border max-h-[200px]">
            {years.reverse().map((year) => (
              <SelectItem
                key={year}
                value={year.toString()}
                className="text-foreground hover:bg-muted focus:bg-primary/20"
              >
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextYear}
          disabled={currentYear >= endYear}
          className={cn(
            "h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted",
            "border border-border"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Toggle Comparação */}
      {onCompareToggle && (
        <Button
          variant={compareWithPrevious ? "default" : "outline"}
          size="sm"
          onClick={() => onCompareToggle(!compareWithPrevious)}
          className={cn(
            "ml-auto",
            compareWithPrevious
              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Comparar com anterior
        </Button>
      )}
    </div>
  )
}

/**
 * Helper function to get date range for a specific month/year
 */
export function getMonthYearDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999) // Último dia do mês
  
  return { start, end }
}

/**
 * Helper function to get previous month/year for comparison
 */
export function getPreviousMonthYear(month: number, year: number): { month: number; year: number } {
  if (month === 1) {
    return { month: 12, year: year - 1 }
  }
  return { month: month - 1, year }
}

