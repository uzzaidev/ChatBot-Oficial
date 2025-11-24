'use client'
import { useEffect, useState } from 'react'
import { AuthMonitor } from '@/components/AuthMonitor'
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient'
import { createClientBrowser } from '@/lib/supabase'

/**
 * Dashboard Layout - Client Component (Mobile Compatible)
 *
 * FASE 3 (Mobile): Convertido para Client Component
 * Motivo: Static Export não suporta Server Components com cookies (getCurrentUser)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClientBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <>
      <AuthMonitor />
      <DashboardLayoutClient userName={userName} userEmail={user?.email}>
        {children}
      </DashboardLayoutClient>
    </>
  )
}

