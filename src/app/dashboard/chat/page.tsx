'use client'
import { useEffect, useState, Suspense } from 'react'
import { ConversationPageClient } from '@/components/ConversationPageClient'
import { createClientBrowser } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Chat Page - Client Component (Mobile Compatible)
 * 
 * Substitui /dashboard/conversations/[phone] para evitar dynamic routes
 * que requerem generateStaticParams no static export.
 * 
 * Uso: /dashboard/chat?phone=551199999999
 */
function ChatPageContent() {
    const searchParams = useSearchParams()
    const phone = searchParams?.get('phone')

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

    if (!clientId || !phone) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-silver-50">
                <p className="text-erie-black-500">Conversa não encontrada</p>
            </div>
        )
    }

    return <ConversationPageClient phone={phone} clientId={clientId} />
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-silver-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500"></div>
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    )
}
