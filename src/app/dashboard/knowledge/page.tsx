'use client'

/**
 * Knowledge Base Management Page
 *
 * /dashboard/knowledge
 *
 * Client Component (Mobile Compatible)
 * Motivo: Static Export (Capacitor) não suporta Server Components
 *
 * Allows users to upload and manage documents for RAG (Retrieval-Augmented Generation).
 * Documents are processed with semantic chunking and stored in vector database.
 *
 * Features:
 * - Upload PDF/TXT files
 * - View uploaded documents
 * - Delete documents
 * - Real-time updates
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Info } from 'lucide-react'
import { createClientBrowser } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientBrowser()

        // 1. Verificar usuário
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // 2. Buscar client_id do profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()

        if (profile?.client_id) {
          setClientId(profile.client_id)
        } else {
          console.error('[KnowledgePage] Client ID não encontrado')
          // Não redirecionar, apenas mostrar mensagem
        }
      } catch (error) {
        console.error('[KnowledgePage] Erro ao verificar autenticação:', error)
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
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Não foi possível carregar sua base de conhecimento. Verifique se você está autenticado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <BookOpen className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie documentos que o chatbot pode usar para responder perguntas específicas
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
              <CardDescription className="mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Faça upload de documentos PDF ou TXT</li>
                  <li>Os documentos são processados e indexados automaticamente</li>
                  <li>O chatbot usa esses documentos para responder perguntas dos clientes</li>
                  <li>Documentos são armazenados de forma segura e isolada por cliente</li>
                </ul>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Placeholder - Funcionalidade será implementada */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Documentos</CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento. Em breve você poderá fazer upload e gerenciar documentos aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Em breve você poderá fazer upload de documentos aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

