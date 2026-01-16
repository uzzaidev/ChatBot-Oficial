'use client'

import { RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
  const tooltipProps = {
    contentStyle: {
      backgroundColor: '#1a1f26',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '12px',
    },
    labelStyle: { color: '#fff', fontWeight: 600 },
    itemStyle: { color: '#fff' },
  }

  return (
    <Card className={cn("bg-[#1a1f26] border-white/10", className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <CardDescription className="text-uzz-silver">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsRadarChart data={data}>
            <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']} 
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}
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
              wrapperStyle={{ color: '#fff', paddingTop: '20px' }}
              iconType="circle"
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

