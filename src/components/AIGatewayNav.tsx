'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Settings, Database, Boxes, BarChart3, DollarSign, Play, CheckCircle2 } from 'lucide-react'
import { createClientBrowser } from '@/lib/supabase'

interface AIGatewayNavProps {
  className?: string
}

export function AIGatewayNav({ className }: AIGatewayNavProps) {
  const pathname = usePathname()

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const supabase = createClientBrowser()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single()

        const hasAdminAccess = !!profile && profile.role === 'admin' && !!profile.is_active
        setIsAdmin(hasAdminAccess)
      } catch {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }

    checkAdminRole()
  }, [])

  const navItems = useMemo(() => {
    const baseItems = [
      {
        href: '/dashboard/ai-gateway/cache',
        label: 'Cache',
        icon: Database,
      },
      {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: BarChart3,
      },
      {
        href: '/dashboard/ai-gateway/budget',
        label: 'Budget',
        icon: DollarSign,
      },
      {
        href: '/dashboard/ai-gateway/validation',
        label: 'Validation',
        icon: CheckCircle2,
      },
      {
        href: '/dashboard/ai-gateway/test',
        label: 'Test',
        icon: Play,
      },
    ]

    if (checkingAdmin) return baseItems

    if (!isAdmin) return baseItems

    return [
      {
        href: '/dashboard/ai-gateway/setup',
        label: 'Setup',
        icon: Settings,
      },
      {
        href: '/dashboard/ai-gateway/models',
        label: 'Models',
        icon: Boxes,
      },
      ...baseItems,
    ]
  }, [checkingAdmin, isAdmin])

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
