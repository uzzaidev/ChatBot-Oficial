"use client";

/**
 * Test page for OAuth flow
 * TEMPORARY - Remove after OAuth is working
 *
 * Access: https://uzzapp.uzzai.com.br/test-oauth
 */

import { ConnectWhatsAppButton } from "@/components/ConnectWhatsAppButton";
import { EmbeddedSignupButton } from "@/components/EmbeddedSignupButton";
import { useState } from "react";

export default function TestOAuthPage() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Teste OAuth Flow
          </h1>
          <p className="text-gray-600">
            Escolha o método de conexão do WhatsApp Business
          </p>
        </div>

        <div className="space-y-6">
          {/* NEW: Embedded Signup with Coexistence (JS SDK) */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">
              ✅ Recomendado: Coexistência
            </h3>
            <p className="text-sm text-green-800 mb-3">
              O WhatsApp Business App no celular continua funcionando.
            </p>
            <EmbeddedSignupButton
              onSuccess={(data) =>
                setResult(
                  `✅ Conectado! Client: ${data.clientId}, Phone: ${data.displayPhone}`,
                )
              }
              onError={(error) => setResult(`❌ Erro: ${error}`)}
              onCancel={() => setResult("⚠️ Fluxo cancelado pelo usuário")}
              className="w-full bg-green-600 hover:bg-green-700"
            />
          </div>

          {/* OLD: Redirect-based OAuth (fallback) */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">
              Alternativa: OAuth Redirect
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Método antigo via redirect. Número é migrado para Cloud API
              apenas.
            </p>
            <ConnectWhatsAppButton className="w-full" variant="outline" />
          </div>

          {result && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
              {result}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 O que vai acontecer:
            </h3>
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
            <code className="bg-gray-100 px-2 py-1 rounded">
              src/app/test-oauth/page.tsx
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
