import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentInfo, getWebhookUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/config
 * Mostra configurações do ambiente (sem expor segredos)
 */
export async function GET(request: NextRequest) {
  try {
    const envInfo = getEnvironmentInfo()

    // Função para mascarar valores sensíveis
    const maskSecret = (value: string | undefined): string => {
      if (!value) return '❌ NÃO CONFIGURADO'
      if (value.length <= 10) return '✅ CONFIGURADO'
      return `✅ ${value.substring(0, 8)}...${value.substring(value.length - 4)}`
    }

    const config = {
      environment: {
        nodeEnv: envInfo.nodeEnv || 'unknown',
        isVercel: envInfo.isVercel,
        vercelEnv: envInfo.vercelEnv || 'N/A',
      },
      webhook: {
        baseUrl: envInfo.webhookBaseUrl,
        fullUrl: getWebhookUrl(),
        verifyTokenConfigured: !!process.env.META_VERIFY_TOKEN,
      },
      database: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '❌',
        supabaseAnonKey: maskSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        supabaseServiceKey: maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
        postgresUrl: maskSecret(process.env.POSTGRES_URL_NON_POOLING),
      },
      services: {
        redis: maskSecret(process.env.REDIS_URL),
        openai: maskSecret(process.env.OPENAI_API_KEY),
        groq: maskSecret(process.env.GROQ_API_KEY),
        metaAccessToken: maskSecret(process.env.META_ACCESS_TOKEN),
        metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '❌',
        gmail: process.env.GMAIL_USER ? `✅ ${process.env.GMAIL_USER}` : '❌',
      },
      status: {
        allConfigured: [
          process.env.WEBHOOK_BASE_URL,
          process.env.META_VERIFY_TOKEN,
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          process.env.POSTGRES_URL_NON_POOLING,
          process.env.REDIS_URL,
          process.env.OPENAI_API_KEY,
          process.env.GROQ_API_KEY,
          process.env.META_ACCESS_TOKEN,
          process.env.META_PHONE_NUMBER_ID,
        ].every(Boolean),
      },
    }

    return NextResponse.json(config, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        hint: 'Verifique se todas as variáveis estão configuradas no .env.local',
      },
      { status: 500 }
    )
  }
}
