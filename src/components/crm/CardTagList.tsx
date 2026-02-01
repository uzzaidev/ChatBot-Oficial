'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CRMTag } from '@/lib/types'

interface CardTagListProps {
  tags: CRMTag[]
  maxVisible?: number
  size?: 'sm' | 'md'
}

const TAG_COLORS: Record<string, string> = {
  mint: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  gold: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  default: 'bg-secondary/20 text-secondary-foreground border-border',
}

export const CardTagList = ({ tags, maxVisible = 3, size = 'sm' }: CardTagListProps) => {
  const visibleTags = tags.slice(0, maxVisible)
  const hiddenCount = tags.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            'font-normal',
            TAG_COLORS[tag.color] || TAG_COLORS.default,
            size === 'sm' && 'h-5 text-xs px-1.5',
            size === 'md' && 'h-6 text-sm px-2'
          )}
        >
          {tag.name}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'font-normal bg-muted text-muted-foreground border-border',
            size === 'sm' && 'h-5 text-xs px-1.5',
            size === 'md' && 'h-6 text-sm px-2'
          )}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  )
}
