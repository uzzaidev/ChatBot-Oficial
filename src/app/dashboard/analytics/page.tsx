'use client'

/**
 * UNIFIED ANALYTICS PAGE
 *
 * /dashboard/analytics
 *
 * Single analytics page combining:
 * - AI Gateway metrics (new)
 * - Chatbot metrics (legacy)
 *
 * Features:
 * - Auto-detects admin vs tenant role
 * - Admin: See all clients + filters
 * - Tenant: See only their data
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase'
import { UnifiedAnalytics } from '@/components/UnifiedAnalytics'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientBrowser()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setAuthenticated(true)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-silver-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500"></div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="text-center py-8">
          <p className="text-destructive">Não foi possível carregar analytics. Verifique se você está autenticado.</p>
        </div>
      </div>
    )
  }

  return <UnifiedAnalytics />
}

