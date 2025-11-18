/**
 * SECURITY FIX (VULN-001): API Route Authentication Middleware
 * 
 * Provides reusable authentication wrappers for API routes to ensure
 * all protected endpoints validate user authentication and authorization.
 * 
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (request, { user, profile }) => {
 *   // Your authenticated handler code
 *   return NextResponse.json({ data: 'protected' })
 * })
 * 
 * export const POST = withAdminAuth(async (request, { user, profile }) => {
 *   // Your admin-only handler code
 *   return NextResponse.json({ data: 'admin only' })
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export interface AuthenticatedContext {
  user: {
    id: string
    email: string
    [key: string]: any
  }
  profile: {
    id: string
    client_id: string
    role: string
    is_active: boolean
    [key: string]: any
  }
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthenticatedContext,
  params?: any
) => Promise<NextResponse>

/**
 * Whitelist of public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/webhook', // Webhook verification (has own validation)
  '/api/health',
]

/**
 * Check if route is public (doesn't require auth)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * withAuth - Wrapper for authenticated API routes
 * 
 * Validates that user is authenticated and has a valid profile.
 * Injects user and profile into handler context.
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, routeParams?: any) => {
    try {
      const pathname = request.nextUrl.pathname

      // Skip auth for public routes
      if (isPublicRoute(pathname)) {
        return handler(request, null as any, routeParams)
      }

      const supabase = createRouteHandlerClient()

      // 1. Verify authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('[withAuth] Authentication failed:', {
          pathname,
          error: authError?.message,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        )
      }

      // 2. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('[withAuth] Profile not found:', {
          user_id: user.id,
          error: profileError?.message,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Profile not found' },
          { status: 401 }
        )
      }

      // 3. Check if user is active
      if (!profile.is_active) {
        console.error('[withAuth] Inactive user:', {
          user_id: user.id,
          email: user.email,
        })
        return NextResponse.json(
          { error: 'Forbidden: Account is inactive' },
          { status: 403 }
        )
      }

      // 4. Call handler with authenticated context
      return handler(
        request,
        {
          user,
          profile,
        },
        routeParams
      )
    } catch (error) {
      console.error('[withAuth] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * withAdminAuth - Wrapper for admin-only API routes
 * 
 * Validates that user is authenticated, has valid profile, 
 * AND has admin or client_admin role.
 * 
 * SECURITY FIX (VULN-004): Revalidates role from database before
 * allowing admin operations, preventing stale JWT role escalation.
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with admin authentication
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, routeParams?: any) => {
    try {
      const pathname = request.nextUrl.pathname
      const supabase = createRouteHandlerClient()

      // 1. Verify authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('[withAdminAuth] Authentication failed:', {
          pathname,
          error: authError?.message,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        )
      }

      // 2. SECURITY FIX (VULN-004): Revalidate role from database
      // Don't trust JWT role - always check current role in database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('[withAdminAuth] Profile not found:', {
          user_id: user.id,
          error: profileError?.message,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Profile not found' },
          { status: 401 }
        )
      }

      // 3. Check if user is active
      if (!profile.is_active) {
        console.error('[withAdminAuth] Inactive user:', {
          user_id: user.id,
          email: user.email,
        })
        return NextResponse.json(
          { error: 'Forbidden: Account is inactive' },
          { status: 403 }
        )
      }

      // 4. Validate admin role (must be admin or client_admin)
      const validAdminRoles = ['admin', 'client_admin']
      if (!validAdminRoles.includes(profile.role)) {
        console.error('[withAdminAuth] Insufficient permissions:', {
          user_id: user.id,
          email: user.email,
          role: profile.role,
          required: validAdminRoles,
        })
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      console.log('[withAdminAuth] ✅ Admin access granted:', {
        user_id: user.id,
        email: user.email,
        role: profile.role,
        pathname,
      })

      // 5. Call handler with authenticated admin context
      return handler(
        request,
        {
          user,
          profile,
        },
        routeParams
      )
    } catch (error) {
      console.error('[withAdminAuth] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * withOptionalAuth - Wrapper for routes that work with or without auth
 * 
 * Attempts to authenticate but doesn't fail if user is not logged in.
 * Useful for endpoints that provide different data based on auth status.
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with optional authentication
 */
export function withOptionalAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, routeParams?: any) => {
    try {
      const supabase = createRouteHandlerClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // No user - call handler with null context
        return handler(request, null as any, routeParams)
      }

      // User exists - try to get profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Profile not found - call handler with null context
        return handler(request, null as any, routeParams)
      }

      // Call handler with authenticated context
      return handler(
        request,
        {
          user,
          profile,
        },
        routeParams
      )
    } catch (error) {
      console.error('[withOptionalAuth] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
