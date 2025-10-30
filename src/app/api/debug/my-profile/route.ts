import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/my-profile
 * Debug endpoint para verificar o perfil do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    console.log('[GET /api/debug/my-profile] 🔍 Starting debug...')

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[GET /api/debug/my-profile] 👤 Auth check:', {
      userId: user?.id,
      email: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message
    })

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'No user found',
        details: 'Você não está autenticado ou a sessão expirou'
      })
    }

    // Buscar perfil completo
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('[GET /api/debug/my-profile] 📋 Profile query result:', {
      hasProfile: !!profile,
      profile: profile,
      hasError: !!profileError,
      errorMessage: profileError?.message
    })

    if (profileError) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profileError: {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        },
        profileFound: false
      })
    }

    if (!profile) {
      return NextResponse.json({
        authenticated: true,
        profileFound: false,
        message: 'Profile exists but returned null'
      })
    }

    const profileData = profile as any

    // Retornar todas as informações
    return NextResponse.json({
      authenticated: true,
      profileFound: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        client_id: profileData.client_id,
        role: profileData.role,
        is_active: profileData.is_active,
        phone: profileData.phone,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      },
      checks: {
        hasRole: !!profileData.role,
        roleValue: profileData.role,
        isAdminRole: ['admin', 'client_admin'].includes(profileData.role),
        isActive: profileData.is_active,
        canAccessAdmin: ['admin', 'client_admin'].includes(profileData.role) && profileData.is_active
      }
    })

  } catch (error) {
    console.error('[GET /api/debug/my-profile] ❌ Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
