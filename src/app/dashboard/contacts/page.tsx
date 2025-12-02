'use client'
import { useEffect, useState } from 'react'
import { ContactsClient } from '@/components/ContactsClient'
import { createClientBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Contacts Page - Client Component
 *
 * Página de gerenciamento de contatos
 * Permite adicionar, editar, remover e importar contatos em massa
 */
export default function ContactsPage() {
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()

        if (profile?.client_id) {
          setClientId(profile.client_id)
        } else {
          const metadataClientId = user.user_metadata?.client_id
          if (metadataClientId) {
            setClientId(metadataClientId)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
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

  if (!clientId) {
    return null
  }

  return <ContactsClient clientId={clientId} />
}
