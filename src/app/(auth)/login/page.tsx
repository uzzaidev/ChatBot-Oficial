'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail } from '@/lib/supabase-browser'

/**
 * Página de Login - Supabase Auth
 *
 * Features:
 * - Login com email/senha
 * - Validação client-side
 * - Error handling
 * - Redirect para dashboard após login
 *
 * IMPORTANTE: Usuário deve ter user_profile com client_id válido
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validação básica
      if (!email || !password) {
        setError('Por favor, preencha todos os campos')
        setLoading(false)
        return
      }

      // Login via Supabase Auth
      const { data, error: signInError } = await signInWithEmail(email, password)

      if (signInError) {
        console.error('[Login] Erro:', signInError)

        // Mensagens de erro amigáveis
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.')
        } else {
          setError(signInError.message)
        }

        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Erro ao fazer login. Tente novamente.')
        setLoading(false)
        return
      }

      console.log('[Login] Usuário autenticado:', data.user.email)

      // Verificar se usuário tem profile com client_id
      const profileResponse = await fetch('/api/auth/verify-profile')
      const profileData = await profileResponse.json()

      if (!profileData.success) {
        setError('Usuário sem perfil configurado. Contate o administrador.')
        setLoading(false)
        return
      }

      console.log('[Login] Profile verificado, client_id:', profileData.client_id)

      // Redirect para dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('[Login] Erro inesperado:', err)
      setError('Erro inesperado ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chatbot Dashboard
          </h1>
          <p className="text-gray-600">
            Faça login para acessar o sistema
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Crie uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
