'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export type DatePreset =
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisYear'
    | 'lastYear'
    | 'last7Days'
    | 'last30Days'
    | 'last60Days'
    | 'last90Days'
    | 'last3Months'
    | 'last6Months'
    | 'custom'

export interface DateRange {
    start: Date
    end: Date
    preset?: DatePreset
}

interface DateRangeSelectorProps {
    value: DateRange
    onChange: (range: DateRange) => void
    maxRangeDays?: number
}

const presetLabels: Record<DatePreset, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    thisWeek: 'Esta Semana',
    lastWeek: 'Semana Passada',
    thisMonth: 'Este Mês',
    lastMonth: 'Mês Passado',
    thisYear: 'Este Ano',
    lastYear: 'Ano Passado',
    last7Days: 'Últimos 7 dias',
    last30Days: 'Últimos 30 dias',
    last60Days: 'Últimos 60 dias',
    last90Days: 'Últimos 90 dias',
    last3Months: 'Últimos 3 meses',
    last6Months: 'Últimos 6 meses',
    custom: 'Personalizado',
}

function getDateRangeForPreset(preset: DatePreset): DateRange {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (preset) {
        case 'today':
            return {
                start: today,
                end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                preset,
            }

        case 'yesterday': {
            const yesterday = new Date(today)
            yesterday.setDate(today.getDate() - 1)
            return {
                start: yesterday,
                end: new Date(today.getTime() - 1),
                preset,
            }
        }

        case 'thisWeek': {
            const dayOfWeek = today.getDay()
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - dayOfWeek)
            return {
                start: startOfWeek,
                end: now,
                preset,
            }
        }

        case 'lastWeek': {
            const dayOfWeek = today.getDay()
            const startOfLastWeek = new Date(today)
            startOfLastWeek.setDate(today.getDate() - dayOfWeek - 7)
            const endOfLastWeek = new Date(startOfLastWeek)
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
            endOfLastWeek.setHours(23, 59, 59, 999)
            return {
                start: startOfLastWeek,
                end: endOfLastWeek,
                preset,
            }
        }

        case 'thisMonth': {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            return {
                start: startOfMonth,
                end: now,
                preset,
            }
        }

        case 'lastMonth': {
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
            return {
                start: startOfLastMonth,
                end: endOfLastMonth,
                preset,
            }
        }

        case 'last7Days': {
            const start = new Date(today)
            start.setDate(today.getDate() - 7)
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'last30Days': {
            const start = new Date(today)
            start.setDate(today.getDate() - 30)
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'last60Days': {
            const start = new Date(today)
            start.setDate(today.getDate() - 60)
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'last90Days': {
            const start = new Date(today)
            start.setDate(today.getDate() - 90)
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'last3Months': {
            const start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'last6Months': {
            const start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
            return {
                start,
                end: now,
                preset,
            }
        }

        case 'thisYear': {
            const startOfYear = new Date(today.getFullYear(), 0, 1)
            return {
                start: startOfYear,
                end: now,
                preset,
            }
        }

        case 'lastYear': {
            const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1)
            const endOfLastYear = new Date(today.getFullYear(), 0, 0, 23, 59, 59, 999)
            return {
                start: startOfLastYear,
                end: endOfLastYear,
                preset,
            }
        }

        default:
            return {
                start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                end: now,
                preset: 'last30Days',
            }
    }
}

export function DateRangeSelector({
    value,
    onChange,
    maxRangeDays = 730,
}: DateRangeSelectorProps) {
    const [open, setOpen] = useState(false)

    const handlePresetClick = (preset: DatePreset) => {
        const range = getDateRangeForPreset(preset)
        onChange(range)
        setOpen(false)
    }

    const currentLabel = value.preset ? presetLabels[value.preset] : 'Personalizado'

    // Presets organizados por categoria
    const quickPresets: DatePreset[] = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear']
    const pastPresets: DatePreset[] = ['lastWeek', 'lastMonth', 'lastYear']
    const rangePresets: DatePreset[] = ['last7Days', 'last30Days', 'last60Days', 'last90Days', 'last3Months', 'last6Months']

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[240px] justify-between",
                        "bg-surface border-border",
                        "text-foreground hover:text-foreground",
                        "hover:border-primary/50",
                        "transition-all duration-300",
                        "hover:shadow-lg hover:shadow-primary/20"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{currentLabel}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className={cn(
                    "w-[320px] p-4",
                    "bg-card border-border",
                    "shadow-xl"
                )}
                align="start"
            >
                <div className="space-y-4">
                    {/* Quick Presets */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Rápido
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {quickPresets.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        "border",
                                        value.preset === preset
                                            ? "bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-lg shadow-primary/30"
                                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-primary/10"
                                    )}
                                >
                                    {presetLabels[preset]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Past Periods */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Períodos Anteriores
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {pastPresets.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        "border",
                                        value.preset === preset
                                            ? "bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-lg shadow-primary/30"
                                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-primary/10"
                                    )}
                                >
                                    {presetLabels[preset]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Range Presets */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Últimos Dias
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {rangePresets.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                        "border",
                                        value.preset === preset
                                            ? "bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-lg shadow-primary/30"
                                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-primary/10"
                                    )}
                                >
                                    {presetLabels[preset]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
