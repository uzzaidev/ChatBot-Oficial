'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

/**
 * LogoutButton - Client Component
 *
 * Botão de logout que:
 * 1. Chama API /api/auth/logout
 * 2. Redireciona para /login
 *
 * Usado no layout do dashboard
 */
export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        console.log('[LogoutButton] Logout realizado com sucesso')
        router.push('/login')
        router.refresh()
      } else {
        console.error('[LogoutButton] Erro no logout:', data.error)
        alert('Erro ao fazer logout. Tente novamente.')
        setLoading(false)
      }
    } catch (error) {
      console.error('[LogoutButton] Erro inesperado:', error)
      alert('Erro ao fazer logout. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2"
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Saindo...' : 'Sair'}
    </Button>
  )
}
