'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithOAuth, createBrowserClient } from '@/lib/supabase-browser'
import { Capacitor } from '@capacitor/core'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null)
  const [formData, setFormData] = useState({ fullName: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token de convite inv&#225;lido ou ausente.')
      setValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/accept-invite?token=${token}`)
        const data = await res.json()
        if (res.ok && data.invite) {
          setInvite(data.invite)
        } else {
          setError(data.error ?? 'Convite inv&#225;lido ou expirado.')
        }
      } catch {
        setError('Erro ao validar convite.')
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas n&#227;o coincidem.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName: formData.fullName, password: formData.password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao aceitar convite.')
        setLoading(false)
        return
      }

      if (data.session) {
        const supabase = createBrowserClient()
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github' | 'azure') => {
    setLoading(true)
    const { error: oauthError } = await signInWithOAuth(provider, token)
    if (oauthError) {
      setError('Erro ao iniciar login social.')
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background">
        <p className="text-muted-foreground">Validando convite...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden py-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">
            <span className="text-primary">Uzz</span>
            <span className="text-secondary">.Ai</span>
          </span>
          <h1 className="text-2xl font-bold text-foreground mt-4 mb-2">Aceitar Convite</h1>
          {invite && (
            <p className="text-muted-foreground">
              Voc&#234; foi convidado como{' '}
              <span className="text-foreground font-medium">{invite.role}</span>
              {' '}para{' '}
              <span className="text-foreground font-medium">{invite.email}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {invite && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Senha *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all"
                  placeholder="M&#237;nimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all"
                  placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            {!Capacitor.isNativePlatform() && (
              <div className="mt-6">
                <div className="relative flex items-center gap-4 mb-4">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-sm text-muted-foreground/60">ou entre com</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['google', 'github', 'azure'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleOAuth(p)}
                      disabled={loading}
                      className="py-2.5 px-3 bg-background/50 border border-border rounded-lg hover:bg-muted transition-all disabled:opacity-50 text-sm font-medium capitalize"
                    >
                      {p === 'azure' ? 'Microsoft' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            J&#225; tem conta? Fa&#231;a login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  )
}
