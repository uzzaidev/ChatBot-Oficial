'use client'

/**
 * Test page for OAuth flow
 * TEMPORARY - Remove after OAuth is working
 *
 * Access: https://uzzapp.uzzai.com.br/test-oauth
 */

import { ConnectWhatsAppButton } from '@/components/ConnectWhatsAppButton'

export default function TestOAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Teste OAuth Flow
          </h1>
          <p className="text-gray-600">
            Clique no botão abaixo para iniciar o fluxo de autenticação com o Meta
          </p>
        </div>

        <div className="space-y-4">
          <ConnectWhatsAppButton />

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 O que vai acontecer:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Redireciona para Meta OAuth</li>
              <li>Você autoriza com sua conta Facebook</li>
              <li>Seleciona WABA para compartilhar</li>
              <li>Sistema cria client automaticamente</li>
              <li>Redireciona para /onboarding</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Atenção:</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Use a conta Meta com WABA configurado</li>
              <li>Não use WABA já conectado (erro de duplicado)</li>
              <li>Após autorizar, configure chaves OpenAI/Groq</li>
            </ul>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>Depois de testar, delete este arquivo:</p>
            <code className="bg-gray-100 px-2 py-1 rounded">src/app/test-oauth/page.tsx</code>
          </div>
        </div>
      </div>
    </div>
  )
}
