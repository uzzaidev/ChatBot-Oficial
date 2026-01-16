'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface GaugeChartProps {
  title: string
  description?: string
  value: number
  min?: number
  max?: number
  unit?: string
  thresholds?: {
    color: string
    label: string
    min: number
    max: number
  }[]
  size?: number
  className?: string
}

/**
 * GaugeChart Component
 * 
 * Gráfico de gauge (medidor circular) para KPIs importantes
 * Útil para mostrar taxa de utilização, satisfação, porcentagens, etc
 */
export function GaugeChart({
  title,
  description,
  value,
  min = 0,
  max = 100,
  unit = '%',
  thresholds = [
    { color: '#EF4444', label: 'Crítico', min: 0, max: 33 },
    { color: '#F59E0B', label: 'Atenção', min: 33, max: 66 },
    { color: '#10B981', label: 'Bom', min: 66, max: 100 },
  ],
  size = 200,
  className,
}: GaugeChartProps) {
  const percentage = useMemo(() => {
    const clampedValue = Math.max(min, Math.min(max, value))
    return ((clampedValue - min) / (max - min)) * 100
  }, [value, min, max])

  // Find current threshold color
  const currentColor = useMemo(() => {
    const threshold = thresholds.find(
      (t) => percentage >= t.min && percentage < t.max
    )
    return threshold?.color || thresholds[0].color
  }, [percentage, thresholds])

  // Calculate arc path
  const radius = size / 2 - 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <Card className={cn("bg-[#1a1f26] border-white/10", className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <CardDescription className="text-uzz-silver">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8">
          {/* Gauge SVG */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="12"
              />
              {/* Threshold arcs */}
              {thresholds.map((threshold, index) => {
                const thresholdPercentage = ((threshold.max - threshold.min) / 100) * 100
                const startAngle = (threshold.min / 100) * 360 - 90
                const endAngle = (threshold.max / 100) * 360 - 90
                
                return (
                  <circle
                    key={index}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={threshold.color}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (thresholdPercentage / 100) * circumference}
                    strokeLinecap="round"
                    opacity={0.3}
                    style={{
                      transformOrigin: `${size / 2}px ${size / 2}px`,
                    }}
                  />
                )
              })}
              {/* Value arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={currentColor}
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Center value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold font-poppins" style={{ color: currentColor }}>
                {value.toFixed(1)}
              </div>
              <div className="text-sm text-uzz-silver mt-1">{unit}</div>
            </div>
          </div>

          {/* Threshold legend */}
          <div className="flex gap-4 mt-8">
            {thresholds.map((threshold, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: threshold.color }}
                />
                <span className="text-xs text-uzz-silver">
                  {threshold.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

