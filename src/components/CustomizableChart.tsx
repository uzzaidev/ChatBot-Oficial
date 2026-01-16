'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, X, Download, ZoomIn, ZoomOut } from 'lucide-react'
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
  Brush,
} from 'recharts'
import type { ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'
import { cn } from '@/lib/utils'

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
  const [hiddenDataKeys, setHiddenDataKeys] = useState<Set<string>>(new Set())
  const [brushStartIndex, setBrushStartIndex] = useState(0)
  const [brushEndIndex, setBrushEndIndex] = useState(data.length > 0 ? data.length - 1 : 0)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Filter data based on brush selection
  const filteredData = data.length > 0 ? data.slice(brushStartIndex, brushEndIndex + 1) : []

  // Toggle visibility of data series
  const handleLegendClick = (dataKey: string | number | ((data: any, index: number) => string | number) | undefined) => {
    if (!dataKey || typeof dataKey === 'function') return
    const key = String(dataKey)
    const newHidden = new Set(hiddenDataKeys)
    if (newHidden.has(key)) {
      newHidden.delete(key)
    } else {
      newHidden.add(key)
    }
    setHiddenDataKeys(newHidden)
  }

  // Export chart as PNG
  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return

    try {
      // Dynamic import of html2canvas to keep bundle size small
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#1a1f26',
        scale: 2,
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error)
      alert('Erro ao exportar gráfico. Tente novamente.')
    }
  }

  // Export chart as SVG
  const handleExportSVG = () => {
    const svgElement = chartContainerRef.current?.querySelector('svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const link = document.createElement('a')
    link.download = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.svg`
    link.href = svgUrl
    link.click()
    URL.revokeObjectURL(svgUrl)
  }

  const renderChart = () => {
    // Filter data based on brush selection
    const filteredData = data.slice(brushStartIndex, brushEndIndex + 1)

    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 0, bottom: data.length > 10 ? 50 : 0 },
    }

    const gridProps = config.showGrid
      ? { strokeDasharray: '3 3', stroke: 'rgba(255, 255, 255, 0.1)' }
      : undefined

    const tooltipProps = {
      contentStyle: {
        backgroundColor: '#1a1f26',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
      },
      labelStyle: { color: '#fff', fontWeight: 600 },
      itemStyle: { color: '#fff' },
      cursor: { stroke: 'rgba(26, 188, 156, 0.3)', strokeWidth: 2 },
    }


    switch (config.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.5)" 
              fontSize={12} 
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <Tooltip {...tooltipProps} />
            {config.showLegend && (
              <Legend 
                onClick={(e: any) => {
                  if (e?.dataKey) {
                    handleLegendClick(e.dataKey)
                  }
                }}
                wrapperStyle={{ color: '#fff' }}
                iconType="line"
              />
            )}
            {renderLines()}
            {data.length > 10 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#1ABC9C"
                fill="rgba(26, 188, 156, 0.1)"
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={(e) => {
                  if (e.startIndex !== undefined && e.endIndex !== undefined) {
                    setBrushStartIndex(e.startIndex)
                    setBrushEndIndex(e.endIndex)
                  }
                }}
              />
            )}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.5)" 
              fontSize={12} 
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <Tooltip {...tooltipProps} />
            {config.showLegend && (
              <Legend 
                onClick={(e: any) => {
                  if (e?.dataKey) {
                    handleLegendClick(e.dataKey)
                  }
                }}
                wrapperStyle={{ color: '#fff' }}
              />
            )}
            {renderBars()}
            {data.length > 10 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#1ABC9C"
                fill="rgba(26, 188, 156, 0.1)"
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={(e) => {
                  if (e.startIndex !== undefined && e.endIndex !== undefined) {
                    setBrushStartIndex(e.startIndex)
                    setBrushEndIndex(e.endIndex)
                  }
                }}
              />
            )}
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.5)" 
              fontSize={12} 
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <Tooltip {...tooltipProps} />
            {config.showLegend && (
              <Legend 
                onClick={(e: any) => {
                  if (e?.dataKey) {
                    handleLegendClick(e.dataKey)
                  }
                }}
                wrapperStyle={{ color: '#fff' }}
                iconType="rect"
              />
            )}
            {renderAreas()}
            {data.length > 10 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#1ABC9C"
                fill="rgba(26, 188, 156, 0.1)"
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={(e) => {
                  if (e.startIndex !== undefined && e.endIndex !== undefined) {
                    setBrushStartIndex(e.startIndex)
                    setBrushEndIndex(e.endIndex)
                  }
                }}
              />
            )}
          </AreaChart>
        )

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {config.showGrid && <CartesianGrid {...gridProps} />}
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.5)" 
              fontSize={12} 
              tickLine={false}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <Tooltip {...tooltipProps} />
            {config.showLegend && (
              <Legend 
                onClick={(e: any) => {
                  if (e?.dataKey) {
                    handleLegendClick(e.dataKey)
                  }
                }}
                wrapperStyle={{ color: '#fff' }}
              />
            )}
            {renderComposedElements()}
            {data.length > 10 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#1ABC9C"
                fill="rgba(26, 188, 156, 0.1)"
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={(e) => {
                  if (e.startIndex !== undefined && e.endIndex !== undefined) {
                    setBrushStartIndex(e.startIndex)
                    setBrushEndIndex(e.endIndex)
                  }
                }}
              />
            )}
          </ComposedChart>
        )

      default:
        return null
    }
  }

  const renderLines = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key, index) => (
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary }}
          hide={hiddenDataKeys.has(key)}
        />
      ))
  }

  const renderBars = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key, index) => (
        <Bar
          key={key}
          dataKey={key}
          fill={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
          radius={[4, 4, 0, 0]}
          hide={hiddenDataKeys.has(key)}
        />
      ))
  }

  const renderAreas = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key, index) => (
        <Area
          key={key}
          type="monotone"
          dataKey={key}
          stroke={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
          fill={index === 0 ? config.colors.primary : config.colors.secondary || config.colors.primary}
          fillOpacity={0.6}
          hide={hiddenDataKeys.has(key)}
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
          {/* Export buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPNG}
            className="h-8 w-8"
            title="Exportar como PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportSVG}
            className="h-8 w-8"
            title="Exportar como SVG"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(config.id)}
              className="h-8 w-8"
              title="Editar gráfico"
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
              title="Remover gráfico"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="w-full">
          <ResponsiveContainer width="100%" height={chartHeight}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
