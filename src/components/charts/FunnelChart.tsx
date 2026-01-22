'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface FunnelStep {
  label: string
  value: number
  color?: string
}

interface FunnelChartProps {
  title: string
  description?: string
  steps: FunnelStep[]
  height?: number
  showPercentages?: boolean
  className?: string
}

/**
 * FunnelChart Component
 * 
 * Gráfico de funil para visualizar conversão entre etapas
 * Útil para ver drop-off em processos, conversões, etc
 */
export function FunnelChart({
  title,
  description,
  steps,
  height = 400,
  showPercentages = true,
  className,
}: FunnelChartProps) {
  const maxValue = useMemo(() => Math.max(...steps.map(s => s.value)), [steps])

  const processedSteps = useMemo(() => {
    return steps.map((step, index) => {
      const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0
      const conversionRate = index > 0 && steps[index - 1].value > 0
        ? (step.value / steps[index - 1].value) * 100
        : 100

      return {
        ...step,
        percentage,
        conversionRate,
        width: percentage,
      }
    })
  }, [steps, maxValue])

  const defaultColors = ['#1ABC9C', '#2E86AB', '#FFD700', '#EC4899', '#F59E0B', '#10B981']

  return (
    <Card className={cn("bg-[#1a1f26] border-white/10", className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <CardDescription className="text-uzz-silver">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ height }}>
          {processedSteps.map((step, index) => {
            const color = step.color || defaultColors[index % defaultColors.length]
            
            return (
              <div key={index} className="relative">
                {/* Step label and value */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{step.label}</span>
                    {showPercentages && index > 0 && (
                      <span className="text-xs text-uzz-silver">
                        ({step.conversionRate.toFixed(1)}% conversão)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{step.value.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Funnel bar */}
                <div className="relative h-12 bg-white/5 rounded-lg overflow-hidden">
                  {/* Background */}
                  <div
                    className="absolute inset-0 transition-all duration-500 ease-out"
                    style={{
                      width: `${step.width}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                  />
                  {/* Border */}
                  <div
                    className="absolute inset-0 border-2 rounded-lg transition-all duration-500 ease-out"
                    style={{
                      width: `${step.width}%`,
                      borderColor: color,
                    }}
                  />
                  {/* Value text inside bar */}
                  {step.width > 15 && (
                    <div className="absolute inset-0 flex items-center justify-start pl-3">
                      <span className="text-xs font-semibold text-white">
                        {step.value.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Drop-off indicator */}
                {index < processedSteps.length - 1 && (
                  <div className="flex items-center justify-center my-2">
                    <div className="flex items-center gap-2 text-xs text-uzz-silver">
                      <span>↓</span>
                      <span>
                        {(
                          processedSteps[index].value - processedSteps[index + 1].value
                        ).toLocaleString('pt-BR')} perdidos
                      </span>
                      <span>
                        (
                        {(
                          100 - processedSteps[index + 1].conversionRate
                        ).toFixed(1)}
                        % drop-off)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">
                {processedSteps[0].value.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-uzz-silver mt-1">Início</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {processedSteps[processedSteps.length - 1].value.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-uzz-silver mt-1">Fim</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: defaultColors[0] }}>
                {(
                  (processedSteps[processedSteps.length - 1].value / processedSteps[0].value) * 100
                ).toFixed(1)}%
              </div>
              <div className="text-xs text-uzz-silver mt-1">Taxa Total</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

