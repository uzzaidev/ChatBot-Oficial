'use client'

import { Treemap as RechartsTreemap, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TreemapData {
  name: string
  value: number
  color?: string
  [key: string]: any
}

interface TreemapChartProps {
  title: string
  description?: string
  data: TreemapData[]
  height?: number
  colors?: string[]
  className?: string
}

/**
 * TreemapChart Component
 * 
 * Mapa de árvore para visualizar hierarquia e proporção de dados
 * Útil para ver distribuição de custo, conversas, etc por categoria
 */
export function TreemapChart({
  title,
  description,
  data,
  height = 400,
  colors = ['#1ABC9C', '#2E86AB', '#FFD700', '#EC4899', '#F59E0B', '#10B981'],
  className,
}: TreemapChartProps) {
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

  // Custom content for treemap cells
  const CustomContent = (props: any) => {
    const { x, y, width, height, payload } = props

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: payload.color || colors[payload.index % colors.length],
            stroke: 'rgba(255, 255, 255, 0.1)',
            strokeWidth: 2,
          }}
        />
        {width > 50 && height > 30 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="#fff"
              fontSize={12}
              fontWeight={600}
            >
              {payload.name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 8}
              textAnchor="middle"
              fill="rgba(255, 255, 255, 0.7)"
              fontSize={11}
            >
              {payload.value.toLocaleString('pt-BR')}
            </text>
          </>
        )}
      </g>
    )
  }

  // Assign colors to data
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
  }))

  return (
    <Card className={cn("bg-[#1a1f26] border-white/10", className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <CardDescription className="text-uzz-silver">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsTreemap
            data={dataWithColors}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="rgba(255, 255, 255, 0.1)"
            content={<CustomContent />}
          >
            <Tooltip {...tooltipProps} />
          </RechartsTreemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

