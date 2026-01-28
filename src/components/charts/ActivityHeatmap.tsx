'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { format, startOfYear, eachDayOfInterval, getDay, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTheme } from 'next-themes'

interface HeatmapData {
  date: Date | string
  value: number
}

interface ActivityHeatmapProps {
  title: string
  description?: string
  data: HeatmapData[]
  startDate?: Date
  endDate?: Date
  className?: string
}

/**
 * ActivityHeatmap Component
 * 
 * Heatmap de atividade estilo GitHub contributions
 * Útil para visualizar atividade por dia ao longo do tempo
 */
export function ActivityHeatmap({
  title,
  description,
  data,
  startDate,
  endDate,
  className,
}: ActivityHeatmapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Default to last year - memoize to avoid dependency issues
  const defaultEndDate = useMemo(() => endDate || new Date(), [endDate])
  const defaultStartDate = useMemo(() => startDate || startOfYear(defaultEndDate), [startDate, defaultEndDate])

  // Create map of date to value
  const dataMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((item) => {
      const dateKey = typeof item.date === 'string' 
        ? format(new Date(item.date), 'yyyy-MM-dd')
        : format(item.date, 'yyyy-MM-dd')
      map.set(dateKey, item.value)
    })
    return map
  }, [data])

  // Get all days in range
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: defaultStartDate,
      end: defaultEndDate,
    })
  }, [defaultStartDate, defaultEndDate])

  // Calculate intensity levels
  const values = Array.from(dataMap.values())
  const maxValue = Math.max(...values, 1)
  const levels = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue]

  const getIntensity = (value: number): number => {
    if (value === 0) return 0
    for (let i = levels.length - 1; i >= 0; i--) {
      if (value >= levels[i]) return i + 1
    }
    return 1
  }

  const getColor = (intensity: number): string => {
    const darkColors = [
      'rgba(255, 255, 255, 0.05)', // 0 - No activity
      'rgba(26, 188, 156, 0.3)',   // 1 - Low
      'rgba(26, 188, 156, 0.5)',   // 2 - Medium
      'rgba(26, 188, 156, 0.7)',   // 3 - High
      'rgba(26, 188, 156, 1)',     // 4 - Very High
    ]
    const lightColors = [
      'rgba(0, 0, 0, 0.05)',       // 0 - No activity
      'rgba(26, 188, 156, 0.3)',   // 1 - Low
      'rgba(26, 188, 156, 0.5)',   // 2 - Medium
      'rgba(26, 188, 156, 0.7)',   // 3 - High
      'rgba(26, 188, 156, 1)',     // 4 - Very High
    ]
    const colors = isDark ? darkColors : lightColors
    return colors[intensity] || colors[0]
  }

  // Group days by week
  const weeks = useMemo(() => {
    const weekGroups: Date[][] = []
    let currentWeek: Date[] = []

    days.forEach((day) => {
      const dayOfWeek = getDay(day)
      
      // Start new week on Sunday or first day
      if (dayOfWeek === 0 || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek)
        }
        currentWeek = [day]
      } else {
        currentWeek.push(day)
      }
    })
    
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek)
    }

    return weekGroups
  }, [days])

  const monthLabels = useMemo(() => {
    const months = new Set<string>()
    days.forEach((day) => {
      if (getDay(day) === 1 || day.getDate() === 1) {
        months.add(format(day, 'MMM', { locale: ptBR }))
      }
    })
    return Array.from(months)
  }, [days])

  const cellBorder = isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)'

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pt-6 pr-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                <div
                  key={day}
                  className="text-xs text-muted-foreground text-right w-10 h-3"
                  style={{ visibility: index % 2 === 0 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const value = dataMap.get(dateKey) || 0
                    const intensity = getIntensity(value)
                    const color = getColor(intensity)

                    return (
                      <div
                        key={dateKey}
                        className="w-3 h-3 rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-primary cursor-pointer"
                        style={{
                          backgroundColor: color,
                          border: cellBorder,
                        }}
                        title={`${format(day, 'dd/MM/yyyy', { locale: ptBR })}: ${value} atividades`}
                      />
                    )
                  })}
                  {/* Fill remaining days in week */}
                  {week.length < 7 &&
                    Array.from({ length: 7 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-3 h-3" />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((intensity) => (
                  <div
                    key={intensity}
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor: getColor(intensity),
                      border: cellBorder,
                    }}
                  />
                ))}
              </div>
              <span>Mais</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {data.reduce((sum, item) => sum + item.value, 0).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

