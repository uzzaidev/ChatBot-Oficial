'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { AnalyticsShell } from '@/components/AnalyticsShell'
import { Download, Settings, X, ZoomIn } from 'lucide-react'
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
  variant?: 'card' | 'bare'
  mobileHeight?: number
  desktopHeight?: number
  hideLegendOnMobile?: boolean
}

const SERIES_COLOR_MAP: Record<string, { base: string; accent: string }> = {
  total: { base: '#2563eb', accent: '#60a5fa' },
  ativo: { base: '#14b8a6', accent: '#5eead4' },
  active: { base: '#14b8a6', accent: '#5eead4' },
  humano: { base: '#8b5cf6', accent: '#c4b5fd' },
  human: { base: '#8b5cf6', accent: '#c4b5fd' },
  transferido: { base: '#f59e0b', accent: '#fcd34d' },
  transferred: { base: '#f59e0b', accent: '#fcd34d' },
  enviadas: { base: '#10b981', accent: '#6ee7b7' },
  outgoing: { base: '#10b981', accent: '#6ee7b7' },
  recebidas: { base: '#06b6d4', accent: '#67e8f9' },
  incoming: { base: '#06b6d4', accent: '#67e8f9' },
  novos: { base: '#a855f7', accent: '#d8b4fe' },
  new: { base: '#a855f7', accent: '#d8b4fe' },
  openai: { base: '#10b981', accent: '#86efac' },
  groq: { base: '#f97316', accent: '#fdba74' },
}

function formatMetricDateLabel(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Date(`${value}-01T00:00:00`).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    })
  }

  if (/^\d{4}-W\d{2}$/.test(value)) {
    return value.replace(/^\d{4}-/, '')
  }

  return value
}

function getChartTypeLabel(type: ChartConfig['type']) {
  switch (type) {
    case 'line':
      return 'Linha'
    case 'bar':
      return 'Barras'
    case 'area':
      return 'Área'
    case 'composed':
      return 'Composto'
    default:
      return 'Gráfico'
  }
}

function sanitizeGradientId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function normalizeSeriesKey(value: string) {
  return value.toLowerCase().trim()
}

function isTotalSeriesKey(value: string) {
  return normalizeSeriesKey(value) === 'total'
}

/**
 * CustomizableChart Component
 *
 * Componente de gráfico customizável com shell premium para analytics.
 */
export function CustomizableChart({
  config,
  data,
  onEdit,
  onRemove,
  loading = false,
  variant = 'card',
  mobileHeight,
  desktopHeight,
  hideLegendOnMobile = false,
}: CustomizableChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isMobile, setIsMobile] = useState(false)
  const [hiddenDataKeys, setHiddenDataKeys] = useState<Set<string>>(new Set())
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const syncMedia = () => setIsMobile(mediaQuery.matches)

    syncMedia()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncMedia)
      return () => mediaQuery.removeEventListener('change', syncMedia)
    }

    mediaQuery.addListener(syncMedia)
    return () => mediaQuery.removeListener(syncMedia)
  }, [])

  const baseHeight = config.height || 300
  const chartHeight = isMobile
    ? mobileHeight ?? Math.max(240, baseHeight - 36)
    : desktopHeight ?? baseHeight
  const shouldShowLegend = Boolean(config.showLegend) && !(hideLegendOnMobile && isMobile)
  const xAxisInterval = isMobile
    ? Math.max(0, Math.ceil(Math.max(data.length, 1) / 4) - 1)
    : Math.max(0, Math.ceil(Math.max(data.length, 1) / 7) - 1)
  const gradientIdBase = sanitizeGradientId(config.id)

  const axisStroke = isDark
    ? 'hsl(var(--muted-foreground) / 0.45)'
    : 'hsl(var(--muted-foreground) / 0.35)'
  const tickFill = isDark
    ? 'hsl(var(--muted-foreground) / 0.72)'
    : 'hsl(var(--muted-foreground) / 0.65)'
  const gridStroke = isDark ? 'hsl(var(--border) / 0.28)' : 'hsl(var(--border) / 0.22)'
  const tooltipBg = isDark ? 'hsl(var(--popover) / 0.96)' : 'hsl(var(--background) / 0.96)'
  const tooltipBorder = 'hsl(var(--border))'
  const tooltipLabelColor = 'hsl(var(--foreground))'
  const tooltipItemColor = 'hsl(var(--muted-foreground))'
  const legendColor = 'hsl(var(--foreground))'

  const handleLegendClick = (
    dataKey:
      | string
      | number
      | ((data: unknown, index: number) => string | number)
      | undefined,
  ) => {
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

  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: isDark ? 'hsl(var(--card))' : 'hsl(var(--background))',
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

  const getDataKeys = () => {
    if (data.length === 0) return []
    const firstItem = data[0]
    const keys = Object.keys(firstItem).filter((key) => key !== 'date' && key !== 'label')

    return keys.sort((a, b) => {
      const aIsTotal = isTotalSeriesKey(a)
      const bIsTotal = isTotalSeriesKey(b)

      if (aIsTotal && !bIsTotal) return 1
      if (!aIsTotal && bIsTotal) return -1
      return a.localeCompare(b)
    })
  }

  const getSeriesPalette = (key: string, index: number) => {
    const semantic = SERIES_COLOR_MAP[normalizeSeriesKey(key)]
    if (semantic) return semantic

    if (index === 0) {
      return {
        base: config.colors.primary,
        accent: config.colors.secondary || config.colors.primary,
      }
    }

    if (index === 1 && config.colors.secondary) {
      return {
        base: config.colors.secondary,
        accent: config.colors.primary,
      }
    }

    return {
      base: config.colors.primary,
      accent: config.colors.secondary || config.colors.primary,
    }
  }

  const getSeriesColor = (key: string, index: number) => getSeriesPalette(key, index).base

  const getSeriesAccent = (key: string, index: number) => getSeriesPalette(key, index).accent

  const renderGradientDefs = () => {
    const dataKeys = getDataKeys()

    return (
      <defs>
        {dataKeys.map((key, index) => {
          const color = getSeriesColor(key, index)
          const accent = getSeriesAccent(key, index)

          return (
            <linearGradient key={`${key}-line-gradient`} id={`${gradientIdBase}-line-${index}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={accent} />
            </linearGradient>
          )
        })}

        {dataKeys.map((key, index) => {
          const color = getSeriesColor(key, index)
          const accent = getSeriesAccent(key, index)

          return (
            <linearGradient key={`${key}-area-gradient`} id={`${gradientIdBase}-area-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
              <stop offset="55%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          )
        })}

        {dataKeys.map((key, index) => {
          const color = getSeriesColor(key, index)
          const accent = getSeriesAccent(key, index)

          return (
            <linearGradient key={`${key}-bar-gradient`} id={`${gradientIdBase}-bar-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.98" />
              <stop offset="38%" stopColor={color} stopOpacity="0.94" />
              <stop offset="100%" stopColor={color} stopOpacity="0.62" />
            </linearGradient>
          )
        })}
      </defs>
    )
  }

  const renderLines = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key) => {
        const index = dataKeys.indexOf(key)

        return (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`url(#${gradientIdBase}-line-${index})`}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{
              r: 5.5,
              fill: getSeriesColor(key, index),
              stroke: getSeriesAccent(key, index),
              strokeWidth: 3,
            }}
            animationDuration={900 + index * 120}
            animationEasing="ease-out"
            hide={hiddenDataKeys.has(key)}
          />
        )
      })
  }

  const renderBars = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key) => {
        const index = dataKeys.indexOf(key)

        return (
          <Bar
            key={key}
            dataKey={key}
            fill={`url(#${gradientIdBase}-bar-${index})`}
            stroke={getSeriesColor(key, index)}
            strokeOpacity={0.12}
            radius={[10, 10, 4, 4]}
            maxBarSize={isMobile ? 18 : 28}
            animationDuration={720 + index * 80}
            animationEasing="ease-out"
            hide={hiddenDataKeys.has(key)}
          />
        )
      })
  }

  const renderAreas = () => {
    const dataKeys = getDataKeys()
    return dataKeys
      .filter((key) => !hiddenDataKeys.has(key))
      .map((key) => {
        const index = dataKeys.indexOf(key)

        return (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`url(#${gradientIdBase}-line-${index})`}
            fill={`url(#${gradientIdBase}-area-${index})`}
            strokeWidth={2.6}
            strokeLinecap="round"
            activeDot={{
              r: 5,
              fill: getSeriesColor(key, index),
              stroke: getSeriesAccent(key, index),
              strokeWidth: 3,
            }}
            animationDuration={980 + index * 120}
            animationEasing="ease-out"
            hide={hiddenDataKeys.has(key)}
          />
        )
      })
  }

  const renderComposedElements = () => {
    const dataKeys = getDataKeys()
    const nonTotalKeys = dataKeys.filter((key) => !isTotalSeriesKey(key))
    const totalKeys = dataKeys.filter((key) => isTotalSeriesKey(key))

    return [
      ...nonTotalKeys.map((key) => {
        const index = dataKeys.indexOf(key)

        return (
          <Bar
            key={key}
            dataKey={key}
            fill={`url(#${gradientIdBase}-bar-${index})`}
            stroke={getSeriesColor(key, index)}
            strokeOpacity={0.12}
            radius={[10, 10, 4, 4]}
            maxBarSize={isMobile ? 16 : 24}
            animationBegin={80}
            animationDuration={760 + index * 80}
            animationEasing="ease-out"
          />
        )
      }),
      ...totalKeys.map((key) => {
        const index = dataKeys.indexOf(key)

        return (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`url(#${gradientIdBase}-line-${index})`}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{
              r: 5.5,
              fill: getSeriesColor(key, index),
              stroke: getSeriesAccent(key, index),
              strokeWidth: 3,
            }}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        )
      }),
    ]
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: isMobile
        ? { top: 8, right: 2, left: -22, bottom: 0 }
        : { top: 12, right: 10, left: -8, bottom: 0 },
    }

    const tooltipProps = {
      contentStyle: {
        backgroundColor: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: isDark ? '0 12px 32px rgba(0, 0, 0, 0.45)' : '0 12px 28px rgba(0, 0, 0, 0.12)',
      },
      labelStyle: {
        color: tooltipLabelColor,
        fontWeight: 600,
        marginBottom: '4px',
      },
      itemStyle: {
        color: tooltipItemColor,
        fontSize: '12px',
      },
      cursor: { stroke: 'hsl(var(--primary) / 0.22)', strokeWidth: 1 },
    }

    const xAxisProps = {
      dataKey: 'date',
      stroke: axisStroke,
      tickLine: false,
      axisLine: false,
      tick: { fill: tickFill, fontSize: isMobile ? 10 : 11 },
      tickFormatter: formatMetricDateLabel,
      minTickGap: isMobile ? 24 : 14,
      tickMargin: isMobile ? 6 : 8,
      interval: xAxisInterval,
      padding: isMobile ? { left: 0, right: 0 } : { left: 6, right: 6 },
    }

    const yAxisProps = {
      stroke: axisStroke,
      tickLine: false,
      axisLine: false,
      hide: isMobile,
      tick: { fill: tickFill, fontSize: isMobile ? 10 : 11 },
      width: isMobile ? 0 : 46,
      tickMargin: 8,
    }

    switch (config.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {renderGradientDefs()}
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
             {shouldShowLegend && (
               <Legend
                 onClick={(payload) => {
                   if (typeof payload?.dataKey === 'string' || typeof payload?.dataKey === 'number') {
                     handleLegendClick(String(payload.dataKey))
                   }
                 }}
                 wrapperStyle={{ color: legendColor, fontSize: isMobile ? '11px' : '12px' }}
                 iconType="line"
               />
             )}
            {renderLines()}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {renderGradientDefs()}
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
             {shouldShowLegend && (
               <Legend
                 onClick={(payload) => {
                   if (typeof payload?.dataKey === 'string' || typeof payload?.dataKey === 'number') {
                     handleLegendClick(String(payload.dataKey))
                   }
                 }}
                 wrapperStyle={{ color: legendColor, fontSize: isMobile ? '11px' : '12px' }}
               />
             )}
            {renderBars()}
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {renderGradientDefs()}
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
             {shouldShowLegend && (
               <Legend
                 onClick={(payload) => {
                   if (typeof payload?.dataKey === 'string' || typeof payload?.dataKey === 'number') {
                     handleLegendClick(String(payload.dataKey))
                   }
                 }}
                 wrapperStyle={{ color: legendColor, fontSize: isMobile ? '11px' : '12px' }}
                 iconType="rect"
               />
             )}
            {renderAreas()}
          </AreaChart>
        )

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {renderGradientDefs()}
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
             {shouldShowLegend && (
               <Legend
                 onClick={(payload) => {
                   if (typeof payload?.dataKey === 'string' || typeof payload?.dataKey === 'number') {
                     handleLegendClick(String(payload.dataKey))
                   }
                 }}
                 wrapperStyle={{ color: legendColor, fontSize: isMobile ? '11px' : '12px' }}
               />
             )}
            {renderComposedElements()}
          </ComposedChart>
        )

      default:
        return null
    }
  }

  const chartCanvas = (
    <div ref={chartContainerRef} className="analytics-chart-frame w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )

  const actionButtons = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportPNG}
        className="h-8 w-8 rounded-full border border-border/60 bg-background/35 text-muted-foreground hover:bg-background/55 hover:text-foreground"
        title="Exportar como PNG"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportSVG}
        className="h-8 w-8 rounded-full border border-border/60 bg-background/35 text-muted-foreground hover:bg-background/55 hover:text-foreground"
        title="Exportar como SVG"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(config.id)}
          className="h-8 w-8 rounded-full border border-border/60 bg-background/35 text-muted-foreground hover:bg-background/55 hover:text-foreground"
          title="Editar grafico"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(config.id)}
          className="h-8 w-8 rounded-full border border-border/60 bg-background/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Remover gráfico"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </>
  )

  const emptyState = (
    <div className="analytics-empty-state" style={{ minHeight: chartHeight }}>
      <p className="text-sm text-muted-foreground">
        {loading ? 'Carregando visualizacao...' : 'Nenhum dado disponivel'}
      </p>
    </div>
  )

  if (variant === 'bare') {
    if (loading || !data || data.length === 0) {
      return emptyState
    }

    return chartCanvas
  }

  return (
    <AnalyticsShell
      title={config.title}
      description={config.description}
      kicker="dashboard"
      meta={
        <>
          <span className="analytics-inline-chip">{getChartTypeLabel(config.type)}</span>
          <span className="analytics-inline-chip">{String(config.metricType).replace(/_/g, ' ')}</span>
        </>
      }
      actions={actionButtons}
      variant={config.position.w >= 7 ? 'hero' : 'default'}
      plotClassName="pt-1"
    >
      {loading || !data || data.length === 0 ? emptyState : chartCanvas}
    </AnalyticsShell>
  )
}
