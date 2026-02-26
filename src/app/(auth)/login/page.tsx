'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail, signInWithOAuth, createBrowserClient } from '@/lib/supabase-browser'
import { BiometricAuthButton } from '@/components/BiometricAuthButton'
import {
  checkBiometricAvailability,
  saveBiometricPreference,
  saveBiometricEmail,
  getBiometricEmail,
} from '@/lib/biometricAuth'
import { Capacitor } from '@capacitor/core'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'
  const loginError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)

  useEffect(() => {
    const checkBiometric = async () => {
      if (Capacitor.isNativePlatform()) {
        const result = await checkBiometricAvailability()
        setBiometricAvailable(result.available)

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

  const handleBiometricSuccess = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Sessão expirada. Faça login manualmente.')
        setLoading(false)
        return
      }

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

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro ao restaurar sessão. Faça login manualmente.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Por favor, preencha todos os campos')
        setLoading(false)
        return
      }

      const { data, error: signInError } = await signInWithEmail(email, password)

      if (signInError) {
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

      if (biometricAvailable && Capacitor.isNativePlatform()) {
        saveBiometricEmail(email)
        setShowBiometricPrompt(true)
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro inesperado ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github' | 'azure') => {
    setError(null)
    setLoading(true)
    const inviteToken = searchParams.get('invite_token') ?? undefined
    const { error: oauthError } = await signInWithOAuth(provider, inviteToken)
    if (oauthError) {
      setError('Erro ao iniciar login social. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold">
              <span className="text-primary">Uzz</span>
              <span className="text-secondary">.Ai</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground">
            Fa&#231;a login para acessar o dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {sessionExpired && !error && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-400">Sua sess&#227;o expirou. Fa&#231;a login novamente.</p>
          </div>
        )}

        {loginError === 'account_inactive' && !error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">Conta inativa. Contate o administrador.</p>
          </div>
        )}

        {Capacitor.isNativePlatform() && (
          <BiometricAuthButton
            onSuccess={handleBiometricSuccess}
            onError={(err) => setError(err)}
          />
        )}

        {biometricAvailable && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 border-t border-border"></div>
            <span className="text-sm text-muted-foreground/60">ou</span>
            <div className="flex-1 border-t border-border"></div>
          </div>
        )}

        {showBiometricPrompt && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-foreground/80 mb-3">
              Deseja habilitar login com biometria para acesso r&#225;pido?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  saveBiometricPreference(true)
                  setShowBiometricPrompt(false)
                }}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-all"
              >
                Sim, habilitar
              </button>
              <button
                type="button"
                onClick={() => {
                  saveBiometricPreference(false)
                  setShowBiometricPrompt(false)
                }}
                className="flex-1 bg-muted/30 border border-border hover:bg-muted text-foreground text-sm font-medium py-2 px-4 rounded-lg transition-all"
              >
                N&#227;o, obrigado
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:scale-[1.02]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {!Capacitor.isNativePlatform() && (
          <div className="mt-6">
            <div className="relative flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-sm text-muted-foreground/60">ou continue com</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-background/50 border border-border rounded-lg hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-background/50 border border-border rounded-lg hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('azure')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-background/50 border border-border rounded-lg hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Microsoft
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            N&#227;o tem uma conta?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            >
              Crie uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
