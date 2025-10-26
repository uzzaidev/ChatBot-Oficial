import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DEBUG: Verifica variáveis de ambiente (sem expor senhas)
 */
export async function GET() {
  try {
    const env = {
      // Redis
      REDIS_URL_CONFIGURED: !!process.env.REDIS_URL,
      REDIS_URL_PROTOCOL: process.env.REDIS_URL?.split('://')[0] || 'NOT_SET',
      REDIS_URL_HOST: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'NOT_SET',
      
      // Supabase
      SUPABASE_URL_CONFIGURED: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
      
      // OpenAI
      OPENAI_API_KEY_CONFIGURED: !!process.env.OPENAI_API_KEY,
      OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'NOT_SET',
      
      // Groq
      GROQ_API_KEY_CONFIGURED: !!process.env.GROQ_API_KEY,
      GROQ_KEY_PREFIX: process.env.GROQ_API_KEY?.substring(0, 10) + '...' || 'NOT_SET',
      
      // Meta
      META_ACCESS_TOKEN_CONFIGURED: !!process.env.META_ACCESS_TOKEN,
      META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || 'NOT_SET',
      META_VERIFY_TOKEN_CONFIGURED: !!process.env.META_VERIFY_TOKEN,
      
      // Node Environment
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_VERCEL',
    }

    return NextResponse.json({
      success: true,
      environment: env,
      message: 'Variáveis de ambiente verificadas (senhas ocultas)',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
