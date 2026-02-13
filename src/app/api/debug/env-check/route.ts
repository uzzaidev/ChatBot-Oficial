/**
 * Debug endpoint - Check environment variables (OAuth)
 * TEMPORARY - Remove after OAuth is working
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const envVars = {
    META_PLATFORM_APP_ID: process.env.META_PLATFORM_APP_ID ? '✅ Set' : '❌ Missing',
    META_PLATFORM_APP_SECRET: process.env.META_PLATFORM_APP_SECRET ? '✅ Set' : '❌ Missing',
    META_PLATFORM_VERIFY_TOKEN: process.env.META_PLATFORM_VERIFY_TOKEN ? '✅ Set' : '❌ Missing',
    META_PLATFORM_SYSTEM_USER_TOKEN: process.env.META_PLATFORM_SYSTEM_USER_TOKEN ? '✅ Set' : '❌ Missing',
    META_EMBEDDED_SIGNUP_CONFIG_ID: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || '❌ Missing',

    // Show first 20 chars of verify token for debugging
    verifyTokenPreview: process.env.META_PLATFORM_VERIFY_TOKEN
      ? process.env.META_PLATFORM_VERIFY_TOKEN.substring(0, 20) + '...'
      : null,
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars,
  })
}
