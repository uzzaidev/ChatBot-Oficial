'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail, createBrowserClient } from '@/lib/supabase-browser'
import { BiometricAuthButton } from '@/components/BiometricAuthButton'
import {
  checkBiometricAvailability,
  saveBiometricPreference,
  saveBiometricEmail,
  getBiometricEmail,
} from '@/lib/biometricAuth'
import { Capacitor } from '@capacitor/core'

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
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)

  // Verificar disponibilidade de biometria ao montar componente
  useEffect(() => {
    const checkBiometric = async () => {
      if (Capacitor.isNativePlatform()) {
        const result = await checkBiometricAvailability()
        setBiometricAvailable(result.available)
        
        // Se biometria disponível e usuário já tem email salvo, tentar restaurar sessão
        if (result.available) {
          const savedEmail = getBiometricEmail()
          if (savedEmail) {
            setEmail(savedEmail)
          }
        }
      }
    }

    checkBiometric()
  }, [])

  // Handler para sucesso na autenticação biométrica
  const handleBiometricSuccess = async () => {
    setLoading(true)
    setError(null)

    try {
      // Verificar se há sessão válida no Supabase
      const supabase = createBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Sessão expirada. Faça login manualmente.')
        setLoading(false)
        return
      }

      // Verificar se usuário tem profile válido
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('client_id, is_active')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile?.client_id || !profile.is_active) {
        setError('Usuário sem perfil configurado ou inativo. Faça login manualmente.')
        setLoading(false)
        return
      }

      // Sessão válida, redirecionar
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Erro ao restaurar sessão. Faça login manualmente.')
      setLoading(false)
    }
  }

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

      // Verificar se usuário tem profile com client_id (mobile-compatible)
      // No mobile, não podemos usar API routes, então verificamos diretamente via Supabase
      const supabase = createBrowserClient()
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('client_id, is_active')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile?.client_id) {
        setError('Usuário sem perfil configurado. Contate o administrador.')
        setLoading(false)
        return
      }

      if (profile.is_active === false) {
        setError('Conta desativada. Contate o administrador.')
        setLoading(false)
        return
      }

      // Após login bem-sucedido, perguntar se quer habilitar biometria (se disponível)
      if (biometricAvailable && Capacitor.isNativePlatform()) {
        // Salvar email para biometria
        saveBiometricEmail(email)
        
        // Perguntar se quer habilitar biometria (mostrar prompt)
        setShowBiometricPrompt(true)
      }

      // Redirect para dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Erro inesperado ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1419] via-[#1a1f26] to-[#0f1419] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1ABC9C]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#2E86AB]/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-[#1a1f26]/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold">
              <span className="text-[#1ABC9C]">Uzz</span>
              <span className="text-[#2E86AB]">.Ai</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-white/60">
            Faça login para acessar o dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Biometric Auth Button (se disponível e habilitado) */}
        {Capacitor.isNativePlatform() && (
          <BiometricAuthButton
            onSuccess={handleBiometricSuccess}
            onError={(err) => setError(err)}
          />
        )}

        {/* Divider (se biometria disponível) */}
        {biometricAvailable && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="text-sm text-white/40">ou</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>
        )}

        {/* Prompt para habilitar biometria (após primeiro login) */}
        {showBiometricPrompt && (
          <div className="mb-6 p-4 bg-[#1ABC9C]/10 border border-[#1ABC9C]/30 rounded-lg">
            <p className="text-sm text-white/80 mb-3">
              Deseja habilitar login com biometria para acesso rápido?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  saveBiometricPreference(true)
                  setShowBiometricPrompt(false)
                }}
                className="flex-1 bg-gradient-to-r from-[#1ABC9C] to-[#16a085] hover:from-[#16a085] hover:to-[#1ABC9C] text-white text-sm font-medium py-2 px-4 rounded-lg transition-all"
              >
                Sim, habilitar
              </button>
              <button
                type="button"
                onClick={() => {
                  saveBiometricPreference(false)
                  setShowBiometricPrompt(false)
                }}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium py-2 px-4 rounded-lg transition-all"
              >
                Não, obrigado
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/80 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0f1419]/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#1ABC9C] focus:border-[#1ABC9C] disabled:bg-white/5 disabled:cursor-not-allowed transition-all"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/80 mb-2"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0f1419]/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#1ABC9C] focus:border-[#1ABC9C] disabled:bg-white/5 disabled:cursor-not-allowed transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1ABC9C] to-[#16a085] hover:from-[#16a085] hover:to-[#1ABC9C] text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1ABC9C]/30 hover:scale-[1.02]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-white/60">
          <p>
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="text-[#1ABC9C] hover:text-[#16a085] font-medium hover:underline transition-colors"
            >
              Crie uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
