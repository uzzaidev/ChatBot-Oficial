'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, Database, Boxes, BarChart3, DollarSign } from 'lucide-react'

interface AIGatewayNavProps {
  className?: string
}

export function AIGatewayNav({ className }: AIGatewayNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/dashboard/ai-gateway/setup',
      label: 'Setup',
      icon: Settings,
    },
    {
      href: '/dashboard/ai-gateway/cache',
      label: 'Cache',
      icon: Database,
    },
    {
      href: '/dashboard/ai-gateway/models',
      label: 'Models',
      icon: Boxes,
    },
    {
      href: '/dashboard/ai-gateway/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      href: '/dashboard/ai-gateway/budget',
      label: 'Budget',
      icon: DollarSign,
    },
  ]

  return (
    <div className={cn('border-b bg-white', className)}>
      <nav className="flex gap-1 px-6" aria-label="AI Gateway Navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
