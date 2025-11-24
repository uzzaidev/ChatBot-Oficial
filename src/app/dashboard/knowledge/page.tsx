'use client'

/**
 * Knowledge Base Management Page
 *
 * /dashboard/knowledge
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

import { useState } from 'react'
import { BookOpen, Info } from 'lucide-react'
import { DocumentUpload } from '@/components/DocumentUpload'
import { DocumentList } from '@/components/DocumentList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function KnowledgePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    // Trigger refresh of document list
    setRefreshTrigger((prev) => prev + 1)
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

      {/* Info card */}
      <Card className="mb-6 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>
                <strong>Como funciona:</strong> Os documentos são processados automaticamente com
                chunking semântico e convertidos em embeddings. Quando um usuário faz uma pergunta,
                o sistema busca os trechos mais relevantes e os usa como contexto para a resposta do AI.
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>• <strong>Chunking Semântico:</strong> Divide documentos respeitando parágrafos e sentenças</p>
                <p>• <strong>Embeddings:</strong> Vetores de 1536 dimensões (OpenAI text-embedding-3-small)</p>
                <p>• <strong>Busca:</strong> Similarity search com threshold de 0.8 (cosine similarity)</p>
                <p>• <strong>Multi-tenant:</strong> Seus documentos são isolados e só você tem acesso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload de Documentos</TabsTrigger>
          <TabsTrigger value="manage">Gerenciar Documentos</TabsTrigger>
        </TabsList>

        {/* Upload tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documento</CardTitle>
              <CardDescription>
                Envie arquivos PDF ou TXT para adicionar conhecimento ao chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage tab */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Carregados</CardTitle>
              <CardDescription>
                Visualize e gerencie os documentos da base de conhecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList refreshTrigger={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats footer */}
      <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="text-sm font-semibold mb-3">Custos de Processamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Embeddings</p>
            <p>OpenAI text-embedding-3-small</p>
            <p className="text-green-600 dark:text-green-400">$0.02 por 1M tokens</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Chunk Size</p>
            <p>500 tokens por chunk (padrão)</p>
            <p>20% overlap para contexto</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Exemplo</p>
            <p>Documento de 10.000 tokens</p>
            <p className="text-green-600 dark:text-green-400">~$0.0002 de custo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
