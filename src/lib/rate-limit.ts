/**
 * SECURITY FIX (VULN-002, VULN-017): Rate Limiting
 * 
 * Implements rate limiting using Upstash Redis to prevent:
 * - Brute force attacks on webhook verification
 * - DDoS attacks on API endpoints
 * - API abuse and excessive costs
 * 
 * Features:
 * - Per-IP rate limiting
 * - Per-user rate limiting
 * - Different limits for different endpoint types
 * - Automatic cleanup via Redis TTL
 * - Graceful degradation if Redis fails
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Initialize Upstash Redis client
 * 
 * Falls back to mock implementation if credentials not configured
 * (for development environments)
 */
let redis: Redis | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  } else {
  }
} catch (error) {
  console.error('[rate-limit] Failed to initialize Redis:', error)
}

/**
 * Create rate limiters for different use cases
 */

// VULN-002: Webhook verification (very strict - prevent brute force)
export const webhookVerifyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
      analytics: true,
      prefix: 'ratelimit:webhook:verify',
    })
  : null

// VULN-017: General API routes (per user)
export const apiUserLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
      prefix: 'ratelimit:api:user',
    })
  : null

// VULN-017: Admin API routes (more strict)
export const apiAdminLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 requests per minute
      analytics: true,
      prefix: 'ratelimit:api:admin',
    })
  : null

// VULN-017: Global IP-based limiter (backstop)
export const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute per IP
      analytics: true,
      prefix: 'ratelimit:ip',
    })
  : null

/**
 * Extract identifier for rate limiting
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Apply rate limiting to a request
 * 
 * @param request - Next.js request object
 * @param limiter - Upstash Ratelimit instance
 * @param identifier - Unique identifier for rate limiting (user ID or IP)
 * @returns Response with 429 if rate limited, null otherwise
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null,
  identifier?: string
): Promise<NextResponse | null> {
  // If rate limiting not configured, allow request
  if (!limiter) {
    return null
  }

  try {
    const id = identifier || getIdentifier(request)
    const { success, limit, reset, remaining } = await limiter.limit(id)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }

    if (!success) {

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    return null // No rate limit hit
  } catch (error) {
    // Graceful degradation - if Redis fails, allow request
    console.error('[rate-limit] Error checking rate limit:', error)
    return null
  }
}

/**
 * withRateLimit - Wrapper to add rate limiting to API routes
 * 
 * Usage:
 * ```typescript
 * export const GET = withRateLimit(
 *   apiUserLimiter,
 *   async (request) => {
 *     return NextResponse.json({ data: 'protected' })
 *   }
 * )
 * ```
 */
export function withRateLimit(
  limiter: Ratelimit | null,
  handler: (request: NextRequest, params?: any) => Promise<NextResponse>,
  getIdentifier?: (request: NextRequest) => string
) {
  return async (request: NextRequest, params?: any) => {
    // Check rate limit
    const identifier = getIdentifier ? getIdentifier(request) : undefined
    const rateLimitResponse = await checkRateLimit(request, limiter, identifier)

    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Rate limit not hit - proceed with handler
    return handler(request, params)
  }
}

/**
 * withIpRateLimit - Quick wrapper for IP-based rate limiting
 */
export function withIpRateLimit(
  handler: (request: NextRequest, params?: any) => Promise<NextResponse>
) {
  return withRateLimit(ipLimiter, handler)
}

/**
 * withUserRateLimit - Quick wrapper for user-based rate limiting
 * Requires authentication context
 */
export function withUserRateLimit(
  handler: (request: NextRequest, params?: any) => Promise<NextResponse>,
  getUserId: (request: NextRequest) => Promise<string | null>
) {
  return async (request: NextRequest, params?: any) => {
    const userId = await getUserId(request)
    const identifier = userId ? `user:${userId}` : getIdentifier(request)
    
    const rateLimitResponse = await checkRateLimit(request, apiUserLimiter, identifier)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return handler(request, params)
  }
}
