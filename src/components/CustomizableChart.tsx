'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, X } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'

interface CustomizableChartProps {
  config: ChartConfig
  data: MetricDataPoint[]
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  loading?: boolean
}

/**
 * CustomizableChart Component
 *
 * Componente de gráfico customizável que segue o padrão Byterover:
 * - Suporta múltiplos tipos (line, bar, area, composed)
 * - Cores customizáveis
 * - Grid e legenda opcionais
 * - Ações de editar/remover
 */
export function CustomizableChart({
  config,
  data,
  onEdit,
  onRemove,
  loading = false,
}: CustomizableChartProps) {
  const chartHeight = config.height || 300

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    const gridProps = config.showGrid
      ? { strokeDasharray: '3 3', stroke: '#e5e7eb' }
      : undefined

    const tooltipProps = {
      contentStyle: {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      },
      labelStyle: { color: '#374151' },
    }

    switch (config.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
            <Tooltip {...tooltipProps} />
            {config.showLegend && <Legend />}
            {renderLines()}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
            <Tooltip {...tooltipProps} />
            {config.showLegend && <Legend />}
            {renderBars()}
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
            <Tooltip {...tooltipProps} />
            {config.showLegend && <Legend />}
            {renderAreas()}
          </AreaChart>
        )

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
            <Tooltip {...tooltipProps} />
            {config.showLegend && <Legend />}
            {renderComposedElements()}
          </ComposedChart>
        )

      default:
        return null
    }
  }

  const renderLines = () => {
    const dataKeys = getDataKeys()
    return dataKeys.map((key, index) => (
      <Line
        key={key}
        type="monotone"
        dataKey={key}
        stroke={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 6 }}
      />
    ))
  }

  const renderBars = () => {
    const dataKeys = getDataKeys()
    return dataKeys.map((key, index) => (
      <Bar
        key={key}
        dataKey={key}
        fill={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
        radius={[4, 4, 0, 0]}
      />
    ))
  }

  const renderAreas = () => {
    const dataKeys = getDataKeys()
    return dataKeys.map((key, index) => (
      <Area
        key={key}
        type="monotone"
        dataKey={key}
        stroke={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
        fill={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
        fillOpacity={0.6}
      />
    ))
  }

  const renderComposedElements = () => {
    const dataKeys = getDataKeys()
    return dataKeys.map((key, index) => {
      if (index === 0) {
        return (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={config.colors.primary}
            strokeWidth={2}
            dot={false}
          />
        )
      }
      return (
        <Bar
          key={key}
          dataKey={key}
          fill={config.colors.secondary || config.colors.primary}
          radius={[4, 4, 0, 0]}
        />
      )
    })
  }

  const getDataKeys = () => {
    if (data.length === 0) return []
    const firstItem = data[0]
    return Object.keys(firstItem).filter((key) => key !== 'date' && key !== 'label')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          {config.description && <CardDescription>{config.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{config.title}</CardTitle>
            {config.description && <CardDescription>{config.description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(config.id)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(config.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{config.title}</CardTitle>
          {config.description && <CardDescription>{config.description}</CardDescription>}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(config.id)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(config.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
