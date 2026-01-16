'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  isCollapsed?: boolean
}

/**
 * LogoutButton - Client Component
 *
 * Botão de logout que:
 * 1. Chama API /api/auth/logout
 * 2. Redireciona para /login
 *
 * Usado no layout do dashboard
 */
export function LogoutButton({ isCollapsed = false }: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)

      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/auth/logout', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        router.push('/login')
        router.refresh()
      } else {
        alert('Erro ao fazer logout. Tente novamente.')
        setLoading(false)
      }
    } catch (error) {
      alert('Erro ao fazer logout. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant="ghost"
      size="sm"
      className={cn(
        "w-full text-uzz-silver hover:text-white hover:bg-white/10 border border-white/10",
        isCollapsed ? "justify-center" : "justify-start gap-2"
      )}
      title={isCollapsed ? (loading ? 'Saindo...' : 'Sair') : undefined}
    >
      <LogOut className="h-4 w-4" />
      {!isCollapsed && (loading ? 'Saindo...' : 'Sair')}
    </Button>
  )
}
