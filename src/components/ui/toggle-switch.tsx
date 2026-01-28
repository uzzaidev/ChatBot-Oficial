'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * ToggleSwitch Component
 *
 * Componente de toggle visual seguindo boas práticas de UX:
 * - Switch visual (não checkbox)
 * - Label e descrição lado a lado
 * - Feedback visual claro
 * - Acessível (WCAG 2.1 AA)
 */
export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex-1 space-y-0.5">
        <Label
          htmlFor={id}
          className="text-sm font-semibold text-foreground cursor-pointer"
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  )
}

