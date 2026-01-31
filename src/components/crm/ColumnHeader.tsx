'use client'

import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface ColumnHeaderProps {
  name: string
  count: number
  icon?: string
  className?: string
}

export const ColumnHeader = ({ name, count, icon = 'users', className }: ColumnHeaderProps) => {
  // Get icon component from lucide-react
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Users

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <IconComponent className="h-4 w-4 text-muted-foreground" />
      <h3 className="font-semibold text-sm">{name}</h3>
      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        {count}
      </span>
    </div>
  )
}
