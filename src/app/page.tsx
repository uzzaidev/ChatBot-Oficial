import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase-server'

// Marcar como rota dinâmica (não pode ser estática porque usa cookies)
export const dynamic = 'force-dynamic'

/**
 * Home Page - Server Component
 *
 * FASE 3: Agora redireciona para login se não autenticado
 *
 * Lógica:
 * - Se usuário autenticado → /dashboard
 * - Se não autenticado → /login
 * - Se erro → /login
 */
export default async function HomePage() {
  try {
    const user = await getCurrentUser()

    if (user) {
      redirect('/dashboard')
    } else {
      redirect('/login')
    }
  } catch (error) {
    // Se houver erro ao buscar usuário, redirecionar para login
    console.error('[HomePage] Erro ao verificar autenticação:', error)
    redirect('/login')
  }
}
