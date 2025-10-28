import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase-server'

/**
 * Home Page - Server Component
 *
 * FASE 3: Agora redireciona para login se não autenticado
 *
 * Lógica:
 * - Se usuário autenticado → /dashboard
 * - Se não autenticado → /login
 */
export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
