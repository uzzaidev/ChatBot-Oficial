'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

/**
 * EmptyState Component - UZZ.AI Design
 *
 * Componente para estados vazios (sem dados):
 * - Ícone grande em mint
 * - Título e descrição centralizados
 * - Botão de ação primário (gradiente mint-blue)
 * - Botão de ação secundário (opcional)
 * - Usado em Templates, Knowledge, Flows, etc.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        "border-2 border-dashed border-gray-300 rounded-2xl",
        "bg-gradient-to-br from-gray-50 to-white",
        className
      )}
    >
      {/* Ícone */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-uzz-mint/20 blur-2xl rounded-full" />
        <div className="relative bg-gradient-to-br from-uzz-mint/10 to-uzz-blue/10 p-6 rounded-2xl">
          <Icon className="h-16 w-16 text-uzz-mint" strokeWidth={1.5} />
        </div>
      </div>

      {/* Título */}
      <h3 className="text-xl font-semibold text-uzz-black font-poppins mb-3">
        {title}
      </h3>

      {/* Descrição */}
      <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
        {description}
      </p>

      {/* Ações */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="bg-gradient-to-r from-uzz-mint to-uzz-blue hover:from-uzz-mint/90 hover:to-uzz-blue/90 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-uzz-mint/30 transition-all hover:-translate-y-0.5"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              className="border-uzz-silver text-uzz-black hover:bg-gray-50"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * EmptyStateSimple - Versão simplificada sem bordas
 */
export function EmptyStateSimple({
  icon: Icon,
  title,
  description,
  className,
}: Pick<EmptyStateProps, 'icon' | 'title' | 'description' | 'className'>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-8 text-center",
        className
      )}
    >
      <div className="rounded-full bg-gradient-to-br from-uzz-mint/20 to-uzz-blue/20 p-6 mb-6">
        <Icon className="h-12 w-12 text-uzz-mint" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-medium font-poppins text-white mb-2">{title}</h3>
      <p className="text-sm text-uzz-silver max-w-sm">{description}</p>
    </div>
  )
}
