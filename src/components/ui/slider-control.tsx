'use client'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SliderControlProps {
  id: string
  label: string
  description?: string
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  unit?: string
  className?: string
}

/**
 * SliderControl Component
 *
 * Componente de slider com valor visível seguindo boas práticas de UX:
 * - Slider visual com valor ao lado
 * - Label e descrição
 * - Feedback visual em tempo real
 * - Acessível (WCAG 2.1 AA)
 */
export function SliderControl({
  id,
  label,
  description,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  disabled = false,
  unit = '',
  className,
}: SliderControlProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </Label>
        <span className="text-sm font-bold text-primary">
          {value}{unit}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={([newValue]) => onValueChange(newValue)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

