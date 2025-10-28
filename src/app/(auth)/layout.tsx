import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - Chatbot Dashboard',
  description: 'Faça login para acessar o dashboard do chatbot',
}

/**
 * Layout para rotas de autenticação
 *
 * Rotas: /login, /signup (futuro)
 *
 * IMPORTANTE: Não inclui header/sidebar do dashboard
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
