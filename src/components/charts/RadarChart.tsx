'use client'

import { RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface RadarChartData {
  subject: string
  value: number
  fullMark?: number
  [key: string]: any
}

interface RadarChartProps {
  title: string
  description?: string
  data: RadarChartData[]
  series: {
    name: string
    color: string
    dataKey: string
  }[]
  height?: number
  className?: string
}

/**
 * RadarChart Component
 * 
 * Gráfico de radar (spider) para comparar múltiplas métricas
 * Útil para comparar performance, satisfação, ou múltiplas dimensões
 */
export function RadarChart({
  title,
  description,
  data,
  series,
  height = 400,
  className,
}: RadarChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const tooltipProps = {
    contentStyle: {
      backgroundColor: isDark ? '#1a1f26' : '#ffffff',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      padding: '12px',
    },
    labelStyle: { color: isDark ? '#fff' : '#1f2937', fontWeight: 600 },
    itemStyle: { color: isDark ? '#fff' : '#1f2937' },
  }

  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const axisTickColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  const radiusTickColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
  const legendColor = isDark ? '#fff' : '#1f2937'

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsRadarChart data={data}>
            <PolarGrid stroke={gridStroke} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: axisTickColor, fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 'auto']}
              tick={{ fill: radiusTickColor, fontSize: 10 }}
            />
            <Tooltip {...tooltipProps} />
            {series.map((s) => (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.dataKey}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
            <Legend
              wrapperStyle={{ color: legendColor, paddingTop: '20px' }}
              iconType="circle"
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

