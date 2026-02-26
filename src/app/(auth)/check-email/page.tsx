'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, Suspense } from 'react'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResend = async () => {
    setResending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResent(true)
      } else {
        setError('Erro ao reenviar. Tente novamente.')
      }
    } catch {
      setError('Erro ao reenviar. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border text-center">
        <div className="mb-6">
          <div className="text-5xl mb-4">&#128231;</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verifique seu email</h1>
          <p className="text-muted-foreground">
            Enviamos um link de confirma&#231;&#227;o para{' '}
            <span className="text-foreground font-medium">{email || 'seu email'}</span>.
            Clique no link para ativar sua conta.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {resent && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400">Email reenviado com sucesso!</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="w-full bg-muted/30 border border-border hover:bg-muted text-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? 'Reenviando...' : resent ? 'Email reenviado' : 'Reenviar email'}
          </button>

          <Link
            href="/login"
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Voltar para o login
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/60">
          N&#227;o encontrou o email? Verifique a pasta de spam.
        </p>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  )
}
